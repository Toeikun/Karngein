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
              group: ["react", "react-dom", "react/*", "next", "next/*", "firebase", "firebase/*"],
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
