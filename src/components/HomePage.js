// BONITO_AMOR/frontend/src/components/HomePage.js
import React, { useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom'; 
import { useAuth } from '../AuthContext';

const HomePage = () => {
    const { isAuthenticated, selectedStoreSlug, stores, selectStore, loading } = useAuth();
    const navigate = useNavigate();

    // --- CAMBIO: Log para depuración ---
    console.log("HomePage: Estado de stores:", stores);
    console.log("HomePage: isAuthenticated:", isAuthenticated);
    console.log("HomePage: selectedStoreSlug:", selectedStoreSlug);
    console.log("HomePage: loading:", loading);

    // Redirigir si ya está autenticado y tiene una tienda seleccionada
    useEffect(() => {
        if (!loading && isAuthenticated && selectedStoreSlug) {
            navigate('/punto-venta', { replace: true });
        }
    }, [loading, isAuthenticated, selectedStoreSlug, navigate]);

    const handleStoreChange = (e) => {
        const selectedName = e.target.value;
        if (selectedName) {
            // Redirige al login con el nombre de la tienda como parámetro (que luego se slugifica)
            navigate(`/login/${selectedName.toLowerCase().replace(/\s/g, '-')}`); 
        }
    };

    if (loading) {
        return <div style={styles.loadingMessage}>Cargando datos de la aplicación...</div>;
    }

    if (isAuthenticated && !selectedStoreSlug) {
        // Usuario autenticado pero sin tienda seleccionada: Mostrar selector de tienda
        return (
            <div style={styles.container}>
                <h1 style={styles.title}>Bienvenido a Total Stock</h1>
                <p style={styles.subtitle}>Por favor, selecciona tu tienda para continuar.</p>
                {stores.length > 0 ? (
                    <div style={styles.selectorContainer}>
                        <label htmlFor="store-select" style={styles.label}>Selecciona una Tienda:</label>
                        <select
                            id="store-select"
                            value={selectedStoreSlug || ''}
                            onChange={handleStoreChange}
                            style={styles.select}
                        >
                            <option value="">-- Elige una tienda --</option>
                            {stores.map(store => (
                                <option key={store.id} value={store.nombre}>
                                    {store.nombre}
                                </option>
                            ))}
                        </select>
                    </div>
                ) : (
                    <p style={styles.noStoresMessage}>No hay tiendas disponibles. Contacta al administrador.</p>
                )}
            </div>
        );
    }

    // Si no está autenticado, o si ya está autenticado y tiene tienda (redirigido por useEffect)
    // o si está autenticado pero no hay tiendas disponibles, mostrar mensaje de bienvenida
    return (
        <div style={styles.container}>
            <h1 style={styles.title}>Bienvenido a Total Stock</h1>
            <p style={styles.subtitle}>Gestiona tu inventario y ventas de forma eficiente.</p>
            {!isAuthenticated && (
                <p style={styles.callToAction}>
                    Por favor, <Link to="/login/bonito-amor" style={styles.link}>inicia sesión</Link> para continuar.
                </p>
            )}
        </div>
    );
};

const styles = {
    container: {
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: 'calc(100vh - 80px)', 
        padding: '20px',
        textAlign: 'center',
        backgroundColor: '#f8f9fa',
        color: '#333',
        fontFamily: 'Inter, sans-serif',
    },
    title: {
        fontSize: '2.8em',
        color: '#007bff',
        marginBottom: '15px',
        fontWeight: 'bold',
    },
    subtitle: {
        fontSize: '1.4em',
        color: '#555',
        marginBottom: '30px',
        maxWidth: '600px',
    },
    callToAction: {
        fontSize: '1.2em',
        color: '#666',
    },
    link: {
        color: '#007bff',
        textDecoration: 'none',
        fontWeight: 'bold',
        '&:hover': {
            textDecoration: 'underline',
        },
    },
    loadingMessage: {
        padding: '50px',
        textAlign: 'center',
        fontSize: '1.2em',
        color: '#777',
    },
    selectorContainer: {
        backgroundColor: '#ffffff',
        padding: '30px',
        borderRadius: '10px',
        boxShadow: '0 4px 15px rgba(0,0,0,0.1)',
        display: 'flex',
        flexDirection: 'column',
        gap: '20px',
        minWidth: '300px',
    },
    label: {
        fontSize: '1.1em',
        fontWeight: 'bold',
        color: '#333',
    },
    select: {
        padding: '12px 15px',
        fontSize: '1em',
        borderRadius: '6px',
        border: '1px solid #ccc',
        backgroundColor: '#fefefe',
        width: '100%',
        cursor: 'pointer',
        transition: 'border-color 0.3s ease',
        '&:focus': {
            borderColor: '#007bff',
            outline: 'none',
        },
    },
    noStoresMessage: {
        color: '#dc3545',
        fontSize: '1.1em',
        fontWeight: 'bold',
    },
};

export default HomePage;
