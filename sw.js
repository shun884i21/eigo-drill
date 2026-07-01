// オフラインキャッシュ（PWA）：オンライン時は最新を取得し、オフライン時のみキャッシュを使う
const CACHE = "eigo-drill-v15";
const ASSETS = [
  "./index.html",
  "./app.js",
  "./data.js",
  "./japan-map.js",
  "./manifest.json",
  "./icon.svg",
];
self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});
self.addEventListener("message", (e) => { if (e.data === "skip") self.skipWaiting(); });
self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});
self.addEventListener("fetch", (e) => {
  if (e.request.method !== "GET") return;
  // ネットワーク優先：最新を取りに行き、成功したらキャッシュも更新。失敗時はキャッシュへ。
  e.respondWith(
    fetch(e.request)
      .then((res) => {
        const copy = res.clone();
        caches.open(CACHE).then((c) => c.put(e.request, copy)).catch(() => {});
        return res;
      })
      .catch(() => caches.match(e.request).then((hit) => hit || caches.match("./index.html")))
  );
});
