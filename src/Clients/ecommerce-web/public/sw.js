/* Yıldırım Store — stale-while-revalidate for static assets + catalog GETs */
const CACHE_STATIC = "ys-static-v1";
const CACHE_CATALOG = "ys-catalog-v1";

const STATIC_EXT =
  /\.(?:js|css|woff2?|ttf|otf|png|jpg|jpeg|gif|webp|avif|svg|ico|webmanifest)(?:\?.*)?$/i;

function isCatalogGet(url) {
  try {
    const u = new URL(url);
    return (
      u.pathname.includes("/catalog/") ||
      u.pathname.startsWith("/catalog")
    );
  } catch {
    return false;
  }
}

self.addEventListener("install", (event) => {
  event.waitUntil(self.skipWaiting());
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((k) => k !== CACHE_STATIC && k !== CACHE_CATALOG)
          .map((k) => caches.delete(k)),
      ),
    ).then(() => self.clients.claim()),
  );
});

async function staleWhileRevalidate(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);

  const networkPromise = fetch(request)
    .then((response) => {
      if (response && response.ok) {
        cache.put(request, response.clone());
      }
      return response;
    })
    .catch(() => cached);

  return cached || networkPromise;
}

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = request.url;

  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request).catch(async () => {
        const cache = await caches.open(CACHE_STATIC);
        return (
          (await cache.match("/offline")) ||
          (await cache.match("/offline/")) ||
          Response.redirect("/offline", 302)
        );
      }),
    );
    return;
  }

  if (STATIC_EXT.test(url) || request.destination === "style" || request.destination === "script" || request.destination === "font" || request.destination === "image") {
    event.respondWith(staleWhileRevalidate(request, CACHE_STATIC));
    return;
  }

  if (isCatalogGet(url)) {
    event.respondWith(staleWhileRevalidate(request, CACHE_CATALOG));
  }
});
