"use client";

/**
 * GoalsView — แท็บ "เป้าหมาย" (Phase 11.4)
 * ความคืบหน้าคำนวณจาก goalProgress (Domain) โดยใช้รายการจริงทุกรอบของแผน
 */
import { useState } from "react";
import { addGoal, removeGoal, updateGoal } from "@/application/usecases/goals";
import { goalsOf, type Plan } from "@/domain/entities/Plan";
import { goalProgress } from "@/domain/services/goalProgress";
import type { RunUseCase } from "../../hooks/usePlan";
import type { TransactionsState } from "../../hooks/useTransactions";
import { GoalCard } from "./GoalCard";
import { GoalForm } from "./GoalForm";

interface GoalsViewProps {
  plan: Plan;
  run: RunUseCase;
  today: string;
  tx: TransactionsState;
}

export function GoalsView({ plan, run, today, tx }: GoalsViewProps) {
  const { transactions } = tx;
  const [editing, setEditing] = useState<string | "new" | null>(null); // id ของเป้าที่แก้ / "new" / ปิดฟอร์ม
  const goals = goalsOf(plan);

  const editingGoal = editing && editing !== "new" ? goals.find((g) => g.id === editing) ?? null : null;

  return (
    <div className="space-y-5">
      {editing ? (
        <GoalForm
          key={editing}
          plan={plan}
          editing={editingGoal}
          onCancel={() => setEditing(null)}
          onSubmit={(input) => {
            const errors = run((p, c) => (editingGoal ? updateGoal(p, editingGoal.id, input, c) : addGoal(p, input, c)));
            if (errors.length === 0) setEditing(null);
            return errors;
          }}
        />
      ) : (
        <button
          type="button"
          onClick={() => setEditing("new")}
          className="h-12 w-full rounded-2xl border-2 border-dashed border-indigo-200 font-medium text-indigo-700 hover:bg-indigo-50"
        >
          + ตั้งเป้าหมายใหม่
        </button>
      )}

      {goals.length === 0 && !editing && (
        <p className="rounded-3xl bg-white p-6 text-center text-sm text-slate-500 shadow-sm ring-1 ring-slate-100">
          ยังไม่มีเป้าหมาย — เช่น &quot;เงินออมฉุกเฉิน = เงินเดือน × 12&quot; แล้วลงเงินออมที่แท็บ &quot;บันทึกจริง&quot; โดยเลือก &quot;นับเข้าเป้าหมาย&quot;
        </p>
      )}

      {goals.map((goal) => (
        <GoalCard
          key={goal.id}
          goal={goal}
          plan={plan}
          progress={goalProgress(goal, plan, transactions, today)}
          contributionCount={transactions.filter((t) => t.goalId === goal.id).length}
          onEdit={() => setEditing(goal.id)}
          onDelete={() => {
            if (window.confirm(`ลบเป้าหมาย "${goal.name}"? (รายการออมที่เคยลงยังอยู่ แค่ไม่ถูกนับเข้าเป้า)`)) {
              run((p, c) => removeGoal(p, goal.id, c));
              if (editing === goal.id) setEditing(null);
            }
          }}
        />
      ))}
    </div>
  );
}
