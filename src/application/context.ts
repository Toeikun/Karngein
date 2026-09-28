/**
 * UseCaseContext — สิ่งที่ Use Case ต้องใช้จาก "โลกภายนอก": สร้าง id และอ่านเวลาปัจจุบัน
 *
 * ทำไมไม่เรียก crypto.randomUUID() / new Date() ตรงๆ ใน use case?
 * → ในเทสต์เราส่ง context ปลอมที่ให้ id และเวลาแบบตายตัว ผลลัพธ์จึงคาดเดาได้ 100%
 */
export interface UseCaseContext {
  generateId: () => string;
  now: () => Date;
}

/** context จริงที่ใช้ในแอป */
export const systemContext: UseCaseContext = {
  generateId: () => crypto.randomUUID(),
  now: () => new Date(),
};
