// --- BULLETPROOF PUSH LISTENER ---
self.addEventListener('push', function (event) {
  let payload = { title: 'Altum Core', body: 'New Update!', url: '/' }; 

  if (event.data) {
    try {
      payload = event.data.json(); // Try to read the Vercel message
    } catch (error) {
      console.error('Push parsing failed:', error);
      payload.body = event.data.text(); // Fallback to raw text if JSON fails
    }
  }

  event.waitUntil(
    self.registration.showNotification(payload.title, {
      body: payload.body,
      icon: '/logo-512.png', 
      badge: '/logo-512.png',
      data: { url: payload.url || '/' }
    })
  );
});

// --- NOTIFICATION CLICK ACTION ---
self.addEventListener('notificationclick', function (event) {
  event.notification.close();
  event.waitUntil(
    clients.openWindow(event.notification.data.url || '/')
  );
});
