"use client";

import { addExpenseGroup, organizeExpenses } from "@/application/usecases/expenses";
import type { ExpenseGroup } from "@/domain/entities/Expense";
import type { Period } from "@/domain/entities/Period";
import type { RunUseCase } from "../../hooks/usePlan";
import { ExpenseGroupRow } from "./ExpenseGroupRow";

interface ExpenseListProps {
  expenses: ExpenseGroup[];
  period: Period;
  run: RunUseCase;
}

export function ExpenseList({ expenses, period, run }: ExpenseListProps) {
  return (
    <section aria-labelledby="expense-heading" className="rounded-3xl bg-white p-4 shadow-sm ring-1 ring-slate-100 sm:p-5">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h2 id="expense-heading" className="text-lg font-semibold text-slate-800">
          รายจ่าย
        </h2>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => run((plan, ctx) => organizeExpenses(plan, ctx))}
            className="h-11 rounded-xl px-3 text-sm text-slate-600 hover:bg-slate-100"
          >
            จัดระเบียบ
          </button>
          <button
            type="button"
            onClick={() =>
              run((plan, ctx) =>
                addExpenseGroup(plan, { name: "รายจ่ายใหม่", category: "essential", amount: 0, frequency: "monthly" }, ctx),
              )
            }
            className="h-11 rounded-xl bg-rose-50 px-4 text-sm font-medium text-rose-700 hover:bg-rose-100"
          >
            + เพิ่มรายจ่าย
          </button>
        </div>
      </div>

      {expenses.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-slate-200 p-6 text-center text-sm text-slate-500">
          ยังไม่มีรายจ่าย — กด &quot;+ เพิ่มรายจ่าย&quot; เพื่อเริ่มต้น
        </p>
      ) : (
        <ul className="space-y-3">
          {expenses.map((group) => (
            <ExpenseGroupRow key={group.id} group={group} period={period} run={run} />
          ))}
        </ul>
      )}
    </section>
  );
}
