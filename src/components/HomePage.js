// src/components/HomePage.js
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const HomePage = () => {
    const navigate = useNavigate();
    const [selectedStorePath, setSelectedStorePath] = useState('');

    // Define las tiendas con sus nombres y URLs internas/rutas.
    // **ACTUALIZADO: Incluye "La Pasion del Hincha Yofre" como ruta interna**
    const stores = [
        { 
            name: 'Bonito Amor', 
            path: '/login', // Redirige a la página de login de Bonito Amor
            description: 'Gestiona tu inventario y ventas para Bonito Amor.',
            icon: '/bonito-amor-logo.jpg' // Asegúrate de que esta imagen exista en tu carpeta public/
        },
        { 
            name: 'La Pasion del Hincha Yofre', 
            path: '/la-pasion-yofre-login', // <--- ¡CAMBIO AQUÍ! Ahora es una ruta interna
            description: 'Todo para los apasionados del fútbol en Yofre.',
            icon: 'https://placehold.co/100x100/FF0000/FFFFFF?text=LPdH' // Placeholder, puedes cambiarlo por un logo real
        },
    ];

    const handleStoreSelect = (event) => {
        const path = event.target.value;
        setSelectedStorePath(path);
        if (path) {
            // Ahora siempre usamos navigate, ya que todas las rutas serán internas
            navigate(path);
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
        footerText: {
            fontSize: '1em',
            color: '#777',
            marginTop: '50px',
            lineHeight: '1.5',
        }
    };

    return (
        <div style={styles.container}>
            <h1 style={styles.header}>Bienvenido a tu Plataforma de Gestión de Tiendas</h1>
            <h2 style={styles.subHeader}>Elige tu tienda:</h2>

            <div style={styles.selectContainer}>
                <select 
                    style={styles.select} 
                    onChange={handleStoreSelect} 
                    value={selectedStorePath}
                >
                    <option value="">-- Seleccionar Tienda --</option>
                    {stores.map((store, index) => (
                        <option key={index} value={store.path}>
                            {store.name}
                        </option>
                    ))}
                </select>
            </div>

            <p style={styles.footerText}>
                Esta configuración permite que cada tienda tenga su propio entorno independiente.
                Si en el futuro deseas que compartan datos o funcionalidades,
                se requeriría una arquitectura de multi-tenancy más compleja en el backend.
            </p>
        </div>
    );
};

export default HomePage;
