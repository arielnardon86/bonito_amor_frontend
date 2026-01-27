// hooks/useNotifications.js - Hook para manejar notificaciones push
import { useEffect, useState, useCallback } from 'react';
import { requestNotificationPermission, onMessageListener } from '../firebase';
import axios from 'axios';
import { useAuth } from '../AuthContext';

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
        if (!token || !fcmTokenValue) {
            return;
        }

        try {
            await axios.post(
                `${BASE_API_ENDPOINT}/api/notificaciones/eliminar-token/`,
                { token: fcmTokenValue },
                {
                    headers: { 'Authorization': `Bearer ${token}` }
                }
            );
            console.log('Token FCM eliminado del backend');
            setFcmToken(null);
        } catch (err) {
            console.error('Error al eliminar token FCM:', err);
        }
    }, [token]);

    // Solicitar permiso y registrar token
    const solicitarPermiso = useCallback(async () => {
        if (typeof Notification === 'undefined') {
            setError('Las notificaciones no están disponibles en este navegador');
            return;
        }
        
        if (notificationPermission === 'granted') {
            return; // Ya tiene permiso
        }

        try {
            const token = await requestNotificationPermission(
                (token) => {
                    setFcmToken(token);
                    registrarToken(token);
                },
                (error) => {
                    setError(error);
                }
            );

            if (token) {
                setNotificationPermission('granted');
            } else {
                setNotificationPermission(Notification.permission);
            }
        } catch (error) {
            console.warn('Error al solicitar permiso de notificaciones (no crítico):', error);
            setError('No se pudieron solicitar permisos de notificaciones');
        }
    }, [notificationPermission, registrarToken]);

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
            // Si ya tiene permiso, obtener y registrar el token
            if (notificationPermission === 'granted') {
                requestNotificationPermission(
                    (token) => {
                        setFcmToken(token);
                        registrarToken(token);
                    },
                    (error) => {
                        console.warn('Error al obtener token FCM (no crítico):', error);
                        setError(error);
                    }
                );
            }

            // Escuchar mensajes cuando la app está en primer plano
            const unsubscribe = onMessageListener((payload) => {
                console.log('Notificación recibida:', payload);
                // Aquí puedes mostrar una notificación personalizada o actualizar el estado
                if (payload.notification && typeof Notification !== 'undefined') {
                    try {
                        new Notification(payload.notification.title, {
                            body: payload.notification.body,
                            icon: payload.notification.icon || '/logo192.png',
                            badge: '/logo192.png',
                            tag: 'venta-notification',
                            requireInteraction: false
                        });
                    } catch (notifError) {
                        console.warn('Error al mostrar notificación (no crítico):', notifError);
                    }
                }
            });

            return () => {
                if (unsubscribe && typeof unsubscribe === 'function') {
                    unsubscribe();
                }
            };
        } catch (error) {
            console.warn('Error al inicializar notificaciones (no crítico):', error);
            // No bloquear la app si fallan las notificaciones
        }
    }, [isAuthenticated, token, notificationPermission, registrarToken]);

    // Eliminar token al cerrar sesión
    useEffect(() => {
        if (!isAuthenticated && fcmToken) {
            eliminarToken(fcmToken);
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
