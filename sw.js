// Hunter Training v4.4 - Service Worker
const CACHE = 'hunter-v4.4-6';  // Increment for updates
const ASSETS = [
  './',
  './index.html',
  './styles.css?v=4.4.1',
  './app.js?v=4.4.1', 
  './manifest.webmanifest?v=4.4.1',
  './assets/icon.svg',
  './assets/icon-192x192.png',
  './assets/icon-512x512.png'
];

// Install - Cache essential assets
self.addEventListener('install', event => {
  console.log('[SW] Installing version:', CACHE);
  
  event.waitUntil(
    caches.open(CACHE)
      .then(cache => {
        console.log('[SW] Caching app shell');
        return cache.addAll(ASSETS);
      })
      .then(() => {
        console.log('[SW] Install completed');
        return self.skipWaiting();
      })
      .catch(error => {
        console.error('[SW] Install failed:', error);
      })
  );
});

// Activate - Clean up old caches
self.addEventListener('activate', event => {
  console.log('[SW] Activating version:', CACHE);
  
  event.waitUntil(
    caches.keys()
      .then(cacheNames => {
        return Promise.all(
          cacheNames.map(cacheName => {
            if (cacheName !== CACHE) {
              console.log('[SW] Deleting old cache:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      })
      .then(() => {
        console.log('[SW] Activation completed');
        return self.clients.claim();
      })
      .catch(error => {
        console.error('[SW] Activation failed:', error);
      })
  );
});

// Fetch - Serve from cache, fallback to network
self.addEventListener('fetch', event => {
  // Skip non-GET requests
  if (event.request.method !== 'GET') return;
  
  // Skip cross-origin requests
  if (!event.request.url.startsWith(self.location.origin)) return;
  
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        // Return cached version
        if (response) {
          return response;
        }
        
        // Clone the request
        const fetchRequest = event.request.clone();
        
        return fetch(fetchRequest)
          .then(response => {
            // Check if valid response
            if (!response || response.status !== 200 || response.type !== 'basic') {
              return response;
            }
            
            // Clone the response
            const responseToCache = response.clone();
            
            // Cache the new response
            caches.open(CACHE)
              .then(cache => {
                cache.put(event.request, responseToCache);
              })
              .catch(error => {
                console.warn('[SW] Cache put failed:', error);
              });
            
            return response;
          })
          .catch(error => {
            console.warn('[SW] Fetch failed:', error);
            
            // For HTML requests, return the cached index.html
            if (event.request.headers.get('accept')?.includes('text/html')) {
              return caches.match('./index.html');
            }
            
            // You could return a custom offline page here
            return new Response('Network error', {
              status: 408,
              headers: { 'Content-Type': 'text/plain' }
            });
          });
      })
  );
});

// Handle messages from the client
self.addEventListener('message', event => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

// Background sync (optional - for future features)
self.addEventListener('sync', event => {
  if (event.tag === 'background-sync') {
    console.log('[SW] Background sync triggered');
    // Handle background sync tasks here
  }
});

// Push notifications (optional - for future features)
self.addEventListener('push', event => {
  if (!event.data) return;
  
  const data = event.data.json();
  const options = {
    body: data.body || 'Hunter Training notification',
    icon: './assets/icon-192x192.png',
    badge: './assets/icon-192x192.png',
    tag: 'hunter-training',
    requireInteraction: true,
    actions: [
      {
        action: 'open',
        title: 'Open App'
      },
      {
        action: 'close', 
        title: 'Close'
      }
    ]
  };
  
  event.waitUntil(
    self.registration.showNotification(data.title || 'Hunter Training', options)
  );
});

self.addEventListener('notificationclick', event => {
  event.notification.close();
  
  if (event.action === 'open') {
    event.waitUntil(
      clients.openWindow('./')
    );
  }
});
