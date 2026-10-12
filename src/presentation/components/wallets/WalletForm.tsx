"use client";

/**
 * WalletForm — เพิ่ม/แก้กระเป๋าเงิน (Phase 12.2)
 * บัตรเครดิต: ใส่ยอดค้าง + วงเงิน + วันตัดรอบ/ครบกำหนด (ไม่บังคับ — ใส่แล้วแอปเตือนก่อนครบกำหนดได้)
 */
import { useState } from "react";
import type { ValidationError } from "@/domain/entities/validation";
import { WALLET_KINDS, type Wallet, type WalletInput, type WalletKind } from "@/domain/entities/Wallet";
import { formatAmountInput, parseAmount } from "../../utils/parseAmount";

interface WalletFormProps {
  editing: Wallet | null;
  onSubmit: (input: WalletInput) => ValidationError[];
  onCancel: () => void;
}

const field = "h-11 w-full rounded-xl border border-slate-200 bg-white px-3 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100";
const DAYS = Array.from({ length: 31 }, (_, i) => i + 1);

export function WalletForm({ editing, onSubmit, onCancel }: WalletFormProps) {
  const [name, setName] = useState(editing?.name ?? "");
  const [kind, setKind] = useState<WalletKind>(editing?.kind ?? "bank");
  const [openingText, setOpeningText] = useState(editing ? formatAmountInput(editing.openingBalance) : "0");
  const [limitText, setLimitText] = useState(editing?.creditLimit ? formatAmountInput(editing.creditLimit) : "");
  const [statementDay, setStatementDay] = useState(editing?.statementDay ? String(editing.statementDay) : "");
  const [dueDay, setDueDay] = useState(editing?.dueDay ? String(editing.dueDay) : "");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const credit = kind === "credit";

  function submit(event: React.FormEvent) {
    event.preventDefault();
    const opening = openingText.trim() === "" ? { ok: true as const, value: 0 } : parseAmount(openingText);
    const limit = limitText.trim() === "" ? null : parseAmount(limitText);
    const localErrors: Record<string, string> = {};
    if (!opening.ok) localErrors.openingBalance = opening.message;
    if (limit && !limit.ok) localErrors.creditLimit = limit.message;
    if (Object.keys(localErrors).length > 0) {
      setErrors(localErrors);
      return;
    }
    const input: WalletInput = {
      name,
      kind,
      openingBalance: opening.ok ? opening.value : 0,
      ...(credit && limit?.ok ? { creditLimit: limit.value } : {}),
      ...(credit && statementDay ? { statementDay: Number(statementDay) } : {}),
      ...(credit && dueDay ? { dueDay: Number(dueDay) } : {}),
      ...(editing?.archived ? { archived: true } : {}),
    };
    setErrors(Object.fromEntries(onSubmit(input).map((e) => [e.field, e.message])));
  }

  const error = (key: string) =>
    errors[key] && (
      <p role="alert" className="mt-1 text-xs text-red-600">
        {errors[key]}
      </p>
    );

  const title = editing ? "แก้ไขกระเป๋า" : "เพิ่มกระเป๋า";
  return (
    <form onSubmit={submit} aria-label={title} className="space-y-3 rounded-3xl bg-white p-4 shadow-sm ring-1 ring-indigo-100 sm:p-5">
      <h2 className="text-lg font-semibold text-slate-800">{title}</h2>

      <div role="group" aria-label="ชนิดกระเป๋า" className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {WALLET_KINDS.map((k) => (
          <button
            key={k.id}
            type="button"
            aria-pressed={kind === k.id}
            onClick={() => setKind(k.id)}
            className={`flex h-11 items-center justify-center gap-1 rounded-xl px-2 text-sm font-medium transition ${kind === k.id ? "bg-indigo-600 text-white" : "bg-slate-100 text-slate-700"}`}
          >
            <span aria-hidden>{k.icon}</span>
            {k.label}
          </button>
        ))}
      </div>

      <div>
        <input
          aria-label="ชื่อกระเป๋า"
          placeholder={credit ? "เช่น บัตร KTC" : kind === "cash" ? "เช่น เงินสดในกระเป๋า" : "เช่น KBank ออมทรัพย์"}
          value={name}
          onChange={(e) => setName(e.target.value)}
          className={field}
        />
        {error("name")}
      </div>

      <label className="block text-sm text-slate-600">
        {credit ? "ยอดค้างตอนเริ่มจด" : "เงินที่มีตอนเริ่มจด"}
        <div className="relative mt-1">
          <span className="pointer-events-none absolute left-3 top-2.5 text-slate-400">฿</span>
          <input
            aria-label={credit ? "ยอดค้างตอนเริ่มจด" : "เงินที่มีตอนเริ่มจด"}
            inputMode="decimal"
            value={openingText}
            onChange={(e) => setOpeningText(e.target.value)}
            className={`${field} pl-7 text-right`}
          />
        </div>
        {error("openingBalance")}
      </label>

      {credit && (
        <div className="grid gap-3 sm:grid-cols-3">
          <label className="text-sm text-slate-600">
            วงเงิน (ไม่บังคับ)
            <div className="relative mt-1">
              <span className="pointer-events-none absolute left-3 top-2.5 text-slate-400">฿</span>
              <input aria-label="วงเงินบัตร" inputMode="decimal" value={limitText} onChange={(e) => setLimitText(e.target.value)} className={`${field} pl-7 text-right`} />
            </div>
            {error("creditLimit")}
          </label>
          <label className="text-sm text-slate-600">
            วันตัดรอบ
            <select aria-label="วันตัดรอบบัตร" value={statementDay} onChange={(e) => setStatementDay(e.target.value)} className={`${field} mt-1`}>
              <option value="">— ไม่ระบุ —</option>
              {DAYS.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
            {error("statementDay")}
          </label>
          <label className="text-sm text-slate-600">
            วันครบกำหนดชำระ
            <select aria-label="วันครบกำหนดชำระ" value={dueDay} onChange={(e) => setDueDay(e.target.value)} className={`${field} mt-1`}>
              <option value="">— ไม่ระบุ —</option>
              {DAYS.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
            {error("dueDay")}
          </label>
          <p className="text-xs text-slate-500 sm:col-span-3">ใส่วันตัดรอบ + ครบกำหนด → แอปคำนวณยอดบิลและเตือนก่อนครบกำหนด 3 วัน</p>
        </div>
      )}

      <div className="flex gap-2">
        <button type="submit" className="h-11 flex-1 rounded-xl bg-indigo-600 px-5 font-medium text-white hover:bg-indigo-700 sm:flex-none">
          {editing ? "บันทึกการแก้ไข" : "บันทึกกระเป๋า"}
        </button>
        <button type="button" onClick={onCancel} className="h-11 rounded-xl px-4 text-slate-600 hover:bg-slate-100">
          ยกเลิก
        </button>
      </div>
    </form>
  );
}
