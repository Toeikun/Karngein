/**
 * InMemoryTransactionRepository — เก็บรายการจริงในหน่วยความจำ (ใช้ในเทสต์)
 */
import type { TransactionRepository } from "@/application/ports/TransactionRepository";
import type { Transaction } from "@/domain/entities/Transaction";

export class InMemoryTransactionRepository implements TransactionRepository {
  private readonly byPlan = new Map<string, Map<string, Transaction>>();

  private planMap(planId: string) {
    let map = this.byPlan.get(planId);
    if (!map) this.byPlan.set(planId, (map = new Map()));
    return map;
  }

  async list(planId: string): Promise<Transaction[]> {
    return [...this.planMap(planId).values()].map((t) => structuredClone(t));
  }

  async save(planId: string, transaction: Transaction): Promise<void> {
    this.planMap(planId).set(transaction.id, structuredClone(transaction));
  }

  async delete(planId: string, transactionId: string): Promise<void> {
    this.planMap(planId).delete(transactionId);
  }

  async deleteAll(planId: string): Promise<void> {
    this.byPlan.delete(planId);
  }
}
