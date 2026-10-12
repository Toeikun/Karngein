import type { ReactNode } from "react";
import type { SaveStatus } from "../../hooks/usePlan";

const STATUS_TEXT: Record<SaveStatus, string> = {
  loading: "กำลังโหลด…",
  saving: "กำลังบันทึก…",
  saved: "บันทึกแล้ว",
  error: "บันทึกไม่สำเร็จ",
};

/**
 * ไอคอนแทนข้อความบนมือถือ (จอแคบ ข้อความยาวจะดันชื่อแอปจนถูกทับ)
 * ใช้ ::before → ไม่ปนกับข้อความจริง (textContent ยังเป็นข้อความเต็ม — โปรแกรมอ่านหน้าจอ/เทสต์ใช้ได้)
 */
const STATUS_ICON: Record<SaveStatus | "offline", string> = {
  loading: "max-sm:before:content-['⋯']",
  saving: "max-sm:before:content-['⋯']",
  saved: "max-sm:before:content-['✓']",
  error: "max-sm:before:content-['!']",
  offline: "max-sm:before:content-['📴']",
};

/** ช่องให้ส่วนอื่นวางของลงหัวเว็บผ่าน portal (เช่น กระดิ่งแจ้งเตือนจาก PlanContent) */
export const HEADER_SLOT_ID = "karngein-header-slot";

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
    <header className="flex items-center justify-between gap-2 sm:gap-3">
      <div className="flex min-w-0 items-center gap-2 sm:gap-3">
        <div className="grid size-10 shrink-0 place-items-center rounded-2xl bg-indigo-600 text-white shadow sm:size-11" aria-hidden>
          {/* โลโก้: เงินหลายทางไหลมารวมกัน (เหมือนไอคอนแอปใน public/icons) */}
          <svg viewBox="0 0 24 24" className="size-6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 6c6 0 6 6 11 6h7" />
            <path d="M3 18c6 0 6-6 11-6" />
            <path d="m17.5 8.5 3.5 3.5-3.5 3.5" />
          </svg>
        </div>
        <div className="min-w-0">
          <h1 className="truncate text-lg font-bold text-indigo-700 sm:text-2xl">Karngein</h1>
          <p className="hidden text-sm text-slate-500 sm:block">วางแผนรายได้-รายจ่าย เห็นภาพการเงินทั้งหมด</p>
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
        <div id={HEADER_SLOT_ID} className="contents" />
        <span
          role="status"
          aria-label="สถานะการบันทึก"
          title={text}
          className={`grid shrink-0 place-items-center whitespace-nowrap rounded-full text-xs max-sm:size-8 max-sm:text-sm sm:px-3 sm:py-1 ${tone} ${STATUS_ICON[offline && status !== "error" ? "offline" : status]}`}
        >
          <span className="max-sm:sr-only">{text}</span>
        </span>
        {account}
      </div>
    </header>
  );
}
