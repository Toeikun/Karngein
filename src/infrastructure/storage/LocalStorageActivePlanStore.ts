import type { ActivePlanStore } from "@/application/ports/ActivePlanStore";

export const ACTIVE_PLAN_STORAGE_KEY = "karngein:activePlanId";

export class LocalStorageActivePlanStore implements ActivePlanStore {
  constructor(private readonly storage: Storage) {}

  get(): string | null {
    return this.storage.getItem(ACTIVE_PLAN_STORAGE_KEY);
  }

  set(planId: string): void {
    this.storage.setItem(ACTIVE_PLAN_STORAGE_KEY, planId);
  }
}

/** เก็บในหน่วยความจำ — ใช้ในเทสต์ หรือเมื่อเบราว์เซอร์ไม่มี localStorage */
export class InMemoryActivePlanStore implements ActivePlanStore {
  private id: string | null = null;
  get() {
    return this.id;
  }
  set(planId: string) {
    this.id = planId;
  }
}
