import { describe, expect, it } from "vitest";
import { round2 } from "@/domain/entities/Money";
import type { Period } from "@/domain/entities/Period";
import { createEmptyPlan, type Plan } from "@/domain/entities/Plan";
import { groupTotal, summarize, type PlanSummary } from "@/domain/services/summarize";
import { goldenPlan1, goldenPlan2 } from "./goldenData";

/** เทียบเฉพาะ 4 ตัวเลขหลัก หลังปัดเศษ 2 ตำแหน่ง (แบบเดียวกับที่หน้าเว็บแสดง) */
const headline = (s: PlanSummary) => ({
  income: round2(s.income),
  expense: round2(s.expense),
  saving: round2(s.saving),
  remaining: round2(s.remaining),
});

describe("🏆 Golden test — ตัวเลขต้องตรงกับเว็บต้นแบบทุกช่อง (PLAN.md ข้อ 9.3)", () => {
  const cases: [string, Plan, Period, ReturnType<typeof headline>][] = [
    [
      "ชุด 1 · รายเดือน",
      goldenPlan1,
      { kind: "monthly" },
      { income: 34166.67, expense: 20916.67, saving: 5000, remaining: 13250 },
    ],
    [
      "ชุด 1 · รายปี 2026",
      goldenPlan1,
      { kind: "yearly", year: 2026 },
      { income: 440000, expense: 251000, saving: 60000, remaining: 189000 },
    ],
    [
      "ชุด 1 · ก.ย.–พ.ย. 2026",
      goldenPlan1,
      { kind: "range", from: { year: 2026, month: 9 }, to: { year: 2026, month: 11 } },
      { income: 132500, expense: 62750, saving: 15000, remaining: 69750 },
    ],
    [
      "ชุด 1 · รายปี 2027 (one-time อยู่นอกปี)",
      goldenPlan1,
      { kind: "yearly", year: 2027 },
      { income: 410000, expense: 251000, saving: 60000, remaining: 159000 },
    ],
    [
      "ชุด 2 · รายเดือน (มีหมวดสำรองฉุกเฉิน)",
      goldenPlan2,
      { kind: "monthly" },
      { income: 34166.67, expense: 22916.67, saving: 7000, remaining: 11250 },
    ],
  ];

  it.each(cases)("%s", (_label, plan, period, expected) => {
    expect(headline(summarize(plan, period))).toEqual(expected);
  });

  it("ชุด 1 · % หมวดตรงกับต้นแบบ (จำเป็น 34.4%, ฟุ่มเฟือย 0%, ออม 14.6%, ให้รางวัล 12.2%)", () => {
    const { byCategory } = summarize(goldenPlan1, { kind: "monthly" });
    const pct = (id: keyof typeof byCategory) => byCategory[id].percentOfIncome.toFixed(1);
    expect(pct("essential")).toBe("34.4");
    expect(pct("wants")).toBe("0.0");
    expect(pct("investment")).toBe("14.6");
    expect(pct("emergency")).toBe("0.0");
    expect(pct("reward")).toBe("12.2");
  });
});

describe("กฎ R6–R11", () => {
  it("R6: กลุ่มที่มีรายการย่อย = ผลรวมรายการย่อย (750 + 8,000 + 3,000)", () => {
    const main = goldenPlan1.expenses.find((g) => g.id === "exp-main")!;
    expect(groupTotal(main, { kind: "monthly" })).toBe(11750);
  });

  it("R6: กลุ่มไม่มีรายการย่อย = amount ของกลุ่ม (50,000 รายปี → ÷12)", () => {
    const lifestyle = goldenPlan1.expenses.find((g) => g.id === "exp-lifestyle")!;
    expect(groupTotal(lifestyle, { kind: "monthly" })).toBe(50000 / 12);
  });

  it("R6: ถ้ามีรายการย่อย จะไม่สนใจ amount ของกลุ่ม", () => {
    const group = {
      id: "g",
      name: "g",
      category: "essential" as const,
      amount: 999999,
      frequency: "monthly" as const,
      items: [{ id: "i", name: "i", amount: 100, frequency: "monthly" as const }],
    };
    expect(groupTotal(group, { kind: "monthly" })).toBe(100);
  });

  it("R7: รายจ่ายรวม นับหมวดออม/ลงทุนและสำรองฉุกเฉินด้วย", () => {
    const s = summarize(goldenPlan2, { kind: "monthly" });
    const allCategories = Object.values(s.byCategory).reduce((t, c) => t + c.amount, 0);
    expect(s.expense).toBe(allCategories);
    expect(s.byCategory.investment.amount).toBeGreaterThan(0);
    expect(s.byCategory.emergency.amount).toBe(2000);
  });

  it("R8: ออม/ลงทุน = investment + emergency", () => {
    const s = summarize(goldenPlan2, { kind: "monthly" });
    expect(s.saving).toBe(s.byCategory.investment.amount + s.byCategory.emergency.amount);
  });

  it("R9: รายจ่ายมากกว่ารายได้ → เงินคงเหลือติดลบ", () => {
    const plan: Plan = {
      ...createEmptyPlan({ id: "p", now: new Date(0) }),
      incomes: [{ id: "i", name: "เงินเดือน", amount: 10000, frequency: "monthly" }],
      expenses: [
        {
          id: "e",
          name: "ค่าเช่า",
          category: "essential",
          items: [],
          amount: 15000,
          frequency: "monthly",
        },
      ],
    };
    expect(summarize(plan, { kind: "monthly" }).remaining).toBe(-5000);
  });

  it("R10: % หมวด = ยอดหมวด ÷ รายได้ × 100", () => {
    const s = summarize(goldenPlan1, { kind: "monthly" });
    expect(s.byCategory.investment.percentOfIncome).toBe((5000 / (30000 + 50000 / 12)) * 100);
  });

  it("R11: summarize ไม่ปัดเศษ (ปัดตอนแสดงผลเท่านั้น)", () => {
    const s = summarize(goldenPlan1, { kind: "monthly" });
    expect(s.income).toBe(30000 + 50000 / 12); // 34166.666...
    expect(s.income).not.toBe(34166.67);
  });

  // R12 (amount ติดลบ / ไม่ใช่ตัวเลข ไม่ยอมรับ) ทดสอบแล้วใน Income.test.ts และ Money.test.ts
  // ข้อมูลถูกตรวจตั้งแต่ตอนรับเข้า จึงไม่ต้องตรวจซ้ำตอนคำนวณ
});

describe("Edge cases", () => {
  it("แผนว่าง → ทุกค่าเป็น 0", () => {
    const s = summarize(createEmptyPlan({ id: "p", now: new Date(0) }), { kind: "monthly" });
    expect(headline(s)).toEqual({ income: 0, expense: 0, saving: 0, remaining: 0 });
  });

  it("รายได้ = 0 แต่มีรายจ่าย → % = 0 ไม่เป็น NaN/Infinity", () => {
    const plan: Plan = { ...goldenPlan1, incomes: [] };
    const s = summarize(plan, { kind: "monthly" });
    for (const category of Object.values(s.byCategory)) {
      expect(Number.isFinite(category.percentOfIncome)).toBe(true);
      expect(category.percentOfIncome).toBe(0);
    }
  });

  it("byCategory มีครบ 5 หมวดเสมอ แม้หมวดนั้นไม่มีรายการ", () => {
    const s = summarize(createEmptyPlan({ id: "p", now: new Date(0) }), { kind: "monthly" });
    expect(Object.keys(s.byCategory)).toEqual([
      "essential",
      "wants",
      "investment",
      "emergency",
      "reward",
    ]);
  });

  it("summarize ไม่แก้ไขแผนต้นฉบับ", () => {
    const before = JSON.stringify(goldenPlan1);
    summarize(goldenPlan1, { kind: "yearly", year: 2026 });
    expect(JSON.stringify(goldenPlan1)).toBe(before);
  });
});
