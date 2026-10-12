"use client";

/** แถบค้นหา/กรองรายการ คร่อมทุกรอบ (Domain: searchTransactions) */
import { CATEGORIES, type CategoryId } from "@/domain/entities/Category";
import type { TransactionType } from "@/domain/entities/Transaction";
import type { TransactionQuery } from "@/domain/services/searchTransactions";

interface TransactionSearchProps {
  query: TransactionQuery;
  onChange: (query: TransactionQuery) => void;
}

const field = "h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100";

export function TransactionSearch({ query, onChange }: TransactionSearchProps) {
  return (
    <div role="search" className="grid gap-2 rounded-3xl bg-white p-3 shadow-sm ring-1 ring-slate-100 sm:grid-cols-[1fr_auto_auto]">
      <input
        type="search"
        aria-label="ค้นหารายการ"
        placeholder="🔍 ค้นหา ร้าน · โน้ต · #tag · จำนวนเงิน (ทุกรอบ)"
        value={query.text ?? ""}
        onChange={(e) => onChange({ ...query, text: e.target.value })}
        className={`${field} w-full`}
      />
      <select aria-label="กรองประเภท" value={query.type ?? "all"} onChange={(e) => onChange({ ...query, type: e.target.value as TransactionType | "all" })} className={field}>
        <option value="all">ทุกประเภท</option>
        <option value="expense">รายจ่าย</option>
        <option value="income">รายรับ</option>
      </select>
      <select aria-label="กรองหมวด" value={query.category ?? "all"} onChange={(e) => onChange({ ...query, category: e.target.value as CategoryId | "all" })} className={field}>
        <option value="all">ทุกหมวด</option>
        {CATEGORIES.map((c) => (
          <option key={c.id} value={c.id}>
            {c.label}
          </option>
        ))}
      </select>
    </div>
  );
}
