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
import HomePage from './components/HomePage'; 

import MetricasVentas from './components/MetricasVentas';
import VentasPage from './components/VentasPage';

import './App.css';

import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faBars, faTimes } from '@fortawesome/free-solid-svg-icons';

// Componente para la navegación
const Navbar = () => {
  const { isAuthenticated, user, logout } = useAuth();
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
            <li onClick={() => setIsOpen(false)}><Link to="/">Inicio</Link></li>

            {user && (user.is_staff || user.is_superuser) && ( 
                <li onClick={() => setIsOpen(false)}><Link to="/punto-venta">Punto de Venta</Link></li>
            )}
            
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
  const { isAuthenticated, loading } = useAuth(); 

  if (loading) {
    return <div style={{ padding: '20px', textAlign: 'center' }}>Cargando autenticación...</div>;
  }

  return (
    <>
      <Navbar /> 
      <div className="container" style={{ padding: '20px' }}>
        <Routes>
          {/* HomePage es siempre accesible */}
          <Route path="/" element={<HomePage />} />

          {/* Ruta de Login dinámica con storeSlug */}
          <Route path="/login/:storeSlug" element={<Login />} /> {/* <--- ¡CAMBIO CLAVE AQUÍ! */}

          {isAuthenticated ? (
            <>
              {/* Rutas protegidas existentes */}
              <Route path="/punto-venta" element={
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

              {/* Redirige a la página principal si está autenticado y la ruta no existe */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </>
          ) : (
            /* Si no está autenticado, cualquier ruta diferente a '/' o '/login/:storeSlug' redirige al login */
            <Route path="*" element={<Navigate to="/login/bonito-amor" replace />} /> 
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
