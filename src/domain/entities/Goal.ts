/**
 * Goal — เป้าหมายการเงิน เช่น "เงินออมฉุกเฉิน = เงินเดือน × 12"
 *
 * เป้ามี 2 แบบ (D12):
 * - fixed           : จำนวนตายตัว เช่น 100,000
 * - incomeMultiple  : รายได้ 1 รายการในแผน (ยอดต่อเดือน) × N เช่น เงินเดือน × 12
 *                     → แก้เงินเดือนในแผน เป้าเปลี่ยนตามเอง
 */
import { isCategoryId, type CategoryId } from "./Category";
import { isValidIsoDate, type ValidationError } from "./validation";

export type GoalTarget = { kind: "fixed"; amount: number } | { kind: "incomeMultiple"; incomeId: string; times: number };

export interface Goal {
  id: string;
  name: string;
  category: CategoryId;
  target: GoalTarget;
  startingAmount: number; // เงินที่มีอยู่แล้วก่อนเริ่มบันทึก
  deadline?: string;
}

export type GoalInput = Omit<Goal, "id">;

export const MAX_TIMES = 600; // สูงสุด 50 ปี (กันพิมพ์ผิด)

export function validateGoal(input: Partial<GoalInput>): ValidationError[] {
  const errors: ValidationError[] = [];
  if (typeof input.name !== "string" || input.name.trim() === "") {
    errors.push({ field: "name", message: "กรุณาตั้งชื่อเป้าหมาย" });
  }
  if (!isCategoryId(input.category)) errors.push({ field: "category", message: "กรุณาเลือกหมวด" });

  const target = input.target;
  if (!target) {
    errors.push({ field: "target", message: "กรุณากำหนดเป้า" });
  } else if (target.kind === "fixed") {
    if (!(Number.isFinite(target.amount) && target.amount > 0)) {
      errors.push({ field: "target", message: "เป้าต้องมากกว่า 0" });
    }
  } else if (target.kind === "incomeMultiple") {
    if (!target.incomeId) errors.push({ field: "target", message: "กรุณาเลือกรายได้ที่ใช้คำนวณเป้า" });
    if (!(Number.isInteger(target.times) && target.times >= 1 && target.times <= MAX_TIMES)) {
      errors.push({ field: "times", message: `จำนวนเท่าต้องเป็นจำนวนเต็ม 1–${MAX_TIMES}` });
    }
  } else {
    errors.push({ field: "target", message: "รูปแบบเป้าไม่ถูกต้อง" });
  }

  if (typeof input.startingAmount !== "number" || !Number.isFinite(input.startingAmount) || input.startingAmount < 0) {
    errors.push({ field: "startingAmount", message: "เงินตั้งต้นต้องเป็นตัวเลขตั้งแต่ 0 ขึ้นไป" });
  }
  if (input.deadline !== undefined && !isValidIsoDate(input.deadline)) {
    errors.push({ field: "deadline", message: "วันที่เป้าหมายไม่ถูกต้อง" });
  }
  return errors;
}
