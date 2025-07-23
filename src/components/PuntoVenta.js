// BONITO_AMOR/frontend/src/components/PuntoVenta.js
import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import Barcode from 'react-barcode';
import EtiquetasImpresion from './EtiquetasImpresion';
import { useSales } from './SalesContext'; 
import { useAuth } from '../AuthContext'; // Importar useAuth para obtener selectedStoreSlug y token

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

const PAYMENT_METHODS = [
    { value: '', label: 'Seleccione un método de pago' },
    { value: 'Efectivo', label: 'Efectivo' },
    { value: 'Transferencia', label: 'Transferencia' },
    { value: 'QR', label: 'QR' },
    { value: 'Tarjeta de débito', label: 'Tarjeta de débito' },
    { value: 'Tarjeta de crédito', label: 'Tarjeta de crédito' },
];

const API_BASE_URL = process.env.REACT_APP_API_URL;

function PuntoVenta() {
    const { user, isAuthenticated, loading: authLoading, selectedStoreSlug, token } = useAuth(); // Obtener selectedStoreSlug y token

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

    const [searchTerm, setSearchTerm] = useState(''); 
    const [foundProduct, setFoundProduct] = useState(null); 
    const [cantidadInput, setCantidadInput] = useState(1); 

    const [showPrintPreview, setShowPrintPreview] = useState(false);

    const [productosDisponibles, setProductosDisponibles] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);

    const [showNewCartModal, setShowNewCartModal] = useState(false);
    const [newCartAliasInput, setNewCartAliasInput] = useState('');

    const [paymentMethod, setPaymentMethod] = useState('');

    const [productSearchTerm, setProductSearchTerm] = useState('');

    const fetchProductos = useCallback(async () => {
        if (!token || !selectedStoreSlug) { // No cargar si no hay token o tienda seleccionada
            setIsLoading(false);
            return;
        }
        setIsLoading(true); 
        setError(null);     
        try {
            // *** CAMBIO CLAVE AQUÍ: Añadir tienda_slug a los parámetros de la solicitud ***
            const response = await axios.get(`${API_BASE_URL}/productos/`, {
                headers: { 'Authorization': `Bearer ${token}` },
                params: { tienda_slug: selectedStoreSlug }
            });
            
            const mappedProducts = response.data.results.map(p => ({
                ...p,
                // Asegura que 'precio' sea un número flotante, usando 'precio_venta'
                precio: parseFloat(p.precio_venta || 0) 
            }));
            setProductosDisponibles(mappedProducts); 
        } catch (err) {
            console.error("Error al cargar productos:", err.response ? err.response.data : err.message);
            setError("Error al cargar productos. Inténtalo de nuevo más tarde.");
        } finally {
            setIsLoading(false); 
        }
    }, [token, selectedStoreSlug]); // Depende de token y selectedStoreSlug

    useEffect(() => {
        if (!authLoading && isAuthenticated && (user?.is_staff || user?.is_superuser) && selectedStoreSlug) {
            fetchProductos();
        } else if (!authLoading && (!isAuthenticated || !(user?.is_staff || user?.is_superuser))) {
            setError("Acceso denegado. No tienes permisos para usar el punto de venta.");
            setIsLoading(false);
        } else if (!authLoading && isAuthenticated && !selectedStoreSlug) {
            setIsLoading(false); // Si no hay tienda seleccionada, no hay productos que cargar
        }
    }, [isAuthenticated, user, authLoading, selectedStoreSlug, fetchProductos]);

    const handleSearch = async () => {
        if (!searchTerm) {
            alert('Por favor, ingresa un código de barras para buscar.');
            return;
        }
        if (!selectedStoreSlug) {
            alert('Por favor, selecciona una tienda antes de buscar productos.');
            return;
        }

        try {
            // *** CAMBIO CLAVE AQUÍ: Añadir tienda_slug a la búsqueda por barcode ***
            const response = await axios.get(`${API_BASE_URL}/productos/buscar_por_barcode/`, {
                headers: { 'Authorization': `Bearer ${token}` },
                params: { barcode: searchTerm, tienda_slug: selectedStoreSlug }
            });
            const product = { ...response.data, precio: parseFloat(response.data.precio_venta || 0) };
            setFoundProduct(product);
            setCantidadInput(1);
        } catch (err) {
            setFoundProduct(null);
            console.error('Error searching product by barcode:', err.response ? err.response.data : err.message);
            alert('Producto no encontrado en la tienda seleccionada o error en la búsqueda.');
        }
    };

    const handleAddProductToActiveCart = () => {
        if (!activeCart) {
            alert('Por favor, selecciona o crea un carrito antes de añadir productos.');
            return;
        }
        if (foundProduct && cantidadInput > 0) {
            if (foundProduct.stock && cantidadInput > foundProduct.stock) {
                alert(`No hay suficiente stock. Disponible: ${foundProduct.stock}`);
                return;
            }
            addProductToCart(foundProduct, cantidadInput); 
            setSearchTerm('');    
            setFoundProduct(null); 
            setCantidadInput(1);  
        } else {
            alert('Por favor, busca un producto válido y especifica una cantidad para añadir al carrito.');
        }
    };

    const handleAddProductFromTable = (product) => {
        if (!activeCart) {
            alert('Por favor, selecciona o crea un carrito antes de añadir productos.');
            return;
        }
        if (product.stock > 0) {
            addProductToCart(product, 1); 
        } else {
            alert('Este producto no tiene stock disponible.');
        }
    };

    const handleProcessSale = async () => {
        if (!activeCart || activeCart.items.length === 0) {
            alert('El carrito activo está vacío. Agrega productos para procesar la venta.');
            return;
        }
        if (!paymentMethod) {
            alert('Por favor, selecciona un método de pago para la venta.');
            return;
        }
        if (!selectedStoreSlug) {
            alert('Por favor, selecciona una tienda antes de procesar la venta.');
            return;
        }

        const ventaData = {
            detalles: activeCart.items.map(item => ({
                producto: item.product.id,
                cantidad: item.quantity,
                precio_unitario_venta: parseFloat(item.product.precio) 
            })),
            metodo_pago: paymentMethod,
            // La tienda se pasará como query_param en la URL
        };

        try {
            // *** CAMBIO CLAVE AQUÍ: Añadir tienda_slug a los parámetros de la solicitud POST ***
            const response = await axios.post(`${API_BASE_URL}/ventas/?tienda_slug=${selectedStoreSlug}`, ventaData, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            alert('Venta procesada con éxito. ID de Venta: ' + response.data.id);
            console.log('Venta exitosa:', response.data);
            finalizeCart(activeCartId); 
            setPaymentMethod('');      
            fetchProductos(); // Recargar productos para reflejar cambios de stock
        } catch (error) {
            console.error('Error al procesar la venta:', error.response ? error.response.data : error.message);
            alert('Error al procesar la venta: ' + (error.response ? JSON.stringify(error.response.data) : error.message));
        }
    };

    const handlePrintFoundProduct = () => {
        if (!foundProduct) {
            alert('Primero busca un producto para imprimir su código de barras.');
            return;
        }
        setShowPrintPreview(true); 
    };

    const handleClosePrintPreview = () => {
        setShowPrintPreview(false);
    };

    const handleCreateNewCartWithAlias = () => {
        createNewCart(newCartAliasInput.trim()); 
        setNewCartAliasInput('');             
        setShowNewCartModal(false);           
    };

    const handleDeleteActiveCart = () => {
        if (activeCart && window.confirm(`¿Estás seguro de que quieres eliminar la venta "${activeCart.alias || activeCart.name}"? Esta acción no se puede deshacer.`)) {
            deleteCart(activeCartId); 
        }
    };

    if (showPrintPreview) {
        return (
            <div style={{ padding: '20px' }}>
                <button onClick={handleClosePrintPreview} style={{ marginBottom: '10px', padding: '10px 20px', backgroundColor: '#dc3545', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer' }}>
                    Volver a Punto de Venta
                </button>
                <button onClick={() => window.print()} style={{ marginLeft: '10px', marginBottom: '10px', padding: '10px 20px', backgroundColor: '#28a745', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer' }}>
                    Imprimir Etiquetas
                </button>
                <EtiquetasImpresion productosParaImprimir={[foundProduct]} />
            </div>
        );
    }

    const handleSearchChange = (e) => {
        setSearchTerm(e.target.value);
    };

    const filteredProducts = productosDisponibles.filter(product => {
        const lowerCaseSearchTerm = productSearchTerm.toLowerCase();
        return (
            product.nombre.toLowerCase().includes(lowerCaseSearchTerm) ||
            (product.talle && product.talle.toLowerCase().includes(lowerCaseSearchTerm))
        );
    });

    if (authLoading || (isAuthenticated && !user)) {
        return <div style={{ padding: '20px', textAlign: 'center' }}>Cargando datos de usuario...</div>;
    }

    if (!isAuthenticated || !(user.is_staff || user.is_superuser)) {
        return <div style={{ color: 'red', marginBottom: '10px', padding: '20px', border: '1px solid red', textAlign: 'center' }}>Acceso denegado. No tienes permisos para usar el punto de venta.</div>;
    }

    if (!selectedStoreSlug) {
        return (
            <div style={{ padding: '50px', textAlign: 'center' }}>
                <h2>Por favor, selecciona una tienda en la barra de navegación para usar el punto de venta.</h2>
            </div>
        );
    }

    return (
        <div style={{ padding: '20px', fontFamily: 'Arial, sans-serif', maxWidth: '1200px', margin: 'auto' }}>
            <h1>Punto de Venta ({selectedStoreSlug})</h1>

            <div style={{ marginBottom: '20px', border: '1px solid #ccc', padding: '15px', borderRadius: '8px', backgroundColor: '#f9f9f9' }}>
                <h3>Gestión de Ventas Activas:</h3>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', marginBottom: '15px' }}>
                  {carts.map((cart, index) => (
                    <button
                      key={cart.id}
                      onClick={() => selectCart(cart.id)}
                      style={{
                        padding: '8px 15px',
                        backgroundColor: cart.id === activeCartId ? '#007bff' : '#f0f0f0',
                        color: cart.id === activeCartId ? 'white' : '#333',
                        border: '1px solid #ccc',
                        borderRadius: '5px',
                        cursor: 'pointer',
                        fontWeight: cart.id === activeCartId ? 'bold' : 'normal',
                      }}
                    >
                      {cart.alias || `Venta ${index + 1}`}
                    </button>
                  ))}
                  <button onClick={() => setShowNewCartModal(true)} style={{ padding: '8px 15px', backgroundColor: '#28a745', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer' }}>
                    + Nueva Venta
                  </button>
                </div>

                {activeCart && (
                    <div style={{ marginTop: '15px' }}>
                        <h4 style={{ marginBottom: '10px' }}>Venta Activa: {activeCart.alias || activeCart.name}</h4>
                        <div style={{ display: 'flex', gap: '10px', marginBottom: '10px' }}>
                            <input
                                type="text"
                                placeholder="Nuevo Alias (opcional)"
                                value={activeCart.alias || ''}
                                onChange={(e) => updateCartAlias(activeCartId, e.target.value)}
                                style={{ flexGrow: 1, padding: '8px', border: '1px solid #ddd', borderRadius: '4px' }}
                            />
                            <button onClick={handleDeleteActiveCart} style={{ padding: '8px 15px', backgroundColor: '#dc3545', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer' }}>
                                Eliminar Venta
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {showNewCartModal && (
                <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 }}>
                    <div style={{ backgroundColor: 'white', padding: '20px', borderRadius: '8px', boxShadow: '0 4px 8px rgba(0,0,0,0.2)', width: '300px' }}>
                        <h3>Crear Nueva Venta</h3>
                        <input
                            type="text"
                            placeholder="Alias para la venta (ej: Cliente A)"
                            value={newCartAliasInput}
                            onChange={(e) => setNewCartAliasInput(e.target.value)}
                            style={{ width: 'calc(100% - 16px)', padding: '8px', marginBottom: '15px', border: '1px solid #ddd', borderRadius: '4px' }}
                        />
                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                            <button onClick={() => setShowNewCartModal(false)} style={{ padding: '8px 15px', backgroundColor: '#6c757d', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer' }}>
                                Cancelar
                            </button>
                            <button onClick={handleCreateNewCartWithAlias} style={{ padding: '8px 15px', backgroundColor: '#28a745', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer' }}>
                                Crear Venta
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <div style={{ marginBottom: '20px', border: '1px solid #ccc', padding: '15px', borderRadius: '8px', backgroundColor: '#f9f9f9' }}>
                <h3>Buscar Producto por Código de Barras</h3>
                <div style={{ display: 'flex', gap: '10px', marginBottom: '15px' }}>
                    <input
                        type="text"
                        placeholder="Ingresa código de barras" 
                        value={searchTerm}
                        onChange={handleSearchChange}
                        onKeyPress={(e) => { if (e.key === 'Enter') handleSearch(); }}
                        style={{ flexGrow: 1, padding: '10px', border: '1px solid #ddd', borderRadius: '4px' }}
                    />
                    <button onClick={handleSearch} style={{ padding: '10px 20px', backgroundColor: '#007bff', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer' }}>
                        Buscar
                    </button>
                    {foundProduct && (
                        <button onClick={handlePrintFoundProduct} style={{ padding: '10px 20px', backgroundColor: '#6c757d', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer' }}>
                            Imprimir Etiqueta
                        </button>
                    )}
                </div>
                {foundProduct && (
                    <div style={{ border: '1px dashed #007bff', padding: '10px', borderRadius: '5px', backgroundColor: '#e7f0ff' }}>
                        <p><strong>Producto Encontrado:</strong> {foundProduct.nombre} ({foundProduct.talle}) - ${parseFloat(foundProduct.precio).toFixed(2)}</p>
                        <p>Stock Disponible: {foundProduct.stock}</p>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <label>Cantidad:</label>
                            <input
                                type="number"
                                value={cantidadInput}
                                onChange={(e) => setCantidadInput(parseInt(e.target.value) || 1)} 
                                min="1"
                                max={foundProduct.stock || 9999} 
                                style={{ width: '80px', padding: '5px', border: '1px solid #ddd', borderRadius: '4px' }}
                            />
                            <button onClick={handleAddProductToActiveCart} style={{ padding: '8px 15px', backgroundColor: '#28a745', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer' }}>
                                Añadir al Carrito
                            </button>
                        </div>
                    </div>
                )}
            </div>

            <div style={{ marginBottom: '20px', border: '1px solid #ccc', padding: '15px', borderRadius: '8px', backgroundColor: '#e6ffe6' }}>
                <h3>Carrito Actual: {activeCart ? (activeCart.alias || activeCart.name) : 'Ninguno Seleccionado'}</h3>
                {activeCart && activeCart.items.length > 0 ? (
                    <>
                        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', marginBottom: '15px', border: '1px solid #ddd' }}>
                            <thead>
                                <tr style={{ backgroundColor: '#ccffcc' }}>
                                    <th style={{ padding: '8px', border: '1px solid #ddd' }}>Producto</th>
                                    <th style={{ padding: '8px', border: '1px solid #ddd' }}>Talle</th>
                                    <th style={{ padding: '8px', border: '1px solid #ddd' }}>Cantidad</th>
                                    <th style={{ padding: '8px', border: '1px solid #ddd' }}>P. Unitario</th>
                                    <th style={{ padding: '8px', border: '1px solid #ddd' }}>Subtotal</th>
                                    <th style={{ padding: '8px', border: '1px solid #ddd' }}>Acciones</th>
                                </tr>
                            </thead>
                            <tbody>
                                {activeCart.items.map((item) => (
                                    <tr key={item.product.id}>
                                        <td style={{ padding: '8px', border: '1px solid #ddd' }}>{item.product.nombre}</td>
                                        <td style={{ padding: '8px', border: '1px solid #ddd' }}>{item.product.talle}</td>
                                        <td style={{ padding: '8px', border: '1px solid #ddd' }}>
                                            <button onClick={() => decrementProductQuantity(activeCartId, item.product.id)} style={{ padding: '3px 8px', backgroundColor: '#ffc107', color: 'black', border: 'none', borderRadius: '3px', cursor: 'pointer', marginRight: '5px' }}>-</button>
                                            {item.quantity}
                                            <button onClick={() => addProductToCart(item.product, 1)} style={{ padding: '3px 8px', backgroundColor: '#28a745', color: 'white', border: 'none', borderRadius: '3px', cursor: 'pointer', marginLeft: '5px' }}>+</button>
                                        </td>
                                        <td style={{ padding: '8px', border: '1px solid #ddd' }}>${parseFloat(item.product.precio).toFixed(2)}</td>
                                        <td style={{ padding: '8px', border: '1px solid #ddd' }}>${(item.quantity * parseFloat(item.product.precio)).toFixed(2)}</td>
                                        <td style={{ padding: '8px', border: '1px solid #ddd' }}>
                                            <button onClick={() => removeProductFromCart(activeCartId, item.product.id)} style={{ padding: '5px 10px', backgroundColor: '#dc3545', color: 'white', border: 'none', borderRadius: '3px', cursor: 'pointer' }}>
                                                Quitar
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                        <h4 style={{ textAlign: 'right', marginBottom: '15px' }}>Total de Venta: ${activeCart.items.reduce((acc, item) => acc + item.quantity * parseFloat(item.product.precio), 0).toFixed(2)}</h4>

                        <div style={{ marginBottom: '15px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <label htmlFor="paymentMethod" style={{ fontWeight: 'bold' }}>Método de Pago:</label>
                            <select
                                id="paymentMethod"
                                value={paymentMethod}
                                onChange={(e) => setPaymentMethod(e.target.value)}
                                style={{ padding: '8px', border: '1px solid #ddd', borderRadius: '4px', flexGrow: 1 }}
                            >
                                {PAYMENT_METHODS.map(option => (
                                    <option key={option.value} value={option.value}>{option.label}</option>
                                ))}
                            </select>
                        </div>

                        <button onClick={handleProcessSale} style={{ width: '100%', padding: '15px', backgroundColor: '#007bff', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '18px', fontWeight: 'bold' }}>
                            Procesar Venta
                        </button>
                    </>
                ) : (
                    <p>El carrito activo está vacío. Busca y añade productos.</p>
                )}
            </div>

            <div style={{ marginBottom: '20px', border: '1px solid #ccc', padding: '15px', borderRadius: '8px', backgroundColor: '#f9f9f9' }}>
                <h3>Productos Disponibles</h3>
                <div style={{ marginBottom: '15px' }}>
                    <input
                        type="text"
                        placeholder="Buscar por nombre o talle..."
                        value={productSearchTerm}
                        onChange={(e) => setProductSearchTerm(e.target.value)}
                        style={{ width: '100%', padding: '10px', border: '1px solid #ddd', borderRadius: '4px' }}
                    />
                </div>

                {isLoading ? (
                    <p>Cargando productos...</p>
                ) : error ? (
                    <p style={{ color: 'red' }}>{error}</p>
                ) : (
                    <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', border: '1px solid #ddd' }}>
                        <thead>
                            <tr style={{ backgroundColor: '#f2f2f2' }}>
                                <th style={{ padding: '8px', border: '1px solid #ddd' }}>Nombre</th>
                                <th style={{ padding: '8px', border: '1px solid #ddd' }}>Talle</th>
                                <th style={{ padding: '8px', border: '1px solid #ddd' }}>Código</th>
                                <th style={{ padding: '8px', border: '1px solid #ddd' }}>Precio</th>
                                <th style={{ padding: '8px', border: '1px solid #ddd' }}>Stock</th>
                                <th style={{ padding: '8px', border: '1px solid #ddd' }}>Acción</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredProducts.length > 0 ? (
                                filteredProducts.map(product => (
                                    <tr key={product.id}>
                                        <td style={{ padding: '8px', border: '1px solid #ddd' }}>{product.nombre}</td>
                                        <td style={{ padding: '8px', border: '1px solid #ddd' }}>{product.talle}</td>
                                        <td style={{ padding: '8px', border: '1px solid #ddd' }}>{product.codigo_barras || 'N/A'}</td>
                                        <td style={{ padding: '8px', border: '1px solid #ddd' }}>${parseFloat(product.precio).toFixed(2)}</td>
                                        <td style={{ padding: '8px', border: '1px solid #ddd' }}>{product.stock}</td>
                                        <td style={{ padding: '8px', border: '1px solid #ddd' }}>
                                            <button
                                                onClick={() => handleAddProductFromTable(product)}
                                                disabled={product.stock === 0}
                                                style={{ padding: '5px 10px', backgroundColor: '#007bff', color: 'white', border: 'none', borderRadius: '3px', cursor: product.stock === 0 ? 'not-allowed' : 'pointer' }}
                                            >
                                                {product.stock === 0 ? 'Sin Stock' : 'Añadir'}
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan="6" style={{ padding: '8px', textAlign: 'center', color: '#555' }}>
                                        No se encontraron productos con el filtro aplicado.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                )}
            </div>
        </div>
    );
}

export default PuntoVenta;
