/**
 * Frequency — ความถี่ของรายการเงิน
 * - monthly  = ทุกเดือน
 * - yearly   = ปีละครั้ง
 * - one-time = ครั้งเดียว (ต้องระบุวันที่)
 */
export type Frequency = "monthly" | "yearly" | "one-time";

export const FREQUENCIES: readonly Frequency[] = ["monthly", "yearly", "one-time"];

export const FREQUENCY_LABELS: Record<Frequency, string> = {
  monthly: "รายเดือน",
  yearly: "รายปี",
  "one-time": "ครั้งเดียว",
};

export function isFrequency(value: unknown): value is Frequency {
  return FREQUENCIES.includes(value as Frequency);
}
