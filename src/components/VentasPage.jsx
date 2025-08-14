// BONITO_AMOR/frontend/src/components/VentasPage.jsx

import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { useAuth } from '../AuthContext';
import { useNavigate } from 'react-router-dom';

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

const VentasPage = () => {
    const { user, token, isAuthenticated, loading: authLoading, selectedStoreSlug, stores } = useAuth(); 
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
        console.log('Botón Anular Venta presionado para ID:', ventaId);
        if (!token) {
            showCustomAlert("Error de autenticación. Por favor, reinicia sesión.", 'error');
            return;
        }

        setConfirmMessage('¿Estás seguro de que quieres ANULAR esta venta completa? Esta acción es irreversible y afectará el stock.');
        setConfirmAction(() => async () => {
            setShowConfirmModal(false); 
            try {
                // CORRECCIÓN: Se cambia 'anular_venta' a 'anular' para que coincida con el backend.
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
                // CORRECCIÓN: Se cambia 'anular_detalle_venta' a 'anular_detalle' para que coincida con el backend.
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
        return <div className="loading-message">Cargando datos de usuario...</div>;
    }

    if (!isAuthenticated || !user.is_superuser) { 
        return <div className="access-denied-message">Acceso denegado. Solo los superusuarios pueden ver/gestionar ventas.</div>;
    }

    if (!selectedStoreSlug) {
        return (
            <div className="no-store-selected-message">
                <h2>Por favor, selecciona una tienda en la barra de navegación para ver las ventas.</h2>
            </div>
        );
    }

    if (loading) {
        return <div className="loading-message">Cargando ventas de {selectedStoreSlug}...</div>;
    }

    if (error) {
        return <div className="error-message">{error}</div>;
    }

    return (
        <div className="container">
            <h1>Listado de Ventas ({selectedStoreSlug})</h1>

            <div className="filters-container">
                <div className="filter-group">
                    <label className="filter-label">Fecha:</label>
                    <input
                        type="date"
                        value={filterDate}
                        onChange={(e) => setFilterDate(e.target.value)}
                        className="filter-input"
                    />
                </div>
                <div className="filter-group">
                    <label className="filter-label">Vendedor:</label>
                    <select
                        value={filterSellerId}
                        onChange={(e) => setFilterSellerId(e.target.value)}
                        className="filter-input"
                    >
                        <option value="">Todos</option>
                        {sellers.map(seller => (
                            <option key={seller.id} value={seller.id}>{seller.username} ({seller.first_name} {seller.last_name})</option>
                        ))}
                    </select>
                </div>
                <div className="filter-group">
                    <label className="filter-label">Anulada:</label>
                    <select
                        value={filterAnulada}
                        onChange={(e) => setFilterAnulada(e.target.value)}
                        className="filter-input"
                    >
                        <option value="">Todas</option>
                        <option value="false">No Anuladas</option> 
                        <option value="true">Anuladas</option>    
                    </select>
                </div>
                <button onClick={applyFilters} className="filter-button">Aplicar Filtros</button>
                <button onClick={clearFilters} className="filter-button-secondary">Limpiar Filtros</button>
            </div>

            {ventas.length === 0 ? (
                <p className="no-data-message">No hay ventas disponibles para esta tienda con los filtros aplicados.</p>
            ) : (
                <>
                    <div className="table-responsive">
                    <table className="table">
                        <thead>
                            <tr className="table-header-row">
                                <th className="th">Fecha</th>
                                <th className="th">Total</th>
                                <th className="th">Vendedor</th>
                                <th className="th">Método Pago</th>
                                <th className="th">Anulada</th>
                                <th className="th">Acciones</th>
                            </tr>
                        </thead>
                        <tbody>
                            {ventas.map(venta => (
                                <React.Fragment key={venta.id}>
                                    <tr>
                                        <td className="td">{new Date(venta.fecha_venta).toLocaleString()}</td>
                                        <td className="td">${parseFloat(venta.total || 0).toFixed(2)}</td> 
                                        <td className="td">{venta.usuario ? venta.usuario.username : 'N/A'}</td>
                                        <td className="td">{venta.metodo_pago || 'N/A'}</td>
                                        <td className="td">
                                            {venta.anulada ? 'Sí' : 'No'}
                                        </td>
                                        <td className="td">
                                            <div className="action-buttons">
                                                <button
                                                    onClick={() => setExpandedSaleId(expandedSaleId === venta.id ? null : venta.id)}
                                                    className="detail-button"
                                                >
                                                    {expandedSaleId === venta.id ? 'Ocultar' : 'Ver'}
                                                </button>
                                                {!venta.anulada && (
                                                    <button
                                                        onClick={() => {
                                                            console.log('Intentando anular venta:', venta.id);
                                                            handleAnularVenta(venta.id);
                                                        }}
                                                        className="anular-button"
                                                    >
                                                        Anular
                                                    </button>
                                                )}
                                                <button
                                                    onClick={() => handleReimprimirRecibo(venta)}
                                                    className="reprint-button"
                                                >
                                                    Recibo
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                    {expandedSaleId === venta.id && venta.detalles && (
                                        <tr>
                                            <td colSpan="6" className="detail-row">
                                                <h4 className="detail-header">Detalles de la Venta {venta.id}</h4>
                                                <div className="detail-table-wrapper">
                                                <table className="detail-table">
                                                    <thead>
                                                        <tr>
                                                            <th className="detail-th">Producto</th>
                                                            <th className="th">Cantidad</th>
                                                            <th className="th">P. Unitario (con desc.)</th>
                                                            <th className="th">Subtotal (con desc.)</th>
                                                            <th className="th">Anulado</th>
                                                            <th className="th">Acciones Detalle</th>
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
                                                                        <td className="detail-td">{detalle.producto_nombre}</td>
                                                                        <td className="detail-td">{detalle.cantidad}</td>
                                                                        <td className="detail-td">${precioUnitarioConDescuento.toFixed(2)}</td> 
                                                                        <td className="detail-td">${subtotalConDescuento.toFixed(2)}</td> 
                                                                        <td className="detail-td">{detalle.anulado_individualmente ? 'Sí' : 'No'}</td>
                                                                        <td className="detail-td">
                                                                            {!venta.anulada && !detalle.anulado_individualmente && ( 
                                                                                <button
                                                                                    onClick={() => handleAnularDetalleVenta(venta.id, detalle.id)}
                                                                                    className="anular-detalle-button"
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
                                                                <td colSpan="6" className="no-data-message">No hay detalles para esta venta.</td>
                                                            </tr>
                                                        )}
                                                    </tbody>
                                                </table>
                                                </div>
                                                {venta.descuento_porcentaje > 0 && (
                                                    <p className="discount-display">
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
                    </div>

                    <div className="pagination-container">
                        <button onClick={() => fetchVentas(prevPageUrl)} disabled={!prevPageUrl} className="pagination-button">
                            Anterior
                        </button>
                        <span className="page-number">Página {currentPageNumber}</span>
                        <button onClick={() => fetchVentas(nextPageUrl)} disabled={!nextPageUrl} className="pagination-button">
                            Siguiente
                        </button>
                    </div>
                </>
            )}

            {showConfirmModal && (
                <div className="modal-overlay">
                    <div className="modal-content">
                        <p className="modal-message">{confirmMessage}</p>
                        <div className="modal-actions">
                            <button onClick={confirmAction} className="modal-confirm-button">Sí</button>
                            <button onClick={() => setShowConfirmModal(false)} className="modal-cancel-button">No</button>
                        </div>
                    </div>
                </div>
            )}

            {showAlertMessage && (
                <div className="alert-box" style={{ backgroundColor: alertType === 'error' ? '#dc3545' : (alertType === 'info' ? '#17a2b8' : '#28a745') }}>
                    <p>{alertMessage}</p>
                </div>
            )}
        </div>
    );
};


export default VentasPage;