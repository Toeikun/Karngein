/**
 * อ่านไฟล์/Blob เป็นข้อความ
 * ใช้ FileReader แทน file.text() เพราะรองรับเบราว์เซอร์เก่า (Safari < 14) และ jsdom ที่ใช้ในเทสต์
 */
export function readText(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsText(blob);
  });
}
