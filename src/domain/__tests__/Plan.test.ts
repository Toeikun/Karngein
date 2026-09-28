import { describe, expect, it } from "vitest";
import { createEmptyPlan } from "@/domain/entities/Plan";

describe("createEmptyPlan", () => {
  const now = new Date("2027-01-01T00:00:00.000Z");

  it("ได้แผนว่าง: incomes และ expenses เป็น array ว่าง", () => {
    const plan = createEmptyPlan({ id: "p1", now });
    expect(plan.incomes).toEqual([]);
    expect(plan.expenses).toEqual([]);
  });

  it("ใช้ id และเวลาที่ส่งเข้ามา (pure function)", () => {
    expect(createEmptyPlan({ id: "p1", name: "แผนปี 2027", now })).toEqual({
      id: "p1",
      name: "แผนปี 2027",
      incomes: [],
      expenses: [],
      updatedAt: "2027-01-01T00:00:00.000Z",
    });
  });

  it('ไม่ระบุชื่อ → ใช้ "แผนของฉัน"', () => {
    expect(createEmptyPlan({ id: "p1", now }).name).toBe("แผนของฉัน");
  });

  it("เรียก 2 ครั้งได้ object คนละตัว (แก้ตัวหนึ่งไม่กระทบอีกตัว)", () => {
    const a = createEmptyPlan({ id: "p1", now });
    const b = createEmptyPlan({ id: "p1", now });
    expect(a.incomes).not.toBe(b.incomes);
  });
});
