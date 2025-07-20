// Store/frontend/src/AuthContext.js (CORREGIDO)
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
            // ¡¡¡CORRECCIÓN CLAVE AQUÍ!!!
            // Cambiado de /token/refresh/ a /auth/jwt/refresh/ para coincidir con Djoser JWT
            const response = await axios.post(`${process.env.REACT_APP_API_URL}/auth/jwt/refresh/`, {
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


    useEffect(() => {
        const loadUser = async () => {
            console.log("AuthContext: Iniciando loadUser...");
            const access_token = localStorage.getItem('access_token');
            console.log("AuthContext: access_token from localStorage (in loadUser):", access_token ? "Exists" : "Does NOT exist");

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
                                // Esta ya estaba bien, pero la reviso para confirmar.
                                // La ruta /users/me/ está bajo /api/ en el backend (por el router),
                                // así que `${process.env.REACT_APP_API_URL}/users/me/` es correcto.
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
                            // Esta ya estaba bien, pero la reviso para confirmar.
                            // La ruta /users/me/ está bajo /api/ en el backend (por el router),
                            // así que `${process.env.REACT_APP_API_URL}/users/me/` es correcto.
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
    };

    return (
        <AuthContext.Provider value={authContextValue}>
            {children}
        </AuthContext.Provider>
    );
};