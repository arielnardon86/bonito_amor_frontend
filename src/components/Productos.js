// BONITO_AMOR/frontend/src/components/Productos.js

import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import Barcode from 'react-barcode';
import EtiquetasImpresion from './EtiquetasImpresion';
import { useAuth } from '../AuthContext';

// NEW TALLE_OPTIONS
const TALLE_OPTIONS = [
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
    { value: '10', label: '10' },
    { value: '12', label: '12' },
    { value: '14', label: '14' },
    { value: '16', label: '16' },
    { value: '18', label: '18' },
    { value: '20', label: '20' },
    { value: '22', label: '22' },
    { value: '24', label: '24' },
    { value: '26', label: '26' },
    { value: '28', label: '28' },
    { value: '30', label: '30' },
    { value: '32', label: '32' },
    { value: '34', label: '34' },
    { value: '36', label: '36' },
    { value: '38', label: '38' },
    { value: '40', label: '40' },
    { value: '42', label: '42' },
    { value: '44', label: '44' },
    { value: '46', label: '46' },
    { value: '48', label: '48' },
    { value: '50', label: '50' },
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

const Productos = () => {
    const { token, user, isAuthenticated, loading: authLoading, selectedStoreSlug, stores } = useAuth();
    const [products, setProducts] = useState([]);
    const [loadingProducts, setLoadingProducts] = useState(true);
    const [error, setError] = useState(null);
    const [newProduct, setNewProduct] = useState({
        nombre: '',
        talle: 'UNICO',
        descripcion: '',
        precio: '',
        costo: '',
        stock: '',
        codigo_barras: '',
        proveedor: '',
    });
    const [editingProduct, setEditingProduct] = useState(null);
    const [showConfirmModal, setShowConfirmModal] = useState(false);
    const [confirmAction, setConfirmAction] = useState(() => () => {});
    const [productIdToDelete, setProductIdToDelete] = useState(null);
    const [showEtiquetasModal, setShowEtiquetasModal] = useState(false);
    const [productsToPrint, setProductsToPrint] = useState([]);
    const [showAlertMessage, setShowAlertMessage] = useState(false);
    const [alertMessage, setAlertMessage] = useState('');
    const [alertType, setAlertType] = useState('success');

    const fetchProducts = useCallback(async () => {
        if (!token || !selectedStoreSlug) {
            setLoadingProducts(false);
            return;
        }

        // --- CORRECCIÓN AQUÍ: Acceder a stores.results para encontrar la tienda ---
        if (!stores || !stores.results) {
            setError("No se pudo encontrar la lista de tiendas.");
            setLoadingProducts(false);
            return;
        }
        const store = stores.results.find(s => s.nombre === selectedStoreSlug);
        if (!store) {
            setError("No se pudo encontrar la tienda seleccionada.");
            setLoadingProducts(false);
            return;
        }
        const storeId = store.id;

        setLoadingProducts(true);
        try {
            const response = await axios.get(`${BASE_API_ENDPOINT}/api/productos/`, {
                headers: { 'Authorization': `Bearer ${token}` },
                params: {
                    tienda: storeId
                }
            });
            setProducts(response.data.results);
        } catch (err) {
            setError('Error al cargar los productos: ' + (err.response ? JSON.stringify(err.response.data) : err.message));
            console.error('Error fetching products:', err.response || err.message);
        } finally {
            setLoadingProducts(false);
        }
    }, [token, selectedStoreSlug, stores]);

    useEffect(() => {
        fetchProducts();
    }, [fetchProducts]);

    const handleNewProductChange = (e) => {
        const { name, value } = e.target;
        setNewProduct(prev => ({ ...prev, [name]: value }));
    };

    const handleCreateProduct = async (e) => {
        e.preventDefault();
        if (!newProduct.nombre || !newProduct.precio || !newProduct.costo || !newProduct.stock || !selectedStoreSlug) {
            setAlertMessage("Todos los campos obligatorios deben ser completados.");
            setAlertType('error');
            setShowAlertMessage(true);
            return;
        }
    
        const store = stores.results.find(s => s.nombre === selectedStoreSlug);
        if (!store) {
            setAlertMessage("No se pudo encontrar la tienda para el nuevo producto.");
            setAlertType('error');
            setShowAlertMessage(true);
            return;
        }
    
        const productData = {
            ...newProduct,
            precio: parseFloat(newProduct.precio),
            costo: parseFloat(newProduct.costo),
            stock: parseInt(newProduct.stock, 10),
            tienda: store.id,
        };

        try {
            await axios.post(`${BASE_API_ENDPOINT}/api/productos/`, productData, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });
            setAlertMessage("Producto creado exitosamente.");
            setAlertType('success');
            setShowAlertMessage(true);
            fetchProducts();
            setNewProduct({
                nombre: '', talle: 'UNICO', descripcion: '', precio: '', costo: '', stock: '', codigo_barras: '', proveedor: ''
            });
        } catch (err) {
            const errorMsg = err.response && err.response.data
                ? JSON.stringify(err.response.data)
                : err.message;
            setAlertMessage(`Error al crear el producto: ${errorMsg}`);
            setAlertType('error');
            setShowAlertMessage(true);
            console.error("Error creating product:", err);
        }
    };

    const startEditing = (product) => {
        setEditingProduct({ ...product });
    };

    const handleEditProductChange = (e) => {
        const { name, value } = e.target;
        setEditingProduct(prev => ({ ...prev, [name]: value }));
    };
    
    const handleUpdateProduct = async () => {
        if (!editingProduct) return;

        // Asegurarse de que los campos numéricos sean números
        const updatedProductData = {
            ...editingProduct,
            precio: parseFloat(editingProduct.precio),
            costo: parseFloat(editingProduct.costo),
            stock: parseInt(editingProduct.stock, 10),
        };

        try {
            await axios.put(`${BASE_API_ENDPOINT}/api/productos/${editingProduct.id}/`, updatedProductData, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            setAlertMessage("Producto actualizado exitosamente.");
            setAlertType('success');
            setShowAlertMessage(true);
            setEditingProduct(null);
            fetchProducts();
        } catch (err) {
            const errorMsg = err.response && err.response.data
                ? JSON.stringify(err.response.data)
                : err.message;
            setAlertMessage(`Error al actualizar el producto: ${errorMsg}`);
            setAlertType('error');
            setShowAlertMessage(true);
        }
    };
    
    const handleDeleteProduct = (productId) => {
        setProductIdToDelete(productId);
        setConfirmAction(() => async () => {
            try {
                await axios.delete(`${BASE_API_ENDPOINT}/api/productos/${productId}/`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                setAlertMessage("Producto eliminado exitosamente.");
                setAlertType('success');
                setShowAlertMessage(true);
                fetchProducts();
            } catch (err) {
                const errorMsg = err.response && err.response.data
                    ? JSON.stringify(err.response.data)
                    : err.message;
                setAlertMessage(`Error al eliminar el producto: ${errorMsg}`);
                setAlertType('error');
                setShowAlertMessage(true);
                console.error("Error deleting product:", err);
            } finally {
                setShowConfirmModal(false);
                setProductIdToDelete(null);
            }
        });
        setShowConfirmModal(true);
    };

    const handlePrintEtiquetas = () => {
        const selectedProducts = products.filter(p => p.selectedForPrint);
        if (selectedProducts.length === 0) {
            setAlertMessage("Por favor, selecciona al menos un producto para imprimir.");
            setAlertType('error');
            setShowAlertMessage(true);
            return;
        }
        setProductsToPrint(selectedProducts);
        setShowEtiquetasModal(true);
    };

    const handleSelectProductForPrint = (productId) => {
        setProducts(prevProducts =>
            prevProducts.map(p =>
                p.id === productId ? { ...p, selectedForPrint: !p.selectedForPrint } : p
            )
        );
    };

    const handleCloseModal = () => {
        setShowEtiquetasModal(false);
    };

    if (authLoading || (isAuthenticated && !user)) {
        return <div style={styles.loadingMessage}>Cargando datos de usuario...</div>;
    }

    if (!isAuthenticated) {
        return <div style={styles.accessDeniedMessage}>Acceso denegado. Por favor, inicia sesión.</div>;
    }

    if (!user || (!user.is_superuser && !user.is_staff)) {
        return <div style={styles.accessDeniedMessage}>Acceso denegado. No tienes permisos para ver esta página.</div>;
    }

    if (!selectedStoreSlug) {
        return <div style={styles.noStoreSelectedMessage}>Por favor, selecciona una tienda.</div>;
    }

    if (loadingProducts) {
        return <div style={styles.loadingMessage}>Cargando productos...</div>;
    }

    if (error) {
        return <div style={styles.errorMessage}>{error}</div>;
    }

    return (
        <div style={styles.container}>
            <h1>Productos ({selectedStoreSlug})</h1>

            {showAlertMessage && (
                <div style={{ ...styles.alert, backgroundColor: alertType === 'success' ? '#d4edda' : '#f8d7da' }}>
                    <p style={{ color: alertType === 'success' ? '#155724' : '#721c24' }}>{alertMessage}</p>
                </div>
            )}

            <div style={styles.tableContainer}>
                <h2>Listado de Productos</h2>
                <button onClick={handlePrintEtiquetas} style={styles.printButton}>Imprimir Etiquetas</button>
                <table style={styles.table}>
                    <thead>
                        <tr>
                            <th style={styles.th}>Seleccionar</th>
                            <th style={styles.th}>Nombre</th>
                            <th style={styles.th}>Talle</th>
                            <th style={styles.th}>Descripción</th>
                            <th style={styles.th}>Precio</th>
                            <th style={styles.th}>Costo</th>
                            <th style={styles.th}>Stock</th>
                            <th style={styles.th}>Código de Barras</th>
                            <th style={styles.th}>Proveedor</th>
                            <th style={styles.th}>Acciones</th>
                        </tr>
                    </thead>
                    <tbody>
                        {products.map((product) => (
                            <tr key={product.id}>
                                <td style={styles.td}>
                                    <input
                                        type="checkbox"
                                        checked={!!product.selectedForPrint}
                                        onChange={() => handleSelectProductForPrint(product.id)}
                                    />
                                </td>
                                <td style={styles.td}>
                                    {editingProduct && editingProduct.id === product.id ? (
                                        <input
                                            type="text"
                                            name="nombre"
                                            value={editingProduct.nombre}
                                            onChange={handleEditProductChange}
                                            style={styles.editInput}
                                        />
                                    ) : (
                                        product.nombre
                                    )}
                                </td>
                                <td style={styles.td}>
                                    {editingProduct && editingProduct.id === product.id ? (
                                        <select
                                            name="talle"
                                            value={editingProduct.talle}
                                            onChange={handleEditProductChange}
                                            style={styles.editInput}
                                        >
                                            {TALLE_OPTIONS.map(option => (
                                                <option key={option.value} value={option.value}>{option.label}</option>
                                            ))}
                                        </select>
                                    ) : (
                                        product.talle
                                    )}
                                </td>
                                <td style={styles.td}>
                                    {editingProduct && editingProduct.id === product.id ? (
                                        <input
                                            type="text"
                                            name="descripcion"
                                            value={editingProduct.descripcion}
                                            onChange={handleEditProductChange}
                                            style={styles.editInput}
                                        />
                                    ) : (
                                        product.descripcion
                                    )}
                                </td>
                                <td style={styles.td}>
                                    {editingProduct && editingProduct.id === product.id ? (
                                        <input
                                            type="number"
                                            name="precio"
                                            value={editingProduct.precio}
                                            onChange={handleEditProductChange}
                                            style={styles.editInput}
                                        />
                                    ) : (
                                        `$${parseFloat(product.precio).toFixed(2)}`
                                    )}
                                </td>
                                <td style={styles.td}>
                                    {editingProduct && editingProduct.id === product.id ? (
                                        <input
                                            type="number"
                                            name="costo"
                                            value={editingProduct.costo}
                                            onChange={handleEditProductChange}
                                            style={styles.editInput}
                                        />
                                    ) : (
                                        `$${parseFloat(product.costo).toFixed(2)}`
                                    )}
                                </td>
                                <td style={styles.td}>
                                    {editingProduct && editingProduct.id === product.id ? (
                                        <input
                                            type="number"
                                            name="stock"
                                            value={editingProduct.stock}
                                            onChange={handleEditProductChange}
                                            style={styles.editInput}
                                        />
                                    ) : (
                                        product.stock
                                    )}
                                </td>
                                <td style={styles.td}>
                                    {product.codigo_barras ? (
                                        <div style={styles.barcodeWrapper}>
                                            <Barcode value={product.codigo_barras} height={30} width={1} displayValue={false} />
                                            <span style={styles.barcodeText}>{product.codigo_barras}</span>
                                        </div>
                                    ) : (
                                        "N/A"
                                    )}
                                </td>
                                <td style={styles.td}>
                                    {editingProduct && editingProduct.id === product.id ? (
                                        <input
                                            type="text"
                                            name="proveedor"
                                            value={editingProduct.proveedor}
                                            onChange={handleEditProductChange}
                                            style={styles.editInput}
                                        />
                                    ) : (
                                        product.proveedor || "N/A"
                                    )}
                                </td>
                                <td style={styles.td}>
                                    {editingProduct && editingProduct.id === product.id ? (
                                        <>
                                            <button onClick={handleUpdateProduct} style={{ ...styles.actionButton, backgroundColor: '#28a745' }}>Guardar</button>
                                            <button onClick={() => setEditingProduct(null)} style={{ ...styles.actionButton, backgroundColor: '#6c757d' }}>Cancelar</button>
                                        </>
                                    ) : (
                                        <>
                                            <button onClick={() => startEditing(product)} style={{ ...styles.actionButton, backgroundColor: '#ffc107' }}>Editar</button>
                                            <button onClick={() => handleDeleteProduct(product.id)} style={{ ...styles.actionButton, backgroundColor: '#dc3545' }}>Eliminar</button>
                                        </>
                                    )}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            <div style={styles.formContainer}>
                <h2>Agregar Nuevo Producto</h2>
                <form onSubmit={handleCreateProduct} style={styles.form}>
                    <div style={styles.formRow}>
                        <div style={styles.formGroup}>
                            <label style={styles.formLabel}>Nombre*</label>
                            <input
                                type="text"
                                name="nombre"
                                value={newProduct.nombre}
                                onChange={handleNewProductChange}
                                style={styles.formInput}
                                required
                            />
                        </div>
                        <div style={styles.formGroup}>
                            <label style={styles.formLabel}>Talle</label>
                            <select
                                name="talle"
                                value={newProduct.talle}
                                onChange={handleNewProductChange}
                                style={styles.formInput}
                            >
                                {TALLE_OPTIONS.map(option => (
                                    <option key={option.value} value={option.value}>{option.label}</option>
                                ))}
                            </select>
                        </div>
                        <div style={styles.formGroup}>
                            <label style={styles.formLabel}>Descripción</label>
                            <input
                                type="text"
                                name="descripcion"
                                value={newProduct.descripcion}
                                onChange={handleNewProductChange}
                                style={styles.formInput}
                            />
                        </div>
                    </div>
                    <div style={styles.formRow}>
                        <div style={styles.formGroup}>
                            <label style={styles.formLabel}>Precio*</label>
                            <input
                                type="number"
                                name="precio"
                                value={newProduct.precio}
                                onChange={handleNewProductChange}
                                style={styles.formInput}
                                min="0"
                                step="0.01"
                                required
                            />
                        </div>
                        <div style={styles.formGroup}>
                            <label style={styles.formLabel}>Costo*</label>
                            <input
                                type="number"
                                name="costo"
                                value={newProduct.costo}
                                onChange={handleNewProductChange}
                                style={styles.formInput}
                                min="0"
                                step="0.01"
                                required
                            />
                        </div>
                        <div style={styles.formGroup}>
                            <label style={styles.formLabel}>Stock*</label>
                            <input
                                type="number"
                                name="stock"
                                value={newProduct.stock}
                                onChange={handleNewProductChange}
                                style={styles.formInput}
                                min="0"
                                required
                            />
                        </div>
                    </div>
                    <div style={styles.formRow}>
                        <div style={styles.formGroup}>
                            <label style={styles.formLabel}>Código de Barras</label>
                            <input
                                type="text"
                                name="codigo_barras"
                                value={newProduct.codigo_barras}
                                onChange={handleNewProductChange}
                                style={styles.formInput}
                            />
                        </div>
                        <div style={styles.formGroup}>
                            <label style={styles.formLabel}>Proveedor</label>
                            <input
                                type="text"
                                name="proveedor"
                                value={newProduct.proveedor}
                                onChange={handleNewProductChange}
                                style={styles.formInput}
                            />
                        </div>
                        <div style={styles.formGroup}>
                            <button type="submit" style={styles.submitButton}>Guardar Producto</button>
                        </div>
                    </div>
                </form>
            </div>

            {/* Modal de confirmación */}
            {showConfirmModal && (
                <div style={styles.modalOverlay}>
                    <div style={styles.modalContent}>
                        <h3>Confirmar Eliminación</h3>
                        <p>¿Estás seguro de que quieres eliminar este producto?</p>
                        <div style={styles.modalButtons}>
                            <button onClick={confirmAction} style={{ ...styles.modalButton, backgroundColor: '#dc3545' }}>Sí, Eliminar</button>
                            <button onClick={() => setShowConfirmModal(false)} style={{ ...styles.modalButton, backgroundColor: '#6c757d' }}>Cancelar</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal de impresión de etiquetas */}
            {showEtiquetasModal && (
                <EtiquetasImpresion
                    products={productsToPrint}
                    onClose={handleCloseModal}
                />
            )}
        </div>
    );
};

const styles = {
    container: {
        padding: '20px',
        fontFamily: 'Inter, sans-serif',
        maxWidth: '1400px',
        margin: '20px auto',
        backgroundColor: '#f8f9fa',
        borderRadius: '8px',
        boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
        color: '#333',
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
    alert: {
        padding: '12px',
        borderRadius: '5px',
        marginBottom: '15px',
    },
    tableContainer: {
        backgroundColor: '#ffffff',
        padding: '20px',
        borderRadius: '8px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
        marginBottom: '30px',
        overflowX: 'auto',
    },
    table: {
        width: '100%',
        borderCollapse: 'collapse',
        textAlign: 'left',
        minWidth: '900px',
    },
    th: {
        padding: '12px',
        borderBottom: '2px solid #dee2e6',
        backgroundColor: '#f2f2f2',
        fontWeight: 'bold',
        color: '#333',
    },
    td: {
        padding: '12px',
        borderBottom: '1px solid #e9ecef',
        verticalAlign: 'middle',
    },
    actionButton: {
        padding: '8px 12px',
        border: 'none',
        borderRadius: '4px',
        color: 'white',
        cursor: 'pointer',
        fontWeight: 'bold',
        marginRight: '5px',
        transition: 'opacity 0.2s ease',
    },
    editInput: {
        width: '100px',
        padding: '5px',
        border: '1px solid #ccc',
        borderRadius: '4px',
    },
    formContainer: {
        backgroundColor: '#ffffff',
        padding: '20px',
        borderRadius: '8px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
        marginBottom: '30px',
    },
    form: {
        display: 'flex',
        flexDirection: 'column',
        gap: '20px',
    },
    formRow: {
        display: 'flex',
        flexWrap: 'wrap',
        gap: '20px',
        alignItems: 'flex-end',
    },
    formGroup: {
        flex: 1,
        minWidth: '200px',
    },
    formLabel: {
        display: 'block',
        marginBottom: '5px',
        fontWeight: 'bold',
        color: '#555',
    },
    formInput: {
        width: '100%',
        padding: '10px',
        border: '1px solid #ccc',
        borderRadius: '4px',
    },
    submitButton: {
        padding: '12px 20px',
        backgroundColor: '#007bff',
        color: 'white',
        border: 'none',
        borderRadius: '5px',
        cursor: 'pointer',
        fontWeight: 'bold',
        transition: 'background-color 0.3s ease',
        width: '100%',
    },
    modalOverlay: {
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
    },
    modalContent: {
        backgroundColor: '#fff',
        padding: '30px',
        borderRadius: '8px',
        textAlign: 'center',
        minWidth: '350px',
        boxShadow: '0 5px 15px rgba(0,0,0,0.3)',
    },
    modalButtons: {
        marginTop: '20px',
        display: 'flex',
        justifyContent: 'space-around',
    },
    modalButton: {
        padding: '10px 20px',
        border: 'none',
        borderRadius: '5px',
        color: 'white',
        cursor: 'pointer',
        fontWeight: 'bold',
    },
    printButton: {
        padding: '10px 20px',
        backgroundColor: '#28a745',
        color: 'white',
        border: 'none',
        borderRadius: '5px',
        cursor: 'pointer',
        fontWeight: 'bold',
        marginBottom: '20px',
        transition: 'background-color 0.3s ease',
    },
    barcodeWrapper: {
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '5px',
    },
    barcodeText: {
        fontSize: '0.8em',
        color: '#555',
    }
};

export default Productos;