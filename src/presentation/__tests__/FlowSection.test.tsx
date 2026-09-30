import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { summarize } from "@/domain/services/summarize";
import type { Period } from "@/domain/entities/Period";
import { FlowSection } from "@/presentation/components/flow/FlowSection";
import { goldenPlan1 } from "../../domain/__tests__/goldenData";

function renderFlow(period: Period = { kind: "monthly" }) {
  const user = userEvent.setup();
  const utils = render(<FlowSection plan={goldenPlan1} period={period} summary={summarize(goldenPlan1, period)} />);
  const chart = () => screen.getByRole("img", { name: "แผนภาพการไหลของเงิน" });
  const nodeText = (id: string) => utils.container.querySelector(`[data-node-id="${id}"] text`)?.textContent ?? null;
  return { user, chart, nodeText, container: utils.container };
}

describe("CP-6: Sankey บนหน้าจอ", () => {
  it("วาดโหนดครบ และป้ายเริ่มต้นเป็นเปอร์เซ็นต์", () => {
    const { chart, nodeText } = renderFlow();
    expect(chart()).toBeInTheDocument();
    expect(nodeText("pool")).toContain("100.0%");
    expect(nodeText("income:inc-salary")).toContain("87.8%");
    expect(nodeText("remaining")).toContain("38.8%");
  });

  it('สลับ "ตัวเลข (฿)" → ป้ายเป็นเงินบาท, สลับ "ไม่แสดง" → ไม่มีตัวเลข', async () => {
    const { user, nodeText } = renderFlow();
    await user.click(screen.getByRole("button", { name: "ตัวเลข (฿)" }));
    expect(nodeText("pool")).toContain("฿34,166.67");
    await user.click(screen.getByRole("button", { name: "ไม่แสดง" }));
    expect(nodeText("pool")).toBe("เงินกองกลาง");
  });

  it('ปิดหมวด "ให้รางวัลตัวเอง" → โหนดหมวดนั้นหายไป เปิดใหม่ → กลับมา', async () => {
    const { user, container } = renderFlow();
    const chip = within(screen.getByRole("group", { name: "แสดงหมวด" })).getByRole("button", { name: /ให้รางวัลตัวเอง/ });
    await user.click(chip);
    expect(chip).toHaveAttribute("aria-pressed", "false");
    expect(container.querySelector('[data-node-id="category:reward"]')).toBeNull();
    await user.click(chip);
    expect(container.querySelector('[data-node-id="category:reward"]')).not.toBeNull();
  });

  it('คลิกกลุ่ม "รายจ่ายหลัก" → ยุบรายการย่อย คลิกอีกครั้ง → ขยาย', async () => {
    const { user, container } = renderFlow();
    expect(container.querySelector('[data-node-id="item:exp-main:exp-main-food"]')).not.toBeNull();
    await user.click(screen.getByRole("button", { name: "ยุบในผัง รายจ่ายหลัก" }));
    expect(container.querySelector('[data-node-id="item:exp-main:exp-main-food"]')).toBeNull();
    await user.click(screen.getByRole("button", { name: "ขยายในผัง รายจ่ายหลัก" }));
    expect(container.querySelector('[data-node-id="item:exp-main:exp-main-food"]')).not.toBeNull();
  });

  it("ซูมเข้า/ออก/รีเซ็ต เปลี่ยนขนาด SVG", async () => {
    const { user, chart } = renderFlow();
    expect(chart()).toHaveAttribute("width", "960");
    await user.click(screen.getByRole("button", { name: "ซูมเข้า" }));
    expect(chart()).toHaveAttribute("width", "1200");
    await user.click(screen.getByRole("button", { name: /รีเซ็ตซูม/ }));
    await user.click(screen.getByRole("button", { name: "ซูมออก" }));
    expect(chart()).toHaveAttribute("width", "720");
  });

  it("มุมมองรายเดือน + มีรายการครั้งเดียว → แสดงหมายเหตุ / รายปี → ไม่แสดง", () => {
    renderFlow();
    expect(screen.getByText(/ไม่ถูกนับในมุมมองรายเดือน/)).toBeInTheDocument();
  });

  it("รายปีไม่มีหมายเหตุ", () => {
    renderFlow({ kind: "yearly", year: 2026 });
    expect(screen.queryByText(/ไม่ถูกนับในมุมมองรายเดือน/)).not.toBeInTheDocument();
  });

  it("การ์ดสัดส่วน 5 หมวด ตรงกับต้นแบบ", () => {
    renderFlow();
    expect(screen.getByTestId("ratio-essential")).toHaveTextContent("34.4%");
    expect(screen.getByTestId("ratio-wants")).toHaveTextContent("0.0%");
    expect(screen.getByTestId("ratio-investment")).toHaveTextContent("14.6%");
    expect(screen.getByTestId("ratio-emergency")).toHaveTextContent("0.0%");
    expect(screen.getByTestId("ratio-reward")).toHaveTextContent("12.2%");
  });
});

describe("CP-6 (แก้เพิ่ม): เรียงโหนดตามหมวด ไม่สลับกัน", () => {
  it("ทุกคอลัมน์เรียงจากบนลงล่างตามลำดับที่ buildFlowGraph ให้ (หมวด → กลุ่ม → รายการ)", async () => {
    const { applyPreset } = await import("@/application/usecases/presets");
    const { createTestContext, basePlan } = await import("../../application/__tests__/testContext");
    const { buildFlowGraph } = await import("@/domain/services/buildFlowGraph");
    const result = applyPreset(basePlan(), "salaryman", createTestContext());
    if (!result.ok) throw new Error("preset failed");
    const plan = result.plan;
    const period = { kind: "monthly" } as const;
    const { container } = render(<FlowSection plan={plan} period={period} summary={summarize(plan, period)} />);

    const expectedOrder = buildFlowGraph(plan, period).nodes.map((n) => n.id);
    const rects = [...container.querySelectorAll<SVGGElement>("[data-node-id]")].map((g) => {
      const rect = g.querySelector("rect")!;
      return { id: g.dataset.nodeId!, x: Number(rect.getAttribute("x")), y: Number(rect.getAttribute("y")) };
    });
    // จัดกลุ่มตามคอลัมน์ (x เดียวกัน) แล้วดูว่าเรียงตาม y ตรงกับลำดับที่คาดไว้
    const columns = new Map<number, typeof rects>();
    for (const r of rects) columns.set(r.x, [...(columns.get(r.x) ?? []), r]);
    for (const column of columns.values()) {
      const byY = [...column].sort((a, b) => a.y - b.y).map((r) => r.id);
      const byInput = [...column].sort((a, b) => expectedOrder.indexOf(a.id) - expectedOrder.indexOf(b.id)).map((r) => r.id);
      expect(byY).toEqual(byInput);
    }
  });
});
