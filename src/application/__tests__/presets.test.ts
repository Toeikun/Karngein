import { describe, expect, it } from "vitest";
import { PRESETS } from "@/application/presets/presets";
import { applyPreset } from "@/application/usecases/presets";
import { copyImportedPlan, renamePlan } from "@/application/usecases/plans";
import { summarize } from "@/domain/services/summarize";
import { parsePlan } from "@/infrastructure/schemas/planSchema";
import { basePlan, createTestContext, FIXED_NOW, unwrap } from "./testContext";

describe("applyPreset — ทุกแม่แบบ", () => {
  it.each(PRESETS.map((p) => [p.label, p.id] as const))("%s → แผนผ่าน Zod schema และตัวเลขไม่เป็น NaN", (_label, id) => {
    const plan = unwrap(applyPreset(basePlan(), id, createTestContext()));
    expect(parsePlan(plan)).not.toBeNull();
    for (const period of [{ kind: "monthly" } as const, { kind: "yearly", year: 2027 } as const]) {
      const s = summarize(plan, period);
      for (const value of [s.income, s.expense, s.saving, s.remaining]) expect(Number.isFinite(value)).toBe(true);
      expect(s.income).toBeGreaterThan(0);
    }
  });

  it("แทนที่รายได้/รายจ่ายเดิม แต่ id และชื่อแผนคงเดิม", () => {
    const plan = unwrap(applyPreset(basePlan(), "salaryman", createTestContext()));
    expect(plan.id).toBe("plan-1");
    expect(plan.name).toBe("แผนทดสอบ");
    expect(plan.incomes.map((i) => i.name)).toEqual(["เงินเดือน", "โบนัสประจำปี"]);
  });

  it("ชื่อกลุ่มไม่ถูกทับด้วยชื่อรายการ (กลุ่มที่ไม่มีรายการย่อย)", () => {
    const plan = unwrap(applyPreset(basePlan(), "family", createTestContext()));
    expect(plan.expenses.map((g) => g.name)).toContain("ใช้จ่ายตามใจ");
  });

  it("ทุกแม่แบบใช้หมวดครอบคลุมอย่างน้อย 3 หมวด", () => {
    for (const preset of PRESETS) {
      expect(new Set(preset.expenses.map((g) => g.category)).size).toBeGreaterThanOrEqual(3);
    }
  });
});

describe("renamePlan / copyImportedPlan", () => {
  it("เปลี่ยนชื่อ (ตัดช่องว่าง)", () => {
    expect(unwrap(renamePlan(basePlan(), "  แผนปี 2027 ", createTestContext())).name).toBe("แผนปี 2027");
  });

  it("ชื่อว่าง → error", () => {
    expect(renamePlan(basePlan(), "  ", createTestContext())).toEqual({
      ok: false,
      errors: [{ field: "name", message: "กรุณาระบุชื่อแผน" }],
    });
  });

  it("แผนที่นำเข้าได้ id ใหม่ (ไม่ทับแผนเดิม) และต่อท้ายชื่อ (นำเข้า)", () => {
    const copy = copyImportedPlan(basePlan(), createTestContext());
    expect(copy).toMatchObject({ id: "id-1", name: "แผนทดสอบ (นำเข้า)", updatedAt: FIXED_NOW.toISOString() });
    expect(copy.incomes).toEqual(basePlan().incomes);
  });
});
