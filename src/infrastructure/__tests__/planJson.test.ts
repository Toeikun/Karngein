import { describe, expect, it } from "vitest";
import { exportPlanToJson, importPlanFromJson } from "@/infrastructure/schemas/planJson";
import { parsePlan } from "@/infrastructure/schemas/planSchema";
import referencePlanJson from "../../../fixtures/reference-plan.json";

describe("planSchema", () => {
  it("fixture reference-plan.json ผ่าน schema (ไม่ต้อง cast แล้ว)", () => {
    expect(parsePlan(referencePlanJson)).toEqual(referencePlanJson);
  });

  it.each([
    ["amount ติดลบ", { amount: -1 }],
    ["ความถี่ไม่รู้จัก", { frequency: "weekly" }],
    ["วันที่ผิดรูปแบบ", { date: "26/09/2026" }],
  ])("ไม่ผ่านเมื่อ %s", (_label, change) => {
    const broken = structuredClone(referencePlanJson);
    Object.assign(broken.incomes[0], change);
    expect(parsePlan(broken)).toBeNull();
  });

  it("หมวดไม่รู้จัก → ไม่ผ่าน", () => {
    const broken = structuredClone(referencePlanJson);
    broken.expenses[0].category = "Needs";
    expect(parsePlan(broken)).toBeNull();
  });
});

describe("ส่งออก / นำเข้า JSON", () => {
  const plan = parsePlan(referencePlanJson)!;

  it("export → import → ได้แผนเท่าเดิม", () => {
    const result = importPlanFromJson(exportPlanToJson(plan));
    expect(result).toEqual({ ok: true, plan });
  });

  it("ไฟล์มี app / version / exportedAt", () => {
    const file = JSON.parse(exportPlanToJson(plan, new Date("2027-01-02T00:00:00.000Z")));
    expect(file).toMatchObject({ app: "karngein", version: 1, exportedAt: "2027-01-02T00:00:00.000Z" });
  });

  it.each([
    ["ไม่ใช่ JSON", "hello", "ไฟล์นี้ไม่ใช่ JSON ที่อ่านได้"],
    ["JSON ของแอปอื่น", '{"foo":1}', "ไฟล์นี้ไม่ใช่ไฟล์แผนของ Karngein"],
    ["เวอร์ชันไม่รองรับ", '{"app":"karngein","version":99,"plan":{}}', "ไม่รองรับไฟล์เวอร์ชัน 99"],
    ["ข้อมูลแผนเสีย", '{"app":"karngein","version":1,"plan":{"id":"x"}}', "ข้อมูลแผนในไฟล์ไม่ครบหรือไม่ถูกต้อง"],
    ["null", "null", "ไฟล์นี้ไม่ใช่ไฟล์แผนของ Karngein"],
  ])("%s → error ภาษาไทย", (_label, text, message) => {
    expect(importPlanFromJson(text)).toEqual({ ok: false, message });
  });
});
