"use client";

import type { IncomeInput } from "@/application/usecases/incomes";
import type { Income } from "@/domain/entities/Income";
import type { ValidationError } from "@/domain/entities/validation";
import { IconButton, TrashIcon } from "../ui/IconButton";
import { errorFor, MoneyEntryFields } from "../ui/MoneyEntryFields";
import { TextField } from "../ui/TextField";

interface IncomeRowProps {
  income: Income;
  onUpdate: (changes: Partial<IncomeInput>) => ValidationError[];
  onRemove: () => void;
}

export function IncomeRow({ income, onUpdate, onRemove }: IncomeRowProps) {
  return (
    <li className="rounded-2xl border border-slate-100 bg-slate-50/60 p-3">
      <div className="flex items-start gap-2">
        <TextField
          label="ชื่อรายได้"
          value={income.name}
          className="min-w-0 flex-1"
          onCommit={(name) => errorFor(onUpdate({ name }), "name")}
        />
        <IconButton label={`ลบ ${income.name}`} tone="danger" onClick={onRemove}>
          <TrashIcon />
        </IconButton>
      </div>
      <div className="mt-2">
        <MoneyEntryFields
          name={income.name}
          amount={income.amount}
          frequency={income.frequency}
          date={income.date}
          onChange={onUpdate}
        />
      </div>
    </li>
  );
}
