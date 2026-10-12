import { describe, expect, it } from "vitest";
import type { Plan } from "@/domain/entities/Plan";
import type { Transaction } from "@/domain/entities/Transaction";
import { burnDown, categoryBreakdown, compareWithPrevious, dailyTotals, notices, topMerchants } from "@/domain/services/cycleInsights";

/** งบรวม 3,100/เดือน (อาหาร 3,000 + เที่ยว 100) → รอบ ต.ค. 31 วัน = 100/วัน */
const plan: Plan = {
  id: "p",
  name: "แผน",
  updatedAt: "2026-10-01T00:00:00.000Z",
  incomes: [],
  expenses: [
    { id: "food", name: "อาหาร", category: "essential", items: [], amount: 3000, frequency: "monthly" },
    { id: "fun", name: "เที่ยว", category: "wants", items: [], amount: 100, frequency: "monthly" },
  ],
  wallets: [{ id: "card", name: "บัตร", kind: "credit", openingBalance: 0, statementDay: 25, dueDay: 10 }],
};
const october = { start: "2026-10-01", end: "2026-10-31" };
const september = { start: "2026-09-01", end: "2026-09-30" };

const e = (id: string, date: string, amount: number, extra: Partial<Transaction> = {}): Transaction => ({
  id,
  date,
  type: "expense",
  amount,
  category: "essential",
  planGroupId: "food",
  ...extra,
});

const tx: Transaction[] = [
  e("s1", "2026-09-02", 200, { merchant: "7-Eleven" }), // รอบก่อน (อยู่ใน 5 วันแรก)
  e("s2", "2026-09-20", 900), // รอบก่อน แต่หลังวันที่ 5 → ไม่นับในการเทียบช่วงเดียวกัน
  e("o1", "2026-10-01", 120, { merchant: "7-Eleven" }),
  e("o2", "2026-10-01", 60, { merchant: " 7-eleven " }), // ชื่อเดียวกัน (ไม่สนตัวพิมพ์/ช่องว่าง)
  e("o3", "2026-10-03", 250, { category: "wants", planGroupId: "fun", merchant: "Cinema" }),
  e("o4", "2026-10-04", 90), // ไม่มีร้าน → ใช้ชื่อกลุ่ม "อาหาร"
  e("o5", "2026-10-05", 40, { planGroupId: undefined, category: "reward" }), // ไม่ผูกกลุ่ม → ใช้ชื่อหมวด
  { id: "i1", date: "2026-10-01", type: "income", amount: 30000 },
  { id: "tr", date: "2026-10-02", type: "transfer", amount: 5000, walletId: "a", toWalletId: "b" }, // ไม่นับ (R25)
];

describe("R30 dailyTotals", () => {
  it("ครบทุกวันในรอบ (31 วัน) วันไม่มีรายการ = 0, ไม่นับการโอน", () => {
    const days = dailyTotals(tx, october);
    expect(days).toHaveLength(31);
    expect(days[0]).toEqual({ date: "2026-10-01", income: 30000, expense: 180 });
    expect(days[1]).toEqual({ date: "2026-10-02", income: 0, expense: 0 });
    expect(days[30].date).toBe("2026-10-31");
  });
});

describe("R31 categoryBreakdown / topMerchants", () => {
  it("สัดส่วนหมวดเรียงมาก→น้อย ไม่แสดงหมวด 0 / รอบไม่มีรายจ่าย → []", () => {
    expect(categoryBreakdown(tx, october)).toEqual([
      { category: "essential", amount: 270, percent: 48.2 },
      { category: "wants", amount: 250, percent: 44.6 },
      { category: "reward", amount: 40, percent: 7.1 },
    ]);
    expect(categoryBreakdown(tx, { start: "2027-01-01", end: "2027-01-31" })).toEqual([]);
    // ปัดครั้งเดียวจากค่าจริง: 240/2,840 = 8.4507% → 8.5 (ไม่ใช่ 8.45 → 8.4)
    const half = [e("a", "2026-10-01", 240), e("b", "2026-10-01", 2600, { category: "wants" })];
    expect(categoryBreakdown(half, october).map((x) => x.percent)).toEqual([91.5, 8.5]);
  });

  it("อันดับร้าน: รวมชื่อเดียวกัน, ไม่มีร้าน → ชื่อกลุ่ม → ชื่อหมวด, จำกัดจำนวน", () => {
    expect(topMerchants(plan, tx, october)).toEqual([
      { name: "Cinema", amount: 250, count: 1 },
      { name: "7-Eleven", amount: 180, count: 2 },
      { name: "อาหาร", amount: 90, count: 1 },
      { name: "ให้รางวัลตัวเอง", amount: 40, count: 1 },
    ]);
    expect(topMerchants(plan, tx, october, 2).map((m) => m.name)).toEqual(["Cinema", "7-Eleven"]);
  });
});

describe("R32 burnDown", () => {
  it("ยอดสะสมรายวันถึงวันนี้ เทียบเส้นสม่ำเสมอ (งบ 3,100 ÷ 31 = 100/วัน)", () => {
    const result = burnDown(plan, tx, october, "2026-10-04");
    expect(result.budget).toBe(3100);
    expect(result.points).toEqual([
      { date: "2026-10-01", spent: 180, ideal: 100 },
      { date: "2026-10-02", spent: 180, ideal: 200 },
      { date: "2026-10-03", spent: 430, ideal: 300 },
      { date: "2026-10-04", spent: 520, ideal: 400 },
    ]);
  });

  it("ดูรอบที่จบแล้ว → ครบทุกวัน / รอบในอนาคต → ไม่มีจุด", () => {
    expect(burnDown(plan, tx, october, "2026-12-01").points).toHaveLength(31);
    expect(burnDown(plan, tx, october, "2026-09-15").points).toEqual([]);
  });
});

describe("R33 compareWithPrevious (ช่วงเดียวกัน)", () => {
  it("วันที่ 5: เทียบ 5 วันแรกของสองรอบ → 560 vs 200 = +180%, หมวดที่เพิ่มมากสุด = ตามใจ", () => {
    expect(compareWithPrevious(tx, october, september, "2026-10-05")).toEqual({
      days: 5,
      expense: 560,
      previousExpense: 200,
      changePercent: 180,
      averagePerDay: 112,
      biggestIncrease: { category: "wants", delta: 250 },
    });
  });

  it("รอบก่อนไม่มีรายจ่าย → ไม่คำนวณ % / ไม่มีหมวดที่เพิ่ม → null", () => {
    const result = compareWithPrevious(tx, october, { start: "2026-08-01", end: "2026-08-31" }, "2026-10-05");
    expect(result.changePercent).toBeNull();
    expect(compareWithPrevious([], october, september, "2026-10-05").biggestIncrease).toBeNull();
  });

  it("รอบก่อนสั้นกว่า (ก.พ.) → ตัดที่วันสุดท้ายของรอบก่อน", () => {
    const march = { start: "2027-03-01", end: "2027-03-31" };
    const feb = { start: "2027-02-01", end: "2027-02-28" };
    const late = [e("f", "2027-02-28", 100)];
    expect(compareWithPrevious(late, march, feb, "2027-03-31").previousExpense).toBe(100);
  });
});

describe("R34 notices", () => {
  it("เรียง: บัตรเกินกำหนด › กลุ่มเกินงบ › ใช้เร็วกว่าแผน › ไม่ผูกกลุ่ม", () => {
    const card = e("c", "2026-09-30", 500, { walletId: "card", planGroupId: "food" }); // บิลปิด 25 ต.ค. ครบ 10 พ.ย.
    const result = notices(plan, [...tx, card], { start: "2026-11-01", end: "2026-11-30" }, "2026-11-12");
    expect(result.map((n) => n.kind)).toEqual(["card-overdue"]);
    expect(result[0]).toMatchObject({ walletId: "card", amount: 500, tone: "danger" });

    const october4 = notices(plan, tx, october, "2026-10-04"); // เที่ยวใช้ 250 > งบ 100, ใช้ 520 vs ควร 400 (+120 < 10% ของ 3,100 → ไม่เตือนจังหวะ)
    expect(october4.map((n) => n.kind)).toEqual(["over-budget", "unlinked"]);
    expect(october4[0]).toMatchObject({ title: "เที่ยว ใช้เกินงบ", detail: "เกิน ฿150.00" });
    expect(october4[1].title).toBe("1 รายจ่ายยังไม่ได้ผูกกลุ่ม");

    const heavy = [...tx, e("big", "2026-10-02", 1000)]; // ใช้ 1,520 vs ควร 400 → เกิน 10% ของงบ
    expect(notices(plan, heavy, october, "2026-10-04").map((n) => n.kind)).toEqual(["over-budget", "pace", "unlinked"]);
  });

  it("ไม่มีอะไรน่าห่วง → []", () => {
    expect(notices(plan, [], october, "2026-10-04")).toEqual([]);
  });
});
