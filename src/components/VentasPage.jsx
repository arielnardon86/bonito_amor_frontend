// BONITO_AMOR/frontend/src/components/VentasPage.jsx

import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { useAuth } from '../AuthContext'; // Importar useAuth para obtener selectedStoreSlug

// URL base de la API, obtenida de las variables de entorno de React
const API_BASE_URL = process.env.REACT_APP_API_URL; 

const VentasPage = () => {
    // Obtiene el estado de autenticación del contexto, incluyendo selectedStoreSlug
    const { user, token, isAuthenticated, loading: authLoading, selectedStoreSlug } = useAuth(); 
    
    // Estados para los datos de ventas y su carga
    const [ventas, setVentas] = useState([]);
    const [loading, setLoading] = useState(true); // Indica si las ventas están cargando
    const [error, setError] = useState(null);    // Almacena mensajes de error

    // Estados para los filtros de búsqueda
    const [filterYear, setFilterYear] = useState('');
    const [filterMonth, setFilterMonth] = useState('');
    const [filterDay, setFilterDay] = useState('');
    const [filterSellerId, setFilterSellerId] = useState('');
    const [filterAnulada, setFilterAnulada] = useState(''); // '', 'true', 'false'

    // Estados para la paginación de la API de Django REST Framework
    const [nextPageUrl, setNextPageUrl] = useState(null);
    const [prevPageUrl, setPrevPageUrl] = useState(null);
    const [currentPageNumber, setCurrentPageNumber] = useState(1);

    // Estado para controlar qué venta está expandida en la tabla
    const [expandedSaleId, setExpandedSaleId] = useState(null); 

    // `fetchVentas` es una función useCallback para optimizar y evitar re-creaciones innecesarias,
    // lo que es importante cuando se usa en `useEffect`.
    const fetchVentas = useCallback(async (pageUrlOrNumber = 1) => {
        // No cargar si no hay token o tienda seleccionada
        if (!token || !selectedStoreSlug) { 
            console.log("fetchVentas: No token or selected store available, skipping fetch.");
            setLoading(false);
            return;
        }

        setLoading(true); // Inicia el estado de carga
        setError(null);   // Limpia errores previos
        try {
            let url = '';
            let params = {};

            // Determina la URL de la solicitud: si es una URL completa de paginación o la URL base con parámetros
            if (typeof pageUrlOrNumber === 'string') {
                url = pageUrlOrNumber; // Si se pasa una URL completa (next/previous)
            } else {
                url = `${API_BASE_URL}/ventas/`; // URL base para la primera carga o aplicación de filtros
                params = {
                    page: pageUrlOrNumber, // Número de página
                    ...(filterYear && { year: filterYear }), // Añade el filtro de año si existe
                    ...(filterMonth && { month: filterMonth }), // Añade el filtro de mes si existe
                    ...(filterDay && { day: filterDay }),       // Añade el filtro de día si existe
                    ...(filterSellerId && { usuario: filterSellerId }), // Importante: usa 'usuario' para el filtro por ID de vendedor
                    ...(filterAnulada !== '' && { anulada: filterAnulada }), // Incluye el filtro de anulación si no está vacío
                    tienda_slug: selectedStoreSlug, // *** CAMBIO CLAVE AQUÍ: Añadir tienda_slug ***
                };
            }
            
            console.log("fetchVentas: API Call to:", url);
            console.log("fetchVentas: Params:", typeof pageUrlOrNumber === 'string' ? {} : params);

            // Realiza la solicitud GET a la API de ventas con el token de autenticación
            const response = await axios.get(url, { 
                headers: {
                    'Authorization': `Bearer ${token}`, // Envía el token JWT en el encabezado
                },
                // Si es una URL completa (next/previous), no se envían params adicionales aquí
                params: typeof pageUrlOrNumber === 'string' ? {} : params, 
            });

            console.log("fetchVentas: Raw response data:", response.data);

            // Procesa la respuesta de la API (maneja tanto respuestas paginadas como no paginadas)
            if (response.data && Array.isArray(response.data.results)) {
                // Si la respuesta es paginada (Django REST Framework por defecto)
                setVentas(response.data.results);
                setNextPageUrl(response.data.next);
                setPrevPageUrl(response.data.previous);
                if (typeof pageUrlOrNumber === 'number') {
                    setCurrentPageNumber(pageUrlOrNumber);
                } else {
                    // Extrae el número de página de la URL si se usó next/previous
                    const urlParams = new URLSearchParams(new URL(url).search); 
                    setCurrentPageNumber(parseInt(urlParams.get('page')) || 1);
                }
                console.log("fetchVentas: Data treated as paginated results.");
            } else if (Array.isArray(response.data)) {
                // Si la respuesta es un array directo (sin paginación)
                setVentas(response.data);
                setNextPageUrl(null);
                setPrevPageUrl(null);
                setCurrentPageNumber(1);
                console.log("fetchVentas: Data treated as direct array (no pagination detected).");
            } else {
                // Formato de respuesta inesperado
                console.error("fetchVentas: Unexpected response data format:", response.data);
                setError('Formato de datos de ventas inesperado del servidor.');
                setVentas([]);
                setNextPageUrl(null);
                setPrevPageUrl(null);
                setCurrentPageNumber(1);
            }

        } catch (err) {
            // Manejo de errores de la solicitud API
            console.error('Error al obtener ventas:', err.response ? err.response.data : err.message);
            setError('No se pudieron cargar las ventas. Verifica tu conexión o permisos.');
            setVentas([]);
            setNextPageUrl(null);
            setPrevPageUrl(null);
            setCurrentPageNumber(1);
        } finally {
            setLoading(false); // Finaliza el estado de carga
        }
    }, [token, selectedStoreSlug, filterYear, filterMonth, filterDay, filterSellerId, filterAnulada]); // Añadir selectedStoreSlug como dependencia

    // useEffect para disparar la carga inicial de ventas cuando el usuario está autenticado
    useEffect(() => {
        // Solo carga si no está cargando la autenticación, está autenticado y hay una tienda seleccionada
        if (!authLoading && isAuthenticated && selectedStoreSlug) { 
            fetchVentas(1); // Carga la primera página de ventas
        } else if (!authLoading && (!isAuthenticated || !selectedStoreSlug)) {
            // Si no está autenticado o no hay tienda seleccionada, no hay ventas que cargar
            setLoading(false); 
        }
    }, [token, isAuthenticated, authLoading, selectedStoreSlug, fetchVentas]); // Añadir selectedStoreSlug como dependencia

    // Manejador para aplicar los filtros de búsqueda
    const handleApplyFilters = () => {
        fetchVentas(1); // Vuelve a cargar la primera página con los nuevos filtros
        setExpandedSaleId(null); // Colapsa cualquier venta expandida al aplicar filtros
    };

    // Manejador para anular una venta (solo para superusuarios)
    const handleAnularVenta = async (ventaId) => {
        if (!user || !user.is_superuser) {
            alert('No tienes permisos para anular ventas.');
            return;
        }
        if (!selectedStoreSlug) {
            alert('Por favor, selecciona una tienda antes de anular ventas.');
            return;
        }

        if (window.confirm(`¿Estás seguro de que quieres anular la venta ${ventaId}? Esta acción revertirá el stock.`)) {
            try {
                console.log(`Anulando venta ${ventaId} para tienda ${selectedStoreSlug}.`);
                // Realiza la solicitud PATCH a la acción 'anular' de la API de ventas, incluyendo tienda_slug
                const response = await axios.patch(`${API_BASE_URL}/ventas/${ventaId}/anular/?tienda_slug=${selectedStoreSlug}`, {}, { 
                    headers: {
                        'Authorization': `Bearer ${token}`,
                    },
                });
                console.log("Anular venta response:", response.data);
                alert(`Venta ${ventaId} anulada exitosamente.`);
                fetchVentas(currentPageNumber); // Recarga la página actual para reflejar el cambio
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

    // Función para expandir/colapsar los detalles de una venta en la tabla
    const handleToggleDetails = (ventaId) => {
        setExpandedSaleId(prevId => (prevId === ventaId ? null : ventaId));
    };

    // --- Lógica de renderizado condicional basada en el estado de autenticación y permisos ---
    if (authLoading) {
        return <p style={{ textAlign: 'center', marginTop: '50px' }}>Cargando información de usuario...</p>;
    }

    if (!isAuthenticated) {
        return <p>Por favor, inicia sesión para ver las ventas.</p>;
    }

    // Solo permite el acceso a usuarios staff o superusuarios
    if (!user || (!user.is_staff && !user.is_superuser)) {
        return <p>No tienes permiso para ver el listado de ventas.</p>;
    }

    // Si no hay tienda seleccionada, muestra un mensaje
    if (!selectedStoreSlug) {
        return (
            <div style={{ padding: '50px', textAlign: 'center' }}>
                <h2>Por favor, selecciona una tienda en la barra de navegación para ver las ventas.</h2>
            </div>
        );
    }

    // Renderizado del componente principal
    return (
        <div style={{ padding: '20px' }}>
            <h1>Gestión de Ventas ({selectedStoreSlug})</h1> {/* Muestra la tienda seleccionada */}

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
                                <th style={{ border: '1px solid #ddd', padding: '8px', textAlign: 'left' }}>Método Pago</th> 
                                <th style={{ border: '1px solid #ddd', padding: '8px', textAlign: 'left' }}>Estado</th>
                                <th style={{ border: '1px solid #ddd', padding: '8px', textAlign: 'left' }}>Detalles</th> 
                                {user && user.is_superuser && (
                                    <th style={{ border: '1px solid #ddd', padding: '8px', textAlign: 'left' }}>Acciones</th>
                                )}
                            </tr>
                        </thead>
                        <tbody>
                            {ventas.map((venta) => (
                                <React.Fragment key={venta.id}>
                                    <tr style={{ backgroundColor: expandedSaleId === venta.id ? '#e0f7fa' : 'inherit' }}> 
                                        <td style={{ border: '1px solid #ddd', padding: '8px' }}>{venta.id}</td>
                                        <td style={{ border: '1px solid #ddd', padding: '8px' }}>{new Date(venta.fecha_venta).toLocaleString()}</td>
                                        <td style={{ border: '1px solid #ddd', padding: '8px' }}>${parseFloat(venta.total_venta).toFixed(2)}</td>
                                        {/* Asegúrate de que venta.usuario exista antes de acceder a .username */}
                                        <td style={{ border: '1px solid #ddd', padding: '8px' }}>{venta.usuario ? venta.usuario.username : 'N/A'}</td>
                                        <td style={{ border: '1px solid #ddd', padding: '8px' }}>{venta.metodo_pago || 'N/A'}</td> 
                                        <td style={{ border: '1px solid #ddd', padding: '8px' }}>
                                            <span style={{ color: venta.anulada ? 'red' : 'green', fontWeight: 'bold' }}>
                                                {venta.anulada ? 'ANULADA' : 'ACTIVA'}
                                            </span>
                                        </td>
                                        <td style={{ border: '1px solid #ddd', padding: '8px' }}>
                                            <button
                                                onClick={() => handleToggleDetails(venta.id)}
                                                style={{
                                                    backgroundColor: '#17a2b8', 
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
