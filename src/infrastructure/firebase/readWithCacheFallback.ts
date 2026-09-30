/**
 * readWithCacheFallback — อ่านจากเซิร์ฟเวอร์ แต่ "ไม่รอนานเกินไป"
 *
 * ปัญหาที่แก้: ปิดแอปบนมือถือแล้วเปิดใหม่ การเชื่อมต่อมักยังไม่พร้อม Firestore จะรอเซิร์ฟเวอร์นานมาก (10+ วินาที)
 * ทั้งที่ข้อมูลอยู่ใน cache ในเครื่องแล้ว → หน้าค้าง "กำลังโหลด"
 *
 * กติกา:
 * 1. ถามเซิร์ฟเวอร์ก่อน (ได้ข้อมูลล่าสุด เช่น ที่แก้จากอีกเครื่อง)
 * 2. เซิร์ฟเวอร์ตอบช้ากว่า timeoutMs หรือ error (เช่น ออฟไลน์) → ใช้ข้อมูลใน cache
 * 3. cache ไม่มีข้อมูล → รอเซิร์ฟเวอร์ต่อ (ไม่มีทางเลือกอื่น)
 */
export async function readWithCacheFallback<T>(
  fromServer: () => Promise<T>,
  fromCache: () => Promise<T | null>,
  timeoutMs: number,
): Promise<T> {
  const server = fromServer();
  server.catch(() => {}); // กัน "unhandled rejection" ถ้าเราเลือกใช้ cache ไปแล้ว

  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<"timeout">((resolve) => {
    timer = setTimeout(() => resolve("timeout"), timeoutMs);
  });

  let serverError: unknown = null;
  const first = await Promise.race([
    server.then(
      (value) => ({ value }),
      (error) => {
        serverError = error;
        return "error" as const;
      },
    ),
    timeout,
  ]);
  clearTimeout(timer);
  if (typeof first === "object") return first.value;

  const cached = await fromCache().catch(() => null);
  if (cached !== null) return cached;
  if (serverError) throw serverError; // เซิร์ฟเวอร์ error และไม่มี cache → แจ้ง error
  return server; // ช้าแต่ยังไม่ error และไม่มี cache → รอต่อ
}
