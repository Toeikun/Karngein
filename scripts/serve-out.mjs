/**
 * เสิร์ฟโฟลเดอร์ out/ (ผล build) แบบเดียวกับ GitHub Pages — ใช้ใน E2E test
 * รัน: node scripts/serve-out.mjs [port]   (ค่าเริ่มต้น 4173)
 * ไม่ต้องติดตั้งแพ็กเกจเพิ่ม ใช้ http ของ Node ล้วน
 * บีบอัด gzip ให้ไฟล์ข้อความเหมือน GitHub Pages (วัด Lighthouse ได้ใกล้ของจริง)
 */
import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import { createServer } from "node:http";
import { extname, join, normalize } from "node:path";
import { createGzip } from "node:zlib";

const ROOT = join(process.cwd(), "out");
const PORT = Number(process.argv[2] ?? 4173);
const TYPES = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json",
  ".webmanifest": "application/manifest+json",
  ".png": "image/png",
  ".ico": "image/x-icon",
  ".svg": "image/svg+xml",
  ".woff2": "font/woff2",
  ".txt": "text/plain; charset=utf-8",
};

async function resolveFile(urlPath) {
  const safe = normalize(decodeURIComponent(urlPath)).replace(/^(\.\.[/\\])+/, "");
  const path = join(ROOT, safe);
  if (!path.startsWith(ROOT)) return null;
  try {
    const info = await stat(path);
    if (info.isDirectory()) return resolveFile(join(safe, "index.html"));
    return path;
  } catch {
    return null;
  }
}

createServer(async (request, response) => {
  const url = new URL(request.url ?? "/", "http://localhost");
  const file = (await resolveFile(url.pathname)) ?? join(ROOT, "404.html");
  const status = file.endsWith("404.html") && !url.pathname.endsWith("404.html") ? 404 : 200;
  const type = TYPES[extname(file)] ?? "application/octet-stream";
  const compress = /text|javascript|json|manifest|svg/.test(type) && /gzip/.test(request.headers["accept-encoding"] ?? "");
  response.writeHead(status, { "Content-Type": type, ...(compress ? { "Content-Encoding": "gzip" } : {}) });
  const stream = createReadStream(file);
  (compress ? stream.pipe(createGzip()) : stream).pipe(response);
}).listen(PORT, () => console.log(`serving out/ at http://localhost:${PORT}`));
