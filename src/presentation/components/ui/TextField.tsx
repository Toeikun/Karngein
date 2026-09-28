"use client";

/**
 * TextField — ช่องข้อความที่ "บันทึกทันทีเมื่อถูกต้อง"
 *
 * - ระหว่างพิมพ์: แสดงสิ่งที่พิมพ์ (draft) และส่งให้ onCommit ตรวจ
 * - ถ้า onCommit คืนข้อความ error → แสดงใต้ช่อง และข้อมูลจริงไม่เปลี่ยน
 * - ออกจากช่อง (blur): กลับไปแสดงค่าจริงล่าสุดที่ถูกต้อง
 */
import { useId, useState } from "react";

interface TextFieldProps {
  value: string;
  label: string;
  onCommit: (text: string) => string | null; // คืน error message หรือ null ถ้าสำเร็จ
  className?: string;
  inputClassName?: string;
  inputMode?: "text" | "decimal";
  format?: (value: string) => string; // รูปแบบตอนไม่ได้แก้ไข
}

export function TextField({
  value,
  label,
  onCommit,
  className = "",
  inputClassName = "",
  inputMode = "text",
  format = (v) => v,
}: TextFieldProps) {
  const [draft, setDraft] = useState<string | null>(null); // null = ไม่ได้กำลังแก้ไข
  const [error, setError] = useState<string | null>(null);
  const errorId = useId();

  return (
    <div className={className}>
      <input
        type="text"
        aria-label={label}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? errorId : undefined}
        inputMode={inputMode}
        value={draft ?? format(value)}
        onFocus={() => setDraft(value)}
        onChange={(event) => {
          setDraft(event.target.value);
          setError(onCommit(event.target.value));
        }}
        onBlur={() => {
          setDraft(null);
          setError(null);
        }}
        className={`h-11 w-full rounded-xl border bg-white px-3 text-slate-900 outline-none transition focus:ring-2 ${
          error
            ? "border-red-400 focus:ring-red-200"
            : "border-slate-200 focus:border-indigo-400 focus:ring-indigo-100"
        } ${inputClassName}`}
      />
      {error && (
        <p id={errorId} role="alert" className="mt-1 text-xs text-red-600">
          {error}
        </p>
      )}
    </div>
  );
}
