# Checkpoints Log

บันทึกผลการตรวจ Checkpoint ทุกครั้ง (ดูวิธีใน PLAN.md ข้อ 9)
Gate มาตรฐาน: `npm run gate` (= lint + typecheck + test + build)

| CP | ชื่อ | สถานะ |
|---|---|---|
| CP-0 | โปรเจกต์พร้อม | ✅ PASSED |
| CP-1 | Entities ถูกต้อง | ✅ PASSED |
| CP-2 | ตัวเลขตรงกับเว็บต้นแบบ | ✅ PASSED |
| CP-3 | Use Cases ทำงานถูก | ✅ PASSED |
| CP-4 | บันทึกข้อมูลในเครื่องได้ | ✅ PASSED |
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

## CP-2 ตัวเลขตรงกับเว็บต้นแบบ
- วันที่: 2026-09-28
- ผู้ตรวจ: Claude (รอเจ้าของโปรเจกต์ตรวจซ้ำ)
- ไฟล์ที่สร้าง: `src/domain/services/amountInPeriod.ts`, `src/domain/services/summarize.ts`, `fixtures/reference-plan.json`
- Automated: ✅ `npm run gate` ผ่าน — test 88/88 (10 ไฟล์)
  - 🏆 Golden test ตรงทุกช่อง:

    | มุมมอง | รายได้ | รายจ่าย | ออม/ลงทุน | คงเหลือ |
    |---|---|---|---|---|
    | ชุด 1 · รายเดือน | 34,166.67 | 20,916.67 | 5,000.00 | 13,250.00 |
    | ชุด 1 · รายปี 2026 | 440,000.00 | 251,000.00 | 60,000.00 | 189,000.00 |
    | ชุด 1 · ก.ย.–พ.ย. 2026 | 132,500.00 | 62,750.00 | 15,000.00 | 69,750.00 |
    | ชุด 1 · รายปี 2027 | 410,000.00 | 251,000.00 | 60,000.00 | 159,000.00 |
    | ชุด 2 · รายเดือน | 34,166.67 | 22,916.67 | 7,000.00 | 11,250.00 |

  - % หมวดตรงต้นแบบ: จำเป็น 34.4%, ฟุ่มเฟือย 0%, ออม/ลงทุน 14.6%, ให้รางวัลตัวเอง 12.2%
  - กฎ R1–R11 มีเทสต์ครบ (R12 ทดสอบแล้วใน CP-1) รวมขอบของช่วงเวลา: วันแรก/วันสุดท้ายของช่วงนับ, ก่อน/หลัง 1 วันไม่นับ, ช่วงข้ามปี
  - Edge case: แผนว่าง → 0 ทั้งหมด, รายได้ 0 → % = 0 (ไม่เป็น NaN), คงเหลือติดลบได้, summarize ไม่แก้แผนต้นฉบับ
- 🧪 ทดสอบว่าเทสต์จับบั๊กได้จริง (mutation check): แก้สูตร R2 จาก `÷ 12` เป็น `÷ 10` ชั่วคราว → เทสต์ล้ม 13 ข้อ → คืนค่าเดิม → ผ่าน 88/88
- Manual: n/a (Phase นี้ไม่มี UI)
- หมายเหตุ: ตอนคืนค่าไฟล์หลัง mutation check ใช้ `git checkout` ไม่ได้ เพราะไฟล์ยังไม่ถูก commit → กู้จากไฟล์สำรองที่ทำไว้ก่อน (บทเรียน: สำรองไฟล์ หรือ commit ก่อนทดลองแก้เสมอ)
- สถานะ: **PASSED → อนุญาตเริ่ม Phase 3**

## CP-3 Use Cases ทำงานถูก
- วันที่: 2026-09-28
- ผู้ตรวจ: Claude (รอเจ้าของโปรเจกต์ตรวจซ้ำ)
- ไฟล์ที่สร้าง:
  - `src/application/ports/PlanRepository.ts` — Port (interface) ของที่เก็บแผน
  - `src/application/context.ts` (สร้าง id / อ่านเวลา), `src/application/result.ts` (ผลสำเร็จ/ไม่สำเร็จ)
  - `src/application/usecases/` — incomes, expenses, plans, normalize
  - `src/infrastructure/storage/InMemoryPlanRepository.ts` — Adapter ตัวแรก
  - `src/infrastructure/__tests__/planRepository.contract.ts` — ชุดเทสต์กลางของทุก Repository
- Automated: ✅ `npm run gate` ผ่าน — test 130/130 (14 ไฟล์)
  - `addIncome` → รายได้ +1 และแผนเดิมไม่ถูกแก้ (ทดสอบด้วย `deepFreeze` — ถ้าแอบแก้จะ throw)
  - `addIncome` amount ติดลบ → `{ ok: false, errors: [amount] }` แผนไม่เปลี่ยน
  - `removeExpenseItem` รายการสุดท้าย → กลุ่มยังอยู่ ยอดกลุ่ม = 0
  - `organizeExpenses` → essential → wants → investment → emergency → reward (หมวดเดียวกันคงลำดับเดิม)
  - `savePlan` → `loadPlan` → ได้ข้อมูลเท่ากัน, `listPlans` เรียงจากแก้ไขล่าสุด
  - Contract test 9 ข้อ ผ่านกับ `InMemoryPlanRepository` (รวม: get ไม่เจอ → null, save ซ้ำ = เขียนทับ, ของที่คืนเป็นสำเนา)
  - Architecture: ESLint ห้าม Application import React / Next / Firebase / Infrastructure / Presentation (5 กรณีต้องห้าม + 2 กรณีอนุญาต)
- 🧪 Mutation check: ทำให้ `addIncome` แอบ `push` เข้าแผนเดิม → เทสต์ล้ม 4 ข้อ (`object is not extensible`) → คืนไฟล์จากสำรอง → ผ่าน 130/130
- Manual: n/a (Phase นี้ไม่มี UI)
- หมายเหตุ / การตัดสินใจ:
  - Use case ที่แก้แผน คืนค่าเป็น `PlanResult` (`ok: true/false`) แทนการ throw → หน้าฟอร์มแสดง error ทุกช่องได้ง่าย
  - `UseCaseContext` (generateId, now) ถูกส่งเข้ามา → ในเทสต์ id เป็น `id-1, id-2, ...` และเวลาตายตัว
  - เพิ่มรายการย่อยแรกให้กลุ่ม → ลบ amount ของกลุ่มทิ้ง / ลบรายการย่อยสุดท้าย → กลุ่มได้ amount 0 รายเดือน
  - เปลี่ยนความถี่จาก "ครั้งเดียว" เป็นอย่างอื่น → ลบวันที่ทิ้งอัตโนมัติ
  - ไฟล์เทสต์ของ Application ได้รับยกเว้นกฎ ESLint เพราะต้องใช้ InMemory repository จริงในการทดสอบ
- สถานะ: **PASSED → อนุญาตเริ่ม Phase 4**

## CP-4 บันทึกข้อมูลในเครื่องได้
- วันที่: 2026-09-28
- ผู้ตรวจ: Claude (รอเจ้าของโปรเจกต์ตรวจซ้ำ)
- ไฟล์ที่สร้าง: `infrastructure/schemas/planSchema.ts` (Zod), `infrastructure/storage/LocalStoragePlanRepository.ts`, `infrastructure/schemas/planJson.ts`, `di/container.ts`
- Automated: ✅ `npm run gate` ผ่าน — test 155/155 (16 ไฟล์)
  - Contract test 9 ข้อชุดเดียวกับ CP-3 ผ่านกับ `LocalStoragePlanRepository` (jsdom)
  - `"{abc"` ใน localStorage → `list()` คืน `[]` ไม่ throw + เตือนใน console
  - มีแผนเสียปนกับแผนดี → ข้ามเฉพาะแผนที่เสีย, บันทึกใหม่ทับข้อมูลเสียได้
  - export → import → ได้แผนเท่าเดิม; ไฟล์ผิด 5 แบบ → ข้อความ error ภาษาไทย
  - `fixtures/reference-plan.json` ผ่าน Zod schema
- Manual: n/a (ยังไม่มี UI — จะตรวจการรีเฟรชหน้าแล้วข้อมูลยังอยู่ใน CP-5)
- หมายเหตุ: `di/container.ts` ถ้าไม่มี localStorage (ตอน build หรือเบราว์เซอร์บล็อก) จะใช้ InMemory แทน แอปไม่พัง
- สถานะ: **PASSED → อนุญาตเริ่ม Phase 5**
