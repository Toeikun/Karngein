/**
 * InMemoryPlanRepository — เก็บแผนไว้ในหน่วยความจำ (หายเมื่อปิดหน้า)
 * ใช้ในเทสต์ และเป็นตัวอย่าง Adapter ที่ง่ายที่สุดของ PlanRepository
 */
import type { PlanRepository } from "@/application/ports/PlanRepository";
import type { Plan } from "@/domain/entities/Plan";

export class InMemoryPlanRepository implements PlanRepository {
  private readonly plans = new Map<string, Plan>();

  async list(): Promise<Plan[]> {
    return [...this.plans.values()].map((plan) => structuredClone(plan));
  }

  async get(id: string): Promise<Plan | null> {
    const plan = this.plans.get(id);
    return plan ? structuredClone(plan) : null;
  }

  async save(plan: Plan): Promise<void> {
    // เก็บสำเนา: ถ้าคนเรียกแก้ object เดิมทีหลัง ข้อมูลที่เก็บไว้ต้องไม่เปลี่ยนตาม
    this.plans.set(plan.id, structuredClone(plan));
  }

  async delete(id: string): Promise<void> {
    this.plans.delete(id);
  }
}
