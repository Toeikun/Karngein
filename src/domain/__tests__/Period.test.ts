import { describe, expect, it } from "vitest";
import { DEFAULT_YEAR, isValidRange, monthsInRange } from "@/domain/entities/Period";

describe("Period", () => {
  it("ปีเริ่มต้น = 2027 (D3)", () => expect(DEFAULT_YEAR).toBe(2027));

  it("ก.ย.–พ.ย. = 3 เดือน (นับรวมหัวท้าย)", () => {
    expect(monthsInRange({ year: 2026, month: 9 }, { year: 2026, month: 11 })).toBe(3);
  });

  it("ข้ามปี พ.ย. 2026 – ก.พ. 2027 = 4 เดือน", () => {
    expect(monthsInRange({ year: 2026, month: 11 }, { year: 2027, month: 2 })).toBe(4);
  });

  it("เดือนเดียวกัน = 1 เดือน และถือว่าถูกต้อง", () => {
    const m = { year: 2027, month: 5 };
    expect(monthsInRange(m, m)).toBe(1);
    expect(isValidRange(m, m)).toBe(true);
  });

  it("สิ้นสุดก่อนเริ่ม → ไม่ถูกต้อง", () => {
    expect(isValidRange({ year: 2027, month: 5 }, { year: 2027, month: 4 })).toBe(false);
  });

  it("เดือน 13 → ไม่ถูกต้อง", () => {
    expect(isValidRange({ year: 2027, month: 1 }, { year: 2027, month: 13 })).toBe(false);
  });
});
