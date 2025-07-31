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
            {/* Selector de Tienda: Visible si hay tiendas y NO hay una tienda seleccionada */}
            {stores.length > 0 && !selectedStoreSlug && ( 
                <li className="store-select-item">
                    <select
                        value={selectedStoreSlug || ''}
                        onChange={handleStoreChange}
                        className="store-selector"
                    >
                        <option value="">Selecciona una Tienda</option>
                        {/* Usar store.id como key y store.nombre como valor, ya que el backend devuelve nombre */}
                        {stores.map(store => (
                            <option key={store.id} value={store.nombre}> 
                                {store.nombre}
                            </option>
                        ))}
                    </select>
                </li>
            )}

            {/* Mostrar el nombre de la tienda seleccionada si existe */}
            {selectedStoreSlug && (
                <li className="store-name-display">
                    Tienda: <strong>{selectedStoreSlug}</strong> {/* Mostrar el slug directamente */}
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
    // Muestra una pantalla de carga mientras AuthContext está inicializando
    return <div style={{ padding: '20px', textAlign: 'center' }}>Cargando autenticación...</div>;
  }

  return (
    <>
      <Navbar /> 
      <div className="container" style={{ padding: '20px' }}>
        <Routes>
          {/* Ruta de login, ahora puede recibir un storeSlug opcional */}
          <Route path="/login/:storeSlug?" element={<Login />} />

          {/* Lógica para la ruta raíz ("/") */}
          <Route path="/" element={
            isAuthenticated ? (
              selectedStoreSlug ? (
                // Si está autenticado Y tiene tienda seleccionada, va al Punto de Venta
                <ProtectedRoute staffOnly={true}>
                  <PuntoVenta />
                </ProtectedRoute>
              ) : (
                // Si está autenticado PERO NO tiene tienda seleccionada, va a la HomePage (para seleccionar tienda)
                <HomePage />
              )
            ) : (
              // Si NO está autenticado, siempre redirige a la página de login
              <Navigate to="/login/bonito-amor" replace />
            )
          } />

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

          {/* Si no está autenticado y no está en /login, redirige a /login/bonito-amor */}
          {!isAuthenticated && <Route path="*" element={<Navigate to="/login/bonito-amor" replace />} />}

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
