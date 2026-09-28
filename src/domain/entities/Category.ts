/**
 * Category — หมวดรายจ่าย 5 หมวด (PLAN.md ข้อ 8.2)
 *
 * `color` คือชื่อสีของ Tailwind เช่น "sky" → ชั้น UI นำไปต่อเป็น class เอง
 * Domain ไม่รู้จัก Tailwind จริงๆ แค่เก็บ "ชื่อสี" ไว้เป็นข้อมูล
 */
export type CategoryId = "essential" | "wants" | "investment" | "emergency" | "reward";

export interface Category {
  id: CategoryId;
  label: string;
  color: string;
}

/** เรียงตามลำดับที่ใช้แสดงผลและใน "จัดระเบียบ" */
export const CATEGORIES: readonly Category[] = [
  { id: "essential", label: "รายจ่ายจำเป็น", color: "sky" },
  { id: "wants", label: "ฟุ่มเฟือย/ตามใจ", color: "amber" },
  { id: "investment", label: "เงินออม/ลงทุน", color: "emerald" },
  { id: "emergency", label: "เงินสำรองฉุกเฉิน", color: "violet" },
  { id: "reward", label: "ให้รางวัลตัวเอง", color: "rose" },
];

/** หมวดที่นับเป็น "เงินออม" ในการ์ด ออม/ลงทุน — กฎ R8 */
export const SAVING_CATEGORY_IDS: readonly CategoryId[] = ["investment", "emergency"];

export function isCategoryId(value: unknown): value is CategoryId {
  return CATEGORIES.some((category) => category.id === value);
}

export function getCategory(id: CategoryId): Category {
  const category = CATEGORIES.find((c) => c.id === id);
  if (!category) throw new Error(`ไม่รู้จักหมวด: ${id}`);
  return category;
}

/** ลำดับของหมวด (0 = แรกสุด) ใช้สำหรับเรียงรายการ */
export function categoryOrder(id: CategoryId): number {
  return CATEGORIES.findIndex((c) => c.id === id);
}
