// BONITO_AMOR/frontend/src/components/MetricasVentas.js
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

const MetricasVentas = () => {
    const { user, token, isAuthenticated, loading: authLoading, selectedStoreSlug, stores } = useAuth();
    const [metrics, setMetrics] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const today = new Date();
    const currentYear = today.getFullYear().toString();
    const currentMonth = (today.getMonth() + 1).toString().padStart(2, '0');
    const currentDay = today.getDate().toString().padStart(2, '0');

    // Filtros aplicados
    const [filterYear, setFilterYear] = useState(currentYear);
    const [filterMonth, setFilterMonth] = useState(''); 
    const [filterDay, setFilterDay] = useState('');     
    const [filterSellerId, setFilterSellerId] = useState('');
    const [filterPaymentMethod, setFilterPaymentMethod] = useState('');

    // Filtros pendientes (para los inputs)
    const [pendingFilterYear, setPendingFilterYear] = useState(currentYear);
    const [pendingFilterMonth, setPendingFilterMonth] = useState('');
    const [pendingFilterDay, setPendingFilterDay] = useState('');
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
                year: filterYear,
                month: filterMonth,
                day: filterDay,
                seller_id: filterSellerId,
                payment_method: filterPaymentMethod,
            };
            const response = await axios.get(`${BASE_API_ENDPOINT}/api/metricas/metrics/`, {
                headers: { 'Authorization': `Bearer ${token}` },
                params: params
            });
            setMetrics(response.data);
        } catch (err) {
            setError('Error al cargar las métricas: ' + (err.response ? JSON.stringify(err.response.data) : err.message));
            console.error('Error fetching metrics:', err.response || err.message);
        } finally {
            setLoading(false);
        }
    }, [token, selectedStoreSlug, filterYear, filterMonth, filterDay, filterSellerId, filterPaymentMethod]);
    

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
    
    // CORRECCIÓN: El useEffect ahora se dispara cuando los filtros aplicados cambian
    useEffect(() => {
        if (!authLoading && isAuthenticated && user && user.is_superuser && selectedStoreSlug) {
            fetchMetrics();
        } else if (!authLoading && (!isAuthenticated || !user || !user.is_superuser)) {
            setError("Acceso denegado. Solo los superusuarios pueden ver las métricas.");
            setLoading(false);
        } else if (!authLoading && isAuthenticated && user && user.is_superuser && !selectedStoreSlug) {
            setLoading(false);
        }
    }, [isAuthenticated, user, authLoading, selectedStoreSlug, fetchMetrics]);
    
    // useEffect para cargar vendedores y métodos de pago solo una vez al cargar la página
    useEffect(() => {
        if (!authLoading && isAuthenticated && user && user.is_superuser && selectedStoreSlug) {
            fetchSellers();
            fetchPaymentMethods();
        }
    }, [isAuthenticated, user, authLoading, selectedStoreSlug, fetchSellers, fetchPaymentMethods]);


    const handleApplyFilters = () => {
        setFilterYear(pendingFilterYear);
        setFilterMonth(pendingFilterMonth);
        setFilterDay(pendingFilterDay);
        setFilterSellerId(pendingFilterSellerId);
        setFilterPaymentMethod(pendingFilterPaymentMethod);
    };

    const handleClearFilters = () => {
        const today = new Date();
        const currentYear = today.getFullYear().toString();
        
        setPendingFilterYear(currentYear);
        setPendingFilterMonth('');
        setPendingFilterDay('');
        setPendingFilterSellerId('');
        setPendingFilterPaymentMethod('');
        
        setFilterYear(currentYear);
        setFilterMonth('');
        setFilterDay('');
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
                <h2>Por favor, selecciona una tienda en la barra de navegación para ver las métricas.</h2>
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
        <div style={styles.container}>
            <h1>Métricas de Ventas y Rentabilidad ({selectedStoreSlug})</h1>

            <div style={styles.filtersContainer}>
                <div style={styles.filterGroup}>
                    <label style={styles.filterLabel}>Año:</label>
                    <input
                        type="number"
                        value={pendingFilterYear}
                        onChange={(e) => setPendingFilterYear(e.target.value)}
                        style={styles.filterInput}
                        min="2000" 
                        max={new Date().getFullYear()}
                    />
                </div>
                <div style={styles.filterGroup}>
                    <label style={styles.filterLabel}>Mes:</label>
                    <select
                        value={pendingFilterMonth}
                        onChange={(e) => setPendingFilterMonth(e.target.value)}
                        style={styles.filterInput}
                    >
                        <option value="">Todos</option>
                        {Array.from({ length: 12 }, (_, i) => (i + 1).toString().padStart(2, '0')).map(m => (
                            <option key={m} value={m}>{m}</option>
                        ))}
                    </select>
                </div>
                <div style={styles.filterGroup}>
                    <label style={styles.filterLabel}>Día:</label>
                    <input
                        type="number"
                        value={pendingFilterDay}
                        onChange={(e) => setPendingFilterDay(e.target.value)}
                        style={styles.filterInput}
                        min="1"
                        max="31"
                    />
                </div>
                <div style={styles.filterGroup}>
                    <label style={styles.filterLabel}>Vendedor:</label>
                    <select
                        value={pendingFilterSellerId}
                        onChange={(e) => setPendingFilterSellerId(e.target.value)}
                        style={styles.filterInput}
                    >
                        <option value="">Todos</option>
                        {sellers.map(seller => (
                            <option key={seller.id} value={seller.id}>{seller.username}</option>
                        ))}
                    </select>
                </div>
                <div style={styles.filterGroup}>
                    <label style={styles.filterLabel}>Método de Pago:</label>
                    <select
                        value={pendingFilterPaymentMethod}
                        onChange={(e) => setPendingFilterPaymentMethod(e.target.value)}
                        style={styles.filterInput}
                    >
                        <option value="">Todos</option>
                        {paymentMethods.map(method => (
                            <option key={method.id} value={method.nombre}>{method.nombre}</option>
                        ))}
                    </select>
                </div>
                <button onClick={handleApplyFilters} style={styles.filterButton}>Aplicar Filtros</button>
                <button onClick={handleClearFilters} style={{ ...styles.filterButton, backgroundColor: '#6c757d' }}>Limpiar Filtros</button>
            </div>

            <div style={styles.chartExplanation}>
                <p>Aquí puedes visualizar las métricas clave de tu tienda. Utiliza los filtros para analizar datos por año, mes, día, vendedor o método de pago.</p>
                <p>La **Rentabilidad Bruta** se calcula como el Total de Ventas menos el Total de Compras registradas en el período seleccionado. El **Margen de Rentabilidad** es la Rentabilidad Bruta como porcentaje del Total de Ventas.</p>
            </div>

            <div style={styles.summaryCards}>
                <div style={styles.card}>
                    <h3 style={styles.cardTitle}>Total Ventas</h3>
                    <p style={styles.cardValue}>${parseFloat(metrics?.total_ventas_periodo || 0).toFixed(2)}</p>
                </div>
                <div style={styles.card}>
                    <h3 style={styles.cardTitle}>Total Productos Vendidos</h3>
                    <p style={styles.cardValue}>{metrics?.total_productos_vendidos_periodo || 0}</p>
                </div>
                <div style={styles.card}>
                    <h3 style={styles.cardTitle}>Total Egresos</h3>
                    <p style={styles.cardValue}>${parseFloat(metrics?.total_compras_periodo || 0).toFixed(2)}</p>
                </div>
                <div style={styles.card}>
                    <h3 style={styles.cardTitle}>Rentabilidad Bruta</h3>
                    <p style={styles.cardValue}>${parseFloat(metrics?.rentabilidad_bruta_periodo || 0).toFixed(2)}</p>
                </div>
                <div style={styles.card}>
                    <h3 style={styles.cardTitle}>Margen de Rentabilidad</h3>
                    <p style={styles.cardValue}>{parseFloat(metrics?.margen_rentabilidad_periodo || 0).toFixed(2)}%</p>
                </div>
            </div>

            <div style={styles.tablesContainer}>
                <div style={styles.tableContainer}>
                    <h3 style={styles.tableTitle}>Productos Vendidos por Cantidad</h3>
                    {metrics?.productos_mas_vendidos.length > 0 ? (
                        <table style={styles.table}>
                            <thead>
                                <tr>
                                    <th style={styles.th}>Nombre del Producto</th>
                                    <th style={styles.th}>Cantidad Vendida</th>
                                </tr>
                            </thead>
                            <tbody>
                                {metrics.productos_mas_vendidos.map((productMetric, index) => (
                                    <tr key={index}>
                                        <td style={styles.td}>{productMetric.producto__nombre}</td>
                                        <td style={styles.td}>{productMetric.cantidad_total}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    ) : (
                        <p style={styles.noDataMessage}>No hay datos de productos vendidos para este período.</p>
                    )}
                </div>

                <div style={styles.tableContainer}>
                    <h3 style={styles.tableTitle}>Ventas por Vendedor</h3>
                    {metrics?.ventas_por_usuario.length > 0 ? (
                        <table style={styles.table}>
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

                <div style={styles.tableContainer}>
                    <h3 style={styles.tableTitle}>Ventas por Método de Pago</h3>
                    {metrics?.ventas_por_metodo_pago.length > 0 ? (
                        <table style={styles.table}>
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

                 <div style={styles.tableContainer}>
                    <h3 style={styles.tableTitle}>Egresos Mensuales</h3>
                    {metrics?.egresos_por_mes.length > 0 ? (
                        <table style={styles.table}>
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
    filtersContainer: {
        display: 'flex',
        flexWrap: 'wrap',
        gap: '15px',
        marginBottom: '30px',
        padding: '20px',
        backgroundColor: '#ffffff',
        borderRadius: '8px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
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
        padding: '8px 12px',
        border: '1px solid #ccc',
        borderRadius: '4px',
        minWidth: '120px',
    },
    filterButton: {
        padding: '10px 20px',
        backgroundColor: '#007bff',
        color: 'white',
        border: 'none',
        borderRadius: '5px',
        cursor: 'pointer',
        fontWeight: 'bold',
        transition: 'background-color 0.3s ease',
    },
    chartExplanation: {
        backgroundColor: '#e9ecef',
        padding: '15px',
        borderRadius: '8px',
        marginBottom: '30px',
    },
    summaryCards: {
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: '20px',
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

export default MetricasVentas;