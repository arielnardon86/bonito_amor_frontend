// BONITO_AMOR/frontend/src/components/Productos.js
import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { useAuth } from '../AuthContext';

const API_BASE_URL = process.env.REACT_APP_API_URL;

function Productos() {
    const { token, selectedStoreSlug, isAuthenticated, loading: authLoading } = useAuth();
    const [productos, setProductos] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);

    // Estados para el formulario de nuevo producto
    const [nombre, setNombre] = useState('');
    const [descripcion, setDescripcion] = useState('');
    const [precio, setPrecio] = useState(''); // Asegúrate de que se inicialice y se maneje como string para el input
    const [stock, setStock] = useState('');
    const [categoria, setCategoria] = useState(''); // ID de la categoría
    const [categorias, setCategorias] = useState([]); // Lista de categorías para el select

    // Estados para la edición
    const [editProductId, setEditProductId] = useState(null);
    const [editNombre, setEditNombre] = useState('');
    const [editDescripcion, setEditDescripcion] = useState('');
    const [editPrecio, setEditPrecio] = useState('');
    const [editStock, setEditStock] = useState('');
    const [editCategoria, setEditCategoria] = useState('');

    // Estado para el término de búsqueda de productos
    const [searchTerm, setSearchTerm] = useState('');

    // Función para cargar categorías
    const fetchCategorias = useCallback(async () => {
        if (!token) return;
        try {
            const response = await axios.get(`${API_BASE_URL}/categorias/`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            setCategorias(response.data.results || response.data);
        } catch (err) {
            console.error("Error al cargar categorías:", err.response ? err.response.data : err.message);
            setError("Error al cargar categorías.");
        }
    }, [token]);

    // Función para cargar productos
    const fetchProductos = useCallback(async () => {
        if (!token || !selectedStoreSlug) {
            setIsLoading(false);
            return;
        }
        setIsLoading(true);
        setError(null);
        try {
            const response = await axios.get(`${API_BASE_URL}/productos/`, {
                headers: { 'Authorization': `Bearer ${token}` },
                params: { tienda_slug: selectedStoreSlug } // Asegúrate de que esto se envíe
            });
            setProductos(response.data.results || response.data);
        } catch (err) {
            console.error("Error al cargar productos:", err.response ? err.response.data : err.message);
            setError("Error al cargar productos.");
        } finally {
            setIsLoading(false);
        }
    }, [token, selectedStoreSlug]);

    useEffect(() => {
        if (!authLoading && isAuthenticated && selectedStoreSlug) {
            fetchCategorias();
            fetchProductos();
        } else if (!authLoading && isAuthenticated && !selectedStoreSlug) {
            setIsLoading(false); // No cargar productos si no hay tienda seleccionada
        }
    }, [isAuthenticated, authLoading, selectedStoreSlug, fetchCategorias, fetchProductos]);

    // Manejador para el envío del formulario de nuevo producto
    const handleSubmit = async (e) => {
        e.preventDefault();
        setError(null);

        if (!selectedStoreSlug) {
            alert('Por favor, selecciona una tienda antes de añadir productos.');
            return;
        }
        if (!nombre || !precio || !stock || !categoria) {
            alert('Por favor, completa todos los campos obligatorios (Nombre, Precio, Stock, Categoría).');
            return;
        }

        // Asegúrate de que precio y stock sean números
        const parsedPrecio = parseFloat(precio);
        const parsedStock = parseInt(stock, 10);

        if (isNaN(parsedPrecio) || parsedPrecio <= 0) {
            alert('El precio debe ser un número válido mayor que cero.');
            return;
        }
        if (isNaN(parsedStock) || parsedStock < 0) {
            alert('El stock debe ser un número entero válido mayor o igual a cero.');
            return;
        }

        const newProduct = {
            nombre,
            descripcion,
            precio: parsedPrecio, // Envía el precio como número
            stock: parsedStock,   // Envía el stock como número
            categoria: categoria,
            // NO envíes la tienda aquí, el backend la asignará
        };

        try {
            await axios.post(`${API_BASE_URL}/productos/`, newProduct, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            alert('Producto añadido con éxito.');
            setNombre('');
            setDescripcion('');
            setPrecio(''); // Limpiar a string vacío
            setStock('');  // Limpiar a string vacío
            setCategoria('');
            fetchProductos(); // Recargar la lista de productos
        } catch (err) {
            console.error("Error al añadir el producto:", err.response ? err.response.data : err.message);
            setError("Error al añadir el producto: " + (err.response ? JSON.stringify(err.response.data) : err.message));
        }
    };

    // Manejador para iniciar la edición de un producto
    const handleEditClick = (product) => {
        setEditProductId(product.id);
        setEditNombre(product.nombre);
        setEditDescripcion(product.descripcion || '');
        setEditPrecio(product.precio.toString()); // Convertir a string para el input
        setEditStock(product.stock.toString());   // Convertir a string para el input
        setEditCategoria(product.categoria || '');
    };

    // Manejador para guardar los cambios de un producto editado
    const handleSaveEdit = async (e) => {
        e.preventDefault();
        setError(null);

        if (!editNombre || !editPrecio || !editStock || !editCategoria) {
            alert('Por favor, completa todos los campos obligatorios para la edición.');
            return;
        }

        const parsedEditPrecio = parseFloat(editPrecio);
        const parsedEditStock = parseInt(editStock, 10);

        if (isNaN(parsedEditPrecio) || parsedEditPrecio <= 0) {
            alert('El precio editado debe ser un número válido mayor que cero.');
            return;
        }
        if (isNaN(parsedEditStock) || parsedEditStock < 0) {
            alert('El stock editado debe ser un número entero válido mayor o igual a cero.');
            return;
        }

        const updatedProduct = {
            nombre: editNombre,
            descripcion: editDescripcion,
            precio: parsedEditPrecio,
            stock: parsedEditStock,
            categoria: editCategoria,
            // NO envíes la tienda aquí
        };

        try {
            await axios.put(`${API_BASE_URL}/productos/${editProductId}/`, updatedProduct, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            alert('Producto actualizado con éxito.');
            setEditProductId(null); // Salir del modo edición
            fetchProductos(); // Recargar la lista de productos
        } catch (err) {
            console.error("Error al actualizar el producto:", err.response ? err.response.data : err.message);
            setError("Error al actualizar el producto: " + (err.response ? JSON.stringify(err.response.data) : err.message));
        }
    };

    // Manejador para eliminar un producto
    const handleDelete = async (productId) => {
        if (window.confirm('¿Estás seguro de que quieres eliminar este producto?')) {
            setError(null);
            try {
                await axios.delete(`${API_BASE_URL}/productos/${productId}/`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                alert('Producto eliminado con éxito.');
                fetchProductos(); // Recargar la lista de productos
            } catch (err) {
                console.error("Error al eliminar el producto:", err.response ? err.response.data : err.message);
                setError("Error al eliminar el producto: " + (err.response ? JSON.stringify(err.response.data) : err.message));
            }
        }
    };

    // Filtrar productos por término de búsqueda
    const filteredProductos = productos.filter(producto =>
        producto.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (producto.categoria_nombre && producto.categoria_nombre.toLowerCase().includes(searchTerm.toLowerCase()))
    );

    // Renderizado condicional si no hay tienda seleccionada
    if (!selectedStoreSlug) {
        return (
            <div style={{ padding: '50px', textAlign: 'center' }}>
                <h2>Por favor, selecciona una tienda en la barra de navegación para gestionar productos.</h2>
            </div>
        );
    }

    return (
        <div style={{ padding: '20px', fontFamily: 'Arial, sans-serif', maxWidth: '1200px', margin: 'auto' }}>
            <h1>Gestión de Productos ({selectedStoreSlug})</h1>

            {error && <p style={{ color: 'red', backgroundColor: '#ffe3e6', padding: '10px', borderRadius: '5px' }}>{error}</p>}

            {/* Formulario para añadir/editar producto */}
            <div style={{ marginBottom: '30px', border: '1px solid #ccc', padding: '20px', borderRadius: '8px', backgroundColor: '#f9f9f9' }}>
                <h2>{editProductId ? 'Editar Producto' : 'Añadir Nuevo Producto'}</h2>
                <form onSubmit={editProductId ? handleSaveEdit : handleSubmit} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                    <div>
                        <label style={{ display: 'block', marginBottom: '5px' }}>Nombre:</label>
                        <input
                            type="text"
                            value={editProductId ? editNombre : nombre}
                            onChange={(e) => editProductId ? setEditNombre(e.target.value) : setNombre(e.target.value)}
                            required
                            style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '4px' }}
                        />
                    </div>
                    <div>
                        <label style={{ display: 'block', marginBottom: '5px' }}>Descripción:</label>
                        <textarea
                            value={editProductId ? editDescripcion : descripcion}
                            onChange={(e) => editProductId ? setEditDescripcion(e.target.value) : setDescripcion(e.target.value)}
                            style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '4px', minHeight: '60px' }}
                        ></textarea>
                    </div>
                    <div>
                        <label style={{ display: 'block', marginBottom: '5px' }}>Precio:</label>
                        <input
                            type="number"
                            step="0.01"
                            value={editProductId ? editPrecio : precio}
                            onChange={(e) => editProductId ? setEditPrecio(e.target.value) : setPrecio(e.target.value)}
                            required
                            style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '4px' }}
                        />
                    </div>
                    <div>
                        <label style={{ display: 'block', marginBottom: '5px' }}>Stock:</label>
                        <input
                            type="number"
                            value={editProductId ? editStock : stock}
                            onChange={(e) => editProductId ? setEditStock(e.target.value) : setStock(e.target.value)}
                            required
                            style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '4px' }}
                        />
                    </div>
                    <div>
                        <label style={{ display: 'block', marginBottom: '5px' }}>Categoría:</label>
                        <select
                            value={editProductId ? editCategoria : categoria}
                            onChange={(e) => editProductId ? setEditCategoria(e.target.value) : setCategoria(e.target.value)}
                            required
                            style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '4px' }}
                        >
                            <option value="">Selecciona una categoría</option>
                            {categorias.map(cat => (
                                <option key={cat.id} value={cat.id}>{cat.nombre}</option>
                            ))}
                        </select>
                    </div>
                    <div style={{ gridColumn: '1 / -1', display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                        <button type="submit" style={{ padding: '10px 20px', backgroundColor: '#007bff', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer' }}>
                            {editProductId ? 'Guardar Cambios' : 'Añadir Producto'}
                        </button>
                        {editProductId && (
                            <button type="button" onClick={() => setEditProductId(null)} style={{ padding: '10px 20px', backgroundColor: '#6c757d', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer' }}>
                                Cancelar Edición
                            </button>
                        )}
                    </div>
                </form>
            </div>

            {/* Lista de Productos */}
            <div style={{ marginBottom: '20px' }}>
                <h2>Listado de Productos</h2>
                <input
                    type="text"
                    placeholder="Buscar productos por nombre o categoría..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    style={{ width: '100%', padding: '10px', marginBottom: '15px', border: '1px solid #ddd', borderRadius: '4px' }}
                />
                {isLoading ? (
                    <p>Cargando productos...</p>
                ) : filteredProductos.length === 0 ? (
                    <p>No hay productos registrados en esta tienda o no coinciden con la búsqueda.</p>
                ) : (
                    <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', border: '1px solid #ddd' }}>
                        <thead>
                            <tr style={{ backgroundColor: '#f2f2f2' }}>
                                <th style={{ padding: '8px', border: '1px solid #ddd' }}>Nombre</th>
                                <th style={{ padding: '8px', border: '1px solid #ddd' }}>Descripción</th>
                                <th style={{ padding: '8px', border: '1px solid #ddd' }}>Categoría</th>
                                <th style={{ padding: '8px', border: '1px solid #ddd' }}>Precio</th>
                                <th style={{ padding: '8px', border: '1px solid #ddd' }}>Stock</th>
                                <th style={{ padding: '8px', border: '1px solid #ddd' }}>Acciones</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredProductos.map(producto => (
                                <tr key={producto.id}>
                                    <td style={{ padding: '8px', border: '1px solid #ddd' }}>{producto.nombre}</td>
                                    <td style={{ padding: '8px', border: '1px solid #ddd' }}>{producto.descripcion || 'N/A'}</td>
                                    <td style={{ padding: '8px', border: '1px solid #ddd' }}>{producto.categoria_nombre || 'Sin Categoría'}</td>
                                    <td style={{ padding: '8px', border: '1px solid #ddd' }}>${parseFloat(producto.precio).toFixed(2)}</td>
                                    <td style={{ padding: '8px', border: '1px solid #ddd' }}>{producto.stock}</td>
                                    <td style={{ padding: '8px', border: '1px solid #ddd' }}>
                                        <button onClick={() => handleEditClick(producto)} style={{ padding: '5px 10px', backgroundColor: '#ffc107', color: 'black', border: 'none', borderRadius: '3px', cursor: 'pointer', marginRight: '5px' }}>
                                            Editar
                                        </button>
                                        <button onClick={() => handleDelete(producto.id)} style={{ padding: '5px 10px', backgroundColor: '#dc3545', color: 'white', border: 'none', borderRadius: '3px', cursor: 'pointer' }}>
                                            Eliminar
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>
        </div>
    );
}

export default Productos;
