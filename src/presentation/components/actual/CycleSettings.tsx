"use client";

/** ตั้งวันเริ่มรอบเงินเดือน (พับเก็บไว้ — ตั้งครั้งเดียวแล้วไม่ค่อยเปลี่ยน) */
const DAYS = Array.from({ length: 31 }, (_, i) => i + 1);

export function CycleSettings({ startDay, onChange }: { startDay: number; onChange: (day: number) => void }) {
  return (
    <details className="group px-1 text-sm text-slate-600">
      <summary className="inline-flex min-h-11 cursor-pointer list-none items-center gap-1 rounded-xl px-2 hover:bg-white/70">
        ⚙️ รอบเงินเดือนเริ่มวันที่ {startDay}
        <span className="text-xs text-slate-400 group-open:rotate-180" aria-hidden>
          ▾
        </span>
      </summary>
      <div className="mt-1 flex flex-wrap items-center gap-2 rounded-2xl bg-white p-3 ring-1 ring-slate-100">
        <label htmlFor="pay-cycle-day">รอบเงินเดือนเริ่มวันที่</label>
        <select
          id="pay-cycle-day"
          value={startDay}
          onChange={(event) => onChange(Number(event.target.value))}
          className="h-11 rounded-xl border border-slate-200 bg-white px-2 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
        >
          {DAYS.map((d) => (
            <option key={d} value={d}>
              {d}
            </option>
          ))}
        </select>
        <span className="text-xs text-slate-500">เช่น เงินเดือนออกวันที่ 25 → รอบ 25 – 24 เดือนถัดไป</span>
      </div>
    </details>
  );
}
