/**
 * ตัวช่วยที่ Firestore repository ทุกตัวใช้ร่วมกัน
 * - friendly: แปลง error ของ Firestore เป็นข้อความภาษาไทย (UI ไม่ต้องรู้จักรหัสของ Firebase)
 * - settleWrite: รอผลการเขียน "พอประมาณ" ไม่ให้หน้าจอค้างเมื่อเน็ตช้า/ออฟไลน์
 */

/** รหัส error ของ Firestore → ข้อความภาษาไทยที่ผู้ใช้เข้าใจ */
const ERROR_MESSAGES: Record<string, string> = {
  "permission-denied":
    "ไม่มีสิทธิ์เข้าถึงข้อมูลบนคลาวด์ — ตรวจ Firestore Rules ใน Firebase Console ว่า Publish กฎของ Karngein แล้ว",
  unauthenticated: "ยังไม่ได้เข้าสู่ระบบ หรือการเข้าสู่ระบบหมดอายุ — ลองออกจากระบบแล้วเข้าใหม่",
  unavailable: "เชื่อมต่อคลาวด์ไม่ได้ — ลองใหม่เมื่อออนไลน์",
  "not-found": "ไม่พบฐานข้อมูล Firestore ของโปรเจกต์ — ตรวจว่าสร้าง Firestore Database แล้ว",
};

export async function friendly<T>(promise: Promise<T>): Promise<T> {
  try {
    return await promise;
  } catch (error) {
    const code = (error as { code?: string }).code ?? "";
    const message = ERROR_MESSAGES[code];
    throw message ? new Error(message, { cause: error }) : error;
  }
}

const WRITE_WAIT_MS = 4000;

export function defaultIsOnline(): boolean {
  return typeof navigator === "undefined" || navigator.onLine !== false;
}

/**
 * Firestore เขียนลง cache ในเครื่องทันที แต่ Promise จะรอจนเซิร์ฟเวอร์ตอบ
 * → ออนไลน์: รอไม่เกิน WRITE_WAIT_MS (ถ้า error เช่น ไม่มีสิทธิ์ → แจ้ง)
 * → ออฟไลน์หรือช้ากว่านั้น: ไม่รอ Firestore จะส่งขึ้นเองเมื่อพร้อม
 */
export async function settleWrite(write: Promise<void>, errorMessage: string, isOnline = defaultIsOnline): Promise<void> {
  write.catch((error) => console.error(`[Karngein] ${errorMessage}`, error));
  if (!isOnline()) return;
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
