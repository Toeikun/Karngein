"use client";

import { addIncome, removeIncome, updateIncome } from "@/application/usecases/incomes";
import type { Income } from "@/domain/entities/Income";
import type { RunUseCase } from "../../hooks/usePlan";
import { IncomeRow } from "./IncomeRow";

interface IncomeListProps {
  incomes: Income[];
  run: RunUseCase;
}

export function IncomeList({ incomes, run }: IncomeListProps) {
  return (
    <section aria-labelledby="income-heading" className="rounded-3xl bg-white p-4 shadow-sm ring-1 ring-slate-100 sm:p-5">
      <div className="mb-3 flex items-center justify-between gap-2">
        <h2 id="income-heading" className="text-lg font-semibold text-slate-800">
          แหล่งรายได้
        </h2>
        <button
          type="button"
          onClick={() => run((plan, ctx) => addIncome(plan, { name: "รายได้ใหม่", amount: 0, frequency: "monthly" }, ctx))}
          className="h-11 rounded-xl bg-emerald-50 px-4 text-sm font-medium text-emerald-700 hover:bg-emerald-100"
        >
          + เพิ่มรายได้
        </button>
      </div>

      {incomes.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-slate-200 p-6 text-center text-sm text-slate-500">
          ยังไม่มีรายได้ — กด &quot;+ เพิ่มรายได้&quot; เพื่อเริ่มต้น
        </p>
      ) : (
        <ul className="space-y-2">
          {incomes.map((income) => (
            <IncomeRow
              key={income.id}
              income={income}
              onUpdate={(changes) => run((plan, ctx) => updateIncome(plan, income.id, changes, ctx))}
              onRemove={() => run((plan, ctx) => removeIncome(plan, income.id, ctx))}
            />
          ))}
        </ul>
      )}
    </section>
  );
}
