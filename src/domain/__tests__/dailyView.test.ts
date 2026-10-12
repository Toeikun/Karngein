import { describe, expect, it } from "vitest";
import type { Plan } from "@/domain/entities/Plan";
import type { Transaction } from "@/domain/entities/Transaction";
import { budgetPace, groupByDay } from "@/domain/services/dailyView";

const plan: Plan = {
  id: "p",
  name: "แผน",
  updatedAt: "2026-10-01T00:00:00.000Z",
  incomes: [],
  expenses: [
    { id: "food", name: "อาหาร", category: "essential", items: [], amount: 9000, frequency: "monthly" },
    { id: "fun", name: "เที่ยว", category: "wants", items: [], amount: 12000, frequency: "yearly" }, // = 1,000/เดือน
  ],
};
const october = { start: "2026-10-01", end: "2026-10-31" }; // 31 วัน → งบ 10,000 ≈ 322.58/วัน

const tx = (id: string, date: string, amount: number, type: "income" | "expense" = "expense"): Transaction => ({
  id,
  date,
  amount,
  type,
  ...(type === "expense" ? { category: "essential" as const } : {}),
});

describe("R21 groupByDay — จัดกลุ่มตามวัน", () => {
  it("วันล่าสุดก่อน, ในวันเดียวกันรายการที่จดทีหลังอยู่บน, รวมยอดรับ/จ่ายของวัน", () => {
    const list = Object.freeze([tx("t1", "2026-10-02", 50), tx("t2", "2026-10-05", 80), tx("t3", "2026-10-02", 30), tx("t4", "2026-10-02", 1000, "income")].map((t) => Object.freeze(t))); // ห้ามแก้ข้อมูลเดิม
    const days = groupByDay([...list]);
    expect(days.map((d) => d.date)).toEqual(["2026-10-05", "2026-10-02"]);
    expect(days[1].transactions.map((t) => t.id)).toEqual(["t4", "t3", "t1"]);
    expect(days[1]).toMatchObject({ expense: 80, income: 1000 });
  });

  it("ไม่มีรายการ → []", () => {
    expect(groupByDay([])).toEqual([]);
  });
});

describe("R22 budgetPace — จังหวะการใช้เงินของรอบ", () => {
  it("กลางรอบ: งบรวมทุกกลุ่ม (รายปีเฉลี่ยต่อเดือน) / ควรใช้ถึงวันนี้ / ใช้ได้ต่อวัน", () => {
    const pace = budgetPace(plan, [tx("a", "2026-10-03", 4000), tx("b", "2026-10-10", 1000, "income")], october, "2026-10-10");
    expect(pace).toEqual({
      budget: 10000,
      spent: 4000,
      left: 6000,
      totalDays: 31,
      elapsedDays: 10,
      elapsedRatio: 10 / 31,
      expectedSpent: 3225.81,
      paceDelta: 774.19, // ใช้เร็วกว่าแผน
      perDayLeft: 285.71, // 6000 ÷ 21 วันที่เหลือ
    });
  });

  it("ไม่นับรายการนอกรอบ / ใช้ช้ากว่าแผน → paceDelta ติดลบ", () => {
    const pace = budgetPace(plan, [tx("a", "2026-09-30", 9999), tx("b", "2026-10-20", 1000)], october, "2026-10-20");
    expect(pace.spent).toBe(1000);
    expect(pace.paceDelta).toBeLessThan(0);
  });

  it("วันสุดท้ายของรอบ → ไม่มีวันเหลือ perDayLeft = null / ใช้เกินงบ → left ติดลบ, perDayLeft = null", () => {
    expect(budgetPace(plan, [], october, "2026-10-31")).toMatchObject({ elapsedDays: 31, elapsedRatio: 1, perDayLeft: null });
    expect(budgetPace(plan, [tx("a", "2026-10-02", 12000)], october, "2026-10-05")).toMatchObject({ left: -2000, perDayLeft: null });
  });

  it("ดูรอบในอดีต/อนาคต → ตำแหน่งวันนี้ถูกตรึงไว้ที่ปลาย/ต้นรอบ", () => {
    expect(budgetPace(plan, [], october, "2026-12-01").elapsedDays).toBe(31);
    expect(budgetPace(plan, [], october, "2026-09-01")).toMatchObject({ elapsedDays: 0, expectedSpent: 0, perDayLeft: 322.58 });
  });

  it("แผนไม่มีกลุ่มรายจ่าย → งบ 0 ไม่หารด้วยศูนย์", () => {
    expect(budgetPace({ ...plan, expenses: [] }, [], october, "2026-10-10")).toMatchObject({ budget: 0, expectedSpent: 0, perDayLeft: null });
  });
});
