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
    const { user, token, isAuthenticated, loading: authLoading, selectedStoreSlug, stores } = useAuth();
    const { cart, addToCart, removeFromCart, updateQuantity, clearCart, calculateTotal, applyDiscount, discountPercentage, finalTotal } = useSales();

    const [products, setProducts] = useState([]);
    const [loadingProducts, setLoadingProducts] = useState(true);
    const [error, setError] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedCategory, setSelectedCategory] = useState('');
    const [categories, setCategories] = useState([]);
    const [paymentMethods, setPaymentMethods] = useState([]);
    const [selectedPaymentMethod, setSelectedPaymentMethod] = useState('');

    const [showConfirmModal, setShowConfirmModal] = useState(false);
    const [confirmMessage, setConfirmMessage] = useState('');
    const [confirmAction, setConfirmAction] = useState(() => () => {});

    const [showAlertMessage, setShowAlertMessage] = useState(false);
    const [alertMessage, setAlertMessage] = useState('');
    const [alertType, setAlertType] = useState('success');

    const [currentPage, setCurrentPage] = useState(1);
    const [productsPerPage] = useState(8); // Productos por página

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

    const fetchProducts = useCallback(async () => {
        if (!token || !selectedStoreSlug || !stores.length) {
            setLoadingProducts(false);
            return;
        }

        const store = stores.find(s => s.nombre === selectedStoreSlug);
        if (!store) {
            console.warn("PuntoVenta: No se encontró la tienda con el slug:", selectedStoreSlug);
            setLoadingProducts(false);
            setError("No se pudo cargar la tienda seleccionada.");
            return;
        }
        const storeId = store.id;

        setLoadingProducts(true);
        setError(null);
        try {
            const params = {
                tienda: storeId,
                search: searchTerm,
                categoria: selectedCategory,
            };
            const response = await axios.get(`${BASE_API_ENDPOINT}/api/productos/`, {
                headers: { 'Authorization': `Bearer ${token}` },
                params: params
            });
            setProducts(response.data.results || response.data);
        } catch (err) {
            setError('Error al cargar productos: ' + (err.response ? JSON.stringify(err.response.data) : err.message));
            console.error('Error fetching products:', err.response || err.message);
        } finally {
            setLoadingProducts(false);
        }
    }, [token, selectedStoreSlug, stores, searchTerm, selectedCategory]);

    const fetchCategories = useCallback(async () => {
        if (!token) return;
        try {
            const response = await axios.get(`${BASE_API_ENDPOINT}/api/categorias/`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            setCategories(response.data.results || response.data);
        } catch (err) {
            console.error("Error al cargar categorías:", err.response ? err.response.data : err.message);
        }
    }, [token]);

    const fetchPaymentMethods = useCallback(async () => {
        if (!token) return;
        try {
            const response = await axios.get(`${BASE_API_ENDPOINT}/api/metodos-pago/`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            setPaymentMethods(response.data.results || response.data);
            if (response.data.results && response.data.results.length > 0) {
                setSelectedPaymentMethod(response.data.results[0].nombre); // Seleccionar el primer método por defecto
            }
        } catch (err) {
            console.error("Error al cargar métodos de pago:", err.response ? err.response.data : err.message);
            setError(`Error al cargar métodos de pago: ${err.response?.data ? JSON.stringify(err.response.data) : err.message}`);
        }
    }, [token]);

    useEffect(() => {
        if (!authLoading && isAuthenticated && user && selectedStoreSlug) {
            fetchProducts();
            fetchCategories();
            fetchPaymentMethods();
        } else if (!authLoading && (!isAuthenticated || !user)) {
            setError("Acceso denegado. Por favor, inicia sesión con un usuario autorizado.");
            setLoadingProducts(false);
        } else if (!authLoading && isAuthenticated && user && !selectedStoreSlug) {
            setLoadingProducts(false);
        }
    }, [isAuthenticated, user, authLoading, selectedStoreSlug, fetchProducts, fetchCategories, fetchPaymentMethods]);

    const handleSearchChange = (e) => {
        setSearchTerm(e.target.value);
    };

    const handleCategoryChange = (e) => {
        setSelectedCategory(e.target.value);
    };

    const handlePaymentMethodChange = (e) => {
        setSelectedPaymentMethod(e.target.value);
    };

    const handleBarcodeSearch = async () => {
        if (!token || !selectedStoreSlug || !searchTerm) {
            showCustomAlert('Ingresa un código de barras para buscar.', 'info');
            return;
        }
        const store = stores.find(s => s.nombre === selectedStoreSlug);
        if (!store) {
            showCustomAlert("No se pudo encontrar la tienda seleccionada.", 'error');
            return;
        }
        const storeSlug = selectedStoreSlug; // Usamos el slug directamente

        setLoadingProducts(true);
        setError(null);
        try {
            const response = await axios.get(`${BASE_API_ENDPOINT}/api/productos/buscar_por_barcode/`, {
                headers: { 'Authorization': `Bearer ${token}` },
                params: { barcode: searchTerm, tienda_slug: storeSlug }
            });
            if (response.data) {
                addToCart(response.data);
                setSearchTerm(''); // Limpiar el campo de búsqueda después de añadir
                showCustomAlert('Producto añadido al carrito.', 'success');
            } else {
                showCustomAlert('Producto no encontrado.', 'error');
            }
        } catch (err) {
            const errorMessage = err.response?.data?.error || err.message;
            showCustomAlert(`Error al buscar producto: ${errorMessage}`, 'error');
            console.error('Error searching by barcode:', err.response || err.message);
        } finally {
            setLoadingProducts(false);
        }
    };

    const handleProcessSale = async () => {
        if (cart.length === 0) {
            showCustomAlert('El carrito está vacío. Agrega productos para procesar la venta.', 'info');
            return;
        }
        if (!selectedPaymentMethod) {
            showCustomAlert('Selecciona un método de pago.', 'info');
            return;
        }
        if (!selectedStoreSlug) {
            showCustomAlert('No hay tienda seleccionada. Por favor, selecciona una.', 'error');
            return;
        }

        const store = stores.find(s => s.nombre === selectedStoreSlug);
        if (!store) {
            showCustomAlert("No se pudo encontrar la tienda seleccionada.", 'error');
            return;
        }
        const storeName = store.nombre; // Usamos el nombre de la tienda

        setConfirmMessage(`¿Confirmar venta por $${finalTotal.toFixed(2)} con ${discountPercentage}% de descuento?`);
        setConfirmAction(() => async () => {
            setShowConfirmModal(false); // Cerrar el modal antes de ejecutar la acción
            try {
                const saleDetails = cart.map(item => {
                    // --- LÍNEAS DE DEPURACIÓN AÑADIDAS ---
                    console.log(`DEBUG: item.precio_venta para ${item.nombre}:`, item.precio_venta);
                    console.log(`DEBUG: typeof item.precio_venta para ${item.nombre}:`, typeof item.precio_venta);
                    // --- FIN LÍNEAS DE DEPURACIÓN ---
                    return {
                        producto: item.id,
                        cantidad: item.quantity,
                        // CAMBIO CLAVE AQUÍ: Asegurarse de que precio_unitario sea un número flotante
                        precio_unitario: parseFloat(item.precio_venta), 
                    };
                });

                const payload = {
                    tienda: storeName, // Enviar el nombre de la tienda
                    metodo_pago_nombre: selectedPaymentMethod,
                    detalles: saleDetails,
                    descuento_porcentaje: parseFloat(discountPercentage), // Asegurarse de que sea un número
                    total: parseFloat(finalTotal), // Asegurarse de que sea un número
                };

                console.log("Payload de venta:", payload);

                const response = await axios.post(`${BASE_API_ENDPOINT}/api/ventas/`, payload, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });

                showCustomAlert('Venta procesada con éxito!', 'success');
                clearCart(); // Limpiar carrito después de la venta
                setSelectedPaymentMethod(paymentMethods.length > 0 ? paymentMethods[0].nombre : ''); // Resetear método de pago
                fetchProducts(); // Recargar productos para reflejar cambios de stock

            } catch (err) {
                console.error('Error al procesar la venta: ', err.response ? err.response.data : err);
                showCustomAlert('Error al procesar la venta: ' + (err.response?.data ? JSON.stringify(err.response.data) : err.message), 'error');
            }
        });
        setShowConfirmModal(true);
    };

    // Paginación
    const indexOfLastProduct = currentPage * productsPerPage;
    const indexOfFirstProduct = indexOfLastProduct - productsPerPage;
    const currentProducts = products.slice(indexOfFirstProduct, indexOfLastProduct);

    const totalPages = Math.ceil(products.length / productsPerPage);

    const paginate = (pageNumber) => setCurrentPage(pageNumber);

    if (authLoading || (isAuthenticated && !user)) {
        return <div style={styles.loadingMessage}>Cargando datos de usuario...</div>;
    }

    if (!isAuthenticated || !user.is_staff) { // Solo staff puede usar el punto de venta
        return <div style={styles.accessDeniedMessage}>Acceso denegado. Solo el personal autorizado puede acceder al Punto de Venta.</div>;
    }

    if (!selectedStoreSlug) {
        return (
            <div style={styles.noStoreSelectedMessage}>
                <h2>Por favor, selecciona una tienda en la barra de navegación para usar el Punto de Venta.</h2>
            </div>
        );
    }

    if (loadingProducts) {
        return <div style={styles.loadingMessage}>Cargando productos de {selectedStoreSlug}...</div>;
    }

    if (error) {
        return <div style={styles.errorMessage}>{error}</div>;
    }

    return (
        <div style={styles.container}>
            <h1>Punto de Venta ({selectedStoreSlug})</h1>

            {/* Sección de Búsqueda y Filtros de Productos */}
            <div style={styles.productFilterSection}>
                <input
                    type="text"
                    placeholder="Buscar por nombre o código de barras"
                    value={searchTerm}
                    onChange={handleSearchChange}
                    onKeyPress={(e) => {
                        if (e.key === 'Enter') {
                            if (searchTerm.length > 0 && !isNaN(searchTerm)) { // Si es numérico, intenta buscar por barcode
                                handleBarcodeSearch();
                            } else {
                                fetchProducts(); // Si no, busca por nombre
                            }
                        }
                    }}
                    style={styles.searchInput}
                />
                <button onClick={fetchProducts} style={styles.searchButton}>Buscar</button>
                <button onClick={handleBarcodeSearch} style={styles.barcodeSearchButton}>Buscar por Código</button>

                <select value={selectedCategory} onChange={handleCategoryChange} style={styles.categorySelect}>
                    <option value="">Todas las Categorías</option>
                    {categories.map(cat => (
                        <option key={cat.id} value={cat.id}>{cat.nombre}</option>
                    ))}
                </select>
            </div>

            {/* Lista de Productos */}
            <div style={styles.productList}>
                {currentProducts.length > 0 ? (
                    currentProducts.map(product => (
                        <div key={product.id} style={styles.productCard}>
                            <img 
                                src={product.imagen || `https://placehold.co/100x100/e0e0e0/555555?text=No+Img`} 
                                alt={product.nombre} 
                                style={styles.productImage}
                                onError={(e) => { e.target.onerror = null; e.target.src = `https://placehold.co/100x100/e0e0e0/555555?text=No+Img`; }}
                            />
                            <div style={styles.productInfo}>
                                <h3 style={styles.productName}>{product.nombre}</h3>
                                <p style={styles.productPrice}>${parseFloat(product.precio_venta).toFixed(2)}</p>
                                <p style={styles.productStock}>Stock: {product.stock}</p>
                                <button
                                    onClick={() => addToCart(product)}
                                    disabled={product.stock <= 0}
                                    style={styles.addToCartButton}
                                >
                                    Agregar al Carrito
                                </button>
                            </div>
                        </div>
                    ))
                ) : (
                    <p style={styles.noProductsMessage}>No se encontraron productos para los filtros seleccionados.</p>
                )}
            </div>

            {/* Controles de Paginación */}
            <div style={styles.paginationContainer}>
                {Array.from({ length: totalPages }, (_, i) => (
                    <button
                        key={i + 1}
                        onClick={() => paginate(i + 1)}
                        style={{
                            ...styles.paginationButton,
                            ...(currentPage === i + 1 ? styles.paginationButtonActive : {}),
                        }}
                    >
                        {i + 1}
                    </button>
                ))}
            </div>

            {/* Carrito de Compras */}
            <div style={styles.cartSection}>
                <h2 style={styles.cartHeader}>Carrito de Compras</h2>
                {cart.length === 0 ? (
                    <p style={styles.emptyCartMessage}>El carrito está vacío.</p>
                ) : (
                    <>
                        <table style={styles.cartTable}>
                            <thead>
                                <tr>
                                    <th style={styles.cartTh}>Producto</th>
                                    <th style={styles.cartTh}>Talle</th>
                                    <th style={styles.cartTh}>Cantidad</th>
                                    <th style={styles.cartTh}>Precio Unitario</th>
                                    <th style={styles.cartTh}>Subtotal</th>
                                    <th style={styles.cartTh}>Acciones</th>
                                </tr>
                            </thead>
                            <tbody>
                                {cart.map(item => (
                                    <tr key={item.id}>
                                        <td style={styles.cartTd}>{item.nombre}</td>
                                        <td style={styles.cartTd}>{TALLE_OPTIONS.find(t => t.value === item.talle)?.label || item.talle}</td>
                                        <td style={styles.cartTd}>
                                            <button onClick={() => updateQuantity(item.id, item.quantity - 1)} disabled={item.quantity <= 1} style={styles.quantityButton}>-</button>
                                            <span style={styles.quantityDisplay}>{item.quantity}</span>
                                            <button onClick={() => updateQuantity(item.id, item.quantity + 1)} disabled={item.quantity >= item.stock} style={styles.quantityButton}>+</button>
                                        </td>
                                        <td style={styles.cartTd}>${parseFloat(item.precio_venta).toFixed(2)}</td>
                                        <td style={styles.cartTd}>${(item.quantity * parseFloat(item.precio_venta)).toFixed(2)}</td>
                                        <td style={styles.cartTd}>
                                            <button onClick={() => removeFromCart(item.id)} style={styles.removeButton}>Eliminar</button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                        <div style={styles.cartSummary}>
                            <p style={styles.cartTotal}>Subtotal: ${calculateTotal().toFixed(2)}</p>
                            <div style={styles.discountInputGroup}>
                                <label htmlFor="discount" style={styles.discountLabel}>Descuento (%):</label>
                                <input
                                    type="number"
                                    id="discount"
                                    value={discountPercentage}
                                    onChange={(e) => applyDiscount(e.target.value)}
                                    min="0"
                                    max="100"
                                    step="0.01"
                                    style={styles.discountInput}
                                />
                            </div>
                            <p style={styles.cartTotal}>Total Final: ${finalTotal.toFixed(2)}</p>
                            <div style={styles.paymentMethodSelect}>
                                <label htmlFor="paymentMethod" style={styles.paymentMethodLabel}>Método de Pago:</label>
                                <select
                                    id="paymentMethod"
                                    value={selectedPaymentMethod}
                                    onChange={handlePaymentMethodChange}
                                    style={styles.paymentMethodDropdown}
                                >
                                    {paymentMethods.map(method => (
                                        <option key={method.id} value={method.nombre}>{method.nombre}</option>
                                    ))}
                                </select>
                            </div>
                            <div style={styles.cartActions}>
                                <button onClick={handleProcessSale} style={styles.processSaleButton}>Procesar Venta</button>
                                <button onClick={clearCart} style={styles.clearCartButton}>Vaciar Carrito</button>
                            </div>
                        </div>
                    </>
                )}
            </div>

            {/* Modal de Confirmación (Personalizado) */}
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

            {/* Cuadro de Mensaje de Alerta (Personalizado) */}
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
        display: 'grid',
        gridTemplateColumns: '1fr 400px', // Columna para productos y columna fija para carrito
        gap: '20px',
        padding: '20px',
        fontFamily: 'Inter, sans-serif',
        maxWidth: '1400px',
        margin: 'auto',
        backgroundColor: '#f4f7f6',
        borderRadius: '10px',
        boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
        '@media (max-width: 1024px)': {
            gridTemplateColumns: '1fr', // Una columna en pantallas más pequeñas
        },
    },
    loadingMessage: {
        gridColumn: '1 / -1', // Ocupa todo el ancho
        padding: '50px',
        textAlign: 'center',
        fontSize: '1.2em',
        color: '#555',
    },
    accessDeniedMessage: {
        gridColumn: '1 / -1',
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
        gridColumn: '1 / -1',
        padding: '50px',
        textAlign: 'center',
        color: '#777',
        fontSize: '1.2em',
    },
    errorMessage: {
        gridColumn: '1 / -1',
        color: '#dc3545',
        marginBottom: '10px',
        border: '1px solid #dc3545',
        padding: '15px',
        borderRadius: '8px',
        backgroundColor: '#ffe3e6',
        textAlign: 'center',
        fontWeight: 'bold',
    },
    productFilterSection: {
        gridColumn: '1 / 2',
        display: 'flex',
        flexWrap: 'wrap',
        gap: '15px',
        marginBottom: '20px',
        padding: '15px',
        backgroundColor: '#ffffff',
        borderRadius: '8px',
        boxShadow: '0 2px 5px rgba(0,0,0,0.05)',
        alignItems: 'center',
    },
    searchInput: {
        flexGrow: 1,
        padding: '10px',
        border: '1px solid #ced4da',
        borderRadius: '5px',
        fontSize: '1em',
        minWidth: '200px',
    },
    searchButton: {
        padding: '10px 15px',
        backgroundColor: '#007bff',
        color: 'white',
        border: 'none',
        borderRadius: '5px',
        cursor: 'pointer',
        fontSize: '1em',
        transition: 'background-color 0.3s ease',
    },
    barcodeSearchButton: {
        padding: '10px 15px',
        backgroundColor: '#28a745',
        color: 'white',
        border: 'none',
        borderRadius: '5px',
        cursor: 'pointer',
        fontSize: '1em',
        transition: 'background-color 0.3s ease',
    },
    categorySelect: {
        padding: '10px',
        border: '1px solid #ced4da',
        borderRadius: '5px',
        fontSize: '1em',
        minWidth: '150px',
    },
    productList: {
        gridColumn: '1 / 2',
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
        gap: '20px',
        backgroundColor: '#ffffff',
        padding: '20px',
        borderRadius: '8px',
        boxShadow: '0 2px 5px rgba(0,0,0,0.05)',
    },
    productCard: {
        border: '1px solid #e0e0e0',
        borderRadius: '8px',
        padding: '15px',
        textAlign: 'center',
        backgroundColor: '#fff',
        boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        transition: 'transform 0.2s ease',
    },
    productCardHover: {
        transform: 'translateY(-5px)',
    },
    productImage: {
        width: '100px',
        height: '100px',
        objectFit: 'cover',
        borderRadius: '5px',
        marginBottom: '10px',
    },
    productInfo: {
        flexGrow: 1,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        width: '100%',
    },
    productName: {
        fontSize: '1.1em',
        fontWeight: 'bold',
        marginBottom: '5px',
        color: '#333',
    },
    productPrice: {
        fontSize: '1.2em',
        color: '#007bff',
        fontWeight: 'bold',
        marginBottom: '5px',
    },
    productStock: {
        fontSize: '0.9em',
        color: '#6c757d',
        marginBottom: '10px',
    },
    addToCartButton: {
        backgroundColor: '#007bff',
        color: 'white',
        padding: '8px 12px',
        border: 'none',
        borderRadius: '5px',
        cursor: 'pointer',
        fontSize: '0.9em',
        marginTop: 'auto',
        transition: 'background-color 0.3s ease',
    },
    addToCartButtonDisabled: {
        backgroundColor: '#cccccc',
        cursor: 'not-allowed',
    },
    noProductsMessage: {
        gridColumn: '1 / -1',
        textAlign: 'center',
        padding: '20px',
        color: '#777',
        fontStyle: 'italic',
    },
    paginationContainer: {
        gridColumn: '1 / 2',
        display: 'flex',
        justifyContent: 'center',
        marginTop: '20px',
        gap: '10px',
    },
    paginationButton: {
        padding: '8px 12px',
        border: '1px solid #007bff',
        borderRadius: '5px',
        backgroundColor: 'white',
        color: '#007bff',
        cursor: 'pointer',
        transition: 'background-color 0.3s ease, color 0.3s ease',
    },
    paginationButtonActive: {
        backgroundColor: '#007bff',
        color: 'white',
    },
    cartSection: {
        gridColumn: '2 / 3',
        backgroundColor: '#ffffff',
        padding: '20px',
        borderRadius: '8px',
        boxShadow: '0 2px 5px rgba(0,0,0,0.05)',
        display: 'flex',
        flexDirection: 'column',
        height: 'fit-content', // Ajusta la altura al contenido
        position: 'sticky', // Hace que el carrito se quede fijo al hacer scroll
        top: '20px', // Distancia desde la parte superior
        '@media (max-width: 1024px)': {
            gridColumn: '1 / -1', // Ocupa todo el ancho en pantallas pequeñas
            position: 'static', // Desactiva sticky en pantallas pequeñas
        },
    },
    cartHeader: {
        textAlign: 'center',
        marginBottom: '20px',
        color: '#333',
        fontSize: '1.5em',
    },
    emptyCartMessage: {
        textAlign: 'center',
        color: '#777',
        fontStyle: 'italic',
        padding: '20px',
    },
    cartTable: {
        width: '100%',
        borderCollapse: 'collapse',
        marginBottom: '15px',
    },
    cartTh: {
        backgroundColor: '#f2f2f2',
        padding: '10px',
        textAlign: 'left',
        borderBottom: '1px solid #ddd',
        fontSize: '0.9em',
    },
    cartTd: {
        padding: '10px',
        borderBottom: '1px solid #eee',
        fontSize: '0.9em',
        verticalAlign: 'middle',
    },
    quantityButton: {
        backgroundColor: '#007bff',
        color: 'white',
        border: 'none',
        borderRadius: '3px',
        padding: '3px 8px',
        cursor: 'pointer',
        fontSize: '0.8em',
        margin: '0 5px',
        transition: 'background-color 0.3s ease',
    },
    quantityButtonDisabled: {
        backgroundColor: '#cccccc',
        cursor: 'not-allowed',
    },
    quantityDisplay: {
        minWidth: '20px',
        display: 'inline-block',
        textAlign: 'center',
    },
    removeButton: {
        backgroundColor: '#dc3545',
        color: 'white',
        border: 'none',
        borderRadius: '5px',
        padding: '5px 10px',
        cursor: 'pointer',
        fontSize: '0.8em',
        transition: 'background-color 0.3s ease',
    },
    cartSummary: {
        borderTop: '1px solid #eee',
        paddingTop: '15px',
        marginTop: '15px',
        textAlign: 'right',
    },
    cartTotal: {
        fontSize: '1.3em',
        fontWeight: 'bold',
        color: '#333',
        marginBottom: '10px',
    },
    discountInputGroup: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'flex-end',
        marginBottom: '10px',
        gap: '10px',
    },
    discountLabel: {
        fontWeight: 'bold',
        color: '#555',
    },
    discountInput: {
        width: '80px',
        padding: '8px',
        border: '1px solid #ccc',
        borderRadius: '4px',
        fontSize: '1em',
        textAlign: 'right',
    },
    paymentMethodSelect: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'flex-end',
        marginBottom: '20px',
        gap: '10px',
    },
    paymentMethodLabel: {
        fontWeight: 'bold',
        color: '#555',
    },
    paymentMethodDropdown: {
        padding: '8px',
        border: '1px solid #ccc',
        borderRadius: '4px',
        fontSize: '1em',
        minWidth: '150px',
    },
    cartActions: {
        display: 'flex',
        justifyContent: 'space-between',
        gap: '10px',
    },
    processSaleButton: {
        flexGrow: 1,
        padding: '12px 20px',
        backgroundColor: '#28a745',
        color: 'white',
        border: 'none',
        borderRadius: '5px',
        cursor: 'pointer',
        fontSize: '1.1em',
        fontWeight: 'bold',
        transition: 'background-color 0.3s ease',
    },
    clearCartButton: {
        flexGrow: 1,
        padding: '12px 20px',
        backgroundColor: '#6c757d',
        color: 'white',
        border: 'none',
        borderRadius: '5px',
        cursor: 'pointer',
        fontSize: '1.1em',
        fontWeight: 'bold',
        transition: 'background-color 0.3s ease',
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
    modalConfirmButtonHover: {
        backgroundColor: '#218838',
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
        fontSize: '1em',
        transition: 'background-color 0.3s ease',
    },
};

export default PuntoVenta;
