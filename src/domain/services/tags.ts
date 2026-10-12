/**
 * #tag — แท็กที่พิมพ์ในโน้ต เช่น "ข้าวกับเพื่อน #ทำงาน #กินนอกบ้าน"
 * ไม่ต้องเก็บแยก: ดึงจากโน้ตตอนใช้งาน (โน้ตคือแหล่งข้อมูลเดียว)
 */
export function extractTags(text: string | undefined): string[] {
  if (!text) return [];
  const tags = [...text.matchAll(/#([^\s#]+)/g)].map((m) => m[1].toLowerCase());
  return [...new Set(tags)];
}

/** โน้ตที่ตัดแท็กออก เช่น "ข้าวกับเพื่อน #ทำงาน" → "ข้าวกับเพื่อน" */
export function stripTags(text: string | undefined): string {
  return (text ?? "").replace(/#[^\s#]+/g, "").replace(/\s+/g, " ").trim();
}
