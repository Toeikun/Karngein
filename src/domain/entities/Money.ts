/**
 * Money — เครื่องมือเกี่ยวกับจำนวนเงิน (หน่วย: บาท)
 *
 * กฎ R11: คำนวณด้วยความละเอียดเต็มเสมอ แล้ว "ปัดเศษ 2 ตำแหน่งตอนแสดงผลเท่านั้น"
 * ห้ามปัดเศษระหว่างคำนวณ เพราะเศษจะสะสมจนยอดรวมเพี้ยน
 */

/** ปัดเศษเป็นทศนิยม 2 ตำแหน่ง เช่น 34166.666 → 34166.67 */
export function round2(value: number): number {
  // บวก Number.EPSILON เพื่อแก้ปัญหาทศนิยมของคอมพิวเตอร์ เช่น 1.005 * 100 = 100.49999...
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

const bahtNumberFormat = new Intl.NumberFormat("en-US", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

/** จัดรูปแบบเป็นเงินบาท เช่น 1234.5 → "฿1,234.50", -500 → "-฿500.00" */
export function formatBaht(value: number): string {
  const rounded = round2(value);
  const sign = rounded < 0 ? "-" : "";
  return `${sign}฿${bahtNumberFormat.format(Math.abs(rounded))}`;
}

/** จำนวนเงินที่ใช้ได้: เป็นตัวเลขจริง (ไม่ใช่ NaN/Infinity) และไม่ติดลบ — กฎ R12 */
export function isValidAmount(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value >= 0;
}
