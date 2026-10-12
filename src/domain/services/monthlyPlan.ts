/**
 * แผนรายเดือน (Phase 13.1 — PLAN.md R35, R36)
 *
 * ต่างจากมุมมอง "เฉลี่ยต่อเดือน" (R1–R3) ตรงที่ใช้ "เดือนจริง":
 *   R35 monthly → ทุกเดือน · yearly ที่มีวันที่ → เฉพาะเดือนของวันที่ (ทุกปี), ไม่มีวันที่ → ÷ 12
 *       one-time → เฉพาะเดือนของวันที่ (ปีเดียวกัน)
 *   R36 รอบเงินเดือน → เดือนของแผน = เดือนที่รอบมีจำนวนวันมากสุด (เท่ากัน → เดือนหลัง)
 *
 * มุมมองเฉลี่ยต่อเดือน + Sankey ของแท็บวางแผนยังใช้ amountInPeriod เหมือนเดิม
 */
import type { CategoryId } from "../entities/Category";
import type { ExpenseGroup } from "../entities/Expense";
import { addDays, daysBetween, type PayCycle } from "../entities/PayCycle";
import type { YearMonth } from "../entities/Period";
import type { Plan } from "../entities/Plan";
import type { MoneyEntry } from "./amountInPeriod";

const sum = (values: number[]) => values.reduce((total, value) => total + value, 0);

function yearMonthOf(date: string): YearMonth {
  const [year, month] = date.split("-").map(Number);
  return { year, month };
}

/** R35 — ยอดของรายการในเดือนจริง (year, month) */
export function amountInMonth({ amount, frequency, date }: MoneyEntry, month: YearMonth): number {
  switch (frequency) {
    case "monthly":
      return amount;
    case "yearly":
      return date ? (yearMonthOf(date).month === month.month ? amount : 0) : amount / 12;
    case "one-time": {
      if (!date) return 0;
      const when = yearMonthOf(date);
      return when.year === month.year && when.month === month.month ? amount : 0;
    }
  }
}

/** R35 + R6 — ยอดของกลุ่มในเดือนจริง */
export function groupTotalInMonth(group: ExpenseGroup, month: YearMonth): number {
  if (group.items.length > 0) return sum(group.items.map((item) => amountInMonth(item, month)));
  return amountInMonth({ amount: group.amount ?? 0, frequency: group.frequency ?? "monthly", date: group.date }, month);
}

/** R36 — รอบเงินเดือนนี้เทียบกับแผนของเดือนไหน */
export function planMonthOfCycle(cycle: PayCycle): YearMonth {
  const days = new Map<string, number>();
  const total = daysBetween(cycle.start, cycle.end) + 1;
  for (let i = 0; i < total; i++) {
    const key = addDays(cycle.start, i).slice(0, 7);
    days.set(key, (days.get(key) ?? 0) + 1);
  }
  // เรียงตามเดือน → เดือนหลังชนะเมื่อจำนวนวันเท่ากัน
  const [best] = [...days.entries()].sort(([a, da], [b, db]) => db - da || b.localeCompare(a));
  return yearMonthOf(`${best[0]}-01`);
}

export interface MonthPlanLine {
  id: string;
  name: string;
  amount: number;
  category?: CategoryId; // เฉพาะรายจ่าย
}

export interface MonthPlan {
  month: YearMonth;
  income: number;
  expense: number;
  remaining: number;
  incomes: MonthPlanLine[];
  groups: MonthPlanLine[];
}

export function monthPlan(plan: Plan, month: YearMonth): MonthPlan {
  const incomes = plan.incomes.map((i) => ({ id: i.id, name: i.name, amount: amountInMonth(i, month) }));
  const groups = plan.expenses.map((g) => ({ id: g.id, name: g.name, category: g.category, amount: groupTotalInMonth(g, month) }));
  const income = sum(incomes.map((l) => l.amount));
  const expense = sum(groups.map((l) => l.amount));
  return { month, income, expense, remaining: income - expense, incomes, groups };
}

/** แผน 12 เดือนของปี */
export function yearPlan(plan: Plan, year: number): MonthPlan[] {
  return Array.from({ length: 12 }, (_, i) => monthPlan(plan, { year, month: i + 1 }));
}

export interface SpecialItem {
  name: string; // "กลุ่ม · รายการ" หรือชื่อรายได้
  amount: number;
  kind: "income" | "expense";
}

/** รายการพิเศษของเดือน = รายปีที่ครบเดือนนี้ + ครั้งเดียวในเดือนนี้ (ช่วยอธิบายว่าทำไมเดือนนี้หนัก/เบา) */
export function specialItemsInMonth(plan: Plan, month: YearMonth): SpecialItem[] {
  const isSpecial = (e: MoneyEntry) => (e.frequency === "yearly" && !!e.date) || e.frequency === "one-time";
  const result: SpecialItem[] = [];
  for (const i of plan.incomes) {
    if (isSpecial(i) && amountInMonth(i, month) > 0) result.push({ name: i.name, amount: i.amount, kind: "income" });
  }
  for (const g of plan.expenses) {
    const entries = g.items.length > 0 ? g.items.map((it) => ({ ...it, label: `${g.name} · ${it.name}` })) : [{ amount: g.amount ?? 0, frequency: g.frequency ?? "monthly", date: g.date, label: g.name }];
    for (const e of entries) if (isSpecial(e) && amountInMonth(e, month) > 0) result.push({ name: e.label, amount: e.amount, kind: "expense" });
  }
  return result;
}
