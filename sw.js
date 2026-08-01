// sw.js - Service Worker Level 1 untuk POS WARGA
const CACHE_NAME = 'poswarga-v1';
const urlsToCache = [
  '/',
  '/index.html',
  '/auth/login.html',
  '/auth/register.html',
  '/about.html',
  '/contact.html',
  '/privacy.html',
  '/terms.html',
  '/manifest.json'
];

// Install: cache asset statis
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(urlsToCache))
  );
});

// Fetch: ambil dari cache dulu, fallback ke network
self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => response || fetch(event.request))
  );
});

// Activate: bersihkan cache lama
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => {
      return Promise.all(
        keys.filter(key => key !== CACHE_NAME)
          .map(key => caches.delete(key))
      );
    })
  );
});
