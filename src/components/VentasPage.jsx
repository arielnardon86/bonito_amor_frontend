// BONITO_AMOR/frontend/src/components/VentasPage.jsx
import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { useAuth } from '../AuthContext';
import { useNavigate } from 'react-router-dom';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';

const normalizeApiUrl = (url) => {
    if (!url) {
        return 'http://localhost:8000';
    }
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
    const navigate = useNavigate();

    const today = new Date();
    const currentYear = today.getFullYear();
    const currentMonth = (today.getMonth() + 1).toString().padStart(2, '0');
    const currentDay = today.getDate().toString().padStart(2, '0');
    const defaultDate = `${currentYear}-${currentMonth}-${currentDay}`;

    const [ventas, setVentas] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const [filterDate, setFilterDate] = useState(defaultDate);
    const [filterSellerId, setFilterSellerId] = useState('');
    const [filterAnulada, setFilterAnulada] = useState('');
    const [filterVentaId, setFilterVentaId] = useState('');
    const barcodeInputRef = React.useRef(null);
    const barcodeInputValueRef = React.useRef(''); // Referencia para mantener el valor sin re-renderizar

    const [nextPageUrl, setNextPageUrl] = useState(null);
    const [prevPageUrl, setPrevPageUrl] = useState(null);
    const [currentPageNumber, setCurrentPageNumber] = useState(1);

    const [expandedSaleId, setExpandedSaleId] = useState(null);
    const [cambioDevolucionDetalle, setCambioDevolucionDetalle] = useState(null);
    const [loadingCambioDevolucion, setLoadingCambioDevolucion] = useState(false);

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

            // Si hay un ID de venta, no aplicar filtro de fecha
            if (filterVentaId) {
                params.id = filterVentaId;
            } else {
                // Solo aplicar filtro de fecha si no hay ID de venta
                if (filterDate) {
                    params.fecha_venta__date = filterDate;
                }
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

            const ventasData = response.data.results || [];
            setVentas(ventasData);
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
    }, [token, selectedStoreSlug, filterDate, filterSellerId, filterAnulada, filterVentaId]);

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

    // Sincronizar el input directamente desde el DOM para evitar pérdida de caracteres
    useEffect(() => {
        const input = barcodeInputRef.current;
        if (!input) return;

        const handleInput = (e) => {
            const val = e.target.value.replace(/-/g, '');
            // Solo actualizar si el valor es diferente para evitar loops
            if (val !== filterVentaId) {
                setFilterVentaId(val);
                barcodeInputValueRef.current = val;
            }
        };

        // Usar addEventListener en lugar de React events para mejor control
        input.addEventListener('input', handleInput);
        
        return () => {
            input.removeEventListener('input', handleInput);
        };
    }, [filterVentaId]);

    const handleAnularVenta = async (ventaId) => {
        console.log('Botón Anular Venta presionado para ID:', ventaId);
        if (!token) {
            showCustomAlert("Error de autenticación. Por favor, reinicia sesión.", 'error');
            return;
        }

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
                showCustomAlert('Error al anular la venta: ' + (err.response ? JSON.stringify(err.response.data) : err.message), 'error');
                console.error('Error anulando venta:', err.response || err);
            }
        });
        setShowConfirmModal(true);
    };

    const handleAnularDetalleVenta = async (ventaId, detalleId) => {
        console.log('Botón Anular Detalle Venta presionado para Venta ID:', ventaId, 'Detalle ID:', detalleId);
        if (!token) {
            showCustomAlert("Error de autenticación. Por favor, reinicia sesión.", 'error');
            return;
        }

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
                showCustomAlert('Error al anular el detalle de la venta: ' + (err.response ? JSON.stringify(err.response.data) : err.message), 'error');
                console.error('Error anulando detalle de venta:', err.response || err);
            }
        });
        setShowConfirmModal(true);
    };

    const handleReimprimirRecibo = (venta) => {
        navigate('/recibo', { state: { venta } });
    };

    const handleVerCambioDevolucion = async (cambioDevolucionId) => {
        if (!token) {
            showCustomAlert("Error de autenticación. Por favor, reinicia sesión.", 'error');
            return;
        }

        setLoadingCambioDevolucion(true);
        try {
            const response = await axios.get(`${BASE_API_ENDPOINT}/api/cambios-devoluciones/${cambioDevolucionId}/`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            setCambioDevolucionDetalle(response.data);
        } catch (err) {
            showCustomAlert('Error al obtener el cambio/devolución: ' + (err.response ? JSON.stringify(err.response.data) : err.message), 'error');
            console.error('Error fetching cambio/devolución:', err.response || err.message);
        } finally {
            setLoadingCambioDevolucion(false);
        }
    };

    const handleAnularCambioDevolucion = async (cambioDevolucionId) => {
        if (!token) {
            showCustomAlert("Error de autenticación. Por favor, reinicia sesión.", 'error');
            return;
        }

        setConfirmMessage('¿Estás seguro de que quieres CANCELAR este cambio/devolución? Esta acción revertirá los cambios de stock.');
        setConfirmAction(() => async () => {
            setShowConfirmModal(false);
            try {
                await axios.patch(`${BASE_API_ENDPOINT}/api/cambios-devoluciones/${cambioDevolucionId}/`, {
                    estado: 'CANCELADO'
                }, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                showCustomAlert('Cambio/Devolución cancelado con éxito!', 'success');
                fetchVentas();
                setCambioDevolucionDetalle(null);
            } catch (err) {
                showCustomAlert('Error al cancelar el cambio/devolución: ' + (err.response ? JSON.stringify(err.response.data) : err.message), 'error');
                console.error('Error cancelando cambio/devolución:', err.response || err);
            }
        });
        setShowConfirmModal(true);
    };

    const handleVerFactura = async (venta) => {
        if (!token) {
            showCustomAlert("Error de autenticación. Por favor, reinicia sesión.", 'error');
            return;
        }

        try {
            // Buscar la factura asociada a esta venta
            const facturasResponse = await axios.get(`${BASE_API_ENDPOINT}/api/facturas/`, {
                headers: { 'Authorization': `Bearer ${token}` },
                params: { venta: venta.id }
            });

            const facturas = facturasResponse.data.results || facturasResponse.data || [];
            if (facturas.length === 0) {
                showCustomAlert('Esta venta no tiene factura asociada.', 'info');
                return;
            }

            const factura = facturas[0];
            
            // Navegar a la página de factura
            navigate('/factura', { 
                state: { 
                    factura: factura,
                    venta: venta
                } 
            });
        } catch (err) {
            showCustomAlert('Error al obtener la factura: ' + (err.response ? JSON.stringify(err.response.data) : err.message), 'error');
            console.error('Error fetching factura:', err.response || err.message);
        }
    };

    const applyFilters = () => {
        // Leer el valor directamente del DOM si el estado no está actualizado
        let ventaIdParaBuscar = filterVentaId;
        if (barcodeInputRef.current) {
            const currentValue = barcodeInputRef.current.value.replace(/-/g, '');
            if (currentValue !== filterVentaId) {
                ventaIdParaBuscar = currentValue;
                setFilterVentaId(currentValue);
            }
        }
        
        // Usar fetchVentas pero con el valor correcto
        const buscarVentas = async () => {
            if (!token || !selectedStoreSlug) return;
            
            setLoading(true);
            setError(null);
            try {
                const url = `${BASE_API_ENDPOINT}/api/ventas/`;
                const params = {
                    tienda_slug: selectedStoreSlug,
                };

                // Si hay un ID de venta, no aplicar filtro de fecha
                if (ventaIdParaBuscar) {
                    params.id = ventaIdParaBuscar;
                } else {
                    // Solo aplicar filtro de fecha si no hay ID de venta
                    if (filterDate) {
                        params.fecha_venta__date = filterDate;
                    }
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

                const ventasData = response.data.results || [];
                setVentas(ventasData);
                setNextPageUrl(response.data.next);
                setPrevPageUrl(response.data.previous);
                setCurrentPageNumber(1);
            } catch (err) {
                setError('Error al cargar las ventas: ' + (err.response ? JSON.stringify(err.response.data) : err.message));
                console.error('Error fetching ventas:', err.response || err.message);
            } finally {
                setLoading(false);
            }
        };
        
        buscarVentas();
    };

    const clearFilters = () => {
        setFilterDate(defaultDate);
        setFilterSellerId('');
        setFilterAnulada('');
        setFilterVentaId('');
        // Limpiar el input no controlado
        if (barcodeInputRef.current) {
            barcodeInputRef.current.value = '';
            barcodeInputValueRef.current = '';
        }
        setTimeout(() => {
            fetchVentas();
        }, 0);
    };



    if (authLoading || (isAuthenticated && !user)) {
        return <div style={styles.loadingMessage}>Cargando datos de usuario...</div>;
    }

    if (!isAuthenticated || (!user.is_superuser && !user.is_staff)) {
        return <div style={styles.accessDeniedMessage}>Acceso denegado. Solo los usuarios con permisos de staff pueden ver ventas.</div>;
    }
    
    // Verificar si es usuario staff (no superuser) para aplicar restricciones
    const isStaffOnly = user.is_staff && !user.is_superuser;

    if (!selectedStoreSlug) {
        return (
            <div style={styles.noStoreSelectedMessage}>
                <p>Selecciona una tienda en el menú para ver las ventas.</p>
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
            <h1 style={styles.header}>Ventas</h1>

            <div style={styles.filtersContainer}>
                {!isStaffOnly && (
                    <>
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
                    </>
                )}
                <div style={styles.filterGroup}>
                    <label style={styles.filterLabel}>Buscar por ID de Venta (Código de barras):</label>
                    <input
                        ref={barcodeInputRef}
                        type="text"
                        defaultValue={filterVentaId}
                        onKeyPress={(e) => { 
                            if (e.key === 'Enter') {
                                e.preventDefault();
                                applyFilters();
                            }
                        }}
                        placeholder="Escanear o ingresar código"
                        style={styles.filterInput}
                        autoComplete="off"
                    />
                </div>
                <button onClick={applyFilters} style={styles.filterButton}>Buscar</button>
                {!isStaffOnly && (
                    <button onClick={clearFilters} style={styles.filterButtonSecondary}>Limpiar Filtros</button>
                )}
            </div>

            {ventas.length === 0 ? (
                <p style={styles.noDataMessage}>No hay ventas disponibles para esta tienda con los filtros aplicados.</p>
            ) : (
                <>
                    <div style={styles.tableResponsive}>
                    <table style={styles.table}>
                        <thead>
                            <tr style={styles.tableHeaderRow}>
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
                                    <tr style={venta.es_nota_credito || venta.es_diferencia_pendiente ? { backgroundColor: '#e8f4f8' } : {}}>
                                        <td style={styles.td}>
                                            {new Date(venta.fecha_venta).toLocaleString()}
                                            {venta.es_nota_credito && (
                                                <span style={{ marginLeft: '10px', padding: '2px 6px', backgroundColor: '#28a745', color: 'white', borderRadius: '3px', fontSize: '0.75em' }}>
                                                    Nota de Crédito
                                                </span>
                                            )}
                                            {venta.es_diferencia_pendiente && (
                                                <span style={{ marginLeft: '10px', padding: '2px 6px', backgroundColor: '#ffc107', color: 'black', borderRadius: '3px', fontSize: '0.75em' }}>
                                                    Diferencia Pendiente
                                                </span>
                                            )}
                                        </td>
                                        <td style={styles.td}>${parseFloat(venta.total || 0).toFixed(2)}</td>
                                        <td style={styles.td}>{venta.usuario ? venta.usuario.username : 'N/A'}</td>
                                        <td style={styles.td}>{venta.metodo_pago || 'N/A'}</td>
                                        <td style={styles.td}>
                                            {venta.anulada ? 'Sí' : 'No'}
                                        </td>
                                        <td style={styles.td}>
                                            <div style={styles.actionButtons}>
                                                <button
                                                    onClick={() => setExpandedSaleId(expandedSaleId === venta.id ? null : venta.id)}
                                                    style={styles.detailButton}
                                                >
                                                    {expandedSaleId === venta.id ? 'Ocultar' : 'Ver'}
                                                </button>
                                                {!venta.anulada && !isStaffOnly && (
                                                    <button
                                                        onClick={() => {
                                                            console.log('Intentando anular venta:', venta.id);
                                                            handleAnularVenta(venta.id);
                                                        }}
                                                        style={styles.anularButton}
                                                    >
                                                        Anular
                                                    </button>
                                                )}
                                                <button
                                                    onClick={() => handleVerFactura(venta)}
                                                    style={{
                                                        ...styles.facturaButton,
                                                        opacity: (venta.tiene_factura || venta.facturada) ? 1 : 0.5,
                                                        cursor: (venta.tiene_factura || venta.facturada) ? 'pointer' : 'not-allowed'
                                                    }}
                                                    disabled={!(venta.tiene_factura || venta.facturada)}
                                                    title={(venta.tiene_factura || venta.facturada) ? "Ver factura" : "Esta venta no tiene factura asociada"}
                                                >
                                                    Factura
                                                </button>
                                                <button
                                                    onClick={() => handleReimprimirRecibo(venta)}
                                                    style={styles.reprintButton}
                                                >
                                                    Recibo
                                                </button>
                                                {!venta.anulada && (
                                                    <button
                                                        onClick={() => {
                                                            navigate('/cambio-devolucion', { state: { venta } });
                                                        }}
                                                        style={{
                                                            ...styles.reprintButton,
                                                            backgroundColor: '#17a2b8',
                                                            marginLeft: '5px'
                                                        }}
                                                    >
                                                        Cambio/Devolución
                                                    </button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                    {expandedSaleId === venta.id && venta.detalles && (
                                        <tr>
                                            <td colSpan="6" style={styles.detailRow}>
                                                <h4 style={styles.detailHeader}>Detalles de la Venta {venta.id}</h4>
                                                
                                                {/* Información de Cambio/Devolución si aplica */}
                                                {venta.cambio_devolucion_nota_credito && (
                                                    <div style={{ marginBottom: '15px', padding: '10px', backgroundColor: '#d4edda', border: '1px solid #c3e6cb', borderRadius: '4px' }}>
                                                        <h5 style={{ margin: '0 0 10px 0', color: '#155724' }}>Información de Nota de Crédito</h5>
                                                        <p style={{ margin: '5px 0' }}>
                                                            <strong>Origen:</strong> Cambio/Devolución #{venta.cambio_devolucion_nota_credito.id}
                                                        </p>
                                                        <p style={{ margin: '5px 0' }}>
                                                            <strong>Venta Original:</strong> {venta.cambio_devolucion_nota_credito.venta_original_id}
                                                        </p>
                                                        <p style={{ margin: '5px 0' }}>
                                                            <strong>Saldo a Favor:</strong> ${parseFloat(venta.cambio_devolucion_nota_credito.saldo_a_favor || 0).toFixed(2)}
                                                        </p>
                                                        <button
                                                            onClick={() => handleVerCambioDevolucion(venta.cambio_devolucion_nota_credito.id)}
                                                            style={{
                                                                marginTop: '10px',
                                                                padding: '5px 10px',
                                                                backgroundColor: '#17a2b8',
                                                                color: 'white',
                                                                border: 'none',
                                                                borderRadius: '4px',
                                                                cursor: 'pointer'
                                                            }}
                                                        >
                                                            Ver Detalle del Cambio/Devolución
                                                        </button>
                                                    </div>
                                                )}
                                                
                                                {venta.cambio_devolucion_diferencia && (
                                                    <div style={{ marginBottom: '15px', padding: '10px', backgroundColor: '#fff3cd', border: '1px solid #ffeaa7', borderRadius: '4px' }}>
                                                        <h5 style={{ margin: '0 0 10px 0', color: '#856404' }}>Información de Diferencia Pendiente</h5>
                                                        <p style={{ margin: '5px 0' }}>
                                                            <strong>Origen:</strong> Cambio/Devolución #{venta.cambio_devolucion_diferencia.id}
                                                        </p>
                                                        <p style={{ margin: '5px 0' }}>
                                                            <strong>Venta Original:</strong> {venta.cambio_devolucion_diferencia.venta_original_id}
                                                        </p>
                                                        <p style={{ margin: '5px 0' }}>
                                                            <strong>Monto Diferencia:</strong> ${parseFloat(venta.cambio_devolucion_diferencia.monto_diferencia || 0).toFixed(2)}
                                                        </p>
                                                        <button
                                                            onClick={() => handleVerCambioDevolucion(venta.cambio_devolucion_diferencia.id)}
                                                            style={{
                                                                marginTop: '10px',
                                                                padding: '5px 10px',
                                                                backgroundColor: '#17a2b8',
                                                                color: 'white',
                                                                border: 'none',
                                                                borderRadius: '4px',
                                                                cursor: 'pointer'
                                                            }}
                                                        >
                                                            Ver Detalle del Cambio/Devolución
                                                        </button>
                                                    </div>
                                                )}
                                                
                                                <div style={styles.detailTableWrapper}>
                                                <table style={styles.detailTable}>
                                                    <thead>
                                                        <tr>
                                                            <th style={styles.detailTh}>Producto</th>
                                                            <th style={styles.th}>Cantidad</th>
                                                            <th style={styles.th}>P. Unitario (Ajustado)</th>
                                                            <th style={styles.th}>Subtotal (Ajustado)</th>
                                                            <th style={styles.th}>Anulado</th>
                                                            <th style={styles.th}>Acciones Detalle</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                        {venta.detalles.length > 0 ? (
                                                            venta.detalles.map(detalle => {
                                                                const precioUnitarioOriginal = parseFloat(detalle.precio_unitario || 0);
                                                                
                                                                let adjustmentFactor = 1.0;

                                                                // Aplica factor de Recargo (suma) o Descuento (resta) si es porcentual
                                                                if (parseFloat(venta.descuento_porcentaje || 0) > 0) {
                                                                    adjustmentFactor = 1 - (parseFloat(venta.descuento_porcentaje) / 100);
                                                                } else if (parseFloat(venta.recargo_porcentaje || 0) > 0) {
                                                                    adjustmentFactor = 1 + (parseFloat(venta.recargo_porcentaje) / 100);
                                                                }

                                                                // Si el ajuste es por monto, no se altera el precio unitario individual
                                                                const isAmountAdjustment = parseFloat(venta.descuento_monto || 0) > 0 || parseFloat(venta.recargo_monto || 0) > 0;
                                                                
                                                                const precioUnitarioAjustado = isAmountAdjustment ? precioUnitarioOriginal : precioUnitarioOriginal * adjustmentFactor;
                                                                const subtotalAjustado = detalle.cantidad * precioUnitarioAjustado;


                                                                // Para notas de crédito o cuando no hay producto, mostrar descripción apropiada
                                                                let productoNombre = detalle.producto_nombre || '';
                                                                if (!productoNombre || productoNombre === 'null' || productoNombre === 'None') {
                                                                    if (venta.metodo_pago === 'Nota de Crédito' || venta.es_nota_credito) {
                                                                        // Si hay cambio/devolución relacionado, mostrar productos devueltos
                                                                        if (venta.cambio_devolucion_nota_credito && venta.cambio_devolucion_nota_credito.productos_devueltos && venta.cambio_devolucion_nota_credito.productos_devueltos.length > 0) {
                                                                            const productos = venta.cambio_devolucion_nota_credito.productos_devueltos.map(p => `${p.cantidad}x ${p.nombre}`).join(', ');
                                                                            productoNombre = `Nota de Crédito por devolución: ${productos}`;
                                                                        } else if (venta.cambio_devolucion_nota_credito) {
                                                                            productoNombre = 'Nota de Crédito (ver detalle del cambio/devolución arriba)';
                                                                        } else {
                                                                            productoNombre = 'Nota de Crédito';
                                                                        }
                                                                    } else {
                                                                        productoNombre = 'Producto sin nombre';
                                                                    }
                                                                }

                                                                return (
                                                                    <tr key={detalle.id}>
                                                                        <td style={styles.detailTd}>{productoNombre}</td>
                                                                        <td style={styles.detailTd}>{detalle.cantidad}</td>
                                                                        <td style={styles.detailTd}>${precioUnitarioAjustado.toFixed(2)}</td>
                                                                        <td style={styles.detailTd}>${subtotalAjustado.toFixed(2)}</td>
                                                                        <td style={styles.detailTd}>{detalle.anulado_individualmente ? 'Sí' : 'No'}</td>
                                                                        <td style={styles.detailTd}>
                                                                            {!venta.anulada && !detalle.anulado_individualmente && !isStaffOnly && (
                                                                                <button
                                                                                    onClick={() => handleAnularDetalleVenta(venta.id, detalle.id)}
                                                                                    style={styles.anularDetalleButton}
                                                                                >
                                                                                    Anular
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
                                                </div>
                                                
                                                {/* MODIFICADO: Muestra el tipo de ajuste aplicado (descuento o recargo) */}
                                                {(venta.descuento_porcentaje > 0 || venta.descuento_monto > 0 || venta.recargo_porcentaje > 0 || venta.recargo_monto > 0) && (
                                                    <p style={styles.discountDisplay}>
                                                        {venta.recargo_monto > 0 ? 
                                                            `Recargo aplicado a la venta: $${parseFloat(venta.recargo_monto).toFixed(2)}` :
                                                        venta.recargo_porcentaje > 0 ?
                                                            `Recargo aplicado a la venta: ${parseFloat(venta.recargo_porcentaje).toFixed(2)}%` :
                                                        venta.descuento_monto > 0 ? 
                                                            `Descuento aplicado a la venta: $${parseFloat(venta.descuento_monto).toFixed(2)}` :
                                                            `Descuento aplicado a la venta: ${parseFloat(venta.descuento_porcentaje).toFixed(2)}%`
                                                        }
                                                    </p>
                                                )}
                                            </td>
                                        </tr>
                                    )}
                                </React.Fragment>
                            ))}
                        </tbody>
                    </table>
                    </div>

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
            
            {/* Modal de Detalle de Cambio/Devolución */}
            {cambioDevolucionDetalle && (
                <div style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    backgroundColor: 'rgba(0,0,0,0.5)',
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    zIndex: 1000
                }}>
                    <div style={{
                        backgroundColor: 'white',
                        padding: '20px',
                        borderRadius: '8px',
                        maxWidth: '800px',
                        maxHeight: '90vh',
                        overflowY: 'auto',
                        width: '90%'
                    }}>
                        <h2 style={{ marginTop: 0 }}>Detalle del Cambio/Devolución</h2>
                        
                        <div style={{ marginBottom: '15px' }}>
                            <p><strong>ID:</strong> {cambioDevolucionDetalle.id}</p>
                            <p><strong>Tipo:</strong> {cambioDevolucionDetalle.tipo}</p>
                            <p><strong>Estado:</strong> {cambioDevolucionDetalle.estado}</p>
                            <p><strong>Fecha:</strong> {new Date(cambioDevolucionDetalle.fecha_creacion).toLocaleString()}</p>
                            <p><strong>Venta Original:</strong> {cambioDevolucionDetalle.venta_original_id}</p>
                            <p><strong>Monto Devolución:</strong> ${parseFloat(cambioDevolucionDetalle.monto_devolucion || 0).toFixed(2)}</p>
                            <p><strong>Monto Nuevo:</strong> ${parseFloat(cambioDevolucionDetalle.monto_nuevo || 0).toFixed(2)}</p>
                            <p><strong>Diferencia:</strong> ${parseFloat(cambioDevolucionDetalle.monto_diferencia || 0).toFixed(2)}</p>
                            {parseFloat(cambioDevolucionDetalle.saldo_a_favor || 0) > 0 && (
                                <p><strong>Saldo a Favor:</strong> ${parseFloat(cambioDevolucionDetalle.saldo_a_favor).toFixed(2)}</p>
                            )}
                        </div>
                        
                        {cambioDevolucionDetalle.detalles && cambioDevolucionDetalle.detalles.length > 0 && (
                            <div style={{ marginBottom: '15px' }}>
                                <h3>Detalles:</h3>
                                <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '10px' }}>
                                    <thead>
                                        <tr style={{ backgroundColor: '#f2f2f2' }}>
                                            <th style={{ padding: '8px', border: '1px solid #ddd', textAlign: 'left' }}>Acción</th>
                                            <th style={{ padding: '8px', border: '1px solid #ddd', textAlign: 'left' }}>Producto Devuelto</th>
                                            <th style={{ padding: '8px', border: '1px solid #ddd', textAlign: 'left' }}>Producto Nuevo</th>
                                            <th style={{ padding: '8px', border: '1px solid #ddd', textAlign: 'left' }}>Cantidad</th>
                                            <th style={{ padding: '8px', border: '1px solid #ddd', textAlign: 'left' }}>Precio Devuelto</th>
                                            <th style={{ padding: '8px', border: '1px solid #ddd', textAlign: 'left' }}>Precio Nuevo</th>
                                            <th style={{ padding: '8px', border: '1px solid #ddd', textAlign: 'left' }}>Subtotal Devuelto</th>
                                            <th style={{ padding: '8px', border: '1px solid #ddd', textAlign: 'left' }}>Subtotal Nuevo</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {cambioDevolucionDetalle.detalles.map((detalle, index) => (
                                            <tr key={index}>
                                                <td style={{ padding: '8px', border: '1px solid #ddd' }}>{detalle.accion}</td>
                                                <td style={{ padding: '8px', border: '1px solid #ddd' }}>
                                                    {detalle.producto_devuelto_nombre || detalle.producto_original_nombre || '-'}
                                                </td>
                                                <td style={{ padding: '8px', border: '1px solid #ddd' }}>
                                                    {detalle.producto_nuevo_nombre || '-'}
                                                </td>
                                                <td style={{ padding: '8px', border: '1px solid #ddd' }}>{detalle.cantidad}</td>
                                                <td style={{ padding: '8px', border: '1px solid #ddd' }}>
                                                    {detalle.precio_unitario_devuelto ? `$${parseFloat(detalle.precio_unitario_devuelto).toFixed(2)}` : '-'}
                                                </td>
                                                <td style={{ padding: '8px', border: '1px solid #ddd' }}>
                                                    {detalle.precio_unitario_nuevo ? `$${parseFloat(detalle.precio_unitario_nuevo).toFixed(2)}` : '-'}
                                                </td>
                                                <td style={{ padding: '8px', border: '1px solid #ddd' }}>
                                                    ${parseFloat(detalle.subtotal_devuelto || 0).toFixed(2)}
                                                </td>
                                                <td style={{ padding: '8px', border: '1px solid #ddd' }}>
                                                    ${parseFloat(detalle.subtotal_nuevo || 0).toFixed(2)}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                        
                        {cambioDevolucionDetalle.nota_credito_generada && cambioDevolucionDetalle.venta_nota_credito_id && (
                            <div style={{ marginBottom: '15px', padding: '10px', backgroundColor: '#d4edda', borderRadius: '4px' }}>
                                <p><strong>Nota de Crédito Generada:</strong> {cambioDevolucionDetalle.venta_nota_credito_id}</p>
                            </div>
                        )}
                        
                        {cambioDevolucionDetalle.diferencia_pendiente && cambioDevolucionDetalle.venta_diferencia_pendiente_id && (
                            <div style={{ marginBottom: '15px', padding: '10px', backgroundColor: '#fff3cd', borderRadius: '4px' }}>
                                <p><strong>Venta Diferencia Pendiente:</strong> {cambioDevolucionDetalle.venta_diferencia_pendiente_id}</p>
                            </div>
                        )}
                        
                        <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
                            {cambioDevolucionDetalle.estado !== 'CANCELADO' && (
                                <button
                                    onClick={() => handleAnularCambioDevolucion(cambioDevolucionDetalle.id)}
                                    style={{
                                        padding: '10px 15px',
                                        backgroundColor: '#dc3545',
                                        color: 'white',
                                        border: 'none',
                                        borderRadius: '4px',
                                        cursor: 'pointer'
                                    }}
                                >
                                    Cancelar Cambio/Devolución
                                </button>
                            )}
                            <button
                                onClick={() => setCambioDevolucionDetalle(null)}
                                style={{
                                    padding: '10px 15px',
                                    backgroundColor: '#6c757d',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '4px',
                                    cursor: 'pointer'
                                }}
                            >
                                Cerrar
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {showAlertMessage && (
                <div style={{ ...styles.alertBox, backgroundColor: alertType === 'error' ? '#dc3545' : (alertType === 'info' ? '#17a2b8' : '#28a745') }}>
                    <p>{alertMessage}</p>
                </div>
            )}
            <style>
                {`
                @media (max-width: 768px) {
                    [style*="filtersContainer"] {
                        flex-direction: column;
                        align-items: stretch;
                        gap: 10px;
                    }
                    [style*="filterGroup"] {
                        width: 100%;
                    }
                    [style*="filterInput"] {
                        width: 100%;
                        box-sizing: border-box;
                    }
                    [style*="actionButtons"] {
                        flex-direction: column;
                        gap: 8px;
                    }
                    [style*="actionButtons"] button {
                        width: 100%;
                    }
                    [style*="tableResponsive"] {
                        overflow-x: auto;
                    }
                    table {
                        width: 100%;
                        white-space: nowrap;
                    }
                    [style*="detailTableWrapper"] table {
                        width: 100%;
                        white-space: nowrap;
                    }
                    [style*="paginationContainer"] {
                        flex-direction: column;
                        gap: 10px;
                    }
                    [style*="paginationButton"] {
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
        padding: '0',
        fontFamily: 'Inter, sans-serif',
        width: '100%',
        maxWidth: '100%',
        color: '#333',
    },
    header: {
        color: '#2c3e50',
        marginBottom: '1.25rem',
        fontSize: '1.5rem',
        fontWeight: '600',
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
    filterButtonSecondary: {
        padding: '10px 15px',
        backgroundColor: '#6c757d',
        color: 'white',
        border: 'none',
        borderRadius: '5px',
        cursor: 'pointer',
        fontSize: '14px',
        transition: 'background-color 0.3s ease',
    },
    actionButtons: {
        display: 'flex',
        gap: '5px',
        flexWrap: 'wrap',
    },
    detailButton: {
        padding: '6px 10px',
        border: 'none',
        borderRadius: '4px',
        cursor: 'pointer',
        fontSize: '0.9em',
        color: 'white',
        transition: 'background-color 0.3s ease',
        backgroundColor: '#17a2b8',
    },
    facturaButton: {
        padding: '8px 16px',
        backgroundColor: '#28a745',
        color: 'white',
        border: 'none',
        borderRadius: '4px',
        cursor: 'pointer',
        fontSize: '14px',
        marginLeft: '5px',
    },
    anularButton: {
        padding: '6px 10px',
        border: 'none',
        borderRadius: '4px',
        cursor: 'pointer',
        fontSize: '0.9em',
        color: 'white',
        transition: 'background-color 0.3s ease',
        backgroundColor: '#dc3545',
    },
    reprintButton: {
        padding: '6px 10px',
        border: 'none',
        borderRadius: '4px',
        cursor: 'pointer',
        fontSize: '0.9em',
        color: 'white',
        transition: 'background-color 0.3s ease',
        backgroundColor: '#28a745',
    },
    tableResponsive: {
        overflowX: 'auto',
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
    td: {
        padding: '10px 15px',
        borderBottom: '1px solid #eee',
        verticalAlign: 'middle',
        fontSize: '0.9em',
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
    detailTableWrapper: {
        overflowX: 'auto',
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
    modalOverlay: {
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 1000,
    },
    modalContent: {
        backgroundColor: 'white',
        padding: '30px',
        borderRadius: '8px',
        boxShadow: '0 4px 15px rgba(0, 0, 0, 0.2)',
        maxWidth: '500px',
        width: '90%',
        textAlign: 'center',
    },
    modalMessage: {
        fontSize: '1.1em',
        marginBottom: '20px',
        color: '#333',
    },
    modalActions: {
        display: 'flex',
        justifyContent: 'center',
        gap: '15px',
    },
    modalConfirmButton: {
        padding: '10px 20px',
        backgroundColor: '#28a745',
        color: 'white',
        border: 'none',
        borderRadius: '5px',
        cursor: 'pointer',
        fontSize: '1em',
        transition: 'background-color 0.3s ease',
    },
    modalCancelButton: {
        padding: '10px 20px',
        backgroundColor: '#dc3545',
        color: 'white',
        border: 'none',
        borderRadius: '5px',
        cursor: 'pointer',
        fontSize: '1em',
        transition: 'background-color 0.3s ease',
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
    discountDisplay: {
        textAlign: 'right',
        fontStyle: 'italic',
        marginTop: '10px',
        color: '#555',
    },
};

export default VentasPage;