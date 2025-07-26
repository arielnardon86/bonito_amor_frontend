// BONITO_AMOR/frontend/src/components/HomePage.js
import React, { useState, useEffect } from 'react'; 
import { useNavigate } from 'react-router-dom';
import axios from 'axios'; 
import { useAuth } from '../AuthContext'; // Importar useAuth para el estado de autenticación

const API_BASE_URL = process.env.REACT_APP_API_URL; 

const HomePage = () => {
    const navigate = useNavigate();
    // Obtener la lista de tiendas, la tienda seleccionada, la función para seleccionarla,
    // y el estado de autenticación/carga del AuthContext
    const { stores: authStores, selectedStoreSlug: authSelectedStoreSlug, selectStore, isAuthenticated, loading: authLoading } = useAuth();

    // Usamos estados locales para las tiendas y la carga inicial de la API,
    // aunque 'authStores' y 'authSelectedStoreSlug' del contexto son la fuente de verdad.
    // Esto es para manejar la carga inicial de las tiendas antes de que el AuthContext se inicialice completamente.
    const [localStores, setLocalStores] = useState([]); 
    const [loadingLocalStores, setLoadingLocalStores] = useState(true); 
    const [error, setError] = useState(null); 
    
    // Estado local para el valor del selector de tienda
    const [selectedStoreSlugLocal, setSelectedStoreSlugLocal] = useState(''); 

    // Efecto para cargar las tiendas desde la API (solo si el AuthContext aún no las ha cargado)
    useEffect(() => {
        const fetchStores = async () => {
            // Si el AuthContext ya tiene tiendas, las usamos y no volvemos a cargar
            if (authStores && authStores.length > 0) {
                setLocalStores(authStores);
                setLoadingLocalStores(false);
                return;
            }

            try {
                const response = await axios.get(`${API_BASE_URL}/tiendas/`);
                const fetchedStores = response.data.results || response.data;
                setLocalStores(fetchedStores); 
                setLoadingLocalStores(false);
                setError(null);
            } catch (err) {
                console.error("Error fetching stores:", err.response ? err.response.data : err.message);
                setError("No se pudieron cargar las tiendas. Intenta de nuevo más tarde.");
                setLoadingLocalStores(false);
            }
        };

        // Solo carga si no estamos en medio de la carga de autenticación
        // y si las tiendas no han sido cargadas ya por el AuthContext
        if (!authLoading && (!authStores || authStores.length === 0)) {
            fetchStores();
        } else if (!authLoading && authStores && authStores.length > 0) {
            // Si el AuthContext ya las cargó, las usamos
            setLocalStores(authStores);
            setLoadingLocalStores(false);
        }
    }, [authLoading, authStores]); // Depende de authLoading y authStores

    // Efecto para redirigir si el usuario ya está autenticado y tiene una tienda seleccionada
    useEffect(() => {
        // Si el AuthContext ya terminó de cargar, está autenticado y ya tiene una tienda seleccionada
        if (!authLoading && isAuthenticated && authSelectedStoreSlug) {
            navigate('/'); // Redirige a la página principal (Punto de Venta)
        }
    }, [isAuthenticated, authSelectedStoreSlug, authLoading, navigate]);

    // Sincronizar el estado local del selector con el del contexto
    useEffect(() => {
        if (authSelectedStoreSlug) {
            setSelectedStoreSlugLocal(authSelectedStoreSlug);
        }
    }, [authSelectedStoreSlug]);


    const handleStoreSelect = (event) => {
        const slug = event.target.value;
        setSelectedStoreSlugLocal(slug); // Actualiza el estado local del select
        selectStore(slug); // Actualiza la tienda seleccionada en el AuthContext y localStorage
        if (slug) { 
            navigate(`/login/${slug}`); // Redirige al login con el slug de la tienda
        }
    };

    const styles = {
        container: {
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: 'calc(100vh - 60px)',
            backgroundColor: '#f0f2f5',
            fontFamily: 'Arial, sans-serif',
            padding: '20px',
            textAlign: 'center',
        },
        header: {
            fontSize: '2.8em',
            color: '#333',
            marginBottom: '20px',
            fontWeight: 'bold',
        },
        subHeader: {
            fontSize: '1.5em',
            color: '#555',
            marginBottom: '40px',
        },
        selectContainer: {
            marginBottom: '40px',
            width: '100%',
            maxWidth: '300px',
        },
        select: {
            width: '100%',
            padding: '10px 15px',
            fontSize: '1.2em',
            borderRadius: '8px',
            border: '1px solid #ccc',
            boxShadow: '0 2px 5px rgba(0,0,0,0.1)',
            appearance: 'none',
            background: 'white url("data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22292.4%22%20height%3D%22292.4%22%3E%3Cpath%20fill%3D%22%23007bff%22%20d%3D%22M287%2069.4a17.6%2017.6%200%200%200-13-5.4H18.4c-6.5%200-12.9%202.8-17.6%208.6L144.7%20227.3c4.7%205.8%2011.1%208.6%2017.6%208.6s12.9-2.8%2017.6-8.6L287%2069.4z%22%2F%3E%3C%2Fsvg%3E") no-repeat right 10px center',
            backgroundSize: '12px',
            cursor: 'pointer',
        },
        loadingMessage: {
            fontSize: '1.2em',
            color: '#555',
        },
        errorMessage: {
            fontSize: '1.2em',
            color: 'red',
        },
        footerText: {
            fontSize: '1em',
            color: '#777',
            marginTop: '50px',
            lineHeight: '1.5',
        }
    };

    // Si el AuthContext está cargando, o si las tiendas locales están cargando, muestra mensaje de carga
    if (authLoading || loadingLocalStores) {
        return (
            <div style={styles.container}>
                <p style={styles.loadingMessage}>Cargando tiendas...</p>
            </div>
        );
    }

    if (error) {
        return (
            <div style={styles.container}>
                <p style={styles.errorMessage}>{error}</p>
            </div>
        );
    }

    return (
        <div style={styles.container}>
            <h1 style={styles.header}>Bienvenido a tu Plataforma de Gestión de Tiendas</h1>
            <h2 style={styles.subHeader}>Elige tu tienda:</h2>

            <div style={styles.selectContainer}>
                <select 
                    style={styles.select} 
                    onChange={handleStoreSelect} 
                    value={selectedStoreSlugLocal} // Usar el estado local para el valor del select
                >
                    <option value="">-- Seleccionar Tienda --</option>
                    {localStores.map((store) => (
                        <option key={store.id} value={store.slug}>
                            {store.nombre}
                        </option>
                    ))}
                </select>
            </div>

            <p style={styles.footerText}>
                
            </p>
        </div>
    );
};

export default HomePage;
