// Cache only the static shell. Demo transactions live in localStorage, never in this cache.
const CACHE = 'golden-hand-shell-v3';
const SHELL = ['/', '/brand/golden-hand-original.jpg', '/manifest.webmanifest'];
self.addEventListener('install', event => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE);
    await cache.addAll(SHELL);
    const shell = await cache.match('/');
    const html = await shell.text();
    const assets = [...html.matchAll(/(?:src|href)="(\/assets\/[^" ]+)"/g)].map(match => match[1]);
    await cache.addAll(assets);
    await self.skipWaiting();
  })());
});
self.addEventListener('activate', event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(key => key.startsWith('golden-hand-shell-') && key !== CACHE).map(key => caches.delete(key)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);
  if (event.request.method !== 'GET' || url.origin !== self.location.origin || url.pathname.startsWith('/api/')) return;
  event.respondWith(fetch(event.request).then(response => {
    if (response.ok) {
      const copy = response.clone();
      event.waitUntil(caches.open(CACHE).then(cache => cache.put(event.request, copy)));
    }
    return response;
  }).catch(async () => {
    const cached = await caches.match(event.request);
    if (cached) return cached;
    if (event.request.mode === 'navigate') {
      const shell = await caches.match('/');
      if (shell) return shell;
    }
    return Response.error();
  }));
});
