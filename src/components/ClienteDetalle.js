// ClienteDetalle.js
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import axios from 'axios';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../AuthContext';
import Swal from 'sweetalert2';
import { formatearMonto } from '../utils/formatearMonto';
import SelectorDiaCierre from './SelectorDiaCierre';

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

const ClienteDetalle = () => {
    const { clienteId } = useParams();
    const navigate = useNavigate();
    const { token, user, stores, selectedStoreSlug } = useAuth();

    const [cliente, setCliente] = useState(null);
    const [historial, setHistorial] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // Cobro de deuda
    const [mostrarCobro, setMostrarCobro] = useState(false);
    const [montoCobro, setMontoCobro] = useState('');
    const [metodoPagoCobro, setMetodoPagoCobro] = useState('');
    const [metodosPago, setMetodosPago] = useState([]);
    const [cobrando, setCobrando] = useState(false);

    // Edición inline de los datos del cliente
    const [campoEditando, setCampoEditando] = useState(null);
    const [valorEditado, setValorEditado] = useState('');
    const [guardandoCampo, setGuardandoCampo] = useState(false);

    // Descarga del PDF de resumen de cuenta
    // Key del mes (ej. "2026-07") en descarga -- por fila de la tabla de Resumen
    // mensual, no un solo booleano global: cada mes tiene su propio botón.
    const [descargandoResumenKey, setDescargandoResumenKey] = useState(null);

    const fetchDatos = useCallback(async () => {
        if (!token || !clienteId) return;
        setLoading(true);
        setError(null);
        try {
            const headers = { 'Authorization': `Bearer ${token}` };
            const [clienteResp, historialResp] = await Promise.all([
                axios.get(`${BASE_API_ENDPOINT}/api/clientes/${clienteId}/`, { headers }),
                axios.get(`${BASE_API_ENDPOINT}/api/clientes/${clienteId}/historial/`, { headers }),
            ]);
            setCliente(clienteResp.data);
            setHistorial(historialResp.data);
        } catch (err) {
            setError('No se pudo cargar la información del cliente.');
        } finally {
            setLoading(false);
        }
    }, [token, clienteId]);

    useEffect(() => { fetchDatos(); }, [fetchDatos]);

    useEffect(() => {
        if (!token) return;
        axios.get(`${BASE_API_ENDPOINT}/api/metodos-pago/`, { headers: { 'Authorization': `Bearer ${token}` } })
            .then(r => setMetodosPago((r.data.results || r.data || []).filter(m => m.nombre !== 'Cuenta Corriente' && m.activo)))
            .catch(() => {});
    }, [token]);

    const abrirCobro = () => {
        setMontoCobro(historial?.saldo_pendiente || '');
        setMetodoPagoCobro('');
        setMostrarCobro(true);
    };

    const confirmarCobro = async () => {
        const monto = parseFloat(montoCobro);
        if (!monto || monto <= 0) {
            Swal.fire('Error', 'Ingresá un monto válido.', 'error');
            return;
        }
        if (!metodoPagoCobro) {
            Swal.fire('Error', 'Seleccioná un método de pago.', 'error');
            return;
        }
        setCobrando(true);
        try {
            const response = await axios.post(
                `${BASE_API_ENDPOINT}/api/clientes/${clienteId}/cobrar_deuda/`,
                { monto, metodo_pago: metodoPagoCobro, tienda_slug: selectedStoreSlug },
                { headers: { 'Authorization': `Bearer ${token}` } }
            );
            setMostrarCobro(false);
            navigate('/recibo-cobro', {
                state: {
                    movimiento: response.data.movimiento,
                    cliente,
                    tienda_nombre: selectedStoreSlug,
                    metodo_pago: metodoPagoCobro,
                    saldo_pendiente: response.data.saldo_pendiente,
                },
            });
        } catch (err) {
            Swal.fire('Error', err.response?.data?.error || 'No se pudo registrar el cobro.', 'error');
        } finally {
            setCobrando(false);
        }
    };

    // ── Edición inline ──────────────────────────────────────────────────────
    const empezarEdicion = (campo, valorActual) => {
        setCampoEditando(campo);
        setValorEditado(valorActual || '');
    };

    const cancelarEdicion = () => {
        setCampoEditando(null);
        setValorEditado('');
    };

    const guardarCampo = async () => {
        setGuardandoCampo(true);
        try {
            const response = await axios.patch(
                `${BASE_API_ENDPOINT}/api/clientes/${clienteId}/`,
                { [campoEditando]: valorEditado },
                { headers: { 'Authorization': `Bearer ${token}` } }
            );
            setCliente(response.data);
            setCampoEditando(null);
        } catch (err) {
            const data = err.response?.data;
            const msg = data ? Object.values(data).flat().join(' — ') : 'No se pudo actualizar el dato.';
            Swal.fire('Error', msg, 'error');
        } finally {
            setGuardandoCampo(false);
        }
    };

    // El PDF corresponde a un mes puntual (mesKey = "2026-07"), no a todo el
    // historial del cliente -- un botón por fila en la tabla de Resumen mensual.
    const descargarResumenCuenta = async (mesKey) => {
        setDescargandoResumenKey(mesKey);
        try {
            const [anio, mes] = mesKey.split('-');
            const resp = await axios.get(`${BASE_API_ENDPOINT}/api/clientes/${clienteId}/pdf-resumen-cuenta/`, {
                headers: { 'Authorization': `Bearer ${token}` },
                responseType: 'blob',
                params: { anio, mes },
            });
            const url = URL.createObjectURL(resp.data);
            const a = document.createElement('a');
            a.href = url;
            a.download = `resumen_cuenta_${cliente?.nombre_razon_social || clienteId}_${mesKey}.pdf`;
            document.body.appendChild(a);
            a.click();
            a.remove();
            setTimeout(() => URL.revokeObjectURL(url), 30000);
        } catch (err) {
            Swal.fire('Error', 'No se pudo generar el resumen de cuenta.', 'error');
        } finally {
            setDescargandoResumenKey(null);
        }
    };

    // Facturación de un consumo (Cuenta Corriente u otro medio) desde la ficha
    // del cliente -- mismo criterio/endpoints que Listado de Ventas (VentasPage.jsx),
    // para no duplicar la lógica de facturación con un comportamiento distinto.
    // El formulario se precarga con los datos YA CARGADOS en la ficha del cliente
    // (nombre/CUIT/domicilio) antes que con el snapshot de la venta -- la venta
    // suele traer "Consumidor Final" a secas, así que priorizar ese snapshot
    // nunca llegaba a usar los datos reales del cliente.
    const isStaffOnly = user?.is_staff && !user?.is_superuser && !user?.is_supervisor;
    const tiendaActualInfo = stores.find(s => s.nombre === selectedStoreSlug);
    const tiendaTieneFacturacion = !!tiendaActualInfo && tiendaActualInfo.tipo_facturacion && tiendaActualInfo.tipo_facturacion !== 'NINGUNA';

    const handleVerFactura = async (venta) => {
        try {
            const facturasResponse = await axios.get(`${BASE_API_ENDPOINT}/api/facturas/`, {
                headers: { 'Authorization': `Bearer ${token}` },
                params: { venta: venta.id },
            });
            const facturas = facturasResponse.data.results || facturasResponse.data || [];
            if (facturas.length === 0) {
                Swal.fire('Sin factura', 'Esta venta no tiene factura asociada.', 'info');
                return;
            }
            navigate('/factura', { state: { factura: facturas[0], venta } });
        } catch (err) {
            Swal.fire('Error', 'No se pudo obtener la factura.', 'error');
        }
    };

    const handleFacturarVenta = async (venta) => {
        const esMonotributista = tiendaActualInfo?.condicion_iva_emisor === 'MT';

        const { value: formValues } = await Swal.fire({
            title: 'Datos del Cliente para Factura',
            html: `
                <input id="cliente_nombre" class="swal2-input" placeholder="Nombre del cliente *" value="${(cliente?.nombre_razon_social || venta.cliente_nombre || 'Consumidor Final').replace(/"/g, '&quot;')}" required>
                <div style="display: flex; gap: 8px; align-items: center; margin: 1em auto; width: 80%;">
                    <input id="cliente_cuit" class="swal2-input" placeholder="CUIT (opcional)" type="text" style="margin: 0; flex: 1;" value="${cliente?.cuit_cuil || venta.cliente_cuit || ''}">
                    <button type="button" id="btn_buscar_padron" class="swal2-styled" style="margin: 0; padding: 0 14px; height: 40px; font-size: 13px; background: #1e8068; white-space: nowrap;">Buscar en AFIP</button>
                </div>
                <p id="padron_status" style="margin: -8px 0 8px; font-size: 12px; color: #64748b; min-height: 14px;">Ingresalo solo con números, sin guiones ni puntos (ej: 20123456789)</p>
                <input id="cliente_domicilio" class="swal2-input" placeholder="Domicilio (opcional)" value="${(cliente?.direccion || venta.cliente_domicilio || '').replace(/"/g, '&quot;')}">
                ${esMonotributista ? '' : `
                <select id="cliente_condicion_iva" class="swal2-input" style="width: 100%; padding: 0.625em; border: 1px solid #d9d9d9; border-radius: 0.1875em; font-size: 1.125em;">
                    <option value="CF" selected>Consumidor Final</option>
                    <option value="RI">Responsable Inscripto</option>
                    <option value="EX">Exento</option>
                    <option value="MT">Monotributo</option>
                </select>
                `}
            `,
            focusConfirm: false,
            showCancelButton: true,
            confirmButtonText: 'Emitir Factura',
            cancelButtonText: 'Cancelar',
            didOpen: () => {
                const btn = document.getElementById('btn_buscar_padron');
                const status = document.getElementById('padron_status');
                if (!btn) return;
                btn.addEventListener('click', async () => {
                    const cuit = document.getElementById('cliente_cuit').value;
                    const cuitLimpio = cuit.replace(/\D/g, '');
                    if (cuitLimpio.length !== 11) {
                        status.textContent = 'Ingresá un CUIT de 11 dígitos para buscar en AFIP.';
                        status.style.color = '#b45309';
                        return;
                    }
                    btn.disabled = true;
                    btn.textContent = 'Buscando...';
                    status.textContent = '';
                    try {
                        const resp = await axios.get(`${BASE_API_ENDPOINT}/api/consultar-padron-afip/`, {
                            headers: { Authorization: `Bearer ${token}` },
                            params: { tienda_slug: selectedStoreSlug, cuit: cuitLimpio },
                        });
                        if (resp.data.ok) {
                            document.getElementById('cliente_nombre').value = resp.data.nombre || '';
                            document.getElementById('cliente_domicilio').value = resp.data.domicilio || '';
                            const sel = document.getElementById('cliente_condicion_iva');
                            if (sel && resp.data.condicion_iva) sel.value = resp.data.condicion_iva;
                            status.textContent = 'Datos encontrados en AFIP.';
                            status.style.color = '#15803d';
                        } else {
                            status.textContent = resp.data.error || 'No se encontraron datos en AFIP. Completá el formulario manualmente.';
                            status.style.color = '#64748b';
                        }
                    } catch (e) {
                        status.textContent = 'No se pudo consultar AFIP. Completá el formulario manualmente.';
                        status.style.color = '#64748b';
                    } finally {
                        btn.disabled = false;
                        btn.textContent = 'Buscar en AFIP';
                    }
                });
            },
            preConfirm: () => {
                const nombre = document.getElementById('cliente_nombre').value;
                const cuit = document.getElementById('cliente_cuit').value;
                const domicilio = document.getElementById('cliente_domicilio').value;
                const condicionIva = esMonotributista ? 'CF' : document.getElementById('cliente_condicion_iva').value;
                if (!nombre || nombre.trim() === '') {
                    Swal.showValidationMessage('El nombre del cliente es requerido');
                    return false;
                }
                return {
                    cliente_nombre: nombre.trim(),
                    cliente_cuit: cuit.trim() || null,
                    cliente_domicilio: domicilio.trim() || null,
                    cliente_condicion_iva: condicionIva,
                };
            },
        });

        if (!formValues) return;

        try {
            const facturaResponse = await axios.post(
                `${BASE_API_ENDPOINT}/api/ventas/${venta.id}/emitir_factura/`,
                { venta_id: venta.id, ...formValues },
                { headers: { 'Authorization': `Bearer ${token}` } },
            );
            await fetchDatos();
            const factura = facturaResponse.data.factura || facturaResponse.data;
            const irAVerla = await Swal.fire({
                title: 'Factura emitida con éxito',
                icon: 'success',
                showCancelButton: true,
                confirmButtonText: 'Ver factura',
                cancelButtonText: 'Quedarme acá',
            });
            if (irAVerla.isConfirmed) {
                navigate('/factura', { state: { factura, venta } });
            }
        } catch (err) {
            Swal.fire('Error', 'Error al emitir factura: ' + (err.response?.data?.error || (err.response ? JSON.stringify(err.response.data) : err.message)), 'error');
        }
    };

    // Resumen mensual: agrupa lo ya traído en 'historial' (ventas + movimientos)
    // por mes calendario, para que un cliente con muchos movimientos de Cuenta
    // Corriente vea de un vistazo cuánto consumió y cuánto pagó cada mes, sin
    // tener que sumar a mano las tablas de detalle de abajo. "Pagos" solo cuenta
    // créditos que son cobros reales (concepto "Cobro cuenta corriente...") --
    // los créditos por anulación de venta (revierten una deuda que dejó de
    // existir) no son plata que el cliente haya pagado, así que se excluyen para
    // no inflar el total de pagos del mes.
    const resumenMensual = useMemo(() => {
        const porMes = new Map();
        const obtenerBucket = (fechaStr) => {
            const fecha = new Date(fechaStr);
            const key = `${fecha.getFullYear()}-${String(fecha.getMonth() + 1).padStart(2, '0')}`;
            if (!porMes.has(key)) {
                const label = fecha.toLocaleDateString('es-AR', { month: 'long', year: 'numeric' });
                porMes.set(key, { key, label: label.charAt(0).toUpperCase() + label.slice(1), consumos: 0, pagos: 0 });
            }
            return porMes.get(key);
        };
        (historial?.ventas || []).forEach(v => {
            obtenerBucket(v.fecha_venta).consumos += parseFloat(v.total || 0);
        });
        (historial?.movimientos || []).forEach(m => {
            if (m.tipo === 'CREDITO' && (m.concepto || '').startsWith('Cobro cuenta corriente')) {
                obtenerBucket(m.fecha).pagos += parseFloat(m.monto || 0);
            }
        });
        return Array.from(porMes.values()).sort((a, b) => b.key.localeCompare(a.key));
    }, [historial]);

    if (loading) {
        return <div style={styles.container}><p style={styles.noDataMessage}>Cargando...</p></div>;
    }

    if (error || !cliente || !historial) {
        return (
            <div style={styles.container}>
                <div style={styles.errorMessage}>{error || 'Cliente no encontrado.'}</div>
                <button onClick={() => navigate('/clientes')} style={styles.secondaryButton}>Volver a Clientes</button>
            </div>
        );
    }

    const saldo = parseFloat(historial.saldo_pendiente || 0);

    const renderCampo = (label, campo, valor, inputType = 'text') => (
        <div style={{ minWidth: 0 }}>
            <span style={styles.infoLabel}>{label}</span>
            {campoEditando === campo ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 4 }}>
                    <input
                        type={inputType}
                        autoFocus
                        value={valorEditado}
                        onChange={(e) => setValorEditado(e.target.value)}
                        onKeyDown={(e) => { if (e.key === 'Enter') guardarCampo(); if (e.key === 'Escape') cancelarEdicion(); }}
                        style={styles.inputField}
                    />
                    <button onClick={guardarCampo} disabled={guardandoCampo} style={styles.iconButtonGreen} title="Guardar">✓</button>
                    <button onClick={cancelarEdicion} style={styles.iconButtonGray} title="Cancelar">✕</button>
                </div>
            ) : (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <p style={{ margin: 0, overflowWrap: 'anywhere' }}>{valor || '—'}</p>
                    <button onClick={() => empezarEdicion(campo, valor)} style={styles.pencilButton} title={`Editar ${label}`}>✏️</button>
                </div>
            )}
        </div>
    );

    const renderCampoDiaCierre = () => (
        <div style={{ position: 'relative', minWidth: 0 }}>
            <span style={styles.infoLabel}>Día de cierre</span>
            {campoEditando === 'dia_cierre_cuenta_corriente' ? (
                <div style={styles.popoverDiaCierre}>
                    <SelectorDiaCierre value={valorEditado} onChange={setValorEditado} />
                    <div style={{ display: 'flex', gap: 6, marginTop: 10, justifyContent: 'flex-end' }}>
                        <button onClick={guardarCampo} disabled={guardandoCampo} style={styles.iconButtonGreen} title="Guardar">✓</button>
                        <button onClick={cancelarEdicion} style={styles.iconButtonGray} title="Cancelar">✕</button>
                    </div>
                </div>
            ) : (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <p style={{ margin: 0 }}>{cliente.dia_cierre_cuenta_corriente || 'Sin configurar'}</p>
                    <button onClick={() => empezarEdicion('dia_cierre_cuenta_corriente', cliente.dia_cierre_cuenta_corriente)} style={styles.pencilButton} title="Editar día de cierre">✏️</button>
                </div>
            )}
        </div>
    );

    return (
        <div style={styles.container}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: 10 }}>
                {campoEditando === 'nombre_razon_social' ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1 }}>
                        <input
                            autoFocus
                            value={valorEditado}
                            onChange={(e) => setValorEditado(e.target.value)}
                            onKeyDown={(e) => { if (e.key === 'Enter') guardarCampo(); if (e.key === 'Escape') cancelarEdicion(); }}
                            style={{ ...styles.inputField, fontSize: '1.3rem', fontWeight: 600, maxWidth: 420 }}
                        />
                        <button onClick={guardarCampo} disabled={guardandoCampo} style={styles.iconButtonGreen} title="Guardar">✓</button>
                        <button onClick={cancelarEdicion} style={styles.iconButtonGray} title="Cancelar">✕</button>
                    </div>
                ) : (
                    <h1 style={{ ...styles.pageTitle, display: 'flex', alignItems: 'center', gap: 10 }}>
                        {cliente.nombre_razon_social}
                        <button onClick={() => empezarEdicion('nombre_razon_social', cliente.nombre_razon_social)} style={styles.pencilButton} title="Editar nombre">✏️</button>
                    </h1>
                )}
                <button onClick={() => navigate('/clientes')} style={styles.secondaryButton}>‹ Volver a Clientes</button>
            </div>

            <div style={styles.section}>
                <div style={styles.infoGrid}>
                    {renderCampo('CUIT-CUIL', 'cuit_cuil', cliente.cuit_cuil)}
                    {renderCampo('Teléfono', 'telefono', cliente.telefono)}
                    {renderCampo('Dirección', 'direccion', cliente.direccion)}
                    {renderCampo('Mail', 'email', cliente.email, 'email')}
                    {renderCampoDiaCierre()}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 20, flexWrap: 'wrap', gap: 12 }}>
                    <div>
                        <span style={styles.infoLabel}>Saldo pendiente</span>
                        <p style={{ fontSize: 28, fontWeight: 700, color: saldo > 0 ? '#e25252' : '#1a6a40', margin: 0 }}>
                            {formatearMonto(saldo)}
                        </p>
                    </div>
                    {saldo > 0 && (
                        <button onClick={abrirCobro} style={styles.smallButtonGreen}>Cobrar deuda</button>
                    )}
                </div>
                {historial.tiene_deuda_vencida && (
                    <div style={styles.alertaVencida}>
                        ⚠️ Deuda vencida{historial.fecha_vencimiento_mas_antigua && (
                            <> desde el {new Date(historial.fecha_vencimiento_mas_antigua + 'T00:00:00').toLocaleDateString('es-AR')}</>
                        )}.
                    </div>
                )}
            </div>

            {resumenMensual.length > 0 && (
                <div style={styles.section}>
                    <div style={styles.sectionHeader}>
                        <h2 style={{ margin: 0, fontSize: 'inherit', fontWeight: 'inherit', color: 'inherit' }}>Resumen mensual</h2>
                    </div>
                    <div style={styles.tableResponsive}>
                        <table style={styles.table}>
                            <thead>
                                <tr style={styles.tableHeaderRow}>
                                    <th style={styles.th}>Mes</th>
                                    <th style={styles.th}>Consumos</th>
                                    <th style={styles.th}>Pagos</th>
                                    <th style={styles.th}>Saldo del mes</th>
                                    <th style={styles.th}></th>
                                </tr>
                            </thead>
                            <tbody>
                                {resumenMensual.map(mes => {
                                    const saldoMes = mes.consumos - mes.pagos;
                                    const descargando = descargandoResumenKey === mes.key;
                                    return (
                                        <tr key={mes.key} style={styles.tableRow}>
                                            <td style={styles.td}>{mes.label}</td>
                                            <td style={styles.td}>{formatearMonto(mes.consumos)}</td>
                                            <td style={styles.td}>{formatearMonto(mes.pagos)}</td>
                                            <td style={{ ...styles.td, color: saldoMes > 0 ? '#e25252' : '#1a6a40', fontWeight: 600 }}>
                                                {formatearMonto(saldoMes)}
                                            </td>
                                            <td style={styles.td}>
                                                <button
                                                    onClick={() => descargarResumenCuenta(mes.key)}
                                                    disabled={descargando}
                                                    style={styles.smallButtonGreen}
                                                >
                                                    {descargando ? 'Generando...' : 'Descargar resumen de cuenta'}
                                                </button>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            <div style={styles.section}>
                <h2 style={styles.sectionHeader}>Consumos</h2>
                {historial.ventas.length === 0 ? (
                    <p style={styles.noDataMessage}>Sin compras registradas.</p>
                ) : (
                    <div style={styles.tableResponsive}>
                        <table style={styles.table}>
                            <thead>
                                <tr style={styles.tableHeaderRow}>
                                    <th style={styles.th}>Fecha</th>
                                    <th style={styles.th}>Método de pago</th>
                                    <th style={styles.th}>Total</th>
                                    <th style={styles.th}></th>
                                </tr>
                            </thead>
                            <tbody>
                                {historial.ventas.map(v => {
                                    const estaFacturada = v.tiene_factura || v.facturada;
                                    return (
                                        <tr key={v.id} style={styles.tableRow}>
                                            <td style={styles.td}>{new Date(v.fecha_venta).toLocaleString()}</td>
                                            <td style={styles.td}>{v.metodo_pago}</td>
                                            <td style={styles.td}>{formatearMonto(v.total)}</td>
                                            <td style={styles.td}>
                                                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                                                    {estaFacturada ? (
                                                        <button onClick={() => handleVerFactura(v)} style={styles.smallButton}>
                                                            Ver factura
                                                        </button>
                                                    ) : (
                                                        <>
                                                            <button onClick={() => navigate('/recibo', { state: { venta: v } })} style={styles.smallButton}>
                                                                Ver recibo
                                                            </button>
                                                            {tiendaTieneFacturacion && !isStaffOnly && !v.anulada && (
                                                                <button onClick={() => handleFacturarVenta(v)} style={styles.smallButtonGreen}>
                                                                    Facturar
                                                                </button>
                                                            )}
                                                        </>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            <div style={styles.section}>
                <h2 style={styles.sectionHeader}>Pagos</h2>
                {(() => {
                    // Solo cobros reales (mismo criterio que "Pagos" en Resumen mensual y en
                    // el PDF de resumen de cuenta): se excluyen débitos (esos son los
                    // consumos, ya en la tabla de arriba) y créditos que son reversiones por
                    // anulación de venta, que no son plata que el cliente haya pagado.
                    const pagos = historial.movimientos.filter(
                        m => m.tipo === 'CREDITO' && (m.concepto || '').startsWith('Cobro cuenta corriente')
                    );
                    if (pagos.length === 0) {
                        return <p style={styles.noDataMessage}>Sin pagos registrados.</p>;
                    }
                    return (
                        <div style={styles.tableResponsive}>
                            <table style={styles.table}>
                                <thead>
                                    <tr style={styles.tableHeaderRow}>
                                        <th style={styles.th}>Fecha</th>
                                        <th style={styles.th}>Concepto</th>
                                        <th style={styles.th}>Monto</th>
                                        <th style={styles.th}></th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {pagos.map(m => (
                                        <tr key={m.id} style={styles.tableRow}>
                                            <td style={styles.td}>{new Date(m.fecha).toLocaleString()}</td>
                                            <td style={styles.td}>{m.concepto}</td>
                                            <td style={{ ...styles.td, color: '#1a6a40', fontWeight: 600 }}>{formatearMonto(m.monto)}</td>
                                            <td style={styles.td}>
                                                <button
                                                    onClick={() => navigate('/recibo-cobro', {
                                                        state: { movimiento: m, cliente, tienda_nombre: selectedStoreSlug },
                                                    })}
                                                    style={styles.smallButton}
                                                >
                                                    Ver recibo
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    );
                })()}
            </div>

            {mostrarCobro && (
                <div style={styles.modalOverlay}>
                    <div style={styles.modalContent}>
                        <h2 style={styles.sectionHeader}>Cobrar deuda — {cliente.nombre_razon_social}</h2>
                        <p>Saldo pendiente: <strong>{formatearMonto(saldo)}</strong></p>
                        <label style={styles.formLabel}>Monto a cobrar
                            <input type="number" min="0.01" step="0.01" style={styles.inputField}
                                value={montoCobro} onChange={(e) => setMontoCobro(e.target.value)} />
                        </label>
                        <label style={styles.formLabel}>Método de pago
                            <select style={styles.inputField} value={metodoPagoCobro} onChange={(e) => setMetodoPagoCobro(e.target.value)}>
                                <option value="">Selecciona un método de pago</option>
                                {metodosPago.map(m => <option key={m.id} value={m.nombre}>{m.nombre}</option>)}
                            </select>
                        </label>
                        <p style={{ fontSize: 13, color: '#94a3b8' }}>
                            Si el método incluye "efectivo" y tenés una caja abierta, el cobro se suma a ella.
                            Si no tenés caja abierta, el cobro se registra igual. No se genera una nueva venta:
                            el ingreso ya se contabilizó cuando se entregó la mercadería.
                        </p>
                        <div style={{ display: 'flex', gap: 10, marginTop: 20, justifyContent: 'flex-end' }}>
                            <button onClick={() => setMostrarCobro(false)} style={styles.modalCancelButton}>Cancelar</button>
                            <button onClick={confirmarCobro} disabled={cobrando} style={styles.primaryButton}>
                                {cobrando ? 'Procesando...' : 'Confirmar cobro'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

const styles = {
    container: { padding: 0, fontFamily: "'Inter', 'Segoe UI', system-ui, sans-serif", width: '100%' },
    pageTitle: { color: '#1a2926', fontSize: '1.5rem', fontWeight: 600, margin: 0 },
    section: { marginBottom: '30px', padding: '20px', backgroundColor: '#f1f5f9', borderRadius: '10px' },
    sectionHeader: { color: '#475569', fontSize: '1.1rem', borderBottom: '1px solid #e2e8f0', paddingBottom: '8px', marginTop: 0, marginBottom: '0.5rem' },
    alertaVencida: { marginTop: 16, padding: '12px 16px', backgroundColor: '#fffbeb', border: '1px solid #fcd34d', borderRadius: '10px', color: '#92400e', fontWeight: 600 },
    infoGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 16 },
    infoLabel: { fontSize: 12, color: '#94a3b8', textTransform: 'uppercase', fontWeight: 700, letterSpacing: 0.4 },
    pencilButton: { background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, color: '#94a3b8', padding: 2, lineHeight: 1 },
    iconButtonGreen: { background: '#5dc87a', color: 'white', border: 'none', borderRadius: 6, cursor: 'pointer', width: 28, height: 28, fontWeight: 700 },
    iconButtonGray: { background: '#e2e8f0', color: '#475569', border: 'none', borderRadius: 6, cursor: 'pointer', width: 28, height: 28, fontWeight: 700 },
    popoverDiaCierre: {
        position: 'absolute', top: '100%', left: 0, marginTop: 4, zIndex: 10,
        background: 'white', border: '1px solid #e2e8f0', borderRadius: 10,
        boxShadow: '0 10px 30px rgba(0,0,0,0.12)', padding: 14,
    },
    errorMessage: { color: '#e25252', padding: '10px', backgroundColor: '#fef2f2', border: '1px solid #fca5a5', borderRadius: '6px', marginBottom: 15 },
    noDataMessage: { textAlign: 'center', fontStyle: 'italic', color: '#94a3b8' },
    primaryButton: { padding: '10px 15px', backgroundColor: '#5dc87a', color: 'white', border: 'none', borderRadius: '10px', cursor: 'pointer' },
    secondaryButton: { padding: '10px 15px', backgroundColor: '#94a3b8', color: 'white', border: 'none', borderRadius: '10px', cursor: 'pointer' },
    smallButton: { fontSize: 13, padding: '6px 10px', borderRadius: 6, border: '1px solid #e2e8f0', background: '#f8fafc', color: '#475569', cursor: 'pointer', fontWeight: 600 },
    smallButtonGreen: { fontSize: 14, padding: '10px 18px', borderRadius: 8, border: 'none', background: '#5dc87a', color: 'white', cursor: 'pointer', fontWeight: 700 },
    tableResponsive: { overflowX: 'auto', WebkitOverflowScrolling: 'touch' },
    table: { width: '100%', borderCollapse: 'collapse', marginTop: '15px' },
    tableHeaderRow: { backgroundColor: '#f1f5f9' },
    th: { padding: '10px', borderBottom: '2px solid #e2e8f0', textAlign: 'left' },
    tableRow: { '&:nth-child(even)': { backgroundColor: '#f1f5f9' } },
    td: { padding: '10px', borderBottom: '1px solid #e2e8f0', verticalAlign: 'middle' },
    modalOverlay: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000, padding: 20 },
    modalContent: { backgroundColor: 'white', padding: '24px', borderRadius: '10px', width: '90%', maxWidth: '480px', boxShadow: '0 10px 30px rgba(0,0,0,0.10)', maxHeight: '90vh', overflowY: 'auto' },
    modalCancelButton: { padding: '10px 15px', backgroundColor: '#e2e8f0', color: '#475569', border: 'none', borderRadius: '10px', cursor: 'pointer' },
    formLabel: { display: 'flex', flexDirection: 'column', fontSize: 13, fontWeight: 600, color: '#475569', marginBottom: 10 },
    inputField: { padding: '8px', border: '1px solid #e2e8f0', borderRadius: '10px', boxSizing: 'border-box', width: '100%', marginTop: 4 },
};

export default ClienteDetalle;
