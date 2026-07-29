import React, { createContext, useState, useEffect, useContext, useCallback } from 'react';
import axios from 'axios';
import { jwtDecode } from 'jwt-decode';
import Swal from 'sweetalert2';

const AuthContext = createContext(null);

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://127.0.0.1:8000';

const normalizeApiUrl = (url) => {
    if (!url) {
        return 'http://127.0.0.1:8000';
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

const BASE_API_ENDPOINT = normalizeApiUrl(API_BASE_URL);

// Estado del interceptor de refresh de token, compartido entre todas las requests
// (vive a nivel de módulo porque axios es un singleton, no depende de renders de React).
let refrescandoToken = false;
let suscriptoresRefresh = [];
let sesionExpiradaMostrada = false;

const suscribirseARefresh = (cb) => { suscriptoresRefresh.push(cb); };
const notificarRefreshListo = (nuevoToken) => {
    suscriptoresRefresh.forEach(cb => cb(nuevoToken));
    suscriptoresRefresh = [];
};

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [token, setToken] = useState(localStorage.getItem('token'));
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [loading, setLoading] = useState(true);
    const [stores, setStores] = useState([]);
    const [selectedStoreSlug, setSelectedStoreSlug] = useState(localStorage.getItem('selectedStoreSlug'));
    const [tiendasAutorizadas, setTiendasAutorizadas] = useState(() => {
        try { return JSON.parse(localStorage.getItem('tiendasAutorizadas') || '[]'); }
        catch { return []; }
    });
    const [authError, setAuthError] = useState(null);
    const [sessionLocked, setSessionLocked] = useState(false);

    const lockSession = useCallback(() => setSessionLocked(true), []);
    const unlockSession = useCallback(() => setSessionLocked(false), []);

    const fetchStores = useCallback(async () => {
        try {
            const response = await axios.get(`${BASE_API_ENDPOINT}/api/tiendas/`, {
                headers: {
                    'Content-Type': 'application/json',
                    ...(token && { 'Authorization': `Bearer ${token}` })
                }
            });
            const data = response.data;
            const list = Array.isArray(data) ? data : (data?.results ?? []);
            setStores(list);
            return list;
        } catch (err) {
            console.error('Error fetching stores:', err);
            setStores([]);
            return [];
        }
    }, [token]);

    const logout = useCallback(() => {
        localStorage.removeItem('token');
        localStorage.removeItem('refreshToken');
        localStorage.removeItem('user');
        localStorage.removeItem('selectedStoreSlug');
        localStorage.removeItem('tiendasAutorizadas');
        setToken(null);
        setUser(null);
        setIsAuthenticated(false);
        setSelectedStoreSlug(null);
        setTiendasAutorizadas([]);
        setAuthError(null);
        delete axios.defaults.headers.common['Authorization'];
    }, []);

    const login = useCallback(async (username, password, _storeSlugIgnored) => {
        setLoading(true);
        setAuthError(null);
        try {
            const response = await axios.post(`${BASE_API_ENDPOINT}/api/token/`, { username, password });
            const newToken = response.data.access;
            const newRefreshToken = response.data.refresh;
            const decodedUser = jwtDecode(newToken);

            const autorizadas = decodedUser.tiendas_autorizadas || [];
            const tiendaInicial = decodedUser.tienda_nombre || (autorizadas[0]?.nombre ?? null);

            if (!tiendaInicial) {
                setLoading(false);
                setAuthError('El usuario no tiene una tienda asignada.');
                logout();
                return false;
            }

            localStorage.setItem('token', newToken);
            if (newRefreshToken) localStorage.setItem('refreshToken', newRefreshToken);
            axios.defaults.headers.common['Authorization'] = `Bearer ${newToken}`;

            const userData = {
                id: decodedUser.user_id,
                username: decodedUser.username,
                email: decodedUser.email,
                is_staff: decodedUser.is_staff,
                is_superuser: decodedUser.is_superuser,
                is_supervisor: decodedUser.is_supervisor || false,
                cierre_caja_habilitado: decodedUser.cierre_caja_habilitado || false,
                tienda_tiene_cierre_caja: decodedUser.tienda_tiene_cierre_caja || false,
            };

            setUser(userData);
            setToken(newToken);
            setIsAuthenticated(true);
            setTiendasAutorizadas(autorizadas);
            localStorage.setItem('tiendasAutorizadas', JSON.stringify(autorizadas));
            setSelectedStoreSlug(tiendaInicial);
            localStorage.setItem('selectedStoreSlug', tiendaInicial);

            setLoading(false);
            return true;
        } catch (err) {
            console.error('Error during login:', err.response ? err.response.data : err.message);
            const detail = err.response?.data?.detail;
            const msg = typeof detail === 'string'
                ? detail
                : Array.isArray(detail)
                    ? detail[0]
                    : null;
            setAuthError(msg || 'Credenciales incorrectas o error de conexión.');
            setLoading(false);
            logout();
            return false;
        }
    }, [logout]);

    const loadUserInitial = useCallback(async () => {
        if (token) {
            try {
                axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
                const decodedToken = jwtDecode(token);
                // No necesitas la segunda llamada, puedes construir el objeto user con los datos del token
                const userData = {
                    id: decodedToken.user_id,
                    username: decodedToken.username,
                    email: decodedToken.email,
                    is_staff: decodedToken.is_staff,
                    is_superuser: decodedToken.is_superuser,
                    is_supervisor: decodedToken.is_supervisor || false,
                    cierre_caja_habilitado: decodedToken.cierre_caja_habilitado || false,
                    tienda_tiene_cierre_caja: decodedToken.tienda_tiene_cierre_caja || false,
                };
                setUser(userData);
                setIsAuthenticated(true);
                const autorizadas = decodedToken.tiendas_autorizadas || [];
                setTiendasAutorizadas(autorizadas);
                localStorage.setItem('tiendasAutorizadas', JSON.stringify(autorizadas));
            } catch (err) {
                console.error('Error al decodificar token o cargar usuario:', err);
                logout();
            }
        }

        if (token) {
            await fetchStores();
        } else {
            setStores([]);
        }

        setLoading(false);
    }, [token, logout, fetchStores]);

    const selectStore = useCallback((slug) => {
        const permitida = tiendasAutorizadas.some(t => t.nombre === slug)
            || stores.some(s => s.nombre === slug);
        if (permitida) {
            setSelectedStoreSlug(slug);
            localStorage.setItem('selectedStoreSlug', slug);
        } else {
            console.error("Tienda no autorizada para este usuario.");
        }
    }, [tiendasAutorizadas, stores]);

    useEffect(() => {
        loadUserInitial();
    }, [loadUserInitial]);

    const mostrarSesionExpirada = useCallback(() => {
        if (sesionExpiradaMostrada) return;
        sesionExpiradaMostrada = true;
        logout();
        Swal.fire({
            icon: 'info',
            title: 'Tu sesión expiró',
            text: 'Por seguridad, tenés que iniciar sesión de nuevo para continuar.',
            confirmButtonText: 'Iniciar sesión',
            allowOutsideClick: false,
        }).then(() => {
            window.location.href = '/login';
        });
    }, [logout]);

    // Cuando el access token vence (5 días), en vez de que cada pantalla muestre su
    // propio "Error al cargar X" genérico, se intenta renovar en silencio con el
    // refresh token (30 días) y se reintenta la request original. Solo si el refresh
    // también falla (o no existe) se corta la sesión con un mensaje claro.
    useEffect(() => {
        const interceptorId = axios.interceptors.response.use(
            (response) => response,
            async (error) => {
                const originalRequest = error.config;
                const url = originalRequest?.url || '';
                const esEndpointDeAuth = url.includes('/api/token/');

                if (error.response?.status !== 401 || esEndpointDeAuth || originalRequest._retryTrasRefresh) {
                    return Promise.reject(error);
                }

                const storedRefreshToken = localStorage.getItem('refreshToken');
                if (!storedRefreshToken) {
                    mostrarSesionExpirada();
                    return Promise.reject(error);
                }

                originalRequest._retryTrasRefresh = true;

                if (refrescandoToken) {
                    return new Promise((resolve, reject) => {
                        suscribirseARefresh((nuevoToken) => {
                            if (!nuevoToken) { reject(error); return; }
                            originalRequest.headers['Authorization'] = `Bearer ${nuevoToken}`;
                            resolve(axios(originalRequest));
                        });
                    });
                }

                refrescandoToken = true;
                try {
                    const refreshResponse = await axios.post(`${BASE_API_ENDPOINT}/api/token/refresh/`, {
                        refresh: storedRefreshToken,
                    });
                    const nuevoAccessToken = refreshResponse.data.access;
                    localStorage.setItem('token', nuevoAccessToken);
                    axios.defaults.headers.common['Authorization'] = `Bearer ${nuevoAccessToken}`;
                    refrescandoToken = false;
                    notificarRefreshListo(nuevoAccessToken);
                    originalRequest.headers['Authorization'] = `Bearer ${nuevoAccessToken}`;
                    return axios(originalRequest);
                } catch (refreshError) {
                    refrescandoToken = false;
                    notificarRefreshListo(null);
                    mostrarSesionExpirada();
                    return Promise.reject(error);
                }
            }
        );
        return () => axios.interceptors.response.eject(interceptorId);
    }, [mostrarSesionExpirada]);

    const clearError = useCallback(() => {
        setAuthError(null);
    }, []);

    const updateUser = useCallback((updates) => {
        setUser(prev => prev ? { ...prev, ...updates } : prev);
    }, []);

    const contextValue = {
        user,
        token,
        isAuthenticated,
        loading,
        login,
        logout,
        stores,
        selectedStoreSlug,
        selectStore,
        fetchStores,
        tiendasAutorizadas,
        error: authError,
        clearError,
        updateUser,
        sessionLocked,
        lockSession,
        unlockSession,
    };

    return (
        <AuthContext.Provider value={contextValue}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};