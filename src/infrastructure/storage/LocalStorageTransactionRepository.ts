/**
 * LocalStorageTransactionRepository — เก็บรายการจริงในเบราว์เซอร์ (โหมด Guest)
 * 1 แผน = 1 key: karngein:transactions:{planId} (array ของรายการ)
 * ข้อมูลเสียต้องไม่ทำให้แอปพัง → ข้ามรายการที่เสีย + เตือนใน console (แบบเดียวกับ LocalStoragePlanRepository)
 */
import type { TransactionRepository } from "@/application/ports/TransactionRepository";
import type { Transaction } from "@/domain/entities/Transaction";
import { parseTransaction } from "../schemas/planSchema";

export const transactionsKey = (planId: string) => `karngein:transactions:${planId}`;

export class LocalStorageTransactionRepository implements TransactionRepository {
  constructor(private readonly storage: Storage) {}

  private read(planId: string): Transaction[] {
    const raw = this.storage.getItem(transactionsKey(planId));
    if (raw === null) return [];
    let data: unknown;
    try {
      data = JSON.parse(raw);
    } catch {
      console.warn(`[Karngein] รายการจริงของแผน ${planId} อ่านไม่ได้ — ข้ามไป`);
      return [];
    }
    if (!Array.isArray(data)) return [];
    const transactions: Transaction[] = [];
    for (const item of data) {
      const transaction = parseTransaction(item);
      if (transaction) transactions.push(transaction);
      else console.warn("[Karngein] พบรายการจริงที่ข้อมูลไม่ถูกต้อง — ข้ามรายการนี้", item);
    }
    return transactions;
  }

  private write(planId: string, transactions: Transaction[]) {
    this.storage.setItem(transactionsKey(planId), JSON.stringify(transactions));
  }

  async list(planId: string): Promise<Transaction[]> {
    return this.read(planId);
  }

  async save(planId: string, transaction: Transaction): Promise<void> {
    const others = this.read(planId).filter((t) => t.id !== transaction.id);
    this.write(planId, [...others, transaction]);
  }

  async delete(planId: string, transactionId: string): Promise<void> {
    const all = this.read(planId);
    const remaining = all.filter((t) => t.id !== transactionId);
    if (remaining.length !== all.length) this.write(planId, remaining);
  }

  async deleteAll(planId: string): Promise<void> {
    this.storage.removeItem(transactionsKey(planId));
  }
}
