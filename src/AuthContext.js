// BONITO_AMOR/frontend/src/AuthContext.js
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { jwtDecode } from 'jwt-decode';
import { useNavigate } from 'react-router-dom';

const AuthContext = createContext(null);

export const useAuth = () => useContext(AuthContext);

// URL base de la API, obtenida de las variables de entorno de React
const API_BASE_URL = process.env.REACT_APP_API_URL; 

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [token, setToken] = useState(localStorage.getItem('access_token'));
    // NUEVO ESTADO: Para manejar errores de autenticación
    const [authError, setAuthError] = useState(null); 
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
        setAuthError(null); // Limpiar errores al cerrar sesión
        navigate('/login');
    }, [setAuthToken, navigate]);

    const refreshToken = useCallback(async () => {
        const refresh_token = localStorage.getItem('refresh_token');
        if (!refresh_token) {
            console.log("No refresh token available. Logging out.");
            logout();
            return null;
        }

        try {
            const response = await axios.post(`${API_BASE_URL}/token/refresh/`, {
                refresh: refresh_token,
            });
            const new_access_token = response.data.access;
            localStorage.setItem('access_token', new_access_token);
            setAuthToken(new_access_token);
            return new_access_token;
        } catch (error) {
            console.error("Error refreshing token:", error.response ? error.response.data : error.message);
            logout();
            return null;
        }
    }, [setAuthToken, logout]);

    // FUNCIÓN DE LOGIN ACTUALIZADA: Realiza la llamada a la API y maneja la autenticación
    const login = useCallback(async (username, password) => {
        setAuthError(null); // Limpiar errores previos
        try {
            const response = await axios.post(`${API_BASE_URL}/token/`, {
                username,
                password,
            });
            const { access, refresh } = response.data;

            localStorage.setItem('access_token', access);
            localStorage.setItem('refresh_token', refresh);
            setAuthToken(access);

            // Fetch user details after successful login
            const userResponse = await axios.get(`${API_BASE_URL}/users/me/`, {
                headers: { 'Authorization': `Bearer ${access}` }
            });
            setUser(userResponse.data);
            return true; // Login exitoso
        } catch (error) {
            console.error("Error logging in:", error.response ? error.response.data : error.message);
            if (error.response && error.response.status === 401) {
                setAuthError("Credenciales inválidas. Por favor, verifica tu usuario y contraseña.");
            } else {
                setAuthError("Error al iniciar sesión. Inténtalo de nuevo más tarde.");
            }
            setUser(null);
            setAuthToken(null);
            localStorage.removeItem('access_token');
            localStorage.removeItem('refresh_token');
            return false; // Login fallido
        }
    }, [setAuthToken]);

    // NUEVA FUNCIÓN: Para establecer la tienda seleccionada
    const selectStore = useCallback((slug) => {
        localStorage.setItem('selected_store_slug', slug);
        setSelectedStoreSlug(slug);
        console.log("Tienda seleccionada:", slug);
    }, []);

    // NUEVA FUNCIÓN: Para limpiar el error de autenticación
    const clearAuthError = useCallback(() => {
        setAuthError(null);
    }, []);


    useEffect(() => {
        const loadUser = async () => {
            console.log("AuthContext: Iniciando loadUser...");
            const access_token = localStorage.getItem('access_token');
            const stored_store_slug = localStorage.getItem('selected_store_slug');

            if (stored_store_slug) {
                setSelectedStoreSlug(stored_store_slug);
            }

            if (access_token) {
                try {
                    console.log("AuthContext: Attempting to decode token...");
                    const decodedToken = jwtDecode(access_token);
                    const currentTime = Date.now() / 1000;

                    if (decodedToken.exp < currentTime) {
                        console.log("Access token expired. Attempting to refresh...");
                        const new_access_token = await refreshToken();
                        if (new_access_token) {
                            try {
                                const userResponse = await axios.get(`${API_BASE_URL}/users/me/`);
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
                        setAuthToken(access_token);
                        try {
                            const userResponse = await axios.get(`${API_BASE_URL}/users/me/`);
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
            console.log("AuthContext: loadUser finished. Loading is now false.");
        };

        loadUser();

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
    }, [refreshToken, logout, setAuthToken]);


    const authContextValue = {
        user,
        isAuthenticated: !!user,
        login,
        logout,
        loading,
        token,
        selectedStoreSlug, 
        selectStore,       
        isStaff: user ? user.is_staff : false,
        isSuperUser: user ? user.is_superuser : false,
        error: authError, // Exponer el error de autenticación
        clearError: clearAuthError, // Exponer la función para limpiar el error
    };

    return (
        <AuthContext.Provider value={authContextValue}>
            {children}
        </AuthContext.Provider>
    );
};
