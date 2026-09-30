"use client";

/**
 * PlanWorkspace — หน้าทำงานหลักของแผน (ใช้ repository ที่ได้รับมา ไม่สนว่าเป็นในเครื่องหรือคลาวด์)
 * คำนวณตัวเลขด้วย summarize() จาก Domain — component ไม่มีสูตรเอง
 */
import { useState, type ReactNode } from "react";
import type { Period } from "@/domain/entities/Period";
import { summarize } from "@/domain/services/summarize";
import { useOnlineStatus } from "../hooks/useOnlineStatus";
import { usePlan, type UsePlanOptions } from "../hooks/usePlan";
import { ExpenseList } from "./expense/ExpenseList";
import { FlowSection } from "./flow/FlowSection";
import { IncomeList } from "./income/IncomeList";
import { Header } from "./layout/Header";
import { PeriodSwitcher } from "./period/PeriodSwitcher";
import { PlanBar } from "./plan/PlanBar";
import { PresetBar } from "./preset/PresetBar";
import { SummaryCards } from "./summary/SummaryCards";
import { LoadingState } from "./ui/LoadingState";

interface PlanWorkspaceProps extends UsePlanOptions {
  mode: "guest" | "cloud";
  account?: ReactNode;
}

export function PlanWorkspace({ mode, account, ...options }: PlanWorkspaceProps) {
  const { plan, plans, status, loadError, run, switchPlan, createNewPlan, deleteCurrentPlan, importPlanFile, exportCurrentPlan } =
    usePlan(options);
  const online = useOnlineStatus();
  const [period, setPeriod] = useState<Period>({ kind: "monthly" });
  const summary = plan ? summarize(plan, period) : null;

  return (
    <>
      <Header status={status} offline={mode === "cloud" && !online} account={account} />

      {loadError ? (
        <div role="alert" className="rounded-3xl bg-red-50 p-6 text-center text-red-800 ring-1 ring-red-100">
          <p className="font-semibold">โหลดแผนไม่สำเร็จ</p>
          <p className="mt-1 text-sm">{loadError}</p>
          {mode === "cloud" && <p className="mt-3 text-xs text-red-700">ออกจากระบบ (มุมขวาบน) เพื่อกลับไปใช้ข้อมูลในเครื่องได้</p>}
        </div>
      ) : !plan || !summary ? (
        <LoadingState message="กำลังโหลดแผน…" stage={mode === "cloud" ? "โหลดแผนจากคลาวด์" : "โหลดแผนในเครื่อง"} />
      ) : (
        <>
          <PlanBar
            plan={plan}
            plans={plans}
            run={run}
            storageNote={
              mode === "cloud"
                ? "ข้อมูลซิงก์กับบัญชี Google ของคุณ — เปิดจากมือถือหรือคอมฯ ก็เห็นเหมือนกัน (ออฟไลน์ก็แก้ได้ จะซิงก์เมื่อต่อเน็ต)"
                : "ข้อมูลเก็บอยู่ในเบราว์เซอร์นี้เท่านั้น — ส่งออกไฟล์สำรองไว้ก่อนล้างข้อมูลเว็บหรือเปลี่ยนเครื่อง หรือเข้าสู่ระบบเพื่อซิงก์ข้ามเครื่อง"
            }
            onSwitch={switchPlan}
            onCreate={() => createNewPlan()}
            onDelete={deleteCurrentPlan}
            onImport={importPlanFile}
            onExport={exportCurrentPlan}
          />
          <SummaryCards summary={summary} />
          <PeriodSwitcher period={period} onChange={setPeriod} />
          <PresetBar plan={plan} run={run} />
          <div className="grid gap-5 lg:grid-cols-[2fr_3fr]">
            <IncomeList incomes={plan.incomes} run={run} />
            <ExpenseList expenses={plan.expenses} period={period} run={run} />
          </div>
          <FlowSection plan={plan} period={period} summary={summary} />
        </>
      )}
    </>
  );
}
