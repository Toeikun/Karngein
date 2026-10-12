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
  const [tab, setTab] = useState<WorkspaceTab>("actual"); // หน้าแรก = รายการ (แบบแอปจดรายจ่าย)
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
          {/* มือถือ: จัดการแผนอยู่ในแท็บ "เพิ่มเติม" (หน้าแรกจะได้โล่ง) / คอมฯ: แสดงด้านบนตลอด */}
          <div className={tab === "more" ? "" : "hidden lg:block"}>
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
          </div>
          <PlanContent
            key={plan.id} // สลับแผน → โหลดรายการของแผนใหม่ทั้งหมด
            plan={plan}
            tab={tab}
            onTabChange={setTab}
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
