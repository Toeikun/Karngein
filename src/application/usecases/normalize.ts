/**
 * normalizeMoneyEntry — เก็บ date ไว้เฉพาะรายการ "ครั้งเดียว"
 * รายการรายเดือน/รายปีไม่ต้องมีวันที่ ถ้าผู้ใช้เปลี่ยนความถี่ จึงต้องลบวันที่เก่าทิ้ง
 */
export function normalizeMoneyEntry<T extends { frequency?: string; date?: string }>(entry: T): T {
  if (entry.frequency === "one-time") return entry;
  const copy = { ...entry };
  delete copy.date;
  return copy;
}
