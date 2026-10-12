"use client";

/**
 * QuickAddSheet — หน้าต่าง "ลงรายการเร็ว" เปิดจากปุ่ม + ลอย (ใช้ได้ทุกแท็บ)
 * มีแป้นตัวเลขคิดเลขได้ · บันทึกแล้วปิดเอง · กด Esc หรือพื้นหลังเพื่อปิด
 */
import { useEffect } from "react";
import type { Plan } from "@/domain/entities/Plan";
import type { Transaction, TransactionInput } from "@/domain/entities/Transaction";
import type { ValidationError } from "@/domain/entities/validation";
import { TransactionForm } from "./TransactionForm";

interface QuickAddSheetProps {
  plan: Plan;
  today: string;
  history: Transaction[];
  onSubmit: (input: TransactionInput) => Promise<ValidationError[]>;
  onClose: () => void;
}

export function QuickAddSheet({ plan, today, history, onSubmit, onClose }: QuickAddSheetProps) {
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => event.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/40 sm:items-center" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label="ลงรายการเร็ว"
        onClick={(event) => event.stopPropagation()}
        className="max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-t-3xl bg-white p-4 shadow-xl sm:rounded-3xl sm:p-5"
      >
        <div className="mb-1 flex justify-end">
          <button type="button" onClick={onClose} aria-label="ปิด" className="grid size-11 place-items-center rounded-xl text-xl text-slate-500 hover:bg-slate-100">
            ×
          </button>
        </div>
        <TransactionForm plan={plan} today={today} editing={null} history={history} withKeypad title="ลงรายการเร็ว" onSubmit={onSubmit} onSaved={onClose} />
      </div>
    </div>
  );
}
