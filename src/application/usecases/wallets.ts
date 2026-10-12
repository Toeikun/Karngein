/**
 * Use cases: กระเป๋าเงิน — เพิ่ม / แก้ไข / ซ่อน / ลบ (เก็บอยู่ในแผน → คืน PlanResult เหมือนเป้าหมาย)
 *
 * R29: ลบได้เฉพาะกระเป๋าที่ยังไม่มีรายการอ้างอิง — ถ้ามีให้ "ซ่อน" แทน (ยอดยังนับ ประวัติไม่หาย)
 */
import { walletsOf, type Plan } from "@/domain/entities/Plan";
import type { Transaction } from "@/domain/entities/Transaction";
import { isCredit, validateWallet, type Wallet, type WalletInput } from "@/domain/entities/Wallet";
import { walletUsage } from "@/domain/services/walletBalances";
import type { UseCaseContext } from "../context";
import { failure, notFound, success, touch, type PlanResult } from "../result";

/** ตัดช่องว่าง และเก็บข้อมูลบัตรเครดิตเฉพาะกระเป๋าที่เป็นบัตร */
function normalize(input: WalletInput): WalletInput {
  const base: WalletInput = { name: input.name.trim(), kind: input.kind, openingBalance: input.openingBalance };
  if (input.archived) base.archived = true;
  if (!isCredit(input)) return base;
  return {
    ...base,
    ...(input.creditLimit ? { creditLimit: input.creditLimit } : {}),
    ...(input.statementDay && input.dueDay ? { statementDay: input.statementDay, dueDay: input.dueDay } : {}),
  };
}

export function addWallet(plan: Plan, input: WalletInput, ctx: UseCaseContext): PlanResult {
  const errors = validateWallet(input);
  if (errors.length > 0) return failure(errors);
  const wallet: Wallet = { id: ctx.generateId(), ...normalize(input) };
  return success(touch({ ...plan, wallets: [...walletsOf(plan), wallet] }, ctx.now()));
}

export function updateWallet(plan: Plan, id: string, input: WalletInput, ctx: UseCaseContext): PlanResult {
  if (!walletsOf(plan).some((w) => w.id === id)) return notFound("กระเป๋า");
  const errors = validateWallet(input);
  if (errors.length > 0) return failure(errors);
  const wallets = walletsOf(plan).map((w) => (w.id === id ? { id, ...normalize(input) } : w));
  return success(touch({ ...plan, wallets }, ctx.now()));
}

export function setWalletArchived(plan: Plan, id: string, archived: boolean, ctx: UseCaseContext): PlanResult {
  const wallet = walletsOf(plan).find((w) => w.id === id);
  if (!wallet) return notFound("กระเป๋า");
  const next: Wallet = { ...wallet, archived: true };
  if (!archived) delete next.archived; // ไม่เก็บ archived: false ไว้ในข้อมูล
  return success(touch({ ...plan, wallets: walletsOf(plan).map((w) => (w.id === id ? next : w)) }, ctx.now()));
}

export function removeWallet(plan: Plan, id: string, transactions: Transaction[], ctx: UseCaseContext): PlanResult {
  if (!walletsOf(plan).some((w) => w.id === id)) return notFound("กระเป๋า");
  const used = walletUsage(transactions, id);
  if (used > 0) {
    return failure([{ field: "id", message: `มี ${used} รายการใช้กระเป๋านี้ — ลบไม่ได้ (ซ่อนกระเป๋าแทนได้ ยอดและประวัติยังอยู่)` }]);
  }
  return success(touch({ ...plan, wallets: walletsOf(plan).filter((w) => w.id !== id) }, ctx.now()));
}
