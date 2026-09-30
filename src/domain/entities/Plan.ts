/**
 * Plan — แผนการเงิน 1 ชุด = รายได้ทั้งหมด + รายจ่ายทั้งหมด
 */
import type { ExpenseGroup } from "./Expense";
import type { Goal } from "./Goal";
import type { Income } from "./Income";
import { DEFAULT_PAY_CYCLE_START_DAY } from "./PayCycle";

export interface Plan {
  id: string;
  name: string;
  incomes: Income[];
  expenses: ExpenseGroup[];
  updatedAt: string; // ISO เช่น "2027-01-01T00:00:00.000Z" — ใช้ตัดสินว่าข้อมูลไหนใหม่กว่าตอน sync
  // ---- Phase 11 (ไม่บังคับ → แผนเก่าที่ไม่มี field เหล่านี้ยังใช้ได้) ----
  payCycleStartDay?: number; // วันเริ่มรอบเงินเดือน 1–31 (ไม่มี = 1 = เดือนปฏิทิน)
  goals?: Goal[];
}

/** วันเริ่มรอบเงินเดือนของแผน (แผนเก่าไม่มีค่า → 1) */
export const payCycleStartDayOf = (plan: Plan): number => plan.payCycleStartDay ?? DEFAULT_PAY_CYCLE_START_DAY;

/** เป้าหมายของแผน (แผนเก่าไม่มี → []) */
export const goalsOf = (plan: Plan): Goal[] => plan.goals ?? [];

export interface CreatePlanParams {
  id: string;
  name?: string;
  now: Date;
}

/**
 * สร้างแผนว่าง
 *
 * ทำไมต้องส่ง id และ now เข้ามา แทนที่จะสุ่ม id / อ่านเวลาปัจจุบันเอง?
 * → ให้ Domain เป็น "pure function": input เดิมได้ผลเดิมเสมอ ทดสอบง่าย
 *   การสุ่ม id และอ่านนาฬิกาเป็นหน้าที่ของชั้น Application
 */
export function createEmptyPlan({ id, name = "แผนของฉัน", now }: CreatePlanParams): Plan {
  return {
    id,
    name,
    incomes: [],
    expenses: [],
    updatedAt: now.toISOString(),
  };
}
