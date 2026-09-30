import { describe, expect, it } from "vitest";
import { round2 } from "@/domain/entities/Money";
import { cycleContaining } from "@/domain/entities/PayCycle";
import { goalsOf, payCycleStartDayOf, type Plan } from "@/domain/entities/Plan";
import { compareWithBudget, summarizeCycle } from "@/domain/services/cycleSummary";
import { goalProgress, goalTarget } from "@/domain/services/goalProgress";
import { goldenPlan1, goldenPlan3, goldenTransactions3 } from "./goldenData";

const startDay = payCycleStartDayOf(goldenPlan3);
const septCycle = cycleContaining("2026-09-25", startDay); // 25 ก.ย. – 24 ต.ค.
const octCycle = cycleContaining("2026-10-25", startDay); // 25 ต.ค. – 24 พ.ย.
const goal = goalsOf(goldenPlan3)[0];

describe("🏆 Golden ชุดที่ 3 — สรุปต่อรอบ (R16)", () => {
  it("รอบ 25 ก.ย. – 24 ต.ค.: รับ 44,100 / จ่าย 8,170 / คงเหลือ 35,930", () => {
    const s = summarizeCycle(goldenTransactions3, septCycle);
    expect({ income: s.income, expense: s.expense, remaining: s.remaining, count: s.count }).toEqual({
      income: 44100,
      expense: 8170, // 250 + 5,000 (ออมเข้าเป้านับเป็นรายจ่าย D13) + 2,500 + 120 + 300
      remaining: 35930,
      count: 6,
    });
    expect(s.byCategory).toEqual({ essential: 670, wants: 2500, investment: 0, emergency: 5000, reward: 0 });
  });

  it("เงินเดือน 25 ต.ค. อยู่รอบใหม่: รับ 44,100 / จ่าย 0", () => {
    const s = summarizeCycle(goldenTransactions3, octCycle);
    expect([s.income, s.expense, s.remaining, s.count]).toEqual([44100, 0, 44100, 1]);
  });

  it("รอบที่ไม่มีรายการ → 0 ทั้งหมด", () => {
    const s = summarizeCycle(goldenTransactions3, cycleContaining("2027-06-01", startDay));
    expect([s.income, s.expense, s.remaining, s.count]).toEqual([0, 0, 0, 0]);
  });
});

describe("R17 — เทียบงบของกลุ่มต่อรอบ", () => {
  const { lines, unlinkedExpense } = compareWithBudget(goldenPlan3, goldenTransactions3, septCycle);
  const line = (id: string) => lines.find((l) => l.groupId === id)!;

  it("ค่าอาหาร: ใช้ 550 จากงบ 8,000 = 6.9%", () => {
    expect(line("grp-food")).toMatchObject({ budget: 8000, actual: 550, over: false });
    expect(line("grp-food").percentUsed!.toFixed(1)).toBe("6.9");
  });

  it("สังสรรค์: ใช้ 2,500 จากงบ 2,000 = 125% เกินงบ", () => {
    expect(line("grp-fun")).toMatchObject({ budget: 2000, actual: 2500, percentUsed: 125, over: true });
  });

  it("รายจ่ายที่ไม่ได้ผูกกลุ่ม = 120", () => expect(unlinkedExpense).toBe(120));

  it("งบ 0 → percentUsed เป็น null (ไม่หารด้วยศูนย์)", () => {
    const plan: Plan = { ...goldenPlan3, expenses: [{ ...goldenPlan3.expenses[0], amount: 0 }] };
    expect(compareWithBudget(plan, goldenTransactions3, septCycle).lines[0].percentUsed).toBeNull();
  });
});

describe("R18–R20 — เป้าหมาย", () => {
  it("🏆 เป้า = เงินเดือน × 12 = 529,200 / ความคืบหน้า 55,000 = 10.4%", () => {
    const p = goalProgress(goal, goldenPlan3, goldenTransactions3, "2026-10-26");
    expect(p.status).toBe("ok");
    if (p.status !== "ok") return;
    expect(p.target).toBe(529200);
    expect(p.current).toBe(55000);
    expect(p.percent.toFixed(1)).toBe("10.4");
    expect(p.remaining).toBe(474200);
  });

  it("แก้เงินเดือนในแผนเป็น 50,000 → เป้าเปลี่ยนเป็น 600,000 เอง", () => {
    const plan: Plan = { ...goldenPlan3, incomes: [{ ...goldenPlan3.incomes[0], amount: 50000 }] };
    expect(goalTarget(goal, plan)).toBe(600000);
  });

  it("เงินเดือนเป็นรายปี 600,000 → ยอดต่อเดือน 50,000 × 12 = 600,000", () => {
    const plan: Plan = { ...goldenPlan3, incomes: [{ ...goldenPlan3.incomes[0], amount: 600000, frequency: "yearly" }] };
    expect(round2(goalTarget(goal, plan)!)).toBe(600000);
  });

  it("R20: ลบรายได้ที่เป้าอ้างอิง → missingIncome (ไม่ error) และยังบอกยอดปัจจุบัน", () => {
    const plan: Plan = { ...goldenPlan3, incomes: [] };
    expect(goalProgress(goal, plan, goldenTransactions3, "2026-10-26")).toEqual({ status: "missingIncome", current: 55000 });
  });

  it("เป้าจำนวนตายตัว + ถึงเป้าแล้ว → reached, remaining 0, cyclesToGo 0", () => {
    const fixed = { ...goal, target: { kind: "fixed" as const, amount: 40000 } };
    const p = goalProgress(fixed, goldenPlan3, goldenTransactions3, "2026-10-26");
    expect(p).toMatchObject({ status: "ok", reached: true, remaining: 0, cyclesToGo: 0 });
    if (p.status === "ok") expect(p.percent).toBeCloseTo(137.5);
  });

  it("R19: ออมรอบละ 5,000 ใน 1 รอบที่จบแล้ว → ขาด 474,200 ÷ 5,000 = 95 รอบ", () => {
    const p = goalProgress(goal, goldenPlan3, goldenTransactions3, "2026-10-26");
    expect(p.status === "ok" && p.cyclesToGo).toBe(95);
  });

  it("R19: ยังไม่มีรอบที่จบแล้ว (ออมในรอบปัจจุบันเท่านั้น) → ยังประมาณไม่ได้ (null)", () => {
    const p = goalProgress(goal, goldenPlan3, goldenTransactions3, "2026-10-05");
    expect(p.status === "ok" && p.cyclesToGo).toBeNull();
  });

  it("R19: ไม่เคยออมเข้าเป้า → null", () => {
    const p = goalProgress(goal, goldenPlan3, [], "2027-01-01");
    expect(p.status === "ok" && p.cyclesToGo).toBeNull();
  });

  it("R19: ใช้ค่าเฉลี่ยสูงสุด 3 รอบล่าสุดที่จบแล้ว", () => {
    const tx = [
      { id: "a", date: "2026-06-01", type: "expense" as const, amount: 90000, category: "emergency" as const, goalId: goal.id }, // เก่าเกิน 3 รอบ ไม่นับค่าเฉลี่ย
      { id: "b", date: "2026-08-01", type: "expense" as const, amount: 3000, category: "emergency" as const, goalId: goal.id },
      { id: "c", date: "2026-09-01", type: "expense" as const, amount: 6000, category: "emergency" as const, goalId: goal.id },
      { id: "d", date: "2026-10-01", type: "expense" as const, amount: 9000, category: "emergency" as const, goalId: goal.id },
    ];
    // วันนี้ 2026-10-26 → รอบที่จบแล้ว 3 รอบ: 25 ก.ค.–24 ส.ค., 25 ส.ค.–24 ก.ย., 25 ก.ย.–24 ต.ค. → เฉลี่ย (3,000+6,000+9,000)/3 = 6,000
    // current = 50,000 + 108,000 = 158,000 → ขาด 371,200 → ceil(371,200 / 6,000) = 62
    const p = goalProgress(goal, goldenPlan3, tx, "2026-10-26");
    expect(p.status === "ok" && p.cyclesToGo).toBe(62);
  });
});

describe("แผนเก่า (ก่อน Phase 11) ยังใช้ได้", () => {
  it("ไม่มี payCycleStartDay → 1 (เดือนปฏิทิน), ไม่มี goals → []", () => {
    expect(payCycleStartDayOf(goldenPlan1)).toBe(1);
    expect(goalsOf(goldenPlan1)).toEqual([]);
  });
});
