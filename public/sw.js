// sw.js — PrivaPDF Service Worker
// Caches the app shell for offline use.
// AI model weights are already cached by Transformers.js in IndexedDB —
// this SW only needs to handle the UI/app assets.
//
// IMPORTANT: Never cache RSC payloads (/_next/data/, .txt RSC requests) or
// HMR/webpack streams — stale RSC data causes "enqueueModel is not a function"
// hydration crashes in React 19 / Next.js 16.

// Bump this version any time you deploy to force cache refresh on all clients.
const CACHE_NAME = "privapdf-v2";

// Only immutable static assets are worth pre-caching.
// Navigation HTML is always fetched fresh (network-first).
const APP_SHELL = [
  "/manifest.json",
];

// ── Install: pre-cache manifest only ─────────────────────────────────────────
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return Promise.allSettled(
        APP_SHELL.map((url) =>
          cache.add(url).catch(() => {
            // silently skip assets that fail (e.g. during dev)
          })
        )
      );
    }).then(() => self.skipWaiting())
  );
});

// ── Activate: clean up ALL old caches ────────────────────────────────────────
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

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Returns true for requests that must NEVER be cached or intercepted:
 *  - RSC flight payloads  (/_next/…/*.txt  or  ?_rsc= queries)
 *  - HMR / webpack dev streams
 *  - Non-GET requests
 *  - Cross-origin requests (HuggingFace CDN, etc.)
 */
function shouldBypass(request, url) {
  if (request.method !== "GET") return true;
  if (url.origin !== self.location.origin) return true;

  const p = url.pathname;

  // Next.js internals that must never be cached
  if (p.startsWith("/_next/webpack-hmr")) return true;
  if (p.startsWith("/_next/data/")) return true;   // pages-router RSC data
  if (p.endsWith(".txt") && p.startsWith("/_next/")) return true; // app-router RSC

  // RSC fetch requests — identified by query param or Accept header
  if (url.searchParams.has("_rsc")) return true;
  if (request.headers.get("rsc") === "1") return true;
  if ((request.headers.get("accept") || "").includes("text/x-component")) return true;

  return false;
}

// ── Fetch handler ─────────────────────────────────────────────────────────────
self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Always let bypassed requests go straight to the network
  if (shouldBypass(request, url)) return;

  // Immutable static assets (_next/static/) — cache-first
  // These are content-hashed so stale-forever is safe.
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

  // Navigation requests (HTML pages) — ALWAYS network-first.
  // Never serve stale HTML; fall back to cached only if completely offline.
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((response) => {
          // Only cache successful, non-RSC HTML responses
          if (response.ok && response.headers.get("content-type")?.includes("text/html")) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          }
          return response;
        })
        .catch(() =>
          caches.match(request).then((cached) => cached || caches.match("/"))
        )
    );
    return;
  }

  // Manifest, icons, and other static public assets — stale-while-revalidate
  event.respondWith(
    caches.match(request).then((cached) => {
      const networkFetch = fetch(request).then((response) => {
        if (response.ok) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
        }
        return response;
      }).catch(() => cached); // return stale copy on network failure
      return cached || networkFetch;
    })
  );
});
