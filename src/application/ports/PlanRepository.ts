/**
 * PlanRepository — "Port" ที่ชั้น Application บอกว่าต้องการที่เก็บแผนแบบไหน
 *
 * Application ไม่สนใจว่าข้างหลังคือ localStorage, Firestore หรือหน่วยความจำ
 * ขอแค่ทำ 4 อย่างนี้ได้ (ตัวที่ทำจริงอยู่ใน infrastructure/ เรียกว่า "Adapter")
 *
 * ข้อตกลงที่ทุก Adapter ต้องทำตาม (ทดสอบด้วย contract test):
 * - get() หาไม่เจอ → คืน null (ไม่ throw)
 * - save() id เดิม → เขียนทับ
 * - delete() id ที่ไม่มี → ไม่ error
 * - ของที่คืนออกไปเป็นสำเนา แก้ไขแล้วไม่กระทบข้อมูลที่เก็บไว้
 */
import type { Plan } from "@/domain/entities/Plan";

export interface PlanRepository {
  list(): Promise<Plan[]>;
  get(id: string): Promise<Plan | null>;
  save(plan: Plan): Promise<void>;
  delete(id: string): Promise<void>;
}
