// CambioDevolucion.js
import React, { useState, useEffect, useRef, useCallback } from 'react';
import axios from 'axios';
import { useAuth } from '../AuthContext';
import { useNavigate, useLocation } from 'react-router-dom';
import { useSales } from './SalesContext';
import Swal from 'sweetalert2';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';

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

const CambioDevolucion = () => {
    const { user, token, selectedStoreSlug } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();
    
    const {
        activeCart,
        activeCartId,
        createNewCart,
        addProductToCart,
        removeProductFromCart,
        decrementProductQuantity,
    } = useSales();
    
    // Si viene desde otra página con la venta pre-seleccionada
    const ventaInicial = location.state?.venta || null;
    
    const [ventaOriginal, setVentaOriginal] = useState(ventaInicial);
    const [loadingVenta, setLoadingVenta] = useState(false);
    const [busquedaVentaId, setBusquedaVentaId] = useState('');
    const [error, setError] = useState(null);
    
    // Productos seleccionados para devolver
    const [productosADevolver, setProductosADevolver] = useState([]); // Array de {detalle_venta_id, cantidad}
    
    // Punto de Venta - Productos nuevos
    const [productos, setProductos] = useState([]);
    const [busquedaProducto, setBusquedaProducto] = useState('');
    const [filterTerm, setFilterTerm] = useState('');
    const [productoSeleccionado, setProductoSeleccionado] = useState(null);
    const [loadingProducts, setLoadingProducts] = useState(true);
    
    // Métodos de pago y aranceles
    const [metodosPago, setMetodosPago] = useState([]);
    const [metodoPagoSeleccionado, setMetodoPagoSeleccionado] = useState('');
    const [arancelesTienda, setArancelesTienda] = useState([]);
    const [arancelSeleccionadoId, setArancelSeleccionadoId] = useState('');
    
    // Descuentos y recargos
    const [descuentoPorcentaje, setDescuentoPorcentaje] = useState('');
    const [descuentoMonto, setDescuentoMonto] = useState('');
    const [recargoPorcentaje, setRecargoPorcentaje] = useState('');
    const [recargoMonto, setRecargoMonto] = useState('');
    const [redondearMonto, setRedondearMonto] = useState(false);
    
    
    const [procesando, setProcesando] = useState(false);
    
    const barcodeInputRef = useRef(null);
    const barcodeProductoRef = useRef(null);

    // Crear carrito al iniciar
    useEffect(() => {
        if (!activeCartId) {
            createNewCart('Cambio/Devolución');
        }
    }, [activeCartId, createNewCart]);

    // Buscar venta por ID o código de barras
    const buscarVenta = async () => {
        if (!busquedaVentaId || !token || !selectedStoreSlug) return;
        
        setLoadingVenta(true);
        setError(null);
        try {
            const ventaIdLimpio = busquedaVentaId.replace(/-/g, '');
            const response = await axios.get(`${BASE_API_ENDPOINT}/api/ventas/`, {
                headers: { 'Authorization': `Bearer ${token}` },
                params: {
                    tienda_slug: selectedStoreSlug,
                    id: ventaIdLimpio
                }
            });
            
            const ventas = response.data.results || [];
            if (ventas.length > 0) {
                setVentaOriginal(ventas[0]);
                setBusquedaVentaId('');
                setProductosADevolver([]);
            } else {
                setError('Venta no encontrada');
            }
        } catch (err) {
            setError('Error al buscar venta: ' + (err.response ? JSON.stringify(err.response.data) : err.message));
        } finally {
            setLoadingVenta(false);
        }
    };

    // Cargar métodos de pago y aranceles
    const fetchMetodosPago = useCallback(async () => {
        if (!token) return;
        try {
            const response = await axios.get(`${BASE_API_ENDPOINT}/api/metodos-pago/`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            setMetodosPago(response.data.results || response.data || []);
        } catch (err) {
            console.error('Error al cargar métodos de pago:', err);
        }
    }, [token]);

    const fetchAranceles = useCallback(async () => {
        if (!token || !selectedStoreSlug) return;
        try {
            const response = await axios.get(`${BASE_API_ENDPOINT}/api/aranceles-tienda/`, {
                headers: { 'Authorization': `Bearer ${token}` },
                params: { tienda_slug: selectedStoreSlug }
            });
            setArancelesTienda(response.data.results || response.data || []);
        } catch (err) {
            console.error('Error al cargar aranceles:', err);
        }
    }, [token, selectedStoreSlug]);

    // Cargar productos disponibles
    const fetchProductos = useCallback(async (page = 1, searchQuery = '') => {
        if (!token || !selectedStoreSlug) return;
        setLoadingProducts(true);
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
            setProductos(response.data.results || []);
        } catch (err) {
            console.error("Error al cargar productos:", err);
            setError('Error al cargar productos.');
        } finally {
            setLoadingProducts(false);
        }
    }, [token, selectedStoreSlug]);

    useEffect(() => {
        if (selectedStoreSlug && token) {
            fetchMetodosPago();
            fetchAranceles();
            fetchProductos(1, filterTerm);
        }
    }, [selectedStoreSlug, token, fetchMetodosPago, fetchAranceles, fetchProductos, filterTerm]);

    // Manejar lectura de código de barras para buscar venta
    useEffect(() => {
        const input = barcodeInputRef.current;
        if (!input) return;

        const handleInput = (e) => {
            const value = e.target.value.replace(/-/g, '');
            if (value.length >= 8) {
                setBusquedaVentaId(value);
                buscarVenta();
            }
        };

        input.addEventListener('input', handleInput);
        return () => input.removeEventListener('input', handleInput);
    }, [busquedaVentaId]);

    // Toggle producto a devolver
    const toggleProductoADevolver = (detalleVenta) => {
        const existe = productosADevolver.find(p => p.detalle_venta_id === detalleVenta.id);
        if (existe) {
            setProductosADevolver(productosADevolver.filter(p => p.detalle_venta_id !== detalleVenta.id));
        } else {
            setProductosADevolver([...productosADevolver, {
                detalle_venta_id: detalleVenta.id,
                cantidad: detalleVenta.cantidad
            }]);
        }
    };

    // Actualizar cantidad a devolver
    const actualizarCantidadADevolver = (detalleVentaId, cantidad) => {
        setProductosADevolver(productosADevolver.map(p => 
            p.detalle_venta_id === detalleVentaId 
                ? { ...p, cantidad: Math.max(1, Math.min(cantidad, ventaOriginal?.detalles?.find(d => d.id === detalleVentaId)?.cantidad || 1)) }
                : p
        ));
    };

    // Buscar producto por código de barras
    const handleBuscarProducto = useCallback(async () => {
        if (!busquedaProducto || !selectedStoreSlug) return;
        
        try {
            let response;
            try {
                response = await axios.get(`${BASE_API_ENDPOINT}/api/productos/buscar_por_barcode/`, {
                    headers: { 'Authorization': `Bearer ${token}` },
                    params: { barcode: busquedaProducto, tienda_slug: selectedStoreSlug }
                });
            } catch (error) {
                if (error.response && error.response.status === 404) {
                    setFilterTerm(busquedaProducto);
                    setBusquedaProducto('');
                    return;
                }
                throw error;
            }
            const productoEncontrado = response.data;
            if (productoEncontrado) {
                handleAddProductoEnVenta(productoEncontrado, 1);
            }
        } catch (err) {
            console.error("Error al buscar producto:", err);
            setProductoSeleccionado(null);
        }
    }, [busquedaProducto, selectedStoreSlug, token]);

    // Agregar producto al carrito
    const handleAddProductoEnVenta = useCallback((product, quantity = 1) => {
        if (!activeCart) return;
        if (product.stock === 0) {
            alert('Este producto no tiene stock disponible.');
            return;
        }
        const currentItemInCart = activeCart.items.find(item => item.product.id === product.id);
        const currentQuantityInCart = currentItemInCart ? currentItemInCart.quantity : 0;
        if (currentQuantityInCart + quantity > product.stock) {
            alert(`No hay suficiente stock. Disponible: ${product.stock}`);
            return;
        }
        addProductToCart(product, quantity);
        setBusquedaProducto('');
        setProductoSeleccionado(null);
    }, [activeCart, addProductToCart]);

    // Calcular total del carrito con descuentos/recargos
    const calculateTotalSinRedondeo = useCallback(() => {
        if (!activeCart) return 0;
        let subtotal = activeCart.items.reduce((sum, item) => sum + (item.quantity * parseFloat(item.product.precio)), 0);
        let finalTotal = subtotal;

        if (parseFloat(recargoMonto) > 0) {
            finalTotal = subtotal + parseFloat(recargoMonto);
        } else if (parseFloat(recargoPorcentaje) > 0) {
            finalTotal = subtotal * (1 + (parseFloat(recargoPorcentaje) / 100));
        } else if (parseFloat(descuentoMonto) > 0) {
            finalTotal = Math.max(0, subtotal - parseFloat(descuentoMonto));
        } else if (parseFloat(descuentoPorcentaje) > 0) {
            finalTotal = subtotal * (1 - (parseFloat(descuentoPorcentaje) / 100));
        }
        
        return finalTotal;
    }, [activeCart, descuentoPorcentaje, descuentoMonto, recargoMonto, recargoPorcentaje]);

    const calculateFinalTotal = useCallback(() => {
        let totalConAjuste = calculateTotalSinRedondeo();
        if (redondearMonto) {
            totalConAjuste = Math.floor(totalConAjuste / 100) * 100;
        }
        return totalConAjuste;
    }, [calculateTotalSinRedondeo, redondearMonto]);

    // Calcular arancel para métodos financieros
    const calculateArancel = useCallback(() => {
        const arancel = arancelesTienda.find(a => a.id === arancelSeleccionadoId);
        if (!arancel || !arancelSeleccionadoId) return 0;

        const totalConAjuste = calculateFinalTotal(); 
        const porcentaje = parseFloat(arancel.arancel_porcentaje);
        return (totalConAjuste * porcentaje) / 100;
    }, [arancelesTienda, arancelSeleccionadoId, calculateFinalTotal]);

    // Verificar si el método de pago seleccionado es financiero
    const metodoPagoObj = metodosPago.find(m => m.nombre === metodoPagoSeleccionado);
    const isMetodoFinancieroActivo = metodoPagoObj?.es_financiero;
    
    // Filtrar los aranceles disponibles para el método de pago seleccionado
    const arancelesDisponibles = arancelesTienda.filter(a => a.metodo_pago_nombre === metodoPagoSeleccionado);

    // Calcular monto a devolver considerando descuentos/recargos de la venta original
    const calcularMontoDevolucion = () => {
        if (!ventaOriginal) return 0;
        
        let total = 0;
        productosADevolver.forEach(p => {
            const detalle = ventaOriginal?.detalles?.find(d => d.id === p.detalle_venta_id);
            if (detalle) {
                const precioUnitarioOriginal = parseFloat(detalle.precio_unitario || 0);
                
                // Calcular factor de ajuste si hay descuento/recargo porcentual
                let adjustmentFactor = 1.0;
                
                if (parseFloat(ventaOriginal.descuento_porcentaje || 0) > 0) {
                    adjustmentFactor = 1 - (parseFloat(ventaOriginal.descuento_porcentaje) / 100);
                } else if (parseFloat(ventaOriginal.recargo_porcentaje || 0) > 0) {
                    adjustmentFactor = 1 + (parseFloat(ventaOriginal.recargo_porcentaje) / 100);
                }
                
                // Si el ajuste es por monto, calcular proporcionalmente
                const isAmountAdjustment = parseFloat(ventaOriginal.descuento_monto || 0) > 0 || parseFloat(ventaOriginal.recargo_monto || 0) > 0;
                
                let precioUnitarioAjustado;
                if (isAmountAdjustment) {
                    // Calcular el subtotal original de la venta (suma de todos los detalles)
                    const subtotalOriginal = ventaOriginal.detalles?.reduce((sum, d) => {
                        if (!d.anulado_individualmente) {
                            return sum + (parseFloat(d.precio_unitario || 0) * d.cantidad);
                        }
                        return sum;
                    }, 0) || 0;
                    
                    // Calcular el total ajustado
                    let totalAjustado = subtotalOriginal;
                    if (parseFloat(ventaOriginal.descuento_monto || 0) > 0) {
                        totalAjustado = subtotalOriginal - parseFloat(ventaOriginal.descuento_monto);
                    } else if (parseFloat(ventaOriginal.recargo_monto || 0) > 0) {
                        totalAjustado = subtotalOriginal + parseFloat(ventaOriginal.recargo_monto);
                    }
                    
                    // Calcular el factor de proporción
                    const factorProporcion = subtotalOriginal > 0 ? totalAjustado / subtotalOriginal : 1;
                    
                    // Aplicar el factor proporcional al precio unitario
                    precioUnitarioAjustado = precioUnitarioOriginal * factorProporcion;
                } else {
                    // Si es porcentual, aplicar el factor directamente
                    precioUnitarioAjustado = precioUnitarioOriginal * adjustmentFactor;
                }
                
                total += precioUnitarioAjustado * p.cantidad;
            }
        });
        return total;
    };

    // Calcular diferencia
    const montoDevolucion = calcularMontoDevolucion();
    const montoNuevo = calculateFinalTotal();
    const montoDiferencia = montoNuevo - montoDevolucion;
    const saldoAFavor = montoDiferencia < 0 ? Math.abs(montoDiferencia) : 0;

    // Procesar cambio/devolución
    const procesarCambioDevolucion = async () => {
        if (!ventaOriginal || productosADevolver.length === 0) {
            setError('Debe seleccionar al menos un producto para devolver');
            return;
        }

        // Si hay productos nuevos, validar método de pago si hay diferencia a pagar
        if (activeCart && activeCart.items.length > 0 && montoDiferencia > 0) {
            if (!metodoPagoSeleccionado) {
                setError('Debe seleccionar un método de pago para la diferencia a pagar');
                return;
            }
        }

        setProcesando(true);
        setError(null);
        
        try {
            // Preparar detalles del cambio
            const detalles = [];
            
            // Productos a devolver
            productosADevolver.forEach(p => {
                detalles.push({
                    accion: 'DEVOLVER',
                    detalle_venta_original_id: p.detalle_venta_id,
                    cantidad: p.cantidad,
                    producto_nuevo_id: null,
                    precio_unitario_nuevo: null
                });
            });
            
            // Productos nuevos del carrito
            if (activeCart && activeCart.items.length > 0) {
                // Primero, intentar hacer cambios (un producto devuelto por uno nuevo)
                const productosDevueltosDisponibles = [...productosADevolver];
                
                activeCart.items.forEach(item => {
                    // Buscar un producto devuelto que aún no haya sido cambiado
                    const productoDevueltoIndex = productosDevueltosDisponibles.findIndex(p => {
                        const yaCambiado = detalles.find(d => 
                            d.detalle_venta_original_id === p.detalle_venta_id && d.accion === 'CAMBIAR'
                        );
                        return !yaCambiado;
                    });
                    
                    if (productoDevueltoIndex >= 0) {
                        // Cambiar producto: convertir DEVOLVER a CAMBIAR
                        const productoDevuelto = productosDevueltosDisponibles[productoDevueltoIndex];
                        const cantidadACambiar = Math.min(productoDevuelto.cantidad, item.quantity);
                        
                        // Buscar el detalle de DEVOLVER y cambiarlo a CAMBIAR
                        const indexDevolver = detalles.findIndex(d => 
                            d.detalle_venta_original_id === productoDevuelto.detalle_venta_id && d.accion === 'DEVOLVER'
                        );
                        
                        if (indexDevolver >= 0) {
                            // Si la cantidad a cambiar es igual a la cantidad devuelta, cambiar todo
                            if (cantidadACambiar === productoDevuelto.cantidad) {
                                detalles[indexDevolver] = {
                                    accion: 'CAMBIAR',
                                    detalle_venta_original_id: productoDevuelto.detalle_venta_id,
                                    cantidad: cantidadACambiar,
                                    producto_nuevo_id: item.product.id,
                                    precio_unitario_nuevo: parseFloat(item.product.precio)
                                };
                            } else {
                                // Si cambia menos, dividir en CAMBIAR y DEVOLVER
                                detalles[indexDevolver] = {
                                    accion: 'CAMBIAR',
                                    detalle_venta_original_id: productoDevuelto.detalle_venta_id,
                                    cantidad: cantidadACambiar,
                                    producto_nuevo_id: item.product.id,
                                    precio_unitario_nuevo: parseFloat(item.product.precio)
                                };
                                // Agregar el resto como DEVOLVER
                                if (productoDevuelto.cantidad > cantidadACambiar) {
                                    detalles.push({
                                        accion: 'DEVOLVER',
                                        detalle_venta_original_id: productoDevuelto.detalle_venta_id,
                                        cantidad: productoDevuelto.cantidad - cantidadACambiar,
                                        producto_nuevo_id: null,
                                        precio_unitario_nuevo: null
                                    });
                                }
                            }
                            
                            // Si quedan items del producto nuevo, agregar como AGREGAR
                            if (item.quantity > cantidadACambiar) {
                                detalles.push({
                                    accion: 'AGREGAR',
                                    detalle_venta_original_id: null,
                                    cantidad: item.quantity - cantidadACambiar,
                                    producto_nuevo_id: item.product.id,
                                    precio_unitario_nuevo: parseFloat(item.product.precio)
                                });
                            }
                            
                            // Marcar este producto devuelto como usado
                            productosDevueltosDisponibles.splice(productoDevueltoIndex, 1);
                        }
                    } else {
                        // No hay producto devuelto disponible, agregar como producto nuevo
                        detalles.push({
                            accion: 'AGREGAR',
                            detalle_venta_original_id: null,
                            cantidad: item.quantity,
                            producto_nuevo_id: item.product.id,
                            precio_unitario_nuevo: parseFloat(item.product.precio)
                        });
                    }
                });
            }

            const payload = {
                venta_original: ventaOriginal.id,
                tipo: 'CAMBIO', // Por defecto, el backend puede inferirlo
                motivo: '', // Vacío por ahora
                detalles: detalles
            };

            const response = await axios.post(
                `${BASE_API_ENDPOINT}/api/cambios-devoluciones/`,
                payload,
                {
                    headers: { 'Authorization': `Bearer ${token}` }
                }
            );

            const cambioDevolucion = response.data;
            
            // Si hay diferencia a pagar, crear venta normal
            if (montoDiferencia > 0 && activeCart && activeCart.items.length > 0) {
                const metodoPagoObj = metodosPago.find(m => m.nombre === metodoPagoSeleccionado);
                const isMetodoFinanciero = metodoPagoObj?.es_financiero;
                const finalArancelId = isMetodoFinanciero ? arancelSeleccionadoId : null;

                if (isMetodoFinanciero && !finalArancelId) {
                    Swal.fire('Error', 'Por favor, selecciona el Plan / Arancel.', 'error');
                    setProcesando(false);
                    return;
                }

                // Preparar datos de ajuste
                let datosAjusteParaBackend = {
                    descuento_porcentaje: parseFloat(descuentoPorcentaje) || 0,
                    descuento_monto: parseFloat(descuentoMonto) || 0,
                    recargo_porcentaje: parseFloat(recargoPorcentaje) || 0,
                    recargo_monto: parseFloat(recargoMonto) || 0,
                };

                if (redondearMonto) {
                    const subtotalCrudo = activeCart.total;
                    const ajusteTotalEfectivo = montoDiferencia - subtotalCrudo;
                    datosAjusteParaBackend = {
                        descuento_porcentaje: 0,
                        descuento_monto: ajusteTotalEfectivo < 0 ? Math.abs(ajusteTotalEfectivo) : 0,
                        recargo_porcentaje: 0,
                        recargo_monto: ajusteTotalEfectivo > 0 ? ajusteTotalEfectivo : 0,
                    };
                }

                // Crear venta para la diferencia
                const ventaData = {
                    tienda_slug: selectedStoreSlug,
                    metodo_pago: metodoPagoSeleccionado,
                    ...datosAjusteParaBackend,
                    arancel_aplicado_id: finalArancelId,
                    cambio_devolucion_id: cambioDevolucion.id, // Relacionar con el cambio/devolución
                    detalles: activeCart.items.map(item => ({
                        producto: item.product.id,
                        cantidad: item.quantity,
                        precio_unitario: parseFloat(item.product.precio),
                    })),
                };

                try {
                    const ventaResponse = await axios.post(
                        `${BASE_API_ENDPOINT}/api/ventas/`,
                        ventaData,
                        {
                            headers: { 'Authorization': `Bearer ${token}` }
                        }
                    );

                    // Obtener información del cambio/devolución para mostrar en el recibo
                    const cambioDevolucionInfo = {
                        monto_devolucion: montoDevolucion,
                        saldo_a_favor: saldoAFavor > 0 ? saldoAFavor : 0
                    };
                    
                    const ventaParaRecibo = {
                        ...ventaResponse.data,
                        tienda_nombre: selectedStoreSlug,
                        descuento_porcentaje: datosAjusteParaBackend.descuento_porcentaje,
                        descuento_monto: datosAjusteParaBackend.descuento_monto,
                        recargo_porcentaje: datosAjusteParaBackend.recargo_porcentaje,
                        recargo_monto: datosAjusteParaBackend.recargo_monto,
                        total: montoDiferencia,
                        cambio_devolucion_info: cambioDevolucionInfo, // Información adicional del cambio/devolución
                        detalles: activeCart.items.map(item => ({
                            producto_nombre: item.product.nombre,
                            cantidad: item.quantity,
                            precio_unitario: parseFloat(item.product.precio),
                            subtotal: parseFloat(item.product.precio) * item.quantity
                        }))
                    };

                    // Preguntar si quiere facturar
                    const tieneFacturacion = true; // Simplificado, debería verificar desde la tienda
                    
                    if (tieneFacturacion) {
                        Swal.fire({
                            title: 'Cambio/Devolución procesado!',
                            text: `Diferencia a pagar: $${montoDiferencia.toFixed(2)}. ¿Desea emitir una factura?`,
                            icon: 'success',
                            showCancelButton: true,
                            showDenyButton: true,
                            confirmButtonText: 'Sí, facturar',
                            denyButtonText: 'Solo recibo',
                            cancelButtonText: 'No',
                        }).then(async (result) => {
                            if (result.isConfirmed) {
                                // Mostrar formulario para factura
                                const { value: formValues } = await Swal.fire({
                                    title: 'Datos del Cliente para Factura',
                                    html: `
                                        <input id="cliente_nombre" class="swal2-input" placeholder="Nombre del cliente *" required>
                                        <input id="cliente_cuit" class="swal2-input" placeholder="CUIT (opcional)">
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
                                        if (!nombre || nombre.trim() === '') {
                                            Swal.showValidationMessage('El nombre del cliente es requerido');
                                            return false;
                                        }
                                        return {
                                            cliente_nombre: nombre.trim(),
                                            cliente_cuit: document.getElementById('cliente_cuit').value.trim() || null,
                                            cliente_domicilio: document.getElementById('cliente_domicilio').value.trim() || null,
                                            cliente_condicion_iva: document.getElementById('cliente_condicion_iva').value
                                        };
                                    }
                                });

                                if (formValues) {
                                    try {
                                        const facturaResponse = await axios.post(
                                            `${BASE_API_ENDPOINT}/api/ventas/${ventaResponse.data.id}/emitir_factura/`,
                                            { venta_id: ventaResponse.data.id, ...formValues },
                                            { headers: { 'Authorization': `Bearer ${token}` } }
                                        );
                                        
                                        const facturaData = facturaResponse.data.factura || facturaResponse.data;
                                        navigate('/factura', { 
                                            state: { 
                                                factura: facturaData,
                                                venta: ventaParaRecibo
                                            } 
                                        });
                                    } catch (facturaError) {
                                        console.error('Error al emitir factura:', facturaError);
                                        Swal.fire({
                                            title: 'Error al emitir factura',
                                            html: facturaError.response?.data?.error || facturaError.message,
                                            icon: 'error'
                                        }).then(() => {
                                            navigate('/recibo', { state: { venta: ventaParaRecibo, fromCambioDevolucion: true } });
                                        });
                                    }
                                } else {
                                    navigate('/recibo', { state: { venta: ventaParaRecibo, fromCambioDevolucion: true } });
                                }
                            } else if (result.isDenied) {
                                navigate('/recibo', { state: { venta: ventaParaRecibo, fromCambioDevolucion: true } });
                            }
                        });
                    } else {
                        navigate('/recibo', { state: { venta: ventaParaRecibo, fromCambioDevolucion: true } });
                    }
                } catch (ventaError) {
                    console.error('Error al crear venta por diferencia:', ventaError);
                    Swal.fire({
                        title: 'Error',
                        html: 'Error al crear venta por diferencia: ' + (ventaError.response?.data?.error || ventaError.message),
                        icon: 'error'
                    });
                }
            } else if (saldoAFavor > 0) {
                // Si hay saldo a favor, obtener la venta de la nota de crédito y navegar automáticamente al recibo
                const cambioDevolucion = response.data;
                console.log('Cambio/Devolución creado:', cambioDevolucion);
                console.log('venta_nota_credito_id:', cambioDevolucion.venta_nota_credito_id);
                console.log('nota_credito_generada:', cambioDevolucion.nota_credito_generada);
                
                // Verificar si se generó la nota de crédito y tenemos el ID
                if (cambioDevolucion.nota_credito_generada && cambioDevolucion.venta_nota_credito_id) {
                    try {
                        const ventaId = cambioDevolucion.venta_nota_credito_id;
                        console.log('Intentando obtener venta de nota de crédito con ID:', ventaId);
                        console.log('URL completa:', `${BASE_API_ENDPOINT}/api/ventas/${ventaId}/`);
                        
                        // Obtener los detalles completos de la venta de nota de crédito
                        const ventaNotaCreditoResponse = await axios.get(
                            `${BASE_API_ENDPOINT}/api/ventas/${ventaId}/`,
                            { headers: { 'Authorization': `Bearer ${token}` } }
                        );
                        
                        console.log('Venta de nota de crédito obtenida exitosamente:', ventaNotaCreditoResponse.data);
                        
                        const ventaNotaCredito = {
                            ...ventaNotaCreditoResponse.data,
                            tienda_nombre: selectedStoreSlug,
                            usuario_nombre: user?.first_name || user?.username || 'Usuario Desconocido'
                        };
                        
                        // Navegar automáticamente al recibo, igual que en PuntoVenta
                        navigate('/recibo', { state: { venta: ventaNotaCredito, fromCambioDevolucion: true } });
                    } catch (ventaError) {
                        console.error('Error al obtener venta de nota de crédito:', ventaError);
                        const errorMsg = ventaError.response?.data?.detail || ventaError.response?.data?.error || ventaError.message;
                        Swal.fire({
                            title: 'Error',
                            html: `Error al obtener el recibo de nota de crédito.<br><strong>ID: ${cambioDevolucion.venta_nota_credito_id}</strong><br>Error: ${errorMsg}`,
                            icon: 'error',
                            confirmButtonText: 'Ok'
                        });
                    }
                } else if (cambioDevolucion.nota_credito_generada && !cambioDevolucion.venta_nota_credito_id) {
                    // Si se generó pero no tenemos el ID, intentar buscar la venta relacionada
                    console.warn('Nota de crédito generada pero no hay ID. Buscando venta relacionada...');
                    Swal.fire({
                        title: 'Atención',
                        html: 'La nota de crédito se generó, pero no se pudo obtener el recibo automáticamente.<br>Por favor, busca la venta en el listado de ventas.',
                        icon: 'warning',
                        confirmButtonText: 'Ok'
                    });
                } else {
                    Swal.fire({
                        title: 'Error',
                        html: 'No se pudo generar el recibo de nota de crédito.',
                        icon: 'error',
                        confirmButtonText: 'Ok'
                    });
                }
            } else {
                Swal.fire({
                    title: 'Cambio/Devolución procesado!',
                    icon: 'success',
                    confirmButtonText: 'Ok'
                });
            }
            
            // Limpiar formulario
            setVentaOriginal(null);
            setProductosADevolver([]);
            setBusquedaVentaId('');
            if (activeCart && activeCartId) {
                // Crear una copia de los items para evitar problemas de mutación
                const itemsToRemove = [...activeCart.items];
                itemsToRemove.forEach(item => {
                    removeProductFromCart(activeCartId, item.product.id);
                });
            }
            setDescuentoPorcentaje('');
            setDescuentoMonto('');
            setRecargoPorcentaje('');
            setRecargoMonto('');
            setRedondearMonto(false);
            setMetodoPagoSeleccionado('');
            setArancelSeleccionadoId('');
            setBusquedaProducto('');
            setFilterTerm('');
            
        } catch (err) {
            console.error('Error al procesar cambio/devolución:', err);
            console.error('Error response:', err.response?.data);
            console.error('Error status:', err.response?.status);
            console.error('Error URL:', err.config?.url);
            
            let errorMessage = 'Error desconocido';
            
            // Si es un error 404, dar un mensaje más específico
            if (err.response?.status === 404) {
                if (err.config?.url?.includes('/api/ventas/')) {
                    errorMessage = `No se pudo encontrar la venta de nota de crédito. ID: ${err.config.url.split('/').pop()}`;
                } else if (err.config?.url?.includes('/api/cambios-devoluciones/')) {
                    errorMessage = 'El endpoint de cambios/devoluciones no fue encontrado. Por favor, verifica la configuración del servidor.';
                } else {
                    errorMessage = `Recurso no encontrado: ${err.config?.url || 'URL desconocida'}`;
                }
            } else if (err.response?.data) {
                // Intentar extraer mensajes de validación más específicos
                const data = err.response.data;
                
                if (data.detalles) {
                    // Error de validación en detalles
                    if (Array.isArray(data.detalles)) {
                        errorMessage = data.detalles.join(', ');
                    } else if (typeof data.detalles === 'object') {
                        errorMessage = Object.entries(data.detalles)
                            .map(([key, value]) => `${key}: ${Array.isArray(value) ? value.join(', ') : value}`)
                            .join('; ');
                    } else {
                        errorMessage = data.detalles;
                    }
                } else if (data.error) {
                    errorMessage = data.error;
                } else if (data.detail) {
                    errorMessage = data.detail;
                } else if (typeof data === 'string') {
                    errorMessage = data;
                } else {
                    errorMessage = JSON.stringify(data);
                }
            } else if (err.message) {
                errorMessage = err.message;
            }
            
            Swal.fire({
                title: 'Error',
                html: `Error al procesar el cambio/devolución:<br><strong>${errorMessage}</strong>`,
                icon: 'error',
                confirmButtonText: 'Ok',
                width: '600px'
            });
            
            setError('Error al procesar cambio/devolución: ' + errorMessage);
        } finally {
            setProcesando(false);
        }
    };

    const detallesOriginales = ventaOriginal?.detalles?.filter(d => !d.anulado_individualmente) || [];

    return (
        <div style={styles.container}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <h1 style={styles.pageTitle}>Cambio / Devolución</h1>
                <button 
                    onClick={() => navigate('/punto-venta')}
                    style={{
                        padding: '10px 20px',
                        backgroundColor: '#6c757d',
                        color: 'white',
                        border: 'none',
                        borderRadius: '5px',
                        cursor: 'pointer',
                        fontSize: '14px'
                    }}
                >
                    Volver a Punto de Venta
                </button>
            </div>
            
            {error && (
                <div style={styles.errorMessage}>
                    {error}
                </div>
            )}

            {/* Buscar venta */}
            {!ventaOriginal && (
                <div style={styles.section}>
                    <h2 style={styles.sectionHeader}>Buscar venta</h2>
                    <div style={styles.inputGroup}>
                        <input
                            ref={barcodeInputRef}
                            type="text"
                            placeholder="Escanear código de barras o ingresar ID de venta"
                            value={busquedaVentaId}
                            onChange={(e) => setBusquedaVentaId(e.target.value)}
                            onKeyPress={(e) => { if (e.key === 'Enter') buscarVenta(); }}
                            style={styles.inputField}
                        />
                        <button onClick={buscarVenta} disabled={loadingVenta || !busquedaVentaId} style={styles.primaryButton}>
                            {loadingVenta ? 'Buscando...' : 'Buscar'}
                        </button>
                    </div>
                </div>
            )}

            {/* Información de la venta original y productos a devolver */}
            {ventaOriginal && (
                <div>
                    <div style={styles.section}>
                        <h2 style={styles.sectionHeader}>Venta original</h2>
                        <p><strong>Fecha:</strong> {new Date(ventaOriginal.fecha_venta).toLocaleString()}</p>
                        <p><strong>Total:</strong> ${parseFloat(ventaOriginal.total).toFixed(2)}</p>
                        <p><strong>Método de pago:</strong> {ventaOriginal.metodo_pago}</p>
                        <button onClick={() => {
                            setVentaOriginal(null);
                            setProductosADevolver([]);
                        }} style={styles.primaryButton}>
                            Cambiar venta
                        </button>
                    </div>

                    {/* Productos de la venta original - Selección para devolver */}
                    <div style={styles.section}>
                        <h2 style={styles.sectionHeader}>Productos a devolver o cambiar</h2>
                        <p style={{ fontSize: '14px', color: '#666', marginBottom: '10px' }}>
                            Marque los productos que desea devolver o cambiar
                        </p>
                        <div style={styles.tableResponsive}>
                            <table style={styles.table}>
                                <thead>
                                    <tr style={styles.tableHeaderRow}>
                                        <th style={styles.th}>Seleccionar</th>
                                        <th style={styles.th}>Producto</th>
                                        <th style={styles.th}>Cantidad Original</th>
                                        <th style={styles.th}>Cantidad a Devolver</th>
                                        <th style={styles.th}>Precio Unit. (Ajustado)</th>
                                        <th style={styles.th}>Subtotal</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {detallesOriginales.map((detalle) => {
                                        const seleccionado = productosADevolver.find(p => p.detalle_venta_id === detalle.id);
                                        const cantidadADevolver = seleccionado?.cantidad || 0;
                                        
                                        // Calcular precio ajustado
                                        const precioUnitarioOriginal = parseFloat(detalle.precio_unitario || 0);
                                        let adjustmentFactor = 1.0;
                                        if (parseFloat(ventaOriginal.descuento_porcentaje || 0) > 0) {
                                            adjustmentFactor = 1 - (parseFloat(ventaOriginal.descuento_porcentaje) / 100);
                                        } else if (parseFloat(ventaOriginal.recargo_porcentaje || 0) > 0) {
                                            adjustmentFactor = 1 + (parseFloat(ventaOriginal.recargo_porcentaje) / 100);
                                        }
                                        const isAmountAdjustment = parseFloat(ventaOriginal.descuento_monto || 0) > 0 || parseFloat(ventaOriginal.recargo_monto || 0) > 0;
                                        let precioUnitarioAjustado;
                                        if (isAmountAdjustment) {
                                            const subtotalOriginal = ventaOriginal.detalles?.reduce((sum, d) => {
                                                if (!d.anulado_individualmente) {
                                                    return sum + (parseFloat(d.precio_unitario || 0) * d.cantidad);
                                                }
                                                return sum;
                                            }, 0) || 0;
                                            let totalAjustado = subtotalOriginal;
                                            if (parseFloat(ventaOriginal.descuento_monto || 0) > 0) {
                                                totalAjustado = subtotalOriginal - parseFloat(ventaOriginal.descuento_monto);
                                            } else if (parseFloat(ventaOriginal.recargo_monto || 0) > 0) {
                                                totalAjustado = subtotalOriginal + parseFloat(ventaOriginal.recargo_monto);
                                            }
                                            const factorProporcion = subtotalOriginal > 0 ? totalAjustado / subtotalOriginal : 1;
                                            precioUnitarioAjustado = precioUnitarioOriginal * factorProporcion;
                                        } else {
                                            precioUnitarioAjustado = precioUnitarioOriginal * adjustmentFactor;
                                        }
                                        
                                        return (
                                            <tr key={detalle.id} style={styles.tableRow}>
                                                <td style={styles.td}>
                                                    <input
                                                        type="checkbox"
                                                        checked={!!seleccionado}
                                                        onChange={() => toggleProductoADevolver(detalle)}
                                                    />
                                                </td>
                                                <td style={styles.td}>
                                                    {detalle.producto_nombre || 'N/A'}
                                                </td>
                                                <td style={styles.td}>{detalle.cantidad}</td>
                                                <td style={styles.td}>
                                                    {seleccionado ? (
                                                        <input
                                                            type="number"
                                                            min="1"
                                                            max={detalle.cantidad}
                                                            value={cantidadADevolver}
                                                            onChange={(e) => actualizarCantidadADevolver(detalle.id, parseInt(e.target.value) || 1)}
                                                            style={{ width: '60px', padding: '4px', border: '1px solid #ccc', borderRadius: '4px' }}
                                                        />
                                                    ) : (
                                                        <span>-</span>
                                                    )}
                                                </td>
                                                <td style={styles.td}>
                                                    ${precioUnitarioAjustado.toFixed(2)}
                                                </td>
                                                <td style={styles.td}>
                                                    ${(precioUnitarioAjustado * cantidadADevolver).toFixed(2)}
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                        <div style={{ marginTop: '15px', padding: '10px', backgroundColor: '#e9ecef', borderRadius: '4px' }}>
                            <strong>Total a devolver: ${montoDevolucion.toFixed(2)}</strong>
                        </div>
                    </div>

                    {/* Punto de Venta - Productos Nuevos */}
                    <div style={styles.section}>
                        <h2 style={styles.sectionHeader}>Productos nuevos</h2>
                        
                        {/* Búsqueda de productos */}
                        <div style={styles.inputGroup}>
                            <input
                                ref={barcodeProductoRef}
                                type="text"
                                placeholder="Escanear código de barras o buscar producto..."
                                value={busquedaProducto}
                                onChange={(e) => setBusquedaProducto(e.target.value)}
                                onKeyPress={(e) => {
                                    if (e.key === 'Enter') {
                                        handleBuscarProducto();
                                    }
                                }}
                                style={styles.inputField}
                            />
                            <button onClick={handleBuscarProducto} style={styles.primaryButton}>Buscar</button>
                        </div>

                        {/* Lista de productos disponibles */}
                        {filterTerm && productos.length > 0 && (
                            <div style={styles.tableResponsive}>
                                <table style={styles.table}>
                                    <thead>
                                        <tr style={styles.tableHeaderRow}>
                                            <th style={styles.th}>Nombre</th>
                                            <th style={styles.th}>Talle</th>
                                            <th style={styles.th}>Precio</th>
                                            <th style={styles.th}>Stock</th>
                                            <th style={styles.th}>Acción</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {productos.map(producto => (
                                            <tr key={producto.id} style={styles.tableRow}>
                                                <td style={styles.td}>{producto.nombre}</td>
                                                <td style={styles.td}>{producto.talle}</td>
                                                <td style={styles.td}>${parseFloat(producto.precio).toFixed(2)}</td>
                                                <td style={styles.td}>{producto.stock}</td>
                                                <td style={styles.td}>
                                                    <button
                                                        onClick={() => handleAddProductoEnVenta(producto, 1)}
                                                        disabled={producto.stock === 0}
                                                        style={producto.stock === 0 ? styles.disabledButton : styles.addButton}
                                                    >
                                                        {producto.stock === 0 ? 'Sin Stock' : 'Añadir'}
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                        
                        {productoSeleccionado && (
                            <div style={styles.foundProductCard}>
                                <p style={styles.foundProductText}>
                                    <strong>Producto:</strong> {productoSeleccionado.nombre} ({productoSeleccionado.talle}) - ${parseFloat(productoSeleccionado.precio).toFixed(2)}
                                </p>
                                <p style={styles.foundProductText}>
                                    Stock Disponible: {productoSeleccionado.stock}
                                </p>
                                <div style={styles.productActions}>
                                    <button
                                        onClick={() => handleAddProductoEnVenta(productoSeleccionado, 1)}
                                        disabled={productoSeleccionado.stock === 0}
                                        style={productoSeleccionado.stock === 0 ? styles.disabledButton : styles.addProductButton}
                                    >
                                        {productoSeleccionado.stock === 0 ? 'Sin Stock' : 'Añadir 1 Ud.'}
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* Carrito de productos nuevos */}
                        {activeCart && activeCart.items.length > 0 && (
                            <div style={styles.section}>
                                <h3 style={styles.sectionHeader}>Carrito de productos nuevos</h3>
                                <div style={styles.tableResponsive}>
                                    <table style={styles.table}>
                                        <thead>
                                            <tr style={styles.tableHeaderRow}>
                                                <th style={styles.th}>Producto</th>
                                                <th style={styles.th}>Talle</th>
                                                <th style={styles.th}>Cantidad</th>
                                                <th style={styles.th}>P. Unitario</th>
                                                <th style={styles.th}>Subtotal</th>
                                                <th style={styles.th}>Acciones</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {activeCart.items.map((item) => (
                                                <tr key={item.product.id} style={styles.tableRow}>
                                                    <td style={styles.td}>{item.product.nombre}</td>
                                                    <td style={styles.td}>{item.product.talle}</td>
                                                    <td style={styles.td}>
                                                        <div style={styles.quantityControl}>
                                                            <button onClick={() => decrementProductQuantity(activeCartId, item.product.id)} style={styles.quantityButton}>-</button>
                                                            <span style={styles.quantityText}>{item.quantity}</span>
                                                            <button onClick={() => handleAddProductoEnVenta(item.product, 1)} style={styles.quantityButton}>+</button>
                                                        </div>
                                                    </td>
                                                    <td style={styles.td}>${parseFloat(item.product.precio).toFixed(2)}</td>
                                                    <td style={styles.td}>${(item.quantity * parseFloat(item.product.precio)).toFixed(2)}</td>
                                                    <td style={styles.td}>
                                                        <button onClick={() => removeProductFromCart(activeCartId, item.product.id)} style={styles.removeButton}>
                                                            Quitar
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                                <h4 style={styles.totalVenta}>Subtotal: ${activeCart.total.toFixed(2)}</h4>
                                
                                {/* Descuentos y Recargos */}
                                <div style={styles.ajustesContainer}>
                                    <div style={styles.ajusteGrupo}>
                                        <label htmlFor="recargoMonto" style={styles.ajusteLabel}>Recargo $:</label>
                                        <input
                                            type="number"
                                            id="recargoMonto"
                                            value={recargoMonto}
                                            onChange={(e) => {
                                                setRecargoMonto(Math.max(0, parseFloat(e.target.value) || 0));
                                                setRecargoPorcentaje(''); 
                                                setDescuentoMonto('');    
                                                setDescuentoPorcentaje('');
                                            }}
                                            style={styles.ajusteInput}
                                            min="0"
                                        />
                                        <span style={styles.ajusteSeparador}>O</span>
                                        <label htmlFor="recargoPorcentaje" style={styles.ajusteLabel}>%:</label>
                                        <input
                                            type="number"
                                            id="recargoPorcentaje"
                                            value={recargoPorcentaje}
                                            onChange={(e) => {
                                                setRecargoPorcentaje(Math.max(0, parseFloat(e.target.value) || 0));
                                                setRecargoMonto('');       
                                                setDescuentoMonto('');     
                                                setDescuentoPorcentaje('');
                                            }}
                                            style={styles.ajusteInput}
                                            min="0"
                                        />
                                    </div>
                                    
                                    <div style={styles.ajusteGrupo}>
                                        <label htmlFor="descuentoMonto" style={styles.ajusteLabel}>Descuento $:</label>
                                        <input
                                            type="number"
                                            id="descuentoMonto"
                                            value={descuentoMonto}
                                            onChange={(e) => {
                                                setDescuentoMonto(Math.max(0, parseFloat(e.target.value) || 0));
                                                setDescuentoPorcentaje(''); 
                                                setRecargoMonto('');       
                                                setRecargoPorcentaje('');  
                                            }}
                                            style={styles.ajusteInput}
                                            min="0"
                                        />
                                        <span style={styles.ajusteSeparador}>O</span>
                                        <label htmlFor="descuentoPorcentaje" style={styles.ajusteLabel}>%:</label>
                                        <input
                                            type="number"
                                            id="descuentoPorcentaje"
                                            value={descuentoPorcentaje}
                                            onChange={(e) => {
                                                setDescuentoPorcentaje(Math.max(0, Math.min(100, parseFloat(e.target.value) || 0)));
                                                setDescuentoMonto('');
                                                setRecargoMonto('');       
                                                setRecargoPorcentaje('');  
                                            }}
                                            style={styles.ajusteInput}
                                            min="0"
                                            max="100"
                                        />
                                    </div>
                                </div>
                                
                                <div style={{...styles.ajusteGrupo, marginTop: '10px', justifyContent: 'flex-start', border: 'none', padding: '0'}}> 
                                    <input
                                        type="checkbox"
                                        id="redondearMonto"
                                        checked={redondearMonto}
                                        onChange={(e) => setRedondearMonto(e.target.checked)}
                                        style={{ marginRight: '8px', cursor: 'pointer' }} 
                                    />
                                    <label htmlFor="redondearMonto" style={{...styles.ajusteLabel, cursor: 'pointer', fontSize: '0.9em'}}>
                                        Redondear total (múlt. 100 ↓)
                                    </label>
                                </div>
                                
                                <h4 style={styles.finalTotalVenta}>Total con ajustes: ${montoNuevo.toFixed(2)}</h4>

                                {/* Método de pago (solo si hay diferencia a pagar) */}
                                {montoDiferencia > 0 && (
                                    <div style={styles.paymentMethodSelectContainer}>
                                        <label htmlFor="metodoPago" style={styles.paymentMethodLabel}>Método de Pago:</label>
                                        <select
                                            id="metodoPago"
                                            value={metodoPagoSeleccionado}
                                            onChange={(e) => {
                                                setMetodoPagoSeleccionado(e.target.value);
                                                setArancelSeleccionadoId('');
                                            }}
                                            style={styles.inputField}
                                        >
                                            <option value="">Selecciona un método de pago</option>
                                            {metodosPago.map(method => (
                                                <option key={method.id} value={method.nombre}>{method.nombre}</option>
                                            ))}
                                        </select>
                                    </div>
                                )}
                                
                                {isMetodoFinancieroActivo && arancelesDisponibles.length > 0 && (
                                    <div style={styles.paymentMethodSelectContainer}>
                                        <label htmlFor="arancelPlan" style={styles.paymentMethodLabel}>Plan / Arancel:</label>
                                        <select
                                            id="arancelPlan"
                                            value={arancelSeleccionadoId}
                                            onChange={(e) => setArancelSeleccionadoId(e.target.value)}
                                            style={styles.inputField}
                                            required
                                        >
                                            <option value="">-- Seleccionar Plan/Arancel --</option>
                                            {arancelesDisponibles.map(arancel => (
                                                <option key={arancel.id} value={arancel.id}>
                                                    {arancel.nombre_plan} ({parseFloat(arancel.arancel_porcentaje).toFixed(2)}% Arancel)
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                )}
                                {isMetodoFinancieroActivo && arancelSeleccionadoId && (
                                    <h4 style={styles.arancelDisplay}>
                                        Arancel a pagar: ${calculateArancel().toFixed(2)}
                                    </h4>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Resumen Final */}
                    <div style={styles.section}>
                        <h2 style={styles.sectionHeader}>Resumen</h2>
                        <p><strong>Monto a devolver:</strong> ${montoDevolucion.toFixed(2)}</p>
                        <p><strong>Monto de productos nuevos:</strong> ${montoNuevo.toFixed(2)}</p>
                        <p><strong>Diferencia:</strong> ${montoDiferencia.toFixed(2)}</p>
                        {saldoAFavor > 0 && (
                            <p style={{ color: 'green', fontSize: '18px' }}>
                                <strong>✅ Saldo a favor: ${saldoAFavor.toFixed(2)}</strong>
                                <br />
                                <small>Se generará un recibo de nota de crédito automáticamente</small>
                            </p>
                        )}
                        {montoDiferencia > 0 && (
                            <p style={{ color: 'red', fontSize: '18px' }}>
                                <strong>⚠️ Diferencia a pagar: ${montoDiferencia.toFixed(2)}</strong>
                                <br />
                                <small>Se creará una venta normal que puede facturarse o recibirse</small>
                            </p>
                        )}
                        {montoDiferencia === 0 && montoDevolucion > 0 && (
                            <p style={{ color: 'blue', fontSize: '18px' }}>
                                <strong>✓ Cambio sin diferencia</strong>
                            </p>
                        )}
                    </div>

                    {/* Botón procesar */}
                    <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
                        <button
                            onClick={procesarCambioDevolucion}
                            disabled={procesando || productosADevolver.length === 0}
                            style={{
                                ...styles.processSaleButton,
                                backgroundColor: procesando || productosADevolver.length === 0 ? '#ccc' : '#007bff',
                                cursor: procesando || productosADevolver.length === 0 ? 'not-allowed' : 'pointer'
                            }}
                        >
                            {procesando ? 'Procesando...' : 'Procesar Cambio/Devolución'}
                        </button>
                        <button
                            onClick={() => navigate(-1)}
                            style={{...styles.modalCancelButton, padding: '15px'}}
                        >
                            Cancelar
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

// --- OBJETO DE ESTILOS (Igual que PuntoVenta.js) ---
const styles = {
    container: { padding: 0, fontFamily: 'Arial, sans-serif', width: '100%' },
    pageTitle: { color: '#2c3e50', fontSize: '1.5rem', fontWeight: 600, marginBottom: '0.5rem' },
    section: { marginBottom: '30px', padding: '20px', backgroundColor: '#f9f9f9', borderRadius: '8px' },
    sectionHeader: { color: '#34495e', fontSize: '1.1rem', borderBottom: '1px solid #eee', paddingBottom: '8px', marginTop: '1rem', marginBottom: '0.5rem' },
    loadingMessage: { textAlign: 'center', color: '#777' },
    accessDeniedMessage: { color: '#dc3545', textAlign: 'center' },
    noStoreSelectedMessage: { textAlign: 'center', marginTop: '50px' },
    errorMessage: { color: '#dc3545', padding: '10px', backgroundColor: '#ffe3e6', border: '1px solid #dc3545', borderRadius: '5px' },
    inputGroup: { display: 'flex', gap: '10px', marginBottom: '20px', alignItems: 'center' },
    inputField: { padding: '8px', border: '1px solid #ccc', borderRadius: '4px', boxSizing: 'border-box', flex: 1 },
    primaryButton: { padding: '10px 15px', backgroundColor: '#007bff', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer' },
    foundProductCard: { border: '1px solid #ccc', padding: '15px', borderRadius: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px', marginTop: '15px' },
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
    totalVenta: { textAlign: 'right', fontSize: '1.2em', color: '#333', marginTop: '15px' },
    paymentMethodSelectContainer: { display: 'flex', alignItems: 'center', gap: '10px', marginTop: '15px' },
    paymentMethodLabel: { fontWeight: 'bold' },
    ajustesContainer: { display: 'flex', justifyContent: 'space-between', gap: '15px', marginTop: '15px' },
    ajusteGrupo: { display: 'flex', alignItems: 'center', gap: '8px', flex: 1, padding: '10px', border: '1px solid #ddd', borderRadius: '5px', backgroundColor: '#fff' },
    ajusteLabel: { fontWeight: 'bold', fontSize: '0.9em' },
    ajusteInput: { width: '70px', padding: '8px', border: '1px solid #ccc', borderRadius: '4px' },
    ajusteSeparador: { fontWeight: 'bold', color: '#777' },
    finalTotalVenta: { textAlign: 'right', fontSize: '1.5em', color: '#28a745', marginTop: '15px' },
    processSaleButton: { display: 'block', width: '100%', padding: '15px', backgroundColor: '#28a745', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', marginTop: '20px' },
    addButton: { padding: '8px 15px', backgroundColor: '#007bff', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' },
    noDataMessage: { textAlign: 'center', fontStyle: 'italic', color: '#777' },
    arancelDisplay: { textAlign: 'right', fontSize: '1em', color: '#e74c3c', marginTop: '5px' },
    modalCancelButton: { padding: '8px 15px', backgroundColor: '#dc3545', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer' },
};

export default CambioDevolucion;
