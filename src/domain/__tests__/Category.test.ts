import { describe, expect, it } from "vitest";
import {
  CATEGORIES,
  SAVING_CATEGORY_IDS,
  categoryOrder,
  getCategory,
  isCategoryId,
} from "@/domain/entities/Category";

describe("Category — 5 หมวดรายจ่าย (D1)", () => {
  it("มี 5 หมวด เรียงตาม PLAN.md ข้อ 8.2", () => {
    expect(CATEGORIES.map((c) => c.id)).toEqual([
      "essential",
      "wants",
      "investment",
      "emergency",
      "reward",
    ]);
  });

  it("ทุกหมวดมีชื่อไทยและสี ไม่ซ้ำกัน", () => {
    expect(new Set(CATEGORIES.map((c) => c.label)).size).toBe(5);
    expect(new Set(CATEGORIES.map((c) => c.color)).size).toBe(5);
  });

  it('หมวด emergency ชื่อ "เงินสำรองฉุกเฉิน"', () => {
    expect(getCategory("emergency").label).toBe("เงินสำรองฉุกเฉิน");
  });

  it("หมวดเงินออม (R8) = investment + emergency", () => {
    expect(SAVING_CATEGORY_IDS).toEqual(["investment", "emergency"]);
  });

  it("categoryOrder ใช้เรียงลำดับได้", () => {
    expect(categoryOrder("essential")).toBeLessThan(categoryOrder("reward"));
  });

  it("isCategoryId ตรวจค่าที่ไม่รู้จัก", () => {
    expect(isCategoryId("essential")).toBe(true);
    expect(isCategoryId("Needs")).toBe(false);
  });
});
