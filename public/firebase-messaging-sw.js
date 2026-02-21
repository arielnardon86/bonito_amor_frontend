// firebase-messaging-sw.js - Service Worker para Firebase Cloud Messaging
// Configuración de Firebase para Total Stock

importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-messaging-compat.js');

const firebaseConfig = {
  apiKey: "AIzaSyCg2Y9i8szsfi6Y1D8E05qC9j63zWrjuyU",
  authDomain: "total-stock.firebaseapp.com",
  projectId: "total-stock",
  storageBucket: "total-stock.firebasestorage.app",
  messagingSenderId: "741099614305",
  appId: "1:741099614305:web:7ec7e80dc1607fce7f3a20"
};

firebase.initializeApp(firebaseConfig);
const messaging = firebase.messaging();

// Manejar mensajes en background.
// Con WebpushConfig.notification en el backend, FCM ya tiene título y cuerpo.
// Este handler se llama de todas formas y mostramos la notificación explícitamente
// para tener control total (tag único por venta, icono, etc.).
messaging.onBackgroundMessage(async (payload) => {
  console.log('[SW] Mensaje en background:', payload);

  // Evitar duplicados: si la app está enfocada, el listener onMessage del frontend
  // ya mostrará la notificación.
  const clientList = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
  if (clientList.some(c => c.focused)) {
    console.log('[SW] Ventana enfocada, el frontend maneja la notificación');
    return;
  }

  // Leer título y cuerpo: primero desde notification (WebpushConfig.notification),
  // luego desde data como fallback.
  const titulo = payload.notification?.title
    || payload.data?.notif_title
    || payload.data?.title
    || 'Nueva Venta';

  const cuerpo = payload.notification?.body
    || payload.data?.notif_body
    || payload.data?.body
    || 'Se ha realizado una nueva venta';

  const ventaId = payload.data?.venta_id || Date.now().toString();

  return self.registration.showNotification(titulo, {
    body: cuerpo,
    icon: '/logo192.png',
    badge: '/logo192.png',
    tag: `venta-${ventaId}`,
    requireInteraction: false,
    data: payload.data || {}
  });
});

// Manejar clics en notificaciones
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const urlToOpen = event.notification.data?.click_action || '/ventas';
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.includes(urlToOpen) && 'focus' in client) return client.focus();
      }
      if (clients.openWindow) return clients.openWindow(urlToOpen);
    })
  );
});
