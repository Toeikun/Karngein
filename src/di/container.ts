/**
 * di/container.ts — จุด "เสียบปลั๊ก" (Dependency Injection)
 *
 * ที่เดียวในแอปที่ตัดสินใจว่า Port แต่ละตัวใช้ Adapter ไหน
 * - ยังไม่ล็อกอิน (Guest): เก็บในเบราว์เซอร์ (localStorage)
 * - ล็อกอินแล้ว: เก็บบน Firestore ของผู้ใช้คนนั้น
 * - ไม่ได้ตั้งค่า Firebase: ไม่มีระบบล็อกอิน ใช้แบบ Guest อย่างเดียว
 */
import type { ActivePlanStore } from "@/application/ports/ActivePlanStore";
import type { AuthService } from "@/application/ports/AuthService";
import type { PlanRepository } from "@/application/ports/PlanRepository";
import type { TransactionRepository } from "@/application/ports/TransactionRepository";
import { isFirebaseConfigured } from "@/infrastructure/firebase/firebaseConfig";
import {
  LazyFirebaseAuthService,
  LazyFirestorePlanRepository,
  LazyFirestoreTransactionRepository,
} from "@/infrastructure/firebase/lazyFirebase";
import { exportPlanToJson, importPlanFromJson } from "@/infrastructure/schemas/planJson";
import {
  InMemoryActivePlanStore,
  LocalStorageActivePlanStore,
} from "@/infrastructure/storage/LocalStorageActivePlanStore";
import { InMemoryPlanRepository } from "@/infrastructure/storage/InMemoryPlanRepository";
import { InMemoryTransactionRepository } from "@/infrastructure/storage/InMemoryTransactionRepository";
import { LocalStoragePlanRepository } from "@/infrastructure/storage/LocalStoragePlanRepository";
import { LocalStorageTransactionRepository } from "@/infrastructure/storage/LocalStorageTransactionRepository";

let planRepository: PlanRepository | null = null;
let activePlanStore: ActivePlanStore | null = null;
let transactionRepository: TransactionRepository | null = null;

/** ที่เก็บรายการจริงในเครื่อง (โหมด Guest) */
export function getTransactionRepository(): TransactionRepository {
  if (!transactionRepository) {
    transactionRepository = hasLocalStorage()
      ? new LocalStorageTransactionRepository(window.localStorage)
      : new InMemoryTransactionRepository();
  }
  return transactionRepository;
}

/** ที่เก็บรายการจริงบนคลาวด์ของผู้ใช้ uid */
export function getCloudTransactionRepository(uid: string): TransactionRepository {
  return new LazyFirestoreTransactionRepository(uid);
}

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

let authService: AuthService | null | undefined;

/** ระบบล็อกอิน — คืน null ถ้าไม่ได้ตั้งค่า Firebase หรือรันนอกเบราว์เซอร์ */
export function getAuthService(): AuthService | null {
  if (authService === undefined) {
    // โหลดโค้ด Firebase แบบ lazy (ไม่รวมใน JS ก้อนแรก) — ดู lazyFirebase.ts
    authService = typeof window !== "undefined" && isFirebaseConfigured() ? new LazyFirebaseAuthService() : null;
  }
  return authService;
}

/** ที่เก็บแผนบนคลาวด์ของผู้ใช้ uid */
export function getCloudPlanRepository(uid: string): PlanRepository {
  return new LazyFirestorePlanRepository(uid);
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
