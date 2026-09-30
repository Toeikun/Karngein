/**
 * firebaseApp — เริ่มต้น Firebase (ที่เดียวในโปรเจกต์ที่อ่านค่า config)
 *
 * - ค่า config อยู่ใน firebaseConfig.ts (มาจาก .env.local ตอน dev / GitHub Actions variables ตอน deploy)
 * - ไฟล์นี้ถูกโหลดแบบ lazy ผ่าน lazyFirebase.ts เท่านั้น (ไม่อยู่ใน JS ก้อนแรกของหน้าเว็บ)
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
import { firebaseConfig } from "./firebaseConfig";

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
