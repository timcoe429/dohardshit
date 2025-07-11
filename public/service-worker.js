const CACHE_NAME = 'dohardshit-v2';
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
  '/icon-192.png',
  '/icon-512.png',
  '/manifest.json'
];

// Install event - cache files
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Opened cache');
        return cache.addAll(urlsToCache);
      })
  );
});

// Fetch event - serve from cache when offline
self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        // Return cached version or fetch from network
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
});

// Activate event - clean up old caches
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
}); 