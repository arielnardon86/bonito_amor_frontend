// components/PuntoVenta.js
// BONITO_AMOR/frontend/src/components/PuntoVenta.js
import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../AuthContext';
import { useSales } from './SalesContext'; 
import Swal from 'sweetalert2';


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

const PuntoVenta = () => {
    const { user, isAuthenticated, loading: authLoading, selectedStoreSlug, token } = useAuth();
    const navigate = useNavigate();

    const {
        carts,
        activeCart,
        activeCartId,
        createNewCart,
        selectCart,
        updateCartAlias,
        addProductToCart,
        removeProductFromCart,
        decrementProductQuantity,
        finalizeCart,
        deleteCart
    } = useSales();

    const [productos, setProductos] = useState([]);
    const [metodosPago, setMetodosPago] = useState([]);
    const [metodoPagoSeleccionado, setMetodoPagoSeleccionado] = useState('');
    
    const [arancelesTienda, setArancelesTienda] = useState([]); 
    const [arancelSeleccionadoId, setArancelSeleccionadoId] = useState(''); 
    
    // ESTADO ORIGINAL (NO SE TOCA, SOLO PARA CÓDIGO DE BARRAS)
    const [busquedaProducto, setBusquedaProducto] = useState('');
    
    // CAMBIO 1: NUEVO ESTADO PARA EL FILTRO INSTANTÁNEO DE LA TABLA
    const [filterTerm, setFilterTerm] = useState(''); 
    
    const [productoSeleccionado, setProductoSeleccionado] = useState(null);

    const [loadingProducts, setLoadingProducts] = useState(true);
    const [error, setError] = useState(null);

    const [showConfirmModal, setShowConfirmModal] = useState(false);
    const [confirmMessage, setConfirmMessage] = useState('');
    const [confirmAction, setConfirmAction] = useState(() => () => {});

    const [showAlertMessage, setShowAlertMessage] = useState(false);
    const [alertMessage, setAlertMessage] = useState('');
    const [alertType, setAlertType] = useState('success');

    const [showNewCartModal, setShowNewCartModal] = useState(false);
    const [newCartAliasInput, setNewCartAliasInput] = useState('');

    const [descuentoPorcentaje, setDescuentoPorcentaje] = useState('');
    const [descuentoMonto, setDescuentoMonto] = useState('');

    const [recargoPorcentaje, setRecargoPorcentaje] = useState('');
    const [recargoMonto, setRecargoMonto] = useState('');

    const [redondearMonto, setRedondearMonto] = useState(false);

    const [pageInfo, setPageInfo] = useState({
        next: null,
        previous: null,
        count: 0,
        currentPage: 1,
        totalPages: 1,
    });
    
    const [tiendaInfo, setTiendaInfo] = useState(null);
    
    // Función de alerta (no necesita useCallback)
    const showCustomAlert = (message, type = 'success') => {
        setAlertMessage(message);
        setAlertType(type);
        setShowAlertMessage(true);
        setTimeout(() => {
            setShowAlertMessage(false);
            setAlertMessage('');
            setAlertType('success');
        }, 3000);
    };

    // FUNCIÓN 0: Fetch de Métodos de Pago
    const fetchMetodosPago = useCallback(async () => {
        if (!token) return;
        const userType = user?.is_superuser ? 'ADMIN' : (user?.is_staff ? 'STAFF' : 'USER');
        console.log(`🔄 [${userType}] Cargando métodos de pago`);
        try {
            const response = await axios.get(`${BASE_API_ENDPOINT}/api/metodos-pago/`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const methods = response.data.results || response.data;
            console.log(`✅ [${userType}] Métodos de pago cargados:`, methods.map(m => ({
                id: m.id,
                nombre: m.nombre,
                es_financiero: m.es_financiero
            })));
            setMetodosPago(methods);
            const efectivo = methods.find(m => m.nombre === 'Efectivo');
            setMetodoPagoSeleccionado(efectivo ? efectivo.nombre : (methods.length > 0 ? methods[0].nombre : ''));
            return methods; 

        } catch (err) {
            console.error("Error al cargar métodos de pago:", err.response ? err.response.data : err.message);
            setError('Error al cargar métodos de pago.');
            throw err;
        }
    }, [token]);

    // FUNCIÓN 1: Fetch de Productos
    const fetchProductos = useCallback(async (page = 1, searchQuery = '') => {
        if (!token || !selectedStoreSlug) {
            return;
        }
        setError(null);
        try {
            const response = await axios.get(`${BASE_API_ENDPOINT}/api/productos/`, {
                headers: { 'Authorization': `Bearer ${token}` },
                params: {
                    tienda_slug: selectedStoreSlug,
                    search: searchQuery,
                    page: page,
                },
            });
            setProductos(response.data.results);
            setPageInfo(prev => ({
                ...prev,
                next: response.data.next,
                previous: response.data.previous,
                count: response.data.count,
                currentPage: page,
                totalPages: Math.ceil(response.data.count / 10), 
            }));
        } catch (err) {
            console.error("Error al cargar productos:", err.response ? err.response.data : err.message);
            setError('Error al cargar productos.');
            throw err;
        }
    }, [token, selectedStoreSlug]);

    // FUNCIÓN 2: Fetch de Aranceles
    const fetchAranceles = useCallback(async () => { 
        if (!token || !selectedStoreSlug) return;
        const userType = user?.is_superuser ? 'ADMIN' : (user?.is_staff ? 'STAFF' : 'USER');
        console.log(`🔄 [${userType}] Cargando aranceles para tienda: ${selectedStoreSlug}`);
        try {
            const response = await axios.get(`${BASE_API_ENDPOINT}/api/aranceles-tienda/`, {
                headers: { 'Authorization': `Bearer ${token}` },
                params: { tienda_slug: selectedStoreSlug }
            });
            const fetchedAranceles = response.data.results || response.data;
            console.log(`✅ [${userType}] Aranceles cargados: ${Array.isArray(fetchedAranceles) ? fetchedAranceles.length : 0} aranceles para tienda ${selectedStoreSlug}`, fetchedAranceles);
            if (Array.isArray(fetchedAranceles)) {
                console.log(`📋 [${userType}] Detalle de aranceles:`, fetchedAranceles.map(a => ({
                    id: a.id,
                    metodo_pago_nombre: a.metodo_pago_nombre,
                    nombre_plan: a.nombre_plan,
                    arancel_porcentaje: a.arancel_porcentaje
                })));
            }
            setArancelesTienda(Array.isArray(fetchedAranceles) ? fetchedAranceles : []);
        } catch (err) {
            console.error(`❌ [${userType}] Error al cargar aranceles:`, err.response ? err.response.data : err.message);
            console.error(`❌ [${userType}] URL:`, `${BASE_API_ENDPOINT}/api/aranceles-tienda/`);
            console.error(`❌ [${userType}] Params:`, { tienda_slug: selectedStoreSlug });
            console.error(`❌ [${userType}] Status:`, err.response?.status);
            setArancelesTienda([]); // Asegurar que sea un array vacío en caso de error
        }
    }, [token, selectedStoreSlug, user]);

    // FUNCIÓN 3: Fetch de Información de Tienda
    const fetchTiendaInfo = useCallback(async () => {
        if (!token || !selectedStoreSlug) return;
        try {
            const response = await axios.get(`${BASE_API_ENDPOINT}/api/tiendas/`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            
            // Manejar diferentes formatos de respuesta (array, objeto con results, o objeto único)
            let tiendas = [];
            if (Array.isArray(response.data)) {
                tiendas = response.data;
            } else if (response.data.results && Array.isArray(response.data.results)) {
                tiendas = response.data.results;
            } else if (response.data.nombre) {
                // Es un objeto único de tienda
                tiendas = [response.data];
            }
            
            // Buscar la tienda por nombre (comparación flexible)
            const tienda = tiendas.find(t => {
                const nombreTienda = t.nombre ? t.nombre.trim() : '';
                const slugTienda = selectedStoreSlug ? selectedStoreSlug.trim() : '';
                // Comparación exacta y también sin case sensitivity
                return nombreTienda === slugTienda || nombreTienda.toLowerCase() === slugTienda.toLowerCase();
            });
            
            if (tienda) {
                console.log('Tienda encontrada:', tienda.nombre, 'Tipo facturación:', tienda.tipo_facturacion);
                setTiendaInfo(tienda);
            } else {
                console.warn('Tienda no encontrada. Buscando:', selectedStoreSlug, 'Tiendas disponibles:', tiendas.map(t => t.nombre));
                setTiendaInfo(null);
            }
        } catch (err) {
            console.error("Error al cargar información de tienda:", err.response ? err.response.data : err.message);
            setTiendaInfo(null);
        }
    }, [token, selectedStoreSlug]);

    // **********************************************
    // EFECTO PRINCIPAL (Carga inicial)
    // **********************************************
    useEffect(() => {
        const loadInitialData = async () => {
            if (!authLoading && isAuthenticated && user && (user.is_superuser || user.is_staff) && selectedStoreSlug) {
                setLoadingProducts(true);
                setError(null);
                try {
                    await Promise.all([
                        fetchMetodosPago(),
                        fetchAranceles(),
                        fetchTiendaInfo()
                    ]);
                    // Se usa filterTerm para la carga inicial, para que esté en sync.
                    await fetchProductos(1, filterTerm); 
                } catch (err) {
                    console.error("Fallo al inicializar datos:", err);
                    setError(prev => prev || 'Fallo crítico al iniciar el Punto de Venta.');
                } finally {
                    setLoadingProducts(false);
                }
            } else if (!authLoading && (!isAuthenticated || !user || !(user.is_superuser || user.is_staff))) {
                setError("Acceso denegado. No tienes permisos para usar el punto de venta.");
                setLoadingProducts(false);
            } else if (!authLoading && isAuthenticated && user && (user.is_superuser || user.is_staff) && !selectedStoreSlug) {
                 setLoadingProducts(false);
            }
        };
        loadInitialData();
    }, [isAuthenticated, user, authLoading, selectedStoreSlug, token, 
        fetchMetodosPago, fetchAranceles, fetchTiendaInfo, fetchProductos, filterTerm]);

    // **********************************************
    // CAMBIO 2: NUEVO EFECTO CON DEBOUNCE PARA filterTerm
    // **********************************************
    useEffect(() => {
        setLoadingProducts(true);
        const handler = setTimeout(() => {
            if (selectedStoreSlug) { 
                // Llama a fetchProductos con el término de filtro después del delay
                fetchProductos(1, filterTerm)
                    .catch(err => console.error("Error al filtrar productos:", err))
                    .finally(() => setLoadingProducts(false));
            } else {
                 setLoadingProducts(false);
            }
        }, 500); // Debounce de 500ms
        
        // Función de limpieza para cancelar el timeout anterior si filterTerm cambia de nuevo
        return () => {
            clearTimeout(handler);
        };
    }, [filterTerm, fetchProductos, selectedStoreSlug]);
    // **********************************************
    
    // --- FUNCIÓN HELPER (Calcula total CON ajustes de usuario, SIN redondeo) ---
    const calculateTotalSinRedondeo = useCallback(() => {
        if (!activeCart) return 0;
        let subtotal = activeCart.items.reduce((sum, item) => sum + (item.quantity * parseFloat(item.product.precio)), 0);
        let finalTotal = subtotal;

        if (parseFloat(recargoMonto) > 0) { 
            finalTotal = subtotal + parseFloat(recargoMonto);
        } else if (parseFloat(recargoPorcentaje) > 0) {
            const markupAmount = subtotal * (parseFloat(recargoPorcentaje) / 100);
            finalTotal = subtotal + markupAmount;
        } else if (parseFloat(descuentoMonto) > 0) {
            finalTotal = Math.max(0, subtotal - parseFloat(descuentoMonto));
        } else if (parseFloat(descuentoPorcentaje) > 0) {
            const discountAmount = subtotal * (parseFloat(descuentoPorcentaje) / 100);
            finalTotal = subtotal - discountAmount;
        }
        
        return finalTotal;
    }, [activeCart, descuentoPorcentaje, descuentoMonto, recargoMonto, recargoPorcentaje]);
    
    // --- FUNCIÓN 3: CALCULO FINAL (Usa la helper + redondeo) ---
    const calculateFinalTotal = useCallback(() => {
        let totalConAjuste = calculateTotalSinRedondeo();
        
        if (redondearMonto) {
            totalConAjuste = Math.floor(totalConAjuste / 100) * 100;
        }
        
        return totalConAjuste;
    }, [calculateTotalSinRedondeo, redondearMonto]);

    // FUNCIÓN 4: Cálculo del Arancel
    const calculateArancel = useCallback(() => {
        const arancel = arancelesTienda.find(a => a.id === arancelSeleccionadoId);
        if (!arancel || !arancelSeleccionadoId) return 0;

        const totalConAjuste = calculateFinalTotal(); 
        const porcentaje = parseFloat(arancel.arancel_porcentaje);
        const arancelTotal = totalConAjuste * (porcentaje / 100);
        
        return arancelTotal;
    }, [arancelSeleccionadoId, arancelesTienda, calculateFinalTotal]);

    // FUNCIÓN 5: Lógica para Añadir Producto
    const handleAddProductoEnVenta = useCallback((product, quantity = 1) => {
        if (!activeCart) {
            showCustomAlert('Por favor, selecciona o crea un carrito antes de añadir productos.', 'info');
            return;
        }
        if (product.stock === 0) {
            showCustomAlert('Este producto no tiene stock disponible.', 'error');
            return;
        }
        if (quantity <= 0) {
            showCustomAlert('La cantidad debe ser mayor que cero.', 'error');
            return;
        }
        const currentItemInCart = activeCart.items.find(item => item.product.id === product.id);
        const currentQuantityInCart = currentItemInCart ? currentItemInCart.quantity : 0;
        if (currentQuantityInCart + quantity > product.stock) {
            showCustomAlert(`No hay suficiente stock. Disponible: ${product.stock}, en carrito: ${currentQuantityInCart}.`, 'error');
            return;
        }
        addProductToCart(product, quantity);
        setBusquedaProducto('');
        setProductoSeleccionado(null);
        showCustomAlert('Producto añadido al carrito.', 'success');
    }, [activeCart, addProductToCart]); 


    // FUNCIÓN 6: Búsqueda de Producto por Código de Barras (NO SE TOCA)
    const handleBuscarProducto = useCallback(async () => {
        if (!busquedaProducto) {
            showCustomAlert('Por favor, ingresa un código de barras o nombre para buscar.', 'info');
            return;
        }
        if (!selectedStoreSlug) {
            showCustomAlert('Por favor, selecciona una tienda.', 'error');
            return;
        }
        try {
            let response;
            try {
                 response = await axios.get(`${BASE_API_ENDPOINT}/api/productos/buscar_por_barcode/`, {
                    headers: { 'Authorization': `Bearer ${token}` },
                    params: { barcode: busquedaProducto, tienda_slug: selectedStoreSlug }
                });
            } catch (error) {
                if (error.response && error.response.status === 404) {
                    // Si no es un barcode, busca por nombre/código en el listado de abajo.
                    setFilterTerm(busquedaProducto); // <-- Actualiza el filtro de la tabla
                    showCustomAlert('Búsqueda por nombre aplicada al listado de abajo.', 'info');
                    setProductoSeleccionado(null);
                    setBusquedaProducto(''); // Limpia el input principal
                    return;
                }
                throw error; 
            }
            const productoEncontrado = response.data;
            setProductoSeleccionado(productoEncontrado);
            if (productoEncontrado) {
                handleAddProductoEnVenta(productoEncontrado, 1);
            }
        } catch (err) {
            console.error("Error al buscar producto:", err.response ? err.response.data : err.message);
            setProductoSeleccionado(null);
            showCustomAlert('Producto no encontrado o error en la búsqueda.', 'error');
        }
    }, [busquedaProducto, selectedStoreSlug, token, handleAddProductoEnVenta]); 

    // FUNCIÓN 7: Decrementar Cantidad
    const handleDecrementQuantity = useCallback((productId) => {
        if (!activeCart) return;
        decrementProductQuantity(activeCartId, productId);
        showCustomAlert('Cantidad de producto actualizada.', 'info');
    }, [activeCart, activeCartId, decrementProductQuantity]); 

    // FUNCIÓN 8: Eliminar Producto
    const handleRemoveProductoEnVenta = useCallback((productId) => {
        if (!activeCart) return;
        setConfirmMessage('¿Estás seguro de que quieres quitar este producto del carrito?');
        setConfirmAction(() => () => {
            removeProductFromCart(activeCartId, productId);
            showCustomAlert('Producto eliminado del carrito.', 'info');
            setShowConfirmModal(false);
        });
        setShowConfirmModal(true);
    }, [activeCart, activeCartId, removeProductFromCart]); 

    // Lógica para determinar si el método seleccionado es financiero
    const metodoPagoObj = metodosPago.find(m => m.nombre === metodoPagoSeleccionado);
    const isMetodoFinancieroActivo = metodoPagoObj?.es_financiero;
    
    // Filtrar los aranceles disponibles para el método de pago seleccionado
    // Usar comparación flexible (trim y case-insensitive) para evitar problemas de formato
    const arancelesDisponibles = arancelesTienda.filter(a => {
        const nombreArancel = (a.metodo_pago_nombre || '').trim();
        const nombreSeleccionado = (metodoPagoSeleccionado || '').trim();
        const coincide = nombreArancel === nombreSeleccionado || 
                        nombreArancel.toLowerCase() === nombreSeleccionado.toLowerCase();
        if (isMetodoFinancieroActivo && !coincide) {
            console.log(`⚠️ Arancel no coincide: metodo_pago_nombre="${nombreArancel}" vs seleccionado="${nombreSeleccionado}"`, a);
        }
        return coincide;
    });
    
    // Log detallado cuando se selecciona un método de pago
    useEffect(() => {
        if (metodoPagoSeleccionado) {
            const userType = user?.is_superuser ? 'ADMIN' : (user?.is_staff ? 'STAFF' : 'USER');
            console.log(`🔄 [${userType}] Método de pago seleccionado: "${metodoPagoSeleccionado}"`, {
                metodoPagoObj: metodoPagoObj,
                es_financiero: metodoPagoObj?.es_financiero,
                isMetodoFinancieroActivo: isMetodoFinancieroActivo,
                arancelesTienda_count: arancelesTienda.length,
                arancelesDisponibles_count: arancelesDisponibles.length
            });
        }
    }, [metodoPagoSeleccionado, metodoPagoObj, isMetodoFinancieroActivo, user, arancelesTienda.length, arancelesDisponibles.length]);
    
    // Log para debug
    if (isMetodoFinancieroActivo) {
        console.log(`📊 Método financiero seleccionado: "${metodoPagoSeleccionado}"`);
        console.log(`📊 Total aranceles cargados: ${arancelesTienda.length}`);
        console.log(`📊 Todos los aranceles cargados:`, arancelesTienda.map(a => ({
            id: a.id,
            metodo_pago_nombre: a.metodo_pago_nombre,
            nombre_plan: a.nombre_plan
        })));
        console.log(`📊 Aranceles disponibles para "${metodoPagoSeleccionado}": ${arancelesDisponibles.length}`, arancelesDisponibles);
        if (arancelesDisponibles.length === 0 && arancelesTienda.length > 0) {
            console.warn(`⚠️ No se encontraron aranceles para "${metodoPagoSeleccionado}" pero hay ${arancelesTienda.length} aranceles cargados. Métodos disponibles:`, 
                [...new Set(arancelesTienda.map(a => a.metodo_pago_nombre))]);
        }
    }
    
    // EFECTO CLAVE para la lógica del desplegable de aranceles
    useEffect(() => {
        if (isMetodoFinancieroActivo && arancelesDisponibles.length > 0) {
            const currentPlanExists = arancelesDisponibles.some(a => a.id === arancelSeleccionadoId);
            if (!arancelSeleccionadoId || !currentPlanExists) {
                 setArancelSeleccionadoId(arancelesDisponibles[0].id);
            }
        } else if (!isMetodoFinancieroActivo) {
            setArancelSeleccionadoId(''); // Limpiar si no es financiero
        }
    }, [metodoPagoSeleccionado, isMetodoFinancieroActivo, arancelesDisponibles, arancelSeleccionadoId]);


    // --- FUNCIÓN handleProcesarVenta (LÓGICA DE REDONDEO INCLUIDA) ---
    const handleProcesarVenta = async () => {
        
        if (!activeCart || activeCart.items.length === 0) {
            showCustomAlert('El carrito activo está vacío. Agrega productos para procesar la venta.', 'error');
            return;
        }
        if (!metodoPagoSeleccionado) {
            showCustomAlert('Por favor, selecciona un método de pago.', 'error');
            return;
        }
        if (!selectedStoreSlug) {
            showCustomAlert('Por favor, selecciona una tienda.', 'error');
            return;
        }

        const metodoPagoObj = metodosPago.find(m => m.nombre === metodoPagoSeleccionado);
        const isMetodoFinanciero = metodoPagoObj?.es_financiero;
        // Normalizar: convertir cadena vacía a null
        const arancelIdNormalizado = arancelSeleccionadoId && arancelSeleccionadoId.trim() !== '' ? arancelSeleccionadoId : null;
        const finalArancelId = isMetodoFinanciero ? arancelIdNormalizado : null;
        const arancelInfo = arancelesTienda.find(a => a.id === finalArancelId);

        if (isMetodoFinanciero && !finalArancelId) {
            Swal.fire('Error', 'Por favor, selecciona el Plan / Arancel.', 'error');
            return;
        }
        
        const isDiscountApplied = parseFloat(descuentoMonto) > 0 || parseFloat(descuentoPorcentaje) > 0;
        const isSurchargeApplied = parseFloat(recargoMonto) > 0 || parseFloat(recargoPorcentaje) > 0;

        if (redondearMonto && (isDiscountApplied || isSurchargeApplied)) {
            const confirmOverride = await Swal.fire({
                title: 'Aviso de Redondeo',
                text: 'El redondeo se aplicará sobre el ajuste (descuento/recargo) que ya ingresaste. El monto final se recalculará.',
                icon: 'info',
                showCancelButton: true,
                confirmButtonText: 'Continuar',
                cancelButtonText: 'Cancelar'
            });
            if (!confirmOverride.isConfirmed) {
                return; 
            }
        } else if (isDiscountApplied && isSurchargeApplied) {
             Swal.fire('Error', 'Solo se puede aplicar un tipo de ajuste (descuento o recargo) a la vez.', 'error');
             return;
        }

        // --- LÓGICA DE CÁLCULO PARA BACKEND ---
        const subtotalCrudo = activeCart.total; // Subtotal sin ajustes
        const finalTotal = calculateFinalTotal(); // Total FINAL (con ajustes Y redondeo si aplica)
        const arancelMonto = calculateArancel(); 

        let datosAjusteParaBackend = {
            descuento_porcentaje: parseFloat(descuentoPorcentaje) || 0,
            descuento_monto: parseFloat(descuentoMonto) || 0,
            recargo_porcentaje: parseFloat(recargoPorcentaje) || 0,
            recargo_monto: parseFloat(recargoMonto) || 0,
        };

        if (redondearMonto) {
            // Si hay redondeo, calculamos el ajuste total (negativo o positivo)
            // y lo enviamos como UN solo campo (monto) al backend.
            const ajusteTotalEfectivo = finalTotal - subtotalCrudo;

            datosAjusteParaBackend = { // Reseteamos
                descuento_porcentaje: 0,
                descuento_monto: 0,
                recargo_porcentaje: 0,
                recargo_monto: 0,
            };

            if (ajusteTotalEfectivo < 0) {
                datosAjusteParaBackend.descuento_monto = Math.abs(ajusteTotalEfectivo);
            } else if (ajusteTotalEfectivo > 0) {
                datosAjusteParaBackend.recargo_monto = ajusteTotalEfectivo;
            }
        }
        // --- FIN LÓGICA CÁLCULO BACKEND ---

        let htmlMessage = `Confirmas la venta por un total de <strong>$${finalTotal.toFixed(2)}</strong> con <strong>${metodoPagoSeleccionado}</strong>?`;
        
        if (arancelMonto > 0) {
            htmlMessage += `<br><br><strong>Plan/Arancel:</strong> ${arancelInfo.nombre_plan} (${parseFloat(arancelInfo.arancel_porcentaje).toFixed(2)}%)`;
            htmlMessage += `<br><strong>Monto del Arancel (Egreso):</strong> $${arancelMonto.toFixed(2)}`;
        }

        // Mensaje de ajuste (Recargo o Descuento)
        let adjustmentMessage = '';
        if (datosAjusteParaBackend.recargo_monto > 0) {
            adjustmentMessage = `<br>(Ajuste Total: +$${datosAjusteParaBackend.recargo_monto.toFixed(2)})`;
        } else if (datosAjusteParaBackend.recargo_porcentaje > 0) {
            adjustmentMessage = `<br>(Recargo: ${datosAjusteParaBackend.recargo_porcentaje.toFixed(2)}%)`;
        } else if (datosAjusteParaBackend.descuento_monto > 0) {
            adjustmentMessage = `<br>(Ajuste Total: -$${datosAjusteParaBackend.descuento_monto.toFixed(2)})`;
        } else if (datosAjusteParaBackend.descuento_porcentaje > 0) {
            adjustmentMessage = `<br>(Descuento: ${datosAjusteParaBackend.descuento_porcentaje.toFixed(2)}%)`;
        }
        
        if (redondearMonto) {
             htmlMessage += `<br><strong>(Monto final redondeado a $${finalTotal.toFixed(2)})</strong>`;
             if (adjustmentMessage) {
                 htmlMessage += adjustmentMessage;
             }
        } else {
            htmlMessage += adjustmentMessage;
        }

        Swal.fire({
            title: '¿Confirmar venta?',
            html: htmlMessage,
            icon: 'question',
            showCancelButton: true,
            confirmButtonText: 'Sí, confirmar',
            cancelButtonText: 'Cancelar',
        }).then(async (result) => {
            if (result.isConfirmed) {
                try {
                    const ventaData = {
                        tienda_slug: selectedStoreSlug,
                        metodo_pago: metodoPagoSeleccionado,
                        ...datosAjusteParaBackend, // Se envían los datos calculados
                        arancel_aplicado_id: finalArancelId || null, // Asegurar que sea null si está vacío
                        detalles: activeCart.items.map(item => ({
                            producto: item.product.id,
                            cantidad: item.quantity,
                            precio_unitario: parseFloat(item.product.precio),
                        })),
                    };

                    const response = await axios.post(`${BASE_API_ENDPOINT}/api/ventas/`, ventaData, {
                        headers: { 'Authorization': `Bearer ${token}` },
                    });
                    
                    showCustomAlert('Venta procesada con éxito. ID: ' + response.data.id, 'success');
                    
                    const ventaParaRecibo = {
                        ...response.data, 
                        tienda_nombre: selectedStoreSlug,
                        descuento_porcentaje: datosAjusteParaBackend.descuento_porcentaje,
                        descuento_monto: datosAjusteParaBackend.descuento_monto,
                        recargo_porcentaje: datosAjusteParaBackend.recargo_porcentaje,
                        recargo_monto: datosAjusteParaBackend.recargo_monto,
                        total: finalTotal, // El total final que VIO el usuario (redondeado o no)
                        fecha_venta: response.data.fecha_venta, 
                        usuario_nombre: user?.first_name || user?.username || 'Usuario Desconocido',
                        metodo_pago: metodoPagoSeleccionado, 
                        arancel_aplicado_nombre: arancelInfo?.nombre_plan || null,
                        arancel_aplicado_porcentaje: arancelInfo?.arancel_porcentaje || null,
                        detalles: activeCart.items.map(item => ({
                            producto_nombre: item.product.nombre,
                            cantidad: item.quantity,
                            precio_unitario: parseFloat(item.product.precio)
                        }))
                    };

                    finalizeCart(activeCartId);
                    setMetodoPagoSeleccionado(metodosPago.find(m => m.nombre === 'Efectivo')?.nombre || (metodosPago.length > 0 ? metodosPago[0].nombre : ''));
                    setArancelSeleccionadoId('');
                    setDescuentoPorcentaje('');
                    setDescuentoMonto('');
                    setRecargoPorcentaje('');
                    setRecargoMonto('');
                    setRedondearMonto(false);
                    
                    // Verificar si la tienda tiene facturación configurada
                    // Asegurarnos de tener la información más actualizada de la tienda
                    let tiendaActual = tiendaInfo;
                    if (!tiendaActual || !tiendaActual.tipo_facturacion) {
                        // Si no tenemos la info o no está actualizada, obtenerla ahora
                        try {
                            const tiendaResponse = await axios.get(`${BASE_API_ENDPOINT}/api/tiendas/`, {
                                headers: { 'Authorization': `Bearer ${token}` }
                            });
                            
                            // Manejar diferentes formatos de respuesta
                            let tiendas = [];
                            if (Array.isArray(tiendaResponse.data)) {
                                tiendas = tiendaResponse.data;
                            } else if (tiendaResponse.data.results && Array.isArray(tiendaResponse.data.results)) {
                                tiendas = tiendaResponse.data.results;
                            } else if (tiendaResponse.data.nombre) {
                                tiendas = [tiendaResponse.data];
                            }
                            
                            // Buscar la tienda por nombre
                            tiendaActual = tiendas.find(t => {
                                const nombreTienda = t.nombre ? t.nombre.trim() : '';
                                const slugTienda = selectedStoreSlug ? selectedStoreSlug.trim() : '';
                                return nombreTienda === slugTienda || nombreTienda.toLowerCase() === slugTienda.toLowerCase();
                            });
                            
                            if (tiendaActual) {
                                setTiendaInfo(tiendaActual);
                            }
                        } catch (err) {
                            console.error("Error al obtener información de tienda:", err);
                        }
                    }
                    
                    const tieneFacturacion = tiendaActual && tiendaActual.tipo_facturacion && tiendaActual.tipo_facturacion !== 'NINGUNA';
                    
                    // Debug log
                    console.log('Información de facturación:', {
                        tiendaActual,
                        tipo_facturacion: tiendaActual?.tipo_facturacion,
                        tieneFacturacion,
                        selectedStoreSlug
                    });
                    
                    // Preguntar si quiere facturar (solo si tiene facturación configurada)
                    if (tieneFacturacion) {
                        Swal.fire({
                            title: 'Venta procesada!',
                            text: '¿Desea emitir una factura electrónica?',
                            icon: 'success',
                            showCancelButton: true,
                            showDenyButton: true,
                            confirmButtonText: 'Sí, facturar',
                            denyButtonText: 'Solo recibo',
                            cancelButtonText: 'No, nada',
                        }).then(async (result) => {
                            if (result.isConfirmed) {
                                // Mostrar formulario para datos del cliente
                                const { value: formValues } = await Swal.fire({
                                    title: 'Datos del Cliente para Factura',
                                    html: `
                                        <input id="cliente_nombre" class="swal2-input" placeholder="Nombre del cliente *" required>
                                        <input id="cliente_cuit" class="swal2-input" placeholder="CUIT (opcional)" type="text">
                                        <input id="cliente_domicilio" class="swal2-input" placeholder="Domicilio (opcional)">
                                        <select id="cliente_condicion_iva" class="swal2-input" style="width: 100%; padding: 0.625em; border: 1px solid #d9d9d9; border-radius: 0.1875em; font-size: 1.125em;">
                                            <option value="CF" selected>Consumidor Final</option>
                                            <option value="RI">Responsable Inscripto</option>
                                            <option value="EX">Exento</option>
                                            <option value="MT">Monotributo</option>
                                            <option value="NR">No Responsable</option>
                                        </select>
                                    `,
                                    focusConfirm: false,
                                    showCancelButton: true,
                                    confirmButtonText: 'Emitir Factura',
                                    cancelButtonText: 'Cancelar',
                                    preConfirm: () => {
                                        const nombre = document.getElementById('cliente_nombre').value;
                                        const cuit = document.getElementById('cliente_cuit').value;
                                        const domicilio = document.getElementById('cliente_domicilio').value;
                                        const condicionIva = document.getElementById('cliente_condicion_iva').value;
                                        
                                        if (!nombre || nombre.trim() === '') {
                                            Swal.showValidationMessage('El nombre del cliente es requerido');
                                            return false;
                                        }
                                        
                                        return {
                                            cliente_nombre: nombre.trim(),
                                            cliente_cuit: cuit.trim() || null,
                                            cliente_domicilio: domicilio.trim() || null,
                                            cliente_condicion_iva: condicionIva
                                        };
                                    }
                                });

                                if (formValues) {
                                    try {
                                        // Llamar al endpoint de facturación
                                        const facturaResponse = await axios.post(
                                            `${BASE_API_ENDPOINT}/api/ventas/${response.data.id}/emitir_factura/`,
                                            {
                                                venta_id: response.data.id,
                                                ...formValues
                                            },
                                            {
                                                headers: { 'Authorization': `Bearer ${token}` }
                                            }
                                        );
                                        
                                        // Obtener los datos completos de la factura desde la respuesta
                                        const facturaData = facturaResponse.data.factura || facturaResponse.data;
                                        
                                        // Navegar directamente a la página de impresión de factura sin preguntar
                                        navigate('/factura', { 
                                            state: { 
                                                factura: facturaData,
                                                venta: ventaParaRecibo,
                                                skipReciboPrompt: true
                                            } 
                                        });
                                    } catch (facturaError) {
                                        console.error('Error al emitir factura:', facturaError.response ? facturaError.response.data : facturaError.message);
                                        Swal.fire({
                                            title: 'Error al emitir factura',
                                            html: facturaError.response && facturaError.response.data 
                                                ? (facturaError.response.data.error || JSON.stringify(facturaError.response.data))
                                                : facturaError.message,
                                            icon: 'error',
                                            confirmButtonText: 'Ok'
                                        }).then(() => {
                                            // Si falló la factura, ir directo al recibo
                                            navigate('/recibo', { state: { venta: ventaParaRecibo } });
                                        });
                                    }
                                } else {
                                    // Si canceló el formulario de factura, ir directo al recibo
                                    navigate('/recibo', { state: { venta: ventaParaRecibo } });
                                }
                            } else if (result.isDenied) {
                                // Solo recibo - ir directo sin preguntar
                                navigate('/recibo', { state: { venta: ventaParaRecibo } });
                            } else if (result.isDismissed) {
                                // Si canceló, no hacer nada (solo procesar venta)
                            }
                            // Si canceló, no hace nada
                        });
                    } else {
                        // No tiene facturación configurada, ir directo al recibo
                        navigate('/recibo', { state: { venta: ventaParaRecibo } });
                    }

                } catch (err) {
                    console.error('Error al procesar la venta:', err.response ? JSON.stringify(err.response.data) : err.message);
                    Swal.fire({
                        title: 'Error!',
                        html: 'Error al procesar la venta: <br>' + (err.response && err.response.data ? Object.values(err.response.data).flat().join('<br>') : err.message),
                        icon: 'error',
                        confirmButtonText: 'Ok'
                    });
                }
            }
        });
    };

    const handleCreateNewCartWithAlias = () => {
        if (newCartAliasInput.trim() === '') {
            showCustomAlert('El alias de la venta no puede estar vacío.', 'error');
            return;
        }
        createNewCart(newCartAliasInput.trim());
        setNewCartAliasInput('');
        setShowNewCartModal(false);
        showCustomAlert('Nueva venta creada.', 'success');
    };

    const handleDeleteActiveCart = () => {
        if (activeCart) {
            setConfirmMessage(`¿Estás seguro de que quieres eliminar la venta "${activeCart.alias || activeCart.name}"? Esta acción no se puede deshacer.`);
            setConfirmAction(() => () => {
                deleteCart(activeCartId);
                showCustomAlert('Venta eliminada.', 'info');
                setShowConfirmModal(false);
            });
            setShowConfirmModal(true);
        }
    };

    const nextPageHandler = () => {
        if (pageInfo.next) {
            fetchProductos(pageInfo.currentPage + 1, filterTerm); // <-- Usa filterTerm
        }
    };

    const prevPageHandler = () => {
        if (pageInfo.previous) {
            fetchProductos(pageInfo.currentPage - 1, filterTerm); // <-- Usa filterTerm
        }
    };

    if (authLoading || (isAuthenticated && !user)) {
        return <div style={styles.loadingMessage}>Cargando datos de usuario...</div>;
    }

    if (!isAuthenticated || !(user.is_superuser || user.is_staff)) {
        return <div style={styles.accessDeniedMessage}>Acceso denegado. No tienes permisos para usar el punto de venta.</div>;
    }

    if (!selectedStoreSlug) {
        return (
            <div style={styles.noStoreSelectedMessage}>
                <p>Selecciona una tienda en el menú para usar el punto de venta.</p>
            </div>
        );
    }

    if (error) {
        return <div style={styles.errorMessage}>{error}</div>;
    }

    return (
        <div style={styles.container}>
            <h1 style={styles.header}>Punto de Venta</h1>
            
            {/* --- SECCIÓN VENTAS ACTIVAS (buscador + carrito integrados) --- */}
            <div style={styles.section} className="punto-venta-ventas-activas">
                <h2 style={styles.sectionHeader}>Ventas activas</h2>
                <div style={styles.cartSelectionContainer} className="cart-selection-container">
                    {carts.map((cart, index) => (
                        <button
                            key={cart.id}
                            onClick={() => selectCart(cart.id)}
                            style={cart.id === activeCartId ? styles.activeCartButton : styles.inactiveCartButton}
                            className={cart.id === activeCartId ? 'active-cart-button' : 'inactive-cart-button'}
                        >
                            {cart.alias || `Venta ${index + 1}`}
                        </button>
                    ))}
                    <button onClick={() => setShowNewCartModal(true)} style={styles.newCartButton} className="new-cart-button">
                        + Nueva Venta
                    </button>
                </div>

                {activeCart && (
                    <div style={styles.activeCartInfo} className="active-cart-info">
                        <span style={styles.activeCartTitle}>Venta: {activeCart.alias || activeCart.name}</span>
                        <div style={styles.activeCartActions} className="active-cart-actions">
                            <input
                                type="text"
                                placeholder="Alias (opcional)"
                                value={activeCart.alias || ''}
                                onChange={(e) => updateCartAlias(activeCartId, e.target.value)}
                                style={styles.inputField}
                            />
                            <button onClick={handleDeleteActiveCart} style={styles.deleteCartButton}>
                                Eliminar
                            </button>
                        </div>
                    </div>
                )}

                <div style={styles.searchRow} className="search-row">
                    <div style={{ ...styles.inputGroup, marginBottom: 0 }} className="input-group">
                        <input
                            type="text"
                            placeholder="Código de barras o nombre"
                            value={busquedaProducto}
                            onChange={(e) => setBusquedaProducto(e.target.value)}
                            onKeyPress={(e) => { if (e.key === 'Enter') handleBuscarProducto(); }}
                            style={styles.inputField}
                            className="input-field"
                        />
                        <button onClick={handleBuscarProducto} style={styles.primaryButton} className="primary-button">
                            Buscar
                        </button>
                    </div>
                </div>

                {productoSeleccionado && (
                    <div style={styles.foundProductCard} className="found-product-card">
                        <p style={styles.foundProductText}>
                            <strong>{productoSeleccionado.nombre}</strong> — ${parseFloat(productoSeleccionado.precio).toFixed(2)} · Stock: {productoSeleccionado.stock}
                        </p>
                        <div style={styles.productActions} className="product-actions">
                            <button
                                onClick={() => handleAddProductoEnVenta(productoSeleccionado, 1)}
                                disabled={productoSeleccionado.stock === 0}
                                style={productoSeleccionado.stock === 0 ? styles.disabledButton : styles.addProductButton}
                            >
                                {productoSeleccionado.stock === 0 ? 'Sin stock' : 'Añadir 1 Ud.'}
                            </button>
                        </div>
                    </div>
                )}

                {activeCart && activeCart.items.length > 0 ? (
                    <>
                        <div style={styles.cartTableWrap} className="cart-table-wrap">
                            <div style={styles.tableResponsive} className="table-responsive">
                                <table style={styles.table} className="table">
                                    <thead>
                                        <tr style={styles.tableHeaderRow}>
                                            <th style={styles.th}>Producto</th>
                                            <th style={styles.th}>Cant.</th>
                                            <th style={styles.th}>P. unit.</th>
                                            <th style={styles.th}>Subtotal</th>
                                            <th style={styles.th}>Acciones</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {activeCart.items.map((item) => (
                                            <tr key={item.product.id} style={styles.tableRow}>
                                                <td style={styles.td}>{item.product.nombre}</td>
                                                <td style={styles.td}>
                                                    <div style={styles.quantityControl} className="quantity-control">
                                                        <button onClick={() => handleDecrementQuantity(item.product.id)} style={styles.quantityButton}>−</button>
                                                        <span style={styles.quantityText}>{item.quantity}</span>
                                                        <button onClick={() => handleAddProductoEnVenta(item.product, 1)} style={styles.quantityButton}>+</button>
                                                    </div>
                                                </td>
                                                <td style={styles.td}>${parseFloat(item.product.precio).toFixed(2)}</td>
                                                <td style={styles.td}>${(item.quantity * parseFloat(item.product.precio)).toFixed(2)}</td>
                                                <td style={styles.td}>
                                                    <button onClick={() => handleRemoveProductoEnVenta(item.product.id)} style={styles.removeButton}>
                                                        Quitar
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                        <h4 style={styles.totalVenta}>Subtotal: ${activeCart.total.toFixed(2)}</h4>
                        <div style={styles.paymentMethodSelectContainer} className="payment-method-select-container">
                            <label htmlFor="metodoPago" style={styles.paymentMethodLabel}>Método de pago</label>
                            <select
                                id="metodoPago"
                                value={metodoPagoSeleccionado}
                                onChange={(e) => setMetodoPagoSeleccionado(e.target.value)}
                                style={styles.inputField}
                            >
                                <option value="">Seleccionar método</option>
                                {metodosPago.map(method => (
                                    <option key={method.id} value={method.nombre}>{method.nombre}</option>
                                ))}
                            </select>
                        </div>
                        {isMetodoFinancieroActivo && (
                            <div style={styles.paymentMethodSelectContainer} className="payment-method-select-container">
                                <label htmlFor="arancelPlan" style={styles.paymentMethodLabel}>Plan / Arancel</label>
                                {arancelesDisponibles.length > 0 ? (
                                    <select
                                        id="arancelPlan"
                                        value={arancelSeleccionadoId}
                                        onChange={(e) => setArancelSeleccionadoId(e.target.value)}
                                        style={styles.inputField}
                                        required
                                    >
                                        <option value="">Seleccionar plan</option>
                                        {arancelesDisponibles.map(arancel => (
                                            <option key={arancel.id} value={arancel.id}>
                                                {arancel.nombre_plan} ({parseFloat(arancel.arancel_porcentaje).toFixed(2)}%)
                                            </option>
                                        ))}
                                    </select>
                                ) : (
                                    <div style={styles.arancelWarning}>
                                        No hay planes configurados para {metodoPagoSeleccionado}. Contacta al administrador.
                                    </div>
                                )}
                            </div>
                        )}
                        {isMetodoFinancieroActivo && arancelSeleccionadoId && (
                            <p style={styles.arancelDisplay}>Arancel: ${calculateArancel().toFixed(2)}</p>
                        )}
                        <div style={styles.ajustesContainer} className="ajustesContainer">
                            <div style={styles.ajusteGrupo} className="ajusteGrupo">
                                <label htmlFor="recargoMonto" style={styles.ajusteLabel}>Recargo $</label>
                                <input
                                    type="number"
                                    id="recargoMonto"
                                    value={recargoMonto}
                                    onChange={(e) => {
                                        setRecargoMonto(Math.max(0, parseFloat(e.target.value) || 0));
                                        setRecargoPorcentaje(''); setDescuentoMonto(''); setDescuentoPorcentaje('');
                                    }}
                                    style={styles.ajusteInput}
                                    min="0"
                                />
                                <span style={styles.ajusteSeparador}>o %</span>
                                <input
                                    type="number"
                                    id="recargoPorcentaje"
                                    value={recargoPorcentaje}
                                    onChange={(e) => {
                                        setRecargoPorcentaje(Math.max(0, parseFloat(e.target.value) || 0));
                                        setRecargoMonto(''); setDescuentoMonto(''); setDescuentoPorcentaje('');
                                    }}
                                    style={styles.ajusteInput}
                                    min="0"
                                />
                            </div>
                            <div style={styles.ajusteGrupo} className="ajusteGrupo">
                                <label htmlFor="descuentoMonto" style={styles.ajusteLabel}>Descuento $</label>
                                <input
                                    type="number"
                                    id="descuentoMonto"
                                    value={descuentoMonto}
                                    onChange={(e) => {
                                        setDescuentoMonto(Math.max(0, parseFloat(e.target.value) || 0));
                                        setDescuentoPorcentaje(''); setRecargoMonto(''); setRecargoPorcentaje('');
                                    }}
                                    style={styles.ajusteInput}
                                    min="0"
                                />
                                <span style={styles.ajusteSeparador}>o %</span>
                                <input
                                    type="number"
                                    id="descuentoPorcentaje"
                                    value={descuentoPorcentaje}
                                    onChange={(e) => {
                                        setDescuentoPorcentaje(Math.max(0, Math.min(100, parseFloat(e.target.value) || 0)));
                                        setDescuentoMonto(''); setRecargoMonto(''); setRecargoPorcentaje('');
                                    }}
                                    style={styles.ajusteInput}
                                    min="0"
                                    max="100"
                                />
                            </div>
                        </div>
                        <div style={styles.redondearRow}>
                            <input
                                type="checkbox"
                                id="redondearMonto"
                                checked={redondearMonto}
                                onChange={(e) => setRedondearMonto(e.target.checked)}
                            />
                            <label htmlFor="redondearMonto" style={styles.redondearLabel}>Redondear total (múlt. 100 ↓)</label>
                        </div>
                        <h4 style={styles.finalTotalVenta}>Total: ${calculateFinalTotal().toFixed(2)}</h4>
                        <button onClick={handleProcesarVenta} style={styles.processSaleButton} className="process-sale-button">
                            Procesar venta
                        </button>
                    </>
                ) : (
                    <p style={styles.noDataMessage}>Carrito vacío. Busca productos por código de barras o en la lista de abajo.</p>
                )}
            </div>

            {/* --- MODAL NUEVA VENTA --- */}
            {showNewCartModal && (
                <div style={styles.modalOverlay}>
                    <div style={styles.modalContent}>
                        <h3 style={styles.modalHeader}>Nueva venta</h3>
                        <input
                            type="text"
                            placeholder="Alias (ej: Cliente A)"
                            value={newCartAliasInput}
                            onChange={(e) => setNewCartAliasInput(e.target.value)}
                            style={styles.inputField}
                        />
                        <div style={styles.modalActions}>
                            <button onClick={() => setShowNewCartModal(false)} style={styles.modalCancelButton}>Cancelar</button>
                            <button onClick={handleCreateNewCartWithAlias} style={styles.modalConfirmButton}>Crear</button>
                        </div>
                    </div>
                </div>
            )}

            {/* --- SECCIÓN PRODUCTOS DISPONIBLES (BUSQUEDA INSTANTÁNEA IMPLEMENTADA) --- */}
            <div style={styles.section}>
                <h2 style={styles.sectionHeader}>Productos</h2>
                <div style={styles.inputGroup} className="input-group">
                    {/* CAMBIO 3: USAR filterTerm Y REMOVER HANDLERS EXPLÍCITOS DE BUSQUEDA */}
                    <input
                        type="text"
                        placeholder="Buscar por nombre..."
                        value={filterTerm}
                        onChange={(e) => setFilterTerm(e.target.value)}
                        style={styles.inputField}
                        className="input-field"
                    />
                    {/* El botón de Buscar ya no es necesario aquí */}
                </div>

                {loadingProducts ? (
                    <p style={styles.loadingMessage}>Cargando productos...</p>
                ) : error ? (
                    <p style={styles.errorMessage}>{error}</p>
                ) : (
                    <>
                        <div style={styles.tableResponsive} className="table-responsive">
                            <table style={styles.table} className="table">
                                <thead>
                                    <tr style={styles.tableHeaderRow}>
                                        <th style={styles.th}>Nombre</th>
                                        <th style={styles.th}>Precio</th>
                                        <th style={styles.th}>Stock</th>
                                        <th style={styles.th}>Acción</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {productos.length > 0 ? (
                                        productos.map(product => (
                                            <tr key={product.id} style={styles.tableRow}>
                                                <td style={styles.td}>{product.nombre}</td>
                                                <td style={styles.td}>${parseFloat(product.precio).toFixed(2)}</td>
                                                <td style={styles.td}>{product.stock}</td>
                                                <td style={styles.td}>
                                                    <button
                                                        onClick={() => handleAddProductoEnVenta(product, 1)}
                                                        disabled={product.stock === 0}
                                                        style={product.stock === 0 ? styles.disabledButton : styles.addButton}
                                                    >
                                                        {product.stock === 0 ? 'Sin Stock' : 'Añadir'}
                                                    </button>
                                                </td>
                                            </tr>
                                        ))
                                    ) : (
                                        <tr>
                                            <td colSpan="4" style={styles.noDataMessage}>
                                                No se encontraron productos con el filtro aplicado.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>

                        {pageInfo.totalPages > 1 && (
                            <div style={styles.paginationContainer} className="pagination-container">
                                <button onClick={nextPageHandler} disabled={!pageInfo.next} style={styles.paginationButton} className="pagination-button">
                                    Siguiente
                                </button>
                                <span style={styles.pageNumber}>Página {pageInfo.currentPage} de {pageInfo.totalPages}</span>
                                <button onClick={prevPageHandler} disabled={!pageInfo.previous} style={styles.paginationButton} className="pagination-button">
                                    Anterior
                                </button>
                            </div>
                        )}
                    </>
                )}
            </div>

            {/* --- MODAL DE CONFIRMACIÓN --- */}
            {showConfirmModal && (
                <div style={styles.modalOverlay}>
                    <div style={styles.modalContent}>
                        <p style={styles.modalMessage}>{confirmMessage}</p>
                        <div style={styles.modalActions}>
                            <button onClick={confirmAction} style={styles.modalConfirmButton}>Sí</button>
                            <button onClick={() => setShowConfirmModal(false)} style={styles.modalCancelButton}>No</button>
                        </div>
                    </div>
                </div>
            )}

            {/* --- ALERTA CUSTOM --- */}
            {showAlertMessage && (
                <div style={{ ...styles.alertBox, backgroundColor: alertType === 'error' ? '#dc3545' : (alertType === 'info' ? '#17a2b8' : '#28a745') }}>
                    <p>{alertMessage}</p>
                </div>
            )}
            
            <style>
                {`
                .punto-venta-ventas-activas {
                    display: flex;
                    flex-direction: column;
                }
                .search-row .input-group {
                    margin-bottom: 0;
                }
                .cart-table-wrap {
                    width: 100%;
                    min-width: 0;
                }
                .cart-table-wrap .table-responsive {
                    -webkit-overflow-scrolling: touch;
                    overflow-x: auto;
                    margin: 0;
                    padding: 0;
                    width: 100%;
                    max-width: 100%;
                }
                .cart-table-wrap table.table {
                    min-width: 400px;
                }
                @media (max-width: 768px) {
                    .punto-venta-ventas-activas {
                        padding: 16px !important;
                    }
                    .cart-selection-container {
                        flex-direction: row;
                        flex-wrap: wrap;
                        gap: 8px;
                    }
                    .active-cart-button, .inactive-cart-button, .new-cart-button {
                        flex: 1 1 auto;
                        min-width: 100px;
                    }
                    .active-cart-info {
                        flex-direction: column;
                        align-items: stretch;
                        gap: 10px;
                        width: 100%;
                    }
                    .active-cart-actions {
                        flex-direction: column;
                        width: 100%;
                    }
                    .active-cart-actions input {
                        width: 100% !important;
                        box-sizing: border-box;
                    }
                    .search-row {
                        margin-top: 12px;
                        margin-bottom: 12px;
                    }
                    .search-row .input-group {
                        flex-direction: column;
                        gap: 10px;
                    }
                    .search-row .input-field {
                        width: 100%;
                        box-sizing: border-box;
                    }
                    .search-row .primary-button {
                        width: 100%;
                    }
                    .found-product-card {
                        flex-direction: column;
                        align-items: stretch;
                        gap: 10px;
                    }
                    .product-actions {
                        width: 100%;
                    }
                    .product-actions button {
                        width: 100%;
                    }
                    .cart-table-wrap {
                        margin: 0;
                        overflow: hidden;
                        width: 100%;
                        max-width: 100%;
                    }
                    .cart-table-wrap .table-responsive {
                        overflow-x: auto;
                        -webkit-overflow-scrolling: touch;
                        margin: 0;
                        padding: 0;
                        width: 100%;
                        max-width: 100%;
                    }
                    .cart-table-wrap table.table {
                        min-width: 380px;
                        font-size: 0.9em;
                    }
                    .cart-table-wrap th,
                    .cart-table-wrap td {
                        padding: 8px 6px;
                    }
                    .quantity-control {
                        display: flex;
                        align-items: center;
                        gap: 4px;
                        flex-wrap: nowrap;
                    }
                    .quantity-control button {
                        min-width: 32px;
                        padding: 4px 6px;
                    }
                    .payment-method-select-container {
                        flex-direction: column;
                        align-items: stretch;
                        gap: 8px;
                        width: 100%;
                    }
                    .payment-method-select-container label {
                        flex-shrink: 0;
                    }
                    .payment-method-select-container select,
                    .payment-method-select-container .input-field {
                        width: 100%;
                        box-sizing: border-box;
                    }
                    .ajustesContainer {
                        flex-direction: column !important;
                        gap: 10px;
                    }
                    .ajustesContainer .ajusteGrupo {
                        flex: none;
                        width: 100%;
                    }
                    .process-sale-button {
                        width: 100%;
                        padding: 12px 16px;
                    }
                    .pagination-container {
                        flex-direction: column;
                        gap: 10px;
                    }
                    .pagination-button {
                        width: 100%;
                    }
                }
                @media (max-width: 480px) {
                    .punto-venta-ventas-activas {
                        padding: 12px !important;
                    }
                    .cart-selection-container {
                        flex-direction: column;
                    }
                    .active-cart-button, .inactive-cart-button, .new-cart-button {
                        min-width: 100%;
                        width: 100%;
                    }
                    .cart-table-wrap table.table {
                        min-width: 340px;
                    }
                }
                `}
            </style>
        </div>
    );
};

// --- OBJETO DE ESTILOS (Se mantiene) ---
const styles = {
    container: { padding: 0, fontFamily: 'Arial, sans-serif', width: '100%' },
    header: { color: '#2c3e50', marginBottom: '1.25rem', fontSize: '1.5rem', fontWeight: '600' },
    section: { marginBottom: '30px', padding: '20px', backgroundColor: '#f9f9f9', borderRadius: '8px' },
    sectionHeader: { color: '#34495e', borderBottom: '1px solid #eee', paddingBottom: '10px' },
    loadingMessage: { textAlign: 'center', color: '#777' },
    accessDeniedMessage: { color: '#dc3545', textAlign: 'center' },
    noStoreSelectedMessage: { textAlign: 'center', marginTop: '50px' },
    errorMessage: { color: '#dc3545', padding: '10px', backgroundColor: '#ffe3e6', border: '1px solid #dc3545', borderRadius: '5px' },
    cartSelectionContainer: { display: 'flex', flexWrap: 'wrap', gap: '10px', marginBottom: '20px' },
    activeCartButton: { padding: '10px 15px', backgroundColor: '#3498db', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer' },
    inactiveCartButton: { padding: '10px 15px', backgroundColor: '#ecf0f1', color: '#333', border: '1px solid #ccc', borderRadius: '5px', cursor: 'pointer' },
    newCartButton: { padding: '10px 15px', backgroundColor: '#28a745', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer' },
    activeCartInfo: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '10px', flexWrap: 'wrap', gap: '10px' },
    activeCartTitle: { margin: 0, color: '#3498db', fontSize: '1rem' },
    activeCartActions: { display: 'flex', gap: '10px', flexWrap: 'wrap' },
    searchRow: { marginTop: '12px', marginBottom: '12px' },
    cartTableWrap: { marginTop: '16px', marginBottom: '8px', overflow: 'hidden' },
    arancelWarning: { padding: '10px', backgroundColor: '#fff3cd', border: '1px solid #ffc107', borderRadius: '4px', color: '#856404', fontSize: '0.9em', margin: 0 },
    redondearRow: { display: 'flex', alignItems: 'center', gap: '8px', marginTop: '10px', marginBottom: '8px' },
    redondearLabel: { margin: 0, fontSize: '0.9em', cursor: 'pointer' },
    inputField: { padding: '8px', border: '1px solid #ccc', borderRadius: '4px', boxSizing: 'border-box' }, // Añadido boxSizing
    deleteCartButton: { backgroundColor: '#e74c3c', color: 'white', padding: '8px 12px', border: 'none', borderRadius: '4px', cursor: 'pointer' },
    modalOverlay: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 },
    modalContent: { backgroundColor: 'white', padding: '20px', borderRadius: '8px', textAlign: 'center', width: '90%', maxWidth: '400px' },
    modalHeader: { margin: '0 0 15px 0' },
    modalActions: { display: 'flex', justifyContent: 'center', gap: '10px', marginTop: '15px' },
    modalConfirmButton: { padding: '8px 15px', backgroundColor: '#28a745', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer' },
    modalCancelButton: { padding: '8px 15px', backgroundColor: '#dc3545', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer' },
    inputGroup: { display: 'flex', gap: '10px', marginBottom: '20px', alignItems: 'center' },
    primaryButton: { padding: '10px 15px', backgroundColor: '#007bff', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer' },
    foundProductCard: { border: '1px solid #ccc', padding: '15px', borderRadius: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' },
    foundProductText: { margin: 0 },
    productActions: { display: 'flex', gap: '10px' },
    addProductButton: { padding: '8px 15px', backgroundColor: '#28a745', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' },
    disabledButton: { padding: '8px 15px', backgroundColor: '#ccc', color: '#666', border: 'none', borderRadius: '4px', cursor: 'not-allowed' },
    tableResponsive: { overflowX: 'auto' },
    table: { width: '100%', borderCollapse: 'collapse', marginTop: '15px' },
    tableHeaderRow: { backgroundColor: '#f2f2f2' },
    th: { padding: '10px', borderBottom: '2px solid #ddd', textAlign: 'left' },
    tableRow: { '&:nth-child(even)': { backgroundColor: '#f9f9f9' } },
    td: { padding: '10px', borderBottom: '1px solid #eee', verticalAlign: 'middle' },
    quantityControl: { display: 'flex', alignItems: 'center', gap: '5px' },
    quantityButton: { padding: '4px 8px', backgroundColor: '#007bff', color: 'white', border: 'none', borderRadius: '3px', cursor: 'pointer' },
    quantityText: { padding: '0 5px' },
    removeButton: { padding: '8px 12px', backgroundColor: '#dc3545', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' },
    totalVenta: { textAlign: 'right', fontSize: '1.2em', color: '#333' },
    paymentMethodSelectContainer: { display: 'flex', alignItems: 'center', gap: '10px', marginTop: '15px' },
    paymentMethodLabel: { fontWeight: 'bold' },
    
    // --- NUEVOS ESTILOS PARA AJUSTES ---
    ajustesContainer: { display: 'flex', justifyContent: 'space-between', gap: '15px', marginTop: '15px' },
    ajusteGrupo: { display: 'flex', alignItems: 'center', gap: '8px', flex: 1, padding: '10px', border: '1px solid #ddd', borderRadius: '5px', backgroundColor: '#fff' },
    ajusteLabel: { fontWeight: 'bold', fontSize: '0.9em' },
    ajusteInput: { width: '70px', padding: '8px', border: '1px solid #ccc', borderRadius: '4px' },
    ajusteSeparador: { fontWeight: 'bold', color: '#777' },
    // --- FIN NUEVOS ESTILOS ---

    finalTotalVenta: { textAlign: 'right', fontSize: '1.5em', color: '#28a745' },
    processSaleButton: { display: 'block', width: '100%', padding: '15px', backgroundColor: '#28a745', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', marginTop: '20px' },
    addButton: { padding: '8px 15px', backgroundColor: '#007bff', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' },
    noDataMessage: { textAlign: 'center', fontStyle: 'italic', color: '#777' },
    paginationContainer: { display: 'flex', justifyContent: 'center', alignItems: 'center', marginTop: '20px', gap: '10px' },
    paginationButton: { padding: '8px 15px', backgroundColor: '#007bff', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer' },
    pageNumber: { fontSize: '1em', fontWeight: 'bold', color: '#555' },
    arancelDisplay: { textAlign: 'right', fontSize: '1em', color: '#e74c3c', marginTop: '5px' },
    alertBox: {
        position: 'fixed',
        bottom: '20px',
        right: '20px',
        padding: '15px 20px',
        color: 'white',
        borderRadius: '5px',
        zIndex: 1001,
        boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
    },
};

export default PuntoVenta;
