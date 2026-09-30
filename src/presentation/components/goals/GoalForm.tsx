"use client";

/**
 * GoalForm — ตั้ง/แก้เป้าหมาย
 * เป้า 2 แบบ (D12): "รายได้ในแผน × จำนวนเท่า" (เช่น เงินเดือน × 12) หรือ "จำนวนตายตัว"
 * แสดงยอดเป้าให้เห็นทันทีระหว่างกรอก (คำนวณด้วย goalTarget จาก Domain)
 */
import { useState } from "react";
import { CATEGORIES, type CategoryId } from "@/domain/entities/Category";
import type { Goal, GoalInput, GoalTarget } from "@/domain/entities/Goal";
import { formatBaht } from "@/domain/entities/Money";
import type { Plan } from "@/domain/entities/Plan";
import type { ValidationError } from "@/domain/entities/validation";
import { goalTarget } from "@/domain/services/goalProgress";
import { formatAmountInput, parseAmount } from "../../utils/parseAmount";

interface GoalFormProps {
  plan: Plan;
  editing: Goal | null;
  onSubmit: (input: GoalInput) => ValidationError[];
  onCancel: () => void;
}

const field = "h-11 w-full rounded-xl border border-slate-200 bg-white px-3 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100";

export function GoalForm({ plan, editing, onSubmit, onCancel }: GoalFormProps) {
  const hasIncomes = plan.incomes.length > 0;
  const initialTarget = editing?.target;
  const [name, setName] = useState(editing?.name ?? "");
  const [category, setCategory] = useState<CategoryId>(editing?.category ?? "emergency");
  const [kind, setKind] = useState<GoalTarget["kind"]>(initialTarget?.kind ?? (hasIncomes ? "incomeMultiple" : "fixed"));
  const [incomeId, setIncomeId] = useState(initialTarget?.kind === "incomeMultiple" ? initialTarget.incomeId : plan.incomes[0]?.id ?? "");
  const [times, setTimes] = useState(initialTarget?.kind === "incomeMultiple" ? String(initialTarget.times) : "12");
  const [amountText, setAmountText] = useState(initialTarget?.kind === "fixed" ? formatAmountInput(initialTarget.amount) : "");
  const [startingText, setStartingText] = useState(editing ? formatAmountInput(editing.startingAmount) : "0");
  const [deadline, setDeadline] = useState(editing?.deadline ?? "");
  const [errors, setErrors] = useState<Record<string, string>>({});

  const fixedAmount = parseAmount(amountText);
  const target: GoalTarget =
    kind === "incomeMultiple"
      ? { kind, incomeId, times: Number(times) }
      : { kind, amount: fixedAmount.ok ? fixedAmount.value : 0 };
  const preview = goalTarget({ id: "preview", name, category, target, startingAmount: 0 }, plan);

  function submit(event: React.FormEvent) {
    event.preventDefault();
    const starting = startingText.trim() === "" ? { ok: true as const, value: 0 } : parseAmount(startingText);
    const localErrors: Record<string, string> = {};
    if (kind === "fixed" && !fixedAmount.ok) localErrors.target = fixedAmount.message;
    if (!starting.ok) localErrors.startingAmount = starting.message;
    if (Object.keys(localErrors).length > 0) {
      setErrors(localErrors);
      return;
    }
    const result = onSubmit({
      name,
      category,
      target,
      startingAmount: starting.ok ? starting.value : 0,
      ...(deadline ? { deadline } : {}),
    });
    setErrors(Object.fromEntries(result.map((e) => [e.field, e.message])));
  }

  const error = (key: string) =>
    errors[key] && (
      <p role="alert" className="mt-1 text-xs text-red-600">
        {errors[key]}
      </p>
    );

  const kindButton = (value: GoalTarget["kind"], label: string, disabled = false) => (
    <button
      type="button"
      aria-pressed={kind === value}
      disabled={disabled}
      onClick={() => setKind(value)}
      className={`h-11 flex-1 rounded-xl px-2 text-sm font-medium transition disabled:opacity-40 ${kind === value ? "bg-indigo-600 text-white" : "bg-slate-100 text-slate-700"}`}
    >
      {label}
    </button>
  );

  return (
    <form onSubmit={submit} aria-label={editing ? "แก้ไขเป้าหมาย" : "ตั้งเป้าหมายใหม่"} className="space-y-3 rounded-3xl bg-white p-4 shadow-sm ring-1 ring-indigo-100 sm:p-5">
      <h2 className="text-lg font-semibold text-slate-800">{editing ? "แก้ไขเป้าหมาย" : "ตั้งเป้าหมายใหม่"}</h2>

      <div>
        <input aria-label="ชื่อเป้าหมาย" placeholder="เช่น เป้าหมายเงินออมฉุกเฉิน" value={name} onChange={(e) => setName(e.target.value)} className={field} />
        {error("name")}
      </div>

      <select aria-label="หมวดของเป้าหมาย" value={category} onChange={(e) => setCategory(e.target.value as CategoryId)} className={field}>
        {CATEGORIES.map((c) => (
          <option key={c.id} value={c.id}>
            {c.label}
          </option>
        ))}
      </select>

      <div role="group" aria-label="รูปแบบเป้า" className="flex gap-2">
        {kindButton("incomeMultiple", "รายได้ × จำนวนเท่า", !hasIncomes)}
        {kindButton("fixed", "จำนวนตายตัว")}
      </div>
      {!hasIncomes && <p className="text-xs text-slate-500">เพิ่มรายได้ในแท็บ &quot;วางแผน&quot; ก่อน ถึงจะตั้งเป้าแบบ รายได้ × จำนวนเท่า ได้</p>}

      {kind === "incomeMultiple" ? (
        <div className="grid grid-cols-[1fr_auto_6rem] items-center gap-2">
          <select aria-label="รายได้ที่ใช้คำนวณเป้า" value={incomeId} onChange={(e) => setIncomeId(e.target.value)} className={field}>
            {plan.incomes.map((i) => (
              <option key={i.id} value={i.id}>
                {i.name}
              </option>
            ))}
          </select>
          <span className="text-slate-500">×</span>
          <input aria-label="จำนวนเท่า" inputMode="numeric" value={times} onChange={(e) => setTimes(e.target.value.replace(/\D/g, ""))} className={`${field} text-right`} />
        </div>
      ) : (
        <div className="relative">
          <span className="pointer-events-none absolute left-3 top-2.5 text-slate-400">฿</span>
          <input aria-label="ยอดเป้าหมาย" inputMode="decimal" placeholder="0" value={amountText} onChange={(e) => setAmountText(e.target.value)} className={`${field} pl-7 text-right`} />
        </div>
      )}
      {error("target")}
      {error("times")}
      <p className="text-sm text-slate-600" aria-live="polite">
        ยอดเป้า: <strong className="tabular-nums text-slate-900" data-testid="goal-target-preview">{preview !== null && preview > 0 ? formatBaht(preview) : "—"}</strong>
        {kind === "incomeMultiple" && " (ยอดต่อเดือนของรายได้ × จำนวนเท่า — แก้รายได้ในแผน เป้าเปลี่ยนตาม)"}
      </p>

      <div className="grid gap-3 sm:grid-cols-2">
        <label className="text-sm text-slate-600">
          เงินที่มีอยู่แล้ว
          <div className="relative mt-1">
            <span className="pointer-events-none absolute left-3 top-2.5 text-slate-400">฿</span>
            <input aria-label="เงินที่มีอยู่แล้ว" inputMode="decimal" value={startingText} onChange={(e) => setStartingText(e.target.value)} className={`${field} pl-7 text-right`} />
          </div>
          {error("startingAmount")}
        </label>
        <label className="text-sm text-slate-600">
          อยากถึงเป้าภายใน (ไม่บังคับ)
          <input type="date" aria-label="วันที่อยากถึงเป้า" value={deadline} onChange={(e) => setDeadline(e.target.value)} className={`${field} mt-1`} />
        </label>
      </div>

      <div className="flex gap-2">
        <button type="submit" className="h-11 flex-1 rounded-xl bg-indigo-600 px-5 font-medium text-white hover:bg-indigo-700 sm:flex-none">
          {editing ? "บันทึกการแก้ไข" : "บันทึกเป้าหมาย"}
        </button>
        <button type="button" onClick={onCancel} className="h-11 rounded-xl px-4 text-slate-600 hover:bg-slate-100">
          ยกเลิก
        </button>
      </div>
    </form>
  );
}
