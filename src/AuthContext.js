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

    // setAuthToken es una función fundamental, no debe depender de nada
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
    }, []); // No dependencies, it's a pure setter of Axios header and local state

    // logout depende de setAuthToken y navigate
    const logout = useCallback(() => {
        console.log("AuthContext: Ejecutando logout.");
        setUser(null);
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        localStorage.removeItem('selected_store_slug');
        setSelectedStoreSlug(null);
        setAuthToken(null); // Call setAuthToken to clear Axios header
        navigate('/login/bonito-amor'); 
    }, [setAuthToken, navigate]); // Dependencies are stable

    // refreshToken depende de logout y setAuthToken
    const refreshToken = useCallback(async () => {
        const refresh_token = localStorage.getItem('refresh_token');
        console.log("AuthContext: Intentando refrescar token. Refresh token:", refresh_token ? refresh_token.substring(0, 10) + '...' : 'null');
        if (!refresh_token) {
            console.log("No refresh token available. Logging out.");
            logout(); // Call logout if no refresh token
            return null;
        }

        try {
            const response = await axios.post(`${process.env.REACT_APP_API_URL}/api/token/refresh/`, {
                refresh: refresh_token,
            });
            const new_access_token = response.data.access;
            localStorage.setItem('access_token', new_access_token);
            setAuthToken(new_access_token); // Call setAuthToken to update Axios header and local state
            console.log("AuthContext: Token refrescado con éxito.");
            return new_access_token;
        } catch (error) {
            console.error("Error refreshing token:", error.response ? error.response.data : error.message);
            setError(error.response?.data?.detail || "Error al refrescar el token."); 
            logout(); // Call logout on refresh failure
            return null;
        }
    }, [logout, setAuthToken, setError]); // Dependencies are stable

    // selectStore no depende de otras funciones de useCallback
    const selectStore = useCallback((slug) => {
        localStorage.setItem('selected_store_slug', slug);
        setSelectedStoreSlug(slug);
        console.log("AuthContext: Tienda seleccionada:", slug);
    }, []); // No dependencies

    // fetchStores depende de token (a través de axios.defaults.headers.common) y setError
    const fetchStores = useCallback(async () => {
        console.log("AuthContext: fetchStores llamado.");
        try {
            const response = await axios.get(`${process.env.REACT_APP_API_URL}/api/tiendas/`);
            setStores(response.data.results || response.data);
            console.log("AuthContext: Tiendas cargadas con éxito:", response.data.results || response.data);
        } catch (err) {
            console.error("AuthContext: Error fetching stores:", err.response ? err.response.data : err.message);
            if (err.response && err.response.status !== 401) { // Only set error if it's not an expected 401 due to no token
                const errorMessage = err.response?.data?.detail || "Error al cargar tiendas.";
                setError(errorMessage); 
            }
            setStores([]); 
        }
    }, [setError]); // Only setError as a dependency

    // clearError no depende de nada
    const clearError = useCallback(() => {
        setError(null);
    }, []); // No dependencies

    // login depende de setAuthToken, logout, selectStore, fetchStores, setError
    const login = useCallback(async (username, password, storeSlugFromUrl) => { 
        setError(null); 
        console.log("AuthContext: Intentando login para usuario:", username, "Tienda:", storeSlugFromUrl);
        try {
            const payload = { username, password };

            const response = await axios.post(`${process.env.REACT_APP_API_URL}/api/token/`, payload); 

            const { access, refresh } = response.data;

            localStorage.setItem('access_token', access);
            localStorage.setItem('refresh_token', refresh);
            setAuthToken(access); // Set token in Axios and local state

            console.log("AuthContext: Obteniendo detalles de usuario después del login...");
            const userResponse = await axios.get(`${process.env.REACT_APP_API_URL}/api/users/me/`);
            const fetchedUser = userResponse.data;
            setUser(fetchedUser);
            console.log("AuthContext: Detalles de usuario obtenidos:", fetchedUser);

            console.log("AuthContext (Login): Iniciando validación de tienda.");
            console.log("AuthContext (Login): storeSlugFromUrl:", storeSlugFromUrl);
            console.log("AuthContext (Login): fetchedUser.is_superuser:", fetchedUser.is_superuser);
            console.log("AuthContext (Login): fetchedUser.tienda:", fetchedUser.tienda); 

            if (storeSlugFromUrl) {
                if (fetchedUser.tienda && fetchedUser.tienda === storeSlugFromUrl) { 
                    console.log("AuthContext (Login): Tienda del usuario coincide con la solicitada en URL.");
                    selectStore(storeSlugFromUrl);
                } else {
                    console.log(`AuthContext (Login): Acceso denegado. Tienda del usuario: ${fetchedUser.tienda || 'Ninguna'}, Tienda solicitada: ${storeSlugFromUrl}`);
                    setError(`Acceso denegado a la tienda '${storeSlugFromUrl}'. Tu usuario no está asociado a esta tienda.`);
                    logout(); 
                    return false; 
                }
            } else {
                if (fetchedUser.tienda) {
                    console.log("AuthContext (Login): No se especificó tienda en URL, seleccionando tienda por defecto del usuario.");
                    selectStore(fetchedUser.tienda);
                } else {
                    console.log("AuthContext (Login): No hay tienda en la URL ni asignada al usuario. No se selecciona tienda.");
                    setSelectedStoreSlug(null);
                    localStorage.removeItem('selected_store_slug');
                }
            }
            
            await fetchStores(); // Fetch stores after user is logged in and token is set

            return true; 
        } catch (err) {
            console.error("AuthContext: Login fallido:", err.response ? err.response.data : err.message);
            const errorMessage = err.response?.data?.detail || "Error de inicio de sesión. Credenciales inválidas.";
            setError(errorMessage);
            logout(); 
            return false; 
        }
    }, [setAuthToken, logout, selectStore, setError, fetchStores]); 


    // useEffect for initial load and token refresh interval
    useEffect(() => {
        const loadUserAndStores = async () => {
            setLoading(true); 
            console.log("AuthContext: Iniciando loadUserAndStores...");
            let current_access_token = localStorage.getItem('access_token');
            const stored_store_slug = localStorage.getItem('selected_store_slug');

            if (stored_store_slug) {
                setSelectedStoreSlug(stored_store_slug);
            }
            
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
                            return; // Logout handled by refreshToken
                        }
                    }
                    
                    setAuthToken(current_access_token); // Ensure Axios header is set
                    console.log("AuthContext: Token de acceso válido o refrescado. Obteniendo detalles de usuario...");

                    try {
                        const userResponse = await axios.get(`${process.env.REACT_APP_API_URL}/api/users/me/`);
                        const fetchedUser = userResponse.data;
                        setUser(fetchedUser);
                        console.log("AuthContext: Usuario establecido:", fetchedUser);

                        console.log("AuthContext (Load): Iniciando validación de tienda.");
                        console.log("AuthContext (Load): stored_store_slug:", stored_store_slug);
                        console.log("AuthContext (Load): fetchedUser.is_superuser:", fetchedUser.is_superuser);
                        console.log("AuthContext (Load): fetchedUser.tienda:", fetchedUser.tienda); 

                        if (stored_store_slug) {
                            if (fetchedUser.tienda && fetchedUser.tienda === stored_store_slug) { 
                                console.log("AuthContext (Load): Tienda almacenada coincide con la del usuario.");
                                selectStore(stored_store_slug);
                            } else {
                                console.warn(`AuthContext: La tienda previamente seleccionada '${stored_store_slug}' no coincide con la tienda del usuario o el usuario no tiene tienda. Deseleccionando.`);
                                setSelectedStoreSlug(null);
                                localStorage.removeItem('selected_store_slug');
                            }
                        } else if (fetchedUser.tienda) { 
                            console.log("AuthContext (Load): No había tienda seleccionada, seleccionando tienda por defecto del usuario.");
                            selectStore(fetchedUser.tienda);
                        } else {
                            console.log("AuthContext (Load): No hay tienda almacenada ni asignada al usuario. No se selecciona tienda.");
                        }

                        // Call fetchStores ONLY after a user is successfully loaded and token is set
                        await fetchStores();

                    } catch (userError) {
                        console.error("AuthContext: Error al obtener detalles de usuario:", userError.response ? userError.response.data : userError.message);
                        logout(); 
                        setLoading(false);
                        return;
                    }

                } catch (error) {
                    console.error("AuthContext: Error general en loadUserAndStores (decodificación/refresh):", error);
                    logout(); 
                    setLoading(false);
                    return;
                }
            } else {
                console.log("AuthContext: No se encontró token de acceso en localStorage. Usuario no autenticado.");
                setUser(null);
                setStores([]); // Clear stores if no token
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
    }, [refreshToken, logout, setAuthToken, selectStore, fetchStores]); 


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
