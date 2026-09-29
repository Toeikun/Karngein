import { describe, expect, it } from "vitest";
import { findGuestPlansToMigrate, migrateGuestPlans } from "@/application/usecases/migrateGuestPlans";
import type { Plan } from "@/domain/entities/Plan";
import { InMemoryPlanRepository } from "@/infrastructure/storage/InMemoryPlanRepository";

const plan = (id: string, updatedAt: string, name = id): Plan => ({
  id,
  name,
  updatedAt,
  incomes: [{ id: `${id}-i`, name: "เงินเดือน", amount: 1, frequency: "monthly" }],
  expenses: [],
});

async function setup(guestPlans: Plan[], cloudPlans: Plan[]) {
  const guest = new InMemoryPlanRepository();
  const cloud = new InMemoryPlanRepository();
  for (const p of guestPlans) await guest.save(p);
  for (const p of cloudPlans) await cloud.save(p);
  return { guest, cloud };
}

describe("ย้ายแผน Guest ขึ้นคลาวด์", () => {
  it("2 แผนในเครื่อง คลาวด์ว่าง → ย้ายครบ 2 แผน", async () => {
    const { guest, cloud } = await setup([plan("a", "2027-01-01T00:00:00.000Z"), plan("b", "2027-01-02T00:00:00.000Z")], []);
    const toMigrate = await findGuestPlansToMigrate(guest, cloud);
    expect(await migrateGuestPlans(toMigrate, cloud)).toBe(2);
    expect((await cloud.list()).map((p) => p.id).sort()).toEqual(["a", "b"]);
  });

  it("id ซ้ำ → เลือกตัวที่ updatedAt ใหม่กว่า", async () => {
    const { guest, cloud } = await setup(
      [plan("new-in-guest", "2027-05-01T00:00:00.000Z", "ในเครื่อง"), plan("new-in-cloud", "2027-01-01T00:00:00.000Z", "ในเครื่อง")],
      [plan("new-in-guest", "2027-01-01T00:00:00.000Z", "คลาวด์"), plan("new-in-cloud", "2027-05-01T00:00:00.000Z", "คลาวด์")],
    );
    await migrateGuestPlans(await findGuestPlansToMigrate(guest, cloud), cloud);
    expect((await cloud.get("new-in-guest"))!.name).toBe("ในเครื่อง");
    expect((await cloud.get("new-in-cloud"))!.name).toBe("คลาวด์");
  });

  it("ย้ายแล้ว → ครั้งถัดไปไม่มีอะไรต้องย้าย (ไม่ถามซ้ำ) และข้อมูลในเครื่องยังอยู่", async () => {
    const { guest, cloud } = await setup([plan("a", "2027-01-01T00:00:00.000Z")], []);
    await migrateGuestPlans(await findGuestPlansToMigrate(guest, cloud), cloud);
    expect(await findGuestPlansToMigrate(guest, cloud)).toEqual([]);
    expect(await guest.list()).toHaveLength(1);
  });

  it("แผนว่างที่แอปสร้างให้อัตโนมัติ → ไม่ย้าย (ไม่ถามผู้ใช้)", async () => {
    const empty: Plan = { ...plan("empty", "2027-01-01T00:00:00.000Z"), incomes: [] };
    const { guest, cloud } = await setup([empty], []);
    expect(await findGuestPlansToMigrate(guest, cloud)).toEqual([]);
  });

  it("เครื่องว่าง → ไม่มีอะไรต้องย้าย", async () => {
    const { guest, cloud } = await setup([], [plan("x", "2027-01-01T00:00:00.000Z")]);
    expect(await findGuestPlansToMigrate(guest, cloud)).toEqual([]);
  });
});
