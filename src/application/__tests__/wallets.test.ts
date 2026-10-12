import { describe, expect, it } from "vitest";
import { addTransaction } from "@/application/usecases/transactions";
import { addWallet, removeWallet, setWalletArchived, updateWallet } from "@/application/usecases/wallets";
import { walletsOf } from "@/domain/entities/Plan";
import type { Transaction } from "@/domain/entities/Transaction";
import type { WalletInput } from "@/domain/entities/Wallet";
import { InMemoryTransactionRepository } from "@/infrastructure/storage/InMemoryTransactionRepository";
import { goldenPlan3 } from "../../domain/__tests__/goldenData";
import { createTestContext, deepFreeze, FIXED_NOW, unwrap } from "./testContext";

const card: WalletInput = { name: "  บัตร KTC ", kind: "credit", openingBalance: 1200, creditLimit: 50000, statementDay: 25, dueDay: 10 };

describe("use cases กระเป๋าเงิน (R29)", () => {
  const plan = deepFreeze(structuredClone({ ...goldenPlan3, wallets: [{ id: "w-cash", name: "เงินสด", kind: "cash" as const, openingBalance: 500 }] }));

  it("เพิ่มกระเป๋า → id ใหม่, ตัดช่องว่างชื่อ, แผนเดิมไม่เปลี่ยน / แผนเก่าไม่มี wallets ก็เพิ่มได้", () => {
    const next = unwrap(addWallet(plan, card, createTestContext()));
    expect(walletsOf(next)[1]).toEqual({ id: "id-1", name: "บัตร KTC", kind: "credit", openingBalance: 1200, creditLimit: 50000, statementDay: 25, dueDay: 10 });
    expect(next.updatedAt).toBe(FIXED_NOW.toISOString());
    expect(walletsOf(plan)).toHaveLength(1);
    expect(walletsOf(unwrap(addWallet({ ...goldenPlan3, wallets: undefined }, card, createTestContext())))).toHaveLength(1);
  });

  it("ไม่ใช่บัตร → ไม่เก็บวงเงิน/วันตัดรอบ / ข้อมูลผิด → error", () => {
    const next = unwrap(addWallet(plan, { ...card, kind: "bank" }, createTestContext()));
    expect(walletsOf(next)[1]).toEqual({ id: "id-1", name: "บัตร KTC", kind: "bank", openingBalance: 1200 });
    expect(addWallet(plan, { ...card, name: "" }, createTestContext()).ok).toBe(false);
  });

  it("แก้ไข / ไม่พบ", () => {
    const next = unwrap(updateWallet(plan, "w-cash", { name: "กระเป๋าสตางค์", kind: "cash", openingBalance: 800 }, createTestContext()));
    expect(walletsOf(next)[0]).toEqual({ id: "w-cash", name: "กระเป๋าสตางค์", kind: "cash", openingBalance: 800 });
    expect(updateWallet(plan, "nope", card, createTestContext()).ok).toBe(false);
  });

  it("ซ่อน / เลิกซ่อน (ไม่เก็บ archived: false)", () => {
    const hidden = unwrap(setWalletArchived(plan, "w-cash", true, createTestContext()));
    expect(walletsOf(hidden)[0].archived).toBe(true);
    expect(walletsOf(unwrap(setWalletArchived(hidden, "w-cash", false, createTestContext())))[0]).not.toHaveProperty("archived");
  });

  it("ลบ: ไม่มีรายการ → ลบได้ / มีรายการอ้างอิง (รวมปลายทางของการโอน) → error แนะนำให้ซ่อน", () => {
    expect(walletsOf(unwrap(removeWallet(plan, "w-cash", [], createTestContext())))).toEqual([]);
    const used: Transaction[] = [{ id: "t", date: "2026-10-01", type: "transfer", amount: 100, walletId: "w-bank", toWalletId: "w-cash" }];
    const result = removeWallet(plan, "w-cash", used, createTestContext());
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.errors[0].message).toContain("มี 1 รายการใช้กระเป๋านี้");
  });
});

describe("บันทึกรายการกับกระเป๋า", () => {
  it("โอน: เก็บแค่ต้นทาง/ปลายทาง (ตัดหมวด/กลุ่มที่ติดมาจากฟอร์มทิ้ง) / รับ-จ่ายเก็บ walletId", async () => {
    const repo = new InMemoryTransactionRepository();
    const transfer = await addTransaction(
      repo,
      "p",
      { date: "2026-10-01", type: "transfer", amount: 500, walletId: "a", toWalletId: "b", note: " ถอน " },
      createTestContext(),
    );
    expect(transfer).toEqual({ ok: true, transaction: { id: "id-1", date: "2026-10-01", type: "transfer", amount: 500, walletId: "a", toWalletId: "b", note: "ถอน" } });
    const expense = await addTransaction(repo, "p", { date: "2026-10-01", type: "expense", amount: 60, category: "essential", walletId: "a" }, createTestContext());
    expect(expense.ok && expense.transaction.walletId).toBe("a");
  });
});
