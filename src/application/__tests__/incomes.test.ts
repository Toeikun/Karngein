import { describe, expect, it } from "vitest";
import { addIncome, removeIncome, updateIncome } from "@/application/usecases/incomes";
import { basePlan, createTestContext, FIXED_NOW, unwrap } from "./testContext";

describe("addIncome", () => {
  it("เพิ่มรายได้ → จำนวน +1 และแผนเดิมไม่ถูกแก้ (immutability)", () => {
    const plan = basePlan(); // ถูก deepFreeze ถ้าแอบแก้จะ throw
    const next = unwrap(
      addIncome(plan, { name: "โบนัส", amount: 50000, frequency: "yearly" }, createTestContext()),
    );
    expect(next.incomes).toHaveLength(2);
    expect(plan.incomes).toHaveLength(1);
    expect(next).not.toBe(plan);
  });

  it("ได้ id ใหม่จาก context และอัปเดต updatedAt", () => {
    const next = unwrap(
      addIncome(basePlan(), { name: "โบนัส", amount: 1, frequency: "monthly" }, createTestContext()),
    );
    expect(next.incomes[1].id).toBe("id-1");
    expect(next.updatedAt).toBe(FIXED_NOW.toISOString());
  });

  it("ตัดช่องว่างหน้า-หลังชื่อ", () => {
    const next = unwrap(
      addIncome(basePlan(), { name: "  ค่าเช่า  ", amount: 1, frequency: "monthly" }, createTestContext()),
    );
    expect(next.incomes[1].name).toBe("ค่าเช่า");
  });

  it("amount ติดลบ → ไม่สำเร็จ พร้อม error และแผนไม่เปลี่ยน", () => {
    const plan = basePlan();
    const result = addIncome(plan, { name: "x", amount: -1, frequency: "monthly" }, createTestContext());
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.errors.map((e) => e.field)).toEqual(["amount"]);
    expect(plan.incomes).toHaveLength(1);
  });

  it("รายการรายเดือนที่แนบวันที่มา → ตัดวันที่ทิ้ง", () => {
    const next = unwrap(
      addIncome(
        basePlan(),
        { name: "x", amount: 1, frequency: "monthly", date: "2027-01-01" },
        createTestContext(),
      ),
    );
    expect(next.incomes[1]).not.toHaveProperty("date");
  });
});

describe("updateIncome", () => {
  it("แก้จำนวนเงิน → เปลี่ยนเฉพาะรายการนั้น", () => {
    const next = unwrap(updateIncome(basePlan(), "inc-1", { amount: 35000 }, createTestContext()));
    expect(next.incomes[0]).toEqual({ id: "inc-1", name: "เงินเดือน", amount: 35000, frequency: "monthly" });
  });

  it("เปลี่ยนเป็น one-time โดยไม่ใส่วันที่ → error ที่ date", () => {
    const result = updateIncome(basePlan(), "inc-1", { frequency: "one-time" }, createTestContext());
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.errors[0].field).toBe("date");
  });

  it("เปลี่ยนจาก one-time กลับเป็นรายเดือน → วันที่ถูกลบ", () => {
    const ctx = createTestContext();
    const oneTime = unwrap(
      updateIncome(basePlan(), "inc-1", { frequency: "one-time", date: "2027-05-01" }, ctx),
    );
    const monthly = unwrap(updateIncome(oneTime, "inc-1", { frequency: "monthly" }, ctx));
    expect(monthly.incomes[0]).not.toHaveProperty("date");
  });

  it("id ไม่มีอยู่ → error", () => {
    const result = updateIncome(basePlan(), "nope", { amount: 1 }, createTestContext());
    expect(result).toEqual({ ok: false, errors: [{ field: "id", message: "ไม่พบรายได้" }] });
  });
});

describe("removeIncome", () => {
  it("ลบแล้วหายไป แผนเดิมยังอยู่ครบ", () => {
    const plan = basePlan();
    const next = unwrap(removeIncome(plan, "inc-1", createTestContext()));
    expect(next.incomes).toEqual([]);
    expect(plan.incomes).toHaveLength(1);
  });

  it("id ไม่มีอยู่ → error", () => {
    expect(removeIncome(basePlan(), "nope", createTestContext()).ok).toBe(false);
  });
});
