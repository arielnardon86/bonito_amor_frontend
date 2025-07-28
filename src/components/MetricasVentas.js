// BONITO_AMOR/frontend/src/components/MetricasVentas.js
import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { useAuth } from '../AuthContext';

// Importaciones de Chart.js
import { Bar, Pie, Line } from 'react-chartjs-2';
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    BarElement,
    ArcElement,
    PointElement,
    LineElement,
    Title,
    Tooltip,
    Legend,
} from 'chart.js';

// Registrar los componentes de Chart.js que vamos a usar
ChartJS.register(
    CategoryScale,
    LinearScale,
    BarElement,
    ArcElement,
    PointElement,
    LineElement,
    Title,
    Tooltip,
    Legend
);

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

const MetricasVentas = () => {
    // Obtener el usuario, estado de autenticación, carga de autenticación, slug de la tienda seleccionada y token del AuthContext
    const { user, isAuthenticated, loading: authLoading, selectedStoreSlug, token } = useAuth();

    // Estado para las métricas de ventas obtenidas
    const [metricas, setMetricas] = useState(null);
    // Estado para indicar si las métricas están cargando
    const [loadingMetrics, setLoadingMetrics] = useState(true);
    // Estado para almacenar mensajes de error
    const [error, setError] = useState(null);

    // Estados para los filtros de fecha
    const [yearFilter, setYearFilter] = useState('');
    const [monthFilter, setMonthFilter] = useState('');
    const [dayFilter, setDayFilter] = useState('');
    const [sellerFilter, setSellerFilter] = useState('');
    const [paymentMethodFilter, setPaymentMethodFilter] = useState('');

    const [availableYears, setAvailableYears] = useState([]);
    const [availableMonths, setAvailableMonths] = useState([]);
    const [availableDays, setAvailableDays] = useState([]);
    const [availableSellers, setAvailableSellers] = useState([]);
    const [availablePaymentMethods, setAvailablePaymentMethods] = useState([]);

    // Función para obtener las métricas de ventas
    const fetchMetricasVentas = useCallback(async () => {
        if (!token || !selectedStoreSlug) {
            setLoadingMetrics(false);
            return;
        }
        setLoadingMetrics(true);
        setError(null);

        const params = {
            tienda_slug: selectedStoreSlug,
        };
        if (yearFilter) params.year = yearFilter;
        if (monthFilter) params.month = monthFilter;
        if (dayFilter) params.day = dayFilter;
        if (sellerFilter) params.seller_id = sellerFilter;
        if (paymentMethodFilter) params.payment_method = paymentMethodFilter;

        console.log("Fetching metrics from:", `${BASE_API_ENDPOINT}/api/metricas/metrics/`, params);

        try {
            const response = await axios.get(`${BASE_API_ENDPOINT}/api/metricas/metrics/`, {
                headers: { 'Authorization': `Bearer ${token}` },
                params: params,
            });
            console.log("Metrics fetched:", response.data);
            setMetricas(response.data);
            setError(null); // Clear previous errors
        } catch (err) {
            console.error("Error fetching metrics:", err.response ? err.response.data : err.message);
            setError('Error al cargar las métricas: ' + (err.response ? JSON.stringify(err.response.data) : err.message));
        } finally {
            setLoadingMetrics(false);
        }
    }, [token, selectedStoreSlug, yearFilter, monthFilter, dayFilter, sellerFilter, paymentMethodFilter]);

    // Función para obtener los años, meses, días, vendedores y métodos de pago disponibles
    const fetchFilterOptions = useCallback(async () => {
        if (!token || !selectedStoreSlug) return;

        try {
            // Fetch available years (assuming you have an endpoint for this or derive from sales)
            // For simplicity, let's just use current year and a few past years
            const currentYear = new Date().getFullYear();
            setAvailableYears([
                currentYear.toString(),
                (currentYear - 1).toString(),
                (currentYear - 2).toString(),
            ]);

            // Fetch sellers
            const sellersResponse = await axios.get(`${BASE_API_ENDPOINT}/api/users/`, {
                headers: { 'Authorization': `Bearer ${token}` },
                params: { tienda_slug: selectedStoreSlug } // Assuming users can be filtered by store
            });
            setAvailableSellers(sellersResponse.data.results || sellersResponse.data);

            // Fetch payment methods
            const paymentMethodsResponse = await axios.get(`${BASE_API_ENDPOINT}/api/metodos-pago/`, {
                headers: { 'Authorization': `Bearer ${token}` },
            });
            setAvailablePaymentMethods(paymentMethodsResponse.data.results || paymentMethodsResponse.data);

        } catch (err) {
            console.error("Error fetching filter options:", err.response ? err.response.data : err.message);
        }
    }, [token, selectedStoreSlug]);

    // Efecto para cargar métricas y opciones de filtro cuando cambian las dependencias
    useEffect(() => {
        if (!authLoading && isAuthenticated && user && (user.is_superuser || user.is_staff) && selectedStoreSlug) {
            fetchMetricasVentas();
            fetchFilterOptions();
        } else if (!authLoading && (!isAuthenticated || !user || (!user.is_superuser && !user.is_staff))) {
            setError("Acceso denegado. No tienes permisos para ver las métricas de ventas.");
            setLoadingMetrics(false);
        } else if (!authLoading && isAuthenticated && user && (user.is_superuser || user.is_staff) && !selectedStoreSlug) {
            setLoadingMetrics(false);
            setMetricas(null); // Clear metrics if no store is selected
        }
    }, [isAuthenticated, user, authLoading, selectedStoreSlug, fetchMetricasVentas, fetchFilterOptions]);

    // Opciones comunes para los gráficos
    const commonChartOptions = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: {
                position: 'top',
            },
            tooltip: {
                mode: 'index',
                intersect: false,
            },
        },
    };

    // Preparar datos para los gráficos y tablas, con comprobaciones de seguridad
    const barChartData = {
        labels: metricas?.ventas_agrupadas_por_periodo?.data?.map(item => item.fecha) || [],
        datasets: [
            {
                label: 'Monto Total',
                data: metricas?.ventas_agrupadas_por_periodo?.data?.map(item => parseFloat(item.total_monto)) || [],
                backgroundColor: 'rgba(75, 192, 192, 0.6)',
                borderColor: 'rgba(75, 192, 192, 1)',
                borderWidth: 1,
            },
        ],
    };

    const pieChartData = {
        labels: metricas?.ventas_por_metodo_pago?.map(item => item.metodo_pago) || [],
        datasets: [
            {
                data: metricas?.ventas_por_metodo_pago?.map(item => parseFloat(item.monto_total)) || [],
                backgroundColor: [
                    'rgba(255, 99, 132, 0.6)',
                    'rgba(54, 162, 235, 0.6)',
                    'rgba(255, 206, 86, 0.6)',
                    'rgba(75, 192, 192, 0.6)',
                    'rgba(153, 102, 255, 0.6)',
                    'rgba(255, 159, 64, 0.6)',
                ],
                borderColor: [
                    'rgba(255, 99, 132, 1)',
                    'rgba(54, 162, 235, 1)',
                    'rgba(255, 206, 86, 1)',
                    'rgba(75, 192, 192, 1)',
                    'rgba(153, 102, 255, 1)',
                    'rgba(255, 159, 64, 1)',
                ],
                borderWidth: 1,
            },
        ],
    };

    const topProductsData = metricas?.productos_mas_vendidos || [];
    const salesByUserTableData = metricas?.ventas_por_usuario || [];
    const salesByPaymentMethodTableData = metricas?.ventas_por_metodo_pago || [];


    if (authLoading || (isAuthenticated && !user)) {
        return <div style={styles.loadingMessage}>Cargando datos de usuario...</div>;
    }

    if (!isAuthenticated || !(user.is_superuser || user.is_staff)) {
        return <div style={styles.accessDeniedMessage}>Acceso denegado. No tienes permisos para ver las métricas de ventas.</div>;
    }

    if (!selectedStoreSlug) {
        return (
            <div style={styles.noStoreSelectedMessage}>
                <h2>Por favor, selecciona una tienda en la barra de navegación para ver las métricas de ventas.</h2>
            </div>
        );
    }

    if (loadingMetrics) {
        return <div style={styles.loadingMessage}>Cargando métricas de {selectedStoreSlug}...</div>;
    }

    if (error) {
        return <div style={styles.errorMessage}>{error}</div>;
    }

    // Si metricas es null después de cargar y no hay error, significa que no hay datos.
    if (!metricas) {
        return <div style={styles.noDataMessage}>No hay datos de métricas disponibles para los filtros seleccionados.</div>;
    }

    return (
        <div style={styles.container}>
            <h1>Métricas de Ventas ({selectedStoreSlug})</h1>

            {/* Sección de Filtros */}
            <div style={styles.filterSection}>
                <h3>Filtros</h3>
                <div style={styles.filterGroup}>
                    <label style={styles.filterLabel}>Año:</label>
                    <select value={yearFilter} onChange={(e) => { setYearFilter(e.target.value); setMonthFilter(''); setDayFilter(''); }} style={styles.filterSelect}>
                        <option value="">Todos</option>
                        {availableYears.map(year => (
                            <option key={year} value={year}>{year}</option>
                        ))}
                    </select>
                </div>
                <div style={styles.filterGroup}>
                    <label style={styles.filterLabel}>Mes:</label>
                    <select value={monthFilter} onChange={(e) => { setMonthFilter(e.target.value); setDayFilter(''); }} style={styles.filterSelect} disabled={!yearFilter}>
                        <option value="">Todos</option>
                        {yearFilter && Array.from({ length: 12 }, (_, i) => i + 1).map(month => (
                            <option key={month} value={month.toString().padStart(2, '0')}>{new Date(2000, month - 1, 1).toLocaleString('es-ES', { month: 'long' })}</option>
                        ))}
                    </select>
                </div>
                <div style={styles.filterGroup}>
                    <label style={styles.filterLabel}>Día:</label>
                    <select value={dayFilter} onChange={(e) => setDayFilter(e.target.value)} style={styles.filterSelect} disabled={!yearFilter || !monthFilter}>
                        <option value="">Todos</option>
                        {yearFilter && monthFilter && Array.from({ length: new Date(yearFilter, monthFilter, 0).getDate() }, (_, i) => i + 1).map(day => (
                            <option key={day} value={day.toString().padStart(2, '0')}>{day}</option>
                        ))}
                    </select>
                </div>
                <div style={styles.filterGroup}>
                    <label style={styles.filterLabel}>Vendedor:</label>
                    <select value={sellerFilter} onChange={(e) => setSellerFilter(e.target.value)} style={styles.filterSelect}>
                        <option value="">Todos</option>
                        {availableSellers.map(seller => (
                            <option key={seller.id} value={seller.id}>{seller.username}</option>
                        ))}
                    </select>
                </div>
                <div style={styles.filterGroup}>
                    <label style={styles.filterLabel}>Método de Pago:</label>
                    <select value={paymentMethodFilter} onChange={(e) => setPaymentMethodFilter(e.target.value)} style={styles.filterSelect}>
                        <option value="">Todos</option>
                        {availablePaymentMethods.map(method => (
                            <option key={method.id} value={method.nombre}>{method.nombre}</option>
                        ))}
                    </select>
                </div>
                <button onClick={fetchMetricasVentas} style={styles.applyFiltersButton}>Aplicar Filtros</button>
            </div>

            {/* Resumen de Métricas */}
            <div style={styles.summaryGrid}>
                <div style={styles.summaryItem}>
                    <h3>Total Ventas</h3>
                    <p style={styles.summaryValue}>${metricas.total_ventas_periodo.toFixed(2)}</p>
                </div>
                <div style={styles.summaryItem}>
                    <h3>Total Productos Vendidos</h3>
                    <p style={styles.summaryValue}>{metricas.total_productos_vendidos_periodo}</p>
                </div>
            </div>

            {/* Explicación de los gráficos */}
            <div style={styles.chartExplanation}>
                <p>
                    Los gráficos a continuación muestran un análisis detallado de las ventas.
                    El gráfico de barras "Ventas por {metricas.ventas_agrupadas_por_periodo.label}"
                    presenta el monto total de ventas agrupado por el período seleccionado (año, mes o día).
                    El gráfico de pastel "Ventas por Método de Pago" desglosa el monto total de ventas
                    según el método de pago utilizado.
                </p>
            </div>

            {/* Gráficos */}
            <div style={styles.chartsContainer}>
                <div style={styles.chartContainer}>
                    <h3>Ventas por {metricas.ventas_agrupadas_por_periodo.label}</h3>
                    {barChartData.labels.length > 0 ? (
                        <Bar data={barChartData} options={commonChartOptions} />
                    ) : (
                        <p style={styles.noDataMessage}>No hay datos de ventas para el período seleccionado.</p>
                    )}
                </div>
                <div style={styles.chartContainer}>
                    <h3>Ventas por Método de Pago</h3>
                    {pieChartData.labels.length > 0 ? (
                        <Pie data={pieChartData} options={commonChartOptions} />
                    ) : (
                        <p style={styles.noDataMessage}>No hay datos de ventas por método de pago.</p>
                    )}
                </div>
            </div>

            {/* Tablas de Detalle */}
            <div style={styles.tablesContainer}>
                <div style={styles.tableContainer}>
                    <h3>Productos Más Vendidos</h3>
                    {topProductsData.length > 0 ? (
                        <table style={styles.table}>
                            <thead>
                                <tr>
                                    <th style={styles.th}>Producto</th>
                                    <th style={styles.th}>Talle</th>
                                    <th style={styles.th}>Cantidad Total</th>
                                    <th style={styles.th}>Monto Total</th>
                                </tr>
                            </thead>
                            <tbody>
                                {topProductsData.map((item, index) => (
                                    <tr key={index}>
                                        <td style={styles.td}>{item.producto__nombre}</td>
                                        <td style={styles.td}>{item.producto__talle}</td>
                                        <td style={styles.td}>{item.cantidad_total}</td>
                                        <td style={styles.td}>${item.monto_total.toFixed(2)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    ) : (
                        <p style={styles.noDataMessage}>No hay datos de productos más vendidos.</p>
                    )}
                </div>

                <div style={styles.tableContainer}>
                    <h3>Ventas por Vendedor</h3>
                    {salesByUserTableData.length > 0 ? (
                        <table style={styles.table}>
                            <thead>
                                <tr>
                                    <th style={styles.th}>Vendedor</th>
                                    <th style={styles.th}>Monto Total Vendido</th>
                                    <th style={styles.th}>Cantidad de Ventas</th>
                                </tr>
                            </thead>
                            <tbody>
                                {salesByUserTableData.map((item, index) => (
                                    <tr key={index}>
                                        <td style={styles.td}>{item.usuario__username}</td>
                                        <td style={styles.td}>${item.monto_total_vendido.toFixed(2)}</td>
                                        <td style={styles.td}>{item.cantidad_ventas}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    ) : (
                        <p style={styles.noDataMessage}>No hay datos de ventas por vendedor.</p>
                    )}
                </div>

                <div style={styles.tableContainer}>
                    <h3>Ventas por Método de Pago (Tabla)</h3>
                    {salesByPaymentMethodTableData.length > 0 ? (
                        <table style={styles.table}>
                            <thead>
                                <tr>
                                    <th style={styles.th}>Método de Pago</th>
                                    <th style={styles.th}>Monto Total</th>
                                    <th style={styles.th}>Cantidad de Ventas</th>
                                </tr>
                            </thead>
                            <tbody>
                                {salesByPaymentMethodTableData.map((item, index) => (
                                    <tr key={index}>
                                        <td style={styles.td}>{item.metodo_pago}</td>
                                        <td style={styles.td}>${item.monto_total.toFixed(2)}</td>
                                        <td style={styles.td}>{item.cantidad_ventas}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    ) : (
                        <p style={styles.noDataMessage}>No hay datos de ventas por método de pago.</p>
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
        margin: 'auto',
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
    filterSection: {
        backgroundColor: '#ffffff',
        padding: '20px',
        borderRadius: '8px',
        boxShadow: '0 2px 5px rgba(0,0,0,0.05)',
        marginBottom: '30px',
        display: 'flex',
        flexWrap: 'wrap',
        gap: '15px',
        alignItems: 'flex-end',
    },
    filterGroup: {
        display: 'flex',
        flexDirection: 'column',
        minWidth: '150px',
    },
    filterLabel: {
        marginBottom: '5px',
        fontWeight: 'bold',
        color: '#555',
        fontSize: '0.9em',
    },
    filterSelect: {
        padding: '8px',
        border: '1px solid #ccc',
        borderRadius: '4px',
        backgroundColor: '#fefefe',
    },
    applyFiltersButton: {
        padding: '10px 20px',
        backgroundColor: '#007bff',
        color: 'white',
        border: 'none',
        borderRadius: '5px',
        cursor: 'pointer',
        fontSize: '1em',
        transition: 'background-color 0.3s ease',
    },
    summaryGrid: {
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
        gap: '20px',
        marginBottom: '30px',
    },
    summaryItem: {
        backgroundColor: '#e9f7ef',
        padding: '20px',
        borderRadius: '8px',
        textAlign: 'center',
        boxShadow: '0 2px 5px rgba(0,0,0,0.05)',
    },
    summaryValue: {
        fontSize: '2.2em',
        fontWeight: 'bold',
        color: '#28a745',
        margin: '10px 0 0',
    },
    chartContainer: {
        backgroundColor: '#ffffff',
        padding: '20px',
        borderRadius: '8px',
        boxShadow: '0 2px 5px rgba(0,0,0,0.05)',
        marginBottom: '30px',
        height: '400px', // Altura fija para los gráficos
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
    },
    noDataMessage: {
        textAlign: 'center',
        color: '#777',
        fontStyle: 'italic',
        marginBottom: '20px',
        fontSize: '1em',
    },
    chartExplanation: {
        backgroundColor: '#e6f7ff',
        borderLeft: '4px solid #2196f3',
        padding: '15px',
        marginBottom: '30px',
        borderRadius: '4px',
        color: '#333',
        fontSize: '0.95em',
        lineHeight: '1.4',
    },
    chartsContainer: {
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(450px, 1fr))',
        gap: '30px',
        marginBottom: '30px',
    },
    tablesContainer: {
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
        gap: '30px',
    },
    tableContainer: {
        backgroundColor: '#ffffff',
        padding: '20px',
        borderRadius: '8px',
        boxShadow: '0 2px 5px rgba(0,0,0,0.05)',
    },
    table: {
        width: '100%',
        borderCollapse: 'collapse',
        marginTop: '15px',
    },
    th: {
        padding: '12px 8px',
        borderBottom: '1px solid #ddd',
        textAlign: 'left',
        backgroundColor: '#f2f2f2',
        fontWeight: 'bold',
        fontSize: '0.9em',
        color: '#555',
    },
    td: {
        padding: '10px 8px',
        borderBottom: '1px solid #eee',
        textAlign: 'left',
        fontSize: '0.9em',
    },
};

export default MetricasVentas;
