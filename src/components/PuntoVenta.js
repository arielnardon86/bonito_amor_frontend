// BONITO_AMOR/frontend/src/components/PuntoVenta.js
import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { useAuth } from '../AuthContext';

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

const PuntoVenta = () => {
    const { user, isAuthenticated, loading: authLoading, selectedStoreSlug, token } = useAuth();

    const [productos, setProductos] = useState([]); // Lista de todos los productos disponibles
    const [categorias, setCategorias] = useState([]);
    const [metodosPago, setMetodosPago] = useState([]);
    const [productosEnVenta, setProductosEnVenta] = useState([]); // Productos añadidos a la venta actual (el carrito)
    const [totalVenta, setTotalVenta] = useState(0);
    const [metodoPagoSeleccionado, setMetodoPagoSeleccionado] = useState('');
    const [busquedaProducto, setBusquedaProducto] = useState('');
    const [productoSeleccionado, setProductoSeleccionado] = useState(null); // Producto seleccionado por búsqueda
    const [cantidadProducto, setCantidadProducto] = useState(1);
    const [error, setError] = useState(null);
    const [loadingData, setLoadingData] = useState(true);

    const [showConfirmModal, setShowConfirmModal] = useState(false);
    const [confirmMessage, setConfirmMessage] = useState('');
    const [confirmAction, setConfirmAction] = useState(() => () => {});

    const [showAlertMessage, setShowAlertMessage] = useState(false);
    const [alertMessage, setAlertMessage] = useState('');
    const [alertType, setAlertType] = useState('success'); // 'success', 'error', 'info'

    // Paginación para la tabla 'Productos en el Carrito'
    const [currentPageCart, setCurrentPageCart] = useState(1);
    const itemsPerPageCart = 10;

    // Paginación para la sección 'Productos Disponibles'
    const [currentPageAvailable, setCurrentPageAvailable] = useState(1);
    const itemsPerPageAvailable = 10;

    // Función para mostrar alertas personalizadas en la UI
    const showCustomAlert = (message, type = 'success') => {
        setAlertMessage(message);
        setAlertType(type);
        setShowAlertMessage(true);
        setTimeout(() => {
            setShowAlertMessage(false);
            setAlertMessage('');
            setAlertType('success'); // Reiniciar a predeterminado
        }, 3000);
    };

    // Cargar todos los productos disponibles para la tienda seleccionada
    const fetchProductos = useCallback(async () => {
        if (!token || !selectedStoreSlug) {
            setLoadingData(false);
            return;
        }
        setLoadingData(true);
        setError(null);
        try {
            const response = await axios.get(`${BASE_API_ENDPOINT}/api/productos/`, {
                headers: { 'Authorization': `Bearer ${token}` },
                params: { tienda_slug: selectedStoreSlug }
            });
            console.log("Respuesta de productos:", response.data);
            console.log("Slug de tienda seleccionado:", selectedStoreSlug);
            setProductos(response.data.results || response.data);
            setError(null);
        } catch (err) {
            console.error("Error al cargar productos:", err.response || err.message);
            setError("Error al cargar productos: " + (err.response?.data?.detail || err.message));
        } finally {
            setLoadingData(false);
        }
    }, [token, selectedStoreSlug]);

    // Cargar categorías
    const fetchCategorias = useCallback(async () => {
        console.log("fetchCategorias: Llamado.");
        if (!token) {
            console.log("fetchCategorias: Token no presente, regresando.");
            return;
        }
        try {
            const response = await axios.get(`${BASE_API_ENDPOINT}/api/categorias/`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            console.log("Respuesta de categorías:", response.data);
            setCategorias(response.data.results || response.data);
        } catch (err) {
            console.error("Error al cargar categorías:", err.response ? err.response.data : err.message);
        }
    }, [token]);

    // Cargar métodos de pago
    const fetchMetodosPago = useCallback(async () => {
        console.log("fetchMetodosPago: Llamado.");
        console.log("fetchMetodosPago: Token actual:", token ? token.substring(0, 10) + '...' : 'null');
        if (!token) {
            console.log("fetchMetodosPago: Token no presente, regresando.");
            return;
        }
        try {
            const response = await axios.get(`${BASE_API_ENDPOINT}/api/metodos-pago/`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            console.log("fetchMetodosPago: Respuesta de la API de métodos de pago:", response.data);
            setMetodosPago(response.data);
            if (response.data.length > 0) {
                setMetodoPagoSeleccionado(response.data[0].nombre);
                console.log("fetchMetodosPago: Método de pago seleccionado:", response.data[0].nombre);
            } else {
                console.log("fetchMetodosPago: Ninguna forma de pago devuelta.");
            }
        } catch (err) {
            console.error("fetchMetodosPago: Error al cargar métodos de pago:", err.response ? err.response.data : err.message);
            showCustomAlert("Error al cargar métodos de pago.", 'error');
        }
    }, [token]);

    // Efecto para cargar datos iniciales cuando el usuario está autenticado y la tienda seleccionada
    useEffect(() => {
        console.log("useEffect principal: Estado de autenticación y tienda:", { isAuthenticated, user, selectedStoreSlug, authLoading });
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
            setProductos([]);
        }
    }, [isAuthenticated, user, authLoading, selectedStoreSlug, fetchProductos, fetchCategorias, fetchMetodosPago]);

    // Efecto para recalcular el total de la venta cuando los productos en venta cambian
    useEffect(() => {
        const calcularTotal = productosEnVenta.reduce((acc, item) => acc + (parseFloat(item.precio) * item.cantidad), 0);
        setTotalVenta(calcularTotal);
        const totalPagesCart = Math.ceil(productosEnVenta.length / itemsPerPageCart);
        if (currentPageCart > totalPagesCart && totalPagesCart > 0) {
            setCurrentPageCart(totalPagesCart);
        } else if (productosEnVenta.length === 0) {
            setCurrentPageCart(1);
        }
    }, [productosEnVenta, currentPageCart]);

    // Manejar la búsqueda de un producto por código de barras/nombre
    const handleBuscarProducto = async (e) => {
        e.preventDefault();
        setError(null);
        if (!busquedaProducto) {
            showCustomAlert("Por favor, introduce un nombre o código de barras para buscar.", 'error');
            return;
        }
        if (!selectedStoreSlug) {
            showCustomAlert("Por favor, selecciona una tienda antes de buscar productos.", 'error');
            return;
        }

        try {
            let response;
            try {
                response = await axios.get(`${BASE_API_ENDPOINT}/api/productos/buscar_por_barcode/`, {
                    headers: { 'Authorization': `Bearer ${token}` },
                    params: { barcode: busquedaProducto, tienda_slug: selectedStoreSlug }
                });
            } catch (barcodeErr) {
                console.warn("No encontrado por código de barras, intentando por nombre...", barcodeErr);
                response = await axios.get(`${BASE_API_ENDPOINT}/api/productos/`, {
                    headers: { 'Authorization': `Bearer ${token}` },
                    params: { search: busquedaProducto, tienda_slug: selectedStoreSlug }
                });
                if (response.data.results && response.data.results.length > 0) {
                    response.data = response.data.results[0];
                } else if (response.data.length > 0) {
                    response.data = response.data[0];
                } else {
                    throw new Error("Producto no encontrado por nombre.");
                }
            }

            console.log("Respuesta de búsqueda de producto:", response.data);
            setProductoSeleccionado(response.data);
            setCantidadProducto(1);
            setBusquedaProducto('');
        } catch (err) {
            console.error("Error al buscar producto:", err.response ? err.response.data : err.message);
            setProductoSeleccionado(null);
            showCustomAlert("Producto no encontrado o error en la búsqueda: " + (err.response?.data?.error || err.message), 'error');
        }
    };

    // Función para añadir un producto a la lista de venta, ya sea de la búsqueda o de la lista de disponibles
    const handleAgregarProducto = (productToAdd, quantity = 1) => {
        if (!productToAdd) {
            showCustomAlert("Ningún producto seleccionado para añadir.", 'error');
            return;
        }
        if (quantity <= 0) {
            showCustomAlert("La cantidad debe ser mayor que 0.", 'error');
            return;
        }
        if (quantity > productToAdd.stock) {
            showCustomAlert(`No hay suficiente stock. Stock disponible: ${productToAdd.stock}.`, 'error');
            return;
        }

        const productoExistenteIndex = productosEnVenta.findIndex(item => item.id === productToAdd.id);

        if (productoExistenteIndex > -1) {
            const nuevosProductosEnVenta = [...productosEnVenta];
            const nuevaCantidad = nuevosProductosEnVenta[productoExistenteIndex].cantidad + quantity;

            if (nuevaCantidad > productToAdd.stock) {
                showCustomAlert(`No se puede añadir más. La cantidad total excede el stock disponible (${productToAdd.stock}).`, 'error');
                return;
            }
            nuevosProductosEnVenta[productoExistenteIndex].cantidad = nuevaCantidad;
            setProductosEnVenta(nuevosProductosEnVenta);
        } else {
            setProductosEnVenta([...productosEnVenta, { ...productToAdd, cantidad: quantity }]);
        }
        if (productToAdd.id === productoSeleccionado?.id) {
            setProductoSeleccionado(null);
            setCantidadProducto(1);
            setBusquedaProducto('');
        }
        showCustomAlert(`${productToAdd.nombre} añadido a la venta.`, 'success');
    };

    // Aumentar cantidad de un producto en el carrito
    const handleIncreaseQuantity = (id) => {
        setProductosEnVenta(prevItems => prevItems.map(item => {
            if (item.id === id) {
                const productInStock = productos.find(p => p.id === id);
                if (productInStock && item.cantidad < productInStock.stock) {
                    return { ...item, cantidad: item.cantidad + 1 };
                } else {
                    showCustomAlert(`No hay más stock disponible para ${item.nombre}.`, 'error');
                }
            }
            return item;
        }));
    };

    // Disminuir cantidad de un producto en el carrito
    const handleDecreaseQuantity = (id) => {
        setProductosEnVenta(prevItems => prevItems.map(item => {
            if (item.id === id && item.cantidad > 1) {
                return { ...item, cantidad: item.cantidad - 1 };
            }
            return item;
        }));
    };

    // Eliminar un producto de la lista de venta
    const handleEliminarProductoDeVenta = (id) => {
        setProductosEnVenta(productosEnVenta.filter(item => item.id !== id));
        showCustomAlert("Producto eliminado de la venta.", 'info');
    };

    // Realizar la venta
    const handleRealizarVenta = async () => {
        if (productosEnVenta.length === 0) {
            showCustomAlert("Ningún producto en el carrito.", 'error');
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

        setConfirmMessage(`¿Confirma la venta por un total de $${totalVenta.toFixed(2)} con ${metodoPagoSeleccionado}?`);
        setConfirmAction(() => async () => {
            setShowConfirmModal(false);
            try {
                const detalles = productosEnVenta.map(item => ({
                    producto: item.id,
                    cantidad: item.cantidad,
                    precio_unitario: parseFloat(item.precio),
                }));

                const ventaData = {
                    tienda: selectedStoreSlug,
                    metodo_pago: metodoPagoSeleccionado,
                    detalles: detalles,
                };

                const response = await axios.post(`${BASE_API_ENDPOINT}/api/ventas/`, ventaData, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                console.log("Respuesta de venta:", response.data);

                showCustomAlert(`¡Venta realizada con éxito! ID: ${response.data.id}`, 'success');
                setProductosEnVenta([]);
                setTotalVenta(0);
                setProductoSeleccionado(null);
                setCantidadProducto(1);
                fetchProductos(); // Recargar productos para actualizar stock
            } catch (err) {
                console.error("Error al realizar venta:", err.response ? err.response.data : err.message);
                setError("Error al realizar venta: " + (err.response?.data?.detail || err.message));
                showCustomAlert("Error al realizar venta.", 'error');
            }
        });
        setShowConfirmModal(true);
    };

    // Obtener productos actuales para paginación del carrito
    const indexOfLastItemCart = currentPageCart * itemsPerPageCart;
    const indexOfFirstItemCart = indexOfLastItemCart - itemsPerPageCart;
    const currentProductsInCart = productosEnVenta.slice(indexOfFirstItemCart, indexOfLastItemCart);
    const totalPagesCart = Math.ceil(productosEnVenta.length / itemsPerPageCart);

    const paginateCart = (pageNumber) => setCurrentPageCart(pageNumber);

    // Obtener productos actuales para paginación de productos disponibles
    const indexOfLastItemAvailable = currentPageAvailable * itemsPerPageAvailable;
    const indexOfFirstItemAvailable = indexOfLastItemAvailable - itemsPerPageAvailable;
    const currentAvailableProducts = productos.slice(indexOfFirstItemAvailable, indexOfLastItemAvailable);
    const totalPagesAvailable = Math.ceil(productos.length / itemsPerPageAvailable);

    const paginateAvailable = (pageNumber) => setCurrentPageAvailable(pageNumber);


    // Renderización condicional basada en el estado de carga y autenticación
    if (authLoading || (isAuthenticated && !user)) {
        return <p style={styles.loadingMessage}>Cargando datos del usuario...</p>;
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

    // Depuración para métodos de pago
    console.log("Estado de métodos de pago (antes del render):", { metodosPago, metodoPagoSeleccionado });

    return (
        <div style={styles.container}>
            <h1>Punto de Venta ({selectedStoreSlug})</h1>

            {error && <p style={styles.errorMessage}>{error}</p>}

            {/* Sección de Búsqueda y Añadir Producto */}
            <div style={styles.searchAddSection}>
                <h3>Buscar y Añadir Producto</h3>
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
                        <h4>Producto Seleccionado:</h4>
                        <p><strong>Nombre:</strong> {productoSeleccionado.nombre}</p>
                        <p><strong>Precio:</strong> ${parseFloat(productoSeleccionado.precio).toFixed(2)}</p>
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
                            <button onClick={() => handleAgregarProducto(productoSeleccionado, cantidadProducto)} style={styles.addButton}>Añadir a la Venta</button>
                        </div>
                    </div>
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
                        {metodosPago.length > 0 ? (
                            metodosPago.map(metodo => (
                                <option key={metodo.id} value={metodo.nombre}>{metodo.nombre}</option>
                            ))
                        ) : (
                            <option value="">Cargando métodos de pago...</option>
                        )}
                    </select>
                </div>
                <button onClick={handleRealizarVenta} style={styles.completeSaleButton}>Realizar Venta</button>
            </div>

            {/* Sección de Productos en Venta (el carrito) */}
            <div style={styles.saleListSection}>
                <h2>Productos en el Carrito</h2>
                {productosEnVenta.length === 0 ? (
                    <p style={styles.noDataMessage}>Ningún producto en la venta actual.</p>
                ) : (
                    <>
                        <table style={styles.table}>
                            <thead>
                                <tr style={styles.tableHeaderRow}>
                                    <th style={styles.th}>Producto</th>
                                    <th style={styles.th}>Talla</th>
                                    <th style={styles.th}>Cantidad</th>
                                    <th style={styles.th}>Precio Unitario</th>
                                    <th style={styles.th}>Subtotal</th>
                                    <th style={styles.th}>Acciones</th>
                                </tr>
                            </thead>
                            <tbody>
                                {currentProductsInCart.map(item => (
                                    <tr key={item.id} style={styles.tableRow}>
                                        <td style={styles.td}>{item.nombre}</td>
                                        <td style={styles.td}>{item.talle}</td>
                                        <td style={styles.td}>
                                            <div style={styles.quantityControlButtons}>
                                                <button onClick={() => handleDecreaseQuantity(item.id)} style={styles.quantityButton}>-</button>
                                                <span>{item.cantidad}</span>
                                                <button onClick={() => handleIncreaseQuantity(item.id)} style={styles.quantityButton}>+</button>
                                            </div>
                                        </td>
                                        <td style={styles.td}>${parseFloat(item.precio).toFixed(2)}</td>
                                        <td style={styles.td}>${(parseFloat(item.precio) * item.cantidad).toFixed(2)}</td>
                                        <td style={styles.td}>
                                            <button onClick={() => handleEliminarProductoDeVenta(item.id)} style={styles.deleteItemButton}>Eliminar</button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                        {totalPagesCart > 1 && (
                            <div style={styles.paginationControls}>
                                <button
                                    onClick={() => paginateCart(currentPageCart - 1)}
                                    disabled={currentPageCart === 1}
                                    style={styles.paginationButton}
                                >
                                    Anterior
                                </button>
                                {Array.from({ length: totalPagesCart }, (_, i) => (
                                    <button
                                        key={i + 1}
                                        onClick={() => paginateCart(i + 1)}
                                        style={currentPageCart === i + 1 ? { ...styles.paginationButton, ...styles.paginationButtonActive } : styles.paginationButton}
                                    >
                                        {i + 1}
                                    </button>
                                ))}
                                <button
                                    onClick={() => paginateCart(currentPageCart + 1)}
                                    disabled={currentPageCart === totalPagesCart}
                                    style={styles.paginationButton}
                                >
                                    Siguiente
                                </button>
                            </div>
                        )}
                    </>
                )}
            </div>

            {/* Nueva Sección: Productos Disponibles */}
            <div style={styles.availableProductsSection}>
                <h2>Productos Disponibles</h2>
                {productos.length === 0 ? (
                    <p style={styles.noDataMessage}>Ningún producto disponible en esta tienda.</p>
                ) : (
                    <>
                        <div style={styles.productListGrid}>
                            {currentAvailableProducts.map(p => (
                                <div key={p.id} style={styles.productCard}>
                                    <h3>{p.nombre}</h3>
                                    <p>Talla: {p.talle}</p>
                                    <p>Precio: ${parseFloat(p.precio).toFixed(2)}</p>
                                    <p>Stock: {p.stock}</p>
                                    <button
                                        onClick={() => handleAgregarProducto(p, 1)}
                                        style={p.stock <= 0 ? { ...styles.addToSaleButton, ...styles.addToSaleButtonDisabled } : styles.addToSaleButton}
                                        disabled={p.stock <= 0}
                                    >
                                        {p.stock > 0 ? 'Añadir (1)' : 'Sin Stock'}
                                    </button>
                                </div>
                            ))}
                        </div>
                        {totalPagesAvailable > 1 && (
                            <div style={styles.paginationControls}>
                                <button
                                    onClick={() => paginateAvailable(currentPageAvailable - 1)}
                                    disabled={currentPageAvailable === 1}
                                    style={styles.paginationButton}
                                >
                                    Anterior
                                </button>
                                {Array.from({ length: totalPagesAvailable }, (_, i) => (
                                    <button
                                        key={i + 1}
                                        onClick={() => paginateAvailable(i + 1)}
                                        style={currentPageAvailable === i + 1 ? { ...styles.paginationButton, ...styles.paginationButtonActive } : styles.paginationButton}
                                    >
                                        {i + 1}
                                    </button>
                                ))}
                                <button
                                    onClick={() => paginateAvailable(currentPageAvailable + 1)}
                                    disabled={currentPageAvailable === totalPagesAvailable}
                                    style={styles.paginationButton}
                                >
                                    Siguiente
                                </button>
                            </div>
                        )}
                    </>
                )}
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

            {/* Caja de Mensaje de Alerta */}
            {showAlertMessage && (
                <div style={{ ...styles.alertBox, backgroundColor: alertType === 'error' ? '#dc3545' : (alertType === 'info' ? '#17a2b8' : '#28a745') }}>
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
    availableProductsSection: {
        marginBottom: '30px',
        border: '1px solid #e0e0e0',
        padding: '20px',
        borderRadius: '8px',
        backgroundColor: '#f9f9f9',
    },
    productListGrid: {
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
        gap: '20px',
        marginTop: '15px',
    },
    productCard: {
        border: '1px solid #ddd',
        borderRadius: '8px',
        padding: '15px',
        textAlign: 'center',
        boxShadow: '0 2px 5px rgba(0,0,0,0.05)',
        backgroundColor: '#fff',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
    },
    addToSaleButton: {
        marginTop: '10px',
        padding: '8px 15px',
        backgroundColor: '#007bff',
        color: 'white',
        border: 'none',
        borderRadius: '5px',
        cursor: 'pointer',
        transition: 'background-color 0.2s ease',
    },
    addToSaleButtonDisabled: {
        backgroundColor: '#ccc',
        cursor: 'not-allowed',
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
    quantityControlButtons: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '5px',
    },
    quantityButton: {
        width: '30px',
        height: '30px',
        borderRadius: '50%',
        border: '1px solid #007bff',
        backgroundColor: '#007bff',
        color: 'white',
        fontSize: '1em',
        fontWeight: 'bold',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        transition: 'background-color 0.2s ease',
    },
    paginationControls: {
        display: 'flex',
        justifyContent: 'center',
        marginTop: '20px',
        gap: '10px',
    },
    paginationButton: {
        padding: '8px 15px',
        border: '1px solid #007bff',
        borderRadius: '5px',
        backgroundColor: 'white',
        color: '#007bff',
        cursor: 'pointer',
        transition: 'background-color 0.2s ease, color 0.2s ease',
    },
    paginationButtonActive: {
        backgroundColor: '#007bff',
        color: 'white',
    },
    summarySection: {
        border: '1px solid #e0e0e0',
        padding: '20px',
        borderRadius: '8px',
        backgroundColor: '#f9f9f9',
        textAlign: 'right',
        marginBottom: '30px',
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
        color: 'white',
        padding: '15px 25px',
        borderRadius: '8px',
        boxShadow: '0 2px 10px rgba(0, 0, 0, 0.1)',
        zIndex: 1001,
        opacity: 0,
        animation: 'fadeInOut 3s forwards',
    },
    '@keyframes fadeInOut': {
        '0%': { opacity: 0, transform: 'translateY(-20px)' },
        '10%': { opacity: 1, transform: 'translateY(0)' },
        '90%': { opacity: 1, transform: 'translateY(0)' },
        '100%': { opacity: 0, transform: 'translateY(-20px)' },
    },
    '@keyframes fadeIn': {
        '0%': { opacity: 0, transform: 'scale(0.9)' },
        '100%': { opacity: 1, transform: 'scale(1)' },
    },
};

export default PuntoVenta;
