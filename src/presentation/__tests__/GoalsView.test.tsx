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

/** "วันนี้" = 26 ต.ค. 2026 → รอบ 25 ก.ย. – 24 ต.ค. จบแล้ว (ใช้ประมาณเวลาถึงเป้า R19) */
function contextAt(iso: string): UseCaseContext {
  let n = 0;
  return { generateId: () => `id-${++n}`, now: () => new Date(iso) };
}

async function openGoals(plan: Plan = { ...goldenPlan3, goals: [] }) {
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
      ctx={contextAt("2026-10-26T12:00:00.000Z")}
    />,
  );
  await screen.findByRole("heading", { name: "แหล่งรายได้" });
  await user.click(screen.getByRole("tab", { name: "เป้าหมาย" }));
  return { user, repository, transactions };
}

async function createEmergencyGoal(user: ReturnType<typeof userEvent.setup>) {
  await user.click(await screen.findByRole("button", { name: "+ ตั้งเป้าหมายใหม่" }));
  const form = screen.getByRole("form", { name: "ตั้งเป้าหมายใหม่" });
  await user.type(within(form).getByLabelText("ชื่อเป้าหมาย"), "เป้าหมายเงินออมฉุกเฉิน");
  // ค่าเริ่มต้น: หมวดเงินสำรองฉุกเฉิน, แบบ รายได้ × จำนวนเท่า, เงินเดือน × 12
  expect(within(form).getByTestId("goal-target-preview")).toHaveTextContent("฿529,200.00");
  const starting = within(form).getByLabelText("เงินที่มีอยู่แล้ว");
  await user.clear(starting);
  await user.type(starting, "50000");
  await user.click(within(form).getByRole("button", { name: "บันทึกเป้าหมาย" }));
  return screen.findByRole("article", { name: "เป้าหมาย เป้าหมายเงินออมฉุกเฉิน" });
}

beforeEach(() => vi.spyOn(window, "confirm").mockReturnValue(true));
afterEach(() => vi.restoreAllMocks());

describe("CP-11.4: หน้าเป้าหมาย", () => {
  it("ยังไม่มีเป้า → ข้อความแนะนำ", async () => {
    await openGoals();
    expect(await screen.findByText(/ยังไม่มีเป้าหมาย/)).toBeInTheDocument();
  });

  it("🏆 ตั้งเป้า เงินเดือน × 12 → 529,200 / เงินตั้งต้น 50,000 = 9.4%", async () => {
    const { user, repository } = await openGoals();
    const card = await createEmergencyGoal(user);
    expect(within(card).getByText("9.4%")).toBeInTheDocument();
    expect(within(card).getByText(/฿50,000.00 \//)).toHaveTextContent("฿50,000.00 / ฿529,200.00");
    expect(within(card).getByText(/เงินเดือน × 12/)).toBeInTheDocument();
    expect(within(card).getByText(/ออมเข้าเป้าให้ครบ 1 รอบ/)).toBeInTheDocument();
    await waitFor(async () => expect((await repository.get(goldenPlan3.id))?.goals).toHaveLength(1), { timeout: 2500 });
  });

  it("🏆 ลงเงินออม 5,000 ในแท็บบันทึกจริง โดยเลือก 'นับเข้าเป้าหมาย' → 10.4% และประมาณอีก 95 รอบ", async () => {
    const { user } = await openGoals();
    await createEmergencyGoal(user);

    await user.click(screen.getByRole("tab", { name: "บันทึกจริง" }));
    const form = await screen.findByRole("form", { name: "ลงรายการใหม่" });
    await user.type(within(form).getByLabelText("จำนวนเงินรายการ"), "5000");
    fireEvent.change(within(form).getByLabelText("วันที่รายการ"), { target: { value: "2026-10-01" } });
    await user.selectOptions(within(form).getByLabelText("นับเข้าเป้าหมาย"), "id-1");
    expect(within(form).getByText("หมวด: เงินสำรองฉุกเฉิน")).toBeInTheDocument(); // หมวดตามเป้าอัตโนมัติ
    await user.click(within(form).getByRole("button", { name: "บันทึกรายการ" }));
    await within(form).findByText("บันทึกแล้ว ✓");

    await user.click(screen.getByRole("tab", { name: "เป้าหมาย" }));
    const card = await screen.findByRole("article", { name: "เป้าหมาย เป้าหมายเงินออมฉุกเฉิน" });
    expect(within(card).getByText("10.4%")).toBeInTheDocument();
    expect(within(card).getByText(/ประมาณอีก 95 รอบ \(~7 ปี 11 เดือน\)/)).toBeInTheDocument();
    expect(within(card).getByText(/ออมเข้าเป้าแล้ว 1 ครั้ง/)).toBeInTheDocument();
    expect(within(card).getByRole("progressbar")).toHaveAttribute("aria-valuenow", "10");
  });

  it("แก้เงินเดือนในแผนเป็น 50,000 → เป้าเปลี่ยนเป็น 600,000 เอง", async () => {
    const { user } = await openGoals();
    await createEmergencyGoal(user);
    await user.click(screen.getByRole("tab", { name: "วางแผน" }));
    const amount = screen.getByRole("textbox", { name: "จำนวนเงิน เงินเดือน" });
    await user.clear(amount);
    await user.type(amount, "50000");
    await user.tab();
    await user.click(screen.getByRole("tab", { name: "เป้าหมาย" }));
    const card = await screen.findByRole("article", { name: "เป้าหมาย เป้าหมายเงินออมฉุกเฉิน" });
    expect(within(card).getByText(/฿50,000.00 \//)).toHaveTextContent("฿50,000.00 / ฿600,000.00");
  });

  it("ลบรายได้ที่เป้าอ้างอิง → คำเตือน (ไม่ error) และแก้เป้าให้ใช้จำนวนตายตัวได้", async () => {
    const { user } = await openGoals();
    await createEmergencyGoal(user);
    await user.click(screen.getByRole("tab", { name: "วางแผน" }));
    await user.click(screen.getByRole("button", { name: "ลบ เงินเดือน" }));
    await user.click(screen.getByRole("tab", { name: "เป้าหมาย" }));
    const card = await screen.findByRole("article", { name: "เป้าหมาย เป้าหมายเงินออมฉุกเฉิน" });
    expect(within(card).getByRole("alert")).toHaveTextContent("รายได้ที่ใช้คำนวณเป้านี้ถูกลบออกจากแผนแล้ว");

    await user.click(within(card).getByRole("button", { name: "แก้ไขเป้าหมาย เป้าหมายเงินออมฉุกเฉิน" }));
    const form = screen.getByRole("form", { name: "แก้ไขเป้าหมาย" });
    await user.click(within(form).getByRole("button", { name: "จำนวนตายตัว" }));
    await user.type(within(form).getByLabelText("ยอดเป้าหมาย"), "200000");
    await user.click(within(form).getByRole("button", { name: "บันทึกการแก้ไข" }));
    const updated = await screen.findByRole("article", { name: "เป้าหมาย เป้าหมายเงินออมฉุกเฉิน" });
    expect(within(updated).getByText("25.0%")).toBeInTheDocument(); // 50,000 / 200,000
  });

  it("ไม่ตั้งชื่อ / × 0 → เตือน ไม่บันทึก", async () => {
    const { user } = await openGoals();
    await user.click(await screen.findByRole("button", { name: "+ ตั้งเป้าหมายใหม่" }));
    const form = screen.getByRole("form", { name: "ตั้งเป้าหมายใหม่" });
    await user.clear(within(form).getByLabelText("จำนวนเท่า"));
    await user.type(within(form).getByLabelText("จำนวนเท่า"), "0");
    await user.click(within(form).getByRole("button", { name: "บันทึกเป้าหมาย" }));
    const alerts = within(form).getAllByRole("alert").map((a) => a.textContent);
    expect(alerts).toEqual(expect.arrayContaining(["กรุณาตั้งชื่อเป้าหมาย", "จำนวนเท่าต้องเป็นจำนวนเต็ม 1–600"]));
    expect(screen.queryByRole("article")).not.toBeInTheDocument();
  });

  it("ถึงเป้าแล้ว → 'ถึงเป้าแล้ว 🎉'", async () => {
    const { user } = await openGoals();
    await user.click(await screen.findByRole("button", { name: "+ ตั้งเป้าหมายใหม่" }));
    const form = screen.getByRole("form", { name: "ตั้งเป้าหมายใหม่" });
    await user.type(within(form).getByLabelText("ชื่อเป้าหมาย"), "ซื้อโทรศัพท์");
    await user.click(within(form).getByRole("button", { name: "จำนวนตายตัว" }));
    await user.type(within(form).getByLabelText("ยอดเป้าหมาย"), "20000");
    const starting = within(form).getByLabelText("เงินที่มีอยู่แล้ว");
    await user.clear(starting);
    await user.type(starting, "25000");
    await user.click(within(form).getByRole("button", { name: "บันทึกเป้าหมาย" }));
    const card = await screen.findByRole("article", { name: "เป้าหมาย ซื้อโทรศัพท์" });
    expect(within(card).getByText("ถึงเป้าแล้ว 🎉")).toBeInTheDocument();
  });

  it("ลบเป้าหมาย (ยืนยัน)", async () => {
    const { user } = await openGoals();
    const card = await createEmergencyGoal(user);
    await user.click(within(card).getByRole("button", { name: "ลบเป้าหมาย เป้าหมายเงินออมฉุกเฉิน" }));
    expect(window.confirm).toHaveBeenCalled();
    expect(await screen.findByText(/ยังไม่มีเป้าหมาย/)).toBeInTheDocument();
  });
});
