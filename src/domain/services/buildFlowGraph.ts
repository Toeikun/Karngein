/**
 * buildFlowGraph — แปลงแผนเป็น "โหนด + เส้น" สำหรับแผนภาพ Sankey (PLAN.md ข้อ 8.4)
 *
 *   [รายได้ 1] ─┐
 *   [รายได้ 2] ─┼─► [เงินกองกลาง] ─┬─► [หมวด] ─► [กลุ่ม] ─► [รายการย่อย]
 *   [เงินขาด]  ─┘                 └─► [เงินคงเหลือ]
 *
 * - โหนดที่ค่าเป็น 0 ไม่แสดง
 * - รายจ่าย > รายได้ → เพิ่มโหนด "เงินขาด" ฝั่งรายได้ เพื่อให้กราฟสมดุล
 * - ยุบกลุ่ม (collapsedGroupIds) → ไม่แสดงรายการย่อยของกลุ่มนั้น
 * - ซ่อนหมวด (hiddenCategories) → ไม่แสดงเส้นทางของหมวดนั้น
 *
 * ไฟล์นี้ไม่รู้จัก d3 หรือ SVG — แค่สร้างข้อมูล ชั้น UI นำไปวาดเอง
 */
import { CATEGORIES, type CategoryId } from "../entities/Category";
import type { Period } from "../entities/Period";
import type { Plan } from "../entities/Plan";
import { amountInPeriod } from "./amountInPeriod";
import { groupTotal, percentOf, summarize } from "./summarize";

export type FlowNodeKind = "income" | "deficit" | "pool" | "category" | "group" | "item" | "remaining";

export interface FlowNode {
  id: string;
  label: string;
  kind: FlowNodeKind;
  value: number;
  percentOfIncome: number;
  category?: CategoryId;
  collapsible?: boolean; // กลุ่มที่มีรายการย่อย คลิกเพื่อยุบ/ขยายได้
}

export interface FlowLink {
  source: string;
  target: string;
  value: number;
}

export interface FlowGraph {
  nodes: FlowNode[];
  links: FlowLink[];
}

export interface FlowOptions {
  collapsedGroupIds?: ReadonlySet<string>;
  hiddenCategories?: ReadonlySet<CategoryId>;
}

export const POOL_NODE_ID = "pool";
export const REMAINING_NODE_ID = "remaining";
export const DEFICIT_NODE_ID = "deficit";

export function buildFlowGraph(plan: Plan, period: Period, options: FlowOptions = {}): FlowGraph {
  const { collapsedGroupIds = new Set(), hiddenCategories = new Set() } = options;
  const summary = summarize(plan, period);
  const income = summary.income;
  const nodes: FlowNode[] = [];
  const links: FlowLink[] = [];

  const addNode = (node: Omit<FlowNode, "percentOfIncome">) =>
    nodes.push({ ...node, percentOfIncome: percentOf(node.value, income) });
  const connect = (source: string, target: string, value: number) => links.push({ source, target, value });

  // 1. รายได้ → เงินกองกลาง
  for (const entry of plan.incomes) {
    const value = amountInPeriod(entry, period);
    if (value <= 0) continue;
    addNode({ id: `income:${entry.id}`, label: entry.name, kind: "income", value });
    connect(`income:${entry.id}`, POOL_NODE_ID, value);
  }
  const deficit = Math.max(0, summary.expense - income);
  if (deficit > 0) {
    addNode({ id: DEFICIT_NODE_ID, label: "เงินขาด", kind: "deficit", value: deficit });
    connect(DEFICIT_NODE_ID, POOL_NODE_ID, deficit);
  }

  const poolValue = income + deficit;
  if (poolValue <= 0) return { nodes: [], links: [] }; // ไม่มีเงินไหล ไม่มีอะไรให้วาด
  addNode({ id: POOL_NODE_ID, label: "เงินกองกลาง", kind: "pool", value: poolValue });

  // 2. เงินกองกลาง → หมวด → กลุ่ม → รายการย่อย
  for (const category of CATEGORIES) {
    const categoryValue = summary.byCategory[category.id].amount;
    if (categoryValue <= 0 || hiddenCategories.has(category.id)) continue;
    const categoryNodeId = `category:${category.id}`;
    addNode({ id: categoryNodeId, label: category.label, kind: "category", value: categoryValue, category: category.id });
    connect(POOL_NODE_ID, categoryNodeId, categoryValue);

    for (const group of plan.expenses.filter((g) => g.category === category.id)) {
      const value = groupTotal(group, period);
      if (value <= 0) continue;
      const groupNodeId = `group:${group.id}`;
      const collapsible = group.items.length > 0;
      addNode({ id: groupNodeId, label: group.name, kind: "group", value, category: category.id, collapsible });
      connect(categoryNodeId, groupNodeId, value);

      if (!collapsible || collapsedGroupIds.has(group.id)) continue;
      for (const item of group.items) {
        const itemValue = amountInPeriod(item, period);
        if (itemValue <= 0) continue;
        const itemNodeId = `item:${group.id}:${item.id}`;
        addNode({ id: itemNodeId, label: item.name, kind: "item", value: itemValue, category: category.id });
        connect(groupNodeId, itemNodeId, itemValue);
      }
    }
  }

  // 3. เงินกองกลาง → เงินคงเหลือ
  if (summary.remaining > 0) {
    addNode({ id: REMAINING_NODE_ID, label: "เงินคงเหลือ", kind: "remaining", value: summary.remaining });
    connect(POOL_NODE_ID, REMAINING_NODE_ID, summary.remaining);
  }

  return { nodes, links };
}

/** แผนนี้มีรายการ "ครั้งเดียว" หรือไม่ (ใช้แสดงหมายเหตุในมุมมองรายเดือน — กฎ R3) */
export function hasOneTimeEntries(plan: Plan): boolean {
  const entries = [...plan.incomes, ...plan.expenses, ...plan.expenses.flatMap((g) => g.items)];
  return entries.some((entry) => entry.frequency === "one-time");
}
