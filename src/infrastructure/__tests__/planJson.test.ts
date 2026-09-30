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
    expect(result).toEqual({ ok: true, plan, transactions: [] });
  });

  it("ไฟล์มี app / version / exportedAt", () => {
    const file = JSON.parse(exportPlanToJson(plan, [], new Date("2027-01-02T00:00:00.000Z")));
    expect(file).toMatchObject({ app: "karngein", version: 2, exportedAt: "2027-01-02T00:00:00.000Z", transactions: [] });
  });

  it.each([
    ["ไม่ใช่ JSON", "hello", "ไฟล์นี้ไม่ใช่ JSON ที่อ่านได้"],
    ["JSON ของแอปอื่น", '{"foo":1}', "ไฟล์นี้ไม่ใช่ไฟล์แผนของ Karngein"],
    ["เวอร์ชันไม่รองรับ", '{"app":"karngein","version":99,"plan":{}}', "ไม่รองรับไฟล์เวอร์ชัน 99"],
    ["v2 ไม่มี transactions", `{"app":"karngein","version":2,"plan":${JSON.stringify(referencePlanJson)}}`, "ข้อมูลรายการจริงในไฟล์ไม่ถูกต้อง"],
    [
      "v2 มีรายการจริงเสีย",
      `{"app":"karngein","version":2,"plan":${JSON.stringify(referencePlanJson)},"transactions":[{"id":"t","date":"2026-01-01","type":"expense","amount":-1}]}`,
      "มีรายการจริงในไฟล์ที่ข้อมูลไม่ถูกต้อง",
    ],
    ["ข้อมูลแผนเสีย", '{"app":"karngein","version":1,"plan":{"id":"x"}}', "ข้อมูลแผนในไฟล์ไม่ครบหรือไม่ถูกต้อง"],
    ["null", "null", "ไฟล์นี้ไม่ใช่ไฟล์แผนของ Karngein"],
  ])("%s → error ภาษาไทย", (_label, text, message) => {
    expect(importPlanFromJson(text)).toEqual({ ok: false, message });
  });
});

describe("Phase 11 — schema และไฟล์สำรองเวอร์ชัน 2", async () => {
  const { goldenPlan3, goldenTransactions3 } = await import("../../domain/__tests__/goldenData");

  it("⚠️ แผนที่มี payCycleStartDay + goals ผ่าน schema โดยไม่ถูกตัดทิ้ง", () => {
    expect(parsePlan(goldenPlan3)).toEqual(goldenPlan3);
  });

  it("แผนเก่า (ไม่มี field ใหม่) ยังผ่าน schema", () => {
    expect(parsePlan(referencePlanJson)).not.toBeNull();
  });

  it.each([0, 32, 2.5])("วันเริ่มรอบ %s → ไม่ผ่าน", (day) => {
    expect(parsePlan({ ...goldenPlan3, payCycleStartDay: day })).toBeNull();
  });

  it("export v2 → import → ได้แผน + รายการจริงครบ", () => {
    const result = importPlanFromJson(exportPlanToJson(goldenPlan3, goldenTransactions3));
    expect(result).toEqual({ ok: true, plan: goldenPlan3, transactions: goldenTransactions3 });
  });

  it("ไฟล์เวอร์ชัน 1 (จากก่อน Phase 11) ยังนำเข้าได้ → ไม่มีรายการจริง", () => {
    const v1 = JSON.stringify({ app: "karngein", version: 1, exportedAt: "2026-09-01T00:00:00.000Z", plan: referencePlanJson });
    expect(importPlanFromJson(v1)).toEqual({ ok: true, plan: parsePlan(referencePlanJson), transactions: [] });
  });
});
