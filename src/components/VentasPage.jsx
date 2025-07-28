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
    const { user, token, isAuthenticated, loading: authLoading, selectedStoreSlug } = useAuth();

    const [ventas, setVentas] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // Nuevo estado para el filtro de fecha (YYYY-MM-DD)
    const [filterDate, setFilterDate] = useState('');
    // Estado para el filtro de vendedor (ID del usuario)
    const [filterSellerId, setFilterSellerId] = useState('');
    const [filterAnulada, setFilterAnulada] = useState('');

    // Estado para almacenar la lista de vendedores disponibles
    const [availableSellers, setAvailableSellers] = useState([]);

    const [nextPageUrl, setNextPageUrl] = useState(null);
    const [prevPageUrl, setPrevPageUrl] = useState(null);
    const [currentPageNumber, setCurrentPageNumber] = useState(1);

    const [expandedSaleId, setExpandedSaleId] = useState(null);

    // Estados para el modal de confirmación
    const [showConfirmModal, setShowConfirmModal] = useState(false);
    const [confirmMessage, setConfirmMessage] = useState('');
    const [confirmAction, setConfirmAction] = useState(() => () => {});
    const [confirmType, setConfirmType] = useState('full'); // 'full' o 'partial'

    // Estados para el cuadro de mensaje de alerta personalizado
    const [showAlertMessage, setShowAlertMessage] = useState(false);
    const [alertMessage, setAlertMessage] = useState('');
    const [alertType, setAlertType] = useState('success'); // 'success', 'error', 'info'

    // Función para mostrar un mensaje de alerta personalizado
    const showCustomAlert = (message, type = 'success') => {
        setAlertMessage(message);
        setAlertType(type);
        setShowAlertMessage(true);
        setTimeout(() => {
            setShowAlertMessage(false);
            setAlertMessage('');
            setAlertType('success'); // Reiniciar a predeterminado
        }, 3000);
    };

    // Función para obtener la lista de usuarios (vendedores)
    const fetchUsers = useCallback(async () => {
        if (!token) return;
        try {
            const response = await axios.get(`${BASE_API_ENDPOINT}/api/users/`, {
                headers: { 'Authorization': `Bearer ${token}` },
            });
            setAvailableSellers(response.data.results || response.data);
        } catch (err) {
            console.error("Error al cargar vendedores:", err.response ? err.response.data : err.message);
        }
    }, [token]);


    const fetchVentas = useCallback(async (pageUrlOrNumber = 1) => {
        if (!token || !selectedStoreSlug) {
            console.log("fetchVentas: No hay token o tienda seleccionada, omitiendo la carga.");
            setLoading(false);
            return;
        }

        setLoading(true);
        setError(null);
        try {
            let url = '';
            let params = {};

            if (typeof pageUrlOrNumber === 'string') {
                url = pageUrlOrNumber; // Si se pasa una URL de paginación completa
            } else {
                url = `${BASE_API_ENDPOINT}/api/ventas/`; // URL base para la API de ventas
                params = {
                    page: pageUrlOrNumber,
                    tienda_slug: selectedStoreSlug,
                };

                // Parsear la fecha del filtro
                if (filterDate) {
                    const dateObj = new Date(filterDate);
                    params.fecha_venta__year = dateObj.getFullYear();
                    params.fecha_venta__month = (dateObj.getMonth() + 1).toString().padStart(2, '0');
                    params.fecha_venta__day = dateObj.getDate().toString().padStart(2, '0');
                }

                if (filterSellerId) params.usuario = filterSellerId;
                if (filterAnulada !== '') params.anulada = filterAnulada;
            }

            console.log("fetchVentas: Llamada a la API:", url);
            console.log("fetchVentas: Parámetros:", typeof pageUrlOrNumber === 'string' ? {} : params);

            const response = await axios.get(url, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                },
                params: typeof pageUrlOrNumber === 'string' ? {} : params,
            });

            console.log("fetchVentas: Datos de respuesta raw:", response.data);

            if (response.data && Array.isArray(response.data.results)) {
                setVentas(response.data.results);
                setNextPageUrl(response.data.next);
                setPrevPageUrl(response.data.previous);
                if (typeof pageUrlOrNumber === 'number') {
                    setCurrentPageNumber(pageUrlOrNumber);
                } else {
                    const urlParams = new URLSearchParams(new URL(url).search);
                    setCurrentPageNumber(parseInt(urlParams.get('page')) || 1);
                }
                console.log("fetchVentas: Datos tratados como resultados paginados.");
            } else if (Array.isArray(response.data)) {
                setVentas(response.data);
                setNextPageUrl(null);
                setPrevPageUrl(null);
                setCurrentPageNumber(1);
                console.log("fetchVentas: Datos tratados como array directo (no se detectó paginación).");
            } else {
                console.error("fetchVentas: Formato de datos de respuesta inesperado:", response.data);
                setError('Formato de datos de ventas inesperado del servidor.');
                setVentas([]);
                setNextPageUrl(null);
                setPrevPageUrl(null);
                setCurrentPageNumber(1);
            }

        } catch (err) {
            console.error('Error al obtener ventas:', err.response ? err.response.data : err.message);
            setError('No se pudieron cargar las ventas. Verifica tu conexión o permisos.');
            setVentas([]);
            setNextPageUrl(null);
            setPrevPageUrl(null);
            setCurrentPageNumber(1);
        } finally {
            setLoading(false);
        }
    }, [token, selectedStoreSlug, filterDate, filterSellerId, filterAnulada]);

    useEffect(() => {
        if (!authLoading && isAuthenticated && selectedStoreSlug) {
            fetchUsers(); // Cargar vendedores al inicio
            fetchVentas(1);
        } else if (!authLoading && (!isAuthenticated || !selectedStoreSlug)) {
            setLoading(false);
        }
    }, [token, isAuthenticated, authLoading, selectedStoreSlug, fetchVentas, fetchUsers]);

    const handleApplyFilters = () => {
        fetchVentas(1); // Siempre ir a la primera página al aplicar filtros
        setExpandedSaleId(null); // Colapsar detalles al aplicar filtros
    };

    // Función para anular una venta completa
    const handleAnularVenta = async (ventaId) => {
        if (!user || !user.is_superuser) {
            showCustomAlert('No tienes permisos para anular ventas.', 'error');
            return;
        }
        if (!selectedStoreSlug) {
            showCustomAlert('Por favor, selecciona una tienda antes de anular ventas.', 'error');
            return;
        }

        setConfirmMessage(`¿Estás seguro de que quieres anular la venta ${ventaId} completamente? Esta acción revertirá el stock de todos los productos.`);
        setConfirmAction(() => async () => {
            setShowConfirmModal(false);
            try {
                console.log(`Anulando venta completa ${ventaId} para tienda ${selectedStoreSlug}.`);
                const response = await axios.patch(`${BASE_API_ENDPOINT}/api/ventas/${ventaId}/anular/?tienda_slug=${selectedStoreSlug}`, {}, {
                    headers: {
                        'Authorization': `Bearer ${token}`,
                    },
                });
                console.log("Respuesta de anulación de venta completa:", response.data);
                showCustomAlert(`Venta ${ventaId} anulada exitosamente.`, 'success');
                fetchVentas(currentPageNumber); // Recargar la página actual
            } catch (err) {
                console.error('Error al anular venta completa:', err.response ? err.response.data : err.message);
                if (err.response && err.response.data && err.response.data.detail) {
                    showCustomAlert(`Error al anular venta: ${err.response.data.detail}`, 'error');
                } else {
                    showCustomAlert('Error al anular venta. Inténtalo de nuevo.', 'error');
                }
            }
        });
        setConfirmType('full');
        setShowConfirmModal(true);
    };

    // NUEVA FUNCIÓN: Para anular un producto específico dentro de una venta (anula 1 unidad por defecto)
    const handleAnularDetalleVenta = async (ventaId, detalleId, cantidadActual) => {
        if (!user || !user.is_superuser) {
            showCustomAlert('No tienes permisos para anular productos de ventas.', 'error');
            return;
        }
        if (!selectedStoreSlug) {
            showCustomAlert('Por favor, selecciona una tienda antes de anular productos.', 'error');
            return;
        }

        if (cantidadActual <= 0) {
            showCustomAlert('No hay unidades para anular en este detalle.', 'error');
            return;
        }

        const cantidadAAnular = 1; // Anular siempre 1 unidad

        setConfirmMessage(`¿Estás seguro de que quieres anular 1 unidad de este producto en la venta ${ventaId}?`);
        setConfirmAction(() => async () => {
            setShowConfirmModal(false);
            try {
                console.log(`Anulando ${cantidadAAnular} unidad(es) del detalle ${detalleId} en venta ${ventaId}.`);
                const response = await axios.patch(
                    `${BASE_API_ENDPOINT}/api/ventas/${ventaId}/anular_detalle/?tienda_slug=${selectedStoreSlug}`,
                    { detalle_id: detalleId, cantidad_a_anular: cantidadAAnular },
                    {
                        headers: {
                            'Authorization': `Bearer ${token}`,
                        },
                    }
                );
                console.log("Respuesta de anulación de detalle:", response.data);
                showCustomAlert(`Se anuló 1 unidad del producto en la venta ${ventaId}.`, 'success');
                fetchVentas(currentPageNumber); // Recargar la página actual
            } catch (err) {
                console.error('Error al anular detalle de venta:', err.response ? err.response.data : err.message);
                if (err.response && err.response.data && err.response.data.detail) {
                    showCustomAlert(`Error al anular detalle: ${err.response.data.detail}`, 'error');
                } else if (err.response && err.response.data && err.response.data.error) {
                    showCustomAlert(`Error al anular detalle: ${err.response.data.error}`, 'error');
                }
                else {
                    showCustomAlert('Error al anular detalle de venta. Inténtalo de nuevo.', 'error');
                }
            }
        });
        setConfirmType('partial');
        setShowConfirmModal(true);
    };


    const handleToggleDetails = (ventaId) => {
        setExpandedSaleId(prevId => (prevId === ventaId ? null : ventaId));
    };

    if (authLoading) {
        return <p style={styles.loadingMessage}>Cargando información de usuario...</p>;
    }

    if (!isAuthenticated) {
        return <p style={styles.accessDeniedMessage}>Por favor, inicia sesión para ver las ventas.</p>;
    }

    if (!user || (!user.is_staff && !user.is_superuser)) {
        return <p style={styles.accessDeniedMessage}>No tienes permiso para ver el listado de ventas.</p>;
    }

    if (!selectedStoreSlug) {
        return (
            <div style={styles.noStoreSelectedMessage}>
                <h2>Por favor, selecciona una tienda en la barra de navegación para ver las ventas.</h2>
            </div>
        );
    }

    return (
        <div style={styles.container}>
            <h1>Gestión de Ventas ({selectedStoreSlug})</h1>

            <div style={styles.filterContainer}>
                <h3>Filtros de Búsqueda</h3>
                <div style={styles.filterGrid}>
                    <div>
                        <label htmlFor="filterDate">Fecha:</label>
                        <input
                            type="date"
                            id="filterDate"
                            value={filterDate}
                            onChange={(e) => setFilterDate(e.target.value)}
                            style={styles.input}
                        />
                    </div>
                    <div>
                        <label htmlFor="filterSellerId">Vendedor:</label>
                        <select
                            id="filterSellerId"
                            value={filterSellerId}
                            onChange={(e) => setFilterSellerId(e.target.value)}
                            style={styles.input}
                        >
                            <option value="">Todos</option>
                            {availableSellers.map(seller => (
                                <option key={seller.id} value={seller.id}>{seller.username}</option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label htmlFor="filterAnulada">Estado Anulación:</label>
                        <select
                            id="filterAnulada"
                            value={filterAnulada}
                            onChange={(e) => setFilterAnulada(e.target.value)}
                            style={styles.input}
                        >
                            <option value="">Todas</option>
                            <option value="false">Activas</option>
                            <option value="true">Anuladas</option>
                        </select>
                    </div>
                </div>
                <button onClick={handleApplyFilters} style={styles.primaryButton}>
                    Aplicar Filtros
                </button>
            </div>

            {loading && <p style={styles.loadingMessage}>Cargando ventas...</p>}
            {error && <p style={styles.errorMessage}>{error}</p>}

            {!loading && ventas.length === 0 && !error && <p style={styles.noDataMessage}>No se encontraron ventas con los filtros aplicados.</p>}

            {!loading && ventas.length > 0 && (
                <>
                    <table style={styles.table}>
                        <thead>
                            <tr style={styles.tableHeaderRow}>
                                <th style={styles.th}>ID Venta</th>
                                <th style={styles.th}>Fecha</th>
                                <th style={styles.th}>Total</th>
                                <th style={styles.th}>Vendedor</th>
                                <th style={styles.th}>Método Pago</th>
                                <th style={styles.th}>Estado</th>
                                <th style={styles.th}>Detalles</th>
                                {user && user.is_superuser && (
                                    <th style={styles.th}>Acciones</th>
                                )}
                            </tr>
                        </thead>
                        <tbody>
                            {ventas.map((venta) => (
                                <React.Fragment key={venta.id}>
                                    <tr style={{ ...styles.tableRow, ...(expandedSaleId === venta.id && styles.expandedRow) }}>
                                        <td style={styles.td}>{venta.id}</td>
                                        <td style={styles.td}>{new Date(venta.fecha_venta).toLocaleString()}</td>
                                        <td style={styles.td}>${parseFloat(venta.total || 0).toFixed(2)}</td>
                                        <td style={styles.td}>{venta.usuario?.username || 'N/A'}</td>
                                        <td style={styles.td}>{venta.metodo_pago || 'N/A'}</td>
                                        <td style={styles.td}>
                                            <span style={{ color: venta.anulada ? 'red' : 'green', fontWeight: 'bold' }}>
                                                {venta.anulada ? 'ANULADA' : 'ACTIVA'}
                                            </span>
                                        </td>
                                        <td style={styles.td}>
                                            <button
                                                onClick={() => handleToggleDetails(venta.id)}
                                                style={styles.detailsButton}
                                            >
                                                {expandedSaleId === venta.id ? 'Ocultar' : 'Ver'} Detalles
                                            </button>
                                        </td>
                                        {user && user.is_superuser && (
                                            <td style={styles.td}>
                                                {!venta.anulada ? (
                                                    <button
                                                        onClick={() => handleAnularVenta(venta.id)}
                                                        style={styles.anularButton}
                                                    >
                                                        Anular Venta
                                                    </button>
                                                ) : (
                                                    <button
                                                        disabled
                                                        style={styles.anuladaButton}
                                                    >
                                                        Anulada
                                                    </button>
                                                )}
                                            </td>
                                        )}
                                    </tr>
                                    {/* Fila expandible para mostrar los detalles */}
                                    {expandedSaleId === venta.id && venta.detalles && venta.detalles.length > 0 && (
                                        <tr style={styles.detailRow}>
                                            <td colSpan={user && user.is_superuser ? 8 : 7} style={styles.detailCell}>
                                                <h4>Detalles de la Venta #{venta.id}</h4>
                                                <table style={styles.detailTable}>
                                                    <thead>
                                                        <tr style={styles.detailTableHeaderRow}>
                                                            <th style={styles.detailTh}>Producto</th>
                                                            <th style={styles.detailTh}>Cantidad</th>
                                                            <th style={styles.detailTh}>P. Unitario</th>
                                                            <th style={styles.detailTh}>Subtotal</th>
                                                            {user && user.is_superuser && <th style={styles.detailTh}>Acciones</th>}
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                        {venta.detalles.map((detalle) => (
                                                            <tr key={detalle.id}>
                                                                <td style={styles.detailTd}>{detalle.producto_nombre || 'N/A'}</td>
                                                                <td style={styles.detailTd}>{detalle.cantidad}</td>
                                                                <td style={styles.detailTd}>${parseFloat(detalle.precio_unitario || 0).toFixed(2)}</td>
                                                                <td style={styles.detailTd}>${(parseFloat(detalle.cantidad || 0) * parseFloat(detalle.precio_unitario || 0)).toFixed(2)}</td>
                                                                {user && user.is_superuser && (
                                                                    <td style={styles.detailTd}>
                                                                        {detalle.cantidad > 0 && !venta.anulada ? (
                                                                            <button
                                                                                onClick={() => handleAnularDetalleVenta(venta.id, detalle.id, detalle.cantidad)}
                                                                                style={styles.anularItemButton}
                                                                            >
                                                                                Anular 1 Ud.
                                                                            </button>
                                                                        ) : (
                                                                            <span style={styles.anuladaItemText}>Anulado/Sin Stock</span>
                                                                        )}
                                                                    </td>
                                                                )}
                                                            </tr>
                                                        ))}
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
                        <button
                            onClick={() => fetchVentas(prevPageUrl)}
                            disabled={!prevPageUrl}
                            style={styles.paginationButton}
                        >
                            Anterior
                        </button>
                        <span style={styles.pageNumber}>Página {currentPageNumber}</span>
                        <button
                            onClick={() => fetchVentas(nextPageUrl)}
                            disabled={!nextPageUrl}
                            style={styles.paginationButton}
                        >
                            Siguiente
                        </button>
                    </div>
                </>
            )}

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

// Estilos CSS para el componente
const styles = {
    container: {
        padding: '20px',
        maxWidth: '1200px',
        margin: '20px auto',
        backgroundColor: '#fff',
        borderRadius: '8px',
        boxShadow: '0 0 10px rgba(0,0,0,0.1)',
        fontFamily: 'Arial, sans-serif',
    },
    header: {
        textAlign: 'center',
        color: '#333',
        marginBottom: '20px',
    },
    filterContainer: {
        marginBottom: '20px',
        border: '1px solid #e0e0e0',
        padding: '15px',
        borderRadius: '8px',
        backgroundColor: '#f9f9f9',
    },
    filterGrid: {
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
        gap: '15px',
        marginBottom: '15px',
    },
    input: {
        width: '100%',
        padding: '10px',
        border: '1px solid #ccc',
        borderRadius: '4px',
        boxSizing: 'border-box',
    },
    primaryButton: {
        padding: '10px 20px',
        backgroundColor: '#007bff',
        color: 'white',
        border: 'none',
        borderRadius: '5px',
        cursor: 'pointer',
        fontSize: '16px',
        transition: 'background-color 0.3s ease',
    },
    primaryButtonHover: {
        backgroundColor: '#0056b3',
    },
    loadingMessage: {
        textAlign: 'center',
        marginTop: '20px',
        color: '#555',
    },
    errorMessage: {
        color: 'red',
        backgroundColor: '#ffe3e6',
        padding: '10px',
        borderRadius: '5px',
        marginBottom: '15px',
        textAlign: 'center',
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
        marginTop: '20px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
        borderRadius: '8px',
        overflow: 'hidden',
    },
    tableHeaderRow: {
        backgroundColor: '#f2f2f2',
    },
    th: {
        border: '1px solid #ddd',
        padding: '12px',
        textAlign: 'left',
        fontWeight: 'bold',
        color: '#333',
    },
    tableRow: {
        backgroundColor: 'inherit',
        transition: 'background-color 0.2s ease',
    },
    expandedRow: {
        backgroundColor: '#e0f7fa',
    },
    td: {
        border: '1px solid #ddd',
        padding: '10px',
        verticalAlign: 'top',
    },
    detailsButton: {
        backgroundColor: '#17a2b8',
        color: 'white',
        border: 'none',
        padding: '8px 12px',
        borderRadius: '5px',
        cursor: 'pointer',
        fontSize: '0.9em',
        transition: 'background-color 0.3s ease',
    },
    detailsButtonHover: {
        backgroundColor: '#138496',
    },
    anularButton: {
        backgroundColor: '#dc3545',
        color: 'white',
        border: 'none',
        padding: '8px 12px',
        borderRadius: '5px',
        cursor: 'pointer',
        fontSize: '0.9em',
        transition: 'background-color 0.3s ease',
    },
    anularButtonHover: {
        backgroundColor: '#c82333',
    },
    anuladaButton: {
        backgroundColor: '#6c757d',
        color: 'white',
        border: 'none',
        padding: '8px 12px',
        borderRadius: '5px',
        cursor: 'not-allowed',
        fontSize: '0.9em',
    },
    anularItemButton: {
        backgroundColor: '#ffc107', // Color amarillo para anular item
        color: '#333',
        border: 'none',
        padding: '6px 10px',
        borderRadius: '4px',
        cursor: 'pointer',
        fontSize: '0.85em',
        transition: 'background-color 0.3s ease',
    },
    anuladaItemText: {
        color: '#6c757d',
        fontSize: '0.85em',
        fontStyle: 'italic',
    },
    detailRow: {
        backgroundColor: '#f8f9fa',
    },
    detailCell: {
        border: '1px solid #ddd',
        padding: '15px',
    },
    detailTable: {
        width: '100%',
        borderCollapse: 'collapse',
        marginTop: '10px',
    },
    detailTableHeaderRow: {
        backgroundColor: '#e9ecef',
    },
    detailTh: {
        border: '1px solid #ddd',
        padding: '8px',
        textAlign: 'left',
        fontWeight: 'bold',
        color: '#555',
    },
    detailTd: {
        border: '1px solid #eee',
        padding: '8px',
    },
    paginationContainer: {
        marginTop: '20px',
        display: 'flex',
        justifyContent: 'center',
        gap: '10px',
    },
    paginationButton: {
        padding: '10px 15px',
        backgroundColor: '#6c757d',
        color: 'white',
        border: 'none',
        borderRadius: '5px',
        cursor: 'pointer',
        fontSize: '1em',
        transition: 'background-color 0.3s ease',
    },
    paginationButtonHover: {
        backgroundColor: '#5a6268',
    },
    pageNumber: {
        alignSelf: 'center',
        fontSize: '1.1em',
        color: '#333',
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
