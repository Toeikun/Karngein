import { CATEGORIES } from "@/domain/entities/Category";
import type { Goal } from "@/domain/entities/Goal";
import { formatBaht } from "@/domain/entities/Money";
import type { Plan } from "@/domain/entities/Plan";
import type { GoalProgress } from "@/domain/services/goalProgress";
import { CATEGORY_STYLES } from "../../styles/categoryStyles";
import { formatThaiDate } from "../../utils/periodLabel";

interface GoalCardProps {
  goal: Goal;
  plan: Plan;
  progress: GoalProgress;
  contributionCount: number;
  onEdit: () => void;
  onDelete: () => void;
}

/** ข้อความสูตรของเป้า เช่น "เงินเดือน × 12" */
function targetFormula(goal: Goal, plan: Plan): string {
  if (goal.target.kind === "fixed") return "จำนวนตายตัว";
  const { incomeId, times } = goal.target;
  const income = plan.incomes.find((i) => i.id === incomeId);
  return `${income?.name ?? "รายได้ที่ถูกลบ"} × ${times}`;
}

/** 95 รอบ → "ประมาณอีก 95 รอบ (~7 ปี 11 เดือน)" (1 รอบ ≈ 1 เดือน) */
function cyclesText(cycles: number): string {
  const years = Math.floor(cycles / 12);
  const months = cycles % 12;
  const approx = [years > 0 ? `${years} ปี` : "", months > 0 ? `${months} เดือน` : ""].filter(Boolean).join(" ");
  return `ประมาณอีก ${cycles} รอบ (~${approx})`;
}

export function GoalCard({ goal, plan, progress, contributionCount, onEdit, onDelete }: GoalCardProps) {
  const style = CATEGORY_STYLES[goal.category];
  const category = CATEGORIES.find((c) => c.id === goal.category)?.label;

  return (
    <article aria-label={`เป้าหมาย ${goal.name}`} className={`rounded-3xl border-l-4 bg-white p-4 shadow-sm ring-1 ring-slate-100 sm:p-5 ${style.border}`}>
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h3 className="text-lg font-semibold text-slate-800">{goal.name}</h3>
          <p className="text-sm text-slate-500">
            <span className={`mr-2 rounded-full px-2 py-0.5 text-xs ${style.badge}`}>{category}</span>
            {targetFormula(goal, plan)}
            {goal.deadline && ` · ภายใน ${formatThaiDate(goal.deadline)}`}
          </p>
        </div>
        <div className="flex gap-1">
          <button type="button" onClick={onEdit} className="h-11 rounded-xl px-3 text-sm text-indigo-600 hover:bg-indigo-50" aria-label={`แก้ไขเป้าหมาย ${goal.name}`}>
            แก้ไข
          </button>
          <button type="button" onClick={onDelete} className="h-11 rounded-xl px-3 text-sm text-red-600 hover:bg-red-50" aria-label={`ลบเป้าหมาย ${goal.name}`}>
            ลบ
          </button>
        </div>
      </div>

      {progress.status === "missingIncome" ? (
        <p role="alert" className="mt-3 rounded-xl bg-amber-50 p-3 text-sm text-amber-900">
          รายได้ที่ใช้คำนวณเป้านี้ถูกลบออกจากแผนแล้ว — กด &quot;แก้ไข&quot; เพื่อเลือกรายได้ใหม่ (ตอนนี้มีเงินในเป้า {formatBaht(progress.current)})
        </p>
      ) : (
        <div className="mt-3 space-y-2" data-testid={`goal-${goal.id}`}>
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <p className="text-2xl font-bold tabular-nums text-slate-800">{progress.percent.toFixed(1)}%</p>
            <p className="tabular-nums text-slate-600">
              {formatBaht(progress.current)} / <strong>{formatBaht(progress.target)}</strong>
            </p>
          </div>
          <div
            role="progressbar"
            aria-label={`ความคืบหน้า ${goal.name}`}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={Math.min(100, Math.round(progress.percent))}
            className="h-3 overflow-hidden rounded-full bg-slate-100"
          >
            <div className={`h-full rounded-full ${style.dot}`} style={{ width: `${Math.min(100, progress.percent)}%` }} />
          </div>
          <p className="text-sm text-slate-600">
            {progress.reached ? (
              <strong className="text-emerald-700">ถึงเป้าแล้ว 🎉</strong>
            ) : (
              <>
                ขาดอีก <strong className="tabular-nums">{formatBaht(progress.remaining)}</strong>
                {" · "}
                {progress.cyclesToGo !== null ? cyclesText(progress.cyclesToGo) : "ออมเข้าเป้าให้ครบ 1 รอบ แล้วจะประมาณเวลาถึงเป้าให้"}
              </>
            )}
          </p>
          <p className="text-xs text-slate-500">
            เงินตั้งต้น {formatBaht(goal.startingAmount)} · ออมเข้าเป้าแล้ว {contributionCount} ครั้ง (ลงที่แท็บ &quot;บันทึกจริง&quot; → เลือก &quot;นับเข้าเป้าหมาย&quot;)
          </p>
        </div>
      )}
    </article>
  );
}
