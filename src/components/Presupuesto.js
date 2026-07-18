// components/Presupuesto.js
import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import Swal from 'sweetalert2';
import { useAuth } from '../AuthContext';
import { formatearMonto } from '../utils/formatearMonto';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';
const normalizeApiUrl = (url) => {
    if (!url) return 'http://localhost:8000';
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

const Presupuesto = () => {
    const { token, selectedStoreSlug } = useAuth();
    const navigate = useNavigate();

    const [modo, setModo] = useState('nuevo'); // 'nuevo' | 'buscar'

    // Carrito propio (estado local, no comparte SalesContext con Punto de Venta)
    const [items, setItems] = useState([]); // [{ product, quantity }]
    const [productos, setProductos] = useState([]);
    const [filterTerm, setFilterTerm] = useState('');
    const [loadingProductos, setLoadingProductos] = useState(false);

    // Cliente obligatorio
    const [busquedaCliente, setBusquedaCliente] = useState('');
    const [clientesEncontrados, setClientesEncontrados] = useState([]);
    const [clienteSeleccionado, setClienteSeleccionado] = useState(null);
    const [buscandoCliente, setBuscandoCliente] = useState(false);

    // Descuento / recargo (mutuamente excluyentes, igual que Punto de Venta)
    const [descuentoPorcentaje, setDescuentoPorcentaje] = useState('');
    const [descuentoMonto, setDescuentoMonto] = useState('');
    const [recargoPorcentaje, setRecargoPorcentaje] = useState('');
    const [recargoMonto, setRecargoMonto] = useState('');

    const [metodosPago, setMetodosPago] = useState([]);
    const [metodoPagoSugerido, setMetodoPagoSugerido] = useState('');
    const [notas, setNotas] = useState('');

    const [generando, setGenerando] = useState(false);
    const [presupuestoActivo, setPresupuestoActivo] = useState(null);

    // Búsqueda de presupuesto existente
    const [busquedaId, setBusquedaId] = useState('');
    const [buscandoPresupuesto, setBuscandoPresupuesto] = useState(false);
    const [errorBusqueda, setErrorBusqueda] = useState(null);

    const [enviandoEmail, setEnviandoEmail] = useState(false);

    // ── Carga de productos ──────────────────────────────────────────────────
    const fetchProductos = useCallback(async (searchQuery = '') => {
        if (!token || !selectedStoreSlug) return;
        setLoadingProductos(true);
        try {
            const response = await axios.get(`${BASE_API_ENDPOINT}/api/productos/`, {
                headers: { 'Authorization': `Bearer ${token}` },
                params: { tienda_slug: selectedStoreSlug, search: searchQuery },
            });
            setProductos(response.data.results || response.data || []);
        } catch (err) {
            console.error('Error al cargar productos:', err);
        } finally {
            setLoadingProductos(false);
        }
    }, [token, selectedStoreSlug]);

    useEffect(() => {
        const timeout = setTimeout(() => fetchProductos(filterTerm), 300);
        return () => clearTimeout(timeout);
    }, [filterTerm, fetchProductos]);

    const fetchMetodosPago = useCallback(async () => {
        if (!token) return;
        try {
            const response = await axios.get(`${BASE_API_ENDPOINT}/api/metodos-pago/`, {
                headers: { 'Authorization': `Bearer ${token}` },
            });
            setMetodosPago(response.data.results || response.data || []);
        } catch (err) {
            console.error('Error al cargar métodos de pago:', err);
        }
    }, [token]);

    useEffect(() => { fetchMetodosPago(); }, [fetchMetodosPago]);

    // ── Cliente obligatorio ──────────────────────────────────────────────────
    const buscarCliente = useCallback(async () => {
        if (!token || !selectedStoreSlug || !busquedaCliente.trim()) {
            setClientesEncontrados([]);
            return;
        }
        setBuscandoCliente(true);
        try {
            const response = await axios.get(`${BASE_API_ENDPOINT}/api/clientes/`, {
                headers: { 'Authorization': `Bearer ${token}` },
                params: { tienda_slug: selectedStoreSlug, search: busquedaCliente.trim() },
            });
            const resultados = response.data.results || response.data || [];
            if (resultados.length === 1) {
                setClienteSeleccionado(resultados[0]);
                setClientesEncontrados([]);
            } else {
                setClientesEncontrados(resultados);
            }
        } catch (err) {
            console.error('Error al buscar cliente:', err);
            setClientesEncontrados([]);
        } finally {
            setBuscandoCliente(false);
        }
    }, [token, selectedStoreSlug, busquedaCliente]);

    // ── Carrito local ────────────────────────────────────────────────────────
    const agregarProducto = (product, quantity = 1) => {
        setItems(prev => {
            const idx = prev.findIndex(i => i.product.id === product.id);
            if (idx > -1) {
                return prev.map((item, i) => i === idx ? { ...item, quantity: item.quantity + quantity } : item);
            }
            return [...prev, { product, quantity }];
        });
    };

    const incrementarProducto = (productId) => {
        const item = items.find(i => i.product.id === productId);
        if (item) agregarProducto(item.product, 1);
    };

    const decrementarProducto = (productId) => {
        setItems(prev => prev
            .map(item => item.product.id === productId ? { ...item, quantity: item.quantity - 1 } : item)
            .filter(item => item.quantity > 0)
        );
    };

    const quitarProducto = (productId) => {
        setItems(prev => prev.filter(item => item.product.id !== productId));
    };

    const calcularSubtotal = useCallback(() => {
        return items.reduce((sum, item) => sum + (item.quantity * parseFloat(item.product.precio)), 0);
    }, [items]);

    const calcularTotal = useCallback(() => {
        const subtotal = calcularSubtotal();
        if (parseFloat(recargoMonto) > 0) return subtotal + parseFloat(recargoMonto);
        if (parseFloat(recargoPorcentaje) > 0) return subtotal + (subtotal * (parseFloat(recargoPorcentaje) / 100));
        if (parseFloat(descuentoMonto) > 0) return Math.max(0, subtotal - parseFloat(descuentoMonto));
        if (parseFloat(descuentoPorcentaje) > 0) return subtotal - (subtotal * (parseFloat(descuentoPorcentaje) / 100));
        return subtotal;
    }, [calcularSubtotal, descuentoMonto, descuentoPorcentaje, recargoMonto, recargoPorcentaje]);

    // ── Generar presupuesto ──────────────────────────────────────────────────
    const limpiarFormularioNuevo = () => {
        setItems([]);
        setClienteSeleccionado(null);
        setBusquedaCliente('');
        setClientesEncontrados([]);
        setDescuentoPorcentaje(''); setDescuentoMonto('');
        setRecargoPorcentaje(''); setRecargoMonto('');
        setMetodoPagoSugerido('');
        setNotas('');
    };

    const cargarPresupuestoCompleto = async (id) => {
        const response = await axios.get(`${BASE_API_ENDPOINT}/api/presupuestos/${id}/`, {
            headers: { 'Authorization': `Bearer ${token}` },
        });
        setPresupuestoActivo(response.data);
    };

    const generarPresupuesto = async () => {
        if (items.length === 0) {
            Swal.fire('Error', 'Agregá al menos un producto al presupuesto.', 'error');
            return;
        }
        if (!clienteSeleccionado) {
            Swal.fire('Error', 'Debés seleccionar un cliente para generar el presupuesto.', 'error');
            return;
        }
        setGenerando(true);
        try {
            const payload = {
                tienda_slug: selectedStoreSlug,
                cliente_id: clienteSeleccionado.id,
                detalles: items.map(item => ({
                    producto: item.product.id,
                    cantidad: item.quantity,
                    precio_unitario: parseFloat(item.product.precio),
                })),
                descuento_porcentaje: parseFloat(descuentoPorcentaje) || 0,
                descuento_monto: parseFloat(descuentoMonto) || 0,
                recargo_porcentaje: parseFloat(recargoPorcentaje) || 0,
                recargo_monto: parseFloat(recargoMonto) || 0,
                metodo_pago_sugerido: metodoPagoSugerido || null,
                notas: notas || null,
            };
            const response = await axios.post(`${BASE_API_ENDPOINT}/api/presupuestos/`, payload, {
                headers: { 'Authorization': `Bearer ${token}` },
            });
            await cargarPresupuestoCompleto(response.data.id);
            limpiarFormularioNuevo();
            Swal.fire('¡Listo!', 'Presupuesto generado correctamente.', 'success');
        } catch (err) {
            const data = err.response?.data;
            const msg = data ? Object.entries(data).map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(', ') : v}`).join(' — ') : err.message;
            Swal.fire('Error', msg, 'error');
        } finally {
            setGenerando(false);
        }
    };

    // ── Buscar presupuesto existente ─────────────────────────────────────────
    const buscarPresupuesto = async () => {
        if (!busquedaId.trim() || !token || !selectedStoreSlug) return;
        setBuscandoPresupuesto(true);
        setErrorBusqueda(null);
        try {
            const response = await axios.get(`${BASE_API_ENDPOINT}/api/presupuestos/`, {
                headers: { 'Authorization': `Bearer ${token}` },
                params: { tienda_slug: selectedStoreSlug, id: busquedaId.trim() },
            });
            const resultados = response.data.results || response.data || [];
            if (resultados.length === 1) {
                setPresupuestoActivo(resultados[0]);
                setBusquedaId('');
            } else if (resultados.length > 1) {
                setErrorBusqueda('Hay más de un presupuesto que coincide. Ingresá el ID completo.');
            } else {
                setErrorBusqueda('Presupuesto no encontrado.');
            }
        } catch (err) {
            setErrorBusqueda('Error al buscar presupuesto: ' + (err.response ? JSON.stringify(err.response.data) : err.message));
        } finally {
            setBuscandoPresupuesto(false);
        }
    };

    // ── Acciones sobre un presupuesto activo ────────────────────────────────
    const verPdf = async () => {
        // Abrir la pestaña de forma síncrona (dentro del gesto del click) y recién después
        // cargarle la URL del blob: si se abre con window.open tras el await, Chrome
        // puede bloquearlo como pop-up por haber perdido el contexto de gesto del usuario.
        const nuevaVentana = window.open('', '_blank');
        try {
            const response = await axios.get(`${BASE_API_ENDPOINT}/api/presupuestos/${presupuestoActivo.id}/pdf/`, {
                headers: { 'Authorization': `Bearer ${token}` },
                responseType: 'blob',
            });
            const blob = new Blob([response.data], { type: 'application/pdf' });
            const url = URL.createObjectURL(blob);
            if (nuevaVentana) {
                nuevaVentana.location.href = url;
            } else {
                window.open(url, '_blank');
            }
            setTimeout(() => URL.revokeObjectURL(url), 60000);
        } catch (err) {
            if (nuevaVentana) nuevaVentana.close();
            Swal.fire('Error', 'No se pudo generar el PDF.', 'error');
        }
    };

    const enviarPorEmail = async () => {
        const { value: email } = await Swal.fire({
            title: 'Enviar presupuesto por mail',
            input: 'email',
            inputLabel: 'Email de destino',
            inputValue: presupuestoActivo.cliente_email || '',
            showCancelButton: true,
            confirmButtonText: 'Enviar',
            cancelButtonText: 'Cancelar',
        });
        if (!email) return;
        setEnviandoEmail(true);
        try {
            await axios.post(`${BASE_API_ENDPOINT}/api/presupuestos/${presupuestoActivo.id}/enviar-email/`, { email }, {
                headers: { 'Authorization': `Bearer ${token}` },
            });
            Swal.fire('¡Enviado!', `El presupuesto se envió a ${email}.`, 'success');
        } catch (err) {
            const msg = err.response?.data?.error || err.message;
            Swal.fire('Error', msg, 'error');
        } finally {
            setEnviandoEmail(false);
        }
    };

    const generarCarritoVenta = () => {
        navigate('/punto-venta', { state: { presupuesto: presupuestoActivo } });
    };

    // ── Render ───────────────────────────────────────────────────────────────
    return (
        <div style={styles.container}>
            <h1 style={styles.pageTitle}>Presupuesto</h1>

            <div style={styles.tabRow}>
                <button
                    onClick={() => { setModo('nuevo'); setPresupuestoActivo(null); }}
                    style={modo === 'nuevo' ? styles.tabButtonActive : styles.tabButton}
                >
                    Nuevo presupuesto
                </button>
                <button
                    onClick={() => { setModo('buscar'); setPresupuestoActivo(null); }}
                    style={modo === 'buscar' ? styles.tabButtonActive : styles.tabButton}
                >
                    Buscar presupuesto
                </button>
            </div>

            {modo === 'buscar' && !presupuestoActivo && (
                <div style={styles.section}>
                    <h2 style={styles.sectionHeader}>Buscar por ID</h2>
                    <div style={styles.inputGroup}>
                        <input
                            type="text"
                            placeholder="ID de presupuesto (completo o parcial)..."
                            value={busquedaId}
                            onChange={(e) => setBusquedaId(e.target.value)}
                            onKeyPress={(e) => { if (e.key === 'Enter') buscarPresupuesto(); }}
                            style={styles.inputField}
                        />
                        <button onClick={buscarPresupuesto} disabled={buscandoPresupuesto} style={styles.primaryButton}>
                            {buscandoPresupuesto ? 'Buscando...' : 'Buscar'}
                        </button>
                    </div>
                    {errorBusqueda && <div style={styles.errorMessage}>{errorBusqueda}</div>}
                </div>
            )}

            {modo === 'nuevo' && !presupuestoActivo && (
                <>
                    <div style={styles.section}>
                        <h2 style={styles.sectionHeader}>Cliente (obligatorio)</h2>
                        {clienteSeleccionado ? (
                            <div style={styles.clienteSeleccionadoBox}>
                                <span style={{ flex: 1 }}>
                                    <strong>{clienteSeleccionado.nombre_razon_social}</strong> — {clienteSeleccionado.cuit_cuil}
                                </span>
                                <button
                                    type="button"
                                    onClick={() => { setClienteSeleccionado(null); setBusquedaCliente(''); setClientesEncontrados([]); }}
                                    style={styles.linkButtonDanger}
                                >
                                    Cambiar
                                </button>
                            </div>
                        ) : (
                            <div>
                                <div style={styles.inputGroup}>
                                    <input
                                        type="text"
                                        placeholder="Buscar cliente por CUIT/CUIL o nombre..."
                                        value={busquedaCliente}
                                        onChange={(e) => setBusquedaCliente(e.target.value)}
                                        onKeyPress={(e) => { if (e.key === 'Enter') buscarCliente(); }}
                                        style={styles.inputField}
                                    />
                                    <button type="button" onClick={buscarCliente} disabled={buscandoCliente} style={styles.primaryButton}>
                                        {buscandoCliente ? 'Buscando...' : 'Buscar'}
                                    </button>
                                </div>
                                {clientesEncontrados.length > 0 && (
                                    <div style={styles.resultadosBox}>
                                        {clientesEncontrados.map(cliente => (
                                            <div
                                                key={cliente.id}
                                                onClick={() => { setClienteSeleccionado(cliente); setClientesEncontrados([]); }}
                                                style={styles.resultadoItem}
                                            >
                                                <strong>{cliente.nombre_razon_social}</strong> — {cliente.cuit_cuil}
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    <div style={styles.section}>
                        <h2 style={styles.sectionHeader}>Productos</h2>
                        <div style={styles.inputGroup}>
                            <input
                                type="text"
                                placeholder="Buscar por nombre..."
                                value={filterTerm}
                                onChange={(e) => setFilterTerm(e.target.value)}
                                style={styles.inputField}
                            />
                        </div>
                        {loadingProductos ? (
                            <p style={styles.noDataMessage}>Cargando productos...</p>
                        ) : (
                            <div style={styles.tableResponsive}>
                                <table style={styles.table}>
                                    <thead>
                                        <tr style={styles.tableHeaderRow}>
                                            <th style={styles.th}>Nombre</th>
                                            <th style={styles.th}>Precio</th>
                                            <th style={styles.th}>Stock</th>
                                            <th style={styles.th}>Acción</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {productos.length > 0 ? productos.flatMap(product => {
                                            if (product.variantes && product.variantes.length > 0) {
                                                return product.variantes.map(v => ({ ...v, nombre: v.nombre || product.nombre }));
                                            }
                                            return [product];
                                        }).map(product => (
                                            <tr key={product.id} style={styles.tableRow}>
                                                <td style={styles.td}>{product.nombre}</td>
                                                <td style={styles.td}>{formatearMonto(product.precio)}</td>
                                                <td style={styles.td}>{product.stock}</td>
                                                <td style={styles.td}>
                                                    <button onClick={() => agregarProducto(product, 1)} style={styles.addButton}>Añadir</button>
                                                </td>
                                            </tr>
                                        )) : (
                                            <tr><td colSpan={4} style={{ ...styles.noDataMessage, textAlign: 'center', padding: '16px' }}>No se encontraron productos.</td></tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>

                    {items.length > 0 && (
                        <div style={styles.section}>
                            <h2 style={styles.sectionHeader}>Carrito del presupuesto</h2>
                            <div style={styles.tableResponsive}>
                                <table style={styles.table}>
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
                                        {items.map(item => (
                                            <tr key={item.product.id} style={styles.tableRow}>
                                                <td style={styles.td}>{item.product.nombre}</td>
                                                <td style={styles.td}>
                                                    <div style={styles.quantityControl}>
                                                        <button onClick={() => decrementarProducto(item.product.id)} style={styles.quantityButton}>−</button>
                                                        <span style={styles.quantityText}>{item.quantity}</span>
                                                        <button onClick={() => incrementarProducto(item.product.id)} style={styles.quantityButton}>+</button>
                                                    </div>
                                                </td>
                                                <td style={styles.td}>{formatearMonto(item.product.precio)}</td>
                                                <td style={styles.td}>{formatearMonto(item.quantity * parseFloat(item.product.precio))}</td>
                                                <td style={styles.td}>
                                                    <button onClick={() => quitarProducto(item.product.id)} style={styles.removeButton}>Quitar</button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>

                            <h4 style={styles.subtotalText}>Subtotal: {formatearMonto(calcularSubtotal())}</h4>

                            <div style={styles.ajustesContainer}>
                                <div style={styles.ajusteGrupo}>
                                    <label style={styles.ajusteLabel}>Recargo $</label>
                                    <input
                                        type="number" min="0" style={styles.ajusteInput}
                                        value={recargoMonto}
                                        onChange={(e) => { setRecargoMonto(Math.max(0, parseFloat(e.target.value) || 0)); setRecargoPorcentaje(''); setDescuentoMonto(''); setDescuentoPorcentaje(''); }}
                                    />
                                    <span style={styles.ajusteSeparador}>o %</span>
                                    <input
                                        type="number" min="0" style={styles.ajusteInput}
                                        value={recargoPorcentaje}
                                        onChange={(e) => { setRecargoPorcentaje(Math.max(0, parseFloat(e.target.value) || 0)); setRecargoMonto(''); setDescuentoMonto(''); setDescuentoPorcentaje(''); }}
                                    />
                                </div>
                                <div style={styles.ajusteGrupo}>
                                    <label style={styles.ajusteLabel}>Descuento $</label>
                                    <input
                                        type="number" min="0" style={styles.ajusteInput}
                                        value={descuentoMonto}
                                        onChange={(e) => { setDescuentoMonto(Math.max(0, parseFloat(e.target.value) || 0)); setDescuentoPorcentaje(''); setRecargoMonto(''); setRecargoPorcentaje(''); }}
                                    />
                                    <span style={styles.ajusteSeparador}>o %</span>
                                    <input
                                        type="number" min="0" max="100" style={styles.ajusteInput}
                                        value={descuentoPorcentaje}
                                        onChange={(e) => { setDescuentoPorcentaje(Math.max(0, Math.min(100, parseFloat(e.target.value) || 0))); setDescuentoMonto(''); setRecargoMonto(''); setRecargoPorcentaje(''); }}
                                    />
                                </div>
                            </div>

                            <div style={styles.paymentMethodSelectContainer}>
                                <label style={styles.paymentMethodLabel}>Medio de pago sugerido</label>
                                <select
                                    value={metodoPagoSugerido}
                                    onChange={(e) => setMetodoPagoSugerido(e.target.value)}
                                    style={{ ...styles.inputField, flex: 1 }}
                                >
                                    <option value="">Sin especificar</option>
                                    {metodosPago.map(m => (
                                        <option key={m.id} value={m.nombre}>{m.nombre}</option>
                                    ))}
                                </select>
                            </div>

                            <div style={styles.paymentMethodSelectContainer}>
                                <label style={styles.paymentMethodLabel}>Notas</label>
                                <input
                                    type="text"
                                    value={notas}
                                    onChange={(e) => setNotas(e.target.value)}
                                    placeholder="Observaciones opcionales..."
                                    style={{ ...styles.inputField, flex: 1 }}
                                />
                            </div>

                            <h4 style={styles.finalTotalText}>Total: {formatearMonto(calcularTotal())}</h4>

                            <button
                                onClick={generarPresupuesto}
                                disabled={generando}
                                style={{ ...styles.processButton, ...(generando ? { opacity: 0.65, cursor: 'not-allowed' } : {}) }}
                            >
                                {generando ? 'Generando...' : 'Generar Presupuesto'}
                            </button>
                        </div>
                    )}
                </>
            )}

            {presupuestoActivo && (
                <div style={styles.section}>
                    <h2 style={styles.sectionHeader}>Presupuesto Nº {presupuestoActivo.id}</h2>
                    <p style={styles.detalleLinea}><strong>Cliente:</strong> {presupuestoActivo.cliente_nombre} — {presupuestoActivo.cliente_cuit}</p>
                    <p style={styles.detalleLinea}><strong>Estado:</strong> {presupuestoActivo.estado_display}</p>
                    <p style={styles.detalleLinea}><strong>Fecha:</strong> {new Date(presupuestoActivo.fecha_creacion).toLocaleString('es-AR')}</p>

                    <div style={styles.tableResponsive}>
                        <table style={styles.table}>
                            <thead>
                                <tr style={styles.tableHeaderRow}>
                                    <th style={styles.th}>Producto</th>
                                    <th style={styles.th}>Cant.</th>
                                    <th style={styles.th}>P. unit.</th>
                                    <th style={styles.th}>Subtotal</th>
                                </tr>
                            </thead>
                            <tbody>
                                {(presupuestoActivo.detalles || []).map(d => (
                                    <tr key={d.id} style={styles.tableRow}>
                                        <td style={styles.td}>{d.producto ? d.producto.nombre : 'Producto eliminado'}</td>
                                        <td style={styles.td}>{d.cantidad}</td>
                                        <td style={styles.td}>{formatearMonto(d.precio_unitario)}</td>
                                        <td style={styles.td}>{formatearMonto(d.subtotal)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    <h4 style={styles.finalTotalText}>Total: {formatearMonto(presupuestoActivo.total)}</h4>

                    <div style={styles.accionesRow}>
                        <button onClick={verPdf} style={styles.secondaryButton}>Ver / Imprimir PDF</button>
                        <button onClick={enviarPorEmail} disabled={enviandoEmail} style={styles.secondaryButton}>
                            {enviandoEmail ? 'Enviando...' : 'Enviar por mail'}
                        </button>
                        {presupuestoActivo.estado === 'PENDIENTE' && (
                            <button onClick={generarCarritoVenta} style={styles.primaryButton}>Generar carrito de venta</button>
                        )}
                    </div>
                    {presupuestoActivo.estado === 'CONVERTIDO' && (
                        <p style={styles.arancelWarning}>Este presupuesto ya fue convertido en una venta.</p>
                    )}

                    <button
                        onClick={() => { setPresupuestoActivo(null); }}
                        style={{ ...styles.linkButton, marginTop: 15 }}
                    >
                        ← Volver
                    </button>
                </div>
            )}
        </div>
    );
};

const styles = {
    container: { padding: 0, fontFamily: "'Inter', 'Segoe UI', system-ui, sans-serif", width: '100%' },
    pageTitle: { color: '#1a2926', fontSize: '1.5rem', fontWeight: 600, marginBottom: '0.5rem' },
    tabRow: { display: 'flex', gap: 10, marginBottom: 20 },
    tabButton: { padding: '10px 18px', backgroundColor: '#f1f5f9', color: '#475569', border: '1px solid #e2e8f0', borderRadius: '10px', cursor: 'pointer', fontWeight: 600 },
    tabButtonActive: { padding: '10px 18px', backgroundColor: '#5dc87a', color: 'white', border: 'none', borderRadius: '10px', cursor: 'pointer', fontWeight: 600 },
    section: { marginBottom: '30px', padding: '20px', backgroundColor: '#f1f5f9', borderRadius: '10px' },
    sectionHeader: { color: '#475569', fontSize: '1.1rem', borderBottom: '1px solid #e2e8f0', paddingBottom: '8px', marginTop: 0, marginBottom: '0.5rem' },
    errorMessage: { color: '#e25252', padding: '10px', backgroundColor: '#fef2f2', border: '1px solid #fca5a5', borderRadius: '6px', marginTop: 10 },
    noDataMessage: { textAlign: 'center', fontStyle: 'italic', color: '#94a3b8' },
    inputGroup: { display: 'flex', gap: '10px', marginBottom: '10px', alignItems: 'center', flexWrap: 'wrap' },
    inputField: { padding: '8px', border: '1px solid #e2e8f0', borderRadius: '10px', boxSizing: 'border-box', flex: 1, width: '100%' },
    primaryButton: { padding: '10px 15px', backgroundColor: '#5dc87a', color: 'white', border: 'none', borderRadius: '10px', cursor: 'pointer', fontWeight: 600 },
    secondaryButton: { padding: '10px 15px', backgroundColor: '#94a3b8', color: 'white', border: 'none', borderRadius: '10px', cursor: 'pointer', fontWeight: 600 },
    addButton: { padding: '7px 14px', backgroundColor: '#5dc87a', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 600, fontSize: '0.9em' },
    removeButton: { padding: '6px 12px', backgroundColor: '#fef2f2', color: '#991b1b', border: '1px solid #fca5a5', borderRadius: '6px', cursor: 'pointer', fontWeight: 600, fontSize: '0.9em' },
    tableResponsive: { overflowX: 'auto', WebkitOverflowScrolling: 'touch' },
    table: { width: '100%', borderCollapse: 'collapse', marginTop: '10px' },
    tableHeaderRow: { backgroundColor: '#e2e8f0' },
    th: { padding: '10px', borderBottom: '2px solid #e2e8f0', textAlign: 'left', color: '#475569', fontWeight: 600 },
    tableRow: { backgroundColor: '#ffffff' },
    td: { padding: '10px', borderBottom: '1px solid #f1f5f9', verticalAlign: 'middle' },
    quantityControl: { display: 'flex', alignItems: 'center', gap: '5px' },
    quantityButton: { padding: '4px 8px', backgroundColor: '#5dc87a', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 700 },
    quantityText: { padding: '0 5px', fontWeight: 600, minWidth: 24, textAlign: 'center' },
    clienteSeleccionadoBox: { display: 'flex', alignItems: 'center', gap: 10, background: '#edfaf3', border: '1px solid #a8e6c5', borderRadius: 10, padding: '8px 12px' },
    resultadosBox: { marginTop: 8, border: '1px solid #e2e8f0', borderRadius: 10, overflow: 'hidden', backgroundColor: '#fff' },
    resultadoItem: { padding: '8px 12px', cursor: 'pointer', borderBottom: '1px solid #f1f5f9' },
    linkButtonDanger: { background: 'none', border: 'none', color: '#e25252', cursor: 'pointer', textDecoration: 'underline', fontSize: 13 },
    linkButton: { background: 'none', border: 'none', color: '#3b9ede', cursor: 'pointer', textDecoration: 'underline', fontSize: 14, padding: 0 },
    subtotalText: { textAlign: 'right', fontSize: '1.1em', color: '#475569', fontWeight: 600, margin: '12px 0 4px' },
    finalTotalText: { textAlign: 'right', fontSize: '1.5em', color: '#5dc87a', fontWeight: 700, margin: '8px 0' },
    ajustesContainer: { display: 'flex', justifyContent: 'space-between', gap: '15px', marginTop: '15px', flexWrap: 'wrap' },
    ajusteGrupo: { display: 'flex', alignItems: 'center', gap: '8px', flex: 1, minWidth: 220, padding: '10px', border: '1px solid #e2e8f0', borderRadius: '6px', backgroundColor: '#fff' },
    ajusteLabel: { fontWeight: '600', fontSize: '0.9em', color: '#475569' },
    ajusteInput: { width: '70px', padding: '8px', border: '1px solid #e2e8f0', borderRadius: '6px', color: '#1a2926', fontSize: '0.9em' },
    ajusteSeparador: { fontWeight: 'bold', color: '#94a3b8' },
    paymentMethodSelectContainer: { display: 'flex', alignItems: 'center', gap: '10px', marginTop: '15px' },
    paymentMethodLabel: { fontWeight: '600', color: '#475569', whiteSpace: 'nowrap', minWidth: 160 },
    processButton: { display: 'block', width: '100%', padding: '15px', background: '#5dc87a', color: 'white', border: 'none', borderRadius: '10px', cursor: 'pointer', marginTop: '20px', fontSize: '1.1em', fontWeight: 700 },
    detalleLinea: { margin: '4px 0', color: '#334155' },
    accionesRow: { display: 'flex', gap: 10, marginTop: 20, flexWrap: 'wrap' },
    arancelWarning: { padding: '10px', backgroundColor: '#fffbeb', border: '1px solid #fcd34d', borderRadius: '6px', color: '#92400e', fontSize: '0.9em', marginTop: 10 },
};

export default Presupuesto;
