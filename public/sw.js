/*
 * AcaDomo service worker — hand-written, no build step.
 *
 * @ducanh2912/next-pwa needs webpack (this app uses Turbopack) and is stale
 * since Sept 2024. A service worker is just a JS file; Workbox exists to
 * generate precache manifests, which an app this size does not need.
 *
 * Bump CACHE_VERSION when caching rules change — activate deletes every cache
 * that does not match, so stale entries cannot survive a deploy.
 *
 * SECURITY: authenticated responses are never cached. See shouldBypass().
 */

const CACHE_VERSION = "v1";
const SHELL_CACHE = `acadomo-shell-${CACHE_VERSION}`;
const IMAGE_CACHE = `acadomo-images-${CACHE_VERSION}`;
const DATA_CACHE = `acadomo-data-${CACHE_VERSION}`;

const OFFLINE_URL = "/offline";
const PRECACHE = [OFFLINE_URL];
const MAX_IMAGE_ENTRIES = 60;

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(SHELL_CACHE)
      // Individual failures must not abort the install.
      .then((cache) => Promise.allSettled(PRECACHE.map((url) => cache.add(url))))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key.startsWith("acadomo-") && !key.endsWith(CACHE_VERSION))
            .map((key) => caches.delete(key)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

/** Lets the page force an immediate update without a reload dance. */
self.addEventListener("message", (event) => {
  if (event.data === "SKIP_WAITING") self.skipWaiting();
});

/**
 * Requests that must ALWAYS hit the network.
 *
 * A cached authenticated response would be served to whoever opens the app
 * next — including a signed-out visitor on a shared device. Auth, admin and
 * per-student routes are never cached, nor is any non-GET request.
 */
function shouldBypass(request, url) {
  if (request.method !== "GET") return true;
  if (url.origin !== self.location.origin && url.hostname !== "images.unsplash.com") return true;
  if (url.pathname.startsWith("/api/auth/")) return true;
  if (url.pathname.startsWith("/api/admin/")) return true;
  if (url.pathname.startsWith("/api/saved/")) return true;
  if (url.pathname.startsWith("/admin")) return true;
  if (url.pathname === "/account" || url.pathname === "/saved") return true;
  if (url.pathname === "/signup") return true;
  if (request.headers.get("authorization")) return true;
  return false;
}

async function cacheFirst(request, cacheName, maxEntries) {
  const cache = await caches.open(cacheName);
  const hit = await cache.match(request);
  if (hit) return hit;

  const response = await fetch(request);
  if (response.ok) {
    await cache.put(request, response.clone());
    if (maxEntries) await trim(cache, maxEntries);
  }
  return response;
}

async function networkFirst(request, cacheName, timeoutMs = 3000) {
  const cache = await caches.open(cacheName);
  try {
    const response = await Promise.race([
      fetch(request),
      new Promise((_, reject) => setTimeout(() => reject(new Error("timeout")), timeoutMs)),
    ]);
    if (response.ok) await cache.put(request, response.clone());
    return response;
  } catch {
    const hit = await cache.match(request);
    if (hit) return hit;
    throw new Error("offline and not cached");
  }
}

/** Oldest-first eviction; the Cache API preserves insertion order. */
async function trim(cache, maxEntries) {
  const keys = await cache.keys();
  if (keys.length <= maxEntries) return;
  await Promise.all(keys.slice(0, keys.length - maxEntries).map((key) => cache.delete(key)));
}

self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  if (shouldBypass(request, url)) return;

  // Immutable hashed build output.
  if (url.pathname.startsWith("/_next/static/")) {
    event.respondWith(cacheFirst(request, SHELL_CACHE));
    return;
  }

  // Images: optimiser output and remote photography.
  if (
    url.pathname.startsWith("/_next/image") ||
    url.hostname === "images.unsplash.com" ||
    /\.(png|jpg|jpeg|webp|avif|svg)$/i.test(url.pathname)
  ) {
    event.respondWith(cacheFirst(request, IMAGE_CACHE, MAX_IMAGE_ENTRIES));
    return;
  }

  // Public listing data: fresh online, still browsable offline.
  if (url.pathname.startsWith("/api/properties")) {
    event.respondWith(networkFirst(request, DATA_CACHE));
    return;
  }

  // Navigations: cached page, then the offline fallback.
  if (request.mode === "navigate") {
    event.respondWith(
      networkFirst(request, DATA_CACHE).catch(async () => {
        const cache = await caches.open(SHELL_CACHE);
        return (
          (await cache.match(OFFLINE_URL)) ??
          new Response("You are offline.", {
            status: 503,
            headers: { "content-type": "text/plain" },
          })
        );
      }),
    );
  }
});
