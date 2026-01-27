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

// Manejar mensajes en background (cuando la app está cerrada)
messaging.onBackgroundMessage((payload) => {
  console.log('[firebase-messaging-sw.js] Mensaje recibido en background:', payload);
  
  const notificationTitle = payload.notification?.title || 'Nueva Venta';
  const notificationOptions = {
    body: payload.notification?.body || 'Se ha realizado una nueva venta',
    icon: payload.notification?.icon || '/logo192.png',
    badge: '/logo192.png',
    tag: 'venta-notification',
    requireInteraction: false,
    data: payload.data || {}
  };

  return self.registration.showNotification(notificationTitle, notificationOptions);
});

// Manejar clics en notificaciones
self.addEventListener('notificationclick', (event) => {
  console.log('[firebase-messaging-sw.js] Notificación clickeada:', event);
  
  event.notification.close();
  
  // Abrir la app o redirigir a la página de ventas
  const urlToOpen = event.notification.data?.click_action || '/ventas';
  
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // Si hay una ventana abierta, enfocarla
      for (let i = 0; i < clientList.length; i++) {
        const client = clientList[i];
        if (client.url === urlToOpen && 'focus' in client) {
          return client.focus();
        }
      }
      // Si no hay ventana abierta, abrir una nueva
      if (clients.openWindow) {
        return clients.openWindow(urlToOpen);
      }
    })
  );
});
