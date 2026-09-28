"use client";

import type { ExpenseItemInput } from "@/application/usecases/expenses";
import type { ExpenseItem } from "@/domain/entities/Expense";
import type { ValidationError } from "@/domain/entities/validation";
import { IconButton, TrashIcon } from "../ui/IconButton";
import { errorFor, MoneyEntryFields } from "../ui/MoneyEntryFields";
import { TextField } from "../ui/TextField";

interface ExpenseItemRowProps {
  item: ExpenseItem;
  onUpdate: (changes: Partial<ExpenseItemInput>) => ValidationError[];
  onRemove: () => void;
}

export function ExpenseItemRow({ item, onUpdate, onRemove }: ExpenseItemRowProps) {
  return (
    <li className="rounded-xl bg-slate-50 p-2">
      <div className="flex items-start gap-2">
        <TextField
          label="ชื่อรายการย่อย"
          value={item.name}
          className="min-w-0 flex-1"
          onCommit={(name) => errorFor(onUpdate({ name }), "name")}
        />
        <IconButton label={`ลบ ${item.name}`} tone="danger" onClick={onRemove}>
          <TrashIcon />
        </IconButton>
      </div>
      <div className="mt-2">
        <MoneyEntryFields name={item.name} amount={item.amount} frequency={item.frequency} date={item.date} onChange={onUpdate} />
      </div>
    </li>
  );
}
