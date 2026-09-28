"use client";

import { PRESETS, type PresetId } from "@/application/presets/presets";
import { applyPreset } from "@/application/usecases/presets";
import type { Plan } from "@/domain/entities/Plan";
import type { RunUseCase } from "../../hooks/usePlan";

interface PresetBarProps {
  plan: Plan;
  run: RunUseCase;
}

export function PresetBar({ plan, run }: PresetBarProps) {
  function apply(id: PresetId, label: string) {
    const hasData = plan.incomes.length > 0 || plan.expenses.length > 0;
    if (hasData && !window.confirm(`แทนที่รายได้และรายจ่ายทั้งหมดในแผน "${plan.name}" ด้วยแม่แบบ "${label}"?`)) return;
    run((p, ctx) => applyPreset(p, id, ctx));
  }

  return (
    <div role="group" aria-label="แม่แบบตั้งต้น" className="flex flex-wrap items-center justify-center gap-2">
      <span className="text-sm text-slate-500">แม่แบบ:</span>
      {PRESETS.map((preset) => (
        <button
          key={preset.id}
          type="button"
          onClick={() => apply(preset.id, preset.label)}
          className="h-11 rounded-full bg-white px-4 text-sm text-slate-700 shadow-sm ring-1 ring-slate-200 hover:bg-indigo-50 hover:text-indigo-700"
        >
          {preset.label}
        </button>
      ))}
    </div>
  );
}
