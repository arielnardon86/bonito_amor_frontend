// BONITO_AMOR/frontend/src/AuthContext.js
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { jwtDecode } from 'jwt-decode';
import { useNavigate } from 'react-router-dom';

const AuthContext = createContext(null);

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [token, setToken] = useState(localStorage.getItem('access_token'));
    const [error, setError] = useState(null); 
    const [stores, setStores] = useState([]); 
    const [selectedStoreSlug, setSelectedStoreSlug] = useState(localStorage.getItem('selected_store_slug') || null);
    const navigate = useNavigate();

    const setAuthToken = useCallback((tkn) => {
        if (tkn) {
            axios.defaults.headers.common['Authorization'] = `Bearer ${tkn}`;
            setToken(tkn);
            console.log("AuthContext: Token de Axios configurado:", tkn ? tkn.substring(0, 10) + '...' : 'null');
        } else {
            delete axios.defaults.headers.common['Authorization'];
            setToken(null);
            console.log("AuthContext: Token de Axios eliminado.");
        }
    }, []);

    const logout = useCallback(() => {
        console.log("AuthContext: Ejecutando logout.");
        setUser(null);
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        localStorage.removeItem('selected_store_slug');
        setSelectedStoreSlug(null);
        setAuthToken(null);
        navigate('/login/bonito-amor'); 
    }, [setAuthToken, navigate]);

    const refreshToken = useCallback(async () => {
        const refresh_token = localStorage.getItem('refresh_token');
        console.log("AuthContext: Intentando refrescar token. Refresh token:", refresh_token ? refresh_token.substring(0, 10) + '...' : 'null');
        if (!refresh_token) {
            console.log("No refresh token available. Logging out.");
            logout();
            return null;
        }

        try {
            // CAMBIO CLAVE: Añadir /api/
            const response = await axios.post(`${process.env.REACT_APP_API_URL}/api/token/refresh/`, {
                refresh: refresh_token,
            });
            const new_access_token = response.data.access;
            localStorage.setItem('access_token', new_access_token);
            setAuthToken(new_access_token);
            console.log("AuthContext: Token refrescado con éxito.");
            return new_access_token;
        } catch (error) {
            console.error("Error refreshing token:", error.response ? error.response.data : error.message);
            setError(error.response?.data?.detail || "Error al refrescar el token."); 
            logout();
            return null;
        }
    }, [setAuthToken, logout, setError]);

    const selectStore = useCallback((slug) => {
        localStorage.setItem('selected_store_slug', slug);
        setSelectedStoreSlug(slug);
        console.log("AuthContext: Tienda seleccionada:", slug);
    }, []);

    const login = useCallback(async (username, password, storeSlugFromUrl) => { 
        setError(null); 
        console.log("AuthContext: Intentando login para usuario:", username, "Tienda:", storeSlugFromUrl);
        try {
            const payload = { username, password };
            if (storeSlugFromUrl) {
                payload.store_slug = storeSlugFromUrl; 
            }

            // CAMBIO CLAVE: Añadir /api/
            const response = await axios.post(`${process.env.REACT_APP_API_URL}/api/token/`, payload); 

            const { access, refresh } = response.data;

            localStorage.setItem('access_token', access);
            localStorage.setItem('refresh_token', refresh);
            setAuthToken(access); 

            console.log("AuthContext: Obteniendo detalles de usuario después del login...");
            // CAMBIO CLAVE: Añadir /api/
            const userResponse = await axios.get(`${process.env.REACT_APP_API_URL}/api/users/me/`);
            setUser(userResponse.data);
            console.log("AuthContext: Detalles de usuario obtenidos:", userResponse.data);

            if (storeSlugFromUrl) {
                selectStore(storeSlugFromUrl);
            } else {
                setSelectedStoreSlug(null);
                localStorage.removeItem('selected_store_slug');
            }

            return true; 
        } catch (err) {
            console.error("AuthContext: Login fallido:", err.response ? err.response.data : err.message);
            const errorMessage = err.response?.data?.detail || "Error de inicio de sesión. Credenciales inválidas.";
            setError(errorMessage);
            logout(); 
            return false; 
        }
    }, [setAuthToken, logout, selectStore, setError]); 

    const fetchStores = useCallback(async () => {
        console.log("AuthContext: fetchStores llamado.");
        try {
            // CAMBIO CLAVE: Añadir /api/
            const response = await axios.get(`${process.env.REACT_APP_API_URL}/api/tiendas/`);
            setStores(response.data.results || response.data);
            console.log("AuthContext: Tiendas cargadas con éxito:", response.data.results || response.data);
        } catch (err) {
            console.error("AuthContext: Error fetching stores:", err.response ? err.response.data : err.message);
            const errorMessage = err.response?.data?.detail || "Error al cargar tiendas.";
            setError(errorMessage); 
            setStores([]); 
        }
    }, [setError]);

    const clearError = useCallback(() => {
        setError(null);
    }, []);

    useEffect(() => {
        const loadUserAndStores = async () => {
            setLoading(true); 
            console.log("AuthContext: Iniciando loadUserAndStores...");
            let current_access_token = localStorage.getItem('access_token');
            const stored_store_slug = localStorage.getItem('selected_store_slug');

            if (stored_store_slug) {
                setSelectedStoreSlug(stored_store_slug);
            }
            
            // fetchStores se llama aquí, y ahora su URL interna es correcta
            await fetchStores(); 

            if (current_access_token) {
                try {
                    console.log("AuthContext: Decodificando token de acceso...");
                    const decodedToken = jwtDecode(current_access_token);
                    const currentTime = Date.now() / 1000;

                    if (decodedToken.exp < currentTime) {
                        console.log("AuthContext: Token de acceso expirado. Intentando refrescar...");
                        current_access_token = await refreshToken(); 
                        if (!current_access_token) { 
                            setLoading(false);
                            return;
                        }
                    }
                    
                    setAuthToken(current_access_token);
                    console.log("AuthContext: Token de acceso válido o refrescado. Obteniendo detalles de usuario...");

                    try {
                        // CAMBIO CLAVE: Añadir /api/
                        const userResponse = await axios.get(`${process.env.REACT_APP_API_URL}/api/users/me/`);
                        if (userResponse.data) {
                            setUser(userResponse.data);
                            console.log("AuthContext: Usuario establecido:", userResponse.data);
                        } else {
                            console.warn("AuthContext: No se recibieron datos de usuario de /users/me/. Cerrando sesión.");
                            logout();
                            setLoading(false);
                            return;
                        }
                    } catch (userError) {
                        console.error("AuthContext: Error al obtener detalles de usuario:", userError.response ? userError.response.data : userError.message);
                        logout();
                        setLoading(false);
                        return;
                    }

                } catch (error) {
                    console.error("AuthContext: Error general en loadUserAndStores (decodificación/refresh):", error);
                    logout();
                }
            } else {
                console.log("AuthContext: No se encontró token de acceso en localStorage. Las tiendas ya se intentaron cargar de forma no autenticada.");
                setUser(null);
            }
            setLoading(false);
            console.log("AuthContext: loadUserAndStores finalizado. Loading es ahora false.");
        };

        loadUserAndStores();

        const interval = setInterval(async () => {
            const current_access_token_interval = localStorage.getItem('access_token');
            if (current_access_token_interval) {
                try {
                    const decodedToken = jwtDecode(current_access_token_interval);
                    const currentTime = Date.now() / 1000;
                    if (decodedToken.exp - currentTime < 120) { 
                        console.log("AuthContext: Token a punto de expirar. Refrescando proactivamente...");
                        await refreshToken();
                    }
                } catch (error) {
                    console.error("AuthContext: Error al verificar token para refresco proactivo:", error);
                    logout();
                }
            }
        }, 1000 * 60); 

        return () => clearInterval(interval);
    }, [refreshToken, logout, setAuthToken, fetchStores]); 

    const authContextValue = {
        user,
        isAuthenticated: !!user,
        login,
        logout,
        loading,
        token,
        error, 
        clearError, 
        stores, 
        selectedStoreSlug,
        selectStore,
        isStaff: user ? user.is_staff : false,
        isSuperUser: user ? user.is_superuser : false,
    };

    return (
        <AuthContext.Provider value={authContextValue}>
            {children}
        </AuthContext.Provider>
    );
};
