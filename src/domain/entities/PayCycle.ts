/**
 * PayCycle — "รอบเงินเดือน" เช่น เงินเดือนออกวันที่ 25 → รอบ 25 ก.ย. – 24 ต.ค.
 *
 * กฎ (PLAN.md Phase 11.1):
 *   R13 วันที่ d อยู่รอบที่เริ่มเดือนเดียวกัน ถ้า day(d) ≥ วันเริ่ม ไม่งั้นอยู่รอบที่เริ่มเดือนก่อน
 *       รอบจบ = วันก่อนวันเริ่มของรอบถัดไป
 *   R14 เดือนที่ไม่มีวันเริ่ม (เช่น 31 ใน ก.พ.) → ใช้วันสุดท้ายของเดือนนั้น
 *   R15 วันเริ่ม = 1 → รอบ = เดือนปฏิทิน
 *
 * วันที่ทั้งหมดเป็น string 'YYYY-MM-DD' (ไม่มีเวลา/เขตเวลา → ไม่เพี้ยนข้ามวัน)
 */
export interface PayCycle {
  start: string; // วันแรกของรอบ (รวม)
  end: string; // วันสุดท้ายของรอบ (รวม)
}

export const DEFAULT_PAY_CYCLE_START_DAY = 1;

export function isValidStartDay(day: unknown): day is number {
  return typeof day === "number" && Number.isInteger(day) && day >= 1 && day <= 31;
}

// ---------- เครื่องมือวันที่ (ใช้ UTC เพื่อไม่ให้เขตเวลาทำให้วันเพี้ยน) ----------

interface Ymd {
  year: number;
  month: number; // 1–12
  day: number;
}

function parse(date: string): Ymd {
  const [year, month, day] = date.split("-").map(Number);
  return { year, month, day };
}

function format({ year, month, day }: Ymd): string {
  const pad = (n: number, width = 2) => String(n).padStart(width, "0");
  return `${pad(year, 4)}-${pad(month)}-${pad(day)}`;
}

export function daysInMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

export function addDays(date: string, days: number): string {
  const { year, month, day } = parse(date);
  const result = new Date(Date.UTC(year, month - 1, day + days));
  return format({ year: result.getUTCFullYear(), month: result.getUTCMonth() + 1, day: result.getUTCDate() });
}

/** จำนวนวันจาก a ถึง b (b − a) */
export function daysBetween(a: string, b: string): number {
  const toTime = (date: string) => {
    const { year, month, day } = parse(date);
    return Date.UTC(year, month - 1, day);
  };
  return Math.round((toTime(b) - toTime(a)) / 86_400_000);
}

function shiftMonth(year: number, month: number, delta: number): { year: number; month: number } {
  const index = year * 12 + (month - 1) + delta;
  return { year: Math.floor(index / 12), month: (index % 12) + 1 };
}

/** วันเริ่มรอบในเดือนนั้น (R14: ถ้าเดือนสั้นกว่า ใช้วันสุดท้ายของเดือน) */
function startDateIn(year: number, month: number, startDay: number): string {
  return format({ year, month, day: Math.min(startDay, daysInMonth(year, month)) });
}

// ---------- รอบเงินเดือน ----------

/** รอบที่เริ่มในเดือน (year, month) */
function cycleStartingIn(year: number, month: number, startDay: number): PayCycle {
  const next = shiftMonth(year, month, 1);
  return {
    start: startDateIn(year, month, startDay),
    end: addDays(startDateIn(next.year, next.month, startDay), -1),
  };
}

/** รอบที่มีวันที่ date อยู่ (R13–R15) */
export function cycleContaining(date: string, startDay: number): PayCycle {
  const { year, month } = parse(date);
  const sameMonth = cycleStartingIn(year, month, startDay);
  if (date >= sameMonth.start) return sameMonth;
  const previous = shiftMonth(year, month, -1);
  return cycleStartingIn(previous.year, previous.month, startDay);
}

/** รอบถัดไป (+1) หรือรอบก่อนหน้า (−1) */
export function shiftCycle(cycle: PayCycle, startDay: number, delta: number): PayCycle {
  const { year, month } = parse(cycle.start);
  const target = shiftMonth(year, month, delta);
  return cycleStartingIn(target.year, target.month, startDay);
}

export function isInCycle(date: string, cycle: PayCycle): boolean {
  return date >= cycle.start && date <= cycle.end; // 'YYYY-MM-DD' เทียบแบบข้อความได้ถูกต้อง
}

/** เหลือกี่วันก่อนเริ่มรอบใหม่ (นับวันนี้ด้วย) */
export function daysLeftInCycle(today: string, cycle: PayCycle): number {
  return Math.max(0, daysBetween(today, cycle.end) + 1);
}
