/**
 * FirestorePlanRepository — เก็บแผนบน Cloud Firestore (โหมดล็อกอิน)
 *
 * โครงสร้างข้อมูล: users/{uid}/plans/{planId}  (1 แผน = 1 เอกสาร)
 * firestore.rules อนุญาตให้อ่าน/เขียนได้เฉพาะเจ้าของ uid
 *
 * เรื่องออฟไลน์:
 * - Firestore เขียนลง cache ในเครื่องทันที แต่ Promise ของ setDoc จะรอจนเซิร์ฟเวอร์ตอบ
 * - ถ้าออฟไลน์อยู่ ไม่รอ (ไม่งั้นสถานะจะค้าง "กำลังบันทึก" จนกว่าจะต่อเน็ต) — Firestore จะส่งขึ้นเองเมื่อออนไลน์
 */
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  setDoc,
  type Firestore,
} from "firebase/firestore";
import type { PlanRepository } from "@/application/ports/PlanRepository";
import type { Plan } from "@/domain/entities/Plan";
import { parsePlan } from "../schemas/planSchema";

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
    const snapshot = await friendly(getDocs(this.plansCollection()));
    const plans: Plan[] = [];
    snapshot.forEach((document) => {
      const plan = parsePlan(document.data());
      if (plan) plans.push(plan);
      else console.warn("[Karngein] แผนบนคลาวด์ข้อมูลไม่ถูกต้อง — ข้ามแผนนี้", document.id);
    });
    return plans;
  }

  async get(id: string): Promise<Plan | null> {
    const snapshot = await friendly(getDoc(doc(this.plansCollection(), id)));
    return snapshot.exists() ? parsePlan(snapshot.data()) : null;
  }

  async save(plan: Plan): Promise<void> {
    // JSON round-trip: ตัด field ที่เป็น undefined (Firestore ไม่รับค่า undefined) และได้สำเนาแยกจาก object เดิม
    const data = JSON.parse(JSON.stringify(plan)) as Plan;
    const write = setDoc(doc(this.plansCollection(), plan.id), data);
    if (this.isOnline()) {
      await friendly(write);
    } else {
      write.catch((error) => console.error("[Karngein] ซิงก์แผนขึ้นคลาวด์ไม่สำเร็จ", error));
    }
  }

  async delete(id: string): Promise<void> {
    const write = deleteDoc(doc(this.plansCollection(), id));
    if (this.isOnline()) await friendly(write);
    else write.catch((error) => console.error("[Karngein] ลบแผนบนคลาวด์ไม่สำเร็จ", error));
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
