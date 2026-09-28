/**
 * planSchema — ตรวจ "รูปร่าง" ของข้อมูลแผนที่มาจากภายนอก (localStorage, ไฟล์ JSON, คลาวด์)
 *
 * TypeScript ตรวจได้แค่ตอนเขียนโค้ด แต่ข้อมูลที่อ่านจากภายนอกอาจเสีย/ถูกแก้มือ/มาจากเวอร์ชันเก่า
 * Zod จึงตรวจซ้ำตอนรันจริง ถ้าไม่ผ่าน → ไม่นำข้อมูลนั้นมาใช้ (แอปไม่พัง)
 */
import { z } from "zod";
import type { Plan } from "@/domain/entities/Plan";

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

export const planSchema = z.object({
  id: z.string().min(1),
  name: z.string(),
  incomes: z.array(moneyEntrySchema),
  expenses: z.array(expenseGroupSchema),
  updatedAt: z.iso.datetime(),
});

/** ตรวจว่าเป็น Plan ที่ถูกต้อง — คืน Plan หรือ null */
export function parsePlan(value: unknown): Plan | null {
  const result = planSchema.safeParse(value);
  return result.success ? (result.data as Plan) : null;
}
