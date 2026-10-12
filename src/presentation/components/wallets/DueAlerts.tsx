"use client";

/** การ์ดเตือนบัตรเครดิตใกล้/เกินกำหนดชำระ (R28) — แสดงบนแท็บรายการและแท็บกระเป๋า */
import { formatBaht } from "@/domain/entities/Money";
import type { DueAlert } from "@/domain/services/walletBalances";
import { formatThaiDate } from "../../utils/periodLabel";

export function DueAlerts({ alerts, onPay }: { alerts: DueAlert[]; onPay: (alert: DueAlert) => void }) {
  if (alerts.length === 0) return null;
  return (
    <div className="space-y-2">
      {alerts.map((alert) => {
        const { wallet, statement } = alert;
        const overdue = statement.status === "overdue";
        const when = overdue
          ? `เลยกำหนด ${-statement.daysToDue} วัน`
          : statement.daysToDue === 0
            ? "ครบกำหนดวันนี้"
            : `อีก ${statement.daysToDue} วัน`;
        return (
          <div
            key={wallet.id}
            role="alert"
            className={`flex flex-wrap items-center gap-3 rounded-3xl p-4 ring-1 ${overdue ? "bg-red-50 text-red-800 ring-red-200" : "bg-amber-50 text-amber-900 ring-amber-200"}`}
          >
            <span aria-hidden className="text-2xl">
              💳
            </span>
            <p className="min-w-0 flex-1 text-sm">
              <strong>{wallet.name}</strong> ต้องจ่าย <strong className="tabular-nums">{formatBaht(statement.remaining)}</strong> ภายใน{" "}
              {formatThaiDate(statement.dueDate)} ({when})
            </p>
            <button
              type="button"
              onClick={() => onPay(alert)}
              className={`h-11 shrink-0 rounded-xl px-4 text-sm font-semibold text-white ${overdue ? "bg-red-600 hover:bg-red-700" : "bg-amber-600 hover:bg-amber-700"}`}
            >
              จ่ายบัตร {wallet.name}
            </button>
          </div>
        );
      })}
    </div>
  );
}
