import { formatBaht } from "@/domain/entities/Money";
import type { BudgetComparison } from "@/domain/services/cycleSummary";
import { CATEGORY_STYLES } from "../../styles/categoryStyles";

/** แถบเทียบงบต่อกลุ่ม (R17) — เกินงบเป็นสีแดง */
export function BudgetBars({ comparison }: { comparison: BudgetComparison }) {
  const lines = comparison.lines.filter((line) => line.budget > 0 || line.actual > 0);
  return (
    <section aria-labelledby="budget-heading" className="rounded-3xl bg-white p-4 shadow-sm ring-1 ring-slate-100 sm:p-5">
      <h2 id="budget-heading" className="mb-3 text-lg font-semibold text-slate-800">
        ใช้ไปเทียบกับงบ
      </h2>
      {lines.length === 0 ? (
        <p className="text-sm text-slate-500">ยังไม่มีกลุ่มรายจ่ายในแผน — เพิ่มที่แท็บ &quot;วางแผน&quot;</p>
      ) : (
        <ul className="space-y-3">
          {lines.map((line) => {
            const percent = line.percentUsed;
            return (
              <li key={line.groupId} data-testid={`budget-${line.groupId}`}>
                <div className="flex flex-wrap items-baseline justify-between gap-x-2 text-sm">
                  <span className="flex items-center gap-2 font-medium text-slate-700">
                    <span className={`size-2.5 rounded-full ${CATEGORY_STYLES[line.category].dot}`} aria-hidden />
                    {line.name}
                  </span>
                  <span className={`tabular-nums ${line.over ? "font-semibold text-red-600" : "text-slate-500"}`}>
                    {formatBaht(line.actual)} / {formatBaht(line.budget)}
                    {percent !== null && ` (${percent.toFixed(1)}%)`}
                    {line.over && " เกินงบ"}
                  </span>
                </div>
                <div className="mt-1 h-2 overflow-hidden rounded-full bg-slate-100">
                  <div
                    className={`h-full rounded-full ${line.over ? "bg-red-500" : CATEGORY_STYLES[line.category].dot}`}
                    style={{ width: `${Math.min(100, percent ?? (line.actual > 0 ? 100 : 0))}%` }}
                  />
                </div>
              </li>
            );
          })}
        </ul>
      )}
      {comparison.unlinkedExpense > 0 && (
        <p className="mt-3 text-sm text-slate-500">
          รายจ่ายที่ไม่ได้ผูกกับกลุ่ม: <span className="tabular-nums">{formatBaht(comparison.unlinkedExpense)}</span>
        </p>
      )}
    </section>
  );
}
