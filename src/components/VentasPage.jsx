// src/components/VentasPage.jsx

import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { useAuth } from '../AuthContext';

const API_BASE_URL = process.env.REACT_APP_API_URL; 

const VentasPage = () => {
    const { user, token, isAuthenticated, loading: authLoading } = useAuth(); 
    
    const [ventas, setVentas] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // Estado para los filtros
    const [filterYear, setFilterYear] = useState('');
    const [filterMonth, setFilterMonth] = useState('');
    const [filterDay, setFilterDay] = useState('');
    const [filterSellerId, setFilterSellerId] = useState('');
    const [filterAnulada, setFilterAnulada] = useState(''); // '', 'true', 'false'

    // Estado para la paginación (si usas paginación de DRF)
    const [nextPageUrl, setNextPageUrl] = useState(null);
    const [prevPageUrl, setPrevPageUrl] = useState(null);
    const [currentPageNumber, setCurrentPageNumber] = useState(1);

    // NUEVO ESTADO: Para controlar qué venta está expandida
    const [expandedSaleId, setExpandedSaleId] = useState(null); // Almacena el ID de la venta expandida

    // Hacemos fetchVentas un useCallback para optimizar y usarlo en useEffect de forma segura
    const fetchVentas = useCallback(async (pageUrlOrNumber = 1) => {
        if (!token) {
            console.log("fetchVentas: No token available, skipping fetch.");
            setLoading(false);
            return;
        }

        setLoading(true);
        setError(null);
        try {
            let url = '';
            let params = {};

            if (typeof pageUrlOrNumber === 'string') {
                url = pageUrlOrNumber;
            } else {
                url = `${API_BASE_URL}/ventas/`;
                params = {
                    page: pageUrlOrNumber,
                    ...(filterYear && { year: filterYear }),
                    ...(filterMonth && { month: filterMonth }),
                    ...(filterDay && { day: filterDay }),
                    ...(filterSellerId && { usuario: filterSellerId }), // Usar 'usuario' como filtro para ID de vendedor
                    ...(filterAnulada !== '' && { anulada: filterAnulada }), // Incluir 'false'
                };
            }
            
            console.log("fetchVentas: API Call to:", url);
            console.log("fetchVentas: Params:", typeof pageUrlOrNumber === 'string' ? {} : params);

            const response = await axios.get(url, { 
                headers: {
                    'Authorization': `Bearer ${token}`,
                },
                params: typeof pageUrlOrNumber === 'string' ? {} : params,
            });

            console.log("fetchVentas: Raw response data:", response.data);

            if (response.data && Array.isArray(response.data.results)) {
                setVentas(response.data.results);
                setNextPageUrl(response.data.next);
                setPrevPageUrl(response.data.previous);
                if (typeof pageUrlOrNumber === 'number') {
                    setCurrentPageNumber(pageUrlOrNumber);
                } else {
                    const urlParams = new URLSearchParams(new URL(url).search); // Mejor forma de parsear URL
                    setCurrentPageNumber(parseInt(urlParams.get('page')) || 1);
                }
                console.log("fetchVentas: Data treated as paginated results.");
            } else if (Array.isArray(response.data)) {
                setVentas(response.data);
                setNextPageUrl(null);
                setPrevPageUrl(null);
                setCurrentPageNumber(1);
                console.log("fetchVentas: Data treated as direct array (no pagination detected).");
            } else {
                console.error("fetchVentas: Unexpected response data format:", response.data);
                setError('Formato de datos de ventas inesperado del servidor.');
                setVentas([]);
                setNextPageUrl(null);
                setPrevPageUrl(null);
                setCurrentPageNumber(1);
            }

        } catch (err) {
            console.error('Error al obtener ventas:', err.response ? err.response.data : err.message);
            setError('No se pudieron cargar las ventas. Verifica tu conexión o permisos.');
            setVentas([]);
            setNextPageUrl(null);
            setPrevPageUrl(null);
            setCurrentPageNumber(1);
        } finally {
            setLoading(false);
        }
    }, [token, filterYear, filterMonth, filterDay, filterSellerId, filterAnulada]);

    useEffect(() => {
        if (!authLoading && isAuthenticated) { 
            fetchVentas(1); 
        } else if (!authLoading && !isAuthenticated) {
            setLoading(false);
        }
    }, [token, isAuthenticated, authLoading, fetchVentas]);

    const handleApplyFilters = () => {
        fetchVentas(1);
        setExpandedSaleId(null); // Colapsar cualquier venta expandida al aplicar filtros
    };

    const handleAnularVenta = async (ventaId) => {
        if (!user || !user.is_superuser) {
            alert('No tienes permisos para anular ventas.');
            return;
        }

        if (window.confirm(`¿Estás seguro de que quieres anular la venta ${ventaId}? Esta acción revertirá el stock.`)) {
            try {
                console.log(`Anulando venta ${ventaId}.`);
                const response = await axios.patch(`${API_BASE_URL}/ventas/${ventaId}/anular/`, {}, { 
                    headers: {
                        'Authorization': `Bearer ${token}`,
                    },
                });
                console.log("Anular venta response:", response.data);
                alert(`Venta ${ventaId} anulada exitosamente.`);
                fetchVentas(currentPageNumber);
            } catch (err) {
                console.error('Error al anular venta:', err.response ? err.response.data : err.message);
                if (err.response && err.response.data && err.response.data.detail) {
                    alert(`Error al anular venta: ${err.response.data.detail}`);
                } else {
                    alert('Error al anular venta. Inténtalo de nuevo.');
                }
            }
        }
    };

    // NUEVA FUNCIÓN: Para expandir/colapsar detalles de la venta
    const handleToggleDetails = (ventaId) => {
        setExpandedSaleId(prevId => (prevId === ventaId ? null : ventaId));
    };

    // --- NUEVA LÓGICA DE CARGA INICIAL Y PERMISOS ---
    if (authLoading) {
        return <p style={{ textAlign: 'center', marginTop: '50px' }}>Cargando información de usuario...</p>;
    }

    if (!isAuthenticated) {
        return <p>Por favor, inicia sesión para ver las ventas.</p>;
    }

    if (!user || (!user.is_staff && !user.is_superuser)) {
        return <p>No tienes permiso para ver el listado de ventas.</p>;
    }

    return (
        <div style={{ padding: '20px' }}>
            <h1>Gestión de Ventas</h1>

            {/* Controles de Filtro */}
            <div style={{ marginBottom: '20px', border: '1px solid #ccc', padding: '15px', borderRadius: '8px' }}>
                <h3>Filtros de Búsqueda</h3>
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
                        <label htmlFor="filterSellerId">ID Vendedor:</label>
                        <input
                            type="number"
                            id="filterSellerId"
                            value={filterSellerId}
                            onChange={(e) => setFilterSellerId(e.target.value)}
                            placeholder="Ej: 1"
                            style={{ width: '100%', padding: '8px' }}
                        />
                    </div>
                    <div>
                        <label htmlFor="filterAnulada">Estado Anulación:</label>
                        <select
                            id="filterAnulada"
                            value={filterAnulada}
                            onChange={(e) => setFilterAnulada(e.target.value)}
                            style={{ width: '100%', padding: '8px' }}
                        >
                            <option value="">Todas</option>
                            <option value="false">Activas</option>
                            <option value="true">Anuladas</option>
                        </select>
                    </div>
                </div>
                <button onClick={handleApplyFilters} style={{ padding: '10px 20px', backgroundColor: '#007bff', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer' }}>
                    Aplicar Filtros
                </button>
            </div>

            {loading && <p>Cargando ventas...</p>} 
            {error && <p style={{ color: 'red' }}>{error}</p>}

            {!loading && ventas.length === 0 && !error && <p>No se encontraron ventas con los filtros aplicados.</p>}

            {!loading && ventas.length > 0 && (
                <>
                    <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '20px' }}>
                        <thead>
                            <tr style={{ backgroundColor: '#f2f2f2' }}>
                                <th style={{ border: '1px solid #ddd', padding: '8px', textAlign: 'left' }}>ID Venta</th>
                                <th style={{ border: '1px solid #ddd', padding: '8px', textAlign: 'left' }}>Fecha</th>
                                <th style={{ border: '1px solid #ddd', padding: '8px', textAlign: 'left' }}>Total</th>
                                <th style={{ border: '1px solid #ddd', padding: '8px', textAlign: 'left' }}>Vendedor</th>
                                <th style={{ border: '1px solid #ddd', padding: '8px', textAlign: 'left' }}>Método Pago</th> {/* Agregado */}
                                <th style={{ border: '1px solid #ddd', padding: '8px', textAlign: 'left' }}>Estado</th>
                                <th style={{ border: '1px solid #ddd', padding: '8px', textAlign: 'left' }}>Detalles</th> {/* Nueva columna */}
                                {user && user.is_superuser && (
                                    <th style={{ border: '1px solid #ddd', padding: '8px', textAlign: 'left' }}>Acciones</th>
                                )}
                            </tr>
                        </thead>
                        <tbody>
                            {ventas.map((venta) => (
                                <React.Fragment key={venta.id}>
                                    <tr style={{ backgroundColor: expandedSaleId === venta.id ? '#e0f7fa' : 'inherit' }}> {/* Resaltar fila expandida */}
                                        <td style={{ border: '1px solid #ddd', padding: '8px' }}>{venta.id}</td>
                                        <td style={{ border: '1px solid #ddd', padding: '8px' }}>{new Date(venta.fecha_venta).toLocaleString()}</td>
                                        <td style={{ border: '1px solid #ddd', padding: '8px' }}>${parseFloat(venta.total_venta).toFixed(2)}</td>
                                        <td style={{ border: '1px solid #ddd', padding: '8px' }}>{venta.usuario ? venta.usuario.username : 'N/A'}</td>
                                        <td style={{ border: '1px solid #ddd', padding: '8px' }}>{venta.metodo_pago || 'N/A'}</td> {/* Muestra método de pago */}
                                        <td style={{ border: '1px solid #ddd', padding: '8px' }}>
                                            <span style={{ color: venta.anulada ? 'red' : 'green', fontWeight: 'bold' }}>
                                                {venta.anulada ? 'ANULADA' : 'ACTIVA'}
                                            </span>
                                        </td>
                                        <td style={{ border: '1px solid #ddd', padding: '8px' }}>
                                            <button
                                                onClick={() => handleToggleDetails(venta.id)}
                                                style={{
                                                    backgroundColor: '#17a2b8', // Color para el botón de detalles
                                                    color: 'white',
                                                    border: 'none',
                                                    padding: '8px 12px',
                                                    borderRadius: '5px',
                                                    cursor: 'pointer'
                                                }}
                                            >
                                                {expandedSaleId === venta.id ? 'Ocultar' : 'Ver'} Detalles
                                            </button>
                                        </td>
                                        {user && user.is_superuser && ( 
                                            <td style={{ border: '1px solid #ddd', padding: '8px' }}>
                                                {!venta.anulada ? (
                                                    <button
                                                        onClick={() => handleAnularVenta(venta.id)}
                                                        style={{
                                                            backgroundColor: '#dc3545',
                                                            color: 'white',
                                                            border: 'none',
                                                            padding: '8px 12px',
                                                            borderRadius: '5px',
                                                            cursor: 'pointer'
                                                        }}
                                                    >
                                                        Anular
                                                    </button>
                                                ) : (
                                                    <button
                                                        disabled
                                                        style={{
                                                            backgroundColor: '#6c757d',
                                                            color: 'white',
                                                            border: 'none',
                                                            padding: '8px 12px',
                                                            borderRadius: '5px',
                                                            cursor: 'not-allowed'
                                                        }}
                                                    >
                                                        Anulada
                                                    </button>
                                                )}
                                            </td>
                                        )}
                                    </tr>
                                    {/* Fila expandible para mostrar los detalles */}
                                    {expandedSaleId === venta.id && venta.detalles && venta.detalles.length > 0 && (
                                        <tr style={{ backgroundColor: '#f8f9fa' }}>
                                            <td colSpan={user && user.is_superuser ? 8 : 7} style={{ border: '1px solid #ddd', padding: '15px' }}>
                                                <h4>Detalles de la Venta #{venta.id}</h4>
                                                <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '10px' }}>
                                                    <thead>
                                                        <tr style={{ backgroundColor: '#e9ecef' }}>
                                                            <th style={{ border: '1px solid #ddd', padding: '8px', textAlign: 'left' }}>Producto</th>
                                                            <th style={{ border: '1px solid #ddd', padding: '8px', textAlign: 'left' }}>Cantidad</th>
                                                            <th style={{ border: '1px solid #ddd', padding: '8px', textAlign: 'left' }}>P. Unitario</th>
                                                            <th style={{ border: '1px solid #ddd', padding: '8px', textAlign: 'left' }}>Subtotal</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                        {venta.detalles.map((detalle) => (
                                                            <tr key={detalle.id}>
                                                                <td style={{ border: '1px solid #eee', padding: '8px' }}>{detalle.producto_nombre}</td>
                                                                <td style={{ border: '1px solid #eee', padding: '8px' }}>{detalle.cantidad}</td>
                                                                <td style={{ border: '1px solid #eee', padding: '8px' }}>${parseFloat(detalle.precio_unitario_venta).toFixed(2)}</td>
                                                                <td style={{ border: '1px solid #eee', padding: '8px' }}>${(parseFloat(detalle.cantidad) * parseFloat(detalle.precio_unitario_venta)).toFixed(2)}</td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            </td>
                                        </tr>
                                    )}
                                </React.Fragment>
                            ))}
                        </tbody>
                    </table>

                    {/* Controles de Paginación */}
                    <div style={{ marginTop: '20px', display: 'flex', justifyContent: 'center', gap: '10px' }}>
                        <button
                            onClick={() => fetchVentas(prevPageUrl)}
                            disabled={!prevPageUrl}
                            style={{ padding: '10px 15px', backgroundColor: '#6c757d', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer' }}
                        >
                            Anterior
                        </button>
                        <span style={{ alignSelf: 'center' }}>Página {currentPageNumber}</span>
                        <button
                            onClick={() => fetchVentas(nextPageUrl)}
                            disabled={!nextPageUrl}
                            style={{ padding: '10px 15px', backgroundColor: '#6c757d', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer' }}
                        >
                            Siguiente
                        </button>
                    </div>
                </>
            )}
        </div>
    );
};

export default VentasPage;