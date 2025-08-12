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

    const [showNewCartModal, setShowNewCartModal] = useState(false);
    const [newCartAliasInput, setNewCartAliasInput] = useState('');

    const [descuentoPorcentaje, setDescuentoPorcentaje] = useState(0);

    const [currentPage, setCurrentPage] = useState(1);
    const [productsPerPage] = useState(10);

    const showCustomAlert = (message, type = 'success') => {
        Swal.fire({
            toast: true,
            position: 'top-end',
            showConfirmButton: false,
            timer: 3000,
            timerProgressBar: true,
            icon: type,
            title: message
        });
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
        Swal.fire({
            title: '¿Estás seguro?',
            text: "¿Quieres quitar este producto del carrito?",
            icon: 'warning',
            showCancelButton: true,
            confirmButtonText: 'Sí, quitar',
            cancelButtonText: 'Cancelar'
        }).then((result) => {
            if (result.isConfirmed) {
                removeProductFromCart(activeCartId, productId);
                showCustomAlert('Producto eliminado del carrito.', 'info');
            }
        });
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

                    // Obtener los datos completos de la venta recién creada
                    const ventaCompletaResponse = await axios.get(`${BASE_API_ENDPOINT}/api/ventas/${response.data.id}/`, {
                        headers: { 'Authorization': `Bearer ${token}` },
                    });
                    const ventaCompleta = ventaCompletaResponse.data;
                    
                    showCustomAlert('Venta procesada con éxito. ID: ' + ventaCompleta.id, 'success');
                    
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
                            navigate('/recibo', { state: { venta: ventaCompleta } });
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
            Swal.fire({
                title: '¿Estás seguro?',
                text: `¿Quieres eliminar la venta "${activeCart.alias || activeCart.name}"? Esta acción no se puede deshacer.`,
                icon: 'warning',
                showCancelButton: true,
                confirmButtonText: 'Sí, eliminar',
                cancelButtonText: 'Cancelar'
            }).then((result) => {
                if (result.isConfirmed) {
                    deleteCart(activeCartId);
                    showCustomAlert('Venta eliminada.', 'info');
                }
            });
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
    const indexOfFirstProduct = lastProduct - productsPerPage;
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
        <div className="punto-venta-container">
            <h1 className="main-header">Punto de Venta ({selectedStoreSlug})</h1>
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
                                className="add-product-button"
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
                            <table className="cart-table">
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
                            <table className="products-table">
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
            
            <style>{`
                .punto-venta-container {
                    padding: 20px;
                    font-family: Inter, sans-serif;
                    max-width: 1200px;
                    margin: 20px auto;
                    background-color: #f8f9fa;
                    border-radius: 8px;
                    box-shadow: 0 4px 12px rgba(0,0,0,0.1);
                    color: #333;
                }
                .main-header {
                    text-align: center;
                    color: #2c3e50;
                    margin-bottom: 30px;
                    font-size: 2.5em;
                    font-weight: bold;
                }
                .section {
                    background-color: #ffffff;
                    padding: 25px;
                    border-radius: 8px;
                    box-shadow: 0 2px 8px rgba(0,0,0,0.05);
                    margin-bottom: 30px;
                }
                .section-header {
                    font-size: 1.8em;
                    color: #34495e;
                    margin-bottom: 20px;
                    border-bottom: 2px solid #eceff1;
                    padding-bottom: 10px;
                }
                .loading-message {
                    padding: 20px;
                    text-align: center;
                    color: #555;
                    font-size: 1.1em;
                }
                .access-denied-message {
                    color: #dc3545;
                    margin-bottom: 10px;
                    padding: 20px;
                    border: 1px solid #dc3545;
                    text-align: center;
                    border-radius: 8px;
                    background-color: #ffe3e6;
                    font-weight: bold;
                }
                .no-store-selected-message {
                    padding: 50px;
                    text-align: center;
                    color: #777;
                    font-size: 1.2em;
                }
                .error-message {
                    color: #dc3545;
                    margin-bottom: 20px;
                    border: 1px solid #dc3545;
                    padding: 15px;
                    border-radius: 8px;
                    background-color: #ffe3e6;
                    text-align: center;
                    font-weight: bold;
                }
                .cart-selection-container {
                    display: flex;
                    flex-wrap: wrap;
                    gap: 10px;
                    margin-bottom: 15px;
                    padding: 10px;
                    background-color: #eaf7ff;
                    border: 1px dashed #a7d9ff;
                    border-radius: 5px;
                }
                .active-cart-button, .inactive-cart-button {
                    padding: 8px 15px;
                    border: none;
                    border-radius: 5px;
                    cursor: pointer;
                    font-weight: bold;
                    transition: background-color 0.3s ease;
                }
                .active-cart-button {
                    background-color: #007bff;
                    color: white;
                }
                .inactive-cart-button {
                    background-color: #f0f0f0;
                    color: #333;
                    border: 1px solid #ccc;
                }
                .new-cart-button {
                    padding: 8px 15px;
                    background-color: #28a745;
                    color: white;
                    border: none;
                    border-radius: 5px;
                    cursor: pointer;
                    transition: background-color 0.3s ease;
                }
                .active-cart-info {
                    margin-top: 15px;
                    padding: 15px;
                    background-color: #e6ffe6;
                    border-radius: 8px;
                    border: 1px solid #28a745;
                }
                .active-cart-title {
                    margin-bottom: 10px;
                    color: #28a745;
                    font-size: 1.2em;
                }
                .active-cart-actions {
                    display: flex;
                    gap: 10px;
                    margin-bottom: 10px;
                }
                .delete-cart-button {
                    padding: 8px 15px;
                    background-color: #dc3545;
                    color: white;
                    border: none;
                    border-radius: 5px;
                    cursor: pointer;
                    transition: background-color 0.3s ease;
                }
                .input-group {
                    display: flex;
                    gap: 10px;
                    margin-bottom: 15px;
                    align-items: center;
                }
                .input-field {
                    flex-grow: 1;
                    padding: 10px 12px;
                    border: 1px solid #dcdcdc;
                    border-radius: 5px;
                    font-size: 1em;
                    box-sizing: border-box;
                }
                .primary-button {
                    padding: 10px 20px;
                    background-color: #007bff;
                    color: white;
                    border: none;
                    border-radius: 5px;
                    cursor: pointer;
                    font-size: 1em;
                    font-weight: bold;
                    transition: background-color 0.3s ease;
                }
                .found-product-card {
                    border: 1px solid #a7d9ff;
                    padding: 15px;
                    border-radius: 8px;
                    background-color: #e7f0ff;
                    margin-bottom: 15px;
                }
                .found-product-text {
                    margin: 5px 0;
                    color: #333;
                    font-size: 1.05em;
                }
                .product-actions {
                    display: flex;
                    align-items: center;
                    gap: 10px;
                    margin-top: 10px;
                }
                .add-product-button {
                    padding: 10px 20px;
                    background-color: #28a745;
                    color: white;
                    border: none;
                    border-radius: 5px;
                    cursor: pointer;
                    font-size: 1em;
                    font-weight: bold;
                    transition: background-color 0.3s ease;
                }
                .cart-table {
                    width: 100%;
                    border-collapse: collapse;
                    margin-top: 15px;
                    border-radius: 8px;
                    overflow: hidden;
                    box-shadow: 0 1px 3px rgba(0,0,0,0.1);
                }
                .table-header-row {
                    background-color: #f2f2f2;
                }
                .th {
                    padding: 12px 15px;
                    border-bottom: 1px solid #ddd;
                    text-align: left;
                    font-weight: bold;
                    font-size: 0.95em;
                    color: #555;
                }
                .table-row {
                    background-color: inherit;
                    transition: background-color 0.2s ease;
                }
                .table-row:nth-child(even) {
                    background-color: #f9f9f9;
                }
                .td {
                    padding: 10px 15px;
                    border-bottom: 1px solid #eee;
                    vertical-align: middle;
                    font-size: 0.9em;
                }
                .quantity-control {
                    display: flex;
                    align-items: center;
                    gap: 5px;
                }
                .quantity-button {
                    padding: 5px 10px;
                    background-color: #007bff;
                    color: white;
                    border: none;
                    border-radius: 3px;
                    cursor: pointer;
                    font-size: 0.9em;
                    transition: background-color 0.3s ease;
                }
                .quantity-text {
                    min-width: 20px;
                    text-align: center;
                    font-weight: bold;
                }
                .remove-button {
                    padding: 6px 12px;
                    background-color: #dc3545;
                    color: white;
                    border: none;
                    border-radius: 4px;
                    cursor: pointer;
                    font-size: 0.85em;
                    transition: background-color 0.3s ease;
                }
                .total-venta {
                    text-align: right;
                    margin-top: 20px;
                    font-size: 1.5em;
                    color: #28a745;
                    font-weight: bold;
                }
                .final-total-venta {
                    text-align: right;
                    margin-top: 10px;
                    font-size: 1.7em;
                    color: #007bff;
                    font-weight: bold;
                }
                .payment-method-select-container {
                    display: flex;
                    align-items: center;
                    gap: 10px;
                    margin-bottom: 10px;
                    margin-top: 20px;
                }
                .payment-method-label {
                    font-weight: bold;
                    color: #555;
                    font-size: 1em;
                }
                .discount-container {
                    display: flex;
                    align-items: center;
                    gap: 10px;
                    margin-bottom: 20px;
                }
                .discount-label {
                    font-weight: bold;
                    color: #555;
                    font-size: 1em;
                }
                .discount-input {
                    width: 80px;
                    padding: 10px 12px;
                    border: 1px solid #dcdcdc;
                    border-radius: 5px;
                    font-size: 1em;
                    box-sizing: border-box;
                    text-align: center;
                }
                .process-sale-button {
                    width: 100%;
                    padding: 15px;
                    background-color: #007bff;
                    color: white;
                    border: none;
                    border-radius: 8px;
                    cursor: pointer;
                    font-size: 1.2em;
                    font-weight: bold;
                    transition: background-color 0.3s ease;
                }
                .no-data-message {
                    text-align: center;
                    color: #777;
                    font-style: italic;
                    padding: 15px;
                }
                .add-button {
                    padding: 5px 10px;
                    background-color: #007bff;
                    color: white;
                    border: none;
                    border-radius: 3px;
                    cursor: pointer;
                }
                .disabled-button {
                    padding: 5px 10px;
                    background-color: #6c757d;
                    color: white;
                    border: none;
                    border-radius: 3px;
                    cursor: not-allowed;
                }
                .modal-overlay {
                    position: fixed;
                    top: 0;
                    left: 0;
                    right: 0;
                    bottom: 0;
                    background-color: rgba(0, 0, 0, 0.6);
                    display: flex;
                    justify-content: center;
                    align-items: center;
                    z-index: 1000;
                }
                .modal-content {
                    background-color: #fff;
                    padding: 30px;
                    border-radius: 10px;
                    box-shadow: 0 5px 15px rgba(0, 0, 0, 0.3);
                    text-align: center;
                    max-width: 450px;
                    width: 90%;
                    animation: fadeIn 0.3s ease-out;
                }
                .modal-header {
                    font-size: 1.5em;
                    color: #34495e;
                    margin-bottom: 20px;
                }
                .modal-message {
                    font-size: 1.1em;
                    margin-bottom: 25px;
                    color: #333;
                }
                .modal-actions {
                    display: flex;
                    justify-content: center;
                    gap: 20px;
                }
                .modal-confirm-button {
                    background-color: #28a745;
                    color: white;
                    padding: 12px 25px;
                    border: none;
                    border-radius: 6px;
                    cursor: pointer;
                    font-size: 1em;
                    font-weight: bold;
                    transition: background-color 0.3s ease, transform 0.2s ease;
                }
                .modal-cancel-button {
                    background-color: #6c757d;
                    color: white;
                    padding: 12px 25px;
                    border: none;
                    border-radius: 6px;
                    cursor: pointer;
                    font-size: 1em;
                    font-weight: bold;
                    transition: background-color 0.3s ease, transform 0.2s ease;
                }
                .alert-box-success {
                    position: fixed;
                    top: 20px;
                    right: 20px;
                    background-color: #28a745;
                    color: white;
                    padding: 15px 25px;
                    border-radius: 8px;
                    box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
                    z-index: 1001;
                    animation: slideIn 0.5s forwards, fadeOut 3s forwards;
                }
                @keyframes slideIn {
                    from { transform: translateX(100%); opacity: 0; }
                    to { transform: translateX(0); opacity: 1; }
                }
                @keyframes fadeOut {
                    0% { opacity: 1; }
                    85% { opacity: 1; }
                    100% { opacity: 0; }
                }
                .pagination-container {
                    display: flex;
                    justify-content: center;
                    align-items: center;
                    margin-top: 20px;
                    gap: 10px;
                }
                .pagination-button {
                    padding: 8px 15px;
                    background-color: #007bff;
                    color: white;
                    border: none;
                    border-radius: 5px;
                    cursor: pointer;
                    font-size: 1em;
                    transition: background-color 0.3s ease;
                }
                .page-number {
                    font-size: 1em;
                    font-weight: bold;
                    color: #555;
                }
                
                @media (max-width: 768px) {
                    .input-group {
                        flex-direction: column;
                        align-items: stretch;
                    }
                    .input-field {
                        width: 100%;
                    }
                    .primary-button {
                        width: 100%;
                    }
                }
            `}</style>
        </div>
    );
};

export default PuntoVenta;