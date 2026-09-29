/**
 * firebaseApp — เริ่มต้น Firebase (ที่เดียวในโปรเจกต์ที่อ่านค่า config)
 *
 * - ค่า config มาจาก .env.local (ตอน dev) / GitHub Actions variables (ตอน deploy)
 *   ต้องเขียน process.env.NEXT_PUBLIC_XXX แบบเต็มทีละตัว เพราะ Next.js แทนค่าตอน build แบบ "ค้นหาข้อความ"
 * - ค่าเหล่านี้ไม่ใช่ความลับ (อยู่ใน JS ที่ใครก็เปิดดูได้) — ที่ปกป้องข้อมูลคือ firestore.rules
 * - ถ้าไม่ได้ตั้งค่า → แอปทำงานแบบ Guest อย่างเดียว (ไม่มีปุ่มล็อกอิน)
 * - Firestore เปิด persistentLocalCache → ข้อมูลอยู่ในเครื่องด้วย ใช้งานตอนออฟไลน์ได้ แล้ว sync ภายหลัง
 */
import { getApps, initializeApp, type FirebaseApp } from "firebase/app";
import { getAuth, type Auth } from "firebase/auth";
import {
  getFirestore,
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
  type Firestore,
} from "firebase/firestore";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

export function isFirebaseConfigured(): boolean {
  return Object.values(firebaseConfig).every((value) => typeof value === "string" && value.length > 0);
}

function getFirebaseApp(): FirebaseApp {
  return getApps()[0] ?? initializeApp(firebaseConfig);
}

let firestore: Firestore | null = null;

export function getFirebaseFirestore(): Firestore {
  if (!firestore) {
    const app = getFirebaseApp();
    try {
      // เก็บข้อมูลลง IndexedDB + ใช้ร่วมกันได้หลายแท็บ
      firestore = initializeFirestore(app, {
        localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }),
      });
    } catch {
      firestore = getFirestore(app); // ถูก initialize ไปแล้ว (เช่น hot reload ตอน dev)
    }
  }
  return firestore;
}

export function getFirebaseAuth(): Auth {
  return getAuth(getFirebaseApp());
}
