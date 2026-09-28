import { describe, expect, it } from "vitest";
import { round2 } from "@/domain/entities/Money";
import type { Plan } from "@/domain/entities/Plan";
import {
  buildFlowGraph,
  DEFICIT_NODE_ID,
  hasOneTimeEntries,
  POOL_NODE_ID,
  REMAINING_NODE_ID,
  type FlowGraph,
} from "@/domain/services/buildFlowGraph";
import { goldenPlan1 } from "./goldenData";

const monthly = { kind: "monthly" } as const;
const node = (graph: FlowGraph, id: string) => graph.nodes.find((n) => n.id === id);
const sumLinks = (links: FlowGraph["links"]) => links.reduce((t, l) => t + l.value, 0);

/** ทุกโหนดที่มีเส้นออก: ผลรวมเส้นออก = ค่าโหนด / ทุกโหนดที่มีเส้นเข้า: ผลรวมเส้นเข้า = ค่าโหนด */
function expectBalanced(graph: FlowGraph) {
  for (const n of graph.nodes) {
    const out = graph.links.filter((l) => l.source === n.id);
    const incoming = graph.links.filter((l) => l.target === n.id);
    if (out.length > 0) expect(round2(sumLinks(out)), `ขาออกของ ${n.label}`).toBe(round2(n.value));
    if (incoming.length > 0) expect(round2(sumLinks(incoming)), `ขาเข้าของ ${n.label}`).toBe(round2(n.value));
  }
}

describe("buildFlowGraph — Golden Data รายเดือน", () => {
  const graph = buildFlowGraph(goldenPlan1, monthly);

  it('มีโหนด "เงินกองกลาง" ค่า 34,166.67', () => {
    expect(round2(node(graph, POOL_NODE_ID)!.value)).toBe(34166.67);
  });

  it("ผลรวมเส้นเข้า/ออกของทุกโหนด = ค่าโหนด (กราฟสมดุล)", () => expectBalanced(graph));

  it('มีโหนด "เงินคงเหลือ" = 13,250', () => {
    expect(round2(node(graph, REMAINING_NODE_ID)!.value)).toBe(13250);
  });

  it("% ตรงกับเว็บต้นแบบ", () => {
    const pct = (id: string) => node(graph, id)!.percentOfIncome.toFixed(1);
    expect(pct(POOL_NODE_ID)).toBe("100.0");
    expect(pct("income:inc-salary")).toBe("87.8");
    expect(pct("income:inc-bonus")).toBe("12.2");
    expect(pct("category:essential")).toBe("34.4");
    expect(pct("category:investment")).toBe("14.6");
    expect(pct("category:reward")).toBe("12.2");
    expect(pct("item:exp-main:exp-main-sso")).toBe("2.2");
    expect(pct("item:exp-main:exp-main-food")).toBe("23.4");
    expect(pct("item:exp-main:exp-main-travel")).toBe("8.8");
    expect(pct(REMAINING_NODE_ID)).toBe("38.8");
  });

  it("รายการครั้งเดียว (ขายสินทรัพย์) ไม่มีในมุมมองรายเดือน และหมวดที่เป็น 0 ไม่แสดง", () => {
    expect(node(graph, "income:inc-gift")).toBeUndefined();
    expect(node(graph, "category:wants")).toBeUndefined();
    expect(node(graph, "category:emergency")).toBeUndefined();
  });

  it("กลุ่มที่มีรายการย่อยคลิกยุบได้ ส่วนกลุ่มที่ไม่มีรายการย่อยยุบไม่ได้", () => {
    expect(node(graph, "group:exp-main")!.collapsible).toBe(true);
    expect(node(graph, "group:exp-lifestyle")!.collapsible).toBe(false);
  });
});

describe("buildFlowGraph — ตัวเลือก", () => {
  it('ยุบกลุ่ม "รายจ่ายหลัก" → ไม่มีโหนดรายการย่อยของกลุ่มนั้น แต่กลุ่มอื่นยังอยู่', () => {
    const graph = buildFlowGraph(goldenPlan1, monthly, { collapsedGroupIds: new Set(["exp-main"]) });
    expect(graph.nodes.filter((n) => n.id.startsWith("item:exp-main:"))).toEqual([]);
    expect(node(graph, "group:exp-main")).toBeDefined();
    expect(node(graph, "item:exp-invest:exp-invest-dca")).toBeDefined();
  });

  it('ซ่อนหมวด "ให้รางวัลตัวเอง" → ไม่มีโหนดของหมวดนั้น', () => {
    const graph = buildFlowGraph(goldenPlan1, monthly, { hiddenCategories: new Set(["reward"]) });
    expect(node(graph, "category:reward")).toBeUndefined();
    expect(node(graph, "group:exp-lifestyle")).toBeUndefined();
  });

  it("รายปี 2026 → รายการครั้งเดียวในปีนั้นปรากฏ", () => {
    const graph = buildFlowGraph(goldenPlan1, { kind: "yearly", year: 2026 });
    expect(node(graph, "income:inc-gift")!.value).toBe(30000);
    expectBalanced(graph);
  });
});

describe("buildFlowGraph — กรณีพิเศษ", () => {
  it('รายจ่าย > รายได้ → มีโหนด "เงินขาด" และกราฟสมดุล ไม่มีโหนดเงินคงเหลือ', () => {
    const plan: Plan = {
      ...goldenPlan1,
      incomes: [{ id: "i", name: "เงินเดือน", amount: 10000, frequency: "monthly" }],
    };
    const graph = buildFlowGraph(plan, monthly);
    expect(round2(node(graph, DEFICIT_NODE_ID)!.value)).toBe(10916.67); // 20,916.67 − 10,000
    expect(node(graph, REMAINING_NODE_ID)).toBeUndefined();
    expectBalanced(graph);
  });

  it("แผนว่าง → ไม่มีโหนด", () => {
    const empty: Plan = { ...goldenPlan1, incomes: [], expenses: [] };
    expect(buildFlowGraph(empty, monthly)).toEqual({ nodes: [], links: [] });
  });

  it("id ของโหนดไม่ซ้ำกัน", () => {
    const ids = buildFlowGraph(goldenPlan1, monthly).nodes.map((n) => n.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("hasOneTimeEntries", () => {
    expect(hasOneTimeEntries(goldenPlan1)).toBe(true);
    expect(hasOneTimeEntries({ ...goldenPlan1, incomes: [] })).toBe(false);
  });
});
