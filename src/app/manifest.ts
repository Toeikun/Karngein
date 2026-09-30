/**
 * Web App Manifest — ข้อมูลที่ทำให้ "ติดตั้งแอป" ลงหน้าจอมือถือ/คอมฯ ได้ (PWA)
 * Next.js สร้างไฟล์ /manifest.webmanifest ให้ตอน build และใส่ <link rel="manifest"> ให้อัตโนมัติ
 *
 * ต้องใส่ basePath เอง เพราะบน GitHub Pages แอปอยู่ใต้ /<ชื่อ repo>/
 */
import type { MetadataRoute } from "next";

export const dynamic = "force-static";

const base = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: `${base}/`,
    name: "Karngein — วางแผนกระแสเงินสด",
    short_name: "Karngein",
    description: "จัดการรายได้-รายจ่าย และดูภาพรวมการเงินส่วนบุคคล",
    lang: "th",
    start_url: `${base}/`,
    scope: `${base}/`,
    display: "standalone",
    background_color: "#f8fafc",
    theme_color: "#4f46e5",
    icons: [
      { src: `${base}/icons/icon-192.png`, sizes: "192x192", type: "image/png", purpose: "any" },
      { src: `${base}/icons/icon-512.png`, sizes: "512x512", type: "image/png", purpose: "any" },
      { src: `${base}/icons/icon-maskable-512.png`, sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
