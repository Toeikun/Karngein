import { describe, expect, it } from "vitest";
import { round2 } from "@/domain/entities/Money";
import { cycleContaining } from "@/domain/entities/PayCycle";
import type { Transaction } from "@/domain/entities/Transaction";
import { buildActualFlowGraph, MAX_ITEMS } from "@/domain/services/actualFlowGraph";
import { cycleCategoryRatios, summarizeCycle } from "@/domain/services/cycleSummary";
import { DEFICIT_NODE_ID, POOL_NODE_ID, REMAINING_NODE_ID, type FlowGraph } from "@/domain/services/flowGraph";
import { goldenPlan3, goldenTransactions3 } from "./goldenData";

const septCycle = cycleContaining("2026-09-25", 25); // 25 ก.ย. – 24 ต.ค.
const node = (graph: FlowGraph, id: string) => graph.nodes.find((n) => n.id === id);
const sumLinks = (links: FlowGraph["links"]) => links.reduce((t, l) => t + l.value, 0);

function expectBalanced(graph: FlowGraph) {
  for (const n of graph.nodes) {
    const out = graph.links.filter((l) => l.source === n.id);
    const incoming = graph.links.filter((l) => l.target === n.id);
    if (out.length > 0) expect(round2(sumLinks(out)), `ขาออกของ ${n.label}`).toBe(round2(n.value));
    if (incoming.length > 0) expect(round2(sumLinks(incoming)), `ขาเข้าของ ${n.label}`).toBe(round2(n.value));
  }
}

describe("ผังการไหลของเงิน จากรายการจริง (Golden ชุดที่ 3 รอบ 25 ก.ย. – 24 ต.ค.)", () => {
  const graph = buildActualFlowGraph(goldenPlan3, goldenTransactions3, septCycle);

  it("เงินกองกลาง = รายรับจริง 44,100 / เงินคงเหลือ 35,930 (ตรงกับการ์ดสรุปรอบ)", () => {
    const summary = summarizeCycle(goldenTransactions3, septCycle);
    expect(node(graph, POOL_NODE_ID)!.value).toBe(summary.income);
    expect(node(graph, REMAINING_NODE_ID)!.value).toBe(summary.remaining);
    expect(node(graph, "income:inc-salary")).toMatchObject({ label: "เงินเดือน", value: 44100 });
  });

  it("หมวด/กลุ่มตามที่ผูกในแผน + รายจ่ายที่ไม่ผูกกลุ่มแยกเป็น 'ไม่ผูกกลุ่ม'", () => {
    expect(node(graph, "category:essential")!.value).toBe(670);
    expect(node(graph, "group:grp-food")).toMatchObject({ label: "ค่าอาหาร", value: 550 });
    expect(node(graph, "group:unlinked~essential")).toMatchObject({ label: "ไม่ผูกกลุ่ม", value: 120 });
    expect(node(graph, "group:grp-fun")!.value).toBe(2500);
    expect(node(graph, "group:grp-emergency")!.value).toBe(5000);
  });

  it("กราฟสมดุล และ % เทียบรายรับจริง", () => {
    expectBalanced(graph);
    expect(node(graph, "category:emergency")!.percentOfIncome.toFixed(1)).toBe("11.3"); // 5,000 / 44,100
  });

  it("รายการย่อยรวมตามโน้ต (ไม่มีโน้ต → 'ไม่ระบุโน้ต')", () => {
    const items = graph.nodes.filter((n) => n.id.startsWith("item:grp-food:")).map((n) => n.label);
    expect(items).toEqual(["ไม่ระบุโน้ต"]);
  });

  it("รายรับที่ไม่ผูกรายได้ในแผน → 'รายรับอื่นๆ'", () => {
    const extra: Transaction = { id: "x", date: "2026-10-02", type: "income", amount: 1000, note: "ขายของ" };
    const g = buildActualFlowGraph(goldenPlan3, [...goldenTransactions3, extra], septCycle);
    expect(node(g, "income:other")).toMatchObject({ label: "รายรับอื่นๆ", value: 1000 });
  });
});

describe("กรณีพิเศษ", () => {
  it("ใช้จ่ายก่อนเงินเดือนออก (รายจ่าย > รายรับ) → มีโหนด 'เงินขาด' และสมดุล", () => {
    const tx = goldenTransactions3.filter((t) => t.type === "expense");
    const graph = buildActualFlowGraph(goldenPlan3, tx, septCycle);
    expect(node(graph, DEFICIT_NODE_ID)!.value).toBe(8170);
    expect(node(graph, REMAINING_NODE_ID)).toBeUndefined();
    expectBalanced(graph);
  });

  it(`โน้ตเกิน ${MAX_ITEMS} แบบ → แสดง ${MAX_ITEMS} อันดับแรก + 'อื่นๆ' รวมที่เหลือ`, () => {
    const notes = ["ข้าว", "กาแฟ", "ขนม", "น้ำ", "ผลไม้", "ไอติม", "ชานม"];
    const tx: Transaction[] = notes.map((note, i) => ({
      id: `t${i}`, date: "2026-10-01", type: "expense", amount: 100 * (notes.length - i), category: "essential", planGroupId: "grp-food", note,
    }));
    const graph = buildActualFlowGraph(goldenPlan3, tx, septCycle);
    const items = graph.nodes.filter((n) => n.id.startsWith("item:grp-food:"));
    expect(items.map((n) => n.label)).toEqual(["ข้าว", "กาแฟ", "ขนม", "น้ำ", "ผลไม้", "อื่นๆ (2 รายการ)"]);
    expect(items.at(-1)!.value).toBe(200 + 100);
    expectBalanced(graph);
  });

  it("รอบที่ไม่มีรายการ → ผังว่าง", () => {
    expect(buildActualFlowGraph(goldenPlan3, goldenTransactions3, cycleContaining("2027-06-01", 25))).toEqual({ nodes: [], links: [] });
  });

  it("id ของโหนดไม่ซ้ำ แม้เปลี่ยนหมวดของกลุ่มในแผนหลังบันทึกไปแล้ว", () => {
    const plan = { ...goldenPlan3, expenses: goldenPlan3.expenses.map((g) => (g.id === "grp-food" ? { ...g, category: "wants" as const } : g)) };
    const extra: Transaction = { id: "y", date: "2026-10-03", type: "expense", amount: 50, category: "wants", planGroupId: "grp-food" };
    const graph = buildActualFlowGraph(plan, [...goldenTransactions3, extra], septCycle);
    const ids = graph.nodes.map((n) => n.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(node(graph, "group:grp-food~essential")!.value).toBe(550); // รายการเก่า (หมวดเดิม)
    expect(node(graph, "group:grp-food")!.value).toBe(50); // รายการใหม่ (หมวดใหม่ของกลุ่ม)
  });

  it("การ์ดสัดส่วนของรอบ: หมวดเงินสำรองฉุกเฉิน 5,000 = 11.3% ของรายรับ", () => {
    const ratios = cycleCategoryRatios(summarizeCycle(goldenTransactions3, septCycle));
    expect(ratios.emergency.amount).toBe(5000);
    expect(ratios.emergency.percentOfIncome.toFixed(1)).toBe("11.3");
  });
});
