import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { InMemoryTransactionRepository } from "@/infrastructure/storage/InMemoryTransactionRepository";
import {
  LocalStorageTransactionRepository,
  transactionsKey,
} from "@/infrastructure/storage/LocalStorageTransactionRepository";
import { describeTransactionRepositoryContract } from "./transactionRepository.contract";

describeTransactionRepositoryContract("InMemoryTransactionRepository", () => new InMemoryTransactionRepository());

describeTransactionRepositoryContract("LocalStorageTransactionRepository", () => {
  window.localStorage.clear();
  return new LocalStorageTransactionRepository(window.localStorage);
});

describe("LocalStorageTransactionRepository — ข้อมูลเสียต้องไม่ทำให้แอปพัง", () => {
  beforeEach(() => {
    window.localStorage.clear();
    vi.spyOn(console, "warn").mockImplementation(() => {});
  });
  afterEach(() => vi.restoreAllMocks());

  it('"{abc" → [] ไม่ throw', async () => {
    window.localStorage.setItem(transactionsKey("p"), "{abc");
    await expect(new LocalStorageTransactionRepository(window.localStorage).list("p")).resolves.toEqual([]);
  });

  it("รายการเสียปนกับรายการดี → ข้ามเฉพาะที่เสีย", async () => {
    const good = { id: "ok", date: "2026-10-01", type: "income", amount: 1 };
    const bad = { id: "bad", date: "2026-10-01", type: "expense", amount: -5 };
    window.localStorage.setItem(transactionsKey("p"), JSON.stringify([good, bad]));
    expect((await new LocalStorageTransactionRepository(window.localStorage).list("p")).map((t) => t.id)).toEqual(["ok"]);
  });
});
