# Checkpoints Log

บันทึกผลการตรวจ Checkpoint ทุกครั้ง (ดูวิธีใน PLAN.md ข้อ 9)
Gate มาตรฐาน: `npm run gate` (= lint + typecheck + test + build)

| CP | ชื่อ | สถานะ |
|---|---|---|
| CP-0 | โปรเจกต์พร้อม | ✅ PASSED |
| CP-1 | Entities ถูกต้อง | ✅ PASSED |
| CP-2 | ตัวเลขตรงกับเว็บต้นแบบ | 🔒 |
| CP-3 | Use Cases ทำงานถูก | 🔒 |
| CP-4 | บันทึกข้อมูลในเครื่องได้ | 🔒 |
| CP-5 | ใช้งานฟอร์มได้ | 🔒 |
| CP-6 | Sankey ถูกต้อง | 🔒 |
| CP-7 | จัดการหลายแผนได้ | 🔒 |
| CP-8 | Login และ Sync ข้ามเครื่องได้ | 🔒 |
| CP-9 | พร้อมใช้บนมือถือและคอมฯ | 🔒 |
| CP-10 | ออนไลน์ | 🔒 |

---

## CP-0 โปรเจกต์พร้อม
- วันที่: 2026-09-26
- ผู้ตรวจ: Claude (รอเจ้าของโปรเจกต์ตรวจซ้ำ)
- Automated:
  - ✅ `npm run gate` ผ่าน — lint ✔, typecheck ✔, test 2/2 ✔ (`sanity 1+1=2`, render หน้าแรก), build ✔
  - ✅ `npm run build` สร้าง `out/index.html`
  - ✅ build ด้วย `NEXT_PUBLIC_BASE_PATH=/karngein` → ลิงก์ JS เป็น `/karngein/_next/...` (พร้อมสำหรับ GitHub Pages)
- Manual:
  - ✅ `npm run dev` → http://localhost:3000 แสดงหัวข้อ "Karngein" สี indigo, พื้นหลัง slate-50, ฟอนต์ Noto Sans Thai, ไม่มี error ใน console
- หมายเหตุ (ปัญหาที่เจอ + วิธีแก้):
  1. `tsc` หา `LayoutProps` ไม่เจอ → type นี้ Next.js สร้างให้ จึงเปลี่ยน script เป็น `next typegen && tsc --noEmit`
  2. jsdom 27 ต้องใช้ Node ≥ 20.19 แต่เครื่องนี้เป็น 20.18.1 → ล็อก jsdom 26 (ถ้าอัปเกรด Node เป็น 22 LTS แล้วค่อยอัปเกรด jsdom ได้)
  3. Next.js เตือนเพราะเจอ `package-lock.json` ในโฟลเดอร์ home → ตั้ง `turbopack.root` ให้เป็นโฟลเดอร์โปรเจกต์
- สถานะ: **PASSED → อนุญาตเริ่ม Phase 1**

## CP-1 Entities ถูกต้อง
- วันที่: 2026-09-28
- ผู้ตรวจ: Claude (รอเจ้าของโปรเจกต์ตรวจซ้ำ)
- ไฟล์ที่สร้าง: `src/domain/entities/` — Money, Frequency, Category, validation, Income, Expense, Period, Plan
- Automated: ✅ `npm run gate` ผ่าน — test 56/56 (8 ไฟล์)
  - Money: `formatBaht(0)="฿0.00"`, `formatBaht(1234.5)="฿1,234.50"`, `formatBaht(-500)="-฿500.00"`, `round2(1.005)=1.01`
  - Income: amount ติดลบ/NaN → error, one-time ไม่มีวันที่ หรือวันที่ไม่มีจริง (2027-02-30) → error, ผิดหลายช่องได้ error ครบ
  - Expense: กลุ่มไม่มีรายการย่อยต้องมี amount ของตัวเอง, error รายการย่อยระบุแถว (`items.1.amount`)
  - Category: 5 หมวดเรียงตามข้อ 8.2, หมวดเงินออม = investment + emergency
  - Period: ปีเริ่มต้น 2027, นับเดือนข้ามปีถูก, ช่วงที่สิ้นสุดก่อนเริ่มไม่ผ่าน
  - Plan: `createEmptyPlan` ได้ array ว่าง และเป็น pure function (รับ id/เวลาจากภายนอก)
  - Architecture: ESLint ห้าม `src/domain/` import react / next / firebase / ชั้นอื่น (ทดสอบ 7 กรณีต้องห้าม + 2 กรณีที่อนุญาต)
- Manual: n/a (Phase นี้ไม่มี UI)
- หมายเหตุ:
  - `createEmptyPlan` รับ `id` และ `now` จากภายนอก แทนการสุ่ม/อ่านนาฬิกาเอง → Domain คงความเป็น pure function (การสร้าง id ย้ายไปอยู่ชั้น Application)
  - ลบเทสต์ตัวอย่าง `sanity 1+1=2` ออก เพราะมีเทสต์จริงแทนแล้ว
- สถานะ: **PASSED → อนุญาตเริ่ม Phase 2**
