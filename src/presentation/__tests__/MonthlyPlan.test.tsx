import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import type { UseCaseContext } from "@/application/context";
import type { Plan } from "@/domain/entities/Plan";
import type { Transaction } from "@/domain/entities/Transaction";
import { InMemoryActivePlanStore } from "@/infrastructure/storage/LocalStorageActivePlanStore";
import { InMemoryPlanRepository } from "@/infrastructure/storage/InMemoryPlanRepository";
import { InMemoryTransactionRepository } from "@/infrastructure/storage/InMemoryTransactionRepository";
import { KarngeinApp } from "@/presentation/components/KarngeinApp";

const plan: Plan = {
  id: "p2027",
  name: "แผน 2027",
  updatedAt: "2027-01-01T00:00:00.000Z",
  payCycleStartDay: 25,
  incomes: [
    { id: "salary", name: "เงินเดือน", amount: 30000, frequency: "monthly" },
    { id: "bonus", name: "โบนัส", amount: 60000, frequency: "yearly", date: "2027-12-20" },
  ],
  expenses: [
    {
      id: "need",
      name: "จำเป็น",
      category: "essential",
      items: [
        { id: "food", name: "อาหาร", amount: 8000, frequency: "monthly" },
        { id: "insure", name: "ค่าประกันรถ", amount: 12000, frequency: "yearly", date: "2027-03-15" },
      ],
    },
    { id: "edu", name: "การศึกษา", category: "essential", items: [{ id: "tuition", name: "ค่าเทอม", amount: 30000, frequency: "one-time", date: "2027-05-10" }] },
  ],
};

async function open(history: Transaction[] = []) {
  const repository = new InMemoryPlanRepository();
  const transactions = new InMemoryTransactionRepository();
  await repository.save(plan);
  for (const t of history) await transactions.save(plan.id, t);
  const ctx: UseCaseContext = { generateId: () => "x", now: () => new Date("2027-03-10T12:00:00.000Z") };
  const user = userEvent.setup();
  render(<KarngeinApp auth={null} repository={repository} transactionRepository={transactions} activePlanStore={new InMemoryActivePlanStore()} ctx={ctx} />);
  await screen.findByRole("status", { name: "รอบที่แสดง" });
  return { user };
}

describe("CP-13.1: แผนรายเดือน (แท็บวางแผน)", () => {
  it("12 เดือนตามเดือนจริง: มี.ค. มีค่าประกัน, พ.ค. ติดลบ+เตือน, ธ.ค. มีโบนัส / แตะเดือน → รายกลุ่ม / รวมปี = มุมมองรายปี", async () => {
    const { user } = await open();
    await user.click(screen.getByRole("tab", { name: "วางแผน" }));
    expect(screen.getByRole("status", { name: "ปีของแผนรายเดือน" })).toHaveTextContent("2027");

    expect(screen.getByTestId("month-3")).toHaveTextContent("รับ ฿30,000.00· จ่าย ฿20,000.00");
    expect(screen.getByTestId("month-3")).toHaveTextContent("− จำเป็น · ค่าประกันรถ ฿12,000.00");
    expect(screen.getByTestId("month-5")).toHaveTextContent("-฿8,000.00");
    expect(screen.getByTestId("month-5")).toHaveTextContent("เดือนนี้จ่ายมากกว่ารับ");
    expect(screen.getByTestId("month-12")).toHaveTextContent("＋ โบนัส ฿60,000.00");
    expect(screen.getByTestId("month-4")).not.toHaveTextContent("เดือนนี้จ่ายมากกว่ารับ");

    await user.click(screen.getByRole("button", { name: "แผนเดือน พ.ค. 2027" }));
    const detail = screen.getByRole("list", { name: "รายกลุ่ม พ.ค. 2027" });
    expect(within(detail).getAllByRole("listitem").map((li) => li.textContent)).toEqual(["จำเป็น฿8,000.00", "การศึกษา฿30,000.00"]);

    expect(screen.getByRole("status", { name: "รวมทั้งปีของแผน" })).toHaveTextContent("รับ ฿420,000.00 · จ่าย ฿138,000.00");

    await user.click(screen.getByRole("button", { name: "ปีถัดไป" }));
    expect(screen.getByTestId("month-3")).toHaveTextContent("ค่าประกันรถ"); // รายปีเกิดทุกปี
    expect(screen.getByTestId("month-5")).not.toHaveTextContent("ค่าเทอม"); // ครั้งเดียวเฉพาะปี 2027
  });

  it("แท็บสรุป: เทียบงบใช้แผนของเดือนที่ตรงกับรอบ → จ่ายค่าประกันใน มี.ค. ไม่ฟ้องเกินงบ", async () => {
    const history: Transaction[] = [
      { id: "a", date: "2027-03-05", type: "expense", amount: 12000, category: "essential", planGroupId: "need" },
      { id: "b", date: "2027-02-26", type: "expense", amount: 7500, category: "essential", planGroupId: "need" },
    ];
    const { user } = await open(history);
    await user.click(screen.getByRole("tab", { name: "สรุป" })); // รอบ 25 ก.พ. – 24 มี.ค. → แผน มี.ค.
    expect(screen.getByText(/งบตามแผนเดือน มี.ค. 2027/)).toBeInTheDocument();
    expect(screen.getByTestId("budget-need")).toHaveTextContent("฿19,500.00 / ฿20,000.00 (97.5%)");
    expect(screen.getByTestId("budget-need")).not.toHaveTextContent("เกินงบ");
  });
});

describe("CP-13.1: ตั้งเดือนที่จ่ายของรายการรายปีในแท็บวางแผน", () => {
  it("โบนัสรายปี: เลือก 'จ่าย มิ.ย.' → แผนรายเดือนย้ายโบนัสไป มิ.ย. / เลือก 'เฉลี่ยทุกเดือน' → กระจาย ÷ 12", async () => {
    const { user } = await open();
    await user.click(screen.getByRole("tab", { name: "วางแผน" }));
    const monthSelect = screen.getByLabelText("เดือนที่จ่าย โบนัส");
    expect(monthSelect).toHaveValue("12");
    await user.selectOptions(monthSelect, "6");
    expect(screen.getByTestId("month-6")).toHaveTextContent("＋ โบนัส ฿60,000.00");
    expect(screen.getByTestId("month-12")).not.toHaveTextContent("โบนัส");
    await user.selectOptions(screen.getByLabelText("เดือนที่จ่าย โบนัส"), "");
    expect(screen.getByTestId("month-6")).toHaveTextContent("รับ ฿35,000.00"); // 30,000 + 60,000 ÷ 12
  });
});
