const CACHE_NAME = "hesabdari-habib-pwa-v2-sms";
const APP_SHELL = [
  "./",
  "./index.html",
  "./manifest.webmanifest",
  "./bank-sms.js",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
  "./icons/icon-maskable-512.png"
];

self.addEventListener("install", event => {
  event.waitUntil(caches.open(CACHE_NAME)
    .then(cache => cache.addAll(APP_SHELL))
    .then(() => self.skipWaiting()));
});
self.addEventListener("activate", event => {
  event.waitUntil(caches.keys()
    .then(keys => Promise.all(keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key))))
    .then(() => self.clients.claim()));
});

async function saveSharedForm(request) {
  const form = await request.formData();
  const data = {
    title: String(form.get("title") || ""),
    text: String(form.get("text") || ""),
    url: String(form.get("url") || ""),
    receivedAt: Date.now()
  };
  const db = await new Promise((resolve, reject) => {
    const open = indexedDB.open("habib-bank-sms-share", 1);
    open.onupgradeneeded = () => {
      if (!open.result.objectStoreNames.contains("inbox")) open.result.createObjectStore("inbox");
    };
    open.onsuccess = () => resolve(open.result);
    open.onerror = () => reject(open.error);
  });
  await new Promise((resolve, reject) => {
    const tx = db.transaction("inbox", "readwrite");
    tx.objectStore("inbox").put(data, "latest");
    tx.oncomplete = resolve;
    tx.onerror = () => reject(tx.error);
  });
}

self.addEventListener("fetch", event => {
  const request = event.request;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  // Android Share Target: پیامک به حافظه موقت محلی می‌رود و سپس صفحه بررسی باز می‌شود.
  if (request.method === "POST" && url.pathname.endsWith("/share-target/")) {
    event.respondWith((async () => {
      try {
        await saveSharedForm(request);
        return Response.redirect(new URL("./index.html?bank-sms=1", self.registration.scope).href, 303);
      } catch (error) {
        return new Response("دریافت پیامک ناموفق بود. دوباره تلاش کنید.", {status: 500, headers: {"Content-Type":"text/plain; charset=utf-8"}});
      }
    })());
    return;
  }

  if (request.method !== "GET") return;
  if (request.mode === "navigate") {
    event.respondWith(fetch(request).then(response => {
      const copy = response.clone();
      caches.open(CACHE_NAME).then(cache => cache.put("./index.html", copy));
      return response;
    }).catch(() => caches.match("./index.html")));
    return;
  }
  event.respondWith(caches.match(request).then(cached => {
    if (cached) return cached;
    return fetch(request).then(response => {
      if (response && response.ok) {
        const copy = response.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(request, copy));
      }
      return response;
    });
  }));
});