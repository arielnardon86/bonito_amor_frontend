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
    // NUEVO ESTADO: Para almacenar el slug de la tienda seleccionada
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
        localStorage.removeItem('selected_store_slug'); // Limpiar también el slug de la tienda al cerrar sesión
        setSelectedStoreSlug(null); // Limpiar el estado
        setAuthToken(null);
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
            const response = await axios.post(`${process.env.REACT_APP_API_URL}/token/refresh/`, {
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

    const login = useCallback((userData) => {
        setUser(userData);
        const access_token = localStorage.getItem('access_token');
        if (access_token) {
            setAuthToken(access_token);
        }
    }, [setAuthToken]);

    // NUEVA FUNCIÓN: Para establecer la tienda seleccionada
    const selectStore = useCallback((slug) => {
        localStorage.setItem('selected_store_slug', slug);
        setSelectedStoreSlug(slug);
        console.log("Tienda seleccionada:", slug);
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
        selectedStoreSlug, // Expone el slug de la tienda seleccionada
        selectStore,       // Expone la función para seleccionar la tienda
        isStaff: user ? user.is_staff : false,
        isSuperUser: user ? user.is_superuser : false,
    };

    return (
        <AuthContext.Provider value={authContextValue}>
            {children}
        </AuthContext.Provider>
    );
};
