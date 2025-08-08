// HomePage.js

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from './AuthContext';
import '../styles/HomePage.css';
import Select from 'react-select';

function HomePage() {
    const [stores, setStores] = useState(null);
    const [selectedStoreSlug, setSelectedStoreSlug] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const navigate = useNavigate();
    const { isAuthenticated, loginUser } = useAuth(); // Assuming useAuth provides a way to know if a user is authenticated

    useEffect(() => {
        const fetchStores = async () => {
            try {
                const response = await axios.get('https://bonito-amor-backend.onrender.com/api/tiendas/');
                setStores(response.data);
                setLoading(false);
            } catch (error) {
                console.error("Error fetching stores:", error);
                setLoading(false);
                setError("No se pudieron cargar las tiendas.");
            }
        };

        fetchStores();
    }, []);

    useEffect(() => {
        // Redirigir si el usuario está autenticado y ya seleccionó una tienda
        if (isAuthenticated && selectedStoreSlug) {
            navigate(`/${selectedStoreSlug}/dashboard`);
        }
    }, [isAuthenticated, selectedStoreSlug, navigate]);

    const handleSelectStore = (selectedOption) => {
        setSelectedStoreSlug(selectedOption.value);
    };

    const handleEnterStore = () => {
        if (selectedStoreSlug) {
            navigate(`/${selectedStoreSlug}/dashboard`);
        }
    };
    
    // Log para depuración
    console.log("HomePage: Estado de stores:", stores);
    console.log("HomePage: isAuthenticated:", isAuthenticated);
    console.log("HomePage: selectedStoreSlug:", selectedStoreSlug);
    console.log("HomePage: loading:", loading);

    if (loading) {
        return <div className="loading-message">Cargando tiendas...</div>;
    }

    // Condición corregida: Verificar si stores es un objeto y si tiene resultados
    const hasStores = stores && stores.results && stores.results.length > 0;

    return (
        <div className="home-container">
            <header className="home-header">
                <h1 className="home-title">TotalStock</h1>
            </header>
            <main className="home-main">
                <div className="store-selection-card">
                    <h2>Selecciona tu tienda</h2>
                    {error && <div className="error-message">{error}</div>}
                    {!hasStores ? (
                        <div className="no-stores-message">
                            No hay tiendas disponibles. Contacta al administrador.
                        </div>
                    ) : (
                        <div className="store-selection-form">
                            <Select
                                options={stores.results.map(store => ({ value: store.nombre, label: store.nombre }))}
                                onChange={handleSelectStore}
                                placeholder="Elige una tienda..."
                                className="store-select"
                                classNamePrefix="store-select"
                            />
                            <button
                                onClick={handleEnterStore}
                                disabled={!selectedStoreSlug}
                                className="enter-button"
                            >
                                Entrar
                            </button>
                        </div>
                    )}
                </div>
                {/* Lógica para mostrar el formulario de login si no está autenticado */}
                {!isAuthenticated && (
                    <div className="login-section">
                        <h2>Iniciar sesión</h2>
                        <form onSubmit={loginUser} className="login-form">
                            <input type="text" name="username" placeholder="Usuario" required />
                            <input type="password" name="password" placeholder="Contraseña" required />
                            <button type="submit" className="login-button">Entrar</button>
                        </form>
                    </div>
                )}
            </main>
        </div>
    );
}

export default HomePage;