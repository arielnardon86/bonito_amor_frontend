import React, { useState, useEffect, useCallback } from 'react';
import { Routes, Route, Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
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
import Registro from './components/Registro';
import SuscripcionResultado from './components/SuscripcionResultado';
import NuevaContrasena from './components/NuevaContrasena';
import { useNotifications } from './hooks/useNotifications';
import Swal from 'sweetalert2';

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
  faLock,
  faLockOpen,
} from '@fortawesome/free-solid-svg-icons';

// Soporte de notificaciones push (gesto de usuario requerido en móvil)
const notificacionesSoportadas = () =>
  typeof window !== 'undefined' &&
  'Notification' in window &&
  'serviceWorker' in navigator;

const BASE_API_URL = (() => {
  const url = process.env.REACT_APP_API_URL || 'http://127.0.0.1:8000';
  return url.replace(/\/api\/?$/, '').replace(/\/$/, '');
})();

// Componente para la navegación
const Navbar = () => {
  const { isAuthenticated, user, logout, token, selectedStoreSlug, selectStore, tiendasAutorizadas, lockSession } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
  const location = useLocation();
  const { notificationPermission, fcmToken, solicitarPermiso, eliminarToken } = useNotifications();

  const handleLogout = async () => {
    if (user?.cierre_caja_habilitado && !user?.is_supervisor && !user?.is_superuser && token && selectedStoreSlug) {
      try {
        const res = await axios.get(`${BASE_API_URL}/api/cierre-caja/activo/`, {
          headers: { Authorization: `Bearer ${token}` },
          params: { tienda: selectedStoreSlug },
        });
        if (res.data) {
          await Swal.fire({
            icon: 'warning',
            title: 'Turno de caja abierto',
            text: 'Tenés un turno de caja abierto. Cerrá la caja antes de cerrar sesión.',
            confirmButtonText: 'Entendido',
            confirmButtonColor: '#3c7ef3',
          });
          return;
        }
      } catch { /* si falla el check, permitir logout */ }
    }
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
            {user && (user.is_staff || user.is_superuser || user.is_supervisor) && (
              <li onClick={() => setIsOpen(false)}>
                <Link to="/punto-venta" className={location.pathname === '/punto-venta' || location.pathname === '/' ? 'active' : ''}>
                  <FontAwesomeIcon icon={faShoppingCart} className="nav-icon" />
                  <span>Punto de Venta</span>
                </Link>
              </li>
            )}

            {user && (user.is_staff || user.is_superuser || user.is_supervisor) && (
              <li onClick={() => setIsOpen(false)}>
                <Link to="/ventas" className={location.pathname === '/ventas' ? 'active' : ''}>
                  <FontAwesomeIcon icon={faListAlt} className="nav-icon" />
                  <span>Listado de Ventas</span>
                </Link>
              </li>
            )}

            {user && (user.is_superuser || user.is_supervisor) && (
              <li onClick={() => setIsOpen(false)}>
                <Link to="/productos" className={location.pathname === '/productos' ? 'active' : ''}>
                  <FontAwesomeIcon icon={faBox} className="nav-icon" />
                  <span>Gestión de Productos</span>
                </Link>
              </li>
            )}

            {user && (user.is_superuser || user.is_supervisor) && (
              <>
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
              </>
            )}

            {user && user.is_superuser && (
              <>
                <li onClick={() => setIsOpen(false)}>
                  <Link to="/metricas-ventas" className={location.pathname === '/metricas-ventas' ? 'active' : ''}>
                    <FontAwesomeIcon icon={faChartLine} className="nav-icon" />
                    <span>Métricas de Ventas</span>
                  </Link>
                </li>
                <li onClick={() => setIsOpen(false)}>
                  <Link to="/panel-administracion-tienda" className={location.pathname === '/panel-administracion-tienda' ? 'active' : ''}>
                    <FontAwesomeIcon icon={faCog} className="nav-icon" />
                    <span>Panel de Administración</span>
                  </Link>
                </li>
              </>
            )}

            {user && (user.is_superuser || user.is_supervisor) && tiendasAutorizadas.some(t => t.nombre === selectedStoreSlug && t.tiene_cierre_caja) && (
              <li onClick={() => setIsOpen(false)}>
                <Link to="/cierres-caja" className={location.pathname === '/cierres-caja' ? 'active' : ''}>
                  <FontAwesomeIcon icon={faCashRegister} className="nav-icon" />
                  <span>Cierres de Caja</span>
                </Link>
              </li>
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

                {user?.cierre_caja_habilitado && (
                  <button
                    onClick={() => { lockSession(); setIsOpen(false); }}
                    className="logout-button"
                    style={{ background: '#4a5568', marginBottom: 4 }}
                  >
                    <FontAwesomeIcon icon={faLock} />
                    <span>Bloquear sesión</span>
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

const AppContent = () => {
  const { isAuthenticated, loading, selectedStoreSlug, user, token, sessionLocked, unlockSession, logout, tiendasAutorizadas, selectStore, updateUser } = useAuth();
  const navigate = useNavigate();
  const [mostrarModalCambioInicial, setMostrarModalCambioInicial] = useState(false);
  const [cambioInicialInput, setCambioInicialInput] = useState('');
  const [guardandoCambioInicial, setGuardandoCambioInicial] = useState(false);
  const [cierreActivoApp, setCierreActivoApp] = useState(null);
  const [unlockPassword, setUnlockPassword] = useState('');
  const [unlockError, setUnlockError] = useState('');
  const [unlocking, setUnlocking] = useState(false);
  const [suscripcionPendiente, setSuscripcionPendiente] = useState(false);
  const [estadoSuscripcion, setEstadoSuscripcion] = useState('');
  const [emailPendiente, setEmailPendiente] = useState('');
  const [guardandoEmail, setGuardandoEmail] = useState(false);
  const [errorEmail, setErrorEmail] = useState('');
  const [emailModalOmitido, setEmailModalOmitido] = useState(false);
  const [verificandoPago, setVerificandoPago] = useState(false);
  const [mensajeVerificacion, setMensajeVerificacion] = useState('');
  const [preapprovalIdUrl, setPreapprovalIdUrl] = useState('');
  const [mostrarPlanes, setMostrarPlanes] = useState(false);
  const [planesData, setPlanesData] = useState([]);
  const [cargandoPlan, setCargandoPlan] = useState('');

  // Cuando MP redirige a la raíz con ?preapproval_id=XXX:
  // - Guardar el ID para pasarlo al verificar si el gate aparece
  // - Redirigir al componente de resultado
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const preapprovalId = params.get('preapproval_id');
    if (preapprovalId && window.location.pathname === '/') {
      setPreapprovalIdUrl(preapprovalId);
      navigate(`/suscripcion/resultado?preapproval_id=${preapprovalId}`, { replace: true });
    }
  }, [navigate]);

  const handleGuardarEmail = async (e) => {
    e.preventDefault();
    setErrorEmail('');
    if (!emailPendiente.trim() || !/\S+@\S+\.\S+/.test(emailPendiente)) {
      setErrorEmail('Ingresá un email válido.');
      return;
    }
    setGuardandoEmail(true);
    try {
      await axios.patch(`${BASE_API_URL}/api/auth/update-email/`, { email: emailPendiente.trim().toLowerCase() }, {
        headers: { Authorization: `Bearer ${token}` },
      });
      updateUser({ email: emailPendiente.trim().toLowerCase() });
      setEmailPendiente('');
    } catch (err) {
      setErrorEmail(err.response?.data?.error || 'No se pudo guardar el email. Intentá de nuevo.');
    } finally {
      setGuardandoEmail(false);
    }
  };

  const handleVerPlanes = async () => {
    setMostrarPlanes(true);
    if (planesData.length === 0) {
      try {
        const r = await axios.get(`${BASE_API_URL}/api/planes/`);
        setPlanesData(r.data);
      } catch { /* no op */ }
    }
  };

  const handleElegirPlan = async (planNombre) => {
    setCargandoPlan(planNombre);
    try {
      const resp = await axios.post(
        `${BASE_API_URL}/api/suscripcion/cambiar-plan/`,
        { plan: planNombre },
        { headers: { Authorization: `Bearer ${token}` } },
      );
      if (resp.data.checkout_url) {
        window.location.href = resp.data.checkout_url;
      }
    } catch (err) {
      setMensajeVerificacion(err.response?.data?.error || 'Error al generar el checkout. Intentá de nuevo.');
      setMostrarPlanes(false);
    } finally {
      setCargandoPlan('');
    }
  };

  const handleVerificarPago = async () => {
    setVerificandoPago(true);
    setMensajeVerificacion('');
    try {
      // Also read preapproval_id from current URL in case state was lost on navigate
      const urlParams = new URLSearchParams(window.location.search);
      const preapprovalIdParam = preapprovalIdUrl || urlParams.get('preapproval_id') || '';
      const resp = await axios.post(`${BASE_API_URL}/api/suscripcion/verificar-pago/`, {
        preapproval_id: preapprovalIdParam,
      });
      if (resp.data.activa) {
        setSuscripcionPendiente(false);
        setMensajeVerificacion('');
        window.location.href = '/';
      } else {
        setMensajeVerificacion(resp.data.mensaje || 'El pago aún no fue confirmado. Intentá en unos minutos.');
      }
    } catch {
      setMensajeVerificacion('Error al verificar. Intentá de nuevo.');
    } finally {
      setVerificandoPago(false);
    }
  };

  const handleUnlock = async () => {
    if (!unlockPassword) { setUnlockError('Ingresá tu contraseña.'); return; }
    setUnlocking(true);
    setUnlockError('');
    try {
      await axios.post(`${BASE_API_URL}/api/token/`, {
        username: user.username,
        password: unlockPassword,
      });
      unlockSession();
      setUnlockPassword('');
    } catch {
      setUnlockError('Contraseña incorrecta.');
    } finally {
      setUnlocking(false);
    }
  };

  const verificarCierreActivo = useCallback(async () => {
    if (!token || !selectedStoreSlug || !user?.cierre_caja_habilitado) return;
    if (user?.is_supervisor || user?.is_superuser) return;
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
    if (!loading && isAuthenticated && selectedStoreSlug && user?.cierre_caja_habilitado
        && !user?.is_supervisor && !user?.is_superuser) {
      verificarCierreActivo();
    }
  }, [loading, isAuthenticated, selectedStoreSlug, user, verificarCierreActivo]);

  // Verificar si la suscripción está pendiente de pago en MP
  useEffect(() => {
    if (!loading && isAuthenticated && selectedStoreSlug && token) {
      axios.get(`${BASE_API_URL}/api/suscripcion/mi-plan/`, {
        headers: { Authorization: `Bearer ${token}` },
      }).then(r => {
        // legacy stores: esta_activa no viene en la respuesta → siempre activas
        const bloqueada = r.data.legacy ? false : r.data.esta_activa === false;
        setSuscripcionPendiente(bloqueada);
        setEstadoSuscripcion(r.data.estado || '');
      }).catch(() => {});
    }
  }, [loading, isAuthenticated, selectedStoreSlug, token]);

  const handleConfirmarCambioInicial = async () => {
    if (!token || !selectedStoreSlug) return;
    if (cambioInicialInput === '') {
      alert('Ingresá el monto de cambio inicial. Si no tenés efectivo, ingresá 0.');
      return;
    }
    setGuardandoCambioInicial(true);
    try {
      const res = await axios.post(`${BASE_API_URL}/api/cierre-caja/`, {
        cambio_inicial: parseFloat(cambioInicialInput) || 0,
        tienda_slug: selectedStoreSlug,
      }, { headers: { Authorization: `Bearer ${token}` } });
      setCierreActivoApp(res.data);
      setMostrarModalCambioInicial(false);
      setCambioInicialInput('');
    } catch (err) {
      console.error('Error al crear cierre:', err);
      Swal.fire('Error', err.response?.data?.error || 'No se pudo iniciar el turno. Intentá nuevamente.', 'error');
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

      {/* Modal: admin sin email registrado */}
      {isAuthenticated && !loading && user?.is_superuser && !user?.email && !emailModalOmitido && !suscripcionPendiente && !sessionLocked && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(15,30,58,0.7)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 8500, fontFamily: "'Inter','Segoe UI',sans-serif",
        }}>
          <div style={{
            background: '#fff', borderRadius: 20, padding: '40px 36px',
            maxWidth: 420, width: '90%', textAlign: 'center',
            boxShadow: '0 20px 60px rgba(0,0,0,0.25)',
          }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>📧</div>
            <h2 style={{ fontSize: 20, fontWeight: 800, color: '#1e3a8a', margin: '0 0 10px' }}>
              Registrá tu email
            </h2>
            <p style={{ fontSize: 14, color: '#64748b', lineHeight: 1.65, margin: '0 0 24px' }}>
              Para recuperar tu contraseña necesitamos tu email de contacto.
              Solo te lo pedimos una vez.
            </p>
            <form onSubmit={handleGuardarEmail} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <input
                type="email"
                placeholder="tu@email.com"
                value={emailPendiente}
                onChange={e => { setEmailPendiente(e.target.value); setErrorEmail(''); }}
                required
                autoFocus
                style={{
                  padding: '11px 14px', fontSize: 15, border: '1.5px solid #e2e8f0',
                  borderRadius: 10, outline: 'none', boxSizing: 'border-box', width: '100%',
                  fontFamily: "'Inter','Segoe UI',sans-serif",
                }}
              />
              {errorEmail && (
                <div style={{
                  fontSize: 13, color: '#b91c1c', background: '#fef2f2',
                  border: '1px solid #fecaca', borderRadius: 8, padding: '8px 12px', textAlign: 'left',
                }}>
                  {errorEmail}
                </div>
              )}
              <button
                type="submit"
                disabled={guardandoEmail}
                style={{
                  background: guardandoEmail ? '#94a3b8' : '#5dc87a',
                  color: '#fff', border: 'none', borderRadius: 10,
                  padding: '13px 0', fontSize: 15, fontWeight: 700,
                  cursor: guardandoEmail ? 'not-allowed' : 'pointer',
                  boxShadow: '0 4px 14px rgba(93,200,122,.30)',
                }}
              >
                {guardandoEmail ? 'Guardando…' : 'Guardar email'}
              </button>
              <button
                type="button"
                onClick={() => setEmailModalOmitido(true)}
                style={{
                  background: 'none', border: 'none', color: '#94a3b8',
                  fontSize: 12, cursor: 'pointer', padding: '4px 0',
                }}
              >
                Ahora no, recordármelo más tarde
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Pantalla de bloqueo de sesión */}
      {sessionLocked && (
        <div style={{
          position: 'fixed', inset: 0, background: '#1a202c',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999,
        }}>
          <div style={{
            background: '#fff', borderRadius: 16, padding: '40px 32px', width: 360,
            boxShadow: '0 24px 80px rgba(0,0,0,.5)', textAlign: 'center',
          }}>
            <div style={{ fontSize: 48, marginBottom: 8 }}>🔒</div>
            <h2 style={{ margin: '0 0 4px', fontSize: 22, fontWeight: 700, color: '#1a202c' }}>
              Sesión bloqueada
            </h2>
            <p style={{ color: '#718096', fontSize: 14, marginBottom: 20 }}>
              {user?.username} — ingresá tu contraseña para continuar
            </p>
            <input
              type="password"
              placeholder="Contraseña"
              value={unlockPassword}
              onChange={e => { setUnlockPassword(e.target.value); setUnlockError(''); }}
              autoFocus
              style={{
                width: '100%', padding: '10px 12px', borderRadius: 8, fontSize: 15,
                border: `2px solid ${unlockError ? '#e53e3e' : '#e2e8f0'}`, marginBottom: 8,
                boxSizing: 'border-box', outline: 'none', textAlign: 'center',
              }}
              onKeyDown={e => e.key === 'Enter' && handleUnlock()}
            />
            {unlockError && (
              <p style={{ color: '#e53e3e', fontSize: 13, marginBottom: 8 }}>{unlockError}</p>
            )}
            <button
              onClick={handleUnlock}
              disabled={unlocking}
              style={{
                width: '100%', padding: '12px', borderRadius: 8, border: 'none',
                background: '#3c7ef3', color: '#fff', cursor: 'pointer', fontWeight: 700, fontSize: 15,
                marginBottom: 0,
              }}>
              {unlocking ? 'Verificando...' : 'Desbloquear'}
            </button>
          </div>
        </div>
      )}

      {/* Modal cambio inicial al iniciar sesión */}
      {mostrarModalCambioInicial && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,.7)',
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
            <p style={{ color: '#718096', fontSize: 14, marginBottom: 4 }}>
              Ingresá el cambio inicial en efectivo con el que comenzás el turno.
            </p>
            {!user?.is_superuser && (
              <p style={{ color: '#c53030', fontSize: 12, marginBottom: 16, fontWeight: 600 }}>
                Este paso es obligatorio. Si no tenés efectivo, ingresá 0.
              </p>
            )}
            {tiendasAutorizadas?.length > 1 && (
              <div style={{ marginBottom: 16, textAlign: 'left' }}>
                <label style={{ fontSize: 12, fontWeight: 600, color: '#718096', display: 'block', marginBottom: 4 }}>
                  Tienda activa
                </label>
                <select
                  value={selectedStoreSlug}
                  onChange={e => { selectStore(e.target.value); setCambioInicialInput(''); }}
                  style={{
                    width: '100%', padding: '8px 12px', borderRadius: 8, fontSize: 14,
                    border: '2px solid #e2e8f0', outline: 'none', background: '#f7f8fa',
                  }}
                >
                  {tiendasAutorizadas.map(t => (
                    <option key={t.id} value={t.nombre}>{t.nombre}</option>
                  ))}
                </select>
              </div>
            )}
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
              onKeyDown={e => e.key === 'Enter' && handleConfirmarCambioInicial()}
            />
            <div style={{ display: 'flex', gap: 10 }}>
              {(user?.is_superuser || user?.is_supervisor) && (
                <button
                  onClick={() => { setMostrarModalCambioInicial(false); setCambioInicialInput(''); }}
                  disabled={guardandoCambioInicial}
                  style={{
                    flex: 1, padding: '12px', borderRadius: 8, border: '1px solid #e2e8f0',
                    background: '#f7f8fa', color: '#718096', cursor: 'pointer', fontWeight: 600, fontSize: 14,
                  }}>
                  Omitir
                </button>
              )}
              <button
                onClick={handleConfirmarCambioInicial}
                disabled={guardandoCambioInicial}
                style={{
                  flex: 2, padding: '12px', borderRadius: 8, border: 'none',
                  background: '#3c7ef3', color: '#fff', cursor: 'pointer', fontWeight: 700, fontSize: 15,
                }}>
                {guardandoCambioInicial ? 'Guardando...' : 'Iniciar turno'}
              </button>
            </div>
            <button
              onClick={() => logout()}
              style={{
                marginTop: 14, background: 'none', border: 'none', color: '#a0aec0',
                cursor: 'pointer', fontSize: 13, textDecoration: 'underline', padding: 0,
              }}>
              Cerrar sesión
            </button>
          </div>
        </div>
      )}
      {/* Pantalla de bloqueo por suscripción inactiva */}
      {suscripcionPendiente && isAuthenticated && selectedStoreSlug && (
        <div style={{
          position: 'fixed', inset: 0,
          background: 'linear-gradient(135deg, #0f1e3a 0%, #1e3a8a 100%)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9000,
          fontFamily: "'Inter', 'Segoe UI', sans-serif",
        }}>
          <div style={{
            background: '#fff', borderRadius: 20, padding: '48px 40px', maxWidth: 480,
            width: '90%', textAlign: 'center', boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
          }}>
            {estadoSuscripcion === 'cancelada' ? (
              mostrarPlanes ? (
                <>
                  <div style={{ fontSize: 36, marginBottom: 8 }}>📋</div>
                  <h2 style={{ fontSize: 20, fontWeight: 800, color: '#1e3a8a', marginBottom: 4 }}>
                    Elegí tu plan
                  </h2>
                  <p style={{ fontSize: 13, color: '#64748b', marginBottom: 20 }}>
                    7 días de prueba gratis · Cancelá cuando quieras
                  </p>
                  {planesData.length === 0 ? (
                    <p style={{ color: '#94a3b8', fontSize: 14 }}>Cargando planes...</p>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 16 }}>
                      {planesData.map(plan => (
                        <div key={plan.nombre} style={{
                          border: '1.5px solid #e2e8f0', borderRadius: 12, padding: '14px 18px',
                          textAlign: 'left', background: '#f8fafc',
                        }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                            <span style={{ fontWeight: 700, fontSize: 15, color: '#1e3a8a' }}>{plan.display}</span>
                            <span style={{ fontWeight: 700, fontSize: 15, color: '#5dc87a' }}>
                              ${Number(plan.precio_mensual).toLocaleString('es-AR')}/mes
                            </span>
                          </div>
                          <ul style={{ margin: '0 0 10px', paddingLeft: 18, fontSize: 12, color: '#475569', lineHeight: 1.8 }}>
                            {plan.max_productos > 0 && <li>Hasta {plan.max_productos.toLocaleString('es-AR')} productos</li>}
                            {plan.max_usuarios > 0 && <li>Hasta {plan.max_usuarios} usuarios</li>}
                            {plan.permite_factura_electronica && <li>Factura electrónica AFIP</li>}
                            {plan.permite_integracion_ecommerce && <li>Integración Tienda Nube / Mercado Libre</li>}
                          </ul>
                          <button
                            onClick={() => handleElegirPlan(plan.nombre)}
                            disabled={!!cargandoPlan}
                            style={{
                              width: '100%', background: cargandoPlan === plan.nombre ? '#94a3b8' : '#5dc87a',
                              color: '#fff', border: 'none', borderRadius: 8,
                              padding: '9px 0', fontSize: 13, fontWeight: 700,
                              cursor: cargandoPlan ? 'not-allowed' : 'pointer',
                            }}
                          >
                            {cargandoPlan === plan.nombre ? 'Redirigiendo a MP...' : 'Suscribirme a este plan'}
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                  <button
                    onClick={() => setMostrarPlanes(false)}
                    style={{ background: 'none', border: 'none', color: '#94a3b8', fontSize: 13, cursor: 'pointer' }}
                  >
                    ← Volver
                  </button>
                </>
              ) : (
                <>
                  <div style={{ fontSize: 52, marginBottom: 16 }}>❌</div>
                  <h2 style={{ fontSize: 22, fontWeight: 800, color: '#1e3a8a', marginBottom: 10 }}>
                    Suscripción cancelada
                  </h2>
                  <p style={{ fontSize: 14, color: '#64748b', lineHeight: 1.65, marginBottom: 8 }}>
                    ¿Ya te re-suscribiste en Mercado Pago? Verificá el pago para reactivar tu cuenta.
                  </p>
                  {mensajeVerificacion && (
                    <div style={{
                      fontSize: 13,
                      color: mensajeVerificacion.includes('activada') || mensajeVerificacion.includes('Ingresando') ? '#15803d' : '#b91c1c',
                      background: mensajeVerificacion.includes('activada') || mensajeVerificacion.includes('Ingresando') ? '#f0fdf4' : '#fef2f2',
                      border: `1px solid ${mensajeVerificacion.includes('activada') || mensajeVerificacion.includes('Ingresando') ? '#bbf7d0' : '#fecaca'}`,
                      borderRadius: 10, padding: '11px 16px', marginBottom: 12, lineHeight: 1.5,
                    }}>
                      {mensajeVerificacion}
                    </div>
                  )}
                  <button
                    onClick={handleVerificarPago}
                    disabled={verificandoPago}
                    style={{
                      background: verificandoPago ? '#94a3b8' : '#5dc87a',
                      border: 'none', borderRadius: 10,
                      padding: '14px 24px', fontSize: 15, color: '#fff', cursor: verificandoPago ? 'not-allowed' : 'pointer',
                      fontWeight: 700, marginBottom: 12, width: '100%',
                      transition: 'background 0.2s',
                    }}
                  >
                    {verificandoPago ? '🔍 Buscando tu pago...' : '✓ Verificar pago'}
                  </button>
                  <p style={{ fontSize: 12, color: '#94a3b8', marginBottom: 12 }}>
                    ¿Todavía no te re-suscribiste?
                  </p>
                  <button
                    onClick={handleVerPlanes}
                    style={{
                      background: 'none', border: '1.5px solid #5dc87a', color: '#5dc87a',
                      borderRadius: 10, padding: '11px 20px', fontSize: 14, cursor: 'pointer',
                      fontWeight: 600, width: '100%', marginBottom: 12,
                    }}
                  >
                    Ver planes de suscripción →
                  </button>
                </>
              )
            ) : estadoSuscripcion === 'pausada' ? (
              <>
                <div style={{ fontSize: 52, marginBottom: 16 }}>⏸️</div>
                <h2 style={{ fontSize: 22, fontWeight: 800, color: '#1e3a8a', marginBottom: 10 }}>
                  Suscripción pausada
                </h2>
                <p style={{ fontSize: 14, color: '#64748b', lineHeight: 1.65, marginBottom: 24 }}>
                  Tu suscripción está pausada por un problema de pago.<br />
                  Regularizá el pago en Mercado Pago para restablecer el acceso.
                </p>
                <button
                  onClick={handleVerificarPago}
                  disabled={verificandoPago}
                  style={{
                    background: verificandoPago ? '#94a3b8' : '#5dc87a',
                    border: 'none', borderRadius: 10,
                    padding: '14px 24px', fontSize: 15, color: '#fff', cursor: verificandoPago ? 'not-allowed' : 'pointer',
                    fontWeight: 700, marginBottom: 12, width: '100%',
                    transition: 'background 0.2s',
                  }}
                >
                  {verificandoPago ? '🔍 Verificando...' : '✓ Verificar pago'}
                </button>
              </>
            ) : (
              <>
                <div style={{ fontSize: 52, marginBottom: 16 }}>⏳</div>
                <h2 style={{ fontSize: 22, fontWeight: 800, color: '#1e3a8a', marginBottom: 10 }}>
                  Activando tu cuenta
                </h2>
                <p style={{ fontSize: 14, color: '#64748b', lineHeight: 1.65, marginBottom: 8 }}>
                  Si ya completaste el pago en Mercado Pago, hacé click en <strong>"Verificar pago"</strong>.
                  Lo buscamos y activamos tu acceso al instante.
                </p>
                <p style={{ fontSize: 12, color: '#94a3b8', marginBottom: 24 }}>
                  ¿Todavía no pagaste?{' '}
                  <a href="/" style={{ color: '#5dc87a', fontWeight: 600, textDecoration: 'none' }}>
                    Volvé al inicio →
                  </a>
                </p>
                {mensajeVerificacion && (
                  <div style={{
                    fontSize: 13,
                    color: mensajeVerificacion.includes('activada') || mensajeVerificacion.includes('Ingresando') ? '#15803d' : '#b91c1c',
                    background: mensajeVerificacion.includes('activada') || mensajeVerificacion.includes('Ingresando') ? '#f0fdf4' : '#fef2f2',
                    border: `1px solid ${mensajeVerificacion.includes('activada') || mensajeVerificacion.includes('Ingresando') ? '#bbf7d0' : '#fecaca'}`,
                    borderRadius: 10, padding: '11px 16px', marginBottom: 18, lineHeight: 1.5,
                  }}>
                    {mensajeVerificacion}
                  </div>
                )}
                <button
                  onClick={handleVerificarPago}
                  disabled={verificandoPago}
                  style={{
                    background: verificandoPago ? '#94a3b8' : '#5dc87a',
                    border: 'none', borderRadius: 10,
                    padding: '14px 24px', fontSize: 15, color: '#fff', cursor: verificandoPago ? 'not-allowed' : 'pointer',
                    fontWeight: 700, marginBottom: 12, width: '100%',
                    transition: 'background 0.2s',
                  }}
                >
                  {verificandoPago ? '🔍 Buscando tu pago...' : '✓ Verificar pago'}
                </button>
              </>
            )}
            <button
              onClick={() => logout()}
              style={{
                background: 'none', border: '1px solid #e2e8f0', borderRadius: 10,
                padding: '11px 20px', fontSize: 14, color: '#64748b', cursor: 'pointer',
                width: '100%',
              }}
            >
              Cerrar sesión
            </button>
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
              <ProtectedRoute staffOnly={true} supervisorAllowed={true}>
                <PuntoVenta />
              </ProtectedRoute>
            ) : (
              <HomePage />
            )
          } />

          {isAuthenticated && selectedStoreSlug && (user?.is_staff || user?.is_superuser || user?.is_supervisor) && (
            <>
              <Route path="/punto-venta" element={<PuntoVenta />} />
            </>
          )}

          {isAuthenticated && selectedStoreSlug && (user?.is_staff || user?.is_superuser || user?.is_supervisor) && (
            <>
              <Route path="/ventas" element={
                <ProtectedRoute staffOnly={true} supervisorAllowed={true}>
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

          {isAuthenticated && selectedStoreSlug && (user?.is_superuser || user?.is_supervisor) && (
            <>
              <Route path="/productos" element={
                <ProtectedRoute adminOnly={true} supervisorAllowed={true}>
                  <Productos />
                </ProtectedRoute>
              } />
              <Route path="/etiquetas" element={<EtiquetasImpresion />} />
              <Route path="/registro-compras" element={
                <ProtectedRoute adminOnly={true} supervisorAllowed={true}>
                  <RegistroCompras />
                </ProtectedRoute>
              } />
              <Route path="/compras-stock" element={
                <ProtectedRoute adminOnly={true} supervisorAllowed={true}>
                  <ComprasStock />
                </ProtectedRoute>
              } />
              <Route path="/cierres-caja" element={
                <ProtectedRoute adminOnly={true} supervisorAllowed={true}>
                  <CierresCaja />
                </ProtectedRoute>
              } />
            </>
          )}

          {isAuthenticated && selectedStoreSlug && user?.is_superuser && (
            <>
              <Route path="/metricas-ventas" element={
                <ProtectedRoute adminOnly={true}>
                  <MetricasVentas />
                </ProtectedRoute>
              } />
              <Route path="/panel-administracion-tienda" element={
                <ProtectedRoute adminOnly={true}>
                  <PanelAdministracionTienda />
                </ProtectedRoute>
              } />
            </>
          )}

          {isAuthenticated && !selectedStoreSlug && (
            <Route path="*" element={<Navigate to="/" replace />} />
          )}

          {/* Rutas públicas (sin autenticación) */}
          <Route path="/registro" element={<Registro />} />
          <Route path="/nueva-contrasena" element={<NuevaContrasena />} />
          <Route path="/suscripcion/resultado" element={<SuscripcionResultado />} />

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
