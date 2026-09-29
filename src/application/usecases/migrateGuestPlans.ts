/**
 * ย้ายแผนจากโหมด Guest (ในเครื่อง) ขึ้นคลาวด์ ตอนล็อกอินครั้งแรก
 *
 * กติกา:
 * - แผนว่าง (ไม่มีรายได้และรายจ่าย) → ไม่ย้าย (แอปสร้างแผนว่างให้อัตโนมัติตอนเปิดครั้งแรก ไม่ควรถามถึง)
 * - แผนที่ยังไม่มีบนคลาวด์ → ย้าย
 * - มี id เดียวกันทั้งสองที่ → เก็บตัวที่ updatedAt ใหม่กว่า
 * - ไม่ลบข้อมูลในเครื่อง (ปลอดภัยไว้ก่อน ถ้าการย้ายพลาดยังมีสำเนาอยู่)
 *   ล็อกอินครั้งถัดไปจะไม่ถามซ้ำ เพราะคลาวด์มีแผนเหล่านั้นครบแล้ว
 */
import type { Plan } from "@/domain/entities/Plan";
import type { PlanRepository } from "../ports/PlanRepository";

/** หาแผนในเครื่องที่ควรย้าย (ยังไม่มีบนคลาวด์ หรือในเครื่องใหม่กว่า) */
export async function findGuestPlansToMigrate(guest: PlanRepository, cloud: PlanRepository): Promise<Plan[]> {
  const [guestPlans, cloudPlans] = await Promise.all([guest.list(), cloud.list()]);
  const cloudById = new Map(cloudPlans.map((plan) => [plan.id, plan]));
  return guestPlans.filter((plan) => {
    if (plan.incomes.length === 0 && plan.expenses.length === 0) return false;
    const existing = cloudById.get(plan.id);
    return !existing || plan.updatedAt > existing.updatedAt;
  });
}

/** บันทึกแผนที่เลือกขึ้นคลาวด์ — คืนจำนวนแผนที่ย้าย */
export async function migrateGuestPlans(plans: Plan[], cloud: PlanRepository): Promise<number> {
  for (const plan of plans) await cloud.save(plan);
  return plans.length;
}
