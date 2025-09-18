// BONITO_AMOR/frontend/src/components/PuntoVenta.js
import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../AuthContext';
import { useSales } from './SalesContext'; 
import Swal from 'sweetalert2';

const TalleOptions = [
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
    const navigate = useNavigate();

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

    const [descuentoPorcentaje, setDescuentoPorcentaje] = useState('');
    const [descuentoMonto, setDescuentoMonto] = useState(''); 

    // Estado para la paginación de la API
    const [pageInfo, setPageInfo] = useState({
        next: null,
        previous: null,
        count: 0,
        currentPage: 1,
        totalPages: 1,
    });
    
    // Nueva función para obtener productos con paginación
    const fetchProductos = useCallback(async (page = 1, searchQuery = '') => {
        if (!token || !selectedStoreSlug) {
            setLoadingProducts(false);
            return;
        }

        setLoadingProducts(true);
        setError(null);

        try {
            const response = await axios.get(`${BASE_API_ENDPOINT}/api/productos/`, {
                headers: { 'Authorization': `Bearer ${token}` },
                params: {
                    tienda_slug: selectedStoreSlug,
                    search: searchQuery,
                    page: page,
                },
            });

            setProductos(response.data.results);
            const productsPerPage = response.data.results.length > 0 ? response.data.results.length : 1;
            setPageInfo({
                next: response.data.next,
                previous: response.data.previous,
                count: response.data.count,
                currentPage: page,
                totalPages: Math.ceil(response.data.count / 10), 
            });
        } catch (err) {
            console.error("Error al cargar productos:", err.response ? err.response.data : err.message);
            setError('Error al cargar productos.');
        } finally {
            setLoadingProducts(false);
        }
    }, [token, selectedStoreSlug]);

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
                // Llama a la nueva función de paginación
                await fetchProductos(1, '');
                
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
    }, [token, selectedStoreSlug, authLoading, isAuthenticated, user, fetchProductos]);

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

    // MODIFICADO: Lógica para calcular el total con el nuevo descuento por monto
    const calculateTotalWithDiscount = useCallback(() => {
        if (!activeCart) return 0;
        let subtotal = activeCart.items.reduce((sum, item) => sum + (item.quantity * parseFloat(item.product.precio)), 0);
        let finalTotal = subtotal;

        if (descuentoMonto > 0) {
            finalTotal = Math.max(0, subtotal - descuentoMonto);
        } else if (descuentoPorcentaje > 0) {
            const discountAmount = subtotal * (descuentoPorcentaje / 100);
            finalTotal = subtotal - discountAmount;
        }
        return finalTotal;
    }, [activeCart, descuentoPorcentaje, descuentoMonto]);

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

        // MODIFICADO: Mensaje de confirmación para incluir el descuento por monto
        const discountMessage = descuentoMonto > 0 ? `<br>(Descuento por monto aplicado: $${parseFloat(descuentoMonto).toFixed(2)})` :
                                descuentoPorcentaje > 0 ? `<br>(Descuento por porcentaje aplicado: ${parseFloat(descuentoPorcentaje).toFixed(2)}%)` : '';

        Swal.fire({
            title: '¿Confirmar venta?',
            html: `Confirmas la venta por un total de <strong>$${finalTotal.toFixed(2)}</strong> con <strong>${metodoPagoSeleccionado}</strong>?` + discountMessage,
            icon: 'question',
            showCancelButton: true,
            confirmButtonText: 'Sí, confirmar',
            cancelButtonText: 'Cancelar',
        }).then(async (result) => {
            if (result.isConfirmed) {
                try {
                    const ventaData = {
                        tienda_slug: selectedStoreSlug,
                        metodo_pago: metodoPagoSeleccionado,
                        descuento_porcentaje: descuentoPorcentaje,
                        descuento_monto: descuentoMonto, // NUEVO: Incluimos el descuento por monto
                        detalles: activeCart.items.map(item => ({
                            producto: item.product.id,
                            cantidad: item.quantity,
                            precio_unitario: parseFloat(item.product.precio),
                        })),
                    };

                    const response = await axios.post(`${BASE_API_ENDPOINT}/api/ventas/`, ventaData, {
                        headers: { 'Authorization': `Bearer ${token}` },
                    });
                    
                    showCustomAlert('Venta procesada con éxito. ID: ' + response.data.id, 'success');
                    
                    // Construimos el objeto de venta para el recibo con una fecha válida
                    const ventaParaRecibo = {
                        id: response.data.id,
                        fecha_venta: new Date().toISOString(),
                        tienda_nombre: selectedStoreSlug,
                        metodo_pago: metodoPagoSeleccionado,
                        descuento_porcentaje: descuentoPorcentaje,
                        descuento_monto: descuentoMonto, // NUEVO: Pasamos el descuento por monto
                        total: finalTotal,
                        detalles: activeCart.items.map(item => ({
                            producto_nombre: item.product.nombre,
                            cantidad: item.quantity,
                            precio_unitario: parseFloat(item.product.precio)
                        }))
                    };

                    finalizeCart(activeCartId);
                    setMetodoPagoSeleccionado(metodosPago.length > 0 ? metodosPago[0].nombre : '');
                    setDescuentoPorcentaje(0);
                    setDescuentoMonto(0); // NUEVO: Reiniciamos el descuento por monto

                    Swal.fire({
                        title: 'Venta procesada!',
                        text: '¿Desea imprimir el recibo?',
                        icon: 'success',
                        showCancelButton: true,
                        confirmButtonText: 'Sí, imprimir',
                        cancelButtonText: 'No',
                    }).then((printResult) => {
                        if (printResult.isConfirmed) {
                            navigate('/recibo', { state: { venta: ventaParaRecibo } });
                        }
                    });

                } catch (err) {
                    console.error('Error al procesar la venta:', err.response ? err.response.data : err.message);
                    Swal.fire({
                        title: 'Error!',
                        text: 'Error al procesar la venta: ' + (err.response && err.response.data ? JSON.stringify(err.response.data) : err.message),
                        icon: 'error',
                        confirmButtonText: 'Ok'
                    });
                }
            }
        });
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

    // Filtra productos localmente según la búsqueda
    const filteredProductosDisponibles = productos.filter(product => {
        const searchTermLower = busquedaProducto.toLowerCase();
        return (
            product.nombre.toLowerCase().includes(searchTermLower) ||
            (product.codigo_barras && product.codigo_barras.toLowerCase().includes(searchTermLower)) ||
            (product.talle && product.talle.toLowerCase().includes(searchTermLower))
        );
    });

    // Nueva lógica de paginación del lado del frontend
    const indexOfLastProduct = pageInfo.currentPage * 10; 
    const indexOfFirstProduct = indexOfLastProduct - 10;
    const currentProducts = filteredProductosDisponibles.slice(indexOfFirstProduct, indexOfLastProduct);

    // handlers de paginación que se vinculan con el backend
    const nextPageHandler = () => {
        if (pageInfo.next) {
            fetchProductos(pageInfo.currentPage + 1, busquedaProducto);
        }
    };

    const prevPageHandler = () => {
        if (pageInfo.previous) {
            fetchProductos(pageInfo.currentPage - 1, busquedaProducto);
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
                                style={styles.inputField}
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
                            style={styles.inputField}
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
                        style={styles.inputField}
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
                                style={productoSeleccionado.stock === 0 ? styles.disabledButton : styles.addProductButton}
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
                        <div style={styles.tableResponsive}>
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
                        </div>
                        <h4 style={styles.totalVenta}>Subtotal: ${activeCart.total.toFixed(2)}</h4>
                        <div style={styles.paymentMethodSelectContainer}>
                            <label htmlFor="metodoPago" style={styles.paymentMethodLabel}>Método de Pago:</label>
                            <select
                                id="metodoPago"
                                value={metodoPagoSeleccionado}
                                onChange={(e) => setMetodoPagoSeleccionado(e.target.value)}
                                style={styles.inputField}
                            >
                                <option value="">Selecciona un método de pago</option>
                                {metodosPago.map(method => (
                                    <option key={method.id} value={method.nombre}>{method.nombre}</option>
                                ))}
                            </select>
                        </div>
                        <div style={styles.discountContainer}>
                            {/* NUEVO: Campo para descuento por monto */}
                            <label htmlFor="descuentoMonto" style={styles.discountLabel}>Aplicar Descuento (Monto):</label>
                            <input
                                type="number"
                                id="descuentoMonto"
                                value={descuentoMonto}
                                onChange={(e) => {
                                    setDescuentoMonto(Math.max(0, parseFloat(e.target.value) || 0));
                                    setDescuentoPorcentaje(0); // Reinicia el descuento por porcentaje
                                }}
                                style={styles.discountInput}
                                min="0"
                            />
                            <span style={{ margin: '0 10px', fontWeight: 'bold' }}>O</span>
                            {/* CAMBIO: Lógica para reiniciar el descuento por monto cuando se modifica el porcentaje */}
                            <label htmlFor="descuentoPorcentaje" style={styles.discountLabel}>Aplicar Descuento (%):</label>
                            <input
                                type="number"
                                id="descuentoPorcentaje"
                                value={descuentoPorcentaje}
                                onChange={(e) => {
                                    setDescuentoPorcentaje(Math.max(0, Math.min(100, parseFloat(e.target.value) || 0)));
                                    setDescuentoMonto(0); // Reinicia el descuento por monto
                                }}
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
                        placeholder="Buscar por nombre o talle..."
                        value={busquedaProducto}
                        onChange={(e) => setBusquedaProducto(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                                // Llama a la función de búsqueda de API
                                fetchProductos(1, busquedaProducto);
                            }
                        }}
                        style={styles.inputField}
                    />
                     <button onClick={() => fetchProductos(1, busquedaProducto)} style={styles.primaryButton}>
                        Buscar
                    </button>
                </div>

                {loadingProducts ? (
                    <p style={styles.loadingMessage}>Cargando productos...</p>
                ) : error ? (
                    <p style={styles.errorMessage}>{error}</p>
                ) : (
                    <>
                        <div style={styles.tableResponsive}>
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
                                    {productos.length > 0 ? (
                                        productos.map(product => (
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
                        </div>

                        {pageInfo.totalPages > 1 && (
                            <div style={styles.paginationContainer}>
                                <button onClick={nextPageHandler} disabled={!pageInfo.next} style={styles.paginationButton}>
                                    Siguiente
                                </button>
                                <span style={styles.pageNumber}>Página {pageInfo.currentPage} de {pageInfo.totalPages}</span>
                                <button onClick={prevPageHandler} disabled={!pageInfo.previous} style={styles.paginationButton}>
                                    Anterior
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
            <style>
                {`
                @media (max-width: 768px) {
                    .cart-selection-container {
                        flex-direction: column;
                        gap: 10px;
                    }
                    .active-cart-button, .inactive-cart-button, .new-cart-button {
                        width: 100%;
                    }
                    .active-cart-info {
                        flex-direction: column;
                        align-items: flex-start;
                        gap: 10px;
                    }
                    .active-cart-actions {
                        flex-direction: column;
                        width: 100%;
                    }
                    .input-group {
                        flex-direction: column;
                        gap: 10px;
                    }
                    .input-field {
                        width: 100%;
                    }
                    .primary-button {
                        width: 100%;
                    }
                    .found-product-card {
                        flex-direction: column;
                        align-items: flex-start;
                        gap: 10px;
                    }
                    .product-actions {
                        flex-direction: column;
                        width: 100%;
                    }
                    .table-responsive {
                        overflow-x: auto;
                    }
                    table {
                        width: 100%;
                        white-space: nowrap;
                    }
                    .payment-method-select-container,
                    .discount-container {
                        flex-direction: column;
                        align-items: flex-start;
                        gap: 5px;
                        width: 100%;
                    }
                    .process-sale-button {
                        width: 100%;
                    }
                    .pagination-container {
                        flex-direction: column;
                        gap: 10px;
                    }
                    .pagination-button {
                        width: 100%;
                    }
                }
                `}
            </style>
        </div>
    );
};

const styles = {
    container: { padding: '20px', fontFamily: 'Arial, sans-serif' },
    header: { textAlign: 'center', color: '#2c3e50' },
    section: { marginBottom: '30px', padding: '20px', backgroundColor: '#f9f9f9', borderRadius: '8px' },
    sectionHeader: { color: '#34495e', borderBottom: '1px solid #eee', paddingBottom: '10px' },
    loadingMessage: { textAlign: 'center', color: '#777' },
    accessDeniedMessage: { color: '#dc3545', textAlign: 'center' },
    noStoreSelectedMessage: { textAlign: 'center', marginTop: '50px' },
    errorMessage: { color: '#dc3545', padding: '10px', backgroundColor: '#ffe3e6', border: '1px solid #dc3545', borderRadius: '5px' },
    cartSelectionContainer: { display: 'flex', flexWrap: 'wrap', gap: '10px', marginBottom: '20px' },
    activeCartButton: { padding: '10px 15px', backgroundColor: '#3498db', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer' },
    inactiveCartButton: { padding: '10px 15px', backgroundColor: '#ecf0f1', color: '#333', border: '1px solid #ccc', borderRadius: '5px', cursor: 'pointer' },
    newCartButton: { padding: '10px 15px', backgroundColor: '#28a745', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer' },
    activeCartInfo: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '10px' },
    activeCartTitle: { margin: 0, color: '#3498db' },
    activeCartActions: { display: 'flex', gap: '10px' },
    inputField: { padding: '8px', border: '1px solid #ccc', borderRadius: '4px' },
    deleteCartButton: { backgroundColor: '#e74c3c', color: 'white', padding: '8px 12px', border: 'none', borderRadius: '4px', cursor: 'pointer' },
    modalOverlay: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 },
    modalContent: { backgroundColor: 'white', padding: '20px', borderRadius: '8px', textAlign: 'center' },
    modalHeader: { margin: '0 0 15px 0' },
    modalActions: { display: 'flex', justifyContent: 'center', gap: '10px', marginTop: '15px' },
    modalConfirmButton: { padding: '8px 15px', backgroundColor: '#28a745', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer' },
    modalCancelButton: { padding: '8px 15px', backgroundColor: '#dc3545', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer' },
    inputGroup: { display: 'flex', gap: '10px', marginBottom: '20px', alignItems: 'center' },
    primaryButton: { padding: '10px 15px', backgroundColor: '#007bff', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer' },
    foundProductCard: { border: '1px solid #ccc', padding: '15px', borderRadius: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' },
    foundProductText: { margin: 0 },
    productActions: { display: 'flex', gap: '10px' },
    addProductButton: { padding: '8px 15px', backgroundColor: '#28a745', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' },
    disabledButton: { padding: '8px 15px', backgroundColor: '#ccc', color: '#666', border: 'none', borderRadius: '4px', cursor: 'not-allowed' },
    tableResponsive: { overflowX: 'auto' },
    table: { width: '100%', borderCollapse: 'collapse', marginTop: '15px' },
    tableHeaderRow: { backgroundColor: '#f2f2f2' },
    th: { padding: '10px', borderBottom: '2px solid #ddd', textAlign: 'left' },
    tableRow: { '&:nth-child(even)': { backgroundColor: '#f9f9f9' } },
    td: { padding: '10px', borderBottom: '1px solid #eee', verticalAlign: 'middle' },
    quantityControl: { display: 'flex', alignItems: 'center', gap: '5px' },
    quantityButton: { padding: '4px 8px', backgroundColor: '#007bff', color: 'white', border: 'none', borderRadius: '3px', cursor: 'pointer' },
    quantityText: { padding: '0 5px' },
    removeButton: { padding: '8px 12px', backgroundColor: '#dc3545', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' },
    totalVenta: { textAlign: 'right', fontSize: '1.2em', color: '#333' },
    paymentMethodSelectContainer: { display: 'flex', alignItems: 'center', gap: '10px', marginTop: '15px' },
    paymentMethodLabel: { fontWeight: 'bold' },
    discountContainer: { display: 'flex', alignItems: 'center', gap: '10px', marginTop: '15px' },
    discountLabel: { fontWeight: 'bold' },
    discountInput: { width: '80px', padding: '8px', border: '1px solid #ccc', borderRadius: '4px' },
    finalTotalVenta: { textAlign: 'right', fontSize: '1.5em', color: '#28a745' },
    processSaleButton: { display: 'block', width: '100%', padding: '15px', backgroundColor: '#28a745', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', marginTop: '20px' },
    addButton: { padding: '8px 15px', backgroundColor: '#007bff', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' },
    noDataMessage: { textAlign: 'center', fontStyle: 'italic', color: '#777' },
    paginationContainer: { display: 'flex', justifyContent: 'center', alignItems: 'center', marginTop: '20px', gap: '10px' },
    paginationButton: { padding: '8px 15px', backgroundColor: '#007bff', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer' },
    pageNumber: { fontSize: '1em', fontWeight: 'bold', color: '#555' },
};

export default PuntoVenta;