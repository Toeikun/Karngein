import { describe, expect, it } from "vitest";
import type { Plan } from "@/domain/entities/Plan";
import type { Transaction } from "@/domain/entities/Transaction";
import { compareWithBudget } from "@/domain/services/cycleSummary";
import { budgetPace } from "@/domain/services/dailyView";
import { amountInMonth, monthPlan, planMonthOfCycle, specialItemsInMonth, yearPlan } from "@/domain/services/monthlyPlan";
import { summarize } from "@/domain/services/summarize";

/**
 * Golden ชุดที่ 5 (Phase 13.1): เงินเดือน 30,000 + โบนัส 60,000 (รายปี ธ.ค.)
 * กลุ่ม "จำเป็น": อาหาร 8,000/เดือน + ค่าประกันรถ 12,000/ปี (ครบ 15 มี.ค.) + ค่าสมาชิก 2,400/ปี (ไม่ระบุวัน → 200/เดือน)
 * กลุ่ม "การศึกษา": ค่าเทอม 30,000 ครั้งเดียว (10 พ.ค. 2027)
 */
const plan: Plan = {
  id: "p",
  name: "แผน 2027",
  updatedAt: "2027-01-01T00:00:00.000Z",
  incomes: [
    { id: "salary", name: "เงินเดือน", amount: 30000, frequency: "monthly" },
    { id: "bonus", name: "โบนัส", amount: 60000, frequency: "yearly", date: "2027-12-20" },
  ],
  expenses: [
    {
      id: "need",
      name: "จำเป็น",
      category: "essential",
      items: [
        { id: "food", name: "อาหาร", amount: 8000, frequency: "monthly" },
        { id: "insure", name: "ค่าประกันรถ", amount: 12000, frequency: "yearly", date: "2027-03-15" },
        { id: "member", name: "ค่าสมาชิก", amount: 2400, frequency: "yearly" },
      ],
    },
    { id: "edu", name: "การศึกษา", category: "essential", items: [{ id: "tuition", name: "ค่าเทอม", amount: 30000, frequency: "one-time", date: "2027-05-10" }] },
  ],
};

describe("R35 amountInMonth / monthPlan", () => {
  it("รายปีที่มีวันที่ → เฉพาะเดือนนั้น (ทุกปี) / ไม่มีวันที่ → ÷ 12 / ครั้งเดียว → เฉพาะเดือน+ปีนั้น", () => {
    expect(amountInMonth({ amount: 12000, frequency: "yearly", date: "2027-03-15" }, { year: 2028, month: 3 })).toBe(12000);
    expect(amountInMonth({ amount: 12000, frequency: "yearly", date: "2027-03-15" }, { year: 2027, month: 4 })).toBe(0);
    expect(amountInMonth({ amount: 2400, frequency: "yearly" }, { year: 2027, month: 4 })).toBe(200);
    expect(amountInMonth({ amount: 30000, frequency: "one-time", date: "2027-05-10" }, { year: 2028, month: 5 })).toBe(0);
    expect(amountInMonth({ amount: 30000, frequency: "one-time" }, { year: 2027, month: 5 })).toBe(0);
  });

  it("golden: มี.ค. มีค่าประกัน, พ.ค. มีค่าเทอม, ธ.ค. มีโบนัส", () => {
    expect(monthPlan(plan, { year: 2027, month: 3 })).toMatchObject({ income: 30000, expense: 20200, remaining: 9800 });
    expect(monthPlan(plan, { year: 2027, month: 5 }).groups).toEqual([
      { id: "need", name: "จำเป็น", category: "essential", amount: 8200 },
      { id: "edu", name: "การศึกษา", category: "essential", amount: 30000 },
    ]);
    expect(monthPlan(plan, { year: 2027, month: 5 }).remaining).toBe(-8200); // เดือนที่ติดลบ → ต้องเตรียมเงิน
    expect(monthPlan(plan, { year: 2027, month: 12 })).toMatchObject({ income: 90000, expense: 8200 });
  });

  it("yearPlan: รวม 12 เดือน = มุมมองรายปีของแผน (R4) ทุกตัวเลข", () => {
    const months = yearPlan(plan, 2027);
    expect(months).toHaveLength(12);
    const yearly = summarize(plan, { kind: "yearly", year: 2027 });
    expect(months.reduce((s, m) => s + m.income, 0)).toBeCloseTo(yearly.income, 6);
    expect(months.reduce((s, m) => s + m.expense, 0)).toBeCloseTo(yearly.expense, 6);
  });
});

describe("specialItemsInMonth — อธิบายว่าเดือนนี้มีอะไรพิเศษ", () => {
  it("มี.ค. = ค่าประกัน / ธ.ค. = โบนัส / เม.ย. = ไม่มี (รายปีไม่ระบุวันไม่นับเป็นพิเศษ)", () => {
    expect(specialItemsInMonth(plan, { year: 2027, month: 3 })).toEqual([{ name: "จำเป็น · ค่าประกันรถ", amount: 12000, kind: "expense" }]);
    expect(specialItemsInMonth(plan, { year: 2027, month: 12 })).toEqual([{ name: "โบนัส", amount: 60000, kind: "income" }]);
    expect(specialItemsInMonth(plan, { year: 2027, month: 4 })).toEqual([]);
  });
});

describe("R36 planMonthOfCycle", () => {
  it.each([
    [{ start: "2027-03-01", end: "2027-03-31" }, { year: 2027, month: 3 }], // รอบเริ่ม 1 = เดือนเดียวกัน
    [{ start: "2027-02-25", end: "2027-03-24" }, { year: 2027, month: 3 }], // 4 วัน ก.พ. / 24 วัน มี.ค.
    [{ start: "2027-03-10", end: "2027-04-09" }, { year: 2027, month: 3 }], // 22 วัน มี.ค. / 9 วัน เม.ย.
    [{ start: "2027-04-16", end: "2027-05-15" }, { year: 2027, month: 5 }], // 15 / 15 เท่ากัน → เดือนหลัง
    [{ start: "2027-12-25", end: "2028-01-24" }, { year: 2028, month: 1 }], // ข้ามปี
  ])("%o → %o", (cycle, expected) => {
    expect(planMonthOfCycle(cycle)).toEqual(expected);
  });
});

describe("R17′ เทียบงบใช้แผนของเดือนจริง (แก้ปัญหางบเฉลี่ยฟ้องเกินงบผิด)", () => {
  const march = { start: "2027-02-25", end: "2027-03-24" }; // รอบเงินเดือน 25 → แผน มี.ค.
  const pay: Transaction[] = [
    { id: "a", date: "2027-03-15", type: "expense", amount: 12000, category: "essential", planGroupId: "need" },
    { id: "b", date: "2027-03-01", type: "expense", amount: 8000, category: "essential", planGroupId: "need" },
  ];

  it("จ่ายค่าประกันในเดือนที่ครบกำหนด → งบ มี.ค. = 20,200 ไม่เกินงบ (เดิมงบเฉลี่ย 9,200 → ฟ้องเกิน)", () => {
    const need = compareWithBudget(plan, pay, march).lines.find((l) => l.groupId === "need")!;
    expect(need).toMatchObject({ budget: 20200, actual: 20000, over: false });
  });

  it("ค่าเทอมครั้งเดียว → เป็นงบของรอบที่ตรงกับ พ.ค. เท่านั้น", () => {
    const may = { start: "2027-04-25", end: "2027-05-24" };
    const april = { start: "2027-03-25", end: "2027-04-24" };
    expect(compareWithBudget(plan, [], may).lines.find((l) => l.groupId === "edu")!.budget).toBe(30000);
    expect(compareWithBudget(plan, [], april).lines.find((l) => l.groupId === "edu")!.budget).toBe(0);
  });

  it("งบรวมของจังหวะการใช้เงิน (R22) ใช้แผนของเดือนเดียวกัน", () => {
    expect(budgetPace(plan, pay, march, "2027-03-10").budget).toBe(20200);
  });
});
