/**
 * guessCategory — เดากลุ่ม/หมวดของรายจ่ายจากที่เคยจด (Phase 12.1)
 *
 * เรียนรู้จากประวัติรายการ (ไม่มีข้อมูลแยก) → แก้รายการเมื่อไหร่ ครั้งหน้าก็เดาตามที่แก้เอง
 * ลำดับการเดา (เจอชั้นไหนก่อนใช้ชั้นนั้น — รายการล่าสุดชนะ):
 *   1. ร้าน/ผู้รับ ตรงกับที่เคยจด
 *   2. โน้ต (ไม่รวม #tag) ตรงกับที่เคยจด
 *   3. มี #tag เดียวกับที่เคยจด
 *   4. ข้อความมีชื่อกลุ่มรายจ่ายในแผน เช่น "ค่าอาหารเย็น" → กลุ่ม "ค่าอาหาร"
 */
import type { CategoryId } from "../entities/Category";
import type { Plan } from "../entities/Plan";
import type { Transaction } from "../entities/Transaction";
import { extractTags, stripTags } from "./tags";

export type GuessSource = "merchant" | "note" | "tag" | "groupName";

export interface CategoryGuess {
  category: CategoryId;
  planGroupId?: string;
  source: GuessSource;
}

const norm = (text: string | undefined) => (text ?? "").trim().toLowerCase();

export function guessCategory(
  plan: Plan,
  history: Transaction[],
  input: { merchant?: string; note?: string },
): CategoryGuess | null {
  const expenses = history
    .filter((t) => t.type === "expense" && t.category)
    .sort((a, b) => b.date.localeCompare(a.date)); // ล่าสุดก่อน
  const groupIds = new Set(plan.expenses.map((g) => g.id));
  const fromTransaction = (t: Transaction, source: GuessSource): CategoryGuess => ({
    category: t.category!,
    ...(t.planGroupId && groupIds.has(t.planGroupId) ? { planGroupId: t.planGroupId } : {}),
    source,
  });

  const merchant = norm(input.merchant);
  if (merchant) {
    const match = expenses.find((t) => norm(t.merchant) === merchant);
    if (match) return fromTransaction(match, "merchant");
  }

  const note = norm(stripTags(input.note));
  if (note) {
    const match = expenses.find((t) => norm(stripTags(t.note)) === note);
    if (match) return fromTransaction(match, "note");
  }

  const tags = extractTags(input.note);
  if (tags.length > 0) {
    const match = expenses.find((t) => extractTags(t.note).some((tag) => tags.includes(tag)));
    if (match) return fromTransaction(match, "tag");
  }

  const text = `${merchant} ${note}`;
  if (text.trim()) {
    const group = [...plan.expenses]
      .sort((a, b) => b.name.length - a.name.length) // ชื่อยาวกว่าเจาะจงกว่า
      .find((g) => g.name.trim() && text.includes(norm(g.name)));
    if (group) return { category: group.category, planGroupId: group.id, source: "groupName" };
  }
  return null;
}
