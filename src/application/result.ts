/**
 * Result — ผลลัพธ์ของ use case ที่ "อาจไม่สำเร็จ"
 *
 * แทนที่จะ throw error เราคืนค่าแบบนี้ เพื่อให้หน้าฟอร์มแสดง error ทุกช่องได้ง่าย:
 *   const result = addIncome(plan, input, ctx);
 *   if (result.ok) setPlan(result.plan);
 *   else showErrors(result.errors);
 */
import type { ValidationError } from "@/domain/entities/validation";
import type { Plan } from "@/domain/entities/Plan";

export type PlanResult = { ok: true; plan: Plan } | { ok: false; errors: ValidationError[] };

export const success = (plan: Plan): PlanResult => ({ ok: true, plan });

export const failure = (errors: ValidationError[]): PlanResult => ({ ok: false, errors });

export const notFound = (what: string): PlanResult =>
  failure([{ field: "id", message: `ไม่พบ${what}` }]);

/** ทุกครั้งที่แผนเปลี่ยน ต้องอัปเดตเวลา (ใช้ตัดสินข้อมูลใหม่กว่าตอน sync) */
export const touch = (plan: Plan, now: Date): Plan => ({ ...plan, updatedAt: now.toISOString() });
