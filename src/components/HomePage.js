// src/components/HomePage.js
import React, { useState, useEffect } from 'react'; // Importa useEffect para la carga de datos
import { useNavigate } from 'react-router-dom';
import axios from 'axios'; // Importa axios para hacer la llamada a la API

const API_BASE_URL = process.env.REACT_APP_API_URL; // Asegúrate de que esta variable de entorno esté configurada

const HomePage = () => {
    const navigate = useNavigate();
    const [stores, setStores] = useState([]); // Estado para almacenar las tiendas cargadas del backend
    const [loadingStores, setLoadingStores] = useState(true); // Estado de carga
    const [error, setError] = useState(null); // Estado para errores
    const [selectedStoreSlug, setSelectedStoreSlug] = useState(''); // Cambiado a slug para la URL

    useEffect(() => {
        const fetchStores = async () => {
            try {
                // Llama al nuevo endpoint de tiendas en tu backend
                const response = await axios.get(`${API_BASE_URL}/tiendas/`);
                setStores(response.data.results || response.data); // Maneja paginación o array directo
                setLoadingStores(false);
            } catch (err) {
                console.error("Error fetching stores:", err.response ? err.response.data : err.message);
                setError("No se pudieron cargar las tiendas. Intenta de nuevo más tarde.");
                setLoadingStores(false);
            }
        };

        fetchStores();
    }, []); // Se ejecuta una sola vez al montar el componente

    const handleStoreSelect = (event) => {
        const slug = event.target.value;
        setSelectedStoreSlug(slug); // Actualiza el estado del select
        if (slug) { // Solo navega si se ha seleccionado una opción válida (no el placeholder)
            // Redirige al login usando el slug de la tienda
            navigate(`/login/${slug}`); 
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

    if (loadingStores) {
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
                    value={selectedStoreSlug}
                >
                    <option value="">-- Seleccionar Tienda --</option>
                    {stores.map((store) => (
                        <option key={store.id} value={store.slug}>
                            {store.nombre}
                        </option>
                    ))}
                </select>
            </div>

            <p style={styles.footerText}>
                Esta configuración permite que cada tienda tenga su propio entorno independiente.
                La lógica de datos para cada tienda se gestionará en el backend.
            </p>
        </div>
    );
};

export default HomePage;
