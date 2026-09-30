"use client";

/**
 * useTransactions — รายการจริงของแผนที่เปิดอยู่ (โหลด / เพิ่ม / แก้ / ลบ)
 * ใช้ use case จาก Application — hook นี้ไม่รู้ว่าข้อมูลอยู่ในเครื่องหรือบนคลาวด์
 *
 * หมายเหตุ: component ที่ใช้ hook นี้ควรใส่ key={planId} → สลับแผนแล้ว state เริ่มใหม่ (โหลดใหม่ทั้งหมด)
 */
import { useCallback, useEffect, useState } from "react";
import type { UseCaseContext } from "@/application/context";
import type { TransactionRepository } from "@/application/ports/TransactionRepository";
import { addTransaction, deleteTransaction, listTransactions, updateTransaction } from "@/application/usecases/transactions";
import type { Transaction, TransactionInput } from "@/domain/entities/Transaction";
import type { ValidationError } from "@/domain/entities/validation";

export function useTransactions(repository: TransactionRepository, planId: string, ctx: UseCaseContext) {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    listTransactions(repository, planId)
      .then((list) => {
        if (!cancelled) setTransactions(list);
      })
      .catch((err: unknown) => {
        console.error("[Karngein] โหลดรายการจริงไม่สำเร็จ", err);
        if (!cancelled) setError(err instanceof Error ? err.message : String(err));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [repository, planId]);

  const add = useCallback(
    async (input: TransactionInput): Promise<ValidationError[]> => {
      const result = await addTransaction(repository, planId, input, ctx);
      if (!result.ok) return result.errors;
      setTransactions((list) => [...list, result.transaction]);
      return [];
    },
    [repository, planId, ctx],
  );

  const update = useCallback(
    async (transaction: Transaction): Promise<ValidationError[]> => {
      const result = await updateTransaction(repository, planId, transaction);
      if (!result.ok) return result.errors;
      setTransactions((list) => list.map((t) => (t.id === transaction.id ? result.transaction : t)));
      return [];
    },
    [repository, planId],
  );

  const remove = useCallback(
    async (id: string) => {
      await deleteTransaction(repository, planId, id);
      setTransactions((list) => list.filter((t) => t.id !== id));
    },
    [repository, planId],
  );

  return { transactions, loading, error, add, update, remove };
}
