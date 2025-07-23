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

import './App.css';

import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faBars, faTimes } from '@fortawesome/free-solid-svg-icons';

// Componente para la navegación
const Navbar = () => {
  const { isAuthenticated, user, logout, stores, selectedStoreSlug, selectStore } = useAuth(); // Obtener stores y selectStore
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
        <Link to="/">
          <img src="/bonito-amor-logo.jpg" alt="Bonito Amor Logo" className="app-logo-image" />
        </Link>
      </div>

      {isAuthenticated && (
        <>
          <div className="menu-icon" onClick={toggleMenu}>
            <FontAwesomeIcon icon={isOpen ? faTimes : faBars} /> 
          </div>

          <ul className={isOpen ? "nav-links active" : "nav-links"}>
            {/* Selector de Tienda */}
            {stores.length > 0 && (
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

            {/* Punto de Venta: Accesible para Staff y Superusuarios */}
            {user && (user.is_staff || user.is_superuser) && ( 
                <li onClick={() => setIsOpen(false)}><Link to="/">Punto de Venta</Link></li>
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
          <Route path="/login" element={<Login />} />

          {!isAuthenticated && <Route path="*" element={<Navigate to="/login" replace />} />}

          {isAuthenticated && (
            <>
              {/* Si está autenticado pero no ha seleccionado tienda, redirigir a una página de selección o mostrar mensaje */}
              {!selectedStoreSlug && (
                <Route path="*" element={
                  <div style={{ padding: '50px', textAlign: 'center' }}>
                    <h2>Por favor, selecciona una tienda en la barra de navegación para continuar.</h2>
                  </div>
                } />
              )}

              {/* Rutas Protegidas: Solo se renderizan si el usuario está autenticado Y ha seleccionado una tienda */}
              {selectedStoreSlug && (
                <>
                  <Route path="/" element={
                    <ProtectedRoute staffOnly={true}>
                      <PuntoVenta />
                    </ProtectedRoute>
                  } />

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

                  <Route path="*" element={<Navigate to="/" replace />} />
                </>
              )}
            </>
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
