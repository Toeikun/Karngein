import { describe, expect, it } from "vitest";
import type { Plan } from "@/domain/entities/Plan";
import { validateTransaction, type Transaction } from "@/domain/entities/Transaction";
import { validateWallet, type Wallet } from "@/domain/entities/Wallet";
import { budgetPace, groupByDay } from "@/domain/services/dailyView";
import { compareWithBudget, summarizeCycle } from "@/domain/services/cycleSummary";
import { goalProgress } from "@/domain/services/goalProgress";
import { searchTransactions } from "@/domain/services/searchTransactions";
import {
  creditStatement,
  dueAlerts,
  lastUsedWalletId,
  netWorth,
  unassignedTransactions,
  walletBalances,
  walletUsage,
} from "@/domain/services/walletBalances";
import { goldenPlan3 } from "./goldenData";

/**
 * Golden ชุดที่ 4 (Phase 12.2): บัญชี 20,000 · เงินสด 1,000 · บัตร ตัดรอบ 25 ครบกำหนด 10 วงเงิน 50,000
 */
const bank: Wallet = { id: "w-bank", name: "KBank", kind: "bank", openingBalance: 20000 };
const cash: Wallet = { id: "w-cash", name: "เงินสด", kind: "cash", openingBalance: 1000 };
const card: Wallet = { id: "w-card", name: "บัตร KTC", kind: "credit", openingBalance: 0, creditLimit: 50000, statementDay: 25, dueDay: 10 };
const plan: Plan = { ...goldenPlan3, goals: [], payCycleStartDay: 1, wallets: [bank, cash, card] };

const tx: Transaction[] = [
  { id: "t01", date: "2026-09-20", type: "expense", amount: 1000, category: "wants", walletId: "w-card" }, // บิลรอบก่อน
  { id: "t02", date: "2026-09-30", type: "expense", amount: 2500, category: "wants", walletId: "w-card", merchant: "Lazada" },
  { id: "t03", date: "2026-10-01", type: "income", amount: 30000, walletId: "w-bank", planIncomeId: "inc-salary" },
  { id: "t04", date: "2026-10-02", type: "expense", amount: 8000, category: "essential", planGroupId: "grp-food", walletId: "w-bank" },
  { id: "t05", date: "2026-10-03", type: "income", amount: 300, walletId: "w-card", note: "คืนสินค้า" }, // รับคืนเข้าบัตร
  { id: "t06", date: "2026-10-05", type: "transfer", amount: 500, walletId: "w-bank", toWalletId: "w-cash", note: "ถอนเงินสด" },
  { id: "t07", date: "2026-10-26", type: "expense", amount: 700, category: "wants", walletId: "w-card" }, // บิลรอบถัดไป
  { id: "t08", date: "2026-10-28", type: "transfer", amount: 1000, walletId: "w-bank", toWalletId: "w-card", note: "จ่ายบัตร" },
  { id: "t09", date: "2026-10-04", type: "expense", amount: 50, category: "wants" }, // ของเก่า ไม่ระบุกระเป๋า
];

const byId = (balances: ReturnType<typeof walletBalances>, id: string) => balances.find((b) => b.wallet.id === id)!;

describe("R23–R24, R26 ยอดกระเป๋า / ยอดค้างบัตร / เงินที่มีอยู่สุทธิ", () => {
  it("golden: บัญชี 40,500 · เงินสด 1,500 · บัตรค้าง 2,900 (วงเงินเหลือ 47,100) · สุทธิ 39,100", () => {
    const balances = walletBalances(plan, tx);
    expect(byId(balances, "w-bank")).toMatchObject({ amount: 40500, available: null, count: 4 }); // 20,000 + 30,000 − 8,000 − 500 − 1,000
    expect(byId(balances, "w-cash")).toMatchObject({ amount: 1500, count: 1 });
    expect(byId(balances, "w-card")).toMatchObject({ amount: 2900, available: 47100, count: 5 }); // 1,000 + 2,500 − 300 + 700 − 1,000
    expect(netWorth(balances)).toEqual({ cash: 42000, debt: 2900, net: 39100 });
  });

  it("asOf: นับเฉพาะรายการถึงวันนั้น", () => {
    expect(byId(walletBalances(plan, tx, "2026-10-01"), "w-bank").amount).toBe(50000);
  });

  it("บัตรเครดิตกดเงินสด (โอนออกจากบัตร) → ยอดค้างเพิ่ม", () => {
    const advance: Transaction = { id: "t10", date: "2026-10-29", type: "transfer", amount: 2000, walletId: "w-card", toWalletId: "w-cash" };
    const balances = walletBalances(plan, [...tx, advance]);
    expect(byId(balances, "w-card").amount).toBe(4900);
    expect(byId(balances, "w-cash").amount).toBe(3500);
  });

  it("ไม่มีกระเป๋า → [] / รายการไม่ระบุกระเป๋า หรือกระเป๋าถูกลบ → นับเป็น 'ไม่ระบุ'", () => {
    expect(walletBalances({ ...plan, wallets: undefined }, tx)).toEqual([]);
    const orphan: Transaction = { id: "t11", date: "2026-10-04", type: "expense", amount: 20, category: "wants", walletId: "deleted" };
    expect(unassignedTransactions(plan, [...tx, orphan]).map((t) => t.id)).toEqual(["t09", "t11"]);
  });
});

describe("R25 การโอนไม่ใช่รายรับ/รายจ่าย", () => {
  const october = { start: "2026-10-01", end: "2026-10-31" };
  const withoutTransfers = tx.filter((t) => t.type !== "transfer");

  it("สรุปรอบ / เทียบงบ / จังหวะการใช้เงิน / ยอดต่อวัน ไม่เปลี่ยนเมื่อมีการโอน", () => {
    const a = summarizeCycle(tx, october);
    const b = summarizeCycle(withoutTransfers, october);
    expect({ ...a, count: 0 }).toEqual({ ...b, count: 0 });
    expect(a.expense).toBe(8750); // 8,000 + 700 + 50 — ไม่มี 500/1,000 ที่เป็นการโอน
    expect(compareWithBudget(plan, tx, october)).toEqual(compareWithBudget(plan, withoutTransfers, october));
    expect(budgetPace(plan, tx, october, "2026-10-28")).toEqual(budgetPace(plan, withoutTransfers, october, "2026-10-28"));
    expect(groupByDay(tx).find((d) => d.date === "2026-10-28")).toMatchObject({ income: 0, expense: 0 });
  });

  it("เป้าหมายไม่นับการโอน", () => {
    const goal = { id: "g", name: "ออม", category: "investment" as const, target: { kind: "fixed" as const, amount: 1000 }, startingAmount: 0 };
    const sneaky = { ...tx[5], goalId: "g" }; // ข้อมูลเสีย (validate จะไม่ให้ผ่าน) ก็ยังไม่ถูกนับ
    expect(goalProgress(goal, { ...plan, goals: [goal] }, [sneaky], "2026-10-31").current).toBe(0);
  });

  it("ค้นหาด้วยชื่อกระเป๋า → เจอทั้งรับ/จ่ายและการโอนของกระเป๋านั้น / กรองประเภท 'โอน'", () => {
    expect(searchTransactions(plan, tx, { text: "kbank" }).map((t) => t.id)).toEqual(["t08", "t06", "t04", "t03"]);
    expect(searchTransactions(plan, tx, { type: "transfer" }).map((t) => t.id)).toEqual(["t08", "t06"]);
  });
});

describe("R27–R28 รอบบิลบัตรเครดิต (ตัดรอบ 25 ครบกำหนด 10)", () => {
  it("6 พ.ย.: บิลรอบ 26 ก.ย.–25 ต.ค. = 2,500 − 300 = 2,200, จ่ายแล้ว 1,000, ต้องจ่ายอีก 1,200 ครบกำหนด 10 พ.ย. (อีก 4 วัน)", () => {
    expect(creditStatement(card, tx, "2026-11-06")).toEqual({
      periodStart: "2026-09-26",
      closeDate: "2026-10-25",
      dueDate: "2026-11-10",
      amount: 2200,
      paid: 1000,
      remaining: 1200,
      daysToDue: 4,
      status: "ok",
      nextCloseDate: "2026-11-25",
      unbilled: 700, // t07 รูดหลังตัดรอบ (การจ่ายบัตร t08 ไม่นับ)
    });
  });

  it("เหลือ ≤ 3 วัน → soon / เลยกำหนด → overdue / จ่ายครบ → paid", () => {
    expect(creditStatement(card, tx, "2026-11-07")?.status).toBe("soon");
    expect(creditStatement(card, tx, "2026-11-11")).toMatchObject({ status: "overdue", daysToDue: -1 });
    const payRest: Transaction = { id: "t12", date: "2026-11-01", type: "transfer", amount: 1200, walletId: "w-bank", toWalletId: "w-card" };
    expect(creditStatement(card, [...tx, payRest], "2026-11-07")).toMatchObject({ remaining: 0, status: "paid" });
  });

  it("วันตัดรอบเป็นวันนี้ → นับรวมรอบนี้ (ปิดรอบวันนี้) / ก่อนวันตัดรอบ → ใช้รอบเดือนก่อน", () => {
    expect(creditStatement(card, tx, "2026-10-25")).toMatchObject({ closeDate: "2026-10-25", amount: 2200 });
    expect(creditStatement(card, tx, "2026-10-24")).toMatchObject({ closeDate: "2026-09-25", periodStart: "2026-08-26", amount: 1000 });
  });

  it("ตัดรอบ 31 ในเดือนสั้น (R14) / ครบกำหนดหลังวันตัดในเดือนเดียวกัน", () => {
    const card31: Wallet = { ...card, statementDay: 31, dueDay: 28 };
    expect(creditStatement(card31, [], "2027-03-05")).toMatchObject({ periodStart: "2027-02-01", closeDate: "2027-02-28", dueDate: "2027-03-28" });
    const early: Wallet = { ...card, statementDay: 5, dueDay: 20 };
    expect(creditStatement(early, [], "2026-10-07")).toMatchObject({ closeDate: "2026-10-05", dueDate: "2026-10-20" });
  });

  it("บิลที่ปิดล่าสุดไม่มียอดที่จดไว้ (เพิ่งเริ่มจด) → status none ไม่ใช่ 'จ่ายครบ'", () => {
    // มีแค่ t07 (26 ต.ค. — หลังตัดรอบ 25 ต.ค.) → บิลที่ปิดแล้วว่าง, ยอดอยู่ในรอบปัจจุบัน
    expect(creditStatement(card, [tx[6]], "2026-10-30")).toMatchObject({ amount: 0, status: "none", unbilled: 700, nextCloseDate: "2026-11-25" });
    // ตัดรอบ 25 พ.ย. แล้ว → t07 อยู่ในบิล
    expect(creditStatement(card, [tx[6]], "2026-11-26")).toMatchObject({ amount: 700, status: "ok", unbilled: 0, dueDate: "2026-12-10" });
  });

  it("ไม่ใช่บัตร หรือไม่ได้ตั้งวันตัดรอบ → null", () => {
    expect(creditStatement(bank, tx, "2026-11-06")).toBeNull();
    expect(creditStatement({ ...card, statementDay: undefined, dueDay: undefined }, tx, "2026-11-06")).toBeNull();
  });

  it("dueAlerts: เฉพาะบัตรที่ soon/overdue และไม่ได้ซ่อน", () => {
    expect(dueAlerts(plan, tx, "2026-11-06")).toEqual([]);
    expect(dueAlerts(plan, tx, "2026-11-08").map((a) => a.wallet.id)).toEqual(["w-card"]);
    expect(dueAlerts({ ...plan, wallets: [bank, { ...card, archived: true }] }, tx, "2026-11-08")).toEqual([]);
  });
});

describe("R29 + ค่าเริ่มต้น", () => {
  it("validateTransaction: โอนต้องมีต้นทาง/ปลายทางคนละใบ และไม่ผูกหมวด", () => {
    const base = { date: "2026-10-01", type: "transfer" as const, amount: 100 };
    expect(validateTransaction({ ...base, walletId: "a", toWalletId: "b" })).toEqual([]);
    expect(validateTransaction(base).map((e) => e.field)).toEqual(["walletId", "toWalletId"]);
    expect(validateTransaction({ ...base, walletId: "a", toWalletId: "a" })[0].message).toBe("ต้นทางกับปลายทางต้องเป็นคนละกระเป๋า");
    expect(validateTransaction({ ...base, walletId: "a", toWalletId: "b", category: "wants" })[0].field).toBe("type");
    expect(validateTransaction({ date: "2026-10-01", type: "expense", amount: 1, category: "wants", toWalletId: "b" })[0].field).toBe("toWalletId");
  });

  it("validateWallet", () => {
    expect(validateWallet({ name: "เงินสด", kind: "cash", openingBalance: 0 })).toEqual([]);
    expect(validateWallet({ name: " ", kind: "cash", openingBalance: -1 }).map((e) => e.field)).toEqual(["name", "openingBalance"]);
    expect(validateWallet({ name: "บัตร", kind: "credit", openingBalance: 0, statementDay: 25 }).map((e) => e.field)).toEqual(["dueDay"]);
    expect(validateWallet({ name: "บัตร", kind: "credit", openingBalance: 0, statementDay: 32, dueDay: 10, creditLimit: 0 }).map((e) => e.field)).toEqual([
      "creditLimit",
      "statementDay",
    ]);
  });

  it("walletUsage / lastUsedWalletId (ข้ามกระเป๋าที่ซ่อน และไม่ดูการโอน)", () => {
    expect(walletUsage(tx, "w-cash")).toBe(1);
    expect(lastUsedWalletId(plan, tx)).toBe("w-card"); // t07 วันที่ล่าสุดที่เป็นรับ/จ่าย
    expect(lastUsedWalletId({ ...plan, wallets: [bank, cash, { ...card, archived: true }] }, tx)).toBe("w-bank"); // บัตรซ่อน → t04 (บัญชี) คือรายการล่าสุดที่ใช้กระเป๋าที่ยังไม่ซ่อน
    expect(lastUsedWalletId(plan, [])).toBe("w-bank"); // ยังไม่เคยใช้ → ใบแรก
    expect(lastUsedWalletId({ ...plan, wallets: [] }, tx)).toBeUndefined();
  });
});
