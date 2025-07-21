// Store/frontend/src/components/MetricasVentas.js
import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { useAuth } from '../AuthContext';

// Importaciones de Chart.js
import { Bar, Pie, Line } from 'react-chartjs-2'; // Añadido Line
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    BarElement,
    ArcElement,
    PointElement, // Añadido para gráficos de línea
    LineElement,  // Añadido para gráficos de línea
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
    PointElement, // Registrar PointElement
    LineElement,  // Registrar LineElement
    Title,
    Tooltip,
    Legend
);

const API_BASE_URL = process.env.REACT_APP_API_URL;

const MetricasVentas = () => {
    const { user, isAuthenticated, loading } = useAuth();

    const [metricas, setMetricas] = useState(null);
    const [loadingMetrics, setLoadingMetrics] = useState(true);
    const [error, setError] = useState(null);

    // --- FILTROS DE FECHA ---
    const [yearFilter, setYearFilter] = useState('');
    const [monthFilter, setMonthFilter] = useState('');
    const [dayFilter, setDayFilter] = useState('');

    // --- FILTRO DE VENDEDOR ---
    const [sellers, setSellers] = useState([]);
    const [selectedSellerId, setSelectedSellerId] = useState('');

    // --- FILTRO DE MÉTODO DE PAGO ---
    const [paymentMethods, setPaymentMethods] = useState([]);
    const [selectedPaymentMethod, setSelectedPaymentMethod] = useState('');

    // Función auxiliar para obtener el token de autenticación
    const getAuthToken = () => {
        return localStorage.getItem('access_token');
    };

    // Función para obtener la lista de usuarios (vendedores) para el filtro
    const fetchSellers = useCallback(async () => {
        try {
            const token = getAuthToken();
            if (!token) {
                console.error("No hay token de autenticación para obtener vendedores.");
                return;
            }
            const response = await axios.get(`${API_BASE_URL}/users/`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            // Asume paginación o array directo, accede a .results si existe
            setSellers(response.data.results || response.data); 
        } catch (err) {
            console.error("Error fetching sellers:", err.response ? err.response.data : err.message);
        }
    }, [token]); // Depende del token

    // Función para obtener la lista de métodos de pago desde la API
    const fetchPaymentMethods = useCallback(async () => {
        try {
            const token = getAuthToken();
            if (!token) {
                console.error("No hay token de autenticación para obtener métodos de pago.");
                setPaymentMethods([{ value: '', label: 'Todos los Métodos de Pago' }]);
                return;
            }

            // *** CORRECCIÓN CLAVE AQUÍ: URL a /metodos-pago/ ***
            const response = await axios.get(`${API_BASE_URL}/metodos-pago/`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            
            setPaymentMethods([{ value: '', label: 'Todos los Métodos de Pago' }, ...response.data]);

        } catch (err) {
            console.error("Error fetching payment methods:", err.response ? err.response.data : err.message);
            // Fallback si hay un error al cargar desde la API
            setPaymentMethods([
                { value: '', label: 'Todos los Métodos de Pago' },
                { value: 'Efectivo', label: 'Efectivo' },
                { value: 'Transferencia', label: 'Transferencia' },
                { value: 'QR', label: 'QR' },
                { value: 'Tarjeta de débito', label: 'Tarjeta de débito' },
                { value: 'Tarjeta de crédito', label: 'Tarjeta de crédito' },
            ]);
        }
    }, [token]); // Depende del token

    // Función para obtener las métricas de ventas
    const fetchMetricas = useCallback(async () => {
        setLoadingMetrics(true);
        setError(null);
        try {
            const token = getAuthToken();
            if (!token) {
                setError("No hay token de autenticación. Por favor, inicia sesión.");
                setLoadingMetrics(false);
                return;
            }

            let url = `${API_BASE_URL}/metricas/metrics/`;
            const params = new URLSearchParams();
            if (yearFilter) params.append('year', yearFilter);
            if (monthFilter) params.append('month', monthFilter);
            if (dayFilter) params.append('day', dayFilter);
            // *** CORRECCIÓN CLAVE AQUÍ: Cambiado a 'seller_id' ***
            if (selectedSellerId) params.append('seller_id', selectedSellerId); 
            if (selectedPaymentMethod) params.append('payment_method', selectedPaymentMethod);

            if (params.toString()) {
                url += `?${params.toString()}`;
            }
            console.log("Fetching metrics from:", url);

            const response = await axios.get(url, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            setMetricas(response.data);
            console.log("Metrics fetched:", response.data);
        } catch (err) {
            console.error("Error fetching metrics:", err);
            if (err.response && err.response.status === 404) {
                setError("Endpoint de métricas no encontrado. Revisa la configuración del backend.");
            } else if (err.response && err.response.status === 403) {
                setError("No tienes permisos para ver estas métricas. Asegúrate de ser administrador.");
            } else if (err.response && err.response.data && err.response.data.detail) {
                setError(err.response.data.detail);
            } else {
                setError("Error al cargar las métricas. Intenta de nuevo.");
            }
        } finally {
            setLoadingMetrics(false);
        }
    }, [yearFilter, monthFilter, dayFilter, selectedSellerId, selectedPaymentMethod, token]); // Añadido token a las dependencias


    // useEffect para cargar vendedores, métodos de pago y métricas al inicio
    useEffect(() => {
        if (!loading && isAuthenticated && user?.is_superuser) {
            fetchSellers();
            fetchPaymentMethods();
            fetchMetricas();
        } else if (!loading && (!isAuthenticated || !user?.is_superuser)) {
            setError("Acceso denegado. No tienes permisos para ver estas métricas.");
            setLoadingMetrics(false);
        }
    }, [isAuthenticated, user, loading, fetchMetricas, fetchSellers, fetchPaymentMethods]);


    const handleFilterSubmit = (e) => {
        e.preventDefault();
        fetchMetricas();
    };

    const handleClearFilters = () => {
        setYearFilter('');
        setMonthFilter('');
        setDayFilter('');
        setSelectedSellerId('');
        setSelectedPaymentMethod('');
        // Después de limpiar, vuelve a cargar las métricas sin filtros
        // No es necesario llamar fetchMetricas aquí, ya que el cambio de estados de filtro
        // disparará el useEffect que llama a fetchMetricas.
    };

    // --- GENERADORES DE OPCIONES PARA SELECTS DE FECHA (Calendario-like) ---
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
            value: (i + 1).toString().padStart(2, '0'), // Formato MM
            label: new Date(0, i).toLocaleString('es-ES', { month: 'long' })
        }));
    };

    const getDaysInMonth = (year, month) => {
        if (!year || !month) return [];
        const numDays = new Date(parseInt(year), parseInt(month), 0).getDate();
        return Array.from({ length: numDays }, (_, i) => (i + 1).toString().padStart(2, '0')); // Formato DD
    };

    // --- PREPARACIÓN DE DATOS PARA GRÁFICOS ---

    // Gráfico de Tendencia de Ventas (Line Chart)
    const salesTrendData = {
        labels: metrics?.ventas_agrupadas_por_periodo?.data?.map(item => item.fecha) || [],
        datasets: [
            {
                label: `Total de Ventas por ${metrics?.ventas_agrupadas_por_periodo?.label || 'Periodo'}`,
                data: metrics?.ventas_agrupadas_por_periodo?.data?.map(item => item.total_monto) || [],
                borderColor: 'rgb(75, 192, 192)',
                backgroundColor: 'rgba(75, 192, 192, 0.5)',
                tension: 0.1,
                fill: false, // No rellenar el área bajo la línea
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


    const productsSoldChartData = metricas && metricas.productos_mas_vendidos ? {
        labels: metricas.productos_mas_vendidos.map(item => item.producto__nombre),
        datasets: [
            {
                label: 'Cantidad Vendida (Unidades)',
                data: metricas.productos_mas_vendidos.map(item => item.cantidad_total),
                backgroundColor: 'rgba(255, 99, 132, 0.5)',
                borderColor: 'rgb(255, 99, 132)',
                borderWidth: 1,
            },
            {
                label: 'Monto Total Vendido',
                data: metricas.productos_mas_vendidos.map(item => item.monto_total),
                backgroundColor: 'rgba(53, 162, 235, 0.5)',
                borderColor: 'rgb(53, 162, 235)',
                borderWidth: 1,
            },
        ],
    } : null;

    const productsSoldChartOptions = {
        indexAxis: 'y', // Hace el gráfico de barras horizontal
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

    const salesByUserChartData = metricas && metricas.ventas_por_usuario ? {
        labels: metricas.ventas_por_usuario.map(item => item.usuario__username),
        datasets: [
            {
                label: 'Monto Vendido',
                data: metricas.ventas_por_usuario.map(item => item.monto_total_vendido),
                backgroundColor: 'rgba(75, 192, 192, 0.7)',
                borderColor: 'rgb(75, 192, 192)',
                borderWidth: 1,
            },
            {
                label: 'Cantidad de Ventas',
                data: metricas.ventas_por_usuario.map(item => item.cantidad_ventas),
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

    // --- GRÁFICO: VENTAS POR MÉTODO DE PAGO (Pie Chart) ---
    const salesByPaymentMethodChartData = metricas && metricas.ventas_por_metodo_pago ? {
        labels: metricas.ventas_por_metodo_pago.map(item => item.metodo_pago),
        datasets: [
            {
                label: 'Monto Total Vendido',
                data: metricas.ventas_por_metodo_pago.map(item => item.monto_total),
                backgroundColor: [
                    'rgba(255, 159, 64, 0.7)',  // Naranja
                    'rgba(54, 162, 235, 0.7)',  // Azul
                    'rgba(255, 206, 86, 0.7)',  // Amarillo
                    'rgba(75, 192, 192, 0.7)',  // Verde azulado
                    'rgba(153, 102, 255, 0.7)', // Púrpura
                    'rgba(255, 99, 132, 0.7)',  // Rojo
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


    if (loading || (isAuthenticated && !user)) {
        return <div style={styles.loadingMessage}>Cargando datos de usuario...</div>;
    }

    if (!isAuthenticated || !user.is_superuser) {
        return <div style={styles.accessDeniedMessage}>Acceso denegado. No tienes permisos de administrador.</div>;
    }

    return (
        <div style={styles.container}>
            <h1 style={styles.header}>Métricas de Ventas</h1>

            <form onSubmit={handleFilterSubmit} style={styles.formContainer}>
                <h3 style={styles.subHeader}>Filtros</h3>
                <div style={styles.filterGroup}>
                    {/* --- SELECT PARA AÑO --- */}
                    <select
                        value={yearFilter}
                        onChange={(e) => {
                            setYearFilter(e.target.value);
                            setMonthFilter('');
                            setDayFilter('');
                        }}
                        style={styles.input}
                    >
                        <option value="">Seleccionar Año</option>
                        {getYears().map(year => (
                            <option key={year} value={year}>{year}</option>
                        ))}
                    </select>

                    {/* --- SELECT PARA MES --- */}
                    <select
                        value={monthFilter}
                        onChange={(e) => {
                            setMonthFilter(e.target.value);
                            setDayFilter('');
                        }}
                        style={styles.input}
                        disabled={!yearFilter}
                    >
                        <option value="">Seleccionar Mes</option>
                        {getMonths().map(month => (
                            <option key={month.value} value={month.value}>
                                {month.label}
                            </option>
                        ))}
                    </select>

                    {/* --- SELECT PARA DÍA --- */}
                    <select
                        value={dayFilter}
                        onChange={(e) => setDayFilter(e.target.value)}
                        style={styles.input}
                        disabled={!yearFilter || !monthFilter}
                    >
                        <option value="">Seleccionar Día</option>
                        {getDaysInMonth(yearFilter, monthFilter).map(day => (
                            <option key={day} value={day}>{day}</option>
                        ))}
                    </select>

                    {/* --- SELECT PARA VENDEDOR --- */}
                    <select
                        value={selectedSellerId}
                        onChange={(e) => setSelectedSellerId(e.target.value)}
                        style={styles.input}
                    >
                        <option value="">Todos los Vendedores</option>
                        {sellers.map(seller => (
                            <option key={seller.id} value={seller.id}>
                                {seller.username} ({seller.first_name} {seller.last_name})
                            </option>
                        ))}
                    </select>

                    {/* --- SELECT PARA MÉTODO DE PAGO --- */}
                    <select
                        value={selectedPaymentMethod}
                        onChange={(e) => setSelectedPaymentMethod(e.target.value)}
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

            {loadingMetrics && <p style={styles.loadingMessage}>Cargando métricas...</p>}
            {error && <p style={styles.error}>{error}</p>}

            {/* Muestra el mensaje si no hay métricas después de cargar y no hay error */}
            {!loadingMetrics && !metricas && !error && <p style={styles.noDataMessage}>No hay datos de métricas disponibles para los filtros seleccionados.</p>}

            {metricas && (
                <div style={styles.metricasData}>
                    <h2>Resumen del Período</h2>
                    <div style={styles.summaryGrid}>
                        <div style={styles.summaryItem}>
                            <h3>Total de Ventas</h3>
                            <p style={styles.summaryValue}>${metricas.total_ventas_periodo ? metricas.total_ventas_periodo.toFixed(2) : '0.00'}</p>
                        </div>
                        <div style={styles.summaryItem}>
                            <h3>Productos Vendidos (Unidades)</h3>
                            <p style={styles.summaryValue}>{metricas.total_productos_vendidos_periodo || 0}</p>
                        </div>
                    </div>

                    {/* ACLARACIÓN PARA LOS GRÁFICOS */}
                    <p style={styles.chartExplanation}>
                        A continuación, se muestran los gráficos de métricas. Puedes hacer clic en las leyendas de los gráficos para activar o desactivar la visualización de datos específicos.
                    </p>

                    {/* Gráfico de Tendencia de Ventas (Line Chart) */}
                    {salesTrendData && salesTrendData.labels.length > 0 ? (
                        <div style={styles.chartContainer}>
                            <Line data={salesTrendData} options={salesTrendOptions} />
                        </div>
                    ) : (
                        <p style={styles.noDataMessage}>No hay datos de tendencia de ventas para el período seleccionado.</p>
                    )}

                    {/* Gráfico de Top Productos Más Vendidos (Bar Chart) */}
                    {productsSoldChartData && productsSoldChartData.labels.length > 0 ? (
                        <div style={styles.chartContainer}>
                            <Bar data={productsSoldChartData} options={productsSoldChartOptions} />
                        </div>
                    ) : (
                        <p style={styles.noDataMessage}>No hay datos de productos vendidos para el período seleccionado.</p>
                    )}

                    {/* Gráfico de Ventas por Vendedor (Bar Chart) */}
                    {salesByUserChartData && salesByUserChartData.labels.length > 0 ? (
                        <div style={styles.chartContainer}>
                            <Bar data={salesByUserChartData} options={salesByUserChartOptions} />
                        </div>
                    ) : (
                        <p style={styles.noDataMessage}>No hay datos de ventas por usuario para el período seleccionado.</p>
                    )}

                    {/* GRÁFICO: VENTAS POR MÉTODO DE PAGO (Pie Chart) */}
                    {metricas.ventas_por_metodo_pago && metricas.ventas_por_metodo_pago.length > 0 ? (
                        <div style={styles.chartContainer}>
                            <Pie data={salesByPaymentMethodChartData} options={salesByPaymentMethodChartOptions} />
                        </div>
                    ) : (
                        <p style={styles.noDataMessage}>No hay datos de ventas por método de pago para el período seleccionado.</p>
                    )}


                    {/* Tablas detalladas */}
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
                            {metricas.ventas_por_usuario && metricas.ventas_por_usuario.length > 0 ? (
                                metricas.ventas_por_usuario.map((item, index) => (
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
                            {metricas.productos_mas_vendidos && metricas.productos_mas_vendidos.length > 0 ? (
                                metricas.productos_mas_vendidos.map((item, index) => (
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

                    {/* TABLA: VENTAS POR MÉTODO DE PAGO */}
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
                            {metricas.ventas_por_metodo_pago && metricas.ventas_por_metodo_pago.length > 0 ? (
                                metricas.ventas_por_metodo_pago.map((item, index) => (
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
        height: '400px', // Altura fija para los gráficos
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
