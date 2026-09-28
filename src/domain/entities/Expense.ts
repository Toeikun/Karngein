/**
 * Expense — รายจ่ายแบบ "กลุ่ม + รายการย่อย"
 *
 * ตัวอย่าง:
 *   กลุ่ม "รายจ่ายหลัก" (หมวด: รายจ่ายจำเป็น)
 *     ├ ประกันสังคม 9,000 รายปี
 *     ├ ค่าอาหาร    8,000 รายเดือน
 *     └ ค่าเดินทาง  3,000 รายเดือน
 *
 * ถ้ากลุ่มไม่มีรายการย่อย ให้ใช้ amount/frequency ของกลุ่มเอง
 * เช่น "Lifestyle & ท่องเที่ยว" 50,000 รายปี (กฎ R6)
 */
import { isCategoryId, type CategoryId } from "./Category";
import type { Frequency } from "./Frequency";
import { validateMoneyEntry, type MoneyEntryInput, type ValidationError } from "./validation";

export interface ExpenseItem {
  id: string;
  name: string;
  amount: number;
  frequency: Frequency;
  date?: string;
}

export interface ExpenseGroup {
  id: string;
  name: string;
  category: CategoryId;
  items: ExpenseItem[];
  amount?: number; // ใช้เมื่อ items ว่าง
  frequency?: Frequency; // ใช้เมื่อ items ว่าง
  date?: string;
}

export function validateExpenseItem(item: MoneyEntryInput): ValidationError[] {
  return validateMoneyEntry(item);
}

export interface ExpenseGroupInput extends MoneyEntryInput {
  category?: unknown;
  items?: MoneyEntryInput[];
}

/**
 * ตรวจข้อมูลกลุ่มรายจ่าย
 * - error ของรายการย่อยจะมี field แบบ "items.0.amount" เพื่อบอกว่าผิดที่แถวไหน
 */
export function validateExpenseGroup(group: ExpenseGroupInput): ValidationError[] {
  const errors: ValidationError[] = [];
  const items = group.items ?? [];

  if (!isCategoryId(group.category)) {
    errors.push({ field: "category", message: "กรุณาเลือกหมวดรายจ่าย" });
  }

  if (items.length === 0) {
    // ไม่มีรายการย่อย → กลุ่มต้องมีจำนวนเงินและความถี่ของตัวเอง
    errors.push(...validateMoneyEntry(group));
  } else {
    if (typeof group.name !== "string" || group.name.trim() === "") {
      errors.push({ field: "name", message: "กรุณาระบุชื่อกลุ่ม" });
    }
    items.forEach((item, index) => {
      for (const error of validateExpenseItem(item)) {
        errors.push({ field: `items.${index}.${error.field}`, message: error.message });
      }
    });
  }

  return errors;
}
