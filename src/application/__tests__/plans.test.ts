import { describe, expect, it } from "vitest";
import { createPlan, deletePlan, listPlans, loadPlan, savePlan } from "@/application/usecases/plans";
import { InMemoryPlanRepository } from "@/infrastructure/storage/InMemoryPlanRepository";
import { createTestContext, FIXED_NOW } from "./testContext";

describe("use cases จัดการแผน", () => {
  it("createPlan → แผนว่าง id จาก context", () => {
    expect(createPlan(createTestContext(), "แผนปี 2027")).toEqual({
      id: "id-1",
      name: "แผนปี 2027",
      incomes: [],
      expenses: [],
      updatedAt: FIXED_NOW.toISOString(),
    });
  });

  it("createPlan ชื่อว่าง → ใช้ชื่อเริ่มต้น", () => {
    expect(createPlan(createTestContext(), "   ").name).toBe("แผนของฉัน");
  });

  it("savePlan แล้ว loadPlan ด้วย id เดิม → ได้ข้อมูลเท่ากัน", async () => {
    const repo = new InMemoryPlanRepository();
    const plan = createPlan(createTestContext(), "A");
    await savePlan(repo, plan);
    expect(await loadPlan(repo, plan.id)).toEqual(plan);
  });

  it("listPlans เรียงจากแก้ไขล่าสุดก่อน", async () => {
    const repo = new InMemoryPlanRepository();
    await savePlan(repo, { ...createPlan(createTestContext(), "เก่า"), id: "old", updatedAt: "2027-01-01T00:00:00.000Z" });
    await savePlan(repo, { ...createPlan(createTestContext(), "ใหม่"), id: "new", updatedAt: "2027-06-01T00:00:00.000Z" });
    expect((await listPlans(repo)).map((p) => p.id)).toEqual(["new", "old"]);
  });

  it("deletePlan", async () => {
    const repo = new InMemoryPlanRepository();
    const plan = createPlan(createTestContext());
    await savePlan(repo, plan);
    await deletePlan(repo, plan.id);
    expect(await loadPlan(repo, plan.id)).toBeNull();
  });
});
