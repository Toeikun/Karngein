// @vitest-environment node
import { ESLint } from "eslint";
import { describe, expect, it } from "vitest";

/**
 * CP-1: ตรวจกฎ Dependency Rule ของ Clean Architecture (PLAN.md ข้อ 6.2)
 * ให้ ESLint ลอง lint โค้ดสมมติที่อยู่ใน src/domain/ แล้วต้องโดนห้าม
 */
const eslint = new ESLint();

async function lintImport(importLine: string, filePath: string) {
  const [result] = await eslint.lintText(`${importLine}\nexport const x = 1;\n`, { filePath });
  return result.messages.filter((m) => m.ruleId === "no-restricted-imports");
}

const lintDomainImport = (line: string) => lintImport(line, "src/domain/entities/Example.ts");
const lintApplicationImport = (line: string) =>
  lintImport(line, "src/application/usecases/Example.ts");

describe("Domain ห้าม import ชั้นอื่น", () => {
  it.each([
    'import { useState } from "react";',
    'import Link from "next/link";',
    'import { getFirestore } from "firebase/firestore";',
    'import { x } from "@/application/usecases/addIncome";',
    'import { x } from "@/infrastructure/storage/LocalStoragePlanRepository";',
    'import { x } from "@/presentation/components/Button";',
    'import { x } from "../../application/usecases/addIncome";',
  ])("ห้าม: %s", async (line) => {
    expect(await lintDomainImport(line)).toHaveLength(1);
  });

  it("อนุญาต: import ภายใน domain ด้วยกัน", async () => {
    expect(await lintDomainImport('import { round2 } from "@/domain/entities/Money";')).toHaveLength(0);
    expect(await lintDomainImport('import { round2 } from "./Money";')).toHaveLength(0);
  });
});

describe("Application ห้าม import Infrastructure / Presentation / framework", () => {
  it.each([
    'import { useState } from "react";',
    'import { getFirestore } from "firebase/firestore";',
    'import { InMemoryPlanRepository } from "@/infrastructure/storage/InMemoryPlanRepository";',
    'import { x } from "@/presentation/components/Button";',
    'import { x } from "../../infrastructure/storage/InMemoryPlanRepository";',
  ])("ห้าม: %s", async (line) => {
    expect(await lintApplicationImport(line)).toHaveLength(1);
  });

  it("อนุญาต: import Domain และ Port", async () => {
    expect(await lintApplicationImport('import { summarize } from "@/domain/services/summarize";')).toHaveLength(0);
    expect(await lintApplicationImport('import type { PlanRepository } from "../ports/PlanRepository";')).toHaveLength(0);
  });
});
