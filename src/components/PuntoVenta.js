// BONITO_AMOR/frontend/src/components/PuntoVenta.js
import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { useAuth } from '../AuthContext';
import { useSales } from './SalesContext'; // Importar el contexto de ventas

// NEW TALLE_OPTIONS
const TALLE_OPTIONS = [
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
    // Usar el contexto de ventas para gestionar los carritos
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

    const [productos, setProductos] = useState([]); // Lista de todos los productos disponibles
    const [metodosPago, setMetodosPago] = useState([]); // Lista de métodos de pago disponibles
    const [metodoPagoSeleccionado, setMetodoPagoSeleccionado] = useState(''); // Método de pago seleccionado para la venta
    const [busquedaProducto, setBusquedaProducto] = useState(''); // Para búsqueda por nombre/código de barras en la lista de productos
    const [productoSeleccionado, setProductoSeleccionado] = useState(null); // Producto seleccionado por búsqueda de código de barras

    const [loadingProducts, setLoadingProducts] = useState(true);
    const [error, setError] = useState(null);

    // Estados para el modal de confirmación
    const [showConfirmModal, setShowConfirmModal] = useState(false);
    const [confirmMessage, setConfirmMessage] = useState('');
    const [confirmAction, setConfirmAction] = useState(() => () => {});

    // Estados para el cuadro de mensaje de alerta personalizado
    const [showAlertMessage, setShowAlertMessage] = useState(false);
    const [alertMessage, setAlertMessage] = useState('');
    const [alertType, setAlertType] = useState('success'); // 'success', 'error', 'info'

    // Estados para el modal de creación de nueva venta
    const [showNewCartModal, setShowNewCartModal] = useState(false);
    const [newCartAliasInput, setNewCartAliasInput] = useState('');

    // --- NUEVO ESTADO PARA EL DESCUENTO ---
    const [descuentoPorcentaje, setDescuentoPorcentaje] = useState(0); // Porcentaje de descuento

    // --- NUEVOS ESTADOS PARA LA PAGINACIÓN DE PRODUCTOS DISPONIBLES ---
    const [currentPage, setCurrentPage] = useState(1);
    const [productsPerPage] = useState(10); // 10 productos por página

    // Función para mostrar un mensaje de alerta personalizado
    const showCustomAlert = (message, type = 'success') => {
        setAlertMessage(message);
        setAlertType(type); // Establecer el tipo de alerta
        setShowAlertMessage(true);
        setTimeout(() => {
            setShowAlertMessage(false);
            setAlertMessage('');
            setAlertType('success'); // Reiniciar a predeterminado
        }, 3000);
    };

    // Efecto para cargar productos y métodos de pago al iniciar
    useEffect(() => {
        const fetchData = async () => {
            if (!token || !selectedStoreSlug) {
                setLoadingProducts(false);
                return;
            }
            setLoadingProducts(true);
            setError(null);
            try {
                // Cargar productos
                const productosResponse = await axios.get(`${BASE_API_ENDPOINT}/api/productos/`, {
                    headers: { 'Authorization': `Bearer ${token}` },
                    params: { tienda_slug: selectedStoreSlug }
                });
                setProductos(productosResponse.data.results || productosResponse.data);

                // Cargar métodos de pago
                const metodosPagoResponse = await axios.get(`${BASE_API_ENDPOINT}/api/metodos-pago/`, {
                    headers: { 'Authorization': `Bearer ${token}` },
                });
                // KEY CORRECTION: Ensure metodosPago is an array, accessing .results if it exists
                const fetchedMetodosPago = metodosPagoResponse.data.results || metodosPagoResponse.data;
                setMetodosPago(fetchedMetodosPago);
                if (fetchedMetodosPago.length > 0) {
                    setMetodoPagoSeleccionado(fetchedMetodosPago[0].nombre); // Select the first by default
                }

            } catch (err) {
                console.error("Error al cargar datos:", err.response ? err.response.data : err.message);
                setError('Error al cargar productos o métodos de pago.');
            } finally {
                setLoadingProducts(false);
            }
        };

        // Allow access if staff OR superuser
        if (!authLoading && isAuthenticated && user && (user.is_superuser || user.is_staff) && selectedStoreSlug) {
            fetchData();
        } else if (!authLoading && (!isAuthenticated || !user || (!(user.is_superuser || user.is_staff)))) {
            setLoadingProducts(false);
            setError("Por favor, inicia sesión y selecciona una tienda para gestionar el punto de venta.");
        }
    }, [token, selectedStoreSlug, authLoading, isAuthenticated, user]); // Add 'user' to dependencies

    // Handle product search by barcode (search button)
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

    // Add product to active cart from barcode search or table
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

        addProductToCart(product, quantity); // Use context function
        setBusquedaProducto(''); // Clear search after adding
        setProductoSeleccionado(null); // Clear selected product
        showCustomAlert('Producto añadido al carrito.', 'success');
    };

    // Decrement quantity of a product in the active cart
    const handleDecrementQuantity = (productId) => {
        if (!activeCart) return;
        decrementProductQuantity(activeCartId, productId); // Use context function
        showCustomAlert('Cantidad de producto actualizada.', 'info');
    };

    // Remove product from active cart
    const handleRemoveProductoEnVenta = (productId) => {
        if (!activeCart) return;
        setConfirmMessage('¿Estás seguro de que quieres quitar este producto del carrito?');
        setConfirmAction(() => () => {
            removeProductFromCart(activeCartId, productId); // Use context function
            showCustomAlert('Producto eliminado del carrito.', 'info');
            setShowConfirmModal(false);
        });
        setShowConfirmModal(true);
    };

    // Calculate total sale with discount
    const calculateTotalWithDiscount = useCallback(() => {
        if (!activeCart) return 0;
        let subtotal = activeCart.items.reduce((sum, item) => sum + (item.quantity * parseFloat(item.product.precio)), 0);
        const discountAmount = subtotal * (descuentoPorcentaje / 100);
        return (subtotal - discountAmount);
    }, [activeCart, descuentoPorcentaje]);

    // Process sale
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

        // Confirmation before processing
        setConfirmMessage(`¿Confirmas la venta por un total de $${finalTotal.toFixed(2)} con ${metodoPagoSeleccionado}?` +
                          (descuentoPorcentaje > 0 ? ` (Descuento aplicado: ${descuentoPorcentaje}%)` : ''));
        setConfirmAction(() => async () => {
            setShowConfirmModal(false); // Close confirmation modal
            try {
                const ventaData = {
                    tienda: selectedStoreSlug, // <-- KEY CHANGE: Send 'tienda' with the name (slug)
                    metodo_pago_nombre: metodoPagoSeleccionado,
                    total: finalTotal, // Send the total already with the discount applied
                    descuento_porcentaje: descuentoPorcentaje, 
                    detalles: activeCart.items.map(item => ({
                        producto: item.product.id,
                        cantidad: item.quantity,
                        precio_unitario: item.product.precio, 
                    })),
                };

                const response = await axios.post(`${BASE_API_ENDPOINT}/api/ventas/`, ventaData, {
                    headers: { 'Authorization': `Bearer ${token}` },
                });

                console.log('Venta procesada con éxito:', response.data);
                showCustomAlert('Venta procesada con éxito. ID: ' + response.data.id, 'success');
                finalizeCart(activeCartId); // Mark cart as finalized in context
                setMetodoPagoSeleccionado(metodosPago.length > 0 ? metodosPago[0].nombre : ''); // Reset payment method
                setDescuentoPorcentaje(0); // Reset discount
            } catch (err) {
                console.error('Error al procesar la venta:', err.response ? err.response.data : err.message);
                showCustomAlert('Error al procesar la venta: ' + (err.response && err.response.data ? JSON.stringify(err.response.data) : err.message), 'error');
            }
        });
        setShowConfirmModal(true);
    };

    // Handle creation of a new cart with alias
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

    // Handle deletion of active cart
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

    // Filter available products by name or barcode
    const filteredProductosDisponibles = productos.filter(product => {
        const searchTermLower = busquedaProducto.toLowerCase();
        return (
            product.nombre.toLowerCase().includes(searchTermLower) ||
            (product.codigo_barras && product.codigo_barras.toLowerCase().includes(searchTermLower)) ||
            (product.talle && product.talle.toLowerCase().includes(searchTermLower))
        );
    });

    // --- Pagination logic for available products ---
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

    // Allow access if staff OR superuser
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

            {/* Active Sales Management Section */}
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

            {/* Modal for creating new sale */}
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

            {/* Barcode Product Search Section */}
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

            {/* Current Sale Cart */}
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
                        <h4 style={styles.totalVenta}>Subtotal: ${activeCart.total.toFixed(2)}</h4> {/* Show subtotal before discount */}

                        {/* Payment Method Selector */}
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

                        {/* Discount Section */}
                        <div style={styles.discountContainer}>
                            <label htmlFor="descuento" style={styles.discountLabel}>Aplicar Descuento (%):</label>
                            <input
                                type="number"
                                id="descuento"
                                value={descuentoPorcentaje}
                                onChange={(e) => setDescuentoPorcentaje(Math.max(0, Math.min(100, parseFloat(e.target.value) || 0)))} // Ensure it's between 0 and 100
                                style={styles.discountInput}
                                min="0"
                                max="100"
                            />
                        </div>

                        <h4 style={styles.finalTotalVenta}>Total Final: ${calculateTotalWithDiscount().toFixed(2)}</h4> {/* Show total with discount */}

                        <button onClick={handleProcesarVenta} style={styles.processSaleButton}>
                            Procesar Venta
                        </button>
                    </>
                ) : (
                    <p style={styles.noDataMessage}>El carrito activo está vacío. Busca y añade productos.</p>
                )}
            </div>

            {/* Available Products List */}
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
                                    {/* <th style={styles.th}>Código</th> */} {/* COLUMN REMOVED! */}
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
                                            {/* <td style={styles.td}>{product.codigo_barras || 'N/A'}</td> */} {/* CELL REMOVED! */}
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
                                        <td colSpan="5" style={styles.noDataMessage}> {/* Colspan adjusted to 5 */}
                                            No se encontraron productos con el filtro aplicado.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>

                        {/* Pagination Controls for Available Products */}
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

            {/* Confirmation Modal */}
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

            {/* Custom Alert Message Box */}
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
    successMessage: {
        color: '#28a745',
        marginBottom: '10px',
        border: '1px solid #28a745',
        padding: '15px',
        borderRadius: '8px',
        backgroundColor: '#e6ffe6',
    },
    formContainer: {
        marginBottom: '30px',
        border: '1px solid #e0e0e0',
        padding: '20px',
        borderRadius: '8px',
        backgroundColor: '#f9f9f9',
    },
    formGroup: {
        marginBottom: '15px',
    },
    label: {
        display: 'block',
        marginBottom: '5px',
        fontWeight: 'bold',
        color: '#555',
    },
    input: {
        width: '100%',
        padding: '10px',
        border: '1px solid #ccc',
        borderRadius: '4px',
        boxSizing: 'border-box',
    },
    submitButton: {
        padding: '10px 20px',
        backgroundColor: '#007bff',
        color: 'white',
        border: 'none',
        borderRadius: '5px',
        cursor: 'pointer',
        fontSize: '16px',
        transition: 'background-color 0.3s ease',
    },
    submitButtonHover: {
        backgroundColor: '#0056b3',
    },
    noDataMessage: {
        textAlign: 'center',
        marginTop: '20px',
        color: '#777',
        fontStyle: 'italic',
    },
    tableActions: {
        marginBottom: '15px',
        display: 'flex',
        justifyContent: 'flex-start',
    },
    printSelectedButton: {
        padding: '10px 20px',
        backgroundColor: '#007bff',
        color: 'white',
        border: 'none',
        borderRadius: '5px',
        cursor: 'pointer',
        fontSize: '16px',
        transition: 'background-color 0.3s ease',
    },
    printSelectedButtonHover: {
        backgroundColor: '#0056b3',
    },
    table: {
        width: '100%',
        borderCollapse: 'collapse',
        textAlign: 'left',
        border: '1px solid #ddd',
        borderRadius: '8px',
        overflow: 'hidden',
        boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
    },
    tableHeaderRow: {
        backgroundColor: '#f2f2f2',
    },
    th: {
        padding: '12px',
        border: '1px solid #ddd',
        fontWeight: 'bold',
        color: '#333',
    },
    td: {
        padding: '12px',
        border: '1px solid #ddd',
        verticalAlign: 'middle',
    },
    quantityInput: {
        width: '60px',
        padding: '5px',
        border: '1px solid #ccc',
        borderRadius: '3px',
    },
    barcodeContainer: { // This style is no longer directly used in the table, but kept if EtiquetasImpresion uses it
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        minWidth: '150px',
    },
    noBarcodeText: { // This style is no longer directly used in the table
        color: '#888',
        fontStyle: 'italic',
    },
    editControls: {
        display: 'flex',
        alignItems: 'center',
        gap: '5px',
    },
    editInput: {
        width: '80px',
        padding: '5px',
        border: '1px solid #ccc',
        borderRadius: '3px',
    },
    saveButton: {
        padding: '5px 8px',
        backgroundColor: '#28a745',
        color: 'white',
        border: 'none',
        borderRadius: '3px',
        cursor: 'pointer',
        transition: 'background-color 0.3s ease',
    },
    saveButtonHover: {
        backgroundColor: '#218838',
    },
    cancelButton: {
        padding: '5px 8px',
        backgroundColor: '#6c757d',
        color: 'white',
        border: 'none',
        borderRadius: '3px',
        cursor: 'pointer',
        transition: 'background-color 0.3s ease',
    },
    cancelButtonHover: {
        backgroundColor: '#5a6268',
    },
    displayControls: {
        display: 'flex',
        alignItems: 'center',
        gap: '5px',
    },
    editButton: {
        padding: '5px 8px',
        backgroundColor: '#ffc107',
        color: 'black',
        border: 'none',
        borderRadius: '3px',
        cursor: 'pointer',
        transition: 'background-color 0.3s ease',
    },
    editButtonHover: {
        backgroundColor: '#e0a800',
    },
    deleteButton: {
        padding: '8px 12px',
        backgroundColor: '#dc3545',
        color: 'white',
        border: 'none',
        borderRadius: '5px',
        cursor: 'pointer',
        transition: 'background-color 0.3s ease',
    },
    deleteButtonHover: {
        backgroundColor: '#c82333',
    },
    printPreviewContainer: {
        padding: '20px',
    },
    backButton: {
        marginBottom: '10px',
        padding: '10px 20px',
        backgroundColor: '#dc3545',
        color: 'white',
        border: 'none',
        borderRadius: '5px',
        cursor: 'pointer',
        transition: 'background-color 0.3s ease',
    },
    backButtonHover: {
        backgroundColor: '#c82333',
    },
    printButton: {
        marginLeft: '10px',
        marginBottom: '10px',
        padding: '10px 20px',
        backgroundColor: '#28a745',
        color: 'white',
        border: 'none',
        borderRadius: '5px',
        cursor: 'pointer',
        transition: 'background-color 0.3s ease',
    },
    printButtonHover: {
        backgroundColor: '#218838',
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
        backgroundColor: '#28a745', // Default to success green
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
