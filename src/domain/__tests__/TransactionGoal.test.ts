import { describe, expect, it } from "vitest";
import { validateGoal } from "@/domain/entities/Goal";
import { validateTransaction } from "@/domain/entities/Transaction";

const fields = (errors: { field: string }[]) => errors.map((e) => e.field);

describe("validateTransaction", () => {
  const expense = { date: "2026-10-01", type: "expense" as const, amount: 250, category: "essential" as const };

  it("รายจ่ายที่ถูกต้อง → ผ่าน", () => expect(validateTransaction(expense)).toEqual([]));
  it("รายรับไม่ต้องมีหมวด → ผ่าน", () =>
    expect(validateTransaction({ date: "2026-09-25", type: "income", amount: 44100 })).toEqual([]));
  it("จำนวน 0 หรือติดลบ → error", () => {
    expect(fields(validateTransaction({ ...expense, amount: 0 }))).toEqual(["amount"]);
    expect(fields(validateTransaction({ ...expense, amount: -5 }))).toEqual(["amount"]);
  });
  it("รายจ่ายไม่มีหมวด → error", () =>
    expect(fields(validateTransaction({ ...expense, category: undefined }))).toEqual(["category"]));
  it("วันที่ไม่มีจริง → error", () =>
    expect(fields(validateTransaction({ ...expense, date: "2026-02-30" }))).toEqual(["date"]));
  it("รายรับผูกเป้าหมายไม่ได้", () =>
    expect(fields(validateTransaction({ date: "2026-09-25", type: "income", amount: 1, goalId: "g" }))).toEqual(["goalId"]));
});

describe("validateGoal", () => {
  const goal = {
    name: "เป้าหมายเงินออมฉุกเฉิน",
    category: "emergency" as const,
    target: { kind: "incomeMultiple" as const, incomeId: "inc-salary", times: 12 },
    startingAmount: 50000,
  };

  it("เป้าแบบ เงินเดือน × 12 → ผ่าน", () => expect(validateGoal(goal)).toEqual([]));
  it("เป้าแบบจำนวนตายตัว → ผ่าน", () =>
    expect(validateGoal({ ...goal, target: { kind: "fixed", amount: 100000 } })).toEqual([]));
  it("ไม่ได้ตั้งชื่อ → error", () => expect(fields(validateGoal({ ...goal, name: " " }))).toEqual(["name"]));
  it("× 0 หรือ × 2.5 → error", () => {
    expect(fields(validateGoal({ ...goal, target: { ...goal.target, times: 0 } }))).toEqual(["times"]);
    expect(fields(validateGoal({ ...goal, target: { ...goal.target, times: 2.5 } }))).toEqual(["times"]);
  });
  it("ไม่ได้เลือกรายได้ → error", () =>
    expect(fields(validateGoal({ ...goal, target: { ...goal.target, incomeId: "" } }))).toEqual(["target"]));
  it("เป้าจำนวนตายตัว 0 → error", () =>
    expect(fields(validateGoal({ ...goal, target: { kind: "fixed", amount: 0 } }))).toEqual(["target"]));
  it("เงินตั้งต้นติดลบ → error", () =>
    expect(fields(validateGoal({ ...goal, startingAmount: -1 }))).toEqual(["startingAmount"]));
});
