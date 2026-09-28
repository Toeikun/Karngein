/**
 * LocalStoragePlanRepository — เก็บแผนใน localStorage ของเบราว์เซอร์ (โหมด Guest)
 *
 * ข้อควรรู้:
 * - ข้อมูลอยู่แค่ในเบราว์เซอร์เครื่องนั้น ล้างข้อมูลเว็บแล้วหาย → มีปุ่มส่งออก JSON ไว้สำรอง
 * - localStorage เก็บได้แค่ string → ต้อง JSON.stringify / JSON.parse
 * - ข้อมูลเสีย (แก้มือ / เวอร์ชันเก่า) ต้องไม่ทำให้แอปพัง → ข้ามแผนที่เสีย + เตือนใน console
 */
import type { PlanRepository } from "@/application/ports/PlanRepository";
import type { Plan } from "@/domain/entities/Plan";
import { parsePlan } from "../schemas/planSchema";

export const PLANS_STORAGE_KEY = "karngein:plans";

export class LocalStoragePlanRepository implements PlanRepository {
  // รับ storage เข้ามา (ไม่เรียก window.localStorage ตรงๆ) → ในเทสต์ส่งตัวปลอมได้
  constructor(private readonly storage: Storage) {}

  private readAll(): Plan[] {
    const raw = this.storage.getItem(PLANS_STORAGE_KEY);
    if (raw === null) return [];

    let data: unknown;
    try {
      data = JSON.parse(raw);
    } catch {
      console.warn(`[Karngein] ข้อมูลใน ${PLANS_STORAGE_KEY} อ่านไม่ได้ (ไม่ใช่ JSON) — ข้ามไป`);
      return [];
    }
    if (!Array.isArray(data)) {
      console.warn(`[Karngein] ข้อมูลใน ${PLANS_STORAGE_KEY} ไม่ใช่รายการแผน — ข้ามไป`);
      return [];
    }

    const plans: Plan[] = [];
    for (const item of data) {
      const plan = parsePlan(item);
      if (plan) plans.push(plan);
      else console.warn("[Karngein] พบแผนที่ข้อมูลไม่ถูกต้อง — ข้ามแผนนี้", item);
    }
    return plans;
  }

  private writeAll(plans: Plan[]): void {
    this.storage.setItem(PLANS_STORAGE_KEY, JSON.stringify(plans));
  }

  // ทุกครั้งอ่านจาก JSON ใหม่ → ได้ object ใหม่เสมอ (สำเนา) ตามข้อตกลงของ PlanRepository
  async list(): Promise<Plan[]> {
    return this.readAll();
  }

  async get(id: string): Promise<Plan | null> {
    return this.readAll().find((plan) => plan.id === id) ?? null;
  }

  async save(plan: Plan): Promise<void> {
    const others = this.readAll().filter((p) => p.id !== plan.id);
    this.writeAll([...others, plan]);
  }

  async delete(id: string): Promise<void> {
    const plans = this.readAll();
    const remaining = plans.filter((p) => p.id !== id);
    if (remaining.length !== plans.length) this.writeAll(remaining);
  }
}
