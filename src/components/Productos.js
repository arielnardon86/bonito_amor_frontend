// Productos.js
import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { useAuth } from '../AuthContext';
import { useNavigate } from 'react-router-dom';
import { formatearMonto } from '../utils/formatearMonto';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';

const normalizeApiUrl = (url) => {
    if (!url) {
        return 'http://localhost:8000';
    }
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
        precio: '',
        costo: '', // NUEVO CAMPO
        stock: '',
        codigo_barras: '',
        talle: '', // Campo talle (opcional pero requerido por el serializer)
    });
    
    const [editProduct, setEditProduct] = useState(null);
    const [showEditModal, setShowEditModal] = useState(false);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [productToDelete, setProductToDelete] = useState(null);

    const [etiquetasSeleccionadas, setEtiquetasSeleccionadas] = useState({});
    const [mostrarTalle, setMostrarTalle] = useState(false);

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
            setTotalPages(Math.ceil(response.data.count / 10));
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
            talle: newProduct.talle || null, // Normalizar talle vacío a null
        };
        
        try {
            await axios.post(`${BASE_API_ENDPOINT}/api/productos/`, productToCreate, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            setNewProduct({ nombre: '', precio: '', costo: '', stock: '', codigo_barras: '', talle: '' }); // Reset del formulario
            fetchProductos();
        } catch (err) {
            setError('Error al crear producto: ' + (err.response ? JSON.stringify(err.response.data) : err.message));
            setLoadingProducts(false);
        }
    };
    
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
        return <div style={styles.loadingMessage}>Cargando datos de usuario...</div>;
    }

    if (!isAuthenticated || !user.is_superuser) {
        return <div style={styles.accessDeniedMessage}>Acceso denegado. Solo los superusuarios pueden ver/gestionar productos.</div>;
    }
    if (!selectedStoreSlug) {
        return (
            <div style={styles.noStoreSelectedMessage}>
                <p>Selecciona una tienda en el menú para ver los productos.</p>
            </div>
        );
    }
    
    return (
        <div style={styles.container}>
            <h1 style={styles.title}>Productos</h1>
            
            <div style={styles.section}>
                <h2 style={styles.sectionTitle}>Nuevo producto</h2>
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
                        <label style={styles.label}>Precio</label>
                        <input
                            type="number"
                            value={newProduct.precio}
                            onChange={(e) => setNewProduct({ ...newProduct, precio: e.target.value })}
                            style={styles.input}
                            required
                        />
                    </div>
                    {/* NUEVO CAMPO DE COSTO */}
                    <div style={styles.inputGroup}>
                        <label style={styles.label}>Costo (Opcional)</label>
                        <input
                            type="number"
                            value={newProduct.costo}
                            onChange={(e) => setNewProduct({ ...newProduct, costo: e.target.value })}
                            style={styles.input}
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
                        <label style={styles.label}>Talle (Opcional)</label>
                        <input
                            type="text"
                            value={newProduct.talle}
                            onChange={(e) => setNewProduct({ ...newProduct, talle: e.target.value })}
                            style={styles.input}
                            placeholder="Ej: M, L, XL, 42, etc."
                        />
                    </div>
                    <div style={styles.inputGroup}>
                        <label style={styles.label}>Código de barras (si no se completa, se genera automáticamente)</label>
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
                    <h2 style={styles.sectionTitle}>Listado</h2>
                    <button onClick={handleImprimirEtiquetas} style={styles.printButton}>Imprimir Etiquetas</button>
                </div>
                <div style={styles.filtersContainer}>
                    <input
                        type="text"
                        placeholder="Buscar por nombre..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        style={styles.filterInput}
                    />
                    <button onClick={() => fetchProductos()} style={styles.searchButton}>Buscar</button>
                    {productos.some(p => p.talle && String(p.talle).trim() !== '') && (
                        <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', marginLeft: '12px' }}>
                            <input
                                type="checkbox"
                                checked={mostrarTalle}
                                onChange={(e) => setMostrarTalle(e.target.checked)}
                            />
                            <span>Mostrar talle</span>
                        </label>
                    )}
                </div>
                
                {loadingProducts ? (
                    <div style={styles.loadingMessage}>Cargando productos...</div>
                ) : error ? (
                    <div style={styles.errorMessage}>{error}</div>
                ) : (
                    <>
                        <div style={styles.tableResponsive}>
                            <table style={styles.table}>
                                <thead>
                                    <tr>
                                        <th style={styles.th}>Seleccionar</th>
                                        <th style={styles.th}>Cantidad de etiquetas</th>
                                        <th style={styles.th}>Nombre</th>
                                        {mostrarTalle && <th style={styles.th}>Talle</th>}
                                        <th style={styles.th}>Precio</th>
                                        <th style={styles.th}>Costo</th>
                                        <th style={styles.th}>Stock</th>
                                        <th style={styles.th}>Acciones</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {productos.map(producto => (
                                        <tr key={producto.id}><td style={styles.td}>
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
                                            </td><td style={styles.td}>
                                                <input
                                                    type="number"
                                                    min="0"
                                                    value={etiquetasSeleccionadas[producto.id] || ''}
                                                    onChange={(e) => handleEtiquetasChange(producto.id, parseInt(e.target.value, 10) || 0)}
                                                    style={styles.etiquetasInput}
                                                    disabled={!etiquetasSeleccionadas[producto.id]}
                                                />
                                            </td><td style={styles.td}>{producto.nombre}</td>
                                            {mostrarTalle && <td style={styles.td}>{producto.talle || '-'}</td>}
                                            <td style={styles.td}>{formatearMonto(producto.precio)}</td><td style={styles.td}>{formatearMonto(producto.costo || 0)}</td><td style={styles.td}>{producto.stock}</td><td style={styles.td}>
                                                <button onClick={() => {
                                                    setEditProduct({ ...producto });
                                                    setShowEditModal(true);
                                                }} style={styles.editButton}>Editar</button>
                                                <button onClick={() => {
                                                    setProductToDelete(producto);
                                                    setShowDeleteModal(true);
                                                }} style={styles.deleteButton}>Eliminar</button>
                                            </td></tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                        
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

            {/* Modal para editar producto */}
            {showEditModal && editProduct && (
                <div style={styles.modalOverlay}>
                    <div style={styles.modalContent}>
                        <h3>Editar Producto</h3>
                        <div style={styles.inputGroupModal}>
                            <label style={styles.label}>Nombre:</label>
                            <input
                                type="text"
                                value={editProduct.nombre}
                                onChange={(e) => setEditProduct({ ...editProduct, nombre: e.target.value })}
                                style={styles.modalInput}
                            />
                        </div>
                        <div style={styles.inputGroupModal}>
                            <label style={styles.label}>Precio:</label>
                            <input
                                type="number"
                                value={editProduct.precio}
                                onChange={(e) => setEditProduct({ ...editProduct, precio: e.target.value })}
                                style={styles.modalInput}
                            />
                        </div>
                        {/* NUEVO CAMPO EN EL MODAL */}
                        <div style={styles.inputGroupModal}>
                            <label style={styles.label}>Costo:</label>
                            <input
                                type="number"
                                value={editProduct.costo || ''}
                                onChange={(e) => setEditProduct({ ...editProduct, costo: e.target.value })}
                                style={styles.modalInput}
                            />
                        </div>
                        <div style={styles.inputGroupModal}>
                            <label style={styles.label}>Stock:</label>
                            <input
                                type="number"
                                value={editProduct.stock}
                                onChange={(e) => setEditProduct({ ...editProduct, stock: e.target.value })}
                                style={styles.modalInput}
                            />
                        </div>
                        <div style={styles.inputGroupModal}>
                            <label style={styles.label}>Talle (Opcional):</label>
                            <input
                                type="text"
                                value={editProduct.talle || ''}
                                onChange={(e) => setEditProduct({ ...editProduct, talle: e.target.value })}
                                style={styles.modalInput}
                                placeholder="Ej: M, L, XL, 42, etc."
                            />
                        </div>
                        <div style={styles.modalActions}>
                            <button onClick={handleEditProduct} style={styles.modalConfirmButton}>Guardar</button>
                            <button onClick={() => setShowEditModal(false)} style={styles.modalCancelButton}>Cancelar</button>
                        </div>
                    </div>
                </div>
            )}
            
            {/* Modal de confirmación para eliminar */}
            {showDeleteModal && productToDelete && (
                <div style={styles.modalOverlay}>
                    <div style={styles.modalContent}>
                        <h3>Confirmar Eliminación</h3>
                        <p>¿Estás seguro de que quieres eliminar el producto <strong>{productToDelete.nombre}</strong>?</p>
                        <div style={styles.modalActions}>
                            <button onClick={() => handleDeleteProduct(productToDelete.id)} style={styles.modalConfirmButton}>Eliminar</button>
                            <button onClick={() => setShowDeleteModal(false)} style={styles.modalCancelButton}>Cancelar</button>
                        </div>
                    </div>
                </div>
            )}
            <style>
                {`
                @media (max-width: 768px) {
                    [style*="form"] {
                        flex-direction: column;
                        gap: 15px;
                    }
                    [style*="inputGroup"], [style*="submitButton"] {
                        width: 100%;
                    }
                    [style*="tableHeader"] {
                        flex-direction: column;
                        align-items: flex-start;
                        gap: 10px;
                    }
                    [style*="filtersContainer"] {
                        flex-direction: column;
                        gap: 10px;
                    }
                    [style*="filterInput"], [style*="searchButton"] {
                        width: 100%;
                    }
                    [style*="tableResponsive"] {
                        overflow-x: auto;
                    }
                    table {
                        width: 100%;
                        white-space: nowrap;
                    }
                    [style*="paginationContainer"] {
                        flex-direction: column;
                        gap: 10px;
                    }
                    [style*="paginationButton"] {
                        width: 100%;
                    }
                }
                `}
            </style>
        </div>
    );
};
const styles = {
    container: { padding: 0, fontFamily: 'Arial, sans-serif', width: '100%' },
    title: { color: '#2c3e50', fontSize: '1.5rem', fontWeight: 600, marginBottom: '1.25rem' },
    section: { marginBottom: '30px', padding: '20px', backgroundColor: '#f9f9f9', borderRadius: '8px' },
    sectionTitle: { color: '#34495e', fontSize: '1.1rem', borderBottom: '1px solid #eee', paddingBottom: '8px', marginTop: '1.5rem', marginBottom: '0.5rem' },
    form: { display: 'flex', gap: '20px', flexWrap: 'wrap', alignItems: 'flex-end' },
    inputGroup: { flex: '1 1 200px', display: 'flex', flexDirection: 'column' },
    label: { marginBottom: '5px', fontWeight: 'bold' },
    input: { padding: '8px', border: '1px solid #ccc', borderRadius: '4px' },
    submitButton: { padding: '10px 15px', backgroundColor: '#28a745', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', alignSelf: 'flex-end' },
    tableHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' },
    printButton: { padding: '10px 15px', backgroundColor: '#007bff', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' },
    filtersContainer: { display: 'flex', gap: '10px', marginBottom: '20px' },
    filterInput: { flex: '1', padding: '8px', border: '1px solid #ccc', borderRadius: '4px' },
    searchButton: { padding: '8px 15px', backgroundColor: '#007bff', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' },
    loadingMessage: { textAlign: 'center', color: '#777' },
    errorMessage: { color: '#dc3545', padding: '10px', backgroundColor: '#ffe3e6', border: '1px solid #dc3545', borderRadius: '5px' },
    tableResponsive: { overflowX: 'auto' },
    table: { width: '100%', borderCollapse: 'collapse' },
    th: { padding: '10px', borderBottom: '2px solid #ddd', textAlign: 'left', backgroundColor: '#f2f2f2' },
    td: { padding: '10px', borderBottom: '1px solid #ddd' },
    etiquetasInput: { width: '50px' },
    editButton: { padding: '5px 10px', backgroundColor: '#ffc107', color: 'black', border: 'none', borderRadius: '4px', cursor: 'pointer', marginRight: '5px' },
    deleteButton: { padding: '5px 10px', backgroundColor: '#dc3545', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' },
    paginationContainer: { display: 'flex', justifyContent: 'center', alignItems: 'center', marginTop: '20px', gap: '10px' },
    paginationButton: { padding: '8px 15px', backgroundColor: '#007bff', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer' },
    pageNumber: { fontSize: '1em', fontWeight: 'bold' },
    modalOverlay: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 },
    modalContent: { backgroundColor: 'white', padding: '20px', borderRadius: '8px', textAlign: 'center', width: '90%', maxWidth: '500px' },
    inputGroupModal: { marginBottom: '15px' },
    modalInput: { width: '100%', padding: '8px', boxSizing: 'border-box' },
    modalActions: { display: 'flex', justifyContent: 'center', gap: '10px', marginTop: '15px' },
    modalConfirmButton: { padding: '10px 15px', backgroundColor: '#28a745', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' },
    modalCancelButton: { padding: '10px 15px', backgroundColor: '#dc3545', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' },
    accessDeniedMessage: { color: '#dc3545', textAlign: 'center', fontWeight: 'bold' },
    noStoreSelectedMessage: { textAlign: 'center', marginTop: '50px' },
};
export default Productos;