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
    <nav style={navbarStyles.navbar}>
      <div style={navbarStyles.navbarLogo}>
        <Link to="/">
          <img src="/total-stock-logo.jpg" alt="Total Stock Logo" style={navbarStyles.appLogoImage} />
        </Link>
      </div>

      {isAuthenticated && (
        <>
          <div onClick={toggleMenu} style={navbarStyles.menuIcon}>
            <FontAwesomeIcon icon={isOpen ? faTimes : faBars} style={navbarStyles.menuIconSvg} /> 
          </div>

          <ul style={isOpen ? { ...navbarStyles.navLinks, ...navbarStyles.navLinksActive } : navbarStyles.navLinks}>
            {selectedStoreSlug && (
                <li style={navbarStyles.storeNameDisplay}>
                    Tienda: <strong>{selectedStoreSlug}</strong>
                </li>
            )}

            {user && (user.is_staff || user.is_superuser) && ( 
                <li onClick={() => setIsOpen(false)} style={navbarStyles.navLinksLi}><Link to="/punto-venta" style={navbarStyles.navLinksLiA}>Punto de Venta</Link></li>
            )}
            
            {user && user.is_superuser && ( 
                <>
                    <li onClick={() => setIsOpen(false)} style={navbarStyles.navLinksLi}><Link to="/productos" style={navbarStyles.navLinksLiA}>Gestión de Productos</Link></li>
                    <li onClick={() => setIsOpen(false)} style={navbarStyles.navLinksLi}><Link to="/metricas-ventas" style={navbarStyles.navLinksLiA}>Métricas de Ventas</Link></li>
                    <li onClick={() => setIsOpen(false)} style={navbarStyles.navLinksLi}><Link to="/ventas" style={navbarStyles.navLinksLiA}>Listado de Ventas</Link></li>
                    <li onClick={() => setIsOpen(false)} style={navbarStyles.navLinksLi}><Link to="/registro-compras" style={navbarStyles.navLinksLiA}>Registro de Egresos</Link></li>
                </>
            )}
            
            {user && ( 
                <li style={navbarStyles.navLinksLi}>
                    <span style={navbarStyles.welcomeMessage}>Bienvenido, {user?.username}!</span>
                    <button onClick={handleLogout} style={navbarStyles.logoutButton}>Cerrar Sesión</button>
                </li>
            )}
          </ul>
        </>
      )}
    </nav>
  );
};

const navbarStyles = {
    navbar: {
        backgroundColor: '#f8f8f8',
        padding: '1rem 20px',
        boxShadow: '0 2px 5px rgba(0,0,0,0.2)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        position: 'relative',
        zIndex: 1000,
    },
    appLogoImage: {
        height: '50px',
        maxWidth: '180px',
        display: 'block',
    },
    navLinks: {
        listStyle: 'none',
        padding: '0',
        margin: '0',
        display: 'flex',
        justifyContent: 'flex-end',
        alignItems: 'center',
        transition: 'all 0.3s ease-out',
    },
    navLinksActive: {
      '@media (max-width: 768px)': {
        flexDirection: 'column',
        width: '100%',
        position: 'absolute',
        top: '100%',
        left: 0,
        backgroundColor: '#f8f8f8',
        borderTop: '1px solid #ccc',
        padding: '1rem 0',
        transform: 'translateY(0)',
        opacity: 1,
        pointerEvents: 'all',
        transition: 'transform 0.3s ease-out, opacity 0.3s ease-out',
        display: 'flex',
      }
    },
    navLinksLi: {
        margin: '0 15px',
        '@media (max-width: 768px)': {
            margin: '0',
            width: '100%',
            textAlign: 'center',
        }
    },
    navLinksLiA: {
        color: '#333',
        textDecoration: 'none',
        fontWeight: 'bold',
        fontSize: '1.05em',
        transition: 'color 0.3s ease',
        padding: '8px 0',
        '@media (max-width: 768px)': {
            display: 'block',
            padding: '15px',
        }
    },
    welcomeMessage: {
        marginRight: '15px',
        color: '#333',
        fontWeight: 'normal',
        '@media (max-width: 768px)': {
            display: 'block',
            marginBottom: '10px',
            textAlign: 'center',
        }
    },
    logoutButton: {
        backgroundColor: '#dc3545',
        color: 'white',
        padding: '8px 12px',
        border: 'none',
        borderRadius: '4px',
        cursor: 'pointer',
        fontSize: '1em',
        transition: 'background-color 0.3s ease',
        '@media (max-width: 768px)': {
            width: 'calc(100% - 30px)',
            margin: '0 auto',
            padding: '15px',
        }
    },
    menuIcon: {
        fontSize: '1.8rem',
        cursor: 'pointer',
        color: '#333',
        zIndex: 1001,
        width: '40px',
        height: '40px',
        display: 'none',
        justifyContent: 'center',
        alignItems: 'center',
        '@media (max-width: 768px)': {
            display: 'flex',
        }
    },
    menuIconSvg: {
        fontSize: '1.8rem',
        lineHeight: 1,
        color: '#333 !important',
    },
    storeNameDisplay: {
        color: '#333',
        fontWeight: 'normal',
        marginRight: '15px',
        '@media (max-width: 768px)': {
            textAlign: 'center',
            padding: '15px 0',
            width: '100%',
            borderBottom: '1px solid #ccc',
        }
    }
};

const AppContent = () => {
  const { isAuthenticated, loading, selectedStoreSlug, user } = useAuth(); 

  if (loading) {
    return <div style={{ padding: '20px', textAlign: 'center' }}>Cargando autenticación...</div>;
  }

  return (
    <>
      <Navbar /> 
      <div style={appContentStyles.container}>
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

const appContentStyles = {
  container: {
    padding: '30px',
    maxWidth: '1300px',
    margin: '30px auto',
    backgroundColor: '#ffffff',
    borderRadius: '10px',
    boxShadow: '0 5px 15px rgba(0, 0, 0, 0.1)',
    flexGrow: 1,
    '@media (max-width: 768px)': {
      padding: '15px',
      margin: '15px',
    },
    '@media (max-width: 600px)': {
      padding: '10px',
    },
  }
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