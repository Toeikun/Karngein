/**
 * Contract test — ชุดเทสต์กลางที่ "ทุก" PlanRepository ต้องผ่าน
 *
 * วิธีใช้: ในไฟล์เทสต์ของแต่ละ Adapter เรียก
 *   describePlanRepositoryContract("ชื่อ", () => new XxxPlanRepository());
 *
 * ถ้า InMemory / LocalStorage / Firestore ผ่านชุดเดียวกัน
 * แปลว่าสลับตัวไหนมาใช้ แอปก็ทำงานเหมือนเดิม
 */
import { beforeEach, describe, expect, it } from "vitest";
import type { PlanRepository } from "@/application/ports/PlanRepository";
import type { Plan } from "@/domain/entities/Plan";

function samplePlan(id: string, name = `แผน ${id}`): Plan {
  return {
    id,
    name,
    updatedAt: "2027-01-01T00:00:00.000Z",
    incomes: [{ id: `${id}-i1`, name: "เงินเดือน", amount: 30000, frequency: "monthly" }],
    expenses: [
      {
        id: `${id}-g1`,
        name: "รายจ่ายหลัก",
        category: "essential",
        items: [
          { id: `${id}-x1`, name: "ค่าอาหาร", amount: 8000, frequency: "monthly" },
          { id: `${id}-x2`, name: "ทริป", amount: 5000, frequency: "one-time", date: "2027-04-13" },
        ],
      },
    ],
  };
}

export function describePlanRepositoryContract(
  name: string,
  createRepository: () => PlanRepository | Promise<PlanRepository>,
) {
  describe(`PlanRepository contract: ${name}`, () => {
    let repo: PlanRepository;

    beforeEach(async () => {
      repo = await createRepository();
    });

    it("เริ่มต้นว่าง", async () => {
      expect(await repo.list()).toEqual([]);
    });

    it("save แล้ว get ด้วย id เดิม → ได้ข้อมูลเท่ากันทุกช่อง", async () => {
      const plan = samplePlan("p1");
      await repo.save(plan);
      expect(await repo.get("p1")).toEqual(plan);
    });

    it("get id ที่ไม่มี → null", async () => {
      expect(await repo.get("missing")).toBeNull();
    });

    it("save id เดิมซ้ำ → เขียนทับ ไม่เพิ่มแผนใหม่", async () => {
      await repo.save(samplePlan("p1", "ชื่อเก่า"));
      await repo.save(samplePlan("p1", "ชื่อใหม่"));
      const plans = await repo.list();
      expect(plans).toHaveLength(1);
      expect(plans[0].name).toBe("ชื่อใหม่");
    });

    it("list คืนทุกแผน", async () => {
      await repo.save(samplePlan("p1"));
      await repo.save(samplePlan("p2"));
      const ids = (await repo.list()).map((p) => p.id).sort();
      expect(ids).toEqual(["p1", "p2"]);
    });

    it("delete แล้วหาไม่เจอ และแผนอื่นยังอยู่", async () => {
      await repo.save(samplePlan("p1"));
      await repo.save(samplePlan("p2"));
      await repo.delete("p1");
      expect(await repo.get("p1")).toBeNull();
      expect(await repo.get("p2")).not.toBeNull();
    });

    it("delete id ที่ไม่มี → ไม่ error", async () => {
      await expect(repo.delete("missing")).resolves.toBeUndefined();
    });

    it("แก้ object ที่ได้จาก get → ข้อมูลที่เก็บไว้ไม่เปลี่ยน", async () => {
      await repo.save(samplePlan("p1"));
      const loaded = (await repo.get("p1"))!;
      loaded.name = "ถูกแก้ข้างนอก";
      loaded.incomes.push({ id: "hack", name: "x", amount: 1, frequency: "monthly" });
      const again = (await repo.get("p1"))!;
      expect(again.name).toBe("แผน p1");
      expect(again.incomes).toHaveLength(1);
    });

    it("แก้ object หลัง save → ข้อมูลที่เก็บไว้ไม่เปลี่ยน", async () => {
      const plan = samplePlan("p1");
      await repo.save(plan);
      plan.name = "แก้หลัง save";
      expect((await repo.get("p1"))!.name).toBe("แผน p1");
    });
  });
}
