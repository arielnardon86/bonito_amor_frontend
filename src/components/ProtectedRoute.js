// Store/frontend/src/components/ProtectedRoute.js
import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../AuthContext';

const ProtectedRoute = ({ children, adminOnly = false, staffOnly = false, supervisorAllowed = false, platformAdminOnly = false }) => {
    const { isAuthenticated, user, loading } = useAuth();

    if (loading) {
        return <div style={{ textAlign: 'center', marginTop: '50px' }}>Cargando...</div>;
    }

    if (!isAuthenticated) {
        return <Navigate to="/login" replace />;
    }

    if (!user) {
        return <Navigate to="/login" replace />;
    }

    if (platformAdminOnly) {
        // NO es is_superuser: todos los dueños de tienda se registran con
        // is_superuser=True (son dueños de SU tienda, no de Total Stock) --
        // ver User.es_operador_plataforma en el backend. Gate exclusivo para
        // el panel de administración de clientes SaaS.
        if (!user.es_operador_plataforma) {
            return <Navigate to="/" replace />;
        }
        return children;
    }

    if (adminOnly) {
        const ok = user.is_superuser || (supervisorAllowed && user.is_supervisor);
        if (!ok) {
            return <Navigate to="/" replace />;
        }
        return children;
    }

    if (staffOnly) {
        const ok = user.is_staff || user.is_superuser || (supervisorAllowed && user.is_supervisor);
        if (!ok) {
            return <Navigate to="/" replace />;
        }
        return children;
    }

    return children;
};

export default ProtectedRoute;
