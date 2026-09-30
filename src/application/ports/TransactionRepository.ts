/**
 * TransactionRepository — Port ของที่เก็บ "รายการจริง" (แยกตามแผน — D11)
 *
 * ทำไมไม่เก็บรวมในเอกสารแผน? รายการจริงเพิ่มขึ้นทุกวัน (หลายพันรายการต่อปี)
 * ถ้าอยู่ในเอกสารเดียวกับแผน เอกสารจะใหญ่เรื่อยๆ และบันทึกทีต้องส่งทั้งก้อน
 *
 * list คืนทุกรายการของแผน (เป้าหมายต้องรวมยอดทุกรอบ) — การกรองตามรอบทำใน Domain
 * สำหรับการใช้ส่วนตัว (~ไม่กี่พันรายการ) ยังเร็วและไม่เกินโควตาฟรีของ Firestore
 *
 * ข้อตกลงเหมือน PlanRepository: save id เดิม = เขียนทับ, delete id ที่ไม่มี = ไม่ error, ของที่คืนเป็นสำเนา
 */
import type { Transaction } from "@/domain/entities/Transaction";

export interface TransactionRepository {
  list(planId: string): Promise<Transaction[]>;
  save(planId: string, transaction: Transaction): Promise<void>;
  delete(planId: string, transactionId: string): Promise<void>;
  /** ลบทุกรายการของแผน (ใช้ตอนลบแผน) */
  deleteAll(planId: string): Promise<void>;
}
