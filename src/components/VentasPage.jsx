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

    // Estados para el modal de confirmación
    const [showConfirmModal, setShowConfirmModal] = useState(false);
    const [confirmMessage, setConfirmMessage] = useState('');
    const [confirmAction, setConfirmAction] = useState(() => () => {}); // Función a ejecutar en la confirmación

    // Estados para el cuadro de mensaje de alerta personalizado
    const [showAlertMessage, setShowAlertMessage] = useState(false);
    const [alertMessage, setAlertMessage] = useState('');

    // Función para mostrar un mensaje de alerta personalizado
    const showCustomAlert = (message, type = 'success') => {
        setAlertMessage(message);
        // Puedes añadir lógica para el tipo de mensaje (success, error, info) para cambiar estilos
        // Por ahora, solo mostraremos el mensaje.
        setShowAlertMessage(true);
        setTimeout(() => {
            setShowAlertMessage(false);
            setAlertMessage('');
        }, 3000); // Ocultar después de 3 segundos
    };

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
                // CAMBIO CLAVE: Añadir /api/ a la URL base
                url = `${API_BASE_URL}/api/ventas/`; // URL base para la primera carga o aplicación de filtros
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
            showCustomAlert('No tienes permisos para anular ventas.', 'error');
            return;
        }
        if (!selectedStoreSlug) {
            showCustomAlert('Por favor, selecciona una tienda antes de anular ventas.', 'error');
            return;
        }

        // Mostrar el modal de confirmación personalizado
        setConfirmMessage(`¿Estás seguro de que quieres anular la venta ${ventaId}? Esta acción revertirá el stock.`);
        setConfirmAction(() => async () => {
            setShowConfirmModal(false); // Cerrar el modal después de confirmar
            try {
                console.log(`Anulando venta ${ventaId} para tienda ${selectedStoreSlug}.`);
                // CAMBIO CLAVE: Añadir /api/ a la URL
                const response = await axios.patch(`${API_BASE_URL}/api/ventas/${ventaId}/anular/?tienda_slug=${selectedStoreSlug}`, {}, { 
                    headers: {
                        'Authorization': `Bearer ${token}`,
                    },
                });
                console.log("Anular venta response:", response.data);
                showCustomAlert(`Venta ${ventaId} anulada exitosamente.`, 'success'); // Usar alerta personalizada
                fetchVentas(currentPageNumber); // Recarga la página actual para reflejar el cambio
            } catch (err) {
                console.error('Error al anular venta:', err.response ? err.response.data : err.message);
                if (err.response && err.response.data && err.response.data.detail) {
                    showCustomAlert(`Error al anular venta: ${err.response.data.detail}`, 'error'); // Usar alerta personalizada
                } else {
                    showCustomAlert('Error al anular venta. Inténtalo de nuevo.', 'error'); // Usar alerta personalizada
                }
            }
        });
        setShowConfirmModal(true); // Mostrar el modal
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
        <div style={styles.container}>
            <h1>Gestión de Ventas ({selectedStoreSlug})</h1> {/* Muestra la tienda seleccionada */}

            {/* Controles de Filtro */}
            <div style={styles.filterContainer}>
                <h3>Filtros de Búsqueda</h3>
                <div style={styles.filterGrid}>
                    <div>
                        <label htmlFor="filterYear">Año:</label>
                        <input
                            type="number"
                            id="filterYear"
                            value={filterYear}
                            onChange={(e) => setFilterYear(e.target.value)}
                            placeholder="Ej: 2024"
                            style={styles.input}
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
                            style={styles.input}
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
                            style={styles.input}
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
                            style={styles.input}
                        />
                    </div>
                    <div>
                        <label htmlFor="filterAnulada">Estado Anulación:</label>
                        <select
                            id="filterAnulada"
                            value={filterAnulada}
                            onChange={(e) => setFilterAnulada(e.target.value)}
                            style={styles.input}
                        >
                            <option value="">Todas</option>
                            <option value="false">Activas</option>
                            <option value="true">Anuladas</option>
                        </select>
                    </div>
                </div>
                <button onClick={handleApplyFilters} style={styles.primaryButton}>
                    Aplicar Filtros
                </button>
            </div>

            {loading && <p style={styles.loadingMessage}>Cargando ventas...</p>} 
            {error && <p style={styles.errorMessage}>{error}</p>}

            {!loading && ventas.length === 0 && !error && <p style={styles.noDataMessage}>No se encontraron ventas con los filtros aplicados.</p>}

            {!loading && ventas.length > 0 && (
                <>
                    <table style={styles.table}>
                        <thead>
                            <tr style={styles.tableHeaderRow}>
                                <th style={styles.th}>ID Venta</th>
                                <th style={styles.th}>Fecha</th>
                                {/* Se espera que el backend proporcione 'total_venta' en el objeto de venta */}
                                <th style={styles.th}>Total</th> 
                                {/* Se espera que el backend proporcione un objeto 'usuario' con 'username' anidado */}
                                <th style={styles.th}>Vendedor</th>
                                {/* Se espera que el backend proporcione 'metodo_pago' en el objeto de venta */}
                                <th style={styles.th}>Método Pago</th> 
                                <th style={styles.th}>Estado</th>
                                <th style={styles.th}>Detalles</th> 
                                {user && user.is_superuser && (
                                    <th style={styles.th}>Acciones</th>
                                )}
                            </tr>
                        </thead>
                        <tbody>
                            {ventas.map((venta) => (
                                <React.Fragment key={venta.id}>
                                    <tr style={{ ...styles.tableRow, ...(expandedSaleId === venta.id && styles.expandedRow) }}> 
                                        <td style={styles.td}>{venta.id}</td>
                                        <td style={styles.td}>{new Date(venta.fecha_venta).toLocaleString()}</td>
                                        <td style={styles.td}>${parseFloat(venta.total_venta || 0).toFixed(2)}</td> {/* Fallback a 0 si no existe */}
                                        <td style={styles.td}>{venta.usuario ? venta.usuario.username : 'N/A'}</td>
                                        <td style={styles.td}>{venta.metodo_pago || 'N/A'}</td> 
                                        <td style={styles.td}>
                                            <span style={{ color: venta.anulada ? 'red' : 'green', fontWeight: 'bold' }}>
                                                {venta.anulada ? 'ANULADA' : 'ACTIVA'}
                                            </span>
                                        </td>
                                        <td style={styles.td}>
                                            <button
                                                onClick={() => handleToggleDetails(venta.id)}
                                                style={styles.detailsButton}
                                            >
                                                {expandedSaleId === venta.id ? 'Ocultar' : 'Ver'} Detalles
                                            </button>
                                        </td>
                                        {user && user.is_superuser && ( 
                                            <td style={styles.td}>
                                                {!venta.anulada ? (
                                                    <button
                                                        onClick={() => handleAnularVenta(venta.id)}
                                                        style={styles.anularButton}
                                                    >
                                                        Anular
                                                    </button>
                                                ) : (
                                                    <button
                                                        disabled
                                                        style={styles.anuladaButton}
                                                    >
                                                        Anulada
                                                    </button>
                                                )}
                                            </td>
                                        )}
                                    </tr>
                                    {/* Fila expandible para mostrar los detalles */}
                                    {expandedSaleId === venta.id && venta.detalles && venta.detalles.length > 0 && (
                                        <tr style={styles.detailRow}>
                                            <td colSpan={user && user.is_superuser ? 8 : 7} style={styles.detailCell}>
                                                <h4>Detalles de la Venta #{venta.id}</h4>
                                                <table style={styles.detailTable}>
                                                    <thead>
                                                        <tr style={styles.detailTableHeaderRow}>
                                                            <th style={styles.detailTh}>Producto</th>
                                                            <th style={styles.detailTh}>Cantidad</th>
                                                            <th style={styles.detailTh}>P. Unitario</th>
                                                            <th style={styles.detailTh}>Subtotal</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                        {venta.detalles.map((detalle) => (
                                                            <tr key={detalle.id}>
                                                                <td style={styles.detailTd}>{detalle.producto_nombre}</td>
                                                                <td style={styles.detailTd}>{detalle.cantidad}</td>
                                                                <td style={styles.detailTd}>${parseFloat(detalle.precio_unitario_venta || 0).toFixed(2)}</td>
                                                                <td style={styles.detailTd}>${(parseFloat(detalle.cantidad || 0) * parseFloat(detalle.precio_unitario_venta || 0)).toFixed(2)}</td>
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
                    <div style={styles.paginationContainer}>
                        <button
                            onClick={() => fetchVentas(prevPageUrl)}
                            disabled={!prevPageUrl}
                            style={styles.paginationButton}
                        >
                            Anterior
                        </button>
                        <span style={styles.pageNumber}>Página {currentPageNumber}</span>
                        <button
                            onClick={() => fetchVentas(nextPageUrl)}
                            disabled={!nextPageUrl}
                            style={styles.paginationButton}
                        >
                            Siguiente
                        </button>
                    </div>
                </>
            )}

            {/* Modal de Confirmación */}
            {showConfirmModal && (
                <div style={styles.modalOverlay}>
                    <div style={styles.modalContent}>
                        <p style={styles.modalMessage}>{confirmMessage}</p>
                        <div style={styles.modalActions}>
                            <button onClick={confirmAction} style={styles.modalConfirmButton}>Sí</button>
                            <button onClick={() => setShowConfirmModal(false)} style={styles.modalCancelButton}>No</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Cuadro de Mensaje de Alerta */}
            {showAlertMessage && (
                <div style={styles.alertBox}>
                    <p>{alertMessage}</p>
                </div>
            )}
        </div>
    );
};

// Estilos CSS para el componente
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
        marginBottom: '20px',
    },
    filterContainer: {
        marginBottom: '20px',
        border: '1px solid #e0e0e0',
        padding: '15px',
        borderRadius: '8px',
        backgroundColor: '#f9f9f9',
    },
    filterGrid: {
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
        gap: '15px',
        marginBottom: '15px',
    },
    input: {
        width: '100%',
        padding: '10px',
        border: '1px solid #ccc',
        borderRadius: '4px',
        boxSizing: 'border-box', // Asegura que el padding no aumente el ancho total
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
    },
    primaryButtonHover: {
        backgroundColor: '#0056b3',
    },
    loadingMessage: {
        textAlign: 'center',
        marginTop: '20px',
        color: '#555',
    },
    errorMessage: {
        color: 'red',
        backgroundColor: '#ffe3e6',
        padding: '10px',
        borderRadius: '5px',
        marginBottom: '15px',
        textAlign: 'center',
    },
    noDataMessage: {
        textAlign: 'center',
        marginTop: '20px',
        color: '#777',
        fontStyle: 'italic',
    },
    table: {
        width: '100%',
        borderCollapse: 'collapse',
        marginTop: '20px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
        borderRadius: '8px',
        overflow: 'hidden', // Para que los bordes redondeados se apliquen a la tabla
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
    expandedRow: {
        backgroundColor: '#e0f7fa', // Color para la fila expandida
    },
    td: {
        border: '1px solid #ddd',
        padding: '10px',
        verticalAlign: 'top',
    },
    detailsButton: {
        backgroundColor: '#17a2b8', 
        color: 'white',
        border: 'none',
        padding: '8px 12px',
        borderRadius: '5px',
        cursor: 'pointer',
        fontSize: '0.9em',
        transition: 'background-color 0.3s ease',
    },
    detailsButtonHover: {
        backgroundColor: '#138496',
    },
    anularButton: {
        backgroundColor: '#dc3545',
        color: 'white',
        border: 'none',
        padding: '8px 12px',
        borderRadius: '5px',
        cursor: 'pointer',
        fontSize: '0.9em',
        transition: 'background-color 0.3s ease',
    },
    anularButtonHover: {
        backgroundColor: '#c82333',
    },
    anuladaButton: {
        backgroundColor: '#6c757d',
        color: 'white',
        border: 'none',
        padding: '8px 12px',
        borderRadius: '5px',
        cursor: 'not-allowed',
        fontSize: '0.9em',
    },
    detailRow: {
        backgroundColor: '#f8f9fa',
    },
    detailCell: {
        border: '1px solid #ddd',
        padding: '15px',
    },
    detailTable: {
        width: '100%',
        borderCollapse: 'collapse',
        marginTop: '10px',
    },
    detailTableHeaderRow: {
        backgroundColor: '#e9ecef',
    },
    detailTh: {
        border: '1px solid #ddd',
        padding: '8px',
        textAlign: 'left',
        fontWeight: 'bold',
        color: '#555',
    },
    detailTd: {
        border: '1px solid #eee',
        padding: '8px',
    },
    paginationContainer: {
        marginTop: '20px',
        display: 'flex',
        justifyContent: 'center',
        gap: '10px',
    },
    paginationButton: {
        padding: '10px 15px',
        backgroundColor: '#6c757d',
        color: 'white',
        border: 'none',
        borderRadius: '5px',
        cursor: 'pointer',
        fontSize: '1em',
        transition: 'background-color 0.3s ease',
    },
    paginationButtonHover: {
        backgroundColor: '#5a6268',
    },
    pageNumber: {
        alignSelf: 'center',
        fontSize: '1.1em',
        color: '#333',
    },
    // Estilos para el modal de confirmación
    modalOverlay: {
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.6)',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 1000,
    },
    modalContent: {
        backgroundColor: '#fff',
        padding: '30px',
        borderRadius: '10px',
        boxShadow: '0 5px 15px rgba(0, 0, 0, 0.3)',
        textAlign: 'center',
        maxWidth: '450px',
        width: '90%',
        animation: 'fadeIn 0.3s ease-out',
    },
    modalMessage: {
        fontSize: '1.1em',
        marginBottom: '25px',
        color: '#333',
    },
    modalActions: {
        display: 'flex',
        justifyContent: 'center',
        gap: '20px',
    },
    modalConfirmButton: {
        backgroundColor: '#dc3545',
        color: 'white',
        padding: '12px 25px',
        border: 'none',
        borderRadius: '6px',
        cursor: 'pointer',
        fontSize: '1em',
        fontWeight: 'bold',
        transition: 'background-color 0.3s ease, transform 0.2s ease',
    },
    modalConfirmButtonHover: {
        backgroundColor: '#c82333',
        transform: 'scale(1.02)',
    },
    modalCancelButton: {
        backgroundColor: '#6c757d',
        color: 'white',
        padding: '12px 25px',
        border: 'none',
        borderRadius: '6px',
        cursor: 'pointer',
        fontSize: '1em',
        fontWeight: 'bold',
        transition: 'background-color 0.3s ease, transform 0.2s ease',
    },
    modalCancelButtonHover: {
        backgroundColor: '#5a6268',
        transform: 'scale(1.02)',
    },
    // Estilos para el cuadro de mensaje de alerta
    alertBox: {
        position: 'fixed',
        top: '20px',
        right: '20px',
        backgroundColor: '#28a745', // Color verde para éxito
        color: 'white',
        padding: '15px 25px',
        borderRadius: '8px',
        boxShadow: '0 2px 10px rgba(0, 0, 0, 0.1)',
        zIndex: 1001,
        opacity: 0, // Inicialmente oculto
        animation: 'fadeInOut 3s forwards', // Animación definida en CSS (no directamente en JS styles)
    },
    // Para animaciones en React con estilos en línea, se suelen usar librerías o gestionar con JS.
    // Aquí, para simplificar, la animación `fadeInOut` se simulará con `setTimeout`.
    // Si quisieras animaciones CSS puras, necesitarías una hoja de estilos o una librería de CSS-in-JS.
};

export default VentasPage;
