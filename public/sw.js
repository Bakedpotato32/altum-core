self.addEventListener('install', (event) => {
  console.log('Altum Core Service Worker Installed');
});

self.addEventListener('fetch', (event) => {
  // This ensures the app loads even with a shaky internet connection
  event.respondWith(fetch(event.request).catch(() => caches.match(event.request)));
});
