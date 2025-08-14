// BONITO_AMOR/frontend/src/components/RegistroCompras.js
import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { useAuth } from '../AuthContext';

const API_BASE_URL = process.env.REACT_APP_API_URL; 

const normalizeApiUrl = (url) => {
    let normalizedUrl = url;
    if (normalizedUrl.endsWith('/api/') || normalizedUrl.endsWith('/api')) {
        normalizedUrl = normalizedUrl.replace(/\/api\/?$/, '');
    }
    if (normalizedUrl.endsWith('/')) {
        normalizedUrl = normalizedUrl.slice(0, -1);
    }
    return normalizedUrl;
};

const BASE_API_ENDPOINT = normalizeApiUrl(API_BASE_URL);

const RegistroCompras = () => {
    const { token, isAuthenticated, user, loading: authLoading, selectedStoreSlug } = useAuth();
    const [compras, setCompras] = useState([]);
    const [loadingCompras, setLoadingCompras] = useState(true);
    const [error, setError] = useState(null);
    const [newPurchaseDate, setNewPurchaseDate] = useState('');
    const [newPurchaseTotal, setNewPurchaseTotal] = useState('');
    const [newPurchaseConcept, setNewPurchaseConcept] = useState('');

    const fetchCompras = useCallback(async () => {
        if (!token || !selectedStoreSlug) {
            setLoadingCompras(false);
            return;
        }

        setLoadingCompras(true);
        try {
            const response = await axios.get(`${BASE_API_ENDPOINT}/api/compras/`, {
                headers: { 'Authorization': `Bearer ${token}` },
                params: {
                    tienda_slug: selectedStoreSlug
                }
            });
            setCompras(response.data.results);
        } catch (err) {
            setError('Error al cargar los egresos: ' + (err.response ? JSON.stringify(err.response.data) : err.message));
            console.error('Error fetching purchases:', err.response || err.message);
        } finally {
            setLoadingCompras(false);
        }
    }, [token, selectedStoreSlug]);

    const handleCreateCompra = async (e) => {
        e.preventDefault();
        
        if (!newPurchaseDate || !newPurchaseTotal || !selectedStoreSlug) {
            alert("Por favor, completa la fecha y el total del egreso.");
            return;
        }

        const purchaseData = {
            fecha_compra: newPurchaseDate,
            total: newPurchaseTotal,
            proveedor: newPurchaseConcept, // El backend espera 'proveedor' para el concepto
            tienda_slug: selectedStoreSlug,
        };

        try {
            await axios.post(`${BASE_API_ENDPOINT}/api/compras/`, purchaseData, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                }
            });
            alert('Egreso registrado exitosamente.');
            fetchCompras();
            setNewPurchaseDate('');
            setNewPurchaseTotal('');
            setNewPurchaseConcept('');
        } catch (err) {
            setError('Error al registrar el egreso: ' + (err.response ? JSON.stringify(err.response.data) : err.message));
            console.error("Error creating purchase:", err.response || err.message);
        }
    };
    
    const handleDeleteCompra = async (compraId) => {
        if (window.confirm('¿Estás seguro de que quieres eliminar este egreso?')) {
            try {
                await axios.delete(`${BASE_API_ENDPOINT}/api/compras/${compraId}/`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                alert('Egreso eliminado exitosamente.');
                fetchCompras();
            } catch (err) {
                setError('Error al eliminar el egreso: ' + (err.response ? JSON.stringify(err.response.data) : err.message));
                console.error("Error deleting purchase:", err.response || err.message);
            }
        }
    };

    useEffect(() => {
        if (!authLoading && isAuthenticated && user && (user.is_superuser || user.is_staff) && selectedStoreSlug) {
            fetchCompras();
        } else if (!authLoading && (!isAuthenticated || !user || (!user.is_superuser && !user.is_staff))) {
            setError("Acceso denegado. Solo el personal autorizado puede ver esta página.");
            setLoadingCompras(false);
        } else if (!authLoading && isAuthenticated && user && (user.is_superuser || user.is_staff) && !selectedStoreSlug) {
            setLoadingCompras(false);
        }
    }, [isAuthenticated, user, authLoading, selectedStoreSlug, fetchCompras]);

    if (authLoading || (isAuthenticated && !user)) {
        return <div className="loading-message">Cargando datos de usuario...</div>;
    }

    if (!isAuthenticated || (!user.is_superuser && !user.is_staff)) {
        return <div className="access-denied-message">Acceso denegado. Solo el personal autorizado puede ver esta página.</div>;
    }

    if (!selectedStoreSlug) {
        return <div className="no-store-selected-message">Por favor, selecciona una tienda.</div>;
    }

    if (loadingCompras) {
        return <div className="loading-message">Cargando registros de egresos...</div>;
    }

    if (error) {
        return <div className="error-message">{error}</div>;
    }

    return (
        <div className="container">
            <h1>Registro de Egresos ({selectedStoreSlug})</h1>

            {/* Formulario de registro de nuevos egresos */}
            <div className="form-container">
                <h2>Registrar Egresos</h2>
                <form onSubmit={handleCreateCompra} className="form-mobile">
                    <div className="form-group">
                        <label className="form-label">Fecha de egreso*</label>
                        <input
                            type="date"
                            value={newPurchaseDate}
                            onChange={(e) => setNewPurchaseDate(e.target.value)}
                            required
                            className="input-field"
                        />
                    </div>
                    <div className="form-group">
                        <label className="form-label">Monto*</label>
                        <input
                            type="number"
                            value={newPurchaseTotal}
                            onChange={(e) => setNewPurchaseTotal(e.target.value)}
                            required
                            className="input-field"
                            step="0.01"
                            min="0"
                        />
                    </div>
                    <div className="form-group">
                        <label className="form-label">Concepto</label>
                        <input
                            type="text"
                            value={newPurchaseConcept}
                            onChange={(e) => setNewPurchaseConcept(e.target.value)}
                            className="input-field"
                        />
                    </div>
                    <div className="form-group">
                        <button type="submit" className="submit-button-desktop">Registrar Egreso</button>
                    </div>
                </form>
            </div>

            {/* Listado de egresos */}
            <div className="table-container">
                <h2>Registro de Egresos</h2>
                {compras.length > 0 ? (
                    <div className="table-responsive">
                        <table className="table">
                            <thead>
                                <tr>
                                    <th className="th">Fecha</th>
                                    <th className="th">Monto</th>
                                    <th className="th">Concepto</th>
                                    <th className="th">Registrado por</th>
                                    <th className="th">Acciones</th>
                                </tr>
                            </thead>
                            <tbody>
                                {compras.map((compra) => (
                                    <tr key={compra.id}>
                                        <td className="td">{new Date(compra.fecha_compra).toLocaleDateString()}</td>
                                        <td className="td">${parseFloat(compra.total).toFixed(2)}</td>
                                        <td className="td">{compra.proveedor || 'N/A'}</td>
                                        <td className="td">{compra.usuario.username}</td>
                                        <td className="td">
                                            <button onClick={() => handleDeleteCompra(compra.id)} className="delete-button-desktop">Eliminar</button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                ) : (
                    <p className="no-data-message">No hay egresos registrados para esta tienda.</p>
                )}
            </div>
        </div>
    );
};

export default RegistroCompras;