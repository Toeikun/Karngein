/**
 * actualFlowGraph — ผังการไหลของเงินจาก "รายการจริง" ในรอบเงินเดือน
 *
 * ใช้เครื่องประกอบเดียวกับผังของแผน (assembleFlowGraph) → หน้าตาและกติกาเหมือนกัน ต่างกันแค่ข้อมูล:
 * - รายได้  = รายรับจริง จัดกลุ่มตามรายได้ในแผนที่ผูกไว้ (ไม่ผูก → "รายรับอื่นๆ")
 * - กลุ่ม    = กลุ่มรายจ่ายในแผนที่ผูกไว้ (ไม่ผูก → "ไม่ผูกกลุ่ม" ของหมวดนั้น)
 * - รายการย่อย = รวมตามโน้ต (โน้ตเดียวกันรวมยอด) แสดงสูงสุด MAX_ITEMS รายการ ที่เหลือรวมเป็น "อื่นๆ"
 * - หมวดใช้ตามที่บันทึกในรายการ (เหมือน summarizeCycle) → ตัวเลขตรงกับการ์ดสรุปรอบ
 */
import type { CategoryId } from "../entities/Category";
import type { PayCycle } from "../entities/PayCycle";
import type { Plan } from "../entities/Plan";
import type { Transaction } from "../entities/Transaction";
import { transactionsInCycle } from "./cycleSummary";
import {
  assembleFlowGraph,
  emptyGroupsByCategory,
  type FlowEntry,
  type FlowGraph,
  type FlowOptions,
  type FlowSource,
} from "./flowGraph";

export const MAX_ITEMS = 5;
export const OTHER_INCOME_ID = "other";
const NO_NOTE = "ไม่ระบุโน้ต";

const sum = (values: number[]) => values.reduce((total, value) => total + value, 0);

/** รวมยอดตามโน้ต เรียงมากไปน้อย เกิน MAX_ITEMS → รวมที่เหลือเป็น "อื่นๆ" */
function itemsByNote(transactions: Transaction[]): FlowEntry[] {
  const totals = new Map<string, number>();
  for (const t of transactions) {
    const note = t.note?.trim() || NO_NOTE;
    totals.set(note, (totals.get(note) ?? 0) + t.amount);
  }
  const sorted = [...totals.entries()].sort((a, b) => b[1] - a[1]);
  const shown = sorted.slice(0, MAX_ITEMS).map(([label, value], index) => ({ id: String(index), label, value }));
  const rest = sorted.slice(MAX_ITEMS);
  if (rest.length > 0) shown.push({ id: "rest", label: `อื่นๆ (${rest.length} รายการ)`, value: sum(rest.map(([, v]) => v)) });
  return shown;
}

export function actualFlowSource(plan: Plan, transactions: Transaction[], cycle: PayCycle): FlowSource {
  const inCycle = transactionsInCycle(transactions, cycle);

  // รายได้: ตามรายได้ในแผนที่ผูกไว้ (เรียงตามลำดับในแผน) + รายรับอื่นๆ
  const incomes = inCycle.filter((t) => t.type === "income");
  const planIncomeIds = new Set(plan.incomes.map((i) => i.id));
  const incomeEntries: FlowEntry[] = plan.incomes.map((i) => ({
    id: i.id,
    label: i.name,
    value: sum(incomes.filter((t) => t.planIncomeId === i.id).map((t) => t.amount)),
  }));
  incomeEntries.push({
    id: OTHER_INCOME_ID,
    label: "รายรับอื่นๆ",
    value: sum(incomes.filter((t) => !t.planIncomeId || !planIncomeIds.has(t.planIncomeId)).map((t) => t.amount)),
  });

  // รายจ่าย: หมวด → กลุ่ม (ตามลำดับกลุ่มในแผน แล้วค่อย "ไม่ผูกกลุ่ม")
  const expenses = inCycle.filter((t) => t.type === "expense");
  const planGroupIds = new Set(plan.expenses.map((g) => g.id));
  const groupsByCategory = emptyGroupsByCategory();
  const categoryOf = (t: Transaction): CategoryId =>
    t.category ?? plan.expenses.find((g) => g.id === t.planGroupId)?.category ?? "essential";

  for (const category of Object.keys(groupsByCategory) as CategoryId[]) {
    const ofCategory = expenses.filter((t) => categoryOf(t) === category);
    for (const group of plan.expenses) {
      const linked = ofCategory.filter((t) => t.planGroupId === group.id);
      if (linked.length === 0) continue;
      // id ใส่หมวดด้วย: ถ้าเปลี่ยนหมวดของกลุ่มในแผนภายหลัง รายการเก่าที่บันทึกด้วยหมวดเดิมจะไม่ชนกัน
      groupsByCategory[category].push({
        id: group.category === category ? group.id : `${group.id}~${category}`,
        label: group.name,
        value: sum(linked.map((t) => t.amount)),
        items: itemsByNote(linked),
      });
    }
    const unlinked = ofCategory.filter((t) => !t.planGroupId || !planGroupIds.has(t.planGroupId));
    if (unlinked.length > 0) {
      groupsByCategory[category].push({
        id: `unlinked~${category}`,
        label: "ไม่ผูกกลุ่ม",
        value: sum(unlinked.map((t) => t.amount)),
        items: itemsByNote(unlinked),
      });
    }
  }

  return { incomes: incomeEntries, groupsByCategory };
}

export function buildActualFlowGraph(plan: Plan, transactions: Transaction[], cycle: PayCycle, options: FlowOptions = {}): FlowGraph {
  return assembleFlowGraph(actualFlowSource(plan, transactions, cycle), options);
}
