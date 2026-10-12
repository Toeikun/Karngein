/**
 * ยอดกระเป๋าเงิน + บัตรเครดิต (Phase 12.2 — PLAN.md R23–R28)
 *
 * แนวคิดเดียวใช้ทุกกระเป๋า: "เงินเข้า/ออกจากกระเป๋า" (moneyDelta)
 *   รับเข้า +  · จ่ายออก −  · โอนออก −  · โอนเข้า +
 *   R23 กระเป๋าเงิน: ยอด = ยอดตั้งต้น + Σ moneyDelta
 *   R24 บัตรเครดิต: ยอดค้าง = ยอดค้างตั้งต้น − Σ moneyDelta
 *       (รูดจ่าย = เงินออก → ค้างเพิ่ม, จ่ายบัตร = โอนเข้า → ค้างลด)
 */
import { addDays, clampedDate, daysBetween, monthOf } from "../entities/PayCycle";
import { walletsOf, type Plan } from "../entities/Plan";
import type { Transaction } from "../entities/Transaction";
import { isCredit, type Wallet } from "../entities/Wallet";

const round2 = (value: number) => Math.round(value * 100) / 100;

/** เงินเข้า (+) / ออก (−) จากกระเป๋า walletId ของรายการเดียว */
export function moneyDelta(t: Transaction, walletId: string): number {
  if (t.type === "transfer") {
    if (t.walletId === walletId) return -t.amount;
    if (t.toWalletId === walletId) return t.amount;
    return 0;
  }
  if (t.walletId !== walletId) return 0;
  return t.type === "income" ? t.amount : -t.amount;
}

export interface WalletBalance {
  wallet: Wallet;
  /** กระเป๋าเงิน = เงินที่มี (ติดลบได้ถ้าจดจ่ายเกิน) · บัตร = ยอดค้าง */
  amount: number;
  /** บัตรที่ตั้งวงเงิน: วงเงินคงเหลือ = วงเงิน − ยอดค้าง */
  available: number | null;
  count: number; // จำนวนรายการที่เกี่ยวกับกระเป๋านี้
}

/** R23–R24 — นับเฉพาะรายการที่วันที่ ≤ asOf (ไม่ส่ง = ทุกรายการ) */
export function walletBalances(plan: Plan, transactions: Transaction[], asOf?: string): WalletBalance[] {
  const considered = asOf ? transactions.filter((t) => t.date <= asOf) : transactions;
  return walletsOf(plan).map((wallet) => {
    const related = considered.filter((t) => t.walletId === wallet.id || t.toWalletId === wallet.id);
    const flow = related.reduce((total, t) => total + moneyDelta(t, wallet.id), 0);
    const amount = round2(isCredit(wallet) ? wallet.openingBalance - flow : wallet.openingBalance + flow);
    const available = isCredit(wallet) && wallet.creditLimit ? round2(wallet.creditLimit - amount) : null;
    return { wallet, amount, available, count: related.length };
  });
}

export interface NetWorth {
  cash: number; // รวมกระเป๋าเงิน
  debt: number; // รวมยอดค้างบัตร
  net: number; // R26
}

export function netWorth(balances: WalletBalance[]): NetWorth {
  const cash = round2(balances.filter((b) => !isCredit(b.wallet)).reduce((s, b) => s + b.amount, 0));
  const debt = round2(balances.filter((b) => isCredit(b.wallet)).reduce((s, b) => s + b.amount, 0));
  return { cash, debt, net: round2(cash - debt) };
}

/** R26 — รายรับ/รายจ่ายที่ไม่ได้ระบุกระเป๋า (หรือกระเป๋าถูกลบไปแล้ว) */
export function unassignedTransactions(plan: Plan, transactions: Transaction[]): Transaction[] {
  const ids = new Set(walletsOf(plan).map((w) => w.id));
  return transactions.filter((t) => t.type !== "transfer" && (!t.walletId || !ids.has(t.walletId)));
}

/** R29 — มีรายการอ้างอิงกระเป๋านี้กี่รายการ (มี → ลบไม่ได้ ให้ซ่อนแทน) */
export function walletUsage(transactions: Transaction[], walletId: string): number {
  return transactions.filter((t) => t.walletId === walletId || t.toWalletId === walletId).length;
}

/** กระเป๋าที่ใช้ล่าสุด (รายการวันที่ล่าสุด, ถ้าวันเดียวกันใช้ id ล่าสุด) ที่ยังไม่ถูกซ่อน → ใช้เป็นค่าเริ่มต้นตอนลงรายการ */
export function lastUsedWalletId(plan: Plan, transactions: Transaction[]): string | undefined {
  const active = new Set(walletsOf(plan).filter((w) => !w.archived).map((w) => w.id));
  const latest = [...transactions]
    .filter((t) => t.type !== "transfer" && t.walletId && active.has(t.walletId))
    .sort((a, b) => b.date.localeCompare(a.date) || b.id.localeCompare(a.id))[0];
  return latest?.walletId ?? walletsOf(plan).find((w) => !w.archived)?.id;
}

// ---------- R27–R28 รอบบิลบัตรเครดิต ----------

export type StatementStatus = "none" | "paid" | "ok" | "soon" | "overdue"; // none = บิลที่ปิดล่าสุดไม่มียอดที่จดไว้

export interface CreditStatement {
  periodStart: string; // วันแรกของรอบบิลที่ปิดล่าสุด
  closeDate: string; // วันตัดรอบ (รวมรายการวันนี้ด้วย)
  dueDate: string;
  amount: number; // ยอดบิล = รูด − รับคืน + กดเงินสด ในรอบ (ไม่นับการจ่ายบัตร)
  paid: number; // จ่ายเข้าบัตรหลังวันตัดรอบ
  remaining: number; // ต้องจ่ายอีก
  daysToDue: number; // ติดลบ = เกินกำหนด
  status: StatementStatus;
  nextCloseDate: string; // รอบที่ยังไม่ปิด ตัดวันไหน
  unbilled: number; // ยอดรูดสุทธิหลังวันตัดรอบ (ยังไม่ออกบิล) ถึงวันนี้
}

export const DUE_SOON_DAYS = 3;

/** วันตัดรอบล่าสุดที่ ≤ today */
function lastCloseDate(today: string, statementDay: number): string {
  const { year, month } = monthOf(today);
  const thisMonth = clampedDate(year, month, statementDay);
  if (thisMonth <= today) return thisMonth;
  const prev = monthOf(today, -1);
  return clampedDate(prev.year, prev.month, statementDay);
}

export function creditStatement(wallet: Wallet, transactions: Transaction[], today: string): CreditStatement | null {
  if (!isCredit(wallet) || !wallet.statementDay || !wallet.dueDay) return null;
  const closeDate = lastCloseDate(today, wallet.statementDay);
  const prevMonth = monthOf(closeDate, -1);
  const periodStart = addDays(clampedDate(prevMonth.year, prevMonth.month, wallet.statementDay), 1);

  const sameMonthDue = clampedDate(monthOf(closeDate).year, monthOf(closeDate).month, wallet.dueDay);
  const nextMonth = monthOf(closeDate, 1);
  const dueDate = sameMonthDue > closeDate ? sameMonthDue : clampedDate(nextMonth.year, nextMonth.month, wallet.dueDay);

  const isPayment = (t: Transaction) => t.type === "transfer" && t.toWalletId === wallet.id;
  const inPeriod = transactions.filter((t) => t.date >= periodStart && t.date <= closeDate && !isPayment(t));
  const amount = round2(Math.max(0, -inPeriod.reduce((s, t) => s + moneyDelta(t, wallet.id), 0)));
  const paid = round2(transactions.filter((t) => isPayment(t) && t.date > closeDate && t.date <= today).reduce((s, t) => s + t.amount, 0));
  const remaining = round2(Math.max(0, amount - paid));
  const daysToDue = daysBetween(today, dueDate);

  let status: StatementStatus = "ok";
  if (amount === 0) status = "none";
  else if (remaining === 0) status = "paid";
  else if (daysToDue < 0) status = "overdue";
  else if (daysToDue <= DUE_SOON_DAYS) status = "soon";

  const next = monthOf(closeDate, 1);
  const nextCloseDate = clampedDate(next.year, next.month, wallet.statementDay);
  const sinceClose = transactions.filter((t) => t.date > closeDate && t.date <= today && !isPayment(t));
  const unbilled = round2(Math.max(0, -sinceClose.reduce((s, t) => s + moneyDelta(t, wallet.id), 0)));

  return { periodStart, closeDate, dueDate, amount, paid, remaining, daysToDue, status, nextCloseDate, unbilled };
}

export interface DueAlert {
  wallet: Wallet;
  statement: CreditStatement;
}

/** R28 — บัตรที่ใกล้ครบกำหนด (≤ 3 วัน) หรือเกินกำหนดแล้วและยังต้องจ่าย (ไม่รวมบัตรที่ซ่อน) */
export function dueAlerts(plan: Plan, transactions: Transaction[], today: string): DueAlert[] {
  return walletsOf(plan)
    .filter((w) => !w.archived)
    .map((wallet) => ({ wallet, statement: creditStatement(wallet, transactions, today) }))
    .filter((a): a is DueAlert => a.statement !== null && (a.statement.status === "soon" || a.statement.status === "overdue"))
    .sort((a, b) => a.statement.daysToDue - b.statement.daysToDue);
}
