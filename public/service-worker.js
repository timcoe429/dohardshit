const CACHE_NAME = 'dohardshit-v5';
const urlsToCache = [
  '/',
  '/index.html',
  '/install.html',
  '/app.js',
  '/api.js',
  '/auth.js',
  '/challenges.js',
  '/events.js',
  '/leaderboard.js',
  '/modals.js',
  '/progress.js',
  '/render.js',
  '/stats-service.js',
  '/stats.js',
  '/templates.js',
  '/utils.js',
  '/icon-192.png?v=2',
  '/icon-512.png?v=2',
  '/manifest.json'
];

// Install event - cache files
self.addEventListener('install', event => {
  console.log('SW: Installing new version');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('SW: Opened cache');
        return cache.addAll(urlsToCache);
      })
  );
  // Force the waiting service worker to become the active service worker
  self.skipWaiting();
});

// Fetch event - network first for HTML/JS, cache first for assets
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);
  
  // Network first for HTML, JS, and CSS files (to get updates quickly)
  if (url.pathname.endsWith('.html') || url.pathname.endsWith('.js') || url.pathname.endsWith('.css') || url.pathname === '/') {
    event.respondWith(
      fetch(event.request)
        .then(response => {
          // If network succeeds, update cache and return response
          if (response.status === 200) {
            const responseClone = response.clone();
            caches.open(CACHE_NAME)
              .then(cache => cache.put(event.request, responseClone));
          }
          return response;
        })
        .catch(() => {
          // If network fails, serve from cache
          return caches.match(event.request);
        })
    );
  } 
  // Cache first for assets (images, etc.)
  else {
    event.respondWith(
      caches.match(event.request)
        .then(response => {
          return response || fetch(event.request);
        })
        .catch(() => {
          // Offline fallback for API calls
          if (event.request.url.includes('/api/')) {
            return new Response(
              JSON.stringify({ error: 'You are offline' }),
              { headers: { 'Content-Type': 'application/json' } }
            );
          }
        })
    );
  }
});

// Activate event - clean up old caches
self.addEventListener('activate', event => {
  console.log('SW: Activating new version');
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            console.log('SW: Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
      // Take control of all clients immediately
      return self.clients.claim();
    })
  );
}); 