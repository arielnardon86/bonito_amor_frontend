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

    // Función para configurar el token de autenticación en los headers de axios
    const setAuthToken = useCallback((tkn) => {
        if (tkn) {
            axios.defaults.headers.common['Authorization'] = `Bearer ${tkn}`;
            setToken(tkn);
        } else {
            delete axios.defaults.headers.common['Authorization'];
            setToken(null);
        }
    }, []);

    // Función para cerrar sesión
    const logout = useCallback(() => {
        setUser(null);
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        localStorage.removeItem('selected_store_slug');
        setSelectedStoreSlug(null);
        setAuthToken(null);
        navigate('/login/bonito-amor'); 
    }, [setAuthToken, navigate]);

    // Función para refrescar el token de acceso
    const refreshToken = useCallback(async () => {
        const refresh_token = localStorage.getItem('refresh_token');
        if (!refresh_token) {
            console.log("No refresh token available. Logging out.");
            logout();
            return null;
        }

        try {
            const response = await axios.post(`${process.env.REACT_APP_API_URL}/token/refresh/`, {
                refresh: refresh_token,
            });
            const new_access_token = response.data.access;
            localStorage.setItem('access_token', new_access_token);
            setAuthToken(new_access_token);
            return new_access_token;
        } catch (error) {
            console.error("Error refreshing token:", error.response ? error.response.data : error.message);
            setError(error.response?.data?.detail || "Error al refrescar el token."); 
            logout();
            return null;
        }
    }, [setAuthToken, logout, setError]);

    // Función para seleccionar la tienda
    const selectStore = useCallback((slug) => {
        localStorage.setItem('selected_store_slug', slug);
        setSelectedStoreSlug(slug);
        console.log("Tienda seleccionada:", slug);
    }, []);

    // Función de login modificada
    const login = useCallback(async (username, password, storeSlugFromUrl) => { 
        setError(null); 
        try {
            const payload = { username, password };
            if (storeSlugFromUrl) {
                payload.store_slug = storeSlugFromUrl; 
            }

            const response = await axios.post(`${process.env.REACT_APP_API_URL}/token/`, payload); 

            const { access, refresh } = response.data;

            localStorage.setItem('access_token', access);
            localStorage.setItem('refresh_token', refresh);
            setAuthToken(access); // Configura el token globalmente

            // Fetch user details immediately after successful login
            // Ahora usa el endpoint correcto /api/users/me/
            const userResponse = await axios.get(`${process.env.REACT_APP_API_URL}/users/me/`);
            setUser(userResponse.data);

            // Si storeSlugFromUrl está presente, úsalo para seleccionar la tienda.
            if (storeSlugFromUrl) {
                selectStore(storeSlugFromUrl);
            } else {
                setSelectedStoreSlug(null);
                localStorage.removeItem('selected_store_slug');
            }

            return true; 
        } catch (err) {
            console.error("Login failed:", err.response ? err.response.data : err.message);
            const errorMessage = err.response?.data?.detail || "Error de inicio de sesión. Credenciales inválidas.";
            setError(errorMessage);
            logout(); 
            return false; 
        }
    }, [setAuthToken, logout, selectStore, setError]); 

    // Función para obtener las tiendas
    // AHORA PASA EL TOKEN EXPLÍCITAMENTE
    const fetchStores = useCallback(async (currentToken) => {
        if (!currentToken) { // Solo intentar si hay un token válido
            setStores([]);
            return;
        }
        try {
            // Asegúrate de usar la URL correcta para tiendas
            const response = await axios.get(`${process.env.REACT_APP_API_URL}/tiendas/`, {
                headers: { 'Authorization': `Bearer ${currentToken}` } // Pasa el token en el header
            });
            setStores(response.data.results || response.data);
        } catch (err) {
            console.error("Error fetching stores:", err.response ? err.response.data : err.message);
            setError("Error al cargar tiendas."); 
            setStores([]); 
        }
    }, [setError]); // Depende solo de setError, ya que el token se pasa como argumento

    const clearError = useCallback(() => {
        setError(null);
    }, []);

    useEffect(() => {
        const loadUserAndStores = async () => {
            setLoading(true); // Asegurarse de que loading sea true al inicio
            console.log("AuthContext: Iniciando loadUserAndStores...");
            let current_access_token = localStorage.getItem('access_token');
            const stored_store_slug = localStorage.getItem('selected_store_slug');

            // Restaurar el slug de la tienda seleccionada temprano si está disponible
            if (stored_store_slug) {
                setSelectedStoreSlug(stored_store_slug);
            }
            
            if (current_access_token) {
                try {
                    console.log("AuthContext: Attempting to decode token...");
                    const decodedToken = jwtDecode(current_access_token);
                    const currentTime = Date.now() / 1000;

                    if (decodedToken.exp < currentTime) {
                        console.log("Access token expired. Attempting to refresh...");
                        current_access_token = await refreshToken(); // Actualiza current_access_token
                        if (!current_access_token) { // Si el refresh falló, cerrar sesión y salir
                            setLoading(false);
                            return;
                        }
                    }
                    
                    // Configura el token globalmente para axios después de refrescar o si es válido
                    setAuthToken(current_access_token);

                    // Obtener detalles del usuario y tiendas DESPUÉS de que el token esté configurado
                    try {
                        // Usar el endpoint correcto /api/users/me/
                        const userResponse = await axios.get(`${process.env.REACT_APP_API_URL}/users/me/`);
                        if (userResponse.data) {
                            setUser(userResponse.data);
                        } else {
                            console.warn("No user data received from /users/me/. Logging out.");
                            logout();
                            setLoading(false);
                            return;
                        }
                    } catch (userError) {
                        console.error("Error fetching user details:", userError.response ? userError.response.data : userError.message);
                        logout();
                        setLoading(false);
                        return;
                    }

                    // Ahora, obtener las tiendas, pasando el token confirmado y válido
                    await fetchStores(current_access_token);

                } catch (error) {
                    console.error("Error decoding access token or other issue during loadUser:", error);
                    logout();
                }
            } else {
                console.log("AuthContext: No access token found in localStorage.");
                // Si no hay token, no se pueden obtener las tiendas (porque requieren autenticación)
                setStores([]); // Asegurarse de que las tiendas estén vacías
            }
            setLoading(false);
            console.log("AuthContext: loadUserAndStores finished. Loading is now false.");
        };

        loadUserAndStores();

        // Intervalo para refrescar el token proactivamente
        const interval = setInterval(async () => {
            const current_access_token_interval = localStorage.getItem('access_token');
            if (current_access_token_interval) {
                try {
                    const decodedToken = jwtDecode(current_access_token_interval);
                    const currentTime = Date.now() / 1000;
                    // Refrescar si el token expira en menos de 2 minutos
                    if (decodedToken.exp - currentTime < 120) { 
                        console.log("Token about to expire. Proactively refreshing...");
                        await refreshToken();
                    }
                } catch (error) {
                    console.error("Error checking token for proactive refresh:", error);
                    logout();
                }
            }
        }, 1000 * 60); // Cada 1 minuto

        return () => clearInterval(interval);
    }, [refreshToken, logout, setAuthToken, fetchStores]); // fetchStores es ahora una dependencia

    // Valores proporcionados por el contexto
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
