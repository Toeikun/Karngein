/**
 * Presets — แม่แบบข้อมูลตั้งต้น 4 แบบ (ตัวเลขเป็นตัวอย่างประมาณการ ผู้ใช้แก้ต่อได้)
 */
import type { ExpenseGroupInput } from "../usecases/expenses";
import type { IncomeInput } from "../usecases/incomes";

export type PresetId = "salaryman" | "student" | "family" | "freelance";

export interface Preset {
  id: PresetId;
  label: string;
  incomes: IncomeInput[];
  expenses: ExpenseGroupInput[];
}

const m = (name: string, amount: number) => ({ name, amount, frequency: "monthly" as const });
const y = (name: string, amount: number) => ({ name, amount, frequency: "yearly" as const });
/** กลุ่มที่ไม่มีรายการย่อย ใช้แค่ "จำนวน + ความถี่" (ไม่เอาชื่อ ไม่งั้นจะทับชื่อกลุ่ม) */
const own = ({ amount, frequency }: { amount: number; frequency: "monthly" | "yearly" }) => ({ amount, frequency });

export const PRESETS: readonly Preset[] = [
  {
    id: "salaryman",
    label: "มนุษย์เงินเดือน",
    incomes: [m("เงินเดือน", 30000), y("โบนัสประจำปี", 60000)],
    expenses: [
      { name: "รายจ่ายประจำ", category: "essential", items: [m("ค่าเช่าที่พัก", 8000), m("ค่าอาหาร", 7000), m("ค่าเดินทาง", 2500), m("ค่าโทรศัพท์/อินเทอร์เน็ต", 800), m("ประกันสังคม", 750)] },
      { name: "ใช้จ่ายตามใจ", category: "wants", items: [m("ช้อปปิ้ง", 2000), m("สตรีมมิ่ง", 400)] },
      { name: "การลงทุน", category: "investment", items: [m("DCA กองทุนรวม", 3000), m("กองทุนสำรองเลี้ยงชีพ", 1500)] },
      { name: "เงินสำรองฉุกเฉิน", category: "emergency", ...own(m("เงินสำรองฉุกเฉิน", 2000)) },
      { name: "ท่องเที่ยวประจำปี", category: "reward", ...own(y("ท่องเที่ยวประจำปี", 30000)) },
    ],
  },
  {
    id: "student",
    label: "นักเรียน/นักศึกษา",
    incomes: [m("ค่าขนมจากผู้ปกครอง", 8000), m("งานพิเศษ", 2000)],
    expenses: [
      { name: "รายจ่ายประจำ", category: "essential", items: [m("ค่าอาหาร", 4500), m("ค่าเดินทาง", 1000), m("ค่าโทรศัพท์", 300), y("อุปกรณ์การเรียน", 3000)] },
      { name: "ใช้จ่ายตามใจ", category: "wants", items: [m("กินเที่ยวกับเพื่อน", 1500), m("เกม/สตรีมมิ่ง", 200)] },
      { name: "เงินเก็บ", category: "investment", ...own(m("ออมเงิน", 1000)) },
      { name: "เงินสำรองฉุกเฉิน", category: "emergency", ...own(m("เงินสำรองฉุกเฉิน", 500)) },
    ],
  },
  {
    id: "family",
    label: "ครอบครัว",
    incomes: [m("เงินเดือน (คนที่ 1)", 35000), m("เงินเดือน (คนที่ 2)", 28000), y("โบนัสรวม", 80000)],
    expenses: [
      { name: "บ้านและรถ", category: "essential", items: [m("ผ่อนบ้าน", 15000), m("ผ่อนรถ", 9000), m("ค่าน้ำ/ไฟ/อินเทอร์เน็ต", 3000)] },
      { name: "ค่าครองชีพ", category: "essential", items: [m("ค่าอาหาร", 12000), m("ค่าเดินทาง", 4000), y("ค่าเทอมลูก", 40000), y("ประกันสุขภาพ", 24000)] },
      { name: "ใช้จ่ายตามใจ", category: "wants", ...own(m("ช้อปปิ้ง/ร้านอาหาร", 4000)) },
      { name: "การลงทุน", category: "investment", items: [m("DCA กองทุนรวม", 5000), m("กองทุนการศึกษาลูก", 3000)] },
      { name: "เงินสำรองฉุกเฉิน", category: "emergency", ...own(m("เงินสำรองฉุกเฉิน", 4000)) },
      { name: "เที่ยวครอบครัว", category: "reward", ...own(y("เที่ยวครอบครัว", 40000)) },
    ],
  },
  {
    id: "freelance",
    label: "ฟรีแลนซ์",
    incomes: [m("ลูกค้าประจำ", 25000), y("โปรเจกต์ใหญ่", 120000)],
    expenses: [
      { name: "รายจ่ายประจำ", category: "essential", items: [m("ค่าเช่าที่พัก", 7000), m("ค่าอาหาร", 6000), m("อินเทอร์เน็ต/ซอฟต์แวร์", 1500), y("ภาษีเงินได้", 30000), y("ประกันสุขภาพ", 18000)] },
      { name: "ใช้จ่ายตามใจ", category: "wants", ...own(m("คาเฟ่/ช้อปปิ้ง", 2000)) },
      { name: "การลงทุน", category: "investment", items: [m("กองทุน SSF/RMF", 3000), m("DCA หุ้น", 2000)] },
      { name: "เงินสำรองฉุกเฉิน", category: "emergency", ...own(m("เงินสำรองฉุกเฉิน (รายได้ไม่แน่นอน)", 5000)) },
      { name: "อุปกรณ์ทำงาน", category: "reward", ...own(y("อัปเกรดอุปกรณ์ทำงาน", 20000)) },
    ],
  },
];

export function getPreset(id: PresetId): Preset {
  const preset = PRESETS.find((p) => p.id === id);
  if (!preset) throw new Error(`ไม่รู้จัก preset: ${id}`);
  return preset;
}
