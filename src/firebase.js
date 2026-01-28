// firebase.js - Configuración de Firebase Cloud Messaging
import { initializeApp } from 'firebase/app';
import { getMessaging, getToken, onMessage } from 'firebase/messaging';
import { getAnalytics } from 'firebase/analytics';

// Configuración de Firebase para Total Stock
const firebaseConfig = {
  apiKey: "AIzaSyCg2Y9i8szsfi6Y1D8E05qC9j63zWrjuyU",
  authDomain: "total-stock.firebaseapp.com",
  projectId: "total-stock",
  storageBucket: "total-stock.firebasestorage.app",
  messagingSenderId: "741099614305",
  appId: "1:741099614305:web:7ec7e80dc1607fce7f3a20",
  measurementId: "G-218NZKTJQV"
};

// Inicializar Firebase con manejo de errores robusto
let app = null;
let analytics = null;
let messaging = null;

try {
  app = initializeApp(firebaseConfig);
  
  // Inicializar Analytics (opcional, para métricas)
  if (typeof window !== 'undefined') {
    try {
      analytics = getAnalytics(app);
    } catch (error) {
      console.warn('Firebase Analytics no está disponible:', error);
    }
  }

  // Obtener instancia de messaging (solo en el cliente, no en SSR)
  if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
    try {
      messaging = getMessaging(app);
    } catch (error) {
      console.warn('Firebase Messaging no está disponible:', error);
    }
  }
} catch (error) {
  console.error('Error al inicializar Firebase (no crítico, la app seguirá funcionando):', error);
  // La app puede funcionar sin Firebase, solo las notificaciones no estarán disponibles
}

// VAPID Key para notificaciones push
const vapidKey = process.env.REACT_APP_FIREBASE_VAPID_KEY || "BB9sDwXjjqnKWe2DVl-olVRIfoqMGp_l72KIExbVS4ceTzU0r4UR15V_OBP67PC1e9CbjCAQpaVGYdFCpiri9f4";

/**
 * Obtiene el token FCM sin solicitar permiso (útil cuando el permiso ya está concedido)
 * @param {Function} onTokenReceived - Callback cuando se obtiene el token
 * @param {Function} onError - Callback cuando hay un error
 */
export const getFCMToken = async (onTokenReceived, onError) => {
  if (!messaging) {
    console.warn('Firebase Messaging no está disponible');
    if (onError) {
      onError('Firebase Messaging no está disponible');
    }
    return null;
  }

  try {
    // Verificar que el permiso esté concedido
    if (Notification.permission !== 'granted') {
      if (onError) {
        onError('El permiso de notificaciones no está concedido');
      }
      return null;
    }

    // Obtener el token FCM directamente
    const currentToken = await getToken(messaging, { vapidKey });
    
    if (currentToken) {
      console.log('Token FCM obtenido:', currentToken);
      if (onTokenReceived) {
        onTokenReceived(currentToken);
      }
      return currentToken;
    } else {
      console.warn('No se pudo obtener el token FCM');
      if (onError) {
        onError('No se pudo obtener el token FCM. Verifica que el Service Worker esté configurado correctamente.');
      }
      return null;
    }
  } catch (error) {
    console.error('Error al obtener token FCM:', error);
    if (onError) {
      onError(error.message);
    }
    return null;
  }
};

/**
 * Solicita permiso y obtiene el token FCM
 * @param {Function} onTokenReceived - Callback cuando se obtiene el token
 * @param {Function} onError - Callback cuando hay un error
 */
export const requestNotificationPermission = async (onTokenReceived, onError) => {
  if (!messaging) {
    console.warn('Firebase Messaging no está disponible');
    return null;
  }

  try {
    // Solicitar permiso para notificaciones
    const permission = await Notification.requestPermission();
    
    if (permission === 'granted') {
      console.log('Permiso de notificaciones concedido');
      
      // Obtener el token FCM
      const currentToken = await getToken(messaging, { vapidKey });
      
      if (currentToken) {
        console.log('Token FCM obtenido:', currentToken);
        if (onTokenReceived) {
          onTokenReceived(currentToken);
        }
        return currentToken;
      } else {
        console.warn('No se pudo obtener el token FCM');
        if (onError) {
          onError('No se pudo obtener el token FCM. Verifica que el Service Worker esté configurado correctamente.');
        }
        return null;
      }
    } else {
      console.warn('Permiso de notificaciones denegado');
      if (onError) {
        onError('Permiso de notificaciones denegado');
      }
      return null;
    }
  } catch (error) {
    console.error('Error al solicitar permiso de notificaciones:', error);
    if (onError) {
      onError(error.message);
    }
    return null;
  }
};

/**
 * Escucha mensajes cuando la app está en primer plano
 * @param {Function} callback - Callback cuando se recibe un mensaje
 */
export const onMessageListener = (callback) => {
  if (!messaging) {
    return () => {};
  }
  
  return onMessage(messaging, (payload) => {
    console.log('Mensaje recibido en primer plano:', payload);
    if (callback) {
      callback(payload);
    }
  });
};

export { messaging, app, analytics };
export default app;
