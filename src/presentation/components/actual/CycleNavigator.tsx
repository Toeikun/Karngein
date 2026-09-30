"use client";

import type { PayCycle } from "@/domain/entities/PayCycle";
import { cycleLabel } from "../../utils/periodLabel";

interface CycleNavigatorProps {
  cycle: PayCycle;
  isCurrent: boolean;
  startDay: number;
  onShift: (delta: number) => void;
  onToday: () => void;
  onStartDayChange: (day: number) => void;
}

const DAYS = Array.from({ length: 31 }, (_, i) => i + 1);

export function CycleNavigator({ cycle, isCurrent, startDay, onShift, onToday, onStartDayChange }: CycleNavigatorProps) {
  const arrow = "grid size-11 place-items-center rounded-xl bg-slate-100 text-lg text-slate-700 hover:bg-slate-200";
  return (
    <div className="flex flex-col items-center gap-2 rounded-3xl bg-white p-3 shadow-sm ring-1 ring-slate-100">
      <div className="flex w-full items-center justify-between gap-2">
        <button type="button" aria-label="รอบก่อนหน้า" className={arrow} onClick={() => onShift(-1)}>
          ‹
        </button>
        <div className="text-center">
          <p className="text-xs text-slate-500">{isCurrent ? "รอบปัจจุบัน" : "รอบเงินเดือน"}</p>
          <p className="font-semibold text-slate-800" aria-label="รอบที่แสดง" role="status">
            {cycleLabel(cycle)}
          </p>
        </div>
        <button type="button" aria-label="รอบถัดไป" className={arrow} onClick={() => onShift(1)}>
          ›
        </button>
      </div>
      <div className="flex flex-wrap items-center justify-center gap-2 text-sm text-slate-600">
        <label htmlFor="pay-cycle-day">รอบเงินเดือนเริ่มวันที่</label>
        <select
          id="pay-cycle-day"
          value={startDay}
          onChange={(event) => onStartDayChange(Number(event.target.value))}
          className="h-11 rounded-xl border border-slate-200 bg-white px-2 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
        >
          {DAYS.map((d) => (
            <option key={d} value={d}>
              {d}
            </option>
          ))}
        </select>
        {!isCurrent && (
          <button type="button" onClick={onToday} className="h-11 rounded-xl px-3 text-indigo-600 hover:bg-indigo-50">
            กลับรอบปัจจุบัน
          </button>
        )}
      </div>
    </div>
  );
}
