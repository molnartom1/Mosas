/* sw.js — Mosás nyilvántartás PWA */
const CACHE_NAME = 'mosas-pwa-v1';
const APP_ASSETS = [
  './',
  './index_pwa.html',
  './Candy.webp',
  './manifest.webmanifest'
];

const isFirebase = (url) =>
  url.includes('firebaseio.com') ||
  url.includes('firestore.googleapis.com') ||
  url.includes('gstatic.com') ||
  url.includes('googleapis.com');

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_ASSETS))
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(keys.map((k) => k !== CACHE_NAME && caches.delete(k)));
      await self.clients.claim();
    })()
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (isFirebase(url.href)) return; // do not intercept Firebase

  if (request.mode === 'navigate') {
    event.respondWith((async () => {
      try {
        const net = await fetch(request);
        const cache = await caches.open(CACHE_NAME);
        cache.put(request, net.clone());
        return net;
      } catch (e) {
        const cache = await caches.open(CACHE_NAME);
        return (await cache.match('./')) || (await cache.match('index_pwa.html'));
      }
    })());
    return;
  }

  event.respondWith((async () => {
    const cache = await caches.open(CACHE_NAME);
    const cached = await cache.match(request);
    const netFetch = fetch(request).then((resp) => {
      cache.put(request, resp.clone());
      return resp;
    }).catch(() => null);
    return cached || (await netFetch) || Response.error();
  })());
});