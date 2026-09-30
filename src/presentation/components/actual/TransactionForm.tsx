"use client";

/**
 * TransactionForm — ฟอร์มลงรายการจริง (ออกแบบให้ลงบนมือถือได้เร็ว)
 * - เลือกรายจ่าย/รายรับ → กรอกจำนวน → (เลือกกลุ่มในแผน) → บันทึก
 * - ผูกกับกลุ่มในแผน → หมวดตามกลุ่มอัตโนมัติ / ไม่ผูก → เลือกหมวดเอง
 * - editing = รายการที่กำลังแก้ (ถ้ามี)
 */
import { useId, useState } from "react";
import { CATEGORIES, type CategoryId } from "@/domain/entities/Category";
import type { Plan } from "@/domain/entities/Plan";
import type { Transaction, TransactionInput, TransactionType } from "@/domain/entities/Transaction";
import type { ValidationError } from "@/domain/entities/validation";
import { formatAmountInput, parseAmount } from "../../utils/parseAmount";

interface TransactionFormProps {
  plan: Plan;
  today: string;
  editing: Transaction | null;
  onSubmit: (input: TransactionInput) => Promise<ValidationError[]>;
  onCancelEdit: () => void;
}

const field = "h-11 w-full rounded-xl border border-slate-200 bg-white px-3 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100";

function initialState(editing: Transaction | null, today: string) {
  return {
    type: (editing?.type ?? "expense") as TransactionType,
    amountText: editing ? formatAmountInput(editing.amount) : "",
    date: editing?.date ?? today,
    groupId: editing?.planGroupId ?? "",
    category: (editing?.category ?? "essential") as CategoryId,
    incomeId: editing?.planIncomeId ?? "",
    goalId: editing?.goalId ?? "",
    note: editing?.note ?? "",
  };
}

export function TransactionForm({ plan, today, editing, onSubmit, onCancelEdit }: TransactionFormProps) {
  const [form, setForm] = useState(() => initialState(editing, today));
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const errorId = useId();
  const set = <K extends keyof typeof form>(key: K, value: (typeof form)[K]) => {
    setForm((f) => ({ ...f, [key]: value }));
    setSaved(false);
  };

  const group = plan.expenses.find((g) => g.id === form.groupId);
  const goals = plan.goals ?? [];
  const goal = goals.find((g) => g.id === form.goalId);
  // หมวดของรายจ่าย: ตามกลุ่มที่ผูก > ตามเป้าหมายที่เลือก > ที่ผู้ใช้เลือกเอง
  const categoryFromLink = group?.category ?? goal?.category;

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    const amount = parseAmount(form.amountText);
    if (!amount.ok) {
      setErrors({ amount: amount.message });
      return;
    }
    const note = form.note.trim() || undefined;
    const input: TransactionInput =
      form.type === "income"
        ? { type: "income", date: form.date, amount: amount.value, note, planIncomeId: form.incomeId || undefined }
        : {
            type: "expense",
            date: form.date,
            amount: amount.value,
            note,
            category: categoryFromLink ?? form.category,
            planGroupId: form.groupId || undefined,
            goalId: form.goalId || undefined,
          };
    setSaving(true);
    const result = await onSubmit(input);
    setSaving(false);
    setErrors(Object.fromEntries(result.map((e) => [e.field, e.message])));
    if (result.length === 0) {
      setSaved(true);
      // ลงรายการถัดไปได้ทันที: ล้างจำนวน/โน้ต แต่คงวันที่และประเภทไว้
      setForm((f) => ({ ...f, amountText: "", note: "" }));
    }
  }

  const typeButton = (type: TransactionType, label: string, active: string) => (
    <button
      type="button"
      aria-pressed={form.type === type}
      onClick={() => set("type", type)}
      className={`h-11 flex-1 rounded-xl text-sm font-medium transition ${form.type === type ? active : "bg-slate-100 text-slate-700"}`}
    >
      {label}
    </button>
  );

  return (
    <form onSubmit={submit} aria-label={editing ? "แก้ไขรายการ" : "ลงรายการใหม่"} className="space-y-3 rounded-3xl bg-white p-4 shadow-sm ring-1 ring-slate-100 sm:p-5">
      <h2 className="text-lg font-semibold text-slate-800">{editing ? "แก้ไขรายการ" : "ลงรายการ"}</h2>

      <div role="group" aria-label="ประเภทรายการ" className="flex gap-2">
        {typeButton("expense", "รายจ่าย", "bg-rose-600 text-white")}
        {typeButton("income", "รายรับ", "bg-emerald-600 text-white")}
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <div className="relative">
            <span className="pointer-events-none absolute left-3 top-2.5 text-slate-400">฿</span>
            <input
              aria-label="จำนวนเงินรายการ"
              aria-invalid={errors.amount ? true : undefined}
              aria-describedby={errors.amount ? errorId : undefined}
              inputMode="decimal"
              placeholder="0"
              value={form.amountText}
              onChange={(e) => set("amountText", e.target.value)}
              className={`${field} pl-7 text-right text-lg tabular-nums`}
            />
          </div>
          {errors.amount && (
            <p id={errorId} role="alert" className="mt-1 text-xs text-red-600">
              {errors.amount}
            </p>
          )}
        </div>
        <div>
          <input type="date" aria-label="วันที่รายการ" value={form.date} onChange={(e) => e.target.value && set("date", e.target.value)} className={field} />
          {errors.date && <p className="mt-1 text-xs text-red-600">{errors.date}</p>}
        </div>
      </div>

      {form.type === "expense" ? (
        <div className="grid gap-3 sm:grid-cols-2">
          <select aria-label="ผูกกับกลุ่มในแผน" value={form.groupId} onChange={(e) => set("groupId", e.target.value)} className={field}>
            <option value="">— ไม่ผูกกับกลุ่ม —</option>
            {plan.expenses.map((g) => (
              <option key={g.id} value={g.id}>
                {g.name}
              </option>
            ))}
          </select>
          {categoryFromLink ? (
            <p className="flex h-11 items-center text-sm text-slate-500">
              หมวด: {CATEGORIES.find((c) => c.id === categoryFromLink)?.label}
            </p>
          ) : (
            <select aria-label="หมวดรายการ" value={form.category} onChange={(e) => set("category", e.target.value as CategoryId)} className={field}>
              {CATEGORIES.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.label}
                </option>
              ))}
            </select>
          )}
          {goals.length > 0 && (
            <select aria-label="นับเข้าเป้าหมาย" value={form.goalId} onChange={(e) => set("goalId", e.target.value)} className={`${field} sm:col-span-2`}>
              <option value="">— ไม่นับเข้าเป้าหมาย —</option>
              {goals.map((g) => (
                <option key={g.id} value={g.id}>
                  เป้าหมาย: {g.name}
                </option>
              ))}
            </select>
          )}
        </div>
      ) : (
        <select aria-label="ผูกกับรายได้ในแผน" value={form.incomeId} onChange={(e) => set("incomeId", e.target.value)} className={field}>
          <option value="">— ไม่ผูกกับรายได้ในแผน —</option>
          {plan.incomes.map((i) => (
            <option key={i.id} value={i.id}>
              {i.name}
            </option>
          ))}
        </select>
      )}

      <input aria-label="โน้ต" placeholder="โน้ต (ไม่บังคับ) เช่น ข้าวกลางวัน" value={form.note} onChange={(e) => set("note", e.target.value)} className={field} />

      <div className="flex flex-wrap items-center gap-2">
        <button type="submit" disabled={saving} className="h-11 flex-1 rounded-xl bg-indigo-600 px-5 font-medium text-white hover:bg-indigo-700 disabled:opacity-60 sm:flex-none">
          {saving ? "กำลังบันทึก…" : editing ? "บันทึกการแก้ไข" : "บันทึกรายการ"}
        </button>
        {editing && (
          <button type="button" onClick={onCancelEdit} className="h-11 rounded-xl px-4 text-slate-600 hover:bg-slate-100">
            ยกเลิก
          </button>
        )}
        {saved && !editing && (
          <span role="status" className="text-sm text-emerald-700">
            บันทึกแล้ว ✓
          </span>
        )}
      </div>
    </form>
  );
}
