import { expect, test, type Page } from "@playwright/test";

const walletAmount = (page: Page, name: string) => page.getByRole("status", { name: `ยอด ${name}` });

async function addWallet(page: Page, { kind, name, opening }: { kind?: RegExp; name: string; opening: string }) {
  await page.getByRole("button", { name: "+ เพิ่มกระเป๋า" }).click();
  const form = page.getByRole("form", { name: "เพิ่มกระเป๋า" });
  if (kind) await form.getByRole("button", { name: kind }).click();
  await form.getByLabel("ชื่อกระเป๋า").fill(name);
  await form.getByRole("textbox", { name: /ตอนเริ่มจด/ }).fill(opening);
  return form;
}

test("กระเป๋า: เพิ่มบัญชี/เงินสด/บัตร → จ่ายด้วยบัตร → โอน → จ่ายบัตร → ยอดถูก และรีโหลดแล้วยังอยู่", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("tab", { name: "กระเป๋า" }).click();

  await (await addWallet(page, { name: "KBank", opening: "20000" })).getByRole("button", { name: "บันทึกกระเป๋า" }).click();
  await (await addWallet(page, { kind: /เงินสด/, name: "เงินสด", opening: "0" })).getByRole("button", { name: "บันทึกกระเป๋า" }).click();
  const cardForm = await addWallet(page, { kind: /บัตรเครดิต/, name: "บัตร KTC", opening: "0" });
  await cardForm.getByLabel("วงเงินบัตร").fill("50000");
  await cardForm.getByRole("button", { name: "บันทึกกระเป๋า" }).click();
  await expect(page.getByRole("status", { name: "เงินที่มีอยู่สุทธิ" })).toHaveText("฿20,000.00");

  // รูดบัตร 2,500
  await page.getByRole("button", { name: "ลงรายการเร็ว" }).click();
  let sheet = page.getByRole("dialog", { name: "ลงรายการเร็ว" });
  await sheet.getByLabel("จำนวนเงินรายการ").fill("2500");
  await sheet.getByLabel("กระเป๋าเงิน").selectOption({ label: "💳 บัตร KTC" });
  await sheet.getByRole("button", { name: "บันทึกรายการ" }).click();
  await expect(sheet).toBeHidden();

  // ถอนเงินสด 500 = โอน KBank → เงินสด
  await page.getByRole("button", { name: "ลงรายการเร็ว" }).click();
  sheet = page.getByRole("dialog", { name: "ลงรายการเร็ว" });
  await sheet.getByRole("button", { name: "โอน", exact: true }).click();
  await sheet.getByLabel("จำนวนเงินรายการ").fill("500");
  await sheet.getByLabel("โอนจากกระเป๋า").selectOption({ label: "🏦 KBank" });
  await sheet.getByLabel("โอนเข้ากระเป๋า").selectOption({ label: "💵 เงินสด" });
  await sheet.getByRole("button", { name: "บันทึกรายการ" }).click();
  await expect(sheet).toBeHidden();

  await expect(walletAmount(page, "KBank")).toHaveText("฿19,500.00");
  await expect(walletAmount(page, "เงินสด")).toHaveText("฿500.00");
  await expect(walletAmount(page, "บัตร KTC")).toHaveText("฿2,500.00");

  // จ่ายบัตรจากการ์ดบัตร → แผ่นโอนกรอกยอดค้างให้
  await page.getByRole("article", { name: "กระเป๋า บัตร KTC" }).getByRole("button", { name: "จ่ายบัตร" }).click();
  sheet = page.getByRole("dialog", { name: "ลงรายการเร็ว" });
  await expect(sheet.getByLabel("จำนวนเงินรายการ")).toHaveValue("2,500");
  await sheet.getByRole("button", { name: "บันทึกรายการ" }).click();
  await expect(sheet).toBeHidden();
  await expect(walletAmount(page, "บัตร KTC")).toHaveText("฿0.00");
  await expect(walletAmount(page, "KBank")).toHaveText("฿17,000.00");
  await expect(page.getByRole("status", { name: "เงินที่มีอยู่สุทธิ" })).toHaveText("฿17,500.00");

  // แท็บรายการ: โอน/จ่ายบัตรไม่นับเป็นรายจ่าย
  await page.getByRole("tab", { name: "รายการ" }).click();
  await expect(page.getByRole("status", { name: "จ่ายจริง" })).toHaveText("฿2,500.00");

  // รีโหลด → ข้อมูลกระเป๋า + การโอนยังอยู่
  await expect(page.getByRole("status", { name: "สถานะการบันทึก" })).toHaveText("บันทึกแล้ว");
  await page.reload();
  await page.getByRole("tab", { name: "กระเป๋า" }).click();
  await expect(walletAmount(page, "KBank")).toHaveText("฿17,000.00");
  await expect(walletAmount(page, "เงินสด")).toHaveText("฿500.00");
});
