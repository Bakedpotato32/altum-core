// --- BULLETPROOF PUSH LISTENER ---
self.addEventListener('push', function (event) {
  let data = { title: 'Altum Core', body: 'New Notice!' }; // Default fail-safe

  try {
    if (event.data) {
      data = event.data.json(); // Try to parse the Vercel payload
    }
  } catch (error) {
    console.error('Push parsing failed:', error);
    // If it fails to parse as JSON, grab the raw text instead so it doesn't crash
    data = { title: 'Altum Core', body: event.data ? event.data.text() : 'New Notice!' };
  }

  const options = {
    body: data.body,
    icon: '/logo-512.png', 
    badge: '/logo-512.png',
    vibrate: [200, 100, 200],
    data: { url: data.url || '/' }
  };

  event.waitUntil(
    self.registration.showNotification(data.title || 'Altum Core', options)
  );
});

// --- NOTIFICATION CLICK ACTION ---
self.addEventListener('notificationclick', function (event) {
  event.notification.close(); // Close the popup
  // Open the app to the URL we sent
  event.waitUntil(
    clients.openWindow(event.notification.data.url || '/')
  );
});
