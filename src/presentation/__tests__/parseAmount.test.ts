import { describe, expect, it } from "vitest";
import { formatAmountInput, parseAmount } from "@/presentation/utils/parseAmount";

describe("parseAmount — แปลงข้อความในช่องเงิน", () => {
  it.each([
    ["30000", 30000],
    ["30,000", 30000],
    ["1234.5", 1234.5],
    ["฿ 1,000.25", 1000.25],
    ["0", 0],
  ])('"%s" → %s', (text, value) => expect(parseAmount(text)).toEqual({ ok: true, value }));

  it.each(["-100", "abc", "1.234", "12a"])('"%s" → error', (text) => {
    expect(parseAmount(text).ok).toBe(false);
  });

  it('ช่องว่าง → "กรุณาใส่จำนวนเงิน"', () => {
    expect(parseAmount("")).toEqual({ ok: false, message: "กรุณาใส่จำนวนเงิน" });
  });

  it("formatAmountInput ใส่คอมมา", () => {
    expect(formatAmountInput(30000)).toBe("30,000");
    expect(formatAmountInput(1234.5)).toBe("1,234.5");
  });
});
