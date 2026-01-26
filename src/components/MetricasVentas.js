//BONITO_AMOR/frontend/src/components/MetricasVentas.js
import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { useAuth } from '../AuthContext';

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

const MetricasVentas = () => {
    const { user, token, isAuthenticated, loading: authLoading, selectedStoreSlug, stores } = useAuth();
    const [metrics, setMetrics] = useState(null);
    const [metricsPreviousMonth, setMetricsPreviousMonth] = useState(null);
    const [inventoryMetrics, setInventoryMetrics] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [validationError, setValidationError] = useState(null);

    const today = new Date();
    const currentYear = today.getFullYear().toString();
    const currentMonth = (today.getMonth() + 1).toString().padStart(2, '0');

    // Filtros aplicados: rango (date_from/date_to) o mes completo (ambos vacíos = mes en curso)
    const [filterDateFrom, setFilterDateFrom] = useState('');
    const [filterDateTo, setFilterDateTo] = useState('');
    const [filterSellerId, setFilterSellerId] = useState('');
    const [filterPaymentMethod, setFilterPaymentMethod] = useState('');

    // Filtros pendientes (para los inputs)
    const [pendingDateFrom, setPendingDateFrom] = useState('');
    const [pendingDateTo, setPendingDateTo] = useState('');
    const [pendingFilterSellerId, setPendingFilterSellerId] = useState('');
    const [pendingFilterPaymentMethod, setPendingFilterPaymentMethod] = useState('');

    const [sellers, setSellers] = useState([]);
    const [paymentMethods, setPaymentMethods] = useState([]);


    const fetchMetrics = useCallback(async () => {
        if (!token || !selectedStoreSlug) {
            setLoading(false);
            return;
        }
        setLoading(true);
        setError(null);
        try {
            const params = {
                tienda_slug: selectedStoreSlug,
                seller_id: filterSellerId || undefined,
                payment_method: filterPaymentMethod || undefined,
            };
            if (filterDateFrom || filterDateTo) {
                const from = filterDateFrom || filterDateTo;
                const to = filterDateTo || filterDateFrom;
                params.date_from = from;
                params.date_to = to;
            } else {
                params.year = currentYear;
                params.month = currentMonth;
            }
            const response = await axios.get(`${BASE_API_ENDPOINT}/api/metricas/metrics/`, {
                headers: { 'Authorization': `Bearer ${token}` },
                params,
            });
            setMetrics(response.data);
        } catch (err) {
            setError('Error al cargar las métricas: ' + (err.response ? JSON.stringify(err.response.data) : err.message));
            console.error('Error fetching metrics:', err.response || err.message);
        } finally {
            setLoading(false);
        }
    }, [token, selectedStoreSlug, filterDateFrom, filterDateTo, filterSellerId, filterPaymentMethod]);

    const fetchInventoryMetrics = useCallback(async () => {
        if (!token || !selectedStoreSlug) return;
        try {
            const response = await axios.get(`${BASE_API_ENDPOINT}/api/inventario/metrics/`, {
                headers: { 'Authorization': `Bearer ${token}` },
                params: {
                    tienda_slug: selectedStoreSlug
                }
            });
            setInventoryMetrics(response.data);
        } catch (err) {
            console.error('Error fetching inventory metrics:', err.response || err.message);
        }
    }, [token, selectedStoreSlug]);

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
        }
    }, [token, selectedStoreSlug]); 

    const fetchPaymentMethods = useCallback(async () => {
        if (!token) return;
        try {
            const response = await axios.get(`${BASE_API_ENDPOINT}/api/metodos-pago/`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            setPaymentMethods(response.data.results || response.data);
        } catch (err) {
            console.error("Error al cargar métodos de pago:", err.response ? err.response.data : err.message);
        }
    }, [token]);
    
    useEffect(() => {
        if (!authLoading && isAuthenticated && user && user.is_superuser && selectedStoreSlug) {
            fetchMetrics();
            const fullMonth = !filterDateFrom && !filterDateTo;
            if (fullMonth) {
                (async () => {
                    const m = parseInt(currentMonth, 10);
                    const y = parseInt(currentYear, 10);
                    const prevM = m === 1 ? 12 : m - 1;
                    const prevY = m === 1 ? y - 1 : y;
                    try {
                        const res = await axios.get(`${BASE_API_ENDPOINT}/api/metricas/metrics/`, {
                            headers: { 'Authorization': `Bearer ${token}` },
                            params: {
                                tienda_slug: selectedStoreSlug,
                                year: prevY.toString(),
                                month: prevM.toString().padStart(2, '0'),
                                seller_id: filterSellerId || undefined,
                                payment_method: filterPaymentMethod || undefined,
                            },
                        });
                        setMetricsPreviousMonth(res.data);
                    } catch (e) {
                        setMetricsPreviousMonth(null);
                    }
                })();
            } else {
                setMetricsPreviousMonth(null);
            }
            fetchInventoryMetrics();
            fetchSellers();
            fetchPaymentMethods();
        } else if (!authLoading && (!isAuthenticated || !user || !user.is_superuser)) {
            setError("Acceso denegado. Solo los superusuarios pueden ver las métricas.");
            setLoading(false);
        } else if (!authLoading && isAuthenticated && user && user.is_superuser && !selectedStoreSlug) {
            setLoading(false);
        }
    }, [isAuthenticated, user, authLoading, selectedStoreSlug, token, filterDateFrom, filterDateTo, filterSellerId, filterPaymentMethod, fetchMetrics, fetchSellers, fetchPaymentMethods, fetchInventoryMetrics]);
    
    const handleApplyFilters = () => {
        if (pendingDateFrom && pendingDateTo && pendingDateFrom > pendingDateTo) {
            setValidationError('La fecha "Desde" debe ser anterior o igual a "Hasta".');
            return;
        }
        setValidationError(null);
        setFilterDateFrom(pendingDateFrom);
        setFilterDateTo(pendingDateTo);
        setFilterSellerId(pendingFilterSellerId);
        setFilterPaymentMethod(pendingFilterPaymentMethod);
    };

    const handleMesActual = () => {
        setValidationError(null);
        setPendingDateFrom('');
        setPendingDateTo('');
        setFilterDateFrom('');
        setFilterDateTo('');
    };

    const handleClearFilters = () => {
        setValidationError(null);
        setPendingDateFrom('');
        setPendingDateTo('');
        setPendingFilterSellerId('');
        setPendingFilterPaymentMethod('');
        setFilterDateFrom('');
        setFilterDateTo('');
        setFilterSellerId('');
        setFilterPaymentMethod('');
    };

    if (authLoading || (isAuthenticated && !user)) { 
        return <div style={styles.loadingMessage}>Cargando datos de usuario...</div>;
    }

    if (!isAuthenticated || !user.is_superuser) {
        return <div style={styles.accessDeniedMessage}>Acceso denegado. Solo los superusuarios pueden ver las métricas.</div>;
    }

    if (!selectedStoreSlug) {
        return (
            <div style={styles.noStoreSelectedMessage}>
                <p>Selecciona una tienda en el menú para ver las métricas.</p>
            </div>
        );
    }

    if (loading) {
        return <div style={styles.loadingMessage}>Cargando métricas de {selectedStoreSlug}...</div>;
    }

    if (error) {
        return <div style={styles.errorMessage}>{error}</div>;
    }

    return (
        <>
            <style>{mobileStyles}</style>
            <div style={styles.container} className="metricas-container">
            <h1 style={styles.pageTitle}>Métricas</h1>

            <div style={styles.filtersContainer} className="metricas-filters-container">
                <div style={styles.periodSection} className="metricas-period-section">
                    <span style={styles.periodSectionTitle}>Período</span>
                    <div style={styles.periodInputs} className="metricas-period-inputs">
                        <div style={styles.filterGroup} className="metricas-filter-group">
                            <label style={styles.filterLabel}>Desde</label>
                            <input
                                type="date"
                                value={pendingDateFrom}
                                onChange={(e) => { setValidationError(null); setPendingDateFrom(e.target.value); }}
                                style={styles.filterInput}
                                className="metricas-filter-input"
                            />
                        </div>
                        <div style={styles.filterGroup} className="metricas-filter-group">
                            <label style={styles.filterLabel}>Hasta</label>
                            <input
                                type="date"
                                value={pendingDateTo}
                                onChange={(e) => { setValidationError(null); setPendingDateTo(e.target.value); }}
                                style={styles.filterInput}
                                className="metricas-filter-input"
                            />
                        </div>
                    </div>
                    <p style={styles.periodHint}>Dejar vacío = mes en curso completo. Solo Desde = ese día.</p>
                    {validationError && <p style={styles.validationError}>{validationError}</p>}
                </div>
                <div style={styles.filtersRow2} className="metricas-filters-row2">
                    <div style={styles.filterGroup} className="metricas-filter-group">
                        <label style={styles.filterLabel}>Vendedor</label>
                        <select
                            value={pendingFilterSellerId}
                            onChange={(e) => setPendingFilterSellerId(e.target.value)}
                            style={styles.filterInput}
                            className="metricas-filter-input"
                        >
                            <option value="">Todos</option>
                            {sellers.map(seller => (
                                <option key={seller.id} value={seller.id}>{seller.username}</option>
                            ))}
                        </select>
                    </div>
                    <div style={styles.filterGroup} className="metricas-filter-group">
                        <label style={styles.filterLabel}>Método de pago</label>
                        <select
                            value={pendingFilterPaymentMethod}
                            onChange={(e) => setPendingFilterPaymentMethod(e.target.value)}
                            style={styles.filterInput}
                            className="metricas-filter-input"
                        >
                            <option value="">Todos</option>
                            {paymentMethods.map(method => (
                                <option key={method.id} value={method.nombre}>{method.nombre}</option>
                            ))}
                        </select>
                    </div>
                    <div style={styles.filterActions} className="metricas-filter-actions">
                        <button onClick={handleMesActual} style={{ ...styles.filterButton, ...styles.filterButtonSecondary }}>Mes actual</button>
                        <button onClick={handleApplyFilters} style={styles.filterButton}>Aplicar</button>
                        <button onClick={handleClearFilters} style={{ ...styles.filterButton, ...styles.filterButtonMuted }}>Limpiar</button>
                    </div>
                </div>
            </div>

            {(() => {
                const showVariation = !filterDateFrom && !filterDateTo;
                const prev = metricsPreviousMonth;
                const cur = metrics || {};
                const pv = (c, p) => (p != null && Number(p) !== 0) ? (((Number(c) || 0) - Number(p)) / Math.abs(Number(p))) * 100 : null;
                const varVentas = showVariation ? pv(cur.total_ventas_periodo, prev?.total_ventas_periodo) : null;
                const varEgresos = showVariation ? pv(cur.total_compras_periodo, prev?.total_compras_periodo) : null;
                const varRent = showVariation ? pv(cur.rentabilidad_bruta_periodo, prev?.rentabilidad_bruta_periodo) : null;
                const VarBadge = ({ v }) => {
                    if (v == null) return null;
                    const isPos = v >= 0;
                    return (
                        <span style={{ ...styles.variationBadge, color: isPos ? '#0d8050' : '#c0392b' }}>
                            {isPos ? '+' : ''}{v.toFixed(1)}% vs mes ant.
                        </span>
                    );
                };
                const meses = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
                const formatDay = (s) => s ? s.split('-').reverse().join('/') : '';
                const periodLabel = (filterDateFrom && filterDateTo)
                    ? `${formatDay(filterDateFrom)} – ${formatDay(filterDateTo)}`
                    : (filterDateFrom || filterDateTo)
                        ? formatDay(filterDateFrom || filterDateTo)
                        : `${meses[parseInt(currentMonth, 10) - 1]} ${currentYear}`;
                return (
                    <>
                        <p style={styles.periodLabel}>Período: {periodLabel}</p>
                        <div style={styles.heroCards} className="metricas-hero-cards">
                            <div style={{ ...styles.heroCard, borderLeftColor: '#27ae60' }}>
                                <h3 style={styles.heroCardTitle}>Total de ventas</h3>
                                <p style={styles.heroCardValue}>${parseFloat(metrics?.total_ventas_periodo || 0).toFixed(2)}</p>
                                <VarBadge v={varVentas} />
                            </div>
                            <div style={{ ...styles.heroCard, borderLeftColor: '#e67e22' }}>
                                <h3 style={styles.heroCardTitle}>Total de egresos</h3>
                                <p style={styles.heroCardValue}>${parseFloat(metrics?.total_compras_periodo || 0).toFixed(2)}</p>
                                <VarBadge v={varEgresos} />
                            </div>
                            <div style={{ ...styles.heroCard, borderLeftColor: '#3498db' }}>
                                <h3 style={styles.heroCardTitle}>Rentabilidad bruta</h3>
                                <p style={styles.heroCardValue}>${parseFloat(metrics?.rentabilidad_bruta_periodo || 0).toFixed(2)}</p>
                                <VarBadge v={varRent} />
                            </div>
                        </div>
                        <div style={styles.summaryCards} className="metricas-summary-cards">
                            <div style={styles.card}>
                                <h3 style={styles.cardTitle}>Costo de productos vendidos</h3>
                                <p style={styles.cardValue}>${parseFloat(metrics?.total_costo_vendido_periodo || 0).toFixed(2)}</p>
                            </div>
                            <div style={styles.card}>
                                <h3 style={styles.cardTitle}>Arancel Total Ventas</h3>
                                <p style={styles.cardValue}>${parseFloat(metrics?.total_arancel_ventas || 0).toFixed(2)}</p>
                            </div>
                            <div style={styles.card}>
                                <h3 style={styles.cardTitle}>Margen de Rentabilidad</h3>
                                <p style={styles.cardValue}>{parseFloat(metrics?.margen_rentabilidad_periodo || 0).toFixed(2)}%</p>
                            </div>
                            <div style={styles.card}>
                                <h3 style={styles.cardTitle}>Stock Total (Cantidad)</h3>
                                <p style={styles.cardValue}>{inventoryMetrics?.total_stock || 0}</p>
                            </div>
                            <div style={styles.card}>
                                <h3 style={styles.cardTitle}>Monto Total del Stock</h3>
                                <p style={styles.cardValue}>${parseFloat(inventoryMetrics?.total_monto_stock_precio || 0).toFixed(2)}</p>
                            </div>
                        </div>
                    </>
                );
            })()}

            <div style={styles.tablesContainer} className="metricas-tables-container">
                <div style={styles.tableContainer} className="metricas-table-container">
                    <h3 style={styles.tableTitle}>Productos Vendidos por Cantidad</h3>
                    {metrics?.productos_mas_vendidos.length > 0 ? (
                        <table style={styles.table} className="metricas-table">
                            <thead>
                                <tr>
                                    <th style={styles.th}>Nombre del Producto</th>
                                    <th style={styles.th}>Cantidad Vendida</th>
                                </tr>
                            </thead>
                            <tbody>
                                {metrics.productos_mas_vendidos.map((productMetric, index) => (
                                    <tr key={index}>
                                        <td style={styles.td}>
                                            {productMetric.producto__nombre || 'Producto sin nombre'}
                                            {productMetric.producto__talle && productMetric.producto__talle !== 'UNICO' ? ` - Talle: ${productMetric.producto__talle}` : ''}
                                        </td>
                                        <td style={styles.td}>{productMetric.cantidad_total}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    ) : (
                        <p style={styles.noDataMessage}>No hay datos de productos vendidos para este período.</p>
                    )}
                </div>

                <div style={styles.tableContainer} className="metricas-table-container">
                    <h3 style={styles.tableTitle}>Ventas por Vendedor</h3>
                    {metrics?.ventas_por_usuario.length > 0 ? (
                        <table style={styles.table} className="metricas-table">
                            <thead>
                                <tr>
                                    <th style={styles.th}>Vendedor</th>
                                    <th style={styles.th}>Monto Vendido</th>
                                    <th style={styles.th}>Cantidad de Ventas</th>
                                </tr>
                            </thead>
                            <tbody>
                                {metrics.ventas_por_usuario.map((sellerMetric, index) => (
                                    <tr key={index}>
                                        <td style={styles.td}>{sellerMetric.usuario__username}</td>
                                        <td style={styles.td}>${parseFloat(sellerMetric.total_vendido).toFixed(2)}</td>
                                        <td style={styles.td}>{sellerMetric.cantidad_ventas}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    ) : (
                        <p style={styles.noDataMessage}>No hay datos de ventas por vendedor para este período.</p>
                    )}
                </div>

                <div style={styles.tableContainer} className="metricas-table-container">
                    <h3 style={styles.tableTitle}>Ventas por Método de Pago</h3>
                    {metrics?.ventas_por_metodo_pago.length > 0 ? (
                        <table style={styles.table} className="metricas-table">
                            <thead>
                                <tr>
                                    <th style={styles.th}>Método de Pago</th>
                                    <th style={styles.th}>Monto Total</th>
                                </tr>
                            </thead>
                            <tbody>
                                {metrics.ventas_por_metodo_pago.map((methodMetric, index) => (
                                    <tr key={index}>
                                        <td style={styles.td}>{methodMetric.metodo_pago}</td>
                                        <td style={styles.td}>${parseFloat(methodMetric.total_vendido).toFixed(2)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    ) : (
                        <p style={styles.noDataMessage}>No hay datos de ventas por método de pago para este período.</p>
                    )}
                </div>

                 <div style={styles.tableContainer} className="metricas-table-container">
                    <h3 style={styles.tableTitle}>Egresos Mensuales</h3>
                    {metrics?.egresos_por_mes.length > 0 ? (
                        <table style={styles.table} className="metricas-table">
                            <thead>
                                <tr>
                                    <th style={styles.th}>Mes</th>
                                    <th style={styles.th}>Año</th>
                                    <th style={styles.th}>Monto Total</th>
                                </tr>
                            </thead>
                            <tbody>
                                {metrics.egresos_por_mes.map((egreso, index) => (
                                    <tr key={index}>
                                        <td style={styles.td}>{egreso.mes}</td>
                                        <td style={styles.td}>{egreso.year}</td>
                                        <td style={styles.td}>${parseFloat(egreso.total_egresos).toFixed(2)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    ) : (
                        <p style={styles.noDataMessage}>No hay datos de egresos para este período.</p>
                    )}
                </div>
            </div>
        </div>
        </>
    );
};

const styles = {
    container: {
        padding: 0,
        fontFamily: 'Inter, sans-serif',
        width: '100%',
        maxWidth: '100%',
        color: '#333',
    },
    pageTitle: { color: '#2c3e50', fontSize: '1.5rem', fontWeight: 600, marginBottom: '1.25rem' },
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
        flexDirection: 'column',
        gap: '20px',
        marginBottom: '30px',
        padding: '20px',
        backgroundColor: '#ffffff',
        borderRadius: '8px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
    },
    periodSection: {
        display: 'flex',
        flexDirection: 'column',
        gap: '6px',
        width: '100%',
    },
    filtersRow2: {
        display: 'flex',
        flexWrap: 'wrap',
        gap: '15px',
        alignItems: 'flex-end',
        width: '100%',
    },
    periodSectionTitle: {
        fontWeight: 'bold',
        color: '#555',
        fontSize: '0.9rem',
    },
    periodInputs: {
        display: 'flex',
        flexWrap: 'wrap',
        gap: '12px',
        alignItems: 'flex-end',
    },
    periodHint: {
        margin: 0,
        fontSize: '0.8rem',
        color: '#6c757d',
    },
    validationError: {
        margin: '6px 0 0 0',
        fontSize: '0.85rem',
        color: '#c0392b',
        fontWeight: 600,
    },
    filterGroup: {
        display: 'flex',
        flexDirection: 'column',
    },
    filterLabel: {
        marginBottom: '5px',
        fontWeight: 'bold',
        color: '#555',
        fontSize: '0.9rem',
    },
    filterInput: {
        padding: '8px 12px',
        border: '1px solid #ccc',
        borderRadius: '4px',
        minWidth: '140px',
    },
    filterActions: {
        display: 'flex',
        flexWrap: 'wrap',
        gap: '10px',
        alignItems: 'flex-end',
    },
    filterButton: {
        padding: '10px 18px',
        backgroundColor: '#007bff',
        color: 'white',
        border: 'none',
        borderRadius: '5px',
        cursor: 'pointer',
        fontWeight: 'bold',
        transition: 'background-color 0.2s ease',
    },
    filterButtonSecondary: {
        backgroundColor: '#17a2b8',
    },
    filterButtonMuted: {
        backgroundColor: '#6c757d',
    },
    periodLabel: {
        fontSize: '0.95rem',
        color: '#5a6c7d',
        margin: '0 0 16px 0',
        fontWeight: 600,
    },
    heroCards: {
        display: 'grid',
        gridTemplateColumns: 'repeat(3, 1fr)',
        gap: '20px',
        marginBottom: '24px',
    },
    heroCard: {
        backgroundColor: '#ffffff',
        padding: '24px 20px',
        borderRadius: '12px',
        boxShadow: '0 4px 16px rgba(0,0,0,0.08)',
        textAlign: 'center',
        borderLeft: '4px solid #3498db',
    },
    heroCardTitle: {
        fontSize: '0.95rem',
        color: '#5a6c7d',
        margin: '0 0 12px 0',
        fontWeight: 600,
        textTransform: 'uppercase',
        letterSpacing: '0.03em',
    },
    heroCardValue: {
        fontSize: '1.75rem',
        fontWeight: 700,
        color: '#2c3e50',
        margin: '0 0 8px 0',
    },
    variationBadge: {
        fontSize: '0.85rem',
        fontWeight: 600,
    },
    summaryCards: {
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
        gap: '16px',
        marginBottom: '30px',
    },
    card: {
        backgroundColor: '#ffffff',
        padding: '20px',
        borderRadius: '8px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
        textAlign: 'center',
    },
    cardTitle: {
        fontSize: '1.1em',
        color: '#6c757d',
        margin: '0 0 10px 0',
    },
    cardValue: {
        fontSize: '2em',
        fontWeight: 'bold',
        color: '#34495e',
    },
    tablesContainer: {
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
        gap: '20px',
    },
    tableContainer: {
        backgroundColor: '#ffffff',
        padding: '25px',
        borderRadius: '8px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
    },
    tableTitle: {
        fontSize: '1.5em',
        color: '#34495e',
        marginBottom: '15px',
    },
    table: {
        width: '100%',
        borderCollapse: 'collapse',
        textAlign: 'left',
    },
    th: {
        padding: '12px',
        borderBottom: '2px solid #dee2e6',
        fontWeight: 'bold',
        color: '#333',
    },
    td: {
        padding: '12px',
        borderBottom: '1px solid #e9ecef',
        verticalAlign: 'middle',
    },
    noDataMessage: {
        textAlign: 'center',
        marginTop: '20px',
        color: '#777',
        fontStyle: 'italic',
    },
};

// Estilos responsivos para móviles
const mobileStyles = `
    @media (max-width: 768px) {
        .metricas-container {
            padding: 10px !important;
        }
        .metricas-filters-container {
            flex-direction: column !important;
            gap: 10px !important;
            align-items: stretch !important;
        }
        .metricas-period-section {
            width: 100%;
        }
        .metricas-period-inputs {
            flex-direction: column !important;
        }
        .metricas-filters-row2 {
            flex-direction: column !important;
            align-items: stretch !important;
        }
        .metricas-filter-group {
            width: 100% !important;
        }
        .metricas-filter-input {
            width: 100% !important;
            min-width: 0 !important;
            box-sizing: border-box;
        }
        .metricas-filter-actions {
            flex-wrap: wrap;
        }
        .metricas-hero-cards {
            grid-template-columns: 1fr !important;
        }
        .metricas-summary-cards {
            grid-template-columns: 1fr !important;
        }
        .metricas-card {
            padding: 15px !important;
        }
        .metricas-card-value {
            font-size: 1.5em !important;
        }
        .metricas-tables-container {
            grid-template-columns: 1fr !important;
        }
        .metricas-table-container {
            overflow-x: auto;
            -webkit-overflow-scrolling: touch;
        }
        .metricas-table {
            min-width: 500px;
            font-size: 0.85em;
        }
    }
    @media (max-width: 480px) {
        .metricas-table {
            font-size: 0.75em;
        }
        .metricas-table th,
        .metricas-table td {
            padding: 8px 4px !important;
        }
    }
`;

export default MetricasVentas;