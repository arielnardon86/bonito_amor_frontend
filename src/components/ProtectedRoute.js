// Store/frontend/src/components/ProtectedRoute.js
import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../AuthContext';

const ProtectedRoute = ({ children, adminOnly = false, staffOnly = false, supervisorAllowed = false }) => {
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
