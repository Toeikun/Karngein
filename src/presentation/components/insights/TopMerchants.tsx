/** อันดับร้าน/ที่จ่ายเงินมากสุดในรอบ (R31) */
import { formatBaht } from "@/domain/entities/Money";
import type { MerchantRank } from "@/domain/services/cycleInsights";

export function TopMerchants({ ranks }: { ranks: MerchantRank[] }) {
  if (ranks.length === 0) return <p className="text-sm text-slate-500">ยังไม่มีรายจ่ายในรอบนี้</p>;
  return (
    <ol className="divide-y divide-slate-100">
      {ranks.map((r, i) => (
        <li key={r.name} className="flex items-center gap-3 py-2.5">
          <span className="grid size-7 shrink-0 place-items-center rounded-full bg-slate-100 text-xs font-bold text-slate-600">{i + 1}</span>
          <span className="min-w-0 flex-1">
            <span className="block truncate font-medium text-slate-800">{r.name}</span>
            <span className="text-xs text-slate-500">{r.count} ครั้ง</span>
          </span>
          <span className="shrink-0 font-semibold tabular-nums text-slate-800">{formatBaht(r.amount)}</span>
        </li>
      ))}
    </ol>
  );
}
