import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { useAuth } from '../AuthContext';
import Swal from 'sweetalert2'; // <-- NUEVO: Importamos SweetAlert2

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
    const [nextPageUrl, setNextPageUrl] = useState(null);
    const [prevPageUrl, setPrevPageUrl] = useState(null);
    const [currentPageNumber, setCurrentPageNumber] = useState(1);

    const fetchCompras = useCallback(async (pageUrl = `${BASE_API_ENDPOINT}/api/compras/`) => {
        if (!token || !selectedStoreSlug) {
            setLoadingCompras(false);
            return;
        }

        setLoadingCompras(true);
        try {
            const response = await axios.get(pageUrl, {
                headers: { 'Authorization': `Bearer ${token}` },
                params: {
                    tienda_slug: selectedStoreSlug,
                }
            });
            setCompras(response.data.results);
            setNextPageUrl(response.data.next);
            setPrevPageUrl(response.data.previous);
            
            if (pageUrl.includes('page=')) {
                const urlParams = new URLSearchParams(new URL(pageUrl).search);
                setCurrentPageNumber(parseInt(urlParams.get('page')) || 1);
            } else {
                setCurrentPageNumber(1);
            }

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
            Swal.fire('Error', 'Por favor, completa la fecha y el total del egreso.', 'error');
            return;
        }

        Swal.fire({
            title: '¿Confirmar registro?',
            text: `Se registrará un egreso de $${newPurchaseTotal} en la fecha ${newPurchaseDate}.`,
            icon: 'question',
            showCancelButton: true,
            confirmButtonText: 'Sí, registrar',
            cancelButtonText: 'Cancelar',
        }).then(async (result) => {
            if (result.isConfirmed) {
                const purchaseData = {
                    fecha_compra: newPurchaseDate,
                    total: newPurchaseTotal,
                    proveedor: newPurchaseConcept,
                    tienda_slug: selectedStoreSlug,
                };
        
                try {
                    await axios.post(`${BASE_API_ENDPOINT}/api/compras/`, purchaseData, {
                        headers: {
                            'Authorization': `Bearer ${token}`,
                            'Content-Type': 'application/json',
                        }
                    });
                    Swal.fire('¡Registrado!', 'El egreso se ha registrado exitosamente.', 'success');
                    fetchCompras();
                    setNewPurchaseDate('');
                    setNewPurchaseTotal('');
                    setNewPurchaseConcept('');
                } catch (err) {
                    Swal.fire('Error', 'Error al registrar el egreso: ' + (err.response ? JSON.stringify(err.response.data) : err.message), 'error');
                    setError('Error al registrar el egreso: ' + (err.response ? JSON.stringify(err.response.data) : err.message));
                    console.error("Error creating purchase:", err.response || err.message);
                }
            }
        });
    };
    
    const handleDeleteCompra = async (compraId) => {
        Swal.fire({
            title: '¿Estás seguro?',
            text: 'Estás a punto de eliminar este egreso. Esta acción no se puede deshacer.',
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#dc3545',
            cancelButtonColor: '#6c757d',
            confirmButtonText: 'Sí, eliminar',
            cancelButtonText: 'Cancelar',
        }).then(async (result) => {
            if (result.isConfirmed) {
                try {
                    await axios.delete(`${BASE_API_ENDPOINT}/api/compras/${compraId}/`, {
                        headers: { 'Authorization': `Bearer ${token}` }
                    });
                    Swal.fire('¡Eliminado!', 'El egreso ha sido eliminado.', 'success');
                    fetchCompras();
                } catch (err) {
                    Swal.fire('Error', 'Error al eliminar el egreso: ' + (err.response ? JSON.stringify(err.response.data) : err.message), 'error');
                    setError('Error al eliminar el egreso: ' + (err.response ? JSON.stringify(err.response.data) : err.message));
                    console.error("Error deleting purchase:", err.response || err.message);
                }
            }
        });
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
        return <div style={styles.loadingMessage}>Cargando registros de egresos...</div>;
    }

    if (error) {
        return <div style={styles.errorMessage}>{error}</div>;
    }

    return (
        <div style={styles.container}>
            <h1>Registro de Egresos ({selectedStoreSlug})</h1>

            {/* Formulario de registro de nuevos egresos */}
            <div style={styles.formContainer}>
                <h2>Registrar Egresos</h2>
                <form onSubmit={handleCreateCompra} style={styles.form}>
                    <div style={styles.formGroup}>
                        <label style={styles.formLabel}>Fecha de egreso*</label>
                        <input
                            type="date"
                            value={newPurchaseDate}
                            onChange={(e) => setNewPurchaseDate(e.target.value)}
                            required
                            style={styles.input}
                        />
                    </div>
                    <div style={styles.formGroup}>
                        <label style={styles.formLabel}>Monto*</label>
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
                        <label style={styles.formLabel}>Concepto</label>
                        <input
                            type="text"
                            value={newPurchaseConcept}
                            onChange={(e) => setNewPurchaseConcept(e.target.value)}
                            style={styles.input}
                        />
                    </div>
                    <div style={styles.formGroup}>
                        <button type="submit" style={styles.submitButton}>Registrar Egreso</button>
                    </div>
                </form>
            </div>

            {/* Listado de egresos */}
            <div style={styles.tableContainer}>
                <h2>Registro de Egresos</h2>
                {compras.length > 0 ? (
                    <div style={styles.tableResponsive}>
                        <table style={styles.table}>
                            <thead>
                                <tr>
                                    <th style={styles.th}>Fecha</th>
                                    <th style={styles.th}>Monto</th>
                                    <th style={styles.th}>Concepto</th>
                                    <th style={styles.th}>Registrado por</th>
                                    <th style={styles.th}>Acciones</th>
                                </tr>
                            </thead>
                            <tbody>
                                {compras.map((compra) => (
                                    <tr key={compra.id}>
                                        <td style={styles.td}>{new Date(compra.fecha_compra).toLocaleDateString()}</td>
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
                    </div>
                ) : (
                    <p style={styles.noDataMessage}>No hay egresos registrados para esta tienda.</p>
                )}
                <div style={styles.paginationContainer}>
                    <button onClick={() => fetchCompras(prevPageUrl)} disabled={!prevPageUrl} style={styles.paginationButton}>
                        Anterior
                    </button>
                    <span style={styles.pageNumber}>Página {currentPageNumber}</span>
                    <button onClick={() => fetchCompras(nextPageUrl)} disabled={!nextPageUrl} style={styles.paginationButton}>
                        Siguiente
                    </button>
                </div>
            </div>
            <style>
                {`
                @media (max-width: 768px) {
                    [style*="formContainer"] {
                        width: 100%;
                    }
                    [style*="form"] {
                        flex-direction: column;
                    }
                    [style*="formGroup"] {
                        min-width: unset;
                    }
                    [style*="submitButton"] {
                        width: 100%;
                    }
                    [style*="tableContainer"] {
                        overflow-x: auto;
                    }
                    [style*="table"] {
                        width: 100%;
                        white-space: nowrap;
                    }
                    [style*="deleteButton"] {
                        width: 100%;
                    }
                }
                `}
            </style>
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
        display: 'flex',
        flexDirection: 'column',
    },
    formLabel: {
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
    tableResponsive: {
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
    paginationContainer: {
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: '20px',
        gap: '10px',
    },
    paginationButton: {
        padding: '8px 15px',
        backgroundColor: '#007bff',
        color: 'white',
        border: 'none',
        borderRadius: '5px',
        cursor: 'pointer',
        fontSize: '1em',
        transition: 'background-color 0.3s ease',
    },
    pageNumber: {
        fontSize: '1em',
        fontWeight: 'bold',
        color: '#555',
        margin: '0 10px',
    }
};

export default RegistroCompras;