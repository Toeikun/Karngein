import { CATEGORIES } from "@/domain/entities/Category";
import { formatBaht } from "@/domain/entities/Money";
import type { PlanSummary } from "@/domain/services/summarize";
import { CATEGORY_STYLES } from "../../styles/categoryStyles";

/** การ์ดสัดส่วนของแต่ละหมวดเทียบกับรายได้ (กฎ R10) */
export function CategoryRatioCards({ summary }: { summary: PlanSummary }) {
  return (
    <section aria-label="สัดส่วนรายจ่ายต่อรายได้" className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
      {CATEGORIES.map((category) => {
        const { amount, percentOfIncome } = summary.byCategory[category.id];
        const style = CATEGORY_STYLES[category.id];
        return (
          <div key={category.id} className="rounded-2xl bg-white p-3 shadow-sm ring-1 ring-slate-100">
            <p className="flex items-center gap-2 text-xs text-slate-600 sm:text-sm">
              <span className={`size-2.5 rounded-full ${style.dot}`} aria-hidden />
              {category.label}
            </p>
            <p className="mt-1 text-2xl font-bold tabular-nums text-slate-800" data-testid={`ratio-${category.id}`}>
              {percentOfIncome.toFixed(1)}%
            </p>
            <p className="text-xs tabular-nums text-slate-500">{formatBaht(amount)}</p>
            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-100">
              <div className={`h-full rounded-full ${style.dot}`} style={{ width: `${Math.min(100, percentOfIncome)}%` }} />
            </div>
          </div>
        );
      })}
    </section>
  );
}
