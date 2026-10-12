"use client";

/**
 * ActualView — แท็บ "รายการ": รายการรับ/จ่ายที่เกิดขึ้นจริง แยกตามรอบเงินเดือน (Phase 11.3 + 12.1)
 * - ค้นหา/กรองคร่อมทุกรอบ (ช่องค้นหาด้านบน — ว่าง = แสดงตามรอบ)
 * - ตัวเลขทั้งหมดคำนวณใน Domain (cycleSummary / searchTransactions) — component แค่แสดงผล
 * - ข้อมูลรายการมาจาก PlanContent (ใช้ร่วมกับปุ่ม + และแท็บเป้าหมาย)
 */
import { useState } from "react";
import { setPayCycleStartDay } from "@/application/usecases/plans";
import { formatBaht } from "@/domain/entities/Money";
import { cycleContaining, daysLeftInCycle, shiftCycle } from "@/domain/entities/PayCycle";
import { payCycleStartDayOf, type Plan } from "@/domain/entities/Plan";
import type { Transaction } from "@/domain/entities/Transaction";
import { compareWithBudget, summarizeCycle, transactionsInCycle } from "@/domain/services/cycleSummary";
import { isEmptyQuery, searchTransactions, type TransactionQuery } from "@/domain/services/searchTransactions";
import type { RunUseCase } from "../../hooks/usePlan";
import type { TransactionsState } from "../../hooks/useTransactions";
import { ActualFlowSection } from "./ActualFlowSection";
import { BudgetBars } from "./BudgetBars";
import { CycleNavigator } from "./CycleNavigator";
import { CycleSummaryCards } from "./CycleSummaryCards";
import { TransactionForm } from "./TransactionForm";
import { TransactionList } from "./TransactionList";
import { TransactionSearch } from "./TransactionSearch";

interface ActualViewProps {
  plan: Plan;
  run: RunUseCase;
  today: string;
  tx: TransactionsState;
}

export function ActualView({ plan, run, today, tx }: ActualViewProps) {
  const { transactions, add, update, remove } = tx;
  const [offset, setOffset] = useState(0); // 0 = รอบปัจจุบัน, -1 = รอบก่อน, …
  const [editing, setEditing] = useState<Transaction | null>(null);
  const [query, setQuery] = useState<TransactionQuery>({ text: "", type: "all", category: "all" });

  const startDay = payCycleStartDayOf(plan);
  const cycle = shiftCycle(cycleContaining(today, startDay), startDay, offset);
  const summary = summarizeCycle(transactions, cycle);
  const searching = !isEmptyQuery(query);
  const results = searching ? searchTransactions(plan, transactions, query) : [];

  const confirmDelete = (t: Transaction) => {
    if (window.confirm(`ลบรายการ ${t.merchant ?? t.note ?? ""} ${t.amount.toLocaleString("en-US")} บาท?`)) void remove(t.id);
  };

  return (
    <div className="space-y-5">
      <TransactionSearch query={query} onChange={setQuery} />

      {searching ? (
        <>
          <p className="text-sm text-slate-600" role="status" aria-label="ผลการค้นหา">
            พบ {results.length} รายการ · รับ {formatBaht(results.filter((t) => t.type === "income").reduce((s, t) => s + t.amount, 0))} · จ่าย{" "}
            {formatBaht(results.filter((t) => t.type === "expense").reduce((s, t) => s + t.amount, 0))}
          </p>
          <TransactionList plan={plan} transactions={results} title={`ผลการค้นหา (${results.length})`} emptyMessage="ไม่พบรายการที่ตรงกับคำค้น — ลองคำอื่น หรือล้างตัวกรอง" onEdit={setEditing} onDelete={confirmDelete} />
          {editing && (
            <div className="rounded-3xl bg-white p-4 shadow-sm ring-1 ring-slate-100 sm:p-5">
              <TransactionForm
                key={editing.id}
                plan={plan}
                today={today}
                editing={editing}
                history={transactions}
                onCancelEdit={() => setEditing(null)}
                onSubmit={async (input) => {
                  const errors = await update({ ...input, id: editing.id });
                  if (errors.length === 0) setEditing(null);
                  return errors;
                }}
              />
            </div>
          )}
        </>
      ) : (
        <>
          <CycleNavigator
            cycle={cycle}
            isCurrent={offset === 0}
            startDay={startDay}
            onShift={(delta) => setOffset((o) => o + delta)}
            onToday={() => setOffset(0)}
            onStartDayChange={(day) => run((p, c) => setPayCycleStartDay(p, day, c))}
          />
          <CycleSummaryCards summary={summary} daysLeft={offset === 0 ? daysLeftInCycle(today, cycle) : null} />
          <div className="grid gap-5 lg:grid-cols-[2fr_3fr]">
            <div className="rounded-3xl bg-white p-4 shadow-sm ring-1 ring-slate-100 sm:p-5">
              <TransactionForm
                key={editing?.id ?? "new"} // เปลี่ยนรายการที่แก้ → ฟอร์มเริ่มค่าใหม่
                plan={plan}
                today={today}
                editing={editing}
                history={transactions}
                onSubmit={async (input) => {
                  if (!editing) return add(input);
                  const errors = await update({ ...input, id: editing.id });
                  if (errors.length === 0) setEditing(null);
                  return errors;
                }}
                onCancelEdit={() => setEditing(null)}
              />
            </div>
            <div className="space-y-5">
              <BudgetBars comparison={compareWithBudget(plan, transactions, cycle)} />
              <TransactionList plan={plan} transactions={transactionsInCycle(transactions, cycle)} onEdit={setEditing} onDelete={confirmDelete} />
            </div>
          </div>
          <ActualFlowSection plan={plan} transactions={transactions} cycle={cycle} summary={summary} />
        </>
      )}
    </div>
  );
}
