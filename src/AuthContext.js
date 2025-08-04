// BONITO_AMOR/frontend/src/AuthContext.js
import React, { createContext, useState, useEffect, useContext, useCallback } from 'react';
import axios from 'axios';
import { jwtDecode } from 'jwt-decode'; // Importar jwtDecode

const AuthContext = createContext(null);

const API_BASE_URL = process.env.REACT_APP_API_URL;

const normalizeApiUrl = (url) => {
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

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [token, setToken] = useState(localStorage.getItem('token'));
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [loading, setLoading] = useState(true);
    const [stores, setStores] = useState([]);
    const [selectedStoreSlug, setSelectedStoreSlug] = useState(localStorage.getItem('selectedStoreSlug'));
    const [authError, setAuthError] = useState(null); // Estado para errores de autenticación

    // Función para obtener las tiendas
    const fetchStores = useCallback(async () => {
        try {
            const response = await axios.get(`${BASE_API_ENDPOINT}/api/tiendas/`);
            setStores(response.data.results || response.data);
        } catch (error) {
            console.error('AuthContext: Error fetching stores:', error.response ? error.response.data : error.message);
            // Si el error es 401, significa que no hay credenciales, lo cual es esperado si la ruta es pública
            // No es necesario establecer un estado de error global aquí, ya que la app puede funcionar sin tiendas cargadas inicialmente si el usuario no está logueado
        }
    }, []);

    // Función para limpiar errores de autenticación
    const clearError = useCallback(() => {
        setAuthError(null);
    }, []);

    // Cargar usuario y token al inicio
    const loadUserInitial = useCallback(async () => {
        setLoading(true);
        const storedToken = localStorage.getItem('token');
        if (storedToken) {
            try {
                const decodedUser = jwtDecode(storedToken);
                setUser(decodedUser);
                setToken(storedToken);
                setIsAuthenticated(true);

                // Si el token tiene una tienda asociada, la seleccionamos por defecto
                if (decodedUser.tienda_nombre) {
                    setSelectedStoreSlug(decodedUser.tienda_nombre);
                    localStorage.setItem('selectedStoreSlug', decodedUser.tienda_nombre);
                } else {
                    setSelectedStoreSlug(null);
                    localStorage.removeItem('selectedStoreSlug');
                }

                // Configurar el token para todas las peticiones de Axios
                axios.defaults.headers.common['Authorization'] = `Bearer ${storedToken}`;
            } catch (error) {
                console.error('Error decodificando el token o token inválido:', error);
                logout(); // Limpiar token inválido
            }
        } else {
            setIsAuthenticated(false);
            setUser(null);
            setToken(null);
            delete axios.defaults.headers.common['Authorization'];
        }
        
        // Siempre intentar cargar las tiendas, ya que ahora pueden ser públicas
        await fetchStores();

        setLoading(false);
        console.log('AuthContext: loadUserInitial finalizado. Loading es ahora false.');
    }, [fetchStores, logout]); // Añadir logout a las dependencias

    // Efecto para cargar el usuario y las tiendas al montar el componente
    useEffect(() => {
        loadUserInitial();
    }, [loadUserInitial]);

    // Función de login
    const login = async (username, password) => {
        setAuthError(null); // Limpiar errores antes de intentar login
        try {
            const response = await axios.post(`${BASE_API_ENDPOINT}/api/token/`, { username, password });
            const newToken = response.data.access;
            localStorage.setItem('token', newToken);
            setToken(newToken);
            const decodedUser = jwtDecode(newToken);
            setUser(decodedUser);
            setIsAuthenticated(true);
            axios.defaults.headers.common['Authorization'] = `Bearer ${newToken}`;

            // Si el token tiene una tienda asociada, la seleccionamos
            if (decodedUser.tienda_nombre) {
                setSelectedStoreSlug(decodedUser.tienda_nombre);
                localStorage.setItem('selectedStoreSlug', decodedUser.tienda_nombre);
            } else {
                setSelectedStoreSlug(null);
                localStorage.removeItem('selectedStoreSlug');
            }

            // Recargar tiendas después del login, por si hay permisos diferentes
            await fetchStores();
            return true;
        } catch (error) {
            console.error('Error en el login:', error.response ? error.response.data : error.message);
            // Manejo de errores específicos del login
            if (error.response && error.response.status === 401) {
                setAuthError('Credenciales inválidas. Inténtalo de nuevo.');
                throw new Error('Credenciales inválidas. Inténtalo de nuevo.');
            } else {
                setAuthError('Error al intentar iniciar sesión. Por favor, inténtalo de nuevo más tarde.');
                throw new Error('Error al intentar iniciar sesión. Por favor, inténtalo de nuevo más tarde.');
            }
        }
    };

    // Función de logout
    const logout = useCallback(() => {
        localStorage.removeItem('token');
        localStorage.removeItem('selectedStoreSlug');
        setToken(null);
        setUser(null);
        setIsAuthenticated(false);
        setSelectedStoreSlug(null);
        delete axios.defaults.headers.common['Authorization'];
        setAuthError(null); // Limpiar errores al hacer logout
        // Recargar tiendas después del logout, por si hay permisos diferentes
        fetchStores();
    }, [fetchStores]);

    // Función para seleccionar tienda
    const selectStore = useCallback((slug) => {
        setSelectedStoreSlug(slug);
        localStorage.setItem('selectedStoreSlug', slug);
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
        fetchStores, // Exponer fetchStores para recargar manualmente si es necesario
        error: authError, // Exponer el estado de error
        clearError // Exponer la función para limpiar errores
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
