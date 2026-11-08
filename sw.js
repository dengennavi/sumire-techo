// オフライン対応：アプリ本体をキャッシュ。更新時は VERSION を上げる
const VERSION = "v4-2026-11-08";
const FILES = ["./", "index.html", "style.css", "app.js", "calc.js", "rules.js", "config.js", "privacy.html", "takarat.html", "takarat-deadline.html", "manifest.webmanifest", "icon.svg", "icon-192.png", "icon-512.png"];
self.addEventListener("install", (e) => { e.waitUntil(caches.open(VERSION).then((c) => c.addAll(FILES))); self.skipWaiting(); });
self.addEventListener("activate", (e) => {
  e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== VERSION).map((k) => caches.delete(k)))));
  self.clients.claim();
});
// 同一オリジンのみ：ネット優先→失敗時キャッシュ（ルール更新を早く届けるため）
self.addEventListener("fetch", (e) => {
  const u = new URL(e.request.url);
  if (e.request.method !== "GET" || u.origin !== location.origin) return;
  e.respondWith(fetch(e.request).then((r) => { const c = r.clone(); caches.open(VERSION).then((ca) => ca.put(e.request, c)); return r; }).catch(() => caches.match(e.request, { ignoreSearch: true })));
});
