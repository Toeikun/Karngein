/**
 * ข้อมูลสำหรับหน้า "รายการ" แบบแอปจดรายจ่าย (Phase 12.1b)
 *
 *   R21 จัดกลุ่มรายการตามวัน (วันล่าสุดก่อน) พร้อมยอดรับ/จ่ายของวันนั้น
 *   R22 "จังหวะการใช้เงิน" ของรอบ:
 *       งบ = รวมยอดของทุกกลุ่มในแผนของเดือนที่ตรงกับรอบ (R17′ — Phase 13.1)
 *       ควรใช้ถึงวันนี้ = งบ × (วันที่ผ่านไป ÷ วันทั้งรอบ)   — นับวันนี้เป็นวันที่ผ่านไปแล้ว
 *       ต่างจากแผน = จ่ายจริง − ควรใช้ถึงวันนี้  (บวก = ใช้เร็วกว่าแผน)
 *       ใช้ได้ต่อวัน = เหลือใช้ได้ ÷ วันที่เหลือ (ไม่นับวันนี้ซ้ำ)  — ไม่มีวันเหลือ/ติดลบ → null
 */
import { daysBetween, type PayCycle } from "../entities/PayCycle";
import type { Plan } from "../entities/Plan";
import type { Transaction } from "../entities/Transaction";
import { transactionsInCycle } from "./cycleSummary";
import { groupTotalInMonth, planMonthOfCycle } from "./monthlyPlan";

const sum = (values: number[]) => values.reduce((total, value) => total + value, 0);
const round2 = (value: number) => Math.round(value * 100) / 100;

export interface DayGroup {
  date: string;
  transactions: Transaction[];
  income: number;
  expense: number;
}

/** R21 — วันล่าสุดก่อน, ในวันเดียวกันรายการที่จดทีหลัง (id มากกว่า) อยู่บน */
export function groupByDay(transactions: Transaction[]): DayGroup[] {
  const byDate = new Map<string, Transaction[]>();
  for (const t of transactions) byDate.set(t.date, [...(byDate.get(t.date) ?? []), t]);
  return [...byDate.entries()]
    .sort(([a], [b]) => b.localeCompare(a))
    .map(([date, items]) => ({
      date,
      transactions: [...items].sort((a, b) => b.id.localeCompare(a.id)),
      income: sum(items.filter((t) => t.type === "income").map((t) => t.amount)),
      expense: sum(items.filter((t) => t.type === "expense").map((t) => t.amount)),
    }));
}

export interface BudgetPace {
  budget: number;
  spent: number;
  left: number; // งบ − จ่ายจริง (ติดลบ = ใช้เกินงบ)
  totalDays: number;
  elapsedDays: number;
  elapsedRatio: number; // 0–1 ตำแหน่ง "วันนี้" บนแถบ
  expectedSpent: number;
  paceDelta: number; // บวก = ใช้เร็วกว่าแผน
  perDayLeft: number | null;
}

/** R22 */
export function budgetPace(plan: Plan, transactions: Transaction[], cycle: PayCycle, today: string): BudgetPace {
  const month = planMonthOfCycle(cycle);
  const budget = sum(plan.expenses.map((g) => groupTotalInMonth(g, month)));
  const spent = sum(transactionsInCycle(transactions, cycle).filter((t) => t.type === "expense").map((t) => t.amount));
  const totalDays = daysBetween(cycle.start, cycle.end) + 1;
  const elapsedDays = Math.min(totalDays, Math.max(0, daysBetween(cycle.start, today) + 1));
  const daysLeft = totalDays - elapsedDays;
  const left = round2(budget - spent);
  const expectedSpent = round2((budget * elapsedDays) / totalDays);
  return {
    budget,
    spent,
    left,
    totalDays,
    elapsedDays,
    elapsedRatio: elapsedDays / totalDays,
    expectedSpent,
    paceDelta: round2(spent - expectedSpent),
    perDayLeft: daysLeft > 0 && left > 0 ? round2(left / daysLeft) : null,
  };
}
