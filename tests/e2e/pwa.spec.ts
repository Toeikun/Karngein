import { expect, test } from "@playwright/test";

test("manifest ครบตามเกณฑ์ติดตั้งแอป (ชื่อ, standalone, ไอคอน 192/512)", async ({ request }) => {
  const response = await request.get("/manifest.webmanifest");
  expect(response.ok()).toBe(true);
  const manifest = await response.json();
  expect(manifest).toMatchObject({ short_name: "Karngein", display: "standalone", start_url: "/" });
  const sizes = manifest.icons.map((icon: { sizes: string }) => icon.sizes);
  expect(sizes).toEqual(expect.arrayContaining(["192x192", "512x512"]));
  for (const icon of manifest.icons) {
    const file = await request.get(icon.src);
    expect(file.ok(), icon.src).toBe(true);
    expect(file.headers()["content-type"]).toBe("image/png");
  }
});

test("ปิดเน็ตแล้วเปิดแอปใหม่ → หน้าเว็บยังเปิดได้ และเห็นข้อมูลล่าสุด", async ({ page, context }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "ครอบครัว" }).click();
  await expect(page.getByRole("status", { name: "สถานะการบันทึก" })).toHaveText("บันทึกแล้ว");

  // รอให้ Service Worker พร้อมและควบคุมหน้า (ครั้งแรกต้องรีโหลด 1 รอบ)
  await page.evaluate(() => navigator.serviceWorker.ready);
  await page.reload();
  await expect.poll(() => page.evaluate(() => !!navigator.serviceWorker.controller)).toBe(true);

  await context.setOffline(true);
  await page.reload();
  await expect(page.getByRole("heading", { name: "แหล่งรายได้" })).toBeVisible();
  await expect(page.getByRole("status", { name: "รายได้รวม" })).toHaveText("฿69,666.67"); // 35,000 + 28,000 + 80,000/12
  await context.setOffline(false);
});
