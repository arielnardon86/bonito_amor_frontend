import React, { useState, useEffect } from 'react';
import { Routes, Route, Link, Navigate, useLocation } from 'react-router-dom';

import Productos from './components/Productos';
import PuntoVenta from './components/PuntoVenta';
import Login from './components/Login';
import RegistroCompras from './components/RegistroCompras'; 
import ProtectedRoute from './components/ProtectedRoute'; 
import { AuthProvider, useAuth } from './AuthContext'; 
import { SalesProvider } from './components/SalesContext'; 
import EtiquetasImpresion from './components/EtiquetasImpresion';
import ReciboImpresion from './components/ReciboImpresion';

import MetricasVentas from './components/MetricasVentas';
import VentasPage from './components/VentasPage';
import HomePage from './components/HomePage'; 

import './App.css';

import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faBars, faTimes } from '@fortawesome/free-solid-svg-icons';

// Componente para la navegación
const Navbar = () => {
  const { isAuthenticated, user, logout, selectedStoreSlug } = useAuth(); 
  const [isOpen, setIsOpen] = useState(false);
  const location = useLocation();

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

  // Si estamos en la página de etiquetas o recibo, no mostramos la barra de navegación
  if (location.pathname === '/etiquetas' || location.pathname === '/recibo') {
    return null;
  }

  return (
    <nav className="navbar">
      <div className="navbar-logo">
        <Link to="/">
          <img src="/total-stock-logo.jpg" alt="Total Stock Logo" className="app-logo-image" />
        </Link>
      </div>

      {isAuthenticated && (
        <>
          <div className="menu-icon" onClick={toggleMenu}>
            <FontAwesomeIcon icon={isOpen ? faTimes : faBars} /> 
          </div>

          <ul className={isOpen ? "nav-links active" : "nav-links"}>
            {selectedStoreSlug && (
                <li className="store-name-display">
                    Tienda: <strong>{selectedStoreSlug}</strong>
                </li>
            )}

            {user && (user.is_staff || user.is_superuser) && ( 
                <li onClick={() => setIsOpen(false)}><Link to="/punto-venta">Punto de Venta</Link></li>
            )}
            
            {user && user.is_superuser && ( 
                <>
                    <li onClick={() => setIsOpen(false)}><Link to="/productos">Gestión de Productos</Link></li>
                    <li onClick={() => setIsOpen(false)}><Link to="/metricas-ventas">Métricas de Ventas</Link></li>
                    <li onClick={() => setIsOpen(false)}><Link to="/ventas">Listado de Ventas</Link></li>
                    <li onClick={() => setIsOpen(false)}><Link to="/registro-compras">Registro de Egresos</Link></li>
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

const AppContent = () => {
  const { isAuthenticated, loading, selectedStoreSlug, user } = useAuth(); 

  if (loading) {
    return <div style={{ padding: '20px', textAlign: 'center' }}>Cargando autenticación...</div>;
  }

  return (
    <>
      <Navbar /> 
      <div className="container" style={{ padding: '20px' }}>
        <Routes>
          <Route path="/login/:storeSlug" element={<Login />} />
          <Route path="/login" element={<Login />} />

          <Route path="/" element={
            isAuthenticated && selectedStoreSlug ? (
              <ProtectedRoute staffOnly={true}>
                <PuntoVenta />
              </ProtectedRoute>
            ) : (
              <HomePage />
            )
          } />

          {isAuthenticated && selectedStoreSlug && (user?.is_staff || user?.is_superuser) && (
            <>
              <Route path="/punto-venta" element={<PuntoVenta />} />
            </>
          )}

          {isAuthenticated && selectedStoreSlug && user?.is_superuser && (
            <>
              <Route path="/productos" element={
                <ProtectedRoute adminOnly={true}>
                  <Productos />
                </ProtectedRoute>
              } />
              <Route path="/metricas-ventas" element={
                <ProtectedRoute adminOnly={true}>
                  <MetricasVentas />
                </ProtectedRoute>
              } />
              <Route path="/ventas" element={
                <ProtectedRoute adminOnly={true}>
                  <VentasPage />
                </ProtectedRoute>
              } />
              <Route path="/registro-compras" element={ 
                <ProtectedRoute adminOnly={true}>
                  <RegistroCompras />
                </ProtectedRoute>
              } />
              <Route path="/etiquetas" element={<EtiquetasImpresion />} />
              <Route path="/recibo" element={<ReciboImpresion />} />
            </>
          )}

          {isAuthenticated && !selectedStoreSlug && (
            <Route path="*" element={<Navigate to="/" replace />} />
          )}

          {(!isAuthenticated || (isAuthenticated && !selectedStoreSlug)) && 
            <Route path="*" element={<Navigate to="/" replace />} />
          }

        </Routes>
      </div>
    </>
  );
};

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