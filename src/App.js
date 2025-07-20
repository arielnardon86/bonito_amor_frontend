// BONITO_AMOR/frontend/src/App.js
import React, { useState, useEffect } from 'react';
import { Routes, Route, Link, Navigate } from 'react-router-dom';

import Productos from './components/Productos';
import PuntoVenta from './components/PuntoVenta';
import Login from './components/Login';
import UserManagement from './components/UserManagement';
import ProtectedRoute from './components/ProtectedRoute'; // Asegúrate de que este componente exista y funcione correctamente
import { AuthProvider, useAuth } from './AuthContext'; // Asegúrate de que AuthContext exista
import { SalesProvider } from './components/SalesContext'; // Asegúrate de que SalesContext exista

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
      // Cierra el menú móvil si la ventana se agranda más allá de 768px
      if (window.innerWidth > 768 && isOpen) { 
        setIsOpen(false);
      }
    };
    window.addEventListener('resize', handleResize);
    // Limpia el event listener al desmontar el componente
    return () => window.removeEventListener('resize', handleResize);
  }, [isOpen]); // Dependencia en isOpen para re-evaluar cuando cambia

  return (
    <nav className="navbar">
      <div className="navbar-logo">
        <Link to="/">
          <img src="/bonito-amor-logo.jpg" alt="Bonito Amor Logo" className="app-logo-image" />
        </Link>
      </div>

      {isAuthenticated && (
        <>
          {/* Icono de menú para dispositivos móviles */}
          <div className="menu-icon" onClick={toggleMenu}>
            <FontAwesomeIcon icon={isOpen ? faTimes : faBars} /> 
          </div>

          {/* Enlaces de navegación, con clase 'active' para menú móvil abierto */}
          <ul className={isOpen ? "nav-links active" : "nav-links"}>
            {/* Punto de Venta: Accesible para Staff y Superusuarios */}
            {user && (user.is_staff || user.is_superuser) && ( // Solo si es staff o superusuario
                <li onClick={() => setIsOpen(false)}><Link to="/">Punto de Venta</Link></li>
            )}
            
            {/* Gestión de Productos, Usuarios, Métricas, Ventas: Solo para Superusuarios */}
            {user && user.is_superuser && ( // Solo si es superusuario
                <>
                    <li onClick={() => setIsOpen(false)}><Link to="/productos">Gestión de Productos</Link></li>
                    <li onClick={() => setIsOpen(false)}><Link to="/users">Gestión de Usuarios</Link></li>
                    <li onClick={() => setIsOpen(false)}><Link to="/metricas-ventas">Métricas de Ventas</Link></li>
                    <li onClick={() => setIsOpen(false)}><Link to="/ventas">Listado de Ventas</Link></li>
                </>
            )}
            
            {/* Mensaje de bienvenida y botón de cerrar sesión */}
            {user && ( // Asegurarse de que `user` existe antes de acceder a `username`
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

// Nuevo componente para contener el contenido que depende de AuthContext
// Esto asegura que AuthProvider y SalesProvider envuelvan todo una sola vez.
function AppContent() {
  const { isAuthenticated, loading } = useAuth(); // Solo necesitamos isAuthenticated y loading aquí para la redirección

  // Muestra un mensaje de carga mientras se determina el estado de autenticación
  if (loading) {
    return <div style={{ padding: '20px', textAlign: 'center' }}>Cargando autenticación...</div>;
  }

  return (
    <>
      <Navbar /> {/* Navbar necesita estar dentro de AuthProvider para usar useAuth */}
      <div className="container" style={{ padding: '20px' }}>
        <Routes>
          {/* Ruta de Login siempre accesible */}
          <Route path="/login" element={<Login />} />

          {/* Redirige a /login si no está autenticado y no está en la ruta de login */}
          {!isAuthenticated && <Route path="*" element={<Navigate to="/login" replace />} />}

          {/* Rutas Protegidas: Solo se renderizan si el usuario está autenticado */}
          {isAuthenticated && (
            <>
              {/* Ruta por defecto ('/'): Punto de Venta. Accesible SOLO por Staff y Superusuarios */}
              <Route path="/" element={
                <ProtectedRoute staffOnly={true}>
                  <PuntoVenta />
                </ProtectedRoute>
              } />

              {/* Gestión de Productos: Solo para Superusuarios */}
              <Route path="/productos" element={
                <ProtectedRoute adminOnly={true}>
                  <Productos />
                </ProtectedRoute>
              } />
              
              {/* Gestión de Usuarios: Solo para Superusuarios */}
              <Route
                  path="/users"
                  element={
                      <ProtectedRoute adminOnly={true}>
                          <UserManagement />
                      </ProtectedRoute>
                  }
              />
              
              {/* Métricas de Ventas: Solo para Superusuarios */}
              <Route
                  path="/metricas-ventas"
                  element={
                      <ProtectedRoute adminOnly={true}>
                          <MetricasVentas />
                      </ProtectedRoute>
                  }
              />

              {/* Listado de Ventas: Solo para Superusuarios */}
              <Route
                  path="/ventas"
                  element={
                      <ProtectedRoute adminOnly={true}>
                          <VentasPage />
                      </ProtectedRoute>
                  }
              />

              {/* Catch-all para cualquier otra ruta autenticada no definida, redirige a la página principal */}
              {/* Esto asegura que los usuarios autenticados no vean una página en blanco si van a una ruta no existente */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </>
          )}
        </Routes>
      </div>
    </>
  );
}

// El componente App ahora solo se encarga de envolver toda la aplicación con los Context Providers
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
