import type { NextConfig } from "next";

// GitHub Pages เสิร์ฟเว็บใต้ /<ชื่อ repo>/ จึงต้องตั้ง basePath ตอน build
// ตอนรันในเครื่อง (npm run dev) ไม่ได้ตั้งค่านี้ → ใช้ '' (root)
const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

const nextConfig: NextConfig = {
  output: "export", // build เป็นไฟล์ static ในโฟลเดอร์ out/
  basePath,
  images: { unoptimized: true }, // static export ใช้ image optimization ไม่ได้
  trailingSlash: true,
  // ล็อกโฟลเดอร์โปรเจกต์ ไม่ให้ Next.js ไปอ่าน package-lock.json ที่อยู่นอกโปรเจกต์
  turbopack: { root: process.cwd() },
};

export default nextConfig;
