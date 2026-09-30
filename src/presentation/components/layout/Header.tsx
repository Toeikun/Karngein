import type { ReactNode } from "react";
import type { SaveStatus } from "../../hooks/usePlan";

const STATUS_TEXT: Record<SaveStatus, string> = {
  loading: "กำลังโหลด…",
  saving: "กำลังบันทึก…",
  saved: "บันทึกแล้ว",
  error: "บันทึกไม่สำเร็จ",
};

interface HeaderProps {
  status: SaveStatus;
  /** โหมดคลาวด์ + ออฟไลน์ → แจ้งว่าบันทึกในเครื่องไว้ก่อน */
  offline?: boolean;
  account?: ReactNode;
}

export function Header({ status, offline = false, account }: HeaderProps) {
  const text = offline && status !== "error" ? "ออฟไลน์ · บันทึกในเครื่องแล้ว" : STATUS_TEXT[status];
  const tone =
    status === "error" ? "bg-red-100 text-red-700" : offline ? "bg-amber-100 text-amber-800" : "bg-white text-slate-500 ring-1 ring-slate-200";

  return (
    <header className="flex items-center justify-between gap-3">
      <div className="flex min-w-0 items-center gap-3">
        <div className="grid size-11 shrink-0 place-items-center rounded-2xl bg-indigo-600 text-white shadow" aria-hidden>
          {/* โลโก้: เงินหลายทางไหลมารวมกัน (เหมือนไอคอนแอปใน public/icons) */}
          <svg viewBox="0 0 24 24" className="size-6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 6c6 0 6 6 11 6h7" />
            <path d="M3 18c6 0 6-6 11-6" />
            <path d="m17.5 8.5 3.5 3.5-3.5 3.5" />
          </svg>
        </div>
        <div className="min-w-0">
          <h1 className="text-xl font-bold text-indigo-700 sm:text-2xl">Karngein</h1>
          <p className="hidden text-sm text-slate-500 sm:block">วางแผนรายได้-รายจ่าย เห็นภาพการเงินทั้งหมด</p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <span role="status" aria-label="สถานะการบันทึก" className={`shrink-0 whitespace-nowrap rounded-full px-3 py-1 text-xs ${tone}`}>
          {text}
        </span>
        {account}
      </div>
    </header>
  );
}
