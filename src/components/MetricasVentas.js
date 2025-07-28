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

    // Nuevo estado para el filtro de fecha (YYYY-MM-DD)
    const [dateFilter, setDateFilter] = useState('');
    // Estados para los filtros existentes
    const [sellerIdFilter, setSellerIdFilter] = useState('');
    const [paymentMethodFilter, setPaymentMethodFilter] = useState('');

    // Estado para almacenar la lista de métodos de pago disponibles
    const [paymentMethods, setPaymentMethods] = useState([]);
    // Estado para almacenar la lista de vendedores disponibles
    const [availableSellers, setAvailableSellers] = useState([]);

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

    // Función para obtener los métodos de pago
    const fetchPaymentMethods = useCallback(async () => {
        if (!token) return;
        try {
            const response = await axios.get(`${BASE_API_ENDPOINT}/api/metodos-pago/`, {
                headers: { 'Authorization': `Bearer ${token}` },
            });
            setPaymentMethods(response.data);
        } catch (err) {
            console.error("Error al cargar métodos de pago:", err.response ? err.response.data : err.message);
        }
    }, [token]);

    const fetchMetricas = useCallback(async () => {
        if (!token || !selectedStoreSlug) {
            setLoadingMetrics(false);
            return;
        }

        setLoadingMetrics(true);
        setError(null);
        try {
            const params = {
                tienda_slug: selectedStoreSlug,
            };

            // Parsear la fecha del filtro
            if (dateFilter) {
                const dateObj = new Date(dateFilter);
                params.year = dateObj.getFullYear();
                params.month = (dateObj.getMonth() + 1).toString(); // Meses son 0-index en JS, 1-index en Django
                params.day = dateObj.getDate().toString();
            }

            if (sellerIdFilter) params.seller_id = sellerIdFilter;
            if (paymentMethodFilter) params.payment_method = paymentMethodFilter;

            const response = await axios.get(`${BASE_API_ENDPOINT}/api/metricas-ventas/`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                },
                params: params,
            });
            setMetricas(response.data);
        } catch (err) {
            console.error('Error al obtener métricas:', err.response ? err.response.data : err.message);
            setError('No se pudieron cargar las métricas. Verifica tu conexión o permisos.');
            setMetricas(null);
        } finally {
            setLoadingMetrics(false);
        }
    }, [token, selectedStoreSlug, dateFilter, sellerIdFilter, paymentMethodFilter]);

    useEffect(() => {
        if (!authLoading && isAuthenticated && selectedStoreSlug) {
            fetchUsers();
            fetchPaymentMethods();
            fetchMetricas();
        } else if (!authLoading && (!isAuthenticated || !selectedStoreSlug)) {
            setLoadingMetrics(false);
        }
    }, [token, isAuthenticated, authLoading, selectedStoreSlug, fetchMetricas, fetchUsers, fetchPaymentMethods]);

    const handleApplyFilters = () => {
        fetchMetricas();
    };

    if (authLoading) {
        return <p style={styles.loadingMessage}>Cargando información de usuario...</p>;
    }

    if (!isAuthenticated) {
        return <p style={styles.noDataMessage}>Por favor, inicia sesión para ver las métricas de ventas.</p>;
    }

    if (!user || (!user.is_staff && !user.is_superuser)) {
        return <p style={styles.noDataMessage}>No tienes permiso para ver las métricas de ventas.</p>;
    }

    if (!selectedStoreSlug) {
        return (
            <div style={{ padding: '50px', textAlign: 'center' }}>
                <h2>Por favor, selecciona una tienda en la barra de navegación para ver las métricas de ventas.</h2>
            </div>
        );
    }

    // Datos para los gráficos
    const ventasPorPeriodoData = {
        labels: metricas?.ventas_agrupadas_por_periodo?.data.map(item => {
            if (metricas.ventas_agrupadas_por_periodo.label === "Día") {
                return new Date(item.fecha).toLocaleDateString();
            } else if (metricas.ventas_agrupadas_por_periodo.label === "Mes") {
                return `${item.fecha}/${item.year}`; // Formato Mes/Año
            }
            return item.fecha; // Para Año
        }) || [],
        datasets: [
            {
                label: 'Monto Total Vendido',
                data: metricas?.ventas_agrupadas_por_periodo?.data.map(item => parseFloat(item.total_monto)) || [],
                backgroundColor: 'rgba(75, 192, 192, 0.6)',
                borderColor: 'rgba(75, 192, 192, 1)',
                borderWidth: 1,
            },
        ],
    };

    const productosMasVendidosData = {
        labels: metricas?.productos_mas_vendidos.map(p => `${p.producto__nombre} (${p.producto__talle})`) || [],
        datasets: [
            {
                label: 'Cantidad Vendida',
                data: metricas?.productos_mas_vendidos.map(p => p.cantidad_total) || [],
                backgroundColor: [
                    'rgba(255, 99, 132, 0.6)',
                    'rgba(54, 162, 235, 0.6)',
                    'rgba(255, 206, 86, 0.6)',
                    'rgba(75, 192, 192, 0.6)',
                    'rgba(153, 102, 255, 0.6)',
                ],
                borderColor: [
                    'rgba(255, 99, 132, 1)',
                    'rgba(54, 162, 235, 1)',
                    'rgba(255, 206, 86, 1)',
                    'rgba(75, 192, 192, 1)',
                    'rgba(153, 102, 255, 1)',
                ],
                borderWidth: 1,
            },
        ],
    };

    const ventasPorUsuarioData = {
        labels: metricas?.ventas_por_usuario.map(u => u.usuario__username) || [],
        datasets: [
            {
                label: 'Monto Total Vendido',
                data: metricas?.ventas_por_usuario.map(u => parseFloat(u.monto_total_vendido)) || [],
                backgroundColor: 'rgba(153, 102, 255, 0.6)',
                borderColor: 'rgba(153, 102, 255, 1)',
                borderWidth: 1,
            },
        ],
    };

    const ventasPorMetodoPagoData = {
        labels: metricas?.ventas_por_metodo_pago.map(m => m.metodo_pago || 'Desconocido') || [],
        datasets: [
            {
                label: 'Monto Total',
                data: metricas?.ventas_por_metodo_pago.map(m => parseFloat(m.monto_total)) || [],
                backgroundColor: [
                    'rgba(255, 159, 64, 0.6)',
                    'rgba(255, 99, 132, 0.6)',
                    'rgba(54, 162, 235, 0.6)',
                    'rgba(75, 192, 192, 0.6)',
                ],
                borderColor: [
                    'rgba(255, 159, 64, 1)',
                    'rgba(255, 99, 132, 1)',
                    'rgba(54, 162, 235, 1)',
                    'rgba(75, 192, 192, 1)',
                ],
                borderWidth: 1,
            },
        ],
    };

    const chartOptions = {
        responsive: true,
        maintainAspectRatio: false, // Permite que el gráfico se ajuste al contenedor
        plugins: {
            legend: {
                position: 'top',
            },
            title: {
                display: true,
                text: '', // Se establecerá dinámicamente
            },
        },
        scales: {
            y: {
                beginAtZero: true,
            },
        },
    };

    return (
        <div style={styles.container}>
            <h1 style={styles.header}>Métricas de Ventas ({selectedStoreSlug})</h1>

            <div style={styles.filterContainer}>
                <h3>Filtros de Métricas</h3>
                <div style={styles.filterGrid}>
                    <div>
                        <label htmlFor="dateFilter">Fecha:</label>
                        <input
                            type="date"
                            id="dateFilter"
                            value={dateFilter}
                            onChange={(e) => setDateFilter(e.target.value)}
                            style={styles.input}
                        />
                    </div>
                    <div>
                        <label htmlFor="sellerIdFilter">Vendedor:</label>
                        <select
                            id="sellerIdFilter"
                            value={sellerIdFilter}
                            onChange={(e) => setSellerIdFilter(e.target.value)}
                            style={styles.input}
                        >
                            <option value="">Todos</option>
                            {availableSellers.map(seller => (
                                <option key={seller.id} value={seller.id}>{seller.username}</option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label htmlFor="paymentMethodFilter">Método de Pago:</label>
                        <select
                            id="paymentMethodFilter"
                            value={paymentMethodFilter}
                            onChange={(e) => setPaymentMethodFilter(e.target.value)}
                            style={styles.input}
                        >
                            <option value="">Todos</option>
                            {paymentMethods.map(method => (
                                <option key={method.id} value={method.id}>{method.nombre}</option>
                            ))}
                        </select>
                    </div>
                </div>
                <button onClick={handleApplyFilters} style={styles.primaryButton}>
                    Aplicar Filtros
                </button>
            </div>

            {loadingMetrics && <p style={styles.loadingMessage}>Cargando métricas...</p>}
            {error && <p style={styles.errorMessage}>{error}</p>}

            {!loadingMetrics && !metricas && !error && (
                <p style={styles.noDataMessage}>No se pudieron cargar las métricas o no hay datos disponibles.</p>
            )}

            {!loadingMetrics && metricas && (
                <>
                    <div style={styles.summaryGrid}>
                        <div style={styles.summaryItem}>
                            <h3>Total Ventas (Período)</h3>
                            <p style={styles.summaryValue}>${parseFloat(metricas.total_ventas_periodo).toFixed(2)}</p>
                        </div>
                        <div style={styles.summaryItem}>
                            <h3>Total Productos Vendidos</h3>
                            <p style={styles.summaryValue}>{metricas.total_productos_vendidos_periodo}</p>
                        </div>
                    </div>

                    <div style={styles.chartExplanation}>
                        <p>
                            Estos gráficos muestran un resumen visual de las métricas de ventas, permitiéndote identificar tendencias y patrones clave.
                        </p>
                    </div>

                    <div style={styles.chartContainer}>
                        {ventasPorPeriodoData.labels.length > 0 ? (
                            <Bar options={{ ...chartOptions, plugins: { ...chartOptions.plugins, title: { ...chartOptions.plugins.title, text: `Ventas Agrupadas por ${metricas.ventas_agrupadas_por_periodo.label}` } } }} data={ventasPorPeriodoData} />
                        ) : (
                            <p style={styles.noDataMessage}>No hay datos para el gráfico de Ventas Agrupadas por Período.</p>
                        )}
                    </div>

                    <div style={styles.chartContainer}>
                        {productosMasVendidosData.labels.length > 0 ? (
                            <Pie options={{ ...chartOptions, plugins: { ...chartOptions.plugins, title: { ...chartOptions.plugins.title, text: 'Top 5 Productos Más Vendidos' } } }} data={productosMasVendidosData} />
                        ) : (
                            <p style={styles.noDataMessage}>No hay datos para el gráfico de Top 5 Productos Más Vendidos.</p>
                        )}
                    </div>

                    <div style={styles.chartContainer}>
                        {ventasPorUsuarioData.labels.length > 0 ? (
                            <Bar options={{ ...chartOptions, plugins: { ...chartOptions.plugins, title: { ...chartOptions.plugins.title, text: 'Ventas por Vendedor' } } }} data={ventasPorUsuarioData} />
                        ) : (
                            <p style={styles.noDataMessage}>No hay datos para el gráfico de Ventas por Vendedor.</p>
                        )}
                    </div>

                    <div style={styles.chartContainer}>
                        {ventasPorMetodoPagoData.labels.length > 0 ? (
                            <Pie options={{ ...chartOptions, plugins: { ...chartOptions.plugins, title: { ...chartOptions.plugins.title, text: 'Ventas por Método de Pago' } } }} data={ventasPorMetodoPagoData} />
                        ) : (
                            <p style={styles.noDataMessage}>No hay datos para el gráfico de Ventas por Método de Pago.</p>
                        )}
                    </div>

                    <h2 style={styles.subHeader}>Detalle de Ventas por Usuario</h2>
                    {metricas.ventas_por_usuario && metricas.ventas_por_usuario.length > 0 ? (
                        <table style={styles.table}>
                            <thead>
                                <tr style={styles.tableHeaderRow}>
                                    <th style={styles.th}>Vendedor</th>
                                    <th style={styles.th}>Monto Total Vendido</th>
                                    <th style={styles.th}>Cantidad de Ventas</th>
                                </tr>
                            </thead>
                            <tbody>
                                {metricas.ventas_por_usuario.map((item, index) => (
                                    <tr key={index} style={styles.tableRow}>
                                        <td style={styles.td}>{item.usuario__username}</td>
                                        <td style={styles.td}>${parseFloat(item.monto_total_vendido).toFixed(2)}</td>
                                        <td style={styles.td}>{item.cantidad_ventas}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    ) : (
                        <p style={styles.noDataMessage}>No hay datos de ventas por usuario.</p>
                    )}

                    <h2 style={styles.subHeader}>Detalle de Ventas por Método de Pago</h2>
                    {metricas.ventas_por_metodo_pago && metricas.ventas_por_metodo_pago.length > 0 ? (
                        <table style={styles.table}>
                            <thead>
                                <tr style={styles.tableHeaderRow}>
                                    <th style={styles.th}>Método de Pago</th>
                                    <th style={styles.th}>Monto Total</th>
                                    <th style={styles.th}>Cantidad de Ventas</th>
                                </tr>
                            </thead>
                            <tbody>
                                {metricas.ventas_por_metodo_pago.map((item, index) => (
                                    <tr key={index} style={styles.tableRow}>
                                        <td style={styles.td}>{item.metodo_pago || 'Desconocido'}</td>
                                        <td style={styles.td}>${parseFloat(item.monto_total).toFixed(2)}</td>
                                        <td style={styles.td}>{item.cantidad_ventas}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    ) : (
                        <p style={styles.noDataMessage}>No hay datos de ventas por método de pago.</p>
                    )}
                </>
            )}
        </div>
    );
};

// Estilos CSS
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
        marginBottom: '30px',
    },
    subHeader: {
        marginTop: '40px',
        marginBottom: '20px',
        color: '#444',
        borderBottom: '1px solid #eee',
        paddingBottom: '10px',
    },
    filterContainer: {
        marginBottom: '30px',
        border: '1px solid #e0e0e0',
        padding: '20px',
        borderRadius: '8px',
        backgroundColor: '#f9f9f9',
    },
    filterGrid: {
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: '20px',
        marginBottom: '20px',
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
        marginTop: '10px',
    },
    primaryButtonHover: {
        backgroundColor: '#0056b3',
    },
    loadingMessage: {
        textAlign: 'center',
        marginTop: '50px',
        color: '#555',
    },
    errorMessage: {
        color: 'red',
        backgroundColor: '#ffe3e6',
        padding: '15px',
        borderRadius: '5px',
        marginBottom: '20px',
        textAlign: 'center',
    },
    noDataMessage: {
        textAlign: 'center',
        marginTop: '20px',
        color: '#777',
        fontStyle: 'italic',
        marginBottom: '20px',
    },
    summaryGrid: {
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
        gap: '30px',
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
        height: '400px', // Altura fija para los gráficos
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
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
    td: {
        border: '1px solid #ddd',
        padding: '10px',
        verticalAlign: 'top',
    },
};

export default MetricasVentas;
