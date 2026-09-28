/**
 * ActivePlanStore — จำว่า "แผนที่เปิดอยู่ล่าสุด" คือแผนไหน (เปิดแอปครั้งหน้าจะกลับมาที่แผนนี้)
 */
export interface ActivePlanStore {
  get(): string | null;
  set(planId: string): void;
}
