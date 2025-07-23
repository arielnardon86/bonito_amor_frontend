// BONITO_AMOR/frontend/src/components/MetricasVentas.js
import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { useAuth } from '../AuthContext'; // Importar useAuth para obtener selectedStoreSlug
import { Line, Bar, Pie } from 'react-chartjs-2'; // Asegúrate de importar Pie si lo usas
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    BarElement,
    Title,
    Tooltip,
    Legend,
    ArcElement, // Para gráficos de pastel/donas si los usas
} from 'chart.js';

// Registrar los componentes de Chart.js que vas a usar
ChartJS.register(
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    BarElement,
    Title,
    Tooltip,
    Legend,
    ArcElement // Registrar ArcElement si se usa para gráficos de pastel/donas
);

const API_BASE_URL = process.env.REACT_APP_API_URL;

const MetricasVentas = () => {
    const { user, token, isAuthenticated, loading: authLoading, selectedStoreSlug } = useAuth(); // Obtener selectedStoreSlug

    const [metrics, setMetrics] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // Filtros
    const [filterYear, setFilterYear] = useState('');
    const [filterMonth, setFilterMonth] = useState('');
    const [filterDay, setFilterDay] = useState('');
    const [filterSellerId, setFilterSellerId] = useState('');
    const [filterPaymentMethod, setFilterPaymentMethod] = useState('');

    const [sellers, setSellers] = useState([]); // Para la lista de vendedores
    const [paymentMethods, setPaymentMethods] = useState([]); // Para la lista de métodos de pago

    // Función para obtener la lista de vendedores
    const fetchSellers = useCallback(async () => {
        if (!token || !selectedStoreSlug) return; // No cargar si no hay token o tienda seleccionada
        try {
            // Incluir tienda_slug en la URL para filtrar vendedores si es necesario,
            // aunque el backend de users no filtra por tienda por defecto.
            // Si tu backend de users no filtra por tienda, esta parte no es estrictamente necesaria,
            // pero la mantenemos para consistencia si decides implementarlo.
            const response = await axios.get(`${API_BASE_URL}/users/`, {
                headers: { 'Authorization': `Bearer ${token}` }
                // params: { tienda_slug: selectedStoreSlug } // Descomentar si tu UserViewSet soporta filtro por tienda
            });
            setSellers(response.data.results || response.data);
        } catch (err) {
            console.error("Error fetching sellers:", err.response ? err.response.data : err.message);
        }
    }, [token, selectedStoreSlug]); // Añadir selectedStoreSlug como dependencia

    // Función para obtener la lista de métodos de pago
    const fetchPaymentMethods = useCallback(async () => {
        if (!token || !selectedStoreSlug) { // No cargar si no hay token o tienda seleccionada
            setPaymentMethods([{ value: '', label: 'Todos los Métodos de Pago' }]);
            return;
        }
        try {
            // Incluir tienda_slug en la URL para filtrar métodos de pago
            const response = await axios.get(`${API_BASE_URL}/metodos-pago/?tienda_slug=${selectedStoreSlug}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            setPaymentMethods([{ value: '', label: 'Todos los Métodos de Pago' }, ...response.data]);
        } catch (err) {
            console.error("Error fetching payment methods:", err.response ? err.response.data : err.message);
            // Fallback si hay un error cargando desde la API
            setPaymentMethods([
                { value: '', label: 'Todos los Métodos de Pago' },
                { value: 'Efectivo', label: 'Efectivo' },
                { value: 'Transferencia', label: 'Transferencia' },
                { value: 'QR', label: 'QR' },
                { value: 'Tarjeta de débito', label: 'Tarjeta de débito' },
                { value: 'Tarjeta de crédito', label: 'Tarjeta de crédito' },
            ]);
        }
    }, [token, selectedStoreSlug]); // Añadir selectedStoreSlug como dependencia

    // Función para obtener las métricas de ventas
    const fetchMetrics = useCallback(async () => {
        if (!token || !selectedStoreSlug) { // No cargar si no hay token o tienda seleccionada
            setLoading(false);
            return;
        }

        setLoading(true);
        setError(null);
        try {
            const params = {
                ...(filterYear && { year: filterYear }),
                ...(filterMonth && { month: filterMonth }),
                ...(filterDay && { day: filterDay }),
                ...(filterSellerId && { seller_id: filterSellerId }),
                ...(filterPaymentMethod && { payment_method: filterPaymentMethod }),
                tienda_slug: selectedStoreSlug, // *** CAMBIO CLAVE AQUÍ: Añadir tienda_slug ***
            };
            console.log("Fetching metrics with params:", params);
            const response = await axios.get(`${API_BASE_URL}/metricas/metrics/`, {
                headers: { 'Authorization': `Bearer ${token}` },
                params: params,
            });
            setMetrics(response.data);
            console.log("Metrics fetched:", response.data);
        } catch (err) {
            console.error('Error fetching metrics:', err.response ? err.response.data : err.message);
            setError('Error al cargar las métricas: ' + (err.response ? JSON.stringify(err.response.data) : err.message));
        } finally {
            setLoading(false);
        }
    }, [token, selectedStoreSlug, filterYear, filterMonth, filterDay, filterSellerId, filterPaymentMethod]); // Añadir selectedStoreSlug como dependencia

    // useEffect para cargar vendedores, métodos de pago y métricas al inicio
    useEffect(() => {
        if (!authLoading && isAuthenticated && user?.is_superuser && selectedStoreSlug) { // Solo si hay tienda seleccionada
            fetchSellers();
            fetchPaymentMethods();
            fetchMetrics();
        } else if (!authLoading && (!isAuthenticated || !user?.is_superuser)) {
            setError("Acceso denegado. No tienes permisos para ver estas métricas.");
            setLoading(false); // Usar setLoading para el estado de carga general
        } else if (!authLoading && isAuthenticated && !selectedStoreSlug) {
            setLoading(false); // Si no hay tienda seleccionada, no hay métricas que cargar
        }
    }, [authLoading, isAuthenticated, user, selectedStoreSlug, fetchSellers, fetchPaymentMethods, fetchMetrics]);


    const handleApplyFilters = () => {
        fetchMetrics(); // Vuelve a cargar las métricas con los filtros aplicados
    };

    const handleClearFilters = () => {
        setFilterYear('');
        setFilterMonth('');
        setFilterDay('');
        setFilterSellerId('');
        setFilterPaymentMethod('');
        // fetchMetrics will be called due to filter state changes in the useEffect
    };

    // --- OPTIONS GENERATORS FOR DATE SELECTS (Calendar-like) ---
    const getYears = () => {
        const currentYear = new Date().getFullYear();
        const years = [];
        for (let i = currentYear; i >= currentYear - 10; i--) {
            years.push(i);
        }
        return years;
    };

    const getMonths = () => {
        return Array.from({ length: 12 }, (_, i) => ({
            value: (i + 1).toString().padStart(2, '0'), // Format MM
            label: new Date(0, i).toLocaleString('es-ES', { month: 'long' })
        }));
    };

    const getDaysInMonth = (year, month) => {
        if (!year || !month) return [];
        const numDays = new Date(parseInt(year), parseInt(month), 0).getDate();
        return Array.from({ length: numDays }, (_, i) => (i + 1).toString().padStart(2, '0')); // Format DD
    };

    // --- DATA PREPARATION FOR CHARTS ---

    // Sales Trend Chart (Line Chart)
    const salesTrendData = {
        labels: metrics?.ventas_agrupadas_por_periodo?.data?.map(item => item.fecha) || [],
        datasets: [
            {
                label: `Total de Ventas por ${metrics?.ventas_agrupadas_por_periodo?.label || 'Periodo'}`,
                data: metrics?.ventas_agrupadas_por_periodo?.data?.map(item => item.total_monto) || [],
                borderColor: 'rgb(75, 192, 192)',
                backgroundColor: 'rgba(75, 192, 192, 0.5)',
                tension: 0.1,
                fill: false, // Do not fill the area under the line
            },
        ],
    };

    const salesTrendOptions = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: {
                position: 'top',
            },
            title: {
                display: true,
                text: `Tendencia de Ventas por ${metrics?.ventas_agrupadas_por_periodo?.label || 'Periodo'}`,
            },
        },
        scales: {
            x: {
                title: {
                    display: true,
                    text: metrics?.ventas_agrupadas_por_periodo?.label || 'Periodo',
                },
            },
            y: {
                beginAtZero: true,
                title: {
                    display: true,
                    text: 'Monto Total Vendido ($)',
                },
            },
        },
    };


    const productsSoldChartData = metrics && metrics.productos_mas_vendidos ? {
        labels: metrics.productos_mas_vendidos.map(item => item.producto__nombre),
        datasets: [
            {
                label: 'Cantidad Vendida (Unidades)',
                data: metrics.productos_mas_vendidos.map(item => item.cantidad_total),
                backgroundColor: 'rgba(255, 99, 132, 0.5)',
                borderColor: 'rgb(255, 99, 132)',
                borderWidth: 1,
            },
            {
                label: 'Monto Total Vendido',
                data: metrics.productos_mas_vendidos.map(item => item.monto_total),
                backgroundColor: 'rgba(53, 162, 235, 0.5)',
                borderColor: 'rgb(53, 162, 235)',
                borderWidth: 1,
            },
        ],
    } : null;

    const productsSoldChartOptions = {
        indexAxis: 'y', // Makes the bar chart horizontal
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: {
                position: 'top',
            },
            title: {
                display: true,
                text: 'Productos Vendidos',
            },
        },
        scales: {
            x: {
                beginAtZero: true,
                title: {
                    display: true,
                    text: 'Valor',
                },
            },
            y: {
                beginAtZero: true,
                title: {
                    display: true,
                    text: 'Producto',
                }
            }
        },
    };

    const salesByUserChartData = metrics && metrics.ventas_por_usuario ? {
        labels: metrics.ventas_por_usuario.map(item => item.usuario__username),
        datasets: [
            {
                label: 'Monto Vendido',
                data: metrics.ventas_por_usuario.map(item => item.monto_total_vendido),
                backgroundColor: 'rgba(75, 192, 192, 0.7)',
                borderColor: 'rgb(75, 192, 192)',
                borderWidth: 1,
            },
            {
                label: 'Cantidad de Ventas',
                data: metrics.ventas_por_usuario.map(item => item.cantidad_ventas),
                backgroundColor: 'rgba(201, 203, 207, 0.7)',
                borderColor: 'rgb(201, 203, 207)',
                borderWidth: 1,
            },
        ],
    } : null;

    const salesByUserChartOptions = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: {
                position: 'top',
            },
            title: {
                display: true,
                text: 'Ventas por Usuario',
            },
        },
        scales: {
            y: {
                beginAtZero: true,
                title: {
                    display: true,
                    text: 'Valor',
                },
            },
        },
    };

    // --- CHART: SALES BY PAYMENT METHOD (Pie Chart) ---
    const salesByPaymentMethodChartData = metrics && metrics.ventas_por_metodo_pago ? {
        labels: metrics.ventas_por_metodo_pago.map(item => item.metodo_pago),
        datasets: [
            {
                label: 'Monto Total Vendido',
                data: metrics.ventas_por_metodo_pago.map(item => item.monto_total),
                backgroundColor: [
                    'rgba(255, 159, 64, 0.7)',  // Orange
                    'rgba(54, 162, 235, 0.7)',  // Blue
                    'rgba(255, 206, 86, 0.7)',  // Yellow
                    'rgba(75, 192, 192, 0.7)',  // Teal
                    'rgba(153, 102, 255, 0.7)', // Purple
                    'rgba(255, 99, 132, 0.7)',  // Red
                ],
                borderColor: [
                    'rgb(255, 159, 64)',
                    'rgb(54, 162, 235)',
                    'rgb(255, 206, 86)',
                    'rgb(75, 192, 192)',
                    'rgb(153, 102, 255)',
                    'rgb(255, 99, 132)',
                ],
                borderWidth: 1,
            },
        ],
    } : null;

    const salesByPaymentMethodChartOptions = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: {
                position: 'top',
            },
            title: {
                display: true,
                text: 'Monto Vendido por Método de Pago',
            },
        },
    };


    if (authLoading) { // Usar authLoading para el estado inicial de carga de autenticación
        return <div style={styles.loadingMessage}>Cargando información de usuario...</div>;
    }

    if (!isAuthenticated) {
        return <p>Por favor, inicia sesión para ver las métricas.</p>;
    }

    // Solo permite el acceso a superusuarios para las métricas
    if (!user || !user.is_superuser) {
        return <p>No tienes permiso para ver las métricas de ventas.</p>;
    }

    // Si no hay tienda seleccionada, muestra un mensaje
    if (!selectedStoreSlug) {
        return (
            <div style={{ padding: '50px', textAlign: 'center' }}>
                <h2>Por favor, selecciona una tienda en la barra de navegación para ver las métricas.</h2>
            </div>
        );
    }

    return (
        <div style={styles.container}>
            <h1>Métricas de Ventas ({selectedStoreSlug})</h1> {/* Muestra la tienda seleccionada */}

            {/* Controles de Filtro */}
            <form onSubmit={handleApplyFilters} style={styles.formContainer}>
                <h3 style={styles.subHeader}>Filtros de Métricas</h3>
                <div style={styles.filterGroup}>
                    {/* --- SELECT FOR YEAR --- */}
                    <select
                        value={filterYear}
                        onChange={(e) => {
                            setFilterYear(e.target.value);
                            setFilterMonth('');
                            setFilterDay('');
                        }}
                        style={styles.input}
                    >
                        <option value="">Seleccionar Año</option>
                        {getYears().map(year => (
                            <option key={year} value={year}>{year}</option>
                        ))}
                    </select>

                    {/* --- SELECT FOR MONTH --- */}
                    <select
                        value={filterMonth}
                        onChange={(e) => {
                            setFilterMonth(e.target.value);
                            setFilterDay('');
                        }}
                        style={styles.input}
                        disabled={!filterYear}
                    >
                        <option value="">Seleccionar Mes</option>
                        {getMonths().map(month => (
                            <option key={month.value} value={month.value}>
                                {month.label}
                            </option>
                        ))}
                    </select>

                    {/* --- SELECT FOR DAY --- */}
                    <select
                        value={filterDay}
                        onChange={(e) => setFilterDay(e.target.value)}
                        style={styles.input}
                        disabled={!filterYear || !filterMonth}
                    >
                        <option value="">Seleccionar Día</option>
                        {getDaysInMonth(filterYear, filterMonth).map(day => (
                            <option key={day} value={day}>{day}</option>
                        ))}
                    </select>

                    {/* --- SELECT FOR SELLER --- */}
                    <select
                        value={filterSellerId}
                        onChange={(e) => setFilterSellerId(e.target.value)}
                        style={styles.input}
                    >
                        <option value="">Todos los Vendedores</option>
                        {sellers.map(seller => (
                            <option key={seller.id} value={seller.id}>
                                {seller.username} ({seller.first_name} {seller.last_name})
                            </option>
                        ))}
                    </select>

                    {/* --- SELECT FOR PAYMENT METHOD --- */}
                    <select
                        value={filterPaymentMethod}
                        onChange={(e) => setFilterPaymentMethod(e.target.value)}
                        style={styles.input}
                    >
                        {paymentMethods.map(method => (
                            <option key={method.value} value={method.value}>
                                {method.label}
                            </option>
                        ))}
                    </select>

                    <button type="submit" style={styles.submitButton}>Aplicar Filtros</button>
                    <button type="button" onClick={handleClearFilters} style={styles.clearFiltersButton}>Limpiar Filtros</button>
                </div>
            </form>

            {loading && <p style={styles.loadingMessage}>Cargando métricas...</p>}
            {error && <p style={styles.error}>{error}</p>}

            {/* Displays message if no metrics after loading and no error */}
            {!loading && !metrics && !error && <p style={styles.noDataMessage}>No hay datos de métricas disponibles para los filtros seleccionados.</p>}

            {metrics && (
                <div style={styles.metricasData}>
                    <h2>Resumen del Período</h2>
                    <div style={styles.summaryGrid}>
                        <div style={styles.summaryItem}>
                            <h3>Total de Ventas</h3>
                            <p style={styles.summaryValue}>${metrics.total_ventas_periodo ? metrics.total_ventas_periodo.toFixed(2) : '0.00'}</p>
                        </div>
                        <div style={styles.summaryItem}>
                            <h3>Total Productos Vendidos (Unidades)</h3>
                            <p style={styles.summaryValue}>{metrics.total_productos_vendidos_periodo || 0}</p>
                        </div>
                    </div>

                    {/* EXPLANATION FOR CHARTS */}
                    <p style={styles.chartExplanation}>
                        A continuación, se muestran los gráficos de métricas. Puedes hacer clic en las leyendas de los gráficos para activar o desactivar la visualización de datos específicos.
                    </p>

                    {/* Sales Trend Chart (Line Chart) */}
                    {salesTrendData && salesTrendData.labels.length > 0 ? (
                        <div style={styles.chartContainer}>
                            <Line data={salesTrendData} options={salesTrendOptions} />
                        </div>
                    ) : (
                        <p style={styles.noDataMessage}>No hay datos de tendencia de ventas para el período seleccionado.</p>
                    )}

                    {/* Top Products Sold Chart (Bar Chart) */}
                    {productsSoldChartData && productsSoldChartData.labels.length > 0 ? (
                        <div style={styles.chartContainer}>
                            <Bar data={productsSoldChartData} options={productsSoldChartOptions} />
                        </div>
                    ) : (
                        <p style={styles.noDataMessage}>No hay datos de productos vendidos para el período seleccionado.</p>
                    )}

                    {/* Sales by User Chart (Bar Chart) */}
                    {salesByUserChartData && salesByUserChartData.labels.length > 0 ? (
                        <div style={styles.chartContainer}>
                            <Bar data={salesByUserChartData} options={salesByUserChartOptions} />
                        </div>
                    ) : (
                        <p style={styles.noDataMessage}>No hay datos de ventas por usuario para el período seleccionado.</p>
                    )}

                    {/* CHART: SALES BY PAYMENT METHOD (Pie Chart) */}
                    {metrics.ventas_por_metodo_pago && metrics.ventas_por_metodo_pago.length > 0 ? (
                        <div style={styles.chartContainer}>
                            <Pie data={salesByPaymentMethodChartData} options={salesByPaymentMethodChartOptions} />
                        </div>
                    ) : (
                        <p style={styles.noDataMessage}>No hay datos de ventas por método de pago para el período seleccionado.</p>
                    )}


                    {/* Detailed Tables */}
                    <h3 style={styles.subHeader}>Ventas por Usuario</h3>
                    <table style={styles.table}>
                        <thead>
                            <tr>
                                <th style={styles.th}>Usuario</th>
                                <th style={styles.th}>Monto Vendido</th>
                                <th style={styles.th}>Cantidad de Ventas</th>
                            </tr>
                        </thead>
                        <tbody>
                            {metrics.ventas_por_usuario && metrics.ventas_por_usuario.length > 0 ? (
                                metrics.ventas_por_usuario.map((item, index) => (
                                    <tr key={index}>
                                        <td style={styles.td}>{item.usuario__username}</td>
                                        <td style={styles.td}>${item.monto_total_vendido.toFixed(2)}</td>
                                        <td style={styles.td}>{item.cantidad_ventas}</td>
                                    </tr>
                                ))
                            ) : (
                                <tr><td colSpan="3" style={styles.td}>No hay ventas registradas para este período por usuario.</td></tr>
                            )}
                        </tbody>
                    </table>

                    <h3 style={styles.subHeader}>Productos Vendidos</h3>
                    <table style={styles.table}>
                        <thead>
                            <tr>
                                <th style={styles.th}>Producto</th>
                                <th style={styles.th}>Cantidad Vendida</th>
                                <th style={styles.th}>Monto Total</th>
                            </tr>
                        </thead>
                        <tbody>
                            {metrics.productos_mas_vendidos && metrics.productos_mas_vendidos.length > 0 ? (
                                metrics.productos_mas_vendidos.map((item, index) => (
                                    <tr key={index}>
                                        <td style={styles.td}>{item.producto__nombre}</td>
                                        <td style={styles.td}>{item.cantidad_total}</td>
                                        <td style={styles.td}>${item.monto_total.toFixed(2)}</td>
                                    </tr>
                                ))
                            ) : (
                                <tr><td colSpan="3" style={styles.td}>No hay productos vendidos en este período.</td></tr>
                            )}
                        </tbody>
                    </table>

                    {/* TABLE: SALES BY PAYMENT METHOD */}
                    <h3 style={styles.subHeader}>Ventas por Método de Pago</h3>
                    <table style={styles.table}>
                        <thead>
                            <tr>
                                <th style={styles.th}>Método de Pago</th>
                                <th style={styles.th}>Monto Total</th>
                                <th style={styles.th}>Cantidad de Ventas</th>
                            </tr>
                        </thead>
                        <tbody>
                            {metrics.ventas_por_metodo_pago && metrics.ventas_por_metodo_pago.length > 0 ? (
                                metrics.ventas_por_metodo_pago.map((item, index) => (
                                    <tr key={index}>
                                        <td style={styles.td}>{item.metodo_pago}</td>
                                        <td style={styles.td}>${item.monto_total.toFixed(2)}</td>
                                        <td style={styles.td}>{item.cantidad_ventas}</td>
                                    </tr>
                                ))
                            ) : (
                                <tr><td colSpan="3" style={styles.td}>No hay datos de ventas por método de pago para este período.</td></tr>
                            )}
                        </tbody>
                    </table>

                </div>
            )}
        </div>
    );
};

const styles = {
    container: {
        padding: '20px',
        maxWidth: '1200px',
        margin: '20px auto',
        backgroundColor: '#fff',
        borderRadius: '8px',
        boxShadow: '0 0 10px rgba(0,0,0,0.1)',
    },
    header: {
        textAlign: 'center',
        color: '#333',
        marginBottom: '20px',
    },
    subHeader: {
        marginTop: '30px',
        marginBottom: '15px',
        color: '#555',
    },
    error: {
        color: 'red',
        backgroundColor: '#ffe3e6',
        padding: '10px',
        borderRadius: '5px',
        marginBottom: '15px',
        textAlign: 'center',
    },
    loadingMessage: {
        textAlign: 'center',
        marginTop: '50px',
        color: '#555',
    },
    accessDeniedMessage: {
        textAlign: 'center',
        marginTop: '50px',
        color: 'red',
        fontWeight: 'bold',
    },
    formContainer: {
        backgroundColor: '#f8f9fa',
        padding: '20px',
        borderRadius: '8px',
        marginBottom: '20px',
        border: '1px solid #e9ecef',
    },
    filterGroup: {
        display: 'flex',
        gap: '15px',
        alignItems: 'center',
        flexWrap: 'wrap',
    },
    input: {
        flex: '1 1 120px',
        padding: '10px',
        border: '1px solid #ced4da',
        borderRadius: '4px',
        minWidth: '100px',
    },
    submitButton: {
        backgroundColor: '#007bff',
        color: 'white',
        padding: '10px 15px',
        border: 'none',
        borderRadius: '5px',
        cursor: 'pointer',
        fontSize: '16px',
        whiteSpace: 'nowrap',
    },
    clearFiltersButton: {
        backgroundColor: '#6c757d',
        color: 'white',
        padding: '10px 15px',
        border: 'none',
        borderRadius: '5px',
        cursor: 'pointer',
        fontSize: '16px',
        whiteSpace: 'nowrap',
        marginLeft: '10px',
    },
    metricasData: {
        marginTop: '30px',
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
        fontSize: '2em',
        fontWeight: 'bold',
        color: '#28a745',
        margin: '10px 0 0',
    },
    chartContainer: {
        backgroundColor: '#fdfdfd',
        padding: '20px',
        borderRadius: '8px',
        boxShadow: '0 2px 5px rgba(0,0,0,0.05)',
        marginBottom: '30px',
        height: '400px', // Fixed height for charts
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
    },
    noDataMessage: {
        textAlign: 'center',
        color: '#777',
        fontStyle: 'italic',
        marginBottom: '20px',
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
    table: {
        width: '100%',
        borderCollapse: 'collapse',
        marginTop: '20px',
        marginBottom: '30px',
    },
    th: {
        backgroundColor: '#e9ecef',
        padding: '12px',
        textAlign: 'left',
        borderBottom: '1px solid #dee2e6',
    },
    td: {
        padding: '12px',
        borderBottom: '1px solid #dee2e6',
    },
};

export default MetricasVentas;
