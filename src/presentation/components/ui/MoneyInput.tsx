"use client";

/**
 * MoneyInput — ช่องจำนวนเงิน: แสดง "30,000" แต่เก็บค่าเป็นตัวเลข 30000
 * มือถือจะเปิดแป้นตัวเลข (inputMode="decimal")
 */
import { formatAmountInput, parseAmount } from "../../utils/parseAmount";
import { TextField } from "./TextField";

interface MoneyInputProps {
  value: number;
  label: string;
  onCommit: (value: number) => string | null;
  className?: string;
}

export function MoneyInput({ value, label, onCommit, className = "" }: MoneyInputProps) {
  return (
    <div className={`relative ${className}`}>
      <span className="pointer-events-none absolute left-3 top-2.5 text-slate-400">฿</span>
      <TextField
        label={label}
        value={String(value)}
        inputMode="decimal"
        format={(v) => formatAmountInput(Number(v))}
        inputClassName="pl-7 text-right tabular-nums"
        onCommit={(text) => {
          const parsed = parseAmount(text);
          return parsed.ok ? onCommit(parsed.value) : parsed.message;
        }}
      />
    </div>
  );
}
