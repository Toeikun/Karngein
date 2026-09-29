import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { FirestorePlanRepository } from "@/infrastructure/firebase/FirestorePlanRepository";
import { clearFirestore, closeAllApps, firestoreAs } from "./emulator";
import { describePlanRepositoryContract } from "./planRepository.contract";

beforeEach(clearFirestore);
afterAll(closeAllApps);

// ชุดเทสต์กลางชุดเดียวกับ InMemory และ LocalStorage → พิสูจน์ว่าสลับมาใช้ Firestore แล้วทำงานเหมือนเดิม
describePlanRepositoryContract("FirestorePlanRepository (Emulator)", async () => {
  await clearFirestore();
  return new FirestorePlanRepository(firestoreAs("alice"), "alice");
});

describe("FirestorePlanRepository — เพิ่มเติม", () => {
  it("แผนของแต่ละผู้ใช้แยกกัน (alice ไม่เห็นแผนของ bob ในรายการ)", async () => {
    const plan = { id: "p1", name: "แผน bob", incomes: [], expenses: [], updatedAt: "2027-01-01T00:00:00.000Z" };
    await new FirestorePlanRepository(firestoreAs("bob"), "bob").save(plan);
    expect(await new FirestorePlanRepository(firestoreAs("alice"), "alice").list()).toEqual([]);
  });

  it("field ที่เป็น undefined ไม่ทำให้บันทึกล้ม (Firestore ไม่รับ undefined)", async () => {
    const repo = new FirestorePlanRepository(firestoreAs("alice"), "alice");
    const plan = {
      id: "p1",
      name: "x",
      updatedAt: "2027-01-01T00:00:00.000Z",
      incomes: [{ id: "i", name: "เงินเดือน", amount: 1, frequency: "monthly" as const, date: undefined }],
      expenses: [],
    };
    await repo.save(plan);
    expect((await repo.get("p1"))!.incomes[0]).not.toHaveProperty("date");
  });
});
