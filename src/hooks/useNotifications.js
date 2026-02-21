// hooks/useNotifications.js - Hook para manejar notificaciones push
import { useEffect, useState, useCallback } from 'react';
import axios from 'axios';
import { useAuth } from '../AuthContext';

// Importar Firebase de forma segura (no bloquea si falla)
let requestNotificationPermission = null;
let getFCMToken = null;
let onMessageListener = null;

try {
  const firebaseModule = require('../firebase');
  requestNotificationPermission = firebaseModule.requestNotificationPermission;
  getFCMToken = firebaseModule.getFCMToken;
  onMessageListener = firebaseModule.onMessageListener;
} catch (error) {
  console.warn('Firebase no está disponible (notificaciones deshabilitadas):', error);
  // Funciones dummy para que no falle
  requestNotificationPermission = async () => null;
  getFCMToken = async () => null;
  onMessageListener = () => () => {};
}

// Singleton: el listener onMessage se registra solo UNA vez globalmente.
// Varios componentes (App/Navbar, PanelAdministracionTienda) usan useNotifications,
// lo que causaba notificaciones duplicadas por venta.
let globalMessageListenerActive = false;
let globalMessageUnsubscribe = null;

const normalizeApiUrl = (url) => {
    if (!url) {
        return 'http://localhost:8000';
    }
    let normalizedUrl = url;
    if (normalizedUrl.endsWith('/api/') || normalizedUrl.endsWith('/api')) {
        normalizedUrl = normalizedUrl.replace(/\/api\/?$/, '');
    }
    if (normalizedUrl.endsWith('/')) {
        normalizedUrl = normalizedUrl.slice(0, -1);
    }
    return normalizedUrl;
};

const BASE_API_ENDPOINT = normalizeApiUrl(process.env.REACT_APP_API_URL || 'http://localhost:8000');

export const useNotifications = () => {
    const { token, isAuthenticated, selectedStoreSlug } = useAuth();
    const [notificationPermission, setNotificationPermission] = useState(
        typeof Notification !== 'undefined' ? Notification.permission : 'default'
    );
    const [fcmToken, setFcmToken] = useState(null);
    const [error, setError] = useState(null);
    const [isManuallyDisabled, setIsManuallyDisabled] = useState(false);

    // Sincronizar el estado del permiso con el navegador al montar
    useEffect(() => {
        if (typeof Notification !== 'undefined') {
            setNotificationPermission(Notification.permission);
        }
    }, []);

    // Obtener información del dispositivo
    const getDeviceInfo = useCallback(() => {
        const ua = navigator.userAgent;
        const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(ua);
        const browser = ua.match(/(?:Chrome|Firefox|Safari|Edge)\/(\d+)/)?.[0] || 'Desconocido';
        return `${isMobile ? 'Móvil' : 'Desktop'} - ${browser}`;
    }, []);

    // Registrar token en el backend
    const registrarToken = useCallback(async (fcmTokenValue) => {
        if (!token || !isAuthenticated || !fcmTokenValue) {
            return;
        }

        try {
            const deviceInfo = getDeviceInfo();
            await axios.post(
                `${BASE_API_ENDPOINT}/api/notificaciones/registrar-token/`,
                {
                    token: fcmTokenValue,
                    device_info: deviceInfo
                },
                {
                    headers: { 'Authorization': `Bearer ${token}` }
                }
            );
            console.log('Token FCM registrado en el backend');
            setFcmToken(fcmTokenValue);
        } catch (err) {
            console.error('Error al registrar token FCM:', err);
            setError('Error al registrar token de notificaciones');
        }
    }, [token, isAuthenticated, getDeviceInfo]);

    // Eliminar token del backend
    const eliminarToken = useCallback(async (fcmTokenValue) => {
        if (!token) {
            console.log('No hay token de autenticación para eliminar token FCM');
            // Aún así, limpiar el estado local si no hay token de autenticación
            setFcmToken(null);
            setError(null);
            return;
        }

        // Si no hay fcmTokenValue pero hay fcmToken en el estado, usar ese
        const tokenToDelete = fcmTokenValue || fcmToken;
        if (!tokenToDelete) {
            console.log('No hay token FCM para eliminar');
            setFcmToken(null);
            setError(null);
            return;
        }

        try {
            await axios.post(
                `${BASE_API_ENDPOINT}/api/notificaciones/eliminar-token/`,
                { token: tokenToDelete },
                {
                    headers: { 'Authorization': `Bearer ${token}` }
                }
            );
            console.log('Token FCM eliminado del backend');
            // Limpiar el estado local
            setFcmToken(null);
            // Limpiar cualquier error previo
            setError(null);
            // Marcar como desactivado manualmente para evitar que el useEffect automático lo reactive
            setIsManuallyDisabled(true);
            // Actualizar el estado de permiso para reflejar el estado real del navegador
            if (typeof Notification !== 'undefined') {
                setNotificationPermission(Notification.permission);
            }
        } catch (err) {
            console.error('Error al eliminar token FCM:', err);
            // Aún así, limpiar el estado local para permitir reactivar
            setFcmToken(null);
            setIsManuallyDisabled(true);
            setError('Error al desactivar notificaciones, pero el estado local se limpió');
        }
    }, [token, fcmToken]);

    // Solicitar permiso y registrar token
    const solicitarPermiso = useCallback(async () => {
        if (typeof Notification === 'undefined') {
            setError('Las notificaciones no están disponibles en este navegador');
            return;
        }
        
        console.log('Solicitando permiso de notificaciones...', { 
            currentFcmToken: fcmToken, 
            notificationPermission: Notification.permission,
            isManuallyDisabled
        });
        
        // Si el usuario está reactivando manualmente, resetear la bandera
        setIsManuallyDisabled(false);
        
        // Verificar el estado real del permiso del navegador (puede haber cambiado)
        const currentPermission = Notification.permission;
        setNotificationPermission(currentPermission);
        
        // Si ya tiene permiso pero no tiene token, obtenerlo directamente sin solicitar permiso nuevamente
        if (currentPermission === 'granted' && !fcmToken) {
            console.log('Permiso ya concedido, obteniendo token FCM...');
            try {
                // Limpiar cualquier error previo
                setError(null);
                
                // Obtener el token directamente sin mostrar diálogo de permiso
                const token = await getFCMToken(
                    (token) => {
                        console.log('Token FCM obtenido exitosamente:', token);
                        setFcmToken(token);
                        registrarToken(token);
                        setNotificationPermission('granted');
                    },
                    (error) => {
                        console.error('Error al obtener token:', error);
                        setError(error || 'No se pudo obtener el token de notificaciones');
                    }
                );

                if (token) {
                    console.log('Token FCM asignado:', token);
                    setNotificationPermission('granted');
                } else {
                    console.warn('No se obtuvo token FCM');
                    setError('No se pudo obtener el token de notificaciones. Verifica que el Service Worker esté configurado correctamente.');
                }
            } catch (error) {
                console.error('Error al obtener token de notificaciones:', error);
                setError('No se pudo obtener el token de notificaciones: ' + (error.message || error));
            }
            return;
        }

        // Si ya tiene permiso y token, no hacer nada
        if (currentPermission === 'granted' && fcmToken) {
            console.log('Ya tiene permiso y token, no se hace nada');
            return; // Ya tiene permiso y token
        }

        // Solicitar permiso si no está concedido
        console.log('Solicitando permiso al usuario...');
        try {
            // Limpiar cualquier error previo
            setError(null);
            
            const token = await requestNotificationPermission(
                (token) => {
                    console.log('Permiso concedido y token obtenido:', token);
                    setFcmToken(token);
                    registrarToken(token);
                    setNotificationPermission('granted');
                },
                (error) => {
                    console.error('Error al solicitar permiso:', error);
                    setError(error || 'No se pudo solicitar el permiso de notificaciones');
                    setNotificationPermission(Notification.permission);
                }
            );

            if (token) {
                console.log('Token obtenido después de solicitar permiso:', token);
                setNotificationPermission('granted');
            } else {
                console.warn('No se obtuvo token después de solicitar permiso');
                setNotificationPermission(Notification.permission);
            }
        } catch (error) {
            console.error('Error al solicitar permiso de notificaciones:', error);
            setError('No se pudieron solicitar permisos de notificaciones: ' + (error.message || error));
            setNotificationPermission(Notification.permission);
        }
    }, [fcmToken, registrarToken]);

    // Inicializar notificaciones cuando el usuario está autenticado
    useEffect(() => {
        if (!isAuthenticated || !token) {
            return;
        }

        // Verificar que las notificaciones estén disponibles
        if (typeof Notification === 'undefined' || typeof window === 'undefined') {
            return;
        }

        try {
            // Sincronizar el estado del permiso con el navegador
            const currentPermission = Notification.permission;
            setNotificationPermission(currentPermission);
            
            // Si ya tiene permiso y no hay token, obtener y registrar el token sin solicitar permiso nuevamente
            // PERO solo si no fue desactivado manualmente
            if (currentPermission === 'granted' && !fcmToken && !isManuallyDisabled) {
                console.log('Obteniendo token FCM automáticamente...');
                getFCMToken(
                    (token) => {
                        setFcmToken(token);
                        registrarToken(token);
                    },
                    (error) => {
                        console.warn('Error al obtener token FCM (no crítico):', error);
                        setError(error);
                    }
                );
            } else if (isManuallyDisabled) {
                console.log('Notificaciones desactivadas manualmente, no se reactivan automáticamente');
            }

            // Escuchar mensajes cuando la app está en primer plano
            // IMPORTANTE: Registrar el listener solo UNA vez globalmente (singleton).
            // Varios componentes usan useNotifications (App/Navbar, PanelAdministracionTienda)
            // y cada uno registraba su propio listener, causando notificaciones duplicadas.
            if (!globalMessageListenerActive) {
                console.log('Registrando listener de notificaciones (único global)');
                globalMessageListenerActive = true;

                globalMessageUnsubscribe = onMessageListener((payload) => {
                    console.log('Notificación recibida en primer plano:', payload);

                    // Leer título y cuerpo desde notification (WebpushConfig.notification del backend)
                    // con fallback a data para compatibilidad
                    const titulo = payload.notification?.title || payload.data?.notif_title || payload.data?.title || 'Nueva Venta';
                    const cuerpo  = payload.notification?.body  || payload.data?.notif_body  || payload.data?.body  || 'Nueva venta registrada';
                    const tieneContenido = titulo || cuerpo;

                    if (tieneContenido && typeof Notification !== 'undefined' && document.visibilityState === 'visible') {
                        try {
                            const ventaId = payload.data?.venta_id || Date.now().toString();
                            const notificationTag = `venta-${ventaId}`;

                            new Notification(titulo, {
                                body: cuerpo,
                                icon: payload.notification?.icon || '/logo192.png',
                                badge: '/logo192.png',
                                tag: notificationTag,
                                requireInteraction: false,
                                data: payload.data || {}
                            });
                        } catch (notifError) {
                            console.warn('Error al mostrar notificación en primer plano (no crítico):', notifError);
                        }
                    }
                });
            }

            // No desregistrar en cleanup: el listener es global y debe persistir al navegar.
            // Se desregistra solo en el efecto de logout.
            return () => {};
        } catch (error) {
            console.warn('Error al inicializar notificaciones (no crítico):', error);
            // No bloquear la app si fallan las notificaciones
        }
    }, [isAuthenticated, token, fcmToken, isManuallyDisabled]); // Removido registrarToken de las dependencias para evitar re-registros

    // Eliminar token al cerrar sesión y desregistrar el listener global
    useEffect(() => {
        if (!isAuthenticated) {
            if (fcmToken) {
                eliminarToken(fcmToken);
            }
            // Desregistrar el listener onMessage para evitar fugas y permitir re-registro en próximo login
            if (globalMessageUnsubscribe && typeof globalMessageUnsubscribe === 'function') {
                globalMessageUnsubscribe();
                globalMessageUnsubscribe = null;
                globalMessageListenerActive = false;
            }
        }
    }, [isAuthenticated, fcmToken, eliminarToken]);

    return {
        notificationPermission,
        fcmToken,
        error,
        solicitarPermiso,
        eliminarToken
    };
};
