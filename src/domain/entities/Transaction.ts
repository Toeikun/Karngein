/**
 * Transaction — รายการรับ/จ่าย "ที่เกิดขึ้นจริง" (ต่างจากแผนที่เป็นความถี่)
 *
 * ผูกกับแผนได้ (D11): planGroupId → เทียบกับงบของกลุ่ม, planIncomeId → รายได้ในแผน, goalId → เข้าเป้าหมาย
 */
import { isCategoryId, type CategoryId } from "./Category";
import { isValidIsoDate, type ValidationError } from "./validation";

export type TransactionType = "income" | "expense";

export interface Transaction {
  id: string;
  date: string; // 'YYYY-MM-DD'
  type: TransactionType;
  amount: number; // > 0
  note?: string;
  category?: CategoryId; // บังคับเมื่อเป็นรายจ่าย
  planGroupId?: string;
  planIncomeId?: string;
  goalId?: string;
}

export type TransactionInput = Omit<Transaction, "id">;

export function validateTransaction(input: Partial<TransactionInput>): ValidationError[] {
  const errors: ValidationError[] = [];
  if (!isValidIsoDate(input.date)) errors.push({ field: "date", message: "กรุณาเลือกวันที่" });
  if (input.type !== "income" && input.type !== "expense") {
    errors.push({ field: "type", message: "กรุณาเลือกรายรับหรือรายจ่าย" });
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
  return errors;
}
