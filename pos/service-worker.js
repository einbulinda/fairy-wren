// Fairy Wren POS Service Worker
// Strategy: Cache static assets only, never cache API calls

const CACHE_NAME = "fairy-wren-v1";
const APP_SHELL = [
  "/",
  "/index.html",
  "/fairy.svg",
  "/fairy-logo-only.png",
  "/fairy-wren-logo-removebg.png",
];

const STATIC_ASSETS = [
  
  "/index.html",
  "/fairy.svg",
  "/fairy-logo-only.png",
  "/fairy-wren-logo-removebg.png",
  "/icons/icon-192.png",
  "/icons/icon-512.png",
  "/icons/favicon-96x96.png",
  "/icons/favicon.svg",
];

// Install: Cache static assets
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(STATIC_ASSETS))
      .then(() => self.skipWaiting()),
  );
});

// Activate: Take control immediately
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((cacheNames) =>
        Promise.all(
          cacheNames
            .filter((name) => name !== CACHE_NAME)
            .map((name) => caches.delete(name)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

// Fetch: Smart caching strategy
self.addEventListener("fetch", (event) => {
  const { request } = event;
  const { url, method } = request;

  // Only handle GET requests
  if (method !== "GET") {
    return;
  }

  const urlObj = new URL(url);
  const isAPI =
    urlObj.pathname.startsWith("/bills") ||
    urlObj.pathname.startsWith("/products") ||
    urlObj.pathname.startsWith("/auth") ||
    urlObj.pathname.startsWith("/categories") ||
    urlObj.pathname.startsWith("/inventory") ||
    urlObj.pathname.startsWith("/payments");

  const isStatic = STATIC_ASSETS.some(
    (path) => urlObj.pathname === path || urlObj.pathname.endsWith(path),
  );

  // Strategy 1: API calls - Network only, NEVER cache
  if (isAPI) {
    event.respondWith(fetch(request));
    return;
  }

  // Strategy 2: Static assets - Cache first, network fallback
  if (isStatic) {
    event.respondWith(
      caches.match(request).then((cached) => {
        if (cached) {
          return cached;
        }
        return fetch(request).then((response) => {
          if (
            !response ||
            response.status !== 200 ||
            response.type !== "basic"
          ) {
            return response;
          }
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          return response;
        });
      }),
    );
    return;
  }

  // Strategy 3: Navigation requests - Network first, cache fallback
  if (request.mode === "navigate") {
    event.respondWith(fetch(request).catch(() => caches.match("/index.html")));
    return;
  }

  // Strategy 4: Everything else - Network first
  event.respondWith(fetch(request).catch(() => caches.match(request)));
});

// Handle messages from client
self.addEventListener("message", (event) => {
  if (event.data === "skipWaiting") {
    self.skipWaiting();
  }
});
