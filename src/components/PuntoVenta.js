// BONITO_AMOR/frontend/src/components/PuntoVenta.js

import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../AuthContext';
import '../styles/PuntoVenta.css';

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
            tienda_slug: selectedStoreSlug, // Envía el slug de la tienda
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
            // Refresca la lista de productos para actualizar el stock
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
        return <div className="loading-message">Cargando productos...</div>;
    }

    if (error) {
        return <div className="error-message">{error}</div>;
    }
    
    return (
        <div className="punto-venta-container">
            <div className="main-content">
                <div className="productos-list-container">
                    <input
                        type="text"
                        placeholder="Buscar producto por nombre o código de barras..."
                        value={searchTerm}
                        onChange={handleSearch}
                        className="search-input"
                    />
                    <div className="productos-grid">
                        {productosFiltrados.length > 0 ? (
                            productosFiltrados.map(producto => (
                                <div key={producto.id} className="producto-card">
                                    <h3>{producto.nombre} ({producto.talle})</h3>
                                    <p className="producto-card-price">${parseFloat(producto.precio).toFixed(2)}</p>
                                    <p className="producto-card-stock">Stock: {producto.stock}</p>
                                    <button onClick={() => handleAddProducto(producto)} className="add-to-cart-button" disabled={producto.stock <= 0}>
                                        Añadir al Carrito
                                    </button>
                                </div>
                            ))
                        ) : (
                            <p>No se encontraron productos.</p>
                        )}
                    </div>
                </div>
                <div className="carrito-container">
                    <h2>Carrito de Compras</h2>
                    <div className="alerta-container">
                        {alerta.mensaje && (
                            <div className={`alerta ${alerta.tipo}`}>
                                {alerta.mensaje}
                            </div>
                        )}
                    </div>
                    <ul className="carrito-list">
                        {carrito.map(item => (
                            <li key={item.producto.id} className="carrito-item">
                                <span>{item.cantidad} x {item.producto.nombre} ({item.producto.talle})</span>
                                <span>${item.subtotal.toFixed(2)}</span>
                                <button onClick={() => handleRemoveItem(item.producto.id)} className="remove-item-button">X</button>
                            </li>
                        ))}
                    </ul>
                    <div className="carrito-resumen">
                        <h3>Total: ${total.toFixed(2)}</h3>
                        <div className="metodo-pago-selector">
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
                        <button onClick={handleVenta} className="checkout-button" disabled={carrito.length === 0}>
                            Procesar Venta
                        </button>
                        <button onClick={handleClearCart} className="clear-cart-button">
                            Vaciar Carrito
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default PuntoVenta;