"use client";

/**
 * MonthlyPlanSection — "แผนรายเดือน" ในแท็บวางแผน (Phase 13.1, R35)
 * 12 แถว = 12 เดือน: รับ / จ่าย / คงเหลือ + รายการพิเศษ (รายปีที่ครบ, ครั้งเดียว)
 * แตะเดือน → ยอดรายกลุ่มของเดือนนั้น · เดือนที่จ่ายมากกว่ารับ เตือนให้เตรียมเงิน
 */
import { useState } from "react";
import { formatBaht } from "@/domain/entities/Money";
import type { Plan } from "@/domain/entities/Plan";
import { specialItemsInMonth, yearPlan } from "@/domain/services/monthlyPlan";
import { CATEGORY_STYLES } from "../../styles/categoryStyles";
import { THAI_MONTHS } from "../../utils/periodLabel";

interface MonthlyPlanSectionProps {
  plan: Plan;
  today: string; // ใช้เลือกปีเริ่มต้น + ไฮไลต์เดือนนี้
}

export function MonthlyPlanSection({ plan, today }: MonthlyPlanSectionProps) {
  const thisYear = Number(today.slice(0, 4));
  const thisMonth = Number(today.slice(5, 7));
  const [year, setYear] = useState(thisYear);
  const [open, setOpen] = useState<number | null>(null);
  const months = yearPlan(plan, year);
  const maxExpense = Math.max(1, ...months.map((m) => m.expense));
  const arrow = "grid size-11 place-items-center rounded-full text-xl text-slate-600 hover:bg-slate-100";

  return (
    <section aria-labelledby="monthly-plan-heading" className="space-y-3 rounded-3xl bg-white p-4 shadow-sm ring-1 ring-slate-100 sm:p-5">
      <div className="flex items-center justify-between gap-2">
        <h2 id="monthly-plan-heading" className="text-lg font-semibold text-slate-800">
          แผนรายเดือน
        </h2>
        <div className="flex items-center">
          <button type="button" aria-label="ปีก่อนหน้า" className={arrow} onClick={() => setYear((y) => y - 1)}>
            ‹
          </button>
          <span role="status" aria-label="ปีของแผนรายเดือน" className="min-w-14 text-center font-semibold tabular-nums text-slate-800">
            {year}
          </span>
          <button type="button" aria-label="ปีถัดไป" className={arrow} onClick={() => setYear((y) => y + 1)}>
            ›
          </button>
        </div>
      </div>
      <p className="text-xs text-slate-500">ยอดตามเดือนจริง: รายการรายปีลงเดือนที่ครบกำหนด · รายการครั้งเดียวลงเดือนที่ระบุ · ใช้เทียบกับรายการจริงในแท็บสรุป</p>

      <ul className="divide-y divide-slate-100">
        {months.map((m) => {
          const special = specialItemsInMonth(plan, m.month);
          const isOpen = open === m.month.month;
          const current = year === thisYear && m.month.month === thisMonth;
          const label = `${THAI_MONTHS[m.month.month - 1]} ${year}`;
          return (
            <li key={m.month.month} data-testid={`month-${m.month.month}`}>
              <button
                type="button"
                aria-expanded={isOpen}
                aria-label={`แผนเดือน ${label}`}
                onClick={() => setOpen(isOpen ? null : m.month.month)}
                className={`w-full rounded-2xl px-2 py-2.5 text-left hover:bg-slate-50 ${current ? "bg-indigo-50/60" : ""}`}
              >
                <div className="flex items-baseline gap-2">
                  <span className={`w-14 shrink-0 font-semibold ${current ? "text-indigo-700" : "text-slate-800"}`}>{THAI_MONTHS[m.month.month - 1]}</span>
                  {/* มือถือ: รับ/จ่ายคนละบรรทัด (กันขึ้นบรรทัดกลางตัวเลข) · คอมฯ: บรรทัดเดียว */}
                  <span className="flex min-w-0 flex-1 flex-col text-xs text-slate-500 tabular-nums sm:flex-row sm:gap-1">
                    <span>รับ {formatBaht(m.income)}</span>
                    <span>
                      <span className="hidden sm:inline">· </span>จ่าย {formatBaht(m.expense)}
                    </span>
                  </span>
                  <span className={`shrink-0 text-sm font-semibold tabular-nums ${m.remaining < 0 ? "text-red-600" : "text-emerald-700"}`}>
                    {m.remaining < 0 ? "" : "+"}
                    {formatBaht(m.remaining)}
                  </span>
                </div>
                <div className="mt-1.5 ml-16 h-1.5 rounded-full bg-slate-100">
                  <div className={`h-full rounded-full ${m.remaining < 0 ? "bg-red-400" : "bg-indigo-400"}`} style={{ width: `${(m.expense / maxExpense) * 100}%` }} />
                </div>
                {special.length > 0 && (
                  <p className="mt-1 ml-16 text-xs text-slate-600">
                    {special.map((s) => `${s.kind === "income" ? "＋" : "−"} ${s.name} ${formatBaht(s.amount)}`).join(" · ")}
                  </p>
                )}
                {m.remaining < 0 && <p className="mt-1 ml-16 text-xs font-medium text-red-600">⚠ เดือนนี้จ่ายมากกว่ารับ — เตรียมเงินจากเดือนก่อนๆ</p>}
              </button>
              {isOpen && (
                <ul className="mb-2 ml-16 space-y-1 rounded-2xl bg-slate-50 p-3 text-sm" aria-label={`รายกลุ่ม ${label}`}>
                  {m.groups
                    .filter((g) => g.amount > 0)
                    .map((g) => (
                      <li key={g.id} className="flex items-center justify-between gap-2">
                        <span className="flex min-w-0 items-center gap-2 text-slate-700">
                          <span aria-hidden className={`size-2 shrink-0 rounded-full ${g.category ? CATEGORY_STYLES[g.category].dot : "bg-slate-400"}`} />
                          <span className="truncate">{g.name}</span>
                        </span>
                        <span className="shrink-0 tabular-nums text-slate-700">{formatBaht(g.amount)}</span>
                      </li>
                    ))}
                  {m.groups.every((g) => g.amount === 0) && <li className="text-slate-500">ไม่มีรายจ่ายในแผนเดือนนี้</li>}
                </ul>
              )}
            </li>
          );
        })}
      </ul>
      <p className="text-sm text-slate-600" role="status" aria-label="รวมทั้งปีของแผน">
        รวมปี {year}: รับ <strong className="tabular-nums">{formatBaht(months.reduce((s, m) => s + m.income, 0))}</strong> · จ่าย{" "}
        <strong className="tabular-nums">{formatBaht(months.reduce((s, m) => s + m.expense, 0))}</strong>
      </p>
    </section>
  );
}
