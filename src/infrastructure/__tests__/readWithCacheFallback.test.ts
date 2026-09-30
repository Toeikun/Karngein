import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { readWithCacheFallback } from "@/infrastructure/firebase/readWithCacheFallback";

const never = <T,>() => new Promise<T>(() => {});
const later = <T,>(value: T, ms: number) => new Promise<T>((resolve) => setTimeout(() => resolve(value), ms));

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

describe("readWithCacheFallback — ไม่ให้หน้าค้างเพราะรอเซิร์ฟเวอร์", () => {
  it("เซิร์ฟเวอร์ตอบเร็ว → ใช้ข้อมูลเซิร์ฟเวอร์ (ไม่อ่าน cache)", async () => {
    const cache = vi.fn(async () => "cache");
    const result = readWithCacheFallback(() => later("server", 100), cache, 3000);
    await vi.advanceTimersByTimeAsync(100);
    await expect(result).resolves.toBe("server");
    expect(cache).not.toHaveBeenCalled();
  });

  it("เซิร์ฟเวอร์ไม่ตอบเลย (เปิดแอปใหม่ เน็ตยังไม่พร้อม) → ครบ 3 วินาทีใช้ cache", async () => {
    const result = readWithCacheFallback(() => never<string>(), async () => "cache", 3000);
    await vi.advanceTimersByTimeAsync(3000);
    await expect(result).resolves.toBe("cache");
  });

  it("เซิร์ฟเวอร์ error (ออฟไลน์) → ใช้ cache ทันที ไม่ต้องรอครบเวลา", async () => {
    const result = readWithCacheFallback(() => Promise.reject(new Error("offline")), async () => "cache", 3000);
    await vi.advanceTimersByTimeAsync(0);
    await expect(result).resolves.toBe("cache");
  });

  it("ช้า + cache ว่าง → รอเซิร์ฟเวอร์ต่อจนได้ข้อมูล", async () => {
    const result = readWithCacheFallback(() => later("server", 8000), async () => null, 3000);
    await vi.advanceTimersByTimeAsync(8000);
    await expect(result).resolves.toBe("server");
  });

  it("error + cache ว่าง → ส่ง error ต่อ (หน้าจอแสดงข้อความ ไม่ค้าง)", async () => {
    const result = readWithCacheFallback(() => Promise.reject(new Error("permission-denied")), async () => null, 3000);
    const assertion = expect(result).rejects.toThrow("permission-denied");
    await vi.advanceTimersByTimeAsync(0);
    await assertion;
  });
});
