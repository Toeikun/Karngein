"use client";

/**
 * PlanContent — เนื้อหาของแผนที่เปิดอยู่ (ใส่ key={plan.id} → สลับแผนแล้วเริ่มใหม่ทั้งหมด)
 *
 * เป็น "ศูนย์กลางข้อมูลรายการจริง": โหลดรายการครั้งเดียว (useTransactions) แล้วส่งให้
 *   แท็บรายการ · แท็บเป้าหมาย · ปุ่ม + ลงรายการเร็ว  → ข้อมูลชุดเดียวกัน ไม่เพี้ยนกัน
 */
import { useState } from "react";
import type { UseCaseContext } from "@/application/context";
import type { TransactionRepository } from "@/application/ports/TransactionRepository";
import type { Period } from "@/domain/entities/Period";
import type { Plan } from "@/domain/entities/Plan";
import type { PlanSummary } from "@/domain/services/summarize";
import type { RunUseCase } from "../hooks/usePlan";
import { useTransactions } from "../hooks/useTransactions";
import { todayIso } from "../utils/parseAmount";
import { ActualView } from "./actual/ActualView";
import { QuickAddSheet } from "./actual/QuickAddSheet";
import { ExpenseList } from "./expense/ExpenseList";
import { PlanFlowSection } from "./flow/PlanFlowSection";
import { GoalsView } from "./goals/GoalsView";
import { IncomeList } from "./income/IncomeList";
import { PeriodSwitcher } from "./period/PeriodSwitcher";
import { PresetBar } from "./preset/PresetBar";
import { SummaryCards } from "./summary/SummaryCards";
import { LoadingState } from "./ui/LoadingState";

export type WorkspaceTab = "plan" | "actual" | "goals";

interface PlanContentProps {
  plan: Plan;
  tab: WorkspaceTab;
  run: RunUseCase;
  period: Period;
  onPeriodChange: (period: Period) => void;
  summary: PlanSummary;
  transactionRepository: TransactionRepository;
  ctx: UseCaseContext;
}

export function PlanContent({ plan, tab, run, period, onPeriodChange, summary, transactionRepository, ctx }: PlanContentProps) {
  const tx = useTransactions(transactionRepository, plan.id, ctx);
  const [quickAdd, setQuickAdd] = useState(false);
  const today = todayIso(ctx.now());

  const needsTransactions = tab !== "plan";
  let body;
  if (tab === "plan") {
    body = (
      <>
        <SummaryCards summary={summary} />
        <PeriodSwitcher period={period} onChange={onPeriodChange} />
        <PresetBar plan={plan} run={run} />
        <div className="grid gap-5 lg:grid-cols-[2fr_3fr]">
          <IncomeList incomes={plan.incomes} run={run} />
          <ExpenseList expenses={plan.expenses} period={period} run={run} />
        </div>
        <PlanFlowSection plan={plan} period={period} summary={summary} />
      </>
    );
  } else if (tx.loading) {
    body = <LoadingState message="กำลังโหลดรายการ…" stage="โหลดรายการจริง" />;
  } else if (tx.error) {
    body = (
      <p role="alert" className="rounded-3xl bg-red-50 p-6 text-center text-red-800">
        โหลดรายการไม่สำเร็จ: {tx.error}
      </p>
    );
  } else if (tab === "actual") {
    body = <ActualView plan={plan} run={run} today={today} tx={tx} />;
  } else {
    body = <GoalsView plan={plan} run={run} today={today} tx={tx} />;
  }

  return (
    <>
      {body}
      {/* ปุ่ม + ลอย: ลงรายการเร็วได้จากทุกแท็บ */}
      <button
        type="button"
        onClick={() => setQuickAdd(true)}
        disabled={tx.loading && needsTransactions}
        aria-label="ลงรายการเร็ว"
        className="fixed bottom-24 right-4 z-40 grid size-14 place-items-center rounded-full bg-indigo-600 text-3xl text-white shadow-lg ring-4 ring-white hover:bg-indigo-700 lg:bottom-8 lg:right-8"
      >
        +
      </button>
      {quickAdd && (
        <QuickAddSheet plan={plan} today={today} history={tx.transactions} onSubmit={tx.add} onClose={() => setQuickAdd(false)} />
      )}
    </>
  );
}
