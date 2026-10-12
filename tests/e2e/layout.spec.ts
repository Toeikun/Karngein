import { expect, test } from "@playwright/test";

/**
 * ตรวจระยะห่างของกล่องทุกแท็บ (มือถือ + คอมฯ):
 *   - การ์ด/ส่วนต่างๆ ต้องไม่ทับกัน และห่างกันอย่างน้อย 8px (เคยมีแถบแท็บชิดการ์ด 0px)
 *   - ไม่มีอะไรชิดขอบจอ (< 8px) ยกเว้นแถบล่างที่ตั้งใจเต็มจอ และผัง Sankey ที่เลื่อนในกรอบ
 */
test("ทุกแท็บ: กล่องไม่ทับ/ไม่ชิดกัน และไม่ชิดขอบจอ", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("tab", { name: "วางแผน" }).click();
  await page.getByRole("button", { name: "มนุษย์เงินเดือน" }).click(); // มีข้อมูล → มีการ์ดครบทุกส่วน

  // หัวเว็บ: ชื่อแอปต้องไม่ถูกตัด (เคยถูกป้ายสถานะ/กระดิ่งดันจนเหลือ "Karn…")
  await expect(page.getByRole("button", { name: /การแจ้งเตือน/ })).toBeVisible();
  expect(await page.getByRole("heading", { level: 1 }).evaluate((h) => h.scrollWidth <= h.clientWidth)).toBe(true);

  const tabs = await page.getByRole("tab").filter({ visible: true }).allTextContents();
  for (const name of tabs) {
    await page.getByRole("tab", { name: name.replace(/^\S+?(?=[ก-๙])/u, "") }).click();
    const problems = await page.evaluate(() => {
      const shown = (e: Element) => {
        const r = e.getBoundingClientRect();
        return r.width > 0 && r.height > 0 && e.checkVisibility();
      };
      // ข้ามเฉพาะของที่ลอยอยู่จริง (แถบล่างบนมือถือ) — บนคอมฯ แถบแท็บอยู่ในเนื้อหา ต้องตรวจด้วย
      const fixed = (e: Element) => {
        for (let x: Element | null = e; x; x = x.parentElement) if (getComputedStyle(x).position === "fixed") return true;
        return false;
      };
      const label = (e: Element) => `${e.tagName}.${(e.getAttribute("aria-label") ?? e.id ?? "") || e.className.toString().slice(0, 40)}`;
      const boxes = [...document.querySelectorAll("header, nav, section, .rounded-3xl, [role=search]")].filter((e) => shown(e) && !fixed(e));
      const found: string[] = [];
      for (let i = 0; i < boxes.length; i++)
        for (let j = i + 1; j < boxes.length; j++) {
          const [a, b] = [boxes[i], boxes[j]];
          if (a.contains(b) || b.contains(a)) continue;
          const A = a.getBoundingClientRect();
          const B = b.getBoundingClientRect();
          const overlapX = Math.min(A.right, B.right) - Math.max(A.left, B.left);
          const overlapY = Math.min(A.bottom, B.bottom) - Math.max(A.top, B.top);
          if (overlapX > 2 && overlapY > 1) found.push(`ทับกัน ${label(a)} × ${label(b)}`);
          else if (overlapX > 2 && overlapY > -8) found.push(`ชิดกัน ${Math.round(-overlapY)}px ${label(a)} | ${label(b)}`);
        }
      for (const e of document.querySelectorAll(".max-w-6xl *")) {
        if (!shown(e) || fixed(e) || e.closest("[data-testid=flow-scroll]")) continue;
        const r = e.getBoundingClientRect();
        if (r.left < 8 || r.right > window.innerWidth - 8) found.push(`ชิดขอบจอ ${label(e)}`);
      }
      return found;
    });
    expect(problems, `แท็บ ${name}`).toEqual([]);
  }
});
