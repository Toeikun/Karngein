import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { UseCaseContext } from "@/application/context";
import type { Plan } from "@/domain/entities/Plan";
import type { Transaction } from "@/domain/entities/Transaction";
import { InMemoryActivePlanStore } from "@/infrastructure/storage/LocalStorageActivePlanStore";
import { InMemoryPlanRepository } from "@/infrastructure/storage/InMemoryPlanRepository";
import { InMemoryTransactionRepository } from "@/infrastructure/storage/InMemoryTransactionRepository";
import { KarngeinApp } from "@/presentation/components/KarngeinApp";
import { goldenPlan3 } from "../../domain/__tests__/goldenData";

/** รอบ = เดือนปฏิทิน · งบ: อาหาร 8,000 / เที่ยว 2,000 / ฉุกเฉิน ... (goldenPlan3) */
const plan: Plan = {
  ...goldenPlan3,
  goals: [],
  payCycleStartDay: 1,
  wallets: [
    { id: "w-bank", name: "KBank", kind: "bank", openingBalance: 20000 },
    { id: "w-card", name: "บัตร KTC", kind: "credit", openingBalance: 0, statementDay: 25, dueDay: 10 },
  ],
};

const history: Transaction[] = [
  { id: "s1", date: "2026-09-03", type: "expense", amount: 400, category: "essential", planGroupId: "grp-food", merchant: "ร้านข้าว" },
  { id: "o1", date: "2026-10-01", type: "income", amount: 44100, planIncomeId: "inc-salary", walletId: "w-bank" },
  { id: "o2", date: "2026-10-02", type: "expense", amount: 150, category: "essential", planGroupId: "grp-food", merchant: "ร้านข้าว" },
  { id: "o3", date: "2026-10-02", type: "expense", amount: 90, category: "essential", planGroupId: "grp-food", merchant: "ร้านข้าว" },
  { id: "o4", date: "2026-10-03", type: "expense", amount: 2600, category: "wants", planGroupId: "grp-fun", merchant: "Cinema", walletId: "w-card" },
];

async function open(today = "2026-10-05") {
  const repository = new InMemoryPlanRepository();
  const transactions = new InMemoryTransactionRepository();
  await repository.save(plan);
  for (const t of history) await transactions.save(plan.id, t);
  let n = 0;
  const ctx: UseCaseContext = { generateId: () => `id-${++n}`, now: () => new Date(`${today}T12:00:00.000Z`) };
  const user = userEvent.setup();
  render(<KarngeinApp auth={null} repository={repository} transactionRepository={transactions} activePlanStore={new InMemoryActivePlanStore()} ctx={ctx} />);
  await screen.findByRole("status", { name: "รอบที่แสดง" });
  return { user, transactions };
}

const section = (name: string) => screen.getByRole("region", { name });

beforeEach(() => vi.spyOn(window, "confirm").mockReturnValue(true));
afterEach(() => vi.restoreAllMocks());

describe("CP-12.3: แท็บสรุป", () => {
  it("ข้อสังเกตเทียบรอบก่อน / สัดส่วนหมวด / อันดับร้าน / งบ + Sankey ตามจริงอยู่หน้านี้", async () => {
    const { user } = await open();
    await user.click(screen.getByRole("tab", { name: "สรุป" }));
    expect(screen.getByRole("status", { name: "รอบที่สรุป" })).toHaveTextContent("1 ต.ค. – 31 ต.ค. 2026");

    // 5 วันแรก: ต.ค. 2,840 vs ก.ย. 400 → มากกว่า 610%
    expect(section("ข้อสังเกต")).toHaveTextContent("5 วันแรกของรอบนี้ใช้ไป ฿2,840.00 — มากกว่ารอบก่อน 610%");
    expect(section("ข้อสังเกต")).toHaveTextContent("หมวดที่เพิ่มขึ้นมากสุด: ฟุ่มเฟือย/ตามใจ");

    expect(screen.getByTestId("share-wants")).toHaveTextContent("฿2,600.00 · 91.5%");
    expect(screen.getByTestId("share-essential")).toHaveTextContent("฿240.00 · 8.5%");
    const ranks = within(section("จ่ายที่ไหนมากสุด")).getAllByRole("listitem").map((li) => li.textContent);
    expect(ranks).toEqual(["1Cinema1 ครั้ง฿2,600.00", "2ร้านข้าว2 ครั้ง฿240.00"]);

    expect(screen.getByRole("img", { name: "กราฟยอดใช้สะสมเทียบเส้นใช้สม่ำเสมอ" })).toBeInTheDocument();
    expect(screen.getByTestId("budget-grp-fun")).toHaveTextContent("เกินงบ");
    expect(screen.getByRole("heading", { name: "ผังการไหลของเงิน (ตามจริง)" })).toBeInTheDocument();
    // ย้ายมาแล้ว → ไม่อยู่ที่แท็บรายการ
    await user.click(screen.getByRole("tab", { name: "รายการ" }));
    expect(screen.queryByRole("heading", { name: "ผังการไหลของเงิน (ตามจริง)" })).not.toBeInTheDocument();
  });

  it("ปฏิทิน: แตะวัน → รายการของวันนั้น แตะซ้ำ → ปิด / วันในอนาคตกดไม่ได้", async () => {
    const { user } = await open();
    await user.click(screen.getByRole("tab", { name: "สรุป" }));
    const day2 = screen.getByRole("button", { name: "2 ต.ค. 2026 จ่าย ฿240.00" });
    expect(day2).toHaveTextContent("240");
    await user.click(day2);
    expect(screen.getByRole("heading", { name: "รายการวันที่ 2 ต.ค. 2026 (2)" })).toBeInTheDocument();
    await user.click(day2);
    expect(screen.queryByRole("heading", { name: /รายการวันที่/ })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "20 ต.ค. 2026 จ่าย ฿0.00" })).toBeDisabled();
  });

  it("เลื่อนไปรอบก่อน → ตัวเลขของรอบนั้น / รอบถัดจากปัจจุบันกดไม่ได้", async () => {
    const { user } = await open();
    await user.click(screen.getByRole("tab", { name: "สรุป" }));
    expect(screen.getByRole("button", { name: "รอบถัดไป" })).toBeDisabled();
    await user.click(screen.getByRole("button", { name: "รอบก่อนหน้า" }));
    expect(screen.getByRole("status", { name: "รอบที่สรุป" })).toHaveTextContent("1 ก.ย. – 30 ก.ย. 2026");
    expect(screen.getByTestId("share-essential")).toHaveTextContent("฿400.00 · 100.0%");
  });
});

describe("CP-12.3: กระดิ่งแจ้งเตือน", () => {
  it("รวมเรื่องที่ต้องดู: กลุ่มเกินงบ (+ เรียงตามความสำคัญ) / เปิด-ปิดด้วย Esc", async () => {
    const { user } = await open();
    const bell = await screen.findByRole("button", { name: /การแจ้งเตือน/ });
    expect(bell).toHaveAccessibleName("การแจ้งเตือน (1)");
    await user.click(bell);
    expect(screen.getByRole("region", { name: "รายการแจ้งเตือน" })).toHaveTextContent("สังสรรค์ ใช้เกินงบ");
    await user.keyboard("{Escape}");
    expect(screen.queryByRole("region", { name: "รายการแจ้งเตือน" })).not.toBeInTheDocument();
  });

  it("บัตรเลยกำหนด → อยู่บนสุด และกด 'จ่ายบัตร' → แผ่นโอนกรอกยอดให้ → บันทึก → หายจากกระดิ่ง", async () => {
    const { user } = await open("2026-11-12"); // o4 อยู่บิลปิด 25 ต.ค. ครบกำหนด 10 พ.ย. → เลยกำหนด
    await user.click(await screen.findByRole("button", { name: /การแจ้งเตือน/ }));
    const items = within(screen.getByRole("region", { name: "รายการแจ้งเตือน" })).getAllByRole("listitem");
    expect(items[0]).toHaveTextContent("บัตร KTC เลยกำหนดชำระ");
    await user.click(within(items[0]).getByRole("button", { name: "จ่ายบัตร" }));
    const sheet = screen.getByRole("dialog", { name: "ลงรายการเร็ว" });
    expect(within(sheet).getByLabelText("จำนวนเงินรายการ")).toHaveValue("2,600");
    expect(within(sheet).getByLabelText("โอนเข้ากระเป๋า")).toHaveValue("w-card");
    await user.click(within(sheet).getByRole("button", { name: "บันทึกรายการ" }));
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(screen.getByRole("button", { name: /การแจ้งเตือน/ })).toHaveAccessibleName("การแจ้งเตือน (0)");
  });
});
