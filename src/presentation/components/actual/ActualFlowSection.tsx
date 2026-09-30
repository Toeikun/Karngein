"use client";

/** ผังการไหลของเงินจาก "รายการจริง" ในรอบเงินเดือน (แท็บบันทึกจริง) — ใช้ FlowSection ของกลาง */
import type { PayCycle } from "@/domain/entities/PayCycle";
import type { Plan } from "@/domain/entities/Plan";
import type { Transaction } from "@/domain/entities/Transaction";
import { buildActualFlowGraph } from "@/domain/services/actualFlowGraph";
import { cycleCategoryRatios, type CycleSummary } from "@/domain/services/cycleSummary";
import { cycleLabel } from "../../utils/periodLabel";
import { FlowSection } from "../flow/FlowSection";

interface ActualFlowSectionProps {
  plan: Plan;
  transactions: Transaction[];
  cycle: PayCycle;
  summary: CycleSummary;
}

export function ActualFlowSection({ plan, transactions, cycle, summary }: ActualFlowSectionProps) {
  return (
    <FlowSection
      title="ผังการไหลของเงิน (ตามจริง)"
      caption={
        <>
          <strong className="text-slate-800">{plan.name}</strong> · รอบ {cycleLabel(cycle)} · ตามจริง
        </>
      }
      buildGraph={(options) => buildActualFlowGraph(plan, transactions, cycle, options)}
      ratios={cycleCategoryRatios(summary)}
      emptyMessage="ลงรายการของรอบนี้แล้วผังจะปรากฏที่นี่"
      fileTag="actual"
      note={
        summary.income === 0 &&
        summary.expense > 0 && (
          <p className="rounded-xl bg-amber-50 p-3 text-sm text-amber-800">
            รอบนี้ยังไม่มีรายรับ — ผังแสดงรายจ่ายทั้งหมดเป็น &quot;เงินขาด&quot; และ % เทียบรายรับเป็น 0
          </p>
        )
      }
    />
  );
}
