import React, { useState, useEffect, useCallback } from 'react';
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
import ComprasStock from './components/ComprasStock';
import VentasPage from './components/VentasPage';
import HomePage from './components/HomePage';
import CierresCaja from './components/CierresCaja';
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
  faStore,
  faBell,
  faTruck,
  faCashRegister,
} from '@fortawesome/free-solid-svg-icons';

// Soporte de notificaciones push (gesto de usuario requerido en móvil)
const notificacionesSoportadas = () =>
  typeof window !== 'undefined' &&
  'Notification' in window &&
  'serviceWorker' in navigator;

// Componente para la navegación
const Navbar = () => {
  const { isAuthenticated, user, logout, selectedStoreSlug, selectStore, tiendasAutorizadas } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
  const location = useLocation();
  const { notificationPermission, fcmToken, solicitarPermiso, eliminarToken } = useNotifications();

  const handleLogout = () => {
    logout();
    setIsOpen(false);
  };

  const toggleMenu = () => {
    setIsOpen(!isOpen);
  };

  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth <= 768;
      setIsMobile(mobile);
      if (!mobile && isOpen) { 
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

  // Si estamos en la página de etiquetas, recibo, factura o ticket de cambio, no mostramos la barra de navegación
  if (location.pathname === '/etiquetas' || location.pathname === '/recibo' || location.pathname === '/factura' || location.pathname === '/ticket-cambio' || location.pathname === '/cambio-devolucion') {
    return null;
  }

  // Si no está autenticado, no mostrar sidebar
  if (!isAuthenticated) {
    return null;
  }

  const handleActivarNotificaciones = async () => {
    if (solicitarPermiso) {
      await solicitarPermiso();
    }
  };

  const handleDesactivarNotificaciones = async () => {
    if (eliminarToken) {
      // Pasar el token actual o null, la función manejará ambos casos
      await eliminarToken(fcmToken || null);
    }
  };

  const notificacionesActivas = !!fcmToken;

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
            <img src="/logo-completo.png" alt="Total Stock Logo" className="app-logo-image" />
          </Link>
          {selectedStoreSlug && (
            tiendasAutorizadas.length > 1 ? (
              <div className="store-selector-sidebar">
                <FontAwesomeIcon icon={faStore} className="store-icon" />
                <select
                  value={selectedStoreSlug}
                  onChange={e => { selectStore(e.target.value); setIsOpen(false); }}
                  className="store-select"
                  title="Cambiar tienda"
                >
                  {tiendasAutorizadas.map(t => (
                    <option key={t.id} value={t.nombre}>{t.nombre}</option>
                  ))}
                </select>
              </div>
            ) : (
              <div className="store-name-sidebar">
                <FontAwesomeIcon icon={faStore} className="store-icon" />
                <span><strong>{selectedStoreSlug}</strong></span>
              </div>
            )
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
                  <Link to="/compras-stock" className={location.pathname === '/compras-stock' ? 'active' : ''}>
                    <FontAwesomeIcon icon={faTruck} className="nav-icon" />
                    <span>Compras / Stock</span>
                  </Link>
                </li>
                <li onClick={() => setIsOpen(false)}>
                  <Link to="/panel-administracion-tienda" className={location.pathname === '/panel-administracion-tienda' ? 'active' : ''}>
                    <FontAwesomeIcon icon={faCog} className="nav-icon" />
                    <span>Panel de Administración</span>
                  </Link>
                </li>
                <li onClick={() => setIsOpen(false)}>
                  <Link to="/cierres-caja" className={location.pathname === '/cierres-caja' ? 'active' : ''}>
                    <FontAwesomeIcon icon={faCashRegister} className="nav-icon" />
                    <span>Cierres de Caja</span>
                  </Link>
                </li>
              </>
            )}
            
            {user && notificacionesSoportadas() && notificationPermission === 'default' && (
              <li className="sidebar-notifications">
                <button
                  type="button"
                  className="notifications-enable-button"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    if (solicitarPermiso) solicitarPermiso();
                  }}
                >
                  <FontAwesomeIcon icon={faBell} />
                  <span>Activar notificaciones</span>
                </button>
              </li>
            )}
            {user && ( 
              <li className="sidebar-footer">
                <div className="user-info">
                  <FontAwesomeIcon icon={faUser} className="user-icon" />
                  <span className="username">{user?.username}</span>
                </div>

                {/* Botón de notificaciones solo para mobile (PWA) */}
                {isMobile && (
                  <button
                    type="button"
                    className="notifications-toggle-button"
                    onClick={notificacionesActivas ? handleDesactivarNotificaciones : handleActivarNotificaciones}
                    style={{
                      padding: '8px 12px',
                      marginTop: '8px',
                      marginBottom: '8px',
                      backgroundColor: notificacionesActivas ? '#dc3545' : '#17a2b8',
                      color: '#fff',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      fontSize: '0.9em',
                      width: '100%'
                    }}
                  >
                    {notificacionesActivas ? 'Desactivar notificaciones' : 'Activar notificaciones'}
                  </button>
                )}

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

const BASE_API_URL = (() => {
  const url = process.env.REACT_APP_API_URL || 'http://127.0.0.1:8000';
  return url.replace(/\/api\/?$/, '').replace(/\/$/, '');
})();

const AppContent = () => {
  const { isAuthenticated, loading, selectedStoreSlug, user, token } = useAuth();
  const [mostrarModalCambioInicial, setMostrarModalCambioInicial] = useState(false);
  const [cambioInicialInput, setCambioInicialInput] = useState('');
  const [guardandoCambioInicial, setGuardandoCambioInicial] = useState(false);
  const [cierreActivoApp, setCierreActivoApp] = useState(null);

  const verificarCierreActivo = useCallback(async () => {
    if (!token || !selectedStoreSlug || !user?.cierre_caja_habilitado) return;
    try {
      const res = await axios.get(`${BASE_API_URL}/api/cierre-caja/activo/`, {
        headers: { Authorization: `Bearer ${token}` },
        params: { tienda: selectedStoreSlug },
      });
      if (res.data) {
        setCierreActivoApp(res.data);
        setMostrarModalCambioInicial(false);
      } else {
        setMostrarModalCambioInicial(true);
      }
    } catch { /* no op */ }
  }, [token, selectedStoreSlug, user]);

  useEffect(() => {
    if (!loading && isAuthenticated && selectedStoreSlug && user?.cierre_caja_habilitado) {
      verificarCierreActivo();
    }
  }, [loading, isAuthenticated, selectedStoreSlug, user, verificarCierreActivo]);

  const handleConfirmarCambioInicial = async (saltar = false) => {
    if (!token || !selectedStoreSlug) { setMostrarModalCambioInicial(false); return; }
    setGuardandoCambioInicial(true);
    try {
      const res = await axios.post(`${BASE_API_URL}/api/cierre-caja/`, {
        cambio_inicial: saltar ? 0 : (parseFloat(cambioInicialInput) || 0),
        tienda_slug: selectedStoreSlug,
      }, { headers: { Authorization: `Bearer ${token}` } });
      setCierreActivoApp(res.data);
      setMostrarModalCambioInicial(false);
      setCambioInicialInput('');
    } catch (err) {
      console.error('Error al crear cierre:', err);
      alert('No se pudo iniciar el turno. Intentá nuevamente.');
    } finally {
      setGuardandoCambioInicial(false);
    }
  };

  if (loading) {
    return <div style={{ padding: '20px', textAlign: 'center' }}>Cargando autenticación...</div>;
  }

  return (
    <>
      <Navbar />

      {/* Modal cambio inicial al iniciar sesión */}
      {mostrarModalCambioInicial && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,.6)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 3000,
        }}>
          <div style={{
            background: '#fff', borderRadius: 14, padding: '32px 28px', width: 360,
            boxShadow: '0 20px 60px rgba(0,0,0,.3)', textAlign: 'center',
          }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>💰</div>
            <h2 style={{ margin: '0 0 8px', fontSize: 20, fontWeight: 700, color: '#1a202c' }}>
              Inicio de turno
            </h2>
            <p style={{ color: '#718096', fontSize: 14, marginBottom: 20 }}>
              Ingresá el cambio inicial en efectivo con el que comenzás el turno.
            </p>
            <input
              type="number"
              min="0"
              placeholder="$ Cambio inicial"
              value={cambioInicialInput}
              onChange={e => setCambioInicialInput(e.target.value)}
              autoFocus
              style={{
                width: '100%', padding: '10px 12px', borderRadius: 8, fontSize: 16,
                border: '2px solid #e2e8f0', marginBottom: 16, boxSizing: 'border-box',
                outline: 'none', textAlign: 'center',
              }}
              onKeyDown={e => e.key === 'Enter' && handleConfirmarCambioInicial(false)}
            />
            <div style={{ display: 'flex', gap: 10 }}>
              <button
                onClick={() => handleConfirmarCambioInicial(true)}
                disabled={guardandoCambioInicial}
                style={{
                  flex: 1, padding: '10px', borderRadius: 8, border: '1px solid #e2e8f0',
                  background: '#f7f8fa', color: '#718096', cursor: 'pointer', fontWeight: 600, fontSize: 14,
                }}>
                Omitir
              </button>
              <button
                onClick={() => handleConfirmarCambioInicial(false)}
                disabled={guardandoCambioInicial}
                style={{
                  flex: 2, padding: '10px', borderRadius: 8, border: 'none',
                  background: '#3c7ef3', color: '#fff', cursor: 'pointer', fontWeight: 700, fontSize: 15,
                }}>
                {guardandoCambioInicial ? 'Guardando...' : 'Confirmar'}
              </button>
            </div>
          </div>
        </div>
      )}
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
              <Route path="/compras-stock" element={
                <ProtectedRoute adminOnly={true}>
                  <ComprasStock />
                </ProtectedRoute>
              } />
              <Route path="/etiquetas" element={<EtiquetasImpresion />} />
              <Route path="/panel-administracion-tienda" element={
                <ProtectedRoute adminOnly={true}>
                  <PanelAdministracionTienda />
                </ProtectedRoute>
              } />
              <Route path="/cierres-caja" element={
                <ProtectedRoute adminOnly={true}>
                  <CierresCaja />
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
