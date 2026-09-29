/**
 * เทสต์ที่คุยกับ Firebase Emulator — รันด้วย `npm run test:firebase` (บน GitHub Actions เท่านั้น, ดู PLAN.md D8)
 */
import { defineConfig } from "vitest/config";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    environment: "node",
    include: ["src/**/*.firebase.test.ts"],
    fileParallelism: false, // ใช้ฐานข้อมูล Emulator ตัวเดียวกัน ห้ามรันพร้อมกัน
    testTimeout: 20000,
  },
});
