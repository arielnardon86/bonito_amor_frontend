// src/components/MetricasVentas.js
import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { useAuth } from '../AuthContext';
import { Line, Bar } from 'react-chartjs-2';
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
    const { user, token, isAuthenticated, loading: authLoading } = useAuth();

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
        if (!token) return;
        try {
            const response = await axios.get(`${API_BASE_URL}/users/`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            // Filtra solo usuarios que son staff o superuser si es necesario, o todos
            setSellers(response.data.results || response.data); // Asume paginación o array directo
        } catch (err) {
            console.error("Error fetching sellers:", err.response ? err.response.data : err.message);
        }
    }, [token]);

    // Función para obtener la lista de métodos de pago
    const fetchPaymentMethods = useCallback(async () => {
        if (!token) return;
        try {
            // *** CORRECCIÓN CLAVE AQUÍ: Cambiado a /api/metodos-pago/ ***
            const response = await axios.get(`${API_BASE_URL}/metodos-pago/`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            setPaymentMethods(response.data);
        } catch (err) {
            console.error("Error fetching payment methods:", err.response ? err.response.data : err.message);
            setError("Error fetching payment methods: " + (err.response ? err.response.data : err.message));
        }
    }, [token]);

    // Función para obtener las métricas de ventas
    const fetchMetrics = useCallback(async () => {
        if (!token) {
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
    }, [token, filterYear, filterMonth, filterDay, filterSellerId, filterPaymentMethod]);

    // useEffect para cargar vendedores, métodos de pago y métricas al inicio
    useEffect(() => {
        if (!authLoading && isAuthenticated) {
            fetchSellers();
            fetchPaymentMethods();
            fetchMetrics();
        } else if (!authLoading && !isAuthenticated) {
            setLoading(false);
        }
    }, [authLoading, isAuthenticated, fetchSellers, fetchPaymentMethods, fetchMetrics]);

    const handleApplyFilters = () => {
        fetchMetrics(); // Vuelve a cargar las métricas con los filtros aplicados
    };

    // --- Preparación de datos para gráficos ---
    const salesTrendData = {
        labels: metrics?.ventas_agrupadas_por_periodo?.data?.map(item => item.fecha) || [],
        datasets: [
            {
                label: `Total de Ventas por ${metrics?.ventas_agrupadas_por_periodo?.label || 'Periodo'}`,
                data: metrics?.ventas_agrupadas_por_periodo?.data?.map(item => item.total_monto) || [],
                borderColor: 'rgb(75, 192, 192)',
                backgroundColor: 'rgba(75, 192, 192, 0.5)',
                tension: 0.1,
            },
        ],
    };

    const topProductsData = {
        labels: metrics?.productos_mas_vendidos?.map(item => item.producto__nombre) || [],
        datasets: [
            {
                label: 'Cantidad Vendida',
                data: metrics?.productos_mas_vendidos?.map(item => item.cantidad_total) || [],
                backgroundColor: 'rgba(153, 102, 255, 0.6)',
                borderColor: 'rgba(153, 102, 255, 1)',
                borderWidth: 1,
            },
            {
                label: 'Monto Total Vendido',
                data: metrics?.productos_mas_vendidos?.map(item => item.monto_total) || [],
                backgroundColor: 'rgba(255, 159, 64, 0.6)',
                borderColor: 'rgba(255, 159, 64, 1)',
                borderWidth: 1,
                yAxisID: 'y1', // Eje Y secundario para el monto
            },
        ],
    };

    const topProductsOptions = {
        responsive: true,
        plugins: {
            legend: {
                position: 'top',
            },
            title: {
                display: true,
                text: 'Top 10 Productos Más Vendidos',
            },
        },
        scales: {
            y: {
                beginAtZero: true,
                title: {
                    display: true,
                    text: 'Cantidad Vendida',
                },
            },
            y1: { // Eje Y secundario
                type: 'linear',
                position: 'right',
                beginAtZero: true,
                grid: {
                    drawOnChartArea: false, // No dibujar líneas de cuadrícula para este eje
                },
                title: {
                    display: true,
                    text: 'Monto Total Vendido ($)',
                },
            },
        },
    };

    const salesByUserChartData = {
        labels: metrics?.ventas_por_usuario?.map(item => item.usuario__username) || [],
        datasets: [
            {
                label: 'Monto Total Vendido',
                data: metrics?.ventas_por_usuario?.map(item => item.monto_total_vendido) || [],
                backgroundColor: 'rgba(255, 99, 132, 0.6)',
                borderColor: 'rgba(255, 99, 132, 1)',
                borderWidth: 1,
            },
            {
                label: 'Cantidad de Ventas',
                data: metrics?.ventas_por_usuario?.map(item => item.cantidad_ventas) || [],
                backgroundColor: 'rgba(53, 162, 235, 0.6)',
                borderColor: 'rgba(53, 162, 235, 1)',
                borderWidth: 1,
                yAxisID: 'y1',
            },
        ],
    };

    const salesByUserChartOptions = {
        responsive: true,
        plugins: {
            legend: {
                position: 'top',
            },
            title: {
                display: true,
                text: 'Ventas por Vendedor',
            },
        },
        scales: {
            y: {
                beginAtZero: true,
                title: {
                    display: true,
                    text: 'Monto Total Vendido ($)',
                },
            },
            y1: {
                type: 'linear',
                position: 'right',
                beginAtZero: true,
                grid: {
                    drawOnChartArea: false,
                },
                title: {
                    display: true,
                    text: 'Cantidad de Ventas',
                },
            },
        },
    };

    const salesByPaymentMethodData = {
        labels: metrics?.ventas_por_metodo_pago?.map(item => item.metodo_pago) || [],
        datasets: [
            {
                label: 'Monto Total',
                data: metrics?.ventas_por_metodo_pago?.map(item => item.monto_total) || [],
                backgroundColor: [
                    'rgba(255, 206, 86, 0.6)',
                    'rgba(54, 162, 235, 0.6)',
                    'rgba(75, 192, 192, 0.6)',
                    'rgba(153, 102, 255, 0.6)',
                    'rgba(255, 99, 132, 0.6)',
                ],
                borderColor: [
                    'rgba(255, 206, 86, 1)',
                    'rgba(54, 162, 235, 1)',
                    'rgba(75, 192, 192, 1)',
                    'rgba(153, 102, 255, 1)',
                    'rgba(255, 99, 132, 1)',
                ],
                borderWidth: 1,
            },
        ],
    };

    const salesByPaymentMethodOptions = {
        responsive: true,
        plugins: {
            legend: {
                position: 'top',
            },
            title: {
                display: true,
                text: 'Ventas por Método de Pago',
            },
        },
    };

    // --- Lógica de renderizado condicional basada en el estado de autenticación y permisos ---
    if (authLoading) {
        return <p style={{ textAlign: 'center', marginTop: '50px' }}>Cargando información de usuario...</p>;
    }

    if (!isAuthenticated) {
        return <p>Por favor, inicia sesión para ver las métricas.</p>;
    }

    // Solo permite el acceso a superusuarios para las métricas
    if (!user || !user.is_superuser) {
        return <p>No tienes permiso para ver las métricas de ventas.</p>;
    }

    return (
        <div style={{ padding: '20px', fontFamily: 'Arial, sans-serif', maxWidth: '1200px', margin: 'auto' }}>
            <h1>Métricas de Ventas</h1>

            {/* Controles de Filtro */}
            <div style={{ marginBottom: '20px', border: '1px solid #ccc', padding: '15px', borderRadius: '8px' }}>
                <h3>Filtros de Métricas</h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '15px', marginBottom: '15px' }}>
                    <div>
                        <label htmlFor="filterYear">Año:</label>
                        <input
                            type="number"
                            id="filterYear"
                            value={filterYear}
                            onChange={(e) => setFilterYear(e.target.value)}
                            placeholder="Ej: 2024"
                            style={{ width: '100%', padding: '8px' }}
                        />
                    </div>
                    <div>
                        <label htmlFor="filterMonth">Mes:</label>
                        <input
                            type="number"
                            id="filterMonth"
                            value={filterMonth}
                            onChange={(e) => setFilterMonth(e.target.value)}
                            placeholder="Ej: 7"
                            min="1"
                            max="12"
                            style={{ width: '100%', padding: '8px' }}
                        />
                    </div>
                    <div>
                        <label htmlFor="filterDay">Día:</label>
                        <input
                            type="number"
                            id="filterDay"
                            value={filterDay}
                            onChange={(e) => setFilterDay(e.target.value)}
                            placeholder="Ej: 12"
                            min="1"
                            max="31"
                            style={{ width: '100%', padding: '8px' }}
                        />
                    </div>
                    <div>
                        <label htmlFor="filterSellerId">Vendedor:</label>
                        <select
                            id="filterSellerId"
                            value={filterSellerId}
                            onChange={(e) => setFilterSellerId(e.target.value)}
                            style={{ width: '100%', padding: '8px' }}
                        >
                            <option value="">Todos</option>
                            {sellers.map(seller => (
                                <option key={seller.id} value={seller.id}>{seller.username}</option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label htmlFor="filterPaymentMethod">Método de Pago:</label>
                        <select
                            id="filterPaymentMethod"
                            value={filterPaymentMethod}
                            onChange={(e) => setFilterPaymentMethod(e.target.value)}
                            style={{ width: '100%', padding: '8px' }}
                        >
                            <option value="">Todos</option>
                            {paymentMethods.map(method => (
                                <option key={method.value} value={method.value}>{method.label}</option>
                            ))}
                        </select>
                    </div>
                </div>
                <button onClick={handleApplyFilters} style={{ padding: '10px 20px', backgroundColor: '#007bff', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer' }}>
                    Aplicar Filtros
                </button>
            </div>

            {loading && <p>Cargando métricas...</p>}
            {error && <p style={{ color: 'red' }}>{error}</p>}

            {!loading && !metrics && !error && <p>No hay datos de métricas disponibles para los filtros seleccionados.</p>}

            {!loading && metrics && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '20px', marginTop: '20px' }}>
                    {/* Tarjetas de Resumen */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '20px' }}>
                        <div style={{ border: '1px solid #ddd', padding: '15px', borderRadius: '8px', backgroundColor: '#e6f7ff', textAlign: 'center' }}>
                            <h3>Total Ventas (Período)</h3>
                            <p style={{ fontSize: '2em', fontWeight: 'bold', color: '#007bff' }}>${parseFloat(metrics.total_ventas_periodo).toFixed(2)}</p>
                        </div>
                        <div style={{ border: '1px solid #ddd', padding: '15px', borderRadius: '8px', backgroundColor: '#e6ffee', textAlign: 'center' }}>
                            <h3>Total Productos Vendidos (Período)</h3>
                            <p style={{ fontSize: '2em', fontWeight: 'bold', color: '#28a745' }}>{metrics.total_productos_vendidos_periodo}</p>
                        </div>
                    </div>

                    {/* Gráfico de Tendencia de Ventas */}
                    <div style={{ border: '1px solid #ddd', padding: '15px', borderRadius: '8px', backgroundColor: '#fff' }}>
                        <Line data={salesTrendData} options={{ responsive: true, plugins: { title: { display: true, text: `Tendencia de Ventas por ${metrics?.ventas_agrupadas_por_periodo?.label || 'Periodo'}` } } }} />
                    </div>

                    {/* Gráfico de Top Productos Más Vendidos */}
                    <div style={{ border: '1px solid #ddd', padding: '15px', borderRadius: '8px', backgroundColor: '#fff' }}>
                        <Bar data={topProductsData} options={topProductsOptions} />
                    </div>

                    {/* Gráfico de Ventas por Vendedor */}
                    <div style={{ border: '1px solid #ddd', padding: '15px', borderRadius: '8px', backgroundColor: '#fff' }}>
                        <Bar data={salesByUserChartData} options={salesByUserChartOptions} />
                    </div>

                    {/* Gráfico de Ventas por Método de Pago */}
                    <div style={{ border: '1px solid #ddd', padding: '15px', borderRadius: '8px', backgroundColor: '#fff' }}>
                        <Bar data={salesByPaymentMethodData} options={salesByPaymentMethodOptions} />
                    </div>
                </div>
            )}
        </div>
    );
};

export default MetricasVentas;
