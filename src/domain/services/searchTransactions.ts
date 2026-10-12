/**
 * searchTransactions — ค้นหา/กรองรายการจริง "คร่อมทุกรอบ" (Phase 12.1)
 *
 * ข้อความค้นหาตรงกับ: ร้าน/ผู้รับ, โน้ต, #tag, ชื่อกลุ่ม/รายได้ในแผน, ชื่อกระเป๋า (12.2) หรือจำนวนเงิน (ถ้าพิมพ์เป็นตัวเลข)
 * ผลลัพธ์เรียงจากล่าสุดก่อน
 */
import type { CategoryId } from "../entities/Category";
import type { Plan } from "../entities/Plan";
import type { Transaction, TransactionType } from "../entities/Transaction";
import { extractTags } from "./tags";

export interface TransactionQuery {
  text?: string;
  type?: TransactionType | "all";
  category?: CategoryId | "all";
}

export function isEmptyQuery(query: TransactionQuery): boolean {
  return !query.text?.trim() && (query.type ?? "all") === "all" && (query.category ?? "all") === "all";
}

export function searchTransactions(plan: Plan, transactions: Transaction[], query: TransactionQuery): Transaction[] {
  const text = (query.text ?? "").trim().toLowerCase();
  const numeric = /^[\d,.]+$/.test(text) ? Number(text.replace(/,/g, "")) : null;
  const tagQuery = text.startsWith("#") ? text.slice(1) : null;

  const matchesText = (t: Transaction) => {
    if (!text) return true;
    if (numeric !== null && !Number.isNaN(numeric)) return t.amount === numeric;
    if (tagQuery !== null) return extractTags(t.note).some((tag) => tag.startsWith(tagQuery));
    const linkedName =
      t.type === "income"
        ? plan.incomes.find((i) => i.id === t.planIncomeId)?.name
        : plan.expenses.find((g) => g.id === t.planGroupId)?.name;
    const walletNames = (plan.wallets ?? []).filter((w) => w.id === t.walletId || w.id === t.toWalletId).map((w) => w.name);
    return [t.merchant, t.note, linkedName, ...walletNames].some((field) => field?.toLowerCase().includes(text));
  };

  return transactions
    .filter((t) => (query.type ?? "all") === "all" || t.type === query.type)
    .filter((t) => (query.category ?? "all") === "all" || t.category === query.category)
    .filter(matchesText)
    .sort((a, b) => b.date.localeCompare(a.date) || b.id.localeCompare(a.id));
}
