import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
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

type User = ReturnType<typeof userEvent.setup>;

const withWallets: Plan = {
  ...goldenPlan3,
  goals: [],
  payCycleStartDay: 1,
  wallets: [
    { id: "w-bank", name: "KBank", kind: "bank", openingBalance: 20000 },
    { id: "w-cash", name: "เงินสด", kind: "cash", openingBalance: 0 },
    { id: "w-card", name: "บัตร KTC", kind: "credit", openingBalance: 0, creditLimit: 50000, statementDay: 25, dueDay: 10 },
  ],
};

async function open({ plan = { ...goldenPlan3, goals: [] } as Plan, history = [] as Transaction[], today = "2026-10-05" } = {}) {
  const repository = new InMemoryPlanRepository();
  const transactions = new InMemoryTransactionRepository();
  await repository.save(plan);
  for (const t of history) await transactions.save(plan.id, t);
  let n = 0;
  const ctx: UseCaseContext = { generateId: () => `id-${++n}`, now: () => new Date(`${today}T12:00:00.000Z`) };
  const user = userEvent.setup();
  render(
    <KarngeinApp auth={null} repository={repository} transactionRepository={transactions} activePlanStore={new InMemoryActivePlanStore()} ctx={ctx} />,
  );
  await screen.findByRole("status", { name: "รอบที่แสดง" });
  return { user, repository, transactions };
}

const status = (name: string) => screen.getByRole("status", { name });
const walletCard = (name: string) => screen.getByRole("article", { name: `กระเป๋า ${name}` });

/** เปิดแผ่น + กรอก แล้วบันทึก (แผ่นปิดเอง) */
async function quickAdd(user: User, fill: (sheet: HTMLElement) => Promise<void>) {
  await user.click(screen.getByRole("button", { name: "ลงรายการเร็ว" }));
  const sheet = screen.getByRole("dialog", { name: "ลงรายการเร็ว" });
  await fill(sheet);
  await user.click(within(sheet).getByRole("button", { name: "บันทึกรายการ" }));
  await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
}

beforeEach(() => vi.spyOn(window, "confirm").mockReturnValue(true));
afterEach(() => vi.restoreAllMocks());

describe("CP-12.2: แท็บกระเป๋า", () => {
  it("ยังไม่มีกระเป๋า → คำแนะนำ / เพิ่มบัญชี + บัตรเครดิต → การ์ดและเงินที่มีอยู่สุทธิ / ข้อมูลผิด → เตือน", async () => {
    const { user, repository } = await open();
    expect(screen.queryByRole("combobox", { name: "กระเป๋าเงิน" })).not.toBeInTheDocument(); // ไม่มีกระเป๋า → ฟอร์มเหมือนเดิม
    await user.click(screen.getByRole("tab", { name: "กระเป๋า" }));
    expect(screen.getByText(/ยังไม่มีกระเป๋า/)).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "+ เพิ่มกระเป๋า" }));
    let form = screen.getByRole("form", { name: "เพิ่มกระเป๋า" });
    await user.click(within(form).getByRole("button", { name: "บันทึกกระเป๋า" }));
    expect(within(form).getByRole("alert")).toHaveTextContent("กรุณาตั้งชื่อกระเป๋า");
    await user.type(within(form).getByLabelText("ชื่อกระเป๋า"), "KBank");
    await user.clear(within(form).getByLabelText("เงินที่มีตอนเริ่มจด"));
    await user.type(within(form).getByLabelText("เงินที่มีตอนเริ่มจด"), "20,000");
    await user.click(within(form).getByRole("button", { name: "บันทึกกระเป๋า" }));

    await user.click(screen.getByRole("button", { name: "+ เพิ่มกระเป๋า" }));
    form = screen.getByRole("form", { name: "เพิ่มกระเป๋า" });
    await user.click(within(form).getByRole("button", { name: /บัตรเครดิต/ }));
    await user.type(within(form).getByLabelText("ชื่อกระเป๋า"), "บัตร KTC");
    await user.clear(within(form).getByLabelText("ยอดค้างตอนเริ่มจด"));
    await user.type(within(form).getByLabelText("ยอดค้างตอนเริ่มจด"), "1500");
    await user.type(within(form).getByLabelText("วงเงินบัตร"), "50000");
    await user.selectOptions(within(form).getByLabelText("วันตัดรอบบัตร"), "25");
    await user.selectOptions(within(form).getByLabelText("วันครบกำหนดชำระ"), "10");
    await user.click(within(form).getByRole("button", { name: "บันทึกกระเป๋า" }));

    expect(within(walletCard("KBank")).getByRole("status", { name: "ยอด KBank" })).toHaveTextContent("฿20,000.00");
    expect(within(walletCard("บัตร KTC")).getByText(/วงเงินคงเหลือ/)).toHaveTextContent("฿48,500.00");
    expect(status("เงินที่มีอยู่สุทธิ")).toHaveTextContent("฿18,500.00");
    expect(status("ยอดค้างบัตร")).toHaveTextContent("฿1,500.00");
    await waitFor(async () => expect((await repository.get(goldenPlan3.id))?.wallets).toHaveLength(2), { timeout: 2500 });
  });

  it("ลงรายจ่ายด้วยบัตร + รับเงินเดือนเข้าบัญชี + โอนบัญชี → เงินสด: ยอดแต่ละใบถูก, การโอนไม่นับเป็นรับ/จ่าย", async () => {
    const { user, transactions } = await open({ plan: withWallets });

    await quickAdd(user, async (sheet) => {
      expect(within(sheet).getByLabelText("กระเป๋าเงิน")).toHaveValue("w-bank"); // ยังไม่เคยใช้ → ใบแรก
      await user.type(within(sheet).getByLabelText("จำนวนเงินรายการ"), "2500");
      await user.selectOptions(within(sheet).getByLabelText("กระเป๋าเงิน"), "w-card");
      await user.type(within(sheet).getByLabelText("ร้าน / ผู้รับ"), "Lazada");
    });
    await quickAdd(user, async (sheet) => {
      expect(within(sheet).getByLabelText("กระเป๋าเงิน")).toHaveValue("w-card"); // จำกระเป๋าที่ใช้ล่าสุด
      await user.click(within(sheet).getByRole("button", { name: "รายรับ" }));
      await user.type(within(sheet).getByLabelText("จำนวนเงินรายการ"), "30000");
      await user.selectOptions(within(sheet).getByLabelText("กระเป๋าเงิน"), "w-bank");
    });
    await quickAdd(user, async (sheet) => {
      await user.click(within(sheet).getByRole("button", { name: "โอน" }));
      expect(within(sheet).queryByLabelText("ร้าน / ผู้รับ")).not.toBeInTheDocument();
      expect(within(sheet).queryByLabelText("ผูกกับกลุ่มในแผน")).not.toBeInTheDocument();
      await user.type(within(sheet).getByLabelText("จำนวนเงินรายการ"), "500");
      await user.selectOptions(within(sheet).getByLabelText("โอนจากกระเป๋า"), "w-bank");
      await user.selectOptions(within(sheet).getByLabelText("โอนเข้ากระเป๋า"), "w-cash");
    });

    // แท็บรายการ: การโอนไม่อยู่ในยอดรับ/จ่าย และแสดงเป็น "โอน KBank → เงินสด" ไม่มี +/−
    expect(status("จ่ายจริง")).toHaveTextContent("฿2,500.00");
    expect(status("รับจริง")).toHaveTextContent("฿30,000.00");
    const row = screen.getByRole("button", { name: "แก้ไข โอน KBank → เงินสด" });
    expect(row).toHaveTextContent("฿500.00");
    expect(row).not.toHaveTextContent("−");
    expect(screen.getByRole("button", { name: "แก้ไข Lazada" })).toHaveTextContent("บัตร KTC");

    await user.click(screen.getByRole("tab", { name: "กระเป๋า" }));
    expect(within(walletCard("KBank")).getByRole("status", { name: "ยอด KBank" })).toHaveTextContent("฿49,500.00"); // 20,000 + 30,000 − 500
    expect(within(walletCard("เงินสด")).getByRole("status", { name: "ยอด เงินสด" })).toHaveTextContent("฿500.00");
    expect(within(walletCard("บัตร KTC")).getByRole("status", { name: "ยอด บัตร KTC" })).toHaveTextContent("฿2,500.00");
    expect(status("เงินที่มีอยู่สุทธิ")).toHaveTextContent("฿47,500.00");
    expect((await transactions.list(goldenPlan3.id)).find((t) => t.type === "transfer")).toEqual({
      id: "id-3",
      date: "2026-10-05",
      type: "transfer",
      amount: 500,
      walletId: "w-bank",
      toWalletId: "w-cash",
    });
  });

  it("โอนเข้ากระเป๋าเดียวกัน → เตือน ไม่บันทึก", async () => {
    const { user, transactions } = await open({ plan: withWallets });
    await user.click(screen.getByRole("button", { name: "ลงรายการเร็ว" }));
    const sheet = screen.getByRole("dialog");
    await user.click(within(sheet).getByRole("button", { name: "โอน" }));
    await user.type(within(sheet).getByLabelText("จำนวนเงินรายการ"), "100");
    await user.selectOptions(within(sheet).getByLabelText("โอนจากกระเป๋า"), "w-bank");
    await user.selectOptions(within(sheet).getByLabelText("โอนเข้ากระเป๋า"), "w-bank");
    await user.click(within(sheet).getByRole("button", { name: "บันทึกรายการ" }));
    expect(await within(sheet).findByRole("alert")).toHaveTextContent("ต้นทางกับปลายทางต้องเป็นคนละกระเป๋า");
    expect(await transactions.list(goldenPlan3.id)).toEqual([]);
  });

  it("บัตรใกล้ครบกำหนด → การ์ดเตือนบนแท็บรายการ → กด 'จ่ายบัตร' = แผ่นโอนกรอกให้แล้ว → บันทึก → เตือนหาย ยอดค้างลด", async () => {
    const history: Transaction[] = [{ id: "h1", date: "2026-10-01", type: "expense", amount: 3200, category: "wants", walletId: "w-card" }];
    const { user } = await open({ plan: withWallets, history, today: "2026-11-08" }); // บิลปิด 25 ต.ค. ครบกำหนด 10 พ.ย.

    const alert = screen.getByRole("alert");
    expect(alert).toHaveTextContent("บัตร KTC ต้องจ่าย ฿3,200.00 ภายใน 10 พ.ย. 2026 (อีก 2 วัน)");
    await user.click(within(alert).getByRole("button", { name: "จ่ายบัตร บัตร KTC" }));
    const sheet = screen.getByRole("dialog", { name: "ลงรายการเร็ว" });
    expect(within(sheet).getByRole("button", { name: "โอน" })).toHaveAttribute("aria-pressed", "true");
    expect(within(sheet).getByLabelText("จำนวนเงินรายการ")).toHaveValue("3,200");
    expect(within(sheet).getByLabelText("โอนจากกระเป๋า")).toHaveValue("w-bank");
    expect(within(sheet).getByLabelText("โอนเข้ากระเป๋า")).toHaveValue("w-card");
    await user.click(within(sheet).getByRole("button", { name: "บันทึกรายการ" }));

    await waitFor(() => expect(screen.queryByRole("alert")).not.toBeInTheDocument());
    await user.click(screen.getByRole("tab", { name: "กระเป๋า" }));
    expect(within(walletCard("บัตร KTC")).getByRole("status", { name: "ยอด บัตร KTC" })).toHaveTextContent("฿0.00");
    expect(screen.getByTestId("statement-w-card")).toHaveTextContent("จ่ายครบแล้ว ✓");
  });

  it("ลบกระเป๋าที่มีรายการ → ลบไม่ได้ แนะนำให้ซ่อน / ซ่อน → ย้ายไปส่วนที่ซ่อน และไม่อยู่ในตัวเลือกตอนลงรายการ", async () => {
    const history: Transaction[] = [{ id: "h1", date: "2026-10-01", type: "expense", amount: 50, category: "wants", walletId: "w-cash" }];
    const { user } = await open({ plan: withWallets, history });
    await user.click(screen.getByRole("tab", { name: "กระเป๋า" }));

    await user.click(screen.getByRole("button", { name: "ลบกระเป๋า เงินสด" }));
    expect(screen.getByRole("alert")).toHaveTextContent("มี 1 รายการใช้กระเป๋านี้ — ลบไม่ได้");

    await user.click(screen.getByRole("button", { name: "ซ่อนกระเป๋า เงินสด" }));
    expect(screen.getByText("กระเป๋าที่ซ่อน (1)")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "เลิกซ่อนกระเป๋า เงินสด" })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "ลงรายการเร็ว" }));
    const options = within(within(screen.getByRole("dialog")).getByLabelText("กระเป๋าเงิน")).getAllByRole("option").map((o) => o.textContent);
    expect(options.some((o) => o?.includes("เงินสด"))).toBe(false);
    await user.keyboard("{Escape}");

    // กระเป๋าที่ไม่มีรายการ → ลบได้
    await user.click(screen.getByRole("button", { name: "ลบกระเป๋า บัตร KTC" }));
    expect(screen.queryByRole("article", { name: "กระเป๋า บัตร KTC" })).not.toBeInTheDocument();
  });

  it("แก้ไขรายการเก่า (ไม่มีกระเป๋า) → เลือกกระเป๋าได้ / ค้นหาด้วยชื่อกระเป๋า + กรอง 'โอน'", async () => {
    const history: Transaction[] = [
      { id: "h1", date: "2026-10-02", type: "expense", amount: 80, category: "wants", note: "กาแฟ" },
      { id: "h2", date: "2026-10-03", type: "transfer", amount: 1000, walletId: "w-bank", toWalletId: "w-cash" },
    ];
    const { user, transactions } = await open({ plan: withWallets, history });
    await user.click(screen.getByRole("button", { name: "แก้ไข กาแฟ" }));
    const sheet = screen.getByRole("dialog", { name: "แก้ไขรายการ" });
    expect(within(sheet).getByLabelText("กระเป๋าเงิน")).toHaveValue(""); // ของเก่าไม่เดาให้
    await user.selectOptions(within(sheet).getByLabelText("กระเป๋าเงิน"), "w-cash");
    await user.click(within(sheet).getByRole("button", { name: "บันทึกการแก้ไข" }));
    await waitFor(async () => expect((await transactions.list(goldenPlan3.id)).find((t) => t.id === "h1")?.walletId).toBe("w-cash"));

    await user.type(screen.getByLabelText("ค้นหารายการ"), "เงินสด");
    expect(screen.getByRole("heading", { name: "ผลการค้นหา (2)" })).toBeInTheDocument();
    await user.clear(screen.getByLabelText("ค้นหารายการ"));
    await user.click(screen.getByRole("button", { name: "ตัวกรอง" }));
    fireEvent.change(screen.getByLabelText("กรองประเภท"), { target: { value: "transfer" } });
    expect(screen.getByRole("heading", { name: "ผลการค้นหา (1)" })).toBeInTheDocument();
  });
});
