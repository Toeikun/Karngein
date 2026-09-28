/**
 * Use cases: จัดการแผน ผ่าน PlanRepository (Port)
 *
 * ฟังก์ชันพวกนี้ไม่รู้ว่าข้อมูลไปเก็บที่ไหน — ใครส่ง repository แบบไหนมาก็ทำงานได้
 */
import { createEmptyPlan, type Plan } from "@/domain/entities/Plan";
import type { UseCaseContext } from "../context";
import type { PlanRepository } from "../ports/PlanRepository";

export function createPlan(ctx: UseCaseContext, name?: string): Plan {
  return createEmptyPlan({ id: ctx.generateId(), name: name?.trim() || undefined, now: ctx.now() });
}

export function savePlan(repository: PlanRepository, plan: Plan): Promise<void> {
  return repository.save(plan);
}

export function loadPlan(repository: PlanRepository, id: string): Promise<Plan | null> {
  return repository.get(id);
}

/** แผนทั้งหมด เรียงจากแก้ไขล่าสุดก่อน */
export async function listPlans(repository: PlanRepository): Promise<Plan[]> {
  const plans = await repository.list();
  return [...plans].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export function deletePlan(repository: PlanRepository, id: string): Promise<void> {
  return repository.delete(id);
}
