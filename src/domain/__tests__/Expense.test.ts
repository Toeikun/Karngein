import { describe, expect, it } from "vitest";
import { validateExpenseGroup } from "@/domain/entities/Expense";

const fields = (errors: { field: string }[]) => errors.map((e) => e.field);

describe("validateExpenseGroup", () => {
  it("กลุ่มมีรายการย่อยถูกต้อง → ผ่าน (ไม่ต้องมี amount ของกลุ่ม)", () => {
    const group = {
      name: "รายจ่ายหลัก",
      category: "essential",
      items: [
        { name: "ประกันสังคม", amount: 9000, frequency: "yearly" },
        { name: "ค่าอาหาร", amount: 8000, frequency: "monthly" },
      ],
    };
    expect(validateExpenseGroup(group)).toEqual([]);
  });

  it("กลุ่มไม่มีรายการย่อย → ต้องมี amount/frequency ของตัวเอง", () => {
    const group = { name: "Lifestyle & ท่องเที่ยว", category: "reward", items: [] };
    expect(fields(validateExpenseGroup(group))).toEqual(["amount", "frequency"]);
    expect(validateExpenseGroup({ ...group, amount: 50000, frequency: "yearly" })).toEqual([]);
  });

  it("หมวดไม่ถูกต้อง → error ที่ category", () => {
    const group = { name: "x", category: "Needs", items: [], amount: 1, frequency: "monthly" };
    expect(fields(validateExpenseGroup(group))).toEqual(["category"]);
  });

  it("รายการย่อยแถวที่ 2 ติดลบ → error ระบุแถว items.1.amount", () => {
    const group = {
      name: "บัตรเครดิต",
      category: "essential",
      items: [
        { name: "Netflix", amount: 419, frequency: "monthly" },
        { name: "ค่าอื่นๆ", amount: -10, frequency: "monthly" },
      ],
    };
    expect(fields(validateExpenseGroup(group))).toEqual(["items.1.amount"]);
  });
});
