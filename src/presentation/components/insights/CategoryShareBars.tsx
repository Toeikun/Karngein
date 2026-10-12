/**
 * สัดส่วนรายจ่ายตามหมวด (R31) — แถบแนวนอน + ชื่อหมวด + ยอด + % ทุกแถว
 * ใช้แถบแทนวงกลม: เทียบขนาดได้ง่ายกว่า และป้ายชื่อติดทุกแถว (สีหมวดบางคู่แยกยากสำหรับคนตาบอดสี — ไม่พึ่งสีอย่างเดียว)
 */
import { CATEGORIES } from "@/domain/entities/Category";
import { formatBaht } from "@/domain/entities/Money";
import type { CategoryShare } from "@/domain/services/cycleInsights";
import { CATEGORY_STYLES } from "../../styles/categoryStyles";

export function CategoryShareBars({ shares }: { shares: CategoryShare[] }) {
  if (shares.length === 0) return <p className="text-sm text-slate-500">ยังไม่มีรายจ่ายในรอบนี้</p>;
  const max = shares[0].amount;
  return (
    <ul className="space-y-3">
      {shares.map((s) => (
        <li key={s.category} data-testid={`share-${s.category}`}>
          <div className="flex items-baseline justify-between gap-2 text-sm">
            <span className="flex items-center gap-2 text-slate-700">
              <span aria-hidden className={`size-2.5 rounded-full ${CATEGORY_STYLES[s.category].dot}`} />
              {CATEGORIES.find((c) => c.id === s.category)?.label}
            </span>
            <span className="tabular-nums text-slate-600">
              {formatBaht(s.amount)} · <strong className="text-slate-800">{s.percent.toFixed(1)}%</strong>
            </span>
          </div>
          <div className="mt-1 h-2 rounded-full bg-slate-100">
            <div className={`h-full rounded-full ${CATEGORY_STYLES[s.category].dot}`} style={{ width: `${Math.max(2, (s.amount / max) * 100)}%` }} />
          </div>
        </li>
      ))}
    </ul>
  );
}
