"use client";

/**
 * FlowSection — ส่วนแผนภาพ Sankey "ของกลาง": แถบเครื่องมือ + กราฟ + หมายเหตุ + การ์ดสัดส่วน
 *
 * ไม่รู้ว่าข้อมูลมาจากแผนหรือรายการจริง — ผู้เรียกส่ง buildGraph (สร้างผังตามตัวเลือก) และ ratios มาให้
 *   - แท็บวางแผน:    PlanFlowSection   (flow/PlanFlowSection.tsx)
 *   - แท็บบันทึกจริง: ActualFlowSection (actual/ActualFlowSection.tsx)
 *
 * state ของส่วนนี้ (ป้าย, หมวดที่ซ่อน, กลุ่มที่ยุบ, ซูม) เป็นเรื่องการแสดงผลล้วน ไม่ได้บันทึกลงแผน
 */
import { toPng } from "html-to-image";
import { useRef, useState, type ReactNode } from "react";
import type { CategoryId } from "@/domain/entities/Category";
import type { FlowGraph, FlowOptions } from "@/domain/services/flowGraph";
import type { CategorySummary } from "@/domain/services/summarize";
import { todayIso } from "../../utils/parseAmount";
import { CategoryRatioCards } from "../ratio/CategoryRatioCards";
import { FlowToolbar } from "./FlowToolbar";
import { SankeyChart, type LabelMode } from "./SankeyChart";

export interface FlowSectionProps {
  title: string;
  caption: ReactNode; // บรรทัดบนผัง (อยู่ในรูปที่บันทึกด้วย) เช่น "แผนของฉัน · เฉลี่ยต่อเดือน"
  buildGraph: (options: FlowOptions) => FlowGraph;
  ratios: Record<CategoryId, CategorySummary>;
  emptyMessage: string;
  note?: ReactNode;
  fileTag?: string; // ใส่ในชื่อไฟล์รูป เช่น "actual"
}

/** สลับการมีอยู่ของค่าใน Set แบบไม่แก้ Set เดิม */
function toggle<T>(set: ReadonlySet<T>, value: T): Set<T> {
  const next = new Set(set);
  if (next.has(value)) next.delete(value);
  else next.add(value);
  return next;
}

export function FlowSection({ title, caption, buildGraph, ratios, emptyMessage, note, fileTag = "flow" }: FlowSectionProps) {
  const [labelMode, setLabelMode] = useState<LabelMode>("percent");
  const [hiddenCategories, setHiddenCategories] = useState<ReadonlySet<CategoryId>>(new Set());
  const [collapsedGroupIds, setCollapsedGroupIds] = useState<ReadonlySet<string>>(new Set());
  const [zoom, setZoom] = useState(1);
  const [saving, setSaving] = useState(false);
  const captureRef = useRef<HTMLDivElement>(null);

  const graph = buildGraph({ hiddenCategories, collapsedGroupIds });

  async function saveImage() {
    if (!captureRef.current) return;
    setSaving(true);
    try {
      const dataUrl = await toPng(captureRef.current, { backgroundColor: "#ffffff", pixelRatio: 2 });
      const link = document.createElement("a");
      link.download = `karngein-${fileTag}-${todayIso()}.png`;
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
        {title}
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
          {emptyMessage}
        </p>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-slate-100" data-testid="flow-scroll">
          <div ref={captureRef} className="w-max bg-white p-4">
            <p className="mb-2 text-sm text-slate-500">{caption}</p>
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
      {note}

      <CategoryRatioCards ratios={ratios} />
    </section>
  );
}
