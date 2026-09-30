import { formatBaht } from "@/domain/entities/Money";
import type { PlanSummary } from "@/domain/services/summarize";

interface SummaryCardsProps {
  summary: PlanSummary;
}

export function SummaryCards({ summary }: SummaryCardsProps) {
  const negative = summary.remaining < 0;
  const cards = [
    { label: "รายได้รวม", value: summary.income, className: "bg-emerald-50 text-emerald-800" },
    { label: "รายจ่ายรวม", value: summary.expense, className: "bg-rose-50 text-rose-800" },
    { label: "ออม/ลงทุน", value: summary.saving, className: "bg-indigo-50 text-indigo-700" },
    {
      label: "เงินคงเหลือ",
      value: summary.remaining,
      className: negative ? "bg-red-100 text-red-700" : "bg-slate-100 text-slate-700",
    },
  ];

  return (
    <section aria-label="สรุป" className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      {cards.map((card) => (
        <div key={card.label} className={`rounded-3xl p-4 text-center ${card.className}`}>
          <p className="text-xs font-medium sm:text-sm">{card.label}</p>
          <p className="mt-1 text-lg font-bold tabular-nums sm:text-2xl" aria-label={card.label} role="status">
            {formatBaht(card.value)}
          </p>
        </div>
      ))}
    </section>
  );
}
