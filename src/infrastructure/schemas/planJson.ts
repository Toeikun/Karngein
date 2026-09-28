/**
 * ส่งออก / นำเข้าแผนเป็นไฟล์ JSON (สำรองข้อมูล หรือย้ายเครื่อง)
 *
 * รูปแบบไฟล์: { "app": "karngein", "version": 1, "exportedAt": "...", "plan": { ... } }
 * ใส่ app + version ไว้ เพื่อวันหน้าเปลี่ยนรูปแบบข้อมูล จะรู้ว่าไฟล์นี้มาจากเวอร์ชันไหน
 */
import type { Plan } from "@/domain/entities/Plan";
import { parsePlan } from "./planSchema";

export const PLAN_FILE_VERSION = 1;

export type ImportResult = { ok: true; plan: Plan } | { ok: false; message: string };

export function exportPlanToJson(plan: Plan, now: Date = new Date()): string {
  const file = { app: "karngein", version: PLAN_FILE_VERSION, exportedAt: now.toISOString(), plan };
  return JSON.stringify(file, null, 2);
}

export function importPlanFromJson(text: string): ImportResult {
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    return { ok: false, message: "ไฟล์นี้ไม่ใช่ JSON ที่อ่านได้" };
  }

  const file = data as { app?: unknown; version?: unknown; plan?: unknown } | null;
  if (!file || file.app !== "karngein") {
    return { ok: false, message: "ไฟล์นี้ไม่ใช่ไฟล์แผนของ Karngein" };
  }
  if (file.version !== PLAN_FILE_VERSION) {
    return { ok: false, message: `ไม่รองรับไฟล์เวอร์ชัน ${String(file.version)}` };
  }

  const plan = parsePlan(file.plan);
  if (!plan) return { ok: false, message: "ข้อมูลแผนในไฟล์ไม่ครบหรือไม่ถูกต้อง" };
  return { ok: true, plan };
}
