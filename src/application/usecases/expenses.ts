/**
 * Use cases: รายจ่าย — กลุ่ม และรายการย่อย
 *
 * กติกาเพิ่มเติมที่ต้องรู้:
 * - กลุ่มที่ "ไม่มีรายการย่อย" ใช้ amount/frequency ของกลุ่มเอง (R6)
 * - เมื่อเพิ่มรายการย่อยแรก → ลบ amount/frequency ของกลุ่มทิ้ง (ยอดมาจากรายการย่อยแทน)
 * - เมื่อลบรายการย่อยตัวสุดท้าย → กลุ่มยังอยู่ และยอดกลุ่ม = 0 (amount 0 รายเดือน)
 */
import type { CategoryId } from "@/domain/entities/Category";
import { categoryOrder } from "@/domain/entities/Category";
import {
  validateExpenseGroup,
  validateExpenseItem,
  type ExpenseGroup,
  type ExpenseItem,
} from "@/domain/entities/Expense";
import type { Frequency } from "@/domain/entities/Frequency";
import type { Plan } from "@/domain/entities/Plan";
import type { UseCaseContext } from "../context";
import { failure, notFound, success, touch, type PlanResult } from "../result";
import { normalizeMoneyEntry } from "./normalize";

export type ExpenseItemInput = Omit<ExpenseItem, "id">;

export interface ExpenseGroupInput {
  name: string;
  category: CategoryId;
  items?: ExpenseItemInput[];
  amount?: number;
  frequency?: Frequency;
  date?: string;
}

/** แทนที่กลุ่ม id นั้นด้วยผลของ fn — คืน null ถ้าไม่เจอกลุ่ม */
function mapGroup(
  plan: Plan,
  groupId: string,
  fn: (group: ExpenseGroup) => ExpenseGroup,
): ExpenseGroup[] | null {
  if (!plan.expenses.some((group) => group.id === groupId)) return null;
  return plan.expenses.map((group) => (group.id === groupId ? fn(group) : group));
}

/** กลุ่มที่มีรายการย่อยไม่ต้องเก็บ amount/frequency/date ของตัวเอง */
function withoutOwnAmount(group: ExpenseGroup): ExpenseGroup {
  const copy = { ...group };
  delete copy.amount;
  delete copy.frequency;
  delete copy.date;
  return copy;
}

export function addExpenseGroup(
  plan: Plan,
  input: ExpenseGroupInput,
  ctx: UseCaseContext,
): PlanResult {
  const items = input.items ?? [];
  const errors = validateExpenseGroup({ ...input, items });
  if (errors.length > 0) return failure(errors);

  const base: ExpenseGroup = {
    id: ctx.generateId(),
    name: input.name.trim(),
    category: input.category,
    items: items.map((item) =>
      normalizeMoneyEntry({ ...item, name: item.name.trim(), id: ctx.generateId() }),
    ),
  };
  const group =
    items.length > 0
      ? base
      : normalizeMoneyEntry({
          ...base,
          amount: input.amount!,
          frequency: input.frequency!,
          date: input.date,
        });

  return success(touch({ ...plan, expenses: [...plan.expenses, group] }, ctx.now()));
}

export function updateExpenseGroup(
  plan: Plan,
  groupId: string,
  changes: Partial<Omit<ExpenseGroupInput, "items">>,
  ctx: UseCaseContext,
): PlanResult {
  const current = plan.expenses.find((group) => group.id === groupId);
  if (!current) return notFound("กลุ่มรายจ่าย");

  let updated: ExpenseGroup = { ...current, ...changes, id: groupId, items: current.items };
  updated =
    updated.items.length > 0
      ? withoutOwnAmount(updated)
      : normalizeMoneyEntry({ ...updated, frequency: updated.frequency ?? "monthly" });

  const errors = validateExpenseGroup(updated);
  if (errors.length > 0) return failure(errors);

  const expenses = mapGroup(plan, groupId, () => ({ ...updated, name: updated.name.trim() }))!;
  return success(touch({ ...plan, expenses }, ctx.now()));
}

export function removeExpenseGroup(plan: Plan, groupId: string, ctx: UseCaseContext): PlanResult {
  if (!plan.expenses.some((group) => group.id === groupId)) return notFound("กลุ่มรายจ่าย");
  const expenses = plan.expenses.filter((group) => group.id !== groupId);
  return success(touch({ ...plan, expenses }, ctx.now()));
}

export function addExpenseItem(
  plan: Plan,
  groupId: string,
  input: ExpenseItemInput,
  ctx: UseCaseContext,
): PlanResult {
  const errors = validateExpenseItem(input);
  if (errors.length > 0) return failure(errors);

  const item: ExpenseItem = normalizeMoneyEntry({
    ...input,
    name: input.name.trim(),
    id: ctx.generateId(),
  });
  const expenses = mapGroup(plan, groupId, (group) =>
    withoutOwnAmount({ ...group, items: [...group.items, item] }),
  );
  if (!expenses) return notFound("กลุ่มรายจ่าย");
  return success(touch({ ...plan, expenses }, ctx.now()));
}

export function updateExpenseItem(
  plan: Plan,
  groupId: string,
  itemId: string,
  changes: Partial<ExpenseItemInput>,
  ctx: UseCaseContext,
): PlanResult {
  const group = plan.expenses.find((g) => g.id === groupId);
  const current = group?.items.find((item) => item.id === itemId);
  if (!group || !current) return notFound("รายการย่อย");

  const updated: ExpenseItem = normalizeMoneyEntry({ ...current, ...changes, id: itemId });
  const errors = validateExpenseItem(updated);
  if (errors.length > 0) return failure(errors);

  const expenses = mapGroup(plan, groupId, (g) => ({
    ...g,
    items: g.items.map((item) =>
      item.id === itemId ? { ...updated, name: updated.name.trim() } : item,
    ),
  }))!;
  return success(touch({ ...plan, expenses }, ctx.now()));
}

export function removeExpenseItem(
  plan: Plan,
  groupId: string,
  itemId: string,
  ctx: UseCaseContext,
): PlanResult {
  const group = plan.expenses.find((g) => g.id === groupId);
  if (!group || !group.items.some((item) => item.id === itemId)) return notFound("รายการย่อย");

  const expenses = mapGroup(plan, groupId, (g) => {
    const items = g.items.filter((item) => item.id !== itemId);
    // ลบตัวสุดท้าย → กลุ่มยังอยู่ ยอด = 0
    return items.length > 0 ? { ...g, items } : { ...g, items, amount: 0, frequency: "monthly" };
  })!;
  return success(touch({ ...plan, expenses }, ctx.now()));
}

/**
 * จัดระเบียบ: เรียงกลุ่มตามลำดับหมวด essential → wants → investment → emergency → reward
 * กลุ่มในหมวดเดียวกันคงลำดับเดิม (stable sort)
 */
export function organizeExpenses(plan: Plan, ctx: UseCaseContext): PlanResult {
  const expenses = [...plan.expenses].sort(
    (a, b) => categoryOrder(a.category) - categoryOrder(b.category),
  );
  return success(touch({ ...plan, expenses }, ctx.now()));
}
