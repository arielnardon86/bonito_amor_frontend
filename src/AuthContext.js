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
        setStores([]); 
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

    const fetchStores = useCallback(async () => {
        console.log("AuthContext: fetchStores llamado.");
        try {
            const response = await axios.get(`${process.env.REACT_APP_API_URL}/api/tiendas/`);
            // --- CAMBIO: Log para depuración de la respuesta cruda ---
            console.log("AuthContext: RESPUESTA CRUDA de /api/tiendas/:", response); 
            console.log("AuthContext: Datos de tiendas recibidos:", response.data);

            // Asumiendo que la respuesta puede ser un objeto con 'results' (paginación) o un array directo
            const fetchedStoresData = response.data.results || response.data;
            setStores(fetchedStoresData);
            console.log("AuthContext: Tiendas cargadas con éxito (estado actualizado):", fetchedStoresData);
            return true; 
        } catch (err) {
            console.error("AuthContext: Error fetching stores:", err.response ? err.response.data : err.message);
            setStores([]); 
            return false; 
        }
    }, []); 

    const clearError = useCallback(() => {
        setError(null);
    }, []);

    const login = useCallback(async (username, password, storeSlugFromUrl) => { 
        setError(null); 
        setLoading(true); 
        console.log("AuthContext: Intentando login para usuario:", username, "Tienda:", storeSlugFromUrl);
        try {
            const payload = { username, password };
            const response = await axios.post(`${process.env.REACT_APP_API_URL}/api/token/`, payload); 
            const { access, refresh } = response.data;

            localStorage.setItem('access_token', access);
            localStorage.setItem('refresh_token', refresh);
            setAuthToken(access); 

            console.log("AuthContext: Obteniendo detalles de usuario después del login...");
            const userResponse = await axios.get(`${process.env.REACT_APP_API_URL}/api/users/me/`);
            const fetchedUser = userResponse.data;
            setUser(fetchedUser);
            console.log("AuthContext: Detalles de usuario obtenidos:", fetchedUser);

            // Normalizar ambos valores para la comparación
            const normalizedFetchedUserStoreName = fetchedUser.tienda ? fetchedUser.tienda.toLowerCase().replace(/\s/g, '-') : null;
            const normalizedStoreSlugFromUrl = storeSlugFromUrl ? storeSlugFromUrl.toLowerCase().replace(/\s/g, '-') : null;

            if (storeSlugFromUrl) {
                if (normalizedFetchedUserStoreName && normalizedFetchedUserStoreName === normalizedStoreSlugFromUrl) { 
                    console.log("AuthContext (Login): Tienda del usuario coincide con la solicitada en URL.");
                    selectStore(fetchedUser.tienda); 
                } else {
                    console.log(`AuthContext (Login): Acceso denegado. Tienda del usuario: '${fetchedUser.tienda || 'Ninguna'}', Tienda solicitada en URL: '${storeSlugFromUrl}'`);
                    setError(`Acceso denegado a la tienda '${storeSlugFromUrl}'. Tu usuario no está asociado a esta tienda.`);
                    logout(); 
                    setLoading(false);
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
            
            await fetchStores(); // Cargar tiendas después del login exitoso
            setLoading(false);
            return true; 
        } catch (err) {
            console.error("AuthContext: Login fallido:", err.response ? err.response.data : err.message);
            const errorMessage = err.response?.data?.detail || "Error de inicio de sesión. Credenciales inválidas.";
            setError(errorMessage);
            logout(); 
            setLoading(false);
            return false; 
        }
    }, [setAuthToken, logout, selectStore, setError, fetchStores]); 


    useEffect(() => {
        const loadUserInitial = async () => {
            setLoading(true); 
            console.log("AuthContext: Iniciando loadUserInitial...");
            let current_access_token = localStorage.getItem('access_token');
            const stored_store_slug = localStorage.getItem('selected_store_slug'); 

            if (stored_store_slug) {
                setSelectedStoreSlug(stored_store_slug);
            }
            
            if (current_access_token) {
                try {
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
                        const userResponse = await axios.get(`${process.env.REACT_APP_API_URL}/api/users/me/`);
                        const fetchedUser = userResponse.data;
                        setUser(fetchedUser);
                        console.log("AuthContext: Usuario establecido:", fetchedUser);

                        // Normalizar ambos valores para la comparación
                        const normalizedFetchedUserStoreName = fetchedUser.tienda ? fetchedUser.tienda.toLowerCase().replace(/\s/g, '-') : null;
                        const normalizedStoredStoreSlug = stored_store_slug ? stored_store_slug.toLowerCase().replace(/\s/g, '-') : null;


                        if (stored_store_slug) {
                            if (normalizedFetchedUserStoreName && normalizedFetchedUserStoreName === normalizedStoredStoreSlug) { 
                                console.log("AuthContext (Load): Tienda almacenada coincide con la del usuario.");
                                selectStore(fetchedUser.tienda); 
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

                        await fetchStores(); // Cargar tiendas si hay un token válido

                    } catch (userError) {
                        console.error("AuthContext: Error al obtener detalles de usuario:", userError.response ? userError.response.data : userError.message);
                        logout(); 
                        setLoading(false);
                        return;
                    }

                } catch (error) {
                    console.error("AuthContext: Error general en loadUserInitial (decodificación/refresh):", error);
                    logout(); 
                    setLoading(false);
                    return;
                }
            } else {
                console.log("AuthContext: No se encontró token de acceso en localStorage. Usuario no autenticado.");
                setUser(null);
                // Si no hay token, intentar cargar tiendas de todas formas (sin autenticación)
                // Esto es para la página de login/home donde se necesita la lista de tiendas
                await fetchStores(); 
            }
            
            setLoading(false);
            console.log("AuthContext: loadUserInitial finalizado. Loading es ahora false.");
        };

        loadUserInitial();

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
