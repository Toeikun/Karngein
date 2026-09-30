/**
 * สรุป "รายการจริง" ต่อรอบเงินเดือน และเทียบกับงบในแผน
 *
 *   R16 คงเหลือของรอบ = รับ − จ่าย (เงินออมเข้าเป้านับเป็นรายจ่าย — D13)
 *   R17 งบของกลุ่มต่อรอบ = ยอดรายเดือนของกลุ่มในแผน, % ใช้ไป = จ่ายจริงของกลุ่ม ÷ งบ
 */
import { CATEGORIES, type CategoryId } from "../entities/Category";
import { isInCycle, type PayCycle } from "../entities/PayCycle";
import type { Plan } from "../entities/Plan";
import type { Transaction } from "../entities/Transaction";
import { groupTotal, percentOf, type CategorySummary } from "./summarize";

const sum = (values: number[]) => values.reduce((total, value) => total + value, 0);

export interface CycleSummary {
  income: number;
  expense: number;
  remaining: number;
  byCategory: Record<CategoryId, number>;
  count: number;
}

export function transactionsInCycle(transactions: Transaction[], cycle: PayCycle): Transaction[] {
  return transactions.filter((t) => isInCycle(t.date, cycle));
}

export function summarizeCycle(transactions: Transaction[], cycle: PayCycle): CycleSummary {
  const inCycle = transactionsInCycle(transactions, cycle);
  const incomes = inCycle.filter((t) => t.type === "income");
  const expenses = inCycle.filter((t) => t.type === "expense");
  const income = sum(incomes.map((t) => t.amount));
  const expense = sum(expenses.map((t) => t.amount));
  const byCategory = Object.fromEntries(
    CATEGORIES.map((c) => [c.id, sum(expenses.filter((t) => t.category === c.id).map((t) => t.amount))]),
  ) as Record<CategoryId, number>;
  return { income, expense, remaining: income - expense, byCategory, count: inCycle.length };
}

export interface BudgetLine {
  groupId: string;
  name: string;
  category: CategoryId;
  budget: number; // งบต่อรอบ (ยอดรายเดือนของกลุ่ม)
  actual: number;
  percentUsed: number | null; // null = ไม่มีงบ (งบ 0) คำนวณ % ไม่ได้
  over: boolean;
}

export interface BudgetComparison {
  lines: BudgetLine[];
  unlinkedExpense: number; // รายจ่ายที่ไม่ได้ผูกกับกลุ่มใดในแผน
}

export function compareWithBudget(plan: Plan, transactions: Transaction[], cycle: PayCycle): BudgetComparison {
  const expenses = transactionsInCycle(transactions, cycle).filter((t) => t.type === "expense");
  const groupIds = new Set(plan.expenses.map((g) => g.id));

  const lines = plan.expenses.map((group) => {
    const budget = groupTotal(group, { kind: "monthly" });
    const actual = sum(expenses.filter((t) => t.planGroupId === group.id).map((t) => t.amount));
    return {
      groupId: group.id,
      name: group.name,
      category: group.category,
      budget,
      actual,
      percentUsed: budget > 0 ? (actual / budget) * 100 : null,
      over: actual > budget,
    };
  });

  const unlinkedExpense = sum(
    expenses.filter((t) => !t.planGroupId || !groupIds.has(t.planGroupId)).map((t) => t.amount),
  );
  return { lines, unlinkedExpense };
}

/** สัดส่วนของแต่ละหมวดเทียบรายรับจริงของรอบ (รูปแบบเดียวกับของแผน → ใช้การ์ดสัดส่วนตัวเดียวกันได้) */
export function cycleCategoryRatios(summary: CycleSummary): Record<CategoryId, CategorySummary> {
  return Object.fromEntries(
    CATEGORIES.map((c) => [c.id, { amount: summary.byCategory[c.id], percentOfIncome: percentOf(summary.byCategory[c.id], summary.income) }]),
  ) as Record<CategoryId, CategorySummary>;
}
