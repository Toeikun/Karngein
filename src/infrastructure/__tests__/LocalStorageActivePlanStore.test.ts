import { describe, expect, it } from "vitest";
import { LocalStorageActivePlanStore } from "@/infrastructure/storage/LocalStorageActivePlanStore";

describe("LocalStorageActivePlanStore", () => {
  it("จำ id แผนล่าสุด และอ่านกลับได้ (เปิด store ใหม่ก็ยังอยู่)", () => {
    window.localStorage.clear();
    expect(new LocalStorageActivePlanStore(window.localStorage).get()).toBeNull();
    new LocalStorageActivePlanStore(window.localStorage).set("plan-9");
    expect(new LocalStorageActivePlanStore(window.localStorage).get()).toBe("plan-9");
  });
});
