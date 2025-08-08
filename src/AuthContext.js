import React, { createContext, useState, useEffect, useContext, useCallback } from 'react';
import axios from 'axios';
import { jwtDecode } from 'jwt-decode';

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
    const [authError, setAuthError] = useState(null);

    const fetchStores = useCallback(async () => {
        try {
            const response = await axios.get(`${BASE_API_ENDPOINT}/api/tiendas/`, {
                headers: {
                    'Content-Type': 'application/json',
                    ...(token && { 'Authorization': `Bearer ${token}` })
                }
            });
            setStores(response.data);
            return response.data;
        } catch (err) {
            console.error('Error fetching stores:', err);
            return [];
        }
    }, [token]);

    const logout = useCallback(() => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        localStorage.removeItem('selectedStoreSlug');
        setToken(null);
        setUser(null);
        setIsAuthenticated(false);
        setSelectedStoreSlug(null);
        setAuthError(null);
        delete axios.defaults.headers.common['Authorization'];
    }, []);

    const login = useCallback(async (username, password, storeSlug) => {
        setLoading(true);
        setAuthError(null);
        try {
            const response = await axios.post(`${BASE_API_ENDPOINT}/api/token/`, { username, password });
            const newToken = response.data.access;
            localStorage.setItem('token', newToken);

            axios.defaults.headers.common['Authorization'] = `Bearer ${newToken}`;

            const decodedUser = jwtDecode(newToken);
            const userStores = await fetchStores();
            
            // Corrige la llamada a .find()
            const selectedStore = userStores.results.find(store => store.nombre.toLowerCase().replace(/\s/g, '-') === storeSlug);
            
            if (!selectedStore) {
                setLoading(false);
                setAuthError("El usuario no tiene acceso a esta tienda.");
                logout();
                return false;
            }

            const userData = {
                id: decodedUser.user_id,
                username: decodedUser.username,
                email: decodedUser.email,
                is_staff: decodedUser.is_staff,
                is_superuser: decodedUser.is_superuser,
            };

            setUser(userData);
            setToken(newToken);
            setIsAuthenticated(true);
            setSelectedStoreSlug(selectedStore.nombre);
            localStorage.setItem('selectedStoreSlug', selectedStore.nombre);

            setLoading(false);
            return true;
        } catch (err) {
            console.error('Error during login:', err.response ? err.response.data : err.message);
            setAuthError('Credenciales incorrectas o error de conexión.');
            setLoading(false);
            logout();
            return false;
        }
    }, [logout, fetchStores]);

    const loadUserInitial = useCallback(async () => {
        if (token) {
            try {
                axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
                const decodedToken = jwtDecode(token);
                const userResponse = await axios.get(`${BASE_API_ENDPOINT}/api/users/${decodedToken.user_id}/`);
                const userData = userResponse.data;
                setUser(userData);
                setIsAuthenticated(true);
            } catch (err) {
                console.error('Error al decodificar token o cargar usuario:', err);
                logout();
            }
        }

        await fetchStores();

        setLoading(false);
    }, [token, logout, fetchStores]);

    const selectStore = useCallback((slug) => {
        const storeExists = stores.some(store => store.nombre === slug);
        if (storeExists) {
            setSelectedStoreSlug(slug);
            localStorage.setItem('selectedStoreSlug', slug);
        } else {
            console.error("Tienda no encontrada en la lista del usuario.");
            setSelectedStoreSlug(null);
            localStorage.removeItem('selectedStoreSlug');
        }
    }, [stores]);

    useEffect(() => {
        loadUserInitial();
    }, [loadUserInitial]);

    const clearError = useCallback(() => {
        setAuthError(null);
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
        fetchStores,
        error: authError,
        clearError
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