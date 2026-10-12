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
import { Header } from "./layout/Header";
import { PlanBar } from "./plan/PlanBar";
import { PlanContent, type WorkspaceTab } from "./PlanContent";
import { LoadingState } from "./ui/LoadingState";

interface PlanWorkspaceProps extends UsePlanOptions {
  mode: "guest" | "cloud";
  account?: ReactNode;
}

export function PlanWorkspace({ mode, account, ...options }: PlanWorkspaceProps) {
  const { plan, plans, status, loadError, transactionRepository, ctx, run, switchPlan, createNewPlan, deleteCurrentPlan, importPlanFile, exportCurrentPlan } =
    usePlan(options);
  const online = useOnlineStatus();
  const [period, setPeriod] = useState<Period>({ kind: "monthly" });
  const [tab, setTab] = useState<WorkspaceTab>("plan");
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
          <WorkspaceTabs tab={tab} onChange={setTab} />
          <PlanContent
            key={plan.id} // สลับแผน → โหลดรายการของแผนใหม่ทั้งหมด
            plan={plan}
            tab={tab}
            run={run}
            period={period}
            onPeriodChange={setPeriod}
            summary={summary}
            transactionRepository={transactionRepository}
            ctx={ctx}
          />
        </>
      )}
    </>
  );
}

function WorkspaceTabs({ tab, onChange }: { tab: WorkspaceTab; onChange: (tab: WorkspaceTab) => void }) {
  const tabs: { id: WorkspaceTab; label: string; icon: string }[] = [
    { id: "plan", label: "วางแผน", icon: "🗺️" },
    { id: "actual", label: "รายการ", icon: "🧾" },
    { id: "goals", label: "เป้าหมาย", icon: "🎯" },
  ];
  // มือถือ: แถบล่างติดจอแบบแอป (D19) / คอมฯ (lg): แท็บด้านบนเหมือนเดิม
  return (
    <nav
      role="tablist"
      aria-label="มุมมองของแผน"
      className="fixed inset-x-0 bottom-0 z-30 flex border-t border-slate-200 bg-white/95 px-2 pt-1 pb-[max(0.5rem,env(safe-area-inset-bottom))] backdrop-blur lg:static lg:rounded-2xl lg:border-0 lg:bg-slate-200/70 lg:p-1"
    >
      {tabs.map((t) => (
        <button
          key={t.id}
          type="button"
          role="tab"
          aria-selected={tab === t.id}
          onClick={() => {
            onChange(t.id);
            window.scrollTo?.({ top: 0 });
          }}
          className={`flex min-h-14 flex-1 flex-col items-center justify-center rounded-xl text-xs font-semibold transition lg:min-h-11 lg:flex-row lg:gap-1 lg:text-sm ${
            tab === t.id ? "text-indigo-700 lg:bg-white lg:shadow" : "text-slate-500"
          }`}
        >
          <span aria-hidden className="text-lg lg:text-base">
            {t.icon}
          </span>
          {t.label}
        </button>
      ))}
    </nav>
  );
}
