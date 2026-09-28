/**
 * amountInPeriod — แปลง "จำนวนเงิน + ความถี่" ให้เป็นยอดเงินในมุมมองเวลาที่เลือก
 *
 * กฎ (PLAN.md ข้อ 8.3):
 *   R1  monthly  ในมุมมองรายเดือน = amount × 1
 *   R2  yearly   ในมุมมองรายเดือน = amount ÷ 12
 *   R3  one-time ในมุมมองรายเดือน = 0
 *   R4  มุมมองรายปี: monthly × 12, yearly × 1, one-time นับเมื่อวันที่อยู่ในปีนั้น
 *   R5  มุมมองช่วง N เดือน: (ยอดต่อเดือนตาม R1+R2) × N + one-time ที่วันที่อยู่ในช่วง
 *
 * หมายเหตุ: ไม่ปัดเศษที่นี่ (R11) — ปัดตอนแสดงผลเท่านั้น
 */
import type { Frequency } from "../entities/Frequency";
import { monthsInRange, toMonthIndex, type Period, type YearMonth } from "../entities/Period";

export interface MoneyEntry {
  amount: number;
  frequency: Frequency;
  date?: string; // 'YYYY-MM-DD'
}

/** ยอดเฉลี่ยต่อเดือนของรายการที่เกิดซ้ำ (R1, R2) — one-time ไม่นับ (R3) */
function monthlyAverage({ amount, frequency }: MoneyEntry): number {
  switch (frequency) {
    case "monthly":
      return amount;
    case "yearly":
      return amount / 12;
    case "one-time":
      return 0;
  }
}

/** อ่าน ปี-เดือน จากวันที่ 'YYYY-MM-DD' */
function yearMonthOf(date: string): YearMonth {
  const [year, month] = date.split("-").map(Number);
  return { year, month };
}

/** รายการ one-time เกิดขึ้นภายในมุมมองนี้หรือไม่ */
function oneTimeFallsIn(date: string | undefined, period: Period): boolean {
  if (!date) return false;
  const when = yearMonthOf(date);

  switch (period.kind) {
    case "monthly":
      return false; // R3
    case "yearly":
      return when.year === period.year; // R4
    case "range": {
      const index = toMonthIndex(when);
      return index >= toMonthIndex(period.from) && index <= toMonthIndex(period.to); // R5
    }
  }
}

export function amountInPeriod(entry: MoneyEntry, period: Period): number {
  if (entry.frequency === "one-time") {
    return oneTimeFallsIn(entry.date, period) ? entry.amount : 0;
  }

  switch (period.kind) {
    case "monthly":
      return monthlyAverage(entry);
    case "yearly":
      return monthlyAverage(entry) * 12;
    case "range":
      return monthlyAverage(entry) * Math.max(0, monthsInRange(period.from, period.to));
  }
}
