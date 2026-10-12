"use client";

/**
 * TransactionList — รายการจัดกลุ่มตามวัน (Domain: groupByDay)
 * แตะรายการ → เปิดแผ่นแก้ไข (ลบได้ในแผ่นนั้น)
 */
import { CATEGORIES, type CategoryId } from "@/domain/entities/Category";
import { formatBaht } from "@/domain/entities/Money";
import { addDays } from "@/domain/entities/PayCycle";
import type { Plan } from "@/domain/entities/Plan";
import type { Transaction } from "@/domain/entities/Transaction";
import { groupByDay } from "@/domain/services/dailyView";
import { CATEGORY_STYLES } from "../../styles/categoryStyles";
import { formatThaiDate } from "../../utils/periodLabel";

interface TransactionListProps {
  plan: Plan;
  transactions: Transaction[]; // เฉพาะรอบที่แสดง หรือผลการค้นหา
  today: string;
  title?: string;
  emptyMessage?: string;
  onEdit: (transaction: Transaction) => void;
}

export const CATEGORY_ICONS: Record<CategoryId, string> = {
  essential: "🧺",
  wants: "🛍️",
  investment: "📈",
  emergency: "🛟",
  reward: "🎁",
};

/** ชื่อที่ผูกในแผน: กลุ่มรายจ่าย/รายได้ > ชื่อหมวด */
function linkedName(t: Transaction, plan: Plan): string {
  if (t.type === "income") return plan.incomes.find((i) => i.id === t.planIncomeId)?.name ?? "รายรับ";
  return plan.expenses.find((g) => g.id === t.planGroupId)?.name ?? CATEGORIES.find((c) => c.id === t.category)?.label ?? "รายจ่าย";
}

/** ชื่อหลักที่แสดง: ร้าน > โน้ต > ชื่อที่ผูกในแผน */
function labelOf(t: Transaction, plan: Plan): string {
  return t.merchant ?? t.note ?? linkedName(t, plan);
}

function dayLabel(date: string, today: string): string {
  if (date === today) return "วันนี้";
  if (date === addDays(today, -1)) return "เมื่อวาน";
  return formatThaiDate(date, date.slice(0, 4) !== today.slice(0, 4));
}

export function TransactionList({ plan, transactions, today, title, emptyMessage, onEdit }: TransactionListProps) {
  const days = groupByDay(transactions);
  return (
    <section aria-labelledby="tx-heading" className="space-y-3">
      <h2 id="tx-heading" className="px-1 text-base font-semibold text-slate-800">
        {title ?? `รายการในรอบนี้ (${transactions.length})`}
      </h2>
      {days.length === 0 ? (
        <p className="rounded-3xl border border-dashed border-slate-300 bg-white/60 p-6 text-center text-sm text-slate-500">
          {emptyMessage ?? "ยังไม่มีรายการในรอบนี้ — กดปุ่ม + ด้านล่างเพื่อลงรายการแรก"}
        </p>
      ) : (
        days.map((day) => (
          <div key={day.date}>
            <div className="mb-1.5 flex items-baseline justify-between px-1 text-sm">
              <h3 className="font-semibold text-slate-700">{dayLabel(day.date, today)}</h3>
              <p className="text-xs text-slate-500 tabular-nums">
                {day.income > 0 && <span className="text-emerald-700">รับ {formatBaht(day.income)} · </span>}
                จ่าย {formatBaht(day.expense)}
              </p>
            </div>
            <ul className="divide-y divide-slate-100 overflow-hidden rounded-3xl bg-white shadow-sm ring-1 ring-slate-100">
              {day.transactions.map((t) => {
                const income = t.type === "income";
                const label = labelOf(t, plan);
                const linked = linkedName(t, plan);
                const detail = [linked !== label ? linked : null, t.merchant && t.note ? t.note : null].filter(Boolean).join(" · ");
                const tint = income ? "bg-emerald-100" : t.category ? CATEGORY_STYLES[t.category].badge : "bg-slate-100";
                return (
                  <li key={t.id} data-testid={`tx-${t.id}`}>
                    <button
                      type="button"
                      onClick={() => onEdit(t)}
                      aria-label={`แก้ไข ${label}`}
                      className="flex min-h-16 w-full items-center gap-3 px-4 py-2.5 text-left hover:bg-slate-50"
                    >
                      <span className={`grid size-10 shrink-0 place-items-center rounded-full text-lg ${tint}`} aria-hidden>
                        {income ? "💰" : t.category ? CATEGORY_ICONS[t.category] : "🧾"}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate font-medium text-slate-800">{label}</span>
                        {detail && <span className="block truncate text-xs text-slate-500">{detail}</span>}
                      </span>
                      <span className={`shrink-0 font-semibold tabular-nums ${income ? "text-emerald-700" : "text-rose-700"}`}>
                        {income ? "+" : "−"}
                        {formatBaht(t.amount)}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        ))
      )}
    </section>
  );
}
