import { describe, expect, it } from "vitest";
import {
  addExpenseGroup,
  addExpenseItem,
  organizeExpenses,
  removeExpenseGroup,
  removeExpenseItem,
  updateExpenseGroup,
  updateExpenseItem,
} from "@/application/usecases/expenses";
import { groupTotal } from "@/domain/services/summarize";
import { basePlan, createTestContext, unwrap } from "./testContext";

const monthly = { kind: "monthly" } as const;

describe("กลุ่มรายจ่าย", () => {
  it("เพิ่มกลุ่มพร้อมรายการย่อย → ทุกรายการได้ id", () => {
    const next = unwrap(
      addExpenseGroup(
        basePlan(),
        {
          name: "การลงทุน",
          category: "investment",
          items: [{ name: "DCA", amount: 5000, frequency: "monthly" }],
        },
        createTestContext(),
      ),
    );
    const group = next.expenses[2];
    expect(group.id).toBe("id-1");
    expect(group.items[0].id).toBe("id-2");
    expect(group).not.toHaveProperty("amount");
  });

  it("เพิ่มกลุ่มแบบไม่มีรายการย่อย → เก็บ amount/frequency ของกลุ่ม", () => {
    const next = unwrap(
      addExpenseGroup(
        basePlan(),
        { name: "เงินสำรองฉุกเฉิน", category: "emergency", amount: 2000, frequency: "monthly" },
        createTestContext(),
      ),
    );
    expect(groupTotal(next.expenses[2], monthly)).toBe(2000);
  });

  it("หมวดไม่ถูกต้อง → error", () => {
    const result = addExpenseGroup(
      basePlan(),
      // @ts-expect-error จำลองข้อมูลผิดที่อาจมาจากภายนอก
      { name: "x", category: "Needs", amount: 1, frequency: "monthly" },
      createTestContext(),
    );
    expect(result.ok).toBe(false);
  });

  it("แก้ชื่อและหมวดกลุ่ม", () => {
    const next = unwrap(
      updateExpenseGroup(basePlan(), "grp-trip", { name: "เที่ยวญี่ปุ่น", category: "wants" }, createTestContext()),
    );
    expect(next.expenses[1]).toMatchObject({ name: "เที่ยวญี่ปุ่น", category: "wants", amount: 24000 });
  });

  it("ลบกลุ่ม", () => {
    const next = unwrap(removeExpenseGroup(basePlan(), "grp-trip", createTestContext()));
    expect(next.expenses.map((g) => g.id)).toEqual(["grp-main"]);
  });
});

describe("รายการย่อย", () => {
  it("เพิ่มรายการย่อยให้กลุ่มที่เคยใช้ amount ของตัวเอง → ยอดมาจากรายการย่อยแทน", () => {
    const next = unwrap(
      addExpenseItem(basePlan(), "grp-trip", { name: "ตั๋วเครื่องบิน", amount: 1000, frequency: "monthly" }, createTestContext()),
    );
    const trip = next.expenses[1];
    expect(trip).not.toHaveProperty("amount");
    expect(groupTotal(trip, monthly)).toBe(1000);
  });

  it("เพิ่มรายการย่อยในกลุ่มที่ไม่มีอยู่ → error", () => {
    const result = addExpenseItem(basePlan(), "nope", { name: "x", amount: 1, frequency: "monthly" }, createTestContext());
    expect(result.ok).toBe(false);
  });

  it("แก้รายการย่อย → ยอดกลุ่มเปลี่ยนตาม", () => {
    const next = unwrap(updateExpenseItem(basePlan(), "grp-main", "itm-food", { amount: 9000 }, createTestContext()));
    expect(groupTotal(next.expenses[0], monthly)).toBe(12000);
  });

  it("แก้รายการย่อยให้ติดลบ → error แผนไม่เปลี่ยน", () => {
    const plan = basePlan();
    expect(updateExpenseItem(plan, "grp-main", "itm-food", { amount: -1 }, createTestContext()).ok).toBe(false);
    expect(plan.expenses[0].items[0].amount).toBe(8000);
  });

  it("ลบรายการย่อยตัวสุดท้ายของกลุ่ม → กลุ่มยังอยู่ ยอดกลุ่ม = 0", () => {
    const ctx = createTestContext();
    const step1 = unwrap(removeExpenseItem(basePlan(), "grp-main", "itm-food", ctx));
    const step2 = unwrap(removeExpenseItem(step1, "grp-main", "itm-travel", ctx));
    const group = step2.expenses.find((g) => g.id === "grp-main")!;
    expect(group.items).toEqual([]);
    expect(groupTotal(group, monthly)).toBe(0);
  });
});

describe("organizeExpenses — จัดระเบียบ", () => {
  it("เรียงตามหมวด essential → wants → investment → emergency → reward และคงลำดับเดิมในหมวดเดียวกัน", () => {
    const plan = {
      ...basePlan(),
      expenses: [
        { id: "r1", name: "r1", category: "reward" as const, items: [], amount: 1, frequency: "monthly" as const },
        { id: "m1", name: "m1", category: "emergency" as const, items: [], amount: 1, frequency: "monthly" as const },
        { id: "e1", name: "e1", category: "essential" as const, items: [], amount: 1, frequency: "monthly" as const },
        { id: "i1", name: "i1", category: "investment" as const, items: [], amount: 1, frequency: "monthly" as const },
        { id: "e2", name: "e2", category: "essential" as const, items: [], amount: 1, frequency: "monthly" as const },
        { id: "w1", name: "w1", category: "wants" as const, items: [], amount: 1, frequency: "monthly" as const },
      ],
    };
    const next = unwrap(organizeExpenses(plan, createTestContext()));
    expect(next.expenses.map((g) => g.id)).toEqual(["e1", "e2", "w1", "i1", "m1", "r1"]);
    expect(plan.expenses[0].id).toBe("r1"); // แผนเดิมไม่ถูกเรียงตาม
  });
});
