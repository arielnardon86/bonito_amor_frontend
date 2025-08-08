// BONITO_AMOR/frontend/src/components/PuntoVenta.js
import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../AuthContext';
import { useSales } from './SalesContext'; // Importar el contexto de ventas
// NEW TALLE_OPTIONS
const TALLE_OPTIONS = [
    { value: 'UNICO', label: 'UNICO' },
    { value: 'XS', label: 'XS' },
    { value: 'S', label: 'S' },
    { value: 'M', label: 'M' },
    { value: 'L', label: 'L' },
    { value: 'XL', label: 'XL' },
    { value: 'XXL', label: 'XXL' },
    { value: '3XL', label: '3XL' },
    { value: '4XL', label: '4XL' },
    { value: '5XL', label: '5XL' },
    { value: '6XL', label: '6XL' },
    { value: '7XL', label: '7XL' },
    { value: '8XL', label: '8XL' },
    { value: '1', label: '1' },
    { value: '2', label: '2' },
    { value: '3', label: '3' },
    { value: '4', label: '4' },
    { value: '5', label: '5' },
    { value: '6', label: '6' },
    { value: '8', label: '8' },
    { value: '12', label: '12' },
    { value: '14', label: '14' },
    { value: '16', label: '16' },
];

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
    const {
        carts,
        activeCart,
        activeCartId,
        createNewCart,
        selectCart,
        updateCartAlias,
        addProductToCart,
        removeProductFromCart,
        decrementProductQuantity,
        finalizeCart,
        deleteCart
    } = useSales();

    const [productos, setProductos] = useState([]);
    const [metodosPago, setMetodosPago] = useState([]);
    const [metodoPagoSeleccionado, setMetodoPagoSeleccionado] = useState('');
    const [busquedaProducto, setBusquedaProducto] = useState('');
    const [productoSeleccionado, setProductoSeleccionado] = useState(null);

    const [loadingProducts, setLoadingProducts] = useState(true);
    const [error, setError] = useState(null);

    const [showConfirmModal, setShowConfirmModal] = useState(false);
    const [confirmMessage, setConfirmMessage] = useState('');
    const [confirmAction, setConfirmAction] = useState(() => () => {});

    const [showAlertMessage, setShowAlertMessage] = useState(false);
    const [alertMessage, setAlertMessage] = useState('');
    const [alertType, setAlertType] = useState('success');

    const [showNewCartModal, setShowNewCartModal] = useState(false);
    const [newCartAliasInput, setNewCartAliasInput] = useState('');

    const [descuentoPorcentaje, setDescuentoPorcentaje] = useState(0);

    const [currentPage, setCurrentPage] = useState(1);
    const [productsPerPage] = useState(10);

    const showCustomAlert = (message, type = 'success') => {
        setAlertMessage(message);
        setAlertType(type);
        setShowAlertMessage(true);
        setTimeout(() => {
            setShowAlertMessage(false);
            setAlertMessage('');
            setAlertType('success');
        }, 3000);
    };

    useEffect(() => {
        const fetchData = async () => {
            if (!token || !selectedStoreSlug) {
                setLoadingProducts(false);
                return;
            }
            setLoadingProducts(true);
            setError(null);
            try {
                const productosResponse = await axios.get(`${BASE_API_ENDPOINT}/api/productos/`, {
                    headers: { 'Authorization': `Bearer ${token}` },
                    params: { tienda_slug: selectedStoreSlug }
                });
                setProductos(productosResponse.data.results || productosResponse.data);

                const metodosPagoResponse = await axios.get(`${BASE_API_ENDPOINT}/api/metodos-pago/`, {
                    headers: { 'Authorization': `Bearer ${token}` },
                });
                const fetchedMetodosPago = metodosPagoResponse.data.results || metodosPagoResponse.data;
                setMetodosPago(fetchedMetodosPago);
                if (fetchedMetodosPago.length > 0) {
                    setMetodoPagoSeleccionado(fetchedMetodosPago[0].nombre);
                }

            } catch (err) {
                console.error("Error al cargar datos:", err.response ? err.response.data : err.message);
                setError('Error al cargar productos o métodos de pago.');
            } finally {
                setLoadingProducts(false);
            }
        };

        if (!authLoading && isAuthenticated && user && (user.is_superuser || user.is_staff) && selectedStoreSlug) {
            fetchData();
        } else if (!authLoading && (!isAuthenticated || !user || (!(user.is_superuser || user.is_staff)))) {
            setLoadingProducts(false);
            setError("Por favor, inicia sesión y selecciona una tienda para gestionar el punto de venta.");
        }
    }, [token, selectedStoreSlug, authLoading, isAuthenticated, user]);

    const handleBuscarProducto = async () => {
        if (!busquedaProducto) {
            showCustomAlert('Por favor, ingresa un código de barras o nombre para buscar.', 'info');
            return;
        }
        if (!selectedStoreSlug) {
            showCustomAlert('Por favor, selecciona una tienda.', 'error');
            return;
        }

        try {
            const response = await axios.get(`${BASE_API_ENDPOINT}/api/productos/buscar_por_barcode/`, {
                headers: { 'Authorization': `Bearer ${token}` },
                params: { barcode: busquedaProducto, tienda_slug: selectedStoreSlug }
            });
            setProductoSeleccionado(response.data);
            showCustomAlert('Producto encontrado.', 'success');
        } catch (err) {
            console.error("Error al buscar producto:", err.response ? err.response.data : err.message);
            setProductoSeleccionado(null);
            showCustomAlert('Producto no encontrado o error en la búsqueda.', 'error');
        }
    };

    const handleAddProductoEnVenta = (product, quantity = 1) => {
        if (!activeCart) {
            showCustomAlert('Por favor, selecciona o crea un carrito antes de añadir productos.', 'info');
            return;
        }
        if (product.stock === 0) {
            showCustomAlert('Este producto no tiene stock disponible.', 'error');
            return;
        }
        if (quantity <= 0) {
            showCustomAlert('La cantidad debe ser mayor que cero.', 'error');
            return;
        }

        const currentItemInCart = activeCart.items.find(item => item.product.id === product.id);
        const currentQuantityInCart = currentItemInCart ? currentItemInCart.quantity : 0;

        if (currentQuantityInCart + quantity > product.stock) {
            showCustomAlert(`No hay suficiente stock. Disponible: ${product.stock}, en carrito: ${currentQuantityInCart}.`, 'error');
            return;
        }

        addProductToCart(product, quantity);
        setBusquedaProducto('');
        setProductoSeleccionado(null);
        showCustomAlert('Producto añadido al carrito.', 'success');
    };

    const handleDecrementQuantity = (productId) => {
        if (!activeCart) return;
        decrementProductQuantity(activeCartId, productId);
        showCustomAlert('Cantidad de producto actualizada.', 'info');
    };

    const handleRemoveProductoEnVenta = (productId) => {
        if (!activeCart) return;
        setConfirmMessage('¿Estás seguro de que quieres quitar este producto del carrito?');
        setConfirmAction(() => () => {
            removeProductFromCart(activeCartId, productId);
            showCustomAlert('Producto eliminado del carrito.', 'info');
            setShowConfirmModal(false);
        });
        setShowConfirmModal(true);
    };

    const calculateTotalWithDiscount = useCallback(() => {
        if (!activeCart) return 0;
        let subtotal = activeCart.items.reduce((sum, item) => sum + (item.quantity * parseFloat(item.product.precio)), 0);
        const discountAmount = subtotal * (descuentoPorcentaje / 100);
        return (subtotal - discountAmount);
    }, [activeCart, descuentoPorcentaje]);

    // Corrección clave en esta función para que coincida con el backend
    const handleProcesarVenta = async () => {
        if (!activeCart || activeCart.items.length === 0) {
            showCustomAlert('El carrito activo está vacío. Agrega productos para procesar la venta.', 'error');
            return;
        }
        if (!metodoPagoSeleccionado) {
            showCustomAlert('Por favor, selecciona un método de pago.', 'error');
            return;
        }
        if (!selectedStoreSlug) {
            showCustomAlert('Por favor, selecciona una tienda.', 'error');
            return;
        }

        const finalTotal = calculateTotalWithDiscount();

        setConfirmMessage(`¿Confirmas la venta por un total de $${finalTotal.toFixed(2)} con ${metodoPagoSeleccionado}?` +
                          (descuentoPorcentaje > 0 ? ` (Descuento aplicado: ${descuentoPorcentaje}%)` : ''));
        setConfirmAction(() => async () => {
            setShowConfirmModal(false);
            try {
                // Objeto de datos corregido para la petición a la API
                const ventaData = {
                    tienda_slug: selectedStoreSlug,
                    metodo_pago_nombre: metodoPagoSeleccionado,
                    descuento: descuentoPorcentaje,
                    // CORRECCIÓN: Se revierte a 'productos' ya que el backend lo requiere
                    productos: activeCart.items.map(item => ({
                        producto: item.product.id,
                        cantidad: item.quantity,
                    })),
                };

                const response = await axios.post(`${BASE_API_ENDPOINT}/api/ventas/`, ventaData, {
                    headers: { 'Authorization': `Bearer ${token}` },
                });

                console.log('Venta procesada con éxito:', response.data);
                showCustomAlert('Venta procesada con éxito. ID: ' + response.data.id, 'success');
                finalizeCart(activeCartId);
                setMetodoPagoSeleccionado(metodosPago.length > 0 ? metodosPago[0].nombre : '');
                setDescuentoPorcentaje(0);
            } catch (err) {
                console.error('Error al procesar la venta:', err.response ? err.response.data : err.message);
                showCustomAlert('Error al procesar la venta: ' + (err.response && err.response.data ? JSON.stringify(err.response.data) : err.message), 'error');
            }
        });
        setShowConfirmModal(true);
    };

    const handleCreateNewCartWithAlias = () => {
        if (newCartAliasInput.trim() === '') {
            showCustomAlert('El alias de la venta no puede estar vacío.', 'error');
            return;
        }
        createNewCart(newCartAliasInput.trim());
        setNewCartAliasInput('');
        setShowNewCartModal(false);
        showCustomAlert('Nueva venta creada.', 'success');
    };

    const handleDeleteActiveCart = () => {
        if (activeCart) {
            setConfirmMessage(`¿Estás seguro de que quieres eliminar la venta "${activeCart.alias || activeCart.name}"? Esta acción no se puede deshacer.`);
            setConfirmAction(() => () => {
                deleteCart(activeCartId);
                showCustomAlert('Venta eliminada.', 'info');
                setShowConfirmModal(false);
            });
            setShowConfirmModal(true);
        }
    };

    const filteredProductosDisponibles = productos.filter(product => {
        const searchTermLower = busquedaProducto.toLowerCase();
        return (
            product.nombre.toLowerCase().includes(searchTermLower) ||
            (product.codigo_barras && product.codigo_barras.toLowerCase().includes(searchTermLower)) ||
            (product.talle && product.talle.toLowerCase().includes(searchTermLower))
        );
    });

    const indexOfLastProduct = currentPage * productsPerPage;
    const indexOfFirstProduct = indexOfLastProduct - productsPerPage;
    const currentProducts = filteredProductosDisponibles.slice(indexOfFirstProduct, indexOfLastProduct);

    const totalPages = Math.ceil(filteredProductosDisponibles.length / productsPerPage);

    const paginate = (pageNumber) => setCurrentPage(pageNumber);

    const nextPage = () => {
        if (currentPage < totalPages) {
            setCurrentPage(currentPage + 1);
        }
    };

    const prevPage = () => {
        if (currentPage > 1) {
            setCurrentPage(currentPage - 1);
        }
    };

    if (authLoading || (isAuthenticated && !user)) {
        return <div style={styles.loadingMessage}>Cargando datos de usuario...</div>;
    }

    if (!isAuthenticated || !(user.is_superuser || user.is_staff)) {
        return <div style={styles.accessDeniedMessage}>Acceso denegado. No tienes permisos para usar el punto de venta.</div>;
    }

    if (!selectedStoreSlug) {
        return (
            <div style={styles.noStoreSelectedMessage}>
                <h2>Por favor, selecciona una tienda en la barra de navegación para usar el punto de venta.</h2>
            </div>
        );
    }

    if (loadingProducts) {
        return <div style={styles.loadingMessage}>Cargando productos y métodos de pago...</div>;
    }

    if (error) {
        return <div style={styles.errorMessage}>{error}</div>;
    }

    return (
        <div style={styles.container}>
            <h1 style={styles.header}>Punto de Venta ({selectedStoreSlug})</h1>
            <div style={styles.section}>
                <h3 style={styles.sectionHeader}>Gestión de Ventas Activas</h3>
                <div style={styles.cartSelectionContainer}>
                    {carts.map((cart, index) => (
                        <button
                            key={cart.id}
                            onClick={() => selectCart(cart.id)}
                            style={cart.id === activeCartId ? styles.activeCartButton : styles.inactiveCartButton}
                        >
                            {cart.alias || `Venta ${index + 1}`}
                        </button>
                    ))}
                    <button onClick={() => setShowNewCartModal(true)} style={styles.newCartButton}>
                        + Nueva Venta
                    </button>
                </div>

                {activeCart && (
                    <div style={styles.activeCartInfo}>
                        <h4 style={styles.activeCartTitle}>Venta Activa: {activeCart.alias || activeCart.name}</h4>
                        <div style={styles.activeCartActions}>
                            <input
                                type="text"
                                placeholder="Nuevo Alias (opcional)"
                                value={activeCart.alias || ''}
                                onChange={(e) => updateCartAlias(activeCartId, e.target.value)}
                                style={styles.input}
                            />
                            <button onClick={handleDeleteActiveCart} style={styles.deleteCartButton}>
                                Eliminar Venta
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {showNewCartModal && (
                <div style={styles.modalOverlay}>
                    <div style={styles.modalContent}>
                        <h3 style={styles.modalHeader}>Crear Nueva Venta</h3>
                        <input
                            type="text"
                            placeholder="Alias para la venta (ej: Cliente A)"
                            value={newCartAliasInput}
                            onChange={(e) => setNewCartAliasInput(e.target.value)}
                            style={styles.input}
                        />
                        <div style={styles.modalActions}>
                            <button onClick={() => setShowNewCartModal(false)} style={styles.modalCancelButton}>
                                Cancelar
                            </button>
                            <button onClick={handleCreateNewCartWithAlias} style={styles.modalConfirmButton}>
                                Crear Venta
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <div style={styles.section}>
                <h3 style={styles.sectionHeader}>Buscar Producto por Código de Barras</h3>
                <div style={styles.inputGroup}>
                    <input
                        type="text"
                        placeholder="Ingresa código de barras o nombre"
                        value={busquedaProducto}
                        onChange={(e) => setBusquedaProducto(e.target.value)}
                        onKeyPress={(e) => { if (e.key === 'Enter') handleBuscarProducto(); }}
                        style={styles.input}
                    />
                    <button onClick={handleBuscarProducto} style={styles.primaryButton}>
                        Buscar
                    </button>
                </div>
                {productoSeleccionado && (
                    <div style={styles.foundProductCard}>
                        <p style={styles.foundProductText}>
                            <strong>Producto:</strong> {productoSeleccionado.nombre} ({productoSeleccionado.talle}) - ${parseFloat(productoSeleccionado.precio).toFixed(2)}
                        </p>
                        <p style={styles.foundProductText}>
                            Stock Disponible: {productoSeleccionado.stock}
                        </p>
                        <div style={styles.productActions}>
                            <button
                                onClick={() => handleAddProductoEnVenta(productoSeleccionado, 1)}
                                disabled={productoSeleccionado.stock === 0}
                                style={styles.addProductButton}
                            >
                                {productoSeleccionado.stock === 0 ? 'Sin Stock' : 'Añadir 1 Ud.'}
                            </button>
                        </div>
                    </div>
                )}
            </div>

            <div style={styles.section}>
                <h3 style={styles.sectionHeader}>Detalle del Carrito Activo: {activeCart ? (activeCart.alias || activeCart.name) : 'Ninguno Seleccionado'}</h3>
                {activeCart && activeCart.items.length > 0 ? (
                    <>
                        <table style={styles.table}>
                            <thead>
                                <tr style={styles.tableHeaderRow}>
                                    <th style={styles.th}>Producto</th>
                                    <th style={styles.th}>Talle</th>
                                    <th style={styles.th}>Cantidad</th>
                                    <th style={styles.th}>P. Unitario</th>
                                    <th style={styles.th}>Subtotal</th>
                                    <th style={styles.th}>Acciones</th>
                                </tr>
                            </thead>
                            <tbody>
                                {activeCart.items.map((item) => (
                                    <tr key={item.product.id} style={styles.tableRow}>
                                        <td style={styles.td}>{item.product.nombre}</td>
                                        <td style={styles.td}>{item.product.talle}</td>
                                        <td style={styles.td}>
                                            <div style={styles.quantityControl}>
                                                <button onClick={() => handleDecrementQuantity(item.product.id)} style={styles.quantityButton}>-</button>
                                                <span style={styles.quantityText}>{item.quantity}</span>
                                                <button onClick={() => handleAddProductoEnVenta(item.product, 1)} style={styles.quantityButton}>+</button>
                                            </div>
                                        </td>
                                        <td style={styles.td}>${parseFloat(item.product.precio).toFixed(2)}</td>
                                        <td style={styles.td}>${(item.quantity * parseFloat(item.product.precio)).toFixed(2)}</td>
                                        <td style={styles.td}>
                                            <button onClick={() => handleRemoveProductoEnVenta(item.product.id)} style={styles.removeButton}>
                                                Quitar
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                        <h4 style={styles.totalVenta}>Subtotal: ${activeCart.total.toFixed(2)}</h4>
                        <div style={styles.paymentMethodSelectContainer}>
                            <label htmlFor="metodoPago" style={styles.paymentMethodLabel}>Método de Pago:</label>
                            <select
                                id="metodoPago"
                                value={metodoPagoSeleccionado}
                                onChange={(e) => setMetodoPagoSeleccionado(e.target.value)}
                                style={styles.input}
                            >
                                {metodosPago.map(method => (
                                    <option key={method.id} value={method.nombre}>{method.nombre}</option>
                                ))}
                            </select>
                        </div>
                        <div style={styles.discountContainer}>
                            <label htmlFor="descuento" style={styles.discountLabel}>Aplicar Descuento (%):</label>
                            <input
                                type="number"
                                id="descuento"
                                value={descuentoPorcentaje}
                                onChange={(e) => setDescuentoPorcentaje(Math.max(0, Math.min(100, parseFloat(e.target.value) || 0)))}
                                style={styles.discountInput}
                                min="0"
                                max="100"
                            />
                        </div>
                        <h4 style={styles.finalTotalVenta}>Total Final: ${calculateTotalWithDiscount().toFixed(2)}</h4>
                        <button onClick={handleProcesarVenta} style={styles.processSaleButton}>
                            Procesar Venta
                        </button>
                    </>
                ) : (
                    <p style={styles.noDataMessage}>El carrito activo está vacío. Busca y añade productos.</p>
                )}
            </div>

            <div style={styles.section}>
                <h3 style={styles.sectionHeader}>Productos Disponibles</h3>
                <div style={styles.inputGroup}>
                    <input
                        type="text"
                        placeholder="Buscar por nombre, talle o código..."
                        value={busquedaProducto}
                        onChange={(e) => setBusquedaProducto(e.target.value)}
                        style={styles.input}
                    />
                </div>

                {loadingProducts ? (
                    <p style={styles.loadingMessage}>Cargando productos...</p>
                ) : error ? (
                    <p style={styles.errorMessage}>{error}</p>
                ) : (
                    <>
                        <table style={styles.table}>
                            <thead>
                                <tr style={styles.tableHeaderRow}>
                                    <th style={styles.th}>Nombre</th>
                                    <th style={styles.th}>Talle</th>
                                    <th style={styles.th}>Precio</th>
                                    <th style={styles.th}>Stock</th>
                                    <th style={styles.th}>Acción</th>
                                </tr>
                            </thead>
                            <tbody>
                                {currentProducts.length > 0 ? (
                                    currentProducts.map(product => (
                                        <tr key={product.id} style={styles.tableRow}>
                                            <td style={styles.td}>{product.nombre}</td>
                                            <td style={styles.td}>{product.talle}</td>
                                            <td style={styles.td}>${parseFloat(product.precio).toFixed(2)}</td>
                                            <td style={styles.td}>{product.stock}</td>
                                            <td style={styles.td}>
                                                <button
                                                    onClick={() => handleAddProductoEnVenta(product, 1)}
                                                    disabled={product.stock === 0}
                                                    style={product.stock === 0 ? styles.disabledButton : styles.addButton}
                                                >
                                                    {product.stock === 0 ? 'Sin Stock' : 'Añadir'}
                                                </button>
                                            </td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan="5" style={styles.noDataMessage}>
                                            No se encontraron productos con el filtro aplicado.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>

                        {totalPages > 1 && (
                            <div style={styles.paginationContainer}>
                                <button onClick={prevPage} disabled={currentPage === 1} style={styles.paginationButton}>
                                    Anterior
                                </button>
                                <span style={styles.pageNumber}>Página {currentPage} de {totalPages}</span>
                                <button onClick={nextPage} disabled={currentPage === totalPages} style={styles.paginationButton}>
                                    Siguiente
                                </button>
                            </div>
                        )}
                    </>
                )}
            </div>

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
        fontFamily: 'Inter, sans-serif',
        maxWidth: '1200px',
        margin: '20px auto',
        backgroundColor: '#f8f9fa',
        borderRadius: '8px',
        boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
        color: '#333',
    },
    header: {
        textAlign: 'center',
        color: '#2c3e50',
        marginBottom: '30px',
        fontSize: '2.5em',
        fontWeight: 'bold',
    },
    section: {
        backgroundColor: '#ffffff',
        padding: '25px',
        borderRadius: '8px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
        marginBottom: '30px',
    },
    sectionHeader: {
        fontSize: '1.8em',
        color: '#34495e',
        marginBottom: '20px',
        borderBottom: '2px solid #eceff1',
        paddingBottom: '10px',
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
    cartSelectionContainer: {
        display: 'flex',
        flexWrap: 'wrap',
        gap: '10px',
        marginBottom: '15px',
        padding: '10px',
        backgroundColor: '#eaf7ff',
        borderRadius: '5px',
        border: '1px dashed #a7d9ff',
    },
    activeCartButton: {
        padding: '8px 15px',
        backgroundColor: '#007bff',
        color: 'white',
        border: 'none',
        borderRadius: '5px',
        cursor: 'pointer',
        fontWeight: 'bold',
        transition: 'background-color 0.3s ease',
    },
    inactiveCartButton: {
        padding: '8px 15px',
        backgroundColor: '#f0f0f0',
        color: '#333',
        border: '1px solid #ccc',
        borderRadius: '5px',
        cursor: 'pointer',
        transition: 'background-color 0.3s ease',
    },
    newCartButton: {
        padding: '8px 15px',
        backgroundColor: '#28a745',
        color: 'white',
        border: 'none',
        borderRadius: '5px',
        cursor: 'pointer',
        transition: 'background-color 0.3s ease',
    },
    activeCartInfo: {
        marginTop: '15px',
        padding: '15px',
        backgroundColor: '#e6ffe6',
        borderRadius: '8px',
        border: '1px solid #28a745',
    },
    activeCartTitle: {
        marginBottom: '10px',
        color: '#28a745',
        fontSize: '1.2em',
    },
    activeCartActions: {
        display: 'flex',
        gap: '10px',
        marginBottom: '10px',
    },
    deleteCartButton: {
        padding: '8px 15px',
        backgroundColor: '#dc3545',
        color: 'white',
        border: 'none',
        borderRadius: '5px',
        cursor: 'pointer',
        transition: 'background-color 0.3s ease',
    },
    inputGroup: {
        display: 'flex',
        gap: '10px',
        marginBottom: '15px',
        alignItems: 'center',
    },
    input: {
        flexGrow: 1,
        padding: '10px 12px',
        border: '1px solid #dcdcdc',
        borderRadius: '5px',
        fontSize: '1em',
        boxSizing: 'border-box',
    },
    primaryButton: {
        padding: '10px 20px',
        backgroundColor: '#007bff',
        color: 'white',
        border: 'none',
        borderRadius: '5px',
        cursor: 'pointer',
        fontSize: '1em',
        fontWeight: 'bold',
        transition: 'background-color 0.3s ease',
    },
    foundProductCard: {
        border: '1px solid #a7d9ff',
        padding: '15px',
        borderRadius: '8px',
        backgroundColor: '#e7f0ff',
        marginBottom: '15px',
    },
    foundProductText: {
        margin: '5px 0',
        color: '#333',
        fontSize: '1.05em',
    },
    productActions: {
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
        marginTop: '10px',
    },
    addProductButton: {
        padding: '10px 20px',
        backgroundColor: '#28a745',
        color: 'white',
        border: 'none',
        borderRadius: '5px',
        cursor: 'pointer',
        fontSize: '1em',
        fontWeight: 'bold',
        transition: 'background-color 0.3s ease',
    },
    table: {
        width: '100%',
        borderCollapse: 'collapse',
        marginTop: '15px',
        borderRadius: '8px',
        overflow: 'hidden',
        boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
    },
    tableHeaderRow: {
        backgroundColor: '#f2f2f2',
    },
    th: {
        padding: '12px 15px',
        borderBottom: '1px solid #ddd',
        textAlign: 'left',
        fontWeight: 'bold',
        fontSize: '0.95em',
        color: '#555',
    },
    tableRow: {
        backgroundColor: 'inherit',
        transition: 'background-color 0.2s ease',
        '&:nth-child(even)': {
            backgroundColor: '#f9f9f9',
        },
    },
    td: {
        padding: '10px 15px',
        borderBottom: '1px solid #eee',
        verticalAlign: 'middle',
        fontSize: '0.9em',
    },
    quantityControl: {
        display: 'flex',
        alignItems: 'center',
        gap: '5px',
    },
    quantityButton: {
        padding: '5px 10px',
        backgroundColor: '#007bff',
        color: 'white',
        border: 'none',
        borderRadius: '3px',
        cursor: 'pointer',
        fontSize: '0.9em',
        transition: 'background-color 0.3s ease',
    },
    quantityText: {
        minWidth: '20px',
        textAlign: 'center',
        fontWeight: 'bold',
    },
    removeButton: {
        padding: '6px 12px',
        backgroundColor: '#dc3545',
        color: 'white',
        border: 'none',
        borderRadius: '4px',
        cursor: 'pointer',
        fontSize: '0.85em',
        transition: 'background-color 0.3s ease',
    },
    totalVenta: {
        textAlign: 'right',
        marginTop: '20px',
        fontSize: '1.5em',
        color: '#28a745',
        fontWeight: 'bold',
    },
    finalTotalVenta: { // Nuevo estilo para el total final con descuento
        textAlign: 'right',
        marginTop: '10px',
        fontSize: '1.7em',
        color: '#007bff',
        fontWeight: 'bold',
    },
    paymentMethodSelectContainer: {
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
        marginBottom: '10px', // Ajustado para dejar espacio para el descuento
        marginTop: '20px',
    },
    paymentMethodLabel: {
        fontWeight: 'bold',
        color: '#555',
        fontSize: '1em',
    },
    discountContainer: { // Nuevo estilo para el contenedor de descuento
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
        marginBottom: '20px',
    },
    discountLabel: { // Nuevo estilo para la etiqueta de descuento
        fontWeight: 'bold',
        color: '#555',
        fontSize: '1em',
    },
    discountInput: { // Nuevo estilo para el input de descuento
        width: '80px', // Ancho fijo para el porcentaje
        padding: '10px 12px',
        border: '1px solid #dcdcdc',
        borderRadius: '5px',
        fontSize: '1em',
        boxSizing: 'border-box',
        textAlign: 'center',
    },
    processSaleButton: {
        width: '100%',
        padding: '15px',
        backgroundColor: '#007bff',
        color: 'white',
        border: 'none',
        borderRadius: '8px',
        cursor: 'pointer',
        fontSize: '1.2em',
        fontWeight: 'bold',
        transition: 'background-color 0.3s ease',
    },
    noDataMessage: {
        textAlign: 'center',
        color: '#777',
        fontStyle: 'italic',
        padding: '15px',
    },
    addButton: {
        padding: '5px 10px',
        backgroundColor: '#007bff',
        color: 'white',
        border: 'none',
        borderRadius: '3px',
        cursor: 'pointer',
    },
    disabledButton: {
        padding: '5px 10px',
        backgroundColor: '#6c757d',
        color: 'white',
        border: 'none',
        borderRadius: '3px',
        cursor: 'not-allowed',
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
    modalHeader: {
        fontSize: '1.5em',
        color: '#34495e',
        marginBottom: '20px',
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
        backgroundColor: '#28a745', 
        color: 'white',
        padding: '12px 25px',
        border: 'none',
        borderRadius: '6px',
        cursor: 'pointer',
        fontSize: '1em',
        fontWeight: 'bold',
        transition: 'background-color 0.3s ease, transform 0.2s ease',
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
    paginationContainer: {
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: '20px',
        gap: '10px',
    },
    paginationButton: {
        padding: '8px 15px',
        backgroundColor: '#007bff',
        color: 'white',
        border: 'none',
        borderRadius: '5px',
        cursor: 'pointer',
        fontSize: '0.9em',
        transition: 'background-color 0.3s ease',
    },
    pageNumber: {
        fontSize: '1em',
        color: '#555',
        fontWeight: 'bold',
    },
};

export default PuntoVenta;
