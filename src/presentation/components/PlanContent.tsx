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

export type WorkspaceTab = "actual" | "goals" | "plan" | "more";

interface PlanContentProps {
  plan: Plan;
  tab: WorkspaceTab;
  onTabChange: (tab: WorkspaceTab) => void;
  run: RunUseCase;
  period: Period;
  onPeriodChange: (period: Period) => void;
  summary: PlanSummary;
  transactionRepository: TransactionRepository;
  ctx: UseCaseContext;
}

export function PlanContent({ plan, tab, onTabChange, run, period, onPeriodChange, summary, transactionRepository, ctx }: PlanContentProps) {
  const tx = useTransactions(transactionRepository, plan.id, ctx);
  const [quickAdd, setQuickAdd] = useState(false);
  const today = todayIso(ctx.now());

  const needsTransactions = tab === "actual" || tab === "goals";
  let body;
  if (tab === "more") {
    body = <MoreView />;
  } else if (tab === "plan") {
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
      {/* อยู่ก่อนเนื้อหา: คอมฯ = แถบแท็บด้านบน / มือถือ = fixed ติดล่างจอ (ลำดับใน DOM ไม่มีผล) */}
      <BottomNav tab={tab} onChange={onTabChange} onAdd={() => setQuickAdd(true)} addDisabled={tx.loading && needsTransactions} />
      {body}
      {quickAdd && (
        <QuickAddSheet plan={plan} today={today} history={tx.transactions} onSubmit={tx.add} onClose={() => setQuickAdd(false)} />
      )}
    </>
  );
}

const TABS: { id: WorkspaceTab; label: string; icon: string; order: string; mobileOnly?: boolean }[] = [
  { id: "actual", label: "รายการ", icon: "🧾", order: "order-1" },
  { id: "goals", label: "เป้าหมาย", icon: "🎯", order: "order-2" },
  { id: "plan", label: "วางแผน", icon: "🗺️", order: "order-4" },
  { id: "more", label: "เพิ่มเติม", icon: "⋯", order: "order-5", mobileOnly: true },
];

/**
 * แถบเมนูหลัก
 *   มือถือ: ติดล่างจอแบบแอป — แท็บ 4 อัน + ปุ่ม + ใหญ่ตรงกลาง (D19)
 *   คอมฯ (lg): แถบแท็บด้านบน + ปุ่ม "+ ลงรายการ" ท้ายแถบ (แท็บ "เพิ่มเติม" ซ่อน เพราะจัดการแผนอยู่ด้านบนแล้ว)
 * tablist ใช้ display:contents → แท็บกับปุ่ม + เรียงในแถวเดียวกันด้วย order แต่ปุ่ม + ไม่อยู่ใน tablist (ถูกหลัก a11y)
 */
function BottomNav({ tab, onChange, onAdd, addDisabled }: { tab: WorkspaceTab; onChange: (tab: WorkspaceTab) => void; onAdd: () => void; addDisabled: boolean }) {
  return (
    <nav
      aria-label="เมนูหลัก"
      className="fixed inset-x-0 bottom-0 z-30 mb-0 flex items-end border-t border-slate-200 bg-white/95 px-1 pt-1 pb-[max(0.25rem,env(safe-area-inset-bottom))] backdrop-blur lg:static lg:items-center lg:rounded-2xl lg:border-0 lg:bg-slate-200/70 lg:p-1"
    >
      <div role="tablist" aria-label="มุมมองของแผน" className="contents">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={tab === t.id}
            onClick={() => {
              onChange(t.id);
              window.scrollTo({ top: 0 });
            }}
            className={`${t.order} ${t.mobileOnly ? "lg:hidden" : ""} flex min-h-14 flex-1 flex-col items-center justify-center rounded-xl text-[11px] font-semibold transition lg:min-h-11 lg:flex-row lg:gap-1 lg:text-sm ${
              tab === t.id ? "text-indigo-700 lg:bg-white lg:shadow" : "text-slate-500"
            }`}
          >
            <span aria-hidden className={`grid h-7 w-12 place-items-center rounded-full text-lg lg:h-auto lg:w-auto lg:text-base ${tab === t.id ? "bg-indigo-100 lg:bg-transparent" : ""}`}>
              {t.icon}
            </span>
            {t.label}
          </button>
        ))}
      </div>
      <div className="order-3 flex flex-1 justify-center lg:order-last lg:flex-none">
        <button
          type="button"
          onClick={onAdd}
          disabled={addDisabled}
          aria-label="ลงรายการเร็ว"
          className="-mt-6 grid size-16 place-items-center rounded-full bg-indigo-600 text-4xl leading-none text-white shadow-lg ring-4 ring-white hover:bg-indigo-700 disabled:opacity-60 lg:mt-0 lg:flex lg:h-11 lg:w-auto lg:gap-1 lg:rounded-xl lg:px-4 lg:text-sm lg:font-semibold lg:shadow lg:ring-0"
        >
          <span aria-hidden>+</span>
          <span className="hidden lg:inline">ลงรายการ</span>
        </button>
      </div>
    </nav>
  );
}

/** แท็บ "เพิ่มเติม" (มือถือ): จัดการแผนแสดงอยู่ด้านบน (PlanWorkspace) + คำแนะนำสั้นๆ */
function MoreView() {
  return (
    <section aria-labelledby="more-heading" className="space-y-2 rounded-3xl bg-white p-4 text-sm text-slate-600 shadow-sm ring-1 ring-slate-100">
      <h2 id="more-heading" className="text-base font-semibold text-slate-800">
        เพิ่มเติม
      </h2>
      <p>สลับแผน · สร้างแผนใหม่ · นำเข้า/ส่งออกไฟล์สำรอง · ลบแผน — อยู่ในการ์ดด้านบน</p>
      <p>เข้าสู่ระบบ Google (มุมขวาบน) เพื่อซิงก์ข้อมูลระหว่างมือถือกับคอมฯ</p>
    </section>
  );
}
