/** ข้อสังเกตเทียบรอบก่อน "ช่วงเดียวกัน" (R33) */
import { CATEGORIES } from "@/domain/entities/Category";
import { formatBaht } from "@/domain/entities/Money";
import type { CycleComparison } from "@/domain/services/cycleInsights";

export function ComparisonCard({ data }: { data: CycleComparison }) {
  const up = data.changePercent !== null && data.changePercent > 0;
  const category = data.biggestIncrease && CATEGORIES.find((c) => c.id === data.biggestIncrease!.category)?.label;
  return (
    <ul className="space-y-2 text-sm text-slate-700" aria-label="ข้อสังเกต">
      <li className="flex gap-2">
        <span aria-hidden>{data.changePercent === null ? "📊" : up ? "📈" : "📉"}</span>
        <span>
          {data.days} วันแรกของรอบนี้ใช้ไป <strong className="tabular-nums">{formatBaht(data.expense)}</strong>
          {data.changePercent === null ? (
            " (รอบก่อนไม่มีรายจ่ายช่วงเดียวกัน)"
          ) : (
            <>
              {" "}
              — <strong className={up ? "text-rose-700" : "text-emerald-700"}>{up ? "มากกว่า" : "น้อยกว่า"}รอบก่อน {Math.abs(data.changePercent)}%</strong> (รอบก่อน{" "}
              <span className="tabular-nums">{formatBaht(data.previousExpense)}</span>)
            </>
          )}
        </span>
      </li>
      <li className="flex gap-2">
        <span aria-hidden>📅</span>
        <span>
          เฉลี่ยวันละ <strong className="tabular-nums">{formatBaht(data.averagePerDay)}</strong>
        </span>
      </li>
      {data.biggestIncrease && (
        <li className="flex gap-2">
          <span aria-hidden>🔎</span>
          <span>
            หมวดที่เพิ่มขึ้นมากสุด: <strong>{category}</strong> (+<span className="tabular-nums">{formatBaht(data.biggestIncrease.delta)}</span>)
          </span>
        </li>
      )}
    </ul>
  );
}
