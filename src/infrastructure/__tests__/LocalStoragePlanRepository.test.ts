import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  LocalStoragePlanRepository,
  PLANS_STORAGE_KEY,
} from "@/infrastructure/storage/LocalStoragePlanRepository";
import { describePlanRepositoryContract } from "./planRepository.contract";

// ชุดเทสต์กลางเดียวกับ InMemory — ใช้ localStorage ของ jsdom
describePlanRepositoryContract("LocalStoragePlanRepository", () => {
  window.localStorage.clear();
  return new LocalStoragePlanRepository(window.localStorage);
});

describe("LocalStoragePlanRepository — ข้อมูลเสียต้องไม่ทำให้แอปพัง", () => {
  let repo: LocalStoragePlanRepository;

  beforeEach(() => {
    window.localStorage.clear();
    repo = new LocalStoragePlanRepository(window.localStorage);
    vi.spyOn(console, "warn").mockImplementation(() => {});
  });
  afterEach(() => vi.restoreAllMocks());

  it('string เสีย "{abc" → list() คืน [] ไม่ throw และเตือนใน console', async () => {
    window.localStorage.setItem(PLANS_STORAGE_KEY, "{abc");
    await expect(repo.list()).resolves.toEqual([]);
    expect(console.warn).toHaveBeenCalled();
  });

  it("ไม่ใช่ array → []", async () => {
    window.localStorage.setItem(PLANS_STORAGE_KEY, '{"id":"x"}');
    expect(await repo.list()).toEqual([]);
  });

  it("มีแผนเสีย 1 แผนปนกับแผนดี → ข้ามเฉพาะแผนที่เสีย", async () => {
    const good = {
      id: "good",
      name: "ดี",
      incomes: [],
      expenses: [],
      updatedAt: "2027-01-01T00:00:00.000Z",
    };
    const bad = { ...good, id: "bad", incomes: [{ id: "i", name: "x", amount: -5, frequency: "monthly" }] };
    window.localStorage.setItem(PLANS_STORAGE_KEY, JSON.stringify([good, bad]));
    expect((await repo.list()).map((p) => p.id)).toEqual(["good"]);
  });

  it("บันทึกแผนใหม่ทับข้อมูลเสียได้ (แอปใช้ต่อได้)", async () => {
    window.localStorage.setItem(PLANS_STORAGE_KEY, "{abc");
    await repo.save({ id: "p", name: "ใหม่", incomes: [], expenses: [], updatedAt: "2027-01-01T00:00:00.000Z" });
    expect((await repo.list()).map((p) => p.id)).toEqual(["p"]);
  });
});
