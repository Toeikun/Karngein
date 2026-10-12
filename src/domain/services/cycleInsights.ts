/**
 * ข้อมูลสำหรับแท็บ "สรุป" (Phase 12.3 — PLAN.md R30–R34)
 * นับเฉพาะรายรับ/รายจ่าย ไม่นับการโอน (R25)
 */
import { CATEGORIES, type CategoryId } from "../entities/Category";
import { formatBaht } from "../entities/Money";
import { addDays, daysBetween, type PayCycle } from "../entities/PayCycle";
import type { Plan } from "../entities/Plan";
import type { Transaction } from "../entities/Transaction";
import { compareWithBudget, transactionsInCycle } from "./cycleSummary";
import { budgetPace } from "./dailyView";
import { dueAlerts } from "./walletBalances";

const sum = (values: number[]) => values.reduce((total, value) => total + value, 0);
const round2 = (value: number) => Math.round(value * 100) / 100;
const expensesOf = (transactions: Transaction[]) => transactions.filter((t) => t.type === "expense");

// ---------- R30 ปฏิทินรายวัน ----------

export interface DayTotal {
  date: string;
  income: number;
  expense: number;
}

export function dailyTotals(transactions: Transaction[], cycle: PayCycle): DayTotal[] {
  const days = daysBetween(cycle.start, cycle.end) + 1;
  const inCycle = transactionsInCycle(transactions, cycle);
  return Array.from({ length: days }, (_, i) => {
    const date = addDays(cycle.start, i);
    const ofDay = inCycle.filter((t) => t.date === date);
    return {
      date,
      income: round2(sum(ofDay.filter((t) => t.type === "income").map((t) => t.amount))),
      expense: round2(sum(ofDay.filter((t) => t.type === "expense").map((t) => t.amount))),
    };
  });
}

// ---------- R31 สัดส่วนหมวด + อันดับร้าน ----------

export interface CategoryShare {
  category: CategoryId;
  amount: number;
  percent: number; // ของรายจ่ายรวมรอบนี้ ปัด 1 ตำแหน่งจากค่าจริงครั้งเดียว (ปัด 2 ชั้นทำให้ 8.4507 → 8.45 → 8.4 ผิด)
}

export function categoryBreakdown(transactions: Transaction[], cycle: PayCycle): CategoryShare[] {
  const expenses = expensesOf(transactionsInCycle(transactions, cycle));
  const total = sum(expenses.map((t) => t.amount));
  if (total === 0) return [];
  return CATEGORIES.map((c) => {
    const amount = round2(sum(expenses.filter((t) => t.category === c.id).map((t) => t.amount)));
    return { category: c.id, amount, percent: Math.round((amount / total) * 1000) / 10 };
  })
    .filter((share) => share.amount > 0)
    .sort((a, b) => b.amount - a.amount);
}

export interface MerchantRank {
  name: string;
  amount: number;
  count: number;
}

/** ชื่อที่ใช้จัดอันดับ: ร้าน > กลุ่มในแผน > หมวด */
function rankName(t: Transaction, plan: Plan): string {
  const merchant = t.merchant?.trim();
  if (merchant) return merchant;
  return plan.expenses.find((g) => g.id === t.planGroupId)?.name ?? CATEGORIES.find((c) => c.id === t.category)?.label ?? "ไม่ระบุ";
}

export function topMerchants(plan: Plan, transactions: Transaction[], cycle: PayCycle, limit = 5): MerchantRank[] {
  const groups = new Map<string, MerchantRank>();
  for (const t of expensesOf(transactionsInCycle(transactions, cycle))) {
    const name = rankName(t, plan);
    const key = name.toLowerCase().replace(/\s+/g, " ");
    const current = groups.get(key) ?? { name, amount: 0, count: 0 };
    groups.set(key, { name: current.name, amount: round2(current.amount + t.amount), count: current.count + 1 });
  }
  return [...groups.values()].sort((a, b) => b.amount - a.amount || b.count - a.count).slice(0, limit);
}

// ---------- R32 burn-down ----------

export interface BurnPoint {
  date: string;
  spent: number; // สะสมถึงวันนั้น
  ideal: number; // ถ้าใช้สม่ำเสมอ
}

export interface BurnDown {
  budget: number;
  totalDays: number;
  points: BurnPoint[]; // ตั้งแต่วันแรกของรอบ ถึง min(วันนี้, วันสุดท้าย)
}

export function burnDown(plan: Plan, transactions: Transaction[], cycle: PayCycle, today: string): BurnDown {
  const { budget, totalDays, elapsedDays } = budgetPace(plan, transactions, cycle, today);
  const days = dailyTotals(transactions, cycle).slice(0, elapsedDays);
  let running = 0;
  const points = days.map((day, i) => {
    running = round2(running + day.expense);
    return { date: day.date, spent: running, ideal: round2((budget * (i + 1)) / totalDays) };
  });
  return { budget, totalDays, points };
}

// ---------- R33 เทียบรอบก่อนช่วงเดียวกัน ----------

export interface CycleComparison {
  days: number; // จำนวนวันที่เทียบ
  expense: number;
  previousExpense: number;
  changePercent: number | null; // % เต็ม (ปัดครั้งเดียว) · รอบก่อน 0 → null
  averagePerDay: number;
  biggestIncrease: { category: CategoryId; delta: number } | null;
}

export function compareWithPrevious(transactions: Transaction[], cycle: PayCycle, previous: PayCycle, today: string): CycleComparison {
  const totalDays = daysBetween(cycle.start, cycle.end) + 1;
  const days = Math.min(totalDays, Math.max(1, daysBetween(cycle.start, today) + 1));
  const window = (c: PayCycle): PayCycle => ({ start: c.start, end: addDays(c.start, days - 1) < c.end ? addDays(c.start, days - 1) : c.end });
  const now = expensesOf(transactionsInCycle(transactions, window(cycle)));
  const before = expensesOf(transactionsInCycle(transactions, window(previous)));
  const expense = round2(sum(now.map((t) => t.amount)));
  const previousExpense = round2(sum(before.map((t) => t.amount)));

  let biggestIncrease: CycleComparison["biggestIncrease"] = null;
  for (const c of CATEGORIES) {
    const delta = round2(sum(now.filter((t) => t.category === c.id).map((t) => t.amount)) - sum(before.filter((t) => t.category === c.id).map((t) => t.amount)));
    if (delta > 0 && (!biggestIncrease || delta > biggestIncrease.delta)) biggestIncrease = { category: c.id, delta };
  }

  return {
    days,
    expense,
    previousExpense,
    changePercent: previousExpense > 0 ? Math.round(((expense - previousExpense) / previousExpense) * 100) : null,
    averagePerDay: round2(expense / days),
    biggestIncrease,
  };
}

// ---------- R34 การแจ้งเตือนรวม ----------

export type NoticeKind = "card-overdue" | "card-due" | "over-budget" | "pace" | "unlinked";

export interface Notice {
  kind: NoticeKind;
  title: string;
  detail: string;
  tone: "danger" | "warning" | "info";
  walletId?: string; // card-* → ใช้เปิดแผ่น "จ่ายบัตร"
  amount?: number;
}

export const PACE_NOTICE_RATIO = 0.1; // ใช้เร็วกว่าแผนเกิน 10% ของงบ ถึงเตือน

export function notices(plan: Plan, transactions: Transaction[], cycle: PayCycle, today: string): Notice[] {
  const result: Notice[] = [];
  for (const { wallet, statement } of dueAlerts(plan, transactions, today)) {
    const overdue = statement.status === "overdue";
    result.push({
      kind: overdue ? "card-overdue" : "card-due",
      title: overdue ? `${wallet.name} เลยกำหนดชำระ` : `${wallet.name} ใกล้ครบกำหนดชำระ`,
      detail: `ต้องจ่ายอีก ${formatBaht(statement.remaining)}`,
      tone: overdue ? "danger" : "warning",
      walletId: wallet.id,
      amount: statement.remaining,
    });
  }
  for (const line of compareWithBudget(plan, transactions, cycle).lines.filter((l) => l.over)) {
    result.push({ kind: "over-budget", title: `${line.name} ใช้เกินงบ`, detail: `เกิน ${formatBaht(round2(line.actual - line.budget))}`, tone: "danger" });
  }
  const pace = budgetPace(plan, transactions, cycle, today);
  if (pace.budget > 0 && pace.paceDelta > pace.budget * PACE_NOTICE_RATIO) {
    result.push({ kind: "pace", title: "ใช้เร็วกว่าแผน", detail: `เกินจังหวะที่ควรใช้ ${formatBaht(pace.paceDelta)}`, tone: "warning" });
  }
  const groupIds = new Set(plan.expenses.map((g) => g.id));
  const unlinked = expensesOf(transactionsInCycle(transactions, cycle)).filter((t) => !t.planGroupId || !groupIds.has(t.planGroupId));
  if (plan.expenses.length > 0 && unlinked.length > 0) {
    result.push({ kind: "unlinked", title: `${unlinked.length} รายจ่ายยังไม่ได้ผูกกลุ่ม`, detail: "ผูกกลุ่มเพื่อให้เทียบงบได้ครบ", tone: "info" });
  }
  return result;
}
