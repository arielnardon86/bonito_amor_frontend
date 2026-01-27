import React, { useState, useEffect } from 'react';
import { Routes, Route, Link, Navigate, useLocation } from 'react-router-dom';
import axios from 'axios';

import Productos from './components/Productos';
import PuntoVenta from './components/PuntoVenta';
import Login from './components/Login';
import RegistroCompras from './components/RegistroCompras'; 
import ProtectedRoute from './components/ProtectedRoute'; 
import { AuthProvider, useAuth } from './AuthContext'; 
import { SalesProvider } from './components/SalesContext'; 
import EtiquetasImpresion from './components/EtiquetasImpresion';
import ReciboImpresion from './components/ReciboImpresion';
import FacturaImpresion from './components/FacturaImpresion';
import TicketCambioImpresion from './components/TicketCambioImpresion';
import CambioDevolucion from './components/CambioDevolucion';
import PanelAdministracionTienda from './components/PanelAdministracionTienda';

import MetricasVentas from './components/MetricasVentas';
import VentasPage from './components/VentasPage';
import HomePage from './components/HomePage';
import IntegracionMercadoLibre from './components/IntegracionMercadoLibre'; 
import { useNotifications } from './hooks/useNotifications';

import './App.css';

import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
  faBars, 
  faTimes, 
  faShoppingCart,
  faListAlt,
  faBox,
  faChartLine,
  faMoneyBillWave,
  faCog,
  faShoppingBag,
  faSignOutAlt,
  faUser,
  faStore
} from '@fortawesome/free-solid-svg-icons';

// Componente para la navegación
const Navbar = () => {
  const { isAuthenticated, user, logout, selectedStoreSlug, stores, token } = useAuth(); 
  const [isOpen, setIsOpen] = useState(false);
  const [mlConfigurado, setMlConfigurado] = useState(false);
  const [verificandoML, setVerificandoML] = useState(false);
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

  // Cerrar sidebar en mobile al cambiar de ruta
  useEffect(() => {
    if (window.innerWidth <= 768) {
      setIsOpen(false);
    }
  }, [location.pathname]);

  // Evitar scroll del body solo cuando el menú está abierto en mobile
  useEffect(() => {
    if (window.innerWidth <= 768 && isOpen) {
      document.body.style.overflow = 'hidden';
      document.documentElement.style.overflow = 'hidden';
    } else {
      document.body.style.removeProperty('overflow');
      document.documentElement.style.removeProperty('overflow');
    }
    return () => {
      document.body.style.removeProperty('overflow');
      document.documentElement.style.removeProperty('overflow');
    };
  }, [isOpen]);

  // Verificar si Mercado Libre está configurado para la tienda
  useEffect(() => {
    const verificarMLConfigurado = async () => {
      if (!isAuthenticated || !selectedStoreSlug || !token || !user?.is_superuser) {
        setMlConfigurado(false);
        return;
      }

      setVerificandoML(true);
      try {
        // Obtener el ID de la tienda desde stores
        let tiendaId = null;
        if (Array.isArray(stores) && stores.length > 0) {
          const tiendaEncontrada = stores.find(s => s.nombre === selectedStoreSlug);
          if (tiendaEncontrada?.id) {
            tiendaId = tiendaEncontrada.id;
          }
        }

        // Si no está en stores, buscar en la API
        if (!tiendaId) {
          const response = await axios.get(`${process.env.REACT_APP_API_URL?.replace(/\/api\/?$/, '')}/api/tiendas/`, {
            headers: { 'Authorization': `Bearer ${token}` }
          });
          const tiendas = response.data.results || response.data;
          if (Array.isArray(tiendas)) {
            const tiendaEncontrada = tiendas.find(t => t.nombre === selectedStoreSlug);
            if (tiendaEncontrada?.id) {
              tiendaId = tiendaEncontrada.id;
            }
          }
        }

        if (tiendaId) {
          // Verificar estado de ML
          try {
            const mlResponse = await axios.get(
              `${process.env.REACT_APP_API_URL?.replace(/\/api\/?$/, '')}/api/tiendas/${tiendaId}/mercadolibre/status/`,
              {
                headers: { 'Authorization': `Bearer ${token}` }
              }
            );
            
            // ML está configurado si tiene connected = true (tiene todas las credenciales)
            // O si tiene app_id y client_secret (aunque no tenga token aún)
            const mlData = mlResponse.data;
            const configurado = mlData.connected === true || 
                               (mlData.has_app_id && mlData.has_client_secret);
            setMlConfigurado(configurado);
          } catch (mlErr) {
            // Si el endpoint devuelve error (ej: 400 porque no está configurado para ML)
            // o si la tienda no tiene plataforma_ecommerce = MERCADO_LIBRE
            setMlConfigurado(false);
          }
        } else {
          setMlConfigurado(false);
        }
      } catch (err) {
        // Si hay error, asumir que no está configurado
        console.log('ML no configurado o error al verificar:', err);
        setMlConfigurado(false);
      } finally {
        setVerificandoML(false);
      }
    };

    verificarMLConfigurado();
  }, [isAuthenticated, selectedStoreSlug, token, user, stores]);

  // Si estamos en la página de etiquetas, recibo, factura o ticket de cambio, no mostramos la barra de navegación
  if (location.pathname === '/etiquetas' || location.pathname === '/recibo' || location.pathname === '/factura' || location.pathname === '/ticket-cambio' || location.pathname === '/cambio-devolucion') {
    return null;
  }

  // Si no está autenticado, no mostrar sidebar
  if (!isAuthenticated) {
    return null;
  }

  return (
    <>
      {/* Menú hamburguesa para mobile */}
      <div onClick={toggleMenu} className="menu-icon-mobile">
        <FontAwesomeIcon icon={isOpen ? faTimes : faBars} /> 
      </div>
      
      {/* Overlay para mobile cuando el menú está abierto */}
      {isOpen && <div className="sidebar-overlay" onClick={toggleMenu}></div>}

      <nav className={`sidebar ${isOpen ? 'active' : ''}`}>
        <div className="sidebar-header">
          <Link to="/" className="sidebar-logo" onClick={() => setIsOpen(false)}>
            <img src="/total-stock-logo.jpg" alt="Total Stock Logo" className="app-logo-image" />
          </Link>
          {selectedStoreSlug && (
            <div className="store-name-sidebar">
              <FontAwesomeIcon icon={faStore} className="store-icon" />
              <span><strong>{selectedStoreSlug}</strong></span>
            </div>
          )}
        </div>

        {isAuthenticated && (
          <ul className="sidebar-links">
            {user && (user.is_staff || user.is_superuser) && ( 
              <li onClick={() => setIsOpen(false)}>
                <Link to="/punto-venta" className={location.pathname === '/punto-venta' || location.pathname === '/' ? 'active' : ''}>
                  <FontAwesomeIcon icon={faShoppingCart} className="nav-icon" />
                  <span>Punto de Venta</span>
                </Link>
              </li>
            )}
            
            {user && (user.is_staff || user.is_superuser) && ( 
              <li onClick={() => setIsOpen(false)}>
                <Link to="/ventas" className={location.pathname === '/ventas' ? 'active' : ''}>
                  <FontAwesomeIcon icon={faListAlt} className="nav-icon" />
                  <span>Listado de Ventas</span>
                </Link>
              </li>
            )}
            
            {user && user.is_superuser && ( 
              <>
                <li onClick={() => setIsOpen(false)}>
                  <Link to="/productos" className={location.pathname === '/productos' ? 'active' : ''}>
                    <FontAwesomeIcon icon={faBox} className="nav-icon" />
                    <span>Gestión de Productos</span>
                  </Link>
                </li>
                <li onClick={() => setIsOpen(false)}>
                  <Link to="/metricas-ventas" className={location.pathname === '/metricas-ventas' ? 'active' : ''}>
                    <FontAwesomeIcon icon={faChartLine} className="nav-icon" />
                    <span>Métricas de Ventas</span>
                  </Link>
                </li>
                <li onClick={() => setIsOpen(false)}>
                  <Link to="/registro-compras" className={location.pathname === '/registro-compras' ? 'active' : ''}>
                    <FontAwesomeIcon icon={faMoneyBillWave} className="nav-icon" />
                    <span>Registro de Egresos</span>
                  </Link>
                </li>
                <li onClick={() => setIsOpen(false)}>
                  <Link to="/panel-administracion-tienda" className={location.pathname === '/panel-administracion-tienda' ? 'active' : ''}>
                    <FontAwesomeIcon icon={faCog} className="nav-icon" />
                    <span>Panel de Administración</span>
                  </Link>
                </li>
                {mlConfigurado && (
                  <li onClick={() => setIsOpen(false)}>
                    <Link to="/integracion-mercadolibre" className={location.pathname === '/integracion-mercadolibre' ? 'active' : ''}>
                      <FontAwesomeIcon icon={faShoppingBag} className="nav-icon" />
                      <span>Integración Mercado Libre</span>
                    </Link>
                  </li>
                )}
              </>
            )}
            
            {user && ( 
              <li className="sidebar-footer">
                <div className="user-info">
                  <FontAwesomeIcon icon={faUser} className="user-icon" />
                  <span className="username">{user?.username}</span>
                </div>
                <button onClick={handleLogout} className="logout-button">
                  <FontAwesomeIcon icon={faSignOutAlt} />
                  <span>Cerrar Sesión</span>
                </button>
              </li>
            )}
          </ul>
        )}
      </nav>
    </>
  );
};

const AppContent = () => {
  const { isAuthenticated, loading, selectedStoreSlug, user } = useAuth(); 
  
  // Inicializar notificaciones push cuando el usuario está autenticado
  // El hook maneja errores internamente, no bloquea la app si falla
  const { notificationPermission, solicitarPermiso, error: notificationError } = useNotifications();

  if (loading) {
    return <div style={{ padding: '20px', textAlign: 'center' }}>Cargando autenticación...</div>;
  }

  return (
    <>
      <Navbar />
      <div className={`main-content ${isAuthenticated && selectedStoreSlug ? 'with-sidebar' : 'no-sidebar'}`}>
        <div className="container">
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

          {isAuthenticated && selectedStoreSlug && (user?.is_staff || user?.is_superuser) && (
            <>
              <Route path="/ventas" element={
                <ProtectedRoute staffOnly={true}>
                  <VentasPage />
                </ProtectedRoute>
              } />
              <Route path="/recibo" element={<ReciboImpresion />} />
              <Route path="/factura" element={<FacturaImpresion />} />
              <Route path="/ticket-cambio" element={<TicketCambioImpresion />} />
              <Route path="/cambio-devolucion" element={
                <ProtectedRoute staffOnly={true}>
                  <CambioDevolucion />
                </ProtectedRoute>
              } />
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
              <Route path="/registro-compras" element={ 
                <ProtectedRoute adminOnly={true}>
                  <RegistroCompras />
                </ProtectedRoute>
              } />
              <Route path="/etiquetas" element={<EtiquetasImpresion />} />
              <Route path="/panel-administracion-tienda" element={
                <ProtectedRoute adminOnly={true}>
                  <PanelAdministracionTienda />
                </ProtectedRoute>
              } />
              <Route path="/integracion-mercadolibre" element={
                <ProtectedRoute superuserOnly={true}>
                  <IntegracionMercadoLibre />
                </ProtectedRoute>
              } />
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
