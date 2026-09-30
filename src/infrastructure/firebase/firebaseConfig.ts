/**
 * ค่า config ของ Firebase — แยกออกจาก firebaseApp.ts เพื่อให้ "ตรวจว่าตั้งค่าไว้ไหม" ได้
 * โดยไม่ต้องโหลดโค้ด Firebase SDK (ใหญ่ ~1 MB) มาด้วย
 *
 * ต้องเขียน process.env.NEXT_PUBLIC_XXX แบบเต็มทีละตัว เพราะ Next.js แทนค่าตอน build แบบ "ค้นหาข้อความ"
 * ค่าเหล่านี้ไม่ใช่ความลับ (อยู่ใน JS ที่ใครก็เปิดดูได้) — ที่ปกป้องข้อมูลคือ firestore.rules
 */
export const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

export function isFirebaseConfigured(): boolean {
  return Object.values(firebaseConfig).every((value) => typeof value === "string" && value.length > 0);
}
