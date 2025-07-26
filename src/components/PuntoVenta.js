// BONITO_AMOR/frontend/src/pages/PuntoVenta.js
import React, { useState, useEffect, useContext } from 'react';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext'; // Asumiendo que tienes un AuthContext
import { useNavigate } from 'react-router-dom'; // Para redireccionar después de la venta

// Importa otros componentes que uses en PuntoVenta.js (ej. ProductList, CartDisplay, etc.)
// import ProductList from '../components/ProductList'; 
// import CartDisplay from '../components/CartDisplay';

function PuntoVenta() {
    const { user, authToken } = useContext(AuthContext); // Obtener usuario y token del contexto
    const navigate = useNavigate(); // Hook para navegación

    // Estados para el carrito, método de pago, etc.
    const [cartItems, setCartItems] = useState([]); // Ejemplo: [{ id: 'uuid-producto-1', nombre: 'Producto A', quantity: 2, precio: 10.00 }]
    const [selectedPaymentMethod, setSelectedPaymentMethod] = useState('Efectivo');
    const [productosDisponibles, setProductosDisponibles] = useState([]); // Para la lista de productos
    const [searchTerm, setSearchTerm] = useState(''); // Para la búsqueda de productos
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    // Efecto para cargar productos disponibles (puedes ajustar esto según tu lógica)
    useEffect(() => {
        const fetchProducts = async () => {
            if (!authToken) {
                // Si no hay token, no se pueden cargar productos
                return;
            }
            setLoading(true);
            setError(null);
            try {
                const response = await axios.get(`${process.env.REACT_APP_API_URL}/api/productos/`, {
                    headers: {
                        Authorization: `Bearer ${authToken}`,
                    },
                    params: { search: searchTerm } // Si tienes funcionalidad de búsqueda
                });
                setProductosDisponibles(response.data.results); // Asumiendo paginación de DRF
            } catch (err) {
                console.error("Error al cargar productos:", err);
                setError("Error al cargar productos.");
            } finally {
                setLoading(false);
            }
        };

        fetchProducts();
    }, [authToken, searchTerm]); // Recargar si el token o el término de búsqueda cambian

    // Función para añadir productos al carrito
    const addToCart = (productToAdd) => {
        setCartItems(prevItems => {
            const existingItem = prevItems.find(item => item.id === productToAdd.id);
            if (existingItem) {
                return prevItems.map(item =>
                    item.id === productToAdd.id ? { ...item, quantity: item.quantity + 1 } : item
                );
            } else {
                return [...prevItems, { ...productToAdd, quantity: 1 }];
            }
        });
    };

    // Función para quitar productos del carrito
    const removeFromCart = (productId) => {
        setCartItems(prevItems => prevItems.filter(item => item.id !== productId));
    };

    // Función para actualizar la cantidad de un producto en el carrito
    const updateCartItemQuantity = (productId, newQuantity) => {
        setCartItems(prevItems => {
            if (newQuantity <= 0) {
                return prevItems.filter(item => item.id !== productId);
            }
            return prevItems.map(item =>
                item.id === productId ? { ...item, quantity: newQuantity } : item
            );
        });
    };

    // Función para calcular el total del carrito
    const calculateCartTotal = () => {
        return cartItems.reduce((total, item) => total + (parseFloat(item.precio) * item.quantity), 0).toFixed(2);
    };

    // --- FUNCIÓN CLAVE: Procesar Venta ---
    const handleProcessSale = async () => {
        if (cartItems.length === 0) {
            alert('El carrito está vacío. Agregue productos antes de procesar la venta.');
            return;
        }

        // 1. Preparar la lista de productos para el backend
        const productosData = cartItems.map(item => ({
            producto_id: item.id, // Asegúrate de que 'item.id' es el UUID del producto
            cantidad: item.quantity,
        }));

        // 2. Obtener el ID de la tienda del usuario autenticado
        // El backend espera un UUID para 'tienda'
        const tiendaId = user?.tienda_id; 

        if (!tiendaId) {
            alert('Error: El usuario no está asociado a ninguna tienda. No se puede procesar la venta.');
            console.error('User object:', user); // Debugging: verificar el objeto user
            return;
        }

        try {
            const saleData = {
                metodo_pago: selectedPaymentMethod,
                productos: productosData, // La lista de productos preparada
                tienda: tiendaId,         // El ID de la tienda del usuario
            };

            console.log('Datos enviados al backend para la venta:', saleData); // Debugging

            const response = await axios.post(
                `${process.env.REACT_APP_API_URL}/api/ventas/`,
                saleData,
                {
                    headers: {
                        Authorization: `Bearer ${authToken}`, // Usar el token del contexto
                        'Content-Type': 'application/json', // Asegurar el tipo de contenido
                    },
                }
            );
            console.log('Venta procesada con éxito:', response.data);
            alert('Venta procesada con éxito!');
            setCartItems([]); // Limpiar el carrito después de una venta exitosa
            // Opcional: Redirigir a una página de confirmación o historial de ventas
            // navigate('/ventas/confirmacion'); 

        } catch (error) {
            console.error('Error al procesar la venta:', error.response ? error.response.data : error.message);
            alert(`Error al procesar la venta: ${JSON.stringify(error.response ? error.response.data : error.message)}`);
        }
    };

    // Si el usuario no está autenticado, redirigir o mostrar un mensaje
    if (!authToken) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-gray-100">
                <p className="text-xl text-gray-700">Por favor, inicie sesión para acceder al punto de venta.</p>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-100 p-4">
            <h1 className="text-3xl font-bold text-center mb-6 text-gray-800">Punto de Venta</h1>

            <div className="flex flex-col md:flex-row gap-6">
                {/* Sección de búsqueda y lista de productos */}
                <div className="flex-1 bg-white p-6 rounded-lg shadow-md">
                    <h2 className="text-2xl font-semibold mb-4 text-gray-700">Productos</h2>
                    <input
                        type="text"
                        placeholder="Buscar producto..."
                        className="w-full p-2 border border-gray-300 rounded-md mb-4 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                    {loading && <p className="text-center text-gray-500">Cargando productos...</p>}
                    {error && <p className="text-center text-red-500">{error}</p>}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 max-h-96 overflow-y-auto">
                        {productosDisponibles.map(product => (
                            <div key={product.id} className="border p-4 rounded-lg shadow-sm bg-gray-50 flex flex-col justify-between">
                                <div>
                                    <h3 className="font-bold text-gray-800">{product.nombre}</h3>
                                    <p className="text-gray-600 text-sm">Talle: {product.talle}</p>
                                    <p className="text-green-600 font-semibold">${parseFloat(product.precio).toFixed(2)}</p>
                                    <p className="text-gray-500 text-xs">Stock: {product.stock}</p>
                                </div>
                                <button
                                    onClick={() => addToCart(product)}
                                    className="mt-3 bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded-md transition duration-300 ease-in-out"
                                >
                                    Agregar al Carrito
                                </button>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Sección del carrito y resumen de venta */}
                <div className="flex-1 bg-white p-6 rounded-lg shadow-md">
                    <h2 className="text-2xl font-semibold mb-4 text-gray-700">Carrito de Compras</h2>
                    {cartItems.length === 0 ? (
                        <p className="text-gray-500">El carrito está vacío.</p>
                    ) : (
                        <div className="max-h-80 overflow-y-auto mb-4">
                            {cartItems.map(item => (
                                <div key={item.id} className="flex justify-between items-center border-b pb-2 mb-2">
                                    <div>
                                        <p className="font-medium text-gray-800">{item.nombre} ({item.talle})</p>
                                        <p className="text-sm text-gray-600">${parseFloat(item.precio).toFixed(2)} x {item.quantity}</p>
                                    </div>
                                    <div className="flex items-center">
                                        <button
                                            onClick={() => updateCartItemQuantity(item.id, item.quantity - 1)}
                                            className="bg-red-400 hover:bg-red-500 text-white px-2 py-1 rounded-md text-sm mr-1"
                                        >
                                            -
                                        </button>
                                        <span className="font-bold">{item.quantity}</span>
                                        <button
                                            onClick={() => updateCartItemQuantity(item.id, item.quantity + 1)}
                                            className="bg-green-400 hover:bg-green-500 text-white px-2 py-1 rounded-md text-sm ml-1"
                                        >
                                            +
                                        </button>
                                        <button
                                            onClick={() => removeFromCart(item.id)}
                                            className="ml-2 bg-red-600 hover:bg-red-700 text-white font-bold py-1 px-2 rounded-md text-sm"
                                        >
                                            X
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    <div className="mt-4 pt-4 border-t border-gray-300">
                        <p className="text-xl font-bold text-gray-800">Total: ${calculateCartTotal()}</p>
                        
                        <div className="mt-4">
                            <label htmlFor="paymentMethod" className="block text-gray-700 text-sm font-bold mb-2">Método de Pago:</label>
                            <select
                                id="paymentMethod"
                                className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                value={selectedPaymentMethod}
                                onChange={(e) => setSelectedPaymentMethod(e.target.value)}
                            >
                                <option value="Efectivo">Efectivo</option>
                                <option value="Tarjeta">Tarjeta</option>
                                <option value="Transferencia">Transferencia</option>
                            </select>
                        </div>

                        <button
                            onClick={handleProcessSale}
                            className="w-full mt-6 bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-6 rounded-md text-lg transition duration-300 ease-in-out"
                        >
                            Procesar Venta
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default PuntoVenta;
