import type { Metadata, Viewport } from "next";
import { Noto_Sans_Thai } from "next/font/google";
import { ServiceWorkerRegistration } from "@/presentation/components/ServiceWorkerRegistration";
import "./globals.css";

const notoSansThai = Noto_Sans_Thai({
  variable: "--font-noto-sans-thai",
  subsets: ["thai", "latin"],
});

const base = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

export const metadata: Metadata = {
  title: "Karngein — วางแผนกระแสเงินสด",
  description: "จัดการรายได้-รายจ่าย และดูภาพรวมการเงินส่วนบุคคล",
  applicationName: "Karngein",
  // iOS: เปิดจากไอคอนหน้าจอโฮมแบบเต็มจอ + ไอคอนเฉพาะของ iOS
  appleWebApp: { capable: true, title: "Karngein", statusBarStyle: "default" },
  icons: { icon: `${base}/icons/icon-192.png`, apple: `${base}/icons/apple-touch-icon.png` },
};

export const viewport: Viewport = {
  themeColor: "#4f46e5",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="th" className={`${notoSansThai.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">
        {children}
        <ServiceWorkerRegistration />
      </body>
    </html>
  );
}
