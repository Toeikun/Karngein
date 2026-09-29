/**
 * ตัวช่วยสำหรับเทสต์กับ Firestore Emulator
 * projectId ขึ้นต้นด้วย "demo-" → Emulator รู้ว่าเป็นโปรเจกต์จำลอง ไม่แตะโปรเจกต์จริงแน่นอน
 */
import { deleteApp, initializeApp, type FirebaseApp } from "firebase/app";
import { connectFirestoreEmulator, getFirestore, type Firestore } from "firebase/firestore";

export const EMULATOR_PROJECT_ID = "demo-karngein";
const HOST = "127.0.0.1";
const PORT = 8080;
const apps: FirebaseApp[] = [];
let counter = 0;

/** Firestore ในมุมมองของผู้ใช้ uid (หรือไม่ล็อกอิน ถ้าไม่ส่ง uid) — ใช้ token จำลองของ Emulator */
export function firestoreAs(uid?: string): Firestore {
  const app = initializeApp({ projectId: EMULATOR_PROJECT_ID, apiKey: "demo" }, `test-${++counter}`);
  apps.push(app);
  const db = getFirestore(app);
  connectFirestoreEmulator(db, HOST, PORT, uid ? { mockUserToken: { user_id: uid } } : undefined);
  return db;
}

/** ล้างข้อมูลทั้งหมดใน Emulator */
export async function clearFirestore(): Promise<void> {
  const url = `http://${HOST}:${PORT}/emulator/v1/projects/${EMULATOR_PROJECT_ID}/databases/(default)/documents`;
  const response = await fetch(url, { method: "DELETE" });
  if (!response.ok) throw new Error(`ล้างข้อมูล Emulator ไม่สำเร็จ: ${response.status}`);
}

export async function closeAllApps(): Promise<void> {
  await Promise.all(apps.splice(0).map((app) => deleteApp(app)));
}
