"use client";

import { CATEGORIES } from "@/domain/entities/Category";
import { formatBaht } from "@/domain/entities/Money";
import type { Plan } from "@/domain/entities/Plan";
import type { Transaction } from "@/domain/entities/Transaction";
import { CATEGORY_STYLES } from "../../styles/categoryStyles";
import { formatThaiDate } from "../../utils/periodLabel";
import { IconButton, TrashIcon } from "../ui/IconButton";

interface TransactionListProps {
  plan: Plan;
  transactions: Transaction[]; // เฉพาะรอบที่แสดง
  onEdit: (transaction: Transaction) => void;
  onDelete: (transaction: Transaction) => void;
}

/** ชื่อที่แสดง: โน้ต > ชื่อกลุ่ม/รายได้ในแผน > ชื่อหมวด */
function labelOf(t: Transaction, plan: Plan): string {
  if (t.note) return t.note;
  if (t.type === "income") return plan.incomes.find((i) => i.id === t.planIncomeId)?.name ?? "รายรับ";
  return (
    plan.expenses.find((g) => g.id === t.planGroupId)?.name ??
    CATEGORIES.find((c) => c.id === t.category)?.label ??
    "รายจ่าย"
  );
}

export function TransactionList({ plan, transactions, onEdit, onDelete }: TransactionListProps) {
  const sorted = [...transactions].sort((a, b) => b.date.localeCompare(a.date) || b.id.localeCompare(a.id));
  return (
    <section aria-labelledby="tx-heading" className="rounded-3xl bg-white p-4 shadow-sm ring-1 ring-slate-100 sm:p-5">
      <h2 id="tx-heading" className="mb-3 text-lg font-semibold text-slate-800">
        รายการในรอบนี้ ({transactions.length})
      </h2>
      {sorted.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-slate-200 p-6 text-center text-sm text-slate-500">
          ยังไม่มีรายการในรอบนี้ — ลงรายการด้านบนได้เลย
        </p>
      ) : (
        <ul className="divide-y divide-slate-100">
          {sorted.map((t) => {
            const income = t.type === "income";
            const label = labelOf(t, plan);
            return (
              <li key={t.id} className="flex items-center gap-2 py-2" data-testid={`tx-${t.id}`}>
                <span
                  className={`size-2.5 shrink-0 rounded-full ${income ? "bg-emerald-500" : t.category ? CATEGORY_STYLES[t.category].dot : "bg-slate-400"}`}
                  aria-hidden
                />
                <button type="button" onClick={() => onEdit(t)} className="min-h-11 min-w-0 flex-1 text-left" aria-label={`แก้ไข ${label}`}>
                  <p className="truncate text-slate-800">{label}</p>
                  <p className="text-xs text-slate-500">{formatThaiDate(t.date)}</p>
                </button>
                <span className={`shrink-0 font-semibold tabular-nums ${income ? "text-emerald-700" : "text-rose-700"}`}>
                  {income ? "+" : "−"}
                  {formatBaht(t.amount)}
                </span>
                <IconButton label={`ลบ ${label}`} tone="danger" onClick={() => onDelete(t)}>
                  <TrashIcon />
                </IconButton>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
