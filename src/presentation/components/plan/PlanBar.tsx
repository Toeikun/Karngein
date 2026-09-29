"use client";

/**
 * PlanBar — เลือก/สร้าง/เปลี่ยนชื่อ/ลบแผน และส่งออก/นำเข้าไฟล์สำรอง
 */
import { useRef, useState } from "react";
import { renamePlan } from "@/application/usecases/plans";
import type { Plan } from "@/domain/entities/Plan";
import type { PlanListItem, RunUseCase } from "../../hooks/usePlan";
import { downloadText, safeFileName } from "../../utils/download";
import { todayIso } from "../../utils/parseAmount";
import { readText } from "../../utils/readText";
import { errorFor } from "../ui/MoneyEntryFields";
import { TextField } from "../ui/TextField";

interface PlanBarProps {
  plan: Plan;
  plans: PlanListItem[];
  run: RunUseCase;
  storageNote: string;
  onSwitch: (id: string) => void;
  onCreate: () => void;
  onDelete: () => void;
  onImport: (text: string) => Promise<string | null>;
  onExport: () => string | null;
}

export function PlanBar({ plan, plans, run, storageNote, onSwitch, onCreate, onDelete, onImport, onExport }: PlanBarProps) {
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState<{ tone: "error" | "ok"; text: string } | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  // แผนที่เปิดอยู่ใช้ชื่อล่าสุดจาก state (รายชื่อจาก storage อาจยังไม่อัปเดตระหว่างรอบันทึก)
  const options = plans.some((p) => p.id === plan.id) ? plans : [{ id: plan.id, name: plan.name }, ...plans];
  const button = "h-11 rounded-xl px-4 text-sm font-medium transition";

  async function handleFile(file: File) {
    const error = await onImport(await readText(file));
    setMessage(error ? { tone: "error", text: error } : { tone: "ok", text: `นำเข้า "${file.name}" แล้ว` });
  }

  return (
    <section aria-label="จัดการแผน" className="rounded-3xl bg-white p-3 shadow-sm ring-1 ring-slate-100">
      <div className="flex flex-wrap items-center gap-2">
        <label htmlFor="plan-select" className="text-sm text-slate-500">
          แผน
        </label>
        <select
          id="plan-select"
          value={plan.id}
          onChange={(event) => onSwitch(event.target.value)}
          className="h-11 min-w-0 flex-1 basis-[calc(100%-3rem)] rounded-xl border border-slate-200 bg-white px-3 font-medium text-slate-800 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 sm:flex-none sm:basis-64"
        >
          {options.map((p) => (
            <option key={p.id} value={p.id}>
              {p.id === plan.id ? plan.name : p.name}
            </option>
          ))}
        </select>
        <button type="button" onClick={onCreate} className={`${button} flex-1 bg-indigo-50 sm:flex-none text-indigo-700 hover:bg-indigo-100`}>
          + แผนใหม่
        </button>
        <button
          type="button"
          aria-expanded={open}
          aria-controls="plan-tools"
          onClick={() => setOpen(!open)}
          className={`${button} flex-1 text-slate-600 hover:bg-slate-100 sm:flex-none`}
        >
          จัดการแผน {open ? "▴" : "▾"}
        </button>
      </div>

      {open && (
        <div id="plan-tools" className="mt-3 space-y-3 border-t border-slate-100 pt-3">
          <div>
            <p className="mb-1 text-sm text-slate-500">ชื่อแผน</p>
            <TextField
              label="ชื่อแผน"
              value={plan.name}
              className="max-w-md"
              onCommit={(name) => errorFor(run((p, ctx) => renamePlan(p, name, ctx)), "name")}
            />
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              className={`${button} bg-slate-100 text-slate-700 hover:bg-slate-200`}
              onClick={() => {
                const content = onExport();
                if (content) downloadText(`karngein-${safeFileName(plan.name)}-${todayIso()}.json`, content);
              }}
            >
              ส่งออกไฟล์สำรอง (JSON)
            </button>
            <button type="button" className={`${button} bg-slate-100 text-slate-700 hover:bg-slate-200`} onClick={() => fileInput.current?.click()}>
              นำเข้าไฟล์สำรอง
            </button>
            <input
              ref={fileInput}
              type="file"
              accept="application/json,.json"
              aria-label="เลือกไฟล์สำรองที่จะนำเข้า"
              className="hidden"
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) void handleFile(file);
                event.target.value = ""; // เลือกไฟล์เดิมซ้ำได้
              }}
            />
            <button
              type="button"
              className={`${button} text-red-600 hover:bg-red-50`}
              onClick={() => {
                if (window.confirm(`ลบแผน "${plan.name}" ถาวร? การลบย้อนกลับไม่ได้`)) onDelete();
              }}
            >
              ลบแผนนี้
            </button>
          </div>
          {message && (
            <p role={message.tone === "error" ? "alert" : "status"} className={`text-sm ${message.tone === "error" ? "text-red-600" : "text-emerald-700"}`}>
              {message.text}
            </p>
          )}
          <p className="text-xs text-slate-500">{storageNote}</p>
        </div>
      )}
    </section>
  );
}
