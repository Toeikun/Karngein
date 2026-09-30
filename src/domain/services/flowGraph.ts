/**
 * flowGraph — "เครื่องประกอบ" แผนภาพการไหลของเงิน (Sankey) ที่ใช้ร่วมกัน
 *
 *   [รายได้ 1] ─┐
 *   [รายได้ 2] ─┼─► [เงินกองกลาง] ─┬─► [หมวด] ─► [กลุ่ม] ─► [รายการย่อย]
 *   [เงินขาด]  ─┘                 └─► [เงินคงเหลือ]
 *
 * ข้อมูลมาได้จาก 2 ที่ แต่ประกอบเป็นผังแบบเดียวกัน:
 * - แผน (buildFlowGraph.ts)          → ยอดตามความถี่ในมุมมองเวลาที่เลือก
 * - รายการจริง (actualFlowGraph.ts)   → ยอดที่เกิดจริงในรอบเงินเดือน
 * ต่างกันแค่ "แปลงข้อมูลเป็น FlowSource" — ส่วนสร้างโหนด/เส้น อยู่ที่นี่ที่เดียว
 *
 * กติกา:
 * - โหนดที่ค่าเป็น 0 ไม่แสดง
 * - รายจ่าย > รายได้ → เพิ่มโหนด "เงินขาด" ฝั่งรายได้ เพื่อให้กราฟสมดุล
 * - ยุบกลุ่ม (collapsedGroupIds) → ไม่แสดงรายการย่อยของกลุ่มนั้น
 * - ซ่อนหมวด (hiddenCategories) → ไม่แสดงเส้นทางของหมวดนั้น (แต่ยังนับในยอดรวม)
 *
 * ไฟล์นี้ไม่รู้จัก d3 หรือ SVG — แค่สร้างข้อมูล ชั้น UI นำไปวาดเอง
 */
import { CATEGORIES, type CategoryId } from "../entities/Category";
import { percentOf } from "./summarize";

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

/** ข้อมูลดิบสำหรับประกอบผัง (id ไม่ต้องมี prefix — assembleFlowGraph ใส่ให้) */
export interface FlowEntry {
  id: string;
  label: string;
  value: number;
}

export interface FlowGroupEntry extends FlowEntry {
  items: FlowEntry[]; // ว่าง = กลุ่มที่ยุบ/ขยายไม่ได้
}

export interface FlowSource {
  incomes: FlowEntry[];
  groupsByCategory: Record<CategoryId, FlowGroupEntry[]>;
}

const sum = (values: number[]) => values.reduce((total, value) => total + value, 0);

export function assembleFlowGraph(source: FlowSource, options: FlowOptions = {}): FlowGraph {
  const { collapsedGroupIds = new Set(), hiddenCategories = new Set() } = options;
  const income = sum(source.incomes.map((i) => i.value));
  const categoryTotal = (id: CategoryId) => sum(source.groupsByCategory[id].map((g) => g.value));
  const expense = sum(CATEGORIES.map((c) => categoryTotal(c.id)));

  const nodes: FlowNode[] = [];
  const links: FlowLink[] = [];
  const addNode = (node: Omit<FlowNode, "percentOfIncome">) =>
    nodes.push({ ...node, percentOfIncome: percentOf(node.value, income) });
  const connect = (source: string, target: string, value: number) => links.push({ source, target, value });

  // 1. รายได้ → เงินกองกลาง
  for (const entry of source.incomes) {
    if (entry.value <= 0) continue;
    addNode({ id: `income:${entry.id}`, label: entry.label, kind: "income", value: entry.value });
    connect(`income:${entry.id}`, POOL_NODE_ID, entry.value);
  }
  const deficit = Math.max(0, expense - income);
  if (deficit > 0) {
    addNode({ id: DEFICIT_NODE_ID, label: "เงินขาด", kind: "deficit", value: deficit });
    connect(DEFICIT_NODE_ID, POOL_NODE_ID, deficit);
  }

  const poolValue = income + deficit;
  if (poolValue <= 0) return { nodes: [], links: [] }; // ไม่มีเงินไหล ไม่มีอะไรให้วาด
  addNode({ id: POOL_NODE_ID, label: "เงินกองกลาง", kind: "pool", value: poolValue });

  // 2. เงินกองกลาง → หมวด → กลุ่ม → รายการย่อย
  for (const category of CATEGORIES) {
    const categoryValue = categoryTotal(category.id);
    if (categoryValue <= 0 || hiddenCategories.has(category.id)) continue;
    const categoryNodeId = `category:${category.id}`;
    addNode({ id: categoryNodeId, label: category.label, kind: "category", value: categoryValue, category: category.id });
    connect(POOL_NODE_ID, categoryNodeId, categoryValue);

    for (const group of source.groupsByCategory[category.id]) {
      if (group.value <= 0) continue;
      const groupNodeId = `group:${group.id}`;
      const collapsible = group.items.length > 0;
      addNode({ id: groupNodeId, label: group.label, kind: "group", value: group.value, category: category.id, collapsible });
      connect(categoryNodeId, groupNodeId, group.value);

      if (!collapsible || collapsedGroupIds.has(group.id)) continue;
      for (const item of group.items) {
        if (item.value <= 0) continue;
        const itemNodeId = `item:${group.id}:${item.id}`;
        addNode({ id: itemNodeId, label: item.label, kind: "item", value: item.value, category: category.id });
        connect(groupNodeId, itemNodeId, item.value);
      }
    }
  }

  // 3. เงินกองกลาง → เงินคงเหลือ
  const remaining = income - expense;
  if (remaining > 0) {
    addNode({ id: REMAINING_NODE_ID, label: "เงินคงเหลือ", kind: "remaining", value: remaining });
    connect(POOL_NODE_ID, REMAINING_NODE_ID, remaining);
  }

  return { nodes, links };
}

/** สร้าง groupsByCategory ว่างครบ 5 หมวด */
export function emptyGroupsByCategory(): Record<CategoryId, FlowGroupEntry[]> {
  return Object.fromEntries(CATEGORIES.map((c) => [c.id, []])) as unknown as Record<CategoryId, FlowGroupEntry[]>;
}
