"use client";

/** ผังการไหลของเงินของ "แผน" (แท็บวางแผน) — ใช้ FlowSection ของกลาง */
import type { Period } from "@/domain/entities/Period";
import type { Plan } from "@/domain/entities/Plan";
import { buildFlowGraph, hasOneTimeEntries } from "@/domain/services/buildFlowGraph";
import type { PlanSummary } from "@/domain/services/summarize";
import { periodLabel } from "../../utils/periodLabel";
import { FlowSection } from "./FlowSection";

export function PlanFlowSection({ plan, period, summary }: { plan: Plan; period: Period; summary: PlanSummary }) {
  return (
    <FlowSection
      title="ผังการไหลของเงิน"
      caption={
        <>
          <strong className="text-slate-800">{plan.name}</strong> · {periodLabel(period)}
        </>
      }
      buildGraph={(options) => buildFlowGraph(plan, period, options)}
      ratios={summary.byCategory}
      emptyMessage="ใส่รายได้หรือรายจ่ายก่อน แล้วแผนภาพจะปรากฏที่นี่"
      note={
        period.kind === "monthly" &&
        hasOneTimeEntries(plan) && (
          <p className="rounded-xl bg-amber-50 p-3 text-sm text-amber-800">
            รายการ <strong>ครั้งเดียว</strong> ไม่ถูกนับในมุมมองรายเดือน — เลือก &quot;ดูรายปี&quot; หรือ &quot;กำหนดช่วง&quot; เพื่อดูผลของรายการเหล่านั้น
          </p>
        )
      }
    />
  );
}
