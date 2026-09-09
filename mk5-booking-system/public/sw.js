self.addEventListener('push', (event) => {
  const data = event.data ? event.data.json() : {};
  const title = data.title || 'Nueva cita';
  const bookingId = data.bookingId || '';
  const options = {
    body: data.body || 'Nueva solicitud de cita',
    icon: '/favicon.ico',
    badge: '/favicon.ico',
    tag: data.tag || 'booking',
    requireInteraction: true,
    vibrate: [200, 100, 200],
    data: { bookingId },
    actions: bookingId
      ? [
          { action: 'view', title: 'Ver cliente' },
          { action: 'calendar', title: 'Añadir al calendario' },
        ]
      : [],
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const bookingId = event.notification.data?.bookingId || '';

  if (event.action === 'calendar' && bookingId) {
    event.waitUntil(clients.openWindow(`/api/ics?id=${bookingId}`));
    return;
  }

  const target = bookingId ? `/admin?b=${bookingId}` : '/admin';
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((list) => {
      for (const client of list) {
        if (client.url.includes('/admin')) {
          if ('navigate' in client) {
            try { client.navigate(target); } catch (e) {}
          }
          return client.focus();
        }
      }
      return clients.openWindow(target);
    })
  );
});
