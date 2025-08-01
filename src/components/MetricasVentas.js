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
    const { user, isAuthenticated, loading: authLoading, selectedStoreSlug, token, stores } = useAuth(); 

    // Obtener la fecha actual para los filtros por defecto
    const today = new Date();
    const currentYear = today.getFullYear();
    const currentMonth = (today.getMonth() + 1).toString().padStart(2, '0'); // Mes 0-11, por eso +1
    const currentDay = today.getDate().toString().padStart(2, '0');

    // Estado para las métricas de ventas obtenidas
    const [metricas, setMetricas] = useState(null);
    // Estado para indicar si las métricas están cargando
    const [loadingMetrics, setLoadingMetrics] = useState(true);
    // Estado para almacenar mensajes de error
    const [error, setError] = useState(null);

    // Estados para los filtros de fecha (sin 'periodType' ahora)
    const [filterYear, setFilterYear] = useState(currentYear.toString());
    const [filterMonth, setFilterMonth] = useState(currentMonth);
    const [filterDay, setFilterDay] = useState(currentDay);

    // Estados para los filtros existentes
    const [sellerFilter, setSellerFilter] = useState('');
    const [paymentMethodFilter, setPaymentMethodFilter] = useState('');

    const [availableSellers, setAvailableSellers] = useState([]);
    const [availablePaymentMethods, setAvailablePaymentMethods] = useState([]);

    // Función para obtener la lista de usuarios (vendedores)
    const fetchUsers = useCallback(async () => {
        if (!token || !selectedStoreSlug || !stores.length) return; 
        
        const store = stores.find(s => s.nombre === selectedStoreSlug);
        if (!store) {
            console.warn("MetricasVentas: No se encontró la tienda con el slug:", selectedStoreSlug);
            setAvailableSellers([]);
            return;
        }
        const storeId = store.id;

        try {
            const response = await axios.get(`${BASE_API_ENDPOINT}/api/users/`, {
                headers: { 'Authorization': `Bearer ${token}` },
                params: { tienda: storeId } 
            });
            setAvailableSellers(response.data.results || response.data);
        } catch (err) {
            console.error("Error al cargar vendedores:", err.response ? err.response.data : err.message);
            setError(`Error al cargar vendedores: ${err.response?.data ? JSON.stringify(err.response.data) : err.message}`);
        }
    }, [token, selectedStoreSlug, stores]); 

    // Función para obtener los métodos de pago
    const fetchPaymentMethods = useCallback(async () => {
        if (!token) return;
        try {
            const response = await axios.get(`${BASE_API_ENDPOINT}/api/metodos-pago/`, {
                headers: { 'Authorization': `Bearer ${token}` },
            });
            setAvailablePaymentMethods(response.data.results || response.data);
        } catch (err) {
            console.error("Error al cargar métodos de pago:", err.response ? err.response.data : err.message);
            setError(`Error al cargar métodos de pago: ${err.response?.data ? JSON.stringify(err.response.data) : err.message}`);
        }
    }, [token]);

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

        // Lógica para construir los parámetros de fecha
        if (filterYear) {
            params.year = filterYear;
            if (filterMonth) {
                params.month = filterMonth;
                if (filterDay) {
                    params.day = filterDay;
                }
            }
        }

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
            setError(null); 
        } catch (err) {
            console.error("Error fetching metrics:", err.response ? err.response.data : err.message);
            setError('Error al cargar las métricas: ' + (err.response ? JSON.stringify(err.response.data) : err.message));
        } finally {
            setLoadingMetrics(false);
        }
    }, [token, selectedStoreSlug, filterYear, filterMonth, filterDay, sellerFilter, paymentMethodFilter]); 

    // Efecto para cargar métricas y opciones de filtro cuando cambian las dependencias
    // Ahora fetchMetricasVentas solo se llama en la carga inicial y al presionar el botón
    useEffect(() => {
        if (!authLoading && isAuthenticated && user && user.is_superuser && selectedStoreSlug) { 
            fetchUsers();
            fetchPaymentMethods();
            // Cargar métricas por defecto al inicio (día actual)
            fetchMetricasVentas(); 
        } else if (!authLoading && (!isAuthenticated || !user || !user.is_superuser)) { 
            setError("Acceso denegado. Solo los superusuarios pueden ver las métricas de ventas.");
            setLoadingMetrics(false);
        } else if (!authLoading && isAuthenticated && user && user.is_superuser && !selectedStoreSlug) {
            setLoadingMetrics(false);
            setMetricas(null); 
        }
    }, [isAuthenticated, user, authLoading, selectedStoreSlug, fetchUsers, fetchPaymentMethods]); // fetchMetricasVentas ya no es una dependencia aquí

    // Determinar la etiqueta del período para el gráfico de barras dinámicamente
    const getPeriodLabel = () => {
        if (filterDay) {
            return 'Hora del Día';
        } else if (filterMonth) {
            return 'Día del Mes';
        } else if (filterYear) {
            return 'Mes del Año';
        }
        return 'Período'; // Fallback, aunque siempre debería haber al menos un año
    };

    const barChartData = {
        labels: metricas?.ventas_agrupadas_por_periodo?.data?.map(item => {
            // Ajustar las etiquetas del gráfico de barras según los filtros aplicados
            if (filterDay) {
                return `${item.periodo}h`; // Agrupado por hora
            } else if (filterMonth) {
                return `Día ${item.periodo}`; // Agrupado por día del mes
            } else if (filterYear) {
                const months = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
                return months[item.periodo - 1]; // Agrupado por mes del año
            }
            return String(item.periodo); 
        }) || [],
        datasets: [
            {
                label: 'Monto Total Vendido',
                data: metricas?.ventas_agrupadas_por_periodo?.data?.map(item => parseFloat(item.total_ventas)) || [], 
                backgroundColor: 'rgba(75, 192, 192, 0.6)',
                borderColor: 'rgba(75, 192, 192, 1)',
                borderWidth: 1,
            },
        ],
    };

    const pieChartData = {
        labels: metricas?.ventas_por_metodo_pago?.map(item => item.metodo_pago || 'Desconocido') || [], 
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
    const salesByUserTableData = metricas?.ventas_por_usuario?.filter(item => parseFloat(item.monto_total_vendido) > 0) || [];
    const salesByPaymentMethodTableData = metricas?.ventas_por_metodo_pago?.filter(item => parseFloat(item.monto_total) > 0) || [];


    if (authLoading || (isAuthenticated && !user)) { 
        return <div style={styles.loadingMessage}>Cargando datos de usuario...</div>;
    }

    if (!isAuthenticated || !user.is_superuser) {
        return <div style={styles.accessDeniedMessage}>Acceso denegado. Solo los superusuarios pueden ver las métricas de ventas.</div>;
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

    if (!metricas) {
        return <div style={styles.noDataMessage}>No hay datos de métricas disponibles para los filtros seleccionados.</div>;
    }

    return (
        <div style={styles.container}>
            <h1>Métricas de Ventas ({selectedStoreSlug})</h1>

            {/* Sección de Filtros */}
            <div style={styles.filterSection}>
                {/* Filtro de Año */}
                <div style={styles.filterGroup}>
                    <label style={styles.filterLabel}>Año:</label>
                    <input
                        type="number"
                        min="2000" 
                        max={currentYear}
                        value={filterYear}
                        onChange={(e) => {
                            setFilterYear(e.target.value);
                            setFilterMonth(''); // Resetear mes y día al cambiar el año
                            setFilterDay('');
                        }}
                        style={styles.filterSelect}
                    />
                </div>
                {/* Filtro de Mes (visible si se ha seleccionado un año) */}
                {filterYear && (
                    <div style={styles.filterGroup}>
                        <label style={styles.filterLabel}>Mes:</label>
                        <select
                            value={filterMonth}
                            onChange={(e) => {
                                setFilterMonth(e.target.value);
                                setFilterDay(''); // Resetear día al cambiar el mes
                            }}
                            style={styles.filterSelect}
                        >
                            <option value="">Todos</option>
                            {[...Array(12).keys()].map(i => (
                                <option key={i + 1} value={(i + 1).toString().padStart(2, '0')}>
                                    {new Date(currentYear, i, 1).toLocaleString('es-ES', { month: 'long' })}
                                </option>
                            ))}
                        </select>
                    </div>
                )}
                {/* Filtro de Día (visible si se ha seleccionado un año y un mes) */}
                {filterYear && filterMonth && (
                    <div style={styles.filterGroup}>
                        <label style={styles.filterLabel}>Día:</label>
                        <input
                            type="number"
                            min="1"
                            max="31" 
                            value={filterDay}
                            onChange={(e) => setFilterDay(e.target.value)}
                            style={styles.filterSelect}
                        />
                    </div>
                )}

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
                    <p style={styles.summaryValue}>${parseFloat(metricas.total_ventas_periodo).toFixed(2)}</p>
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
                    El gráfico de barras "Ventas por {getPeriodLabel()}"
                    presenta el monto total de ventas agrupado por el período seleccionado.
                    El gráfico de pastel "Ventas por Método de Pago" desglosa el monto total de ventas
                    según el método de pago utilizado.
                </p>
            </div>

            {/* Gráficos */}
            <div style={styles.chartsContainer}>
                <div style={styles.chartContainer}>
                    <h3>Ventas por {getPeriodLabel()}</h3>
                    {barChartData.labels.length > 0 ? (
                        <Bar data={barChartData} options={{ ...commonChartOptions, plugins: { ...commonChartOptions.plugins, title: { ...commonChartOptions.plugins.title, text: `Ventas Agrupadas por ${getPeriodLabel()}` } } }} />
                    ) : (
                        <p style={styles.noDataMessage}>No hay datos de ventas para el período seleccionado.</p>
                    )}
                </div>
                <div style={styles.chartContainer}>
                    <h3>Ventas por Método de Pago</h3>
                    {pieChartData.labels.length > 0 ? (
                        <Pie data={pieChartData} options={{ ...commonChartOptions, plugins: { ...commonChartOptions.plugins, title: { ...commonChartOptions.plugins.title, text: 'Ventas por Método de Pago' } } }} />
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
                                    <th style={styles.th}>Cantidad Total</th> 
                                </tr>
                            </thead>
                            <tbody>
                                {topProductsData.map((item, index) => (
                                    <tr key={index}>
                                        <td style={styles.td}>{item.producto__nombre}</td>
                                        <td style={styles.td}>{item.cantidad_total}</td>
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
                                        <td style={styles.td}>${parseFloat(item.monto_total_vendido).toFixed(2)}</td>
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
                                        <td style={styles.td}>${parseFloat(item.monto_total).toFixed(2)}</td>
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
        height: '400px', 
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
