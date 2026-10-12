"use client";

/**
 * NotificationBell — กระดิ่งรวมการแจ้งเตือนในแอป (R34) อยู่มุมบนขวา (วางผ่าน portal เข้าไปที่ Header)
 * บัตรใกล้/เกินกำหนด → มีปุ่ม "จ่ายบัตร" เปิดแผ่นโอนกรอกยอดให้
 */
import { useEffect, useRef, useState } from "react";
import type { Notice } from "@/domain/services/cycleInsights";

const TONE: Record<Notice["tone"], string> = {
  danger: "bg-red-50 text-red-800",
  warning: "bg-amber-50 text-amber-900",
  info: "bg-slate-50 text-slate-700",
};
const ICON: Record<Notice["kind"], string> = {
  "card-overdue": "⛔",
  "card-due": "💳",
  "over-budget": "🔥",
  pace: "⏩",
  unlinked: "🧩",
};

export function NotificationBell({ notices, onPayCard }: { notices: Notice[]; onPayCard: (notice: Notice) => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const close = (event: Event) => {
      if (event instanceof KeyboardEvent ? event.key === "Escape" : !ref.current?.contains(event.target as Node)) setOpen(false);
    };
    window.addEventListener("keydown", close);
    window.addEventListener("pointerdown", close);
    return () => {
      window.removeEventListener("keydown", close);
      window.removeEventListener("pointerdown", close);
    };
  }, [open]);

  const urgent = notices.some((n) => n.tone === "danger");
  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        aria-label={`การแจ้งเตือน (${notices.length})`}
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className="relative grid size-11 place-items-center rounded-full bg-white text-base sm:text-lg shadow-sm ring-1 ring-slate-200 hover:bg-slate-50"
      >
        <span aria-hidden>🔔</span>
        {notices.length > 0 && (
          <span aria-hidden className={`absolute -top-0.5 -right-0.5 grid min-w-5 place-items-center rounded-full px-1 text-[11px] font-bold text-white ${urgent ? "bg-red-600" : "bg-amber-500"}`}>
            {notices.length}
          </span>
        )}
      </button>
      {/* มือถือ: กว้างเต็มจอ เว้นขอบ 16px (เคยยึดขอบขวาของกระดิ่งแล้วล้นจอด้านซ้ายบนจอ 360px) */}
      {open && (
        <div role="region" aria-label="รายการแจ้งเตือน" className="z-40 space-y-2 rounded-3xl bg-white p-3 shadow-xl ring-1 ring-slate-200 max-sm:fixed max-sm:inset-x-4 max-sm:top-20 sm:absolute sm:right-0 sm:top-full sm:mt-2 sm:w-80">
          <h2 className="px-1 text-sm font-semibold text-slate-800">การแจ้งเตือน</h2>
          {notices.length === 0 ? (
            <p className="px-1 pb-1 text-sm text-slate-500">ไม่มีเรื่องต้องห่วง 👍</p>
          ) : (
            <ul className="space-y-2">
              {notices.map((n, i) => (
                <li key={`${n.kind}-${i}`} className={`flex items-start gap-2 rounded-2xl p-3 text-sm ${TONE[n.tone]}`}>
                  <span aria-hidden>{ICON[n.kind]}</span>
                  <span className="min-w-0 flex-1">
                    <strong className="block">{n.title}</strong>
                    <span className="text-xs">{n.detail}</span>
                  </span>
                  {n.walletId && (
                    <button
                      type="button"
                      onClick={() => {
                        setOpen(false);
                        onPayCard(n);
                      }}
                      className="h-11 shrink-0 rounded-xl bg-white px-3 text-xs font-semibold ring-1 ring-current"
                    >
                      จ่ายบัตร
                    </button>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
