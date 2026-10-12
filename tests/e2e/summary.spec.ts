import { expect, test } from "@playwright/test";

test("สรุป: แถบล่างพอดีจอ / ลงรายการ → ปฏิทิน สัดส่วน อันดับร้าน กราฟงบ Sankey / กระดิ่ง", async ({ page }) => {
  await page.goto("/");
  const viewport = page.viewportSize()!;

  // แถบเมนู: มือถือ 6 ช่อง (D23) ทุกปุ่ม ≥ 44px และไม่ล้นจอ
  const nav = page.getByRole("navigation", { name: "เมนูหลัก" });
  const sizes = await nav.evaluate((el) =>
    [...el.querySelectorAll("button")].filter((b) => b.checkVisibility()).map((b) => {
      const r = b.getBoundingClientRect();
      return { w: r.width, h: r.height, right: r.right };
    }),
  );
  expect(sizes).toHaveLength(6); // มือถือ: 5 แท็บ (มี "เพิ่มเติม") + ปุ่ม + / คอมฯ: 5 แท็บ (มี "เป้าหมาย") + ปุ่ม +
  for (const s of sizes) {
    expect(s.w).toBeGreaterThanOrEqual(44);
    expect(s.h).toBeGreaterThanOrEqual(44);
    expect(s.right).toBeLessThanOrEqual(viewport.width);
  }

  await page.getByRole("tab", { name: "วางแผน" }).click();
  await page.getByRole("button", { name: "มนุษย์เงินเดือน" }).click();

  for (const [merchant, amount] of [
    ["ร้านข้าว", "60"],
    ["ร้านข้าว", "75"],
    ["Cinema", "3000"],
  ]) {
    await page.getByRole("button", { name: "ลงรายการเร็ว" }).click();
    const sheet = page.getByRole("dialog", { name: "ลงรายการเร็ว" });
    await sheet.getByLabel("จำนวนเงินรายการ").fill(amount);
    await sheet.getByLabel("ร้าน / ผู้รับ").fill(merchant);
    await sheet.getByLabel("ผูกกับกลุ่มในแผน").selectOption({ label: merchant === "Cinema" ? "ใช้จ่ายตามใจ" : "รายจ่ายประจำ" });
    await sheet.getByRole("button", { name: "บันทึกรายการ" }).click();
    await expect(sheet).toBeHidden();
  }

  await page.getByRole("tab", { name: "สรุป" }).click();
  const ranks = page.getByRole("region", { name: "จ่ายที่ไหนมากสุด" }).getByRole("listitem");
  await expect(ranks.first()).toContainText("Cinema");
  await expect(ranks.nth(1)).toContainText("ร้านข้าว2 ครั้ง฿135.00");
  await expect(page.getByTestId("share-wants")).toContainText("฿3,000.00");
  await expect(page.getByRole("img", { name: "กราฟยอดใช้สะสมเทียบเส้นใช้สม่ำเสมอ" })).toBeVisible();
  await expect(page.getByRole("img", { name: "แผนภาพการไหลของเงิน" })).toBeVisible();

  // ปฏิทิน: แตะวันนี้ → เห็น 3 รายการ
  const today = new Date();
  const calendar = page.getByRole("group", { name: "ปฏิทินยอดใช้จ่ายรายวัน" });
  await calendar.getByRole("button", { name: new RegExp(`^${today.getDate()} \\S+ ${today.getFullYear()} จ่าย ฿3,135.00`) }).click();
  await expect(page.getByRole("heading", { name: /รายการวันที่ .* \(3\)/ })).toBeVisible();

  // กระดิ่ง: เปิดได้ และกล่องไม่ล้นจอ
  await page.getByRole("button", { name: /การแจ้งเตือน/ }).click();
  const panel = page.getByRole("region", { name: "รายการแจ้งเตือน" });
  await expect(panel).toBeVisible();
  const box = (await panel.boundingBox())!;
  expect(box.x).toBeGreaterThanOrEqual(0);
  expect(box.x + box.width).toBeLessThanOrEqual(viewport.width);
});
