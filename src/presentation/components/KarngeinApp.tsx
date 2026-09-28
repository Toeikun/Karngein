"use client";

/**
 * KarngeinApp — ประกอบทุกส่วนของหน้าหลักเข้าด้วยกัน
 * คำนวณตัวเลขด้วย summarize() จาก Domain — component ไม่มีสูตรเอง
 */
import { useState } from "react";
import type { Period } from "@/domain/entities/Period";
import { summarize } from "@/domain/services/summarize";
import { usePlan, type UsePlanOptions } from "../hooks/usePlan";
import { ExpenseList } from "./expense/ExpenseList";
import { IncomeList } from "./income/IncomeList";
import { Header } from "./layout/Header";
import { PeriodSwitcher } from "./period/PeriodSwitcher";
import { SummaryCards } from "./summary/SummaryCards";

export function KarngeinApp(options: UsePlanOptions = {}) {
  const { plan, status, run } = usePlan(options);
  const [period, setPeriod] = useState<Period>({ kind: "monthly" });

  return (
    <div className="mx-auto w-full max-w-6xl space-y-5 px-4 py-5 sm:py-8">
      <Header status={status} />

      {!plan ? (
        <p className="py-20 text-center text-slate-500">กำลังโหลดแผน…</p>
      ) : (
        <>
          <SummaryCards summary={summarize(plan, period)} />
          <PeriodSwitcher period={period} onChange={setPeriod} />
          <div className="grid gap-5 lg:grid-cols-[2fr_3fr]">
            <IncomeList incomes={plan.incomes} run={run} />
            <ExpenseList expenses={plan.expenses} period={period} run={run} />
          </div>
        </>
      )}
    </div>
  );
}
