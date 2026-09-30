/**
 * FirestoreTransactionRepository — เก็บรายการจริงบน Firestore (โหมดล็อกอิน)
 *
 * โครงสร้าง: users/{uid}/plans/{planId}/transactions/{transactionId}  (1 รายการ = 1 เอกสาร)
 * อ่าน/เขียนแบบไม่ให้หน้าค้าง เหมือน FirestorePlanRepository (ใช้ cache เมื่อเซิร์ฟเวอร์ช้า)
 */
import {
  collection,
  deleteDoc,
  doc,
  getDocsFromCache,
  getDocsFromServer,
  setDoc,
  writeBatch,
  type Firestore,
} from "firebase/firestore";
import type { TransactionRepository } from "@/application/ports/TransactionRepository";
import type { Transaction } from "@/domain/entities/Transaction";
import { parseTransaction } from "../schemas/planSchema";
import { friendly, settleWrite } from "./firestoreHelpers";
import { readWithCacheFallback } from "./readWithCacheFallback";

const READ_TIMEOUT_MS = 3000;
const BATCH_LIMIT = 450; // Firestore จำกัด 500 คำสั่งต่อ batch

export class FirestoreTransactionRepository implements TransactionRepository {
  constructor(
    private readonly db: Firestore,
    private readonly uid: string,
  ) {}

  private collectionOf(planId: string) {
    return collection(this.db, "users", this.uid, "plans", planId, "transactions");
  }

  async list(planId: string): Promise<Transaction[]> {
    const ref = this.collectionOf(planId);
    const snapshot = await friendly(
      readWithCacheFallback(
        () => getDocsFromServer(ref),
        () => getDocsFromCache(ref).then((cached) => (cached.empty ? null : cached)),
        READ_TIMEOUT_MS,
      ),
    );
    const transactions: Transaction[] = [];
    snapshot.forEach((document) => {
      const transaction = parseTransaction(document.data());
      if (transaction) transactions.push(transaction);
      else console.warn("[Karngein] รายการจริงบนคลาวด์ข้อมูลไม่ถูกต้อง — ข้าม", document.id);
    });
    return transactions;
  }

  async save(planId: string, transaction: Transaction): Promise<void> {
    const data = JSON.parse(JSON.stringify(transaction)) as Transaction; // ตัด undefined
    await settleWrite(setDoc(doc(this.collectionOf(planId), transaction.id), data), "บันทึกรายการขึ้นคลาวด์ไม่สำเร็จ");
  }

  async delete(planId: string, transactionId: string): Promise<void> {
    await settleWrite(deleteDoc(doc(this.collectionOf(planId), transactionId)), "ลบรายการบนคลาวด์ไม่สำเร็จ");
  }

  async deleteAll(planId: string): Promise<void> {
    const ids = (await this.list(planId)).map((t) => t.id);
    for (let i = 0; i < ids.length; i += BATCH_LIMIT) {
      const batch = writeBatch(this.db);
      for (const id of ids.slice(i, i + BATCH_LIMIT)) batch.delete(doc(this.collectionOf(planId), id));
      await settleWrite(batch.commit(), "ลบรายการของแผนบนคลาวด์ไม่สำเร็จ");
    }
  }
}
