// BONITO_AMOR/frontend/src/App.js
import React, { useState, useEffect } from 'react';
import { Routes, Route, Link, Navigate } from 'react-router-dom';

import Productos from './components/Productos';
import PuntoVenta from './components/PuntoVenta';
import Login from './components/Login';
import UserManagement from './components/UserManagement';
import ProtectedRoute from './components/ProtectedRoute'; 
import { AuthProvider, useAuth } from './AuthContext'; 
import { SalesProvider } from './components/SalesContext'; 

import MetricasVentas from './components/MetricasVentas';
import VentasPage from './components/VentasPage';
import HomePage from './components/HomePage'; // Importar HomePage

import './App.css';

import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faBars, faTimes } from '@fortawesome/free-solid-svg-icons';

// Componente para la navegación
const Navbar = () => {
  const { isAuthenticated, user, logout, stores, selectedStoreSlug, selectStore } = useAuth(); 
  const [isOpen, setIsOpen] = useState(false);

  const handleLogout = () => {
    logout();
    setIsOpen(false);
  };

  const toggleMenu = () => {
    setIsOpen(!isOpen);
  };

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth > 768 && isOpen) { 
        setIsOpen(false);
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [isOpen]);

  const handleStoreChange = (e) => {
    selectStore(e.target.value);
  };

  return (
    <nav className="navbar">
      <div className="navbar-logo">
        {/* Siempre redirige a la raíz (página de selección de tienda si no logueado, o Punto de Venta si sí) */}
        <Link to="/">
          <img src="/total-stock-logo.jpg" alt="Total Stock Logo" className="app-logo-image" />
        </Link>
      </div>

      {/* La barra de navegación solo muestra enlaces si el usuario está autenticado */}
      {isAuthenticated && (
        <>
          <div className="menu-icon" onClick={toggleMenu}>
            <FontAwesomeIcon icon={isOpen ? faTimes : faBars} /> 
          </div>

          <ul className={isOpen ? "nav-links active" : "nav-links"}>
            {/* Selector de Tienda: Solo visible si hay tiendas, el usuario está autenticado, Y NO HAY UNA TIENDA SELECCIONADA */}
            {stores.length > 0 && !selectedStoreSlug && ( // <-- CAMBIO AQUÍ
                <li className="store-select-item">
                    <select
                        value={selectedStoreSlug || ''}
                        onChange={handleStoreChange}
                        className="store-selector"
                    >
                        <option value="">Selecciona una Tienda</option>
                        {stores.map(store => (
                            <option key={store.slug} value={store.slug}>
                                {store.nombre}
                            </option>
                        ))}
                    </select>
                </li>
            )}

            {/* Mostrar el nombre de la tienda seleccionada si existe */}
            {selectedStoreSlug && (
                <li className="store-name-display">
                    Tienda: <strong>{stores.find(s => s.slug === selectedStoreSlug)?.nombre || selectedStoreSlug.replace(/-/g, ' ').toUpperCase()}</strong>
                </li>
            )}

            {/* Punto de Venta: Accesible para Staff y Superusuarios */}
            {user && (user.is_staff || user.is_superuser) && ( 
                <li onClick={() => setIsOpen(false)}><Link to="/punto-venta">Punto de Venta</Link></li>
            )}
            
            {/* Gestión de Productos, Usuarios, Métricas, Ventas: Solo para Superusuarios */}
            {user && user.is_superuser && ( 
                <>
                    <li onClick={() => setIsOpen(false)}><Link to="/productos">Gestión de Productos</Link></li>
                    <li onClick={() => setIsOpen(false)}><Link to="/users">Gestión de Usuarios</Link></li>
                    <li onClick={() => setIsOpen(false)}><Link to="/metricas-ventas">Métricas de Ventas</Link></li>
                    <li onClick={() => setIsOpen(false)}><Link to="/ventas">Listado de Ventas</Link></li>
                </>
            )}
            
            {user && ( 
                <li>
                    <span className="welcome-message">Bienvenido, {user?.username}!</span>
                    <button onClick={handleLogout}>Cerrar Sesión</button>
                </li>
            )}
          </ul>
        </>
      )}
    </nav>
  );
};

function AppContent() {
  const { isAuthenticated, loading, selectedStoreSlug } = useAuth(); 

  if (loading) {
    return <div style={{ padding: '20px', textAlign: 'center' }}>Cargando autenticación...</div>;
  }

  return (
    <>
      <Navbar /> 
      <div className="container" style={{ padding: '20px' }}>
        <Routes>
          {/* Ruta de login, ahora puede recibir un storeSlug opcional */}
          <Route path="/login/:storeSlug?" element={<Login />} />

          {/* Logic for root path */}
          {isAuthenticated ? (
            selectedStoreSlug ? (
              // If authenticated and store selected, go to PuntoVenta
              <Route path="/" element={
                <ProtectedRoute staffOnly={true}>
                  <PuntoVenta />
                </ProtectedRoute>
              } />
            ) : (
              // If authenticated but no store selected, go to HomePage to select
              <Route path="/" element={<HomePage />} />
            )
          ) : (
            // If not authenticated, go to HomePage (which will lead to login)
            <Route path="/" element={<HomePage />} />
          )}

          {/* Redirigir a la página principal (/) si no está autenticado y no está en /login */}
          {!isAuthenticated && <Route path="*" element={<Navigate to="/" replace />} />}
          
          {/* Rutas Protegidas que requieren autenticación y tienda seleccionada */}
          {isAuthenticated && selectedStoreSlug && (
            <>
              <Route path="/productos" element={
                <ProtectedRoute adminOnly={true}>
                  <Productos />
                </ProtectedRoute>
              } />
              
              <Route
                  path="/users"
                  element={
                      <ProtectedRoute adminOnly={true}>
                          <UserManagement />
                      </ProtectedRoute>
                  }
              />
              
              <Route
                  path="/metricas-ventas"
                  element={
                      <ProtectedRoute adminOnly={true}>
                          <MetricasVentas />
                      </ProtectedRoute>
                  }
              />

              <Route
                  path="/ventas"
                  element={
                      <ProtectedRoute adminOnly={true}>
                          <VentasPage />
                      </ProtectedRoute>
                  }
              />

              {/* Cualquier otra ruta si está autenticado y con tienda, redirige al Punto de Venta */}
              {/* Esto captura rutas no definidas o incorrectas y las lleva al inicio de la app logueada */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </>
          )}

          {/* This block is now redundant due to the root path logic above and catch-all */}
          {/* If está autenticado pero NO tiene tienda seleccionada, y no está en una ruta protegida */}
          {isAuthenticated && !selectedStoreSlug && (
            <Route path="*" element={
              <div style={{ padding: '50px', textAlign: 'center' }}>
                <h2>Por favor, selecciona una tienda en la barra de navegación para continuar.</h2>
              </div>
            } />
          )}
        </Routes>
      </div>
    </>
  );
}

function App() {
  return (
    <AuthProvider>
      <SalesProvider>
        <AppContent />
      </SalesProvider>
    </AuthProvider>
  );
}

export default App;
