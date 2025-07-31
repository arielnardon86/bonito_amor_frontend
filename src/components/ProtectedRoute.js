// Store/frontend/src/components/ProtectedRoute.js
import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../AuthContext';

const ProtectedRoute = ({ children, adminOnly = false, staffOnly = false }) => {
    const { isAuthenticated, user, loading } = useAuth();

    if (loading) {
        // Muestra un mensaje de carga mientras se verifica el estado de autenticación
        return <div style={{ textAlign: 'center', marginTop: '50px' }}>Cargando...</div>;
    }

    // Si no está autenticado, redirige al login con el slug por defecto
    if (!isAuthenticated) {
        console.log("ProtectedRoute: No autenticado, redirigiendo a login.");
        return <Navigate to="/login/bonito-amor" replace />; // Redirige a la ruta de login con un slug
    }

    // Asegurarse de que 'user' no sea null/undefined antes de acceder a sus propiedades
    // Esto es especialmente importante si 'loading' cambia a false antes de que 'user' se haya cargado completamente
    if (!user) {
        console.log("ProtectedRoute: Autenticado pero datos de usuario no disponibles, redirigiendo a login.");
        return <Navigate to="/login/bonito-amor" replace />; // Redirige a la ruta de login con un slug
    }


    // Lógica de permisos
    // 1. Si se requiere que sea admin (superuser)
    if (adminOnly) {
        if (!user.is_superuser) {
            console.log("ProtectedRoute: No es superusuario, redirigiendo a la página principal.");
            return <Navigate to="/" replace />; // Redirige a la raíz si no tiene permisos de admin
        }
        return children;
    }

    // 2. Si se requiere que sea staff (pero no adminOnly, ya que eso se manejó arriba)
    if (staffOnly) {
        if (!user.is_staff) {
            console.log("ProtectedRoute: No es staff, redirigiendo a la página principal.");
            return <Navigate to="/" replace />; // Redirige a la raíz si no tiene permisos de staff
        }
        return children;
    }

    // 3. Si no se especificaron adminOnly ni staffOnly (ruta por defecto),
    // cualquier usuario autenticado puede acceder.
    console.log("ProtectedRoute: No se requieren roles específicos, usuario autenticado. Concediendo acceso.");
    return children;
};

export default ProtectedRoute;
