import { expect, test, type Page } from "@playwright/test";

const card = (page: Page, name: string) => page.getByRole("status", { name });

test.beforeEach(async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "แหล่งรายได้" })).toBeVisible();
});

test("flow หลัก: แม่แบบ → เพิ่มรายจ่าย → ดูรายปี → รีโหลดแล้วข้อมูลยังอยู่", async ({ page }) => {
  // 1. ใช้แม่แบบ "มนุษย์เงินเดือน" (แผนว่าง → ไม่ถามยืนยัน)
  await page.getByRole("button", { name: "มนุษย์เงินเดือน" }).click();
  await expect(card(page, "รายได้รวม")).toHaveText("฿35,000.00"); // 30,000 + 60,000/12
  await expect(card(page, "รายจ่ายรวม")).toHaveText("฿30,450.00");

  // 2. เพิ่มรายจ่าย 1,000 บาท/เดือน
  await page.getByRole("button", { name: "+ เพิ่มรายจ่าย" }).click();
  const amount = page.getByRole("textbox", { name: "จำนวนเงิน รายจ่ายใหม่" });
  await amount.fill("1000");
  await expect(card(page, "รายจ่ายรวม")).toHaveText("฿31,450.00");
  await expect(card(page, "เงินคงเหลือ")).toHaveText("฿3,550.00");

  // 3. ดูรายปี (ค่าเริ่มต้นปี 2027)
  await page.getByRole("button", { name: "ดูรายปี" }).click();
  await expect(card(page, "รายได้รวม")).toHaveText("฿420,000.00");
  await expect(card(page, "รายจ่ายรวม")).toHaveText("฿377,400.00");

  // 4. รอบันทึกอัตโนมัติ แล้วรีโหลด
  await expect(page.getByRole("status", { name: "สถานะการบันทึก" })).toHaveText("บันทึกแล้ว");
  await page.reload();
  await expect(card(page, "รายได้รวม")).toHaveText("฿35,000.00");
  await expect(card(page, "รายจ่ายรวม")).toHaveText("฿31,450.00");
  await expect(page.getByRole("textbox", { name: "จำนวนเงิน รายจ่ายใหม่" })).toHaveValue("1,000");
});

test("หน้าจอไม่ล้นแนวนอน และปุ่ม/ช่องกรอกสูงอย่างน้อย 44px", async ({ page }) => {
  await page.getByRole("button", { name: "มนุษย์เงินเดือน" }).click();
  const { overflow, smallest } = await page.evaluate(() => ({
    overflow: document.documentElement.scrollWidth > window.innerWidth,
    smallest: Math.min(
      ...[...document.querySelectorAll("button, input:not([type=file]), select")]
        .filter((el) => (el as HTMLElement).offsetParent !== null)
        .map((el) => el.getBoundingClientRect().height),
    ),
  }));
  expect(overflow).toBe(false);
  expect(smallest).toBeGreaterThanOrEqual(44);
});
