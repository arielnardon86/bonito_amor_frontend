// BONITO_AMOR/frontend/src/components/HomePage.js
import React from 'react';
import { useAuth } from '../AuthContext';
import { Link } from 'react-router-dom';

const HomePage = () => {
    const { isAuthenticated, user, stores, selectStore, selectedStoreSlug } = useAuth();

    const handleStoreSelection = (event) => {
        selectStore(event.target.value);
    };

    return (
        <div className="home-page-container">
            {/* Logo principal de la aplicación */}
            <div className="main-logo-section">
                <img 
                    src='/total-stock-logo.png' // Ruta a tu logo principal
                    alt="Logo Principal" 
                    className="main-app-logo" 
                    style={{ maxWidth: '300px', height: 'auto', marginBottom: '30px' }} // Estilos básicos
                />
                <h1>Bienvenido a Total Stock</h1>
            </div>

            {!isAuthenticated ? (
                <div className="auth-section">
                    <p>Por favor, inicia sesión para acceder a las funcionalidades.</p>
                    <Link to="/login" className="btn btn-primary">Iniciar Sesión</Link>
                </div>
            ) : (
                <>
                    {/* Si el usuario está autenticado pero no ha seleccionado una tienda */}
                    {!selectedStoreSlug && stores.length > 0 && (
                        <div className="store-selection-section">
                            <h2>Selecciona una Tienda para Continuar</h2>
                            <select onChange={handleStoreSelection} value="">
                                <option value="" disabled>Elige una tienda...</option>
                                {stores.map(store => (
                                    <option key={store.slug} value={store.slug}>
                                        {store.nombre}
                                    </option>
                                ))}
                            </select>
                        </div>
                    )}

                    {/* Si el usuario está autenticado y ya tiene una tienda seleccionada */}
                    {selectedStoreSlug && (
                        <div className="welcome-section">
                            <h2>¡Hola, {user?.username}!</h2>
                            <p>Has seleccionado la tienda: <strong>{stores.find(s => s.slug === selectedStoreSlug)?.nombre}</strong></p>
                            <p>Usa la barra de navegación para acceder a las diferentes secciones.</p>
                        </div>
                    )}

                    {/* Si el usuario está autenticado pero no hay tiendas disponibles (caso raro) */}
                    {isAuthenticated && stores.length === 0 && !selectedStoreSlug && (
                        <div className="no-stores-message">
                            <p>No hay tiendas disponibles para seleccionar. Por favor, contacta al administrador.</p>
                        </div>
                    )}
                </>
            )}
        </div>
    );
};

export default HomePage;
