import { describe, expect, it } from "vitest";
import { validateIncome } from "@/domain/entities/Income";

const valid = { name: "เงินเดือน", amount: 30000, frequency: "monthly" };
const fields = (errors: { field: string }[]) => errors.map((e) => e.field);

describe("validateIncome", () => {
  it("ข้อมูลถูกต้อง → ไม่มี error", () => {
    expect(validateIncome(valid)).toEqual([]);
  });

  it("amount ติดลบ → error ที่ amount (R12)", () => {
    expect(fields(validateIncome({ ...valid, amount: -1 }))).toEqual(["amount"]);
  });

  it("amount ไม่ใช่ตัวเลข → error ที่ amount", () => {
    expect(fields(validateIncome({ ...valid, amount: NaN }))).toEqual(["amount"]);
  });

  it("ชื่อว่าง (มีแต่ช่องว่าง) → error ที่ name", () => {
    expect(fields(validateIncome({ ...valid, name: "   " }))).toEqual(["name"]);
  });

  it("one-time ไม่มีวันที่ → error ที่ date", () => {
    expect(fields(validateIncome({ ...valid, frequency: "one-time", date: undefined }))).toEqual([
      "date",
    ]);
  });

  it("one-time วันที่ไม่มีจริง (30 ก.พ.) → error ที่ date", () => {
    expect(fields(validateIncome({ ...valid, frequency: "one-time", date: "2027-02-30" }))).toEqual(
      ["date"],
    );
  });

  it("one-time มีวันที่ถูกต้อง → ผ่าน", () => {
    expect(validateIncome({ ...valid, frequency: "one-time", date: "2027-09-26" })).toEqual([]);
  });

  it("ผิดหลายช่อง → ได้ error ครบทุกช่องพร้อมกัน", () => {
    expect(fields(validateIncome({ name: "", amount: -5, frequency: "weekly" }))).toEqual([
      "name",
      "amount",
      "frequency",
    ]);
  });

  it("error message เป็นภาษาไทย", () => {
    expect(validateIncome({ ...valid, amount: -1 })[0].message).toBe(
      "จำนวนเงินต้องเป็นตัวเลขตั้งแต่ 0 ขึ้นไป",
    );
  });
});
