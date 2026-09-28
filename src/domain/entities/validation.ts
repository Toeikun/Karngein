/**
 * validation — รูปแบบผลการตรวจข้อมูลที่ใช้ร่วมกันทั้ง Domain
 *
 * ฟังก์ชัน validate ทุกตัวคืน "รายการ error" ถ้าเป็น array ว่าง = ข้อมูลถูกต้อง
 * ใช้ array แทนการ throw เพราะฟอร์มต้องการรู้ "ทุกช่องที่ผิด" พร้อมกัน
 */
import { isValidAmount } from "./Money";
import { isFrequency, type Frequency } from "./Frequency";

export interface ValidationError {
  field: string;
  message: string;
}

/** ตรวจว่าเป็นวันที่รูปแบบ 'YYYY-MM-DD' ที่มีอยู่จริง (เช่น 2027-02-30 ไม่ผ่าน) */
export function isValidIsoDate(value: unknown): value is string {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
}

/** ข้อมูลที่ทุกรายการเงินมีเหมือนกัน (รายได้ และรายการย่อยของรายจ่าย) */
export interface MoneyEntryInput {
  name?: unknown;
  amount?: unknown;
  frequency?: unknown;
  date?: unknown;
}

export function validateMoneyEntry(entry: MoneyEntryInput): ValidationError[] {
  const errors: ValidationError[] = [];

  if (typeof entry.name !== "string" || entry.name.trim() === "") {
    errors.push({ field: "name", message: "กรุณาระบุชื่อรายการ" });
  }
  if (!isValidAmount(entry.amount)) {
    errors.push({ field: "amount", message: "จำนวนเงินต้องเป็นตัวเลขตั้งแต่ 0 ขึ้นไป" });
  }
  if (!isFrequency(entry.frequency)) {
    errors.push({ field: "frequency", message: "กรุณาเลือกความถี่" });
  } else if ((entry.frequency as Frequency) === "one-time" && !isValidIsoDate(entry.date)) {
    errors.push({ field: "date", message: "รายการครั้งเดียวต้องระบุวันที่" });
  }

  return errors;
}
