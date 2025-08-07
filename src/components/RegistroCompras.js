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
    const [newPurchaseSupplier, setNewPurchaseSupplier] = useState('');

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
            setError('Error al cargar las compras: ' + (err.response ? JSON.stringify(err.response.data) : err.message));
            console.error('Error fetching purchases:', err.response || err.message);
        } finally {
            setLoadingCompras(false);
        }
    }, [token, selectedStoreSlug]);

    const handleCreateCompra = async (e) => {
        e.preventDefault();
        
        if (!newPurchaseDate || !newPurchaseTotal || !selectedStoreSlug) {
            alert("Por favor, completa la fecha y el total de la compra.");
            return;
        }

        const purchaseData = {
            fecha_compra: newPurchaseDate,
            total: newPurchaseTotal,
            proveedor: newPurchaseSupplier,
            tienda_slug: selectedStoreSlug,
        };

        try {
            await axios.post(`${BASE_API_ENDPOINT}/api/compras/`, purchaseData, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                }
            });
            alert('Compra registrada exitosamente.');
            fetchCompras();
            setNewPurchaseDate('');
            setNewPurchaseTotal('');
            setNewPurchaseSupplier('');
        } catch (err) {
            setError('Error al registrar la compra: ' + (err.response ? JSON.stringify(err.response.data) : err.message));
            console.error("Error creating purchase:", err.response || err.message);
        }
    };
    
    const handleDeleteCompra = async (compraId) => {
        if (window.confirm('¿Estás seguro de que quieres eliminar esta compra?')) {
            try {
                await axios.delete(`${BASE_API_ENDPOINT}/api/compras/${compraId}/`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                alert('Compra eliminada exitosamente.');
                fetchCompras();
            } catch (err) {
                setError('Error al eliminar la compra: ' + (err.response ? JSON.stringify(err.response.data) : err.message));
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
        return <div style={styles.loadingMessage}>Cargando datos de usuario...</div>;
    }

    if (!isAuthenticated || (!user.is_superuser && !user.is_staff)) {
        return <div style={styles.accessDeniedMessage}>Acceso denegado. Solo el personal autorizado puede ver esta página.</div>;
    }

    if (!selectedStoreSlug) {
        return <div style={styles.noStoreSelectedMessage}>Por favor, selecciona una tienda.</div>;
    }

    if (loadingCompras) {
        return <div style={styles.loadingMessage}>Cargando registros de compras...</div>;
    }

    if (error) {
        return <div style={styles.errorMessage}>{error}</div>;
    }

    return (
        <div style={styles.container}>
            <h1>Registro de Compras ({selectedStoreSlug})</h1>

            {/* Formulario de registro de nuevas compras */}
            <div style={styles.formContainer}>
                <h2>Registrar Nueva Compra</h2>
                <form onSubmit={handleCreateCompra} style={styles.form}>
                    <div style={styles.formGroup}>
                        <label style={styles.formLabel}>Fecha de Compra*</label>
                        <input
                            type="date"
                            value={newPurchaseDate}
                            onChange={(e) => setNewPurchaseDate(e.target.value)}
                            required
                            style={styles.input}
                        />
                    </div>
                    <div style={styles.formGroup}>
                        <label style={styles.formLabel}>Total*</label>
                        <input
                            type="number"
                            value={newPurchaseTotal}
                            onChange={(e) => setNewPurchaseTotal(e.target.value)}
                            required
                            style={styles.input}
                            step="0.01"
                            min="0"
                        />
                    </div>
                    <div style={styles.formGroup}>
                        <label style={styles.formLabel}>Proveedor</label>
                        <input
                            type="text"
                            value={newPurchaseSupplier}
                            onChange={(e) => setNewPurchaseSupplier(e.target.value)}
                            style={styles.input}
                        />
                    </div>
                    <div style={styles.formGroup}>
                        <button type="submit" style={styles.submitButton}>Registrar Compra</button>
                    </div>
                </form>
            </div>

            {/* Listado de compras */}
            <div style={styles.tableContainer}>
                <h2>Compras Registradas</h2>
                {compras.length > 0 ? (
                    <table style={styles.table}>
                        <thead>
                            <tr>
                                <th style={styles.th}>ID</th>
                                <th style={styles.th}>Fecha</th>
                                <th style={styles.th}>Total</th>
                                <th style={styles.th}>Proveedor</th>
                                <th style={styles.th}>Registrado por</th>
                                <th style={styles.th}>Acciones</th>
                            </tr>
                        </thead>
                        <tbody>
                            {compras.map((compra) => (
                                <tr key={compra.id}>
                                    <td style={styles.td}>{compra.id}</td>
                                    <td style={styles.td}>{compra.fecha_compra}</td>
                                    <td style={styles.td}>${parseFloat(compra.total).toFixed(2)}</td>
                                    <td style={styles.td}>{compra.proveedor || 'N/A'}</td>
                                    <td style={styles.td}>{compra.usuario.username}</td>
                                    <td style={styles.td}>
                                        <button onClick={() => handleDeleteCompra(compra.id)} style={styles.deleteButton}>Eliminar</button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                ) : (
                    <p style={styles.noDataMessage}>No hay compras registradas para esta tienda.</p>
                )}
            </div>
        </div>
    );
};

const styles = {
    container: {
        padding: '20px',
        fontFamily: 'Inter, sans-serif',
        maxWidth: '1200px',
        margin: '20px auto',
        backgroundColor: '#f8f9fa',
        borderRadius: '8px',
        boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
        color: '#333',
    },
    loadingMessage: {
        padding: '20px',
        textAlign: 'center',
        color: '#555',
        fontSize: '1.1em',
    },
    accessDeniedMessage: {
        color: '#dc3545',
        marginBottom: '10px',
        padding: '20px',
        border: '1px solid #dc3545',
        textAlign: 'center',
        borderRadius: '8px',
        backgroundColor: '#ffe3e6',
        fontWeight: 'bold',
    },
    noStoreSelectedMessage: {
        padding: '50px',
        textAlign: 'center',
        color: '#777',
        fontSize: '1.2em',
    },
    errorMessage: {
        color: '#dc3545',
        marginBottom: '20px',
        border: '1px solid #dc3545',
        padding: '15px',
        borderRadius: '8px',
        backgroundColor: '#ffe3e6',
        textAlign: 'center',
        fontWeight: 'bold',
    },
    formContainer: {
        backgroundColor: '#ffffff',
        padding: '20px',
        borderRadius: '8px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
        marginBottom: '30px',
    },
    form: {
        display: 'flex',
        flexWrap: 'wrap',
        gap: '20px',
        alignItems: 'flex-end',
    },
    formGroup: {
        flex: 1,
        minWidth: '200px',
    },
    formLabel: {
        display: 'block',
        marginBottom: '5px',
        fontWeight: 'bold',
        color: '#555',
    },
    input: {
        width: '100%',
        padding: '10px',
        border: '1px solid #ccc',
        borderRadius: '4px',
    },
    submitButton: {
        padding: '12px 20px',
        backgroundColor: '#007bff',
        color: 'white',
        border: 'none',
        borderRadius: '5px',
        cursor: 'pointer',
        fontWeight: 'bold',
        transition: 'background-color 0.3s ease',
        width: '100%',
    },
    tableContainer: {
        backgroundColor: '#ffffff',
        padding: '20px',
        borderRadius: '8px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
        overflowX: 'auto',
    },
    table: {
        width: '100%',
        borderCollapse: 'collapse',
        textAlign: 'left',
    },
    th: {
        padding: '12px',
        borderBottom: '2px solid #dee2e6',
        backgroundColor: '#f2f2f2',
        fontWeight: 'bold',
        color: '#333',
    },
    td: {
        padding: '12px',
        borderBottom: '1px solid #e9ecef',
        verticalAlign: 'middle',
    },
    deleteButton: {
        padding: '8px 12px',
        backgroundColor: '#dc3545',
        color: 'white',
        border: 'none',
        borderRadius: '4px',
        cursor: 'pointer',
        fontWeight: 'bold',
        transition: 'background-color 0.2s ease',
    },
    noDataMessage: {
        textAlign: 'center',
        marginTop: '20px',
        color: '#777',
        fontStyle: 'italic',
    },
};

export default RegistroCompras;