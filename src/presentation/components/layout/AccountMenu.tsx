"use client";

import { useState } from "react";
import type { AuthUser } from "@/application/ports/AuthService";

interface AccountMenuProps {
  status: "disabled" | "loading" | "signedOut" | "signedIn";
  user: AuthUser | null;
  error: string | null;
  onSignIn: () => void;
  onSignOut: () => void;
}

const GoogleIcon = () => (
  <svg viewBox="0 0 24 24" className="size-5" aria-hidden>
    <path fill="#4285F4" d="M22.5 12.3c0-.8-.1-1.5-.2-2.3H12v4.3h5.9a5 5 0 0 1-2.2 3.3v2.7h3.6c2-1.9 3.2-4.7 3.2-8z" />
    <path fill="#34A853" d="M12 23c3 0 5.5-1 7.3-2.7l-3.6-2.7c-1 .7-2.2 1.1-3.7 1.1-2.9 0-5.3-1.9-6.2-4.5H2.1v2.8A11 11 0 0 0 12 23z" />
    <path fill="#FBBC05" d="M5.8 14.2a6.6 6.6 0 0 1 0-4.3V7.1H2.1a11 11 0 0 0 0 9.9l3.7-2.8z" />
    <path fill="#EA4335" d="M12 5.4c1.6 0 3.1.6 4.2 1.7l3.2-3.2A11 11 0 0 0 2.1 7.1l3.7 2.8C6.7 7.3 9.1 5.4 12 5.4z" />
  </svg>
);

/** ตัวอักษรแรกของชื่อ (ใช้แทนรูปโปรไฟล์ ไม่ต้องโหลดรูปจากภายนอก) */
const initial = (user: AuthUser) => (user.displayName ?? user.email ?? "?").trim().charAt(0).toUpperCase();

export function AccountMenu({ status, user, error, onSignIn, onSignOut }: AccountMenuProps) {
  const [open, setOpen] = useState(false);
  if (status === "disabled") return null;

  if (status === "loading") {
    return <span className="text-xs text-slate-400">กำลังตรวจสอบบัญชี…</span>;
  }

  if (status === "signedOut" || !user) {
    return (
      <div className="flex flex-col items-end gap-1">
        <button
          type="button"
          onClick={onSignIn}
          className="flex h-11 items-center gap-2 rounded-xl bg-white px-3 text-sm font-medium text-slate-700 shadow-sm ring-1 ring-slate-200 hover:bg-slate-50"
        >
          <GoogleIcon />
          <span className="hidden sm:inline">เข้าสู่ระบบด้วย Google</span>
          <span className="sm:hidden">เข้าสู่ระบบ</span>
        </button>
        {error && (
          <p role="alert" className="max-w-64 text-right text-xs text-red-600">
            {error}
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="relative">
      <button
        type="button"
        aria-label={`บัญชี ${user.displayName ?? user.email ?? ""}`}
        aria-expanded={open}
        onClick={() => setOpen(!open)}
        className="grid size-11 place-items-center rounded-full bg-indigo-600 text-base font-semibold text-white shadow ring-2 ring-white"
      >
        {initial(user)}
      </button>
      {open && (
        <div className="absolute right-0 z-20 mt-2 w-64 rounded-2xl bg-white p-3 text-sm shadow-lg ring-1 ring-slate-200">
          <p className="font-medium text-slate-800">{user.displayName ?? "ผู้ใช้"}</p>
          {user.email && <p className="truncate text-slate-500">{user.email}</p>}
          <p className="mt-2 rounded-lg bg-emerald-50 p-2 text-xs text-emerald-800">ข้อมูลซิงก์กับบัญชีนี้ เปิดจากเครื่องไหนก็เห็นเหมือนกัน</p>
          <button
            type="button"
            onClick={() => {
              setOpen(false);
              onSignOut();
            }}
            className="mt-2 h-11 w-full rounded-xl text-red-600 hover:bg-red-50"
          >
            ออกจากระบบ
          </button>
        </div>
      )}
    </div>
  );
}
