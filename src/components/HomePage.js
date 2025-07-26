// BONITO_AMOR/frontend/src/components/HomePage.js
import React, { useState, useEffect } from 'react'; 
import { useNavigate } from 'react-router-dom';
// axios ya no se necesita directamente para fetchStores aquí
import { useAuth } from '../AuthContext'; // Importar useAuth para el estado de autenticación y tiendas

const HomePage = () => {
    const navigate = useNavigate();
    // Obtener la lista de tiendas, la tienda seleccionada, la función para seleccionarla,
    // y el estado de autenticación/carga del AuthContext
    const { 
        stores, // Usar directamente las tiendas del AuthContext
        selectedStoreSlug: authSelectedStoreSlug, 
        selectStore, 
        isAuthenticated, 
        loading: authLoading,
        error: authError // También podemos usar el error del AuthContext
    } = useAuth();

    // Estado local para el valor del selector de tienda
    const [selectedStoreSlugLocal, setSelectedStoreSlugLocal] = useState(''); 
    
    // Sincronizar el estado local del selector con el del contexto
    useEffect(() => {
        if (authSelectedStoreSlug) {
            setSelectedStoreSlugLocal(authSelectedStoreSlug);
        }
    }, [authSelectedStoreSlug]);

    // Efecto para redirigir si el usuario ya está autenticado y tiene una tienda seleccionada
    useEffect(() => {
        // Si el AuthContext ya terminó de cargar, está autenticado y ya tiene una tienda seleccionada
        if (!authLoading && isAuthenticated && authSelectedStoreSlug) {
            navigate('/'); // Redirige a la página principal (Punto de Venta)
        }
    }, [isAuthenticated, authSelectedStoreSlug, authLoading, navigate]);

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

    // Si el AuthContext está cargando, muestra mensaje de carga
    if (authLoading) {
        return (
            <div style={styles.container}>
                <p style={styles.loadingMessage}>Cargando tiendas y estado de autenticación...</p>
            </div>
        );
    }

    // Si hay un error en el AuthContext (ej. al cargar tiendas), lo mostramos
    if (authError) {
        return (
            <div style={styles.container}>
                <p style={styles.errorMessage}>Error: {authError}</p>
            </div>
        );
    }

    return (
        <div style={styles.container}>
            <h1 style={styles.header}>Bienvenido a Total Stock</h1>
            <h2 style={styles.subHeader}>Elige tu tienda:</h2>

            <div style={styles.selectContainer}>
                <select 
                    style={styles.select} 
                    onChange={handleStoreSelect} 
                    value={selectedStoreSlugLocal} 
                >
                    <option value="">-- Seleccionar Tienda --</option>
                    {stores.map((store) => ( // Usar directamente 'stores' del AuthContext
                        <option key={store.id} value={store.nombre}> {/* Usar store.nombre como slug */}
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
