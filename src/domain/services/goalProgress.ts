/**
 * ความคืบหน้าของเป้าหมาย
 *
 *   R18 เป้า = fixed หรือ (ยอดรายเดือนของรายได้ที่เลือก × times)
 *       ความคืบหน้า = เงินตั้งต้น + ผลรวมรายการที่ผูก goalId (ทุกรอบ)
 *   R19 ประมาณจำนวนรอบถึงเป้า = ส่วนที่ขาด ÷ ค่าเฉลี่ยเงินเข้าเป้าต่อรอบ (รอบที่จบแล้ว สูงสุด 3 รอบล่าสุด)
 *   R20 รายได้ที่เป้าอ้างอิงถูกลบ → สถานะ missingIncome (ไม่ error)
 */
import type { Goal } from "../entities/Goal";
import { cycleContaining, isInCycle, shiftCycle, type PayCycle } from "../entities/PayCycle";
import { payCycleStartDayOf, type Plan } from "../entities/Plan";
import type { Transaction } from "../entities/Transaction";
import { amountInPeriod } from "./amountInPeriod";

export type GoalProgress =
  | { status: "missingIncome"; current: number }
  | {
      status: "ok";
      target: number;
      current: number;
      percent: number; // อาจเกิน 100
      remaining: number; // ไม่ติดลบ
      reached: boolean;
      cyclesToGo: number | null; // R19 — null = ยังประมาณไม่ได้
    };

/** ยอดเป้า (R18) — คืน null ถ้ารายได้ที่อ้างอิงไม่มีแล้ว (R20) */
export function goalTarget(goal: Goal, plan: Plan): number | null {
  if (goal.target.kind === "fixed") return goal.target.amount;
  const { incomeId, times } = goal.target;
  const income = plan.incomes.find((i) => i.id === incomeId);
  if (!income) return null;
  return amountInPeriod(income, { kind: "monthly" }) * times;
}

const contributionsOf = (goal: Goal, transactions: Transaction[]) =>
  transactions.filter((t) => t.goalId === goal.id && t.type === "expense");

export function goalProgress(goal: Goal, plan: Plan, transactions: Transaction[], today: string): GoalProgress {
  const contributions = contributionsOf(goal, transactions);
  const current = goal.startingAmount + contributions.reduce((total, t) => total + t.amount, 0);
  const target = goalTarget(goal, plan);
  if (target === null) return { status: "missingIncome", current };

  const remaining = Math.max(0, target - current);
  return {
    status: "ok",
    target,
    current,
    percent: target > 0 ? (current / target) * 100 : 0,
    remaining,
    reached: remaining === 0,
    cyclesToGo: remaining === 0 ? 0 : estimateCycles(contributions, remaining, payCycleStartDayOf(plan), today),
  };
}

/** R19: ค่าเฉลี่ยต่อรอบจากรอบที่ "จบแล้ว" สูงสุด 3 รอบล่าสุด (ไม่นับรอบก่อนเริ่มออมครั้งแรก) */
function estimateCycles(contributions: Transaction[], remaining: number, startDay: number, today: string): number | null {
  if (contributions.length === 0) return null;
  const firstDate = contributions.map((t) => t.date).sort()[0];
  const current = cycleContaining(today, startDay);

  const completed: PayCycle[] = [];
  for (let back = 1; back <= 3; back++) {
    const cycle = shiftCycle(current, startDay, -back);
    if (cycle.end < firstDate) break;
    completed.push(cycle);
  }
  if (completed.length === 0) return null;

  const saved = contributions
    .filter((t) => completed.some((cycle) => isInCycle(t.date, cycle)))
    .reduce((total, t) => total + t.amount, 0);
  const average = saved / completed.length;
  return average > 0 ? Math.ceil(remaining / average) : null;
}
