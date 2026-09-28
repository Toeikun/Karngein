/**
 * Period — "มุมมองเวลา" ที่ใช้คำนวณสรุป
 * - monthly : ยอดเฉลี่ยต่อเดือน
 * - yearly  : ทั้งปีที่เลือก
 * - range   : ช่วงเดือน from ถึง to (นับรวมทั้งสองเดือน)
 */
export interface YearMonth {
  year: number;
  month: number; // 1–12
}

export type Period =
  | { kind: "monthly" }
  | { kind: "yearly"; year: number }
  | { kind: "range"; from: YearMonth; to: YearMonth };

/** ปีเริ่มต้นของแอป (D3: เริ่มข้อมูลใหม่ทั้งหมดในปี 2027) */
export const DEFAULT_YEAR = 2027;

/** แปลง YearMonth เป็นตัวเลขเดียวไว้เปรียบเทียบ เช่น 2027-03 → 2027*12 + 2 */
export function toMonthIndex({ year, month }: YearMonth): number {
  return year * 12 + (month - 1);
}

/** จำนวนเดือนในช่วง (นับรวมเดือนแรกและเดือนสุดท้าย) เช่น ก.ย.–พ.ย. = 3 */
export function monthsInRange(from: YearMonth, to: YearMonth): number {
  return toMonthIndex(to) - toMonthIndex(from) + 1;
}

/** ช่วงเวลาถูกต้องเมื่อเดือนอยู่ใน 1–12 และ to ไม่ก่อน from */
export function isValidRange(from: YearMonth, to: YearMonth): boolean {
  const validMonth = (m: number) => Number.isInteger(m) && m >= 1 && m <= 12;
  return validMonth(from.month) && validMonth(to.month) && monthsInRange(from, to) >= 1;
}
