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
