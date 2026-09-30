import type { Period } from "@/domain/entities/Period";

export const THAI_MONTHS = ["ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.", "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค."];

/** ข้อความอธิบายมุมมองเวลา เช่น "เฉลี่ยต่อเดือน", "ปี 2027", "ม.ค. 2027 – มี.ค. 2027" */
export function periodLabel(period: Period): string {
  switch (period.kind) {
    case "monthly":
      return "เฉลี่ยต่อเดือน";
    case "yearly":
      return `ปี ${period.year}`;
    case "range":
      return `${THAI_MONTHS[period.from.month - 1]} ${period.from.year} – ${THAI_MONTHS[period.to.month - 1]} ${period.to.year}`;
  }
}

/** '2026-09-25' → "25 ก.ย. 2026" */
export function formatThaiDate(date: string, withYear = true): string {
  const [year, month, day] = date.split("-").map(Number);
  return `${day} ${THAI_MONTHS[month - 1]}${withYear ? ` ${year}` : ""}`;
}

/** รอบ 25 ก.ย. – 24 ต.ค. 2026 (ถ้าข้ามปี แสดงปีทั้งสองฝั่ง) */
export function cycleLabel(cycle: { start: string; end: string }): string {
  const sameYear = cycle.start.slice(0, 4) === cycle.end.slice(0, 4);
  return `${formatThaiDate(cycle.start, !sameYear)} – ${formatThaiDate(cycle.end)}`;
}
