/**
 * AuthService — Port สำหรับ "การเข้าสู่ระบบ"
 * Application/UI ไม่รู้ว่าเบื้องหลังคือ Firebase — รู้แค่ว่าล็อกอิน/ออกได้ และมีผู้ใช้เป็นใคร
 */
export interface AuthUser {
  uid: string;
  displayName: string | null;
  email: string | null;
}

export type SignInResult = { ok: true } | { ok: false; message: string };

export interface AuthService {
  /** เรียก callback ทุกครั้งที่สถานะล็อกอินเปลี่ยน (รวมครั้งแรก) — คืนฟังก์ชันยกเลิกการติดตาม */
  onChange(callback: (user: AuthUser | null) => void): () => void;
  /**
   * เดาแบบทันที (ไม่ต้องรอโหลด) ว่าผู้ใช้น่าจะยังล็อกอินค้างอยู่ไหม
   * false → UI แสดงข้อมูลในเครื่องได้เลยไม่ต้องรอ (หน้าเว็บขึ้นเร็ว) แล้วค่อยยืนยันผ่าน onChange
   */
  probablySignedIn(): boolean;
  signIn(): Promise<SignInResult>;
  signOut(): Promise<void>;
}
