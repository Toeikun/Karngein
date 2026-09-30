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
| CP-5 | ใช้งานฟอร์มได้ | ✅ PASSED |
| CP-6 | Sankey ถูกต้อง | ✅ PASSED |
| CP-7 | จัดการหลายแผนได้ | ✅ PASSED |
| CP-8 | Login และ Sync ข้ามเครื่องได้ | ✅ PASSED (ข้อ 2 มือถือ → ตรวจใน CP-10) |
| CP-9 | พร้อมใช้บนมือถือและคอมฯ | ✅ PASSED (ติดตั้งบนมือถือจริง → ตรวจใน CP-10) |
| CP-10 | ออนไลน์ | ✅ PASSED |
| CP-11.1 | Domain: รอบเงินเดือน / รายการจริง / เป้าหมาย | ✅ PASSED |
| CP-11.2 | เก็บข้อมูล + ไฟล์สำรอง v2 | ✅ PASSED |
| CP-11.3 | หน้า "บันทึกจริง" | ⏳ |
| CP-11.4 | หน้า "เป้าหมาย" | 🔒 |
| CP-11.5 | ขัดเกลา + deploy | 🔒 |

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

## CP-5 ใช้งานฟอร์มได้
- วันที่: 2026-09-28
- ผู้ตรวจ: Claude (รอเจ้าของโปรเจกต์ตรวจซ้ำ)
- ไฟล์ที่สร้าง: `src/presentation/` — hooks/usePlan, components (Header, SummaryCards, PeriodSwitcher, IncomeList/Row, ExpenseList/GroupRow/ItemRow, ui/*), styles/categoryStyles, utils/parseAmount
- Automated: ✅ `npm run gate` ผ่าน — test 179/179 (17 ไฟล์)
  - RTL: กด "+ เพิ่มรายได้" → พิมพ์ชื่อ + จำนวน → แถวใหม่ + การ์ดรายได้รวมเปลี่ยน
  - RTL: เปลี่ยนความถี่ 50,000 เป็นรายปี → ฿4,166.67
  - RTL: เลือก "ครั้งเดียว" → ช่องวันที่ปรากฏ
  - RTL: พิมพ์ -100 / abc → เตือน ตัวเลขไม่เปลี่ยน, ออกจากช่อง → กลับค่าเดิม; ลบชื่อจนว่าง → เตือน
  - RTL: Golden Data รายเดือน + รายปี 2026 ตรงทุกการ์ด, เพิ่มรายการย่อย / เปลี่ยนหมวด → ยอดอัปเดต
  - RTL: บันทึกอัตโนมัติภายใน ~1 วินาที สถานะ "กำลังบันทึก…" → "บันทึกแล้ว"
- Manual (Browser pane, `npm run dev`):
  1. ✅ ป้อน Golden Data ด้วยมือผ่านหน้าจอ → `฿34,166.67 / ฿20,916.67 / ฿5,000.00 / ฿13,250.00` (ยอดกลุ่ม 11,750 / 5,000 / 4,166.67)
  2. ✅ ดูรายปี เลือก 2026 → `฿440,000.00 / ฿251,000.00 / ฿60,000.00 / ฿189,000.00`
  3. ✅ รีเฟรชหน้า → ข้อมูลยังอยู่ครบ
  4. ✅ จอ 375px → ไม่มี scroll แนวนอน, ปุ่ม/ช่องกรอกสูง ≥ 44px ทุกตัว (หลังแก้)
  5. ✅ พิมพ์ -100 → ข้อความ "ใส่ได้เฉพาะตัวเลขตั้งแต่ 0 ขึ้นไป…" ยอดไม่เปลี่ยน → ออกจากช่องกลับเป็น 30,000
  - ไม่มี error ใน console
- 🐞 บั๊กที่เจอระหว่างตรวจ Manual และแก้แล้ว:
  1. **เปิดครั้งแรกได้แผนว่างซ้ำ 2 แผน** — โหมด dev ของ React (StrictMode) รัน effect โหลดข้อมูล 2 รอบ ทั้งสองรอบเห็นว่ายังไม่มีแผน จึงสร้างคนละแผน
     → แก้: เช็ค `cancelled` ก่อนสร้างแผน + เพิ่มเทสต์ StrictMode (ล้มก่อนแก้ ผ่านหลังแก้) + ตรวจซ้ำในเบราว์เซอร์: เปิดครั้งแรกได้ 1 แผน
  2. ป้ายสถานะ "บันทึกแล้ว" ตัดเป็น 2 บรรทัดบนมือถือ → `whitespace-nowrap`
  3. ป้ายหมวด / ปุ่มเพิ่มรายการย่อย / แท็บมุมมอง สูง 36–40px (ต่ำกว่า 44px ตามแผน) → ปรับเป็น 44px
- หมายเหตุ:
  - "+ เพิ่มรายได้/รายจ่าย/รายการย่อย" สร้างแถวค่าเริ่มต้น (ชื่อ "…ใหม่", 0 บาท, รายเดือน) แล้วแก้ในแถวได้ทันที แบบเดียวกับเว็บต้นแบบ
  - ช่องกรอกบันทึกทันทีเมื่อข้อมูลถูกต้อง ถ้าผิดจะเตือนและไม่บันทึก ออกจากช่องแล้วกลับเป็นค่าล่าสุดที่ถูกต้อง
  - ตั้ง `cleanup()` ใน `vitest.setup.ts` เพราะไม่ได้เปิด globals ของ Vitest (ไม่งั้นหน้าจอของเทสต์ก่อนหน้าค้าง)
  - มุมมอง "กำหนดช่วง" ยังไม่มีใน UI (อยู่ใน Phase 7 ตามแผน)
- สถานะ: **PASSED → อนุญาตเริ่ม Phase 6**

## CP-6 Sankey ถูกต้อง
- วันที่: 2026-09-28
- ผู้ตรวจ: Claude (รอเจ้าของโปรเจกต์ตรวจซ้ำ)
- ไฟล์ที่สร้าง: `domain/services/buildFlowGraph.ts`, `presentation/components/flow/` (SankeyChart, FlowToolbar, FlowSection, flowColors), `presentation/components/ratio/CategoryRatioCards.tsx`, `presentation/utils/periodLabel.ts`
- Automated: ✅ `npm run gate` ผ่าน — test 200/200 (19 ไฟล์)
  - `buildFlowGraph(golden, monthly)`: เงินกองกลาง 34,166.67, เงินคงเหลือ 13,250, ผลรวมเส้นเข้า/ออกของทุกโหนด = ค่าโหนด
  - % ทุกโหนดตรงต้นแบบ: เงินเดือน 87.8, โบนัส 12.2, จำเป็น 34.4, ประกันสังคม 2.2, ค่าอาหาร 23.4, ค่าเดินทาง 8.8, ออม 14.6, ให้รางวัล 12.2, คงเหลือ 38.8
  - รายจ่าย > รายได้ → มีโหนด "เงินขาด" 10,916.67 และกราฟสมดุล
  - ยุบกลุ่ม → ไม่มีโหนดรายการย่อย / ซ่อนหมวด → ไม่มีโหนดหมวดนั้น
  - RTL: สลับป้าย %/฿/ไม่แสดง, ปิด-เปิดหมวด, ยุบ-ขยายกลุ่ม, ซูม, หมายเหตุ one-time, การ์ดสัดส่วน 5 หมวด
- Manual (Browser pane):
  1. ✅ % บนกราฟตรงต้นแบบทุกโหนด
  2. ✅ "ตัวเลข (฿)" → เงินกองกลาง ฿34,166.67 / "ไม่แสดง" → เหลือแต่ชื่อ
  3. ✅ ปิด "ให้รางวัลตัวเอง" → โหนดหาย, เปิด → กลับมา
  4. ✅ "บันทึกรูป" → PNG 1984×760 (ความละเอียด 2 เท่า) เห็นกราฟครบพร้อมชื่อแผนและมุมมองเวลา
  5. ✅ จอ 375px → กราฟเลื่อนซ้าย-ขวาในกรอบ (กว้าง 992px ในกรอบ 309px) หน้าไม่ล้น ปุ่มสูง ≥ 44px
  6. ✅ คลิกเมาส์จริงที่กลุ่ม "รายจ่ายหลัก" → ยุบ (▸) รายการย่อยหาย
- 🐞 ปัญหาที่เจอระหว่างตรวจ Manual และแก้แล้ว:
  1. ป้ายคอลัมน์กลางทับกัน ("รายจ่ายจำเป็น 34.4%" ชน "▾ รายจ่ายหลัก") → วางป้ายขวาโหนดเสมอ + เว้นที่ขวา + ขอบขาวรอบตัวอักษร → ตรวจแล้วไม่มีป้ายทับกัน (0 คู่)
  2. ในไฟล์ PNG ป้ายขวาสุด "Lifestyle & ท่องเที่ยว 12.2%" ถูกตัด (ตัวอักษรในรูปกว้างกว่าบนจอ) → เพิ่มพื้นที่ขวาเป็น 240px
  3. ปุ่มเลือกป้ายสูง 36px บนมือถือ → 44px
  4. ปุ่มยุบในผังกับปุ่มยุบในฟอร์มชื่อซ้ำกัน ("ยุบ รายจ่ายหลัก") → screen reader แยกไม่ออก → เปลี่ยนเป็น "ยุบในผัง …"
- หมายเหตุ: ยุบกลุ่มแล้วโหนดกลุ่มย้ายไปคอลัมน์ขวาสุด (d3-sankey วางโหนดที่ไม่มีเส้นออกไว้คอลัมน์สุดท้าย) — เป็นพฤติกรรมปกติของ layout
- สถานะ: **PASSED → อนุญาตเริ่ม Phase 7**

## CP-7 จัดการหลายแผนได้
- วันที่: 2026-09-28
- ผู้ตรวจ: Claude (รอเจ้าของโปรเจกต์ตรวจซ้ำ)
- ไฟล์ที่สร้าง/แก้:
  - Application: `presets/presets.ts` (4 แม่แบบ), `usecases/presets.ts` (applyPreset), `usecases/plans.ts` (+ renamePlan, copyImportedPlan), `ports/ActivePlanStore.ts`
  - Infrastructure: `storage/LocalStorageActivePlanStore.ts` (จำแผนล่าสุด), `di/container.ts` (+ activePlanStore, planFileFormat)
  - Presentation: `hooks/usePlan.ts` (หลายแผน), `components/plan/PlanBar.tsx`, `components/preset/PresetBar.tsx`, `components/period/PeriodSwitcher.tsx` (+ กำหนดช่วง), `utils/download.ts`, `utils/readText.ts`
- Automated: ✅ `npm run gate` ผ่าน — test 222/222 (22 ไฟล์)
  - `applyPreset` ทุกแบบ → ผ่าน Zod schema, summarize ไม่เป็น NaN, ชื่อกลุ่มไม่ถูกทับ, id/ชื่อแผนคงเดิม
  - ช่วงเวลาผิด (สิ้นสุดก่อนเริ่ม) → ข้อความเตือน และตัวเลขยังเป็นช่วงล่าสุดที่ถูกต้อง
  - RTL: 2 แผนไม่ปนกัน, เปิดแอปใหม่ได้แผนล่าสุด, export → ลบ → import ได้ข้อมูลครบ, ไฟล์ผิด → error ภาษาไทย, ยกเลิกการลบ/แม่แบบ → ไม่เปลี่ยน
- Manual (Browser pane):
  1. ✅ เปลี่ยนชื่อแผนเดิมเป็น "แผน Golden (ต้นแบบ)" → สร้างแผนใหม่ → ใช้แม่แบบ "ฟรีแลนซ์" → สลับไปมา: Golden `฿34,166.67 / ฿20,916.67 / ฿5,000.00 / ฿13,250.00` / ฟรีแลนซ์ `฿35,000.00 / ฿32,166.67 / ฿10,000.00 / ฿2,833.33` ไม่ปนกัน
  2. ✅ รีเฟรช → 2 แผนยังอยู่ และเปิดแผนล่าสุดที่ใช้
  3. ✅ ส่งออก JSON (`karngein-แผนของฉัน-2026-09-28.json`, 2.8 KB) → ลบแผน (กล่องยืนยันแสดงชื่อแผน) → นำเข้าไฟล์ → ได้ "แผนของฉัน (นำเข้า)" ตัวเลขครบ
     (ตอนตรวจ: ดักไฟล์ในหน้าเว็บแทนการดาวน์โหลดจริง และตอบ "ตกลง" ในกล่องยืนยันด้วยสคริปต์ เพราะเครื่องมือทดสอบกดกล่องยืนยันของเบราว์เซอร์ไม่ได้)
  4. ✅ ก.ย.–พ.ย. 2026 กับ Golden Data → `฿132,500.00 / ฿62,750.00 / ฿15,000.00 / ฿69,750.00`; เลือกสิ้นสุด ส.ค. → เตือน ตัวเลขไม่เปลี่ยน
  5. ✅ จอ 375px ไม่มี scroll แนวนอน ทุกปุ่ม ≥ 44px
- 🐞 ปัญหาที่เจอและแก้แล้ว:
  1. แม่แบบ: กลุ่มที่ไม่มีรายการย่อยถูกชื่อรายการทับชื่อกลุ่ม (เช่น "ใช้จ่ายตามใจ" กลายเป็น "ช้อปปิ้ง/ร้านอาหาร") → ใช้ helper `own()` + เทสต์กันไว้
  2. `file.text()` / `blob.text()` ไม่มีใน jsdom (และ Safari < 14) → ใช้ FileReader (`utils/readText.ts`)
  3. มือถือ: dropdown เลือกแผนแคบจนเหลือ "แผ…" → ให้ dropdown เต็มแถว ปุ่มขึ้นบรรทัดใหม่
- หมายเหตุ:
  - แผนที่นำเข้าได้ id ใหม่เสมอ (ไม่เขียนทับแผนที่มีอยู่) และต่อท้ายชื่อ "(นำเข้า)"
  - การยืนยันก่อนลบ/ก่อนใช้แม่แบบ ใช้ `window.confirm` (เรียบง่ายสำหรับรอบแรก)
- สถานะ: **PASSED → อนุญาตเริ่ม Phase 8 (Firebase — ต้องให้เจ้าของโปรเจกต์ตั้งค่า Firebase Console ก่อน)**

## CP-8 Login และ Sync ข้ามเครื่องได้
- วันที่: 2026-09-29
- การตั้งค่า: Firebase `karngein-1eef7` (Spark), Firestore `asia-southeast3` (Bangkok), Google Login เปิดแล้ว, Authorized domains: localhost + toeikun.github.io
- ไฟล์ที่สร้าง:
  - Application: `ports/AuthService.ts`, `usecases/migrateGuestPlans.ts`
  - Infrastructure: `firebase/firebaseApp.ts`, `firebase/FirestorePlanRepository.ts`, `firebase/FirebaseAuthService.ts`
  - Presentation: `hooks/useAuth.ts`, `hooks/useOnlineStatus.ts`, `hooks/useIsClient.ts`, `components/layout/AccountMenu.tsx`, `components/PlanWorkspace.tsx`, `components/KarngeinApp.tsx` (เลือกที่เก็บตามสถานะล็อกอิน)
  - `firestore.rules`, `firebase.json`, `vitest.firebase.config.mts`, `.github/workflows/ci.yml`, `.env.example`
- Automated (ในเครื่อง): ✅ `npm run gate` ผ่าน — test 241/241 (24 ไฟล์)
  - ย้ายแผน Guest: 2 แผน → ย้ายครบ, id ซ้ำเลือก updatedAt ใหม่กว่า, ย้ายแล้วไม่ถามซ้ำ, แผนว่างไม่ถาม
  - RTL (AuthService ปลอม): ล็อกอิน → ถามย้าย → ย้าย/ไม่ย้าย, ออกจากระบบ → กลับข้อมูลในเครื่อง, ล็อกอินผิดพลาด → ข้อความไทย, ไม่ตั้งค่า Firebase → ไม่มีปุ่มล็อกอิน
  - Architecture: `firebase` import ได้เฉพาะใน `src/infrastructure/`, Presentation import Infrastructure ตรงๆ ไม่ได้
- Automated [CI] (GitHub Actions): ✅ CI run #1 (commit 6982628) เขียว ใช้เวลา 1m 50s — job `gate` + job `firebase` ผ่านทั้งคู่
  (vitest ล้มเองถ้าไม่พบไฟล์เทสต์ และ `firebase emulators:exec` ล้มถ้าเทสต์ล้ม → run เขียว = เทสต์ Firestore ชุดนี้รันและผ่านจริง)
  - Contract test 9 ข้อ กับ `FirestorePlanRepository` บน Emulator
  - Rules: alice อ่าน/เขียนของตัวเองได้, อ่าน/เขียนของ bob ไม่ได้, ไม่ล็อกอินทำอะไรไม่ได้, path อื่นปิดหมด
- Manual (ทำแล้วบางส่วน):
  - ✅ มีปุ่ม "เข้าสู่ระบบด้วย Google" เมื่อมี `.env.local`
  - ✅ กดปุ่ม → เรียก `karngein-1eef7.firebaseapp.com` (config ถูก) — Browser pane บล็อก popup ที่ไม่ได้มาจากผู้ใช้ → แสดงข้อความ "เบราว์เซอร์บล็อกหน้าต่างเข้าสู่ระบบ…" ถูกต้อง
  - ⏳ ขั้นตอนที่ต้องล็อกอินจริง — เจ้าของโปรเจกต์ต้องทำเอง (ข้อ 1–4 ใน PLAN.md CP-8)
- 🐞 ปัญหาที่เจอและแก้แล้ว:
  0. push ไม่ผ่าน "Can't push refs… Try Pull" → สาเหตุจริง: token ไม่มีสิทธิ์ **Workflows** (GitHub ไม่ยอมให้ push ไฟล์ `.github/workflows/*`) → เพิ่มสิทธิ์ Workflows: Read and write ให้ token เดิม → push ผ่าน (บทเรียน: ข้อความของ IDE อาจไม่ตรงสาเหตุ ให้ดูข้อความจาก `git push` ใน terminal)
  0.1 ล็อกอินจริงแล้วขึ้น "Missing or insufficient permissions" → กฎใน Firebase Console ยังเป็นค่าเริ่มต้นของ production mode (ปฏิเสธทุกอย่าง) → วางกฎจาก `firestore.rules` แล้ว Publish → ใช้งานได้
      (บทเรียน: เทสต์ใน CI ใช้ไฟล์ `firestore.rules` ของโปรเจกต์ ไม่ใช่กฎที่ใช้งานจริงใน Console — ต้องทำให้ตรงกันเสมอ, Phase 10 จะให้ deploy กฎจากไฟล์)
      และแก้โค้ด: ถ้าคลาวด์ปฏิเสธ หน้าจอแสดง "โหลดแผนไม่สำเร็จ" + สาเหตุภาษาไทย แทนการค้าง (commit a18372b)
  1. ผู้ใช้ใหม่ที่ยังไม่กรอกอะไรเลย ล็อกอินแล้วถูกถาม "พบแผนในเครื่อง 1 แผน" (แผนว่างที่แอปสร้างให้อัตโนมัติ) → ไม่ย้ายแผนว่าง + เทสต์
  2. ESLint pattern `firebase/*` ไปจับ `@/infrastructure/firebase/...` ด้วย → ใช้ regex `^firebase(/.*)?$`
  3. Hydration failed: HTML ตอน build (ไม่มี Firebase) ต่างจากในเบราว์เซอร์ (มีปุ่มล็อกอิน) → `useIsClient` ให้ render แรกเหมือนกัน → ตรวจซ้ำแล้วไม่มี error
- หมายเหตุ: `npm audit` พบ 7 moderate ใน `uuid` ที่ firebase-tools ใช้ (เครื่องมือ dev ไม่ได้อยู่ในเว็บจริง) — ยังไม่แก้

## CP-6 (แก้ตามคำขอหลังผ่านแล้ว) — เรียงโหนด Sankey ตามหมวด
- วันที่: 2026-09-30
- ปัญหา (ผู้ใช้แจ้ง): คอลัมน์รายการย่อยเรียงสลับหมวด เช่น "ค่าโทรศัพท์" (จำเป็น) อยู่ใต้ "ช้อปปิ้ง" (ฟุ่มเฟือย) → เส้นตัดกัน อ่านยาก
- สาเหตุ: d3-sankey ค่าเริ่มต้นจัดลำดับโหนดใหม่เองเพื่อลดเส้นตัด
- แก้: `nodeSort(null)` + `linkSort(null)` ใช้ลำดับจาก buildFlowGraph (หมวด → กลุ่ม → รายการ) ตรงกับลำดับสีในแถบหมวด
- เทสต์ใหม่: ทุกคอลัมน์เรียงจากบนลงล่างตามลำดับของ buildFlowGraph (ล้มก่อนแก้ ผ่านหลังแก้) — gate 243/243
- Manual: แม่แบบ "มนุษย์เงินเดือน" → คอลัมน์ขวาเรียง ฟ้า → ส้ม → เขียว → ม่วง → แดง → เทา ไม่ปนกัน ✅

### CP-8 ผลตรวจ Manual (เจ้าของโปรเจกต์ตรวจ — 2026-09-30)
- ✅ ข้อ 1 Guest → ล็อกอิน Google → ย้ายแผน → เห็นแผนใน Firestore (`users/<uid>/plans/<id>`)
- ✅ ข้อ 3 ปิด Wi-Fi → แก้ตัวเลข → ป้าย "ออฟไลน์ · บันทึกในเครื่องแล้ว" → เปิด Wi-Fi → รีเฟรช → ตัวเลขใหม่ยังอยู่
- ✅ ข้อ 4 ออกจากระบบ → กลับไปข้อมูลในเครื่อง ไม่เห็นข้อมูลคลาวด์
- ⏭ ข้อ 2 (มือถือเห็นข้อมูลเดียวกับคอมฯ) → ย้ายไปตรวจใน CP-10 เพราะต้อง deploy ก่อน (ตกลงกับเจ้าของโปรเจกต์แล้ว)
- สถานะ: **PASSED → อนุญาตเริ่ม Phase 9**

## CP-9 พร้อมใช้บนมือถือและคอมฯ
- วันที่: 2026-09-30
- ผู้ตรวจ: Claude (รอเจ้าของโปรเจกต์ตรวจซ้ำ)
- ไฟล์ที่สร้าง/แก้:
  - PWA: `src/app/manifest.ts` (ใส่ basePath), `public/sw.js` (Service Worker), `presentation/components/ServiceWorkerRegistration.tsx`, `public/icons/*` (สร้างด้วย `scripts/generate-icons.mjs`), metadata iOS + theme-color ใน `app/layout.tsx`
  - โลโก้ใหม่ "เงินหลายทางไหลมารวมกัน" (โลโก้เดิมดูเหมือนหน้าคนหน้าบึ้ง) ใช้ทั้ง Header และไอคอนแอป
  - Performance: `infrastructure/firebase/firebaseConfig.ts` + `lazyFirebase.ts` (โหลด Firebase แบบ lazy), ป้าย "เคยล็อกอิน" (`probablySignedIn`) ให้ผู้ใช้ Guest ไม่ต้องรอ Firebase
  - E2E: `playwright.config.ts`, `tests/e2e/main-flow.spec.ts`, `tests/e2e/pwa.spec.ts`, `scripts/serve-out.mjs` (เสิร์ฟ out/ + gzip แบบ GitHub Pages), `scripts/lighthouse.sh`
  - CI: เพิ่ม job `e2e` ใน `.github/workflows/ci.yml`
- Automated:
  - ✅ `npm run gate` — test 244/244 (24 ไฟล์)
  - ✅ E2E 8/8 (มือถือ Pixel 7 + เดสก์ท็อป) ทั้ง build แบบ Guest และแบบมี Firebase:
    - flow หลัก: แม่แบบมนุษย์เงินเดือน (฿35,000 / ฿30,450) → เพิ่มรายจ่าย 1,000 (฿31,450) → รายปี 2027 (฿420,000 / ฿377,400) → รีโหลด → ข้อมูลยังอยู่
    - ไม่มี scroll แนวนอน, ปุ่ม/ช่องกรอก ≥ 44px
    - manifest ครบ (standalone, ไอคอน 192/512 เป็น PNG จริง)
    - ปิดเน็ต (offline) แล้วรีโหลด → หน้าเว็บยังเปิดได้ และเห็นข้อมูลล่าสุด (฿69,666.67)
  - 🧪 Mutation check: ปิดการลงทะเบียน Service Worker ชั่วคราว → เทสต์ออฟไลน์ล้ม → คืนค่า → ผ่าน 8/8
  - ✅ Lighthouse มือถือ (build แบบมี Firebase, gzip): **Performance 86, Accessibility 100**, Best Practices 100, SEO 100 — วัด 3 รอบได้ค่าเดิม
- Manual:
  - ✅ build ด้วย basePath `/Karngein` → manifest, ไอคอน, apple-touch-icon, theme-color มี `/Karngein` ถูกต้อง
  - ✅ dev server: โลโก้ใหม่, ปุ่มล็อกอิน, ไม่มี error ใน console, dev ไม่ลงทะเบียน Service Worker (ตั้งใจ)
  - ⏭ ติดตั้งแอปบน Android / iPhone และเปิดจากไอคอนตอนออฟไลน์ → ตรวจใน CP-10 (ต้อง deploy ก่อน มือถือเปิด localhost ไม่ได้)
- 🐞 ปัญหาที่เจอและแก้แล้ว:
  1. Lighthouse Performance 75–82 (ต่ำกว่าเป้า 85): Firebase SDK ~1 MB อยู่ใน JS ก้อนแรกแม้ไม่ล็อกอิน (919 KB ไม่ถูกใช้) → โหลดแบบ lazy + ผู้ใช้ Guest ไม่ต้องรอ Firebase → 86
  2. Accessibility: ตัวอักษรการ์ดสรุป (opacity 80%) และปุ่มป้ายที่ไม่ได้เลือกสีจางเกิน (contrast 3.55–4.43 < 4.5) → ปรับสีเข้มขึ้น
  3. ปุ่มรีเซ็ตซูม: ตัวอักษรบนปุ่ม "100%" ไม่อยู่ในชื่อสำหรับ screen reader "รีเซ็ตซูม" → ชื่อเป็น "100% รีเซ็ตซูม"
  4. `metadata.icons` ทับไอคอนอัตโนมัติจาก `app/icon.png` → กำหนดไอคอนแท็บใน metadata โดยตรง
  5. โลโก้เดิมดูเหมือนหน้าคนหน้าบึ้ง → ออกแบบใหม่
- หมายเหตุ:
  - E2E ในเครื่องใช้ Chrome ที่มีอยู่แล้ว ไม่ดาวน์โหลดเบราว์เซอร์ของ Playwright (เครื่องบริษัท)
  - Lighthouse รันด้วย `npx lighthouse@12` (อยู่ใน cache ของ npm ไม่ได้ติดตั้งลงระบบ)
  - วัด Lighthouse ในเครื่อง — จะวัดซ้ำบนเว็บจริงใน CP-10
  - ยังไม่ทำ toast แจ้งเตือน (ป้ายสถานะมุมบนแจ้ง "บันทึกแล้ว" อยู่แล้ว) → ไป Backlog
- สถานะ: **PASSED → อนุญาตเริ่ม Phase 10 (Deploy)**

## CP-10 ออนไลน์
- วันที่: 2026-09-30
- เว็บจริง: **https://toeikun.github.io/Karngein/** (repo public ตาม D10)
- ไฟล์: job `deploy` ใน `.github/workflows/ci.yml` (รอ gate + firebase + e2e ผ่านก่อน), PLAN.md ข้อ 11 + D10
- ก่อนเปิด public: ล้างข้อมูลการเงินจาก Sheet ออกจาก PLAN.md ข้อ 2 ทั้งประวัติ (16 commit) + force push, สแกนทั้งประวัติไม่พบ API key / .env / อีเมลบริษัท, ลบ CI run ที่ชี้ commit เก่า
- Automated: ✅ CI run บน commit c548516 เขียวทั้ง 4 job — gate 65s, firebase 46s, e2e 75s, deploy 48s
- Manual (Claude ตรวจ):
  - ✅ หน้าเว็บ / manifest / sw.js / ไอคอน / 404 ตอบ 200 ชนิดไฟล์ถูก, ไฟล์ JS/CSS ทุกไฟล์ในหน้าไม่ 404, เสิร์ฟแบบ gzip
  - ✅ มี config Firebase (karngein-1eef7) ใน JS ที่ build → ปุ่ม "เข้าสู่ระบบด้วย Google" ขึ้น
  - ✅ Service Worker ลงทะเบียนที่ scope `/Karngein/` และควบคุมหน้าแล้ว, ไม่มี error ใน console
  - ✅ นำเข้า Golden Data บนเว็บจริง → รายเดือน `฿34,166.67 / ฿20,916.67 / ฿5,000.00 / ฿13,250.00`, รายปี 2026 `฿440,000 / ฿251,000 / ฿60,000 / ฿189,000`, ก.ย.–พ.ย. 2026 `฿132,500 / ฿62,750 / ฿15,000 / ฿69,750`, Sankey เงินเดือน 87.8% / ค่าอาหาร 23.4% / คงเหลือ 38.8%
  - ✅ Lighthouse มือถือบนเว็บจริง (2 รอบ): **Performance 91, Accessibility 100, Best Practices 100, SEO 100** (LCP 3.5 s)
- ⏳ รอเจ้าของโปรเจกต์ตรวจ (ต้องใช้มือถือจริง + ล็อกอินจริง):
  1. ล็อกอิน Google บนเว็บจริง (คอมฯ และมือถือ)
  2. (ค้างจาก CP-8 ข้อ 2) แก้ข้อมูลบนคอมฯ → เปิดบนมือถือบัญชีเดียวกัน → เห็นข้อมูลล่าสุด
  3. (ค้างจาก CP-9) Android Chrome "ติดตั้งแอป" / iPhone Safari "เพิ่มไปยังหน้าจอโฮม" → เปิดจากไอคอนเต็มจอ
  4. (ค้างจาก CP-9) ปิดเน็ตแล้วเปิดแอปจากไอคอน → ยังเปิดได้และเห็นข้อมูลล่าสุด
- 🐞 ปัญหาที่เจ้าของโปรเจกต์พบ (2026-09-30): ปิดแอปแล้วเปิดใหม่ ค้างที่ "กำลังโหลด" ต้องรีเฟรชเองถึงแสดงข้อมูล
  - ตรวจ: โหมด Guest เปิดใหม่โหลดทันทีปกติ → ปัญหาอยู่ในเส้นทางที่ล็อกอิน (Claude ล็อกอินทดสอบเองไม่ได้)
  - สาเหตุที่พบในโค้ด (รอเซิร์ฟเวอร์แบบไม่มีเวลาจำกัด 3 จุด):
    1. อ่านแผนจาก Firestore (`getDocs`) รอเซิร์ฟเวอร์ก่อน — ตอนเพิ่งเปิดแอปบนมือถือการเชื่อมต่อยังไม่พร้อม รอได้ 10+ วินาที ทั้งที่ข้อมูลอยู่ใน cache แล้ว
    2. บันทึก (`setDoc`) รอเซิร์ฟเวอร์ตอบทุกครั้ง (ตอนโหลดครั้งแรกถ้าต้องสร้างแผนใหม่ก็ค้างตรงนี้)
    3. Service Worker (เน็ตก่อน) รอเน็ตไม่จำกัดเวลาก่อนใช้หน้าที่เก็บไว้
    + แอปที่ติดตั้งบนหน้าจอ (PWA) ไม่มีปุ่มรีเฟรช → ค้าง = ใช้ต่อไม่ได้
  - แก้:
    1. `readWithCacheFallback`: ถามเซิร์ฟเวอร์ก่อน ช้าเกิน 3 วินาที/error → ใช้ cache (cache ว่างค่อยรอเซิร์ฟเวอร์ต่อ) + unit test 5 ข้อ
    2. เขียนรอเซิร์ฟเวอร์ไม่เกิน 4 วินาที แล้วให้ Firestore ส่งขึ้นเบื้องหลัง
    3. Service Worker รอเน็ตไม่เกิน 4 วินาทีถ้ามีหน้าที่เก็บไว้ (cache v2)
    4. `LoadingState`: โหลดนานเกิน 10 วินาที → แสดงคำอธิบาย + ปุ่ม "โหลดใหม่" + บอกขั้นตอนที่ค้าง (RTL test)
  - gate 251/251, E2E 8/8 — ⏳ รอเจ้าของโปรเจกต์ทดสอบซ้ำบนมือถือหลัง deploy

### CP-10 ผลตรวจบนอุปกรณ์จริง (เจ้าของโปรเจกต์ — 2026-09-30, หลัง deploy commit a08d8e2)
- ✅ ข้อ 0 ปิดแอปแล้วเปิดใหม่ ข้อมูลขึ้นเองโดยไม่ต้องรีเฟรช (หลังแก้อาการค้าง "กำลังโหลด")
- ✅ ข้อ 1 ล็อกอิน Google บนเว็บจริง
- ✅ ข้อ 2 แก้บนคอมฯ → มือถือบัญชีเดียวกันเห็นข้อมูลล่าสุด (ค้างจาก CP-8)
- ✅ ข้อ 3 ติดตั้งแอปบนหน้าจอมือถือ เปิดจากไอคอนเต็มจอ (ค้างจาก CP-9)
- ✅ ข้อ 4 เปิดแอปตอนออฟไลน์ได้ เห็นข้อมูลล่าสุด (ค้างจาก CP-9)
- หมายเหตุ: เจ้าของโปรเจกต์แจ้งว่า "ทดสอบเรียบร้อยแล้ว" สำหรับรายการทั้งหมดข้างต้น
- สถานะ: **PASSED → อนุญาตเริ่ม Phase 11**

## CP-11.1 Domain: รอบเงินเดือน / รายการจริง / เป้าหมาย
- วันที่: 2026-09-30
- ผู้ตรวจ: Claude (รอเจ้าของโปรเจกต์ตรวจซ้ำ)
- ไฟล์ที่สร้าง/แก้: `domain/entities/PayCycle.ts`, `Transaction.ts`, `Goal.ts`, `Plan.ts` (+ payCycleStartDay, goals แบบไม่บังคับ), `domain/services/cycleSummary.ts`, `goalProgress.ts`
- Automated: ✅ `npm run gate` — test 297/297 (29 ไฟล์)
  - R13 รอบวันที่ 25: 25 ก.ย. → รอบ 25 ก.ย.–24 ต.ค., 24 ต.ค. ยังรอบเดิม, 25 ต.ค. → รอบใหม่, 24 ก.ย. → รอบก่อน, ข้ามปี ธ.ค.–ม.ค.
  - R14 วันเริ่ม 31: ก.พ. 2027 → 28 ก.พ., ก.พ. 2028 (อธิกสุรทิน) → 29 ก.พ., เม.ย. → 30 เม.ย.; 36 รอบต่อกันไม่มีวันขาด/ซ้อน
  - R15 วันเริ่ม 1 = เดือนปฏิทิน
  - 🏆 Golden ชุดที่ 3: รอบ 25 ก.ย.–24 ต.ค. รับ 44,100 / จ่าย 8,170 / คงเหลือ 35,930; เงินเดือน 25 ต.ค. อยู่รอบใหม่
  - R17 งบ: ค่าอาหาร 550/8,000 = 6.9%, สังสรรค์ 2,500/2,000 = 125% (เกินงบ), ไม่ผูกกลุ่ม 120, งบ 0 → ไม่หารศูนย์
  - R18 🏆 เป้า = เงินเดือน × 12 = 529,200, ความคืบหน้า 50,000 + 5,000 = 55,000 = 10.4%; แก้เงินเดือน → เป้าเปลี่ยนตาม
  - R19 ประมาณรอบถึงเป้า (เฉลี่ยสูงสุด 3 รอบที่จบแล้ว) / ยังไม่มีรอบที่จบ → ไม่แสดง
  - R20 ลบรายได้ที่เป้าอ้างอิง → missingIncome ไม่ error
  - Validation: รายการ (จำนวน > 0, รายจ่ายต้องมีหมวด, รายรับผูกเป้าไม่ได้), เป้า (ชื่อ, × 1–600 จำนวนเต็ม, เงินตั้งต้น ≥ 0)
  - แผนเก่าที่ไม่มี field ใหม่ → วันเริ่ม 1, ไม่มีเป้า
- 🧪 Mutation check: เปลี่ยน `>=` เป็น `>` ในกฎ R13 → ล้ม 11 ข้อ / ตัด R14 (ไม่ใช้วันสุดท้ายของเดือน) → ล้ม 4 ข้อ / คืนค่า → ผ่านครบ
- Manual: n/a (Phase นี้ไม่มี UI)
- สถานะ: **PASSED → อนุญาตเริ่ม Phase 11.2**

## CP-11.2 เก็บข้อมูล + ไฟล์สำรอง v2
- วันที่: 2026-09-30
- ไฟล์ที่สร้าง/แก้:
  - Application: `ports/TransactionRepository.ts`, `usecases/transactions.ts`, `usecases/plans.ts` (ลบแผน → ลบรายการจริง), `usecases/migrateGuestPlans.ts` (ย้ายรายการจริงด้วย)
  - Infrastructure: `storage/InMemoryTransactionRepository.ts`, `storage/LocalStorageTransactionRepository.ts`, `firebase/FirestoreTransactionRepository.ts`, `firebase/firestoreHelpers.ts` (แยกตัวช่วยที่ใช้ร่วมกัน), `firebase/lazyFirebase.ts`, `schemas/planSchema.ts` (+ goals, payCycleStartDay, transactionSchema), `schemas/planJson.ts` (ไฟล์สำรอง v2)
  - Presentation: `usePlan` (ลบ/ส่งออก/นำเข้ารวมรายการจริง), `KarngeinApp` (ที่เก็บรายการจริงในเครื่อง/คลาวด์ + ย้ายขึ้นคลาวด์), `PlanBar` (ส่งออกแบบ async)
  - `firestore.rules`: เพิ่ม `users/{uid}/plans/{planId}/transactions/{id}` (เจ้าของเท่านั้น)
- Automated (ในเครื่อง): ✅ gate 330/330 (31 ไฟล์), E2E 8/8
  - Contract test รายการจริง 7 ข้อ ผ่านกับ InMemory + LocalStorage (ข้อมูลเสียไม่ทำให้พัง)
  - ⚠️ แผนที่มี goals + payCycleStartDay ผ่าน schema โดยไม่ถูกตัดทิ้ง (Zod ตัด field ที่ไม่ประกาศ — เจอก่อนเขียน จึงแก้ก่อน)
  - ไฟล์สำรอง v2 (มีรายการจริง) ไป-กลับครบ, ไฟล์ v1 เดิมยังนำเข้าได้, v2 ที่เสีย → ข้อความไทย
  - ลบแผน → รายการจริงของแผนหาย แผนอื่นไม่กระทบ; ย้าย Guest → คลาวด์ พร้อมรายการจริง 7 รายการ ย้ายซ้ำไม่ซ้ำ; แผนที่มีแต่รายการจริงไม่ถูกนับเป็นแผนว่าง
  - RTL: ส่งออก → ลบแผน → นำเข้า ได้แผน (+ เป้า + วันเริ่มรอบ 25) และรายการจริง 7 รายการกลับมา
- Automated [CI] (branch `phase-11-2`, run 36670257005): ✅ gate / firebase / e2e ผ่าน, deploy ข้าม (ตั้งใจ — deploy เฉพาะ main)
  - contract test รายการจริงกับ Firestore Emulator + rules test รายการจริง (alice ได้ / bob ไม่ได้ / ไม่ล็อกอินไม่ได้) ผ่าน
- ✅ เจ้าของโปรเจกต์ Publish `firestore.rules` ใหม่ใน Console แล้ว (ก่อน merge — ไม่งั้นลบแผนตอนล็อกอินจะล้ม เพราะต้องลบรายการจริงใน sub-collection ที่กฎเดิมไม่อนุญาต)
- ✅ merge เข้า main → CI run 36670558187 เขียวทั้ง 4 job รวม deploy, เว็บจริงตอบ 200
- การตัดสินใจ: `TransactionRepository.list` คืนทุกรายการของแผน (เป้าหมายต้องรวมทุกรอบ) แทน listByRange ในแผนเดิม — ง่ายกว่าและพอสำหรับการใช้ส่วนตัว
- บทเรียน: ใช้ branch แยก (`phase-11-2`) เพื่อให้ CI ตรวจโดยยังไม่ deploy เมื่อการ deploy ต้องรอให้ตั้งค่าภายนอก (Rules) ก่อน
- สถานะ: **PASSED → อนุญาตเริ่ม Phase 11.3**
