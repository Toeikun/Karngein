import { describe, expect, it } from "vitest";
import { addGoal, removeGoal, updateGoal } from "@/application/usecases/goals";
import type { GoalInput } from "@/domain/entities/Goal";
import { goalsOf } from "@/domain/entities/Plan";
import { goldenPlan3 } from "../../domain/__tests__/goldenData";
import { createTestContext, deepFreeze, FIXED_NOW, unwrap } from "./testContext";

const input: GoalInput = {
  name: "  เที่ยวญี่ปุ่น  ",
  category: "reward",
  target: { kind: "fixed", amount: 80000 },
  startingAmount: 0,
};

describe("use cases เป้าหมาย", () => {
  const plan = deepFreeze(structuredClone(goldenPlan3)); // แช่แข็ง → ถ้าแอบแก้แผนเดิมจะ throw

  it("เพิ่มเป้า → ได้ id ใหม่, ตัดช่องว่างชื่อ, แผนเดิมไม่เปลี่ยน", () => {
    const next = unwrap(addGoal(plan, input, createTestContext()));
    expect(goalsOf(next)).toHaveLength(2);
    expect(goalsOf(next)[1]).toEqual({ id: "id-1", name: "เที่ยวญี่ปุ่น", category: "reward", target: { kind: "fixed", amount: 80000 }, startingAmount: 0 });
    expect(next.updatedAt).toBe(FIXED_NOW.toISOString());
    expect(goalsOf(plan)).toHaveLength(1);
  });

  it("แผนเก่าที่ไม่มี goals → เพิ่มเป้าแรกได้", () => {
    const old = { ...goldenPlan3, goals: undefined };
    expect(goalsOf(unwrap(addGoal(old, input, createTestContext())))).toHaveLength(1);
  });

  it("ข้อมูลผิด (× 0) → error แผนไม่เปลี่ยน", () => {
    const bad: GoalInput = { ...input, target: { kind: "incomeMultiple", incomeId: "inc-salary", times: 0 } };
    expect(addGoal(plan, bad, createTestContext()).ok).toBe(false);
  });

  it("แก้เป้า: เปลี่ยนเป็นเงินเดือน × 6", () => {
    const next = unwrap(
      updateGoal(plan, "goal-emergency", { ...goalsOf(plan)[0], target: { kind: "incomeMultiple", incomeId: "inc-salary", times: 6 } }, createTestContext()),
    );
    expect(goalsOf(next)[0].target).toEqual({ kind: "incomeMultiple", incomeId: "inc-salary", times: 6 });
    expect(goalsOf(next)[0].id).toBe("goal-emergency");
  });

  it("ลบเป้า / id ที่ไม่มี → error", () => {
    expect(goalsOf(unwrap(removeGoal(plan, "goal-emergency", createTestContext())))).toEqual([]);
    expect(removeGoal(plan, "nope", createTestContext()).ok).toBe(false);
    expect(updateGoal(plan, "nope", input, createTestContext()).ok).toBe(false);
  });
});
