/**
 * สร้างไอคอน PNG ของแอป (ใช้ครั้งเดียว แล้ว commit ไฟล์ใน public/icons/)
 * รัน: node scripts/generate-icons.mjs
 *
 * ใช้ ImageResponse จาก next/og (มากับ Next.js อยู่แล้ว ไม่ต้องติดตั้งอะไรเพิ่ม)
 * วาดโลโก้เดียวกับใน Header: พื้นสี indigo + "เงินหลายทางไหลมารวมกัน" (แนวคิดของผัง Sankey)
 */
import { writeFile } from "node:fs/promises";
import { createElement as h } from "react";
import { ImageResponse } from "next/og.js"; // ESM ใน Node ต้องระบุนามสกุลไฟล์

// maskable = ไอคอนที่ Android ตัดเป็นวงกลม/สี่เหลี่ยมมน → เว้นขอบให้โลโก้อยู่ในพื้นที่ปลอดภัย 80% ตรงกลาง
const targets = [
  { file: "icon-192.png", size: 192, padding: 0.18, radius: 0.22 },
  { file: "icon-512.png", size: 512, padding: 0.18, radius: 0.22 },
  { file: "icon-maskable-512.png", size: 512, padding: 0.28, radius: 0 },
  { file: "apple-touch-icon.png", size: 180, padding: 0.18, radius: 0 }, // iOS ตัดมุมให้เอง
];

const logo = (stroke) =>
  h(
    "svg",
    { viewBox: "0 0 24 24", width: "100%", height: "100%", fill: "none", stroke: "white", strokeWidth: stroke, strokeLinecap: "round", strokeLinejoin: "round" },
    h("path", { d: "M3 6c6 0 6 6 11 6h7" }),
    h("path", { d: "M3 18c6 0 6-6 11-6" }),
    h("path", { d: "m17.5 8.5 3.5 3.5-3.5 3.5" }),
  );

for (const { file, size, padding, radius } of targets) {
  const image = new ImageResponse(
    h(
      "div",
      {
        style: {
          width: "100%",
          height: "100%",
          display: "flex",
          background: "#4f46e5",
          borderRadius: `${radius * size}px`,
          padding: `${padding * size}px`,
        },
      },
      logo(2),
    ),
    { width: size, height: size },
  );
  await writeFile(`public/icons/${file}`, Buffer.from(await image.arrayBuffer()));
  console.log("✓", file);
}
