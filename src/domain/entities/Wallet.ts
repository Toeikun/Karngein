/**
 * Wallet — "กระเป๋าเงิน" ที่เงินอยู่จริง (Phase 12.2): เงินสด / บัญชีธนาคาร / วอลเล็ต / บัตรเครดิต
 *
 * - กระเป๋าเงิน (ไม่ใช่บัตร): openingBalance = เงินที่มีตอนเริ่มจด
 * - บัตรเครดิต: openingBalance = "ยอดค้าง" ตอนเริ่มจด (เป็นหนี้ ไม่ใช่เงินที่มี)
 * เก็บอยู่ในแผน (plan.wallets) เหมือนเป้าหมาย → ไม่ต้องแก้ Firestore rules
 */
import { isValidStartDay } from "./PayCycle";
import type { ValidationError } from "./validation";

export type WalletKind = "cash" | "bank" | "ewallet" | "credit";

export const WALLET_KINDS: readonly { id: WalletKind; label: string; icon: string }[] = [
  { id: "cash", label: "เงินสด", icon: "💵" },
  { id: "bank", label: "บัญชีธนาคาร", icon: "🏦" },
  { id: "ewallet", label: "วอลเล็ต", icon: "📱" },
  { id: "credit", label: "บัตรเครดิต", icon: "💳" },
];

export interface Wallet {
  id: string;
  name: string;
  kind: WalletKind;
  openingBalance: number; // ≥ 0
  creditLimit?: number; // บัตรเครดิต (ไม่บังคับ)
  statementDay?: number; // บัตรเครดิต: วันตัดรอบ 1–31
  dueDay?: number; // บัตรเครดิต: วันครบกำหนดชำระ 1–31
  archived?: boolean; // ซ่อนจากตัวเลือกตอนลงรายการ แต่ยอดยังนับ
}

export type WalletInput = Omit<Wallet, "id">;

export const isCredit = (wallet: Pick<Wallet, "kind">): boolean => wallet.kind === "credit";

export function isWalletKind(value: unknown): value is WalletKind {
  return WALLET_KINDS.some((k) => k.id === value);
}

const isNonNegative = (value: unknown): value is number => typeof value === "number" && Number.isFinite(value) && value >= 0;

export function validateWallet(input: Partial<WalletInput>): ValidationError[] {
  const errors: ValidationError[] = [];
  if (typeof input.name !== "string" || input.name.trim() === "") errors.push({ field: "name", message: "กรุณาตั้งชื่อกระเป๋า" });
  if (!isWalletKind(input.kind)) errors.push({ field: "kind", message: "กรุณาเลือกชนิดกระเป๋า" });
  if (!isNonNegative(input.openingBalance)) {
    errors.push({ field: "openingBalance", message: input.kind === "credit" ? "ยอดค้างต้องเป็น 0 ขึ้นไป" : "ยอดเริ่มต้นต้องเป็น 0 ขึ้นไป" });
  }
  if (input.kind === "credit") {
    if (input.creditLimit !== undefined && !(isNonNegative(input.creditLimit) && input.creditLimit > 0)) {
      errors.push({ field: "creditLimit", message: "วงเงินต้องมากกว่า 0 (หรือเว้นว่าง)" });
    }
    if (input.statementDay !== undefined && !isValidStartDay(input.statementDay)) {
      errors.push({ field: "statementDay", message: "วันตัดรอบต้องเป็น 1–31" });
    }
    if (input.dueDay !== undefined && !isValidStartDay(input.dueDay)) {
      errors.push({ field: "dueDay", message: "วันครบกำหนดต้องเป็น 1–31" });
    }
    if ((input.statementDay === undefined) !== (input.dueDay === undefined)) {
      errors.push({ field: "dueDay", message: "ใส่ทั้งวันตัดรอบและวันครบกำหนด หรือเว้นว่างทั้งคู่" });
    }
  }
  return errors;
}
