/**
 * summarize — คำนวณตัวเลขสรุปของแผน ในมุมมองเวลาที่เลือก
 *
 *   R6  ยอดกลุ่ม = ผลรวมรายการย่อย (ถ้ามี) ไม่เช่นนั้นใช้ amount ของกลุ่ม
 *   R7  รายจ่ายรวม = ผลรวมทุกหมวด (รวมออม/ลงทุน และสำรองฉุกเฉิน)
 *   R8  ออม/ลงทุน = หมวด investment + emergency
 *   R9  เงินคงเหลือ = รายได้รวม − รายจ่ายรวม (ติดลบได้)
 *   R10 % หมวด = ยอดหมวด ÷ รายได้รวม × 100 (รายได้ = 0 → 0%)
 */
import { CATEGORIES, SAVING_CATEGORY_IDS, type CategoryId } from "../entities/Category";
import type { ExpenseGroup } from "../entities/Expense";
import type { Period } from "../entities/Period";
import type { Plan } from "../entities/Plan";
import { amountInPeriod } from "./amountInPeriod";

export interface CategorySummary {
  amount: number;
  percentOfIncome: number; // 0–100 (อาจเกิน 100 ถ้าใช้เงินเกินรายได้)
}

export interface PlanSummary {
  income: number;
  expense: number;
  saving: number;
  remaining: number;
  byCategory: Record<CategoryId, CategorySummary>;
}

const sum = (values: number[]) => values.reduce((total, value) => total + value, 0);

/** % ของรายได้ — กันหารด้วยศูนย์ (R10) */
export function percentOf(amount: number, income: number): number {
  return income === 0 ? 0 : (amount / income) * 100;
}

/** ยอดรวมของกลุ่มรายจ่าย (R6) */
export function groupTotal(group: ExpenseGroup, period: Period): number {
  if (group.items.length > 0) {
    return sum(group.items.map((item) => amountInPeriod(item, period)));
  }
  return amountInPeriod(
    { amount: group.amount ?? 0, frequency: group.frequency ?? "monthly", date: group.date },
    period,
  );
}

export function summarize(plan: Plan, period: Period): PlanSummary {
  const income = sum(plan.incomes.map((entry) => amountInPeriod(entry, period)));

  const categoryAmounts = Object.fromEntries(
    CATEGORIES.map((category) => [
      category.id,
      sum(
        plan.expenses
          .filter((group) => group.category === category.id)
          .map((group) => groupTotal(group, period)),
      ),
    ]),
  ) as Record<CategoryId, number>;

  const expense = sum(Object.values(categoryAmounts)); // R7
  const saving = sum(SAVING_CATEGORY_IDS.map((id) => categoryAmounts[id])); // R8

  const byCategory = Object.fromEntries(
    CATEGORIES.map((category) => {
      const amount = categoryAmounts[category.id];
      return [category.id, { amount, percentOfIncome: percentOf(amount, income) }];
    }),
  ) as Record<CategoryId, CategorySummary>;

  return {
    income,
    expense,
    saving,
    remaining: income - expense, // R9
    byCategory,
  };
}
