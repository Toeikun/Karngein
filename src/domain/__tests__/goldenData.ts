/**
 * Golden Data — ชุดข้อมูลทดสอบที่รู้คำตอบแน่นอน (PLAN.md ข้อ 9.3)
 * ชุดที่ 1 มาจากเว็บต้นแบบ, ชุดที่ 2 = ชุดที่ 1 + หมวดเงินสำรองฉุกเฉิน 2,000/เดือน
 */
import referencePlanJson from "../../../fixtures/reference-plan.json";
import type { Plan } from "@/domain/entities/Plan";

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
