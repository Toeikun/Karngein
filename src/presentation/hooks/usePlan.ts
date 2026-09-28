"use client";

/**
 * usePlan — state หลักของหน้า: แผนปัจจุบัน + สถานะการบันทึก
 *
 * การทำงาน:
 * 1. เปิดหน้า → โหลดแผนล่าสุดจาก repository (ถ้าไม่มี สร้างแผนใหม่)
 * 2. UI เรียก run(action) เพื่อแก้แผน (action = ฟังก์ชันที่เรียก use case) → ถ้าสำเร็จอัปเดต state, ถ้าไม่สำเร็จคืน errors ให้ฟอร์มแสดง
 * 3. แผนเปลี่ยน → รอ 1 วินาทีหลังพิมพ์ครั้งสุดท้าย (debounce) แล้วบันทึก
 * 4. ปิด/ซ่อนหน้า ขณะยังไม่ได้บันทึก → บันทึกทันที
 *
 * hook นี้ไม่มีสูตรคำนวณ และไม่รู้ว่าข้อมูลไปเก็บที่ไหน (ได้ repository มาจาก di)
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { systemContext, type UseCaseContext } from "@/application/context";
import type { PlanRepository } from "@/application/ports/PlanRepository";
import type { PlanResult } from "@/application/result";
import { createPlan, listPlans, savePlan } from "@/application/usecases/plans";
import type { Plan } from "@/domain/entities/Plan";
import type { ValidationError } from "@/domain/entities/validation";
import { getPlanRepository } from "@/di/container";

export type SaveStatus = "loading" | "saving" | "saved" | "error";
// ชื่อพารามิเตอร์ห้ามขึ้นต้นด้วย "use" ไม่งั้น ESLint จะเข้าใจผิดว่าเป็น React Hook
export type RunUseCase = (action: (plan: Plan, ctx: UseCaseContext) => PlanResult) => ValidationError[];

export const AUTOSAVE_DELAY_MS = 1000;

export interface UsePlanOptions {
  repository?: PlanRepository;
  ctx?: UseCaseContext;
}

export function usePlan({ repository, ctx = systemContext }: UsePlanOptions = {}) {
  const [repo] = useState(() => repository ?? getPlanRepository());
  const [plan, setPlan] = useState<Plan | null>(null);
  const [status, setStatus] = useState<SaveStatus>("loading");
  const planRef = useRef<Plan | null>(null); // แผนล่าสุดเสมอ (ใช้ใน callback)
  const dirtyRef = useRef(false); // มีการแก้ที่ยังไม่ได้บันทึกหรือไม่

  const persist = useCallback(async () => {
    const current = planRef.current;
    if (!current || !dirtyRef.current) return;
    dirtyRef.current = false;
    try {
      await savePlan(repo, current);
      setStatus("saved");
    } catch (error) {
      console.error("[Karngein] บันทึกไม่สำเร็จ", error);
      dirtyRef.current = true;
      setStatus("error");
    }
  }, [repo]);

  // 1. โหลดแผนตอนเปิดหน้า
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const plans = await listPlans(repo);
      // ถ้า effect ถูกยกเลิกระหว่างรอ (เช่น StrictMode ในโหมด dev รัน effect 2 รอบ)
      // ต้องหยุดก่อนสร้างแผนใหม่ ไม่งั้นจะได้แผนว่างซ้ำ 2 แผน
      if (cancelled) return;
      let loaded = plans[0];
      if (!loaded) {
        loaded = createPlan(ctx);
        await savePlan(repo, loaded);
      }
      if (cancelled) return;
      planRef.current = loaded;
      setPlan(loaded);
      setStatus("saved");
    })();
    return () => {
      cancelled = true;
    };
  }, [repo, ctx]);

  // 3. autosave แบบ debounce
  useEffect(() => {
    if (!plan || !dirtyRef.current) return;
    const timer = setTimeout(persist, AUTOSAVE_DELAY_MS);
    return () => clearTimeout(timer);
  }, [plan, persist]);

  // 4. ปิด/ซ่อนหน้า → บันทึกทันที
  useEffect(() => {
    const flush = () => void persist();
    const onVisibility = () => document.visibilityState === "hidden" && flush();
    window.addEventListener("pagehide", flush);
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      window.removeEventListener("pagehide", flush);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [persist]);

  // 2. รัน use case กับแผนปัจจุบัน
  const run = useCallback<RunUseCase>(
    (action) => {
      const current = planRef.current;
      if (!current) return [];
      const result = action(current, ctx);
      if (!result.ok) return result.errors;
      planRef.current = result.plan;
      dirtyRef.current = true;
      setPlan(result.plan);
      setStatus("saving");
      return [];
    },
    [ctx],
  );

  return { plan, status, run };
}
