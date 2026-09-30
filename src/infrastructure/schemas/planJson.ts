/**
 * ส่งออก / นำเข้าแผนเป็นไฟล์ JSON (สำรองข้อมูล หรือย้ายเครื่อง)
 *
 * เวอร์ชัน 2 (Phase 11): { "app": "karngein", "version": 2, "exportedAt": "...", "plan": {...}, "transactions": [...] }
 * เวอร์ชัน 1 (เดิม):     { "app": "karngein", "version": 1, "exportedAt": "...", "plan": {...} }  ← ยังนำเข้าได้ (ไม่มีรายการจริง)
 * ใส่ app + version ไว้ เพื่อรู้ว่าไฟล์มาจากเวอร์ชันไหน และแปลงข้อมูลเก่าได้ถูกต้อง
 */
import type { Plan } from "@/domain/entities/Plan";
import type { Transaction } from "@/domain/entities/Transaction";
import { parsePlan, parseTransaction } from "./planSchema";

export const PLAN_FILE_VERSION = 2;
const SUPPORTED_VERSIONS = [1, 2];

export type ImportResult = { ok: true; plan: Plan; transactions: Transaction[] } | { ok: false; message: string };

export function exportPlanToJson(plan: Plan, transactions: Transaction[] = [], now: Date = new Date()): string {
  const file = { app: "karngein", version: PLAN_FILE_VERSION, exportedAt: now.toISOString(), plan, transactions };
  return JSON.stringify(file, null, 2);
}

export function importPlanFromJson(text: string): ImportResult {
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    return { ok: false, message: "ไฟล์นี้ไม่ใช่ JSON ที่อ่านได้" };
  }

  const file = data as { app?: unknown; version?: unknown; plan?: unknown; transactions?: unknown } | null;
  if (!file || file.app !== "karngein") {
    return { ok: false, message: "ไฟล์นี้ไม่ใช่ไฟล์แผนของ Karngein" };
  }
  if (!SUPPORTED_VERSIONS.includes(file.version as number)) {
    return { ok: false, message: `ไม่รองรับไฟล์เวอร์ชัน ${String(file.version)}` };
  }

  const plan = parsePlan(file.plan);
  if (!plan) return { ok: false, message: "ข้อมูลแผนในไฟล์ไม่ครบหรือไม่ถูกต้อง" };

  if (file.version === 1) return { ok: true, plan, transactions: [] };
  if (!Array.isArray(file.transactions)) return { ok: false, message: "ข้อมูลรายการจริงในไฟล์ไม่ถูกต้อง" };
  const transactions = file.transactions.map(parseTransaction);
  if (transactions.some((t) => t === null)) {
    return { ok: false, message: "มีรายการจริงในไฟล์ที่ข้อมูลไม่ถูกต้อง" };
  }
  return { ok: true, plan, transactions: transactions as Transaction[] };
}
