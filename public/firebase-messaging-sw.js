// firebase-messaging-sw.js - Service Worker para Firebase Cloud Messaging
// Configuración de Firebase para Total Stock

importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-messaging-compat.js');

// Configuración de Firebase (debe coincidir con firebase.js)
const firebaseConfig = {
  apiKey: "AIzaSyCg2Y9i8szsfi6Y1D8E05qC9j63zWrjuyU",
  authDomain: "total-stock.firebaseapp.com",
  projectId: "total-stock",
  storageBucket: "total-stock.firebasestorage.app",
  messagingSenderId: "741099614305",
  appId: "1:741099614305:web:7ec7e80dc1607fce7f3a20"
};

// Inicializar Firebase
firebase.initializeApp(firebaseConfig);

// Obtener instancia de messaging
const messaging = firebase.messaging();

// Manejar mensajes en background (cuando la app está cerrada o en segundo plano).
// Este handler se llama para mensajes data-only (sin payload "notification").
// Para mensajes con payload "notification", FCM los muestra automáticamente.
messaging.onBackgroundMessage(async (payload) => {
  console.log('[firebase-messaging-sw.js] Mensaje recibido en background:', payload);

  // Verificar si hay ventanas visibles y enfocadas para evitar duplicados.
  // NOTA: Client.visibilityState no existe en la API SW; se usa client.focused.
  const clientList = await self.clients.matchAll({
    type: 'window',
    includeUncontrolled: true
  });

  const hasVisibleWindow = clientList.some(client => client.focused === true);

  // Si hay una ventana enfocada, la app está en primer plano y el listener
  // onMessage del frontend mostrará la notificación. Evitar duplicados.
  if (hasVisibleWindow) {
    console.log('[firebase-messaging-sw.js] Ventana enfocada detectada, no mostrar desde SW');
    return;
  }

  // Leer título y cuerpo desde data (para mensajes data-only) o desde notification
  const titulo = payload.data?.title || payload.notification?.title || 'Nueva Venta';
  const cuerpo  = payload.data?.body  || payload.notification?.body  || 'Se ha realizado una nueva venta';

  const ventaId = payload.data?.venta_id || Date.now().toString();
  const notificationTag = `venta-${ventaId}`;

  const notificationOptions = {
    body: cuerpo,
    icon: '/logo192.png',
    badge: '/logo192.png',
    tag: notificationTag,
    requireInteraction: false,
    data: payload.data || {}
  };

  return self.registration.showNotification(titulo, notificationOptions);
});

// Manejar clics en notificaciones
self.addEventListener('notificationclick', (event) => {
  console.log('[firebase-messaging-sw.js] Notificación clickeada:', event);

  event.notification.close();

  const urlToOpen = event.notification.data?.click_action || '/ventas';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (let i = 0; i < clientList.length; i++) {
        const client = clientList[i];
        if (client.url === urlToOpen && 'focus' in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(urlToOpen);
      }
    })
  );
});
