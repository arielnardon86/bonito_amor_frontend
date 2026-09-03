// Productos.js
import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import * as XLSX from 'xlsx';
import Swal from 'sweetalert2';
import { useAuth } from '../AuthContext';
import { useNavigate } from 'react-router-dom';
import { formatearMonto } from '../utils/formatearMonto';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPencil, faTrash, faPlus, faArrowUp, faRightLeft, faLayerGroup } from '@fortawesome/free-solid-svg-icons';
import HelpButton from './HelpButton';
import { resizeLogoToBase64 } from '../utils/resizeLogo';

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
    const { user, isAuthenticated, loading: authLoading, selectedStoreSlug, token, tiendasAutorizadas } = useAuth();
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
        codigo_interno: '',
        iva_porcentaje: '',
        rubro: '',
        proveedor: '',
        margen: '',
        imagen: '',
    });
    const [showNuevoProductoModal, setShowNuevoProductoModal] = useState(false);

    // Rubro (categoría opcional, propia de cada tienda)
    const [rubros, setRubros] = useState([]);
    const [filtroRubroId, setFiltroRubroId] = useState('');
    const [showNuevoRubroModal, setShowNuevoRubroModal] = useState(false);
    const [nuevoRubroNombre, setNuevoRubroNombre] = useState('');
    const [nuevoRubroIva, setNuevoRubroIva] = useState('');
    const [guardandoNuevoRubro, setGuardandoNuevoRubro] = useState(false);
    const [rubroModalDestino, setRubroModalDestino] = useState('nuevo_producto'); // 'nuevo_producto' | 'edicion' | 'masivo'

    // Proveedor (opcional, propio de cada tienda)
    const [proveedores, setProveedores] = useState([]);
    const [showNuevoProveedorModal, setShowNuevoProveedorModal] = useState(false);
    const [nuevoProveedorNombre, setNuevoProveedorNombre] = useState('');
    const [guardandoNuevoProveedor, setGuardandoNuevoProveedor] = useState(false);
    const [proveedorModalDestino, setProveedorModalDestino] = useState('nuevo_producto'); // 'nuevo_producto' | 'edicion'

    // Edición en masa por rubro
    const [showEditarMasivoModal, setShowEditarMasivoModal] = useState(false);
    const [rubroMasivoId, setRubroMasivoId] = useState('');
    const [modoMasivo, setModoMasivo] = useState('iva');
    const [valorMasivo, setValorMasivo] = useState('');
    const [guardandoMasivo, setGuardandoMasivo] = useState(false);
    const [descargandoExcel, setDescargandoExcel] = useState(false);
    const [tieneVariantes, setTieneVariantes] = useState(false);
    // Cobro por peso: precio/costo pasan a ser por Kg, no se lleva stock, y en el
    // Punto de Venta se carga el peso en gramos. Excluyente con Variantes.
    const [sePorPeso, setSePorPeso] = useState(false);
    const VARIANTE_VACIA = { talle: '', variante2: '', precio: '', costo: '', stock: '', codigo_barras: '', margen: '', imagen: '' };
    const detalleVariante = v => [v.talle, v.variante2].filter(Boolean).join(' · ');
    const [variantesNuevas, setVariantesNuevas] = useState([{ ...VARIANTE_VACIA }]);

    const [editProduct, setEditProduct] = useState(null);
    const [showEditModal, setShowEditModal] = useState(false);
    // Vinculación manual con Tienda Nube (solo visible si la tienda actual la tiene conectada)
    const [tnConectado, setTnConectado] = useState(false);
    const [tnLinkInput, setTnLinkInput] = useState('');
    const [tnLinking, setTnLinking] = useState(false);
    const [tnVariantesParaElegir, setTnVariantesParaElegir] = useState(null);
    const [tnVarianteElegida, setTnVarianteElegida] = useState('');
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [productToDelete, setProductToDelete] = useState(null);
    const [expandedVariants, setExpandedVariants] = useState({});
    const [showAddVarianteModal, setShowAddVarianteModal] = useState(false);
    const [convirtiendoAFamilia, setConvirtiendoAFamilia] = useState(false);

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

    const [showTransferirStockModal, setShowTransferirStockModal] = useState(false);
    const [productoParaTransferir, setProductoParaTransferir] = useState(null);
    const [tiendaDestinoTransferir, setTiendaDestinoTransferir] = useState('');
    const [cantidadTransferir, setCantidadTransferir] = useState('');
    const [loadingTransferir, setLoadingTransferir] = useState(false);

    const [showTransferirFamiliaModal, setShowTransferirFamiliaModal] = useState(false);
    const [familiaParaTransferir, setFamiliaParaTransferir] = useState(null);
    const [tiendaDestinoFamilia, setTiendaDestinoFamilia] = useState('');
    const [cantidadesFamilia, setCantidadesFamilia] = useState({});
    const [loadingTransferirFamilia, setLoadingTransferirFamilia] = useState(false);

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
                    search: searchTerm,
                    rubro_id: filtroRubroId || undefined,
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
    }, [token, selectedStoreSlug, searchTerm, filtroRubroId]);

    // Ambas listas se usan para chequear duplicados antes de crear uno nuevo (el
    // desplegable "+ Crear nuevo...") y para poblar los <select>: si la API pagina
    // (10 por página por defecto) y solo se lee response.data.results, cualquier
    // rubro/proveedor más allá de la primera página queda invisible pero sigue
    // existiendo -- provocando un error de "ya existe" al intentar recrearlo.
    const fetchTodasLasPaginas = useCallback(async (url, params) => {
        let todos = [];
        let nextUrl = url;
        let queryParams = params;
        while (nextUrl) {
            const response = await axios.get(nextUrl, { headers: { 'Authorization': `Bearer ${token}` }, params: queryParams });
            const pagina = response.data.results || response.data || [];
            todos = todos.concat(Array.isArray(pagina) ? pagina : []);
            nextUrl = response.data.next || null;
            queryParams = undefined; // "next" ya trae los query params incluidos
        }
        return todos;
    }, [token]);

    const fetchRubros = useCallback(async () => {
        if (!token || !selectedStoreSlug) return;
        try {
            setRubros(await fetchTodasLasPaginas(`${BASE_API_ENDPOINT}/api/rubros/`, { tienda_slug: selectedStoreSlug }));
        } catch (err) {
            console.error('Error al cargar rubros:', err);
        }
    }, [token, selectedStoreSlug, fetchTodasLasPaginas]);

    useEffect(() => { fetchRubros(); }, [fetchRubros]);

    const fetchProveedores = useCallback(async () => {
        if (!token || !selectedStoreSlug) return;
        try {
            setProveedores(await fetchTodasLasPaginas(`${BASE_API_ENDPOINT}/api/proveedores/`, { tienda_slug: selectedStoreSlug }));
        } catch (err) {
            console.error('Error al cargar proveedores:', err);
        }
    }, [token, selectedStoreSlug, fetchTodasLasPaginas]);

    useEffect(() => { fetchProveedores(); }, [fetchProveedores]);

    // Consulta si la tienda actual tiene Tienda Nube conectado, para mostrar (o no) la
    // opción de vincular manualmente un producto en el modal de edición.
    useEffect(() => {
        const tiendaId = tiendasAutorizadas.find(t => t.nombre === selectedStoreSlug)?.id;
        if (!tiendaId || !token) { setTnConectado(false); return; }
        axios.get(`${BASE_API_ENDPOINT}/api/tiendas/${tiendaId}/tiendanube/status/`, {
            headers: { Authorization: `Bearer ${token}` },
        })
            .then(({ data }) => setTnConectado(!!data.connected))
            .catch(() => setTnConectado(false));
    }, [selectedStoreSlug, tiendasAutorizadas, token]);

    const crearRubroRapido = async () => {
        const iva = parseFloat(nuevoRubroIva);
        if (!nuevoRubroNombre.trim()) {
            setError('Ingresá un nombre de rubro.');
            return;
        }
        if (isNaN(iva) || iva < 0 || iva > 100) {
            setError('El IVA del rubro debe ser un número entre 0 y 100.');
            return;
        }
        setGuardandoNuevoRubro(true);
        setError(null);
        try {
            const { data: rubroCreado } = await axios.post(`${BASE_API_ENDPOINT}/api/rubros/`, {
                tienda_slug: selectedStoreSlug, nombre: nuevoRubroNombre.trim(), iva_porcentaje: iva,
            }, { headers: { 'Authorization': `Bearer ${token}` } });
            await fetchRubros();
            if (rubroModalDestino === 'edicion') {
                setEditProduct(prev => prev ? { ...prev, rubro: rubroCreado.id } : prev);
            } else if (rubroModalDestino === 'masivo') {
                setRubroMasivoId(rubroCreado.id);
            } else {
                setNewProduct(prev => ({ ...prev, rubro: rubroCreado.id }));
            }
            setShowNuevoRubroModal(false);
            setNuevoRubroNombre('');
            setNuevoRubroIva('');
        } catch (err) {
            setError('Error al crear el rubro: ' + (err.response ? JSON.stringify(err.response.data) : err.message));
        } finally {
            setGuardandoNuevoRubro(false);
        }
    };

    const abrirNuevoRubroModal = (destino) => {
        setRubroModalDestino(destino);
        setNuevoRubroNombre('');
        setNuevoRubroIva('');
        setShowNuevoRubroModal(true);
    };

    const crearProveedorRapido = async () => {
        if (!nuevoProveedorNombre.trim()) {
            setError('Ingresá un nombre de proveedor.');
            return;
        }
        setGuardandoNuevoProveedor(true);
        setError(null);
        try {
            const { data: proveedorCreado } = await axios.post(`${BASE_API_ENDPOINT}/api/proveedores/`, {
                tienda_slug: selectedStoreSlug, nombre_razon_social: nuevoProveedorNombre.trim(),
            }, { headers: { 'Authorization': `Bearer ${token}` } });
            await fetchProveedores();
            if (proveedorModalDestino === 'edicion') {
                setEditProduct(prev => prev ? { ...prev, proveedor: proveedorCreado.id } : prev);
            } else {
                setNewProduct(prev => ({ ...prev, proveedor: proveedorCreado.id }));
            }
            setShowNuevoProveedorModal(false);
            setNuevoProveedorNombre('');
        } catch (err) {
            setError('Error al crear el proveedor: ' + (err.response ? JSON.stringify(err.response.data) : err.message));
        } finally {
            setGuardandoNuevoProveedor(false);
        }
    };

    const abrirNuevoProveedorModal = (destino) => {
        setProveedorModalDestino(destino);
        setNuevoProveedorNombre('');
        setShowNuevoProveedorModal(true);
    };

    const handleEditarMasivo = async () => {
        if (!rubroMasivoId) {
            setError('Seleccioná un rubro para editar en masa.');
            return;
        }
        const valor = parseFloat(valorMasivo);
        if (isNaN(valor)) {
            setError('Ingresá un valor válido.');
            return;
        }
        setGuardandoMasivo(true);
        setError(null);
        try {
            const { data } = await axios.post(`${BASE_API_ENDPOINT}/api/productos/editar_masivo/`, {
                tienda_slug: selectedStoreSlug, rubro_id: rubroMasivoId, modo: modoMasivo, valor,
            }, { headers: { 'Authorization': `Bearer ${token}` } });
            setShowEditarMasivoModal(false);
            setValorMasivo('');
            fetchProductos();
            const nombreRubro = rubros.find(r => r.id === rubroMasivoId)?.nombre || '';
            const mensajeOmitidos = data.omitidos > 0 ? ` (${data.omitidos} sin costo cargado, se omitieron)` : '';
            window.alert(`Se actualizaron ${data.actualizados} producto(s) del rubro "${nombreRubro}"${mensajeOmitidos}.`);
        } catch (err) {
            setError('Error al editar en masa: ' + (err.response ? JSON.stringify(err.response.data) : err.message));
        } finally {
            setGuardandoMasivo(false);
        }
    };

    const handleDescargarExcel = async () => {
        setDescargandoExcel(true);
        setError(null);
        try {
            const response = await axios.get(`${BASE_API_ENDPOINT}/api/productos/exportar/`, {
                headers: { 'Authorization': `Bearer ${token}` },
                params: { tienda_slug: selectedStoreSlug },
            });
            const filas = response.data.productos || [];
            if (filas.length === 0) {
                window.alert('No hay productos para descargar.');
                return;
            }
            // Mismo orden y encabezados que la plantilla de carga masiva, para que el
            // archivo se pueda volver a importar tal cual (en esta tienda o en otra).
            const headers = ['Código Interno', 'Nombre', 'Rubro', 'IVA %', 'Costo', 'Precio de Venta', 'Margen %', 'Cantidad', 'Código de Barras'];
            const filasArray = filas.map(f => [
                f.codigo_interno, f.nombre, f.rubro, f.iva_porcentaje, f.costo,
                f.precio_venta, f.margen_porcentaje, f.cantidad, f.codigo_barras,
            ]);
            const wb = XLSX.utils.book_new();
            const ws = XLSX.utils.aoa_to_sheet([headers, ...filasArray]);
            XLSX.utils.book_append_sheet(wb, ws, 'Productos');
            const fecha = new Date().toISOString().slice(0, 10);
            XLSX.writeFile(wb, `productos_${selectedStoreSlug}_${fecha}.xlsx`);
        } catch (err) {
            setError('Error al descargar productos: ' + (err.response ? JSON.stringify(err.response.data) : err.message));
        } finally {
            setDescargandoExcel(false);
        }
    };

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
                // Validar que todas las variantes con datos tengan talle
                const variantesConDatos = variantesNuevas.filter(v => v.talle || v.precio || v.stock);
                const sinTalle = variantesConDatos.filter(v => !v.talle);
                if (sinTalle.length > 0) {
                    setError('Todas las variantes deben tener un valor de talle/color/tamaño.');
                    setLoadingProducts(false);
                    return;
                }
                if (variantesConDatos.length === 0) {
                    setError('Agregá al menos una variante con talle y precio.');
                    setLoadingProducts(false);
                    return;
                }

                // IVA, Rubro y Proveedor son propiedades del producto que no varían por talle/variante:
                // se cargan una sola vez en el formulario y se aplican al padre y a todas las variantes.
                const ivaParaCrear = newProduct.iva_porcentaje === '' ? null : newProduct.iva_porcentaje;
                const rubroParaCrear = newProduct.rubro || null;
                const proveedorParaCrear = newProduct.proveedor || null;

                // Crear producto padre (contenedor) luego variantes
                const padreData = {
                    nombre: newProduct.nombre,
                    precio: variantesNuevas[0]?.precio || 0,
                    costo: null,
                    stock: 0,
                    codigo_barras: null,
                    talle: null,
                    iva_porcentaje: ivaParaCrear,
                    rubro: rubroParaCrear,
                    proveedor: proveedorParaCrear,
                    tienda_slug: selectedStoreSlug,
                };
                const { data: padre } = await axios.post(`${BASE_API_ENDPOINT}/api/productos/`, padreData, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });

                for (const v of variantesNuevas) {
                    if (!v.talle) continue; // variantes sin talle se saltean siempre
                    const varianteData = {
                        nombre: newProduct.nombre,
                        precio: v.precio,
                        costo: v.costo || null,
                        stock: v.stock || 0,
                        codigo_barras: v.codigo_barras || generarCodigoDeBarrasEAN13(),
                        talle: v.talle || null,
                        variante2: v.variante2 || null,
                        iva_porcentaje: ivaParaCrear,
                        rubro: rubroParaCrear,
                        proveedor: proveedorParaCrear,
                        producto_padre: padre.id,
                        tienda_slug: selectedStoreSlug,
                        imagen: v.imagen || null,
                    };
                    await axios.post(`${BASE_API_ENDPOINT}/api/productos/`, varianteData, {
                        headers: { 'Authorization': `Bearer ${token}` }
                    });
                }
            } else {
                // eslint-disable-next-line no-unused-vars
                const { margen: _margenSoloParaCalculoLocal, ...restoNewProduct } = newProduct;
                const productToCreate = {
                    ...restoNewProduct,
                    iva_porcentaje: newProduct.iva_porcentaje === '' ? null : newProduct.iva_porcentaje,
                    rubro: newProduct.rubro || null,
                    codigo_barras: newProduct.codigo_barras || generarCodigoDeBarrasEAN13(),
                    codigo_interno: newProduct.codigo_interno.trim() || null,
                    imagen: newProduct.imagen || null,
                    tienda_slug: selectedStoreSlug,
                    talle: null,
                    se_vende_por_peso: sePorPeso,
                    stock: sePorPeso ? 0 : newProduct.stock,
                };
                await axios.post(`${BASE_API_ENDPOINT}/api/productos/`, productToCreate, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
            }

            setNewProduct({ nombre: '', precio: '', costo: '', stock: '', codigo_barras: '', codigo_interno: '', iva_porcentaje: '', rubro: '', proveedor: '', margen: '', imagen: '' });
            setShowNuevoProductoModal(false);
            setTieneVariantes(false);
            setSePorPeso(false);
            setVariantesNuevas([{ ...VARIANTE_VACIA }]);
            setBarcodeNombreSugerido('');
            fetchProductos();
        } catch (err) {
            setError('Error al crear producto: ' + (err.response ? JSON.stringify(err.response.data) : err.message));
            setLoadingProducts(false);
        }
    };

    // Margen de ganancia (nuevo producto, sin variantes): al completarlo, calcula el
    // precio a partir del costo (markup sobre costo). Si se deja vacío, el precio vuelve
    // a ser editable a mano y se muestra el margen actual (precio vs. costo) informativo.
    const calcularPrecioDesdeMargen = (costo, margen) => {
        const costoNum = parseFloat(costo);
        const margenNum = parseFloat(margen);
        if (isNaN(costoNum) || isNaN(margenNum) || costoNum <= 0) return null;
        return (costoNum * (1 + margenNum / 100)).toFixed(2);
    };

    const handleMargenChangeNuevo = (value) => {
        setNewProduct(prev => {
            const next = { ...prev, margen: value };
            if (value !== '') {
                const precioCalculado = calcularPrecioDesdeMargen(prev.costo, value);
                if (precioCalculado !== null) next.precio = precioCalculado;
            }
            return next;
        });
    };

    const handleCostoChangeNuevo = (value) => {
        setNewProduct(prev => {
            const next = { ...prev, costo: value };
            if (prev.margen !== '') {
                const precioCalculado = calcularPrecioDesdeMargen(value, prev.margen);
                if (precioCalculado !== null) next.precio = precioCalculado;
            }
            return next;
        });
    };

    const handlePrecioChangeNuevo = (value) => {
        // Editar el precio a mano desactiva el cálculo automático por margen.
        setNewProduct(prev => ({ ...prev, precio: value, margen: '' }));
    };

    // Si costo y precio ya están cargados, el margen pasa a ser un dato calculado
    // (se grisea y muestra el % real) en vez de un input que dispara el cálculo del precio.
    const margenCalculadoNuevo = (() => {
        const costoNum = parseFloat(newProduct.costo);
        const precioNum = parseFloat(newProduct.precio);
        if (!costoNum || !precioNum || precioNum <= 0) return null;
        return ((precioNum - costoNum) / precioNum * 100).toFixed(1);
    })();
    const margenBloqueadoNuevo = margenCalculadoNuevo !== null;

    const handleImagenNuevoProducto = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        try {
            const base64 = await resizeLogoToBase64(file, 300);
            setNewProduct(prev => ({ ...prev, imagen: base64 }));
        } catch (err) {
            setError('No se pudo procesar la imagen. Probá con otro archivo.');
        }
        e.target.value = '';
    };

    // Mismas reglas de margen/costo/precio, pero por fila de variante.
    const handleVarianteMargenChange = (i, value) => {
        setVariantesNuevas(prev => prev.map((x, j) => {
            if (j !== i) return x;
            const next = { ...x, margen: value };
            if (value !== '') {
                const precioCalculado = calcularPrecioDesdeMargen(x.costo, value);
                if (precioCalculado !== null) next.precio = precioCalculado;
            }
            return next;
        }));
    };

    const handleVarianteCostoChange = (i, value) => {
        setVariantesNuevas(prev => prev.map((x, j) => {
            if (j !== i) return x;
            const next = { ...x, costo: value };
            if (x.margen !== '') {
                const precioCalculado = calcularPrecioDesdeMargen(value, x.margen);
                if (precioCalculado !== null) next.precio = precioCalculado;
            }
            return next;
        }));
    };

    const handleVariantePrecioChange = (i, value) => {
        setVariantesNuevas(prev => prev.map((x, j) => j === i ? { ...x, precio: value, margen: '' } : x));
    };

    // Misma regla que a nivel producto: si la variante ya tiene costo y precio cargados,
    // el margen de esa fila pasa a ser de solo lectura (calculado), no un input.
    const margenCalculadoVariante = (v) => {
        const costoNum = parseFloat(v.costo);
        const precioNum = parseFloat(v.precio);
        if (!costoNum || !precioNum || precioNum <= 0) return null;
        return ((precioNum - costoNum) / precioNum * 100).toFixed(1);
    };

    const handleVarianteImagenChange = async (i, file) => {
        if (!file) return;
        try {
            const base64 = await resizeLogoToBase64(file, 300);
            setVariantesNuevas(prev => prev.map((x, j) => j === i ? { ...x, imagen: base64 } : x));
        } catch (err) {
            setError('No se pudo procesar la imagen de la variante. Probá con otro archivo.');
        }
    };

    const handleAgregarVariantesLote = async () => {
        if (!editProduct) return;
        if (editProduct.producto_padre_id) {
            // Una variante ya es hija de una familia -- no puede convertirse en
            // padre de otra familia anidada (el modelo no soporta ese nivel).
            setError('Esta variante ya pertenece a una familia; agregá la nueva variante desde el producto padre.');
            return;
        }
        const variantesConDatos = variantesNuevas.filter(v => v.talle || v.precio || v.stock);
        const sinTalle = variantesConDatos.filter(v => !v.talle);
        if (sinTalle.length > 0) {
            setError('Todas las variantes deben tener un valor de talle/color/tamaño.');
            return;
        }
        if (variantesConDatos.length === 0) {
            setError('Agregá al menos una variante con talle y precio.');
            return;
        }
        setLoadingProducts(true);
        setError(null);
        try {
            let padreId = editProduct.id;

            if (convirtiendoAFamilia) {
                if (editProduct.ml_item_id) {
                    // El producto suelto ya está vinculado a Mercado Libre (stock que
                    // sincroniza solo): no puede pasar a ser el padre/contenedor vacío,
                    // porque el vínculo (ml_item_id, stock Full/ML) quedaría colgado en
                    // una fila que ya no representa nada vendible. Se crea un padre nuevo
                    // y el producto original pasa a ser la primera variante, conservando
                    // intacto su ml_item_id y su stock (se sigue sincronizando solo).
                    const { data: nuevoPadre } = await axios.post(`${BASE_API_ENDPOINT}/api/productos/`, {
                        nombre: editProduct.nombre,
                        precio: editProduct.precio,
                        costo: editProduct.costo || null,
                        stock: 0,
                        iva_porcentaje: editProduct.iva_porcentaje ?? null,
                        rubro: editProduct.rubro || null,
                        tienda_slug: selectedStoreSlug,
                    }, { headers: { 'Authorization': `Bearer ${token}` } });
                    padreId = nuevoPadre.id;

                    await axios.patch(`${BASE_API_ENDPOINT}/api/productos/${editProduct.id}/`, {
                        producto_padre: padreId,
                        talle: editProduct.ml_stock_full ? 'Full' : (editProduct.talle || null),
                    }, { headers: { 'Authorization': `Bearer ${token}` } });
                } else {
                    // Caso normal (sin vínculo con ML): el producto suelto pasa a ser el
                    // padre/contenedor de la familia. Su stock y talle propios quedan
                    // obsoletos (ahora viven en cada variante) -- sin este reset
                    // quedarían "flotando" en el padre, contando doble junto con el
                    // stock de la variante recién creada.
                    await axios.patch(`${BASE_API_ENDPOINT}/api/productos/${editProduct.id}/`, { stock: 0, talle: null, variante2: null }, {
                        headers: { 'Authorization': `Bearer ${token}` }
                    });
                }
            }

            for (const v of variantesNuevas) {
                if (!v.talle) continue; // variantes sin talle se saltean siempre
                const varianteData = {
                    nombre: editProduct.nombre,
                    precio: v.precio,
                    costo: v.costo || null,
                    stock: v.stock || 0,
                    codigo_barras: v.codigo_barras || generarCodigoDeBarrasEAN13(),
                    talle: v.talle || null,
                    variante2: v.variante2 || null,
                    iva_porcentaje: editProduct.iva_porcentaje ?? null,
                    rubro: editProduct.rubro || null,
                    producto_padre: padreId,
                    tienda_slug: selectedStoreSlug,
                    imagen: v.imagen || null,
                };
                await axios.post(`${BASE_API_ENDPOINT}/api/productos/`, varianteData, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
            }

            setShowAddVarianteModal(false);
            setConvirtiendoAFamilia(false);
            setVariantesNuevas([{ ...VARIANTE_VACIA }]);
            fetchProductos(currentPageUrl);
        } catch (err) {
            setError('Error al agregar variantes: ' + (err.response ? JSON.stringify(err.response.data) : err.message));
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

    const handleEditImagenChange = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        try {
            const base64 = await resizeLogoToBase64(file, 300);
            setEditProduct(prev => ({ ...prev, imagen: base64 }));
        } catch (err) {
            setError('No se pudo procesar la imagen. Probá con otro archivo.');
        }
        e.target.value = '';
    };

    const handleVincularTN = async (tnVariantIdElegida) => {
        if (!editProduct) return;
        setTnLinking(true);
        try {
            const body = { tn_product_id: tnLinkInput.trim() };
            if (tnVariantIdElegida) body.tn_variant_id = tnVariantIdElegida;
            const { data } = await axios.post(
                `${BASE_API_ENDPOINT}/api/productos/${editProduct.id}/vincular-tienda-nube/`,
                body,
                { headers: { Authorization: `Bearer ${token}` } }
            );
            if (data.familia_creada) {
                setShowEditModal(false);
                setEditProduct(null);
                await Swal.fire('Familia de variantes creada', data.mensaje, 'success');
            } else {
                setEditProduct(prev => ({ ...prev, tn_product_id: data.tn_product_id, tn_variant_id: data.tn_variant_id }));
                setTnVariantesParaElegir(null);
                setTnVarianteElegida('');
                setTnLinkInput('');
                await Swal.fire('Vinculado', data.mensaje, 'success');
            }
            fetchProductos(currentPageUrl);
        } catch (err) {
            if (err.response?.status === 409 && err.response.data?.requiere_variante) {
                setTnVariantesParaElegir(err.response.data.variantes);
            } else {
                setError('Error al vincular con Tienda Nube: ' + (err.response ? JSON.stringify(err.response.data) : err.message));
            }
        } finally {
            setTnLinking(false);
        }
    };

    const handleDesvincularTN = async () => {
        if (!editProduct) return;
        setTnLinking(true);
        try {
            await axios.post(
                `${BASE_API_ENDPOINT}/api/productos/${editProduct.id}/desvincular-tienda-nube/`,
                {},
                { headers: { Authorization: `Bearer ${token}` } }
            );
            setEditProduct(prev => ({ ...prev, tn_product_id: null, tn_variant_id: null }));
            fetchProductos(currentPageUrl);
        } catch (err) {
            setError('Error al desvincular de Tienda Nube: ' + (err.response ? JSON.stringify(err.response.data) : err.message));
        } finally {
            setTnLinking(false);
        }
    };

    const handlePublicarSeleccionadosTN = async () => {
        const idsSeleccionados = Object.keys(etiquetasSeleccionadas);
        if (idsSeleccionados.length === 0) return;
        const tiendaId = tiendasAutorizadas.find(t => t.nombre === selectedStoreSlug)?.id;
        if (!tiendaId) return;

        const confirm = await Swal.fire({
            title: 'Publicar en Tienda Nube',
            text: 'Si alguno de los productos seleccionados tiene variantes (talle, color, etc.), se va a publicar la familia completa con todas sus variantes, aunque hayas tildado solo una.',
            icon: 'info',
            showCancelButton: true,
            confirmButtonText: 'Entendido, publicar',
            cancelButtonText: 'Cancelar',
            confirmButtonColor: '#5dc87a',
        });
        if (!confirm.isConfirmed) return;

        setLoadingProducts(true);
        try {
            const { data } = await axios.post(
                `${BASE_API_ENDPOINT}/api/tiendas/${tiendaId}/tiendanube/export-products/`,
                { producto_ids: idsSeleccionados },
                { headers: { Authorization: `Bearer ${token}` } }
            );
            await Swal.fire('Tienda Nube', data.mensaje, 'success');
            setEtiquetasSeleccionadas({});
        } catch (err) {
            setError('Error al publicar en Tienda Nube: ' + (err.response ? JSON.stringify(err.response.data) : err.message));
        } finally {
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

    const handleTransferirStock = async () => {
        const cantidad = parseInt(cantidadTransferir, 10);
        if (!cantidad || cantidad <= 0 || cantidad > (productoParaTransferir.stock || 0) || !tiendaDestinoTransferir) return;
        setLoadingTransferir(true);
        try {
            await axios.post(
                `${BASE_API_ENDPOINT}/api/productos/${productoParaTransferir.id}/transferir-stock/`,
                { tienda_destino: tiendaDestinoTransferir, cantidad },
                { headers: { Authorization: `Bearer ${token}` } }
            );
            setShowTransferirStockModal(false);
            setProductoParaTransferir(null);
            setTiendaDestinoTransferir('');
            setCantidadTransferir('');
            fetchProductos(currentPageUrl);
        } catch (err) {
            setError('Error al transferir stock: ' + (err.response ? JSON.stringify(err.response.data) : err.message));
        } finally {
            setLoadingTransferir(false);
        }
    };

    const handleTransferirFamilia = async () => {
        const variantes = Object.entries(cantidadesFamilia)
            .map(([id, c]) => ({ id, cantidad: parseInt(c, 10) }))
            .filter(v => v.cantidad > 0);
        if (variantes.length === 0 || !tiendaDestinoFamilia) return;
        setLoadingTransferirFamilia(true);
        try {
            await axios.post(
                `${BASE_API_ENDPOINT}/api/productos/${familiaParaTransferir.id}/transferir-stock-lote/`,
                { tienda_destino: tiendaDestinoFamilia, variantes },
                { headers: { Authorization: `Bearer ${token}` } }
            );
            setShowTransferirFamiliaModal(false);
            setFamiliaParaTransferir(null);
            setTiendaDestinoFamilia('');
            setCantidadesFamilia({});
            fetchProductos(currentPageUrl);
        } catch (err) {
            setError('Error al transferir stock: ' + (err.response ? JSON.stringify(err.response.data) : err.message));
        } finally {
            setLoadingTransferirFamilia(false);
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

    // Selecciona (o deselecciona) todos los productos ya cargados en pantalla —
    // respeta el filtro de rubro/búsqueda y el de stock bajo, pero solo la página
    // actual (10 productos), igual que el resto del listado. Para la página
    // siguiente: avanzar con "Siguiente" y volver a tildar "Todos" ahí.
    const handleToggleSeleccionarTodosEtiquetas = (isChecked) => {
        if (!isChecked) {
            setEtiquetasSeleccionadas({});
            return;
        }
        const visibles = stockBajoFilter
            ? productos.filter(p => p.variantes && p.variantes.length > 0
                ? p.variantes.some(v => (v.stock || 0) <= STOCK_BAJO_THRESHOLD)
                : !p.se_vende_por_peso && (p.stock || 0) <= STOCK_BAJO_THRESHOLD)
            : productos;
        const seleccionadas = {};
        visibles.forEach(p => { seleccionadas[p.id] = true; });
        setEtiquetasSeleccionadas(seleccionadas);
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
        const productosParaImprimir = [];
        Object.entries(cantidadesModal).forEach(([id, cantidadRaw]) => {
            const cantidad = parseInt(cantidadRaw, 10);
            if (!(cantidad > 0)) return;

            const producto = productos.find(p => String(p.id) === String(id));
            if (producto) {
                if (producto.variantes && producto.variantes.length > 0) {
                    // Es un padre con familia de variantes: una etiqueta por cada
                    // variante, con la cantidad tipeada aplicada a todas por igual.
                    producto.variantes.forEach(v => {
                        productosParaImprimir.push({
                            ...v,
                            nombre: producto.nombre,
                            variante_detalle: detalleVariante(v),
                            labelQuantity: cantidad,
                        });
                    });
                } else {
                    productosParaImprimir.push({ ...producto, labelQuantity: cantidad });
                }
                return;
            }
            // Compatibilidad: por si algún id seleccionado fuera una variante suelta
            for (const padre of productos) {
                const variante = (padre.variantes || []).find(v => String(v.id) === String(id));
                if (variante) {
                    productosParaImprimir.push({
                        ...variante,
                        nombre: padre.nombre,
                        variante_detalle: detalleVariante(variante),
                        labelQuantity: cantidad,
                    });
                    break;
                }
            }
        });
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
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', justifyContent: 'space-between' }}>
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
                            'Importá productos en lote desde Excel/CSV con "Importar productos"',
                            'Subí la foto o el PDF de una factura de compra con "Importación IA" para crear productos o reponer stock automáticamente',
                            'Descargá todo tu catálogo con "Descargar Excel" (mismo formato que la plantilla de importación, sirve para llevarlo a otra tienda)',
                        ]}
                    />
                </div>
                <div style={{ display: 'flex', gap: 10 }}>
                    <button
                        type="button"
                        onClick={handleDescargarExcel}
                        disabled={descargandoExcel}
                        style={{ padding: '8px 16px', backgroundColor: '#5dc87a', color: 'white', border: 'none', borderRadius: '10px', cursor: descargandoExcel ? 'not-allowed' : 'pointer', fontWeight: 600 }}
                    >
                        {descargandoExcel ? 'Descargando...' : 'Descargar Excel'}
                    </button>
                    <button
                        type="button"
                        onClick={() => navigate('/productos/carga-masiva')}
                        style={{ padding: '8px 16px', backgroundColor: '#3b9ede', color: 'white', border: 'none', borderRadius: '10px', cursor: 'pointer', fontWeight: 600 }}
                    >
                        Importar productos
                    </button>
                    <button
                        type="button"
                        onClick={() => navigate('/productos/importacion-ia')}
                        style={{ padding: '8px 16px', backgroundColor: '#8b5cf6', color: 'white', border: 'none', borderRadius: '10px', cursor: 'pointer', fontWeight: 600 }}
                    >
                        Importación IA
                    </button>
                </div>
            </div>
            
            <div style={styles.section}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <h2 style={{ ...styles.sectionTitle, margin: 0 }}>Nuevo producto</h2>
                    <button
                        type="button"
                        onClick={() => setShowNuevoProductoModal(true)}
                        title="Agregar producto"
                        style={{
                            width: 34, height: 34, borderRadius: '50%', border: 'none',
                            background: '#5dc87a', color: '#fff', fontSize: 20, fontWeight: 700,
                            cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                            boxShadow: '0 2px 8px rgba(93,200,122,0.35)', lineHeight: 1, padding: 0, flexShrink: 0,
                        }}
                    >
                        +
                    </button>
                </div>
            </div>

            {showNuevoProductoModal && (
                <div style={styles.modalOverlay} onClick={() => setShowNuevoProductoModal(false)}>
                    <div style={{ ...styles.modalContent, width: '95%', maxWidth: 1040, textAlign: 'left', maxHeight: '90vh', overflowY: 'auto' }} onClick={e => e.stopPropagation()}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                            <h3 style={{ margin: 0 }}>Nuevo producto</h3>
                            <button
                                type="button"
                                onClick={() => setShowNuevoProductoModal(false)}
                                style={{ background: 'none', border: 'none', fontSize: 22, cursor: 'pointer', color: '#94a3b8', lineHeight: 1, padding: 4 }}
                                aria-label="Cerrar"
                            >
                                ✕
                            </button>
                        </div>
                        <form onSubmit={handleCreateProduct}>
                            <div style={styles.inputGroupModal}>
                                <label style={styles.label}>Nombre</label>
                                <div style={{ display: 'flex', gap: 8 }}>
                                    <input
                                        type="text"
                                        maxLength={35}
                                        value={newProduct.nombre}
                                        onChange={(e) => { setBarcodeNombreSugerido(''); setNewProduct({ ...newProduct, nombre: e.target.value }); }}
                                        style={{ ...styles.modalInput, flex: 1 }}
                                        required
                                    />
                                    <button
                                        type="button"
                                        onClick={() => {
                                            const nuevoValor = !tieneVariantes;
                                            setTieneVariantes(nuevoValor);
                                            if (nuevoValor) setSePorPeso(false);
                                            if (!nuevoValor) setVariantesNuevas([{ ...VARIANTE_VACIA }]);
                                        }}
                                        style={{
                                            padding: '0 16px', borderRadius: 8, whiteSpace: 'nowrap',
                                            border: '1.5px solid ' + (tieneVariantes ? '#5dc87a' : '#e2e8f0'),
                                            background: tieneVariantes ? '#e8f5ec' : '#fff',
                                            color: tieneVariantes ? '#1a7a3f' : '#475569',
                                            fontWeight: 600, fontSize: 13, cursor: 'pointer',
                                        }}
                                    >
                                        {tieneVariantes ? '✓ Variantes' : 'Variantes'}
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            const nuevoValor = !sePorPeso;
                                            setSePorPeso(nuevoValor);
                                            if (nuevoValor) setTieneVariantes(false);
                                        }}
                                        style={{
                                            padding: '0 16px', borderRadius: 8, whiteSpace: 'nowrap',
                                            border: '1.5px solid ' + (sePorPeso ? '#5dc87a' : '#e2e8f0'),
                                            background: sePorPeso ? '#e8f5ec' : '#fff',
                                            color: sePorPeso ? '#1a7a3f' : '#475569',
                                            fontWeight: 600, fontSize: 13, cursor: 'pointer',
                                        }}
                                    >
                                        {sePorPeso ? '✓ Por peso' : 'Por peso'}
                                    </button>
                                </div>
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 20px' }}>
                            {!tieneVariantes && (
                                <div style={styles.inputGroupModal}>
                                    <label style={styles.label}>
                                        Código de barras <span style={styles.opcionalTag}>(Opcional)</span> {barcodeLoading && <span style={{ fontWeight: 400, fontSize: '0.85em', color: '#888' }}>buscando...</span>}
                                    </label>
                                    <input
                                        type="text"
                                        value={newProduct.codigo_barras}
                                        onChange={handleBarcodeChange}
                                        style={styles.modalInput}
                                        placeholder="Escaneá o ingresá el código de barras"
                                    />
                                    <p style={{ fontSize: 12, color: '#94a3b8', margin: '4px 0 0' }}>
                                        Si lo dejás vacío, se genera uno automáticamente.
                                    </p>
                                    {barcodeNombreSugerido && (
                                        <span style={{ fontSize: '0.82em', color: '#5dc87a' }}>
                                            Nombre auto-completado desde otra sucursal
                                        </span>
                                    )}
                                </div>
                            )}

                            {!tieneVariantes && (
                                <div style={styles.inputGroupModal}>
                                    <label style={styles.label}>Código interno <span style={styles.opcionalTag}>(Opcional)</span></label>
                                    <input
                                        type="text"
                                        maxLength={100}
                                        value={newProduct.codigo_interno}
                                        onChange={(e) => setNewProduct({ ...newProduct, codigo_interno: e.target.value })}
                                        style={styles.modalInput}
                                        placeholder="Ej: A123"
                                    />
                                </div>
                            )}

                            <div style={styles.inputGroupModal}>
                                <label style={{ ...styles.label, color: tieneVariantes ? '#aaa' : undefined }}>{sePorPeso ? 'Precio por Kg' : 'Precio'}</label>
                                <input
                                    type="number"
                                    value={newProduct.precio}
                                    onChange={(e) => handlePrecioChangeNuevo(e.target.value)}
                                    style={{ ...styles.modalInput, background: tieneVariantes ? '#f3f4f6' : undefined, color: tieneVariantes ? '#aaa' : undefined, cursor: tieneVariantes ? 'not-allowed' : undefined }}
                                    required={!tieneVariantes}
                                    disabled={tieneVariantes}
                                />
                                {sePorPeso && <p style={{ fontSize: 12, color: '#94a3b8', margin: '4px 0 0' }}>En el Punto de Venta se va a cargar el peso en gramos y se calcula solo.</p>}
                            </div>

                            <div style={styles.inputGroupModal}>
                                <label style={{ ...styles.label, color: tieneVariantes ? '#aaa' : undefined }}>{sePorPeso ? 'Costo por Kg' : 'Costo'} <span style={styles.opcionalTag}>(Opcional)</span></label>
                                <input
                                    type="number"
                                    value={newProduct.costo}
                                    onChange={(e) => handleCostoChangeNuevo(e.target.value)}
                                    style={{ ...styles.modalInput, background: tieneVariantes ? '#f3f4f6' : undefined, color: tieneVariantes ? '#aaa' : undefined, cursor: tieneVariantes ? 'not-allowed' : undefined }}
                                    disabled={tieneVariantes}
                                />
                            </div>

                            <div style={styles.inputGroupModal}>
                                <label style={styles.label}>IVA % <span style={styles.opcionalTag}>(Opcional)</span></label>
                                <input
                                    type="number"
                                    min="0"
                                    step="0.01"
                                    value={newProduct.iva_porcentaje}
                                    onChange={(e) => setNewProduct({ ...newProduct, iva_porcentaje: e.target.value })}
                                    style={styles.modalInput}
                                    placeholder="Ej: 21"
                                />
                            </div>

                            <div style={styles.inputGroupModal}>
                                <label style={styles.label}>Rubro <span style={styles.opcionalTag}>(Opcional)</span></label>
                                <select
                                    value={newProduct.rubro}
                                    onChange={(e) => {
                                        if (e.target.value === '__nuevo__') { abrirNuevoRubroModal('nuevo_producto'); return; }
                                        setNewProduct({ ...newProduct, rubro: e.target.value });
                                    }}
                                    style={styles.modalInput}
                                >
                                    <option value="">Sin rubro</option>
                                    {rubros.map(r => (
                                        <option key={r.id} value={r.id}>{r.nombre}</option>
                                    ))}
                                    <option value="__nuevo__">+ Crear nuevo rubro...</option>
                                </select>
                            </div>

                            <div style={styles.inputGroupModal}>
                                <label style={styles.label}>Proveedor <span style={styles.opcionalTag}>(Opcional)</span></label>
                                <select
                                    value={newProduct.proveedor}
                                    onChange={(e) => {
                                        if (e.target.value === '__nuevo__') { abrirNuevoProveedorModal('nuevo_producto'); return; }
                                        setNewProduct({ ...newProduct, proveedor: e.target.value });
                                    }}
                                    style={styles.modalInput}
                                >
                                    <option value="">Sin proveedor</option>
                                    {proveedores.map(p => (
                                        <option key={p.id} value={p.id}>{p.nombre_razon_social}</option>
                                    ))}
                                    <option value="__nuevo__">+ Crear nuevo proveedor...</option>
                                </select>
                            </div>

                            <div style={styles.inputGroupModal}>
                                <label style={{ ...styles.label, color: (tieneVariantes || sePorPeso) ? '#aaa' : undefined }}>Stock</label>
                                <input
                                    type="number"
                                    value={sePorPeso ? '' : newProduct.stock}
                                    onChange={(e) => setNewProduct({ ...newProduct, stock: e.target.value })}
                                    style={{ ...styles.modalInput, background: (tieneVariantes || sePorPeso) ? '#f3f4f6' : undefined, color: (tieneVariantes || sePorPeso) ? '#aaa' : undefined, cursor: (tieneVariantes || sePorPeso) ? 'not-allowed' : undefined }}
                                    placeholder={sePorPeso ? 'No aplica (se vende por peso)' : undefined}
                                    required={!tieneVariantes && !sePorPeso}
                                    disabled={tieneVariantes || sePorPeso}
                                />
                            </div>

                            {!tieneVariantes && (
                                <div style={styles.inputGroupModal}>
                                    <label style={styles.label}>
                                        Margen de ganancia <span style={styles.opcionalTag}>(Opcional, % sobre costo)</span>
                                    </label>
                                    <input
                                        type="number"
                                        step="0.01"
                                        value={margenBloqueadoNuevo ? margenCalculadoNuevo : newProduct.margen}
                                        onChange={(e) => handleMargenChangeNuevo(e.target.value)}
                                        style={{
                                            ...styles.modalInput,
                                            background: margenBloqueadoNuevo ? '#f3f4f6' : undefined,
                                            color: margenBloqueadoNuevo ? '#aaa' : undefined,
                                            cursor: margenBloqueadoNuevo ? 'not-allowed' : undefined,
                                        }}
                                        placeholder="Ej: 40"
                                        disabled={margenBloqueadoNuevo}
                                    />
                                    {margenBloqueadoNuevo ? (
                                        <p style={{ fontSize: 12, color: '#64748b', margin: '4px 0 0' }}>
                                            Calculado a partir de costo y precio.
                                        </p>
                                    ) : newProduct.margen !== '' ? (
                                        <p style={{ fontSize: 12, color: '#1a7a3f', margin: '4px 0 0' }}>
                                            El precio se calcula automáticamente a partir del costo.
                                        </p>
                                    ) : (
                                        <p style={{ fontSize: 12, color: '#94a3b8', margin: '4px 0 0' }}>
                                            Completalo para calcular el precio a partir del costo.
                                        </p>
                                    )}
                                </div>
                            )}
                            </div>

                            {!tieneVariantes && (
                                <div style={styles.inputGroupModal}>
                                    <label style={styles.label}>Imagen <span style={styles.opcionalTag}>(Opcional)</span></label>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                        {newProduct.imagen && (
                                            <img
                                                src={newProduct.imagen}
                                                alt=""
                                                style={{ width: 56, height: 56, borderRadius: 8, objectFit: 'cover', border: '1px solid #e2e8f0', flexShrink: 0 }}
                                            />
                                        )}
                                        <label style={{
                                            padding: '8px 14px', background: '#f1f5f9', border: '1px solid #e2e8f0',
                                            borderRadius: 6, cursor: 'pointer', fontSize: 13, fontWeight: 600, color: '#475569',
                                        }}>
                                            {newProduct.imagen ? 'Cambiar foto' : 'Subir foto'}
                                            <input type="file" accept="image/*" capture="environment" onChange={handleImagenNuevoProducto} style={{ display: 'none' }} />
                                        </label>
                                        {newProduct.imagen && (
                                            <button
                                                type="button"
                                                onClick={() => setNewProduct(prev => ({ ...prev, imagen: '' }))}
                                                style={{ background: 'none', border: 'none', color: '#e25252', fontSize: 12, cursor: 'pointer' }}
                                            >
                                                Quitar
                                            </button>
                                        )}
                                    </div>
                                    <p style={{ fontSize: 12, color: '#94a3b8', margin: '6px 0 0' }}>
                                        Se muestra en el listado de productos y en el carrito de Punto de Venta.
                                    </p>
                                </div>
                            )}

                            {tieneVariantes && (
                                <div style={{ width: '100%', marginTop: 8 }}>
                                    <p style={{ fontSize: 13, color: '#475569', marginBottom: 8 }}>
                                        Ingresá cada variante. El código de barras se genera automáticamente si lo dejás vacío.
                                        El margen calcula el precio de esa variante a partir de su costo.
                                    </p>
                                    <div style={{ overflowX: 'auto' }}>
                                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                                            <thead>
                                                <tr>
                                                    {['Foto', 'Talle / Valor', 'Variante 2 (opcional)', 'Precio', 'Costo', 'Margen %', 'Stock', 'Código de barras', ''].map(h => (
                                                        <th key={h} style={{ padding: '6px 8px', borderBottom: '1px solid #e2e8f0', textAlign: 'left', fontWeight: 600 }}>{h}</th>
                                                    ))}
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {variantesNuevas.map((v, i) => (
                                                    <tr key={i}>
                                                        <td style={{ padding: '4px 8px' }}>
                                                            <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 32, height: 32, borderRadius: 6, background: '#f1f5f9', border: '1px solid #e2e8f0', cursor: 'pointer', overflow: 'hidden' }}>
                                                                {v.imagen
                                                                    ? <img src={v.imagen} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                                                    : <span style={{ fontSize: 14, color: '#94a3b8' }}>📷</span>
                                                                }
                                                                <input type="file" accept="image/*" capture="environment" style={{ display: 'none' }}
                                                                    onChange={e => handleVarianteImagenChange(i, e.target.files?.[0])} />
                                                            </label>
                                                        </td>
                                                        <td style={{ padding: '4px 8px' }}>
                                                            <input type="text" value={v.talle} placeholder="M, L, 42…" style={{ ...styles.input, width: 80 }}
                                                                onChange={e => setVariantesNuevas(prev => prev.map((x, j) => j === i ? { ...x, talle: e.target.value } : x))} />
                                                        </td>
                                                        <td style={{ padding: '4px 8px' }}>
                                                            <input type="text" value={v.variante2} placeholder="Color, material…" style={{ ...styles.input, width: 100 }}
                                                                onChange={e => setVariantesNuevas(prev => prev.map((x, j) => j === i ? { ...x, variante2: e.target.value } : x))} />
                                                        </td>
                                                        <td style={{ padding: '4px 8px' }}>
                                                            <input type="number" value={v.precio} placeholder="0" style={{ ...styles.input, width: 90 }}
                                                                onChange={e => handleVariantePrecioChange(i, e.target.value)} required />
                                                        </td>
                                                        <td style={{ padding: '4px 8px' }}>
                                                            <input type="number" value={v.costo} placeholder="Opcional" style={{ ...styles.input, width: 90 }}
                                                                onChange={e => handleVarianteCostoChange(i, e.target.value)} />
                                                        </td>
                                                        <td style={{ padding: '4px 8px' }}>
                                                            {(() => {
                                                                const vMargenCalc = margenCalculadoVariante(v);
                                                                const vMargenBloqueado = vMargenCalc !== null;
                                                                return (
                                                                    <input
                                                                        type="number" step="0.01"
                                                                        value={vMargenBloqueado ? vMargenCalc : v.margen}
                                                                        placeholder="Ej: 40"
                                                                        style={{
                                                                            ...styles.input, width: 80,
                                                                            background: vMargenBloqueado ? '#f3f4f6' : undefined,
                                                                            color: vMargenBloqueado ? '#aaa' : undefined,
                                                                            cursor: vMargenBloqueado ? 'not-allowed' : undefined,
                                                                        }}
                                                                        disabled={vMargenBloqueado}
                                                                        title={vMargenBloqueado ? 'Calculado a partir de costo y precio' : 'Calcula el precio de esta variante a partir de su costo'}
                                                                        onChange={e => handleVarianteMargenChange(i, e.target.value)}
                                                                    />
                                                                );
                                                            })()}
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
                                    <button type="button" onClick={() => setVariantesNuevas(prev => [...prev, { ...VARIANTE_VACIA }])}
                                        style={{ marginTop: 8, padding: '5px 12px', background: '#e8f5ec', color: '#1a7a3f', border: '1px solid #b7dfc7', borderRadius: 4, cursor: 'pointer', fontSize: 13 }}>
                                        + Agregar variante
                                    </button>
                                </div>
                            )}

                            {error && (
                                <p style={{ color: '#e25252', fontSize: 13, marginTop: 12 }}>{error}</p>
                            )}

                            <button type="submit" style={{ ...styles.submitButton, width: '100%', marginTop: 16, alignSelf: 'stretch' }} disabled={loadingProducts}>
                                {loadingProducts ? 'Creando...' : 'Crear Producto'}
                            </button>
                        </form>
                    </div>
                </div>
            )}

            <div style={styles.section}>
                <div style={styles.tableHeader}>
                    <h2 style={styles.sectionTitle}>Listado</h2>
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                        <button onClick={handleImprimirEtiquetas} style={styles.printButton}>
                            Imprimir Etiquetas
                            {Object.keys(etiquetasSeleccionadas).length > 0 && (
                                <span style={{ marginLeft: 7, background: '#fff', color: '#1a7a3f', borderRadius: 10, padding: '1px 7px', fontSize: 12, fontWeight: 800 }}>
                                    {Object.keys(etiquetasSeleccionadas).length}
                                </span>
                            )}
                        </button>
                        {tnConectado && Object.keys(etiquetasSeleccionadas).length > 0 && (
                            <button
                                onClick={handlePublicarSeleccionadosTN}
                                disabled={loadingProducts}
                                style={{ ...styles.printButton, backgroundColor: '#3b9ede' }}
                            >
                                Publicar seleccionados en Tienda Nube
                                <span style={{ marginLeft: 7, background: '#fff', color: '#1a7a3f', borderRadius: 10, padding: '1px 7px', fontSize: 12, fontWeight: 800 }}>
                                    {Object.keys(etiquetasSeleccionadas).length}
                                </span>
                            </button>
                        )}
                    </div>
                </div>
                <div style={styles.filtersContainer}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4, flex: 1 }}>
                        <input
                            type="text"
                            placeholder="Buscar por nombre, código interno o código de barras..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            style={styles.filterInput}
                        />
                        {/^\d{6,}$/.test(searchTerm) && (
                            <span style={{ fontSize: 11, color: '#1a7a3f', fontWeight: 600 }}>🔍 Buscando por código de barras</span>
                        )}
                    </div>
                    <button onClick={() => fetchProductos()} style={styles.searchButton}>Buscar</button>
                    {rubros.length > 0 && (
                        <select
                            value={filtroRubroId}
                            onChange={(e) => setFiltroRubroId(e.target.value)}
                            style={{ ...styles.filterInput, flex: 'none', width: 180 }}
                        >
                            <option value="">Todos los rubros</option>
                            {rubros.map(r => (
                                <option key={r.id} value={r.id}>{r.nombre}</option>
                            ))}
                        </select>
                    )}
                    {rubros.length > 0 && user.is_superuser && (
                        <button
                            type="button"
                            onClick={() => { setRubroMasivoId(filtroRubroId || rubros[0]?.id || ''); setModoMasivo('iva'); setValorMasivo(''); setShowEditarMasivoModal(true); }}
                            style={{ padding: '8px 15px', backgroundColor: '#3b9ede', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', whiteSpace: 'nowrap' }}
                        >
                            Editar en masa por rubro
                        </button>
                    )}
                    {(() => {
                        const stockBajoCount = productos.reduce((acc, p) => {
                            if (p.variantes && p.variantes.length > 0) {
                                return acc + p.variantes.filter(v => (v.stock || 0) <= STOCK_BAJO_THRESHOLD).length;
                            }
                            if (p.se_vende_por_peso) return acc;
                            return acc + ((p.stock || 0) <= STOCK_BAJO_THRESHOLD ? 1 : 0);
                        }, 0);
                        return stockBajoCount > 0 ? (
                            <button
                                type="button"
                                onClick={() => setStockBajoFilter(v => !v)}
                                style={{
                                    padding: '6px 14px', borderRadius: 20, cursor: 'pointer', fontSize: 12, fontWeight: 700,
                                    background: stockBajoFilter ? '#fef2f2' : '#f7faf9',
                                    color: stockBajoFilter ? '#991b1b' : '#475569',
                                    border: `1px solid ${stockBajoFilter ? '#fca5a5' : '#e2e8f0'}`,
                                    transition: 'all 0.15s',
                                    whiteSpace: 'nowrap',
                                }}
                            >
                                ⚠️ Stock bajo ({stockBajoCount})
                            </button>
                        ) : null;
                    })()}
                    {productos.some(p => (p.talle && String(p.talle).trim() !== '') || (p.variante2 && String(p.variante2).trim() !== '')) && (
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
                        <div className="productos-tabla-wrap" style={styles.tableResponsive}>
                            <table style={styles.table}>
                                <thead>
                                    <tr>
                                        <th style={styles.th}>
                                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
                                                <input
                                                    type="checkbox"
                                                    checked={Object.keys(etiquetasSeleccionadas).length > 0}
                                                    onChange={(e) => handleToggleSeleccionarTodosEtiquetas(e.target.checked)}
                                                    style={{ width: 16, height: 16, cursor: 'pointer' }}
                                                    title="Seleccionar todos los productos de esta página para imprimir etiquetas"
                                                />
                                                <span style={{ fontSize: 10, fontWeight: 400, color: '#94a3b8' }}>
                                                    Pág.
                                                </span>
                                            </div>
                                        </th>
                                        <th style={styles.th}>Foto</th>
                                        <th style={styles.th}>Cód. Interno</th>
                                        <th style={styles.th}>Nombre</th>
                                        {mostrarTalle && <th style={styles.th}>Talle</th>}
                                        <th style={styles.th}>Precio</th>
                                        <th style={styles.th}>Costo <span style={{ fontSize: '0.75em', color: '#94a3b8', fontWeight: 400 }}>s/IVA</span></th>
                                        <th style={styles.th}>Costo <span style={{ fontSize: '0.75em', color: '#94a3b8', fontWeight: 400 }}>c/IVA</span></th>
                                        <th style={styles.th}>IVA</th>
                                        <th style={styles.th}>Rubro</th>
                                        <th style={styles.th}>Margen</th>
                                        <th style={styles.th}>Stock</th>
                                        <th style={styles.th}>Últ. ingreso</th>
                                        <th style={styles.th}>Acciones</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {(stockBajoFilter
                                        ? productos.filter(p => p.variantes && p.variantes.length > 0
                                            ? p.variantes.some(v => (v.stock || 0) <= STOCK_BAJO_THRESHOLD)
                                            : !p.se_vende_por_peso && (p.stock || 0) <= STOCK_BAJO_THRESHOLD)
                                        : productos
                                    ).map(producto => {
                                        const precio = parseFloat(producto.precio) || 0;
                                        const costo = parseFloat(producto.costo) || 0;
                                        const ivaPct = parseFloat(producto.iva_porcentaje) || 0;
                                        const costoConIva = costo * (1 + ivaPct / 100);
                                        // El margen se calcula contra el costo con IVA (si no hay IVA cargado, es igual al costo sin IVA).
                                        const margen = precio > 0 && costoConIva > 0 ? ((precio - costoConIva) / precio * 100) : null;
                                        const margenColor = margen === null ? '#94a3b8' : margen >= 30 ? '#1a6a40' : margen >= 15 ? '#d97706' : '#e25252';
                                        const tieneVars = producto.variantes && producto.variantes.length > 0;
                                        const expandido = !!expandedVariants[producto.id];
                                        return (
                                        <React.Fragment key={producto.id}>
                                        <tr style={(!tieneVars && !producto.se_vende_por_peso && producto.stock <= STOCK_BAJO_THRESHOLD) ? { background: '#fef9ec' } : tieneVars ? { background: '#f0faf5' } : {}}>
                                            <td style={{ ...styles.td, textAlign: 'center' }}>
                                                <input
                                                    type="checkbox"
                                                    checked={!!etiquetasSeleccionadas[producto.id]}
                                                    onChange={(e) => handleToggleEtiqueta(producto.id, e.target.checked)}
                                                    style={{ width: 16, height: 16, cursor: 'pointer' }}
                                                    title={tieneVars ? 'Selecciona todas las variantes de esta familia' : undefined}
                                                />
                                            </td>
                                            <td style={{ ...styles.td, textAlign: 'center' }}>
                                                {producto.imagen
                                                    ? <img src={producto.imagen} alt="" style={{ width: 32, height: 32, borderRadius: 6, objectFit: 'cover', border: '1px solid #e2e8f0' }} />
                                                    : <span style={{ color: '#c0ccc9' }}>—</span>}
                                            </td>
                                            <td style={{ ...styles.td, color: '#475569' }}>
                                                {producto.codigo_interno || <span style={{ color: '#c0ccc9' }}>—</span>}
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
                                                <span
                                                    title={producto.nombre}
                                                    style={{ display: 'inline-block', maxWidth: 150, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', verticalAlign: 'middle' }}
                                                >
                                                    {producto.nombre}
                                                </span>
                                                {tieneVars && (
                                                    <span style={{ marginLeft: 8, fontSize: 11, color: '#475569', background: '#e2e8f0', borderRadius: 8, padding: '1px 7px' }}>
                                                        {producto.variantes.length} variante{producto.variantes.length !== 1 ? 's' : ''}
                                                    </span>
                                                )}
                                                {producto.se_vende_por_peso && (
                                                    <span style={{ marginLeft: 8, fontSize: 10, fontWeight: 700, color: '#7c3aed', background: '#f3e8ff', borderRadius: 8, padding: '1px 7px' }}>
                                                        POR PESO
                                                    </span>
                                                )}
                                                {producto.ml_stock_full && (
                                                    <span
                                                        title="Stock Full: lo repone y despacha Mercado Libre, no depende de tu depósito"
                                                        style={{ marginLeft: 6, fontSize: 10, fontWeight: 700, color: '#1d4ed8', background: '#dbeafe', borderRadius: 8, padding: '1px 7px' }}
                                                    >
                                                        FULL
                                                    </span>
                                                )}
                                            </td>
                                            {mostrarTalle && <td style={styles.td}>{detalleVariante(producto) || (tieneVars ? '—' : '-')}</td>}
                                            <td style={styles.td}>{tieneVars ? '—' : formatearMonto(producto.precio)}</td>
                                            <td style={styles.td}>{tieneVars ? '—' : formatearMonto(producto.costo || 0)}</td>
                                            <td style={styles.td}>{tieneVars ? '—' : formatearMonto(costoConIva)}</td>
                                            <td style={styles.td}>
                                                {!tieneVars && producto.iva_porcentaje !== null && producto.iva_porcentaje !== undefined
                                                    ? <>{parseFloat(producto.iva_porcentaje)}<span style={{ color: '#94a3b8', fontSize: '0.75em' }}>%</span></>
                                                    : <span style={{ color: '#94a3b8' }}>—</span>}
                                            </td>
                                            <td style={styles.td}>
                                                {!tieneVars && producto.rubro_nombre
                                                    ? <span title={producto.rubro_nombre} style={{ display: 'inline-block', maxWidth: 90, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', verticalAlign: 'middle' }}>{producto.rubro_nombre}</span>
                                                    : <span style={{ color: '#94a3b8' }}>—</span>}
                                            </td>
                                            <td style={{ ...styles.td, fontWeight: 700, color: margenColor }}>
                                                {tieneVars ? '—' : margen !== null ? `${margen.toFixed(1)}%` : <span style={{ color: '#94a3b8', fontStyle: 'italic', fontWeight: 400 }}>—</span>}
                                            </td>
                                            <td style={{ ...styles.td, color: (!tieneVars && !producto.se_vende_por_peso && producto.stock <= STOCK_BAJO_THRESHOLD) ? '#e25252' : undefined, fontWeight: (!tieneVars && !producto.se_vende_por_peso && producto.stock <= STOCK_BAJO_THRESHOLD) ? 700 : undefined }}>
                                                {tieneVars
                                                    ? <span style={{ color: '#475569', fontSize: 12 }}>
                                                        {producto.variantes.reduce((s, v) => s + (v.stock || 0), 0)} total
                                                      </span>
                                                    : producto.se_vende_por_peso
                                                        ? <span style={{ color: '#94a3b8', fontStyle: 'italic' }}>Por peso</span>
                                                        : <>{producto.stock}{producto.stock <= STOCK_BAJO_THRESHOLD && <span style={{ marginLeft: 4, fontSize: 10 }}>⚠️</span>}</>
                                                }
                                            </td>
                                            <td style={{ ...styles.td, whiteSpace: 'nowrap' }}>
                                                {!tieneVars && producto.stock_ultimo_ingreso != null ? (
                                                    <span>
                                                        <span style={{ fontWeight: 600 }}>{producto.stock_ultimo_ingreso}</span>
                                                        {producto.fecha_ultimo_ingreso && (
                                                            <span style={{ marginLeft: 5, fontSize: 11, color: '#94a3b8' }}>
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
                                                        onClick={() => { setEditProduct({ ...producto }); setTnLinkInput(''); setTnVariantesParaElegir(null); setShowEditModal(true); }}
                                                        style={{ color: 'white', backgroundColor: '#f59e0b' }}
                                                        data-tooltip="Editar producto"
                                                    >
                                                        <FontAwesomeIcon icon={faPencil} />
                                                    </button>
                                                    <button
                                                        className="icon-btn"
                                                        onClick={() => { setEditProduct({ ...producto }); setConvirtiendoAFamilia(!tieneVars); setVariantesNuevas([{ ...VARIANTE_VACIA, precio: producto.precio ?? '', costo: producto.costo ?? '' }]); setShowAddVarianteModal(true); }}
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
                                                {(user.is_superuser || user.is_supervisor) && tiendasAutorizadas.length > 1 && !tieneVars && (
                                                    <button
                                                        className="icon-btn"
                                                        onClick={() => { setProductoParaTransferir(producto); setTiendaDestinoTransferir(''); setCantidadTransferir(''); setShowTransferirStockModal(true); }}
                                                        style={{ color: 'white', backgroundColor: '#7c3aed' }}
                                                        data-tooltip="Transferir stock a otra tienda"
                                                    >
                                                        <FontAwesomeIcon icon={faRightLeft} />
                                                    </button>
                                                )}
                                                {(user.is_superuser || user.is_supervisor) && tiendasAutorizadas.length > 1 && tieneVars && (
                                                    <button
                                                        className="icon-btn"
                                                        onClick={() => { setFamiliaParaTransferir(producto); setTiendaDestinoFamilia(''); setCantidadesFamilia({}); setShowTransferirFamiliaModal(true); }}
                                                        style={{ color: 'white', backgroundColor: '#7c3aed' }}
                                                        data-tooltip="Transferir variantes a otra tienda"
                                                    >
                                                        <FontAwesomeIcon icon={faLayerGroup} />
                                                    </button>
                                                )}
                                                </div>
                                            </td>
                                        </tr>
                                        {/* Filas de variantes expandidas */}
                                        {tieneVars && expandido && producto.variantes.map(v => {
                                            const vPrecio = parseFloat(v.precio) || 0;
                                            const vCosto = parseFloat(v.costo ?? producto.costo) || 0;
                                            // IVA y Rubro no son campos por variante: se heredan del producto padre.
                                            const vIvaPct = parseFloat(producto.iva_porcentaje) || 0;
                                            const vCostoConIva = vCosto * (1 + vIvaPct / 100);
                                            const vMargen = vPrecio > 0 && vCosto > 0 ? ((vPrecio - vCosto) / vPrecio * 100) : null;
                                            const vMargenColor = vMargen === null ? '#94a3b8' : vMargen >= 30 ? '#1a6a40' : vMargen >= 15 ? '#d97706' : '#e25252';
                                            return (
                                                <tr key={v.id} style={{ background: '#f8fafc', borderLeft: '2px solid #a8e6c5' }}>
                                                    <td style={{ ...styles.td, textAlign: 'center' }}>
                                                        <input
                                                            type="checkbox"
                                                            checked={!!etiquetasSeleccionadas[v.id]}
                                                            onChange={(e) => handleToggleEtiqueta(v.id, e.target.checked)}
                                                            style={{ width: 16, height: 16, cursor: 'pointer' }}
                                                            title="Selecciona solo esta variante"
                                                        />
                                                    </td>
                                                    <td style={{ ...styles.td, textAlign: 'center' }}>
                                                        {v.imagen
                                                            ? <img src={v.imagen} alt="" style={{ width: 28, height: 28, borderRadius: 6, objectFit: 'cover', border: '1px solid #e2e8f0' }} />
                                                            : <span style={{ color: '#c0ccc9' }}>—</span>}
                                                    </td>
                                                    <td style={{ ...styles.td, color: '#475569' }}>
                                                        {v.codigo_interno || <span style={{ color: '#c0ccc9' }}>—</span>}
                                                    </td>
                                                    <td style={{ ...styles.td, paddingLeft: 28, color: '#475569', fontSize: 13 }}>
                                                        ↳ {detalleVariante(v) || '(sin talle)'}
                                                        {v.ml_stock_full && (
                                                            <span
                                                                title="Stock Full: lo repone y despacha Mercado Libre, no depende de tu depósito"
                                                                style={{ marginLeft: 6, fontSize: 10, fontWeight: 700, color: '#1d4ed8', background: '#dbeafe', borderRadius: 8, padding: '1px 7px' }}
                                                            >
                                                                FULL
                                                            </span>
                                                        )}
                                                    </td>
                                                    {mostrarTalle && <td style={styles.td}>{detalleVariante(v) || '-'}</td>}
                                                    <td style={styles.td}>{formatearMonto(v.precio)}</td>
                                                    <td style={styles.td}>{formatearMonto(vCosto)}</td>
                                                    <td style={styles.td}>{formatearMonto(vCostoConIva)}</td>
                                                    <td style={styles.td}>
                                                        {producto.iva_porcentaje !== null && producto.iva_porcentaje !== undefined
                                                            ? <>{parseFloat(producto.iva_porcentaje)}<span style={{ color: '#94a3b8', fontSize: '0.75em' }}>%</span></>
                                                            : <span style={{ color: '#94a3b8' }}>—</span>}
                                                    </td>
                                                    <td style={styles.td}>
                                                        {producto.rubro_nombre
                                                            ? <span title={producto.rubro_nombre} style={{ display: 'inline-block', maxWidth: 90, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', verticalAlign: 'middle' }}>{producto.rubro_nombre}</span>
                                                            : <span style={{ color: '#94a3b8' }}>—</span>}
                                                    </td>
                                                    <td style={{ ...styles.td, fontWeight: 700, color: vMargenColor }}>
                                                        {vMargen !== null ? `${vMargen.toFixed(1)}%` : <span style={{ color: '#94a3b8', fontStyle: 'italic', fontWeight: 400 }}>—</span>}
                                                    </td>
                                                    <td style={{ ...styles.td, color: v.stock <= STOCK_BAJO_THRESHOLD ? '#e25252' : undefined, fontWeight: v.stock <= STOCK_BAJO_THRESHOLD ? 700 : undefined }}>
                                                        {v.stock}{v.stock <= STOCK_BAJO_THRESHOLD && <span style={{ marginLeft: 4, fontSize: 10 }}>⚠️</span>}
                                                    </td>
                                                    <td style={{ ...styles.td, whiteSpace: 'nowrap' }}>
                                                        {v.stock_ultimo_ingreso != null ? (
                                                            <span>
                                                                <span style={{ fontWeight: 600 }}>{v.stock_ultimo_ingreso}</span>
                                                                {v.fecha_ultimo_ingreso && (
                                                                    <span style={{ marginLeft: 5, fontSize: 11, color: '#94a3b8' }}>
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
                                                                    setTnLinkInput(''); setTnVariantesParaElegir(null);
                                                                    setShowEditModal(true);
                                                                }}
                                                                style={{ color: 'white', backgroundColor: '#f59e0b' }}
                                                                data-tooltip="Editar variante"
                                                            >
                                                                <FontAwesomeIcon icon={faPencil} />
                                                            </button>
                                                        )}
                                                        {user.is_superuser && (
                                                            <button
                                                                className="icon-btn"
                                                                onClick={() => {
                                                                    setProductToDelete({ ...v, nombre: `${producto.nombre}${detalleVariante(v) ? ` · ${detalleVariante(v)}` : ''}` });
                                                                    setShowDeleteModal(true);
                                                                }}
                                                                style={{ color: 'white', backgroundColor: '#e25252' }}
                                                                data-tooltip="Eliminar variante"
                                                            >
                                                                <FontAwesomeIcon icon={faTrash} />
                                                            </button>
                                                        )}
                                                        {user.is_supervisor && !user.is_superuser && (
                                                            <button
                                                                className="icon-btn"
                                                                onClick={() => { setProductoParaStock({ ...v, nombre: `${producto.nombre}${detalleVariante(v) ? ` · ${detalleVariante(v)}` : ''}` }); setCantidadAGregar(''); setShowAgregarStockModal(true); }}
                                                                style={{ color: 'white', backgroundColor: '#3b82f6' }}
                                                                data-tooltip="Agregar stock"
                                                            >
                                                                <FontAwesomeIcon icon={faArrowUp} />
                                                            </button>
                                                        )}
                                                        {(user.is_superuser || user.is_supervisor) && tiendasAutorizadas.length > 1 && (
                                                            <button
                                                                className="icon-btn"
                                                                onClick={() => { setProductoParaTransferir({ ...v, nombre: `${producto.nombre}${detalleVariante(v) ? ` · ${detalleVariante(v)}` : ''}` }); setTiendaDestinoTransferir(''); setCantidadTransferir(''); setShowTransferirStockModal(true); }}
                                                                style={{ color: 'white', backgroundColor: '#7c3aed' }}
                                                                data-tooltip="Transferir stock a otra tienda"
                                                            >
                                                                <FontAwesomeIcon icon={faRightLeft} />
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
                    <div style={{ ...styles.modalContent, maxHeight: '90vh', overflowY: 'auto' }}>
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
                            <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                                <input
                                    type="checkbox"
                                    checked={!!editProduct.se_vende_por_peso}
                                    onChange={(e) => setEditProduct({
                                        ...editProduct,
                                        se_vende_por_peso: e.target.checked,
                                        stock: e.target.checked ? 0 : editProduct.stock,
                                    })}
                                />
                                Se vende por peso (precio por Kg, sin stock)
                            </label>
                        </div>
                        <div style={styles.inputGroupModal}>
                            <label style={styles.label}>{editProduct.se_vende_por_peso ? 'Precio por Kg:' : 'Precio:'}</label>
                            <input
                                type="number"
                                value={editProduct.precio}
                                onChange={(e) => setEditProduct({ ...editProduct, precio: e.target.value })}
                                style={styles.modalInput}
                            />
                        </div>
                        {/* NUEVO CAMPO EN EL MODAL */}
                        <div style={styles.inputGroupModal}>
                            <label style={styles.label}>{editProduct.se_vende_por_peso ? 'Costo por Kg:' : 'Costo:'}</label>
                            <input
                                type="number"
                                value={editProduct.costo || ''}
                                onChange={(e) => setEditProduct({ ...editProduct, costo: e.target.value })}
                                style={styles.modalInput}
                            />
                        </div>
                        <div style={styles.inputGroupModal}>
                            <label style={{ ...styles.label, color: editProduct.se_vende_por_peso ? '#aaa' : undefined }}>Stock:</label>
                            <input
                                type="number"
                                value={editProduct.se_vende_por_peso ? '' : editProduct.stock}
                                onChange={(e) => setEditProduct({ ...editProduct, stock: e.target.value })}
                                style={{ ...styles.modalInput, background: editProduct.se_vende_por_peso ? '#f3f4f6' : undefined, cursor: editProduct.se_vende_por_peso ? 'not-allowed' : undefined }}
                                placeholder={editProduct.se_vende_por_peso ? 'No aplica (se vende por peso)' : undefined}
                                disabled={editProduct.se_vende_por_peso}
                            />
                        </div>
                        <div style={styles.inputGroupModal}>
                            <label style={styles.label}>Rubro <span style={styles.opcionalTag}>(Opcional)</span>:</label>
                            <select
                                value={editProduct.rubro || ''}
                                onChange={(e) => {
                                    if (e.target.value === '__nuevo__') { abrirNuevoRubroModal('edicion'); return; }
                                    setEditProduct({ ...editProduct, rubro: e.target.value || null });
                                }}
                                style={styles.modalInput}
                            >
                                <option value="">Sin rubro</option>
                                {rubros.map(r => (
                                    <option key={r.id} value={r.id}>{r.nombre}</option>
                                ))}
                                <option value="__nuevo__">+ Crear nuevo rubro...</option>
                            </select>
                        </div>
                        <div style={styles.inputGroupModal}>
                            <label style={styles.label}>Proveedor <span style={styles.opcionalTag}>(Opcional)</span>:</label>
                            <select
                                value={editProduct.proveedor || ''}
                                onChange={(e) => {
                                    if (e.target.value === '__nuevo__') { abrirNuevoProveedorModal('edicion'); return; }
                                    setEditProduct({ ...editProduct, proveedor: e.target.value || null });
                                }}
                                style={styles.modalInput}
                            >
                                <option value="">Sin proveedor</option>
                                {proveedores.map(p => (
                                    <option key={p.id} value={p.id}>{p.nombre_razon_social}</option>
                                ))}
                                <option value="__nuevo__">+ Crear nuevo proveedor...</option>
                            </select>
                        </div>
                        <div style={styles.inputGroupModal}>
                            <label style={styles.label}>Talle <span style={styles.opcionalTag}>(Opcional)</span>:</label>
                            <input
                                type="text"
                                value={editProduct.talle || ''}
                                onChange={(e) => setEditProduct({ ...editProduct, talle: e.target.value })}
                                style={styles.modalInput}
                                placeholder="Ej: M, L, XL, 42, etc."
                            />
                        </div>
                        <div style={styles.inputGroupModal}>
                            <label style={styles.label}>Variante 2 <span style={styles.opcionalTag}>(Opcional)</span>:</label>
                            <input
                                type="text"
                                value={editProduct.variante2 || ''}
                                onChange={(e) => setEditProduct({ ...editProduct, variante2: e.target.value })}
                                style={styles.modalInput}
                                placeholder="Ej: color, material, etc."
                            />
                        </div>
                        <div style={styles.inputGroupModal}>
                            <label style={styles.label}>Código de Barras <span style={styles.opcionalTag}>(Opcional)</span>:</label>
                            <input
                                type="text"
                                value={editProduct.codigo_barras || ''}
                                onChange={(e) => setEditProduct({ ...editProduct, codigo_barras: e.target.value })}
                                style={styles.modalInput}
                                placeholder="Auto-generado si se deja vacío"
                            />
                        </div>
                        <div style={styles.inputGroupModal}>
                            <label style={styles.label}>Imagen <span style={styles.opcionalTag}>(Opcional)</span>:</label>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                {editProduct.imagen && (
                                    <img
                                        src={editProduct.imagen}
                                        alt=""
                                        style={{ width: 56, height: 56, borderRadius: 8, objectFit: 'cover', border: '1px solid #e2e8f0', flexShrink: 0 }}
                                    />
                                )}
                                <label style={{
                                    padding: '8px 14px', background: '#f1f5f9', border: '1px solid #e2e8f0',
                                    borderRadius: 6, cursor: 'pointer', fontSize: 13, fontWeight: 600, color: '#475569',
                                }}>
                                    {editProduct.imagen ? 'Cambiar foto' : 'Subir foto'}
                                    <input type="file" accept="image/*" capture="environment" onChange={handleEditImagenChange} style={{ display: 'none' }} />
                                </label>
                                {editProduct.imagen && (
                                    <button
                                        type="button"
                                        onClick={() => setEditProduct(prev => ({ ...prev, imagen: '' }))}
                                        style={{ background: 'none', border: 'none', color: '#e25252', fontSize: 12, cursor: 'pointer' }}
                                    >
                                        Quitar
                                    </button>
                                )}
                            </div>
                        </div>

                        {tnConectado && (
                            <div style={{ ...styles.inputGroupModal, background: '#f0faf5', border: '1px solid #cdeedb', borderRadius: 8, padding: 12 }}>
                                <label style={styles.label}>Tienda Nube:</label>
                                {editProduct.tn_variant_id ? (
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                                        <span style={{ fontSize: 13, color: '#1a6a40' }}>
                                            ✓ Vinculado (producto {editProduct.tn_product_id})
                                        </span>
                                        <button
                                            type="button"
                                            onClick={handleDesvincularTN}
                                            disabled={tnLinking}
                                            style={{ padding: '4px 10px', fontSize: 12, background: '#fef2f2', color: '#e25252', border: '1px solid #fca5a5', borderRadius: 6, cursor: 'pointer' }}
                                        >
                                            {tnLinking ? 'Desvinculando...' : 'Desvincular'}
                                        </button>
                                    </div>
                                ) : (
                                    <>
                                        <p style={{ fontSize: 12, color: '#64748b', margin: '0 0 8px' }}>
                                            Si ya creaste este producto directamente en Tienda Nube, pegá acá su ID para vincularlo (el stock se sincroniza solo desde ese momento). Si en Tienda Nube tiene varios talles/variantes: cuando este producto todavía no tiene variantes cargadas acá, se crean automáticamente (con stock en 0 para redistribuir a mano); si este producto ya es una variante de una familia local, te vamos a pedir que elijas cuál talle de Tienda Nube le corresponde — repetí este paso en cada variante local, con el mismo ID de producto.
                                        </p>
                                        <div style={{ display: 'flex', gap: 8 }}>
                                            <input
                                                type="text"
                                                value={tnLinkInput}
                                                onChange={(e) => {
                                                    setTnLinkInput(e.target.value);
                                                    // Si ya había un desplegable de variantes de un ID anterior,
                                                    // se descarta: si no, al corregir el ID y confirmar, se manda
                                                    // el tn_variant_id viejo contra el producto nuevo y tira
                                                    // "la variante no pertenece a ese producto".
                                                    setTnVariantesParaElegir(null);
                                                    setTnVarianteElegida('');
                                                }}
                                                placeholder="ID de producto en Tienda Nube"
                                                style={{ ...styles.modalInput, flex: 1 }}
                                            />
                                            <button
                                                type="button"
                                                onClick={() => handleVincularTN()}
                                                disabled={tnLinking || !tnLinkInput.trim()}
                                                style={{ padding: '8px 14px', background: '#5dc87a', color: 'white', border: 'none', borderRadius: 6, cursor: 'pointer', whiteSpace: 'nowrap' }}
                                            >
                                                {tnLinking ? 'Vinculando...' : 'Vincular'}
                                            </button>
                                        </div>
                                        {tnVariantesParaElegir && (
                                            <div style={{ marginTop: 10 }}>
                                                <p style={{ fontSize: 12, color: '#64748b', margin: '0 0 6px' }}>
                                                    Ese producto tiene varias variantes en Tienda Nube. Elegí cuál corresponde:
                                                </p>
                                                <select
                                                    value={tnVarianteElegida}
                                                    onChange={(e) => setTnVarianteElegida(e.target.value)}
                                                    style={{ ...styles.modalInput, marginBottom: 8 }}
                                                >
                                                    <option value="">Seleccionar variante...</option>
                                                    {tnVariantesParaElegir.map(v => (
                                                        <option key={v.id} value={v.id}>
                                                            {v.valores || v.sku || v.id}
                                                        </option>
                                                    ))}
                                                </select>
                                                <button
                                                    type="button"
                                                    onClick={() => handleVincularTN(tnVarianteElegida)}
                                                    disabled={tnLinking || !tnVarianteElegida}
                                                    style={{ padding: '6px 12px', background: '#5dc87a', color: 'white', border: 'none', borderRadius: 6, cursor: 'pointer' }}
                                                >
                                                    Confirmar variante
                                                </button>
                                            </div>
                                        )}
                                    </>
                                )}
                            </div>
                        )}

                        <div style={styles.modalActions}>
                            <button onClick={handleEditProduct} style={styles.modalConfirmButton}>Guardar</button>
                            {!editProduct.producto_padre_id && (
                                <button
                                    type="button"
                                    onClick={() => {
                                        setShowEditModal(false);
                                        setConvirtiendoAFamilia(!(editProduct.variantes && editProduct.variantes.length > 0));
                                        setVariantesNuevas([{ ...VARIANTE_VACIA, precio: editProduct.precio ?? '', costo: editProduct.costo ?? '' }]);
                                        setShowAddVarianteModal(true);
                                    }}
                                    style={{ padding: '10px 15px', backgroundColor: '#5dc87a', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                                >
                                    + Variante
                                </button>
                            )}
                            <button onClick={() => setShowEditModal(false)} style={styles.modalCancelButton}>Cancelar</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal de creación rápida de rubro */}
            {showNuevoRubroModal && (
                <div style={styles.modalOverlay} onClick={() => setShowNuevoRubroModal(false)}>
                    <div style={{ ...styles.modalContent, maxWidth: 380 }} onClick={e => e.stopPropagation()}>
                        <h3 style={{ marginTop: 0 }}>Nuevo rubro</h3>
                        <div style={styles.inputGroupModal}>
                            <label style={styles.label}>Nombre:</label>
                            <input
                                type="text"
                                value={nuevoRubroNombre}
                                onChange={(e) => setNuevoRubroNombre(e.target.value)}
                                style={styles.modalInput}
                                placeholder="Ej: Herramientas"
                            />
                        </div>
                        <div style={styles.inputGroupModal}>
                            <label style={styles.label}>IVA %:</label>
                            <input
                                type="number"
                                min="0"
                                max="100"
                                step="0.01"
                                value={nuevoRubroIva}
                                onChange={(e) => setNuevoRubroIva(e.target.value)}
                                style={styles.modalInput}
                                placeholder="Ej: 21"
                            />
                        </div>
                        <div style={styles.modalActions}>
                            <button onClick={crearRubroRapido} disabled={guardandoNuevoRubro} style={styles.modalConfirmButton}>
                                {guardandoNuevoRubro ? 'Creando...' : 'Crear'}
                            </button>
                            <button onClick={() => setShowNuevoRubroModal(false)} style={styles.modalCancelButton}>Cancelar</button>
                        </div>
                    </div>
                </div>
            )}

            {showNuevoProveedorModal && (
                <div style={styles.modalOverlay} onClick={() => setShowNuevoProveedorModal(false)}>
                    <div style={{ ...styles.modalContent, maxWidth: 380 }} onClick={e => e.stopPropagation()}>
                        <h3 style={{ marginTop: 0 }}>Nuevo proveedor</h3>
                        <div style={styles.inputGroupModal}>
                            <label style={styles.label}>Nombre / Razón Social:</label>
                            <input
                                type="text"
                                value={nuevoProveedorNombre}
                                onChange={(e) => setNuevoProveedorNombre(e.target.value)}
                                style={styles.modalInput}
                                placeholder="Ej: Distribuidora del Sur"
                            />
                        </div>
                        <p style={{ fontSize: 12, color: '#94a3b8', margin: '0 0 12px' }}>
                            El resto de los datos (CUIT, teléfono, etc.) se pueden completar después desde "Proveedores".
                        </p>
                        <div style={styles.modalActions}>
                            <button onClick={crearProveedorRapido} disabled={guardandoNuevoProveedor} style={styles.modalConfirmButton}>
                                {guardandoNuevoProveedor ? 'Creando...' : 'Crear'}
                            </button>
                            <button onClick={() => setShowNuevoProveedorModal(false)} style={styles.modalCancelButton}>Cancelar</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal de edición en masa por rubro */}
            {showEditarMasivoModal && (
                <div style={styles.modalOverlay} onClick={() => setShowEditarMasivoModal(false)}>
                    <div style={{ ...styles.modalContent, maxWidth: 420, textAlign: 'left' }} onClick={e => e.stopPropagation()}>
                        <h3 style={{ marginTop: 0 }}>Editar en masa por rubro</h3>
                        <div style={styles.inputGroupModal}>
                            <label style={styles.label}>Rubro:</label>
                            <select
                                value={rubroMasivoId}
                                onChange={(e) => {
                                    if (e.target.value === '__nuevo__') { abrirNuevoRubroModal('masivo'); return; }
                                    setRubroMasivoId(e.target.value);
                                }}
                                style={styles.modalInput}
                            >
                                {rubros.map(r => (
                                    <option key={r.id} value={r.id}>{r.nombre}</option>
                                ))}
                                <option value="__nuevo__">+ Crear nuevo rubro...</option>
                            </select>
                        </div>
                        <div style={styles.inputGroupModal}>
                            <label style={styles.label}>Qué modificar:</label>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 4 }}>
                                <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                                    <input type="radio" checked={modoMasivo === 'iva'} onChange={() => setModoMasivo('iva')} />
                                    <span>Cambiar IVA % (a todos los productos del rubro)</span>
                                </label>
                                <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                                    <input type="radio" checked={modoMasivo === 'margen'} onChange={() => setModoMasivo('margen')} />
                                    <span>Cambiar % de margen (recalcula el precio según costo + IVA actual)</span>
                                </label>
                                <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                                    <input type="radio" checked={modoMasivo === 'ajuste_precio'} onChange={() => setModoMasivo('ajuste_precio')} />
                                    <span>Aumentar o bajar precio % (sin tocar costo ni IVA)</span>
                                </label>
                            </div>
                        </div>
                        <div style={styles.inputGroupModal}>
                            <label style={styles.label}>
                                {modoMasivo === 'iva' ? 'Nuevo IVA %:' : modoMasivo === 'margen' ? 'Nuevo margen %:' : 'Ajuste % (negativo para bajar precio):'}
                            </label>
                            <input
                                type="number"
                                step="0.01"
                                value={valorMasivo}
                                onChange={(e) => setValorMasivo(e.target.value)}
                                style={styles.modalInput}
                                placeholder={modoMasivo === 'ajuste_precio' ? 'Ej: 10 o -10' : 'Ej: 21'}
                            />
                        </div>
                        <div style={styles.modalActions}>
                            <button onClick={handleEditarMasivo} disabled={guardandoMasivo} style={styles.modalConfirmButton}>
                                {guardandoMasivo ? 'Aplicando...' : 'Aplicar'}
                            </button>
                            <button onClick={() => setShowEditarMasivoModal(false)} style={styles.modalCancelButton}>Cancelar</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal de cantidad de etiquetas */}
            {showEtiquetasModal && (
                <div style={styles.modalOverlay} onClick={() => setShowEtiquetasModal(false)}>
                    <div style={{ ...styles.modalContent, maxWidth: 420 }} onClick={e => e.stopPropagation()}>
                        <h3 style={{ marginTop: 0, marginBottom: 4, fontSize: '1rem', fontWeight: 700 }}>¿Cuántas etiquetas imprimir?</h3>
                        <p style={{ marginTop: 0, marginBottom: 16, fontSize: 12.5, color: '#64748b' }}>
                            Para productos con variantes, la cantidad se aplica a cada variante de la familia.
                        </p>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, maxHeight: 340, overflowY: 'auto', paddingRight: 4 }}>
                            {Object.keys(cantidadesModal).map(id => {
                                let producto = productos.find(p => String(p.id) === String(id));
                                let nombreDisplay = producto?.nombre;
                                const esFamilia = !!(producto?.variantes && producto.variantes.length > 0);
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
                                            {esFamilia && (
                                                <span style={{ fontSize: 11, color: '#94a3b8', fontWeight: 400 }}>
                                                    {' '}({producto.variantes.length} variantes)
                                                </span>
                                            )}
                                        </span>
                                        <input
                                            type="number"
                                            min="1"
                                            max="100"
                                            value={cantidadesModal[id]}
                                            onChange={e => setCantidadesModal(prev => ({ ...prev, [id]: Math.max(1, parseInt(e.target.value) || 1) }))}
                                            style={{ width: 70, padding: '6px 10px', border: '1px solid #e2e8f0', borderRadius: 8, fontSize: 15, fontWeight: 700, textAlign: 'center' }}
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
                    <div style={{ ...styles.modalContent, width: '95%', maxWidth: 1040, maxHeight: '90vh', overflowY: 'auto' }} onClick={e => e.stopPropagation()}>
                        <h3 style={{ marginTop: 0 }}>
                            {convirtiendoAFamilia
                                ? `Convertir "${editProduct.nombre}" en producto con variantes`
                                : `Agregar variantes a "${editProduct.nombre}"`}
                        </h3>
                        <p style={{ fontSize: 13, color: '#475569', marginBottom: 8 }}>
                            Cargá todas las variantes que necesites y se crean juntas de una sola vez.
                            El código de barras se genera automáticamente si lo dejás vacío. El margen
                            calcula el precio de esa variante a partir de su costo.
                        </p>
                        <div style={{ overflowX: 'auto' }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                                <thead>
                                    <tr>
                                        {['Foto', 'Talle / Valor', 'Variante 2 (opcional)', 'Precio', 'Costo', 'Margen %', 'Stock', 'Código de barras', ''].map(h => (
                                            <th key={h} style={{ padding: '6px 8px', borderBottom: '1px solid #e2e8f0', textAlign: 'left', fontWeight: 600 }}>{h}</th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {variantesNuevas.map((v, i) => (
                                        <tr key={i}>
                                            <td style={{ padding: '4px 8px' }}>
                                                <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 32, height: 32, borderRadius: 6, background: '#f1f5f9', border: '1px solid #e2e8f0', cursor: 'pointer', overflow: 'hidden' }}>
                                                    {v.imagen
                                                        ? <img src={v.imagen} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                                        : <span style={{ fontSize: 14, color: '#94a3b8' }}>📷</span>
                                                    }
                                                    <input type="file" accept="image/*" capture="environment" style={{ display: 'none' }}
                                                        onChange={e => handleVarianteImagenChange(i, e.target.files?.[0])} />
                                                </label>
                                            </td>
                                            <td style={{ padding: '4px 8px' }}>
                                                <input type="text" value={v.talle} placeholder="M, L, 42…" style={{ ...styles.input, width: 80 }}
                                                    onChange={e => setVariantesNuevas(prev => prev.map((x, j) => j === i ? { ...x, talle: e.target.value } : x))} />
                                            </td>
                                            <td style={{ padding: '4px 8px' }}>
                                                <input type="text" value={v.variante2} placeholder="Color, material…" style={{ ...styles.input, width: 100 }}
                                                    onChange={e => setVariantesNuevas(prev => prev.map((x, j) => j === i ? { ...x, variante2: e.target.value } : x))} />
                                            </td>
                                            <td style={{ padding: '4px 8px' }}>
                                                <input type="number" value={v.precio} placeholder="0" style={{ ...styles.input, width: 90 }}
                                                    onChange={e => handleVariantePrecioChange(i, e.target.value)} required />
                                            </td>
                                            <td style={{ padding: '4px 8px' }}>
                                                <input type="number" value={v.costo} placeholder="Opcional" style={{ ...styles.input, width: 90 }}
                                                    onChange={e => handleVarianteCostoChange(i, e.target.value)} />
                                            </td>
                                            <td style={{ padding: '4px 8px' }}>
                                                {(() => {
                                                    const vMargenCalc = margenCalculadoVariante(v);
                                                    const vMargenBloqueado = vMargenCalc !== null;
                                                    return (
                                                        <input
                                                            type="number" step="0.01"
                                                            value={vMargenBloqueado ? vMargenCalc : v.margen}
                                                            placeholder="Ej: 40"
                                                            style={{
                                                                ...styles.input, width: 80,
                                                                background: vMargenBloqueado ? '#f3f4f6' : undefined,
                                                                color: vMargenBloqueado ? '#aaa' : undefined,
                                                                cursor: vMargenBloqueado ? 'not-allowed' : undefined,
                                                            }}
                                                            disabled={vMargenBloqueado}
                                                            title={vMargenBloqueado ? 'Calculado a partir de costo y precio' : 'Calcula el precio de esta variante a partir de su costo'}
                                                            onChange={e => handleVarianteMargenChange(i, e.target.value)}
                                                        />
                                                    );
                                                })()}
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
                        <button type="button" onClick={() => setVariantesNuevas(prev => [...prev, { ...VARIANTE_VACIA, precio: editProduct.precio ?? '', costo: editProduct.costo ?? '' }])}
                            style={{ marginTop: 8, padding: '5px 12px', background: '#e8f5ec', color: '#1a7a3f', border: '1px solid #b7dfc7', borderRadius: 4, cursor: 'pointer', fontSize: 13 }}>
                            + Agregar variante
                        </button>

                        {error && (
                            <p style={{ color: '#e25252', fontSize: 13, marginTop: 12 }}>{error}</p>
                        )}

                        <div style={styles.modalActions}>
                            <button onClick={handleAgregarVariantesLote} style={styles.modalConfirmButton} disabled={loadingProducts}>
                                {loadingProducts ? 'Guardando…' : 'Crear variantes'}
                            </button>
                            <button
                                onClick={() => { setShowAddVarianteModal(false); setConvirtiendoAFamilia(false); setVariantesNuevas([{ ...VARIANTE_VACIA }]); setError(null); }}
                                style={styles.modalCancelButton}
                            >
                                Cancelar
                            </button>
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
                        <p style={{ margin: '0 0 20px', fontSize: 13, color: '#94a3b8' }}>
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
                            <p style={{ fontSize: 13, color: '#1a6a40', margin: '0 0 16px', fontWeight: 600 }}>
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
            {/* Modal transferir stock (individual) */}
            {showTransferirStockModal && productoParaTransferir && (
                <div style={styles.modalOverlay} onClick={() => setShowTransferirStockModal(false)}>
                    <div style={{ ...styles.modalContent, maxWidth: 380, textAlign: 'left' }} onClick={e => e.stopPropagation()}>
                        <h3 style={{ margin: '0 0 16px', color: '#1a2926' }}>Transferir Stock</h3>
                        <p style={{ margin: '0 0 4px', fontSize: 14, color: '#1a2926', fontWeight: 600 }}>
                            {productoParaTransferir.nombre}
                        </p>
                        <p style={{ margin: '0 0 20px', fontSize: 13, color: '#94a3b8' }}>
                            Stock actual: <strong style={{ color: '#1a2926' }}>{productoParaTransferir.stock}</strong>
                        </p>
                        <div style={styles.inputGroupModal}>
                            <label style={styles.label}>Transferir a:</label>
                            <select
                                value={tiendaDestinoTransferir}
                                onChange={e => setTiendaDestinoTransferir(e.target.value)}
                                style={styles.modalInput}
                            >
                                <option value="">Seleccionar tienda…</option>
                                {tiendasAutorizadas.filter(t => t.nombre !== selectedStoreSlug).map(t => (
                                    <option key={t.id} value={t.nombre}>{t.nombre}</option>
                                ))}
                            </select>
                        </div>
                        <div style={styles.inputGroupModal}>
                            <label style={styles.label}>Cantidad a transferir:</label>
                            <input
                                type="number"
                                min="1"
                                max={productoParaTransferir.stock || 0}
                                value={cantidadTransferir}
                                onChange={e => setCantidadTransferir(e.target.value)}
                                style={styles.modalInput}
                                autoFocus
                                onKeyDown={e => e.key === 'Enter' && handleTransferirStock()}
                            />
                        </div>
                        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 8 }}>
                            <button
                                onClick={() => { setShowTransferirStockModal(false); setProductoParaTransferir(null); setTiendaDestinoTransferir(''); setCantidadTransferir(''); }}
                                style={styles.modalCancelButton}
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={handleTransferirStock}
                                disabled={!tiendaDestinoTransferir || !cantidadTransferir || parseInt(cantidadTransferir, 10) <= 0 || parseInt(cantidadTransferir, 10) > (productoParaTransferir.stock || 0) || loadingTransferir}
                                style={{ ...styles.modalConfirmButton, backgroundColor: '#7c3aed', opacity: (!tiendaDestinoTransferir || !cantidadTransferir || parseInt(cantidadTransferir, 10) <= 0) ? 0.5 : 1 }}
                            >
                                {loadingTransferir ? 'Transfiriendo…' : 'Confirmar'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
            {/* Modal transferir familia de variantes (lote) */}
            {showTransferirFamiliaModal && familiaParaTransferir && (
                <div style={styles.modalOverlay} onClick={() => setShowTransferirFamiliaModal(false)}>
                    <div style={{ ...styles.modalContent, maxWidth: 460, textAlign: 'left' }} onClick={e => e.stopPropagation()}>
                        <h3 style={{ margin: '0 0 16px', color: '#1a2926' }}>Transferir variantes de "{familiaParaTransferir.nombre}"</h3>
                        <div style={styles.inputGroupModal}>
                            <label style={styles.label}>Transferir a:</label>
                            <select
                                value={tiendaDestinoFamilia}
                                onChange={e => setTiendaDestinoFamilia(e.target.value)}
                                style={styles.modalInput}
                            >
                                <option value="">Seleccionar tienda…</option>
                                {tiendasAutorizadas.filter(t => t.nombre !== selectedStoreSlug).map(t => (
                                    <option key={t.id} value={t.nombre}>{t.nombre}</option>
                                ))}
                            </select>
                        </div>
                        <table style={{ width: '100%', borderCollapse: 'collapse', margin: '12px 0' }}>
                            <thead>
                                <tr>
                                    <th style={{ textAlign: 'left', fontSize: 12, color: '#94a3b8', padding: '4px 6px' }}>Variante</th>
                                    <th style={{ textAlign: 'left', fontSize: 12, color: '#94a3b8', padding: '4px 6px' }}>Stock</th>
                                    <th style={{ textAlign: 'left', fontSize: 12, color: '#94a3b8', padding: '4px 6px' }}>Cantidad</th>
                                </tr>
                            </thead>
                            <tbody>
                                {familiaParaTransferir.variantes.map(v => (
                                    <tr key={v.id}>
                                        <td style={{ padding: '4px 6px', fontSize: 13 }}>{detalleVariante(v) || '(sin talle)'}</td>
                                        <td style={{ padding: '4px 6px', fontSize: 13 }}>{v.stock}</td>
                                        <td style={{ padding: '4px 6px' }}>
                                            <input
                                                type="number"
                                                min="0"
                                                max={v.stock || 0}
                                                value={cantidadesFamilia[v.id] || ''}
                                                onChange={e => setCantidadesFamilia(prev => ({ ...prev, [v.id]: e.target.value }))}
                                                style={{ ...styles.modalInput, width: 80, padding: '4px 8px' }}
                                            />
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 8 }}>
                            <button
                                onClick={() => { setShowTransferirFamiliaModal(false); setFamiliaParaTransferir(null); setTiendaDestinoFamilia(''); setCantidadesFamilia({}); }}
                                style={styles.modalCancelButton}
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={handleTransferirFamilia}
                                disabled={!tiendaDestinoFamilia || Object.values(cantidadesFamilia).every(c => !(parseInt(c, 10) > 0)) || loadingTransferirFamilia}
                                style={{ ...styles.modalConfirmButton, backgroundColor: '#7c3aed', opacity: (!tiendaDestinoFamilia || Object.values(cantidadesFamilia).every(c => !(parseInt(c, 10) > 0))) ? 0.5 : 1 }}
                            >
                                {loadingTransferirFamilia ? 'Transfiriendo…' : 'Confirmar'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <style>
                {`
                /* Achica fuente e íconos de la tabla de listado para que las acciones entren
                   sin scroll horizontal en pantallas de 13" a 100% de zoom. */
                .productos-tabla-wrap table {
                    font-size: 11.5px;
                }
                .productos-tabla-wrap .icon-btn {
                    width: 22px;
                    height: 22px;
                    font-size: 11px;
                }
                .productos-tabla-wrap .icon-btn svg {
                    width: 11px;
                    height: 11px;
                }
                .productos-tabla-wrap td[style*="white-space: nowrap"] > div {
                    gap: 4px !important;
                }
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
    sectionTitle: { color: '#475569', fontSize: '1.1rem', borderBottom: '1px solid #edf5f2', paddingBottom: '8px', marginTop: '1.5rem', marginBottom: '0.5rem' },
    form: { display: 'flex', gap: '20px', flexWrap: 'wrap', alignItems: 'flex-end' },
    inputGroup: { flex: '1 1 200px', display: 'flex', flexDirection: 'column' },
    label: { marginBottom: '5px', fontWeight: 'bold' },
    opcionalTag: { fontSize: 12, fontWeight: 400, color: '#94a3b8' },
    input: { padding: '8px', border: '1px solid #e2e8f0', borderRadius: '4px' },
    submitButton: { padding: '10px 15px', backgroundColor: '#5dc87a', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', alignSelf: 'flex-end' },
    tableHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' },
    printButton: { padding: '10px 15px', backgroundColor: '#5dc87a', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' },
    filtersContainer: { display: 'flex', gap: '10px', marginBottom: '20px' },
    filterInput: { flex: '1', padding: '8px', border: '1px solid #e2e8f0', borderRadius: '4px' },
    searchButton: { padding: '8px 15px', backgroundColor: '#5dc87a', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' },
    loadingMessage: { textAlign: 'center', color: '#777' },
    errorMessage: { color: '#e25252', padding: '10px', backgroundColor: '#fef2f2', border: '1px solid #fca5a5', borderRadius: '6px' },
    tableResponsive: { overflowX: 'auto' },
    table: { width: '100%', borderCollapse: 'collapse' },
    th: { padding: '4px 5px', borderBottom: '2px solid #e2e8f0', textAlign: 'left', backgroundColor: '#f7faf9' },
    td: { padding: '4px 5px', borderBottom: '1px solid #e2e8f0' },
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