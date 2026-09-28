"use client";

import { DEFAULT_YEAR, type Period } from "@/domain/entities/Period";

interface PeriodSwitcherProps {
  period: Period;
  onChange: (period: Period) => void;
}

const YEARS = [2026, 2027, 2028, 2029, 2030, 2031];

export function PeriodSwitcher({ period, onChange }: PeriodSwitcherProps) {
  const year = period.kind === "yearly" ? period.year : DEFAULT_YEAR;
  const tab = (active: boolean) =>
    `h-11 rounded-full px-4 text-sm font-medium transition ${
      active ? "bg-indigo-600 text-white shadow" : "text-slate-600 hover:bg-slate-100"
    }`;

  return (
    <div className="flex flex-wrap items-center justify-center gap-2">
      <div role="group" aria-label="มุมมองเวลา" className="flex rounded-full bg-white p-1 shadow-sm ring-1 ring-slate-100">
        <button type="button" aria-pressed={period.kind === "monthly"} className={tab(period.kind === "monthly")} onClick={() => onChange({ kind: "monthly" })}>
          ดูรายเดือน
        </button>
        <button type="button" aria-pressed={period.kind === "yearly"} className={tab(period.kind === "yearly")} onClick={() => onChange({ kind: "yearly", year })}>
          ดูรายปี
        </button>
      </div>
      {period.kind === "yearly" && (
        <select
          aria-label="เลือกปี"
          value={period.year}
          onChange={(event) => onChange({ kind: "yearly", year: Number(event.target.value) })}
          className="h-11 rounded-full border border-slate-200 bg-white px-3 text-sm"
        >
          {YEARS.map((y) => (
            <option key={y} value={y}>
              ปี {y}
            </option>
          ))}
        </select>
      )}
    </div>
  );
}
