import { describe, expect, it } from "vitest";
import {
  cycleContaining,
  daysLeftInCycle,
  isValidStartDay,
  shiftCycle,
} from "@/domain/entities/PayCycle";

describe("R13 — รอบเงินเดือนวันที่ 25 (สถานการณ์ของเจ้าของโปรเจกต์)", () => {
  it.each([
    ["2026-09-25", "2026-09-25", "2026-10-24"], // วันเงินเดือนออก = วันแรกของรอบ
    ["2026-10-01", "2026-09-25", "2026-10-24"],
    ["2026-10-24", "2026-09-25", "2026-10-24"], // วันสุดท้ายของรอบ
    ["2026-10-25", "2026-10-25", "2026-11-24"], // เงินเดือนรอบใหม่
    ["2026-09-24", "2026-08-25", "2026-09-24"], // ก่อนเงินเดือนออก 1 วัน = รอบก่อน
  ])("%s อยู่รอบ %s – %s", (date, start, end) => {
    expect(cycleContaining(date, 25)).toEqual({ start, end });
  });

  it("ข้ามปี: 2026-12-30 อยู่รอบ 25 ธ.ค. 2026 – 24 ม.ค. 2027", () => {
    expect(cycleContaining("2026-12-30", 25)).toEqual({ start: "2026-12-25", end: "2027-01-24" });
    expect(cycleContaining("2027-01-10", 25)).toEqual({ start: "2026-12-25", end: "2027-01-24" });
  });
});

describe("R14 — เดือนที่ไม่มีวันเริ่ม ใช้วันสุดท้ายของเดือน", () => {
  it("วันเริ่ม 31: ก.พ. 2027 (28 วัน) → รอบเริ่ม 28 ก.พ.", () => {
    expect(cycleContaining("2027-02-28", 31)).toEqual({ start: "2027-02-28", end: "2027-03-30" });
    expect(cycleContaining("2027-02-15", 31)).toEqual({ start: "2027-01-31", end: "2027-02-27" });
  });

  it("วันเริ่ม 31: ก.พ. 2028 ปีอธิกสุรทิน (29 วัน) → รอบเริ่ม 29 ก.พ.", () => {
    expect(cycleContaining("2028-02-29", 31)).toEqual({ start: "2028-02-29", end: "2028-03-30" });
  });

  it("วันเริ่ม 31: เม.ย. (30 วัน) → รอบเริ่ม 30 เม.ย.", () => {
    expect(cycleContaining("2027-04-30", 31)).toEqual({ start: "2027-04-30", end: "2027-05-30" });
  });
});

describe("R15 — วันเริ่ม 1 = เดือนปฏิทิน", () => {
  it.each([
    ["2027-01-01", "2027-01-01", "2027-01-31"],
    ["2027-02-14", "2027-02-01", "2027-02-28"],
    ["2028-02-29", "2028-02-01", "2028-02-29"],
  ])("%s → %s – %s", (date, start, end) => {
    expect(cycleContaining(date, 1)).toEqual({ start, end });
  });
});

describe("เลื่อนรอบ / เหลือกี่วัน", () => {
  const cycle = cycleContaining("2026-10-01", 25);

  it("รอบถัดไป / รอบก่อนหน้า", () => {
    expect(shiftCycle(cycle, 25, 1)).toEqual({ start: "2026-10-25", end: "2026-11-24" });
    expect(shiftCycle(cycle, 25, -1)).toEqual({ start: "2026-08-25", end: "2026-09-24" });
    expect(shiftCycle(cycle, 25, -12)).toEqual({ start: "2025-09-25", end: "2025-10-24" });
  });

  it("รอบที่ต่อกันไม่มีวันขาดหรือซ้อน (ทดสอบ 36 รอบ วันเริ่ม 31)", () => {
    let current = cycleContaining("2027-01-31", 31);
    for (let i = 0; i < 36; i++) {
      const next = shiftCycle(current, 31, 1);
      const dayAfterEnd = new Date(`${current.end}T00:00:00Z`);
      dayAfterEnd.setUTCDate(dayAfterEnd.getUTCDate() + 1);
      expect(next.start).toBe(dayAfterEnd.toISOString().slice(0, 10));
      current = next;
    }
  });

  it("เหลือกี่วันก่อนรอบใหม่ (นับวันนี้ด้วย)", () => {
    expect(daysLeftInCycle("2026-10-24", cycle)).toBe(1);
    expect(daysLeftInCycle("2026-10-20", cycle)).toBe(5);
    expect(daysLeftInCycle("2026-09-25", cycle)).toBe(30);
  });

  it("วันเริ่มที่ใช้ได้ 1–31 เท่านั้น", () => {
    expect([1, 25, 31].every(isValidStartDay)).toBe(true);
    expect([0, 32, 2.5, "25", null].some(isValidStartDay)).toBe(false);
  });
});
