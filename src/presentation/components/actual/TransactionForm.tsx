"use client";

/**
 * TransactionForm — ฟอร์มลงรายการจริง (ออกแบบให้ลงบนมือถือได้เร็ว)
 * - จำนวนเงินคิดเลขได้ เช่น "120+35×2" (Domain: evaluateAmount)
 * - ใส่ร้าน/ผู้รับ และ #tag ในโน้ตได้
 * - เดากลุ่ม/หมวดจากที่เคยจด (Domain: guessCategory) — ถ้าผู้ใช้เลือกเองแล้วจะไม่เดาทับ
 * - ผูกกับกลุ่มในแผน → หมวดตามกลุ่ม / เลือกเป้าหมาย → หมวดตามเป้า / ไม่ผูก → เลือกหมวดเอง
 * - withKeypad: แสดงแป้นตัวเลขในแอป (ใช้ในหน้าต่าง "ลงรายการเร็ว")
 * - Phase 12.2: เลือกกระเป๋า (ค่าเริ่มต้น = ที่ใช้ล่าสุด) และ "โอน" ระหว่างกระเป๋า (ไม่ใช่รับ/จ่าย — R25)
 *   preset: ค่าตั้งต้นจากปุ่มลัด เช่น "จ่ายบัตร" = โอนจากบัญชี → บัตร พร้อมยอด
 */
import { useId, useState } from "react";
import { CATEGORIES, type CategoryId } from "@/domain/entities/Category";
import { formatBaht } from "@/domain/entities/Money";
import { walletsOf, type Plan } from "@/domain/entities/Plan";
import type { Transaction, TransactionInput, TransactionType } from "@/domain/entities/Transaction";
import type { ValidationError } from "@/domain/entities/validation";
import { evaluateAmount } from "@/domain/services/amountExpression";
import { WALLET_KINDS, type Wallet } from "@/domain/entities/Wallet";
import { guessCategory, type GuessSource } from "@/domain/services/categoryGuess";
import { lastUsedWalletId } from "@/domain/services/walletBalances";
import { formatAmountInput } from "../../utils/parseAmount";
import { AmountKeypad } from "./AmountKeypad";

interface TransactionFormProps {
  plan: Plan;
  today: string;
  editing: Transaction | null;
  history: Transaction[]; // ใช้เดาหมวด
  onSubmit: (input: TransactionInput) => Promise<ValidationError[]>;
  onCancelEdit?: () => void;
  onSaved?: () => void;
  withKeypad?: boolean;
  title?: string;
  preset?: Partial<TransactionInput>;
}

const field = "h-11 w-full rounded-xl border border-slate-200 bg-white px-3 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100";

const GUESS_LABEL: Record<GuessSource, string> = {
  merchant: "ร้านที่เคยจด",
  note: "โน้ตที่เคยจด",
  tag: "#tag ที่เคยใช้",
  groupName: "ชื่อกลุ่มในแผน",
};

function initialState(editing: Transaction | null, today: string, preset: Partial<TransactionInput>, defaultWalletId: string) {
  const amount = editing?.amount ?? preset.amount;
  return {
    type: (editing?.type ?? preset.type ?? "expense") as TransactionType,
    amountText: amount ? formatAmountInput(amount) : "",
    date: editing?.date ?? today,
    merchant: editing?.merchant ?? "",
    groupId: editing?.planGroupId ?? "",
    category: (editing?.category ?? "essential") as CategoryId,
    incomeId: editing?.planIncomeId ?? "",
    goalId: editing?.goalId ?? "",
    note: editing?.note ?? preset.note ?? "",
    walletId: editing ? (editing.walletId ?? "") : (preset.walletId ?? defaultWalletId),
    toWalletId: editing?.toWalletId ?? preset.toWalletId ?? "",
  };
}

/** ตัวเลือกกระเป๋า: ใบที่ไม่ได้ซ่อน + ใบที่รายการนี้ใช้อยู่ (แม้ถูกซ่อนแล้ว) */
function walletOptions(wallets: Wallet[], ...selected: string[]) {
  return wallets
    .filter((w) => !w.archived || selected.includes(w.id))
    .map((w) => (
      <option key={w.id} value={w.id}>
        {WALLET_KINDS.find((k) => k.id === w.kind)?.icon} {w.name}
      </option>
    ));
}

export function TransactionForm({
  plan,
  today,
  editing,
  history,
  onSubmit,
  onCancelEdit,
  onSaved,
  withKeypad = false,
  title,
  preset = {},
}: TransactionFormProps) {
  const wallets = walletsOf(plan);
  const [form, setForm] = useState(() => initialState(editing, today, preset, lastUsedWalletId(plan, history) ?? ""));
  const [pickedByUser, setPickedByUser] = useState(Boolean(editing)); // เลือกกลุ่ม/หมวดเองแล้ว → ไม่เดาทับ
  const [guessSource, setGuessSource] = useState<GuessSource | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const errorId = useId();

  const set = <K extends keyof typeof form>(key: K, value: (typeof form)[K]) => {
    setForm((f) => ({ ...f, [key]: value }));
    setSaved(false);
  };

  /** พิมพ์ร้าน/โน้ต → เดากลุ่ม/หมวดให้ (ถ้าผู้ใช้ยังไม่ได้เลือกเอง) */
  function updateText(key: "merchant" | "note", value: string) {
    const next = { ...form, [key]: value };
    setForm(next);
    setSaved(false);
    if (pickedByUser || next.type !== "expense") return;
    const guess = guessCategory(plan, history, { merchant: next.merchant, note: next.note });
    setGuessSource(guess?.source ?? null);
    if (guess) setForm({ ...next, groupId: guess.planGroupId ?? "", category: guess.category });
  }

  function pick<K extends "groupId" | "category" | "goalId">(key: K, value: (typeof form)[K]) {
    setPickedByUser(true);
    setGuessSource(null);
    set(key, value);
  }

  const group = plan.expenses.find((g) => g.id === form.groupId);
  const goals = plan.goals ?? [];
  const goal = goals.find((g) => g.id === form.goalId);
  // หมวดของรายจ่าย: ตามกลุ่มที่ผูก > ตามเป้าหมายที่เลือก > ที่ผู้ใช้เลือกเอง
  const categoryFromLink = group?.category ?? goal?.category;
  const amount = form.amountText.trim() ? evaluateAmount(form.amountText) : null;

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    const parsed = evaluateAmount(form.amountText);
    if (!parsed.ok) {
      setErrors({ amount: parsed.message });
      return;
    }
    const note = form.note.trim() || undefined;
    const merchant = form.merchant.trim() || undefined;
    const walletId = form.walletId || undefined;
    let input: TransactionInput;
    if (form.type === "transfer") {
      input = { type: "transfer", date: form.date, amount: parsed.value, note, walletId, toWalletId: form.toWalletId || undefined };
    } else if (form.type === "income") {
      input = { type: "income", date: form.date, amount: parsed.value, merchant, note, walletId, planIncomeId: form.incomeId || undefined };
    } else {
      input = {
        type: "expense",
        date: form.date,
        amount: parsed.value,
        merchant,
        note,
        walletId,
        category: categoryFromLink ?? form.category,
        planGroupId: form.groupId || undefined,
        goalId: form.goalId || undefined,
      };
    }
    setSaving(true);
    const result = await onSubmit(input);
    setSaving(false);
    setErrors(Object.fromEntries(result.map((e) => [e.field, e.message])));
    if (result.length === 0) {
      setSaved(true);
      // ลงรายการถัดไปได้ทันที: ล้างจำนวน/ร้าน/โน้ต แต่คงวันที่ ประเภท และกระเป๋าไว้
      setForm((f) => ({ ...f, amountText: "", merchant: "", note: "" }));
      setPickedByUser(false);
      setGuessSource(null);
      onSaved?.();
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

  const heading = title ?? (editing ? "แก้ไขรายการ" : "ลงรายการ");

  return (
    <form onSubmit={submit} aria-label={editing ? "แก้ไขรายการ" : withKeypad ? "ลงรายการเร็ว" : "ลงรายการใหม่"} className="space-y-3">
      <h2 className="text-lg font-semibold text-slate-800">{heading}</h2>

      <div role="group" aria-label="ประเภทรายการ" className="flex gap-2">
        {typeButton("expense", "รายจ่าย", "bg-rose-600 text-white")}
        {typeButton("income", "รายรับ", "bg-emerald-600 text-white")}
        {(wallets.length >= 2 || form.type === "transfer") && typeButton("transfer", "โอน", "bg-slate-700 text-white")}
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <div className="relative">
            <span className="pointer-events-none absolute left-3 top-2.5 text-slate-400">฿</span>
            <input
              aria-label="จำนวนเงินรายการ"
              aria-invalid={errors.amount ? true : undefined}
              aria-describedby={errors.amount ? errorId : undefined}
              // มีแป้นในแอปแล้ว → ไม่ต้องเด้งแป้นของมือถือ
              inputMode={withKeypad ? "none" : "decimal"}
              placeholder="0 หรือ 120+35"
              value={form.amountText}
              onChange={(e) => set("amountText", e.target.value)}
              className={`${field} pl-7 text-right text-lg tabular-nums`}
            />
          </div>
          {/* มีแป้นตัวเลข → จองบรรทัดผลรวมไว้เสมอ ไม่ให้แป้นขยับลงตอนผลรวมโผล่ (กดพลาดปุ่ม) */}
          {(withKeypad || (amount?.ok && amount.isExpression)) && (
            <p className="mt-1 min-h-5 text-right text-sm text-slate-500" aria-live="polite">
              {amount?.ok && amount.isExpression && (
                <>
                  = <strong className="tabular-nums text-slate-800">{formatBaht(amount.value)}</strong>
                </>
              )}
            </p>
          )}
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

      {withKeypad && <AmountKeypad value={form.amountText} onChange={(v) => set("amountText", v)} />}

      {form.type === "transfer" ? (
        <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
          <select aria-label="โอนจากกระเป๋า" value={form.walletId} onChange={(e) => set("walletId", e.target.value)} className={field}>
            <option value="">— จาก —</option>
            {walletOptions(wallets, form.walletId)}
          </select>
          <span aria-hidden className="text-slate-400">
            →
          </span>
          <select aria-label="โอนเข้ากระเป๋า" value={form.toWalletId} onChange={(e) => set("toWalletId", e.target.value)} className={field}>
            <option value="">— ไป —</option>
            {walletOptions(wallets, form.toWalletId)}
          </select>
          {(errors.walletId || errors.toWalletId) && (
            <p role="alert" className="col-span-3 text-xs text-red-600">
              {errors.walletId ?? errors.toWalletId}
            </p>
          )}
        </div>
      ) : (
        wallets.length > 0 && (
          <label className="flex items-center gap-2 text-sm text-slate-600">
            <span className="shrink-0">{form.type === "income" ? "เข้ากระเป๋า" : "จ่ายจาก"}</span>
            <select aria-label="กระเป๋าเงิน" value={form.walletId} onChange={(e) => set("walletId", e.target.value)} className={field}>
              <option value="">— ไม่ระบุ —</option>
              {walletOptions(wallets, form.walletId)}
            </select>
          </label>
        )
      )}

      {form.type !== "transfer" && (
      <input
        aria-label={form.type === "income" ? "ผู้จ่าย / แหล่งที่มา" : "ร้าน / ผู้รับ"}
        placeholder={form.type === "income" ? "ผู้จ่าย / แหล่งที่มา (ไม่บังคับ)" : "ร้าน / ผู้รับ (ไม่บังคับ) เช่น ร้านข้าวมันไก่"}
        value={form.merchant}
        onChange={(e) => updateText("merchant", e.target.value)}
        className={field}
      />
      )}

      {form.type === "expense" ? (
        <div className="grid gap-3 sm:grid-cols-2">
          <select aria-label="ผูกกับกลุ่มในแผน" value={form.groupId} onChange={(e) => pick("groupId", e.target.value)} className={field}>
            <option value="">— ไม่ผูกกับกลุ่ม —</option>
            {plan.expenses.map((g) => (
              <option key={g.id} value={g.id}>
                {g.name}
              </option>
            ))}
          </select>
          {categoryFromLink ? (
            <p className="flex h-11 items-center text-sm text-slate-500">หมวด: {CATEGORIES.find((c) => c.id === categoryFromLink)?.label}</p>
          ) : (
            <select aria-label="หมวดรายการ" value={form.category} onChange={(e) => pick("category", e.target.value as CategoryId)} className={field}>
              {CATEGORIES.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.label}
                </option>
              ))}
            </select>
          )}
          {guessSource && (
            <p className="text-xs text-indigo-600 sm:col-span-2" role="status">
              ✨ เดาจาก{GUESS_LABEL[guessSource]} — เปลี่ยนได้
            </p>
          )}
          {goals.length > 0 && (
            <select aria-label="นับเข้าเป้าหมาย" value={form.goalId} onChange={(e) => pick("goalId", e.target.value)} className={`${field} sm:col-span-2`}>
              <option value="">— ไม่นับเข้าเป้าหมาย —</option>
              {goals.map((g) => (
                <option key={g.id} value={g.id}>
                  เป้าหมาย: {g.name}
                </option>
              ))}
            </select>
          )}
        </div>
      ) : form.type === "income" && (
        <select aria-label="ผูกกับรายได้ในแผน" value={form.incomeId} onChange={(e) => set("incomeId", e.target.value)} className={field}>
          <option value="">— ไม่ผูกกับรายได้ในแผน —</option>
          {plan.incomes.map((i) => (
            <option key={i.id} value={i.id}>
              {i.name}
            </option>
          ))}
        </select>
      )}

      <input
        aria-label="โน้ต"
        placeholder="โน้ต (ไม่บังคับ) ใส่ #tag ได้ เช่น ข้าวกับเพื่อน #ทำงาน"
        value={form.note}
        onChange={(e) => updateText("note", e.target.value)}
        className={field}
      />

      <div className="flex flex-wrap items-center gap-2">
        <button type="submit" disabled={saving} className="h-11 flex-1 rounded-xl bg-indigo-600 px-5 font-medium text-white hover:bg-indigo-700 disabled:opacity-60 sm:flex-none">
          {saving ? "กำลังบันทึก…" : editing ? "บันทึกการแก้ไข" : "บันทึกรายการ"}
        </button>
        {editing && onCancelEdit && (
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
