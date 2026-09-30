/**
 * ย้ายแผนจากโหมด Guest (ในเครื่อง) ขึ้นคลาวด์ ตอนล็อกอินครั้งแรก
 *
 * กติกา:
 * - แผนว่าง (ไม่มีรายได้ รายจ่าย และรายการจริง) → ไม่ย้าย (แอปสร้างแผนว่างให้อัตโนมัติตอนเปิดครั้งแรก ไม่ควรถามถึง)
 * - รายการจริงของแผนที่ย้าย → ย้ายไปด้วย (Phase 11)
 * - แผนที่ยังไม่มีบนคลาวด์ → ย้าย
 * - มี id เดียวกันทั้งสองที่ → เก็บตัวที่ updatedAt ใหม่กว่า
 * - ไม่ลบข้อมูลในเครื่อง (ปลอดภัยไว้ก่อน ถ้าการย้ายพลาดยังมีสำเนาอยู่)
 *   ล็อกอินครั้งถัดไปจะไม่ถามซ้ำ เพราะคลาวด์มีแผนเหล่านั้นครบแล้ว
 */
import type { Plan } from "@/domain/entities/Plan";
import type { PlanRepository } from "../ports/PlanRepository";
import type { TransactionRepository } from "../ports/TransactionRepository";

/** ที่เก็บรายการจริงฝั่งในเครื่อง/คลาวด์ (ไม่ส่งมา = ไม่ย้ายรายการจริง) */
export interface TransactionStores {
  guest: TransactionRepository;
  cloud: TransactionRepository;
}

/** หาแผนในเครื่องที่ควรย้าย (ยังไม่มีบนคลาวด์ หรือในเครื่องใหม่กว่า) */
export async function findGuestPlansToMigrate(
  guest: PlanRepository,
  cloud: PlanRepository,
  transactions?: TransactionStores,
): Promise<Plan[]> {
  const [guestPlans, cloudPlans] = await Promise.all([guest.list(), cloud.list()]);
  const cloudById = new Map(cloudPlans.map((plan) => [plan.id, plan]));
  const hasTransactions = new Map<string, boolean>();
  if (transactions) {
    for (const plan of guestPlans) hasTransactions.set(plan.id, (await transactions.guest.list(plan.id)).length > 0);
  }
  return guestPlans.filter((plan) => {
    const empty = plan.incomes.length === 0 && plan.expenses.length === 0 && !hasTransactions.get(plan.id);
    if (empty) return false;
    const existing = cloudById.get(plan.id);
    return !existing || plan.updatedAt > existing.updatedAt;
  });
}

/** บันทึกแผนที่เลือกขึ้นคลาวด์ — คืนจำนวนแผนที่ย้าย */
export async function migrateGuestPlans(
  plans: Plan[],
  cloud: PlanRepository,
  transactions?: TransactionStores,
): Promise<number> {
  for (const plan of plans) {
    await cloud.save(plan);
    if (transactions) {
      // id เดียวกัน = เขียนทับ → ย้ายซ้ำก็ไม่เกิดรายการซ้ำ
      for (const t of await transactions.guest.list(plan.id)) await transactions.cloud.save(plan.id, t);
    }
  }
  return plans.length;
}
