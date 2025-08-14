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

        Swal.fire({
            title: '¿Confirmar venta?',
            html: `Confirmas la venta por un total de <strong>$${finalTotal.toFixed(2)}</strong> con <strong>${metodoPagoSeleccionado}</strong>?` +
                  (descuentoPorcentaje > 0 ? `<br>(Descuento aplicado: ${descuentoPorcentaje}%)` : ''),
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
                        fecha_venta: new Date().toISOString(), // <-- Fecha garantizada como válida
                        tienda_nombre: selectedStoreSlug,
                        metodo_pago: metodoPagoSeleccionado,
                        descuento_porcentaje: descuentoPorcentaje,
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

    const nextPageHandler = () => {
        if (currentPage < totalPages) {
            setCurrentPage(currentPage + 1);
        }
    };

    const prevPageHandler = () => {
        if (currentPage > 1) {
            setCurrentPage(currentPage - 1);
        }
    };

    if (authLoading || (isAuthenticated && !user)) {
        return <div className="loading-message">Cargando datos de usuario...</div>;
    }

    if (!isAuthenticated || !(user.is_superuser || user.is_staff)) {
        return <div className="access-denied-message">Acceso denegado. No tienes permisos para usar el punto de venta.</div>;
    }

    if (!selectedStoreSlug) {
        return (
            <div className="no-store-selected-message">
                <h2>Por favor, selecciona una tienda en la barra de navegación para usar el punto de venta.</h2>
            </div>
        );
    }

    if (loadingProducts) {
        return <div className="loading-message">Cargando productos y métodos de pago...</div>;
    }

    if (error) {
        return <div className="error-message">{error}</div>;
    }

    return (
        <div className="container">
            <h1 className="header">Punto de Venta ({selectedStoreSlug})</h1>
            <div className="section">
                <h3 className="section-header">Gestión de Ventas Activas</h3>
                <div className="cart-selection-container">
                    {carts.map((cart, index) => (
                        <button
                            key={cart.id}
                            onClick={() => selectCart(cart.id)}
                            className={cart.id === activeCartId ? 'active-cart-button' : 'inactive-cart-button'}
                        >
                            {cart.alias || `Venta ${index + 1}`}
                        </button>
                    ))}
                    <button onClick={() => setShowNewCartModal(true)} className="new-cart-button">
                        + Nueva Venta
                    </button>
                </div>

                {activeCart && (
                    <div className="active-cart-info">
                        <h4 className="active-cart-title">Venta Activa: {activeCart.alias || activeCart.name}</h4>
                        <div className="active-cart-actions">
                            <input
                                type="text"
                                placeholder="Nuevo Alias (opcional)"
                                value={activeCart.alias || ''}
                                onChange={(e) => updateCartAlias(activeCartId, e.target.value)}
                                className="input-field"
                            />
                            <button onClick={handleDeleteActiveCart} className="delete-cart-button">
                                Eliminar Venta
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {showNewCartModal && (
                <div className="modal-overlay">
                    <div className="modal-content">
                        <h3 className="modal-header">Crear Nueva Venta</h3>
                        <input
                            type="text"
                            placeholder="Alias para la venta (ej: Cliente A)"
                            value={newCartAliasInput}
                            onChange={(e) => setNewCartAliasInput(e.target.value)}
                            className="input-field"
                        />
                        <div className="modal-actions">
                            <button onClick={() => setShowNewCartModal(false)} className="modal-cancel-button">
                                Cancelar
                            </button>
                            <button onClick={handleCreateNewCartWithAlias} className="modal-confirm-button">
                                Crear Venta
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <div className="section">
                <h3 className="section-header">Buscar Producto por Código de Barras</h3>
                <div className="input-group">
                    <input
                        type="text"
                        placeholder="Ingresa código de barras o nombre"
                        value={busquedaProducto}
                        onChange={(e) => setBusquedaProducto(e.target.value)}
                        onKeyPress={(e) => { if (e.key === 'Enter') handleBuscarProducto(); }}
                        className="input-field"
                    />
                    <button onClick={handleBuscarProducto} className="primary-button">
                        Buscar
                    </button>
                </div>
                {productoSeleccionado && (
                    <div className="found-product-card">
                        <p className="found-product-text">
                            <strong>Producto:</strong> {productoSeleccionado.nombre} ({productoSeleccionado.talle}) - ${parseFloat(productoSeleccionado.precio).toFixed(2)}
                        </p>
                        <p className="found-product-text">
                            Stock Disponible: {productoSeleccionado.stock}
                        </p>
                        <div className="product-actions">
                            <button
                                onClick={() => handleAddProductoEnVenta(productoSeleccionado, 1)}
                                disabled={productoSeleccionado.stock === 0}
                                className={productoSeleccionado.stock === 0 ? 'disabled-button' : 'add-product-button'}
                            >
                                {productoSeleccionado.stock === 0 ? 'Sin Stock' : 'Añadir 1 Ud.'}
                            </button>
                        </div>
                    </div>
                )}
            </div>

            <div className="section">
                <h3 className="section-header">Detalle del Carrito Activo: {activeCart ? (activeCart.alias || activeCart.name) : 'Ninguno Seleccionado'}</h3>
                {activeCart && activeCart.items.length > 0 ? (
                    <>
                        <div className="table-responsive">
                            <table className="table">
                                <thead>
                                    <tr className="table-header-row">
                                        <th className="th">Producto</th>
                                        <th className="th">Talle</th>
                                        <th className="th">Cantidad</th>
                                        <th className="th">P. Unitario</th>
                                        <th className="th">Subtotal</th>
                                        <th className="th">Acciones</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {activeCart.items.map((item) => (
                                        <tr key={item.product.id} className="table-row">
                                            <td className="td">{item.product.nombre}</td>
                                            <td className="td">{item.product.talle}</td>
                                            <td className="td">
                                                <div className="quantity-control">
                                                    <button onClick={() => handleDecrementQuantity(item.product.id)} className="quantity-button">-</button>
                                                    <span className="quantity-text">{item.quantity}</span>
                                                    <button onClick={() => handleAddProductoEnVenta(item.product, 1)} className="quantity-button">+</button>
                                                </div>
                                            </td>
                                            <td className="td">${parseFloat(item.product.precio).toFixed(2)}</td>
                                            <td className="td">${(item.quantity * parseFloat(item.product.precio)).toFixed(2)}</td>
                                            <td className="td">
                                                <button onClick={() => handleRemoveProductoEnVenta(item.product.id)} className="remove-button">
                                                    Quitar
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                        <h4 className="total-venta">Subtotal: ${activeCart.total.toFixed(2)}</h4>
                        <div className="payment-method-select-container">
                            <label htmlFor="metodoPago" className="payment-method-label">Método de Pago:</label>
                            <select
                                id="metodoPago"
                                value={metodoPagoSeleccionado}
                                onChange={(e) => setMetodoPagoSeleccionado(e.target.value)}
                                className="input-field"
                            >
                                <option value="">Selecciona un método de pago</option>
                                {metodosPago.map(method => (
                                    <option key={method.id} value={method.nombre}>{method.nombre}</option>
                                ))}
                            </select>
                        </div>
                        <div className="discount-container">
                            <label htmlFor="descuento" className="discount-label">Aplicar Descuento (%):</label>
                            <input
                                type="number"
                                id="descuento"
                                value={descuentoPorcentaje}
                                onChange={(e) => setDescuentoPorcentaje(Math.max(0, Math.min(100, parseFloat(e.target.value) || 0)))}
                                className="discount-input"
                                min="0"
                                max="100"
                            />
                        </div>
                        <h4 className="final-total-venta">Total Final: ${calculateTotalWithDiscount().toFixed(2)}</h4>
                        <button onClick={handleProcesarVenta} className="process-sale-button">
                            Procesar Venta
                        </button>
                    </>
                ) : (
                    <p className="no-data-message">El carrito activo está vacío. Busca y añade productos.</p>
                )}
            </div>

            <div className="section">
                <h3 className="section-header">Productos Disponibles</h3>
                <div className="input-group">
                    <input
                        type="text"
                        placeholder="Buscar por nombre o talle..."
                        value={busquedaProducto}
                        onChange={(e) => setBusquedaProducto(e.target.value)}
                        className="input-field"
                    />
                </div>

                {loadingProducts ? (
                    <p className="loading-message">Cargando productos...</p>
                ) : error ? (
                    <p className="error-message">{error}</p>
                ) : (
                    <>
                        <div className="table-responsive">
                            <table className="table">
                                <thead>
                                    <tr className="table-header-row">
                                        <th className="th">Nombre</th>
                                        <th className="th">Talle</th>
                                        <th className="th">Precio</th>
                                        <th className="th">Stock</th>
                                        <th className="th">Acción</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {currentProducts.length > 0 ? (
                                        currentProducts.map(product => (
                                            <tr key={product.id} className="table-row">
                                                <td className="td">{product.nombre}</td>
                                                <td className="td">{product.talle}</td>
                                                <td className="td">${parseFloat(product.precio).toFixed(2)}</td>
                                                <td className="td">{product.stock}</td>
                                                <td className="td">
                                                    <button
                                                        onClick={() => handleAddProductoEnVenta(product, 1)}
                                                        disabled={product.stock === 0}
                                                        className={product.stock === 0 ? 'disabled-button' : 'add-button'}
                                                    >
                                                        {product.stock === 0 ? 'Sin Stock' : 'Añadir'}
                                                    </button>
                                                </td>
                                            </tr>
                                        ))
                                    ) : (
                                        <tr>
                                            <td colSpan="5" className="no-data-message">
                                                No se encontraron productos con el filtro aplicado.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>

                        {totalPages > 1 && (
                            <div className="pagination-container">
                                <button onClick={prevPageHandler} disabled={currentPage === 1} className="pagination-button">
                                    Anterior
                                </button>
                                <span className="page-number">Página {currentPage} de {totalPages}</span>
                                <button onClick={nextPageHandler} disabled={currentPage === totalPages} className="pagination-button">
                                    Siguiente
                                </button>
                            </div>
                        )}
                    </>
                )}
            </div>

            {showConfirmModal && (
                <div className="modal-overlay">
                    <div className="modal-content">
                        <p className="modal-message">{confirmMessage}</p>
                        <div className="modal-actions">
                            <button onClick={confirmAction} className="modal-confirm-button">Sí</button>
                            <button onClick={() => setShowConfirmModal(false)} className="modal-cancel-button">No</button>
                        </div>
                    </div>
                </div>
            )}

            {showAlertMessage && (
                <div className="alert-box" style={{ backgroundColor: alertType === 'error' ? '#dc3545' : (alertType === 'info' ? '#17a2b8' : '#28a745') }}>
                    <p>{alertMessage}</p>
                </div>
            )}
        </div>
    );
};

export default PuntoVenta;