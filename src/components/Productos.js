// BONITO_AMOR/frontend/src/components/Productos.js
import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { useAuth } from '../AuthContext';
import { useNavigate } from 'react-router-dom';

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
        tienda_slug: ''
    });
    
    // Estados para la edición en línea
    const [editProductId, setEditProductId] = useState(null);
    const [editPrice, setEditPrice] = useState('');
    const [editStock, setEditStock] = useState('');
    const [showPriceModal, setShowPriceModal] = useState(false);
    const [showStockModal, setShowStockModal] = useState(false);

    // Estado para la impresión de etiquetas
    const [etiquetasSeleccionadas, setEtiquetasSeleccionadas] = useState({});

    // Generador de código de barras
    const generarCodigoDeBarras = () => {
        return Math.floor(100000000000 + Math.random() * 900000000000).toString();
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
            codigo_barras: newProduct.codigo_barras || generarCodigoDeBarras(),
            tienda_slug: selectedStoreSlug
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
    
    // Maneja la edición de precio
    const handleEditPrice = async () => {
        setLoadingProducts(true);
        setError(null);
        try {
            await axios.patch(`${BASE_API_ENDPOINT}/api/productos/${editProductId}/`, { precio: editPrice }, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            setEditProductId(null);
            setShowPriceModal(false);
            fetchProductos();
        } catch (err) {
            setError('Error al editar precio: ' + (err.response ? JSON.stringify(err.response.data) : err.message));
            setLoadingProducts(false);
        }
    };

    // Maneja la edición de stock
    const handleEditStock = async () => {
        setLoadingProducts(true);
        setError(null);
        try {
            await axios.patch(`${BASE_API_ENDPOINT}/api/productos/${editProductId}/`, { stock: editStock }, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            setEditProductId(null);
            setShowStockModal(false);
            fetchProductos();
        } catch (err) {
            setError('Error al editar stock: ' + (err.response ? JSON.stringify(err.response.data) : err.message));
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
        const etiquetasAImprimir = Object.entries(etiquetasSeleccionadas)
            .filter(([id, cantidad]) => cantidad > 0)
            .map(([id, cantidad]) => {
                const producto = productos.find(p => p.id === id);
                return {
                    nombre: producto.nombre,
                    talle: producto.talle,
                    codigo_barras: producto.codigo_barras,
                    precio: producto.precio,
                    cantidad: parseInt(cantidad, 10)
                };
            });
    
        if (etiquetasAImprimir.length > 0) {
            // Lógica para imprimir etiquetas
            console.log('Etiquetas a imprimir:', etiquetasAImprimir);
            // resetear selecciones
            setEtiquetasSeleccionadas({});
            alert('Etiquetas enviadas a imprimir (revisar consola para detalles).');
        } else {
            alert('No hay etiquetas seleccionadas para imprimir.');
        }
    };

    if (authLoading || (isAuthenticated && !user)) {
        return <div style={styles.loadingMessage}>Cargando datos de usuario...</div>;
    }

    if (!isAuthenticated || !user.is_superuser) {
        return <div style={styles.accessDeniedMessage}>Acceso denegado. Solo los superusuarios pueden ver/gestionar productos.</div>;
    }
    if (!selectedStoreSlug) {
        return (
            <div style={styles.noStoreSelectedMessage}>
                <h2>Por favor, selecciona una tienda en la barra de navegación para ver los productos.</h2>
            </div>
        );
    }
    
    return (
        <div style={styles.container}>
            <div style={styles.header}>
                <h1 style={styles.title}>Gestión de Productos ({selectedStoreSlug})</h1>
            </div>
            
            <div style={styles.section}>
                <h2 style={styles.sectionTitle}>Agregar Nuevo Producto</h2>
                <form onSubmit={handleCreateProduct} style={styles.form}>
                    <div style={styles.inputGroup}>
                        <label style={styles.label}>Nombre</label>
                        <input
                            type="text"
                            value={newProduct.nombre}
                            onChange={(e) => setNewProduct({ ...newProduct, nombre: e.target.value })}
                            style={styles.input}
                            required
                        />
                    </div>
                    <div style={styles.inputGroup}>
                        <label style={styles.label}>Talle</label>
                        <select
                            value={newProduct.talle}
                            onChange={(e) => setNewProduct({ ...newProduct, talle: e.target.value })}
                            style={styles.input}
                            required
                        >
                            {TalleOptions.map(option => (
                                <option key={option.value} value={option.value}>{option.label}</option>
                            ))}
                        </select>
                    </div>
                    <div style={styles.inputGroup}>
                        <label style={styles.label}>Precio</label>
                        <input
                            type="number"
                            value={newProduct.precio}
                            onChange={(e) => setNewProduct({ ...newProduct, precio: e.target.value })}
                            style={styles.input}
                            required
                        />
                    </div>
                    <div style={styles.inputGroup}>
                        <label style={styles.label}>Stock</label>
                        <input
                            type="number"
                            value={newProduct.stock}
                            onChange={(e) => setNewProduct({ ...newProduct, stock: e.target.value })}
                            style={styles.input}
                            required
                        />
                    </div>
                    <div style={styles.inputGroup}>
                        <label style={styles.label}>Código de barras (opcional)</label>
                        <input
                            type="text"
                            value={newProduct.codigo_barras}
                            onChange={(e) => setNewProduct({ ...newProduct, codigo_barras: e.target.value })}
                            style={styles.input}
                        />
                    </div>
                    <button type="submit" style={styles.submitButton} disabled={loadingProducts}>
                        {loadingProducts ? 'Creando...' : 'Crear Producto'}
                    </button>
                </form>
            </div>
            
            <div style={styles.section}>
                <div style={styles.tableHeader}>
                    <h2 style={styles.sectionTitle}>Listado de Productos</h2>
                    <button onClick={handleImprimirEtiquetas} style={styles.printButton}>Imprimir Etiquetas</button>
                </div>
                <div style={styles.filtersContainer}>
                    <input
                        type="text"
                        placeholder="Buscar por nombre o talle..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        style={styles.filterInput}
                    />
                    <button onClick={() => fetchProductos()} style={styles.searchButton}>Buscar</button>
                </div>
                
                {loadingProducts ? (
                    <div style={styles.loadingMessage}>Cargando productos...</div>
                ) : error ? (
                    <div style={styles.errorMessage}>{error}</div>
                ) : (
                    <>
                        <table style={styles.table}>
                            <thead>
                                <tr>
                                    <th style={styles.th}>Seleccionar</th>
                                    <th style={styles.th}>Cantidad de Etiquetas</th>
                                    <th style={styles.th}>Nombre</th>
                                    <th style={styles.th}>Talle</th>
                                    <th style={styles.th}>Precio</th>
                                    <th style={styles.th}>Stock</th>
                                </tr>
                            </thead>
                            <tbody>
                                {productos.map(producto => (
                                    <tr key={producto.id}>
                                        <td style={styles.td}>
                                            <input 
                                                type="checkbox" 
                                                checked={!!etiquetasSeleccionadas[producto.id] && etiquetasSeleccionadas[producto.id] > 0} 
                                                onChange={(e) => {
                                                    const isChecked = e.target.checked;
                                                    const cantidad = isChecked ? 1 : 0;
                                                    handleEtiquetasChange(producto.id, cantidad);
                                                }}
                                            />
                                        </td>
                                        <td style={styles.td}>
                                            <input
                                                type="number"
                                                min="0"
                                                value={etiquetasSeleccionadas[producto.id] || ''}
                                                onChange={(e) => handleEtiquetasChange(producto.id, parseInt(e.target.value, 10))}
                                                style={styles.etiquetasInput}
                                            />
                                        </td>
                                        <td style={styles.td}>{producto.nombre}</td>
                                        <td style={styles.td}>{producto.talle}</td>
                                        <td style={styles.td}>
                                            ${parseFloat(producto.precio).toFixed(2)}
                                            <button onClick={() => {
                                                setEditProductId(producto.id);
                                                setEditPrice(producto.precio);
                                                setShowPriceModal(true);
                                            }} style={styles.editButton}>Editar</button>
                                        </td>
                                        <td style={styles.td}>
                                            {producto.stock}
                                            <button onClick={() => {
                                                setEditProductId(producto.id);
                                                setEditStock(producto.stock);
                                                setShowStockModal(true);
                                            }} style={styles.editButton}>Editar</button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                        
                        <div style={styles.paginationContainer}>
                            <button onClick={() => {
                                if (prevPage) {
                                    const pageNumber = new URLSearchParams(new URL(prevPage).search).get('page');
                                    setCurrentPage(pageNumber ? parseInt(pageNumber, 10) : 1);
                                    fetchProductos(prevPage);
                                }
                            }} disabled={!prevPage} style={styles.paginationButton}>Anterior</button>
                            <span style={styles.pageNumber}>Página {currentPage} de {totalPages}</span>
                            <button onClick={() => {
                                if (nextPage) {
                                    const pageNumber = new URLSearchParams(new URL(nextPage).search).get('page');
                                    setCurrentPage(parseInt(pageNumber, 10));
                                    fetchProductos(nextPage);
                                }
                            }} disabled={!nextPage} style={styles.paginationButton}>Siguiente</button>
                        </div>
                    </>
                )}
            </div>

            {/* Modal para editar precio */}
            {showPriceModal && (
                <div style={styles.modalOverlay}>
                    <div style={styles.modalContent}>
                        <h3>Editar Precio</h3>
                        <label>Nuevo precio:</label>
                        <input
                            type="number"
                            value={editPrice}
                            onChange={(e) => setEditPrice(e.target.value)}
                            style={styles.modalInput}
                        />
                        <div style={styles.modalActions}>
                            <button onClick={handleEditPrice} style={styles.modalConfirmButton}>Guardar</button>
                            <button onClick={() => setShowPriceModal(false)} style={styles.modalCancelButton}>Cancelar</button>
                        </div>
                    </div>
                </div>
            )}
            
            {/* Modal para editar stock */}
            {showStockModal && (
                <div style={styles.modalOverlay}>
                    <div style={styles.modalContent}>
                        <h3>Editar Stock</h3>
                        <label>Nuevo stock:</label>
                        <input
                            type="number"
                            value={editStock}
                            onChange={(e) => setEditStock(e.target.value)}
                            style={styles.modalInput}
                        />
                        <div style={styles.modalActions}>
                            <button onClick={handleEditStock} style={styles.modalConfirmButton}>Guardar</button>
                            <button onClick={() => setShowStockModal(false)} style={styles.modalCancelButton}>Cancelar</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Mensaje de error global */}
            {error && (
                <div style={styles.errorMessage}>
                    {error}
                </div>
            )}
        </div>
    );
};

const styles = {
    container: {
        padding: '20px',
        fontFamily: 'Inter, sans-serif',
        maxWidth: '1200px',
        margin: '20px auto',
        backgroundColor: '#f8f9fa',
        borderRadius: '8px',
        boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
        color: '#333',
    },
    header: {
        textAlign: 'center',
        marginBottom: '30px',
    },
    title: {
        fontSize: '2.5em',
        color: '#2c3e50',
    },
    section: {
        backgroundColor: '#ffffff',
        padding: '25px',
        borderRadius: '8px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
        marginBottom: '30px',
    },
    sectionTitle: {
        fontSize: '1.8em',
        color: '#34495e',
        marginBottom: '20px',
        borderBottom: '2px solid #eceff1',
        paddingBottom: '10px',
    },
    form: {
        display: 'flex',
        flexDirection: 'column',
        gap: '15px',
    },
    inputGroup: {
        display: 'flex',
        flexDirection: 'column',
    },
    label: {
        marginBottom: '5px',
        fontWeight: 'bold',
        color: '#555',
    },
    input: {
        padding: '10px 12px',
        border: '1px solid #dcdcdc',
        borderRadius: '5px',
        fontSize: '1em',
    },
    submitButton: {
        padding: '12px 20px',
        backgroundColor: '#007bff',
        color: 'white',
        border: 'none',
        borderRadius: '5px',
        cursor: 'pointer',
        fontSize: '1.1em',
        fontWeight: 'bold',
        transition: 'background-color 0.3s ease',
    },
    tableHeader: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '20px',
    },
    printButton: {
        padding: '10px 20px',
        backgroundColor: '#28a745',
        color: 'white',
        border: 'none',
        borderRadius: '5px',
        cursor: 'pointer',
        fontWeight: 'bold',
        transition: 'background-color 0.3s ease',
    },
    filtersContainer: {
        display: 'flex',
        gap: '10px',
        marginBottom: '20px',
    },
    filterInput: {
        flexGrow: 1,
        padding: '10px 12px',
        border: '1px solid #dcdcdc',
        borderRadius: '5px',
        fontSize: '1em',
    },
    searchButton: {
        padding: '10px 20px',
        backgroundColor: '#007bff',
        color: 'white',
        border: 'none',
        borderRadius: '5px',
        cursor: 'pointer',
        fontWeight: 'bold',
        transition: 'background-color 0.3s ease',
    },
    table: {
        width: '100%',
        borderCollapse: 'collapse',
        marginTop: '15px',
        borderRadius: '8px',
        overflow: 'hidden',
        boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
    },
    th: {
        padding: '12px 15px',
        borderBottom: '1px solid #ddd',
        textAlign: 'left',
        fontWeight: 'bold',
        backgroundColor: '#f2f2f2',
    },
    td: {
        padding: '10px 15px',
        borderBottom: '1px solid #eee',
        verticalAlign: 'middle',
    },
    editButton: {
        marginLeft: '10px',
        padding: '4px 8px',
        backgroundColor: '#ffc107',
        border: 'none',
        borderRadius: '3px',
        cursor: 'pointer',
        fontSize: '0.8em',
    },
    etiquetasInput: {
        width: '60px',
        padding: '5px',
        textAlign: 'center',
        border: '1px solid #ccc',
        borderRadius: '4px',
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
        maxWidth: '400px',
        width: '90%',
    },
    modalInput: {
        width: '100%',
        padding: '10px',
        marginBottom: '15px',
        boxSizing: 'border-box',
    },
    modalActions: {
        display: 'flex',
        justifyContent: 'space-between',
    },
    modalConfirmButton: {
        padding: '10px 20px',
        backgroundColor: '#28a745',
        color: 'white',
        border: 'none',
        borderRadius: '5px',
        cursor: 'pointer',
    },
    modalCancelButton: {
        padding: '10px 20px',
        backgroundColor: '#dc3545',
        color: 'white',
        border: 'none',
        borderRadius: '5px',
        cursor: 'pointer',
    },
    loadingMessage: {
        padding: '20px',
        textAlign: 'center',
        color: '#555',
        fontSize: '1.1em',
    },
    accessDeniedMessage: {
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
        padding: '50px',
        textAlign: 'center',
        color: '#777',
        fontSize: '1.2em',
    },
    errorMessage: {
        color: '#dc3545',
        marginBottom: '20px',
        border: '1px solid #dc3545',
        padding: '15px',
        borderRadius: '8px',
        backgroundColor: '#ffe3e6',
        textAlign: 'center',
        fontWeight: 'bold',
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
    pageNumber: {
        fontSize: '1em',
        fontWeight: 'bold',
        color: '#555',
    },
};

export default Productos;