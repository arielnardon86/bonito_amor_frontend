// BONITO_AMOR/frontend/src/components/PuntoVenta.js
import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { useAuth } from '../AuthContext';
import { useSales } from './SalesContext'; // Importar el contexto de ventas

const TALLE_OPTIONS = [
    { value: 'XS', label: 'Extra Pequeño' },
    { value: 'S', label: 'Pequeño' },
    { value: 'M', label: 'Mediano' },
    { value: 'L', label: 'Grande' },
    { value: 'XL', label: 'Extra Grande' },
    { value: 'UNICA', label: 'Talla Única' },
    { value: 'NUM36', label: '36' },
    { value: 'NUM38', label: '38' },
    { value: 'NUM40', label: '40' },
    { value: 'NUM42', label: '42' },
    { value: 'NUM44', label: '44' },
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

    // --- NUEVOS ESTADOS PARA LA PAGINACIÓN DE PRODUCTOS DISPONIBLES ---
    const [currentPage, setCurrentPage] = useState(1);
    const [productsPerPage] = useState(10); // 10 productos por página

    // Función para mostrar un mensaje de alerta personalizado
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
                // CORRECCIÓN CLAVE: Asegurarse de que metodosPago sea un array, accediendo a .results si existe
                const fetchedMetodosPago = metodosPagoResponse.data.results || metodosPagoResponse.data;
                setMetodosPago(fetchedMetodosPago);
                if (fetchedMetodosPago.length > 0) {
                    setMetodoPagoSeleccionado(fetchedMetodosPago[0].nombre); // Seleccionar el primero por defecto
                }

            } catch (err) {
                console.error("Error al cargar datos:", err.response ? err.response.data : err.message);
                setError('Error al cargar productos o métodos de pago.');
            } finally {
                setLoadingProducts(false);
            }
        };

        // Permite acceso si es staff O superusuario
        if (!authLoading && isAuthenticated && user && (user.is_superuser || user.is_staff) && selectedStoreSlug) {
            fetchData();
        } else if (!authLoading && (!isAuthenticated || !user || (!(user.is_superuser || user.is_staff)))) {
            setLoadingProducts(false);
            setError("Por favor, inicia sesión y selecciona una tienda para gestionar el punto de venta.");
        }
    }, [token, selectedStoreSlug, authLoading, isAuthenticated, user]); // Añadir 'user' a las dependencias

    // Manejar la búsqueda de producto por código de barras (botón buscar)
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

    // Añadir producto al carrito activo desde la búsqueda por código de barras o tabla
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

        addProductToCart(product, quantity); // Usa la función del contexto
        setBusquedaProducto(''); // Limpiar la búsqueda después de añadir
        setProductoSeleccionado(null); // Limpiar producto seleccionado
        showCustomAlert('Producto añadido al carrito.', 'success');
    };

    // Decrementar cantidad de un producto en el carrito activo
    const handleDecrementQuantity = (productId) => {
        if (!activeCart) return;
        decrementProductQuantity(activeCartId, productId); // Usa la función del contexto
        showCustomAlert('Cantidad de producto actualizada.', 'info');
    };

    // Eliminar producto del carrito activo
    const handleRemoveProductoEnVenta = (productId) => {
        if (!activeCart) return;
        setConfirmMessage('¿Estás seguro de que quieres quitar este producto del carrito?');
        setConfirmAction(() => () => {
            removeProductFromCart(activeCartId, productId); // Usa la función del contexto
            showCustomAlert('Producto eliminado del carrito.', 'info');
            setShowConfirmModal(false);
        });
        setShowConfirmModal(true);
    };

    // Procesar la venta
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

        // Confirmación antes de procesar
        setConfirmMessage(`¿Confirmas la venta por un total de $${activeCart.total.toFixed(2)} con ${metodoPagoSeleccionado}?`);
        setConfirmAction(() => async () => {
            setShowConfirmModal(false); // Cerrar modal de confirmación
            try {
                const ventaData = {
                    tienda_slug: selectedStoreSlug,
                    metodo_pago_nombre: metodoPagoSeleccionado,
                    detalles: activeCart.items.map(item => ({
                        producto: item.product.id,
                        cantidad: item.quantity,
                        precio_unitario: item.product.precio, // Asegúrate de que este campo exista en tu producto
                    })),
                };

                const response = await axios.post(`${BASE_API_ENDPOINT}/api/ventas/`, ventaData, {
                    headers: { 'Authorization': `Bearer ${token}` },
                });

                console.log('Venta procesada con éxito:', response.data);
                showCustomAlert('Venta procesada con éxito. ID: ' + response.data.id, 'success');
                finalizeCart(activeCartId); // Marcar el carrito como finalizado en el contexto
                setMetodoPagoSeleccionado(metodosPago.length > 0 ? metodosPago[0].nombre : ''); // Resetear método de pago
            } catch (err) {
                console.error('Error al procesar la venta:', err.response ? err.response.data : err.message);
                showCustomAlert('Error al procesar la venta: ' + (err.response && err.response.data ? JSON.stringify(err.response.data) : err.message), 'error');
            }
        });
        setShowConfirmModal(true);
    };

    // Manejar la creación de un nuevo carrito con alias
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

    // Manejar la eliminación del carrito activo
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

    // Filtrar productos disponibles por nombre o código de barras
    const filteredProductosDisponibles = productos.filter(product => {
        const searchTermLower = busquedaProducto.toLowerCase();
        return (
            product.nombre.toLowerCase().includes(searchTermLower) ||
            (product.codigo_barras && product.codigo_barras.toLowerCase().includes(searchTermLower)) ||
            (product.talle && product.talle.toLowerCase().includes(searchTermLower))
        );
    });

    // --- Lógica de paginación para productos disponibles ---
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

    // Permitir acceso si es staff O superusuario
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

            {/* Sección de Gestión de Ventas Activas */}
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

            {/* Modal para crear nueva venta */}
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

            {/* Sección de Búsqueda de Productos por Código de Barras */}
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

            {/* Carrito de Venta Actual */}
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
                        <h4 style={styles.totalVenta}>Total de Venta: ${activeCart.total.toFixed(2)}</h4>

                        {/* Selector de método de pago */}
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

                        <button onClick={handleProcesarVenta} style={styles.processSaleButton}>
                            Procesar Venta
                        </button>
                    </>
                ) : (
                    <p style={styles.noDataMessage}>El carrito activo está vacío. Busca y añade productos.</p>
                )}
            </div>

            {/* Lista de Productos Disponibles */}
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
                                    <th style={styles.th}>Código</th>
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
                                            <td style={styles.td}>{product.codigo_barras || 'N/A'}</td>
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
                                        <td colSpan="6" style={styles.noDataMessage}>
                                            No se encontraron productos con el filtro aplicado.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>

                        {/* Controles de Paginación para Productos Disponibles */}
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
    paymentMethodSelectContainer: {
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
        marginBottom: '20px',
    },
    paymentMethodLabel: {
        fontWeight: 'bold',
        color: '#555',
        fontSize: '1em',
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
