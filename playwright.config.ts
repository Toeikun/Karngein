/**
 * E2E test — เปิดเว็บที่ build แล้วในเบราว์เซอร์จริง ทดสอบทั้ง flow (PLAN.md Phase 9)
 *
 * - ในเครื่อง: ใช้ Google Chrome ที่มีอยู่แล้ว (channel: "chrome") ไม่ดาวน์โหลดเบราว์เซอร์เพิ่ม (เครื่องบริษัท — D8)
 * - บน GitHub Actions (CI=true): ใช้ Chromium ที่ติดตั้งใน workflow
 * - ทดสอบ 2 ขนาดจอ: มือถือ (Pixel 7) และคอมพิวเตอร์
 */
import { defineConfig, devices } from "@playwright/test";

const PORT = 4173;
const channel = process.env.CI ? undefined : "chrome";

export default defineConfig({
  testDir: "tests/e2e",
  fullyParallel: false,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [["github"], ["list"]] : "list",
  use: {
    baseURL: `http://localhost:${PORT}`,
    locale: "th-TH",
    trace: "retain-on-failure",
  },
  projects: [
    { name: "mobile", use: { ...devices["Pixel 7"], channel } },
    { name: "desktop", use: { ...devices["Desktop Chrome"], channel } },
  ],
  webServer: {
    // build แบบไม่มี basePath และไม่มี Firebase (โหมด Guest) → ผลคงที่ ไม่ขึ้นกับบัญชีจริง
    command: `node scripts/serve-out.mjs ${PORT}`,
    url: `http://localhost:${PORT}`,
    reuseExistingServer: !process.env.CI,
  },
});
