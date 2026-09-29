"use client";

import { useSyncExternalStore } from "react";

const noopSubscribe = () => () => {};

/**
 * true เมื่อรันในเบราว์เซอร์แล้ว (หลัง hydrate)
 *
 * ทำไมต้องมี? หน้าเว็บถูก render เป็น HTML ตอน build (ไม่มี window/localStorage/Firebase)
 * ถ้า render ครั้งแรกในเบราว์เซอร์ต่างจาก HTML นั้น React จะเตือน "Hydration failed"
 * → ให้ทั้งสองฝั่งแสดง "กำลังโหลด" เหมือนกันก่อน แล้วค่อยแสดงของจริงในเบราว์เซอร์
 */
export function useIsClient(): boolean {
  return useSyncExternalStore(noopSubscribe, () => true, () => false);
}
