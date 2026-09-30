import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { UseCaseContext } from "@/application/context";
import type { Plan } from "@/domain/entities/Plan";
import { InMemoryActivePlanStore } from "@/infrastructure/storage/LocalStorageActivePlanStore";
import { InMemoryPlanRepository } from "@/infrastructure/storage/InMemoryPlanRepository";
import { InMemoryTransactionRepository } from "@/infrastructure/storage/InMemoryTransactionRepository";
import { KarngeinApp } from "@/presentation/components/KarngeinApp";
import { goldenPlan3 } from "../../domain/__tests__/goldenData";

/** "วันนี้" = 5 ต.ค. 2026 (อยู่ในรอบ 25 ก.ย. – 24 ต.ค.) */
function contextAt(iso: string): UseCaseContext {
  let n = 0;
  return { generateId: () => `tx-${++n}`, now: () => new Date(iso) };
}

async function openActual(plan: Plan = { ...goldenPlan3, goals: [] }) {
  const repository = new InMemoryPlanRepository();
  const transactions = new InMemoryTransactionRepository();
  await repository.save(plan);
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
  await screen.findByRole("heading", { name: "แหล่งรายได้" });
  await user.click(screen.getByRole("tab", { name: "บันทึกจริง" }));
  await screen.findByRole("heading", { name: "ลงรายการ" });
  return { user, repository, transactions };
}

const card = (name: string) => screen.getByRole("status", { name });
const cycleShown = () => screen.getByRole("status", { name: "รอบที่แสดง" });

async function record(
  user: ReturnType<typeof userEvent.setup>,
  { type = "expense", amount, date, group, income, note }: { type?: "expense" | "income"; amount: string; date: string; group?: string; income?: string; note?: string },
) {
  const form = screen.getByRole("form", { name: "ลงรายการใหม่" });
  await user.click(within(form).getByRole("button", { name: type === "income" ? "รายรับ" : "รายจ่าย" }));
  await user.clear(within(form).getByLabelText("จำนวนเงินรายการ"));
  await user.type(within(form).getByLabelText("จำนวนเงินรายการ"), amount);
  // jsdom พิมพ์ลง <input type="date"> ไม่ได้ → ตั้งค่าแบบเดียวกับที่ date picker ของเบราว์เซอร์ทำ
  fireEvent.change(within(form).getByLabelText("วันที่รายการ"), { target: { value: date } });
  if (group) await user.selectOptions(within(form).getByLabelText("ผูกกับกลุ่มในแผน"), group);
  if (income) await user.selectOptions(within(form).getByLabelText("ผูกกับรายได้ในแผน"), income);
  if (note) await user.type(within(form).getByLabelText("โน้ต"), note);
  await user.click(within(form).getByRole("button", { name: "บันทึกรายการ" }));
  await within(form).findByText("บันทึกแล้ว ✓");
}

beforeEach(() => vi.spyOn(window, "confirm").mockReturnValue(true));
afterEach(() => vi.restoreAllMocks());

describe("CP-11.3: หน้า บันทึกจริง — สถานการณ์เงินเดือนออกวันที่ 25", () => {
  it("เปิดมาที่รอบปัจจุบัน 25 ก.ย. – 24 ต.ค. 2026 และเหลืออีก 20 วัน", async () => {
    await openActual();
    expect(cycleShown()).toHaveTextContent("25 ก.ย. – 24 ต.ค. 2026");
    expect(screen.getByText("รอบปัจจุบัน")).toBeInTheDocument();
    expect(card("เหลืออีก")).toHaveTextContent("20 วัน");
    expect(screen.getByText(/ยังไม่มีรายการในรอบนี้/)).toBeInTheDocument();
  });

  it("ลงเงินเดือน 25 ก.ย. + รายจ่ายหลายวัน + เงินเดือน 25 ต.ค. → แต่ละรอบถูกต้อง", async () => {
    const { user, transactions } = await openActual();
    await record(user, { type: "income", amount: "44100", date: "2026-09-25", income: "inc-salary" });
    await record(user, { amount: "250", date: "2026-09-26", group: "grp-food", note: "ข้าวกลางวัน" });
    await record(user, { amount: "2500", date: "2026-10-10", group: "grp-fun" });
    await record(user, { amount: "300", date: "2026-10-24", group: "grp-food" });
    await record(user, { type: "income", amount: "44100", date: "2026-10-25", income: "inc-salary" });

    // รอบปัจจุบัน 25 ก.ย. – 24 ต.ค.
    expect(card("รับจริง")).toHaveTextContent("฿44,100.00");
    expect(card("จ่ายจริง")).toHaveTextContent("฿3,050.00");
    expect(card("คงเหลือรอบนี้")).toHaveTextContent("฿41,050.00");
    expect(screen.getByRole("heading", { name: "รายการในรอบนี้ (4)" })).toBeInTheDocument();
    expect(screen.getByTestId("budget-grp-food")).toHaveTextContent("฿550.00 / ฿8,000.00 (6.9%)");
    expect(screen.getByTestId("budget-grp-fun")).toHaveTextContent("฿2,500.00 / ฿2,000.00 (125.0%) เกินงบ");

    // รอบถัดไป: มีแค่เงินเดือน 25 ต.ค.
    await user.click(screen.getByRole("button", { name: "รอบถัดไป" }));
    expect(cycleShown()).toHaveTextContent("25 ต.ค. – 24 พ.ย. 2026");
    expect(card("รับจริง")).toHaveTextContent("฿44,100.00");
    expect(card("จ่ายจริง")).toHaveTextContent("฿0.00");
    expect(screen.queryByRole("status", { name: "เหลืออีก" })).not.toBeInTheDocument();

    // กลับรอบปัจจุบัน
    await user.click(screen.getByRole("button", { name: "กลับรอบปัจจุบัน" }));
    expect(cycleShown()).toHaveTextContent("25 ก.ย. – 24 ต.ค. 2026");

    // บันทึกลง repository จริง
    expect(await transactions.list(goldenPlan3.id)).toHaveLength(5);
  });

  it("เปลี่ยนวันเริ่มรอบเป็น 1 → รอบ = ต.ค. ทั้งเดือน (ตัวเลขคำนวณใหม่)", async () => {
    const { user, repository } = await openActual();
    await record(user, { type: "income", amount: "44100", date: "2026-09-25" });
    await record(user, { amount: "300", date: "2026-10-24", group: "grp-food" });
    await user.selectOptions(screen.getByLabelText("รอบเงินเดือนเริ่มวันที่"), "1");
    expect(cycleShown()).toHaveTextContent("1 ต.ค. – 31 ต.ค. 2026");
    expect(card("รับจริง")).toHaveTextContent("฿0.00"); // เงินเดือน 25 ก.ย. อยู่รอบ ก.ย. แล้ว
    expect(card("จ่ายจริง")).toHaveTextContent("฿300.00");
    await waitFor(async () => expect((await repository.get(goldenPlan3.id))?.payCycleStartDay).toBe(1), { timeout: 2500 });
  });

  it("จำนวนเงินว่าง/ผิด → เตือน ไม่บันทึก", async () => {
    const { user, transactions } = await openActual();
    const form = screen.getByRole("form", { name: "ลงรายการใหม่" });
    await user.click(within(form).getByRole("button", { name: "บันทึกรายการ" }));
    expect(within(form).getByRole("alert")).toHaveTextContent("กรุณาใส่จำนวนเงิน");
    await user.type(within(form).getByLabelText("จำนวนเงินรายการ"), "-50");
    await user.click(within(form).getByRole("button", { name: "บันทึกรายการ" }));
    expect(within(form).getByRole("alert")).toHaveTextContent("ใส่ได้เฉพาะตัวเลข");
    expect(await transactions.list(goldenPlan3.id)).toEqual([]);
  });

  it("รายจ่ายไม่ผูกกลุ่ม → เลือกหมวดเอง และนับเป็น 'ไม่ได้ผูกกับกลุ่ม'", async () => {
    const { user } = await openActual();
    const form = screen.getByRole("form", { name: "ลงรายการใหม่" });
    await user.type(within(form).getByLabelText("จำนวนเงินรายการ"), "120");
    await user.selectOptions(within(form).getByLabelText("หมวดรายการ"), "wants");
    await user.click(within(form).getByRole("button", { name: "บันทึกรายการ" }));
    await within(form).findByText("บันทึกแล้ว ✓");
    expect(screen.getByText(/รายจ่ายที่ไม่ได้ผูกกับกลุ่ม/)).toHaveTextContent("฿120.00");
  });

  it("แก้ไขรายการ (กดที่รายการ) และลบรายการ (ยืนยัน)", async () => {
    const { user, transactions } = await openActual();
    await record(user, { amount: "250", date: "2026-10-01", group: "grp-food", note: "ข้าว" });

    await user.click(screen.getByRole("button", { name: "แก้ไข ข้าว" }));
    const editForm = screen.getByRole("form", { name: "แก้ไขรายการ" });
    const amount = within(editForm).getByLabelText("จำนวนเงินรายการ");
    await user.clear(amount);
    await user.type(amount, "400");
    await user.click(within(editForm).getByRole("button", { name: "บันทึกการแก้ไข" }));
    await waitFor(() => expect(card("จ่ายจริง")).toHaveTextContent("฿400.00"));
    expect((await transactions.list(goldenPlan3.id))[0].amount).toBe(400);

    await user.click(screen.getByRole("button", { name: "ลบ ข้าว" }));
    expect(window.confirm).toHaveBeenCalled();
    await waitFor(() => expect(card("จ่ายจริง")).toHaveTextContent("฿0.00"));
    expect(await transactions.list(goldenPlan3.id)).toEqual([]);
  });

  it("สลับกลับแท็บ วางแผน → หน้าวางแผนเดิมยังอยู่", async () => {
    const { user } = await openActual();
    await user.click(screen.getByRole("tab", { name: "วางแผน" }));
    expect(screen.getByRole("heading", { name: "แหล่งรายได้" })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "วางแผน" })).toHaveAttribute("aria-selected", "true");
  });
});

describe("ผังการไหลของเงิน (ตามจริง) — ใช้ FlowSection ตัวเดียวกับแท็บวางแผน", () => {
  it("ยังไม่มีรายการ → ข้อความแนะนำ / ลงรายการแล้ว → ผังแสดงข้อมูลจริงของรอบ", async () => {
    const { user } = await openActual();
    expect(screen.getByRole("heading", { name: "ผังการไหลของเงิน (ตามจริง)" })).toBeInTheDocument();
    expect(screen.getByText(/ลงรายการของรอบนี้แล้วผังจะปรากฏที่นี่/)).toBeInTheDocument();

    await record(user, { type: "income", amount: "44100", date: "2026-09-25", income: "inc-salary" });
    await record(user, { amount: "5000", date: "2026-10-01", group: "grp-emergency" });

    const chart = screen.getByRole("img", { name: "แผนภาพการไหลของเงิน" });
    const text = (id: string) => chart.querySelector(`[data-node-id="${id}"] text`)?.textContent ?? null;
    expect(text("income:inc-salary")).toContain("เงินเดือน");
    expect(text("category:emergency")).toContain("11.3%");
    expect(text("remaining")).toContain("88.7%");

    // แถบเครื่องมือของกลางใช้ได้เหมือนกัน
    await user.click(screen.getByRole("button", { name: "ตัวเลข (฿)" }));
    expect(text("remaining")).toContain("฿39,100.00");
    expect(screen.getByTestId("ratio-emergency")).toHaveTextContent("11.3%");
  });

  it("รายจ่ายก่อนมีรายรับในรอบ → มีหมายเหตุ และผังแสดง 'เงินขาด'", async () => {
    const { user } = await openActual();
    await record(user, { amount: "300", date: "2026-10-02", group: "grp-food" });
    expect(screen.getByText(/รอบนี้ยังไม่มีรายรับ/)).toBeInTheDocument();
    const chart = screen.getByRole("img", { name: "แผนภาพการไหลของเงิน" });
    expect(chart.querySelector('[data-node-id="deficit"]')).not.toBeNull();
  });
});
