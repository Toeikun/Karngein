import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Plan } from "@/domain/entities/Plan";
import { InMemoryActivePlanStore } from "@/infrastructure/storage/LocalStorageActivePlanStore";
import { InMemoryPlanRepository } from "@/infrastructure/storage/InMemoryPlanRepository";
import { KarngeinApp } from "@/presentation/components/KarngeinApp";
import { readText } from "@/presentation/utils/readText";
import { createTestContext } from "../../application/__tests__/testContext";
import { goldenPlan1 } from "../../domain/__tests__/goldenData";

/** repository + store ใช้ร่วมกันข้ามการเปิดแอปหลายครั้ง (จำลองการรีเฟรชหน้า) */
function setup() {
  const repository = new InMemoryPlanRepository();
  const activePlanStore = new InMemoryActivePlanStore();
  const ctx = createTestContext();
  const user = userEvent.setup();
  const open = async () => {
    const view = render(<KarngeinApp repository={repository} activePlanStore={activePlanStore} ctx={ctx} />);
    await screen.findByRole("heading", { name: "แหล่งรายได้" });
    return view;
  };
  return { repository, activePlanStore, user, open };
}

const card = (name: string) => screen.getByRole("status", { name });
const planSelect = () => screen.getByRole("combobox", { name: "แผน" });

async function typeAmount(user: ReturnType<typeof userEvent.setup>, label: string, value: string) {
  const input = screen.getByRole("textbox", { name: label });
  await user.clear(input);
  await user.type(input, value);
}

beforeEach(() => {
  vi.spyOn(window, "confirm").mockReturnValue(true);
});
afterEach(() => vi.restoreAllMocks());

describe("CP-7: หลายแผน", () => {
  it("สร้าง 2 แผน ใส่ข้อมูลต่างกัน สลับไปมา → ข้อมูลไม่ปนกัน", async () => {
    const { user, open } = setup();
    await open();
    await user.click(screen.getByRole("button", { name: "+ เพิ่มรายได้" }));
    await typeAmount(user, "จำนวนเงิน รายได้ใหม่", "10000");
    const firstId = (planSelect() as HTMLSelectElement).value;

    await user.click(screen.getByRole("button", { name: "+ แผนใหม่" }));
    expect(card("รายได้รวม")).toHaveTextContent("฿0.00");
    await user.click(screen.getByRole("button", { name: "+ เพิ่มรายได้" }));
    await typeAmount(user, "จำนวนเงิน รายได้ใหม่", "20000");
    const secondId = (planSelect() as HTMLSelectElement).value;
    expect(secondId).not.toBe(firstId);

    await user.selectOptions(planSelect(), firstId);
    await waitFor(() => expect(card("รายได้รวม")).toHaveTextContent("฿10,000.00"));
    await user.selectOptions(planSelect(), secondId);
    await waitFor(() => expect(card("รายได้รวม")).toHaveTextContent("฿20,000.00"));
  });

  it("เปิดแอปใหม่ (รีเฟรช) → ทั้ง 2 แผนยังอยู่ และเปิดแผนล่าสุดที่ใช้", async () => {
    const { user, open, repository } = setup();
    const first = await open();
    await user.click(screen.getByRole("button", { name: "+ แผนใหม่" }));
    await user.click(screen.getByRole("button", { name: "จัดการแผน ▾" }));
    const name = screen.getByRole("textbox", { name: "ชื่อแผน" });
    await user.clear(name);
    await user.type(name, "แผนเที่ยว");
    await user.tab();
    await waitFor(async () => expect((await repository.list()).map((p) => p.name)).toContain("แผนเที่ยว"), { timeout: 2500 });
    first.unmount();

    await open();
    expect(within(planSelect()).getAllByRole("option")).toHaveLength(2);
    expect(within(planSelect()).getByRole("option", { selected: true })).toHaveTextContent("แผนเที่ยว");
  });

  it("เปลี่ยนชื่อแผนเป็นค่าว่าง → เตือน", async () => {
    const { user, open } = setup();
    await open();
    await user.click(screen.getByRole("button", { name: "จัดการแผน ▾" }));
    await user.clear(screen.getByRole("textbox", { name: "ชื่อแผน" }));
    expect(screen.getByRole("alert")).toHaveTextContent("กรุณาระบุชื่อแผน");
  });

  it("ส่งออก JSON → ลบแผน (ยืนยัน) → นำเข้า → ข้อมูลกลับมาครบ", async () => {
    const { user, open, repository } = setup();
    await repository.save(goldenPlan1);
    await open();
    expect(card("รายได้รวม")).toHaveTextContent("฿34,166.67");

    // จับไฟล์ที่ส่งออก (jsdom ไม่มี URL.createObjectURL)
    let exported: Blob | null = null;
    URL.createObjectURL = vi.fn((blob: Blob) => {
      exported = blob;
      return "blob:karngein";
    });
    URL.revokeObjectURL = vi.fn();
    vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});

    await user.click(screen.getByRole("button", { name: "จัดการแผน ▾" }));
    await user.click(screen.getByRole("button", { name: "ส่งออกไฟล์สำรอง (JSON)" }));
    expect(exported).not.toBeNull();
    const json = await readText(exported!);

    await user.click(screen.getByRole("button", { name: "ลบแผนนี้" }));
    expect(window.confirm).toHaveBeenCalled();
    await waitFor(() => expect(card("รายได้รวม")).toHaveTextContent("฿0.00"));
    expect((await repository.list()).some((p) => p.id === goldenPlan1.id)).toBe(false);

    // แผงจัดการแผนยังเปิดอยู่หลังลบ (ปุ่มเป็น ▴) → อัปโหลดได้เลย
    expect(screen.getByRole("button", { name: "จัดการแผน ▴" })).toHaveAttribute("aria-expanded", "true");
    await user.upload(screen.getByLabelText("เลือกไฟล์สำรองที่จะนำเข้า"), new File([json], "backup.json", { type: "application/json" }));
    await waitFor(() => expect(card("รายได้รวม")).toHaveTextContent("฿34,166.67"));
    expect(card("รายจ่ายรวม")).toHaveTextContent("฿20,916.67");
    expect(within(planSelect()).getByRole("option", { selected: true })).toHaveTextContent("(นำเข้า)");
  });

  it("นำเข้าไฟล์ผิด → ข้อความ error ภาษาไทย แผนไม่เปลี่ยน", async () => {
    const { user, open } = setup();
    await open();
    await user.click(screen.getByRole("button", { name: "จัดการแผน ▾" }));
    await user.upload(screen.getByLabelText("เลือกไฟล์สำรองที่จะนำเข้า"), new File(["hello"], "x.json", { type: "application/json" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("ไฟล์นี้ไม่ใช่ JSON ที่อ่านได้");
  });

  it("ยกเลิกการลบ → แผนยังอยู่", async () => {
    vi.mocked(window.confirm).mockReturnValue(false);
    const { user, open, repository } = setup();
    await repository.save(goldenPlan1);
    await open();
    await user.click(screen.getByRole("button", { name: "จัดการแผน ▾" }));
    await user.click(screen.getByRole("button", { name: "ลบแผนนี้" }));
    expect(await repository.get(goldenPlan1.id)).not.toBeNull();
  });
});

describe("CP-7: แม่แบบ (Presets)", () => {
  it("แผนมีข้อมูล → ถามยืนยัน → แทนที่ด้วยแม่แบบ", async () => {
    const { user, open, repository } = setup();
    await repository.save(goldenPlan1);
    await open();
    await user.click(screen.getByRole("button", { name: "มนุษย์เงินเดือน" }));
    expect(window.confirm).toHaveBeenCalled();
    expect(screen.getByRole("textbox", { name: "จำนวนเงิน เงินเดือน" })).toHaveValue("30,000");
    expect(screen.queryByRole("textbox", { name: "จำนวนเงิน ขายสินทรัพย์/ของขวัญ" })).not.toBeInTheDocument();
    expect(card("รายได้รวม")).toHaveTextContent("฿35,000.00"); // 30,000 + 60,000/12
  });

  it("กดยกเลิก → ข้อมูลเดิมไม่เปลี่ยน", async () => {
    vi.mocked(window.confirm).mockReturnValue(false);
    const { user, open, repository } = setup();
    await repository.save(goldenPlan1);
    await open();
    await user.click(screen.getByRole("button", { name: "ครอบครัว" }));
    expect(card("รายได้รวม")).toHaveTextContent("฿34,166.67");
  });

  it("แผนว่าง → ใช้แม่แบบได้เลยไม่ต้องถาม", async () => {
    const { user, open } = setup();
    await open();
    await user.click(screen.getByRole("button", { name: "ฟรีแลนซ์" }));
    expect(window.confirm).not.toHaveBeenCalled();
    expect(card("รายได้รวม")).toHaveTextContent("฿35,000.00"); // 25,000 + 120,000/12
  });
});

describe("CP-7: กำหนดช่วง", () => {
  async function openGolden() {
    const s = setup();
    await s.repository.save(goldenPlan1 as Plan);
    await s.open();
    await s.user.click(screen.getByRole("button", { name: "กำหนดช่วง" }));
    return s;
  }

  it("ก.ย.–พ.ย. 2026 → ฿132,500.00 / ฿62,750.00 / ฿15,000.00 / ฿69,750.00", async () => {
    const { user } = await openGolden();
    await user.selectOptions(screen.getByRole("combobox", { name: "ปีเริ่มต้น" }), "2026");
    await user.selectOptions(screen.getByRole("combobox", { name: "เดือนเริ่มต้น" }), "9");
    await user.selectOptions(screen.getByRole("combobox", { name: "ปีสิ้นสุด" }), "2026");
    await user.selectOptions(screen.getByRole("combobox", { name: "เดือนสิ้นสุด" }), "11");
    expect(card("รายได้รวม")).toHaveTextContent("฿132,500.00");
    expect(card("รายจ่ายรวม")).toHaveTextContent("฿62,750.00");
    expect(card("ออม/ลงทุน")).toHaveTextContent("฿15,000.00");
    expect(card("เงินคงเหลือ")).toHaveTextContent("฿69,750.00");
  });

  it("เดือนสิ้นสุดก่อนเดือนเริ่ม → เตือน และตัวเลขยังเป็นช่วงล่าสุดที่ถูกต้อง", async () => {
    const { user } = await openGolden();
    const before = card("รายได้รวม").textContent; // ม.ค.–มี.ค. 2027 (ค่าเริ่มต้น)
    await user.selectOptions(screen.getByRole("combobox", { name: "ปีสิ้นสุด" }), "2026");
    expect(screen.getByRole("alert")).toHaveTextContent("เดือนสิ้นสุดต้องไม่ก่อนเดือนเริ่มต้น");
    expect(card("รายได้รวม").textContent).toBe(before);
  });
});
