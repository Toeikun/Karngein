"use client";

/**
 * BurnDownChart — "จะเอาอยู่ไหม": ยอดใช้สะสม (เส้นทึบ) เทียบ "ถ้าใช้สม่ำเสมอ" (เส้นประ) — R32
 * SVG วาดเอง (ไม่เพิ่ม library) · แตะ/ชี้ที่วันไหน → บอกตัวเลขของวันนั้น · มีตารางให้โปรแกรมอ่านหน้าจอ
 */
import { useState } from "react";
import { formatBaht } from "@/domain/entities/Money";
import type { BurnDown } from "@/domain/services/cycleInsights";
import { formatThaiDate } from "../../utils/periodLabel";

const W = 320;
const H = 150;
const PAD = { top: 12, right: 8, bottom: 22, left: 8 };

export function BurnDownChart({ data }: { data: BurnDown }) {
  const [active, setActive] = useState<number | null>(null);
  const { points, budget, totalDays } = data;
  if (budget <= 0 || points.length === 0) return null;

  const max = Math.max(budget, ...points.map((p) => p.spent)) * 1.05;
  const x = (i: number) => PAD.left + ((W - PAD.left - PAD.right) * i) / Math.max(1, totalDays - 1);
  const y = (v: number) => PAD.top + (H - PAD.top - PAD.bottom) * (1 - v / max);
  const line = (key: "spent" | "ideal") => points.map((p, i) => `${i === 0 ? "M" : "L"}${x(i).toFixed(1)},${y(p[key]).toFixed(1)}`).join(" ");
  const idealFull = `M${x(0)},${y(budget / totalDays)} L${x(totalDays - 1)},${y(budget)}`;
  const last = points[points.length - 1];
  const shown = active !== null ? points[active] : last;
  const ahead = last.spent > last.ideal;

  return (
    <figure className="space-y-2">
      <figcaption className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-600">
        <span className="flex items-center gap-1.5">
          <span aria-hidden className={`h-0.5 w-5 rounded ${ahead ? "bg-amber-600" : "bg-indigo-600"}`} /> ใช้จริง (สะสม)
        </span>
        <span className="flex items-center gap-1.5">
          <span aria-hidden className="w-5 border-t-2 border-dashed border-slate-400" /> ถ้าใช้สม่ำเสมอ
        </span>
      </figcaption>
      <p className="text-sm text-slate-700" aria-live="polite">
        {formatThaiDate(shown.date, false)}: ใช้สะสม <strong className="tabular-nums">{formatBaht(shown.spent)}</strong> · ควรอยู่ที่{" "}
        <span className="tabular-nums">{formatBaht(shown.ideal)}</span>
      </p>
      <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full touch-none" role="img" aria-label="กราฟยอดใช้สะสมเทียบเส้นใช้สม่ำเสมอ" onMouseLeave={() => setActive(null)}>
        {/* เส้นงบ (เพดาน) */}
        <line x1={PAD.left} x2={W - PAD.right} y1={y(budget)} y2={y(budget)} className="stroke-slate-200" strokeWidth={1} />
        <text x={W - PAD.right} y={y(budget) - 3} textAnchor="end" className="fill-slate-500 text-[9px]">
          งบ {formatBaht(budget)}
        </text>
        <line x1={PAD.left} x2={W - PAD.right} y1={H - PAD.bottom} y2={H - PAD.bottom} className="stroke-slate-300" strokeWidth={1} />
        <path d={idealFull} fill="none" className="stroke-slate-400" strokeWidth={1.5} strokeDasharray="4 3" />
        <path d={line("spent")} fill="none" className={ahead ? "stroke-amber-600" : "stroke-indigo-600"} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
        {active !== null && <line x1={x(active)} x2={x(active)} y1={PAD.top} y2={H - PAD.bottom} className="stroke-slate-300" strokeWidth={1} />}
        <circle cx={x(points.indexOf(shown))} cy={y(shown.spent)} r={4} className={`${ahead ? "fill-amber-600" : "fill-indigo-600"} stroke-white`} strokeWidth={2} />
        {[0, Math.floor((totalDays - 1) / 2), totalDays - 1].map((i) => (
          <text key={i} x={x(i)} y={H - 6} textAnchor={i === 0 ? "start" : i === totalDays - 1 ? "end" : "middle"} className="fill-slate-500 text-[9px]">
            วันที่ {i + 1}
          </text>
        ))}
        {/* พื้นที่แตะ: กว้างกว่าเส้น (ทั้งความสูงกราฟ) */}
        {points.map((p, i) => (
          <rect
            key={p.date}
            x={x(i) - (W - PAD.left - PAD.right) / totalDays / 2}
            y={0}
            width={(W - PAD.left - PAD.right) / totalDays}
            height={H}
            fill="transparent"
            onMouseEnter={() => setActive(i)}
            onClick={() => setActive(i)}
          />
        ))}
      </svg>
      <table className="sr-only">
        <caption>ยอดใช้สะสมรายวัน</caption>
        <thead>
          <tr>
            <th>วันที่</th>
            <th>ใช้สะสม</th>
            <th>ถ้าใช้สม่ำเสมอ</th>
          </tr>
        </thead>
        <tbody>
          {points.map((p) => (
            <tr key={p.date}>
              <td>{formatThaiDate(p.date)}</td>
              <td>{formatBaht(p.spent)}</td>
              <td>{formatBaht(p.ideal)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </figure>
  );
}
