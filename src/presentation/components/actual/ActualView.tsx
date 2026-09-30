"use client";

/**
 * ActualView — แท็บ "บันทึกจริง": รายการรับ/จ่ายที่เกิดขึ้นจริง แยกตามรอบเงินเดือน (Phase 11.3)
 * ตัวเลขทั้งหมดคำนวณใน Domain (cycleSummary) — component แค่แสดงผล
 */
import { useState } from "react";
import type { UseCaseContext } from "@/application/context";
import type { TransactionRepository } from "@/application/ports/TransactionRepository";
import { setPayCycleStartDay } from "@/application/usecases/plans";
import { cycleContaining, daysLeftInCycle, shiftCycle } from "@/domain/entities/PayCycle";
import { payCycleStartDayOf, type Plan } from "@/domain/entities/Plan";
import type { Transaction } from "@/domain/entities/Transaction";
import { compareWithBudget, summarizeCycle, transactionsInCycle } from "@/domain/services/cycleSummary";
import type { RunUseCase } from "../../hooks/usePlan";
import { useTransactions } from "../../hooks/useTransactions";
import { todayIso } from "../../utils/parseAmount";
import { LoadingState } from "../ui/LoadingState";
import { ActualFlowSection } from "./ActualFlowSection";
import { BudgetBars } from "./BudgetBars";
import { CycleNavigator } from "./CycleNavigator";
import { CycleSummaryCards } from "./CycleSummaryCards";
import { TransactionForm } from "./TransactionForm";
import { TransactionList } from "./TransactionList";

interface ActualViewProps {
  plan: Plan;
  run: RunUseCase;
  repository: TransactionRepository;
  ctx: UseCaseContext;
}

export function ActualView({ plan, run, repository, ctx }: ActualViewProps) {
  const { transactions, loading, error, add, update, remove } = useTransactions(repository, plan.id, ctx);
  const [offset, setOffset] = useState(0); // 0 = รอบปัจจุบัน, -1 = รอบก่อน, …
  const [editing, setEditing] = useState<Transaction | null>(null);

  const today = todayIso(ctx.now());
  const startDay = payCycleStartDayOf(plan);
  const cycle = shiftCycle(cycleContaining(today, startDay), startDay, offset);
  const summary = summarizeCycle(transactions, cycle);

  if (loading) return <LoadingState message="กำลังโหลดรายการ…" stage="โหลดรายการจริง" />;
  if (error) {
    return (
      <p role="alert" className="rounded-3xl bg-red-50 p-6 text-center text-red-800">
        โหลดรายการไม่สำเร็จ: {error}
      </p>
    );
  }

  return (
    <div className="space-y-5">
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
        <TransactionForm
          key={editing?.id ?? "new"} // เปลี่ยนรายการที่แก้ → ฟอร์มเริ่มค่าใหม่
          plan={plan}
          today={today}
          editing={editing}
          onSubmit={async (input) => {
            if (!editing) return add(input);
            const errors = await update({ ...input, id: editing.id });
            if (errors.length === 0) setEditing(null);
            return errors;
          }}
          onCancelEdit={() => setEditing(null)}
        />
        <div className="space-y-5">
          <BudgetBars comparison={compareWithBudget(plan, transactions, cycle)} />
          <TransactionList
            plan={plan}
            transactions={transactionsInCycle(transactions, cycle)}
            onEdit={setEditing}
            onDelete={(t) => {
              if (window.confirm(`ลบรายการ ${t.note ?? ""} ${t.amount.toLocaleString("en-US")} บาท?`)) void remove(t.id);
            }}
          />
        </div>
      </div>
      <ActualFlowSection plan={plan} transactions={transactions} cycle={cycle} summary={summary} />
    </div>
  );
}
