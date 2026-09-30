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
import { defaultIsOnline, friendly, settleWrite } from "./firestoreHelpers";
import { readWithCacheFallback } from "./readWithCacheFallback";

const READ_TIMEOUT_MS = 3000;

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
    await settleWrite(setDoc(doc(this.plansCollection(), plan.id), data), "ซิงก์แผนขึ้นคลาวด์ไม่สำเร็จ", this.isOnline);
  }

  async delete(id: string): Promise<void> {
    await settleWrite(deleteDoc(doc(this.plansCollection(), id)), "ลบแผนบนคลาวด์ไม่สำเร็จ", this.isOnline);
  }
}
