/* =========================================================
   Perlahomes Guest Guide — service worker
   Makes the guide work offline and installable.

   Caching strategy:
   - App shell (html/css/js/icons/manifest): cached on install,
     then stale-while-revalidate so updates arrive on next visit.
   - Page navigations: network-first, fall back to cached shell offline.
   - Property data (/data/*.json): network-first, fall back to cache,
     so content edits reach guests who have signal.
   - Images & fonts: cache-first (they rarely change).

   Bump CACHE when you change the shell files to force a refresh.
   ========================================================= */
const CACHE = "perla-v6";

const SHELL = [
  "./",
  "./index.html",
  "./styles.css",
  "./app.js",
  "./manifest.json",
  "./icons/icon-192.png",
  "./icons/icon-512.png"
];

self.addEventListener("install", (e) => {
  e.waitUntil(
    caches.open(CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

function put(req, res) {
  const copy = res.clone();
  caches.open(CACHE).then((c) => c.put(req, copy));
  return res;
}
function networkFirst(req) {
  return fetch(req).then((res) => put(req, res)).catch(() => caches.match(req));
}
function cacheFirst(req) {
  return caches.match(req).then((hit) => hit || fetch(req).then((res) => put(req, res)));
}
function staleWhileRevalidate(req) {
  return caches.match(req).then((hit) => {
    const fresh = fetch(req).then((res) => put(req, res)).catch(() => hit);
    return hit || fresh;
  });
}

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);

  // page loads (incl. ?p=slug) — try network, fall back to cached shell offline
  if (req.mode === "navigate") {
    e.respondWith(fetch(req).then((res) => put(req, res)).catch(() => caches.match("./index.html")));
    return;
  }
  // property data — always prefer fresh, fall back to cache offline
  if (url.pathname.endsWith(".json")) {
    e.respondWith(networkFirst(req));
    return;
  }
  // images — cache-first
  if (/\.(png|jpg|jpeg|webp|svg|gif)$/i.test(url.pathname)) {
    e.respondWith(cacheFirst(req));
    return;
  }
  // everything else (css/js/fonts) — stale-while-revalidate
  e.respondWith(staleWhileRevalidate(req));
});
