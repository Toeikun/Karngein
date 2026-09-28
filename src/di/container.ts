/**
 * di/container.ts — จุด "เสียบปลั๊ก" (Dependency Injection)
 *
 * ที่เดียวในแอปที่ตัดสินใจว่า Port แต่ละตัวใช้ Adapter ไหน
 * ตอนนี้: เก็บในเบราว์เซอร์ (โหมด Guest)
 * Phase 8: ถ้าล็อกอินแล้ว → Firestore (แก้ไฟล์นี้ไฟล์เดียว UI ไม่ต้องแก้)
 */
import type { ActivePlanStore } from "@/application/ports/ActivePlanStore";
import type { PlanRepository } from "@/application/ports/PlanRepository";
import { exportPlanToJson, importPlanFromJson } from "@/infrastructure/schemas/planJson";
import {
  InMemoryActivePlanStore,
  LocalStorageActivePlanStore,
} from "@/infrastructure/storage/LocalStorageActivePlanStore";
import { InMemoryPlanRepository } from "@/infrastructure/storage/InMemoryPlanRepository";
import { LocalStoragePlanRepository } from "@/infrastructure/storage/LocalStoragePlanRepository";

let planRepository: PlanRepository | null = null;
let activePlanStore: ActivePlanStore | null = null;

export function getPlanRepository(): PlanRepository {
  if (!planRepository) {
    // ตอน build (ไม่มี window) หรือเบราว์เซอร์ปิด storage → ใช้หน่วยความจำแทน แอปยังทำงานได้
    planRepository = hasLocalStorage()
      ? new LocalStoragePlanRepository(window.localStorage)
      : new InMemoryPlanRepository();
  }
  return planRepository;
}

export function getActivePlanStore(): ActivePlanStore {
  if (!activePlanStore) {
    activePlanStore = hasLocalStorage()
      ? new LocalStorageActivePlanStore(window.localStorage)
      : new InMemoryActivePlanStore();
  }
  return activePlanStore;
}

/** รูปแบบไฟล์สำรองข้อมูล (JSON) — UI เรียกผ่านที่นี่ ไม่ import infrastructure ตรงๆ */
export const planFileFormat = { serialize: exportPlanToJson, parse: importPlanFromJson };

function hasLocalStorage(): boolean {
  try {
    return typeof window !== "undefined" && window.localStorage !== undefined;
  } catch {
    return false; // บางเบราว์เซอร์โหมดส่วนตัว เข้าถึง localStorage แล้ว throw
  }
}
