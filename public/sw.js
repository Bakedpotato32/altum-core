// --- PUSH NOTIFICATION LISTENER ---
self.addEventListener('push', function (event) {
  // Parse the data sent from our backend
  const data = event.data ? event.data.json() : { title: 'Altum Core', body: 'New Notice!' };
  
  const options = {
    body: data.body,
    icon: '/logo-512.png', // Pulling your exact logo from the public folder
    badge: '/logo-512.png', 
    vibrate: [200, 100, 200], // Makes the Android phone physically buzz
    data: { url: data.url || '/' } // Where to go when they click the notification
  };

  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

// --- NOTIFICATION CLICK ACTION ---
self.addEventListener('notificationclick', function (event) {
  event.notification.close(); // Close the notification
  // Open the app to the specific URL
  event.waitUntil(
    clients.openWindow(event.notification.data.url)
  );
});
