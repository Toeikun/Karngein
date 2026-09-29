import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    // Clean Architecture: Domain เป็นชั้นในสุด ห้าม import framework หรือชั้นอื่น (PLAN.md ข้อ 6.2)
    files: ["src/domain/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              regex: "^(react|react-dom|next|firebase)(/.*)?$",
              message: "Domain ต้องเป็น TypeScript ล้วน ห้ามใช้ React / Next.js / Firebase",
            },
            {
              group: [
                "@/app/*",
                "@/application/*",
                "@/infrastructure/*",
                "@/presentation/*",
                "@/di/*",
                "**/app/**",
                "**/application/**",
                "**/infrastructure/**",
                "**/presentation/**",
                "**/di/**",
              ],
              message: "Domain ห้าม import ชั้นอื่น (ลูกศรต้องชี้เข้าหา Domain เท่านั้น)",
            },
          ],
        },
      ],
    },
  },
  {
    // Application ใช้ Domain ได้ แต่ห้ามรู้จัก framework หรือ Infrastructure/Presentation
    // (ไฟล์เทสต์ได้รับยกเว้น เพราะต้องประกอบของจริงมาทดสอบ)
    files: ["src/application/**/*.{ts,tsx}"],
    ignores: ["src/application/__tests__/**"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              regex: "^(react|react-dom|next|firebase)(/.*)?$",
              message: "Application ห้ามใช้ React / Next.js / Firebase — ให้กำหนดเป็น Port แทน",
            },
            {
              group: [
                "@/app/*",
                "@/infrastructure/*",
                "@/presentation/*",
                "@/di/*",
                "**/app/**",
                "**/infrastructure/**",
                "**/presentation/**",
                "**/di/**",
              ],
              message: "Application ห้าม import Infrastructure/Presentation (ใช้ Port + DI แทน)",
            },
          ],
        },
      ],
    },
  },
  {
    // Firebase ใช้ได้เฉพาะใน Infrastructure — ชั้นอื่นต้องผ่าน Port + di (PLAN.md ข้อ 6.2)
    // Presentation ห้าม import Infrastructure ตรงๆ ต้องผ่าน di/container.ts
    files: ["src/presentation/**/*.{ts,tsx}", "src/app/**/*.{ts,tsx}"],
    ignores: ["src/presentation/__tests__/**"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            { regex: "^firebase(/.*)?$", message: "Firebase ใช้ได้เฉพาะใน src/infrastructure/" },
            {
              group: ["@/infrastructure/*", "**/infrastructure/**"],
              message: "Presentation ห้าม import Infrastructure ตรงๆ — เรียกผ่าน @/di/container",
            },
          ],
        },
      ],
    },
  },
  {
    files: ["src/di/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-imports": [
        "error",
        { patterns: [{ regex: "^firebase(/.*)?$", message: "Firebase ใช้ได้เฉพาะใน src/infrastructure/" }] },
      ],
    },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
]);

export default eslintConfig;
