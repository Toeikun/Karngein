"use client";

/** แถบค้นหารายการ คร่อมทุกรอบ + ตัวกรอง (พับไว้) — Domain: searchTransactions */
import { useState } from "react";
import { CATEGORIES, type CategoryId } from "@/domain/entities/Category";
import type { TransactionType } from "@/domain/entities/Transaction";
import type { TransactionQuery } from "@/domain/services/searchTransactions";

interface TransactionSearchProps {
  query: TransactionQuery;
  onChange: (query: TransactionQuery) => void;
}

const field = "h-11 rounded-full border border-slate-200 bg-white px-4 text-sm outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100";

export function TransactionSearch({ query, onChange }: TransactionSearchProps) {
  const filtered = (query.type ?? "all") !== "all" || (query.category ?? "all") !== "all";
  const [showFilters, setShowFilters] = useState(filtered);
  return (
    <div role="search" className="space-y-2">
      <div className="flex gap-2">
        <input
          type="search"
          aria-label="ค้นหารายการ"
          placeholder="🔍 ค้นหา ร้าน · โน้ต · #tag · จำนวนเงิน"
          value={query.text ?? ""}
          onChange={(e) => onChange({ ...query, text: e.target.value })}
          className={`${field} min-w-0 flex-1 shadow-sm`}
        />
        <button
          type="button"
          aria-expanded={showFilters || filtered}
          onClick={() => setShowFilters((s) => !s)}
          className={`h-11 shrink-0 rounded-full px-4 text-sm font-medium shadow-sm ring-1 ${
            filtered ? "bg-indigo-600 text-white ring-indigo-600" : "bg-white text-slate-700 ring-slate-200 hover:bg-slate-50"
          }`}
        >
          ตัวกรอง{filtered && " •"}
        </button>
      </div>
      {(showFilters || filtered) && (
        <div className="grid grid-cols-2 gap-2">
          <select aria-label="กรองประเภท" value={query.type ?? "all"} onChange={(e) => onChange({ ...query, type: e.target.value as TransactionType | "all" })} className={field}>
            <option value="all">ทุกประเภท</option>
            <option value="expense">รายจ่าย</option>
            <option value="income">รายรับ</option>
            <option value="transfer">โอน</option>
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
      )}
    </div>
  );
}
