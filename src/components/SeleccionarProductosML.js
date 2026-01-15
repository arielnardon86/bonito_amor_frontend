// Componente para seleccionar productos y categorías de ML
import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import Swal from 'sweetalert2';

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

const BASE_API_ENDPOINT = normalizeApiUrl(process.env.REACT_APP_API_URL);

const SeleccionarProductosML = ({ tiendaId, selectedStoreSlug, token, onClose, onConfirm }) => {
    const [productos, setProductos] = useState([]);
    const [loading, setLoading] = useState(true);
    const [cargandoCategorias, setCargandoCategorias] = useState(true);
    const [seleccionados, setSeleccionados] = useState({}); // {productoId: {checked: bool, categoria: string}}
    const [categoriasCache, setCategoriasCache] = useState({}); // Cache de categorías
    const [buscandoCategorias, setBuscandoCategorias] = useState({});
    const [busquedaCategoria, setBusquedaCategoria] = useState({}); // {productoId: texto_busqueda}
    
    useEffect(() => {
        cargarProductos();
        cargarCategoriasPrincipales();
    }, [tiendaId, token, selectedStoreSlug]);

    const cargarProductos = async () => {
        try {
            const response = await axios.get(`${BASE_API_ENDPOINT}/api/productos/`, {
                headers: { 'Authorization': `Bearer ${token}` },
                params: { tienda_slug: selectedStoreSlug }
            });
            
            const productosData = response.data.results || response.data;
            setProductos(Array.isArray(productosData) ? productosData : []);
            
            // Inicializar selección
            const initSeleccionados = {};
            productosData.forEach(prod => {
                initSeleccionados[prod.id] = {
                    checked: prod.ml_sincronizar || false,
                    categoria: prod.ml_categoria_id || ''
                };
            });
            setSeleccionados(initSeleccionados);
        } catch (err) {
            console.error('Error cargando productos:', err);
            Swal.fire('Error', 'No se pudieron cargar los productos', 'error');
        } finally {
            setLoading(false);
        }
    };

    const cargarCategoriasPrincipales = async () => {
        if (!tiendaId || !token) {
            setCargandoCategorias(false);
            return;
        }
        
        setCargandoCategorias(true);
        try {
            const response = await axios.get(
                `${BASE_API_ENDPOINT}/api/tiendas/${tiendaId}/mercadolibre/categories/`,
                { 
                    headers: { 'Authorization': `Bearer ${token}` }, 
                    params: { limit: 15000 }, // Límite alto para cargar todas las categorías disponibles
                    timeout: 60000 
                }
            );
            
            const categorias = response.data.categories || [];
            
            console.log('✅ Categorías recibidas del backend:', categorias.length, 'categorías');
            console.log('📋 Datos completos de respuesta:', response.data);
            
            if (categorias.length === 0 && response.data.warning) {
                // Mostrar advertencia pero continuar
                console.warn('⚠️ Advertencia:', response.data.warning);
            }
            
            // Si no hay categorías en la respuesta, usar categorías de fallback
            if (categorias.length === 0) {
                console.log('⚠️ No hay categorías en la respuesta, usando fallback');
                const fallbackCategories = [
                    { id: 'MLA5726', name: 'Hogar, Muebles y Deco' },
                    { id: 'MLA1574', name: 'Hogar, Muebles y Decoración' },
                    { id: 'MLA1144', name: 'Electrodomésticos y Aires Ac.' },
                    { id: 'MLA1276', name: 'Deportes y Fitness' },
                    { id: 'MLA1430', name: 'Ropa y Accesorios' },
                    { id: 'MLA1459', name: 'Bebés' },
                    { id: 'MLA1367', name: 'Juguetes y Hobbies' },
                    { id: 'MLA1403', name: 'Construcción' },
                    { id: 'MLA1071', name: 'Herramientas' },
                    { id: 'MLA1648', name: 'Industrias y Oficinas' }
                ];
                const cache = {};
                fallbackCategories.forEach(cat => {
                    cache[cat.id] = { id: cat.id, name: cat.name };
                });
                console.log('📦 Cache de categorías fallback:', Object.keys(cache).length, 'categorías');
                setCategoriasCache(cache);
            } else {
                const cache = {};
                categorias.forEach(cat => {
                    if (cat.id && cat.name) {
                        cache[cat.id] = { id: cat.id, name: cat.name };
                    }
                });
                console.log('📦 Cache de categorías desde API:', Object.keys(cache).length, 'categorías');
                console.log('📋 Categorías en cache:', cache);
                setCategoriasCache(cache);
            }
        } catch (err) {
            console.error('❌ Error cargando categorías principales:', err);
            console.error('❌ Respuesta del error:', err.response?.data);
            // En caso de error, usar categorías de fallback
            const fallbackCategories = [
                { id: 'MLA5726', name: 'Hogar, Muebles y Deco' },
                { id: 'MLA1574', name: 'Hogar, Muebles y Decoración' },
                { id: 'MLA1144', name: 'Electrodomésticos y Aires Ac.' },
                { id: 'MLA1276', name: 'Deportes y Fitness' },
                { id: 'MLA1430', name: 'Ropa y Accesorios' },
                { id: 'MLA1459', name: 'Bebés' },
                { id: 'MLA1367', name: 'Juguetes y Hobbies' },
                { id: 'MLA1403', name: 'Construcción' },
                { id: 'MLA1071', name: 'Herramientas' },
                { id: 'MLA1648', name: 'Industrias y Oficinas' }
            ];
            const cache = {};
            fallbackCategories.forEach(cat => {
                cache[cat.id] = { id: cat.id, name: cat.name };
            });
            console.log('📦 Cache de categorías fallback por error:', Object.keys(cache).length, 'categorías');
            setCategoriasCache(cache);
        } finally {
            setCargandoCategorias(false);
        }
    };

    const buscarCategorias = async (query) => {
        if (!tiendaId || !token || query.length < 2) return [];
        
        try {
            const response = await axios.get(
                `${BASE_API_ENDPOINT}/api/tiendas/${tiendaId}/mercadolibre/categories/`,
                {
                    headers: { 'Authorization': `Bearer ${token}` },
                    params: { search: query, limit: 5000 } // Límite alto para búsquedas
                }
            );
            const categorias = response.data.categories || [];
            // Actualizar cache
            const nuevoCache = { ...categoriasCache };
            categorias.forEach(cat => {
                nuevoCache[cat.id] = { id: cat.id, name: cat.name };
            });
            setCategoriasCache(nuevoCache);
            return categorias;
        } catch (err) {
            console.error('Error buscando categorías:', err);
            return [];
        }
    };

    const handleToggleProducto = (productoId) => {
        setSeleccionados(prev => ({
            ...prev,
            [productoId]: {
                ...prev[productoId],
                checked: !prev[productoId]?.checked
            }
        }));
    };

    const handleCategoriaChange = (productoId, categoriaId) => {
        setSeleccionados(prev => ({
            ...prev,
            [productoId]: {
                ...prev[productoId],
                categoria: categoriaId || ''
            }
        }));
    };

    const handleBuscarCategoria = async (productoId, query) => {
        // Actualizar el texto de búsqueda para este producto
        setBusquedaCategoria(prev => ({ ...prev, [productoId]: query }));
        
        // Si la búsqueda tiene al menos 2 caracteres, buscar en el backend
        if (query.length >= 2) {
            setBuscandoCategorias(prev => ({ ...prev, [productoId]: true }));
            const categorias = await buscarCategorias(query);
            setBuscandoCategorias(prev => ({ ...prev, [productoId]: false }));
            return categorias;
        }
        
        // Si la búsqueda está vacía, limpiar el filtro
        if (query.length === 0) {
            setBusquedaCategoria(prev => {
                const nuevo = { ...prev };
                delete nuevo[productoId];
                return nuevo;
            });
        }
    };
    
    // Función para obtener categorías filtradas según la búsqueda
    const getCategoriasFiltradas = (productoId) => {
        const todasLasCategorias = Object.values(categoriasCache);
        const busqueda = busquedaCategoria[productoId];
        
        // Si no hay búsqueda, devolver todas las categorías
        if (!busqueda || busqueda.length === 0) {
            return todasLasCategorias;
        }
        
        // Filtrar categorías que coincidan con la búsqueda (case-insensitive)
        const busquedaLower = busqueda.toLowerCase();
        return todasLasCategorias.filter(cat => 
            cat.name.toLowerCase().includes(busquedaLower) ||
            cat.id.toLowerCase().includes(busquedaLower)
        );
    };

    const handleConfirmar = () => {
        const productosParaSincronizar = Object.entries(seleccionados)
            .filter(([id, config]) => config.checked)
            .map(([id, config]) => ({
                producto_id: id,
                categoria_ml_id: config.categoria || null
            }));

        if (productosParaSincronizar.length === 0) {
            Swal.fire('Advertencia', 'No hay productos seleccionados para sincronizar', 'warning');
            return;
        }

        onConfirm(productosParaSincronizar);
    };

    if (loading) {
        return <div style={{ padding: '20px', textAlign: 'center' }}>Cargando productos...</div>;
    }

    return (
        <div style={{ padding: '20px', maxWidth: '900px', margin: '0 auto' }}>
            <h2 style={{ marginBottom: '20px' }}>Seleccionar Productos para Sincronizar</h2>
            
            <div style={{ 
                maxHeight: '60vh', 
                overflowY: 'auto', 
                border: '1px solid #ddd', 
                borderRadius: '5px', 
                padding: '15px' 
            }}>
                {productos.length === 0 ? (
                    <p>No hay productos disponibles</p>
                ) : (
                    productos.map(prod => (
                        <div 
                            key={prod.id} 
                            style={{ 
                                border: '1px solid #ddd', 
                                padding: '15px', 
                                marginBottom: '15px', 
                                borderRadius: '5px',
                                backgroundColor: seleccionados[prod.id]?.checked ? '#e7f3ff' : '#fff'
                            }}
                        >
                            <label style={{ display: 'flex', alignItems: 'center', marginBottom: '10px', cursor: 'pointer' }}>
                                <input 
                                    type="checkbox" 
                                    checked={seleccionados[prod.id]?.checked || false}
                                    onChange={() => handleToggleProducto(prod.id)}
                                    style={{ width: '20px', height: '20px', marginRight: '10px' }}
                                />
                                <strong>{prod.nombre}</strong>
                                <span style={{ marginLeft: '10px', color: '#666' }}>
                                    Stock: {prod.stock} | Precio: ${prod.precio}
                                </span>
                            </label>
                            
                            {seleccionados[prod.id]?.checked && (
                                <div style={{ marginLeft: '30px', marginTop: '10px' }}>
                                    <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
                                        Categoría ML:
                                    </label>
                                    <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
                                        <input 
                                            type="text"
                                            placeholder="Buscar categoría..."
                                            value={busquedaCategoria[prod.id] || ''}
                                            style={{ 
                                                flex: 1, 
                                                padding: '8px', 
                                                border: '1px solid #ccc', 
                                                borderRadius: '4px',
                                                minWidth: '200px'
                                            }}
                                            onChange={async (e) => {
                                                const query = e.target.value;
                                                await handleBuscarCategoria(prod.id, query);
                                            }}
                                        />
                                        <select 
                                            value={seleccionados[prod.id]?.categoria || ''}
                                            onChange={(e) => handleCategoriaChange(prod.id, e.target.value)}
                                            style={{ 
                                                flex: 2, 
                                                padding: '8px', 
                                                border: '1px solid #ccc', 
                                                borderRadius: '4px',
                                                minWidth: '250px'
                                            }}
                                        >
                                            <option value="">-- Selecciona o busca una categoría --</option>
                                            {cargandoCategorias ? (
                                                <option disabled>Cargando categorías...</option>
                                            ) : Object.keys(categoriasCache).length === 0 ? (
                                                <option disabled>No hay categorías disponibles</option>
                                            ) : (
                                                (() => {
                                                    const categoriasFiltradas = getCategoriasFiltradas(prod.id);
                                                    const busqueda = busquedaCategoria[prod.id];
                                                    
                                                    // Si hay búsqueda pero no hay resultados, mostrar mensaje
                                                    if (busqueda && categoriasFiltradas.length === 0) {
                                                        return (
                                                            <option disabled>
                                                                No se encontraron categorías con "{busqueda}"
                                                            </option>
                                                        );
                                                    }
                                                    
                                                    // Mostrar categorías filtradas
                                                    return categoriasFiltradas
                                                        .sort((a, b) => a.name.localeCompare(b.name))
                                                        .map(cat => (
                                                            <option key={cat.id} value={cat.id}>
                                                                {cat.name} ({cat.id})
                                                            </option>
                                                        ));
                                                })()
                                            )}
                                        </select>
                                        <div style={{ fontSize: '11px', color: '#666', marginTop: '5px', width: '100%' }}>
                                            {buscandoCategorias[prod.id] ? (
                                                <span>🔍 Buscando categorías...</span>
                                            ) : (() => {
                                                const categoriasFiltradas = getCategoriasFiltradas(prod.id);
                                                const busqueda = busquedaCategoria[prod.id];
                                                
                                                if (cargandoCategorias) {
                                                    return <span>Cargando categorías...</span>;
                                                }
                                                
                                                if (Object.keys(categoriasCache).length === 0) {
                                                    return (
                                                        <span style={{ color: '#d32f2f' }}>
                                                            No hay categorías disponibles. Intenta buscar una categoría.
                                                        </span>
                                                    );
                                                }
                                                
                                                if (busqueda) {
                                                    return (
                                                        <span>
                                                            {categoriasFiltradas.length} categoría{categoriasFiltradas.length !== 1 ? 's' : ''} encontrada{categoriasFiltradas.length !== 1 ? 's' : ''} con "{busqueda}" 
                                                            {categoriasFiltradas.length < Object.keys(categoriasCache).length && 
                                                                ` (de ${Object.keys(categoriasCache).length} totales)`
                                                            }
                                                        </span>
                                                    );
                                                }
                                                
                                                return (
                                                    <span>
                                                        {Object.keys(categoriasCache).length} categorías disponibles
                                                    </span>
                                                );
                                            })()}
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    ))
                )}
            </div>

            <div style={{ marginTop: '20px', display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                <button 
                    onClick={onClose}
                    style={{
                        padding: '10px 20px',
                        backgroundColor: '#6c757d',
                        color: 'white',
                        border: 'none',
                        borderRadius: '5px',
                        cursor: 'pointer'
                    }}
                >
                    Cancelar
                </button>
                <button 
                    onClick={handleConfirmar}
                    style={{
                        padding: '10px 20px',
                        backgroundColor: '#28a745',
                        color: 'white',
                        border: 'none',
                        borderRadius: '5px',
                        cursor: 'pointer'
                    }}
                >
                    Sincronizar Seleccionados
                </button>
            </div>
        </div>
    );
};

export default SeleccionarProductosML;
