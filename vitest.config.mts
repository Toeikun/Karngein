import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  plugins: [tsconfigPaths(), react()],
  test: {
    environment: "jsdom",
    setupFiles: ["./vitest.setup.ts"],
    include: ["src/**/*.test.{ts,tsx}"],
    // เทสต์ที่ต้องใช้ Firebase Emulator (ต้องมี Java) แยกไปรันบน GitHub Actions — ดู vitest.firebase.config.mts
    exclude: ["**/node_modules/**", "src/**/*.firebase.test.ts"],
  },
});
