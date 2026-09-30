/**
 * Contract test — ชุดเทสต์กลางที่ "ทุก" TransactionRepository ต้องผ่าน (InMemory / LocalStorage / Firestore)
 */
import { beforeEach, describe, expect, it } from "vitest";
import type { TransactionRepository } from "@/application/ports/TransactionRepository";
import type { Transaction } from "@/domain/entities/Transaction";

const tx = (id: string, amount = 100): Transaction => ({
  id,
  date: "2026-10-01",
  type: "expense",
  amount,
  category: "essential",
  planGroupId: "grp-food",
  note: "ข้าวกลางวัน",
});

const byId = (list: Transaction[]) => [...list].sort((a, b) => a.id.localeCompare(b.id));

export function describeTransactionRepositoryContract(
  name: string,
  createRepository: () => TransactionRepository | Promise<TransactionRepository>,
) {
  describe(`TransactionRepository contract: ${name}`, () => {
    let repo: TransactionRepository;

    beforeEach(async () => {
      repo = await createRepository();
    });

    it("แผนที่ยังไม่มีรายการ → []", async () => {
      expect(await repo.list("plan-a")).toEqual([]);
    });

    it("save แล้ว list → ได้ข้อมูลเท่ากันทุกช่อง", async () => {
      await repo.save("plan-a", tx("t1"));
      await repo.save("plan-a", { id: "t2", date: "2026-09-25", type: "income", amount: 44100, planIncomeId: "inc-salary" });
      expect(byId(await repo.list("plan-a"))).toEqual([
        tx("t1"),
        { id: "t2", date: "2026-09-25", type: "income", amount: 44100, planIncomeId: "inc-salary" },
      ]);
    });

    it("save id เดิม → เขียนทับ ไม่เพิ่มรายการ", async () => {
      await repo.save("plan-a", tx("t1", 100));
      await repo.save("plan-a", tx("t1", 999));
      expect(await repo.list("plan-a")).toEqual([tx("t1", 999)]);
    });

    it("รายการของแต่ละแผนแยกกัน", async () => {
      await repo.save("plan-a", tx("t1"));
      await repo.save("plan-b", tx("t9"));
      expect((await repo.list("plan-a")).map((t) => t.id)).toEqual(["t1"]);
      expect((await repo.list("plan-b")).map((t) => t.id)).toEqual(["t9"]);
    });

    it("delete ลบเฉพาะรายการนั้น / id ที่ไม่มี → ไม่ error", async () => {
      await repo.save("plan-a", tx("t1"));
      await repo.save("plan-a", tx("t2"));
      await repo.delete("plan-a", "t1");
      await expect(repo.delete("plan-a", "missing")).resolves.toBeUndefined();
      expect((await repo.list("plan-a")).map((t) => t.id)).toEqual(["t2"]);
    });

    it("deleteAll ลบทุกรายการของแผนนั้น แต่แผนอื่นยังอยู่", async () => {
      await repo.save("plan-a", tx("t1"));
      await repo.save("plan-a", tx("t2"));
      await repo.save("plan-b", tx("t9"));
      await repo.deleteAll("plan-a");
      expect(await repo.list("plan-a")).toEqual([]);
      expect(await repo.list("plan-b")).toHaveLength(1);
    });

    it("แก้ object ที่ได้จาก list / หลัง save → ข้อมูลที่เก็บไว้ไม่เปลี่ยน", async () => {
      const original = tx("t1");
      await repo.save("plan-a", original);
      original.amount = 1;
      const [loaded] = await repo.list("plan-a");
      loaded.amount = 2;
      expect((await repo.list("plan-a"))[0].amount).toBe(100);
    });
  });
}
