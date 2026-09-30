/**
 * FirestorePlanRepository — เก็บแผนบน Cloud Firestore (โหมดล็อกอิน)
 *
 * โครงสร้างข้อมูล: users/{uid}/plans/{planId}  (1 แผน = 1 เอกสาร)
 * firestore.rules อนุญาตให้อ่าน/เขียนได้เฉพาะเจ้าของ uid
 *
 * เรื่องออฟไลน์ / เน็ตช้า (เช่น ปิดแอปแล้วเปิดใหม่บนมือถือ):
 * - อ่าน: ถามเซิร์ฟเวอร์ก่อน ถ้าช้าเกิน READ_TIMEOUT_MS ใช้ข้อมูลใน cache ของเครื่อง (readWithCacheFallback)
 * - เขียน: Firestore เขียนลง cache ทันที แต่ Promise ของ setDoc จะรอจนเซิร์ฟเวอร์ตอบ
 *   → รอไม่เกิน WRITE_WAIT_MS แล้วปล่อยให้ Firestore ส่งขึ้นเองเบื้องหลัง (ไม่ให้หน้าจอค้าง)
 */
import {
  collection,
  deleteDoc,
  doc,
  getDocFromCache,
  getDocFromServer,
  getDocsFromCache,
  getDocsFromServer,
  setDoc,
  type Firestore,
} from "firebase/firestore";
import type { PlanRepository } from "@/application/ports/PlanRepository";
import type { Plan } from "@/domain/entities/Plan";
import { parsePlan } from "../schemas/planSchema";
import { readWithCacheFallback } from "./readWithCacheFallback";

const READ_TIMEOUT_MS = 3000;
const WRITE_WAIT_MS = 4000;

export class FirestorePlanRepository implements PlanRepository {
  constructor(
    private readonly db: Firestore,
    private readonly uid: string,
    private readonly isOnline: () => boolean = defaultIsOnline,
  ) {}

  private plansCollection() {
    return collection(this.db, "users", this.uid, "plans");
  }

  async list(): Promise<Plan[]> {
    const ref = this.plansCollection();
    const snapshot = await friendly(
      readWithCacheFallback(
        () => getDocsFromServer(ref),
        // cache ว่าง = อาจยังไม่เคยโหลด → ถือว่าไม่มี cache (รอเซิร์ฟเวอร์ต่อ)
        () => getDocsFromCache(ref).then((cached) => (cached.empty ? null : cached)),
        READ_TIMEOUT_MS,
      ),
    );
    const plans: Plan[] = [];
    snapshot.forEach((document) => {
      const plan = parsePlan(document.data());
      if (plan) plans.push(plan);
      else console.warn("[Karngein] แผนบนคลาวด์ข้อมูลไม่ถูกต้อง — ข้ามแผนนี้", document.id);
    });
    return plans;
  }

  async get(id: string): Promise<Plan | null> {
    const ref = doc(this.plansCollection(), id);
    const snapshot = await friendly(
      readWithCacheFallback(
        () => getDocFromServer(ref),
        () => getDocFromCache(ref).catch(() => null), // ไม่มีใน cache → throw → ถือว่าไม่มี
        READ_TIMEOUT_MS,
      ),
    );
    return snapshot.exists() ? parsePlan(snapshot.data()) : null;
  }

  async save(plan: Plan): Promise<void> {
    // JSON round-trip: ตัด field ที่เป็น undefined (Firestore ไม่รับค่า undefined) และได้สำเนาแยกจาก object เดิม
    const data = JSON.parse(JSON.stringify(plan)) as Plan;
    await this.settle(setDoc(doc(this.plansCollection(), plan.id), data), "ซิงก์แผนขึ้นคลาวด์ไม่สำเร็จ");
  }

  async delete(id: string): Promise<void> {
    await this.settle(deleteDoc(doc(this.plansCollection(), id)), "ลบแผนบนคลาวด์ไม่สำเร็จ");
  }

  /**
   * รอผลการเขียน "พอประมาณ": ออนไลน์รอไม่เกิน WRITE_WAIT_MS (ถ้า error เช่น ไม่มีสิทธิ์ → แจ้ง)
   * ออฟไลน์หรือช้ากว่านั้น → ไม่รอ ข้อมูลอยู่ใน cache แล้ว Firestore จะส่งขึ้นเองเมื่อพร้อม
   */
  private async settle(write: Promise<void>, errorMessage: string): Promise<void> {
    write.catch((error) => console.error(`[Karngein] ${errorMessage}`, error));
    if (!this.isOnline()) return;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const waited = new Promise<void>((resolve) => {
      timer = setTimeout(resolve, WRITE_WAIT_MS);
    });
    try {
      await friendly(Promise.race([write, waited]));
    } finally {
      clearTimeout(timer);
    }
  }
}

/** รหัส error ของ Firestore → ข้อความภาษาไทยที่ผู้ใช้เข้าใจ */
const ERROR_MESSAGES: Record<string, string> = {
  "permission-denied":
    "ไม่มีสิทธิ์เข้าถึงข้อมูลบนคลาวด์ — ตรวจ Firestore Rules ใน Firebase Console ว่า Publish กฎของ Karngein แล้ว",
  unauthenticated: "ยังไม่ได้เข้าสู่ระบบ หรือการเข้าสู่ระบบหมดอายุ — ลองออกจากระบบแล้วเข้าใหม่",
  unavailable: "เชื่อมต่อคลาวด์ไม่ได้ — ลองใหม่เมื่อออนไลน์",
  "not-found": "ไม่พบฐานข้อมูล Firestore ของโปรเจกต์ — ตรวจว่าสร้าง Firestore Database แล้ว",
};

async function friendly<T>(promise: Promise<T>): Promise<T> {
  try {
    return await promise;
  } catch (error) {
    const code = (error as { code?: string }).code ?? "";
    const message = ERROR_MESSAGES[code];
    throw message ? new Error(message, { cause: error }) : error;
  }
}

function defaultIsOnline(): boolean {
  return typeof navigator === "undefined" || navigator.onLine !== false;
}
