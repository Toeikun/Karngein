"use client";

import { useState } from "react";
import { DEFAULT_YEAR, isValidRange, type Period, type YearMonth } from "@/domain/entities/Period";
import { THAI_MONTHS } from "../../utils/periodLabel";

interface PeriodSwitcherProps {
  period: Period;
  onChange: (period: Period) => void;
}

const YEARS = [2026, 2027, 2028, 2029, 2030, 2031];
const DEFAULT_RANGE = { from: { year: DEFAULT_YEAR, month: 1 }, to: { year: DEFAULT_YEAR, month: 3 } };
const selectClass = "h-11 rounded-xl border border-slate-200 bg-white px-2 text-sm outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100";

function MonthYearPicker({ label, value, onChange }: { label: string; value: YearMonth; onChange: (v: YearMonth) => void }) {
  return (
    <div className="flex items-center gap-1">
      <select aria-label={`เดือน${label}`} value={value.month} onChange={(e) => onChange({ ...value, month: Number(e.target.value) })} className={selectClass}>
        {THAI_MONTHS.map((name, index) => (
          <option key={name} value={index + 1}>
            {name}
          </option>
        ))}
      </select>
      <select aria-label={`ปี${label}`} value={value.year} onChange={(e) => onChange({ ...value, year: Number(e.target.value) })} className={selectClass}>
        {YEARS.map((y) => (
          <option key={y} value={y}>
            {y}
          </option>
        ))}
      </select>
    </div>
  );
}

export function PeriodSwitcher({ period, onChange }: PeriodSwitcherProps) {
  const year = period.kind === "yearly" ? period.year : DEFAULT_YEAR;
  // ช่วงที่กำลังเลือก (อาจยังไม่ถูกต้อง) — ส่งออกไปเฉพาะเมื่อถูกต้อง
  const [range, setRange] = useState(period.kind === "range" ? { from: period.from, to: period.to } : DEFAULT_RANGE);
  const invalid = !isValidRange(range.from, range.to);

  const updateRange = (next: typeof range) => {
    setRange(next);
    if (isValidRange(next.from, next.to)) onChange({ kind: "range", ...next });
  };

  const tab = (active: boolean) =>
    `h-11 rounded-full px-4 text-sm font-medium transition ${active ? "bg-indigo-600 text-white shadow" : "text-slate-600 hover:bg-slate-100"}`;

  return (
    <div className="flex flex-col items-center gap-3">
      <div role="group" aria-label="มุมมองเวลา" className="flex rounded-full bg-white p-1 shadow-sm ring-1 ring-slate-100">
        <button type="button" aria-pressed={period.kind === "monthly"} className={tab(period.kind === "monthly")} onClick={() => onChange({ kind: "monthly" })}>
          ดูรายเดือน
        </button>
        <button type="button" aria-pressed={period.kind === "yearly"} className={tab(period.kind === "yearly")} onClick={() => onChange({ kind: "yearly", year })}>
          ดูรายปี
        </button>
        <button
          type="button"
          aria-pressed={period.kind === "range"}
          className={tab(period.kind === "range")}
          onClick={() => !invalid && onChange({ kind: "range", ...range })}
        >
          กำหนดช่วง
        </button>
      </div>

      {period.kind === "yearly" && (
        <select aria-label="เลือกปี" value={period.year} onChange={(e) => onChange({ kind: "yearly", year: Number(e.target.value) })} className={`${selectClass} rounded-full px-3`}>
          {YEARS.map((y) => (
            <option key={y} value={y}>
              ปี {y}
            </option>
          ))}
        </select>
      )}

      {period.kind === "range" && (
        <div className="flex flex-col items-center gap-1">
          <div className="flex flex-wrap items-center justify-center gap-2">
            <MonthYearPicker label="เริ่มต้น" value={range.from} onChange={(from) => updateRange({ ...range, from })} />
            <span className="text-slate-400">ถึง</span>
            <MonthYearPicker label="สิ้นสุด" value={range.to} onChange={(to) => updateRange({ ...range, to })} />
          </div>
          {invalid && (
            <p role="alert" className="text-sm text-red-600">
              เดือนสิ้นสุดต้องไม่ก่อนเดือนเริ่มต้น — ตัวเลขยังแสดงช่วงล่าสุดที่ถูกต้อง
            </p>
          )}
        </div>
      )}
    </div>
  );
}
