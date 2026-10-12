/**
 * normalizeMoneyEntry — เก็บ date ไว้เฉพาะรายการที่ใช้วันที่
 *   ครั้งเดียว: วันที่เกิด (บังคับ) · รายปี: เดือนที่จ่าย (ไม่บังคับ — Phase 13.1 R35; ไม่มี = เฉลี่ย ÷ 12)
 *   รายเดือน: ไม่มีวันที่ → เปลี่ยนความถี่เป็นรายเดือนแล้วลบวันที่เก่าทิ้ง
 * วันที่ว่าง/undefined ถูกลบออกด้วย (Firestore เก็บค่า undefined ไม่ได้)
 */
export function normalizeMoneyEntry<T extends { frequency?: string; date?: string }>(entry: T): T {
  if ((entry.frequency === "one-time" || entry.frequency === "yearly") && entry.date) return entry;
  const copy = { ...entry };
  delete copy.date;
  return copy;
}
