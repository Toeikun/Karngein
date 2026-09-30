/**
 * buildFlowGraph — ผังการไหลของเงินจาก "แผน" (PLAN.md ข้อ 8.4)
 *
 * แปลงแผนเป็น FlowSource (ยอดตามความถี่ในมุมมองเวลาที่เลือก) แล้วให้ assembleFlowGraph ประกอบเป็นผัง
 * ผังจาก "รายการจริง" อยู่ที่ actualFlowGraph.ts — ใช้เครื่องประกอบตัวเดียวกัน
 */
import type { Period } from "../entities/Period";
import type { Plan } from "../entities/Plan";
import { amountInPeriod } from "./amountInPeriod";
import { assembleFlowGraph, emptyGroupsByCategory, type FlowGraph, type FlowOptions, type FlowSource } from "./flowGraph";
import { groupTotal } from "./summarize";

// ส่งต่อ type/ค่าคงที่ เพื่อให้โค้ดที่ import จากไฟล์นี้อยู่แล้วใช้ได้เหมือนเดิม
export {
  DEFICIT_NODE_ID,
  POOL_NODE_ID,
  REMAINING_NODE_ID,
  type FlowGraph,
  type FlowLink,
  type FlowNode,
  type FlowNodeKind,
  type FlowOptions,
} from "./flowGraph";

export function planFlowSource(plan: Plan, period: Period): FlowSource {
  const groupsByCategory = emptyGroupsByCategory();
  for (const group of plan.expenses) {
    groupsByCategory[group.category].push({
      id: group.id,
      label: group.name,
      value: groupTotal(group, period),
      items: group.items.map((item) => ({ id: item.id, label: item.name, value: amountInPeriod(item, period) })),
    });
  }
  return {
    incomes: plan.incomes.map((income) => ({ id: income.id, label: income.name, value: amountInPeriod(income, period) })),
    groupsByCategory,
  };
}

export function buildFlowGraph(plan: Plan, period: Period, options: FlowOptions = {}): FlowGraph {
  return assembleFlowGraph(planFlowSource(plan, period), options);
}

/** แผนนี้มีรายการ "ครั้งเดียว" หรือไม่ (ใช้แสดงหมายเหตุในมุมมองรายเดือน — กฎ R3) */
export function hasOneTimeEntries(plan: Plan): boolean {
  const entries = [...plan.incomes, ...plan.expenses, ...plan.expenses.flatMap((g) => g.items)];
  return entries.some((entry) => entry.frequency === "one-time");
}
