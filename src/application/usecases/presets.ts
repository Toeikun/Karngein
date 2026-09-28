/**
 * applyPreset — แทนที่รายได้/รายจ่ายของแผนด้วยแม่แบบ (ชื่อและ id ของแผนคงเดิม)
 *
 * ใช้ addIncome / addExpenseGroup ที่มีอยู่แล้ว → ได้การตรวจข้อมูลและการสร้าง id ฟรี ไม่ต้องเขียนซ้ำ
 */
import type { Plan } from "@/domain/entities/Plan";
import type { UseCaseContext } from "../context";
import { getPreset, type PresetId } from "../presets/presets";
import { success, touch, type PlanResult } from "../result";
import { addExpenseGroup } from "./expenses";
import { addIncome } from "./incomes";

export function applyPreset(plan: Plan, presetId: PresetId, ctx: UseCaseContext): PlanResult {
  const preset = getPreset(presetId);
  let next: Plan = { ...plan, incomes: [], expenses: [] };

  for (const income of preset.incomes) {
    const result = addIncome(next, income, ctx);
    if (!result.ok) return result;
    next = result.plan;
  }
  for (const group of preset.expenses) {
    const result = addExpenseGroup(next, group, ctx);
    if (!result.ok) return result;
    next = result.plan;
  }
  return success(touch(next, ctx.now()));
}
