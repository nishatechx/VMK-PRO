// Service Worker for VMK Tools Facilitation Portal
// Provides offline asset caching, offline page fallback, and background sync triggers

const CACHE_NAME = 'vmk-portal-cache-v1';
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/favicon.ico',
];

// Install Event: Precaches core shell assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS).catch((err) => {
        console.warn('[ServiceWorker] Static asset precache notice:', err);
      });
    })
  );
  // Instantly take over without waiting for older SW to terminate
  self.skipWaiting();
});

// Activate Event: Cleans up obsolete caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch Event: Network-first with cache fallback for navigation & scripts
self.addEventListener('fetch', (event) => {
  const req = event.request;
  const url = new URL(req.url);

  // Bypass non-GET and chrome extensions
  if (req.method !== 'GET' || !url.protocol.startsWith('http')) {
    return;
  }

  // Handle API calls: Network only (offline queuing handled gracefully in client/IndexedDB)
  if (url.pathname.startsWith('/api/') || url.hostname.includes('firestore.googleapis.com')) {
    return;
  }

  // Assets and page navigation: Network-first, fallback to cache
  event.respondWith(
    fetch(req)
      .then((networkResponse) => {
        // Cache successful response clone for offline usage
        if (networkResponse && networkResponse.status === 200) {
          const cloned = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(req, cloned).catch(() => {});
          });
        }
        return networkResponse;
      })
      .catch(async () => {
        // When completely offline, serve from cache
        const cached = await caches.match(req);
        if (cached) {
          return cached;
        }

        // If navigating to an HTML page, return root cached index.html
        if (req.mode === 'navigate') {
          const indexCached = await caches.match('/index.html');
          if (indexCached) {
            return indexCached;
          }
        }

        return new Response('Network offline. Queued changes will auto-sync when connection restores.', {
          status: 503,
          headers: { 'Content-Type': 'text/plain' },
        });
      })
  );
});

// Background Sync Event (Standard ServiceWorker Background Sync API)
self.addEventListener('sync', (event) => {
  if (event.tag === 'vmk-background-sync' || event.tag === 'sync-tickets-and-uploads') {
    event.waitUntil(
      self.clients.matchAll().then((clients) => {
        clients.forEach((client) => {
          client.postMessage({
            type: 'TRIGGER_BACKGROUND_SYNC',
            timestamp: Date.now(),
          });
        });
      })
    );
  }
});

// Message Event: Allow window to talk to Service Worker
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
