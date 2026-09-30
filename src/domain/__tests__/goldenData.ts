/**
 * Golden Data — ชุดข้อมูลทดสอบที่รู้คำตอบแน่นอน (PLAN.md ข้อ 9.3)
 * ชุดที่ 1 มาจากเว็บต้นแบบ, ชุดที่ 2 = ชุดที่ 1 + หมวดเงินสำรองฉุกเฉิน 2,000/เดือน
 */
import referencePlanJson from "../../../fixtures/reference-plan.json";
import type { Plan } from "@/domain/entities/Plan";
import type { Transaction } from "@/domain/entities/Transaction";

// JSON ถูกอ่านเป็น string ธรรมดา จึงต้องบอก TypeScript ว่าเป็น Plan
// (Domain ใช้ Zod ไม่ได้ จึง cast ไว้ — ส่วน planJson.test.ts พิสูจน์แล้วว่า fixture ผ่าน schema)
export const goldenPlan1 = referencePlanJson as Plan;

export const goldenPlan2: Plan = {
  ...goldenPlan1,
  id: "reference-2",
  expenses: [
    ...goldenPlan1.expenses,
    {
      id: "exp-emergency",
      name: "เงินสำรองฉุกเฉิน",
      category: "emergency",
      items: [],
      amount: 2000,
      frequency: "monthly",
    },
  ],
};

/**
 * Golden Data ชุดที่ 3 (Phase 11) — สถานการณ์ของเจ้าของโปรเจกต์ (ตัวเลขสมมติ)
 * เงินเดือนออกวันที่ 25, เงินเดือน 44,100, เป้าเงินออมฉุกเฉิน = เงินเดือน × 12, เงินตั้งต้น 50,000
 */
export const goldenPlan3: Plan = {
  id: "golden-3",
  name: "รอบเงินเดือน 25",
  updatedAt: "2026-09-25T00:00:00.000Z",
  payCycleStartDay: 25,
  incomes: [{ id: "inc-salary", name: "เงินเดือน", amount: 44100, frequency: "monthly" }],
  expenses: [
    { id: "grp-food", name: "ค่าอาหาร", category: "essential", items: [], amount: 8000, frequency: "monthly" },
    { id: "grp-fun", name: "สังสรรค์", category: "wants", items: [], amount: 2000, frequency: "monthly" },
    { id: "grp-emergency", name: "ออมฉุกเฉิน", category: "emergency", items: [], amount: 5000, frequency: "monthly" },
  ],
  goals: [
    {
      id: "goal-emergency",
      name: "เป้าหมายเงินออมฉุกเฉิน",
      category: "emergency",
      target: { kind: "incomeMultiple", incomeId: "inc-salary", times: 12 },
      startingAmount: 50000,
    },
  ],
};

export const goldenTransactions3: Transaction[] = [
  { id: "t1", date: "2026-09-25", type: "income", amount: 44100, planIncomeId: "inc-salary", note: "เงินเดือน ก.ย." },
  { id: "t2", date: "2026-09-26", type: "expense", amount: 250, category: "essential", planGroupId: "grp-food" },
  { id: "t3", date: "2026-10-01", type: "expense", amount: 5000, category: "emergency", planGroupId: "grp-emergency", goalId: "goal-emergency" },
  { id: "t4", date: "2026-10-10", type: "expense", amount: 2500, category: "wants", planGroupId: "grp-fun" },
  { id: "t5", date: "2026-10-20", type: "expense", amount: 120, category: "essential" }, // ไม่ผูกกลุ่ม
  { id: "t6", date: "2026-10-24", type: "expense", amount: 300, category: "essential", planGroupId: "grp-food" },
  { id: "t7", date: "2026-10-25", type: "income", amount: 44100, planIncomeId: "inc-salary", note: "เงินเดือน ต.ค." },
];
