import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { UseCaseContext } from "@/application/context";
import type { Transaction } from "@/domain/entities/Transaction";
import { InMemoryActivePlanStore } from "@/infrastructure/storage/LocalStorageActivePlanStore";
import { InMemoryPlanRepository } from "@/infrastructure/storage/InMemoryPlanRepository";
import { InMemoryTransactionRepository } from "@/infrastructure/storage/InMemoryTransactionRepository";
import { KarngeinApp } from "@/presentation/components/KarngeinApp";
import { goldenPlan3 } from "../../domain/__tests__/goldenData";
import { openPlanTab } from "./openPlanTab";

function contextAt(iso: string): UseCaseContext {
  let n = 0;
  return { generateId: () => `tx-${++n}`, now: () => new Date(iso) };
}

async function open(history: Transaction[] = []) {
  const repository = new InMemoryPlanRepository();
  const transactions = new InMemoryTransactionRepository();
  await repository.save({ ...goldenPlan3, goals: [] });
  for (const t of history) await transactions.save(goldenPlan3.id, t);
  const user = userEvent.setup();
  render(
    <KarngeinApp
      auth={null}
      repository={repository}
      transactionRepository={transactions}
      activePlanStore={new InMemoryActivePlanStore()}
      ctx={contextAt("2026-10-05T12:00:00.000Z")}
    />,
  );
  await openPlanTab();
  return { user, transactions };
}

const card = (name: string) => screen.getByRole("status", { name });

beforeEach(() => vi.spyOn(window, "confirm").mockReturnValue(true));
afterEach(() => vi.restoreAllMocks());

describe("CP-12.1: ปุ่ม + ลงรายการเร็ว (ใช้ได้ทุกแท็บ)", () => {
  it("จากแท็บวางแผน: กด + → แป้นตัวเลขคิดเลข 120+35 → บันทึก → หน้าต่างปิด → รายการอยู่ในแท็บรายการ", async () => {
    const { user, transactions } = await open();
    await user.click(screen.getByRole("button", { name: "ลงรายการเร็ว" }));
    const dialog = screen.getByRole("dialog", { name: "ลงรายการเร็ว" });
    const keypad = within(dialog).getByRole("group", { name: "แป้นตัวเลข" });
    for (const key of ["1", "2", "0", "+", "3", "5"]) await user.click(within(keypad).getByRole("button", { name: key }));
    expect(within(dialog).getByLabelText("จำนวนเงินรายการ")).toHaveValue("120+35");
    expect(within(dialog).getByText("฿155.00")).toBeInTheDocument(); // แสดงผลคิดเลขทันที
    await user.type(within(dialog).getByLabelText("ร้าน / ผู้รับ"), "ร้านข้าวมันไก่");
    await user.click(within(dialog).getByRole("button", { name: "บันทึกรายการ" }));

    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(await transactions.list(goldenPlan3.id)).toMatchObject([{ amount: 155, merchant: "ร้านข้าวมันไก่", date: "2026-10-05" }]);

    await user.click(screen.getByRole("tab", { name: "รายการ" }));
    expect(card("จ่ายจริง")).toHaveTextContent("฿155.00"); // ข้อมูลชุดเดียวกัน ไม่ต้องรีโหลด
    expect(screen.getByRole("button", { name: "แก้ไข ร้านข้าวมันไก่" })).toBeInTheDocument();
  });

  it("แป้นตัวเลข: กดเครื่องหมายซ้อน → แทนตัวเดิม, ⌫ ลบ, ล้าง", async () => {
    const { user } = await open();
    await user.click(screen.getByRole("button", { name: "ลงรายการเร็ว" }));
    const dialog = screen.getByRole("dialog");
    const keypad = within(dialog).getByRole("group", { name: "แป้นตัวเลข" });
    const amount = within(dialog).getByLabelText("จำนวนเงินรายการ");
    for (const key of ["5", "0", "+", "×", "2"]) await user.click(within(keypad).getByRole("button", { name: key }));
    expect(amount).toHaveValue("50×2");
    await user.click(within(keypad).getByRole("button", { name: "ลบตัวสุดท้าย" }));
    expect(amount).toHaveValue("50×");
    await user.click(within(keypad).getByRole("button", { name: "ล้าง" }));
    expect(amount).toHaveValue("");
  });

  it("บรรทัดผลรวมจองที่ไว้ตั้งแต่แรก → แป้นไม่ขยับตอนผลรวมโผล่ (กันกดพลาดปุ่ม)", async () => {
    const { user } = await open();
    await user.click(screen.getByRole("button", { name: "ลงรายการเร็ว" }));
    const dialog = screen.getByRole("dialog");
    const sumLine = () => dialog.querySelector('p[aria-live="polite"]');
    expect(sumLine()).toBeInTheDocument(); // ยังไม่พิมพ์อะไร ก็มีบรรทัดว่างรออยู่
    expect(sumLine()).toHaveTextContent("");
    const keypad = within(dialog).getByRole("group", { name: "แป้นตัวเลข" });
    for (const key of ["1", "+", "2"]) await user.click(within(keypad).getByRole("button", { name: key }));
    expect(sumLine()).toHaveTextContent("= ฿3.00");
  });

  it("กด Esc หรือปุ่มปิด → ปิดหน้าต่างโดยไม่บันทึก", async () => {
    const { user, transactions } = await open();
    await user.click(screen.getByRole("button", { name: "ลงรายการเร็ว" }));
    await user.keyboard("{Escape}");
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "ลงรายการเร็ว" }));
    await user.click(screen.getByRole("button", { name: "ปิด" }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(await transactions.list(goldenPlan3.id)).toEqual([]);
  });

  it("พิมพ์สูตรในช่องจำนวนเงินได้เลย (ไม่ต้องใช้แป้น) / สูตรผิด → เตือน", async () => {
    const { user, transactions } = await open();
    await user.click(screen.getByRole("button", { name: "ลงรายการเร็ว" }));
    const form = screen.getByRole("form", { name: "ลงรายการเร็ว" });
    await user.type(within(form).getByLabelText("จำนวนเงินรายการ"), "120+");
    await user.click(within(form).getByRole("button", { name: "บันทึกรายการ" }));
    expect(within(form).getByRole("alert")).toHaveTextContent("สูตรยังไม่จบ");
    await user.type(within(form).getByLabelText("จำนวนเงินรายการ"), "35*2");
    await user.click(within(form).getByRole("button", { name: "บันทึกรายการ" }));
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect((await transactions.list(goldenPlan3.id))[0].amount).toBe(190);
  });
});

describe("CP-12.1: เดาหมวดจากที่เคยจด", () => {
  const history: Transaction[] = [
    { id: "h1", date: "2026-09-28", type: "expense", amount: 60, category: "essential", planGroupId: "grp-food", merchant: "ร้านข้าวมันไก่" },
    { id: "h2", date: "2026-09-29", type: "expense", amount: 2000, category: "wants", planGroupId: "grp-fun", merchant: "Starbucks", note: "กาแฟ #คาเฟ่" },
  ];

  it("พิมพ์ร้านที่เคยจด → เลือกกลุ่มให้เอง + บอกว่าเดาจากอะไร", async () => {
    const { user } = await open(history);
    await user.click(screen.getByRole("button", { name: "ลงรายการเร็ว" }));
    const form = screen.getByRole("form", { name: "ลงรายการเร็ว" });
    await user.type(within(form).getByLabelText("ร้าน / ผู้รับ"), "starbucks");
    expect(within(form).getByLabelText("ผูกกับกลุ่มในแผน")).toHaveValue("grp-fun");
    expect(within(form).getByText(/เดาจากร้านที่เคยจด/)).toBeInTheDocument();
  });

  it("ผู้ใช้เลือกกลุ่มเองแล้ว → พิมพ์ต่อก็ไม่เดาทับ", async () => {
    const { user } = await open(history);
    await user.click(screen.getByRole("button", { name: "ลงรายการเร็ว" }));
    const form = screen.getByRole("form", { name: "ลงรายการเร็ว" });
    await user.selectOptions(within(form).getByLabelText("ผูกกับกลุ่มในแผน"), "grp-emergency");
    await user.type(within(form).getByLabelText("ร้าน / ผู้รับ"), "ร้านข้าวมันไก่");
    expect(within(form).getByLabelText("ผูกกับกลุ่มในแผน")).toHaveValue("grp-emergency");
  });
});

describe("CP-12.1: ค้นหา / กรอง คร่อมทุกรอบ", () => {
  const history: Transaction[] = [
    { id: "a", date: "2026-08-10", type: "expense", amount: 80, category: "wants", merchant: "Starbucks", note: "#คาเฟ่" }, // รอบก่อน
    { id: "b", date: "2026-10-01", type: "expense", amount: 95, category: "wants", merchant: "Starbucks" },
    { id: "c", date: "2026-10-02", type: "expense", amount: 300, category: "essential", planGroupId: "grp-food", note: "กับข้าว" },
    { id: "d", date: "2026-09-25", type: "income", amount: 44100, planIncomeId: "inc-salary" },
  ];

  it("ค้นชื่อร้าน → เจอทั้งรอบนี้และรอบก่อน พร้อมยอดรวม / ล้างคำค้น → กลับมุมมองรอบ", async () => {
    const { user } = await open(history);
    await user.click(screen.getByRole("tab", { name: "รายการ" }));
    await user.type(await screen.findByLabelText("ค้นหารายการ"), "starbucks");
    expect(screen.getByRole("heading", { name: "ผลการค้นหา (2)" })).toBeInTheDocument();
    expect(screen.getByRole("status", { name: "ผลการค้นหา" })).toHaveTextContent("จ่าย ฿175.00");
    expect(screen.queryByRole("status", { name: "รอบที่แสดง" })).not.toBeInTheDocument();
    await user.clear(screen.getByLabelText("ค้นหารายการ"));
    expect(screen.getByRole("status", { name: "รอบที่แสดง" })).toBeInTheDocument();
  });

  it("ค้น #tag / จำนวนเงิน / กรองรายรับ", async () => {
    const { user } = await open(history);
    await user.click(screen.getByRole("tab", { name: "รายการ" }));
    const search = await screen.findByLabelText("ค้นหารายการ");
    await user.type(search, "#คาเฟ่");
    expect(screen.getByRole("heading", { name: "ผลการค้นหา (1)" })).toBeInTheDocument();
    await user.clear(search);
    await user.type(search, "300");
    expect(screen.getByRole("button", { name: "แก้ไข กับข้าว" })).toBeInTheDocument();
    await user.clear(search);
    await user.click(screen.getByRole("button", { name: "ตัวกรอง" })); // ตัวกรองพับไว้
    await user.selectOptions(screen.getByLabelText("กรองประเภท"), "income");
    expect(screen.getByRole("heading", { name: "ผลการค้นหา (1)" })).toBeInTheDocument();
  });

  it("พิมพ์ค้นหาตัวแรก (สลับเป็นมุมมองผลค้นหา) → โฟกัสยังอยู่ในช่องค้นหา พิมพ์ต่อได้", async () => {
    const { user } = await open(history);
    await user.click(screen.getByRole("tab", { name: "รายการ" }));
    const search = await screen.findByLabelText("ค้นหารายการ");
    await user.click(search);
    await user.keyboard("s");
    expect(screen.getByLabelText("ค้นหารายการ")).toBe(search); // ช่องเดิม ไม่ถูกสร้างใหม่
    expect(search).toHaveFocus();
    await user.keyboard("tarbucks");
    expect(search).toHaveValue("starbucks");
  });

  it("ค้นไม่เจอ → บอกว่าไม่พบ (ไม่ใช่ 'ยังไม่มีรายการในรอบนี้')", async () => {
    const { user } = await open(history);
    await user.click(screen.getByRole("tab", { name: "รายการ" }));
    await user.type(await screen.findByLabelText("ค้นหารายการ"), "ไม่มีร้านนี้แน่นอน");
    expect(screen.getByText(/ไม่พบรายการที่ตรงกับคำค้น/)).toBeInTheDocument();
    expect(screen.queryByText(/ยังไม่มีรายการในรอบนี้/)).not.toBeInTheDocument();
  });

  it("แก้ไขรายการจากผลการค้นหาได้", async () => {
    const { user, transactions } = await open(history);
    await user.click(screen.getByRole("tab", { name: "รายการ" }));
    await user.type(await screen.findByLabelText("ค้นหารายการ"), "กับข้าว");
    await user.click(screen.getByRole("button", { name: "แก้ไข กับข้าว" }));
    const form = screen.getByRole("form", { name: "แก้ไขรายการ" });
    const amount = within(form).getByLabelText("จำนวนเงินรายการ");
    await user.clear(amount);
    await user.type(amount, "350");
    fireEvent.submit(form);
    await waitFor(async () => expect((await transactions.list(goldenPlan3.id)).find((t) => t.id === "c")?.amount).toBe(350));
  });
});
