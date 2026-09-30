/**
 * Use cases: รายการจริง — เพิ่ม / แก้ไข / ลบ (บันทึกผ่าน TransactionRepository)
 */
import { validateTransaction, type Transaction, type TransactionInput } from "@/domain/entities/Transaction";
import type { ValidationError } from "@/domain/entities/validation";
import type { UseCaseContext } from "../context";
import type { TransactionRepository } from "../ports/TransactionRepository";

export type TransactionResult = { ok: true; transaction: Transaction } | { ok: false; errors: ValidationError[] };

/** เก็บเฉพาะ field ที่ใช้ได้ (รายรับไม่มีหมวด/กลุ่ม/เป้า, ตัดช่องว่างของโน้ต) */
function normalize(input: TransactionInput): TransactionInput {
  const note = input.note?.trim();
  const base = { date: input.date, type: input.type, amount: input.amount, ...(note ? { note } : {}) };
  if (input.type === "income") {
    return { ...base, ...(input.planIncomeId ? { planIncomeId: input.planIncomeId } : {}) };
  }
  return {
    ...base,
    category: input.category,
    ...(input.planGroupId ? { planGroupId: input.planGroupId } : {}),
    ...(input.goalId ? { goalId: input.goalId } : {}),
  };
}

export async function addTransaction(
  repository: TransactionRepository,
  planId: string,
  input: TransactionInput,
  ctx: UseCaseContext,
): Promise<TransactionResult> {
  const errors = validateTransaction(input);
  if (errors.length > 0) return { ok: false, errors };
  const transaction: Transaction = { id: ctx.generateId(), ...normalize(input) };
  await repository.save(planId, transaction);
  return { ok: true, transaction };
}

export async function updateTransaction(
  repository: TransactionRepository,
  planId: string,
  transaction: Transaction,
): Promise<TransactionResult> {
  const errors = validateTransaction(transaction);
  if (errors.length > 0) return { ok: false, errors };
  const updated: Transaction = { id: transaction.id, ...normalize(transaction) };
  await repository.save(planId, updated);
  return { ok: true, transaction: updated };
}

export function deleteTransaction(repository: TransactionRepository, planId: string, id: string): Promise<void> {
  return repository.delete(planId, id);
}

export function listTransactions(repository: TransactionRepository, planId: string): Promise<Transaction[]> {
  return repository.list(planId).then((all) => [...all].sort((a, b) => a.date.localeCompare(b.date)));
}
