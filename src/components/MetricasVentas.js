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

// Opciones comunes para gráficos para mantener la consistencia
const commonChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
        legend: {
            position: 'top',
            labels: {
                font: {
                    size: 14,
                    family: 'Inter, sans-serif',
                },
                color: '#333',
            }
        },
        tooltip: {
            callbacks: {
                label: function(context) {
                    let label = context.dataset.label || '';
                    if (label) {
                        label += ': ';
                    }
                    if (context.parsed.y !== null) {
                        label += new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).format(context.parsed.y);
                    }
                    return label;
                }
            },
            bodyFont: {
                family: 'Inter, sans-serif',
            },
            titleFont: {
                family: 'Inter, sans-serif',
            },
        }
    },
    scales: {
        x: {
            ticks: {
                font: {
                    family: 'Inter, sans-serif',
                },
                color: '#555',
            },
            grid: {
                display: false,
            }
        },
        y: {
            ticks: {
                callback: function(value) {
                    return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).format(value);
                },
                font: {
                    family: 'Inter, sans-serif',
                },
                color: '#555',
            },
            grid: {
                color: '#e0e0e0',
            }
        }
    }
};

const MetricasVentas = () => {
    const { user, token, isAuthenticated, loading: authLoading, selectedStoreSlug, stores } = useAuth();
    const [metrics, setMetrics] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // Filtros
    const today = new Date();
    const currentYear = today.getFullYear();
    const currentMonth = (today.getMonth() + 1).toString().padStart(2, '0');
    const currentDay = today.getDate().toString().padStart(2, '0');

    const [filterYear, setFilterYear] = useState(currentYear.toString());
    const [filterMonth, setFilterMonth] = useState(''); // Vacío para todos los meses
    const [filterDay, setFilterDay] = useState('');     // Vacío para todos los días
    const [filterSellerId, setFilterSellerId] = useState('');
    const [filterPaymentMethod, setFilterPaymentMethod] = useState('');

    const [sellers, setSellers] = useState([]);
    const [paymentMethods, setPaymentMethods] = useState([]);


    const fetchMetrics = useCallback(async () => {
        if (!token || !selectedStoreSlug || !stores.length) {
            setLoading(false);
            return;
        }

        const store = stores.find(s => s.nombre === selectedStoreSlug);
        if (!store) {
            console.warn("MetricasVentas: No se encontró la tienda con el slug:", selectedStoreSlug);
            setLoading(false);
            setError("No se pudo cargar la tienda seleccionada.");
            return;
        }
        const storeSlug = store.nombre; // Enviar el nombre de la tienda (slug)

        setLoading(true);
        setError(null);
        try {
            const params = {
                tienda_slug: storeSlug,
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
    }, [token, selectedStoreSlug, stores, filterYear, filterMonth, filterDay, filterSellerId, filterPaymentMethod]);

    const fetchSellers = useCallback(async () => {
        if (!token || !selectedStoreSlug || !stores.length) return; 

        const store = stores.find(s => s.nombre === selectedStoreSlug);
        if (!store) {
            setSellers([]);
            return;
        }
        const storeId = store.id;

        try {
            const response = await axios.get(`${BASE_API_ENDPOINT}/api/users/`, {
                headers: { 'Authorization': `Bearer ${token}` },
                params: { tienda: storeId } 
            });
            setSellers(response.data.results || response.data);
        } catch (err) {
            console.error('Error fetching sellers:', err.response ? err.response.data : err.message);
        }
    }, [token, selectedStoreSlug, stores]); 

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
            fetchSellers();
            fetchPaymentMethods();
        } else if (!authLoading && (!isAuthenticated || !user || !user.is_superuser)) {
            setError("Acceso denegado. Solo los superusuarios pueden ver las métricas.");
            setLoading(false);
        } else if (!authLoading && isAuthenticated && user && user.is_superuser && !selectedStoreSlug) {
            setLoading(false);
        }
    }, [isAuthenticated, user, authLoading, selectedStoreSlug, fetchMetrics, fetchSellers, fetchPaymentMethods]);

    const handleApplyFilters = () => {
        fetchMetrics();
    };

    const handleClearFilters = () => {
        setFilterYear(currentYear.toString());
        setFilterMonth('');
        setFilterDay('');
        setFilterSellerId('');
        setFilterPaymentMethod('');
        setTimeout(() => { // Usar timeout para asegurar la actualización del estado antes de volver a buscar
            fetchMetrics();
        }, 0);
    };

    // Data para el gráfico de Ventas Agrupadas por Período
    const ventasAgrupadasData = {
        labels: metrics?.ventas_agrupadas_por_periodo?.data.map(item => item.periodo) || [],
        datasets: [
            {
                label: 'Total Ventas',
                data: metrics?.ventas_agrupadas_por_periodo?.data.map(item => parseFloat(item.total_ventas)) || [],
                backgroundColor: 'rgba(75, 192, 192, 0.6)',
                borderColor: 'rgba(75, 192, 192, 1)',
                borderWidth: 1,
            },
        ],
    };

    // Data para el gráfico de Productos Más Vendidos
    const productosMasVendidosData = {
        labels: metrics?.productos_mas_vendidos.map(item => item.producto_nombre) || [],
        datasets: [
            {
                label: 'Cantidad Vendida',
                data: metrics?.productos_mas_vendidos.map(item => item.cantidad_total) || [],
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

    // Data para el gráfico de Ventas por Método de Pago
    const ventasPorMetodoPagoData = {
        labels: metrics?.ventas_por_metodo_pago.map(item => item.metodo_pago) || [],
        datasets: [
            {
                label: 'Monto Total',
                data: metrics?.ventas_por_metodo_pago.map(item => parseFloat(item.monto_total)) || [],
                backgroundColor: [
                    'rgba(255, 159, 64, 0.6)',
                    'rgba(192, 192, 75, 0.6)',
                    'rgba(86, 206, 255, 0.6)',
                    'rgba(132, 75, 192, 0.6)',
                ],
                borderColor: [
                    'rgba(255, 159, 64, 1)',
                    'rgba(192, 192, 75, 1)',
                    'rgba(86, 206, 255, 1)',
                    'rgba(132, 75, 192, 1)',
                ],
                borderWidth: 1,
            },
        ],
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

            {/* Sección de Filtros */}
            <div style={styles.filtersContainer}>
                <div style={styles.filterGroup}>
                    <label style={styles.filterLabel}>Año:</label>
                    <input
                        type="number"
                        value={filterYear}
                        onChange={(e) => setFilterYear(e.target.value)}
                        style={styles.filterInput}
                        min="2000" // Ajustar según sea necesario
                        max={new Date().getFullYear()}
                    />
                </div>
                <div style={styles.filterGroup}>
                    <label style={styles.filterLabel}>Mes:</label>
                    <select
                        value={filterMonth}
                        onChange={(e) => setFilterMonth(e.target.value)}
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
                        value={filterDay}
                        onChange={(e) => setFilterDay(e.target.value)}
                        style={styles.filterInput}
                        min="1"
                        max="31"
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
                            <option key={seller.id} value={seller.id}>{seller.username}</option>
                        ))}
                    </select>
                </div>
                <div style={styles.filterGroup}>
                    <label style={styles.filterLabel}>Método de Pago:</label>
                    <select
                        value={filterPaymentMethod}
                        onChange={(e) => setFilterPaymentMethod(e.target.value)}
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

            {/* Mensaje de explicación */}
            <div style={styles.chartExplanation}>
                <p>Aquí puedes visualizar las métricas clave de tu tienda. Utiliza los filtros para analizar datos por año, mes, día, vendedor o método de pago.</p>
                <p>La **Rentabilidad Bruta** se calcula como el Total de Ventas menos el Total de Compras registradas en el período seleccionado. El **Margen de Rentabilidad** es la Rentabilidad Bruta como porcentaje del Total de Ventas.</p>
            </div>

            {/* Tarjetas de Métricas Clave */}
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
                    <h3 style={styles.cardTitle}>Total Compras</h3> {/* NUEVA TARJETA */}
                    <p style={styles.cardValue}>${parseFloat(metrics?.total_compras_periodo || 0).toFixed(2)}</p>
                </div>
                <div style={styles.card}>
                    <h3 style={styles.cardTitle}>Rentabilidad Bruta</h3> {/* NUEVA TARJETA */}
                    <p style={styles.cardValue}>${parseFloat(metrics?.rentabilidad_bruta_periodo || 0).toFixed(2)}</p>
                </div>
                <div style={styles.card}>
                    <h3 style={styles.cardTitle}>Margen de Rentabilidad</h3> {/* NUEVA TARJETA */}
                    <p style={styles.cardValue}>{parseFloat(metrics?.margen_rentabilidad_periodo || 0).toFixed(2)}%</p>
                </div>
            </div>

            <div style={styles.chartsContainer}>
                {/* Gráfico de Ventas Agrupadas por Período */}
                <div style={styles.chartCard}>
                    <h3 style={styles.chartTitle}>Ventas Agrupadas por {metrics?.ventas_agrupadas_por_periodo?.label || 'Período'}</h3>
                    {ventasAgrupadasData.labels.length > 0 ? (
                        <Line data={ventasAgrupadasData} options={commonChartOptions} />
                    ) : (
                        <div style={styles.chartNoData}>No hay datos de ventas para este período.</div>
                    )}
                </div>

                {/* Gráfico de Productos Más Vendidos */}
                <div style={styles.chartCard}>
                    <h3 style={styles.chartTitle}>Top 5 Productos Más Vendidos</h3>
                    {productosMasVendidosData.labels.length > 0 ? (
                        <Bar data={productosMasVendidosData} options={commonChartOptions} />
                    ) : (
                        <div style={styles.chartNoData}>No hay datos de productos vendidos.</div>
                    )}
                </div>

                {/* Gráfico de Ventas por Usuario */}
                <div style={styles.chartCard}>
                    <h3 style={styles.chartTitle}>Ventas por Vendedor</h3>
                    {metrics?.ventas_por_usuario.length > 0 ? (
                        <Pie
                            data={{
                                labels: metrics.ventas_por_usuario.map(u => `${u.usuario__username} ($${parseFloat(u.monto_total_vendido).toFixed(2)})`),
                                datasets: [{
                                    data: metrics.ventas_por_usuario.map(u => parseFloat(u.monto_total_vendido)),
                                    backgroundColor: [
                                        '#4CAF50', '#2196F3', '#FFC107', '#E91E63', '#9C27B0',
                                        '#00BCD4', '#FF5722', '#607D8B', '#795548', '#CDDC39'
                                    ],
                                    hoverOffset: 4
                                }]
                            }}
                            options={{
                                responsive: true,
                                maintainAspectRatio: false,
                                plugins: {
                                    legend: {
                                        position: 'right',
                                        labels: {
                                            font: {
                                                size: 14,
                                                family: 'Inter, sans-serif',
                                            },
                                            color: '#333',
                                        }
                                    },
                                    tooltip: {
                                        callbacks: {
                                            label: function(context) {
                                                let label = context.label || '';
                                                if (label) {
                                                    label += ': ';
                                                }
                                                if (context.parsed !== null) {
                                                    label += new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).format(context.parsed);
                                                }
                                                return label;
                                            }
                                        },
                                        bodyFont: {
                                            family: 'Inter, sans-serif',
                                        },
                                        titleFont: {
                                            family: 'Inter, sans-serif',
                                        },
                                    }
                                }
                            }}
                        />
                    ) : (
                        <div style={styles.chartNoData}>No hay datos de ventas por vendedor.</div>
                    )}
                </div>

                {/* Gráfico de Ventas por Método de Pago */}
                <div style={styles.chartCard}>
                    <h3 style={styles.chartTitle}>Ventas por Método de Pago</h3>
                    {ventasPorMetodoPagoData.labels.length > 0 ? (
                        <Pie
                            data={ventasPorMetodoPagoData}
                            options={{
                                responsive: true,
                                maintainAspectRatio: false,
                                plugins: {
                                    legend: {
                                        position: 'right',
                                        labels: {
                                            font: {
                                                size: 14,
                                                family: 'Inter, sans-serif',
                                            },
                                            color: '#333',
                                        }
                                    },
                                    tooltip: {
                                        callbacks: {
                                            label: function(context) {
                                                let label = context.label || '';
                                                if (label) {
                                                    label += ': ';
                                                }
                                                if (context.parsed !== null) {
                                                    label += new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).format(context.parsed);
                                                }
                                                return label;
                                            }
                                        },
                                        bodyFont: {
                                            family: 'Inter, sans-serif',
                                        },
                                        titleFont: {
                                            family: 'Inter, sans-serif',
                                        },
                                    }
                                }
                            }}
                        />
                    ) : (
                        <div style={styles.chartNoData}>No hay datos de ventas por método de pago.</div>
                    )}
                </div>
            </div>

            {/* Tablas de Detalles */}
            <div style={styles.tablesContainer}>
                {/* Tabla de Ventas por Usuario */}
                <div style={styles.tableContainer}>
                    <h3 style={styles.tableTitle}>Ventas por Vendedor</h3>
                    {metrics?.ventas_por_usuario.length > 0 ? (
                        <table style={styles.table}>
                            <thead>
                                <tr>
                                    <th style={styles.th}>Vendedor</th>
                                    <th style={styles.th}>Monto Vendido</th>
                                    <th style={styles.th}># Ventas</th>
                                </tr>
                            </thead>
                            <tbody>
                                {metrics.ventas_por_usuario.map((userMetric, index) => (
                                    <tr key={index}>
                                        <td style={styles.td}>{userMetric.usuario__username}</td>
                                        <td style={styles.td}>${parseFloat(userMetric.monto_total_vendido).toFixed(2)}</td>
                                        <td style={styles.td}>{userMetric.cantidad_ventas}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    ) : (
                        <p style={styles.noDataMessage}>No hay datos de ventas por vendedor.</p>
                    )}
                </div>

                {/* Tabla de Ventas por Método de Pago */}
                <div style={styles.tableContainer}>
                    <h3 style={styles.tableTitle}>Ventas por Método de Pago</h3>
                    {metrics?.ventas_por_metodo_pago.length > 0 ? (
                        <table style={styles.table}>
                            <thead>
                                <tr>
                                    <th style={styles.th}>Método de Pago</th>
                                    <th style={styles.th}>Monto Total</th>
                                    <th style={styles.th}># Ventas</th>
                                </tr>
                            </thead>
                            <tbody>
                                {metrics.ventas_por_metodo_pago.map((paymentMetric, index) => (
                                    <tr key={index}>
                                        <td style={styles.td}>{paymentMetric.metodo_pago || 'N/A'}</td>
                                        <td style={styles.td}>${parseFloat(paymentMetric.monto_total).toFixed(2)}</td>
                                        <td style={styles.td}>{paymentMetric.cantidad_ventas}</td>
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
        margin: '20px auto',
        backgroundColor: '#f4f7f6',
        borderRadius: '10px',
        boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
        color: '#333',
    },
    loadingMessage: {
        padding: '50px',
        textAlign: 'center',
        fontSize: '1.2em',
        color: '#555',
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
        marginBottom: '10px',
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
        boxShadow: '0 2px 5px rgba(0,0,0,0.05)',
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
        fontSize: '0.95em',
    },
    filterInput: {
        padding: '10px',
        border: '1px solid #ced4da',
        borderRadius: '5px',
        fontSize: '1em',
        minWidth: '120px',
    },
    filterButton: {
        padding: '10px 15px',
        backgroundColor: '#007bff',
        color: 'white',
        border: 'none',
        borderRadius: '5px',
        cursor: 'pointer',
        fontSize: '1em',
        transition: 'background-color 0.3s ease',
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
        color: '#555',
        marginBottom: '10px',
    },
    cardValue: {
        fontSize: '1.8em',
        fontWeight: 'bold',
        color: '#2c3e50',
    },
    chartsContainer: {
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(450px, 1fr))',
        gap: '30px',
        marginBottom: '30px',
    },
    chartCard: {
        backgroundColor: '#ffffff',
        padding: '20px',
        borderRadius: '8px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
        minHeight: '400px', // Asegurar que los gráficos tengan suficiente espacio
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
    },
    chartTitle: {
        fontSize: '1.4em',
        color: '#34495e',
        marginBottom: '15px',
        textAlign: 'center',
    },
    chartNoData: {
        textAlign: 'center',
        color: '#777',
        fontStyle: 'italic',
        padding: '50px',
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
    tableTitle: {
        fontSize: '1.4em',
        color: '#34495e',
        marginBottom: '15px',
        textAlign: 'center',
    },
    table: {
        width: '100%',
        borderCollapse: 'collapse',
        marginTop: '15px',
    },
    th: {
        padding: '12px 8px',
        backgroundColor: '#e9ecef',
        textAlign: 'left',
        borderBottom: '1px solid #dee2e6',
        fontSize: '0.9em',
        color: '#495057',
    },
    td: {
        padding: '10px 8px',
        borderBottom: '1px solid #dee2e6',
        fontSize: '0.9em',
        color: '#343a40',
    },
    noDataMessage: {
        textAlign: 'center',
        color: '#777',
        fontStyle: 'italic',
        marginBottom: '20px',
        fontSize: '1em',
    },
};

export default MetricasVentas;
