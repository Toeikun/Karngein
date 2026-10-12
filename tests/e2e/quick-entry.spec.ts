import { expect, test } from "@playwright/test";

test("ปุ่ม + ลงรายการเร็ว + แป้นคิดเลข + เดาหมวด + ค้นหา (มือถือ/คอมฯ)", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "มนุษย์เงินเดือน" }).click();

  // แถบแท็บ: มือถือติดด้านล่างจอ / คอมฯ อยู่ด้านบน
  const nav = page.getByRole("tablist", { name: "มุมมองของแผน" });
  const box = (await nav.boundingBox())!;
  const viewport = page.viewportSize()!;
  if (viewport.width < 1024) {
    expect(await nav.evaluate((el) => getComputedStyle(el).position)).toBe("fixed");
    expect(box.y).toBeGreaterThan(viewport.height * 0.85); // อยู่ช่วงล่างสุดของจอ
  }
  else expect(box.y).toBeLessThan(viewport.height / 2);

  // ลงรายการแรกผ่านปุ่ม + ด้วยแป้นในแอป
  await page.getByRole("button", { name: "ลงรายการเร็ว" }).click();
  const dialog = page.getByRole("dialog", { name: "ลงรายการเร็ว" });
  const keypad = dialog.getByRole("group", { name: "แป้นตัวเลข" });
  for (const key of ["6", "0", "×", "2"]) await keypad.getByRole("button", { name: key, exact: true }).click();
  await expect(dialog.getByText("฿120.00")).toBeVisible();
  await dialog.getByLabel("ร้าน / ผู้รับ").fill("ร้านข้าวมันไก่");
  await dialog.getByLabel("ผูกกับกลุ่มในแผน").selectOption({ label: "รายจ่ายประจำ" });
  await dialog.getByRole("button", { name: "บันทึกรายการ" }).click();
  await expect(dialog).toBeHidden();

  // รายการที่สอง: พิมพ์ร้านเดิม → เดากลุ่มให้เอง
  await page.getByRole("button", { name: "ลงรายการเร็ว" }).click();
  await dialog.getByLabel("ร้าน / ผู้รับ").fill("ร้านข้าวมันไก่");
  await expect(dialog.getByLabel("ผูกกับกลุ่มในแผน")).toHaveValue(/.+/);
  await expect(dialog.getByText(/เดาจากร้านที่เคยจด/)).toBeVisible();
  await keypad.getByRole("button", { name: "5", exact: true }).click();
  await keypad.getByRole("button", { name: "0", exact: true }).click();
  await dialog.getByRole("button", { name: "บันทึกรายการ" }).click();
  await expect(dialog).toBeHidden();

  // แท็บรายการ: ยอดรวม 170 และค้นหาเจอทั้ง 2 รายการ
  await page.getByRole("tab", { name: "รายการ" }).click();
  await expect(page.getByRole("status", { name: "จ่ายจริง" })).toHaveText("฿170.00");
  await page.getByLabel("ค้นหารายการ").fill("ข้าวมันไก่");
  await expect(page.getByRole("heading", { name: "ผลการค้นหา (2)" })).toBeVisible();
});
