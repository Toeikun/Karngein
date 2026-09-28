/**
 * แปลงข้อความที่ผู้ใช้พิมพ์ในช่องจำนวนเงิน → ตัวเลข
 * "30,000" → 30000 | "1234.5" → 1234.5 | "-100" / "abc" → error
 */
export type ParseAmountResult = { ok: true; value: number } | { ok: false; message: string };

export function parseAmount(text: string): ParseAmountResult {
  const cleaned = text.replace(/[,\s฿]/g, "");
  if (cleaned === "") return { ok: false, message: "กรุณาใส่จำนวนเงิน" };
  if (!/^\d+(\.\d{0,2})?$/.test(cleaned)) {
    return { ok: false, message: "ใส่ได้เฉพาะตัวเลขตั้งแต่ 0 ขึ้นไป (ทศนิยมไม่เกิน 2 ตำแหน่ง)" };
  }
  return { ok: true, value: Number(cleaned) };
}

const inputNumberFormat = new Intl.NumberFormat("en-US", { maximumFractionDigits: 2 });

/** แสดงในช่องกรอกตอนไม่ได้แก้ไข เช่น 30000 → "30,000" */
export function formatAmountInput(value: number): string {
  return inputNumberFormat.format(value);
}

/** วันนี้ในรูปแบบ 'YYYY-MM-DD' (เวลาท้องถิ่น) ใช้เป็นค่าเริ่มต้นของรายการครั้งเดียว */
export function todayIso(now: Date = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}
