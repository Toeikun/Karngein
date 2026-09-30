/**
 * lazyFirebase — ห่อ Adapter ของ Firebase ให้ "โหลดโค้ดเมื่อจำเป็น" (lazy loading)
 *
 * ทำไม? Firebase SDK ใหญ่ ~1 MB ถ้ารวมไว้ใน JS ก้อนแรก หน้าเว็บบนมือถือจะแสดงช้า (Lighthouse LCP ~5 วินาที)
 * import("…") แบบ dynamic ทำให้ Next.js แยกเป็นไฟล์ต่างหาก โหลดเบื้องหลังหลังหน้าแสดงแล้ว
 *
 * คลาสในไฟล์นี้ทำตาม Port เดิม (AuthService / PlanRepository) → ชั้นอื่นไม่ต้องรู้ว่าโหลดแบบ lazy
 */
import type { AuthService, AuthUser, SignInResult } from "@/application/ports/AuthService";
import type { PlanRepository } from "@/application/ports/PlanRepository";
import type { TransactionRepository } from "@/application/ports/TransactionRepository";
import type { Plan } from "@/domain/entities/Plan";
import type { Transaction } from "@/domain/entities/Transaction";

/** จำไว้ในเครื่องว่าครั้งล่าสุดล็อกอินอยู่ไหม (ไม่ใช่ข้อมูลลับ — แค่ "1" หรือไม่มี) */
const SIGNED_IN_HINT_KEY = "karngein:signedInHint";

function readHint(): boolean {
  try {
    return window.localStorage.getItem(SIGNED_IN_HINT_KEY) === "1";
  } catch {
    return true; // อ่านไม่ได้ → เผื่อไว้ว่าล็อกอิน (รอยืนยัน ไม่แสดงข้อมูลผิดบัญชี)
  }
}

function writeHint(signedIn: boolean) {
  try {
    if (signedIn) window.localStorage.setItem(SIGNED_IN_HINT_KEY, "1");
    else window.localStorage.removeItem(SIGNED_IN_HINT_KEY);
  } catch {
    // ไม่เป็นไร แค่หน้าเว็บอาจขึ้นช้าลงเล็กน้อยครั้งหน้า
  }
}

const loadFirebase = () =>
  Promise.all([
    import("./firebaseApp"),
    import("./FirebaseAuthService"),
    import("./FirestorePlanRepository"),
    import("./FirestoreTransactionRepository"),
  ]).then(([app, auth, plans, transactions]) => ({ ...app, ...auth, ...plans, ...transactions }));

export class LazyFirebaseAuthService implements AuthService {
  private loading: Promise<AuthService> | null = null;
  private loaded: AuthService | null = null;

  private load(): Promise<AuthService> {
    this.loading ??= loadFirebase().then((firebase) => {
      this.loaded = new firebase.FirebaseAuthService(firebase.getFirebaseAuth());
      return this.loaded;
    });
    return this.loading;
  }

  onChange(callback: (user: AuthUser | null) => void): () => void {
    let unsubscribe: (() => void) | null = null;
    let cancelled = false;
    this.load().then((service) => {
      if (cancelled) return;
      unsubscribe = service.onChange((user) => {
        writeHint(user !== null);
        callback(user);
      });
    });
    return () => {
      cancelled = true;
      unsubscribe?.();
    };
  }

  probablySignedIn(): boolean {
    return readHint();
  }

  signIn(): Promise<SignInResult> {
    // เรียกทันทีถ้าโหลดเสร็จแล้ว (ปกติจะเสร็จตั้งแต่เปิดหน้า เพราะ onChange เริ่มโหลดไว้)
    // สำคัญ: เบราว์เซอร์ (โดยเฉพาะ Safari) จะบล็อก popup ถ้าไม่ได้เปิดทันทีหลังผู้ใช้กดปุ่ม
    if (this.loaded) return this.loaded.signIn();
    return this.load().then((service) => service.signIn());
  }

  async signOut(): Promise<void> {
    return (await this.load()).signOut();
  }
}

export class LazyFirestorePlanRepository implements PlanRepository {
  private repository: Promise<PlanRepository> | null = null;

  constructor(private readonly uid: string) {}

  private load(): Promise<PlanRepository> {
    this.repository ??= loadFirebase().then(
      (firebase) => new firebase.FirestorePlanRepository(firebase.getFirebaseFirestore(), this.uid),
    );
    return this.repository;
  }

  async list(): Promise<Plan[]> {
    return (await this.load()).list();
  }
  async get(id: string): Promise<Plan | null> {
    return (await this.load()).get(id);
  }
  async save(plan: Plan): Promise<void> {
    return (await this.load()).save(plan);
  }
  async delete(id: string): Promise<void> {
    return (await this.load()).delete(id);
  }
}

export class LazyFirestoreTransactionRepository implements TransactionRepository {
  private repository: Promise<TransactionRepository> | null = null;

  constructor(private readonly uid: string) {}

  private load(): Promise<TransactionRepository> {
    this.repository ??= loadFirebase().then(
      (firebase) => new firebase.FirestoreTransactionRepository(firebase.getFirebaseFirestore(), this.uid),
    );
    return this.repository;
  }

  async list(planId: string): Promise<Transaction[]> {
    return (await this.load()).list(planId);
  }
  async save(planId: string, transaction: Transaction): Promise<void> {
    return (await this.load()).save(planId, transaction);
  }
  async delete(planId: string, transactionId: string): Promise<void> {
    return (await this.load()).delete(planId, transactionId);
  }
  async deleteAll(planId: string): Promise<void> {
    return (await this.load()).deleteAll(planId);
  }
}
