import type { SaveStatus } from "../../hooks/usePlan";

const STATUS_TEXT: Record<SaveStatus, string> = {
  loading: "กำลังโหลด…",
  saving: "กำลังบันทึก…",
  saved: "บันทึกแล้ว",
  error: "บันทึกไม่สำเร็จ",
};

export function Header({ status }: { status: SaveStatus }) {
  return (
    <header className="flex items-center justify-between gap-3">
      <div className="flex items-center gap-3">
        <div className="grid size-11 place-items-center rounded-2xl bg-indigo-600 text-white shadow" aria-hidden>
          <svg viewBox="0 0 24 24" className="size-6" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M3 17c3-6 6-6 9-2s6 4 9-2" strokeLinecap="round" />
            <path d="M3 7h6M15 7h6" strokeLinecap="round" />
          </svg>
        </div>
        <div>
          <h1 className="text-xl font-bold text-indigo-700 sm:text-2xl">Karngein</h1>
          <p className="text-xs text-slate-500 sm:text-sm">วางแผนรายได้-รายจ่าย เห็นภาพการเงินทั้งหมด</p>
        </div>
      </div>
      <span
        role="status"
        aria-label="สถานะการบันทึก"
        className={`shrink-0 whitespace-nowrap rounded-full px-3 py-1 text-xs ${status === "error" ? "bg-red-100 text-red-700" : "bg-white text-slate-500 ring-1 ring-slate-200"}`}
      >
        {STATUS_TEXT[status]}
      </span>
    </header>
  );
}
