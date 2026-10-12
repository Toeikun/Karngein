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

/** ลงรายการผ่านปุ่ม + (แผ่นปิดเองหลังบันทึก) */
async function addTx(
  page: Page,
  { type = "expense", amount, date, income, group, note }: { type?: "expense" | "income"; amount: string; date?: string; income?: string; group?: string; note?: string },
) {
  await page.getByRole("button", { name: "ลงรายการเร็ว" }).click();
  const sheet = page.getByRole("dialog", { name: "ลงรายการเร็ว" });
  await sheet.getByRole("button", { name: type === "income" ? "รายรับ" : "รายจ่าย", exact: true }).click();
  await sheet.getByLabel("จำนวนเงินรายการ").fill(amount);
  if (date) await sheet.getByLabel("วันที่รายการ").fill(date); // date picker จริงของเบราว์เซอร์
  if (income) await sheet.getByLabel("ผูกกับรายได้ในแผน").selectOption({ label: income });
  if (group) await sheet.getByLabel("ผูกกับกลุ่มในแผน").selectOption({ label: group });
  if (note) await sheet.getByLabel("โน้ต").fill(note);
  await sheet.getByRole("button", { name: "บันทึกรายการ" }).click();
  await expect(sheet).toBeHidden();
}

test("รายการ: ตั้งรอบ → ลงรายรับ/รายจ่าย → เทียบงบ (แท็บสรุป) → รอบก่อนหน้า → รีโหลดแล้วข้อมูลยังอยู่", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("tab", { name: "วางแผน" }).click(); // แอปเปิดมาที่แท็บรายการ — แม่แบบอยู่แท็บวางแผน
  await page.getByRole("button", { name: "มนุษย์เงินเดือน" }).click(); // มีรายได้ + กลุ่มรายจ่ายให้ผูก
  await page.getByRole("tab", { name: "รายการ" }).click();

  // รอบเริ่มวันนี้ → รายการวันนี้อยู่รอบปัจจุบัน ส่วนเมื่อวานอยู่รอบก่อน (ไม่ขึ้นกับวันที่รันเทสต์)
  const todayDay = new Date().getDate();
  await page.getByText(/⚙️ รอบเงินเดือนเริ่มวันที่/).click(); // ตั้งค่ารอบพับไว้
  await page.getByLabel("รอบเงินเดือนเริ่มวันที่").selectOption(String(todayDay));

  await addTx(page, { type: "income", amount: "44100", income: "เงินเดือน" });
  // รายจ่าย: ค่าเช่า (ผูกกลุ่ม "รายจ่ายประจำ" งบ 19,050)
  await addTx(page, { amount: "8000", group: "รายจ่ายประจำ", note: "ค่าเช่า" });
  // รายจ่ายเมื่อวาน → ต้องอยู่รอบก่อนหน้า
  await addTx(page, { amount: "99", date: isoDaysFromToday(-1), note: "กาแฟเมื่อวาน" });
  await expect(page.getByText("กาแฟเมื่อวาน")).toHaveCount(0); // ไม่อยู่ทั้งในรายการและในผังของรอบนี้

  await expect(card(page, "รับจริง")).toHaveText("฿44,100.00");
  await expect(card(page, "จ่ายจริง")).toHaveText("฿8,000.00");
  await expect(card(page, "คงเหลือรอบนี้")).toHaveText("฿36,100.00");
  // เทียบงบรายกลุ่มอยู่แท็บสรุป (Phase 12.3)
  await page.getByRole("tab", { name: "สรุป" }).click();
  await expect(page.getByText("฿8,000.00 / ฿19,050.00 (42.0%)")).toBeVisible();
  await page.getByRole("tab", { name: "รายการ" }).click();

  await page.getByRole("button", { name: "รอบก่อนหน้า" }).click();
  await expect(txList(page).getByText("กาแฟเมื่อวาน")).toBeVisible();
  await expect(card(page, "จ่ายจริง")).toHaveText("฿99.00");

  // รีโหลด → รายการยังอยู่ (เก็บในเบราว์เซอร์ โหมด Guest)
  await expect(page.getByRole("status", { name: "สถานะการบันทึก" })).toHaveText("บันทึกแล้ว");
  await page.reload(); // แอปเปิดมาที่แท็บรายการเอง
  await expect(card(page, "รับจริง")).toHaveText("฿44,100.00");
  await expect(txList(page).getByText("ค่าเช่า")).toBeVisible();
  await page.getByRole("tab", { name: "สรุป" }).click();
  await expect(page.getByRole("img", { name: "แผนภาพการไหลของเงิน" })).toBeVisible(); // ผังตามจริง (แท็บสรุป) แสดงหลังรีโหลด
  await page.getByRole("tab", { name: "รายการ" }).click();

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
