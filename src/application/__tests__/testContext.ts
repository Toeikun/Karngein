/**
 * context สำหรับเทสต์: id เป็นลำดับ (id-1, id-2, ...) และเวลาตายตัว → ผลลัพธ์คาดเดาได้
 */
import type { UseCaseContext } from "@/application/context";
import type { PlanResult } from "@/application/result";
import type { Plan } from "@/domain/entities/Plan";

export const FIXED_NOW = new Date("2027-03-15T09:00:00.000Z");

export function createTestContext(): UseCaseContext {
  let counter = 0;
  return { generateId: () => `id-${++counter}`, now: () => FIXED_NOW };
}

/** แช่แข็งทั้งก้อน — ถ้าโค้ดไหนแอบแก้ plan เดิม จะ throw ทันที (ใช้พิสูจน์ immutability) */
export function deepFreeze<T>(value: T): T {
  if (value && typeof value === "object") {
    Object.values(value).forEach(deepFreeze);
    Object.freeze(value);
  }
  return value;
}

/** ดึง plan ออกจาก result ที่ต้องสำเร็จ ถ้าไม่สำเร็จให้เทสต์ล้มพร้อมบอก error */
export function unwrap(result: PlanResult): Plan {
  if (!result.ok) throw new Error(`คาดว่าสำเร็จ แต่ได้ error: ${JSON.stringify(result.errors)}`);
  return result.plan;
}

export function basePlan(): Plan {
  return deepFreeze<Plan>({
    id: "plan-1",
    name: "แผนทดสอบ",
    updatedAt: "2027-01-01T00:00:00.000Z",
    incomes: [{ id: "inc-1", name: "เงินเดือน", amount: 30000, frequency: "monthly" }],
    expenses: [
      {
        id: "grp-main",
        name: "รายจ่ายหลัก",
        category: "essential",
        items: [
          { id: "itm-food", name: "ค่าอาหาร", amount: 8000, frequency: "monthly" },
          { id: "itm-travel", name: "ค่าเดินทาง", amount: 3000, frequency: "monthly" },
        ],
      },
      {
        id: "grp-trip",
        name: "ท่องเที่ยว",
        category: "reward",
        items: [],
        amount: 24000,
        frequency: "yearly",
      },
    ],
  });
}
