// Store/frontend/src/components/ProtectedRoute.js
import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../AuthContext';

const ProtectedRoute = ({ children, adminOnly = false, staffOnly = false }) => {
    const { isAuthenticated, user, loading } = useAuth();

    if (loading) {
        return <div style={{ textAlign: 'center', marginTop: '50px' }}>Cargando...</div>;
    }

    if (!isAuthenticated) {
        console.log("ProtectedRoute: Not authenticated, redirecting to login.");
        return <Navigate to="/login" replace />;
    }

    // Asegurarse de que 'user' no sea null/undefined antes de acceder a sus propiedades
    // Esto es especialmente importante si 'loading' cambia a false antes de que 'user' se haya cargado completamente
    if (!user) {
        // En una aplicación real, esto podría significar un error en la carga del usuario
        // o un breve lapso entre isAuthenticated=true y user data cargada.
        // Podrías redirigir a login o mostrar un error. Por ahora, asumimos que AuthContext
        // maneja bien la carga de 'user' cuando isAuthenticated es true.
        console.log("ProtectedRoute: Authenticated but user data not available, redirecting to home (or login).");
        return <Navigate to="/login" replace />; // O a "/" si tu ruta "/" es accesible por default
    }


    // Lógica de permisos
    // 1. Si se requiere que sea admin (superuser)
    if (adminOnly) {
        if (!user.is_superuser) {
            console.log("ProtectedRoute: Not superuser, redirecting to home.");
            return <Navigate to="/" replace />;
        }
        // Si es adminOnly y es superusuario, no necesita más verificaciones de staff, pasa
        return children;
    }

    // 2. Si se requiere que sea staff (pero no adminOnly, ya que eso se manejó arriba)
    // is_staff incluye a is_superuser, así que esto cubrirá a superusuarios también
    if (staffOnly) {
        if (!user.is_staff) {
            console.log("ProtectedRoute: Not staff, redirecting to home.");
            return <Navigate to="/" replace />;
        }
        // Si es staffOnly y es staff (o superusuario), no necesita más verificaciones, pasa
        return children;
    }

    // 3. Si no se especificaron adminOnly ni staffOnly (ruta por defecto),
    // cualquier usuario autenticado puede acceder.
    console.log("ProtectedRoute: No specific roles required, user authenticated. Granting access.");
    return children;
};

export default ProtectedRoute;