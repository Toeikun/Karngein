"use client";

/**
 * WalletsView — แท็บ "กระเป๋า" (Phase 12.2)
 *   การ์ดเงินที่มีอยู่สุทธิ (R26) → เตือนบัตร (R28) → กระเป๋าแต่ละใบ (R23–R24, บิลบัตร R27) → กระเป๋าที่ซ่อน
 * ตัวเลขทั้งหมดคำนวณใน Domain (walletBalances) — component แค่จัดวาง
 */
import { useState } from "react";
import { addWallet, removeWallet, setWalletArchived, updateWallet } from "@/application/usecases/wallets";
import { formatBaht } from "@/domain/entities/Money";
import { walletsOf, type Plan } from "@/domain/entities/Plan";
import type { TransactionInput } from "@/domain/entities/Transaction";
import { isCredit, WALLET_KINDS, type Wallet } from "@/domain/entities/Wallet";
import {
  creditStatement,
  dueAlerts,
  netWorth,
  unassignedTransactions,
  walletBalances,
  type DueAlert,
  type WalletBalance,
} from "@/domain/services/walletBalances";
import type { RunUseCase } from "../../hooks/usePlan";
import type { TransactionsState } from "../../hooks/useTransactions";
import { formatThaiDate } from "../../utils/periodLabel";
import { DueAlerts } from "./DueAlerts";
import { WalletForm } from "./WalletForm";

interface WalletsViewProps {
  plan: Plan;
  run: RunUseCase;
  today: string;
  tx: TransactionsState;
  onQuickAdd: (preset: Partial<TransactionInput>) => void;
}

/** ปุ่ม "จ่ายบัตร" → แผ่นลงรายการแบบโอน: จากกระเป๋าเงินใบแรก → บัตร ใส่ยอดที่ต้องจ่ายให้ */
export function payCardPreset(plan: Plan, card: Wallet, amount: number): Partial<TransactionInput> {
  const from = walletsOf(plan).find((w) => !isCredit(w) && !w.archived);
  return { type: "transfer", toWalletId: card.id, ...(from ? { walletId: from.id } : {}), ...(amount > 0 ? { amount } : {}), note: `จ่ายบัตร ${card.name}` };
}

export function WalletsView({ plan, run, today, tx, onQuickAdd }: WalletsViewProps) {
  const { transactions } = tx;
  const [editing, setEditing] = useState<string | "new" | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const balances = walletBalances(plan, transactions);
  const total = netWorth(balances.filter((b) => !b.wallet.archived));
  const active = balances.filter((b) => !b.wallet.archived);
  const archived = balances.filter((b) => b.wallet.archived);
  const unassigned = unassignedTransactions(plan, transactions);
  const editingWallet = editing && editing !== "new" ? walletsOf(plan).find((w) => w.id === editing) ?? null : null;
  const pay = (alert: DueAlert) => onQuickAdd(payCardPreset(plan, alert.wallet, alert.statement.remaining));

  const card = (b: WalletBalance) => (
    <WalletCard
      key={b.wallet.id}
      balance={b}
      statement={creditStatement(b.wallet, transactions, today)}
      onEdit={() => {
        setMessage(null);
        setEditing(b.wallet.id);
      }}
      onPay={(amount) => onQuickAdd(payCardPreset(plan, b.wallet, amount))}
      onToggleArchive={() => run((p, c) => setWalletArchived(p, b.wallet.id, !b.wallet.archived, c))}
      onDelete={() => {
        if (!window.confirm(`ลบกระเป๋า "${b.wallet.name}"?`)) return;
        const errors = run((p, c) => removeWallet(p, b.wallet.id, transactions, c));
        setMessage(errors[0]?.message ?? null);
      }}
    />
  );

  return (
    <div className="space-y-5">
      <section aria-label="เงินที่มีอยู่" className="rounded-3xl bg-white p-4 shadow-sm ring-1 ring-slate-100 sm:p-5">
        <p className="text-sm text-slate-500">เงินที่มีอยู่สุทธิ</p>
        <p role="status" aria-label="เงินที่มีอยู่สุทธิ" className={`text-3xl font-bold tracking-tight tabular-nums sm:text-4xl ${total.net < 0 ? "text-red-600" : "text-slate-900"}`}>
          {formatBaht(total.net)}
        </p>
        <dl className="mt-3 grid grid-cols-2 gap-3 text-sm">
          <div className="rounded-2xl bg-emerald-50 p-3">
            <dt className="text-emerald-800">เงินในกระเป๋า</dt>
            <dd role="status" aria-label="เงินในกระเป๋า" className="font-semibold tabular-nums text-emerald-900">
              {formatBaht(total.cash)}
            </dd>
          </div>
          <div className="rounded-2xl bg-rose-50 p-3">
            <dt className="text-rose-800">ยอดค้างบัตร</dt>
            <dd role="status" aria-label="ยอดค้างบัตร" className="font-semibold tabular-nums text-rose-900">
              {formatBaht(total.debt)}
            </dd>
          </div>
        </dl>
        {unassigned.length > 0 && (
          <p className="mt-3 text-xs text-slate-500">
            มี {unassigned.length} รายการที่ไม่ได้ระบุกระเป๋า (ไม่นับในยอดด้านบน) — แตะรายการในแท็บรายการเพื่อเลือกกระเป๋าได้
          </p>
        )}
      </section>

      <DueAlerts alerts={dueAlerts(plan, transactions, today)} onPay={pay} />

      {message && (
        <p role="alert" className="rounded-2xl bg-red-50 p-3 text-sm text-red-700">
          {message}
        </p>
      )}

      {editing ? (
        <WalletForm
          key={editing}
          editing={editingWallet}
          onCancel={() => setEditing(null)}
          onSubmit={(input) => {
            const errors = run((p, c) => (editingWallet ? updateWallet(p, editingWallet.id, input, c) : addWallet(p, input, c)));
            if (errors.length === 0) setEditing(null);
            return errors;
          }}
        />
      ) : (
        <button
          type="button"
          onClick={() => {
            setMessage(null);
            setEditing("new");
          }}
          className="h-12 w-full rounded-2xl border-2 border-dashed border-indigo-200 font-medium text-indigo-700 hover:bg-indigo-50"
        >
          + เพิ่มกระเป๋า
        </button>
      )}

      {active.length === 0 && !editing && (
        <p className="rounded-3xl bg-white p-6 text-center text-sm text-slate-500 shadow-sm ring-1 ring-slate-100">
          ยังไม่มีกระเป๋า — เพิ่ม เงินสด / บัญชีธนาคาร / วอลเล็ต / บัตรเครดิต แล้วเลือกกระเป๋าตอนลงรายการ จะเห็นเงินแต่ละที่และยอดค้างบัตร
        </p>
      )}

      <div className="grid gap-3 lg:grid-cols-2">{active.map(card)}</div>

      {archived.length > 0 && (
        <details className="rounded-3xl bg-white/60 p-3 ring-1 ring-slate-100">
          <summary className="flex min-h-11 cursor-pointer items-center px-1 text-sm font-medium text-slate-600">กระเป๋าที่ซ่อน ({archived.length})</summary>
          <div className="mt-2 grid gap-3 lg:grid-cols-2">{archived.map(card)}</div>
        </details>
      )}
    </div>
  );
}

interface WalletCardProps {
  balance: WalletBalance;
  statement: ReturnType<typeof creditStatement>;
  onEdit: () => void;
  onPay: (amount: number) => void;
  onToggleArchive: () => void;
  onDelete: () => void;
}

function WalletCard({ balance, statement, onEdit, onPay, onToggleArchive, onDelete }: WalletCardProps) {
  const { wallet, amount, available, count } = balance;
  const credit = isCredit(wallet);
  const kind = WALLET_KINDS.find((k) => k.id === wallet.kind)!;
  const usedPercent = credit && wallet.creditLimit ? Math.min(100, (amount / wallet.creditLimit) * 100) : null;
  const action = "h-11 rounded-xl px-3 text-sm font-medium";

  return (
    <article aria-label={`กระเป๋า ${wallet.name}`} className="rounded-3xl bg-white p-4 shadow-sm ring-1 ring-slate-100">
      <div className="flex items-center gap-3">
        <span aria-hidden className={`grid size-11 shrink-0 place-items-center rounded-2xl text-xl ${credit ? "bg-rose-100" : "bg-indigo-100"}`}>
          {kind.icon}
        </span>
        <div className="min-w-0 flex-1">
          <h3 className="truncate font-semibold text-slate-800">{wallet.name}</h3>
          <p className="text-xs text-slate-500">
            {kind.label} · {count} รายการ
          </p>
        </div>
        <div className="text-right">
          <p className="text-xs text-slate-500">{credit ? "ยอดค้าง" : "คงเหลือ"}</p>
          <p
            role="status"
            aria-label={`ยอด ${wallet.name}`}
            className={`font-bold tabular-nums ${credit ? (amount > 0 ? "text-rose-700" : "text-slate-800") : amount < 0 ? "text-red-600" : "text-slate-900"}`}
          >
            {formatBaht(amount)}
          </p>
        </div>
      </div>

      {usedPercent !== null && (
        <div className="mt-3">
          <div className="h-2 overflow-hidden rounded-full bg-slate-100" role="img" aria-label={`ใช้วงเงินไป ${usedPercent.toFixed(0)}%`}>
            <div className={`h-full rounded-full ${usedPercent >= 90 ? "bg-red-500" : "bg-rose-400"}`} style={{ width: `${usedPercent}%` }} />
          </div>
          <p className="mt-1 text-xs text-slate-500">
            วงเงินคงเหลือ <span className="tabular-nums">{formatBaht(available ?? 0)}</span> จาก {formatBaht(wallet.creditLimit ?? 0)}
          </p>
        </div>
      )}

      {statement && (
        <div className="mt-3 space-y-1 rounded-2xl bg-slate-50 p-3 text-xs text-slate-600" data-testid={`statement-${wallet.id}`}>
          {statement.status === "none" ? (
            <p>บิลรอบ {formatThaiDate(statement.periodStart, false)} – {formatThaiDate(statement.closeDate, false)}: ไม่มียอดที่จดไว้</p>
          ) : (
            <p>
              บิลรอบ {formatThaiDate(statement.periodStart, false)} – {formatThaiDate(statement.closeDate, false)}:{" "}
              <span className="tabular-nums">{formatBaht(statement.amount)}</span>
              {statement.paid > 0 && (
                <>
                  {" "}
                  · จ่ายแล้ว <span className="tabular-nums">{formatBaht(statement.paid)}</span>
                </>
              )}
              <br />
              {statement.status === "paid" ? (
                <span className="font-medium text-emerald-700">จ่ายครบแล้ว ✓</span>
              ) : (
                <span className={statement.status === "overdue" ? "font-medium text-red-700" : statement.status === "soon" ? "font-medium text-amber-700" : ""}>
                  ต้องจ่ายอีก <span className="tabular-nums">{formatBaht(statement.remaining)}</span> ภายใน {formatThaiDate(statement.dueDate)}
                </span>
              )}
            </p>
          )}
          <p>
            รอบปัจจุบัน (ตัดวันที่ {formatThaiDate(statement.nextCloseDate, false)}): รูดแล้ว <span className="tabular-nums">{formatBaht(statement.unbilled)}</span>
          </p>
        </div>
      )}

      <div className="mt-3 flex flex-wrap gap-2">
        {credit && !wallet.archived && (
          <button type="button" onClick={() => onPay(statement?.remaining || amount)} className={`${action} bg-rose-600 text-white hover:bg-rose-700`}>
            จ่ายบัตร
          </button>
        )}
        <button type="button" onClick={onEdit} aria-label={`แก้ไขกระเป๋า ${wallet.name}`} className={`${action} bg-slate-100 text-slate-700 hover:bg-slate-200`}>
          แก้ไข
        </button>
        <button type="button" onClick={onToggleArchive} aria-label={`${wallet.archived ? "เลิกซ่อน" : "ซ่อน"}กระเป๋า ${wallet.name}`} className={`${action} text-slate-600 hover:bg-slate-100`}>
          {wallet.archived ? "เลิกซ่อน" : "ซ่อน"}
        </button>
        <button type="button" onClick={onDelete} aria-label={`ลบกระเป๋า ${wallet.name}`} className={`${action} text-red-600 hover:bg-red-50`}>
          ลบ
        </button>
      </div>
    </article>
  );
}
