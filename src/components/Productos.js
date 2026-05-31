// Productos.js
import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { useAuth } from '../AuthContext';
import { useNavigate } from 'react-router-dom';
import { formatearMonto } from '../utils/formatearMonto';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPencil, faTrash, faPlus, faArrowUp } from '@fortawesome/free-solid-svg-icons';
import HelpButton from './HelpButton';

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
    const [currentPageUrl, setCurrentPageUrl] = useState(null);

    const [newProduct, setNewProduct] = useState({
        nombre: '',
        precio: '',
        costo: '',
        stock: '',
        codigo_barras: '',
        talle: '',
    });
    const [tieneVariantes, setTieneVariantes] = useState(false);
    const [variantesNuevas, setVariantesNuevas] = useState([
        { talle: '', precio: '', costo: '', stock: '', codigo_barras: '' }
    ]);

    const [editProduct, setEditProduct] = useState(null);
    const [showEditModal, setShowEditModal] = useState(false);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [productToDelete, setProductToDelete] = useState(null);
    const [expandedVariants, setExpandedVariants] = useState({});
    const [showAddVarianteModal, setShowAddVarianteModal] = useState(false);
    const [nuevaVariante, setNuevaVariante] = useState({ talle: '', precio: '', stock: '', codigo_barras: '' });

    const [barcodeNombreSugerido, setBarcodeNombreSugerido] = useState('');
    const [barcodeLoading, setBarcodeLoading] = useState(false);

    const [etiquetasSeleccionadas, setEtiquetasSeleccionadas] = useState({});
    const [mostrarTalle, setMostrarTalle] = useState(false);
    const [stockBajoFilter, setStockBajoFilter] = useState(false);
    const STOCK_BAJO_THRESHOLD = 5;
    const [showEtiquetasModal, setShowEtiquetasModal] = useState(false);
    const [cantidadesModal, setCantidadesModal] = useState({});

    const [showAgregarStockModal, setShowAgregarStockModal] = useState(false);
    const [productoParaStock, setProductoParaStock] = useState(null);
    const [cantidadAGregar, setCantidadAGregar] = useState('');
    const [loadingAddStock, setLoadingAddStock] = useState(false);

    const generarCodigoDeBarrasEAN13 = () => {
        let code = '779' + Math.floor(100000000 + Math.random() * 900000000).toString();
        let sum = 0;
        for (let i = 0; i < 12; i++) {
            sum += parseInt(code[i], 10) * (i % 2 === 0 ? 1 : 3);
        }
        const checksum = (10 - (sum % 10)) % 10;
        return code + checksum.toString();
    };

    const handleBarcodeChange = async (e) => {
        const barcode = e.target.value;
        setNewProduct(prev => ({ ...prev, codigo_barras: barcode }));
        setBarcodeNombreSugerido('');

        if (barcode.length < 4) return;

        setBarcodeLoading(true);
        try {
            const resp = await axios.get(`${BASE_API_ENDPOINT}/api/productos/nombre_por_barcode/`, {
                headers: { 'Authorization': `Bearer ${token}` },
                params: { barcode }
            });
            if (resp.data.nombre) {
                setBarcodeNombreSugerido(resp.data.nombre);
                setNewProduct(prev => ({ ...prev, nombre: resp.data.nombre }));
            }
        } catch {
            // barcode no existe en ninguna tienda, ok
        } finally {
            setBarcodeLoading(false);
        }
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
            setCurrentPageUrl(url);
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
        if (!authLoading && isAuthenticated && user && (user.is_superuser || user.is_supervisor || user.is_staff) && selectedStoreSlug) {
            fetchProductos();
        } else if (!authLoading && (!isAuthenticated || !user || (!user.is_superuser && !user.is_supervisor))) {
            setError("Acceso denegado. No tenés permisos para gestionar productos.");
            setLoadingProducts(false);
        } else if (!authLoading && isAuthenticated && user && (user.is_superuser || user.is_supervisor) && !selectedStoreSlug) {
            setLoadingProducts(false);
        }
    }, [isAuthenticated, user, authLoading, selectedStoreSlug, fetchProductos]);

    const handleCreateProduct = async (e) => {
        e.preventDefault();
        setLoadingProducts(true);
        setError(null);

        try {
            if (tieneVariantes) {
                // Crear producto padre (contenedor) luego variantes
                const padreData = {
                    nombre: newProduct.nombre,
                    precio: variantesNuevas[0]?.precio || 0,
                    costo: null,
                    stock: 0,
                    codigo_barras: null,
                    talle: null,
                    tienda_slug: selectedStoreSlug,
                };
                const { data: padre } = await axios.post(`${BASE_API_ENDPOINT}/api/productos/`, padreData, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });

                for (const v of variantesNuevas) {
                    if (!v.talle && !v.precio) continue;
                    const varianteData = {
                        nombre: newProduct.nombre,
                        precio: v.precio,
                        costo: v.costo || null,
                        stock: v.stock || 0,
                        codigo_barras: v.codigo_barras || generarCodigoDeBarrasEAN13(),
                        talle: v.talle || null,
                        producto_padre: padre.id,
                        tienda_slug: selectedStoreSlug,
                    };
                    await axios.post(`${BASE_API_ENDPOINT}/api/productos/`, varianteData, {
                        headers: { 'Authorization': `Bearer ${token}` }
                    });
                }
            } else {
                const productToCreate = {
                    ...newProduct,
                    codigo_barras: newProduct.codigo_barras || generarCodigoDeBarrasEAN13(),
                    tienda_slug: selectedStoreSlug,
                    talle: newProduct.talle || null,
                };
                await axios.post(`${BASE_API_ENDPOINT}/api/productos/`, productToCreate, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
            }

            setNewProduct({ nombre: '', precio: '', costo: '', stock: '', codigo_barras: '', talle: '' });
            setTieneVariantes(false);
            setVariantesNuevas([{ talle: '', precio: '', costo: '', stock: '', codigo_barras: '' }]);
            setBarcodeNombreSugerido('');
            fetchProductos();
        } catch (err) {
            setError('Error al crear producto: ' + (err.response ? JSON.stringify(err.response.data) : err.message));
            setLoadingProducts(false);
        }
    };

    const handleAddVarianteAPadre = async () => {
        if (!editProduct) return;
        setLoadingProducts(true);
        setError(null);
        try {
            const varianteData = {
                nombre: editProduct.nombre,
                precio: nuevaVariante.precio,
                costo: editProduct.costo || null,
                stock: nuevaVariante.stock || 0,
                codigo_barras: nuevaVariante.codigo_barras || generarCodigoDeBarrasEAN13(),
                talle: nuevaVariante.talle || null,
                producto_padre: editProduct.id,
                tienda_slug: selectedStoreSlug,
            };
            await axios.post(`${BASE_API_ENDPOINT}/api/productos/`, varianteData, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            setShowAddVarianteModal(false);
            setNuevaVariante({ talle: '', precio: '', stock: '', codigo_barras: '' });
            fetchProductos(currentPageUrl);
        } catch (err) {
            setError('Error al agregar variante: ' + (err.response ? JSON.stringify(err.response.data) : err.message));
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
            fetchProductos(currentPageUrl);
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
            fetchProductos(currentPageUrl);
        } catch (err) {
            if (err.response && err.response.status === 404) {
                setShowDeleteModal(false);
                setProductToDelete(null);
                fetchProductos(currentPageUrl);
            } else {
                setError('Error al eliminar producto: ' + (err.response ? JSON.stringify(err.response.data) : err.message));
                setLoadingProducts(false);
            }
        }
    };

    const handleAgregarStock = async () => {
        const cantidad = parseInt(cantidadAGregar, 10);
        if (!cantidad || cantidad <= 0) return;
        setLoadingAddStock(true);
        try {
            const nuevoStock = (productoParaStock.stock || 0) + cantidad;
            const fechaIngreso = new Date().toISOString();
            await axios.patch(
                `${BASE_API_ENDPOINT}/api/productos/${productoParaStock.id}/`,
                { stock: nuevoStock },
                { headers: { Authorization: `Bearer ${token}` } }
            );
            const camposIngreso = { stock: nuevoStock, stock_ultimo_ingreso: nuevoStock, fecha_ultimo_ingreso: fechaIngreso };
            setProductos(prev => prev.map(p => {
                if (p.id === productoParaStock.id) return { ...p, ...camposIngreso };
                if (p.variantes) {
                    return { ...p, variantes: p.variantes.map(v => v.id === productoParaStock.id ? { ...v, ...camposIngreso } : v) };
                }
                return p;
            }));
            setShowAgregarStockModal(false);
            setProductoParaStock(null);
            setCantidadAGregar('');
        } catch (err) {
            setError('Error al agregar stock: ' + (err.response ? JSON.stringify(err.response.data) : err.message));
        } finally {
            setLoadingAddStock(false);
        }
    };

    const handleToggleEtiqueta = (id, isChecked) => {
        setEtiquetasSeleccionadas(prev => {
            const next = { ...prev };
            if (isChecked) {
                next[id] = true;
            } else {
                delete next[id];
            }
            return next;
        });
    };

    const handleImprimirEtiquetas = () => {
        const selectedIds = Object.keys(etiquetasSeleccionadas);
        if (selectedIds.length === 0) {
            alert('Seleccioná al menos un producto para imprimir etiquetas.');
            return;
        }
        // Inicializar cantidades en 1 para cada producto seleccionado
        const initial = {};
        selectedIds.forEach(id => { initial[id] = 1; });
        setCantidadesModal(initial);
        setShowEtiquetasModal(true);
    };

    const handleConfirmarEtiquetas = () => {
        const productosParaImprimir = Object.entries(cantidadesModal)
            .filter(([, cantidad]) => cantidad > 0)
            .map(([id, cantidad]) => {
                // Buscar primero en productos raíz, luego en variantes anidadas
                let producto = productos.find(p => String(p.id) === String(id));
                if (!producto) {
                    for (const padre of productos) {
                        const variante = (padre.variantes || []).find(v => String(v.id) === String(id));
                        if (variante) {
                            producto = {
                                ...variante,
                                nombre: padre.nombre,
                                variante_detalle: variante.talle || '',
                            };
                            break;
                        }
                    }
                }
                return producto ? { ...producto, labelQuantity: parseInt(cantidad, 10) } : null;
            })
            .filter(Boolean);
        if (productosParaImprimir.length > 0) {
            setShowEtiquetasModal(false);
            navigate('/etiquetas', { state: { productosParaImprimir } });
        }
    };

    if (authLoading || (isAuthenticated && !user)) {
        return <div style={styles.loadingMessage}>Cargando datos de usuario...</div>;
    }

    if (!isAuthenticated || (!user.is_superuser && !user.is_supervisor)) {
        return <div style={styles.accessDeniedMessage}>Acceso denegado. No tenés permisos para gestionar productos.</div>;
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
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <h1 style={{ ...styles.title, marginBottom: 0 }}>Productos</h1>
                <HelpButton
                    titulo="Gestión de Productos"
                    bullets={[
                        'Buscá productos por nombre o código de barras',
                        'Creá nuevos productos: el código de barras se genera automáticamente si no lo tenés',
                        'Seleccioná uno o varios productos y hacé clic en "Imprimir Etiquetas" para generar etiquetas con código de barras',
                        'Los Supervisores pueden agregar productos pero no editarlos ni eliminarlos',
                        'Solo los Administradores pueden editar precio, stock o eliminar productos',
                    ]}
                />
            </div>
            
            <div style={styles.section}>
                <h2 style={styles.sectionTitle}>Nuevo producto</h2>
                <form onSubmit={handleCreateProduct} style={styles.form}>
                    {!tieneVariantes && (
                    <div style={styles.inputGroup}>
                        <label style={styles.label}>
                            Código de barras {barcodeLoading && <span style={{ fontWeight: 400, fontSize: '0.85em', color: '#888' }}>buscando...</span>}
                        </label>
                        <input
                            type="text"
                            value={newProduct.codigo_barras}
                            onChange={handleBarcodeChange}
                            style={styles.input}
                            placeholder="Escaneá o ingresá el código de barras"
                        />
                        {barcodeNombreSugerido && (
                            <span style={{ fontSize: '0.82em', color: '#5dc87a', marginTop: 2 }}>
                                Nombre auto-completado desde otra sucursal
                            </span>
                        )}
                    </div>
                    )}
                    <div style={styles.inputGroup}>
                        <label style={styles.label}>Nombre</label>
                        <input
                            type="text"
                            maxLength={35}
                            value={newProduct.nombre}
                            onChange={(e) => { setBarcodeNombreSugerido(''); setNewProduct({ ...newProduct, nombre: e.target.value }); }}
                            style={styles.input}
                            required
                        />
                    </div>
                    <div style={styles.inputGroup}>
                        <label style={{ ...styles.label, color: tieneVariantes ? '#aaa' : undefined }}>Precio</label>
                        <input
                            type="number"
                            value={newProduct.precio}
                            onChange={(e) => setNewProduct({ ...newProduct, precio: e.target.value })}
                            style={{ ...styles.input, background: tieneVariantes ? '#f3f4f6' : undefined, color: tieneVariantes ? '#aaa' : undefined, cursor: tieneVariantes ? 'not-allowed' : undefined }}
                            required={!tieneVariantes}
                            disabled={tieneVariantes}
                        />
                    </div>
                    <div style={styles.inputGroup}>
                        <label style={{ ...styles.label, color: tieneVariantes ? '#aaa' : undefined }}>Costo (Opcional)</label>
                        <input
                            type="number"
                            value={newProduct.costo}
                            onChange={(e) => setNewProduct({ ...newProduct, costo: e.target.value })}
                            style={{ ...styles.input, background: tieneVariantes ? '#f3f4f6' : undefined, color: tieneVariantes ? '#aaa' : undefined, cursor: tieneVariantes ? 'not-allowed' : undefined }}
                            disabled={tieneVariantes}
                        />
                    </div>
                    <div style={styles.inputGroup}>
                        <label style={{ ...styles.label, color: tieneVariantes ? '#aaa' : undefined }}>Stock</label>
                        <input
                            type="number"
                            value={newProduct.stock}
                            onChange={(e) => setNewProduct({ ...newProduct, stock: e.target.value })}
                            style={{ ...styles.input, background: tieneVariantes ? '#f3f4f6' : undefined, color: tieneVariantes ? '#aaa' : undefined, cursor: tieneVariantes ? 'not-allowed' : undefined }}
                            required={!tieneVariantes}
                            disabled={tieneVariantes}
                        />
                    </div>
                    {!tieneVariantes && (
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
                    )}
                    <div style={{ width: '100%', marginTop: 4 }}>
                        <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', userSelect: 'none', fontSize: 14 }}>
                            <input
                                type="checkbox"
                                checked={tieneVariantes}
                                onChange={e => {
                                    setTieneVariantes(e.target.checked);
                                    if (!e.target.checked) {
                                        setVariantesNuevas([{ talle: '', precio: '', costo: '', stock: '', codigo_barras: '' }]);
                                    }
                                }}
                            />
                            <span style={{ fontWeight: 600 }}>¿Tiene variantes? (talle, color, etc.)</span>
                        </label>
                    </div>
                    {tieneVariantes && (
                        <div style={{ width: '100%', marginTop: 8 }}>
                            <p style={{ fontSize: 13, color: '#4a6660', marginBottom: 8 }}>
                                Ingresá cada variante. El código de barras se genera automáticamente si lo dejás vacío.
                            </p>
                            <div style={{ overflowX: 'auto' }}>
                                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                                    <thead>
                                        <tr>
                                            {['Talle / Valor', 'Precio', 'Costo', 'Stock', 'Código de barras', ''].map(h => (
                                                <th key={h} style={{ padding: '6px 8px', borderBottom: '1px solid #d8eae4', textAlign: 'left', fontWeight: 600 }}>{h}</th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {variantesNuevas.map((v, i) => (
                                            <tr key={i}>
                                                <td style={{ padding: '4px 8px' }}>
                                                    <input type="text" value={v.talle} placeholder="M, L, 42…" style={{ ...styles.input, width: 80 }}
                                                        onChange={e => setVariantesNuevas(prev => prev.map((x, j) => j === i ? { ...x, talle: e.target.value } : x))} />
                                                </td>
                                                <td style={{ padding: '4px 8px' }}>
                                                    <input type="number" value={v.precio} placeholder="0" style={{ ...styles.input, width: 90 }}
                                                        onChange={e => setVariantesNuevas(prev => prev.map((x, j) => j === i ? { ...x, precio: e.target.value } : x))} required />
                                                </td>
                                                <td style={{ padding: '4px 8px' }}>
                                                    <input type="number" value={v.costo} placeholder="Opcional" style={{ ...styles.input, width: 90 }}
                                                        onChange={e => setVariantesNuevas(prev => prev.map((x, j) => j === i ? { ...x, costo: e.target.value } : x))} />
                                                </td>
                                                <td style={{ padding: '4px 8px' }}>
                                                    <input type="number" value={v.stock} placeholder="0" style={{ ...styles.input, width: 70 }}
                                                        onChange={e => setVariantesNuevas(prev => prev.map((x, j) => j === i ? { ...x, stock: e.target.value } : x))} />
                                                </td>
                                                <td style={{ padding: '4px 8px' }}>
                                                    <input type="text" value={v.codigo_barras} placeholder="Auto" style={{ ...styles.input, width: 120 }}
                                                        onChange={e => setVariantesNuevas(prev => prev.map((x, j) => j === i ? { ...x, codigo_barras: e.target.value } : x))} />
                                                </td>
                                                <td style={{ padding: '4px 8px' }}>
                                                    {variantesNuevas.length > 1 && (
                                                        <button type="button" onClick={() => setVariantesNuevas(prev => prev.filter((_, j) => j !== i))}
                                                            style={{ background: 'none', border: 'none', color: '#e25252', cursor: 'pointer', fontSize: 16 }}>✕</button>
                                                    )}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                            <button type="button" onClick={() => setVariantesNuevas(prev => [...prev, { talle: '', precio: '', costo: '', stock: '', codigo_barras: '' }])}
                                style={{ marginTop: 8, padding: '5px 12px', background: '#e8f5ec', color: '#1a7a3f', border: '1px solid #b7dfc7', borderRadius: 4, cursor: 'pointer', fontSize: 13 }}>
                                + Agregar variante
                            </button>
                        </div>
                    )}
                    <button type="submit" style={styles.submitButton} disabled={loadingProducts}>
                        {loadingProducts ? 'Creando...' : 'Crear Producto'}
                    </button>
                </form>
            </div>
            
            <div style={styles.section}>
                <div style={styles.tableHeader}>
                    <h2 style={styles.sectionTitle}>Listado</h2>
                    <button onClick={handleImprimirEtiquetas} style={styles.printButton}>
                        Imprimir Etiquetas
                        {Object.keys(etiquetasSeleccionadas).length > 0 && (
                            <span style={{ marginLeft: 7, background: '#fff', color: '#1a7a3f', borderRadius: 10, padding: '1px 7px', fontSize: 12, fontWeight: 800 }}>
                                {Object.keys(etiquetasSeleccionadas).length}
                            </span>
                        )}
                    </button>
                </div>
                <div style={styles.filtersContainer}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4, flex: 1 }}>
                        <input
                            type="text"
                            placeholder="Buscar por nombre o código de barras..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            style={styles.filterInput}
                        />
                        {/^\d{6,}$/.test(searchTerm) && (
                            <span style={{ fontSize: 11, color: '#1a7a3f', fontWeight: 600 }}>🔍 Buscando por código de barras</span>
                        )}
                    </div>
                    <button onClick={() => fetchProductos()} style={styles.searchButton}>Buscar</button>
                    {(() => {
                        const stockBajoCount = productos.reduce((acc, p) => {
                            if (p.variantes && p.variantes.length > 0) {
                                return acc + p.variantes.filter(v => (v.stock || 0) <= STOCK_BAJO_THRESHOLD).length;
                            }
                            return acc + ((p.stock || 0) <= STOCK_BAJO_THRESHOLD ? 1 : 0);
                        }, 0);
                        return stockBajoCount > 0 ? (
                            <button
                                type="button"
                                onClick={() => setStockBajoFilter(v => !v)}
                                style={{
                                    padding: '6px 14px', borderRadius: 20, cursor: 'pointer', fontSize: 12, fontWeight: 700,
                                    background: stockBajoFilter ? '#fef2f2' : '#f7faf9',
                                    color: stockBajoFilter ? '#991b1b' : '#4a6660',
                                    border: `1px solid ${stockBajoFilter ? '#fca5a5' : '#d8eae4'}`,
                                    transition: 'all 0.15s',
                                    whiteSpace: 'nowrap',
                                }}
                            >
                                ⚠️ Stock bajo ({stockBajoCount})
                            </button>
                        ) : null;
                    })()}
                    {productos.some(p => p.talle && String(p.talle).trim() !== '') && (
                        <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', marginLeft: '12px' }}>
                            <input
                                type="checkbox"
                                checked={mostrarTalle}
                                onChange={(e) => setMostrarTalle(e.target.checked)}
                            />
                            <span>Mostrar variante</span>
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
                                        <th style={styles.th}>Etiqueta</th>
                                        <th style={styles.th}>Nombre</th>
                                        {mostrarTalle && <th style={styles.th}>Talle</th>}
                                        <th style={styles.th}>Precio</th>
                                        <th style={styles.th}>Costo</th>
                                        <th style={styles.th}>Margen</th>
                                        <th style={styles.th}>Stock actual</th>
                                        <th style={styles.th}>Últ. cambio stock</th>
                                        <th style={styles.th}>Acciones</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {(stockBajoFilter
                                        ? productos.filter(p => p.variantes && p.variantes.length > 0
                                            ? p.variantes.some(v => (v.stock || 0) <= STOCK_BAJO_THRESHOLD)
                                            : (p.stock || 0) <= STOCK_BAJO_THRESHOLD)
                                        : productos
                                    ).map(producto => {
                                        const precio = parseFloat(producto.precio) || 0;
                                        const costo = parseFloat(producto.costo) || 0;
                                        const margen = precio > 0 && costo > 0 ? ((precio - costo) / precio * 100) : null;
                                        const margenColor = margen === null ? '#8aa8a0' : margen >= 30 ? '#16a34a' : margen >= 15 ? '#d97706' : '#dc2626';
                                        const tieneVars = producto.variantes && producto.variantes.length > 0;
                                        const expandido = !!expandedVariants[producto.id];
                                        return (
                                        <React.Fragment key={producto.id}>
                                        <tr style={producto.stock <= STOCK_BAJO_THRESHOLD && !tieneVars ? { background: '#fef9ec' } : tieneVars ? { background: '#f0faf5' } : {}}>
                                            <td style={{ ...styles.td, textAlign: 'center' }}>
                                                {!tieneVars && (
                                                    <input
                                                        type="checkbox"
                                                        checked={!!etiquetasSeleccionadas[producto.id]}
                                                        onChange={(e) => handleToggleEtiqueta(producto.id, e.target.checked)}
                                                        style={{ width: 16, height: 16, cursor: 'pointer' }}
                                                    />
                                                )}
                                            </td>
                                            <td style={styles.td}>
                                                {tieneVars && (
                                                    <button
                                                        onClick={() => setExpandedVariants(prev => ({ ...prev, [producto.id]: !prev[producto.id] }))}
                                                        style={{ background: 'none', border: 'none', cursor: 'pointer', marginRight: 6, fontSize: 13, color: '#1a7a3f', fontWeight: 700 }}
                                                    >
                                                        {expandido ? '▼' : '▶'}
                                                    </button>
                                                )}
                                                {producto.nombre}
                                                {tieneVars && (
                                                    <span style={{ marginLeft: 8, fontSize: 11, color: '#4a6660', background: '#d8eae4', borderRadius: 8, padding: '1px 7px' }}>
                                                        {producto.variantes.length} variante{producto.variantes.length !== 1 ? 's' : ''}
                                                    </span>
                                                )}
                                            </td>
                                            {mostrarTalle && <td style={styles.td}>{producto.talle || (tieneVars ? '—' : '-')}</td>}
                                            <td style={styles.td}>{tieneVars ? '—' : formatearMonto(producto.precio)}</td>
                                            <td style={styles.td}>{tieneVars ? '—' : formatearMonto(producto.costo || 0)}</td>
                                            <td style={{ ...styles.td, fontWeight: 700, color: margenColor }}>
                                                {tieneVars ? '—' : margen !== null ? `${margen.toFixed(1)}%` : <span style={{ color: '#8aa8a0', fontStyle: 'italic', fontWeight: 400 }}>—</span>}
                                            </td>
                                            <td style={{ ...styles.td, color: (!tieneVars && producto.stock <= STOCK_BAJO_THRESHOLD) ? '#dc2626' : undefined, fontWeight: (!tieneVars && producto.stock <= STOCK_BAJO_THRESHOLD) ? 700 : undefined }}>
                                                {tieneVars
                                                    ? <span style={{ color: '#4a6660', fontSize: 12 }}>
                                                        {producto.variantes.reduce((s, v) => s + (v.stock || 0), 0)} total
                                                      </span>
                                                    : <>{producto.stock}{producto.stock <= STOCK_BAJO_THRESHOLD && <span style={{ marginLeft: 4, fontSize: 10 }}>⚠️</span>}</>
                                                }
                                            </td>
                                            <td style={{ ...styles.td, whiteSpace: 'nowrap' }}>
                                                {!tieneVars && producto.stock_ultimo_ingreso != null ? (
                                                    <span>
                                                        <span style={{ fontWeight: 600 }}>{producto.stock_ultimo_ingreso}</span>
                                                        {producto.fecha_ultimo_ingreso && (
                                                            <span style={{ marginLeft: 5, fontSize: 11, color: '#8aa8a0' }}>
                                                                {new Date(producto.fecha_ultimo_ingreso).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: '2-digit' })}
                                                            </span>
                                                        )}
                                                    </span>
                                                ) : <span style={{ color: '#c0ccc9' }}>—</span>}
                                            </td>
                                            <td style={{ ...styles.td, whiteSpace: 'nowrap' }}>
                                                <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                                                {user.is_superuser && <>
                                                    <button
                                                        className="icon-btn"
                                                        onClick={() => { setEditProduct({ ...producto }); setShowEditModal(true); }}
                                                        style={{ color: 'white', backgroundColor: '#f59e0b' }}
                                                        data-tooltip="Editar producto"
                                                    >
                                                        <FontAwesomeIcon icon={faPencil} />
                                                    </button>
                                                    <button
                                                        className="icon-btn"
                                                        onClick={() => { setEditProduct({ ...producto }); setShowAddVarianteModal(true); }}
                                                        style={{ color: 'white', backgroundColor: '#5dc87a' }}
                                                        data-tooltip={tieneVars ? 'Agregar variante' : 'Convertir en producto con variantes'}
                                                    >
                                                        <FontAwesomeIcon icon={faPlus} />
                                                    </button>
                                                    <button
                                                        className="icon-btn"
                                                        onClick={() => { setProductToDelete(producto); setShowDeleteModal(true); }}
                                                        style={{ color: 'white', backgroundColor: '#e25252' }}
                                                        data-tooltip="Eliminar producto"
                                                    >
                                                        <FontAwesomeIcon icon={faTrash} />
                                                    </button>
                                                </>}
                                                {user.is_supervisor && !user.is_superuser && !tieneVars && (
                                                    <button
                                                        className="icon-btn"
                                                        onClick={() => { setProductoParaStock(producto); setCantidadAGregar(''); setShowAgregarStockModal(true); }}
                                                        style={{ color: 'white', backgroundColor: '#3b82f6' }}
                                                        data-tooltip="Agregar stock"
                                                    >
                                                        <FontAwesomeIcon icon={faArrowUp} />
                                                    </button>
                                                )}
                                                </div>
                                            </td>
                                        </tr>
                                        {/* Filas de variantes expandidas */}
                                        {tieneVars && expandido && producto.variantes.map(v => {
                                            const vPrecio = parseFloat(v.precio) || 0;
                                            const vCosto = parseFloat(producto.costo) || 0;
                                            const vMargen = vPrecio > 0 && vCosto > 0 ? ((vPrecio - vCosto) / vPrecio * 100) : null;
                                            const vMargenColor = vMargen === null ? '#8aa8a0' : vMargen >= 30 ? '#16a34a' : vMargen >= 15 ? '#d97706' : '#dc2626';
                                            return (
                                                <tr key={v.id} style={{ background: '#f7faf9', borderLeft: '3px solid #5dc87a' }}>
                                                    <td style={{ ...styles.td, textAlign: 'center' }}>
                                                        <input
                                                            type="checkbox"
                                                            checked={!!etiquetasSeleccionadas[v.id]}
                                                            onChange={(e) => handleToggleEtiqueta(v.id, e.target.checked)}
                                                            style={{ width: 16, height: 16, cursor: 'pointer' }}
                                                        />
                                                    </td>
                                                    <td style={{ ...styles.td, paddingLeft: 28, color: '#4a6660', fontSize: 13 }}>
                                                        ↳ {v.talle || '(sin talle)'}
                                                    </td>
                                                    {mostrarTalle && <td style={styles.td}>{v.talle || '-'}</td>}
                                                    <td style={styles.td}>{formatearMonto(v.precio)}</td>
                                                    <td style={styles.td}>—</td>
                                                    <td style={{ ...styles.td, fontWeight: 700, color: vMargenColor }}>
                                                        {vMargen !== null ? `${vMargen.toFixed(1)}%` : <span style={{ color: '#8aa8a0', fontStyle: 'italic', fontWeight: 400 }}>—</span>}
                                                    </td>
                                                    <td style={{ ...styles.td, color: v.stock <= STOCK_BAJO_THRESHOLD ? '#dc2626' : undefined, fontWeight: v.stock <= STOCK_BAJO_THRESHOLD ? 700 : undefined }}>
                                                        {v.stock}{v.stock <= STOCK_BAJO_THRESHOLD && <span style={{ marginLeft: 4, fontSize: 10 }}>⚠️</span>}
                                                    </td>
                                                    <td style={{ ...styles.td, whiteSpace: 'nowrap' }}>
                                                        {v.stock_ultimo_ingreso != null ? (
                                                            <span>
                                                                <span style={{ fontWeight: 600 }}>{v.stock_ultimo_ingreso}</span>
                                                                {v.fecha_ultimo_ingreso && (
                                                                    <span style={{ marginLeft: 5, fontSize: 11, color: '#8aa8a0' }}>
                                                                        {new Date(v.fecha_ultimo_ingreso).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: '2-digit' })}
                                                                    </span>
                                                                )}
                                                            </span>
                                                        ) : <span style={{ color: '#c0ccc9' }}>—</span>}
                                                    </td>
                                                    <td style={{ ...styles.td, whiteSpace: 'nowrap' }}>
                                                        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                                                        {user.is_superuser && (
                                                            <button
                                                                className="icon-btn"
                                                                onClick={() => {
                                                                    const varianteFull = productos.find(p => p.id === v.id) || v;
                                                                    setEditProduct({ ...varianteFull, nombre: varianteFull.nombre || producto.nombre });
                                                                    setShowEditModal(true);
                                                                }}
                                                                style={{ color: 'white', backgroundColor: '#f59e0b' }}
                                                                data-tooltip="Editar variante"
                                                            >
                                                                <FontAwesomeIcon icon={faPencil} />
                                                            </button>
                                                        )}
                                                        {user.is_supervisor && !user.is_superuser && (
                                                            <button
                                                                className="icon-btn"
                                                                onClick={() => { setProductoParaStock({ ...v, nombre: `${producto.nombre} · T: ${v.talle || ''}` }); setCantidadAGregar(''); setShowAgregarStockModal(true); }}
                                                                style={{ color: 'white', backgroundColor: '#3b82f6' }}
                                                                data-tooltip="Agregar stock"
                                                            >
                                                                <FontAwesomeIcon icon={faArrowUp} />
                                                            </button>
                                                        )}
                                                        </div>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                        </React.Fragment>
                                        );
                                    })}
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
                                maxLength={35}
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
                        <div style={styles.inputGroupModal}>
                            <label style={styles.label}>ID Variante Tienda Nube (Opcional):</label>
                            <input
                                type="text"
                                value={editProduct.tn_variant_id || ''}
                                onChange={(e) => setEditProduct({ ...editProduct, tn_variant_id: e.target.value })}
                                style={styles.modalInput}
                                placeholder="Ej: 123456789"
                            />
                            <small style={{ color: '#6b7280', fontSize: 11 }}>
                                Ingresalo si el producto ya existe en Tienda Nube y querés vincularlo manualmente.
                            </small>
                        </div>
                        <div style={styles.modalActions}>
                            <button onClick={handleEditProduct} style={styles.modalConfirmButton}>Guardar</button>
                            <button
                                type="button"
                                onClick={() => { setShowEditModal(false); setShowAddVarianteModal(true); }}
                                style={{ padding: '10px 15px', backgroundColor: '#5dc87a', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                            >
                                + Variante
                            </button>
                            <button onClick={() => setShowEditModal(false)} style={styles.modalCancelButton}>Cancelar</button>
                        </div>
                    </div>
                </div>
            )}
            
            {/* Modal de cantidad de etiquetas */}
            {showEtiquetasModal && (
                <div style={styles.modalOverlay} onClick={() => setShowEtiquetasModal(false)}>
                    <div style={{ ...styles.modalContent, maxWidth: 420 }} onClick={e => e.stopPropagation()}>
                        <h3 style={{ marginTop: 0, marginBottom: 16, fontSize: '1rem', fontWeight: 700 }}>¿Cuántas etiquetas imprimir?</h3>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, maxHeight: 340, overflowY: 'auto', paddingRight: 4 }}>
                            {Object.keys(cantidadesModal).map(id => {
                                let producto = productos.find(p => String(p.id) === String(id));
                                let nombreDisplay = producto?.nombre;
                                if (!producto) {
                                    for (const padre of productos) {
                                        const v = (padre.variantes || []).find(v => String(v.id) === String(id));
                                        if (v) { producto = v; nombreDisplay = v.nombre || padre.nombre; break; }
                                    }
                                }
                                if (!producto) return null;
                                return (
                                    <div key={id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                                        <span style={{ fontSize: 14, fontWeight: 600, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                            {nombreDisplay}
                                        </span>
                                        <input
                                            type="number"
                                            min="1"
                                            max="100"
                                            value={cantidadesModal[id]}
                                            onChange={e => setCantidadesModal(prev => ({ ...prev, [id]: Math.max(1, parseInt(e.target.value) || 1) }))}
                                            style={{ width: 70, padding: '6px 10px', border: '1px solid #d8eae4', borderRadius: 8, fontSize: 15, fontWeight: 700, textAlign: 'center' }}
                                        />
                                    </div>
                                );
                            })}
                        </div>
                        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 20 }}>
                            <button onClick={() => setShowEtiquetasModal(false)} style={styles.modalCancelButton}>Cancelar</button>
                            <button onClick={handleConfirmarEtiquetas} style={styles.modalConfirmButton}>Imprimir</button>
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

            {/* Modal agregar variante a un padre existente */}
            {showAddVarianteModal && editProduct && (
                <div style={styles.modalOverlay} onClick={() => setShowAddVarianteModal(false)}>
                    <div style={{ ...styles.modalContent, maxWidth: 420 }} onClick={e => e.stopPropagation()}>
                        <h3 style={{ marginTop: 0 }}>Agregar variante a "{editProduct.nombre}"</h3>
                        {[
                            { key: 'talle', label: 'Talle / Valor', placeholder: 'M, L, XL, 42…', type: 'text' },
                            { key: 'precio', label: 'Precio', placeholder: '0', type: 'number' },
                            { key: 'stock', label: 'Stock inicial', placeholder: '0', type: 'number' },
                            { key: 'codigo_barras', label: 'Código de barras (opcional)', placeholder: 'Auto-generado', type: 'text' },
                        ].map(({ key, label, placeholder, type }) => (
                            <div key={key} style={styles.inputGroupModal}>
                                <label style={{ ...styles.label, textAlign: 'left', display: 'block' }}>{label}:</label>
                                <input
                                    type={type}
                                    value={nuevaVariante[key]}
                                    onChange={e => setNuevaVariante(prev => ({ ...prev, [key]: e.target.value }))}
                                    placeholder={placeholder}
                                    style={styles.modalInput}
                                />
                            </div>
                        ))}
                        <div style={styles.modalActions}>
                            <button onClick={handleAddVarianteAPadre} style={styles.modalConfirmButton} disabled={loadingProducts}>
                                {loadingProducts ? 'Guardando…' : 'Agregar variante'}
                            </button>
                            <button onClick={() => { setShowAddVarianteModal(false); setNuevaVariante({ talle: '', precio: '', stock: '', codigo_barras: '' }); }}
                                style={styles.modalCancelButton}>Cancelar</button>
                        </div>
                    </div>
                </div>
            )}
            {/* Modal agregar stock (supervisor) */}
            {showAgregarStockModal && productoParaStock && (
                <div style={styles.modalOverlay}>
                    <div style={{ ...styles.modalContent, maxWidth: 380, textAlign: 'left' }}>
                        <h3 style={{ margin: '0 0 16px', color: '#1a2926' }}>Agregar Stock</h3>
                        <p style={{ margin: '0 0 4px', fontSize: 14, color: '#1a2926', fontWeight: 600 }}>
                            {productoParaStock.nombre}
                        </p>
                        <p style={{ margin: '0 0 20px', fontSize: 13, color: '#8aa8a0' }}>
                            Stock actual: <strong style={{ color: '#1a2926' }}>{productoParaStock.stock}</strong>
                        </p>
                        <div style={styles.inputGroupModal}>
                            <label style={styles.label}>Cantidad a agregar:</label>
                            <input
                                type="number"
                                min="1"
                                value={cantidadAGregar}
                                onChange={e => setCantidadAGregar(e.target.value)}
                                style={styles.modalInput}
                                autoFocus
                                onKeyDown={e => e.key === 'Enter' && handleAgregarStock()}
                            />
                        </div>
                        {cantidadAGregar && parseInt(cantidadAGregar, 10) > 0 && (
                            <p style={{ fontSize: 13, color: '#16a34a', margin: '0 0 16px', fontWeight: 600 }}>
                                Nuevo stock: {(productoParaStock.stock || 0) + parseInt(cantidadAGregar, 10)}
                            </p>
                        )}
                        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 8 }}>
                            <button
                                onClick={() => { setShowAgregarStockModal(false); setProductoParaStock(null); setCantidadAGregar(''); }}
                                style={styles.modalCancelButton}
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={handleAgregarStock}
                                disabled={!cantidadAGregar || parseInt(cantidadAGregar, 10) <= 0 || loadingAddStock}
                                style={{ ...styles.modalConfirmButton, backgroundColor: '#3b82f6', opacity: (!cantidadAGregar || parseInt(cantidadAGregar, 10) <= 0) ? 0.5 : 1 }}
                            >
                                {loadingAddStock ? 'Guardando...' : 'Confirmar'}
                            </button>
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
    container: { padding: 0, fontFamily: "'Inter', 'Segoe UI', system-ui, sans-serif", width: '100%' },
    title: { color: '#1a2926', fontSize: '1.5rem', fontWeight: 600, marginBottom: '1.25rem' },
    section: { marginBottom: '30px', padding: '20px', backgroundColor: '#f7faf9', borderRadius: '10px' },
    sectionTitle: { color: '#4a6660', fontSize: '1.1rem', borderBottom: '1px solid #edf5f2', paddingBottom: '8px', marginTop: '1.5rem', marginBottom: '0.5rem' },
    form: { display: 'flex', gap: '20px', flexWrap: 'wrap', alignItems: 'flex-end' },
    inputGroup: { flex: '1 1 200px', display: 'flex', flexDirection: 'column' },
    label: { marginBottom: '5px', fontWeight: 'bold' },
    input: { padding: '8px', border: '1px solid #d8eae4', borderRadius: '4px' },
    submitButton: { padding: '10px 15px', backgroundColor: '#5dc87a', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', alignSelf: 'flex-end' },
    tableHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' },
    printButton: { padding: '10px 15px', backgroundColor: '#5dc87a', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' },
    filtersContainer: { display: 'flex', gap: '10px', marginBottom: '20px' },
    filterInput: { flex: '1', padding: '8px', border: '1px solid #d8eae4', borderRadius: '4px' },
    searchButton: { padding: '8px 15px', backgroundColor: '#5dc87a', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' },
    loadingMessage: { textAlign: 'center', color: '#777' },
    errorMessage: { color: '#e25252', padding: '10px', backgroundColor: '#fef2f2', border: '1px solid #fca5a5', borderRadius: '6px' },
    tableResponsive: { overflowX: 'auto' },
    table: { width: '100%', borderCollapse: 'collapse' },
    th: { padding: '10px', borderBottom: '2px solid #d8eae4', textAlign: 'left', backgroundColor: '#f7faf9' },
    td: { padding: '10px', borderBottom: '1px solid #d8eae4' },
    etiquetasInput: { width: '50px' },
    editButton: { padding: '5px 10px', backgroundColor: '#f59e0b', color: 'black', border: 'none', borderRadius: '4px', cursor: 'pointer', marginRight: '5px' },
    deleteButton: { padding: '5px 10px', backgroundColor: '#e25252', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' },
    paginationContainer: { display: 'flex', justifyContent: 'center', alignItems: 'center', marginTop: '20px', gap: '10px' },
    paginationButton: { padding: '8px 15px', backgroundColor: '#5dc87a', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer' },
    pageNumber: { fontSize: '1em', fontWeight: 'bold' },
    modalOverlay: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 },
    modalContent: { backgroundColor: 'white', padding: '20px', borderRadius: '10px', textAlign: 'center', width: '90%', maxWidth: '500px' },
    inputGroupModal: { marginBottom: '15px' },
    modalInput: { width: '100%', padding: '8px', boxSizing: 'border-box' },
    modalActions: { display: 'flex', justifyContent: 'center', gap: '10px', marginTop: '15px' },
    modalConfirmButton: { padding: '10px 15px', backgroundColor: '#5dc87a', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' },
    modalCancelButton: { padding: '10px 15px', backgroundColor: '#e25252', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' },
    accessDeniedMessage: { color: '#e25252', textAlign: 'center', fontWeight: 'bold' },
    noStoreSelectedMessage: { textAlign: 'center', marginTop: '50px' },
};
export default Productos;