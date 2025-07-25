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
        } else {
            delete axios.defaults.headers.common['Authorization'];
            setToken(null);
        }
    }, []);

    const logout = useCallback(() => {
        setUser(null);
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        localStorage.removeItem('selected_store_slug');
        setSelectedStoreSlug(null);
        setAuthToken(null);
        // Redirige al login de Bonito Amor por defecto al cerrar sesión
        navigate('/login/bonito-amor'); 
    }, [setAuthToken, navigate]);

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

    // Function to set the selected store
    const selectStore = useCallback((slug) => {
        localStorage.setItem('selected_store_slug', slug);
        setSelectedStoreSlug(slug);
        console.log("Tienda seleccionada:", slug);
    }, []);

    // Modified login function to handle authentication API call
    const login = useCallback(async (username, password, storeSlugFromUrl) => { 
        setError(null); 
        try {
            const payload = { username, password };
            if (storeSlugFromUrl) {
                payload.store_slug = storeSlugFromUrl; // <--- ¡CAMBIO CLAVE AQUÍ! Añade store_slug al payload
            }

            const response = await axios.post(`${process.env.REACT_APP_API_URL}/token/`, payload); // Envía el payload con store_slug

            const { access, refresh } = response.data;

            localStorage.setItem('access_token', access);
            localStorage.setItem('refresh_token', refresh);
            setAuthToken(access);

            // Fetch user details immediately after successful login
            const userResponse = await axios.get(`${process.env.REACT_APP_API_URL}/users/me/`);
            setUser(userResponse.data);

            // Si storeSlugFromUrl está presente, úsalo para seleccionar la tienda.
            if (storeSlugFromUrl) {
                selectStore(storeSlugFromUrl);
            } else {
                // Si no se proporcionó un storeSlug, limpia la selección de tienda
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

    // Function to fetch stores
    const fetchStores = useCallback(async () => {
        try {
            const response = await axios.get(`${process.env.REACT_APP_API_URL}/tiendas/`);
            setStores(response.data.results || response.data);
        } catch (err) {
            console.error("Error fetching stores:", err.response ? err.response.data : err.message);
            setError("Error al cargar tiendas."); 
            setStores([]); 
        }
    }, [setError]);

    const clearError = useCallback(() => {
        setError(null);
    }, []);

    useEffect(() => {
        const loadUserAndStores = async () => {
            console.log("AuthContext: Iniciando loadUserAndStores...");
            const access_token = localStorage.getItem('access_token');
            const stored_store_slug = localStorage.getItem('selected_store_slug');

            // Siempre intentar cargar las tiendas al inicio.
            await fetchStores(); 

            // Solo restaurar la tienda seleccionada si ya estaba en localStorage
            if (stored_store_slug) {
                setSelectedStoreSlug(stored_store_slug);
            }
            // No hay auto-selección de tienda única aquí. HomePage o Navbar lo manejarán.

            if (access_token) {
                try {
                    console.log("AuthContext: Attempting to decode token...");
                    const decodedToken = jwtDecode(access_token);
                    const currentTime = Date.now() / 1000;

                    if (decodedToken.exp < currentTime) {
                        console.log("Access token expired. Attempting to refresh...");
                        const new_access_token = await refreshToken();
                        if (new_access_token) {
                            // Si el token se refrescó, volvemos a obtener los datos del usuario
                            try {
                                const userResponse = await axios.get(`${process.env.REACT_APP_API_URL}/users/me/`);
                                if (userResponse.data) {
                                    setUser(userResponse.data);
                                    setToken(new_access_token);
                                } else {
                                    console.warn("No user data received from /users/me/ after refresh. Logging out.");
                                    logout();
                                }
                            } catch (userError) {
                                console.error("Error fetching user details after refresh:", userError.response ? userError.response.data : userError.message);
                                logout();
                            }
                        } else {
                            logout();
                        }
                    } else {
                        // Si el token es válido, solo configurarlo y obtener los detalles del usuario
                        setAuthToken(access_token);
                        try {
                            const userResponse = await axios.get(`${process.env.REACT_APP_API_URL}/users/me/`);
                            if (userResponse.data) {
                                setUser(userResponse.data);
                                setToken(access_token);
                            } else {
                                console.warn("No user data received from /users/me/ with valid token. Logging out.");
                                logout();
                            }
                        } catch (userError) {
                            console.error("Error fetching user details with valid token:", userError.response ? userError.response.data : userError.message);
                            logout();
                        }
                    }
                } catch (error) {
                    console.error("Error decoding access token or other issue during loadUser:", error);
                    logout();
                }
            } else {
                console.log("AuthContext: No access token found in localStorage.");
                setToken(null);
            }
            setLoading(false);
            console.log("AuthContext: loadUserAndStores finished. Loading is now false.");
        };

        loadUserAndStores();

        const interval = setInterval(async () => {
            const current_access_token = localStorage.getItem('access_token');
            if (current_access_token) {
                try {
                    const decodedToken = jwtDecode(current_access_token);
                    const currentTime = Date.now() / 1000;
                    if (decodedToken.exp - currentTime < 120) {
                        console.log("Token about to expire. Proactively refreshing...");
                        await refreshToken();
                    }
                } catch (error) {
                    console.error("Error checking token for proactive refresh:", error);
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
