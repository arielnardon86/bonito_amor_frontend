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
    const [error, setError] = useState(null); // Added error state
    const [stores, setStores] = useState([]); // Added stores state
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
        navigate('/login/bonito-amor'); // Default redirect to Bonito Amor login
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
            setError(error.response?.data?.detail || "Error al refrescar el token."); // Set error state
            logout();
            return null;
        }
    }, [setAuthToken, logout, setError]);

    // Modified login function to handle authentication API call
    const login = useCallback(async (username, password, storeSlugFromUrl) => { // Added storeSlugFromUrl
        setError(null); // Clear previous errors
        try {
            const response = await axios.post(`${process.env.REACT_APP_API_URL}/token/`, {
                username,
                password,
            });
            const { access, refresh } = response.data;

            localStorage.setItem('access_token', access);
            localStorage.setItem('refresh_token', refresh);
            setAuthToken(access);

            // Fetch user details immediately after successful login
            const userResponse = await axios.get(`${process.env.REACT_APP_API_URL}/users/me/`);
            setUser(userResponse.data);

            // --- CORRECCIÓN CLAVE AQUÍ: Simplificar la lógica de selección de tienda en login ---
            // Si storeSlugFromUrl está presente, úsalo.
            // De lo contrario, no intentes seleccionar una tienda por defecto aquí.
            // La lógica de redirección a HomePage para selección de tienda se manejará en AppContent.
            if (storeSlugFromUrl) {
                selectStore(storeSlugFromUrl);
            } else {
                // Si no se proporcionó un storeSlug y no hay uno seleccionado,
                // asegúrate de que selectedStoreSlug sea null para que HomePage lo maneje.
                setSelectedStoreSlug(null);
                localStorage.removeItem('selected_store_slug');
            }
            // --- FIN CORRECCIÓN ---

            return true; // Indicate success
        } catch (err) {
            console.error("Login failed:", err.response ? err.response.data : err.message);
            const errorMessage = err.response?.data?.detail || "Error de inicio de sesión. Credenciales inválidas.";
            setError(errorMessage);
            logout(); // Logout on failed login attempt
            return false; // Indicate failure
        }
    }, [setAuthToken, logout, selectStore, setError]); // Removed 'stores' from dependencies as it's not directly used here for selection

    // Function to fetch stores
    const fetchStores = useCallback(async () => {
        try {
            const response = await axios.get(`${process.env.REACT_APP_API_URL}/tiendas/`);
            setStores(response.data.results || response.data);
        } catch (err) {
            console.error("Error fetching stores:", err.response ? err.response.data : err.message);
            setError("Error al cargar tiendas."); // Set error state
            setStores([]); // Ensure stores is always an array, even on error
        }
    }, [setError]);

    // Function to set the selected store
    const selectStore = useCallback((slug) => {
        localStorage.setItem('selected_store_slug', slug);
        setSelectedStoreSlug(slug);
        console.log("Tienda seleccionada:", slug);
    }, []);

    const clearError = useCallback(() => {
        setError(null);
    }, []);

    useEffect(() => {
        const loadUserAndStores = async () => {
            console.log("AuthContext: Iniciando loadUserAndStores...");
            const access_token = localStorage.getItem('access_token');
            const stored_store_slug = localStorage.getItem('selected_store_slug');

            // Fetch stores first. This is crucial for the Navbar and initial store selection logic.
            await fetchStores(); 

            if (stored_store_slug) {
                setSelectedStoreSlug(stored_store_slug);
            } else if (stores.length === 1) { // If only one store is available and no store is selected
                // This block is executed AFTER fetchStores has completed.
                // It ensures that if there's only one store, it's automatically selected.
                setSelectedStoreSlug(stores[0].slug);
                localStorage.setItem('selected_store_slug', stores[0].slug);
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
    }, [refreshToken, logout, setAuthToken, fetchStores, stores.length]); // Added stores.length to dependencies for the single store auto-selection logic


    const authContextValue = {
        user,
        isAuthenticated: !!user,
        login,
        logout,
        loading,
        token,
        error, // Expose error
        clearError, // Expose clearError
        stores, // Expose stores
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
