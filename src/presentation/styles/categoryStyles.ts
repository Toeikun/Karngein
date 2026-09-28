/**
 * สีของแต่ละหมวด สำหรับ UI
 *
 * ทำไมต้องเขียน class เต็มๆ ไว้ที่นี่ แทนการต่อ string เช่น `bg-${color}-100`?
 * → Tailwind สร้าง CSS เฉพาะ class ที่ "เห็นเป็นข้อความเต็ม" ในโค้ด ถ้าต่อ string จะไม่มี CSS
 */
import type { CategoryId } from "@/domain/entities/Category";

export interface CategoryStyle {
  badge: string; // พื้นหลัง + ตัวอักษร ของป้ายหมวด
  dot: string; // จุดสี
  border: string; // เส้นขอบด้านซ้ายของกลุ่ม
  hex: string; // ใช้ใน SVG (Sankey)
}

export const CATEGORY_STYLES: Record<CategoryId, CategoryStyle> = {
  essential: { badge: "bg-sky-100 text-sky-800", dot: "bg-sky-500", border: "border-l-sky-400", hex: "#0ea5e9" },
  wants: { badge: "bg-amber-100 text-amber-800", dot: "bg-amber-500", border: "border-l-amber-400", hex: "#f59e0b" },
  investment: { badge: "bg-emerald-100 text-emerald-800", dot: "bg-emerald-500", border: "border-l-emerald-400", hex: "#10b981" },
  emergency: { badge: "bg-violet-100 text-violet-800", dot: "bg-violet-500", border: "border-l-violet-400", hex: "#8b5cf6" },
  reward: { badge: "bg-rose-100 text-rose-800", dot: "bg-rose-500", border: "border-l-rose-400", hex: "#f43f5e" },
};
