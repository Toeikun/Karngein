/**
 * Use cases: รายได้ — เพิ่ม / แก้ไข / ลบ
 *
 * ทุกฟังก์ชันเป็น pure function: รับแผนเดิม → คืนแผน "ก้อนใหม่"
 * ห้ามแก้ plan ที่รับเข้ามา (immutability) เพราะ React ดูว่าข้อมูลเปลี่ยนจากการเป็น object ใหม่
 */
import { validateIncome, type Income } from "@/domain/entities/Income";
import type { Plan } from "@/domain/entities/Plan";
import type { UseCaseContext } from "../context";
import { failure, notFound, success, touch, type PlanResult } from "../result";
import { normalizeMoneyEntry } from "./normalize";

export type IncomeInput = Omit<Income, "id">;

export function addIncome(plan: Plan, input: IncomeInput, ctx: UseCaseContext): PlanResult {
  const errors = validateIncome(input);
  if (errors.length > 0) return failure(errors);

  const income: Income = normalizeMoneyEntry({ ...input, name: input.name.trim(), id: ctx.generateId() });
  return success(touch({ ...plan, incomes: [...plan.incomes, income] }, ctx.now()));
}

export function updateIncome(
  plan: Plan,
  id: string,
  changes: Partial<IncomeInput>,
  ctx: UseCaseContext,
): PlanResult {
  const current = plan.incomes.find((income) => income.id === id);
  if (!current) return notFound("รายได้");

  const updated: Income = normalizeMoneyEntry({ ...current, ...changes, id });
  const errors = validateIncome(updated);
  if (errors.length > 0) return failure(errors);

  const incomes = plan.incomes.map((income) =>
    income.id === id ? { ...updated, name: updated.name.trim() } : income,
  );
  return success(touch({ ...plan, incomes }, ctx.now()));
}

export function removeIncome(plan: Plan, id: string, ctx: UseCaseContext): PlanResult {
  if (!plan.incomes.some((income) => income.id === id)) return notFound("รายได้");
  const incomes = plan.incomes.filter((income) => income.id !== id);
  return success(touch({ ...plan, incomes }, ctx.now()));
}
