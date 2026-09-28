/**
 * di/container.ts — จุด "เสียบปลั๊ก" (Dependency Injection)
 *
 * ที่เดียวในแอปที่ตัดสินใจว่า Port แต่ละตัวใช้ Adapter ไหน
 * ตอนนี้: PlanRepository → LocalStorage (โหมด Guest)
 * Phase 8: ถ้าล็อกอินแล้ว → Firestore (แก้ไฟล์นี้ไฟล์เดียว UI ไม่ต้องแก้)
 */
import type { PlanRepository } from "@/application/ports/PlanRepository";
import { InMemoryPlanRepository } from "@/infrastructure/storage/InMemoryPlanRepository";
import { LocalStoragePlanRepository } from "@/infrastructure/storage/LocalStoragePlanRepository";

let planRepository: PlanRepository | null = null;

export function getPlanRepository(): PlanRepository {
  if (!planRepository) {
    // ตอน build (ไม่มี window) หรือเบราว์เซอร์ปิด storage → ใช้หน่วยความจำแทน แอปยังทำงานได้
    planRepository = hasLocalStorage()
      ? new LocalStoragePlanRepository(window.localStorage)
      : new InMemoryPlanRepository();
  }
  return planRepository;
}

function hasLocalStorage(): boolean {
  try {
    return typeof window !== "undefined" && window.localStorage !== undefined;
  } catch {
    return false; // บางเบราว์เซอร์โหมดส่วนตัว เข้าถึง localStorage แล้ว throw
  }
}
