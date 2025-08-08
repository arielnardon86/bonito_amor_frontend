import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../AuthContext';

// --- Estilos definidos como un objeto para usarse directamente en el componente ---
const styles = {
    puntoVentaContainer: {
        fontFamily: 'Inter, sans-serif',
        display: 'flex',
        flexDirection: 'column',
        minHeight: '100vh',
        backgroundColor: '#f8f9fa',
        padding: '20px',
    },
    mainContent: {
        display: 'flex',
        flexGrow: 1,
        gap: '20px',
        maxWidth: '1400px',
        margin: '0 auto',
        width: '100%',
        flexWrap: 'wrap',
    },
    productosListContainer: {
        flex: 2,
        backgroundColor: '#ffffff',
        borderRadius: '8px',
        boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
        padding: '20px',
    },
    carritoContainer: {
        flex: 1,
        minWidth: '300px',
        backgroundColor: '#ffffff',
        borderRadius: '8px',
        boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
        padding: '20px',
        display: 'flex',
        flexDirection: 'column',
    },
    searchInput: {
        width: '100%',
        padding: '12px 15px',
        fontSize: '1em',
        borderRadius: '5px',
        border: '1px solid #ced4da',
        marginBottom: '20px',
        transition: 'border-color 0.3s ease',
    },
    productosGrid: {
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
        gap: '15px',
        overflowY: 'auto',
        maxHeight: 'calc(100vh - 200px)',
        paddingRight: '10px',
    },
    productoCard: {
        backgroundColor: '#f1f3f5',
        borderRadius: '8px',
        padding: '15px',
        textAlign: 'center',
        boxShadow: '0 2px 5px rgba(0,0,0,0.05)',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        height: '100%',
    },
    productoCardPrice: {
        fontSize: '1.2em',
        fontWeight: 'bold',
        color: '#007bff',
        margin: '5px 0',
    },
    productoCardStock: {
        fontSize: '0.9em',
        color: '#6c757d',
        margin: '5px 0',
    },
    addToCartButton: {
        backgroundColor: '#28a745',
        color: 'white',
        border: 'none',
        borderRadius: '5px',
        padding: '10px',
        cursor: 'pointer',
        marginTop: '10px',
        transition: 'background-color 0.3s ease',
    },
    addToCartButtonDisabled: {
        backgroundColor: '#6c757d',
        cursor: 'not-allowed',
    },
    carritoList: {
        listStyle: 'none',
        padding: 0,
        margin: 0,
        overflowY: 'auto',
        maxHeight: 'calc(100vh - 400px)',
        flexGrow: 1,
    },
    carritoItem: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '10px 0',
        borderBottom: '1px solid #e9ecef',
    },
    removeItemButton: {
        backgroundColor: '#dc3545',
        color: 'white',
        border: 'none',
        borderRadius: '50%',
        width: '24px',
        height: '24px',
        fontSize: '0.8em',
        cursor: 'pointer',
    },
    carritoResumen: {
        marginTop: '20px',
        paddingTop: '20px',
        borderTop: '1px solid #e9ecef',
    },
    metodoPagoSelector: {
        marginBottom: '15px',
    },
    checkoutButton: {
        backgroundColor: '#007bff',
        color: 'white',
        border: 'none',
        borderRadius: '5px',
        padding: '12px 20px',
        cursor: 'pointer',
        fontSize: '1.1em',
        fontWeight: 'bold',
        width: '100%',
        marginTop: '10px',
    },
    clearCartButton: {
        backgroundColor: '#6c757d',
        color: 'white',
        border: 'none',
        borderRadius: '5px',
        padding: '10px',
        cursor: 'pointer',
        fontSize: '1em',
        fontWeight: 'bold',
        width: '100%',
        marginTop: '10px',
    },
    alerta: {
        padding: '10px',
        borderRadius: '5px',
        marginBottom: '15px',
        textAlign: 'center',
    },
    alertaSuccess: {
        backgroundColor: '#d4edda',
        color: '#155724',
    },
    alertaError: {
        backgroundColor: '#f8d7da',
        color: '#721c24',
    },
    loadingMessage: {
        padding: '20px',
        textAlign: 'center',
        fontSize: '1.1em',
        color: '#555',
    },
    errorMessage: {
        padding: '20px',
        textAlign: 'center',
        fontSize: '1.1em',
        color: '#dc3545',
        backgroundColor: '#ffe3e6',
        borderRadius: '8px',
    }
};

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
    const { token, isAuthenticated, selectedStoreSlug } = useAuth();
    const navigate = useNavigate();
    const [productos, setProductos] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [searchTerm, setSearchTerm] = useState('');
    const [carrito, setCarrito] = useState([]);
    const [total, setTotal] = useState(0);
    const [metodosPago, setMetodosPago] = useState([]);
    const [selectedMetodoPago, setSelectedMetodoPago] = useState(null);
    const [alerta, setAlerta] = useState({ mensaje: '', tipo: '' });
    const [tiendaId, setTiendaId] = useState(null);

    const fetchMetodosPago = useCallback(async () => {
        try {
            const config = { headers: { 'Authorization': `Bearer ${token}` } };
            const response = await axios.get(`${BASE_API_ENDPOINT}/api/metodos_pago/`, config);
            setMetodosPago(response.data);
            if (response.data.length > 0) {
                setSelectedMetodoPago(response.data[0].id);
            }
        } catch (err) {
            console.error('Error al obtener métodos de pago:', err);
            setAlerta({ mensaje: 'Error al cargar métodos de pago.', tipo: 'error' });
        }
    }, [token]);

    const fetchProductos = useCallback(async () => {
        if (!selectedStoreSlug) {
            setLoading(false);
            return;
        }
        
        try {
            const config = { headers: { 'Authorization': `Bearer ${token}` } };
            const response = await axios.get(`${BASE_API_ENDPOINT}/api/tiendas/`, config);
            const tienda = response.data.results.find(t => t.nombre === selectedStoreSlug);
            if (tienda) {
                setTiendaId(tienda.id);
                const productosResponse = await axios.get(`${BASE_API_ENDPOINT}/api/productos/?tienda_slug=${selectedStoreSlug}`, config);
                setProductos(productosResponse.data.results);
            } else {
                setError('Tienda no encontrada.');
            }
        } catch (err) {
            setError('Error al cargar productos o tiendas.');
            console.error(err);
        } finally {
            setLoading(false);
        }
    }, [token, selectedStoreSlug]);

    useEffect(() => {
        if (!isAuthenticated) {
            navigate('/login');
            return;
        }
        fetchProductos();
        fetchMetodosPago();
    }, [isAuthenticated, navigate, fetchProductos, fetchMetodosPago]);

    const handleSearch = (e) => {
        setSearchTerm(e.target.value);
    };

    const handleAddProducto = (producto) => {
        if (producto.stock <= 0) {
            setAlerta({ mensaje: `El producto ${producto.nombre} no tiene stock.`, tipo: 'error' });
            return;
        }

        const existeEnCarrito = carrito.find(item => item.producto.id === producto.id);
        if (existeEnCarrito) {
            if (existeEnCarrito.cantidad + 1 > producto.stock) {
                setAlerta({ mensaje: `No hay suficiente stock para añadir más de ${producto.nombre}.`, tipo: 'error' });
                return;
            }
            setCarrito(carrito.map(item =>
                item.producto.id === producto.id
                    ? { ...item, cantidad: item.cantidad + 1, subtotal: (item.cantidad + 1) * item.producto.precio }
                    : item
            ));
        } else {
            setCarrito([...carrito, { producto, cantidad: 1, subtotal: producto.precio }]);
        }
        setAlerta({ mensaje: `Producto ${producto.nombre} añadido al carrito.`, tipo: 'success' });
    };

    const handleRemoveItem = (productoId) => {
        const nuevoCarrito = carrito.filter(item => item.producto.id !== productoId);
        setCarrito(nuevoCarrito);
        setAlerta({ mensaje: 'Producto eliminado del carrito.', tipo: 'success' });
    };

    const handleClearCart = () => {
        setCarrito([]);
        setAlerta({ mensaje: 'Carrito vaciado.', tipo: 'success' });
    };

    useEffect(() => {
        const nuevoTotal = carrito.reduce((sum, item) => sum + item.subtotal, 0);
        setTotal(nuevoTotal);
    }, [carrito]);

    const handleVenta = async () => {
        if (carrito.length === 0) {
            setAlerta({ mensaje: 'El carrito está vacío.', tipo: 'error' });
            return;
        }
    
        const ventaData = {
            monto_final: total,
            metodo_pago: selectedMetodoPago,
            tienda: tiendaId,
            detalle_venta: carrito.map(item => ({
                producto: item.producto.id,
                cantidad: item.cantidad,
                precio_unitario: item.producto.precio
            }))
        };

        const config = {
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            }
        };

        try {
            await axios.post(`${BASE_API_ENDPOINT}/api/ventas/`, ventaData, config);
            setAlerta({ mensaje: 'Venta realizada con éxito.', tipo: 'success' });
            handleClearCart();
            fetchProductos();
        } catch (err) {
            console.error('Error al procesar la venta:', err.response || err.message);
            const errorMsg = err.response && err.response.data 
                ? JSON.stringify(err.response.data) 
                : err.message;
            setAlerta({ mensaje: `Error al procesar la venta: ${errorMsg}`, tipo: 'error' });
        }
    };

    const productosFiltrados = productos.filter(p =>
        p.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (p.codigo_barras && p.codigo_barras.includes(searchTerm))
    );

    if (loading) {
        return <div style={styles.loadingMessage}>Cargando productos...</div>;
    }

    if (error) {
        return <div style={styles.errorMessage}>{error}</div>;
    }
    
    return (
        <div style={styles.puntoVentaContainer}>
            <div style={styles.mainContent}>
                <div style={styles.productosListContainer}>
                    <input
                        type="text"
                        placeholder="Buscar producto por nombre o código de barras..."
                        value={searchTerm}
                        onChange={handleSearch}
                        style={styles.searchInput}
                    />
                    <div style={styles.productosGrid}>
                        {productosFiltrados.length > 0 ? (
                            productosFiltrados.map(producto => (
                                <div key={producto.id} style={styles.productoCard}>
                                    <h3>{producto.nombre} ({producto.talle})</h3>
                                    <p style={styles.productoCardPrice}>${parseFloat(producto.precio).toFixed(2)}</p>
                                    <p style={styles.productoCardStock}>Stock: {producto.stock}</p>
                                    <button 
                                        onClick={() => handleAddProducto(producto)} 
                                        style={producto.stock <= 0 ? { ...styles.addToCartButton, ...styles.addToCartButtonDisabled } : styles.addToCartButton} 
                                        disabled={producto.stock <= 0}
                                    >
                                        Añadir al Carrito
                                    </button>
                                </div>
                            ))
                        ) : (
                            <p>No se encontraron productos.</p>
                        )}
                    </div>
                </div>
                <div style={styles.carritoContainer}>
                    <h2>Carrito de Compras</h2>
                    <div style={styles.alertaContainer}>
                        {alerta.mensaje && (
                            <div style={{ ...styles.alerta, ...(alerta.tipo === 'success' ? styles.alertaSuccess : styles.alertaError) }}>
                                {alerta.mensaje}
                            </div>
                        )}
                    </div>
                    <ul style={styles.carritoList}>
                        {carrito.map(item => (
                            <li key={item.producto.id} style={styles.carritoItem}>
                                <span>{item.cantidad} x {item.producto.nombre} ({item.producto.talle})</span>
                                <span>${item.subtotal.toFixed(2)}</span>
                                <button onClick={() => handleRemoveItem(item.producto.id)} style={styles.removeItemButton}>X</button>
                            </li>
                        ))}
                    </ul>
                    <div style={styles.carritoResumen}>
                        <h3>Total: ${total.toFixed(2)}</h3>
                        <div style={styles.metodoPagoSelector}>
                            <label htmlFor="metodo-pago">Método de Pago:</label>
                            <select
                                id="metodo-pago"
                                value={selectedMetodoPago || ''}
                                onChange={(e) => setSelectedMetodoPago(e.target.value)}
                            >
                                {metodosPago.map(metodo => (
                                    <option key={metodo.id} value={metodo.id}>{metodo.nombre}</option>
                                ))}
                            </select>
                        </div>
                        <button onClick={handleVenta} style={styles.checkoutButton} disabled={carrito.length === 0}>
                            Procesar Venta
                        </button>
                        <button onClick={handleClearCart} style={styles.clearCartButton}>
                            Vaciar Carrito
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default PuntoVenta;