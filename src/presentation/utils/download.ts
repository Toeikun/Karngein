/** ให้เบราว์เซอร์ดาวน์โหลดข้อความเป็นไฟล์ */
export function downloadText(fileName: string, content: string, mimeType = "application/json") {
  const url = URL.createObjectURL(new Blob([content], { type: mimeType }));
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  link.click();
  URL.revokeObjectURL(url);
}

/** ตัดอักขระที่ใช้ในชื่อไฟล์ไม่ได้ */
export const safeFileName = (name: string) => name.replace(/[\\/:*?"<>|\s]+/g, "-").slice(0, 60) || "plan";
