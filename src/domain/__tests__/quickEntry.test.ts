import { describe, expect, it } from "vitest";
import type { Plan } from "@/domain/entities/Plan";
import type { Transaction } from "@/domain/entities/Transaction";
import { evaluateAmount } from "@/domain/services/amountExpression";
import { guessCategory } from "@/domain/services/categoryGuess";
import { isEmptyQuery, searchTransactions } from "@/domain/services/searchTransactions";
import { extractTags, stripTags } from "@/domain/services/tags";
import { goldenPlan3 } from "./goldenData";

describe("evaluateAmount — คิดเลขในช่องจำนวนเงิน", () => {
  it.each([
    ["250", 250, false],
    ["1,250.50", 1250.5, false],
    ["120+35", 155, true],
    ["120 + 35 × 2", 190, true], // คูณก่อนบวก
    ["100-20*2", 60, true],
    ["90÷4", 22.5, true],
    ["10/3", 3.33, true], // ปัด 2 ตำแหน่ง
    ["3x50", 150, true],
    ["฿ 2,000 + 500", 2500, true],
  ])('"%s" = %s', (text, value, isExpression) => {
    expect(evaluateAmount(text)).toEqual({ ok: true, value, isExpression });
  });

  it.each([
    ["", "กรุณาใส่จำนวนเงิน"],
    ["abc", "ใส่ได้เฉพาะตัวเลขและ + − × ÷"],
    ["-50", "ใส่ได้เฉพาะตัวเลขและ + − × ÷"],
    ["120+", "สูตรยังไม่จบ (ลงท้ายด้วยเครื่องหมาย)"],
    ["10/0", "หารด้วยศูนย์ไม่ได้"],
    ["50-80", "ผลลัพธ์ต้องมากกว่า 0"],
    ["1.2.3", "ใส่ได้เฉพาะตัวเลขและ + − × ÷"],
    ["alert(1)", "ใส่ได้เฉพาะตัวเลขและ + − × ÷"], // ไม่ใช้ eval
  ])('"%s" → %s', (text, message) => {
    expect(evaluateAmount(text)).toEqual({ ok: false, message });
  });
});

describe("#tag", () => {
  it("ดึงแท็กจากโน้ต (ภาษาไทย/อังกฤษ, ไม่ซ้ำ, ตัวเล็ก)", () => {
    expect(extractTags("ข้าวกับเพื่อน #ทำงาน #Lunch #ทำงาน")).toEqual(["ทำงาน", "lunch"]);
    expect(extractTags(undefined)).toEqual([]);
  });
  it("ตัดแท็กออกจากโน้ต", () => {
    expect(stripTags("ข้าวกับเพื่อน  #ทำงาน #lunch")).toBe("ข้าวกับเพื่อน");
  });
});

const history: Transaction[] = [
  { id: "1", date: "2026-09-01", type: "expense", amount: 60, category: "essential", planGroupId: "grp-food", merchant: "ร้านข้าวมันไก่", note: "มื้อเที่ยง" },
  { id: "2", date: "2026-09-10", type: "expense", amount: 80, category: "wants", planGroupId: "grp-fun", merchant: "Starbucks", note: "กาแฟ #คาเฟ่" },
  { id: "3", date: "2026-09-20", type: "expense", amount: 70, category: "wants", merchant: "starbucks ", note: "กาแฟ" }, // ล่าสุด ไม่ผูกกลุ่ม
  { id: "4", date: "2026-09-25", type: "income", amount: 44100, merchant: "บริษัท", note: "เงินเดือน" },
];

describe("guessCategory — เดาหมวดจากที่เคยจด", () => {
  it("1. ร้านตรงกัน (ไม่สนตัวพิมพ์/ช่องว่าง) → ใช้รายการล่าสุดของร้านนั้น", () => {
    expect(guessCategory(goldenPlan3, history, { merchant: "STARBUCKS" })).toEqual({ category: "wants", source: "merchant" });
    expect(guessCategory(goldenPlan3, history, { merchant: "ร้านข้าวมันไก่" })).toEqual({ category: "essential", planGroupId: "grp-food", source: "merchant" });
  });

  it("2. ไม่รู้จักร้าน แต่โน้ตตรง (ไม่นับ #tag) → เดาจากโน้ต", () => {
    expect(guessCategory(goldenPlan3, history, { merchant: "ร้านใหม่", note: "มื้อเที่ยง #ออฟฟิศ" })).toEqual({
      category: "essential",
      planGroupId: "grp-food",
      source: "note",
    });
  });

  it("3. มี #tag เดียวกับที่เคยจด", () => {
    expect(guessCategory(goldenPlan3, history, { note: "ขนม #คาเฟ่" })).toEqual({ category: "wants", planGroupId: "grp-fun", source: "tag" });
  });

  it("4. ข้อความมีชื่อกลุ่มในแผน → กลุ่มนั้น", () => {
    expect(guessCategory(goldenPlan3, [], { note: "ค่าอาหารเย็น" })).toEqual({ category: "essential", planGroupId: "grp-food", source: "groupName" });
  });

  it("เรียนรู้จากการแก้: แก้รายการล่าสุดของร้านเป็นหมวดอื่น → ครั้งหน้าเดาตามที่แก้", () => {
    const corrected = history.map((t) => (t.id === "3" ? { ...t, category: "essential" as const, planGroupId: "grp-food" } : t));
    expect(guessCategory(goldenPlan3, corrected, { merchant: "Starbucks" })).toEqual({ category: "essential", planGroupId: "grp-food", source: "merchant" });
  });

  it("กลุ่มที่ถูกลบจากแผนแล้ว → เดาแค่หมวด", () => {
    const plan: Plan = { ...goldenPlan3, expenses: goldenPlan3.expenses.filter((g) => g.id !== "grp-food") };
    expect(guessCategory(plan, history, { merchant: "ร้านข้าวมันไก่" })).toEqual({ category: "essential", source: "merchant" });
  });

  it("ไม่เคยเจอ / ว่าง → null และไม่เดาจากรายรับ", () => {
    expect(guessCategory(goldenPlan3, history, { merchant: "ร้านที่ไม่เคยไป" })).toBeNull();
    expect(guessCategory(goldenPlan3, history, {})).toBeNull();
    expect(guessCategory(goldenPlan3, history, { merchant: "บริษัท" })).toBeNull();
  });
});

describe("searchTransactions — ค้นหาคร่อมทุกรอบ", () => {
  const ids = (list: Transaction[]) => list.map((t) => t.id);

  it("ค้นชื่อร้าน/โน้ต (ไม่สนตัวพิมพ์) → เรียงล่าสุดก่อน", () => {
    expect(ids(searchTransactions(goldenPlan3, history, { text: "starbucks" }))).toEqual(["3", "2"]);
    expect(ids(searchTransactions(goldenPlan3, history, { text: "กาแฟ" }))).toEqual(["3", "2"]);
  });
  it("ค้น #tag", () => expect(ids(searchTransactions(goldenPlan3, history, { text: "#คาเฟ่" }))).toEqual(["2"]));
  it("ค้นจำนวนเงิน (มีคอมมาได้)", () => {
    expect(ids(searchTransactions(goldenPlan3, history, { text: "44,100" }))).toEqual(["4"]);
    expect(ids(searchTransactions(goldenPlan3, history, { text: "60" }))).toEqual(["1"]);
  });
  it("ค้นชื่อกลุ่มในแผน", () => expect(ids(searchTransactions(goldenPlan3, history, { text: "สังสรรค์" }))).toEqual(["2"]));
  it("กรองประเภท + หมวด", () => {
    expect(ids(searchTransactions(goldenPlan3, history, { type: "income" }))).toEqual(["4"]);
    expect(ids(searchTransactions(goldenPlan3, history, { category: "wants" }))).toEqual(["3", "2"]);
  });
  it("isEmptyQuery", () => {
    expect(isEmptyQuery({ text: "  ", type: "all", category: "all" })).toBe(true);
    expect(isEmptyQuery({ text: "กาแฟ" })).toBe(false);
  });
});
