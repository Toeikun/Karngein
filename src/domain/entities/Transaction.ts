/**
 * Transaction — รายการรับ/จ่าย "ที่เกิดขึ้นจริง" (ต่างจากแผนที่เป็นความถี่)
 *
 * ผูกกับแผนได้ (D11): planGroupId → เทียบกับงบของกลุ่ม, planIncomeId → รายได้ในแผน, goalId → เข้าเป้าหมาย
 * Phase 12.2: walletId = กระเป๋าที่ใช้ (โอน = ต้นทาง), toWalletId = ปลายทางของการโอน
 *   การโอนไม่ใช่รายรับ/รายจ่าย (R25) — เช่น ถอนเงินสด, เติมวอลเล็ต, จ่ายบัตรเครดิต
 */
import { isCategoryId, type CategoryId } from "./Category";
import { isValidIsoDate, type ValidationError } from "./validation";

export type TransactionType = "income" | "expense" | "transfer";

export interface Transaction {
  id: string;
  date: string; // 'YYYY-MM-DD'
  type: TransactionType;
  amount: number; // > 0
  merchant?: string; // ร้าน / ผู้รับ / ผู้จ่าย (Phase 12.1)
  note?: string; // พิมพ์ #tag ในโน้ตได้ เช่น "ข้าวกับเพื่อน #ทำงาน"
  category?: CategoryId; // บังคับเมื่อเป็นรายจ่าย
  planGroupId?: string;
  planIncomeId?: string;
  goalId?: string;
  walletId?: string;
  toWalletId?: string;
}

export type TransactionInput = Omit<Transaction, "id">;

export function validateTransaction(input: Partial<TransactionInput>): ValidationError[] {
  const errors: ValidationError[] = [];
  if (!isValidIsoDate(input.date)) errors.push({ field: "date", message: "กรุณาเลือกวันที่" });
  if (input.type !== "income" && input.type !== "expense" && input.type !== "transfer") {
    errors.push({ field: "type", message: "กรุณาเลือกรายรับ รายจ่าย หรือโอน" });
  }
  if (typeof input.amount !== "number" || !Number.isFinite(input.amount) || input.amount <= 0) {
    errors.push({ field: "amount", message: "จำนวนเงินต้องมากกว่า 0" });
  }
  if (input.type === "expense" && !isCategoryId(input.category)) {
    errors.push({ field: "category", message: "รายจ่ายต้องเลือกหมวด" });
  }
  if (input.type === "income" && input.goalId) {
    errors.push({ field: "goalId", message: "รายรับผูกกับเป้าหมายไม่ได้ (ลงเงินออมเข้าเป้าเป็นรายจ่าย)" });
  }
  if (input.type === "transfer") {
    // R29: โอนต้องมีต้นทาง/ปลายทางคนละใบ และไม่ผูกหมวด/แผน/เป้า
    if (!input.walletId) errors.push({ field: "walletId", message: "กรุณาเลือกกระเป๋าต้นทาง" });
    if (!input.toWalletId) errors.push({ field: "toWalletId", message: "กรุณาเลือกกระเป๋าปลายทาง" });
    else if (input.toWalletId === input.walletId) errors.push({ field: "toWalletId", message: "ต้นทางกับปลายทางต้องเป็นคนละกระเป๋า" });
    if (input.category || input.planGroupId || input.planIncomeId || input.goalId) {
      errors.push({ field: "type", message: "การโอนผูกกับหมวด/แผน/เป้าหมายไม่ได้" });
    }
  } else if (input.toWalletId) {
    errors.push({ field: "toWalletId", message: "มีกระเป๋าปลายทางได้เฉพาะการโอน" });
  }
  return errors;
}

export const isTransfer = (t: Pick<Transaction, "type">): boolean => t.type === "transfer";
