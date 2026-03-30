// sw.js — PrivaPDF Service Worker
// Caches the app shell for offline use.
// AI model weights are already cached by Transformers.js in IndexedDB —
// this SW only needs to handle the UI/app assets.

const CACHE_NAME = "privapdf-v1";

// App shell — everything needed to show the UI offline
const APP_SHELL = [
  "/",
  "/convert",
  "/manifest.json",
];

// ── Install: pre-cache app shell ──────────────────────────────────────────────
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      // addAll fails if any request fails — use individual adds to be resilient
      return Promise.allSettled(
        APP_SHELL.map((url) =>
          cache.add(url).catch(() => {
            // silently skip assets that fail (e.g. during first build)
          })
        )
      );
    }).then(() => self.skipWaiting())
  );
});

// ── Activate: clean up old caches ────────────────────────────────────────────
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      )
    ).then(() => self.clients.claim())
  );
});

// ── Fetch: network-first for navigation, cache-first for assets ───────────────
self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET, cross-origin requests, and HuggingFace model fetches
  // (those are handled by Transformers.js / IndexedDB — don't intercept)
  if (
    request.method !== "GET" ||
    url.origin !== self.location.origin ||
    url.pathname.startsWith("/_next/webpack-hmr")
  ) {
    return;
  }

  // Static assets (_next/static) — cache-first, long-lived
  if (url.pathname.startsWith("/_next/static/")) {
    event.respondWith(
      caches.match(request).then((cached) => {
        if (cached) return cached;
        return fetch(request).then((response) => {
          if (response.ok) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          }
          return response;
        });
      })
    );
    return;
  }

  // Navigation requests (HTML pages) — network-first, fall back to cache
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response.ok) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          }
          return response;
        })
        .catch(() => caches.match(request).then((cached) => cached || caches.match("/")))
    );
    return;
  }

  // Everything else — stale-while-revalidate
  event.respondWith(
    caches.match(request).then((cached) => {
      const networkFetch = fetch(request).then((response) => {
        if (response.ok) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
        }
        return response;
      });
      return cached || networkFetch;
    })
  );
});
