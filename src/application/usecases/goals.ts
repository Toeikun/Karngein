/**
 * Use cases: เป้าหมาย — เพิ่ม / แก้ไข / ลบ (เป้าหมายเก็บอยู่ในแผน → คืน PlanResult เหมือน use case ของแผน)
 *
 * ลบเป้าหมาย: รายการจริงที่เคยผูกกับเป้านั้นยังอยู่ (เป็นรายจ่ายตามปกติ) แค่ไม่ถูกนับเข้าเป้าใดแล้ว
 */
import { goalsOf, type Plan } from "@/domain/entities/Plan";
import { validateGoal, type Goal, type GoalInput } from "@/domain/entities/Goal";
import type { UseCaseContext } from "../context";
import { failure, notFound, success, touch, type PlanResult } from "../result";

function normalize(input: GoalInput): GoalInput {
  return {
    name: input.name.trim(),
    category: input.category,
    target: input.target,
    startingAmount: input.startingAmount,
    ...(input.deadline ? { deadline: input.deadline } : {}),
  };
}

export function addGoal(plan: Plan, input: GoalInput, ctx: UseCaseContext): PlanResult {
  const errors = validateGoal(input);
  if (errors.length > 0) return failure(errors);
  const goal: Goal = { id: ctx.generateId(), ...normalize(input) };
  return success(touch({ ...plan, goals: [...goalsOf(plan), goal] }, ctx.now()));
}

export function updateGoal(plan: Plan, id: string, input: GoalInput, ctx: UseCaseContext): PlanResult {
  if (!goalsOf(plan).some((g) => g.id === id)) return notFound("เป้าหมาย");
  const errors = validateGoal(input);
  if (errors.length > 0) return failure(errors);
  const goals = goalsOf(plan).map((g) => (g.id === id ? { id, ...normalize(input) } : g));
  return success(touch({ ...plan, goals }, ctx.now()));
}

export function removeGoal(plan: Plan, id: string, ctx: UseCaseContext): PlanResult {
  if (!goalsOf(plan).some((g) => g.id === id)) return notFound("เป้าหมาย");
  return success(touch({ ...plan, goals: goalsOf(plan).filter((g) => g.id !== id) }, ctx.now()));
}
