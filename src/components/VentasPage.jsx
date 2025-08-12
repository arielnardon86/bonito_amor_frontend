// BONITO_AMOR/frontend/src/components/VentasPage.js

import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { useAuth } from '../AuthContext';
import { useNavigate } from 'react-router-dom';

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
    const navigate = useNavigate();
    
    // Obtener la fecha actual para los filtros por defecto (día en curso)
    const today = new Date();
    const currentYear = today.getFullYear();
    const currentMonth = (today.getMonth() + 1).toString().padStart(2, '0'); // Mes 0-11, por eso +1
    const currentDay = today.getDate().toString().padStart(2, '0');
    const defaultDate = `${currentYear}-${currentMonth}-${currentDay}`;

    const [ventas, setVentas] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // Establecer filterDate por defecto al día actual
    const [filterDate, setFilterDate] = useState(defaultDate);
    const [filterSellerId, setFilterSellerId] = useState('');
    const [filterAnulada, setFilterAnulada] = useState(''); // Mantener como string 'true'/'false'/'', el backend lo convierte

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

    const fetchVentas = useCallback(async (pageUrl = null) => {
        if (!token || !selectedStoreSlug) { 
            setLoading(false);
            return;
        }

        setLoading(true);
        setError(null);
        try {
            const url = pageUrl || `${BASE_API_ENDPOINT}/api/ventas/`;
            const params = {
                tienda_slug: selectedStoreSlug,
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
            
            setVentas(response.data.results || []); 
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
    }, [token, selectedStoreSlug, filterDate, filterSellerId, filterAnulada]); 

    const fetchSellers = useCallback(async () => {
        if (!token || !selectedStoreSlug) return; 

        try {
            const response = await axios.get(`${BASE_API_ENDPOINT}/api/users/`, {
                headers: { 'Authorization': `Bearer ${token}` },
                params: { tienda_slug: selectedStoreSlug } 
            });
            setSellers(response.data.results || response.data);
        } catch (err) {
            console.error('Error fetching sellers:', err.response ? err.response.data : err.message);
            setError(`Error al cargar vendedores: ${err.response?.data ? JSON.stringify(err.response.data) : err.message}`);
        }
    }, [token, selectedStoreSlug]); 

    useEffect(() => {
        if (!authLoading && isAuthenticated && user && (user.is_superuser || user.is_staff) && selectedStoreSlug) { 
            fetchVentas(); 
            fetchSellers();
        } else if (!authLoading && (!isAuthenticated || !user || !user.is_superuser)) { 
            setError("Acceso denegado. Solo los superusuarios pueden ver/gestionar ventas.");
            setLoading(false);
        } else if (!authLoading && isAuthenticated && user && user.is_superuser && !selectedStoreSlug) {
            setLoading(false); 
        }
    }, [isAuthenticated, user, authLoading, selectedStoreSlug, fetchSellers, fetchVentas]); 

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
        setConfirmMessage('¿Estás seguro de que quieres ANULAR este producto de la venta? Esto revertirá el stock del producto.');
        setConfirmAction(() => async () => {
            setShowConfirmModal(false); 
            try {
                const payload = { detalle_id: detalleId };
                await axios.patch(`${BASE_API_ENDPOINT}/api/ventas/${ventaId}/anular_detalle/`, payload, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                
                showCustomAlert('Producto de la venta anulado con éxito!', 'success');
                
                const currentExpandedSaleId = expandedSaleId; 
                setExpandedSaleId(null); 
                await fetchVentas(); 
                setTimeout(() => {
                    setExpandedSaleId(currentExpandedSaleId); 
                }, 50); 

            } catch (err) {
                showCustomAlert('Error al anular el detalle de la venta: ' + (err.response?.data ? JSON.stringify(err.response.data) : err.message), 'error');
                console.error('Error anulando detalle de venta:', err.response || err);
            }
        });
        setShowConfirmModal(true);
    };
    
    // Nueva función para reimprimir el recibo
    const handleReimprimirRecibo = (venta) => {
        const items = venta.detalles.map(d => ({
            product: {
                nombre: d.producto_nombre,
                talle: d.producto.talle,
                precio: d.precio_unitario,
            },
            quantity: d.cantidad,
        }));

        navigate('/recibo', { 
            state: { 
                venta, 
                items, 
                descuento: venta.descuento_porcentaje 
            } 
        });
    };

    const applyFilters = () => {
        fetchVentas(); 
    };

    const clearFilters = () => {
        setFilterDate(defaultDate); 
        setFilterSellerId('');
        setFilterAnulada('');
        setTimeout(() => {
            fetchVentas(); 
        }, 0);
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
                {/* Botones para aplicar y limpiar filtros */}
                <button onClick={applyFilters} style={styles.filterButton}>Aplicar Filtros</button>
                <button onClick={clearFilters} style={{...styles.filterButton, backgroundColor: '#6c757d'}}>Limpiar Filtros</button>
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
                                            {venta.anulada ? 'Sí' : 'No'}
                                        </td>
                                        <td style={styles.td}>
                                            <button
                                                onClick={() => setExpandedSaleId(expandedSaleId === venta.id ? null : venta.id)}
                                                style={styles.detailButton}
                                            >
                                                {expandedSaleId === venta.id ? 'Ocultar Detalles' : 'Ver Detalles'}
                                            </button>
                                            {/* El botón de Anular Venta solo se muestra si la venta no está anulada Y no todos los detalles están anulados */}
                                            {!venta.anulada && (
                                                <button
                                                    onClick={() => handleAnularVenta(venta.id)}
                                                    style={{ ...styles.anularButton, marginLeft: '10px' }}
                                                >
                                                    Anular Venta
                                                </button>
                                            )}
                                             <button
                                                onClick={() => handleReimprimirRecibo(venta)}
                                                style={{ ...styles.reprintButton, marginLeft: '10px' }}
                                            >
                                                Reimprimir Recibo
                                            </button>
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
                                                            <th style={styles.th}>P. Unitario (con desc.)</th>
                                                            <th style={styles.th}>Subtotal (con desc.)</th>
                                                            <th style={styles.th}>Anulado</th>
                                                            <th style={styles.th}>Acciones Detalle</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                        {venta.detalles.length > 0 ? (
                                                            venta.detalles.map(detalle => {
                                                                const precioUnitarioOriginal = parseFloat(detalle.precio_unitario || 0);
                                                                const descuentoAplicado = parseFloat(venta.descuento_porcentaje || 0);
                                                                
                                                                const precioUnitarioConDescuento = precioUnitarioOriginal * (1 - descuentoAplicado / 100);
                                                                const subtotalConDescuento = detalle.cantidad * precioUnitarioConDescuento;

                                                                return (
                                                                    <tr key={detalle.id}> 
                                                                        <td style={styles.detailTd}>{detalle.producto_nombre}</td>
                                                                        <td style={styles.detailTd}>{detalle.cantidad}</td>
                                                                        <td style={styles.detailTd}>${precioUnitarioConDescuento.toFixed(2)}</td> 
                                                                        <td style={styles.detailTd}>${subtotalConDescuento.toFixed(2)}</td> 
                                                                        <td style={styles.detailTd}>{detalle.anulado_individualmente ? 'Sí' : 'No'}</td>
                                                                        <td style={styles.detailTd}>
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
                                                                );
                                                            })
                                                        ) : (
                                                            <tr>
                                                                <td colSpan="6" style={styles.noDataMessage}>No hay detalles para esta venta.</td>
                                                            </tr>
                                                        )}
                                                    </tbody>
                                                </table>
                                                {venta.descuento_porcentaje > 0 && (
                                                    <p style={styles.discountDisplay}>
                                                        Descuento aplicado a la venta: {parseFloat(venta.descuento_porcentaje).toFixed(2)}%
                                                    </p>
                                                )}
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
        maxWidth: '1200px',
        margin: '20px auto',
        backgroundColor: '#f8f9fa',
        borderRadius: '8px',
        boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
        color: '#333',
    },
    header: {
        textAlign: 'center',
        color: '#2c3e50',
        marginBottom: '30px',
        fontSize: '2.5em',
        fontWeight: 'bold',
    },
    section: {
        backgroundColor: '#ffffff',
        padding: '25px',
        borderRadius: '8px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
        marginBottom: '30px',
    },
    sectionHeader: {
        fontSize: '1.8em',
        color: '#34495e',
        marginBottom: '20px',
        borderBottom: '2px solid #eceff1',
        paddingBottom: '10px',
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
    cartSelectionContainer: {
        display: 'flex',
        flexWrap: 'wrap',
        gap: '10px',
        marginBottom: '15px',
        padding: '10px',
        backgroundColor: '#eaf7ff',
        borderRadius: '5px',
        border: '1px dashed #a7d9ff',
    },
    activeCartButton: {
        padding: '8px 15px',
        backgroundColor: '#007bff',
        color: 'white',
        border: 'none',
        borderRadius: '5px',
        cursor: 'pointer',
        fontWeight: 'bold',
        transition: 'background-color 0.3s ease',
    },
    inactiveCartButton: {
        padding: '8px 15px',
        backgroundColor: '#f0f0f0',
        color: '#333',
        border: '1px solid #ccc',
        borderRadius: '5px',
        cursor: 'pointer',
        transition: 'background-color 0.3s ease',
    },
    newCartButton: {
        padding: '8px 15px',
        backgroundColor: '#28a745',
        color: 'white',
        border: 'none',
        borderRadius: '5px',
        cursor: 'pointer',
        transition: 'background-color 0.3s ease',
    },
    activeCartInfo: {
        marginTop: '15px',
        padding: '15px',
        backgroundColor: '#e6ffe6',
        borderRadius: '8px',
        border: '1px solid #28a745',
    },
    activeCartTitle: {
        marginBottom: '10px',
        color: '#28a745',
        fontSize: '1.2em',
    },
    activeCartActions: {
        display: 'flex',
        gap: '10px',
        marginBottom: '10px',
    },
    deleteCartButton: {
        padding: '8px 15px',
        backgroundColor: '#dc3545',
        color: 'white',
        border: 'none',
        borderRadius: '5px',
        cursor: 'pointer',
        transition: 'background-color 0.3s ease',
    },
    inputGroup: {
        display: 'flex',
        gap: '10px',
        marginBottom: '15px',
        alignItems: 'center',
    },
    input: {
        flexGrow: 1,
        padding: '10px 12px',
        border: '1px solid #dcdcdc',
        borderRadius: '5px',
        fontSize: '1em',
        boxSizing: 'border-box',
    },
    primaryButton: {
        padding: '10px 20px',
        backgroundColor: '#007bff',
        color: 'white',
        border: 'none',
        borderRadius: '5px',
        cursor: 'pointer',
        fontSize: '1em',
        fontWeight: 'bold',
        transition: 'background-color 0.3s ease',
    },
    foundProductCard: {
        border: '1px solid #a7d9ff',
        padding: '15px',
        borderRadius: '8px',
        backgroundColor: '#e7f0ff',
        marginBottom: '15px',
    },
    foundProductText: {
        margin: '5px 0',
        color: '#333',
        fontSize: '1.05em',
    },
    productActions: {
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
        marginTop: '10px',
    },
    addButton: {
        padding: '5px 10px',
        backgroundColor: '#007bff',
        color: 'white',
        border: 'none',
        borderRadius: '3px',
        cursor: 'pointer',
    },
    disabledButton: {
        padding: '5px 10px',
        backgroundColor: '#6c757d',
        color: 'white',
        border: 'none',
        borderRadius: '3px',
        cursor: 'not-allowed',
    },
    table: {
        width: '100%',
        borderCollapse: 'collapse',
        marginTop: '15px',
        borderRadius: '8px',
        overflow: 'hidden',
        boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
    },
    tableHeaderRow: {
        backgroundColor: '#f2f2f2',
    },
    th: {
        padding: '12px 15px',
        borderBottom: '1px solid #ddd',
        textAlign: 'left',
        fontWeight: 'bold',
        fontSize: '0.95em',
        color: '#555',
    },
    tableRow: {
        backgroundColor: 'inherit',
        transition: 'background-color 0.2s ease',
        '&:nth-child(even)': {
            backgroundColor: '#f9f9f9',
        },
    },
    td: {
        padding: '10px 15px',
        borderBottom: '1px solid #eee',
        verticalAlign: 'middle',
        fontSize: '0.9em',
    },
    quantityControl: {
        display: 'flex',
        alignItems: 'center',
        gap: '5px',
    },
    quantityButton: {
        padding: '5px 10px',
        backgroundColor: '#007bff',
        color: 'white',
        border: 'none',
        borderRadius: '3px',
        cursor: 'pointer',
        fontSize: '0.9em',
        transition: 'background-color 0.3s ease',
    },
    quantityText: {
        minWidth: '20px',
        textAlign: 'center',
        fontWeight: 'bold',
    },
    removeButton: {
        padding: '6px 12px',
        backgroundColor: '#dc3545',
        color: 'white',
        border: 'none',
        borderRadius: '4px',
        cursor: 'pointer',
        fontSize: '0.85em',
        transition: 'background-color 0.3s ease',
    },
    totalVenta: {
        textAlign: 'right',
        marginTop: '20px',
        fontSize: '1.5em',
        color: '#28a745',
        fontWeight: 'bold',
    },
    finalTotalVenta: { 
        textAlign: 'right',
        marginTop: '10px',
        fontSize: '1.7em',
        color: '#007bff',
        fontWeight: 'bold',
    },
    paymentMethodSelectContainer: {
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
        marginBottom: '10px', 
        marginTop: '20px',
    },
    paymentMethodLabel: {
        fontWeight: 'bold',
        color: '#555',
        fontSize: '1em',
    },
    discountContainer: { 
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
        marginBottom: '20px',
    },
    discountInput: { 
        width: '80px', 
        padding: '10px 12px',
        border: '1px solid #dcdcdc',
        borderRadius: '5px',
        fontSize: '1em',
        boxSizing: 'border-box',
        textAlign: 'center',
    },
    processSaleButton: {
        width: '100%',
        padding: '15px',
        backgroundColor: '#007bff',
        color: 'white',
        border: 'none',
        borderRadius: '8px',
        cursor: 'pointer',
        fontSize: '1.2em',
        fontWeight: 'bold',
        transition: 'background-color 0.3s ease',
    },
    noDataMessage: {
        textAlign: 'center',
        color: '#777',
        fontStyle: 'italic',
        padding: '15px',
    },
    addButton: {
        padding: '5px 10px',
        backgroundColor: '#007bff',
        color: 'white',
        border: 'none',
        borderRadius: '3px',
        cursor: 'pointer',
    },
    disabledButton: {
        padding: '5px 10px',
        backgroundColor: '#6c757d',
        color: 'white',
        border: 'none',
        borderRadius: '3px',
        cursor: 'not-allowed',
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
    modalHeader: {
        fontSize: '1.5em',
        color: '#34495e',
        marginBottom: '20px',
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
        backgroundColor: '#28a745', 
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
        backgroundColor: '#28a745', 
        color: 'white',
        padding: '15px 25px',
        borderRadius: '8px',
        boxShadow: '0 2px 10px rgba(0, 0, 0, 0.1)',
        zIndex: 1001,
        opacity: 0,
        animation: 'fadeInOut 3s forwards',
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
    },
};

export default PuntoVenta;