// BONITO_AMOR/frontend/src/components/VentasPage.jsx

import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { useAuth } from '../AuthContext';

// URL base de la API, obtenida de las variables de entorno de React
const API_BASE_URL = process.env.REACT_APP_API_URL; 

// Función para normalizar la URL base, eliminando cualquier /api/ o barra final
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

const VentasPage = () => {
    const { user, token, isAuthenticated, loading: authLoading, selectedStoreSlug, stores } = useAuth(); 
    
    const [ventas, setVentas] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const [filterDate, setFilterDate] = useState('');
    const [filterSellerId, setFilterSellerId] = useState('');
    const [filterAnulada, setFilterAnulada] = useState('');

    const [nextPageUrl, setNextPageUrl] = useState(null);
    const [prevPageUrl, setPrevPageUrl] = useState(null);
    const [currentPageNumber, setCurrentPageNumber] = useState(1);

    const [expandedSaleId, setExpandedSaleId] = useState(null); 

    const [showConfirmModal, setShowConfirmModal] = useState(false);
    const [confirmMessage, setConfirmMessage] = useState('');
    const [confirmAction, setConfirmAction] = useState(() => () => {});

    const [showAlertMessage, setShowAlertMessage] = useState(false);
    const [alertMessage, setAlertMessage] = useState('');
    const [alertType, setAlertType] = useState('success');

    const [sellers, setSellers] = useState([]);

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

    /**
     * Función para verificar si todos los detalles de una venta están anulados individualmente.
     * @param {Array} detalles - Array de objetos detalle de venta.
     * @returns {boolean} - True si todos los detalles están anulados, False en caso contrario.
     */
    const areAllDetailsAnnulled = (detalles) => {
        if (!detalles || detalles.length === 0) {
            return false; // Una venta sin detalles no se considera completamente anulada por detalles
        }
        return detalles.every(detalle => detalle.anulado_individualmente);
    };


    const fetchVentas = useCallback(async (pageUrl = null) => {
        if (!token || !selectedStoreSlug || !stores.length) { 
            setLoading(false);
            return;
        }

        const store = stores.find(s => s.nombre === selectedStoreSlug);
        if (!store) {
            console.warn("VentasPage: No se encontró la tienda con el slug:", selectedStoreSlug);
            setLoading(false);
            setError("No se pudo cargar la tienda seleccionada.");
            return;
        }
        const storeId = store.id;

        setLoading(true);
        setError(null);
        try {
            const url = pageUrl || `${BASE_API_ENDPOINT}/api/ventas/`;
            const params = {
                tienda: storeId,
            };

            if (filterDate) {
                params.fecha_venta__date = filterDate; 
            }
            if (filterSellerId) {
                params.usuario = filterSellerId;
            }
            if (filterAnulada !== '') { 
                params.anulada = filterAnulada;
            }

            const response = await axios.get(url, {
                headers: { 'Authorization': `Bearer ${token}` },
                params: params
            });
            
            // *** NUEVO LOG: Inspeccionar los datos recibidos del backend ***
            console.log("VentasPage: Datos de ventas recibidos del backend:", response.data.results);

            // Mapear las ventas para añadir la propiedad 'todos_detalles_anulados'
            const updatedVentas = response.data.results.map(venta => ({
                ...venta,
                // Calcular si todos los detalles están anulados individualmente
                // Esto es para la lógica de mostrar 'Sí' en la columna 'Anulada' de la venta principal
                todos_detalles_anulados: areAllDetailsAnnulled(venta.detalles)
            }));

            // *** NUEVO LOG: Inspeccionar los datos de ventas después de añadir 'todos_detalles_anulados' ***
            console.log("VentasPage: Datos de ventas después de procesamiento en frontend:", updatedVentas);


            setVentas(updatedVentas || []); // Usar el array actualizado
            setNextPageUrl(response.data.next);
            setPrevPageUrl(response.data.previous);
            if (pageUrl) {
                const urlParams = new URLSearchParams(new URL(pageUrl).search);
                setCurrentPageNumber(parseInt(urlParams.get('page')) || 1);
            } else {
                setCurrentPageNumber(1);
            }
        } catch (err) {
            setError('Error al cargar las ventas: ' + (err.response ? JSON.stringify(err.response.data) : err.message));
            console.error('Error fetching ventas:', err.response || err.message);
        } finally {
            setLoading(false);
        }
    }, [token, selectedStoreSlug, stores, filterDate, filterSellerId, filterAnulada]);

    const fetchSellers = useCallback(async () => {
        if (!token || !selectedStoreSlug || !stores.length) return; 

        const store = stores.find(s => s.nombre === selectedStoreSlug);
        if (!store) {
            console.warn("VentasPage: No se encontró la tienda con el slug:", selectedStoreSlug);
            setSellers([]);
            return;
        }
        const storeId = store.id;

        try {
            const response = await axios.get(`${BASE_API_ENDPOINT}/api/users/`, {
                headers: { 'Authorization': `Bearer ${token}` },
                params: { tienda: storeId } 
            });
            setSellers(response.data.results || response.data);
        } catch (err) {
            console.error('Error fetching sellers:', err.response ? err.response.data : err.message);
            setError(`Error al cargar vendedores: ${err.response?.data ? JSON.stringify(err.response.data) : err.message}`);
        }
    }, [token, selectedStoreSlug, stores]); 

    useEffect(() => {
        if (!authLoading && isAuthenticated && user && user.is_superuser && selectedStoreSlug) { 
            if (stores.length > 0) { 
                fetchVentas();
                fetchSellers();
            }
        } else if (!authLoading && (!isAuthenticated || !user || !user.is_superuser)) { 
            setError("Acceso denegado. Solo los superusuarios pueden ver/gestionar ventas.");
            setLoading(false);
        } else if (!authLoading && isAuthenticated && user && user.is_superuser && !selectedStoreSlug) {
            setLoading(false); 
        }
    }, [isAuthenticated, user, authLoading, selectedStoreSlug, fetchVentas, fetchSellers, stores]); 


    const handleAnularVenta = async (ventaId) => {
        setConfirmMessage('¿Estás seguro de que quieres ANULAR esta venta completa? Esta acción es irreversible y afectará el stock.');
        setConfirmAction(() => async () => {
            setShowConfirmModal(false); 
            try {
                await axios.patch(`${BASE_API_ENDPOINT}/api/ventas/${ventaId}/anular/`, {}, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                showCustomAlert('Venta anulada con éxito!', 'success');
                fetchVentas(); 
            } catch (err) {
                showCustomAlert('Error al anular la venta: ' + (err.response?.data ? JSON.stringify(err.response.data) : err.message), 'error');
                console.error('Error anulando venta:', err.response || err);
            }
        });
        setShowConfirmModal(true);
    };

    const handleAnularDetalleVenta = async (ventaId, detalleId) => {
        console.log("Attempting to annul sales detail:");
        console.log("Venta ID:", ventaId);
        console.log("Detalle ID:", detalleId);

        setConfirmMessage('¿Estás seguro de que quieres ANULAR este producto de la venta? Esto revertirá el stock del producto.');
        setConfirmAction(() => async () => {
            setShowConfirmModal(false); 
            try {
                const payload = { detalle_id: detalleId };
                console.log("Sending payload:", payload);

                await axios.patch(`${BASE_API_ENDPOINT}/api/ventas/${ventaId}/anular_detalle/`, payload, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                
                showCustomAlert('Producto de la venta anulado con éxito!', 'success');
                // Al anular un detalle, recargar todas las ventas
                // Esto asegura que el estado de 'anulado_individualmente' y el 'total' de la venta se actualicen
                // Y que la lógica de 'todos_detalles_anulados' se recalcule
                fetchVentas(); 

            } catch (err) {
                showCustomAlert('Error al anular el detalle de la venta: ' + (err.response?.data ? JSON.stringify(err.response.data) : err.message), 'error');
                console.error('Error anulando detalle de venta:', err.response || err);
            }
        });
        setShowConfirmModal(true);
    };

    if (authLoading || (isAuthenticated && !user)) { 
        return <div style={styles.loadingMessage}>Cargando datos de usuario...</div>;
    }

    if (!isAuthenticated || !user.is_superuser) { 
        return <div style={styles.accessDeniedMessage}>Acceso denegado. Solo los superusuarios pueden ver/gestionar ventas.</div>;
    }

    if (!selectedStoreSlug) {
        return (
            <div style={styles.noStoreSelectedMessage}>
                <h2>Por favor, selecciona una tienda en la barra de navegación para ver las ventas.</h2>
            </div>
        );
    }

    if (loading) {
        return <div style={styles.loadingMessage}>Cargando ventas de {selectedStoreSlug}...</div>;
    }

    if (error) {
        return <div style={styles.errorMessage}>{error}</div>;
    }

    return (
        <div style={styles.container}>
            <h1>Listado de Ventas ({selectedStoreSlug})</h1>

            {/* Sección de Filtros */}
            <div style={styles.filtersContainer}>
                <div style={styles.filterGroup}>
                    <label style={styles.filterLabel}>Fecha:</label>
                    <input
                        type="date"
                        value={filterDate}
                        onChange={(e) => setFilterDate(e.target.value)}
                        style={styles.filterInput}
                    />
                </div>
                <div style={styles.filterGroup}>
                    <label style={styles.filterLabel}>Vendedor:</label>
                    <select
                        value={filterSellerId}
                        onChange={(e) => setFilterSellerId(e.target.value)}
                        style={styles.filterInput}
                    >
                        <option value="">Todos</option>
                        {sellers.map(seller => (
                            <option key={seller.id} value={seller.id}>{seller.username} ({seller.first_name} {seller.last_name})</option>
                        ))}
                    </select>
                </div>
                <div style={styles.filterGroup}>
                    <label style={styles.filterLabel}>Anulada:</label>
                    <select
                        value={filterAnulada}
                        onChange={(e) => setFilterAnulada(e.target.value)}
                        style={styles.filterInput}
                    >
                        <option value="">Todas</option>
                        <option value="false">No Anuladas</option>
                        <option value="true">Anuladas</option>
                    </select>
                </div>
                <button onClick={() => fetchVentas()} style={styles.filterButton}>Aplicar Filtros</button>
                <button onClick={() => {
                    setFilterDate('');
                    setFilterSellerId('');
                    setFilterAnulada('');
                    fetchVentas(null); 
                }} style={{...styles.filterButton, backgroundColor: '#6c757d'}}>Limpiar Filtros</button>
            </div>

            {/* Mensaje si no hay ventas */}
            {ventas.length === 0 ? (
                <p style={styles.noDataMessage}>No hay ventas disponibles para esta tienda con los filtros aplicados.</p>
            ) : (
                <>
                    {/* Tabla de Ventas */}
                    <table style={styles.table}>
                        <thead>
                            <tr style={styles.tableHeaderRow}>
                                <th style={styles.th}>ID Venta</th>
                                <th style={styles.th}>Fecha</th>
                                <th style={styles.th}>Total</th>
                                <th style={styles.th}>Vendedor</th>
                                <th style={styles.th}>Método Pago</th>
                                <th style={styles.th}>Anulada</th>
                                <th style={styles.th}>Acciones</th>
                            </tr>
                        </thead>
                        <tbody>
                            {ventas.map(venta => (
                                <React.Fragment key={venta.id}>
                                    <tr>
                                        <td style={styles.td}>{venta.id}</td>
                                        <td style={styles.td}>{new Date(venta.fecha_venta).toLocaleString()}</td>
                                        <td style={styles.td}>${parseFloat(venta.total || 0).toFixed(2)}</td> 
                                        <td style={styles.td}>{venta.usuario ? venta.usuario.username : 'N/A'}</td>
                                        <td style={styles.td}>{venta.metodo_pago || 'N/A'}</td>
                                        {/* Lógica para mostrar "Sí" si la venta está anulada o si todos sus detalles están anulados */}
                                        <td style={styles.td}>
                                            {venta.anulada || venta.todos_detalles_anulados ? 'Sí' : 'No'}
                                        </td>
                                        <td style={styles.td}>
                                            <button
                                                onClick={() => setExpandedSaleId(expandedSaleId === venta.id ? null : venta.id)}
                                                style={styles.detailButton}
                                            >
                                                {expandedSaleId === venta.id ? 'Ocultar Detalles' : 'Ver Detalles'}
                                            </button>
                                            {/* El botón de Anular Venta solo se muestra si la venta no está anulada Y no todos los detalles están anulados */}
                                            {!venta.anulada && !venta.todos_detalles_anulados && (
                                                <button
                                                    onClick={() => handleAnularVenta(venta.id)}
                                                    style={{ ...styles.anularButton, marginLeft: '10px' }}
                                                >
                                                    Anular Venta
                                                </button>
                                            )}
                                        </td>
                                    </tr>
                                    {/* Detalles de la venta expandidos */}
                                    {expandedSaleId === venta.id && venta.detalles && (
                                        <tr>
                                            <td colSpan="7" style={styles.detailRow}>
                                                <h4 style={styles.detailHeader}>Detalles de la Venta {venta.id}</h4>
                                                <table style={styles.detailTable}>
                                                    <thead>
                                                        <tr>
                                                            <th style={styles.detailTh}>Producto</th>
                                                            <th style={styles.th}>Cantidad</th>
                                                            <th style={styles.th}>P. Unitario</th>
                                                            <th style={styles.th}>Subtotal</th>
                                                            <th style={styles.th}>Anulado</th>
                                                            <th style={styles.th}>Acciones Detalle</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                        {venta.detalles.length > 0 ? (
                                                            venta.detalles.map(detalle => (
                                                                <tr key={detalle.id}>
                                                                    <td style={styles.detailTd}>{detalle.producto_nombre}</td>
                                                                    <td style={styles.detailTd}>{detalle.cantidad}</td>
                                                                    <td style={styles.detailTd}>${parseFloat(detalle.precio_unitario_venta || 0).toFixed(2)}</td>
                                                                    <td style={styles.detailTd}>${parseFloat(detalle.subtotal || 0).toFixed(2)}</td>
                                                                    {/* Mostrar el estado real de anulado_individualmente */}
                                                                    <td style={styles.detailTd}>{detalle.anulado_individualmente ? 'Sí' : 'No'}</td>
                                                                    <td style={styles.detailTd}>
                                                                        {/* El botón solo se muestra si la venta no está anulada Y el detalle no está anulado individualmente */}
                                                                        {!venta.anulada && !detalle.anulado_individualmente && ( 
                                                                            <button
                                                                                onClick={() => handleAnularDetalleVenta(venta.id, detalle.id)}
                                                                                style={styles.anularDetalleButton}
                                                                            >
                                                                                Anular Detalle
                                                                            </button>
                                                                        )}
                                                                    </td>
                                                                </tr>
                                                            ))
                                                        ) : (
                                                            <tr>
                                                                <td colSpan="6" style={styles.noDataMessage}>No hay detalles para esta venta.</td>
                                                            </tr>
                                                        )}
                                                    </tbody>
                                                </table>
                                            </td>
                                        </tr>
                                    )}
                                </React.Fragment>
                            ))}
                        </tbody>
                    </table>

                    {/* Controles de Paginación */}
                    <div style={styles.paginationContainer}>
                        <button onClick={() => fetchVentas(prevPageUrl)} disabled={!prevPageUrl} style={styles.paginationButton}>
                            Anterior
                        </button>
                        <span style={styles.pageNumber}>Página {currentPageNumber}</span>
                        <button onClick={() => fetchVentas(nextPageUrl)} disabled={!nextPageUrl} style={styles.paginationButton}>
                            Siguiente
                        </button>
                    </div>
                </>
            )}

            {/* Modal de Confirmación (Personalizado) */}
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

            {/* Cuadro de Mensaje de Alerta (Personalizado) */}
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
        fontFamily: 'Arial, sans-serif',
        maxWidth: '1200px',
        margin: 'auto',
        backgroundColor: '#fff',
        borderRadius: '8px',
        boxShadow: '0 0 10px rgba(0,0,0,0.1)',
    },
    loadingMessage: {
        padding: '20px',
        textAlign: 'center',
        color: '#555',
    },
    accessDeniedMessage: {
        color: 'red',
        marginBottom: '10px',
        padding: '20px',
        border: '1px solid red',
        textAlign: 'center',
        borderRadius: '5px',
        backgroundColor: '#ffe3e6',
    },
    noStoreSelectedMessage: {
        padding: '50px',
        textAlign: 'center',
        color: '#777',
    },
    errorMessage: {
        color: 'red',
        marginBottom: '10px',
        border: '1px solid red',
        padding: '10px',
        borderRadius: '5px',
        backgroundColor: '#ffe3e6',
    },
    successMessage: {
        color: 'green',
        marginBottom: '10px',
        border: '1px solid green',
        padding: '10px',
        borderRadius: '5px',
        backgroundColor: '#e6ffe6',
    },
    filtersContainer: {
        display: 'flex',
        flexWrap: 'wrap',
        gap: '15px',
        marginBottom: '20px',
        padding: '15px',
        border: '1px solid #e0e0e0',
        borderRadius: '8px',
        backgroundColor: '#f9f9f9',
        alignItems: 'flex-end',
    },
    filterGroup: {
        display: 'flex',
        flexDirection: 'column',
    },
    filterLabel: {
        marginBottom: '5px',
        fontWeight: 'bold',
        color: '#555',
    },
    filterInput: {
        padding: '8px',
        border: '1px solid #ccc',
        borderRadius: '4px',
        minWidth: '150px',
    },
    filterButton: {
        padding: '10px 15px',
        backgroundColor: '#007bff',
        color: 'white',
        border: 'none',
        borderRadius: '5px',
        cursor: 'pointer',
        fontSize: '14px',
        transition: 'background-color 0.3s ease',
    },
    filterButtonHover: {
        backgroundColor: '#0056b3',
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
    detailButton: {
        padding: '6px 10px',
        backgroundColor: '#17a2b8',
        color: 'white',
        border: 'none',
        borderRadius: '4px',
        cursor: 'pointer',
        fontSize: '0.9em',
        transition: 'background-color 0.3s ease',
    },
    detailButtonHover: {
        backgroundColor: '#138496',
    },
    anularButton: {
        padding: '6px 10px',
        backgroundColor: '#dc3545',
        color: 'white',
        border: 'none',
        borderRadius: '4px',
        cursor: 'pointer',
        fontSize: '0.9em',
        transition: 'background-color 0.3s ease',
    },
    anularButtonHover: {
        backgroundColor: '#c82333',
    },
    detailRow: {
        backgroundColor: '#fdfdfd',
        padding: '15px',
        borderTop: '2px solid #eee',
    },
    detailHeader: {
        marginTop: '0',
        marginBottom: '10px',
        color: '#333',
    },
    detailTable: {
        width: '100%',
        borderCollapse: 'collapse',
        marginTop: '10px',
    },
    detailTh: {
        backgroundColor: '#e9ecef',
        padding: '10px',
        textAlign: 'left',
        borderBottom: '1px solid #dee2e6',
    },
    detailTd: {
        padding: '10px',
        borderBottom: '1px solid #dee2e6',
    },
    anularDetalleButton: {
        padding: '5px 8px',
        backgroundColor: '#ffc107',
        color: 'black',
        border: 'none',
        borderRadius: '3px',
        cursor: 'pointer',
        fontSize: '0.8em',
        transition: 'background-color 0.3s ease',
    },
    anularDetalleButtonHover: {
        backgroundColor: '#e0a800',
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
    paginationButtonDisabled: {
        backgroundColor: '#cccccc',
        cursor: 'not-allowed',
    },
    pageNumber: {
        fontSize: '1em',
        fontWeight: 'bold',
        color: '#555',
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
    modalConfirmButtonHover: {
        backgroundColor: '#c82333',
        transform: 'scale(1.02)',
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
    modalCancelButtonHover: {
        backgroundColor: '#5a6268',
        transform: 'scale(1.02)',
    },
    alertBox: {
        position: 'fixed',
        top: '20px',
        right: '20px',
        backgroundColor: '#28a745', 
        color: 'white',
        padding: '15px 25px',
        borderRadius: '8px',
        boxShadow: '0 2px 10px rgba(0, 0, 0, 0.1)',
        zIndex: 1001,
        opacity: 0,
        animation: 'fadeInOut 3s forwards',
    },
};

export default VentasPage;
