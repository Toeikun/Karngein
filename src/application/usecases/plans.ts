/**
 * Use cases: จัดการแผน ผ่าน PlanRepository (Port)
 *
 * ฟังก์ชันพวกนี้ไม่รู้ว่าข้อมูลไปเก็บที่ไหน — ใครส่ง repository แบบไหนมาก็ทำงานได้
 */
import { createEmptyPlan, type Plan } from "@/domain/entities/Plan";
import type { UseCaseContext } from "../context";
import type { PlanRepository } from "../ports/PlanRepository";
import { failure, success, touch, type PlanResult } from "../result";

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

export function renamePlan(plan: Plan, name: string, ctx: UseCaseContext): PlanResult {
  const trimmed = name.trim();
  if (trimmed === "") return failure([{ field: "name", message: "กรุณาระบุชื่อแผน" }]);
  return success(touch({ ...plan, name: trimmed }, ctx.now()));
}

/**
 * สำเนาแผนที่นำเข้าจากไฟล์: ได้ id ใหม่ → ไม่เขียนทับแผนที่มีอยู่แล้ว (แม้ไฟล์มาจากแผนเดียวกัน)
 */
export function copyImportedPlan(imported: Plan, ctx: UseCaseContext): Plan {
  return { ...imported, id: ctx.generateId(), name: `${imported.name} (นำเข้า)`, updatedAt: ctx.now().toISOString() };
}
