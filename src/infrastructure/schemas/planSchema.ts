/**
 * planSchema — ตรวจ "รูปร่าง" ของข้อมูลแผนที่มาจากภายนอก (localStorage, ไฟล์ JSON, คลาวด์)
 *
 * TypeScript ตรวจได้แค่ตอนเขียนโค้ด แต่ข้อมูลที่อ่านจากภายนอกอาจเสีย/ถูกแก้มือ/มาจากเวอร์ชันเก่า
 * Zod จึงตรวจซ้ำตอนรันจริง ถ้าไม่ผ่าน → ไม่นำข้อมูลนั้นมาใช้ (แอปไม่พัง)
 */
import { z } from "zod";
import type { Plan } from "@/domain/entities/Plan";
import type { Transaction } from "@/domain/entities/Transaction";

const frequencySchema = z.enum(["monthly", "yearly", "one-time"]);
const categorySchema = z.enum(["essential", "wants", "investment", "emergency", "reward"]);
const amountSchema = z.number().nonnegative();
const dateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

const moneyEntrySchema = z.object({
  id: z.string().min(1),
  name: z.string(),
  amount: amountSchema,
  frequency: frequencySchema,
  date: dateSchema.optional(),
});

const expenseGroupSchema = z.object({
  id: z.string().min(1),
  name: z.string(),
  category: categorySchema,
  items: z.array(moneyEntrySchema),
  amount: amountSchema.optional(),
  frequency: frequencySchema.optional(),
  date: dateSchema.optional(),
});

const goalSchema = z.object({
  id: z.string().min(1),
  name: z.string(),
  category: categorySchema,
  target: z.discriminatedUnion("kind", [
    z.object({ kind: z.literal("fixed"), amount: z.number().positive() }),
    z.object({ kind: z.literal("incomeMultiple"), incomeId: z.string().min(1), times: z.number().int().min(1).max(600) }),
  ]),
  startingAmount: amountSchema,
  deadline: dateSchema.optional(),
});

// ⚠️ z.object ตัด field ที่ไม่ได้ประกาศทิ้ง — เพิ่ม field ใหม่ให้ Plan เมื่อไหร่ ต้องเพิ่มที่นี่ด้วย
// ไม่งั้นข้อมูลจะหายเงียบๆ ตอนอ่านกลับ (มีเทสต์กันไว้ใน planJson.test.ts)
export const planSchema = z.object({
  id: z.string().min(1),
  name: z.string(),
  incomes: z.array(moneyEntrySchema),
  expenses: z.array(expenseGroupSchema),
  updatedAt: z.iso.datetime(),
  // Phase 11 — ไม่บังคับ (แผนเก่าไม่มี)
  payCycleStartDay: z.number().int().min(1).max(31).optional(),
  goals: z.array(goalSchema).optional(),
});

export const transactionSchema = z.object({
  id: z.string().min(1),
  date: dateSchema,
  type: z.enum(["income", "expense"]),
  amount: z.number().positive(),
  note: z.string().optional(),
  category: categorySchema.optional(),
  planGroupId: z.string().optional(),
  planIncomeId: z.string().optional(),
  goalId: z.string().optional(),
});

/** ตรวจว่าเป็น Transaction ที่ถูกต้อง — คืน Transaction หรือ null */
export function parseTransaction(value: unknown): Transaction | null {
  const result = transactionSchema.safeParse(value);
  return result.success ? (result.data as Transaction) : null;
}

/** ตรวจว่าเป็น Plan ที่ถูกต้อง — คืน Plan หรือ null */
export function parsePlan(value: unknown): Plan | null {
  const result = planSchema.safeParse(value);
  return result.success ? (result.data as Plan) : null;
}
