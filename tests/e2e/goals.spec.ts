import { expect, test } from "@playwright/test";

test("เป้าหมาย: เงินเดือน × 12 → ลงเงินออมเข้าเป้า → ความคืบหน้าเพิ่ม → รีโหลดแล้วยังอยู่", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "มนุษย์เงินเดือน" }).click(); // เงินเดือน 30,000

  await page.getByRole("tab", { name: "เป้าหมาย" }).click();
  await page.getByRole("button", { name: "+ ตั้งเป้าหมายใหม่" }).click();
  const form = page.getByRole("form", { name: "ตั้งเป้าหมายใหม่" });
  await form.getByLabel("ชื่อเป้าหมาย").fill("เงินออมฉุกเฉิน");
  await form.getByLabel("รายได้ที่ใช้คำนวณเป้า").selectOption({ label: "เงินเดือน" });
  await form.getByLabel("จำนวนเท่า").fill("6");
  await expect(form.getByTestId("goal-target-preview")).toHaveText("฿180,000.00"); // 30,000 × 6
  await form.getByLabel("เงินที่มีอยู่แล้ว").fill("18000");
  await form.getByRole("button", { name: "บันทึกเป้าหมาย" }).click();

  const card = page.getByRole("article", { name: "เป้าหมาย เงินออมฉุกเฉิน" });
  await expect(card.getByText("10.0%")).toBeVisible(); // 18,000 / 180,000

  // ลงเงินออมเข้าเป้า 9,000
  await page.getByRole("tab", { name: "บันทึกจริง" }).click();
  const tx = page.getByRole("form", { name: "ลงรายการใหม่" });
  await tx.getByLabel("จำนวนเงินรายการ").fill("9000");
  await tx.getByLabel("นับเข้าเป้าหมาย").selectOption({ label: "เป้าหมาย: เงินออมฉุกเฉิน" });
  await expect(tx.getByText("หมวด: เงินสำรองฉุกเฉิน")).toBeVisible();
  await tx.getByRole("button", { name: "บันทึกรายการ" }).click();
  await expect(tx.getByText("บันทึกแล้ว ✓")).toBeVisible();

  await page.getByRole("tab", { name: "เป้าหมาย" }).click();
  await expect(card.getByText("15.0%")).toBeVisible(); // 27,000 / 180,000
  await expect(card.getByText(/ออมเข้าเป้าแล้ว 1 ครั้ง/)).toBeVisible();

  // รีโหลด → เป้าและความคืบหน้ายังอยู่
  await expect(page.getByRole("status", { name: "สถานะการบันทึก" })).toHaveText("บันทึกแล้ว");
  await page.reload();
  await page.getByRole("tab", { name: "เป้าหมาย" }).click();
  await expect(page.getByRole("article", { name: "เป้าหมาย เงินออมฉุกเฉิน" }).getByText("15.0%")).toBeVisible();
});
