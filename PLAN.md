# Karngein — แผนการพัฒนาเว็บวางแผนกระแสเงินสดส่วนบุคคล

> เอกสารนี้เขียนสำหรับ **Junior Developer** อ่านจบแล้วควรรู้ว่า
> 1) เว็บนี้ทำอะไร 2) โค้ดวางไว้ที่ไหนเพราะอะไร 3) ต้องทำอะไรก่อน-หลัง 4) ทดสอบยังไงว่า "ผ่าน"
>
> **กฎเหล็กของโปรเจกต์:** ทุก Phase จบด้วย **Checkpoint** — ถ้า Checkpoint ยังไม่ผ่าน **ห้ามเริ่ม Phase ถัดไป**

**เวอร์ชันเอกสาร:** v2 (2026-09-26) — ปรับตามคำตอบ D1–D7 (ดูข้อ 11)

---

## สารบัญ

1. [สิ่งที่ศึกษาจากเว็บต้นแบบ](#1-สิ่งที่ศึกษาจากเว็บต้นแบบ)
2. [สิ่งที่ศึกษาจาก Google Sheet เดิม](#2-สิ่งที่ศึกษาจาก-google-sheet-เดิม)
3. [ขอบเขตงาน (Scope)](#3-ขอบเขตงาน-scope)
4. [เทคโนโลยีและเหตุผล](#4-เทคโนโลยีและเหตุผล)
5. [ที่เก็บข้อมูล: ใช้ได้ทั้งมือถือและคอมพิวเตอร์](#5-ที่เก็บข้อมูล-ใช้ได้ทั้งมือถือและคอมพิวเตอร์)
6. [Clean Architecture ฉบับเข้าใจง่าย](#6-clean-architecture-ฉบับเข้าใจง่าย)
7. [โครงสร้างโฟลเดอร์](#7-โครงสร้างโฟลเดอร์)
8. [Domain Model และกฎการคำนวณ](#8-domain-model-และกฎการคำนวณ)
9. [ระบบ Checkpoint](#9-ระบบ-checkpoint)
10. [แผนงานทีละ Phase พร้อม Checkpoint](#10-แผนงานทีละ-phase-พร้อม-checkpoint)
11. [การ Deploy ขึ้น GitHub Pages](#11-การ-deploy-ขึ้น-github-pages)
12. [บันทึกการตัดสินใจ (Decision Log)](#12-บันทึกการตัดสินใจ-decision-log)
13. [งานที่เก็บไว้ทำภายหลัง (Backlog)](#13-งานที่เก็บไว้ทำภายหลัง-backlog)
14. [อภิธานศัพท์](#14-อภิธานศัพท์)

---

## 1. สิ่งที่ศึกษาจากเว็บต้นแบบ

แหล่งอ้างอิง: **แพลนตัง Flow** (`plantung.mymoneytoolkit.app/flow`) — เครื่องมือวางแผนกระแสเงินสด (Cash Flow) แสดงผลเป็นแผนภาพ Sankey

> เราศึกษา **แนวคิดและการทำงาน** เพื่อสร้างของเราเอง ไม่คัดลอกโค้ด โลโก้ ชื่อ หรือข้อความของเขา

### 1.1 โครงหน้าจอ (บนลงล่าง)

```
┌──────────────────────────────────────────────────────────────────┐
│ [โลโก้] ชื่อแอป           [เลือกแผน ▾] [💾 บันทึก] [👤 เข้าสู่ระบบ]    │  ← Header
├──────────────────────────────────────────────────────────────────┤
│ ┌รายได้รวม┐ ┌รายจ่ายรวม┐ ┌ออม/ลงทุน┐ ┌เงินคงเหลือ┐                    │  ← Summary Cards (4 ใบ)
├──────────────────────────────────────────────────────────────────┤
│        ( ดูรายเดือน | ดูรายปี | กำหนดช่วง )                        │  ← เลือกมุมมองเวลา
│   Preset: [มนุษย์เงินเดือน] [นักศึกษา] [ครอบครัว] [ฟรีแลนซ์]          │  ← แม่แบบตั้งต้น
├───────────────────────────┬──────────────────────────────────────┤
│ แหล่งรายได้ (Incomes)      │ รายจ่าย (Expenses)                   │
│  ชื่อ | ฿จำนวน | ความถี่     │  กลุ่ม | ฿รวม | หมวด                   │  ← ตารางแก้ไขได้
│  + เพิ่มรายได้               │    └ รายการย่อย | ฿ | ความถี่           │
│                            │  + เพิ่มรายจ่าย  [จัดระเบียบ]          │
├───────────────────────────┴──────────────────────────────────────┤
│  แผนภาพ Sankey: รายได้ → เงินกองกลาง → หมวด → กลุ่ม → รายการย่อย    │  ← หัวใจของแอป
│  [เปอร์เซ็นต์|ตัวเลข|ไม่แสดง]  [ติ๊กหมวด]  [บันทึกรูป] [ซูม/รีเซ็ต]    │
├──────────────────────────────────────────────────────────────────┤
│ ┌จำเป็น┐ ┌ฟุ่มเฟือย┐ ┌ออม/ลงทุน┐ ┌สำรองฉุกเฉิน┐ ┌ให้รางวัลตัวเอง┐          │  ← สัดส่วนต่อรายได้ (5 หมวด)
└──────────────────────────────────────────────────────────────────┘
```

### 1.2 ฟีเจอร์ที่พบ

| # | ฟีเจอร์ | รายละเอียด |
|---|---|---|
| F1 | รายการรายได้ | ชื่อ, จำนวนเงิน, ความถี่ (`รายเดือน` / `รายปี` / `ครั้งเดียว` + วันที่) |
| F2 | รายการรายจ่ายแบบกลุ่ม | กลุ่ม (เช่น "รายจ่ายหลัก") มี **หมวด** และมี **รายการย่อย** หลายรายการ แต่ละรายการย่อยมีความถี่ของตัวเอง ยอดของกลุ่ม = ผลรวมรายการย่อย |
| F3 | หมวดรายจ่าย | ต้นแบบมี 4 หมวด — **ของเรามี 5 หมวด** (เพิ่ม "เงินสำรองฉุกเฉิน" ตาม D1) |
| F4 | Summary Cards | รายได้รวม, รายจ่ายรวม, ออม/ลงทุน, เงินคงเหลือ |
| F5 | มุมมองเวลา | รายเดือน / รายปี / กำหนดช่วง (เลือกเดือน-ปี เริ่ม ถึง สิ้นสุด) |
| F6 | Presets | แม่แบบข้อมูลตั้งต้นตามไลฟ์สไตล์ |
| F7 | Sankey Diagram | แสดงการไหลของเงิน คลิกโหนดเพื่อยุบ/ขยาย, ป้ายแสดง % / ตัวเลข / ไม่แสดง, กรองหมวดได้, ซูม, บันทึกเป็นรูป |
| F8 | สัดส่วนหมวด | การ์ด % ของแต่ละหมวดเทียบรายได้ |
| F9 | หลายแผน | สร้าง / สลับ / บันทึกแผน (ต้นแบบจำกัด 10 รายการในแผนฟรี — **เราไม่จำกัด**) |
| F10 | จัดระเบียบ | เรียงรายการรายจ่ายตามหมวด |
| F11 | เข้าสู่ระบบ | ต้นแบบมีปุ่มล็อกอิน — **ของเราใช้ Google Login เพื่อ sync ข้อมูลข้ามเครื่อง** (ข้อ 5) |

### 1.3 กฎการคำนวณที่ "พิสูจน์แล้ว" จากตัวเลขบนเว็บ

ข้อมูลตัวอย่างบนเว็บ (ใช้เป็น **ชุดข้อมูลทดสอบหลัก** ของเรา — ดูข้อ 9.3):

| รายได้ | จำนวน | ความถี่ |
|---|---|---|
| เงินเดือน | 30,000 | รายเดือน |
| โบนัสประจำปี | 50,000 | รายปี |
| ขายสินทรัพย์/ของขวัญ | 30,000 | ครั้งเดียว (26/09/2026) |

| กลุ่มรายจ่าย (หมวด) | รายการย่อย | จำนวน | ความถี่ |
|---|---|---|---|
| รายจ่ายหลัก (จำเป็น) | ประกันสังคม | 9,000 | รายปี |
| | ค่าอาหาร | 8,000 | รายเดือน |
| | ค่าเดินทาง | 3,000 | รายเดือน |
| การลงทุน (ออม/ลงทุน) | DCA กองทุนรวม | 5,000 | รายเดือน |
| Lifestyle & ท่องเที่ยว (ให้รางวัลตัวเอง) | – (ไม่มีรายการย่อย) | 50,000 | รายปี |

ผลลัพธ์ที่เว็บแสดง และสูตรที่เราถอดได้:

| มุมมอง | รายได้รวม | รายจ่ายรวม | ออม/ลงทุน | คงเหลือ |
|---|---|---|---|---|
| รายเดือน | 34,166.67 | 20,916.67 | 5,000.00 | 13,250.00 |
| รายปี | 440,000.00 | 251,000.00 | 60,000.00 | 189,000.00 |
| กำหนดช่วง (3 เดือน, มีรายการครั้งเดียวในช่วง) | 132,500.00 | 62,750.00 | 15,000.00 | 69,750.00 |

- **รายเดือน** = รายเดือน×1 + รายปี÷12 → `30,000 + 50,000/12 = 34,166.67` (รายการ "ครั้งเดียว" **ไม่ถูกนับ**)
- **รายปี** = รายเดือน×12 + รายปี×1 + ครั้งเดียว (ถ้าวันที่อยู่ในปีนั้น) → `360,000 + 50,000 + 30,000 = 440,000`
- **กำหนดช่วง N เดือน** = (ยอดรายเดือน × N) + ครั้งเดียวที่วันที่อยู่ในช่วง → `34,166.67×3 + 30,000 = 132,500`
- **รายจ่ายรวม "รวม" ออม/ลงทุนด้วย** → `750 + 8,000 + 3,000 + 5,000 + 4,166.67 = 20,916.67`
- **เงินคงเหลือ** = รายได้รวม − รายจ่ายรวม → `34,166.67 − 20,916.67 = 13,250`
- **% หมวด** = ยอดหมวด ÷ รายได้รวม × 100 (จำเป็น 11,750/34,166.67 = 34.4%)

---

## 2. สิ่งที่ศึกษาจาก Google Sheet เดิม

> ตาม **D3** เราจะ **เริ่มข้อมูลใหม่ทั้งหมดในปี 2027** จึง **ไม่ทำระบบนำเข้าจาก Sheet** ในรอบนี้
> แต่โครงสร้าง Sheet ยังมีประโยชน์ในการออกแบบ จึงบันทึกไว้ (เฉพาะโครงสร้าง — ไม่ใส่รายการและตัวเลขจริงเพราะเป็นข้อมูลส่วนตัว)

```
คอลัมน์: รายละเอียด | หมวดหมู่ | งบประมาณแยกรายเดือน | โน้ต

[ส่วนรายรับ]  รายได้แต่ละแหล่ง → แถวยอดรวม
[ส่วนรายจ่าย] หมวด Needs     รายจ่ายจำเป็น — บางรายการเป็น "กลุ่ม" ที่มีรายการย่อย (บรรทัดขึ้นต้นด้วย "- ")
              หมวด Invest    การลงทุน / ประกัน
              หมวด Security  เงินสำรองฉุกเฉิน
              ทุกหมวดมีแถว "รวม ..." และแถวสุดท้าย = รายรับ − (Need + Invest + Security)
```

**สิ่งที่นำมาใช้ในการออกแบบ:**

1. แถวที่มีรายการย่อย (ขึ้นต้นด้วย "- ") = **กลุ่ม + รายการย่อย** → ตรงกับโมเดลของแอป
2. หมวด Needs / Invest / Security → จับคู่กับหมวดของแอป (ข้อ 8.2) โดย **Security แยกเป็นหมวดของตัวเอง** (D1)
3. สูตรแถวคงเหลือ = รายรับ − (Need + Invest + Security) → **ตรงกับกฎ R9 ของเรา** ✔
4. ยอดที่เกิดแค่บางเดือน → ในแอปใช้ **รายการ "ครั้งเดียว" + วันที่** แทนได้ ไม่ต้องสร้างโมเดลใหม่

> 🔎 **ข้อสังเกตจาก D7:** ยอดคงเหลือใน Sheet บางเดือนไม่ตรงกับสูตร น่าจะเพราะสูตรอ้างคอลัมน์ที่ถูกซ่อนแทนคอลัมน์ของเดือนนั้น
> ไม่กระทบแอป (เพราะเริ่มใหม่ 2027) แต่ควรแก้ใน Sheet ถ้ายังใช้อยู่

---

## 3. ขอบเขตงาน (Scope)

### ✅ ทำ (MVP)
- จัดการรายได้/รายจ่าย (เพิ่ม ลบ แก้ไข) แบบกลุ่ม + รายการย่อย, 5 หมวด
- คำนวณ Summary ตามมุมมอง รายเดือน / รายปี / กำหนดช่วง (ค่าเริ่มต้น = **ปี 2027**)
- Sankey Diagram + ตัวเลือกการแสดงผล + บันทึกเป็นรูป
- การ์ดสัดส่วนหมวด
- Presets
- หลายแผน
- **ใช้ได้ทั้งมือถือและคอมพิวเตอร์** — Responsive + ติดตั้งเป็นแอปบนหน้าจอมือถือได้ (PWA)
- **เก็บข้อมูลบนคลาวด์ + Google Login** — แก้บนคอมฯ แล้วเปิดมือถือเห็นทันที (Firebase — ข้อ 5)
- **ใช้แบบไม่ล็อกอินได้ (Guest)** — เก็บในเครื่อง เมื่อล็อกอินภายหลังจะย้ายข้อมูลขึ้นคลาวด์ให้
- ส่งออก/นำเข้าแผนเป็นไฟล์ JSON (สำรองข้อมูล)
- Deploy บน **GitHub Pages**

### ❌ ไม่ทำ (รอบนี้)
- นำเข้าข้อมูลจาก Google Sheet (D3: เริ่มใหม่ 2027) → ย้ายไป Backlog
- แอป Native (App Store / Play Store) — ใช้ PWA แทน
- การจำกัดจำนวนรายการ / แผนเสียเงิน / แชร์แผนให้คนอื่น

---

## 4. เทคโนโลยีและเหตุผล

| เทคโนโลยี | ใช้ทำอะไร | ทำไมเลือก |
|---|---|---|
| **TypeScript** | ภาษาหลัก | จับบั๊กตั้งแต่ตอนเขียน เช่น ส่ง string แทน number |
| **Next.js (App Router)** + `output: 'export'` | เฟรมเวิร์ก | Build ออกมาเป็นไฟล์ HTML/JS ล้วน → วางบน GitHub Pages ได้ |
| **Tailwind CSS** | ตกแต่ง + Responsive | เขียน style ในคลาสได้เลย, `md:` / `lg:` ทำหน้าจอมือถือ/คอมฯ ง่าย |
| **Firebase Authentication** | Google Login | ผู้ใช้มีบัญชี Google อยู่แล้ว ไม่ต้องจำรหัสใหม่ |
| **Cloud Firestore** | ฐานข้อมูลคลาวด์ | Sync ข้ามเครื่อง + **ทำงานออฟไลน์ได้** (ข้อ 5) |
| **Firebase Emulator Suite** | ทดสอบ Firestore/Auth ในเครื่อง | เทสต์ได้โดยไม่แตะข้อมูลจริง ไม่เสียโควตา |
| **PWA** (manifest + service worker) | ติดตั้งบนหน้าจอมือถือ | เปิดเต็มจอเหมือนแอป ไม่ต้องขึ้น Store |
| **Vitest** | Unit test | เร็ว ตั้งค่าง่าย ใช้กับ TypeScript ได้ทันที |
| **React Testing Library** | ทดสอบ component | ทดสอบแบบที่ผู้ใช้ใช้งานจริง (คลิก, พิมพ์) |
| **Playwright** | E2E test | เปิดเบราว์เซอร์จริง ทดสอบทั้ง flow ทั้งขนาดจอมือถือและคอมฯ |
| **d3-sankey** | คำนวณตำแหน่ง Sankey | ไลบรารีมาตรฐาน เราวาดเองด้วย SVG → ควบคุมสี/คลิกได้เต็มที่ |
| **Zod** | ตรวจข้อมูลตอนโหลด/นำเข้า | ป้องกันข้อมูลเสียจาก storage หรือไฟล์ที่นำเข้า |
| **html-to-image** | บันทึก Sankey เป็น PNG | ใช้ง่าย ทำงานฝั่งเบราว์เซอร์ |
| **GitHub Actions** | Build + Test + Deploy อัตโนมัติ | push แล้วขึ้นเว็บเอง |

> ⚠️ ข้อจำกัดของ `output: 'export'`: ใช้ **API Routes, Server Actions, middleware, `next/image` แบบ optimize ไม่ได้** — โปรเจกต์นี้ไม่ต้องใช้ เพราะ Firebase SDK คุยกับคลาวด์จากเบราว์เซอร์โดยตรง

---

## 5. ที่เก็บข้อมูล: ใช้ได้ทั้งมือถือและคอมพิวเตอร์

### 5.1 โจทย์

- เปิดได้ทั้งมือถือและคอมพิวเตอร์ **ข้อมูลชุดเดียวกัน**
- GitHub Pages เป็น **static hosting** (มีแค่ไฟล์ HTML/JS) → **ไม่มีเซิร์ฟเวอร์/ฐานข้อมูลของตัวเอง**
- ต้องใช้บริการฐานข้อมูลภายนอกที่ **เบราว์เซอร์เรียกได้โดยตรง** และ **ฟรี** สำหรับการใช้งานส่วนตัว

### 5.2 ตัวเลือกที่พิจารณา

| | **Firebase (Firestore + Auth)** ⭐ | Supabase (Postgres + Auth) | Google Sheets + Apps Script |
|---|---|---|---|
| ฟรีสำหรับใช้ส่วนตัว | ✅ Spark plan เหลือเฟือ | ✅ | ✅ |
| Google Login | ✅ ในตัว | ✅ ในตัว | ⚠️ ทำเอง |
| **ใช้ตอนเน็ตหลุด (มือถือ)** | ✅ **มี offline cache ในตัว** sync เองเมื่อกลับมาออนไลน์ | ❌ ต้องเขียนเอง | ❌ |
| โปรเจกต์หยุดเองเมื่อไม่ได้ใช้ | ✅ ไม่หยุด | ⚠️ แพ็กฟรีถูก **pause** เมื่อไม่มีการใช้งานราว 1 สัปดาห์ | ✅ ไม่หยุด |
| ความปลอดภัยข้อมูล | ✅ Security Rules | ✅ Row Level Security (SQL) | ⚠️ ต้องระวังมาก |
| ความเร็ว | เร็ว | เร็ว | ช้า (1–3 วินาที/ครั้ง) |
| ทดสอบในเครื่อง | ✅ Emulator | ✅ (ต้องใช้ Docker) | ❌ ยาก |
| ความยากสำหรับ Junior | ง่าย (เก็บเป็นเอกสาร JSON) | กลาง (ต้องรู้ SQL) | ง่ายแต่โตยาก |

### 5.3 คำแนะนำ: **Firebase** + ใช้แบบ Guest ได้

เหตุผล:
1. **แอปการเงินมักถูกเปิดบนมือถือตอนเน็ตไม่ดี** → Firestore มี offline cache ในตัว แก้ไขได้ตอนออฟไลน์แล้ว sync ให้เองเมื่อกลับมาออนไลน์
2. **เป็นแอปที่อาจเปิดเดือนละไม่กี่ครั้ง** → Firebase ไม่ pause โปรเจกต์เหมือน Supabase แพ็กฟรี
3. ข้อมูลแผน 1 ชุด = เอกสาร JSON 1 ก้อน → ตรงกับ `Plan` ใน Domain ของเราพอดี ไม่ต้องแปลงเป็นตาราง
4. **Clean Architecture ช่วยเราตรงนี้:** Firebase อยู่ใน `infrastructure/` เท่านั้น ถ้าวันหนึ่งอยากย้ายไป Supabase แก้แค่ adapter ตัวเดียว Domain/UI ไม่ต้องแตะ

### 5.4 ภาพรวมการทำงาน

```
  📱 มือถือ (PWA)                        💻 คอมพิวเตอร์ (เบราว์เซอร์)
  ┌──────────────────┐                  ┌──────────────────┐
  │ Karngein         │                  │ Karngein         │
  │ └ offline cache  │                  │ └ offline cache  │
  └────────┬─────────┘                  └────────┬─────────┘
           │   Google Login (Firebase Auth)       │
           └───────────────┬──────────────────────┘
                           ▼
              ☁️ Cloud Firestore
              users/{uid}/plans/{planId}   ← 1 แผน = 1 เอกสาร
              (Security Rules: อ่าน/เขียนได้เฉพาะเจ้าของ uid)
```

**โหมดการใช้งาน**

| โหมด | เก็บที่ | ใช้เมื่อ |
|---|---|---|
| **Guest** | localStorage ในเครื่อง | ยังไม่ล็อกอิน / ทดลองใช้ |
| **Signed-in** | Firestore (+ offline cache) | ล็อกอิน Google แล้ว — sync ทุกเครื่อง |

เมื่อ Guest กดล็อกอินครั้งแรก → แอปถาม **"ย้ายแผนในเครื่องขึ้นคลาวด์ไหม?"**

### 5.5 เรื่องความปลอดภัยที่ Junior ต้องเข้าใจ

- ค่า `apiKey` ของ Firebase **ไม่ใช่ความลับ** (อยู่ใน JS ที่ใครก็เปิดดูได้) — สิ่งที่ปกป้องข้อมูลคือ **Security Rules**
- Rules ต้องเขียนแบบนี้เป็นอย่างน้อย และ **ต้องมีเทสต์** (CP-8):
  ```
  match /users/{uid}/plans/{planId} {
    allow read, write: if request.auth != null && request.auth.uid == uid;
  }
  ```
- ห้ามเปิดโหมด "test mode" (อนุญาตทุกคน) ทิ้งไว้บน production
- ต้องเพิ่มโดเมน `<username>.github.io` ใน Firebase Auth → Authorized domains ไม่งั้นล็อกอินไม่ได้
- ใช้ `signInWithPopup` (ไม่ใช้ `signInWithRedirect`) เพราะ redirect มีปัญหากับเบราว์เซอร์มือถือเมื่อเว็บไม่ได้โฮสต์บน Firebase Hosting

### 5.6 ค่าใช้จ่าย

Spark plan (ฟรี) ให้ Firestore พื้นที่ 1 GiB, อ่าน 50,000 ครั้ง/วัน, เขียน 20,000 ครั้ง/วัน — การใช้ส่วนตัวใช้ไม่ถึง 1%
เพื่อประหยัดการเขียน: **autosave แบบ debounce** (รอผู้ใช้หยุดพิมพ์ ~1 วินาทีค่อยบันทึก)

> ถ้าไม่ต้องการ Firebase ให้แจ้งก่อนเริ่ม Phase 8 — Phase 0–7 ไม่ขึ้นกับการตัดสินใจนี้

---

## 6. Clean Architecture ฉบับเข้าใจง่าย

### 6.1 เปรียบเทียบกับร้านอาหาร 🍜

| ชั้น (Layer) | เปรียบเหมือน | หน้าที่ในโปรเจกต์นี้ |
|---|---|---|
| **Domain** | สูตรอาหาร | "กฎทางการเงิน" ล้วนๆ เช่น แปลงรายปีเป็นรายเดือน, คำนวณเงินคงเหลือ **ไม่รู้จัก React, Firebase, localStorage** |
| **Application** | หัวหน้าเชฟ | "สิ่งที่ผู้ใช้ทำได้" (Use Case) เช่น เพิ่มรายจ่าย, บันทึกแผน, ย้ายแผนขึ้นคลาวด์ เรียก Domain และสั่งงานผ่าน **Interface (Port)** |
| **Infrastructure** | ซัพพลายเออร์ / ตู้เย็น | "เครื่องมือภายนอก" เช่น localStorage, Firestore, Firebase Auth — **ทำตาม Interface** ที่ Application กำหนด |
| **Presentation** | หน้าร้าน / พนักงานเสิร์ฟ | React component, หน้าเว็บ, ปุ่ม, Sankey — **แสดงผลและรับคำสั่ง** ไม่มีสูตรคำนวณเอง |

### 6.2 กฎการพึ่งพา (Dependency Rule) — ข้อเดียวที่ต้องจำ

```
 Presentation ──► Application ──► Domain
        │               ▲
        ▼               │ (implements interface)
 Infrastructure ────────┘
```

**ลูกศรชี้เข้าด้านในเสมอ** — `domain/` ห้าม `import` อะไรจากชั้นอื่นเลย และ `firebase` ถูก import ได้ **เฉพาะใน `infrastructure/`**

ตัวอย่างผิด ❌ (สูตรคำนวณ + Firebase อยู่ใน component):
```tsx
// presentation/components/SummaryCards.tsx
const total = incomes.reduce((s, i) => s + (i.frequency === 'yearly' ? i.amount / 12 : i.amount), 0);
await setDoc(doc(db, 'users', uid, 'plans', plan.id), plan);
```

ตัวอย่างถูก ✅ (component แค่เรียก use case):
```tsx
// presentation/components/SummaryCards.tsx
const summary = calculateSummary(plan, period); // มาจาก application
await savePlan(repository, plan);               // repository ถูกเลือกใน di/container.ts
```

### 6.3 ตัวอย่างการ "เสียบปลั๊ก" Port ↔ Adapter

```ts
// application/ports/PlanRepository.ts  ← Application กำหนดว่า "ต้องการอะไร"
export interface PlanRepository {
  list(): Promise<Plan[]>;
  get(id: string): Promise<Plan | null>;
  save(plan: Plan): Promise<void>;
  delete(id: string): Promise<void>;
}

// infrastructure มี 3 ตัวที่ทำตาม interface เดียวกัน:
//   InMemoryPlanRepository      ← ใช้ในเทสต์
//   LocalStoragePlanRepository  ← โหมด Guest
//   FirestorePlanRepository     ← โหมดล็อกอิน

// di/container.ts
export const getPlanRepository = (user: User | null): PlanRepository =>
  user ? new FirestorePlanRepository(user.uid) : new LocalStoragePlanRepository();
```

**ทำไมต้องแยก?**
- สูตรเงินทดสอบได้ด้วย unit test ล้วนๆ ไม่ต้องเปิดเบราว์เซอร์หรือต่อเน็ต
- เปลี่ยน localStorage → Firestore ได้โดย UI ไม่ต้องแก้ (เราจะได้เห็นจริงใน Phase 8)
- Junior dev รู้ทันทีว่า "บั๊กเรื่องตัวเลข" ต้องไปดูที่ `domain/`, "บั๊กบันทึกไม่ขึ้น" ดูที่ `infrastructure/`

---

## 7. โครงสร้างโฟลเดอร์

```
Karngein/
├── PLAN.md                        ← ไฟล์นี้
├── CHECKPOINTS.md                 ← บันทึกผล Checkpoint (สร้างใน Phase 0)
├── .env.example                   ← ตัวอย่างค่า NEXT_PUBLIC_FIREBASE_* (ไม่มีค่าจริง)
├── .github/workflows/deploy.yml   ← CI/CD
├── next.config.ts                 ← output: 'export', basePath
├── firebase.json                  ← ตั้งค่า Emulator
├── firestore.rules                ← Security Rules (มีเทสต์!)
├── public/
│   ├── manifest.webmanifest       ← PWA
│   ├── sw.js                      ← service worker (cache หน้าเว็บ)
│   └── icons/                     ← ไอคอน 192/512 px
├── src/
│   ├── app/                       ← Next.js routes (บางที่สุด แค่ประกอบหน้า)
│   │   ├── layout.tsx
│   │   ├── page.tsx               ← หน้าหลัก
│   │   └── globals.css
│   │
│   ├── domain/                    ← 🟢 ชั้นใน: กฎการเงิน (TypeScript ล้วน)
│   │   ├── entities/
│   │   │   ├── Money.ts           ← ปัดเศษ, จัดรูปแบบ ฿
│   │   │   ├── Frequency.ts       ← 'monthly' | 'yearly' | 'one-time'
│   │   │   ├── Category.ts        ← 5 หมวด + ชื่อไทย + สี
│   │   │   ├── Income.ts
│   │   │   ├── Expense.ts         ← ExpenseGroup + ExpenseItem
│   │   │   ├── Period.ts          ← มุมมองเวลา
│   │   │   └── Plan.ts            ← แผน = รายได้ + รายจ่าย
│   │   ├── services/
│   │   │   ├── amountInPeriod.ts  ← แปลงจำนวนตามความถี่เข้าช่วงเวลา
│   │   │   ├── summarize.ts       ← คำนวณ Summary
│   │   │   └── buildFlowGraph.ts  ← สร้าง nodes/links สำหรับ Sankey
│   │   └── __tests__/
│   │
│   ├── application/               ← 🟡 Use Case + Port (interface)
│   │   ├── ports/
│   │   │   ├── PlanRepository.ts  ← list/get/save/delete
│   │   │   └── AuthService.ts     ← currentUser/signIn/signOut/onChange
│   │   ├── usecases/
│   │   │   ├── addIncome.ts / updateIncome.ts / removeIncome.ts
│   │   │   ├── addExpenseGroup.ts / addExpenseItem.ts / ...
│   │   │   ├── organizeExpenses.ts
│   │   │   ├── applyPreset.ts
│   │   │   ├── savePlan.ts / loadPlan.ts / listPlans.ts / deletePlan.ts
│   │   │   └── migrateGuestPlans.ts  ← ย้ายแผน Guest ขึ้นคลาวด์
│   │   ├── presets/               ← ข้อมูล preset 4 แบบ
│   │   └── __tests__/
│   │
│   ├── infrastructure/            ← 🔵 ต่อกับโลกภายนอก (ที่เดียวที่ import firebase ได้)
│   │   ├── storage/
│   │   │   ├── InMemoryPlanRepository.ts      ← ใช้ในเทสต์
│   │   │   └── LocalStoragePlanRepository.ts  ← โหมด Guest
│   │   ├── firebase/
│   │   │   ├── firebaseApp.ts                 ← initializeApp + offline cache
│   │   │   ├── FirestorePlanRepository.ts     ← โหมดล็อกอิน
│   │   │   └── FirebaseAuthService.ts
│   │   ├── schemas/planSchema.ts  ← Zod schema
│   │   └── __tests__/
│   │       ├── planRepository.contract.ts     ← ชุดเทสต์กลางที่ทุก repository ต้องผ่าน
│   │       └── firestore.rules.test.ts
│   │
│   ├── presentation/              ← 🔴 React (UI)
│   │   ├── components/
│   │   │   ├── layout/Header.tsx, AccountMenu.tsx
│   │   │   ├── summary/SummaryCards.tsx
│   │   │   ├── period/PeriodSwitcher.tsx
│   │   │   ├── income/IncomeList.tsx, IncomeRow.tsx
│   │   │   ├── expense/ExpenseList.tsx, ExpenseGroupRow.tsx, ExpenseItemRow.tsx
│   │   │   ├── flow/SankeyChart.tsx, FlowToolbar.tsx
│   │   │   ├── ratio/CategoryRatioCards.tsx
│   │   │   └── ui/ (Button, MoneyInput, Select, Card, SyncBadge ...)
│   │   ├── hooks/usePlan.ts, useAuth.ts
│   │   └── __tests__/
│   │
│   └── di/container.ts            ← "เสียบปลั๊ก" ว่าจะใช้ repository ตัวไหน
│
├── tests/e2e/                     ← Playwright
└── fixtures/
    └── reference-plan.json        ← ข้อมูลตัวอย่างจากข้อ 1.3
```

---

## 8. Domain Model และกฎการคำนวณ

### 8.1 Types หลัก

```ts
// domain/entities/Frequency.ts
export type Frequency = 'monthly' | 'yearly' | 'one-time';

// domain/entities/Category.ts
export type CategoryId = 'essential' | 'wants' | 'investment' | 'emergency' | 'reward';

// domain/entities/Income.ts
export interface Income {
  id: string;
  name: string;
  amount: number;          // บาท (ต้อง >= 0)
  frequency: Frequency;
  date?: string;           // 'YYYY-MM-DD' — บังคับเมื่อ frequency = 'one-time'
}

// domain/entities/Expense.ts
export interface ExpenseItem {
  id: string;
  name: string;
  amount: number;
  frequency: Frequency;
  date?: string;
}

export interface ExpenseGroup {
  id: string;
  name: string;
  category: CategoryId;
  items: ExpenseItem[];    // ถ้าว่าง ใช้ amount/frequency ของกลุ่มเอง
  amount?: number;
  frequency?: Frequency;
  date?: string;
}

// domain/entities/Period.ts
export type Period =
  | { kind: 'monthly' }
  | { kind: 'yearly'; year: number }
  | { kind: 'range'; from: YearMonth; to: YearMonth }; // YearMonth = { year, month }

// domain/entities/Plan.ts
export interface Plan {
  id: string;
  name: string;
  incomes: Income[];
  expenses: ExpenseGroup[];
  updatedAt: string;       // ISO — ใช้ตัดสินว่าข้อมูลไหนใหม่กว่าตอน sync
}
```

### 8.2 หมวดรายจ่าย 5 หมวด (D1)

| ลำดับ | CategoryId | ชื่อไทย | สี (Tailwind) | เทียบหมวดใน Sheet เดิม |
|---|---|---|---|---|
| 1 | `essential` | รายจ่ายจำเป็น | `sky` | Needs |
| 2 | `wants` | ฟุ่มเฟือย/ตามใจ | `amber` | – |
| 3 | `investment` | เงินออม/ลงทุน | `emerald` | Invest |
| 4 | `emergency` | เงินสำรองฉุกเฉิน | `violet` | Security |
| 5 | `reward` | ให้รางวัลตัวเอง | `rose` | – |

> การ์ดสรุปใบที่ 4 ใช้ชื่อ **"เงินคงเหลือ"** (ไม่ใช่ "เงินสำรองคงเหลือ" แบบต้นแบบ) เพื่อไม่ให้สับสนกับหมวด "เงินสำรองฉุกเฉิน"

### 8.3 กฎการคำนวณ (ต้องมี unit test ครบทุกข้อ)

| รหัสกฎ | กฎ |
|---|---|
| **R1** | `monthly` ในมุมมองรายเดือน = amount × 1 |
| **R2** | `yearly` ในมุมมองรายเดือน = amount ÷ 12 |
| **R3** | `one-time` ในมุมมองรายเดือน = **0** (แสดงหมายเหตุใต้ Sankey แทน) |
| **R4** | มุมมองรายปี: monthly × 12, yearly × 1, one-time นับเมื่อ `date` อยู่ในปีที่เลือก |
| **R5** | มุมมองช่วง N เดือน (นับรวมเดือนเริ่มและเดือนสิ้นสุด): (ยอด R1+R2) × N + one-time ที่ `date` อยู่ในช่วง |
| **R6** | ยอดกลุ่ม = ผลรวมรายการย่อย (ถ้ามี) ไม่เช่นนั้นใช้ amount ของกลุ่ม |
| **R7** | รายจ่ายรวม = ผลรวม **ทุกหมวด** (รวมออม/ลงทุน และสำรองฉุกเฉินด้วย) — ตรงกับสูตร Sheet เดิม |
| **R8** | การ์ด "ออม/ลงทุน" = `investment` + `emergency` (เงินที่เก็บไว้ ไม่ได้ใช้หมด) — แยกยอดในการ์ดสัดส่วน |
| **R9** | เงินคงเหลือ = รายได้รวม − รายจ่ายรวม (ติดลบได้ → แสดงสีแดง) |
| **R10** | % หมวด = ยอดหมวด ÷ รายได้รวม × 100 (ถ้ารายได้ = 0 → 0%) |
| **R11** | คำนวณด้วยความละเอียดเต็ม **ปัดเศษ 2 ตำแหน่งตอนแสดงผลเท่านั้น** |
| **R12** | amount ติดลบ / ไม่ใช่ตัวเลข → ไม่ยอมรับ (validation error) |

### 8.4 โครง Sankey (Flow Graph)

```
[รายได้ 1] ─┐
[รายได้ 2] ─┼─► [เงินกองกลาง] ─┬─► [หมวด: จำเป็น] ─► [กลุ่ม: รายจ่ายหลัก] ─► [ค่าอาหาร] ...
[รายได้ 3] ─┘                  ├─► [หมวด: ออม/ลงทุน] ─► ...
                               ├─► [หมวด: สำรองฉุกเฉิน] ─► ...
                               ├─► [หมวด: ให้รางวัลตัวเอง] ─► ...
                               └─► [เงินคงเหลือ]   (ถ้าคงเหลือ > 0)
```
- ถ้ารายจ่าย > รายได้ → เพิ่มโหนด **"เงินขาด"** ฝั่งรายได้ (สีแดง) เพื่อให้กราฟสมดุล
- โหนดที่มีค่า 0 ไม่ต้องแสดง

---

## 9. ระบบ Checkpoint

### 9.1 Checkpoint คืออะไร

**Checkpoint = ด่านตรวจ** ที่พิสูจน์ว่าสิ่งที่เพิ่งสร้าง "ทำงานถูกต้องตามที่กำหนด" ก่อนจะต่อยอด
ถ้าสร้างฟีเจอร์ใหม่บนฐานที่พัง บั๊กจะซ้อนกันจนหาต้นเหตุไม่เจอ

### 9.2 องค์ประกอบของทุก Checkpoint

แต่ละ Checkpoint มี 3 ส่วน **ต้องผ่านครบทั้ง 3**:

| ส่วน | วิธีตรวจ | ผ่านเมื่อ |
|---|---|---|
| 🤖 **Automated** | รันคำสั่งใน Terminal | ทุกคำสั่งจบด้วย exit code 0 / เทสต์เขียวหมด |
| 👀 **Manual** | ทำตามขั้นตอนในเบราว์เซอร์ | ผลลัพธ์ตรงกับ "ผลที่คาดหวัง" ทุกข้อ |
| 📝 **Record** | บันทึกใน `CHECKPOINTS.md` | มีวันที่ + ผลลัพธ์ + ลิงก์ commit |

คำสั่งมาตรฐานที่ต้องผ่านในทุก Checkpoint (เรียกว่า **"Gate"**):

```bash
npm run gate   # = npm run lint && npm run typecheck && npm run test && npm run build
```

> `typecheck` = `next typegen && tsc --noEmit` — ต้องให้ Next.js สร้าง type อย่าง `LayoutProps` ก่อน ไม่งั้น tsc หาไม่เจอ

ตั้งแต่ Phase 8 เป็นต้นไป Gate เพิ่ม `npm run test:firebase` (รันเทสต์กับ Firebase Emulator)

### 9.3 ชุดข้อมูลทดสอบหลัก (Golden Data)

ใช้ข้อมูลจากข้อ 1.3 เก็บที่ `fixtures/reference-plan.json` ตัวเลขที่ต้องได้เป๊ะ:

| มุมมอง | รายได้ | รายจ่าย | ออม/ลงทุน | คงเหลือ |
|---|---|---|---|---|
| รายเดือน | 34,166.67 | 20,916.67 | 5,000.00 | 13,250.00 |
| รายปี 2026 | 440,000.00 | 251,000.00 | 60,000.00 | 189,000.00 |
| ก.ย.–พ.ย. 2026 | 132,500.00 | 62,750.00 | 15,000.00 | 69,750.00 |
| รายปี 2027 (one-time อยู่นอกปี) | 410,000.00 | 251,000.00 | 60,000.00 | 159,000.00 |

> Golden Data ใช้วันที่ปี 2026 ตามเว็บต้นแบบ เพื่อให้เทียบตัวเลขกับต้นแบบได้ — ส่วนแอปจริงเริ่มต้นที่ปี 2027

**Golden Data ชุดที่ 2 (หมวดสำรองฉุกเฉิน)** — ชุดที่ 1 + เพิ่มกลุ่ม "เงินสำรองฉุกเฉิน" (`emergency`) 2,000/เดือน:

| มุมมอง | รายได้ | รายจ่าย | ออม/ลงทุน | คงเหลือ |
|---|---|---|---|---|
| รายเดือน | 34,166.67 | 22,916.67 | 7,000.00 | 11,250.00 |

### 9.4 แม่แบบบันทึกใน `CHECKPOINTS.md`

```md
## CP-2 Domain: การคำนวณ
- วันที่: 2026-10-01
- ผู้ตรวจ: <ชื่อ>
- Automated: ✅ 24 tests passed (commit abc1234)
- Manual: ✅ n/a
- หมายเหตุ: -
- สถานะ: PASSED → อนุญาตเริ่ม Phase 3
```

### 9.5 ถ้า Checkpoint ไม่ผ่าน ทำยังไง

1. **หยุด** อย่าเริ่มงานใหม่
2. อ่าน error ให้จบ ดูว่าเทสต์ไหนล้ม คาดหวังอะไร ได้อะไร
3. แก้ **โค้ด** ให้ผ่าน — ⚠️ ห้ามแก้เทสต์ให้ผ่านเอง เว้นแต่พิสูจน์ได้ว่า "เทสต์เขียนผิด" และบันทึกเหตุผลไว้
4. รัน Gate ใหม่ทั้งชุด (ไม่ใช่แค่เทสต์ที่ล้ม)
5. บันทึกใน `CHECKPOINTS.md` ว่าเคยล้มเพราะอะไร แก้ยังไง (เป็นบทเรียนให้ทีม)

---

## 10. แผนงานทีละ Phase พร้อม Checkpoint

> สัญลักษณ์: 🔒 = ต้องผ่าน Checkpoint ก่อนหน้าก่อนจึงเริ่มได้

```
P0 ตั้งโปรเจกต์ → P1 Entities → P2 คำนวณ → P3 Use Cases → P4 เก็บในเครื่อง
→ P5 ฟอร์ม+Summary → P6 Sankey → P7 หลายแผน+Presets → P8 Firebase (Login+Cloud)
→ P9 PWA+มือถือ+E2E → P10 Deploy
```

### Phase 0 — ตั้งโปรเจกต์

**งาน**
- `create-next-app` (TypeScript, Tailwind, App Router, ESLint, `src/`)
- ตั้ง `next.config.ts` → `output: 'export'`, `images.unoptimized: true`, `basePath` จาก env
- ติดตั้ง Vitest + RTL, เพิ่ม scripts: `typecheck`, `test`, `test:watch`
- สร้างโฟลเดอร์ตามข้อ 7 (ว่างไว้ก่อน), `CHECKPOINTS.md`
- `git init` + `.gitignore` (ต้องมี `.env*.local`)

**✅ CP-0: โปรเจกต์พร้อม**
- 🤖 Gate ผ่าน (มีเทสต์ตัวอย่าง `1 + 1 = 2` อย่างน้อย 1 ตัว)
- 🤖 `npm run build` แล้วมีโฟลเดอร์ `out/` และ `out/index.html`
- 👀 `npm run dev` เปิด `http://localhost:3000` เห็นหน้า "Karngein" พร้อม style Tailwind

---

### Phase 1 — Domain: Entities & Money 🔒 CP-0

**งาน**
- `Money.ts`: `formatBaht(34166.666) → "฿34,166.67"`, `round2()`
- `Frequency.ts`, `Category.ts` (5 หมวด + ชื่อไทย + สี + ลำดับ), `Income.ts`, `Expense.ts`, `Period.ts`, `Plan.ts`
- ฟังก์ชัน validate: `validateIncome()` คืน error เมื่อชื่อว่าง / amount < 0 / one-time ไม่มีวันที่
- `createEmptyPlan()`

**✅ CP-1: Entities ถูกต้อง**
- 🤖 เทสต์ครอบคลุม:
  - `formatBaht(0)` → `"฿0.00"`, `formatBaht(1234.5)` → `"฿1,234.50"`, `formatBaht(-500)` → `"-฿500.00"`
  - `validateIncome({ amount: -1 })` → มี error
  - `validateIncome({ frequency: 'one-time', date: undefined })` → มี error
  - `CATEGORIES` มี 5 หมวด เรียงตามข้อ 8.2
  - `createEmptyPlan()` → incomes/expenses เป็น array ว่าง
- 🤖 ESLint rule `no-restricted-imports`: `src/domain/` import `react`, `next`, `firebase` หรือโฟลเดอร์ชั้นอื่นไม่ได้
- 🤖 Gate ผ่าน

---

### Phase 2 — Domain: การคำนวณ 🔒 CP-1

**งาน**
- `amountInPeriod(amount, frequency, date, period)` — กฎ R1–R5
- `groupTotal(group, period)` — R6
- `summarize(plan, period)` → `{ income, expense, saving, remaining, byCategory }` — R7–R10
- สร้าง `fixtures/reference-plan.json`

**✅ CP-2: ตัวเลขตรงกับเว็บต้นแบบ**
- 🤖 เทสต์กฎ R1–R12 อย่างน้อยกฎละ 1 เคส
- 🤖 **Golden test:** ชุดที่ 1 ทั้ง 4 มุมมอง + ชุดที่ 2 ในข้อ 9.3 ต้องได้ตัวเลข**ตรงทุกช่อง** (เทียบหลังปัด 2 ตำแหน่ง)
- 🤖 Edge case: แผนว่าง → ทุกค่า 0, รายได้ 0 → % = 0 ไม่เป็น `NaN`/`Infinity`
- 🤖 Gate ผ่าน

---

### Phase 3 — Application: Use Cases + Repository Port 🔒 CP-2

**งาน**
- Port `PlanRepository` (ข้อ 6.3) + `InMemoryPlanRepository`
- Use case แบบ **pure function** (รับ plan เดิม → คืน plan ใหม่ ไม่แก้ของเดิม):
  `addIncome`, `updateIncome`, `removeIncome`, `addExpenseGroup`, `updateExpenseGroup`, `removeExpenseGroup`, `addExpenseItem`, `updateExpenseItem`, `removeExpenseItem`, `organizeExpenses`
- Use case ที่ใช้ repository: `savePlan`, `loadPlan`, `listPlans`, `deletePlan`
- เขียน **contract test** `planRepository.contract.ts` (ชุดเทสต์กลางสำหรับทุก repository)

**✅ CP-3: Use Cases ทำงานถูก**
- 🤖 `addIncome` แล้วจำนวน incomes +1 และ **plan เดิมไม่ถูกแก้** (immutability)
- 🤖 `addIncome` ด้วยข้อมูลผิด (amount ติดลบ) → error, plan ไม่เปลี่ยน
- 🤖 `removeExpenseItem` รายการสุดท้ายของกลุ่ม → กลุ่มยังอยู่ ยอดกลุ่ม = 0
- 🤖 `organizeExpenses` เรียงตามลำดับหมวด essential → wants → investment → emergency → reward
- 🤖 Contract test ผ่านกับ `InMemoryPlanRepository`
- 🤖 Gate ผ่าน

---

### Phase 4 — Infrastructure: เก็บในเครื่อง (โหมด Guest) 🔒 CP-3

**งาน**
- Zod schema ของ Plan
- `LocalStoragePlanRepository` (key: `karngein:plans`)
- จัดการข้อมูลเสีย: parse ไม่ได้ → คืน list ว่าง + log warning (ไม่ทำให้แอปพัง)
- `di/container.ts`
- `exportPlanToJson()` / `importPlanFromJson()`

**✅ CP-4: บันทึกข้อมูลในเครื่องได้**
- 🤖 Contract test (ชุดเดียวกับ CP-3) ผ่านกับ `LocalStoragePlanRepository` (jsdom)
- 🤖 ใส่ string เสีย `"{abc"` ใน localStorage แล้ว `list()` → คืน `[]` ไม่ throw
- 🤖 export → import → ได้ plan เท่าเดิม
- 🤖 Gate ผ่าน

---

### Phase 5 — Presentation: ฟอร์มรายได้/รายจ่าย + Summary 🔒 CP-4

**งาน**
- `usePlan` hook (useReducer เรียก use case) + autosave debounce ~1 วินาที
- `Header`, `SummaryCards`, `PeriodSwitcher` (ค่าเริ่มต้นรายปี = **2027**), `IncomeList`, `ExpenseList` (กลุ่ม + รายการย่อย พับ/ขยายได้)
- `MoneyInput`: แสดง `30,000` แต่เก็บค่าเป็น `30000`, บนมือถือเปิดแป้นตัวเลข (`inputMode="decimal"`)
- **Mobile-first:** ออกแบบจอ 375px ก่อน แล้วขยายเป็น 2 คอลัมน์ที่ `lg:`; ปุ่ม/ช่องกรอกสูง ≥ 44px (นิ้วกดง่าย)

**✅ CP-5: ใช้งานฟอร์มได้**
- 🤖 RTL: พิมพ์ชื่อ + จำนวนแล้วกด "เพิ่มรายได้" → แถวใหม่ปรากฏ, การ์ดรายได้รวมเปลี่ยน
- 🤖 RTL: เปลี่ยนความถี่ 50,000 จาก "รายเดือน" เป็น "รายปี" → รายได้รวมรายเดือนลดลงเหลือ 4,166.67
- 🤖 RTL: เลือก one-time → ช่องวันที่ปรากฏ
- 👀 Manual:
  1. ป้อน Golden Data ด้วยมือ → การ์ดแสดง `฿34,166.67 / ฿20,916.67 / ฿5,000.00 / ฿13,250.00`
  2. กด "ดูรายปี" เลือก 2026 → `฿440,000.00 / ฿251,000.00 / ฿60,000.00 / ฿189,000.00`
  3. รีเฟรชหน้า → ข้อมูลยังอยู่
  4. DevTools โหมดมือถือ 375px → ไม่มี scroll แนวนอน, กดทุกปุ่มได้สบาย
  5. ใส่จำนวน `-100` หรือ `abc` → มีข้อความเตือน ไม่บันทึก
- 🤖 Gate ผ่าน

---

### Phase 6 — Sankey Diagram 🔒 CP-5

**งาน**
- `domain/services/buildFlowGraph.ts` → `{ nodes, links }` ตามข้อ 8.4 (Domain ล้วน ทดสอบได้)
- `SankeyChart.tsx` ใช้ `d3-sankey` คำนวณ layout + วาด SVG เอง, สีตามหมวด
- คลิก/แตะโหนดกลุ่ม → ยุบ/ขยายรายการย่อย
- `FlowToolbar`: ป้าย `% / ตัวเลข / ไม่แสดง`, ติ๊กกรองหมวด, ซูม +/−/รีเซ็ต, บันทึกรูป (PNG)
- บนมือถือ: กราฟอยู่ในกรอบ scroll แนวนอน + ปุ่มซูม (ไม่พึ่ง Ctrl+Scroll)
- `CategoryRatioCards` 5 ใบ + หมายเหตุ one-time ในมุมมองรายเดือน

**✅ CP-6: Sankey ถูกต้อง**
- 🤖 `buildFlowGraph(golden, monthly)`:
  - มีโหนด "เงินกองกลาง" ค่า 34,166.67
  - ผลรวม link ขาออกของทุกโหนด = ค่าโหนด (สมดุล)
  - มีโหนด "เงินคงเหลือ" = 13,250
- 🤖 กรณีรายจ่าย > รายได้ → มีโหนด "เงินขาด" และกราฟสมดุล
- 🤖 ยุบกลุ่ม "รายจ่ายหลัก" → ไม่มีโหนดรายการย่อยของกลุ่มนั้น
- 👀 Manual:
  1. % ตรงกับต้นแบบ: เงินเดือน 87.8%, โบนัส 12.2%, จำเป็น 34.4%, ออม 14.6%, ให้รางวัล 12.2%, คงเหลือ 38.8%
  2. สลับ "ตัวเลข" → ป้ายเป็น ฿, สลับ "ไม่แสดง" → ไม่มีป้าย
  3. ปิดหมวด "ให้รางวัลตัวเอง" → เส้นหมวดนั้นหายไป
  4. กด "บันทึกรูป" → ได้ไฟล์ PNG ที่เห็นกราฟครบ
  5. บนจอ 375px กราฟ scroll ได้ภายในกรอบ หน้าไม่ล้น
- 🤖 Gate ผ่าน

---

### Phase 7 — หลายแผน + Presets 🔒 CP-6

**งาน**
- Dropdown แผน: สร้างใหม่, เปลี่ยนชื่อ, สลับ, ลบ (ถามยืนยันก่อนลบ)
- ปุ่มส่งออก/นำเข้า JSON
- Presets 4 แบบ (มนุษย์เงินเดือน, นักเรียน/นักศึกษา, ครอบครัว, ฟรีแลนซ์) → `applyPreset` (ถามยืนยันถ้ามีข้อมูลอยู่)
- "กำหนดช่วง" เลือกเดือน/ปี เริ่ม–สิ้นสุด (validate: สิ้นสุดต้องไม่ก่อนเริ่ม)

**✅ CP-7: จัดการหลายแผนได้**
- 🤖 `applyPreset` ทุกแบบ → ได้ plan ที่ผ่าน Zod schema และ `summarize` ไม่เป็น NaN
- 🤖 ช่วงเวลาผิด (to < from) → error
- 👀 Manual:
  1. สร้าง 2 แผน ใส่ข้อมูลต่างกัน สลับไปมา → ข้อมูลไม่ปนกัน
  2. รีเฟรช → ทั้ง 2 แผนยังอยู่ และเปิดแผนล่าสุดที่ใช้
  3. ส่งออก JSON → ลบแผน → นำเข้า → ข้อมูลกลับมาครบ
  4. เลือก ก.ย.–พ.ย. 2026 กับ Golden Data → `฿132,500.00 / ฿62,750.00 / ฿15,000.00 / ฿69,750.00`
- 🤖 Gate ผ่าน

---

### Phase 8 — Firebase: Google Login + เก็บบนคลาวด์ 🔒 CP-7

**เตรียม (ทำครั้งเดียว — เจ้าของโปรเจกต์ทำเองใน Firebase Console)**
1. สร้างโปรเจกต์ Firebase (แพ็ก Spark ฟรี)
2. เปิด Authentication → Google
3. สร้าง Firestore Database (region `asia-southeast1` สิงคโปร์)
4. คัดลอกค่า config ใส่ `.env.local` (ห้าม commit) และทำ `.env.example` แบบไม่มีค่าจริง
5. ติดตั้ง `firebase-tools` + Java (Emulator ต้องใช้)

**งาน**
- `firebaseApp.ts`: `initializeApp` + `initializeFirestore` แบบ `persistentLocalCache` (ทำงานออฟไลน์)
- Port `AuthService` + `FirebaseAuthService` (`signInWithPopup` Google)
- `FirestorePlanRepository(uid)` → path `users/{uid}/plans/{planId}`
- `firestore.rules` ตามข้อ 5.5
- `migrateGuestPlans`: ย้ายแผนจาก localStorage → Firestore (ถ้า id ซ้ำ ใช้ `updatedAt` ที่ใหม่กว่า)
- UI: ปุ่ม "เข้าสู่ระบบด้วย Google", เมนูบัญชี (ชื่อ/รูป/ออกจากระบบ), ป้ายสถานะ `SyncBadge` (บันทึกแล้ว / กำลังบันทึก / ออฟไลน์ — จะ sync เมื่อต่อเน็ต)
- script `test:firebase` = `firebase emulators:exec "vitest run --project firebase"`

**✅ CP-8: Login และ Sync ข้ามเครื่องได้**
- 🤖 Contract test (ชุดเดิม) ผ่านกับ `FirestorePlanRepository` บน Emulator → **พิสูจน์ว่าสลับ adapter แล้ว behavior เหมือนเดิม**
- 🤖 Rules test (`@firebase/rules-unit-testing`):
  - ผู้ใช้ A อ่าน/เขียนแผนตัวเองได้
  - ผู้ใช้ A อ่านแผนของ B **ไม่ได้**
  - ไม่ล็อกอิน อ่าน/เขียน **ไม่ได้**
- 🤖 `migrateGuestPlans`: 2 แผนในเครื่อง → หลังย้าย Firestore มี 2 แผน, id ซ้ำเลือกตัวที่ `updatedAt` ใหม่กว่า
- 🤖 ค้นทั้งโปรเจกต์: `from 'firebase` มีเฉพาะใน `src/infrastructure/` (ESLint rule)
- 👀 Manual:
  1. ใช้แบบ Guest สร้างแผน → กดล็อกอิน → ตอบ "ย้าย" → แผนขึ้นคลาวด์ (ดูใน Firebase Console)
  2. แก้ข้อมูลบนคอมฯ → เปิดบนมือถือ (ล็อกอินบัญชีเดียวกัน) → เห็นข้อมูลล่าสุด
  3. มือถือเปิดโหมดเครื่องบิน → แก้ตัวเลข → ป้ายขึ้น "ออฟไลน์" → ปิดโหมดเครื่องบิน → sync ขึ้นคลาวด์ → คอมฯ เห็นค่าใหม่
  4. ออกจากระบบ → ไม่เห็นข้อมูลคลาวด์บนหน้าจอ
- 🤖 Gate + `test:firebase` ผ่าน

---

### Phase 9 — PWA + ขัดเกลาสำหรับมือถือ + E2E 🔒 CP-8

**งาน**
- `manifest.webmanifest` (ชื่อ, ไอคอน 192/512, `display: standalone`, `start_url`/`scope` ตาม basePath)
- `sw.js` แบบง่าย: cache ไฟล์หน้าเว็บ ให้เปิดแอปได้ตอนออฟไลน์ (ข้อมูลใช้ offline cache ของ Firestore)
- Meta สำหรับ iOS (`apple-touch-icon`, `theme-color`)
- Empty state, loading state, toast
- Accessibility: label ทุก input, ใช้คีย์บอร์ดได้, contrast ผ่าน
- Playwright: รันทั้ง viewport มือถือ (iPhone) และเดสก์ท็อป

**✅ CP-9: พร้อมใช้บนมือถือและคอมฯ**
- 🤖 E2E (มือถือ + เดสก์ท็อป): เปิดเว็บ → ใช้ preset มนุษย์เงินเดือน → เพิ่มรายจ่าย → สลับรายปี → ตัวเลขถูก → รีโหลด → ข้อมูลยังอยู่
- 🤖 Lighthouse (มือถือ): Performance ≥ 85, Accessibility ≥ 90
- 👀 Android (Chrome): "ติดตั้งแอป" → เปิดจากไอคอนเป็นเต็มจอ
- 👀 iPhone (Safari): แชร์ → "เพิ่มไปยังหน้าจอโฮม" → เปิดจากไอคอนเป็นเต็มจอ + ล็อกอิน Google ได้
- 👀 ปิดเน็ต แล้วเปิดแอปจากไอคอน → หน้าเว็บยังเปิดได้ เห็นข้อมูลล่าสุด
- 🤖 Gate ผ่าน

---

### Phase 10 — Deploy 🔒 CP-9

ดูข้อ 11

**✅ CP-10: ออนไลน์**
- 🤖 GitHub Actions: job `test` และ `deploy` เขียวทั้งคู่
- 👀 เปิด `https://<username>.github.io/karngein/` → หน้าโหลดครบ, CSS/JS ไม่ 404 (DevTools → Network)
- 👀 ล็อกอิน Google บนเว็บจริงได้ (ทั้งคอมฯ และมือถือ)
- 👀 ป้อน Golden Data บนเว็บจริง → ตัวเลขตรงข้อ 9.3
- 👀 ติดตั้ง PWA จากเว็บจริงบนมือถือได้

---

## 11. การ Deploy ขึ้น GitHub Pages

### 11.1 ตั้งค่า Next.js

```ts
// next.config.ts
import type { NextConfig } from 'next';

const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? '';

const nextConfig: NextConfig = {
  output: 'export',          // build เป็น static HTML ในโฟลเดอร์ out/
  basePath,                  // เช่น '/karngein' เพราะเว็บอยู่ใต้ /<repo>/
  images: { unoptimized: true },
  trailingSlash: true,
};

export default nextConfig;
```

### 11.2 GitHub Actions (`.github/workflows/deploy.yml`)

```yaml
name: Deploy to GitHub Pages
on:
  push:
    branches: [main]
permissions:
  contents: read
  pages: write
  id-token: write
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 20, cache: npm }
      - uses: actions/setup-java@v4       # Firebase Emulator ต้องใช้ Java
        with: { distribution: temurin, java-version: 21 }
      - run: npm ci
      - run: npm run lint && npm run typecheck && npm run test && npm run test:firebase
  deploy:
    needs: test                           # ← Checkpoint ใน CI: เทสต์ไม่ผ่าน = ไม่ deploy
    runs-on: ubuntu-latest
    environment: { name: github-pages, url: '${{ steps.deployment.outputs.page_url }}' }
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 20, cache: npm }
      - run: npm ci
      - run: npm run build
        env:
          NEXT_PUBLIC_BASE_PATH: /${{ github.event.repository.name }}
          NEXT_PUBLIC_FIREBASE_API_KEY: ${{ vars.FIREBASE_API_KEY }}
          NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: ${{ vars.FIREBASE_AUTH_DOMAIN }}
          NEXT_PUBLIC_FIREBASE_PROJECT_ID: ${{ vars.FIREBASE_PROJECT_ID }}
          NEXT_PUBLIC_FIREBASE_APP_ID: ${{ vars.FIREBASE_APP_ID }}
      - run: touch out/.nojekyll            # ให้ GitHub Pages เสิร์ฟโฟลเดอร์ _next ได้
      - uses: actions/upload-pages-artifact@v3
        with: { path: out }
      - id: deployment
        uses: actions/deploy-pages@v4
```

> `basePath` อ่านจากชื่อ repo อัตโนมัติ → ถ้าต้องใช้ชื่อสำรอง `chayut_karngein` ก็ไม่ต้องแก้โค้ด

### 11.3 ขั้นตอนบน GitHub
1. สร้าง repo ชื่อ `karngein` (ถ้าชื่อซ้ำในบัญชี ใช้ `chayut_karngein`)
2. `Settings → Pages → Source: GitHub Actions`
3. `Settings → Secrets and variables → Actions → Variables` ใส่ค่า `FIREBASE_*` 4 ตัว
4. Firebase Console → Authentication → Settings → Authorized domains → เพิ่ม `<username>.github.io`
5. Deploy Security Rules: `firebase deploy --only firestore:rules`
6. `git push origin main` → รอ Actions เขียว → เปิดลิงก์

---

## 12. บันทึกการตัดสินใจ (Decision Log)

| # | คำถาม | คำตอบ / ข้อสรุป | ผลต่อแผน |
|---|---|---|---|
| D1 | หมวด Security แยกหรือรวม? | **แยก** | เพิ่มหมวด `emergency` "เงินสำรองฉุกเฉิน" เป็นหมวดที่ 5, การ์ดคงเหลือเปลี่ยนชื่อเป็น "เงินคงเหลือ" |
| D2 | ใช้ได้ทั้งมือถือและเว็บ ต้องมีที่เก็บข้อมูล | **เสนอ Firebase (Firestore + Google Login) + โหมด Guest + PWA** ⏳ รอยืนยัน | เพิ่มข้อ 5, Phase 8 (Firebase), Phase 9 (PWA) |
| D3 | จะนำเข้า Sheet ไหม? | **เริ่มข้อมูลใหม่ทั้งหมดในปี 2027** | ตัดฟีเจอร์นำเข้า Sheet (ไป Backlog), มุมมองรายปีเริ่มต้นที่ 2027 |
| D4 | ชื่อ repo | **`karngein`** (สำรอง: `chayut_karngein`) | URL `https://<username>.github.io/karngein/` |
| D5 | ภาษาหน้าเว็บ | ภาษาไทยเป็นหลัก | – |
| D6 | one-time ในมุมมองรายเดือน | ไม่นับ + แสดงหมายเหตุ (กฎ R3) | – |
| D7 | สูตรแถวคงเหลือใน Sheet | `=Income[[#TOTALS],[งบประมาณ เดือน]]-SUM(C31,C35,C38)` = รายรับ − (Need+Invest+Security) | ยืนยันกฎ R7 + R9 ✔ (ตัวเลขใน Sheet ไม่ตรงน่าจะเพราะอ้างคอลัมน์ C ที่ซ่อน — ข้อ 2) |

---

## 13. งานที่เก็บไว้ทำภายหลัง (Backlog)

| งาน | หมายเหตุ |
|---|---|
| นำเข้าจาก Google Sheet (CSV) | ถ้าต้องการย้ายข้อมูลเก่า — โครงสร้าง Sheet อยู่ในข้อ 2 แล้ว |
| บันทึกยอดจริงรายเดือน เทียบกับแผน (Actual vs Plan) | Sheet เดิมเป็นแบบงบรายเดือน — ถ้าต้องการติดตามว่าใช้จริงเกินแผนไหม |
| มุมมองเปรียบเทียบหลายเดือน | กราฟแท่งรายเดือนทั้งปี |
| Dark mode | – |
| แชร์แผนให้คู่ชีวิต/ครอบครัวดูร่วมกัน | ต้องแก้ Security Rules |

---

## 14. อภิธานศัพท์

| คำ | ความหมาย |
|---|---|
| **Cash Flow** | กระแสเงินสด — เงินเข้า เงินออก ในช่วงเวลาหนึ่ง |
| **Sankey Diagram** | แผนภาพที่ความหนาของเส้นแสดงปริมาณที่ไหลจากจุดหนึ่งไปอีกจุด |
| **Entity** | โครงสร้างข้อมูลหลักของธุรกิจ เช่น Income, Plan |
| **Use Case** | สิ่งที่ผู้ใช้ทำได้ 1 อย่าง เช่น "เพิ่มรายได้" |
| **Port** | Interface ที่ชั้น Application กำหนดว่า "ต้องการความสามารถอะไร" |
| **Adapter** | โค้ดใน Infrastructure ที่ทำตาม Port เช่น FirestorePlanRepository |
| **Pure function** | ฟังก์ชันที่ input เดิมได้ output เดิมเสมอ และไม่แก้ของภายนอก |
| **Immutability** | ไม่แก้ข้อมูลเดิม แต่สร้างก้อนใหม่ — React ต้องการแบบนี้เพื่อรู้ว่าข้อมูลเปลี่ยน |
| **Golden test** | เทสต์ที่เทียบผลลัพธ์กับชุดคำตอบที่รู้ว่าถูกแน่นอน |
| **Contract test** | ชุดเทสต์เดียวที่รันกับหลาย implementation เพื่อยืนยันว่าทำตาม interface เหมือนกัน |
| **Gate** | ชุดคำสั่ง lint + typecheck + test + build ที่ต้องผ่านทุก Checkpoint |
| **Static export** | Build เว็บเป็นไฟล์ HTML/CSS/JS ล้วน ไม่ต้องมีเซิร์ฟเวอร์ Node |
| **Firestore** | ฐานข้อมูลคลาวด์ของ Google เก็บข้อมูลเป็น "เอกสาร" (คล้าย JSON) |
| **Security Rules** | กฎบน Firestore ที่กำหนดว่าใครอ่าน/เขียนข้อมูลไหนได้ — ด่านป้องกันข้อมูลจริง |
| **Emulator** | Firebase จำลองที่รันในเครื่องเรา ใช้ทดสอบโดยไม่แตะข้อมูลจริง |
| **PWA** | Progressive Web App — เว็บที่ติดตั้งบนหน้าจอมือถือและเปิดเหมือนแอปได้ |
| **Offline cache** | สำเนาข้อมูลในเครื่อง ทำให้ใช้งานได้ตอนไม่มีเน็ต แล้ว sync ภายหลัง |
| **Guest mode** | ใช้งานโดยไม่ล็อกอิน ข้อมูลอยู่ในเครื่องนั้นเท่านั้น |

---

**ขั้นตอนถัดไป:** ยืนยัน D2 (Firebase) → เริ่ม **Phase 0** → ผ่าน **CP-0** → ไปต่อ Phase 1
