"use client";

/**
 * MoneyEntryFields — ช่อง "จำนวนเงิน + ความถี่ (+ วันที่ ถ้าครั้งเดียว / + เดือนที่จ่าย ถ้ารายปี)"
 * ใช้ร่วมกันทั้งรายได้ รายการย่อยของรายจ่าย และกลุ่มที่ไม่มีรายการย่อย
 */
import { FREQUENCIES, FREQUENCY_LABELS, type Frequency } from "@/domain/entities/Frequency";
import { DEFAULT_YEAR } from "@/domain/entities/Period";
import type { ValidationError } from "@/domain/entities/validation";
import { todayIso } from "../../utils/parseAmount";
import { THAI_MONTHS } from "../../utils/periodLabel";
import { MoneyInput } from "./MoneyInput";
import { Select } from "./Select";

export interface MoneyEntryChanges {
  amount?: number;
  frequency?: Frequency;
  date?: string;
}

interface MoneyEntryFieldsProps {
  name: string; // ใช้ประกอบ label เช่น "จำนวนเงิน เงินเดือน"
  amount: number;
  frequency: Frequency;
  date?: string;
  onChange: (changes: MoneyEntryChanges) => ValidationError[];
}

const frequencyOptions = FREQUENCIES.map((f) => ({ value: f, label: FREQUENCY_LABELS[f] }));
// รายปี: เลือกเดือนที่จ่าย (เก็บเป็นวันที่ 1 ของเดือนนั้น — ใช้แค่เดือน ปีไม่มีผล) / ไม่เลือก = เฉลี่ยทุกเดือน
const yearlyMonthOptions = [
  { value: "", label: "เฉลี่ยทุกเดือน" },
  ...THAI_MONTHS.map((m, i) => ({ value: String(i + 1), label: `จ่าย ${m}` })),
];

/** error แรกของช่องนั้น (หรือ null) */
export const errorFor = (errors: ValidationError[], field: string) =>
  errors.find((e) => e.field === field)?.message ?? null;

export function MoneyEntryFields({ name, amount, frequency, date, onChange }: MoneyEntryFieldsProps) {
  return (
    <div className="flex flex-wrap items-start gap-2">
      <MoneyInput
        label={`จำนวนเงิน ${name}`}
        value={amount}
        className="min-w-0 flex-1 basis-28"
        onCommit={(value) => errorFor(onChange({ amount: value }), "amount")}
      />
      <Select
        label={`ความถี่ ${name}`}
        value={frequency}
        options={frequencyOptions}
        className="w-28"
        onChange={(value) =>
          // เลือก "ครั้งเดียว" → ใส่วันนี้เป็นค่าเริ่มต้น ผู้ใช้แก้ได้
          onChange(value === "one-time" ? { frequency: value, date: date ?? todayIso() } : { frequency: value })
        }
      />
      {frequency === "yearly" && (
        <Select
          label={`เดือนที่จ่าย ${name}`}
          value={date ? String(Number(date.slice(5, 7))) : ""}
          options={yearlyMonthOptions}
          className="w-36"
          onChange={(value) => onChange({ date: value ? `${DEFAULT_YEAR}-${value.padStart(2, "0")}-01` : undefined })}
        />
      )}
      {frequency === "one-time" && (
        <input
          type="date"
          aria-label={`วันที่ ${name}`}
          value={date ?? ""}
          onChange={(event) => {
            if (event.target.value) onChange({ date: event.target.value });
          }}
          className="h-11 w-40 rounded-xl border border-slate-200 bg-white px-2 text-sm text-slate-700 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
        />
      )}
    </div>
  );
}
