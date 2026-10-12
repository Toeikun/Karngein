"use client";

/**
 * BalanceHero — การ์ดใหญ่บนสุดของแท็บ "รายการ"
 *   แถวบน: เลื่อนรอบ ‹ รอบ › · ตัวเลขใหญ่: คงเหลือรอบนี้ · ข้าง: รายจ่าย/รายรับ
 *   แถวล่าง: เหลือใช้ได้จากงบ + แถบที่มีขีด "วันนี้" (ควรใช้ถึงไหน — Domain: budgetPace R22)
 * ตัวเลขทั้งหมดมาจาก Domain — component แค่จัดวาง
 */
import { formatBaht } from "@/domain/entities/Money";
import type { PayCycle } from "@/domain/entities/PayCycle";
import type { CycleSummary } from "@/domain/services/cycleSummary";
import type { BudgetPace } from "@/domain/services/dailyView";
import { cycleLabel } from "../../utils/periodLabel";

interface BalanceHeroProps {
  cycle: PayCycle;
  isCurrent: boolean;
  summary: CycleSummary;
  pace: BudgetPace;
  daysLeft: number | null; // null = ไม่ใช่รอบปัจจุบัน
  onShift: (delta: number) => void;
  onToday: () => void;
}

export function BalanceHero({ cycle, isCurrent, summary, pace, daysLeft, onShift, onToday }: BalanceHeroProps) {
  const arrow = "grid size-11 shrink-0 place-items-center rounded-full text-xl text-slate-600 hover:bg-slate-100";
  const usedPercent = pace.budget > 0 ? Math.min(100, (pace.spent / pace.budget) * 100) : 0;
  const over = pace.left < 0;
  const ahead = pace.paceDelta > 0.005; // ใช้เร็วกว่าแผน

  return (
    <section aria-label="สรุปรอบ" className="rounded-3xl bg-white p-4 shadow-sm ring-1 ring-slate-100 sm:p-5">
      <div className="flex items-center gap-1">
        <button type="button" aria-label="รอบก่อนหน้า" className={arrow} onClick={() => onShift(-1)}>
          ‹
        </button>
        <div className="min-w-0 flex-1 text-center">
          <p className="font-semibold text-slate-800" aria-label="รอบที่แสดง" role="status">
            {cycleLabel(cycle)}
          </p>
          <p className="text-xs text-slate-500">
            {isCurrent ? "รอบปัจจุบัน" : "รอบเงินเดือน"} · {summary.count} รายการ
            {!isCurrent && (
              <>
                {" · "}
                <button type="button" onClick={onToday} className="font-medium text-indigo-600 underline-offset-2 hover:underline">
                  กลับรอบปัจจุบัน
                </button>
              </>
            )}
          </p>
        </div>
        <button type="button" aria-label="รอบถัดไป" className={arrow} onClick={() => onShift(1)}>
          ›
        </button>
      </div>

      <div className="mt-3 flex flex-wrap items-end justify-between gap-x-4 gap-y-2">
        <div>
          <p className="text-sm text-slate-500">คงเหลือรอบนี้</p>
          <p
            role="status"
            aria-label="คงเหลือรอบนี้"
            className={`text-3xl font-bold tracking-tight tabular-nums sm:text-4xl ${summary.remaining < 0 ? "text-red-600" : "text-slate-900"}`}
          >
            {formatBaht(summary.remaining)}
          </p>
        </div>
        <dl className="space-y-0.5 text-sm">
          <div className="flex items-center gap-2">
            <span className="size-2 rounded-full bg-rose-500" aria-hidden />
            <dt className="text-slate-500">รายจ่าย</dt>
            <dd role="status" aria-label="จ่ายจริง" className="ml-auto font-semibold tabular-nums text-rose-700">
              {formatBaht(summary.expense)}
            </dd>
          </div>
          <div className="flex items-center gap-2">
            <span className="size-2 rounded-full bg-emerald-500" aria-hidden />
            <dt className="text-slate-500">รายรับ</dt>
            <dd role="status" aria-label="รับจริง" className="ml-auto pl-3 font-semibold tabular-nums text-emerald-700">
              {formatBaht(summary.income)}
            </dd>
          </div>
        </dl>
      </div>

      <div className="mt-4 border-t border-dashed border-slate-200 pt-3">
        {pace.budget > 0 ? (
          <>
            <p className="flex flex-wrap items-baseline gap-x-2 text-sm text-slate-600">
              <span className="font-semibold text-slate-800">{over ? "ใช้เกินงบ" : "เหลือใช้ได้"}</span>
              <span role="status" aria-label="เหลือใช้ได้" className={`text-lg font-bold tabular-nums ${over ? "text-red-600" : "text-slate-900"}`}>
                {formatBaht(Math.abs(pace.left))}
              </span>
              <span className="text-xs text-slate-500">
                จากงบ {formatBaht(pace.budget)}
                {daysLeft !== null && (
                  <>
                    {" · "}
                    <span role="status" aria-label="เหลืออีก">
                      เหลืออีก {daysLeft} วัน
                    </span>
                  </>
                )}
              </span>
            </p>
            <div
              className="relative mt-2 h-3 rounded-full bg-slate-100"
              role="img"
              aria-label={`ใช้ไป ${usedPercent.toFixed(0)}% ของงบ`}
            >
              <div className={`h-full rounded-full ${over ? "bg-red-500" : ahead ? "bg-amber-500" : "bg-indigo-500"}`} style={{ width: `${usedPercent}%` }} />
              {isCurrent && (
                // ขีด "วันนี้": ถ้าแถบสียาวเกินขีด = ใช้เร็วกว่าแผน
                <div className="absolute -top-1 -bottom-1 w-0.5 rounded bg-slate-700" style={{ left: `${pace.elapsedRatio * 100}%` }} aria-hidden />
              )}
            </div>
            {isCurrent && (
              <p className="mt-2 flex flex-wrap gap-2 text-xs">
                <span className={`rounded-full px-2.5 py-1 font-medium ${ahead ? "bg-amber-100 text-amber-800" : "bg-emerald-100 text-emerald-800"}`}>
                  {ahead ? `ใช้เร็วกว่าแผน ${formatBaht(pace.paceDelta)}` : `อยู่ในแผน · ประหยัดกว่า ${formatBaht(-pace.paceDelta)}`}
                </span>
                {pace.perDayLeft !== null && (
                  <span className="rounded-full bg-slate-100 px-2.5 py-1 text-slate-600">ใช้ได้วันละ ~{formatBaht(pace.perDayLeft)}</span>
                )}
              </p>
            )}
          </>
        ) : (
          <p className="text-sm text-slate-500">
            {daysLeft !== null && (
              <span role="status" aria-label="เหลืออีก">
                เหลืออีก {daysLeft} วัน ·{" "}
              </span>
            )}
            ยังไม่มีงบ — เพิ่มกลุ่มรายจ่ายที่แท็บ &quot;วางแผน&quot; เพื่อดูว่าใช้ได้อีกเท่าไร
          </p>
        )}
      </div>
    </section>
  );
}
