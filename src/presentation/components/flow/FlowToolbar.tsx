"use client";

import { CATEGORIES, type CategoryId } from "@/domain/entities/Category";
import { CATEGORY_STYLES } from "../../styles/categoryStyles";
import type { LabelMode } from "./SankeyChart";

interface FlowToolbarProps {
  labelMode: LabelMode;
  onLabelModeChange: (mode: LabelMode) => void;
  hiddenCategories: ReadonlySet<CategoryId>;
  onToggleCategory: (id: CategoryId) => void;
  zoom: number;
  onZoom: (zoom: number) => void;
  onSaveImage: () => void;
  saving: boolean;
}

const LABEL_MODES: { value: LabelMode; label: string }[] = [
  { value: "percent", label: "เปอร์เซ็นต์" },
  { value: "amount", label: "ตัวเลข (฿)" },
  { value: "none", label: "ไม่แสดง" },
];

export const MIN_ZOOM = 0.5;
export const MAX_ZOOM = 2;
const clampZoom = (z: number) => Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, Math.round(z * 100) / 100));

export function FlowToolbar(props: FlowToolbarProps) {
  const { labelMode, onLabelModeChange, hiddenCategories, onToggleCategory, zoom, onZoom, onSaveImage, saving } = props;
  const small = "h-11 min-w-11 rounded-xl px-3 text-sm transition";

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div role="group" aria-label="ป้ายในแผนภาพ" className="flex rounded-xl bg-slate-100 p-1">
          {LABEL_MODES.map((mode) => (
            <button
              key={mode.value}
              type="button"
              aria-pressed={labelMode === mode.value}
              onClick={() => onLabelModeChange(mode.value)}
              className={`h-11 rounded-lg px-3 text-sm ${labelMode === mode.value ? "bg-white font-medium text-slate-900 shadow-sm" : "text-slate-500"}`}
            >
              {mode.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-1">
          <button type="button" aria-label="ซูมออก" className={`${small} bg-slate-100 hover:bg-slate-200`} onClick={() => onZoom(clampZoom(zoom - 0.25))} disabled={zoom <= MIN_ZOOM}>
            −
          </button>
          <button type="button" aria-label="รีเซ็ตซูม" className={`${small} tabular-nums text-slate-600 hover:bg-slate-100`} onClick={() => onZoom(1)}>
            {Math.round(zoom * 100)}%
          </button>
          <button type="button" aria-label="ซูมเข้า" className={`${small} bg-slate-100 hover:bg-slate-200`} onClick={() => onZoom(clampZoom(zoom + 0.25))} disabled={zoom >= MAX_ZOOM}>
            +
          </button>
          <button type="button" className={`${small} ml-1 bg-indigo-600 font-medium text-white hover:bg-indigo-700 disabled:opacity-60`} onClick={onSaveImage} disabled={saving}>
            {saving ? "กำลังบันทึก…" : "บันทึกรูป"}
          </button>
        </div>
      </div>

      <div role="group" aria-label="แสดงหมวด" className="flex flex-wrap gap-2">
        {CATEGORIES.map((category) => {
          const visible = !hiddenCategories.has(category.id);
          return (
            <button
              key={category.id}
              type="button"
              aria-pressed={visible}
              onClick={() => onToggleCategory(category.id)}
              className={`flex h-11 items-center gap-2 rounded-full px-3 text-sm transition ${
                visible ? CATEGORY_STYLES[category.id].badge : "bg-slate-100 text-slate-400 line-through"
              }`}
            >
              <span className={`size-2.5 rounded-full ${visible ? CATEGORY_STYLES[category.id].dot : "bg-slate-300"}`} aria-hidden />
              {category.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
