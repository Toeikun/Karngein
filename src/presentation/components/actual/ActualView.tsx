"use client";

/**
 * ActualView — แท็บ "รายการ" (หน้าแรกของแอป) — Phase 11.3 + 12.1 + 12.1b
 *   การ์ดคงเหลือ/งบ (BalanceHero) → ค้นหา → รายการแยกตามวัน
 *   (เทียบงบรายกลุ่ม + Sankey ตามจริง ย้ายไปแท็บ "สรุป" ใน Phase 12.3)
 * - ลงรายการใหม่ = ปุ่ม + ในแถบล่าง (PlanContent) / แตะรายการ = แผ่นแก้ไข (ลบได้ในแผ่น)
 * - ค้นหา/กรองคร่อมทุกรอบ (คำค้นว่าง = แสดงตามรอบ)
 * - ตัวเลขทั้งหมดคำนวณใน Domain (cycleSummary / dailyView / searchTransactions)
 */
import { useState } from "react";
import { setPayCycleStartDay } from "@/application/usecases/plans";
import { formatBaht } from "@/domain/entities/Money";
import { cycleContaining, daysLeftInCycle, shiftCycle } from "@/domain/entities/PayCycle";
import { payCycleStartDayOf, type Plan } from "@/domain/entities/Plan";
import type { Transaction, TransactionInput } from "@/domain/entities/Transaction";
import { summarizeCycle, transactionsInCycle } from "@/domain/services/cycleSummary";
import { budgetPace } from "@/domain/services/dailyView";
import { isEmptyQuery, searchTransactions, type TransactionQuery } from "@/domain/services/searchTransactions";
import { dueAlerts } from "@/domain/services/walletBalances";
import type { RunUseCase } from "../../hooks/usePlan";
import type { TransactionsState } from "../../hooks/useTransactions";
import { BalanceHero } from "./BalanceHero";
import { CycleSettings } from "./CycleSettings";
import { QuickAddSheet } from "./QuickAddSheet";
import { TransactionList } from "./TransactionList";
import { TransactionSearch } from "./TransactionSearch";
import { DueAlerts } from "../wallets/DueAlerts";
import { payCardPreset } from "../wallets/WalletsView";

interface ActualViewProps {
  plan: Plan;
  run: RunUseCase;
  today: string;
  tx: TransactionsState;
  onQuickAdd: (preset: Partial<TransactionInput>) => void;
}

export function ActualView({ plan, run, today, tx, onQuickAdd }: ActualViewProps) {
  const { transactions, update, remove } = tx;
  const [offset, setOffset] = useState(0); // 0 = รอบปัจจุบัน, -1 = รอบก่อน, …
  const [editing, setEditing] = useState<Transaction | null>(null);
  const [query, setQuery] = useState<TransactionQuery>({ text: "", type: "all", category: "all" });

  const startDay = payCycleStartDayOf(plan);
  const cycle = shiftCycle(cycleContaining(today, startDay), startDay, offset);
  const summary = summarizeCycle(transactions, cycle);
  const searching = !isEmptyQuery(query);
  const results = searching ? searchTransactions(plan, transactions, query) : [];

  const confirmDelete = (t: Transaction) => {
    if (window.confirm(`ลบรายการ ${t.merchant ?? t.note ?? ""} ${t.amount.toLocaleString("en-US")} บาท?`)) {
      void remove(t.id);
      setEditing(null);
    }
  };

  // โครงเดียวทั้งตอนค้นหาและตอนดูรอบ → ช่องค้นหาอยู่ตำแหน่งเดิมเสมอ (ไม่ถูกสร้างใหม่ → พิมพ์ต่อได้ไม่หลุดโฟกัส)
  return (
    <div className="space-y-5">
      {/* บัตรเครดิตใกล้/เกินกำหนดชำระ (R28) — เห็นทันทีที่เปิดแอป */}
      <DueAlerts alerts={dueAlerts(plan, transactions, today)} onPay={(a) => onQuickAdd(payCardPreset(plan, a.wallet, a.statement.remaining))} />
      {/* มือถือ: การ์ด → ค้นหา + รายการ → ตั้งรอบ / คอมฯ: ซ้าย = การ์ด + ตั้งรอบ, ขวา = ค้นหา + รายการ */}
      <div className="grid gap-5 lg:grid-cols-[2fr_3fr] lg:items-start">
        <div className={searching ? "hidden" : ""}>
          {!searching && (
            <BalanceHero
              cycle={cycle}
              isCurrent={offset === 0}
              summary={summary}
              pace={budgetPace(plan, transactions, cycle, today)}
              daysLeft={offset === 0 ? daysLeftInCycle(today, cycle) : null}
              onShift={(delta) => setOffset((o) => o + delta)}
              onToday={() => setOffset(0)}
            />
          )}
        </div>
        <div className={`space-y-4 lg:row-span-2 lg:row-start-1 ${searching ? "lg:col-span-2" : "lg:col-start-2"}`}>
          <TransactionSearch query={query} onChange={setQuery} />
          {searching ? (
            <>
              <p className="px-1 text-sm text-slate-600" role="status" aria-label="ผลการค้นหา">
                พบ {results.length} รายการ · รับ {formatBaht(results.filter((t) => t.type === "income").reduce((s, t) => s + t.amount, 0))} · จ่าย{" "}
                {formatBaht(results.filter((t) => t.type === "expense").reduce((s, t) => s + t.amount, 0))}
              </p>
              <TransactionList
                plan={plan}
                transactions={results}
                today={today}
                title={`ผลการค้นหา (${results.length})`}
                emptyMessage="ไม่พบรายการที่ตรงกับคำค้น — ลองคำอื่น หรือล้างตัวกรอง"
                onEdit={setEditing}
              />
            </>
          ) : (
            <TransactionList plan={plan} transactions={transactionsInCycle(transactions, cycle)} today={today} onEdit={setEditing} />
          )}
        </div>
        {!searching && (
          <div className="lg:col-start-1 lg:row-start-2">
            <CycleSettings startDay={startDay} onChange={(day) => run((p, c) => setPayCycleStartDay(p, day, c))} />
          </div>
        )}
      </div>

      {editing && (
        <QuickAddSheet
          plan={plan}
          today={today}
          history={transactions}
          editing={editing}
          onSubmit={(input) => update({ ...input, id: editing.id })}
          onDelete={confirmDelete}
          onClose={() => setEditing(null)}
        />
      )}
    </div>
  );
}
