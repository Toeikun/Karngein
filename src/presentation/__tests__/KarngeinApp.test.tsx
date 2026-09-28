import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import type { Plan } from "@/domain/entities/Plan";
import { InMemoryPlanRepository } from "@/infrastructure/storage/InMemoryPlanRepository";
import { KarngeinApp } from "@/presentation/components/KarngeinApp";
import { createTestContext } from "../../application/__tests__/testContext";
import { goldenPlan1 } from "../../domain/__tests__/goldenData";

/** เปิดแอปด้วย repository ในหน่วยความจำ (ใส่แผนเริ่มต้นได้) แล้วรอจนโหลดเสร็จ */
async function renderApp(initialPlan?: Plan) {
  const repository = new InMemoryPlanRepository();
  if (initialPlan) await repository.save(initialPlan);
  const user = userEvent.setup();
  render(<KarngeinApp repository={repository} ctx={createTestContext()} />);
  await screen.findByRole("heading", { name: "แหล่งรายได้" });
  return { user, repository };
}

const card = (name: string) => screen.getByRole("status", { name });

const planWith = (incomes: Plan["incomes"]): Plan => ({
  id: "p1",
  name: "ทดสอบ",
  updatedAt: "2027-01-01T00:00:00.000Z",
  incomes,
  expenses: [],
});

describe("CP-5: ฟอร์มรายได้ + Summary", () => {
  it("แผนใหม่ว่าง → การ์ดเป็น ฿0.00 และมีข้อความแนะนำ", async () => {
    await renderApp();
    expect(card("รายได้รวม")).toHaveTextContent("฿0.00");
    expect(screen.getByText(/ยังไม่มีรายได้/)).toBeInTheDocument();
  });

  it('กด "+ เพิ่มรายได้" แล้วพิมพ์ชื่อ + จำนวน → แถวใหม่ปรากฏ และการ์ดรายได้รวมเปลี่ยน', async () => {
    const { user } = await renderApp();
    await user.click(screen.getByRole("button", { name: "+ เพิ่มรายได้" }));

    const name = screen.getByRole("textbox", { name: "ชื่อรายได้" });
    await user.clear(name);
    await user.type(name, "เงินเดือน");

    const amount = screen.getByRole("textbox", { name: "จำนวนเงิน เงินเดือน" });
    await user.clear(amount);
    await user.type(amount, "25000");

    expect(card("รายได้รวม")).toHaveTextContent("฿25,000.00");
    await user.tab(); // ออกจากช่อง → แสดงแบบมีคอมมา
    expect(amount).toHaveValue("25,000");
  });

  it('เปลี่ยนความถี่ 50,000 จาก "รายเดือน" เป็น "รายปี" → รายได้รวมรายเดือนเหลือ ฿4,166.67', async () => {
    const { user } = await renderApp(planWith([{ id: "i1", name: "โบนัส", amount: 50000, frequency: "monthly" }]));
    expect(card("รายได้รวม")).toHaveTextContent("฿50,000.00");
    await user.selectOptions(screen.getByRole("combobox", { name: "ความถี่ โบนัส" }), "yearly");
    expect(card("รายได้รวม")).toHaveTextContent("฿4,166.67");
  });

  it('เลือก "ครั้งเดียว" → ช่องวันที่ปรากฏ', async () => {
    const { user } = await renderApp(planWith([{ id: "i1", name: "ขายของ", amount: 1000, frequency: "monthly" }]));
    expect(screen.queryByLabelText("วันที่ ขายของ")).not.toBeInTheDocument();
    await user.selectOptions(screen.getByRole("combobox", { name: "ความถี่ ขายของ" }), "one-time");
    expect(screen.getByLabelText("วันที่ ขายของ")).toBeInTheDocument();
  });

  it.each(["-100", "abc"])('พิมพ์ "%s" → มีข้อความเตือน และตัวเลขไม่เปลี่ยน', async (text) => {
    const { user } = await renderApp(planWith([{ id: "i1", name: "เงินเดือน", amount: 30000, frequency: "monthly" }]));
    const amount = screen.getByRole("textbox", { name: "จำนวนเงิน เงินเดือน" });
    await user.clear(amount);
    await user.type(amount, text);
    expect(screen.getByRole("alert")).toHaveTextContent("ใส่ได้เฉพาะตัวเลข");
    expect(card("รายได้รวม")).toHaveTextContent("฿30,000.00");
    await user.tab(); // ออกจากช่อง → กลับไปแสดงค่าล่าสุดที่ถูกต้อง
    expect(amount).toHaveValue("30,000");
  });

  it("ลบชื่อจนว่าง → เตือน และชื่อเดิมไม่หาย", async () => {
    const { user } = await renderApp(planWith([{ id: "i1", name: "เงินเดือน", amount: 1, frequency: "monthly" }]));
    const name = screen.getByRole("textbox", { name: "ชื่อรายได้" });
    await user.clear(name);
    expect(screen.getByRole("alert")).toHaveTextContent("กรุณาระบุชื่อรายการ");
    await user.tab();
    expect(name).toHaveValue("เงินเดือน");
  });
});

describe("CP-5: Golden Data บนหน้าจอ", () => {
  it("รายเดือน → ฿34,166.67 / ฿20,916.67 / ฿5,000.00 / ฿13,250.00", async () => {
    await renderApp(goldenPlan1);
    expect(card("รายได้รวม")).toHaveTextContent("฿34,166.67");
    expect(card("รายจ่ายรวม")).toHaveTextContent("฿20,916.67");
    expect(card("ออม/ลงทุน")).toHaveTextContent("฿5,000.00");
    expect(card("เงินคงเหลือ")).toHaveTextContent("฿13,250.00");
  });

  it("รายปี 2026 → ฿440,000.00 / ฿251,000.00 / ฿60,000.00 / ฿189,000.00", async () => {
    const { user } = await renderApp(goldenPlan1);
    await user.click(screen.getByRole("button", { name: "ดูรายปี" }));
    await user.selectOptions(screen.getByRole("combobox", { name: "เลือกปี" }), "2026");
    expect(card("รายได้รวม")).toHaveTextContent("฿440,000.00");
    expect(card("รายจ่ายรวม")).toHaveTextContent("฿251,000.00");
    expect(card("ออม/ลงทุน")).toHaveTextContent("฿60,000.00");
    expect(card("เงินคงเหลือ")).toHaveTextContent("฿189,000.00");
  });

  it("ยอดกลุ่ม รายจ่ายหลัก แสดง ฿11,750.00 ในมุมมองรายเดือน", async () => {
    await renderApp(goldenPlan1);
    expect(screen.getByTestId("group-total-exp-main")).toHaveTextContent("฿11,750.00");
  });
});

describe("CP-5: รายจ่าย", () => {
  it("เพิ่มรายการย่อยให้กลุ่ม → ยอดกลุ่มและรายจ่ายรวมอัปเดต", async () => {
    const { user } = await renderApp(goldenPlan1);
    const group = screen.getByTestId("group-total-exp-invest").closest("li")!;
    await user.click(within(group).getByRole("button", { name: "+ เพิ่มรายการย่อย" }));
    const amount = within(group).getByRole("textbox", { name: "จำนวนเงิน รายการใหม่" });
    await user.clear(amount);
    await user.type(amount, "1000");
    expect(screen.getByTestId("group-total-exp-invest")).toHaveTextContent("฿6,000.00");
    expect(card("ออม/ลงทุน")).toHaveTextContent("฿6,000.00");
  });

  it("เปลี่ยนหมวดกลุ่ม → การ์ดออม/ลงทุนเปลี่ยน", async () => {
    const { user } = await renderApp(goldenPlan1);
    await user.selectOptions(screen.getByRole("combobox", { name: "หมวดของ การลงทุน" }), "wants");
    expect(card("ออม/ลงทุน")).toHaveTextContent("฿0.00");
  });
});

describe("CP-5: บันทึกอัตโนมัติ", () => {
  it("แก้ข้อมูล → ภายใน ~1 วินาที repository มีข้อมูลใหม่ และสถานะเป็น บันทึกแล้ว", async () => {
    const { user, repository } = await renderApp(planWith([{ id: "i1", name: "เงินเดือน", amount: 30000, frequency: "monthly" }]));
    const amount = screen.getByRole("textbox", { name: "จำนวนเงิน เงินเดือน" });
    await user.clear(amount);
    await user.type(amount, "45000");
    expect(screen.getByRole("status", { name: "สถานะการบันทึก" })).toHaveTextContent("กำลังบันทึก");
    await waitFor(async () => expect((await repository.get("p1"))?.incomes[0].amount).toBe(45000), { timeout: 2500 });
    await waitFor(() => expect(screen.getByRole("status", { name: "สถานะการบันทึก" })).toHaveTextContent("บันทึกแล้ว"));
  });
});

describe("CP-5: บั๊กที่เจอตอนตรวจ Manual", () => {
  it("StrictMode (โหมด dev) โหลด 2 รอบ → ต้องสร้างแผนใหม่แค่ 1 แผน", async () => {
    const { StrictMode } = await import("react");
    const repository = new InMemoryPlanRepository();
    render(
      <StrictMode>
        <KarngeinApp repository={repository} ctx={createTestContext()} />
      </StrictMode>,
    );
    await screen.findByRole("heading", { name: "แหล่งรายได้" });
    expect(await repository.list()).toHaveLength(1);
  });
});
