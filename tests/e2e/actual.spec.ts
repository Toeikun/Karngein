import { expect, test, type Page } from "@playwright/test";

const card = (page: Page, name: string) => page.getByRole("status", { name });
/** รายการในรอบ (ชื่อรายการจะอยู่ในผังการไหลของเงินด้วย จึงค้นเฉพาะในรายการ) */
const txList = (page: Page) => page.locator("section[aria-labelledby=tx-heading]");

/** วันที่แบบ 'YYYY-MM-DD' ห่างจากวันนี้ n วัน (เวลาท้องถิ่น) */
function isoDaysFromToday(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() + n);
  const pad = (x: number) => String(x).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

test("บันทึกจริง: ตั้งรอบ → ลงรายรับ/รายจ่าย → เทียบงบ → รอบก่อนหน้า → รีโหลดแล้วข้อมูลยังอยู่", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "มนุษย์เงินเดือน" }).click(); // มีรายได้ + กลุ่มรายจ่ายให้ผูก
  await page.getByRole("tab", { name: "บันทึกจริง" }).click();

  // รอบเริ่มวันนี้ → รายการวันนี้อยู่รอบปัจจุบัน ส่วนเมื่อวานอยู่รอบก่อน (ไม่ขึ้นกับวันที่รันเทสต์)
  const todayDay = new Date().getDate();
  await page.getByLabel("รอบเงินเดือนเริ่มวันที่").selectOption(String(todayDay));

  const form = page.getByRole("form", { name: "ลงรายการใหม่" });
  // รายรับ: เงินเดือนวันนี้
  await form.getByRole("button", { name: "รายรับ" }).click();
  await form.getByLabel("จำนวนเงินรายการ").fill("44100");
  await form.getByLabel("ผูกกับรายได้ในแผน").selectOption({ label: "เงินเดือน" });
  await form.getByRole("button", { name: "บันทึกรายการ" }).click();
  await expect(form.getByText("บันทึกแล้ว ✓")).toBeVisible();

  // รายจ่าย: ค่าเช่า (ผูกกลุ่ม "รายจ่ายประจำ" งบ 19,050)
  await form.getByRole("button", { name: "รายจ่าย" }).click();
  await form.getByLabel("จำนวนเงินรายการ").fill("8000");
  await form.getByLabel("ผูกกับกลุ่มในแผน").selectOption({ label: "รายจ่ายประจำ" });
  await form.getByLabel("โน้ต").fill("ค่าเช่า");
  await form.getByRole("button", { name: "บันทึกรายการ" }).click();

  // รายจ่ายเมื่อวาน → ต้องอยู่รอบก่อนหน้า (ใช้ date picker จริงของเบราว์เซอร์)
  await form.getByLabel("จำนวนเงินรายการ").fill("99");
  await form.getByLabel("วันที่รายการ").fill(isoDaysFromToday(-1));
  await form.getByLabel("โน้ต").fill("กาแฟเมื่อวาน");
  await form.getByRole("button", { name: "บันทึกรายการ" }).click();
  await expect(page.getByText("กาแฟเมื่อวาน")).toHaveCount(0); // ไม่อยู่ทั้งในรายการและในผังของรอบนี้ // ไม่อยู่ในรอบนี้

  await expect(card(page, "รับจริง")).toHaveText("฿44,100.00");
  await expect(card(page, "จ่ายจริง")).toHaveText("฿8,000.00");
  await expect(card(page, "คงเหลือรอบนี้")).toHaveText("฿36,100.00");
  await expect(page.getByText("฿8,000.00 / ฿19,050.00 (42.0%)")).toBeVisible();

  await page.getByRole("button", { name: "รอบก่อนหน้า" }).click();
  await expect(txList(page).getByText("กาแฟเมื่อวาน")).toBeVisible();
  await expect(card(page, "จ่ายจริง")).toHaveText("฿99.00");

  // รีโหลด → รายการยังอยู่ (เก็บในเบราว์เซอร์ โหมด Guest)
  await expect(page.getByRole("status", { name: "สถานะการบันทึก" })).toHaveText("บันทึกแล้ว");
  await page.reload();
  await page.getByRole("tab", { name: "บันทึกจริง" }).click();
  await expect(card(page, "รับจริง")).toHaveText("฿44,100.00");
  await expect(txList(page).getByText("ค่าเช่า")).toBeVisible();
  await expect(page.getByRole("img", { name: "แผนภาพการไหลของเงิน" })).toBeVisible(); // ผังตามจริงแสดงหลังรีโหลด

  // มือถือ: ไม่มี scroll แนวนอน และปุ่ม/ช่องกรอก ≥ 44px
  const { overflow, smallest } = await page.evaluate(() => ({
    overflow: document.documentElement.scrollWidth > window.innerWidth,
    smallest: Math.min(
      ...[...document.querySelectorAll("button, input, select")]
        .filter((el) => (el as HTMLElement).offsetParent !== null)
        .map((el) => el.getBoundingClientRect().height),
    ),
  }));
  expect(overflow).toBe(false);
  expect(smallest).toBeGreaterThanOrEqual(44);
});
