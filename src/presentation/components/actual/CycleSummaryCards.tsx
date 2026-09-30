import { formatBaht } from "@/domain/entities/Money";
import type { CycleSummary } from "@/domain/services/cycleSummary";

export function CycleSummaryCards({ summary, daysLeft }: { summary: CycleSummary; daysLeft: number | null }) {
  const negative = summary.remaining < 0;
  const cards = [
    { label: "รับจริง", value: formatBaht(summary.income), className: "bg-emerald-50 text-emerald-800" },
    { label: "จ่ายจริง", value: formatBaht(summary.expense), className: "bg-rose-50 text-rose-800" },
    {
      label: "คงเหลือรอบนี้",
      value: formatBaht(summary.remaining),
      className: negative ? "bg-red-100 text-red-700" : "bg-slate-100 text-slate-700",
    },
    ...(daysLeft !== null
      ? [{ label: "เหลืออีก", value: `${daysLeft} วัน`, className: "bg-indigo-50 text-indigo-700" }]
      : []),
  ];
  return (
    <section aria-label="สรุปรอบ" className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      {cards.map((card) => (
        <div key={card.label} className={`rounded-3xl p-4 text-center ${card.className}`}>
          <p className="text-xs font-medium sm:text-sm">{card.label}</p>
          <p className="mt-1 text-lg font-bold tabular-nums sm:text-2xl" role="status" aria-label={card.label}>
            {card.value}
          </p>
        </div>
      ))}
    </section>
  );
}
