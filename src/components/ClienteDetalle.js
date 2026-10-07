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

    // Facturar consumos del mes consolidados -- key del mes en curso (evita que
    // dos botones de meses distintos queden "cargando" a la vez).
    const [facturandoMesKey, setFacturandoMesKey] = useState(null);

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

    // Formulario "Datos del Cliente para Factura" -- compartido entre Facturar
    // una venta puntual y Facturar consumos del mes consolidados (misma UI,
    // mismos campos; solo cambia con qué valores arranca precargado el
    // formulario y el texto del botón). Devuelve los formValues del
    // preConfirm, o null si se canceló.
    const pedirDatosParaFactura = async ({ nombreInicial, cuitInicial, domicilioInicial, confirmButtonText }) => {
        const esMonotributista = tiendaActualInfo?.condicion_iva_emisor === 'MT';
        // Exento como emisor, igual que Monotributista, SIEMPRE emite Factura
        // C sin importar el cliente (tabla oficial AFIP) -- no tiene sentido
        // preguntarle condición IVA ni tipo de factura.
        const esExento = tiendaActualInfo?.condicion_iva_emisor === 'EX';
        // Solo un emisor RI puede elegir entre Factura A o B -- MT/EX siempre
        // emiten C, así que el selector de tipo de factura no tiene sentido
        // para ellos.
        const esRI = tiendaActualInfo?.condicion_iva_emisor === 'RI';

        const { value: formValues } = await Swal.fire({
            title: 'Datos del Cliente para Factura',
            html: `
                <div class="fc-form">
                    <div class="fc-field">
                        <label for="cliente_nombre">Nombre del cliente <span class="fc-required">*</span></label>
                        <input id="cliente_nombre" class="swal2-input fc-input" placeholder="Ej: Juan Pérez" value="${(nombreInicial || 'Consumidor Final').replace(/"/g, '&quot;')}" required>
                    </div>
                    <div class="fc-field">
                        <label for="cliente_cuit">CUIT (opcional)</label>
                        <div class="fc-cuit-row">
                            <input id="cliente_cuit" class="swal2-input fc-input" placeholder="Solo números, sin guiones" type="text" value="${cuitInicial || ''}">
                            <button type="button" id="btn_buscar_padron" class="fc-btn-afip">Buscar en AFIP</button>
                        </div>
                        <p id="padron_status" class="fc-status"></p>
                    </div>
                    <div class="fc-field">
                        <label for="cliente_domicilio">Domicilio (opcional)</label>
                        <input id="cliente_domicilio" class="swal2-input fc-input" placeholder="Ej: Av. Corrientes 1234" value="${(domicilioInicial || '').replace(/"/g, '&quot;')}">
                    </div>
                    ${(esMonotributista || esExento) ? '' : `
                    <div class="fc-field">
                        <label for="cliente_condicion_iva">Condición frente al IVA</label>
                        <select id="cliente_condicion_iva" class="swal2-input fc-input">
                            <option value="CF" selected>Consumidor Final</option>
                            <option value="RI">Responsable Inscripto</option>
                            <option value="EX">Exento</option>
                            <option value="MT">Monotributo</option>
                        </select>
                    </div>
                    ${esRI ? `
                    <div class="fc-field">
                        <label for="cliente_tipo_comprobante">Tipo de factura</label>
                        <select id="cliente_tipo_comprobante" class="swal2-input fc-input">
                            <option value="A">Factura A</option>
                            <option value="B" selected>Factura B</option>
                        </select>
                        <p id="tipo_comprobante_hint" class="fc-status"></p>
                    </div>
                    ` : ''}
                    `}
                </div>
                <style>
                    .fc-form { display: flex; flex-direction: column; gap: 14px; text-align: left; margin-top: 4px; }
                    .fc-field label { display: block; font-size: 13px; font-weight: 600; color: #475569; margin-bottom: 4px; }
                    .fc-required { color: #e25252; }
                    .fc-input.swal2-input { width: 100%; box-sizing: border-box; margin: 0; padding: 0.65em 0.9em; border: 1px solid #d1d5db; border-radius: 8px; font-size: 15px; height: auto; }
                    select.fc-input.swal2-input { background: #fff; }
                    .fc-cuit-row { display: flex; gap: 8px; }
                    .fc-cuit-row .fc-input { flex: 1; min-width: 0; }
                    .fc-btn-afip { margin: 0; padding: 0 16px; font-size: 13px; font-weight: 600; color: #fff; background: #1e8068; border: none; border-radius: 8px; cursor: pointer; white-space: nowrap; }
                    .fc-btn-afip:hover { background: #176b56; }
                    .fc-btn-afip:disabled { opacity: 0.7; cursor: default; }
                    .fc-status { margin: 6px 0 0; font-size: 12px; color: #64748b; min-height: 14px; }
                </style>
            `,
            focusConfirm: false,
            showCancelButton: true,
            confirmButtonText,
            cancelButtonText: 'Cancelar',
            didOpen: () => {
                // Factura A exige cliente RI identificado con CUIT (AFIP la
                // rechaza si no); sincroniza el selector de tipo de factura
                // con eso cada vez que cambia el CUIT o la condición IVA, en
                // vez de dejar que el usuario elija A en un estado inválido
                // y recién enterarse del rechazo del lado del backend.
                const actualizarTipoComprobante = () => {
                    const tipoSel = document.getElementById('cliente_tipo_comprobante');
                    if (!tipoSel) return;
                    const condicionSel = document.getElementById('cliente_condicion_iva');
                    const cuitVal = document.getElementById('cliente_cuit').value.replace(/\D/g, '');
                    const puedeSerA = ['RI', 'MT'].includes(condicionSel?.value) && cuitVal.length === 11;
                    const optA = tipoSel.querySelector('option[value="A"]');
                    if (optA) optA.disabled = !puedeSerA;
                    if (!puedeSerA && tipoSel.value === 'A') tipoSel.value = 'B';
                    const hint = document.getElementById('tipo_comprobante_hint');
                    if (hint) hint.textContent = puedeSerA ? '' : 'Factura A requiere cliente Responsable Inscripto o Monotributista con CUIT cargado.';
                };
                actualizarTipoComprobante();
                document.getElementById('cliente_cuit')?.addEventListener('input', actualizarTipoComprobante);
                document.getElementById('cliente_condicion_iva')?.addEventListener('change', actualizarTipoComprobante);

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
                            actualizarTipoComprobante();
                            const tipoSel = document.getElementById('cliente_tipo_comprobante');
                            if (tipoSel && ['RI', 'MT'].includes(resp.data.condicion_iva) && !tipoSel.querySelector('option[value="A"]').disabled) {
                                tipoSel.value = 'A';
                            }
                            status.textContent = resp.data.condicion_iva
                                ? 'Datos encontrados en AFIP.'
                                : 'Datos encontrados en AFIP. Revisá la condición frente al IVA, no se autocompleta.';
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
                const condicionIva = (esMonotributista || esExento) ? 'CF' : document.getElementById('cliente_condicion_iva').value;
                const tipoComprobanteSel = document.getElementById('cliente_tipo_comprobante');
                if (!nombre || nombre.trim() === '') {
                    Swal.showValidationMessage('El nombre del cliente es requerido');
                    return false;
                }
                return {
                    cliente_nombre: nombre.trim(),
                    cliente_cuit: cuit.trim() || null,
                    cliente_domicilio: domicilio.trim() || null,
                    cliente_condicion_iva: condicionIva,
                    ...(tipoComprobanteSel ? { tipo_comprobante_solicitado: tipoComprobanteSel.value } : {}),
                };
            },
        });

        return formValues || null;
    };

    const handleFacturarVenta = async (venta) => {
        const formValues = await pedirDatosParaFactura({
            nombreInicial: cliente?.nombre_razon_social || venta.cliente_nombre,
            cuitInicial: cliente?.cuit_cuil || venta.cliente_cuit,
            domicilioInicial: cliente?.direccion || venta.cliente_domicilio,
            confirmButtonText: 'Emitir Factura',
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

    // Facturar TODOS los consumos pendientes (no anulados, no facturados) de un
    // mes puntual en un solo comprobante -- ver backend
    // ClienteViewSet.facturar_consumos_mes. mesKey viene como "2026-07".
    const handleFacturarConsumosMes = async (mesKey, cantidadConsumos) => {
        const [anioStr, mesStr] = mesKey.split('-');
        const formValues = await pedirDatosParaFactura({
            nombreInicial: cliente?.nombre_razon_social,
            cuitInicial: cliente?.cuit_cuil,
            domicilioInicial: cliente?.direccion,
            confirmButtonText: `Facturar ${cantidadConsumos} consumo(s) del mes`,
        });
        if (!formValues) return;

        setFacturandoMesKey(mesKey);
        try {
            const resp = await axios.post(
                `${BASE_API_ENDPOINT}/api/clientes/${clienteId}/facturar-consumos-mes/`,
                { mes: parseInt(mesStr, 10), anio: parseInt(anioStr, 10), ...formValues },
                { headers: { 'Authorization': `Bearer ${token}` } },
            );
            await fetchDatos();
            const { factura, ventas } = resp.data;
            const irAVerla = await Swal.fire({
                title: 'Factura consolidada emitida con éxito',
                text: `${ventas.length} consumo(s) facturados juntos.`,
                icon: 'success',
                showCancelButton: true,
                confirmButtonText: 'Ver factura',
                cancelButtonText: 'Quedarme acá',
            });
            if (irAVerla.isConfirmed) {
                // skipReciboPrompt: true -- el prompt de "¿imprimir recibo?" post-impresión
                // asume UNA venta puntual; acá son varias, no hay un solo recibo que ofrecer.
                navigate('/factura', { state: { factura, venta: ventas[0], ventasLote: ventas, skipReciboPrompt: true } });
            }
        } catch (err) {
            Swal.fire('Error', 'Error al facturar consumos del mes: ' + (err.response?.data?.error || (err.response ? JSON.stringify(err.response.data) : err.message)), 'error');
        } finally {
            setFacturandoMesKey(null);
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

    // Tabla de Consumos agrupada por mes calendario -- mismo criterio de mesKey
    // que resumenMensual, para habilitar "Facturar consumos del mes" por grupo.
    // historial.ventas ya viene ordenado -fecha_venta (más reciente primero,
    // ver ClienteViewSet.historial), así que alcanza con separarlas en baldes
    // sin reordenar cada una.
    const consumosPorMes = useMemo(() => {
        const porMes = new Map();
        (historial?.ventas || []).forEach(v => {
            const fecha = new Date(v.fecha_venta);
            const key = `${fecha.getFullYear()}-${String(fecha.getMonth() + 1).padStart(2, '0')}`;
            if (!porMes.has(key)) {
                const label = fecha.toLocaleDateString('es-AR', { month: 'long', year: 'numeric' });
                porMes.set(key, { key, label: label.charAt(0).toUpperCase() + label.slice(1), ventas: [] });
            }
            porMes.get(key).ventas.push(v);
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
                                {consumosPorMes.map(grupoMes => {
                                    // Habilita "Facturar consumos del mes" solo si hay algo para
                                    // juntar -- mismo criterio que el backend (ClienteViewSet.
                                    // facturar_consumos_mes): no anulada y todavía no facturada.
                                    const pendientesDelMes = grupoMes.ventas.filter(v => !v.anulada && !(v.tiene_factura || v.facturada));
                                    // Si YA hay algún consumo de este mes facturado (individualmente
                                    // con el botón "Facturar" de la fila, o en una consolidada previa),
                                    // no se deja consolidar el resto: terminaríamos con 2+ comprobantes
                                    // para el mismo mes, justo lo que esta función busca evitar. El
                                    // backend aplica la misma regla (ver facturar_consumos_mes).
                                    const algunaFacturadaDelMes = grupoMes.ventas.some(v => !v.anulada && (v.tiene_factura || v.facturada));
                                    const facturandoEsteMes = facturandoMesKey === grupoMes.key;
                                    const hayNoAnuladasEsteMes = grupoMes.ventas.some(v => !v.anulada);
                                    const botonDeshabilitado = facturandoEsteMes || pendientesDelMes.length === 0 || algunaFacturadaDelMes;
                                    const tooltipBoton = algunaFacturadaDelMes
                                        ? 'Ya hay consumos de este mes facturados (individualmente o en otra factura consolidada) -- no se puede generar otra factura consolidada para no duplicar comprobantes del mismo período.'
                                        : pendientesDelMes.length === 0
                                            ? 'No hay consumos pendientes de facturar este mes.'
                                            : `Junta los ${pendientesDelMes.length} consumo(s) pendientes de ${grupoMes.label} en una sola factura`;
                                    return (
                                        <React.Fragment key={grupoMes.key}>
                                            <tr style={styles.tableMonthRow}>
                                                <td colSpan={3} style={styles.tdMonthLabel}>{grupoMes.label}</td>
                                                <td style={styles.td}>
                                                    {tiendaTieneFacturacion && !isStaffOnly && hayNoAnuladasEsteMes && (
                                                        <button
                                                            onClick={() => handleFacturarConsumosMes(grupoMes.key, pendientesDelMes.length)}
                                                            disabled={botonDeshabilitado}
                                                            style={{ ...styles.smallButtonGreen, ...(botonDeshabilitado ? styles.btnDisabled : {}) }}
                                                            title={tooltipBoton}
                                                        >
                                                            {facturandoEsteMes ? 'Facturando...' : 'Facturar consumos del mes'}
                                                        </button>
                                                    )}
                                                </td>
                                            </tr>
                                            {grupoMes.ventas.map(v => {
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
                                        </React.Fragment>
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
    btnDisabled: { opacity: 0.5, cursor: 'not-allowed' },
    tableResponsive: { overflowX: 'auto', WebkitOverflowScrolling: 'touch' },
    table: { width: '100%', borderCollapse: 'collapse', marginTop: '15px' },
    tableHeaderRow: { backgroundColor: '#f1f5f9' },
    th: { padding: '10px', borderBottom: '2px solid #e2e8f0', textAlign: 'left' },
    tableRow: { '&:nth-child(even)': { backgroundColor: '#f1f5f9' } },
    tableMonthRow: { backgroundColor: '#e2e8f0' },
    tdMonthLabel: { padding: '8px 10px', fontWeight: 700, color: '#334155', borderBottom: '1px solid #cbd5e1' },
    td: { padding: '10px', borderBottom: '1px solid #e2e8f0', verticalAlign: 'middle' },
    modalOverlay: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000, padding: 20 },
    modalContent: { backgroundColor: 'white', padding: '24px', borderRadius: '10px', width: '90%', maxWidth: '480px', boxShadow: '0 10px 30px rgba(0,0,0,0.10)', maxHeight: '90vh', overflowY: 'auto' },
    modalCancelButton: { padding: '10px 15px', backgroundColor: '#e2e8f0', color: '#475569', border: 'none', borderRadius: '10px', cursor: 'pointer' },
    formLabel: { display: 'flex', flexDirection: 'column', fontSize: 13, fontWeight: 600, color: '#475569', marginBottom: 10 },
    inputField: { padding: '8px', border: '1px solid #e2e8f0', borderRadius: '10px', boxSizing: 'border-box', width: '100%', marginTop: 4 },
};

export default ClienteDetalle;
