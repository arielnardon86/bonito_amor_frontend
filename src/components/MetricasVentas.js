import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import * as XLSX from 'xlsx';
import { useAuth } from '../AuthContext';
import { formatearMonto } from '../utils/formatearMonto';

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
    const { user, token, isAuthenticated, loading: authLoading, selectedStoreSlug } = useAuth();
    const [metrics, setMetrics] = useState(null);
    const [metricsPreviousMonth, setMetricsPreviousMonth] = useState(null);
    const [inventoryMetrics, setInventoryMetrics] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [validationError, setValidationError] = useState(null);

    const today = new Date();

    // Navegación por mes (cuando no hay filtro de rango personalizado)
    const [navYear, setNavYear] = useState(today.getFullYear());
    const [navMonth, setNavMonth] = useState(today.getMonth() + 1);

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
                params.year = String(navYear);
                params.month = String(navMonth).padStart(2, '0');
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
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [token, selectedStoreSlug, filterDateFrom, filterDateTo, filterSellerId, filterPaymentMethod, navYear, navMonth]);

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
            // OPTIMIZACIÓN: Hacer llamadas en paralelo
            const loadData = async () => {
                const promises = [
                    fetchMetrics(),
                    fetchInventoryMetrics(),
                    fetchSellers(),
                    fetchPaymentMethods()
                ];
                
                // Cargar mes anterior solo si es necesario (lazy loading)
                const fullMonth = !filterDateFrom && !filterDateTo;
                if (fullMonth) {
                    const m = navMonth;
                    const y = navYear;
                    const prevM = m === 1 ? 12 : m - 1;
                    const prevY = m === 1 ? y - 1 : y;
                    promises.push(
                        axios.get(`${BASE_API_ENDPOINT}/api/metricas/metrics/`, {
                            headers: { 'Authorization': `Bearer ${token}` },
                            params: {
                                tienda_slug: selectedStoreSlug,
                                year: prevY.toString(),
                                month: prevM.toString().padStart(2, '0'),
                                seller_id: filterSellerId || undefined,
                                payment_method: filterPaymentMethod || undefined,
                            },
                        }).then(res => setMetricsPreviousMonth(res.data))
                          .catch(() => setMetricsPreviousMonth(null))
                    );
                } else {
                    setMetricsPreviousMonth(null);
                }
                
                await Promise.all(promises);
            };
            
            loadData();
        } else if (!authLoading && (!isAuthenticated || !user || !user.is_superuser)) {
            setError("Acceso denegado. Solo los superusuarios pueden ver las métricas.");
            setLoading(false);
        } else if (!authLoading && isAuthenticated && user && user.is_superuser && !selectedStoreSlug) {
            setLoading(false);
        }
    }, [isAuthenticated, user, authLoading, selectedStoreSlug, token, filterDateFrom, filterDateTo, filterSellerId, filterPaymentMethod, fetchMetrics, fetchSellers, fetchPaymentMethods, fetchInventoryMetrics, navMonth, navYear]);
    
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
        setNavYear(today.getFullYear());
        setNavMonth(today.getMonth() + 1);
    };

    const handlePrevMes = () => {
        if (navMonth === 1) { setNavMonth(12); setNavYear(y => y - 1); }
        else { setNavMonth(m => m - 1); }
    };

    const handleNextMes = () => {
        if (navMonth === 12) { setNavMonth(1); setNavYear(y => y + 1); }
        else { setNavMonth(m => m + 1); }
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

    // ── Derived values for rendering ──────────────────────────────────────────
    const showVariation = !filterDateFrom && !filterDateTo;
    const prev = metricsPreviousMonth;
    const cur = metrics || {};

    const pv = (c, p) => (p != null && Number(p) !== 0)
        ? (((Number(c) || 0) - Number(p)) / Math.abs(Number(p))) * 100
        : null;

    const varVentas  = showVariation ? pv(cur.total_ventas_periodo,      prev?.total_ventas_periodo)       : null;
    const varEgresos = showVariation ? pv(cur.total_compras_periodo,      prev?.total_compras_periodo)      : null;
    const varRent    = showVariation ? pv(cur.rentabilidad_bruta_periodo, prev?.rentabilidad_bruta_periodo) : null;

    const meses = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
    const formatDay = (s) => s ? s.split('-').reverse().join('/') : '';
    const periodLabel = (filterDateFrom && filterDateTo)
        ? `${formatDay(filterDateFrom)} – ${formatDay(filterDateTo)}`
        : (filterDateFrom || filterDateTo)
            ? formatDay(filterDateFrom || filterDateTo)
            : `${meses[navMonth - 1]} ${navYear}`;
    const isCurrentNavMonth = navYear === today.getFullYear() && navMonth === today.getMonth() + 1;
    const usingNavMonth = !filterDateFrom && !filterDateTo;

    const VarBadge = ({ v }) => {
        if (v == null) return null;
        const isPos = v >= 0;
        return (
            <span style={{
                display: 'inline-flex', alignItems: 'center', gap: 4,
                padding: '3px 9px', borderRadius: '9999px', fontSize: 11, fontWeight: 700,
                backgroundColor: isPos ? '#edfaf3' : '#fef2f2',
                color: isPos ? '#1a6a40' : '#991b1b',
                border: `1px solid ${isPos ? '#a8e6c5' : '#fca5a5'}`,
            }}>
                {isPos ? '▲' : '▼'} {isPos ? '+' : ''}{v.toFixed(1)}% vs mes ant.
            </span>
        );
    };

    const rentVal = parseFloat(metrics?.rentabilidad_bruta_periodo || 0);
    const rentPositive = rentVal >= 0;

    const margen = parseFloat(metrics?.margen_rentabilidad_periodo || 0);
    const margenColor  = margen >= 15 ? '#1a6a40'   : margen >= 5 ? '#92400e'  : '#991b1b';
    const margenBg     = margen >= 15 ? '#edfaf3'   : margen >= 5 ? '#fffbeb'  : '#fef2f2';
    const margenBorder = margen >= 15 ? '#a8e6c5'   : margen >= 5 ? '#fcd34d'  : '#fca5a5';
    const margenLabel  = margen >= 15 ? 'saludable' : margen >= 5 ? 'bajo'     : 'negativo';
    const margenDot    = margen >= 15 ? '#5dc87a'   : margen >= 5 ? '#f59e0b'  : '#e25252';

    const handleDownloadExcel = () => {
        if (!metrics) return;

        const fmt = (v) => parseFloat(v || 0);
        const wb = XLSX.utils.book_new();

        // ── Hoja 1: Resumen ──────────────────────────────────────────────────
        const resumenData = [
            ['Período', periodLabel],
            ['Tienda', selectedStoreSlug],
            filterSellerId ? ['Vendedor', sellers.find(s => String(s.id) === String(filterSellerId))?.username || filterSellerId] : null,
            filterPaymentMethod ? ['Método de pago', filterPaymentMethod] : null,
            [],
            ['Indicador', 'Valor'],
            ['Total de ventas', fmt(metrics.total_ventas_periodo)],
            ['Total de egresos', fmt(metrics.total_compras_periodo)],
            ['Rentabilidad bruta', fmt(metrics.rentabilidad_bruta_periodo)],
            ['Costo productos vendidos', fmt(metrics.total_costo_vendido_periodo)],
            ['Aranceles (manual)', fmt(metrics.total_arancel_ventas) + fmt(metrics.total_costo_envio_ml)],
            metrics.tienda_tiene_ml ? ['Descuentos Mercado Libre', fmt(metrics.total_ml_descuentos)] : null,
            metrics.tienda_tiene_ml ? ['Impuestos Mercado Libre', fmt(metrics.total_ml_impuestos)] : null,
            ['Margen de rentabilidad (%)', fmt(metrics.margen_rentabilidad_periodo)],
            [],
            ['Stock total (unidades)', inventoryMetrics?.total_stock || 0],
            ['Valor total del stock', fmt(inventoryMetrics?.total_monto_stock_precio)],
        ].filter(Boolean);

        const wsResumen = XLSX.utils.aoa_to_sheet(resumenData);
        wsResumen['!cols'] = [{ wch: 30 }, { wch: 20 }];
        XLSX.utils.book_append_sheet(wb, wsResumen, 'Resumen');

        // ── Hoja 2: Productos más vendidos ──────────────────────────────────
        if (metrics.productos_mas_vendidos?.length > 0) {
            const rows = [['#', 'Producto', 'Talle', 'Cantidad vendida', 'Monto total']];
            metrics.productos_mas_vendidos.forEach((p, i) => {
                rows.push([
                    i + 1,
                    p.producto__nombre || 'Sin nombre',
                    p.producto__talle && p.producto__talle !== 'UNICO' ? p.producto__talle : '',
                    p.cantidad_total,
                    fmt(p.monto_total),
                ]);
            });
            const ws = XLSX.utils.aoa_to_sheet(rows);
            ws['!cols'] = [{ wch: 4 }, { wch: 35 }, { wch: 8 }, { wch: 18 }, { wch: 16 }];
            XLSX.utils.book_append_sheet(wb, ws, 'Productos');
        }

        // ── Hoja 3: Ventas por vendedor ──────────────────────────────────────
        if (metrics.ventas_por_usuario?.length > 0) {
            const rows = [['#', 'Vendedor', 'Cantidad de ventas', 'Total vendido']];
            metrics.ventas_por_usuario.forEach((u, i) => {
                rows.push([i + 1, u.usuario__username, u.cantidad_ventas, fmt(u.total_vendido)]);
            });
            const ws = XLSX.utils.aoa_to_sheet(rows);
            ws['!cols'] = [{ wch: 4 }, { wch: 25 }, { wch: 20 }, { wch: 18 }];
            XLSX.utils.book_append_sheet(wb, ws, 'Por vendedor');
        }

        // ── Hoja 4: Ventas por método de pago ───────────────────────────────
        if (metrics.ventas_por_metodo_pago?.length > 0) {
            const total = metrics.ventas_por_metodo_pago.reduce((s, m) => s + fmt(m.total_vendido), 0);
            const rows = [['Método de pago', 'Total vendido', '% del total']];
            metrics.ventas_por_metodo_pago.forEach((m) => {
                const pct = total > 0 ? ((fmt(m.total_vendido) / total) * 100).toFixed(1) : '0.0';
                rows.push([m.metodo_pago, fmt(m.total_vendido), parseFloat(pct)]);
            });
            const ws = XLSX.utils.aoa_to_sheet(rows);
            ws['!cols'] = [{ wch: 22 }, { wch: 18 }, { wch: 14 }];
            XLSX.utils.book_append_sheet(wb, ws, 'Métodos de pago');
        }

        // ── Hoja 5: Egresos por mes ──────────────────────────────────────────
        if (metrics.egresos_por_mes?.length > 0) {
            const mesesNombres = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
            const rows = [['Mes', 'Total egresos']];
            metrics.egresos_por_mes.forEach((e) => {
                const mesNombre = mesesNombres[(parseInt(e.mes, 10) - 1)] || e.mes;
                rows.push([mesNombre, fmt(e.total_egresos)]);
            });
            const ws = XLSX.utils.aoa_to_sheet(rows);
            ws['!cols'] = [{ wch: 16 }, { wch: 18 }];
            XLSX.utils.book_append_sheet(wb, ws, 'Egresos por mes');
        }

        // Nombre del archivo
        const safePeriod = periodLabel.replace(/[/\\?%*:|"<> –]/g, '_').replace(/_+/g, '_');
        XLSX.writeFile(wb, `metricas_${selectedStoreSlug}_${safePeriod}.xlsx`);
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

    const medals = ['🥇', '🥈', '🥉'];

    return (
        <>
            <style>{mobileStyles}</style>
            <div style={styles.container} className="metricas-container">

                {/* ── Header ─────────────────────────────────────────────────────── */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: '1.5rem', flexWrap: 'wrap' }}>
                    <h1 style={styles.pageTitle}>Métricas</h1>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        {usingNavMonth && (
                            <button
                                type="button"
                                onClick={handlePrevMes}
                                style={{ background: 'none', border: '1px solid var(--ts-border)', borderRadius: 7, padding: '3px 10px', cursor: 'pointer', fontSize: 15, color: 'var(--ts-text-2)', lineHeight: 1 }}
                            >‹</button>
                        )}
                        <span style={styles.periodChip}>
                            <span style={{ width: 7, height: 7, borderRadius: '50%', backgroundColor: '#5dc87a', display: 'inline-block', flexShrink: 0 }} />
                            {periodLabel}
                        </span>
                        {usingNavMonth && (
                            <button
                                type="button"
                                onClick={handleNextMes}
                                style={{ background: 'none', border: '1px solid var(--ts-border)', borderRadius: 7, padding: '3px 10px', cursor: 'pointer', fontSize: 15, color: 'var(--ts-text-2)', lineHeight: 1 }}
                            >›</button>
                        )}
                        {usingNavMonth && !isCurrentNavMonth && (
                            <button
                                type="button"
                                onClick={handleMesActual}
                                style={{ background: 'none', border: '1px solid var(--ts-border)', borderRadius: 7, padding: '3px 9px', cursor: 'pointer', fontSize: 11, color: 'var(--ts-text-3)', fontWeight: 600 }}
                            >Hoy</button>
                        )}
                    </div>
                </div>

                {/* ── Filters ────────────────────────────────────────────────────── */}
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
                            <button
                                onClick={handleDownloadExcel}
                                disabled={!metrics || loading}
                                title="Descargar reporte Excel con los filtros aplicados"
                                style={{
                                    ...styles.filterButton,
                                    background: (!metrics || loading) ? '#d8eae4' : 'linear-gradient(135deg, #1d6f42 0%, #2a9668 100%)',
                                    boxShadow: (!metrics || loading) ? 'none' : '0 2px 8px rgba(29,111,66,0.25)',
                                    color: (!metrics || loading) ? '#4a6660' : 'white',
                                    cursor: (!metrics || loading) ? 'not-allowed' : 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 6,
                                }}
                            >
                                ⬇ Excel
                            </button>
                        </div>
                    </div>
                </div>

                {/* ── Hero KPIs ──────────────────────────────────────────────────── */}
                <div style={styles.heroCards} className="metricas-hero-cards">
                    <div style={{ ...styles.heroCard, borderTopColor: '#5dc87a' }}>
                        <div style={styles.heroCardIconWrap}>💰</div>
                        <h3 style={styles.heroCardTitle}>Total de ventas</h3>
                        <p style={styles.heroCardValue}>{formatearMonto(metrics?.total_ventas_periodo || 0)}</p>
                        <VarBadge v={varVentas} />
                    </div>
                    <div style={{ ...styles.heroCard, borderTopColor: '#f59e0b' }}>
                        <div style={{ ...styles.heroCardIconWrap, backgroundColor: '#fffbeb' }}>🛒</div>
                        <h3 style={styles.heroCardTitle}>Total de egresos</h3>
                        <p style={styles.heroCardValue}>{formatearMonto(metrics?.total_compras_periodo || 0)}</p>
                        <VarBadge v={varEgresos} />
                    </div>
                    <div style={{ ...styles.heroCard, borderTopColor: rentPositive ? '#5dc87a' : '#e25252' }}>
                        <div style={{ ...styles.heroCardIconWrap, backgroundColor: rentPositive ? '#edfaf3' : '#fef2f2' }}>📊</div>
                        <h3 style={styles.heroCardTitle}>Rentabilidad bruta</h3>
                        <p style={{ ...styles.heroCardValue, color: rentPositive ? '#1a6a40' : '#991b1b' }}>{formatearMonto(metrics?.rentabilidad_bruta_periodo || 0)}</p>
                        <VarBadge v={varRent} />
                    </div>
                </div>

                {/* ── Alerta rentabilidad negativa ───────────────────────────────── */}
                {!rentPositive && parseFloat(metrics?.rentabilidad_bruta_periodo || 0) < 0 && (
                    <div style={{ background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: 12, padding: '14px 20px', marginBottom: 20, color: '#991b1b', fontSize: 14, lineHeight: 1.5 }}>
                        <strong>⚠️ Rentabilidad negativa este período.</strong>{' '}
                        Los egresos superaron las ventas netas. Revisá los costos de compras o aumentá el volumen de ventas.
                    </div>
                )}

                {/* ── Summary cards ──────────────────────────────────────────────── */}
                <div style={styles.summaryCards} className="metricas-summary-cards">
                    <div style={styles.card}>
                        <h3 style={styles.cardTitle}>Costo productos vendidos</h3>
                        <p style={styles.cardValue}>{formatearMonto(metrics?.total_costo_vendido_periodo || 0)}</p>
                    </div>
                    <div style={styles.card}>
                        <h3 style={styles.cardTitle}>Aranceles</h3>
                        <p style={styles.cardValue}>{formatearMonto((parseFloat(metrics?.total_arancel_ventas || 0) + parseFloat(metrics?.total_costo_envio_ml || 0)))}</p>
                    </div>
                    {metrics?.tienda_tiene_ml && (
                        <div style={styles.card}>
                            <h3 style={styles.cardTitle}>Descuentos Mercado Libre</h3>
                            <p style={styles.cardValue}>{formatearMonto(parseFloat(metrics?.total_ml_descuentos || 0))}</p>
                            <div style={{ marginTop: 10, borderTop: '1px solid #edf5f2', paddingTop: 8, display: 'flex', flexDirection: 'column', gap: 4 }}>
                                {[
                                    ['Comisión ML (cargo por venta)', metrics?.total_ml_sale_fee],
                                    ['Costo de envío al vendedor', metrics?.total_ml_shipping_cost],
                                ].map(([label, val]) => (
                                    <div key={label} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', color: '#4a6660' }}>
                                        <span>{label}</span>
                                        <span style={{ fontWeight: 600 }}>{formatearMonto(parseFloat(val || 0))}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                    {metrics?.tienda_tiene_ml && (
                        <div style={styles.card}>
                            <h3 style={styles.cardTitle}>Impuestos</h3>
                            <p style={styles.cardValue}>{formatearMonto(parseFloat(metrics?.total_ml_impuestos || 0))}</p>
                        </div>
                    )}
                    <div style={{ ...styles.card, backgroundColor: margenBg, borderColor: margenBorder }}>
                        <h3 style={{ ...styles.cardTitle, color: margenColor }}>Margen de rentabilidad</h3>
                        <p style={{ ...styles.cardValue, color: margenColor }}>{margen.toFixed(2)}%</p>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 12, color: margenColor, fontWeight: 600, marginTop: 4 }}>
                            <span style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: margenDot, display: 'inline-block' }} />
                            {margenLabel}
                        </span>
                    </div>
                    <div style={styles.card}>
                        <h3 style={styles.cardTitle}>Stock total (unidades)</h3>
                        <p style={styles.cardValue}>{inventoryMetrics?.total_stock || 0}</p>
                    </div>
                    <div style={styles.card}>
                        <h3 style={styles.cardTitle}>Valor total del stock</h3>
                        <p style={{ ...styles.cardValue, fontSize: '1.05rem', wordBreak: 'break-word' }}>{formatearMonto(inventoryMetrics?.total_monto_stock_precio || 0)}</p>
                    </div>
                </div>

                {/* ── Row 1: Productos + Vendedores ──────────────────────────────── */}
                <div style={styles.tablesRow1} className="metricas-tables-row1">

                    {/* Productos más vendidos – barras proporcionales */}
                    <div style={styles.tableCard} className="metricas-table-container">
                        <h3 style={styles.tableTitle}>Productos más vendidos</h3>
                        {metrics?.productos_mas_vendidos?.length > 0 ? (() => {
                            const maxQty = Math.max(...metrics.productos_mas_vendidos.map(p => p.cantidad_total));
                            return (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                                    {metrics.productos_mas_vendidos.map((p, i) => (
                                        <div key={i} style={{ padding: '10px 0', borderBottom: '1px solid #edf5f2' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                                                <span style={{ fontSize: 16, flexShrink: 0, width: 24, textAlign: 'center' }}>
                                                    {i < medals.length ? medals[i] : <span style={{ color: '#8aa8a0', fontSize: 12, fontWeight: 700 }}>#{i + 1}</span>}
                                                </span>
                                                <span style={{ flex: 1, fontSize: 13, fontWeight: 600, color: '#1a2926', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                    {p.producto__nombre || 'Sin nombre'}
                                                    {p.producto__talle && p.producto__talle !== 'UNICO'
                                                        ? <span style={{ color: '#8aa8a0', fontWeight: 400 }}> · T: {p.producto__talle}</span>
                                                        : ''}
                                                </span>
                                                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', flexShrink: 0, gap: 2 }}>
                                                    <span style={{ fontSize: 13, fontWeight: 700, color: '#1a2926' }}>{p.cantidad_total}</span>
                                                    {metrics?.tienda_tiene_ml && parseInt(p.cantidad_pagados_ml) > 0 && (
                                                        <span style={{ fontSize: 11, fontWeight: 600, color: '#1a6a40', background: '#edfaf3', borderRadius: 4, padding: '1px 5px' }}>
                                                            {parseInt(p.cantidad_pagados_ml)} pagados ML
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                            <div style={{ marginLeft: 32, height: 5, backgroundColor: '#edf5f2', borderRadius: 3, overflow: 'hidden' }}>
                                                <div style={{ height: '100%', width: `${(p.cantidad_total / maxQty) * 100}%`, background: 'linear-gradient(90deg, #5dc87a, #38a080)', borderRadius: 3, transition: 'width 0.4s ease' }} />
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            );
                        })() : (
                            <p style={styles.noDataMessage}>No hay datos de productos vendidos para este período.</p>
                        )}
                    </div>

                    {/* Ventas por vendedor – leaderboard */}
                    <div style={styles.tableCard} className="metricas-table-container">
                        <h3 style={styles.tableTitle}>Ventas por vendedor</h3>
                        {metrics?.ventas_por_usuario?.length > 0 ? (() => {
                            const totalVendido = metrics.ventas_por_usuario.reduce((s, u) => s + parseFloat(u.total_vendido || 0), 0);
                            const maxVendido   = Math.max(...metrics.ventas_por_usuario.map(u => parseFloat(u.total_vendido || 0)));
                            return (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                                    {metrics.ventas_por_usuario.map((u, i) => {
                                        const pct      = totalVendido > 0 ? ((parseFloat(u.total_vendido) / totalVendido) * 100).toFixed(1) : '0.0';
                                        const barWidth = maxVendido > 0 ? (parseFloat(u.total_vendido) / maxVendido) * 100 : 0;
                                        return (
                                            <div key={i} style={{ padding: '10px 0', borderBottom: '1px solid #edf5f2' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 5 }}>
                                                    <span style={{ fontSize: 16, flexShrink: 0, width: 24, textAlign: 'center' }}>
                                                        {i < medals.length ? medals[i] : `#${i + 1}`}
                                                    </span>
                                                    <span style={{ flex: 1, fontSize: 13, fontWeight: 600, color: '#1a2926' }}>{u.usuario__username}</span>
                                                    <span style={{ fontSize: 11, color: '#8aa8a0', fontWeight: 600 }}>{pct}%</span>
                                                </div>
                                                <div style={{ marginLeft: 32 }}>
                                                    <div style={{ height: 5, backgroundColor: '#edf5f2', borderRadius: 3, overflow: 'hidden', marginBottom: 4 }}>
                                                        <div style={{ height: '100%', width: `${barWidth}%`, background: 'linear-gradient(90deg, #3b9ede, #2a9668)', borderRadius: 3, transition: 'width 0.4s ease' }} />
                                                    </div>
                                                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: '#4a6660' }}>
                                                        <span>{formatearMonto(u.total_vendido)}</span>
                                                        <span style={{ color: '#8aa8a0' }}>{u.cantidad_ventas} venta{u.cantidad_ventas !== 1 ? 's' : ''}</span>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            );
                        })() : (
                            <p style={styles.noDataMessage}>No hay datos de ventas por vendedor para este período.</p>
                        )}
                    </div>
                </div>

                {/* ── Row 2: Métodos de pago + Egresos ───────────────────────────── */}
                <div style={styles.tablesRow2} className="metricas-tables-row2">

                    {/* Ventas por método de pago – barras horizontales con % */}
                    <div style={styles.tableCard} className="metricas-table-container">
                        <h3 style={styles.tableTitle}>Ventas por método de pago</h3>
                        {metrics?.ventas_por_metodo_pago?.length > 0 ? (() => {
                            const total  = metrics.ventas_por_metodo_pago.reduce((s, m) => s + parseFloat(m.total_vendido || 0), 0);
                            const maxVal = Math.max(...metrics.ventas_por_metodo_pago.map(m => parseFloat(m.total_vendido || 0)));
                            const barColors = ['#5dc87a', '#3b9ede', '#f59e0b', '#e25252', '#a78bfa', '#38a080'];
                            return (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                                    {metrics.ventas_por_metodo_pago.map((m, i) => {
                                        const pct      = total > 0 ? ((parseFloat(m.total_vendido) / total) * 100).toFixed(1) : '0.0';
                                        const barWidth = maxVal > 0 ? (parseFloat(m.total_vendido) / maxVal) * 100 : 0;
                                        const color    = barColors[i % barColors.length];
                                        return (
                                            <div key={i}>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 6 }}>
                                                    <span style={{ fontSize: 13, fontWeight: 600, color: '#1a2926' }}>{m.metodo_pago}</span>
                                                    <div style={{ display: 'flex', gap: 10, alignItems: 'baseline' }}>
                                                        <span style={{ fontSize: 11, color: '#8aa8a0', fontWeight: 600 }}>{pct}%</span>
                                                        <span style={{ fontSize: 13, fontWeight: 700, color: '#1a2926' }}>{formatearMonto(m.total_vendido)}</span>
                                                    </div>
                                                </div>
                                                <div style={{ height: 8, backgroundColor: '#edf5f2', borderRadius: 4, overflow: 'hidden' }}>
                                                    <div style={{ height: '100%', width: `${barWidth}%`, backgroundColor: color, borderRadius: 4, transition: 'width 0.4s ease' }} />
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            );
                        })() : (
                            <p style={styles.noDataMessage}>No hay datos de ventas por método de pago para este período.</p>
                        )}
                    </div>

                    {/* Egresos por mes – mini bar chart horizontal */}
                    <div style={styles.tableCard} className="metricas-table-container">
                        <h3 style={styles.tableTitle}>Egresos por mes</h3>
                        {metrics?.egresos_por_mes?.length > 0 ? (() => {
                            const maxEgreso   = Math.max(...metrics.egresos_por_mes.map(e => parseFloat(e.total_egresos || 0)));
                            const mesesCortos = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];
                            return (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 11 }}>
                                    {metrics.egresos_por_mes.map((e, i) => {
                                        const barWidth  = maxEgreso > 0 ? (parseFloat(e.total_egresos) / maxEgreso) * 100 : 0;
                                        const mesNombre = mesesCortos[(parseInt(e.mes, 10) - 1)] || e.mes;
                                        const isMax     = parseFloat(e.total_egresos) === maxEgreso;
                                        return (
                                            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                                <span style={{ fontSize: 12, fontWeight: 600, color: '#8aa8a0', width: 28, flexShrink: 0, textAlign: 'right' }}>{mesNombre}</span>
                                                <div style={{ flex: 1, height: 10, backgroundColor: '#edf5f2', borderRadius: 5, overflow: 'hidden' }}>
                                                    <div style={{
                                                        height: '100%',
                                                        width: `${barWidth}%`,
                                                        background: isMax ? 'linear-gradient(90deg, #e25252, #f59e0b)' : 'linear-gradient(90deg, #f59e0b, #fcd34d)',
                                                        borderRadius: 5,
                                                        transition: 'width 0.4s ease'
                                                    }} />
                                                </div>
                                                <span style={{ fontSize: 12, fontWeight: 700, color: isMax ? '#991b1b' : '#1a2926', flexShrink: 0, minWidth: 80, textAlign: 'right' }}>{formatearMonto(e.total_egresos)}</span>
                                            </div>
                                        );
                                    })}
                                </div>
                            );
                        })() : (
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
        fontFamily: "'Inter', 'Segoe UI', system-ui, sans-serif",
        width: '100%',
        maxWidth: '100%',
        color: '#1a2926',
    },
    pageTitle: {
        color: '#1a2926',
        fontSize: '1.5rem',
        fontWeight: 700,
        margin: 0,
    },
    periodChip: {
        display: 'inline-flex',
        alignItems: 'center',
        gap: 7,
        padding: '5px 12px',
        borderRadius: '9999px',
        backgroundColor: '#edfaf3',
        border: '1px solid #a8e6c5',
        color: '#1a6a40',
        fontSize: 13,
        fontWeight: 600,
    },
    loadingMessage: {
        padding: '20px',
        textAlign: 'center',
        color: '#4a6660',
        fontSize: '1.1em',
    },
    accessDeniedMessage: {
        color: '#991b1b',
        marginBottom: '10px',
        padding: '20px',
        border: '1px solid #fca5a5',
        textAlign: 'center',
        borderRadius: '10px',
        backgroundColor: '#fef2f2',
        fontWeight: 'bold',
    },
    noStoreSelectedMessage: {
        padding: '50px',
        textAlign: 'center',
        color: '#8aa8a0',
        fontSize: '1.2em',
    },
    errorMessage: {
        color: '#991b1b',
        marginBottom: '20px',
        border: '1px solid #fca5a5',
        padding: '15px',
        borderRadius: '10px',
        backgroundColor: '#fef2f2',
        textAlign: 'center',
        fontWeight: 'bold',
    },
    filtersContainer: {
        display: 'flex',
        flexDirection: 'column',
        gap: '16px',
        marginBottom: '24px',
        padding: '18px 20px',
        backgroundColor: '#ffffff',
        borderRadius: '12px',
        boxShadow: '0 1px 3px rgba(0,0,0,.07)',
        border: '1px solid #edf5f2',
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
        fontWeight: 700,
        color: '#4a6660',
        fontSize: '0.78rem',
        textTransform: 'uppercase',
        letterSpacing: '0.05em',
    },
    periodInputs: {
        display: 'flex',
        flexWrap: 'wrap',
        gap: '12px',
        alignItems: 'flex-end',
    },
    periodHint: {
        margin: 0,
        fontSize: '0.78rem',
        color: '#8aa8a0',
    },
    validationError: {
        margin: '6px 0 0 0',
        fontSize: '0.85rem',
        color: '#e25252',
        fontWeight: 600,
    },
    filterGroup: {
        display: 'flex',
        flexDirection: 'column',
    },
    filterLabel: {
        marginBottom: '5px',
        fontWeight: 600,
        color: '#4a6660',
        fontSize: '0.78rem',
        textTransform: 'uppercase',
        letterSpacing: '0.05em',
    },
    filterInput: {
        padding: '8px 12px',
        border: '1.5px solid #d8eae4',
        borderRadius: '8px',
        minWidth: '140px',
        fontSize: 13,
        color: '#1a2926',
        backgroundColor: '#f7faf9',
        fontFamily: "'Inter', 'Segoe UI', system-ui, sans-serif",
    },
    filterActions: {
        display: 'flex',
        flexWrap: 'wrap',
        gap: '8px',
        alignItems: 'flex-end',
    },
    filterButton: {
        padding: '9px 18px',
        background: 'linear-gradient(135deg, #5dc87a 0%, #38a080 100%)',
        color: 'white',
        border: 'none',
        borderRadius: '8px',
        cursor: 'pointer',
        fontWeight: 700,
        fontSize: 13,
        fontFamily: "'Inter', 'Segoe UI', system-ui, sans-serif",
        transition: 'all 0.18s ease',
        boxShadow: '0 2px 8px rgba(93,200,122,0.25)',
    },
    filterButtonSecondary: {
        background: '#3b9ede',
        boxShadow: '0 2px 8px rgba(59,158,222,0.20)',
    },
    filterButtonMuted: {
        background: '#d8eae4',
        color: '#4a6660',
        boxShadow: 'none',
    },
    heroCards: {
        display: 'grid',
        gridTemplateColumns: 'repeat(3, 1fr)',
        gap: '16px',
        marginBottom: '16px',
    },
    heroCard: {
        backgroundColor: '#ffffff',
        padding: '22px 20px 18px',
        borderRadius: '14px',
        boxShadow: '0 4px 12px rgba(0,0,0,.08)',
        textAlign: 'center',
        borderLeft: '1px solid #edf5f2',
        borderRight: '1px solid #edf5f2',
        borderBottom: '1px solid #edf5f2',
        borderTopWidth: 4,
        borderTopStyle: 'solid',
        borderTopColor: '#5dc87a',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 6,
    },
    heroCardIconWrap: {
        width: 42,
        height: 42,
        borderRadius: '11px',
        backgroundColor: '#edfaf3',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: 20,
        marginBottom: 4,
    },
    heroCardTitle: {
        fontSize: '0.75rem',
        color: '#4a6660',
        margin: 0,
        fontWeight: 600,
        textTransform: 'uppercase',
        letterSpacing: '0.05em',
    },
    heroCardValue: {
        fontSize: '1.65rem',
        fontWeight: 800,
        color: '#1a2926',
        margin: 0,
    },
    summaryCards: {
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
        gap: '14px',
        marginBottom: '20px',
    },
    card: {
        backgroundColor: '#ffffff',
        padding: '16px 18px',
        borderRadius: '12px',
        boxShadow: '0 1px 3px rgba(0,0,0,.07)',
        textAlign: 'center',
        border: '1px solid #edf5f2',
    },
    cardTitle: {
        fontSize: '0.75rem',
        color: '#4a6660',
        margin: '0 0 8px 0',
        fontWeight: 600,
        textTransform: 'uppercase',
        letterSpacing: '0.04em',
        lineHeight: 1.4,
    },
    cardValue: {
        fontSize: '1.3rem',
        fontWeight: 800,
        color: '#1a2926',
        margin: 0,
    },
    tablesRow1: {
        display: 'grid',
        gridTemplateColumns: '3fr 2fr',
        gap: '16px',
        marginBottom: '16px',
    },
    tablesRow2: {
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: '16px',
        marginBottom: '16px',
    },
    tableCard: {
        backgroundColor: '#ffffff',
        padding: '20px 22px',
        borderRadius: '14px',
        boxShadow: '0 1px 3px rgba(0,0,0,.07)',
        border: '1px solid #edf5f2',
    },
    tableTitle: {
        fontSize: '0.78rem',
        fontWeight: 700,
        color: '#4a6660',
        marginBottom: '16px',
        marginTop: 0,
        textTransform: 'uppercase',
        letterSpacing: '0.05em',
    },
    noDataMessage: {
        textAlign: 'center',
        marginTop: '20px',
        color: '#8aa8a0',
        fontStyle: 'italic',
        fontSize: 13,
    },
};

// Estilos responsivos para móviles
const mobileStyles = `
    @media (max-width: 768px) {
        .metricas-container { padding: 10px !important; }
        .metricas-filters-container { flex-direction: column !important; gap: 10px !important; align-items: stretch !important; }
        .metricas-period-section { width: 100%; }
        .metricas-period-inputs { flex-direction: column !important; }
        .metricas-filters-row2 { flex-direction: column !important; align-items: stretch !important; }
        .metricas-filter-group { width: 100% !important; }
        .metricas-filter-input { width: 100% !important; min-width: 0 !important; box-sizing: border-box; }
        .metricas-filter-actions { flex-wrap: wrap; }
        .metricas-hero-cards { grid-template-columns: 1fr !important; }
        .metricas-summary-cards { grid-template-columns: 1fr 1fr !important; }
        .metricas-tables-row1 { grid-template-columns: 1fr !important; }
        .metricas-tables-row2 { grid-template-columns: 1fr !important; }
        .metricas-table-container { overflow-x: auto; -webkit-overflow-scrolling: touch; }
    }
    @media (max-width: 480px) {
        .metricas-summary-cards { grid-template-columns: 1fr !important; }
    }
`;

export default MetricasVentas;