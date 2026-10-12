"use client";

/**
 * DayCalendar — ปฏิทินยอดใช้จ่ายรายวันของรอบ (R30)
 * สีเข้มตามยอด (สีเดียว อ่อน→เข้ม) และมีตัวเลขในทุกช่อง → ไม่พึ่งสีอย่างเดียว · แตะวัน → ดูรายการของวันนั้น
 */
import type { DayTotal } from "@/domain/services/cycleInsights";
import { formatBaht } from "@/domain/entities/Money";
import { formatThaiDate } from "../../utils/periodLabel";

const WEEKDAYS = ["อา", "จ", "อ", "พ", "พฤ", "ศ", "ส"];

/** 1,234 → "1.2k" (ช่องปฏิทินแคบ) */
export function compactAmount(value: number): string {
  if (value >= 1000) return `${(value / 1000).toFixed(1).replace(/\.0$/, "")}k`;
  return String(Math.round(value));
}

function shade(value: number, max: number): string {
  if (value <= 0 || max <= 0) return "bg-white";
  const ratio = value / max;
  if (ratio <= 0.25) return "bg-indigo-50";
  if (ratio <= 0.5) return "bg-indigo-100";
  if (ratio <= 0.75) return "bg-indigo-200";
  return "bg-indigo-300";
}

interface DayCalendarProps {
  days: DayTotal[];
  today: string;
  selected: string | null;
  onSelect: (date: string | null) => void;
}

export function DayCalendar({ days, today, selected, onSelect }: DayCalendarProps) {
  if (days.length === 0) return null;
  const offset = new Date(`${days[0].date}T00:00:00Z`).getUTCDay();
  const max = Math.max(...days.map((d) => d.expense));

  return (
    <div>
      <div className="grid grid-cols-7 gap-1 text-center text-xs font-medium text-slate-500" aria-hidden>
        {WEEKDAYS.map((d) => (
          <span key={d}>{d}</span>
        ))}
      </div>
      <div className="mt-1 grid grid-cols-7 gap-1" role="group" aria-label="ปฏิทินยอดใช้จ่ายรายวัน">
        {Array.from({ length: offset }, (_, i) => (
          <span key={`blank-${i}`} aria-hidden />
        ))}
        {days.map((day) => {
          const dayNumber = Number(day.date.slice(8));
          const future = day.date > today;
          const isSelected = selected === day.date;
          return (
            <button
              key={day.date}
              type="button"
              disabled={future}
              aria-pressed={isSelected}
              aria-label={`${formatThaiDate(day.date)} จ่าย ${formatBaht(day.expense)}${day.income > 0 ? ` รับ ${formatBaht(day.income)}` : ""}`}
              onClick={() => onSelect(isSelected ? null : day.date)}
              className={`flex min-h-11 flex-col items-center justify-center rounded-xl text-xs ring-1 transition ${shade(day.expense, max)} ${
                isSelected ? "ring-2 ring-indigo-600" : day.date === today ? "ring-indigo-400" : "ring-slate-100"
              } ${future ? "opacity-40" : "hover:ring-indigo-300"}`}
            >
              <span className={`font-semibold ${day.date === today ? "text-indigo-700" : "text-slate-800"}`}>{dayNumber}</span>
              <span className="tabular-nums text-[10px] text-slate-600">{day.expense > 0 ? compactAmount(day.expense) : " "}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
