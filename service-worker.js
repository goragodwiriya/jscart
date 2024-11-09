// service-worker.js
self.addEventListener('push', function(event) {
  if (!(self.Notification && self.Notification.permission === 'granted')) {
    return;
  }

  const data = event.data?.json() ?? {};
  const title = data.title || 'การแจ้งเตือนใหม่';
  const options = {
    body: data.message,
    icon: data.icon,
    badge: data.badge,
    vibrate: data.vibrate,
    data: data.data || {},
    actions: data.actions || [],
    requireInteraction: data.requireInteraction || false
  };

  event.waitUntil(
    self.registration.showNotification(title, options)
  );
});

self.addEventListener('notificationclick', function(event) {
  event.notification.close();

  if (event.action === 'view' && event.notification.data.url) {
    event.waitUntil(
      clients.openWindow(event.notification.data.url)
    );
  }
});

self.addEventListener('notificationclose', function(event) {
  // จัดการเมื่อผู้ใช้ปิดการแจ้งเตือน
  console.log('Notification closed', event.notification);
});
