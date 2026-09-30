/**
 * Service Worker ของ Karngein — ทำให้ "เปิดแอปได้ตอนออฟไลน์"
 *
 * เก็บเฉพาะไฟล์ของหน้าเว็บ (HTML/JS/CSS/ไอคอน) — ข้อมูลแผนไม่ได้อยู่ที่นี่
 * (โหมด Guest อยู่ใน localStorage, โหมดล็อกอินอยู่ใน offline cache ของ Firestore)
 *
 * กลยุทธ์:
 * - หน้าเว็บ (navigate): เน็ตก่อน → ได้ของใหม่เสมอเมื่อออนไลน์ / ออฟไลน์ใช้ของที่เก็บไว้
 * - /_next/static/*: ใช้ของที่เก็บไว้ก่อน (ชื่อไฟล์มี hash ไม่เปลี่ยนเนื้อหา)
 * - ไฟล์อื่นในเว็บเดียวกัน (ไอคอน, manifest): ใช้ของเก่าทันที แล้วอัปเดตเบื้องหลัง
 * - คำขอไปเว็บอื่น (Firebase, Google) ไม่แตะ
 */
const CACHE = "karngein-v1";
const SCOPE = self.registration.scope; // เช่น https://toeikun.github.io/Karngein/
const APP_SHELL = [SCOPE, `${SCOPE}manifest.webmanifest`, `${SCOPE}icons/icon-192.png`];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(APP_SHELL)));
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key))))
      .then(() => self.clients.claim()),
  );
});

async function networkFirst(request) {
  const cache = await caches.open(CACHE);
  try {
    const response = await fetch(request);
    if (response.ok) cache.put(request, response.clone());
    return response;
  } catch {
    return (await cache.match(request)) ?? (await cache.match(SCOPE)) ?? Response.error();
  }
}

async function cacheFirst(request) {
  const cached = await caches.match(request);
  if (cached) return cached;
  const response = await fetch(request);
  if (response.ok) (await caches.open(CACHE)).put(request, response.clone());
  return response;
}

async function staleWhileRevalidate(request) {
  const cache = await caches.open(CACHE);
  const cached = await cache.match(request);
  const refresh = fetch(request)
    .then((response) => {
      if (response.ok) cache.put(request, response.clone());
      return response;
    })
    .catch(() => cached);
  return cached ?? refresh;
}

self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);
  if (request.method !== "GET" || !request.url.startsWith(SCOPE)) return; // ไม่ยุ่งกับเว็บอื่น

  if (request.mode === "navigate") event.respondWith(networkFirst(request));
  else if (url.pathname.includes("/_next/static/")) event.respondWith(cacheFirst(request));
  else event.respondWith(staleWhileRevalidate(request));
});
