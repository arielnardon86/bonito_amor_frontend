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
    const { user, token, isAuthenticated, loading: authLoading, selectedStoreSlug, stores } = useAuth();

    const [compras, setCompras] = useState([]);
    const [loadingCompras, setLoadingCompras] = useState(true);
    const [error, setError] = useState(null);

    const [newPurchaseDate, setNewPurchaseDate] = useState('');
    const [newPurchaseAmount, setNewPurchaseAmount] = useState('');
    const [newPurchaseSupplier, setNewPurchaseSupplier] = useState('');

    const [showConfirmModal, setShowConfirmModal] = useState(false);
    const [confirmMessage, setConfirmMessage] = useState('');
    const [confirmAction, setConfirmAction] = useState(() => () => {});

    const [showAlertMessage, setShowAlertMessage] = useState(false);
    const [alertMessage, setAlertMessage] = useState('');
    const [alertType, setAlertType] = useState('success');

    const showCustomAlert = (message, type = 'success') => {
        setAlertMessage(message);
        setAlertType(type);
        setShowAlertMessage(true);
        setTimeout(() => {
            setShowAlertMessage(false);
            setAlertMessage('');
            setAlertType('success');
        }, 3000);
    };

    const fetchCompras = useCallback(async () => {
        if (!token || !selectedStoreSlug || !stores.length) {
            setLoadingCompras(false);
            return;
        }

        const store = stores.find(s => s.nombre === selectedStoreSlug);
        if (!store) {
            console.warn("RegistroCompras: No se encontró la tienda con el slug:", selectedStoreSlug);
            setLoadingCompras(false);
            setError("No se pudo cargar la tienda seleccionada.");
            return;
        }
        // El backend ahora filtra por el nombre de la tienda (slug)
        const storeName = store.nombre; 

        setLoadingCompras(true);
        setError(null);
        try {
            const response = await axios.get(`${BASE_API_ENDPOINT}/api/compras/`, {
                headers: { 'Authorization': `Bearer ${token}` },
                params: { tienda: storeName } // Filtrar por el nombre de la tienda
            });
            setCompras(response.data.results || response.data);
        } catch (err) {
            setError('Error al cargar las compras: ' + (err.response ? JSON.stringify(err.response.data) : err.message));
            console.error('Error fetching compras:', err.response || err.message);
        } finally {
            setLoadingCompras(false);
        }
    }, [token, selectedStoreSlug, stores]);

    useEffect(() => {
        if (!authLoading && isAuthenticated && user && user.is_superuser && selectedStoreSlug) {
            fetchCompras();
            // Establecer la fecha predeterminada a hoy para el formulario de nueva compra
            const today = new Date();
            const year = today.getFullYear();
            const month = (today.getMonth() + 1).toString().padStart(2, '0');
            const day = today.getDate().toString().padStart(2, '0');
            setNewPurchaseDate(`${year}-${month}-${day}`);
        } else if (!authLoading && (!isAuthenticated || !user || !user.is_superuser)) {
            setError("Acceso denegado. Solo los superusuarios pueden gestionar compras.");
            setLoadingCompras(false);
        } else if (!authLoading && isAuthenticated && user && user.is_superuser && !selectedStoreSlug) {
            setLoadingCompras(false);
        }
    }, [isAuthenticated, user, authLoading, selectedStoreSlug, fetchCompras]);

    const handleAddPurchase = async (e) => {
        e.preventDefault();
        setError(null);
        
        if (!selectedStoreSlug) {
            showCustomAlert("Por favor, selecciona una tienda antes de registrar una compra.", 'error');
            return;
        }

        const parsedAmount = parseFloat(newPurchaseAmount);
        if (isNaN(parsedAmount) || parsedAmount <= 0) {
            showCustomAlert("El monto total debe ser un número positivo.", 'error');
            return;
        }

        // El backend usará auto_now_add para fecha_compra, así que no la enviamos.
        // Solo enviamos el total, proveedor y el nombre de la tienda.
        const purchaseData = {
            tienda: selectedStoreSlug, // Enviar el nombre de la tienda (slug)
            total: parsedAmount,
            proveedor: newPurchaseSupplier || null,
        };

        try {
            await axios.post(`${BASE_API_ENDPOINT}/api/compras/`, purchaseData, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            showCustomAlert('Compra registrada con éxito!', 'success');
            setNewPurchaseAmount('');
            setNewPurchaseSupplier('');
            fetchCompras(); // Actualizar la lista de compras
        } catch (err) {
            showCustomAlert('Error al registrar la compra: ' + (err.response?.data ? JSON.stringify(err.response.data) : err.message), 'error');
            console.error('Error adding purchase:', err.response || err);
        }
    };

    const handleDeletePurchase = async (purchaseId) => {
        setConfirmMessage('¿Estás seguro de que quieres eliminar esta compra? Esta acción es irreversible y afectará las métricas.');
        setConfirmAction(() => async () => {
            setShowConfirmModal(false);
            try {
                await axios.delete(`${BASE_API_ENDPOINT}/api/compras/${purchaseId}/`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                showCustomAlert('Compra eliminada con éxito!', 'success');
                fetchCompras(); // Actualizar la lista
            } catch (err) {
                showCustomAlert('Error al eliminar la compra: ' + (err.response?.data ? JSON.stringify(err.response.data) : err.message), 'error');
                console.error('Error deleting purchase:', err.response || err);
            }
        });
        setShowConfirmModal(true);
    };


    if (authLoading || (isAuthenticated && !user)) {
        return <div style={styles.loadingMessage}>Cargando datos de usuario...</div>;
    }

    if (!isAuthenticated || !user.is_superuser) {
        return <div style={styles.accessDeniedMessage}>Acceso denegado. Solo los superusuarios pueden gestionar compras.</div>;
    }

    if (!selectedStoreSlug) {
        return (
            <div style={styles.noStoreSelectedMessage}>
                <h2>Por favor, selecciona una tienda en la barra de navegación para gestionar compras.</h2>
            </div>
        );
    }

    if (loadingCompras) {
        return <div style={styles.loadingMessage}>Cargando registro de compras de {selectedStoreSlug}...</div>;
    }

    if (error) {
        return <div style={styles.errorMessage}>{error}</div>;
    }

    return (
        <div style={styles.container}>
            <h1>Registro de egreso ({selectedStoreSlug})</h1>

            {/* Formulario para Añadir Nueva Compra */}
            <div style={styles.formSection}>
                <h2 style={styles.formHeader}>Registrar Nuevo Egreso</h2>
                <form onSubmit={handleAddPurchase} style={styles.form}>
                    <div style={styles.formGroup}>
                        <label style={styles.label}>Fecha:</label>
                        <input 
                            type="date" 
                            value={newPurchaseDate} 
                            onChange={(e) => setNewPurchaseDate(e.target.value)} 
                            required 
                            style={styles.input} 
                            disabled // La fecha se establece automáticamente en el backend
                        />
                    </div>
                    <div style={styles.formGroup}>
                        <label style={styles.label}>Monto ($):</label>
                        <input 
                            type="number" 
                            step="0.01" 
                            value={newPurchaseAmount} 
                            onChange={(e) => setNewPurchaseAmount(e.target.value)} 
                            required 
                            style={styles.input} 
                            min="0.01"
                        />
                    </div>
                    <div style={styles.formGroup}>
                        <label style={styles.label}>Detalle (Opcional):</label>
                        <input 
                            type="text" 
                            value={newPurchaseSupplier} 
                            onChange={(e) => setNewPurchaseSupplier(e.target.value)} 
                            style={styles.input} 
                        />
                    </div>
                    <button type="submit" style={styles.submitButton}>
                        Registrar Egreso
                    </button>
                </form>
            </div>

            {/* Lista de Compras Registradas */}
            <div style={styles.listSection}>
                <h2 style={styles.listHeader}>Egresos Registrados</h2>
                {compras.length === 0 ? (
                    <p style={styles.noDataMessage}>No hay egresos registrados para esta tienda.</p>
                ) : (
                    <table style={styles.table}>
                        <thead>
                            <tr style={styles.tableHeaderRow}>
                                <th style={styles.th}>ID</th>
                                <th style={styles.th}>Fecha</th>
                                <th style={styles.th}>Monto Total</th>
                                <th style={styles.th}>Detalle</th>
                                <th style={styles.th}>Registrado Por</th>
                                <th style={styles.th}>Acciones</th>
                            </tr>
                        </thead>
                        <tbody>
                            {compras.map(compra => (
                                <tr key={compra.id}>
                                    <td style={styles.td}>{compra.id.substring(0, 8)}...</td> {/* Mostrar solo los primeros 8 caracteres del ID */}
                                    <td style={styles.td}>{new Date(compra.fecha_compra).toLocaleString()}</td>
                                    <td style={styles.td}>${parseFloat(compra.total).toFixed(2)}</td>
                                    <td style={styles.td}>{compra.proveedor || 'N/A'}</td>
                                    <td style={styles.td}>{compra.usuario ? compra.usuario.username : 'N/A'}</td>
                                    <td style={styles.td}>
                                        <button 
                                            onClick={() => handleDeletePurchase(compra.id)} 
                                            style={styles.deleteButton}
                                        >
                                            Eliminar
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>

            {/* Modal de Confirmación */}
            {showConfirmModal && (
                <div style={styles.modalOverlay}>
                    <div style={styles.modalContent}>
                        <p style={styles.modalMessage}>{confirmMessage}</p>
                        <div style={styles.modalActions}>
                            <button onClick={confirmAction} style={styles.modalConfirmButton}>Sí</button>
                            <button onClick={() => setShowConfirmModal(false)} style={styles.modalCancelButton}>No</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Cuadro de Mensaje de Alerta */}
            {showAlertMessage && (
                <div style={{ ...styles.alertBox, backgroundColor: alertType === 'error' ? '#dc3545' : (alertType === 'info' ? '#17a2b8' : '#28a745') }}>
                    <p>{alertMessage}</p>
                </div>
            )}
        </div>
    );
};

const styles = {
    container: {
        padding: '20px',
        fontFamily: 'Inter, sans-serif',
        maxWidth: '1000px',
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
    formSection: {
        backgroundColor: '#ffffff',
        padding: '25px',
        borderRadius: '8px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
        marginBottom: '30px',
    },
    formHeader: {
        fontSize: '1.8em',
        color: '#34495e',
        marginBottom: '20px',
        borderBottom: '2px solid #eceff1',
        paddingBottom: '10px',
    },
    form: {
        display: 'flex',
        flexDirection: 'column',
        gap: '15px',
    },
    formGroup: {
        marginBottom: '10px',
    },
    label: {
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
        boxSizing: 'border-box',
    },
    submitButton: {
        padding: '12px 20px',
        backgroundColor: '#28a745',
        color: 'white',
        border: 'none',
        borderRadius: '5px',
        cursor: 'pointer',
        fontSize: '1.1em',
        fontWeight: 'bold',
        transition: 'background-color 0.3s ease',
    },
    listSection: {
        backgroundColor: '#ffffff',
        padding: '25px',
        borderRadius: '8px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
    },
    listHeader: {
        fontSize: '1.8em',
        color: '#34495e',
        marginBottom: '20px',
        borderBottom: '2px solid #eceff1',
        paddingBottom: '10px',
    },
    noDataMessage: {
        textAlign: 'center',
        marginTop: '20px',
        color: '#777',
        fontStyle: 'italic',
    },
    table: {
        width: '100%',
        borderCollapse: 'collapse',
        textAlign: 'left',
        border: '1px solid #ddd',
        borderRadius: '8px',
        overflow: 'hidden',
        boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
    },
    tableHeaderRow: {
        backgroundColor: '#f2f2f2',
    },
    th: {
        padding: '12px',
        border: '1px solid #ddd',
        fontWeight: 'bold',
        color: '#333',
    },
    td: {
        padding: '12px',
        border: '1px solid #ddd',
        verticalAlign: 'middle',
    },
    deleteButton: {
        padding: '8px 12px',
        backgroundColor: '#dc3545',
        color: 'white',
        border: 'none',
        borderRadius: '5px',
        cursor: 'pointer',
        transition: 'background-color 0.3s ease',
    },
    modalOverlay: {
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.6)',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 1000,
    },
    modalContent: {
        backgroundColor: '#fff',
        padding: '30px',
        borderRadius: '10px',
        boxShadow: '0 5px 15px rgba(0, 0, 0, 0.3)',
        textAlign: 'center',
        maxWidth: '450px',
        width: '90%',
        animation: 'fadeIn 0.3s ease-out',
    },
    modalMessage: {
        fontSize: '1.1em',
        marginBottom: '25px',
        color: '#333',
    },
    modalActions: {
        display: 'flex',
        justifyContent: 'center',
        gap: '20px',
    },
    modalConfirmButton: {
        backgroundColor: '#dc3545',
        color: 'white',
        padding: '12px 25px',
        border: 'none',
        borderRadius: '6px',
        cursor: 'pointer',
        fontSize: '1em',
        fontWeight: 'bold',
        transition: 'background-color 0.3s ease, transform 0.2s ease',
    },
    modalCancelButton: {
        backgroundColor: '#6c757d',
        color: 'white',
        padding: '12px 25px',
        border: 'none',
        borderRadius: '6px',
        cursor: 'pointer',
        fontSize: '1em',
        fontWeight: 'bold',
        transition: 'background-color 0.3s ease, transform 0.2s ease',
    },
    alertBox: {
        position: 'fixed',
        top: '20px',
        right: '20px',
        color: 'white',
        padding: '15px 25px',
        borderRadius: '8px',
        boxShadow: '0 2px 10px rgba(0, 0, 0, 0.1)',
        zIndex: 1001,
        opacity: 0,
        animation: 'fadeInOut 3s forwards',
    },
    '@keyframes fadeInOut': {
        '0%': { opacity: 0, transform: 'translateY(-20px)' },
        '10%': { opacity: 1, transform: 'translateY(0)' },
        '90%': { opacity: 1, transform: 'translateY(0)' },
        '100%': { opacity: 0, transform: 'translateY(-20px)' },
    },
};

export default RegistroCompras;
