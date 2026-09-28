"use client";

import { useState } from "react";
import {
  addExpenseItem,
  removeExpenseGroup,
  removeExpenseItem,
  updateExpenseGroup,
  updateExpenseItem,
} from "@/application/usecases/expenses";
import { CATEGORIES, type CategoryId } from "@/domain/entities/Category";
import type { ExpenseGroup } from "@/domain/entities/Expense";
import { formatBaht } from "@/domain/entities/Money";
import type { Period } from "@/domain/entities/Period";
import { groupTotal } from "@/domain/services/summarize";
import type { RunUseCase } from "../../hooks/usePlan";
import { CATEGORY_STYLES } from "../../styles/categoryStyles";
import { ChevronIcon, IconButton, TrashIcon } from "../ui/IconButton";
import { errorFor, MoneyEntryFields } from "../ui/MoneyEntryFields";
import { TextField } from "../ui/TextField";
import { ExpenseItemRow } from "./ExpenseItemRow";

interface ExpenseGroupRowProps {
  group: ExpenseGroup;
  period: Period;
  run: RunUseCase;
}

const categoryOptions = CATEGORIES.map((c) => ({ value: c.id, label: c.label }));

export function ExpenseGroupRow({ group, period, run }: ExpenseGroupRowProps) {
  const [open, setOpen] = useState(true);
  const style = CATEGORY_STYLES[group.category];
  const hasItems = group.items.length > 0;

  const updateGroup = (changes: Parameters<typeof updateExpenseGroup>[2]) =>
    run((plan, ctx) => updateExpenseGroup(plan, group.id, changes, ctx));

  return (
    <li className={`rounded-2xl border border-l-4 border-slate-100 bg-white p-3 shadow-xs ${style.border}`}>
      <div className="flex items-start gap-1">
        <IconButton label={open ? `ยุบ ${group.name}` : `ขยาย ${group.name}`} onClick={() => setOpen(!open)}>
          <ChevronIcon open={open} />
        </IconButton>
        <TextField
          label="ชื่อกลุ่มรายจ่าย"
          value={group.name}
          className="min-w-0 flex-1"
          inputClassName="font-medium"
          onCommit={(name) => errorFor(updateGroup({ name }), "name")}
        />
        <IconButton label={`ลบกลุ่ม ${group.name}`} tone="danger" onClick={() => run((plan, ctx) => removeExpenseGroup(plan, group.id, ctx))}>
          <TrashIcon />
        </IconButton>
      </div>

      <div className="mt-2 flex flex-wrap items-center justify-between gap-2 pl-12">
        <select
          aria-label={`หมวดของ ${group.name}`}
          value={group.category}
          onChange={(event) => updateGroup({ category: event.target.value as CategoryId })}
          className={`h-11 rounded-full px-3 text-sm font-medium outline-none focus:ring-2 focus:ring-indigo-100 ${style.badge}`}
        >
          {categoryOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <span className="text-sm text-slate-500">
          รวม <strong className="font-semibold tabular-nums text-slate-800" data-testid={`group-total-${group.id}`}>{formatBaht(groupTotal(group, period))}</strong>
        </span>
      </div>

      {open && (
        <div className="mt-3 space-y-2 sm:pl-12">
          {!hasItems && (
            <MoneyEntryFields
              name={group.name}
              amount={group.amount ?? 0}
              frequency={group.frequency ?? "monthly"}
              date={group.date}
              onChange={updateGroup}
            />
          )}
          {hasItems && (
            <ul className="space-y-2">
              {group.items.map((item) => (
                <ExpenseItemRow
                  key={item.id}
                  item={item}
                  onUpdate={(changes) => run((plan, ctx) => updateExpenseItem(plan, group.id, item.id, changes, ctx))}
                  onRemove={() => run((plan, ctx) => removeExpenseItem(plan, group.id, item.id, ctx))}
                />
              ))}
            </ul>
          )}
          <button
            type="button"
            onClick={() => run((plan, ctx) => addExpenseItem(plan, group.id, { name: "รายการใหม่", amount: 0, frequency: "monthly" }, ctx))}
            className="h-11 rounded-xl px-3 text-sm text-indigo-600 hover:bg-indigo-50"
          >
            + เพิ่มรายการย่อย
          </button>
        </div>
      )}
    </li>
  );
}
