"use client";

/**
 * ลงทะเบียน Service Worker (public/sw.js) — เฉพาะเว็บที่ build แล้ว
 * ตอน dev ไม่ลงทะเบียน เพราะจะ cache ไฟล์ที่กำลังแก้อยู่ ทำให้สับสน
 */
import { useEffect } from "react";

const base = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

export function ServiceWorkerRegistration() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production" || !("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register(`${base}/sw.js`, { scope: `${base}/` }).catch((error) => {
      console.error("[Karngein] ลงทะเบียน Service Worker ไม่สำเร็จ", error);
    });
  }, []);
  return null;
}
