// BONITO_AMOR/frontend/src/components/Productos.js
import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { useAuth } from '../AuthContext';
import { useNavigate } from 'react-router-dom';
import JsBarcode from 'jsbarcode';

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

const Productos = () => {
    const { user, isAuthenticated, loading: authLoading, selectedStoreSlug, token } = useAuth();
    const navigate = useNavigate();

    const [productos, setProductos] = useState([]);
    const [loadingProducts, setLoadingProducts] = useState(true);
    const [error, setError] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [nextPage, setNextPage] = useState(null);
    const [prevPage, setPrevPage] = useState(null);

    const [newProduct, setNewProduct] = useState({
        nombre: '',
        talle: 'UNICO',
        precio: '',
        stock: '',
        codigo_barras: '',
    });
    
    // Estados para la edición y eliminación
    const [editProduct, setEditProduct] = useState(null);
    const [showEditModal, setShowEditModal] = useState(false);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [productToDelete, setProductToDelete] = useState(null);

    // Estado para la impresión de etiquetas
    const [etiquetasSeleccionadas, setEtiquetasSeleccionadas] = useState({});

    // Generador de código de barras EAN-13 para Argentina
    const generarCodigoDeBarrasEAN13 = () => {
        let code = '779' + Math.floor(100000000 + Math.random() * 900000000).toString();
        let sum = 0;
        for (let i = 0; i < 12; i++) {
            sum += parseInt(code[i], 10) * (i % 2 === 0 ? 1 : 3);
        }
        const checksum = (10 - (sum % 10)) % 10;
        return code + checksum.toString();
    };

    const fetchProductos = useCallback(async (pageUrl = null) => {
        if (!token || !selectedStoreSlug) {
            setLoadingProducts(false);
            return;
        }

        setLoadingProducts(true);
        setError(null);
        try {
            const url = pageUrl || `${BASE_API_ENDPOINT}/api/productos/`;
            const response = await axios.get(url, {
                headers: { 'Authorization': `Bearer ${token}` },
                params: {
                    tienda_slug: selectedStoreSlug,
                    search: searchTerm
                }
            });
            setProductos(response.data.results);
            setNextPage(response.data.next);
            setPrevPage(response.data.previous);
            setTotalPages(Math.ceil(response.data.count / 10)); // Asumiendo 10 por página
            setLoadingProducts(false);
        } catch (err) {
            setError('Error al cargar productos: ' + (err.response ? JSON.stringify(err.response.data) : err.message));
            setLoadingProducts(false);
        }
    }, [token, selectedStoreSlug, searchTerm]);

    useEffect(() => {
        if (!authLoading && isAuthenticated && user && (user.is_superuser || user.is_staff) && selectedStoreSlug) {
            fetchProductos();
        } else if (!authLoading && (!isAuthenticated || !user || !user.is_superuser)) { 
            setError("Acceso denegado. Solo los administradores pueden ver/gestionar productos.");
            setLoadingProducts(false);
        } else if (!authLoading && isAuthenticated && user && user.is_superuser && !selectedStoreSlug) {
            setLoadingProducts(false);
        }
    }, [isAuthenticated, user, authLoading, selectedStoreSlug, fetchProductos]);

    const handleCreateProduct = async (e) => {
        e.preventDefault();
        setLoadingProducts(true);
        setError(null);

        const productToCreate = {
            ...newProduct,
            codigo_barras: newProduct.codigo_barras || generarCodigoDeBarrasEAN13(),
            tienda_slug: selectedStoreSlug,
        };

        try {
            await axios.post(`${BASE_API_ENDPOINT}/api/productos/`, productToCreate, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            setNewProduct({ nombre: '', talle: 'UNICO', precio: '', stock: '', codigo_barras: '' });
            fetchProductos();
        } catch (err) {
            setError('Error al crear producto: ' + (err.response ? JSON.stringify(err.response.data) : err.message));
            setLoadingProducts(false);
        }
    };
    
    // Maneja la edición completa del producto
    const handleEditProduct = async () => {
        setLoadingProducts(true);
        setError(null);
        try {
            const updatedProduct = {
                ...editProduct,
                tienda_slug: selectedStoreSlug
            };
            await axios.patch(`${BASE_API_ENDPOINT}/api/productos/${editProduct.id}/`, updatedProduct, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            setEditProduct(null);
            setShowEditModal(false);
            fetchProductos();
        } catch (err) {
            setError('Error al editar producto: ' + (err.response ? JSON.stringify(err.response.data) : err.message));
            setLoadingProducts(false);
        }
    };
    
    // Maneja la eliminación del producto
    const handleDeleteProduct = async (id) => {
        setLoadingProducts(true);
        setError(null);
        try {
            await axios.delete(`${BASE_API_ENDPOINT}/api/productos/${id}/`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            setShowDeleteModal(false);
            setProductToDelete(null);
            fetchProductos();
        } catch (err) {
            setError('Error al eliminar producto: ' + (err.response ? JSON.stringify(err.response.data) : err.message));
            setLoadingProducts(false);
        }
    };

    const handleEtiquetasChange = (id, cantidad) => {
        setEtiquetasSeleccionadas(prev => ({
            ...prev,
            [id]: cantidad
        }));
    };
    
    const handleImprimirEtiquetas = () => {
        const productosParaImprimir = Object.entries(etiquetasSeleccionadas)
            .filter(([id, cantidad]) => cantidad > 0)
            .map(([id, cantidad]) => {
                const producto = productos.find(p => p.id == id);
                return {
                    ...producto,
                    labelQuantity: parseInt(cantidad, 10)
                };
            });
        
        if (productosParaImprimir.length > 0) {
            navigate('/etiquetas', { state: { productosParaImprimir } });
        } else {
            alert('No hay etiquetas seleccionadas para imprimir.');
        }
    };

    if (authLoading || (isAuthenticated && !user)) {
        return <div className="loading-message">Cargando datos de usuario...</div>;
    }

    if (!isAuthenticated || !user.is_superuser) {
        return <div className="access-denied-message">Acceso denegado. Solo los superusuarios pueden ver/gestionar productos.</div>;
    }
    if (!selectedStoreSlug) {
        return (
            <div className="no-store-selected-message">
                <h2>Por favor, selecciona una tienda en la barra de navegación para ver los productos.</h2>
            </div>
        );
    }
    
    return (
        <div className="container">
            <div className="header">
                <h1 className="title">Gestión de Productos ({selectedStoreSlug})</h1>
            </div>
            
            <div className="section">
                <h2 className="section-title">Agregar Nuevo Producto</h2>
                <form onSubmit={handleCreateProduct} className="form-desktop">
                    <div className="input-group">
                        <label className="label">Nombre</label>
                        <input
                            type="text"
                            value={newProduct.nombre}
                            onChange={(e) => setNewProduct({ ...newProduct, nombre: e.target.value })}
                            className="input-field"
                            required
                        />
                    </div>
                    <div className="input-group">
                        <label className="label">Talle</label>
                        <select
                            value={newProduct.talle}
                            onChange={(e) => setNewProduct({ ...newProduct, talle: e.target.value })}
                            className="input-field"
                            required
                        >
                            {TalleOptions.map(option => (
                                <option key={option.value} value={option.value}>{option.label}</option>
                            ))}
                        </select>
                    </div>
                    <div className="input-group">
                        <label className="label">Precio</label>
                        <input
                            type="number"
                            value={newProduct.precio}
                            onChange={(e) => setNewProduct({ ...newProduct, precio: e.target.value })}
                            className="input-field"
                            required
                        />
                    </div>
                    <div className="input-group">
                        <label className="label">Stock</label>
                        <input
                            type="number"
                            value={newProduct.stock}
                            onChange={(e) => setNewProduct({ ...newProduct, stock: e.target.value })}
                            className="input-field"
                            required
                        />
                    </div>
                    <div className="input-group">
                        <label className="label">Código de barras (si no se completa, se genera automáticamente)</label>
                        <input
                            type="text"
                            value={newProduct.codigo_barras}
                            onChange={(e) => setNewProduct({ ...newProduct, codigo_barras: e.target.value })}
                            className="input-field"
                        />
                    </div>
                    <button type="submit" className="submit-button" disabled={loadingProducts}>
                        {loadingProducts ? 'Creando...' : 'Crear Producto'}
                    </button>
                </form>
            </div>
            
            <div className="section">
                <div className="table-header">
                    <h2 className="section-title">Listado de Productos</h2>
                    <button onClick={handleImprimirEtiquetas} className="print-button">Imprimir Etiquetas</button>
                </div>
                <div className="filters-container">
                    <input
                        type="text"
                        placeholder="Buscar por nombre o talle..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="filter-input"
                    />
                    <button onClick={() => fetchProductos()} className="search-button">Buscar</button>
                </div>
                
                {loadingProducts ? (
                    <div className="loading-message">Cargando productos...</div>
                ) : error ? (
                    <div className="error-message">{error}</div>
                ) : (
                    <>
                        <div className="table-responsive">
                            <table className="table">
                                <thead>
                                    <tr>
                                        <th className="th">Seleccionar</th>
                                        <th className="th">Cantidad de etiquetas</th>
                                        <th className="th">Nombre</th>
                                        <th className="th">Talle</th>
                                        <th className="th">Precio</th>
                                        <th className="th">Stock</th>
                                        <th className="th">Acciones</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {productos.map(producto => (
                                        <tr key={producto.id}>
                                            <td className="td">
                                                <input 
                                                    type="checkbox" 
                                                    checked={!!etiquetasSeleccionadas[producto.id]} 
                                                    onChange={(e) => {
                                                        const isChecked = e.target.checked;
                                                        if (isChecked) {
                                                            handleEtiquetasChange(producto.id, 1);
                                                        } else {
                                                            const newSelections = { ...etiquetasSeleccionadas };
                                                            delete newSelections[producto.id];
                                                            setEtiquetasSeleccionadas(newSelections);
                                                        }
                                                    }}
                                                />
                                            </td>
                                            <td className="td">
                                                <input
                                                    type="number"
                                                    min="0"
                                                    value={etiquetasSeleccionadas[producto.id] || ''}
                                                    onChange={(e) => handleEtiquetasChange(producto.id, parseInt(e.target.value, 10) || 0)}
                                                    className="etiquetas-input"
                                                    disabled={!etiquetasSeleccionadas[producto.id]}
                                                />
                                            </td>
                                            <td className="td">{producto.nombre}</td>
                                            <td className="td">{producto.talle}</td>
                                            <td className="td">${parseFloat(producto.precio).toFixed(2)}</td>
                                            <td className="td">{producto.stock}</td>
                                            <td className="td">
                                                <button onClick={() => {
                                                    setEditProduct({ ...producto });
                                                    setShowEditModal(true);
                                                }} className="edit-button">Editar</button>
                                                <button onClick={() => {
                                                    setProductToDelete(producto);
                                                    setShowDeleteModal(true);
                                                }} className="delete-button">Eliminar</button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                        
                        <div className="pagination-container">
                            <button onClick={() => {
                                if (prevPage) {
                                    const pageNumber = new URLSearchParams(new URL(prevPage).search).get('page');
                                    setCurrentPage(pageNumber ? parseInt(pageNumber, 10) : 1);
                                    fetchProductos(prevPage);
                                }
                            }} disabled={!prevPage} className="pagination-button">Anterior</button>
                            <span className="page-number">Página {currentPage} de {totalPages}</span>
                            <button onClick={() => {
                                if (nextPage) {
                                    const pageNumber = new URLSearchParams(new URL(nextPage).search).get('page');
                                    setCurrentPage(parseInt(pageNumber, 10));
                                    fetchProductos(nextPage);
                                }
                            }} disabled={!nextPage} className="pagination-button">Siguiente</button>
                        </div>
                    </>
                )}
            </div>

            {/* Modal para editar producto */}
            {showEditModal && editProduct && (
                <div className="modal-overlay">
                    <div className="modal-content">
                        <h3>Editar Producto</h3>
                        <div className="input-group-modal">
                            <label className="label">Nombre:</label>
                            <input
                                type="text"
                                value={editProduct.nombre}
                                onChange={(e) => setEditProduct({ ...editProduct, nombre: e.target.value })}
                                className="modal-input"
                            />
                        </div>
                        <div className="input-group-modal">
                            <label className="label">Precio:</label>
                            <input
                                type="number"
                                value={editProduct.precio}
                                onChange={(e) => setEditProduct({ ...editProduct, precio: e.target.value })}
                                className="modal-input"
                            />
                        </div>
                        <div className="input-group-modal">
                            <label className="label">Stock:</label>
                            <input
                                type="number"
                                value={editProduct.stock}
                                onChange={(e) => setEditProduct({ ...editProduct, stock: e.target.value })}
                                className="modal-input"
                            />
                        </div>
                        <div className="modal-actions">
                            <button onClick={handleEditProduct} className="modal-confirm-button">Guardar</button>
                            <button onClick={() => setShowEditModal(false)} className="modal-cancel-button">Cancelar</button>
                        </div>
                    </div>
                </div>
            )}
            
            {/* Modal de confirmación para eliminar */}
            {showDeleteModal && productToDelete && (
                <div className="modal-overlay">
                    <div className="modal-content">
                        <h3>Confirmar Eliminación</h3>
                        <p>¿Estás seguro de que quieres eliminar el producto <strong>{productToDelete.nombre}</strong>?</p>
                        <div className="modal-actions">
                            <button onClick={() => handleDeleteProduct(productToDelete.id)} className="modal-confirm-button">Eliminar</button>
                            <button onClick={() => setShowDeleteModal(false)} className="modal-cancel-button">Cancelar</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
export default Productos;