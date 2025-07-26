// BONITO_AMOR/frontend/src/components/PuntoVenta.js
import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { useAuth } from '../AuthContext';

const API_BASE_URL = process.env.REACT_APP_API_URL;

// Función para normalizar la URL base, eliminando cualquier /api/ o barra final
const normalizeApiUrl = (url) => {
    let normalizedUrl = url;
    // Eliminar cualquier /api/ al final si existe
    if (normalizedUrl.endsWith('/api/') || normalizedUrl.endsWith('/api')) {
        normalizedUrl = normalizedUrl.replace(/\/api\/?$/, '');
    }
    // Eliminar barra final si existe
    if (normalizedUrl.endsWith('/')) {
        normalizedUrl = normalizedUrl.slice(0, -1);
    }
    return normalizedUrl;
};

// La URL base normalizada que usaremos para todas las llamadas
const BASE_API_ENDPOINT = normalizeApiUrl(API_BASE_URL);

const PuntoVenta = () => {
    const { user, isAuthenticated, loading: authLoading, selectedStoreSlug, token } = useAuth();

    const [productos, setProductos] = useState([]);
    const [categorias, setCategorias] = useState([]);
    const [metodosPago, setMetodosPago] = useState([]);
    const [productosEnVenta, setProductosEnVenta] = useState([]);
    const [totalVenta, setTotalVenta] = useState(0);
    const [metodoPagoSeleccionado, setMetodoPagoSeleccionado] = useState('');
    const [busquedaProducto, setBusquedaProducto] = useState('');
    const [productoSeleccionado, setProductoSeleccionado] = useState(null);
    const [cantidadProducto, setCantidadProducto] = useState(1);
    const [error, setError] = useState(null);
    const [successMessage, setSuccessMessage] = useState(null);
    const [loadingData, setLoadingData] = useState(true);

    // Estados para el modal de confirmación
    const [showConfirmModal, setShowConfirmModal] = useState(false);
    const [confirmMessage, setConfirmMessage] = useState('');
    const [confirmAction, setConfirmAction] = useState(() => () => {});

    // Estados para el cuadro de mensaje de alerta personalizado
    const [showAlertMessage, setShowAlertMessage] = useState(false);
    const [alertMessage, setAlertMessage] = useState('');

    // Función para mostrar un mensaje de alerta personalizado
    const showCustomAlert = (message, type = 'success') => {
        setAlertMessage(message);
        setShowAlertMessage(true);
        setTimeout(() => {
            setShowAlertMessage(false);
            setAlertMessage('');
        }, 3000);
    };

    const fetchProductos = useCallback(async () => {
        if (!token || !selectedStoreSlug) {
            setLoadingData(false);
            return;
        }
        setLoadingData(true); // Asegúrate de que el estado de carga se active
        setError(null);       // Limpia cualquier error anterior
        try {
            // *** ESTA ES LA LÍNEA CRÍTICA QUE DEBE INCLUIR /api/ ***
            const response = await axios.get(`${BASE_API_ENDPOINT}/api/productos/`, {
                headers: { 'Authorization': `Bearer ${token}` },
                params: { tienda_slug: selectedStoreSlug }
            });
            setProductos(response.data.results || response.data);
            setError(null);
        } catch (err) {
            console.error("Error al cargar productos:", err.response || err.message);
            setError("Error al cargar productos: " + (err.response?.data?.detail || err.message));
        } finally {
            setLoadingData(false);
        }
    }, [token, selectedStoreSlug]);

    const fetchCategorias = useCallback(async () => {
        if (!token) return;
        try {
            // Asegúrate de que esta URL también use /api/
            const response = await axios.get(`${BASE_API_ENDPOINT}/api/categorias/`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            setCategorias(response.data.results || response.data);
        } catch (err) {
            console.error("Error al cargar categorías:", err.response || err.message);
        }
    }, [token]);

    const fetchMetodosPago = useCallback(async () => {
        if (!token) return;
        try {
            // Asegúrate de que esta URL también use /api/
            const response = await axios.get(`${BASE_API_ENDPOINT}/api/metodos-pago/`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            setMetodosPago(response.data);
            if (response.data.length > 0) {
                setMetodoPagoSeleccionado(response.data[0].nombre);
            }
        } catch (err) {
            console.error("Error al cargar métodos de pago:", err.response || err.message);
        }
    }, [token]);

    useEffect(() => {
        if (!authLoading && isAuthenticated && user && (user.is_superuser || user.is_staff) && selectedStoreSlug) {
            setLoadingData(true);
            fetchProductos();
            fetchCategorias();
            fetchMetodosPago();
        } else if (!authLoading && (!isAuthenticated || !user || (!user.is_superuser && !user.is_staff))) {
            setError("Acceso denegado. No tienes permisos para usar el punto de venta.");
            setLoadingData(false);
        } else if (!authLoading && isAuthenticated && user && (user.is_superuser || user.is_staff) && !selectedStoreSlug) {
            setLoadingData(false);
        }
    }, [isAuthenticated, user, authLoading, selectedStoreSlug, fetchProductos, fetchCategorias, fetchMetodosPago]);

    useEffect(() => {
        const calcularTotal = productosEnVenta.reduce((acc, item) => acc + (item.precio * item.cantidad), 0);
        setTotalVenta(calcularTotal);
    }, [productosEnVenta]);

    const handleBuscarProducto = async (e) => {
        e.preventDefault();
        setError(null);
        if (!busquedaProducto) {
            showCustomAlert("Por favor, ingresa un nombre o código de barras para buscar.", 'error');
            return;
        }
        if (!selectedStoreSlug) {
            showCustomAlert("Por favor, selecciona una tienda antes de buscar productos.", 'error');
            return;
        }

        try {
            // Asegúrate de que esta URL también use /api/
            const response = await axios.get(`${BASE_API_ENDPOINT}/api/productos/buscar_por_barcode/`, {
                headers: { 'Authorization': `Bearer ${token}` },
                params: { barcode: busquedaProducto, tienda_slug: selectedStoreSlug }
            });
            setProductoSeleccionado(response.data);
            setCantidadProducto(1); // Resetear cantidad
            setBusquedaProducto(''); // Limpiar campo de búsqueda
        } catch (err) {
            console.error("Error al buscar producto:", err.response || err.message);
            setProductoSeleccionado(null);
            showCustomAlert("Producto no encontrado o error en la búsqueda: " + (err.response?.data?.error || err.message), 'error');
        }
    };

    const handleAgregarProducto = () => {
        if (!productoSeleccionado) {
            showCustomAlert("No hay producto seleccionado para añadir.", 'error');
            return;
        }
        if (cantidadProducto <= 0) {
            showCustomAlert("La cantidad debe ser mayor a 0.", 'error');
            return;
        }
        if (cantidadProducto > productoSeleccionado.stock) {
            showCustomAlert(`No hay suficiente stock. Stock disponible: ${productoSeleccionado.stock}.`, 'error');
            return;
        }

        const productoExistenteIndex = productosEnVenta.findIndex(item => item.id === productoSeleccionado.id);

        if (productoExistenteIndex > -1) {
            const nuevosProductosEnVenta = [...productosEnVenta];
            const nuevaCantidad = nuevosProductosEnVenta[productoExistenteIndex].cantidad + cantidadProducto;

            if (nuevaCantidad > productoSeleccionado.stock) {
                showCustomAlert(`No se puede añadir más. La cantidad total excede el stock disponible (${productoSeleccionado.stock}).`, 'error');
                return;
            }
            nuevosProductosEnVenta[productoExistenteIndex].cantidad = nuevaCantidad;
            setProductosEnVenta(nuevosProductosEnVenta);
        } else {
            setProductosEnVenta([...productosEnVenta, { ...productoSeleccionado, cantidad: cantidadProducto }]);
        }
        setProductoSeleccionado(null);
        setCantidadProducto(1);
        setBusquedaProducto('');
    };

    const handleEliminarProductoDeVenta = (id) => {
        setProductosEnVenta(productosEnVenta.filter(item => item.id !== id));
    };

    const handleRealizarVenta = async () => {
        if (productosEnVenta.length === 0) {
            showCustomAlert("No hay productos en la venta.", 'error');
            return;
        }
        if (!metodoPagoSeleccionado) {
            showCustomAlert("Por favor, selecciona un método de pago.", 'error');
            return;
        }
        if (!selectedStoreSlug) {
            showCustomAlert("Por favor, selecciona una tienda para registrar la venta.", 'error');
            return;
        }

        setConfirmMessage(`¿Confirmas la venta por un total de $${totalVenta.toFixed(2)} con ${metodoPagoSeleccionado}?`);
        setConfirmAction(() => async () => {
            setShowConfirmModal(false); // Cerrar el modal después de confirmar
            try {
                const detalles = productosEnVenta.map(item => ({
                    producto: item.id,
                    cantidad: item.cantidad,
                    precio_unitario: item.precio, // Asegúrate de que este campo coincida con tu Serializer
                }));

                const ventaData = {
                    tienda: selectedStoreSlug, // Usar el slug de la tienda
                    metodo_pago: metodoPagoSeleccionado,
                    detalles: detalles,
                };

                // Asegúrate de que esta URL también use /api/
                const response = await axios.post(`${BASE_API_ENDPOINT}/api/ventas/`, ventaData, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });

                showCustomAlert(`Venta realizada con éxito! ID: ${response.data.id}`, 'success');
                setProductosEnVenta([]);
                setTotalVenta(0);
                setProductoSeleccionado(null);
                setCantidadProducto(1);
                fetchProductos(); // Refrescar stock de productos
            } catch (err) {
                console.error("Error al realizar venta:", err.response ? err.response.data : err.message);
                setError("Error al realizar venta: " + (err.response?.data?.detail || err.message));
            }
        });
        setShowConfirmModal(true); // Mostrar el modal
    };

    if (authLoading || (isAuthenticated && !user)) {
        return <p style={styles.loadingMessage}>Cargando datos de usuario...</p>;
    }

    if (!isAuthenticated || !(user.is_superuser || user.is_staff)) {
        return <p style={styles.accessDeniedMessage}>Acceso denegado. No tienes permisos para usar el punto de venta.</p>;
    }

    if (!selectedStoreSlug) {
        return (
            <div style={styles.noStoreSelectedMessage}>
                <h2>Por favor, selecciona una tienda en la barra de navegación para usar el punto de venta.</h2>
            </div>
        );
    }

    if (loadingData) {
        return <p style={styles.loadingMessage}>Cargando datos del punto de venta...</p>;
    }

    return (
        <div style={styles.container}>
            <h1>Punto de Venta ({selectedStoreSlug})</h1>

            {error && <p style={styles.errorMessage}>{error}</p>}
            {successMessage && <p style={styles.successMessage}>{successMessage}</p>}

            {/* Sección de Búsqueda y Añadir Producto */}
            <div style={styles.searchAddSection}>
                <form onSubmit={handleBuscarProducto} style={styles.searchForm}>
                    <input
                        type="text"
                        value={busquedaProducto}
                        onChange={(e) => setBusquedaProducto(e.target.value)}
                        placeholder="Buscar producto por nombre o código de barras"
                        style={styles.searchInput}
                    />
                    <button type="submit" style={styles.searchButton}>Buscar</button>
                </form>

                {productoSeleccionado && (
                    <div style={styles.selectedProductCard}>
                        <h3>Producto Seleccionado:</h3>
                        <p><strong>Nombre:</strong> {productoSeleccionado.nombre}</p>
                        <p><strong>Precio:</strong> ${productoSeleccionado.precio.toFixed(2)}</p>
                        <p><strong>Stock Disponible:</strong> {productoSeleccionado.stock}</p>
                        <div style={styles.quantityControls}>
                            <label>Cantidad:</label>
                            <input
                                type="number"
                                value={cantidadProducto}
                                onChange={(e) => setCantidadProducto(parseInt(e.target.value) || 1)}
                                min="1"
                                max={productoSeleccionado.stock}
                                style={styles.quantityInput}
                            />
                            <button onClick={handleAgregarProducto} style={styles.addButton}>Añadir a Venta</button>
                        </div>
                    </div>
                )}
            </div>

            {/* Lista de Productos en Venta */}
            <div style={styles.saleListSection}>
                <h2>Productos en Venta</h2>
                {productosEnVenta.length === 0 ? (
                    <p style={styles.noDataMessage}>No hay productos en la venta actual.</p>
                ) : (
                    <table style={styles.table}>
                        <thead>
                            <tr style={styles.tableHeaderRow}>
                                <th style={styles.th}>Producto</th>
                                <th style={styles.th}>Talle</th>
                                <th style={styles.th}>Cantidad</th>
                                <th style={styles.th}>Precio Unitario</th>
                                <th style={styles.th}>Subtotal</th>
                                <th style={styles.th}>Acciones</th>
                            </tr>
                        </thead>
                        <tbody>
                            {productosEnVenta.map(item => (
                                <tr key={item.id} style={styles.tableRow}>
                                    <td style={styles.td}>{item.nombre}</td>
                                    <td style={styles.td}>{item.talle}</td>
                                    <td style={styles.td}>{item.cantidad}</td>
                                    <td style={styles.td}>${item.precio.toFixed(2)}</td>
                                    <td style={styles.td}>${(item.precio * item.cantidad).toFixed(2)}</td>
                                    <td style={styles.td}>
                                        <button onClick={() => handleEliminarProductoDeVenta(item.id)} style={styles.deleteItemButton}>Eliminar</button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>

            {/* Sección de Resumen de Venta */}
            <div style={styles.summarySection}>
                <h2>Resumen de Venta</h2>
                <p style={styles.totalText}>Total: ${totalVenta.toFixed(2)}</p>
                <div style={styles.paymentMethodControls}>
                    <label htmlFor="metodoPago">Método de Pago:</label>
                    <select
                        id="metodoPago"
                        value={metodoPagoSeleccionado}
                        onChange={(e) => setMetodoPagoSeleccionado(e.target.value)}
                        style={styles.paymentMethodSelect}
                    >
                        {metodosPago.map(metodo => (
                            <option key={metodo.id} value={metodo.nombre}>{metodo.nombre}</option>
                        ))}
                    </select>
                </div>
                <button onClick={handleRealizarVenta} style={styles.completeSaleButton}>Realizar Venta</button>
            </div>

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
    noStoreSelectedMessage: {
        padding: '50px',
        textAlign: 'center',
        color: '#777',
    },
    errorMessage: {
        color: 'red',
        backgroundColor: '#ffe3e6',
        padding: '10px',
        borderRadius: '5px',
        marginBottom: '15px',
        textAlign: 'center',
    },
    successMessage: {
        color: 'green',
        backgroundColor: '#e6ffe6',
        padding: '10px',
        borderRadius: '5px',
        marginBottom: '15px',
        textAlign: 'center',
    },
    searchAddSection: {
        marginBottom: '30px',
        border: '1px solid #e0e0e0',
        padding: '20px',
        borderRadius: '8px',
        backgroundColor: '#f9f9f9',
    },
    searchForm: {
        display: 'flex',
        gap: '10px',
        marginBottom: '20px',
    },
    searchInput: {
        flexGrow: 1,
        padding: '10px',
        border: '1px solid #ccc',
        borderRadius: '4px',
    },
    searchButton: {
        padding: '10px 15px',
        backgroundColor: '#007bff',
        color: 'white',
        border: 'none',
        borderRadius: '5px',
        cursor: 'pointer',
    },
    selectedProductCard: {
        border: '1px solid #d4edda',
        backgroundColor: '#d4edda',
        padding: '15px',
        borderRadius: '8px',
        marginTop: '15px',
    },
    quantityControls: {
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
        marginTop: '10px',
    },
    quantityInput: {
        width: '80px',
        padding: '8px',
        border: '1px solid #ccc',
        borderRadius: '4px',
    },
    addButton: {
        padding: '8px 15px',
        backgroundColor: '#28a745',
        color: 'white',
        border: 'none',
        borderRadius: '5px',
        cursor: 'pointer',
    },
    saleListSection: {
        marginBottom: '30px',
    },
    noDataMessage: {
        textAlign: 'center',
        color: '#777',
        fontStyle: 'italic',
    },
    table: {
        width: '100%',
        borderCollapse: 'collapse',
        marginTop: '10px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
        borderRadius: '8px',
        overflow: 'hidden',
    },
    tableHeaderRow: {
        backgroundColor: '#f2f2f2',
    },
    th: {
        padding: '12px',
        border: '1px solid #ddd',
        textAlign: 'left',
        fontWeight: 'bold',
        color: '#333',
    },
    tableRow: {
        backgroundColor: 'inherit',
    },
    td: {
        padding: '10px',
        border: '1px solid #ddd',
        verticalAlign: 'top',
    },
    deleteItemButton: {
        padding: '5px 10px',
        backgroundColor: '#dc3545',
        color: 'white',
        border: 'none',
        borderRadius: '4px',
        cursor: 'pointer',
    },
    summarySection: {
        border: '1px solid #e0e0e0',
        padding: '20px',
        borderRadius: '8px',
        backgroundColor: '#f9f9f9',
        textAlign: 'right',
    },
    totalText: {
        fontSize: '1.8em',
        fontWeight: 'bold',
        color: '#333',
        marginBottom: '15px',
    },
    paymentMethodControls: {
        display: 'flex',
        justifyContent: 'flex-end',
        alignItems: 'center',
        gap: '10px',
        marginBottom: '20px',
    },
    paymentMethodSelect: {
        padding: '8px',
        border: '1px solid #ccc',
        borderRadius: '4px',
        minWidth: '150px',
    },
    completeSaleButton: {
        padding: '12px 25px',
        backgroundColor: '#28a745',
        color: 'white',
        border: 'none',
        borderRadius: '5px',
        cursor: 'pointer',
        fontSize: '1.1em',
        fontWeight: 'bold',
    },
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
    alertBox: {
        position: 'fixed',
        top: '20px',
        right: '20px',
        backgroundColor: '#28a745',
        color: 'white',
        padding: '15px 25px',
        borderRadius: '8px',
        boxShadow: '0 2px 10px rgba(0, 0, 0, 0.1)',
        zIndex: 1001,
        opacity: 0,
        animation: 'fadeInOut 3s forwards',
    },
};

export default PuntoVenta;
