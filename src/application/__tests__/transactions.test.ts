import { describe, expect, it } from "vitest";
import { findGuestPlansToMigrate, migrateGuestPlans } from "@/application/usecases/migrateGuestPlans";
import { deletePlan } from "@/application/usecases/plans";
import { addTransaction, deleteTransaction, listTransactions, updateTransaction } from "@/application/usecases/transactions";
import type { Plan } from "@/domain/entities/Plan";
import { InMemoryPlanRepository } from "@/infrastructure/storage/InMemoryPlanRepository";
import { InMemoryTransactionRepository } from "@/infrastructure/storage/InMemoryTransactionRepository";
import { goldenPlan3, goldenTransactions3 } from "../../domain/__tests__/goldenData";
import { createTestContext } from "./testContext";

describe("use cases รายการจริง", () => {
  it("เพิ่มรายจ่าย → ได้ id ใหม่ และบันทึกในแผนนั้น", async () => {
    const repo = new InMemoryTransactionRepository();
    const result = await addTransaction(
      repo,
      "plan-1",
      { date: "2026-10-01", type: "expense", amount: 250, category: "essential", planGroupId: "grp-food", note: "  ข้าว  " },
      createTestContext(),
    );
    expect(result).toEqual({
      ok: true,
      transaction: { id: "id-1", date: "2026-10-01", type: "expense", amount: 250, category: "essential", planGroupId: "grp-food", note: "ข้าว" },
    });
    expect(await repo.list("plan-1")).toHaveLength(1);
  });

  it("ข้อมูลผิด (จำนวน 0) → ไม่บันทึก", async () => {
    const repo = new InMemoryTransactionRepository();
    const result = await addTransaction(repo, "p", { date: "2026-10-01", type: "income", amount: 0 }, createTestContext());
    expect(result.ok).toBe(false);
    expect(await repo.list("p")).toEqual([]);
  });

  it("เปลี่ยนรายจ่ายเป็นรายรับ → ตัดหมวด/กลุ่ม/เป้าทิ้ง", async () => {
    const repo = new InMemoryTransactionRepository();
    const result = await updateTransaction(repo, "p", {
      id: "t",
      date: "2026-10-01",
      type: "income",
      amount: 500,
      category: "essential",
      planGroupId: "grp-food",
    });
    expect(result).toEqual({ ok: true, transaction: { id: "t", date: "2026-10-01", type: "income", amount: 500 } });
  });

  it("listTransactions เรียงตามวันที่ / deleteTransaction", async () => {
    const repo = new InMemoryTransactionRepository();
    for (const t of [...goldenTransactions3].reverse()) await repo.save("p", t);
    expect((await listTransactions(repo, "p")).map((t) => t.date)[0]).toBe("2026-09-25");
    await deleteTransaction(repo, "p", "t1");
    expect(await repo.list("p")).toHaveLength(goldenTransactions3.length - 1);
  });
});

describe("ลบแผน → ลบรายการจริงของแผนด้วย", () => {
  it("ไม่เหลือรายการค้าง และแผนอื่นไม่กระทบ", async () => {
    const plans = new InMemoryPlanRepository();
    const tx = new InMemoryTransactionRepository();
    await plans.save(goldenPlan3);
    for (const t of goldenTransactions3) await tx.save(goldenPlan3.id, t);
    await tx.save("other-plan", goldenTransactions3[0]);

    await deletePlan(plans, goldenPlan3.id, tx);
    expect(await plans.get(goldenPlan3.id)).toBeNull();
    expect(await tx.list(goldenPlan3.id)).toEqual([]);
    expect(await tx.list("other-plan")).toHaveLength(1);
  });
});

describe("ย้ายแผน Guest → คลาวด์ พร้อมรายการจริง", () => {
  async function setup(guestPlan: Plan) {
    const stores = { guest: new InMemoryTransactionRepository(), cloud: new InMemoryTransactionRepository() };
    const guestPlans = new InMemoryPlanRepository();
    const cloudPlans = new InMemoryPlanRepository();
    await guestPlans.save(guestPlan);
    for (const t of goldenTransactions3) await stores.guest.save(guestPlan.id, t);
    return { stores, guestPlans, cloudPlans };
  }

  it("ย้ายแผน → รายการจริงไปครบ 7 รายการ, ย้ายซ้ำไม่เกิดรายการซ้ำ", async () => {
    const { stores, guestPlans, cloudPlans } = await setup(goldenPlan3);
    const toMigrate = await findGuestPlansToMigrate(guestPlans, cloudPlans, stores);
    await migrateGuestPlans(toMigrate, cloudPlans, stores);
    await migrateGuestPlans(toMigrate, cloudPlans, stores);
    expect(await stores.cloud.list(goldenPlan3.id)).toHaveLength(7);
  });

  it("แผนไม่มีรายได้/รายจ่ายในแผน แต่มีรายการจริง → ยังต้องย้าย (ไม่นับเป็นแผนว่าง)", async () => {
    const { stores, guestPlans, cloudPlans } = await setup({ ...goldenPlan3, incomes: [], expenses: [] });
    expect(await findGuestPlansToMigrate(guestPlans, cloudPlans, stores)).toHaveLength(1);
  });
});
