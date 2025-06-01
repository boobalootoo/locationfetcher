// Define the cache name, incrementing it for new versions to ensure updates
const CACHE_NAME = 'geolocation-display-v2'; // Incremented cache version

// List of URLs to cache during installation
// These paths are now relative to the service worker's scope (e.g., /locationfetcher/)
const urlsToCache = [
    '/locationfetcher/', // Caches the root of your GitHub Pages project
    '/locationfetcher/index.html',
    '/locationfetcher/manifest.json',
    'https://cdn.tailwindcss.com'
];

// Install event: Fired when the service worker is installed
self.addEventListener('install', (event) => {
    // waitUntil ensures the service worker isn't activated until the caching is complete
    event.waitUntil(
        caches.open(CACHE_NAME) // Open the named cache
            .then((cache) => {
                console.log('Service Worker: Caching app shell');
                // Add all specified URLs to the cache
                return cache.addAll(urlsToCache);
            })
    );
});

// Activate event: Fired when the service worker is activated
self.addEventListener('activate', (event) => {
    // waitUntil ensures activation is complete before handling fetches
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            // Iterate over all cache names
            return Promise.all(
                cacheNames.map((cacheName) => {
                    // If a cache name is different from the current CACHE_NAME, delete it
                    if (cacheName !== CACHE_NAME) {
                        console.log('Service Worker: Deleting old cache', cacheName);
                        return caches.delete(cacheName);
                    }
                })
            );
        })
    );
});

// Fetch event: Fired for every network request made by the page
self.addEventListener('fetch', (event) => {
    // Respond with content from cache if available, otherwise fetch from network
    event.respondWith(
        caches.match(event.request) // Try to find the request in the cache
            .then((response) => {
                // If a cached response is found, return it
                if (response) {
                    console.log('Service Worker: Serving from cache', event.request.url);
                    return response;
                }
                // If not in cache, fetch from the network
                console.log('Service Worker: Fetching from network', event.request.url);
                return fetch(event.request)
                    .then((networkResponse) => {
                        // Check if we received a valid response
                        if (!networkResponse || networkResponse.status !== 200 || networkResponse.type !== 'basic') {
                            return networkResponse;
                        }

                        // Clone the response because it's a stream and can only be consumed once
                        const responseToCache = networkResponse.clone();

                        // Open the cache and put the new network response in it
                        caches.open(CACHE_NAME)
                            .then((cache) => {
                                cache.put(event.request, responseToCache);
                            });

                        return networkResponse;
                    })
                    .catch(() => {
                        // This catch handles network errors, meaning the user is offline
                        // or the resource is unavailable.
                        // You could return a fallback page here if desired.
                        console.log('Service Worker: Network request failed for', event.request.url);
                        // For simplicity, we just return an empty response or a generic error
                        // if the network fetch fails and it's not in cache.
                        // For a more robust app, you might return a specific offline page.
                        return new Response('<h1>Offline</h1><p>This page is not available offline.</p>', {
                            headers: { 'Content-Type': 'text/html' }
                        });
                    });
            })
    );
});
