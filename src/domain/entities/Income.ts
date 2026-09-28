/**
 * Income — แหล่งรายได้ 1 รายการ เช่น เงินเดือน 30,000 รายเดือน
 */
import type { Frequency } from "./Frequency";
import { validateMoneyEntry, type MoneyEntryInput, type ValidationError } from "./validation";

export interface Income {
  id: string;
  name: string;
  amount: number; // บาท (ต้อง >= 0)
  frequency: Frequency;
  date?: string; // 'YYYY-MM-DD' — บังคับเมื่อ frequency = 'one-time'
}

/** ตรวจข้อมูลรายได้ — คืน [] ถ้าถูกต้อง */
export function validateIncome(income: MoneyEntryInput): ValidationError[] {
  return validateMoneyEntry(income);
}
