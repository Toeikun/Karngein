"use client";

/**
 * FlowSection — ส่วนแผนภาพ Sankey: แถบเครื่องมือ + กราฟ + หมายเหตุ + การ์ดสัดส่วน
 * state ของส่วนนี้ (ป้าย, หมวดที่ซ่อน, กลุ่มที่ยุบ, ซูม) เป็นเรื่องการแสดงผลล้วน ไม่ได้บันทึกลงแผน
 */
import { toPng } from "html-to-image";
import { useMemo, useRef, useState } from "react";
import type { CategoryId } from "@/domain/entities/Category";
import type { Period } from "@/domain/entities/Period";
import type { Plan } from "@/domain/entities/Plan";
import { buildFlowGraph, hasOneTimeEntries } from "@/domain/services/buildFlowGraph";
import type { PlanSummary } from "@/domain/services/summarize";
import { periodLabel } from "../../utils/periodLabel";
import { todayIso } from "../../utils/parseAmount";
import { CategoryRatioCards } from "../ratio/CategoryRatioCards";
import { FlowToolbar } from "./FlowToolbar";
import { SankeyChart, type LabelMode } from "./SankeyChart";

interface FlowSectionProps {
  plan: Plan;
  period: Period;
  summary: PlanSummary;
}

/** สลับการมีอยู่ของค่าใน Set แบบไม่แก้ Set เดิม */
function toggle<T>(set: ReadonlySet<T>, value: T): Set<T> {
  const next = new Set(set);
  if (next.has(value)) next.delete(value);
  else next.add(value);
  return next;
}

export function FlowSection({ plan, period, summary }: FlowSectionProps) {
  const [labelMode, setLabelMode] = useState<LabelMode>("percent");
  const [hiddenCategories, setHiddenCategories] = useState<ReadonlySet<CategoryId>>(new Set());
  const [collapsedGroupIds, setCollapsedGroupIds] = useState<ReadonlySet<string>>(new Set());
  const [zoom, setZoom] = useState(1);
  const [saving, setSaving] = useState(false);
  const captureRef = useRef<HTMLDivElement>(null);

  const graph = useMemo(
    () => buildFlowGraph(plan, period, { hiddenCategories, collapsedGroupIds }),
    [plan, period, hiddenCategories, collapsedGroupIds],
  );

  async function saveImage() {
    if (!captureRef.current) return;
    setSaving(true);
    try {
      const dataUrl = await toPng(captureRef.current, { backgroundColor: "#ffffff", pixelRatio: 2 });
      const link = document.createElement("a");
      link.download = `karngein-flow-${todayIso()}.png`;
      link.href = dataUrl;
      link.click();
    } catch (error) {
      console.error("[Karngein] บันทึกรูปไม่สำเร็จ", error);
      alert("บันทึกรูปไม่สำเร็จ ลองใหม่อีกครั้ง");
    } finally {
      setSaving(false);
    }
  }

  return (
    <section aria-labelledby="flow-heading" className="space-y-4 rounded-3xl bg-white p-4 shadow-sm ring-1 ring-slate-100 sm:p-5">
      <h2 id="flow-heading" className="text-lg font-semibold text-slate-800">
        ผังการไหลของเงิน
      </h2>

      <FlowToolbar
        labelMode={labelMode}
        onLabelModeChange={setLabelMode}
        hiddenCategories={hiddenCategories}
        onToggleCategory={(id) => setHiddenCategories((s) => toggle(s, id))}
        zoom={zoom}
        onZoom={setZoom}
        onSaveImage={saveImage}
        saving={saving}
      />

      {graph.nodes.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-slate-200 p-10 text-center text-sm text-slate-500">
          ใส่รายได้หรือรายจ่ายก่อน แล้วแผนภาพจะปรากฏที่นี่
        </p>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-slate-100" data-testid="flow-scroll">
          <div ref={captureRef} className="w-max bg-white p-4">
            <p className="mb-2 text-sm text-slate-500">
              <strong className="text-slate-800">{plan.name}</strong> · {periodLabel(period)}
            </p>
            <SankeyChart
              graph={graph}
              labelMode={labelMode}
              zoom={zoom}
              collapsedGroupIds={collapsedGroupIds}
              onToggleGroup={(id) => setCollapsedGroupIds((s) => toggle(s, id))}
            />
          </div>
        </div>
      )}

      <p className="text-xs text-slate-500">คลิกที่กลุ่มรายจ่าย (▾) เพื่อยุบ/ขยายรายการย่อย · เลื่อนซ้าย-ขวาในกรอบได้บนมือถือ</p>
      {period.kind === "monthly" && hasOneTimeEntries(plan) && (
        <p className="rounded-xl bg-amber-50 p-3 text-sm text-amber-800">
          รายการ <strong>ครั้งเดียว</strong> ไม่ถูกนับในมุมมองรายเดือน — เลือก &quot;ดูรายปี&quot; หรือ &quot;กำหนดช่วง&quot; เพื่อดูผลของรายการเหล่านั้น
        </p>
      )}

      <CategoryRatioCards summary={summary} />
    </section>
  );
}
