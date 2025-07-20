// Store/frontend/src/App.js
import React, { useState, useEffect } from 'react';
import { Routes, Route, Link, Navigate } from 'react-router-dom'; // Importa Navigate

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
            
            {/* Mensaje de bienvenida y cerrar sesión */}
            {user && ( // Asegurarse de que `user` existe
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


function App() {
  const { isAuthenticated, user, loading } = useAuth(); // Obtener estado de autenticación y carga

  // Manejo de redirección inicial si el usuario no está autenticado o no tiene permiso para la ruta base
  // Esto previene que se muestre una página en blanco antes de redirigir al login
  if (!loading && !isAuthenticated) {
    return (
      <AuthProvider>
        <Navbar />
        <div className="container" style={{ padding: '20px' }}>
          <SalesProvider>
            <Routes>
              <Route path="/login" element={<Login />} />
              <Route path="*" element={<Navigate to="/login" replace />} /> {/* Redirige todo lo demás a login si no autenticado */}
            </Routes>
          </SalesProvider>
        </div>
      </AuthProvider>
    );
  }

  return (
    <AuthProvider>
      <Navbar />
      <div className="container" style={{ padding: '20px' }}>
        <SalesProvider> 
          <Routes>
            <Route path="/login" element={<Login />} />
            
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
                    <ProtectedRoute adminOnly={true}> {/* Cambiado a adminOnly */}
                        <MetricasVentas />
                    </ProtectedRoute>
                }
            />

            {/* Listado de Ventas: Solo para Superusuarios */}
            <Route
                path="/ventas"
                element={
                    <ProtectedRoute adminOnly={true}> {/* Cambiado a adminOnly */}
                        <VentasPage />
                    </ProtectedRoute>
                }
            />

            {/* Catch-all para rutas no definidas si el usuario está logueado pero no tiene permisos */}
            {isAuthenticated && !loading && user && (user.is_staff || user.is_superuser) && (
                <Route path="*" element={<Navigate to="/" replace />} /> // Redirige a / (Punto de Venta) si no tiene permiso para la ruta
            )}
             {/* Fallback general si no hay autenticación y no es la ruta de login */}
            {!isAuthenticated && !loading && <Route path="*" element={<Navigate to="/login" replace />} />}

          </Routes>
        </SalesProvider>
      </div>
    </AuthProvider>
  );
}

export default App;