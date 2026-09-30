"use client";

/**
 * LoadingState — ข้อความ "กำลังโหลด" ที่ไม่ปล่อยให้ผู้ใช้ติดอยู่
 *
 * ถ้าโหลดนานเกิน SLOW_AFTER_MS → แสดงคำอธิบาย + ปุ่ม "โหลดใหม่"
 * สำคัญมากสำหรับแอปที่ติดตั้งบนหน้าจอมือถือ (PWA) เพราะไม่มีปุ่มรีเฟรชของเบราว์เซอร์
 * `stage` บอกว่าค้างที่ขั้นไหน (ช่วยตอนแจ้งปัญหา)
 */
import { useEffect, useState } from "react";

export const SLOW_AFTER_MS = 10_000;

interface LoadingStateProps {
  message: string;
  stage: string;
}

export function LoadingState({ message, stage }: LoadingStateProps) {
  const [slow, setSlow] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setSlow(true), SLOW_AFTER_MS);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="py-20 text-center text-slate-500">
      <p>{message}</p>
      {slow && (
        <div role="alert" className="mx-auto mt-4 max-w-sm rounded-2xl bg-amber-50 p-4 text-sm text-amber-900 ring-1 ring-amber-100">
          <p className="font-medium">ใช้เวลานานกว่าปกติ</p>
          <p className="mt-1">อาจเป็นเพราะอินเทอร์เน็ตยังไม่พร้อม ลองโหลดใหม่อีกครั้ง</p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="mt-3 h-11 rounded-xl bg-amber-600 px-5 font-medium text-white hover:bg-amber-700"
          >
            โหลดใหม่
          </button>
          <p className="mt-2 text-xs text-amber-700">ขั้นตอน: {stage}</p>
        </div>
      )}
    </div>
  );
}
