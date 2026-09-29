/**
 * FirebaseAuthService — ล็อกอินด้วย Google ผ่าน Firebase Authentication
 *
 * ใช้ signInWithPopup (ไม่ใช้ redirect) เพราะ redirect มีปัญหากับเบราว์เซอร์มือถือ
 * เมื่อเว็บไม่ได้โฮสต์บน Firebase Hosting (เราโฮสต์บน GitHub Pages)
 */
import { GoogleAuthProvider, onAuthStateChanged, signInWithPopup, signOut, type Auth } from "firebase/auth";
import type { AuthService, AuthUser, SignInResult } from "@/application/ports/AuthService";

/** แปลงรหัส error ของ Firebase เป็นข้อความภาษาไทย */
const ERROR_MESSAGES: Record<string, string> = {
  "auth/popup-blocked": "เบราว์เซอร์บล็อกหน้าต่างเข้าสู่ระบบ — กรุณาอนุญาต popup แล้วลองใหม่",
  "auth/unauthorized-domain": "เว็บนี้ยังไม่ได้รับอนุญาตใน Firebase (Authentication → Settings → Authorized domains)",
  "auth/network-request-failed": "เชื่อมต่ออินเทอร์เน็ตไม่ได้ — ลองใหม่เมื่อออนไลน์",
  "auth/operation-not-allowed": "ยังไม่ได้เปิดการเข้าสู่ระบบด้วย Google ใน Firebase",
};
// ผู้ใช้ปิดหน้าต่างเอง → ไม่ใช่ error
const IGNORED = new Set(["auth/popup-closed-by-user", "auth/cancelled-popup-request"]);

export class FirebaseAuthService implements AuthService {
  constructor(private readonly auth: Auth) {}

  onChange(callback: (user: AuthUser | null) => void): () => void {
    return onAuthStateChanged(this.auth, (user) =>
      callback(user ? { uid: user.uid, displayName: user.displayName, email: user.email } : null),
    );
  }

  async signIn(): Promise<SignInResult> {
    try {
      await signInWithPopup(this.auth, new GoogleAuthProvider());
      return { ok: true };
    } catch (error) {
      const code = (error as { code?: string }).code ?? "";
      if (IGNORED.has(code)) return { ok: true };
      console.error("[Karngein] เข้าสู่ระบบไม่สำเร็จ", error);
      return { ok: false, message: ERROR_MESSAGES[code] ?? `เข้าสู่ระบบไม่สำเร็จ (${code || "ไม่ทราบสาเหตุ"})` };
    }
  }

  signOut(): Promise<void> {
    return signOut(this.auth);
  }
}
