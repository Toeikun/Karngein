import { describe, expect, it } from "vitest";
import { formatBaht, isValidAmount, round2 } from "@/domain/entities/Money";

describe("round2 — ปัดเศษ 2 ตำแหน่ง (R11)", () => {
  it("34166.666 → 34166.67", () => expect(round2(34166.666)).toBe(34166.67));
  it("1.005 → 1.01 (ไม่โดนปัญหาทศนิยมของคอมพิวเตอร์)", () => expect(round2(1.005)).toBe(1.01));
  it("50000 / 12 → 4166.67", () => expect(round2(50000 / 12)).toBe(4166.67));
});

describe("formatBaht — แสดงเป็นเงินบาท", () => {
  it('0 → "฿0.00"', () => expect(formatBaht(0)).toBe("฿0.00"));
  it('1234.5 → "฿1,234.50"', () => expect(formatBaht(1234.5)).toBe("฿1,234.50"));
  it('-500 → "-฿500.00"', () => expect(formatBaht(-500)).toBe("-฿500.00"));
  it('34166.666 → "฿34,166.67"', () => expect(formatBaht(34166.666)).toBe("฿34,166.67"));
  it('-0.001 → "฿0.00" (ไม่แสดง -฿0.00)', () => expect(formatBaht(-0.001)).toBe("฿0.00"));
});

describe("isValidAmount — จำนวนเงินที่ยอมรับ (R12)", () => {
  it.each([0, 1, 30000, 0.5])("ยอมรับ %s", (value) => expect(isValidAmount(value)).toBe(true));
  it.each([-1, NaN, Infinity, "100", null, undefined])("ไม่ยอมรับ %s", (value) =>
    expect(isValidAmount(value)).toBe(false),
  );
});
