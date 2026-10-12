"use client";

/**
 * QuickAddSheet — แผ่นลงรายการที่เลื่อนขึ้นจากด้านล่าง (ใช้ทั้ง "ลงรายการเร็ว" และ "แก้ไขรายการ")
 * - ปุ่ม + ในแถบล่าง → ลงรายการใหม่ / แตะรายการในลิสต์ → แก้ไข (มีปุ่มลบในแผ่นนี้)
 * - มีแป้นตัวเลขคิดเลขได้ · บันทึกแล้วปิดเอง · กด Esc / พื้นหลัง / × เพื่อปิด
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
  editing?: Transaction | null;
  preset?: Partial<TransactionInput>; // ค่าตั้งต้นจากปุ่มลัด เช่น "จ่ายบัตร"
  onSubmit: (input: TransactionInput) => Promise<ValidationError[]>;
  onDelete?: (transaction: Transaction) => void;
  onClose: () => void;
}

export function QuickAddSheet({ plan, today, history, editing = null, preset, onSubmit, onDelete, onClose }: QuickAddSheetProps) {
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => event.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const title = editing ? "แก้ไขรายการ" : "ลงรายการเร็ว";
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/40 sm:items-center" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onClick={(event) => event.stopPropagation()}
        className="max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-t-3xl bg-white p-4 pb-[max(1rem,env(safe-area-inset-bottom))] shadow-xl sm:rounded-3xl sm:p-5"
      >
        <div className="mx-auto mb-1 h-1.5 w-10 rounded-full bg-slate-200 sm:hidden" aria-hidden />
        <div className="mb-1 flex justify-end gap-1">
          {editing && onDelete && (
            <button
              type="button"
              onClick={() => onDelete(editing)}
              className="h-11 rounded-xl px-3 text-sm font-medium text-red-600 hover:bg-red-50"
            >
              ลบรายการนี้
            </button>
          )}
          <button type="button" onClick={onClose} aria-label="ปิด" className="grid size-11 place-items-center rounded-xl text-xl text-slate-500 hover:bg-slate-100">
            ×
          </button>
        </div>
        <TransactionForm
          key={editing?.id ?? "new"}
          plan={plan}
          today={today}
          editing={editing}
          history={history}
          withKeypad
          title={title}
          preset={preset}
          onSubmit={onSubmit}
          onSaved={onClose}
          onCancelEdit={onClose}
        />
      </div>
    </div>
  );
}
