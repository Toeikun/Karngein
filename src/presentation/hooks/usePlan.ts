"use client";

/**
 * usePlan — state หลักของหน้า: แผนที่เปิดอยู่, รายชื่อแผนทั้งหมด, สถานะการบันทึก
 *
 * การทำงาน:
 * 1. เปิดหน้า → เปิดแผนที่ใช้ล่าสุด (ถ้าไม่มีแผนเลย สร้างแผนใหม่)
 * 2. UI เรียก run(action) เพื่อแก้แผน (action = ฟังก์ชันที่เรียก use case)
 *    → สำเร็จ: อัปเดต state / ไม่สำเร็จ: คืน errors ให้ฟอร์มแสดง
 * 3. แผนเปลี่ยน → รอ 1 วินาทีหลังพิมพ์ครั้งสุดท้าย (debounce) แล้วบันทึก
 * 4. ปิด/ซ่อนหน้า หรือสลับแผน ขณะยังไม่ได้บันทึก → บันทึกทันที
 *
 * hook นี้ไม่มีสูตรคำนวณ และไม่รู้ว่าข้อมูลไปเก็บที่ไหน (ได้ repository มาจาก di)
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { systemContext, type UseCaseContext } from "@/application/context";
import type { ActivePlanStore } from "@/application/ports/ActivePlanStore";
import type { PlanRepository } from "@/application/ports/PlanRepository";
import type { TransactionRepository } from "@/application/ports/TransactionRepository";
import type { PlanResult } from "@/application/result";
import {
  copyImportedPlan,
  createPlan,
  deletePlan,
  listPlans,
  loadPlan,
  savePlan,
} from "@/application/usecases/plans";
import type { Plan } from "@/domain/entities/Plan";
import type { ValidationError } from "@/domain/entities/validation";
import { getActivePlanStore, getPlanRepository, getTransactionRepository, planFileFormat } from "@/di/container";

export type SaveStatus = "loading" | "saving" | "saved" | "error";
// ชื่อพารามิเตอร์ห้ามขึ้นต้นด้วย "use" ไม่งั้น ESLint จะเข้าใจผิดว่าเป็น React Hook
export type RunUseCase = (action: (plan: Plan, ctx: UseCaseContext) => PlanResult) => ValidationError[];
export interface PlanListItem {
  id: string;
  name: string;
}

export const AUTOSAVE_DELAY_MS = 1000;

export interface UsePlanOptions {
  repository?: PlanRepository;
  transactionRepository?: TransactionRepository;
  activePlanStore?: ActivePlanStore;
  ctx?: UseCaseContext;
}

export function usePlan({ repository, transactionRepository, activePlanStore, ctx = systemContext }: UsePlanOptions = {}) {
  const [repo] = useState(() => repository ?? getPlanRepository());
  const [txRepo] = useState(() => transactionRepository ?? getTransactionRepository());
  const [active] = useState(() => activePlanStore ?? getActivePlanStore());
  const [plan, setPlan] = useState<Plan | null>(null);
  const [plans, setPlans] = useState<PlanListItem[]>([]);
  const [status, setStatus] = useState<SaveStatus>("loading");
  const [loadError, setLoadError] = useState<string | null>(null);
  const planRef = useRef<Plan | null>(null); // แผนล่าสุดเสมอ (ใช้ใน callback)
  const dirtyRef = useRef(false); // มีการแก้ที่ยังไม่ได้บันทึกหรือไม่

  const refreshList = useCallback(async () => {
    const all = await listPlans(repo);
    setPlans(all.map(({ id, name }) => ({ id, name })));
  }, [repo]);

  /** เปิดแผนนี้บนหน้าจอ และจำไว้ว่าเป็นแผนล่าสุด */
  const show = useCallback(
    (next: Plan) => {
      planRef.current = next;
      dirtyRef.current = false;
      setPlan(next);
      setStatus("saved");
      active.set(next.id);
    },
    [active],
  );

  const persist = useCallback(async () => {
    const current = planRef.current;
    if (!current || !dirtyRef.current) return;
    dirtyRef.current = false;
    try {
      await savePlan(repo, current);
      setStatus("saved");
      await refreshList();
    } catch (error) {
      console.error("[Karngein] บันทึกไม่สำเร็จ", error);
      dirtyRef.current = true;
      setStatus("error");
    }
  }, [repo, refreshList]);

  // 1. โหลดแผนตอนเปิดหน้า
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const all = await listPlans(repo);
        // ถ้า effect ถูกยกเลิกระหว่างรอ (เช่น StrictMode ในโหมด dev รัน effect 2 รอบ)
        // ต้องหยุดก่อนสร้างแผนใหม่ ไม่งั้นจะได้แผนว่างซ้ำ 2 แผน
        if (cancelled) return;
        let loaded = all.find((p) => p.id === active.get()) ?? all[0];
        if (!loaded) {
          loaded = createPlan(ctx);
          await savePlan(repo, loaded);
        }
        if (cancelled) return;
        show(loaded);
        await refreshList();
      } catch (error) {
        // โหลดไม่ได้ (เช่น ไม่มีสิทธิ์ / ไม่มีเน็ตและไม่มีข้อมูลในเครื่อง) → แจ้งผู้ใช้ ไม่ค้างหน้า "กำลังโหลด"
        console.error("[Karngein] โหลดแผนไม่สำเร็จ", error);
        if (cancelled) return;
        setLoadError(error instanceof Error ? error.message : String(error));
        setStatus("error");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [repo, active, ctx, show, refreshList]);

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

  // ---------- จัดการหลายแผน ----------

  const switchPlan = useCallback(
    async (id: string) => {
      await persist(); // บันทึกแผนเดิมก่อนสลับ
      const next = await loadPlan(repo, id);
      if (next) show(next);
    },
    [repo, persist, show],
  );

  const createNewPlan = useCallback(
    async (name?: string) => {
      await persist();
      const created = createPlan(ctx, name);
      await savePlan(repo, created);
      show(created);
      await refreshList();
    },
    [repo, ctx, persist, show, refreshList],
  );

  const deleteCurrentPlan = useCallback(async () => {
    const current = planRef.current;
    if (!current) return;
    dirtyRef.current = false; // ไม่ต้องบันทึกแผนที่กำลังจะลบ
    await deletePlan(repo, current.id, txRepo); // ลบรายการจริงของแผนด้วย
    let next = (await listPlans(repo))[0];
    if (!next) {
      next = createPlan(ctx);
      await savePlan(repo, next);
    }
    show(next);
    await refreshList();
  }, [repo, txRepo, ctx, show, refreshList]);

  /** นำเข้าไฟล์ JSON → คืนข้อความ error หรือ null ถ้าสำเร็จ */
  const importPlanFile = useCallback(
    async (text: string): Promise<string | null> => {
      const parsed = planFileFormat.parse(text);
      if (!parsed.ok) return parsed.message;
      await persist();
      const copy = copyImportedPlan(parsed.plan, ctx);
      await savePlan(repo, copy);
      // รายการจริงผูกกับแผน (D11) → เก็บไว้ใต้ id ใหม่ของแผนที่นำเข้า
      for (const transaction of parsed.transactions) await txRepo.save(copy.id, transaction);
      show(copy);
      await refreshList();
      return null;
    },
    [repo, txRepo, ctx, persist, show, refreshList],
  );

  /** ไฟล์สำรองของแผนที่เปิดอยู่ (รวมรายการจริง) */
  const exportCurrentPlan = useCallback(async (): Promise<string | null> => {
    const current = planRef.current;
    if (!current) return null;
    return planFileFormat.serialize(current, await txRepo.list(current.id), ctx.now());
  }, [txRepo, ctx]);

  return { plan, plans, status, loadError, transactionRepository: txRepo, ctx, run, switchPlan, createNewPlan, deleteCurrentPlan, importPlanFile, exportCurrentPlan };
}
