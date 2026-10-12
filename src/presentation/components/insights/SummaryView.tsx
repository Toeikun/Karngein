"use client";

/**
 * SummaryView — แท็บ "สรุป" (Phase 12.3): ดูทีละรอบเงินเดือน
 *   ข้อสังเกตเทียบรอบก่อน → งบ (burn-down + เทียบงบรายกลุ่ม) → ปฏิทินรายวัน → สัดส่วนหมวด → อันดับร้าน → Sankey ตามจริง
 * ตัวเลขทั้งหมดมาจาก Domain (cycleInsights / cycleSummary) — component แค่จัดวาง
 */
import { useState, type ReactNode } from "react";
import { cycleContaining, shiftCycle } from "@/domain/entities/PayCycle";
import { payCycleStartDayOf, type Plan } from "@/domain/entities/Plan";
import type { Transaction } from "@/domain/entities/Transaction";
import { burnDown, categoryBreakdown, compareWithPrevious, dailyTotals, topMerchants } from "@/domain/services/cycleInsights";
import { compareWithBudget, summarizeCycle, transactionsInCycle } from "@/domain/services/cycleSummary";
import type { TransactionsState } from "../../hooks/useTransactions";
import { cycleLabel, formatThaiDate } from "../../utils/periodLabel";
import { ActualFlowSection } from "../actual/ActualFlowSection";
import { BudgetBars } from "../actual/BudgetBars";
import { QuickAddSheet } from "../actual/QuickAddSheet";
import { TransactionList } from "../actual/TransactionList";
import { BurnDownChart } from "./BurnDownChart";
import { CategoryShareBars } from "./CategoryShareBars";
import { ComparisonCard } from "./ComparisonCard";
import { DayCalendar } from "./DayCalendar";
import { TopMerchants } from "./TopMerchants";

interface SummaryViewProps {
  plan: Plan;
  today: string;
  tx: TransactionsState;
}

function Card({ title, children, className = "" }: { title: string; children: ReactNode; className?: string }) {
  return (
    <section aria-label={title} className={`space-y-3 rounded-3xl bg-white p-4 shadow-sm ring-1 ring-slate-100 sm:p-5 ${className}`}>
      <h2 className="text-base font-semibold text-slate-800">{title}</h2>
      {children}
    </section>
  );
}

export function SummaryView({ plan, today, tx }: SummaryViewProps) {
  const { transactions, update, remove } = tx;
  const [offset, setOffset] = useState(0);
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const [editing, setEditing] = useState<Transaction | null>(null);

  const startDay = payCycleStartDayOf(plan);
  const current = cycleContaining(today, startDay);
  const cycle = shiftCycle(current, startDay, offset);
  const previous = shiftCycle(cycle, startDay, -1);
  const summary = summarizeCycle(transactions, cycle);
  const burn = burnDown(plan, transactions, cycle, today);
  const dayItems = selectedDay ? transactionsInCycle(transactions, { start: selectedDay, end: selectedDay }) : [];

  const shift = (delta: number) => {
    setOffset((o) => o + delta);
    setSelectedDay(null);
  };
  const arrow = "grid size-11 shrink-0 place-items-center rounded-full text-xl text-slate-600 hover:bg-slate-100 disabled:opacity-30";

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-1 rounded-3xl bg-white p-2 shadow-sm ring-1 ring-slate-100">
        <button type="button" aria-label="รอบก่อนหน้า" className={arrow} onClick={() => shift(-1)}>
          ‹
        </button>
        <div className="min-w-0 flex-1 text-center">
          <p role="status" aria-label="รอบที่สรุป" className="font-semibold text-slate-800">
            {cycleLabel(cycle)}
          </p>
          <p className="text-xs text-slate-500">
            {offset === 0 ? "รอบปัจจุบัน" : "รอบเงินเดือน"} · {summary.count} รายการ
          </p>
        </div>
        <button type="button" aria-label="รอบถัดไป" className={arrow} disabled={offset >= 0} onClick={() => shift(1)}>
          ›
        </button>
      </div>

      <div className="grid gap-5 lg:grid-cols-2 lg:items-start">
        <div className="space-y-5">
          {summary.count > 0 && (
            <Card title="ข้อสังเกต">
              <ComparisonCard data={compareWithPrevious(transactions, cycle, previous, today)} />
            </Card>
          )}
          <Card title="จะเอาอยู่ไหม?">
            {burn.budget > 0 && burn.points.length > 0 ? (
              <BurnDownChart data={burn} />
            ) : (
              <p className="text-sm text-slate-500">
                {burn.budget > 0 ? "รอบนี้ยังไม่เริ่ม" : 'ยังไม่มีงบ — เพิ่มกลุ่มรายจ่ายที่แท็บ "วางแผน" แล้วกราฟจะเทียบให้ว่าใช้เร็วกว่าแผนไหม'}
              </p>
            )}
          </Card>
          <BudgetBars comparison={compareWithBudget(plan, transactions, cycle)} />
        </div>

        <div className="space-y-5">
          <Card title="ปฏิทิน">
            <DayCalendar days={dailyTotals(transactions, cycle)} today={today} selected={selectedDay} onSelect={setSelectedDay} />
            {selectedDay && (
              <TransactionList
                plan={plan}
                transactions={dayItems}
                today={today}
                title={`รายการวันที่ ${formatThaiDate(selectedDay)} (${dayItems.length})`}
                emptyMessage="วันนี้ไม่มีรายการ"
                onEdit={setEditing}
              />
            )}
          </Card>
          <Card title="ใช้ไปกับอะไร">
            <CategoryShareBars shares={categoryBreakdown(transactions, cycle)} />
          </Card>
          <Card title="จ่ายที่ไหนมากสุด">
            <TopMerchants ranks={topMerchants(plan, transactions, cycle)} />
          </Card>
        </div>
      </div>

      <ActualFlowSection plan={plan} transactions={transactions} cycle={cycle} summary={summary} />

      {editing && (
        <QuickAddSheet
          plan={plan}
          today={today}
          history={transactions}
          editing={editing}
          onSubmit={(input) => update({ ...input, id: editing.id })}
          onDelete={(t) => {
            if (window.confirm(`ลบรายการ ${t.merchant ?? t.note ?? ""} ${t.amount.toLocaleString("en-US")} บาท?`)) {
              void remove(t.id);
              setEditing(null);
            }
          }}
          onClose={() => setEditing(null)}
        />
      )}
    </div>
  );
}
