import { describe, expect, it } from "vitest";
import type { Period } from "@/domain/entities/Period";
import { amountInPeriod } from "@/domain/services/amountInPeriod";

const monthly: Period = { kind: "monthly" };
const year2027: Period = { kind: "yearly", year: 2027 };
const sepToNov2027: Period = {
  kind: "range",
  from: { year: 2027, month: 9 },
  to: { year: 2027, month: 11 },
};

describe("amountInPeriod — มุมมองรายเดือน", () => {
  it("R1: monthly 30,000 → 30,000", () => {
    expect(amountInPeriod({ amount: 30000, frequency: "monthly" }, monthly)).toBe(30000);
  });
  it("R2: yearly 50,000 → 50,000 ÷ 12", () => {
    expect(amountInPeriod({ amount: 50000, frequency: "yearly" }, monthly)).toBe(50000 / 12);
  });
  it("R3: one-time → 0 เสมอ", () => {
    const gift = { amount: 30000, frequency: "one-time" as const, date: "2027-09-26" };
    expect(amountInPeriod(gift, monthly)).toBe(0);
  });
});

describe("amountInPeriod — มุมมองรายปี (R4)", () => {
  it("monthly × 12", () => {
    expect(amountInPeriod({ amount: 30000, frequency: "monthly" }, year2027)).toBe(360000);
  });
  it("yearly × 1", () => {
    expect(amountInPeriod({ amount: 50000, frequency: "yearly" }, year2027)).toBe(50000);
  });
  it("one-time วันที่อยู่ในปี → นับ", () => {
    const entry = { amount: 30000, frequency: "one-time" as const, date: "2027-12-31" };
    expect(amountInPeriod(entry, year2027)).toBe(30000);
  });
  it("one-time วันที่อยู่นอกปี → 0", () => {
    const entry = { amount: 30000, frequency: "one-time" as const, date: "2028-01-01" };
    expect(amountInPeriod(entry, year2027)).toBe(0);
  });
});

describe("amountInPeriod — มุมมองกำหนดช่วง (R5)", () => {
  it("monthly × 3 เดือน", () => {
    expect(amountInPeriod({ amount: 30000, frequency: "monthly" }, sepToNov2027)).toBe(90000);
  });
  it("yearly = (÷12) × 3 เดือน", () => {
    expect(amountInPeriod({ amount: 12000, frequency: "yearly" }, sepToNov2027)).toBe(3000);
  });
  it.each([
    ["2027-09-01", 500], // วันแรกของช่วง
    ["2027-11-30", 500], // วันสุดท้ายของช่วง
    ["2027-08-31", 0], // ก่อนช่วง 1 วัน
    ["2027-12-01", 0], // หลังช่วง 1 วัน
  ])("one-time วันที่ %s → %s", (date, expected) => {
    expect(amountInPeriod({ amount: 500, frequency: "one-time", date }, sepToNov2027)).toBe(
      expected,
    );
  });
  it("ช่วงข้ามปี พ.ย. 2027 – ก.พ. 2028 = 4 เดือน", () => {
    const period: Period = {
      kind: "range",
      from: { year: 2027, month: 11 },
      to: { year: 2028, month: 2 },
    };
    expect(amountInPeriod({ amount: 1000, frequency: "monthly" }, period)).toBe(4000);
  });
});
