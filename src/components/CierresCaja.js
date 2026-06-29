import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { useAuth } from '../AuthContext';
import HelpButton from './HelpButton';

const BASE_API_ENDPOINT = (() => {
    const url = process.env.REACT_APP_API_URL || 'http://127.0.0.1:8000';
    return url.replace(/\/api\/?$/, '').replace(/\/$/, '');
})();

const fmt = (n) =>
    new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).format(Number(n) || 0);

const fmtFecha = (iso) => {
    if (!iso) return '-';
    return new Date(iso).toLocaleString('es-AR', {
        day: '2-digit', month: '2-digit', year: 'numeric',
        hour: '2-digit', minute: '2-digit',
    });
};

const BILLETES_DEFS = [
    { label: '$20.000', key: 'billetes_20000', val: 20000 },
    { label: '$10.000', key: 'billetes_10000', val: 10000 },
    { label: '$2.000',  key: 'billetes_2000',  val: 2000  },
    { label: '$1.000',  key: 'billetes_1000',  val: 1000  },
    { label: '$500',    key: 'billetes_500',   val: 500   },
    { label: '$200',    key: 'billetes_200',   val: 200   },
    { label: '$100',    key: 'billetes_100',   val: 100   },
    { label: 'Monedas', key: 'monedas',        val: 1     },
];
const BILLETES_INIT = { billetes_20000:'', billetes_10000:'', billetes_2000:'', billetes_1000:'', billetes_500:'', billetes_200:'', billetes_100:'', monedas:'' };

export default function CierresCaja() {
    const { token, selectedStoreSlug, user } = useAuth();
    const [cierres, setCierres] = useState([]);
    const [loading, setLoading] = useState(false);
    const [fechaDesde, setFechaDesde] = useState('');
    const [fechaHasta, setFechaHasta] = useState('');
    const [detalle, setDetalle] = useState(null);
    const [ventasDetalle, setVentasDetalle] = useState([]);
    const [loadingDetalle, setLoadingDetalle] = useState(false);

    // ── Estado cierre forzado ───────────────────────────────────────────────────
    const [mostrarModalCerrar, setMostrarModalCerrar] = useState(false);
    const [billetes, setBilletes] = useState(BILLETES_INIT);
    const [notasCierre, setNotasCierre] = useState('');
    const [guardandoCierre, setGuardandoCierre] = useState(false);

    const fetchCierres = useCallback(async () => {
        if (!token || !selectedStoreSlug) return;
        setLoading(true);
        try {
            const params = { tienda: selectedStoreSlug };
            if (fechaDesde) params.fecha_desde = fechaDesde;
            if (fechaHasta) params.fecha_hasta = fechaHasta;
            const res = await axios.get(`${BASE_API_ENDPOINT}/api/cierre-caja/`, {
                headers: { Authorization: `Bearer ${token}` },
                params,
            });
            const data = res.data;
            setCierres(Array.isArray(data) ? data : (data.results || []));
        } catch (err) {
            console.error('Error cargando cierres:', err);
        } finally {
            setLoading(false);
        }
    }, [token, selectedStoreSlug, fechaDesde, fechaHasta]);

    useEffect(() => { fetchCierres(); }, [fetchCierres]);

    const [ventasResumen, setVentasResumen] = useState({ por_metodo: [], ventas: [], total_ventas_efectivo: null });

    const abrirDetalle = async (cierre) => {
        setDetalle(cierre);
        setLoadingDetalle(true);
        try {
            const res = await axios.get(
                `${BASE_API_ENDPOINT}/api/cierre-caja/${cierre.id}/ventas-resumen/`,
                { headers: { Authorization: `Bearer ${token}` } }
            );
            const data = res.data || {};
            setVentasResumen({
                por_metodo: data.por_metodo || [],
                ventas: data.ventas || [],
                total_ventas_efectivo: data.total_ventas_efectivo ?? null,
            });
            setVentasDetalle((data.ventas || []).filter(v =>
                v.metodo_pago && v.metodo_pago.toLowerCase().includes('efectivo')
            ));
        } catch {
            setVentasResumen({ por_metodo: [], ventas: [], total_ventas_efectivo: null });
            setVentasDetalle([]);
        } finally {
            setLoadingDetalle(false);
        }
    };

    const cerrarDetalle = () => {
        setDetalle(null);
        setVentasDetalle([]);
        setVentasResumen({ por_metodo: [], ventas: [], total_ventas_efectivo: null });
        setMostrarModalCerrar(false);
        setBilletes(BILLETES_INIT);
        setNotasCierre('');
    };

    const handleCerrarCaja = async () => {
        if (!detalle) return;
        setGuardandoCierre(true);
        try {
            const payload = {};
            BILLETES_DEFS.forEach(({ key }) => {
                payload[key] = key === 'monedas'
                    ? parseFloat(billetes[key] || 0)
                    : parseInt(billetes[key] || 0, 10);
            });
            payload.notas = notasCierre;
            const res = await axios.post(
                `${BASE_API_ENDPOINT}/api/cierre-caja/${detalle.id}/cerrar/`,
                payload,
                { headers: { Authorization: `Bearer ${token}` } }
            );
            setDetalle(res.data);
            setMostrarModalCerrar(false);
            setBilletes(BILLETES_INIT);
            setNotasCierre('');
            fetchCierres();
        } catch (err) {
            alert('Error al cerrar la caja: ' + (err.response?.data?.error || err.message));
        } finally {
            setGuardandoCierre(false);
        }
    };

    const imprimirRecibo = () => window.print();

    // ─── Estilos ───────────────────────────────────────────────────────────────
    const s = {
        page: { padding: '24px 20px', maxWidth: 960, margin: '0 auto', fontFamily: 'Inter, sans-serif' },
        titulo: { fontSize: 22, fontWeight: 700, color: '#1a2926', marginBottom: 20 },
        filtros: { display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap', marginBottom: 20 },
        label: { fontSize: 13, fontWeight: 600, color: '#475569' },
        input: { padding: '7px 10px', border: '1px solid #e2e8f0', borderRadius: 10, fontSize: 14, backgroundColor: '#f8fafc', color: '#1a2926' },
        btn: { padding: '8px 18px', borderRadius: 10, border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: 14 },
        btnPrimary: { background: '#3b9ede', color: '#fff' },
        card: {
            border: '1px solid #e2e8f0', borderRadius: 10, padding: '16px 18px',
            marginBottom: 12, cursor: 'pointer', background: '#ffffff',
            boxShadow: '0 1px 3px rgba(0,0,0,.06)', transition: 'box-shadow .15s',
        },
        cardHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 8 },
        badge: (estado) => ({
            display: 'inline-block', padding: '3px 10px', borderRadius: 20, fontSize: 12, fontWeight: 700,
            background: estado === 'CERRADO' ? '#edfaf3' : '#fffbeb',
            color: estado === 'CERRADO' ? '#1a6a40' : '#92400e',
        }),
        statsRow: { display: 'flex', gap: 20, marginTop: 10, flexWrap: 'wrap' },
        stat: { fontSize: 13, color: '#475569' },
        statVal: { fontWeight: 700, color: '#1a2926' },
        overlay: {
            position: 'fixed', inset: 0, background: 'rgba(15,25,22,0.55)',
            backdropFilter: 'blur(2px)',
            display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
            zIndex: 1000, overflowY: 'auto', padding: '24px 12px',
        },
        modal: {
            background: '#ffffff', borderRadius: 16, padding: '28px 28px 24px',
            width: '100%', maxWidth: 720, boxShadow: '0 20px 60px rgba(0,0,0,.25)',
            maxHeight: '90vh', overflowY: 'auto',
        },
        modalTitulo: { fontSize: 20, fontWeight: 700, marginBottom: 4, color: '#1a2926' },
        modalSub: { fontSize: 13, color: '#94a3b8', marginBottom: 20 },
        section: { marginBottom: 20 },
        sectionTitulo: {
            fontSize: 13, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.05em',
            color: '#94a3b8', borderBottom: '1px solid #e2e8f0', paddingBottom: 6, marginBottom: 10,
        },
        tabla: { width: '100%', borderCollapse: 'collapse', fontSize: 13 },
        th: { textAlign: 'left', padding: '6px 8px', background: '#f1f5f9', borderBottom: '1px solid #e2e8f0', fontWeight: 600, color: '#475569' },
        td: { padding: '6px 8px', borderBottom: '1px solid #e2e8f0', color: '#1a2926' },
        totalRow: { fontWeight: 700, background: '#f1f5f9' },
        diferencia: (val) => ({
            fontSize: 18, fontWeight: 800, marginTop: 12, padding: '12px 16px',
            borderRadius: 10, textAlign: 'center',
            background: val >= 0 ? '#edfaf3' : '#fef2f2',
            color: val >= 0 ? '#1a6a40' : '#e25252',
        }),
        acciones: { display: 'flex', gap: 10, marginTop: 20, justifyContent: 'flex-end' },
    };

    const mobileStyles = `
        @media (max-width: 768px) {
            .cc-filtros { flex-direction: column !important; align-items: stretch !important; }
            .cc-filtros input { width: 100% !important; box-sizing: border-box !important; }
            .cc-modal { padding: 18px 14px !important; }
            .cc-cierre-grid { grid-template-columns: 1fr !important; }
            .cc-tabla-wrap { overflow-x: auto; -webkit-overflow-scrolling: touch; }
            .cc-tabla { min-width: 500px; }
            .cc-acciones { flex-wrap: wrap !important; }
            .cc-stats-row { flex-direction: column !important; gap: 6px !important; }
        }
    `;

    return (
        <>
        <style>{mobileStyles}</style>
        <div style={s.page}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: s.titulo.marginBottom }}>
                <h2 style={{ ...s.titulo, marginBottom: 0 }}>Cierres de Caja</h2>
                <HelpButton
                    titulo="Cierres de Caja"
                    bullets={[
                        'Registrá el cierre de turno con el efectivo contado en caja.',
                        'Cada cierre muestra ventas del turno, egresos y el saldo esperado vs. contado.',
                        'El sistema calcula automáticamente las diferencias de caja.',
                        'Filtrá por rango de fechas para ver cierres históricos.',
                        'Los supervisores ven los cierres de su tienda; los administradores ven todos.',
                    ]}
                />
            </div>

            {/* Filtros */}
            <div style={s.filtros} className="cc-filtros">
                <div>
                    <label style={s.label}>Desde&nbsp;</label>
                    <input type="date" style={s.input} value={fechaDesde} onChange={e => setFechaDesde(e.target.value)} />
                </div>
                <div>
                    <label style={s.label}>Hasta&nbsp;</label>
                    <input type="date" style={s.input} value={fechaHasta} onChange={e => setFechaHasta(e.target.value)} />
                </div>
                <button style={{ ...s.btn, ...s.btnPrimary }} onClick={fetchCierres}>
                    Filtrar
                </button>
                <button style={{ ...s.btn, background: '#e2e8f0', color: '#475569' }}
                    onClick={() => { setFechaDesde(''); setFechaHasta(''); }}>
                    Limpiar
                </button>
            </div>

            {/* Lista */}
            {loading ? (
                <p style={{ color: '#94a3b8' }}>Cargando cierres…</p>
            ) : cierres.length === 0 ? (
                <p style={{ color: '#94a3b8' }}>No hay cierres para el período seleccionado.</p>
            ) : (
                cierres.map(c => {
                    const totalTeorico = (
                        Number(c.cambio_inicial || 0) +
                        Number(c.total_ventas_efectivo || 0) -
                        Number(c.total_egresos || 0)
                    );
                    return (
                        <div key={c.id} style={s.card} onClick={() => abrirDetalle(c)}>
                            <div style={s.cardHeader}>
                                <div>
                                    <strong>{fmtFecha(c.fecha_apertura)}</strong>
                                    {c.fecha_cierre && (
                                        <span style={{ color: '#94a3b8', fontSize: 13, marginLeft: 8 }}>
                                            → {fmtFecha(c.fecha_cierre)}
                                        </span>
                                    )}
                                </div>
                                <span style={s.badge(c.estado)}>{c.estado}</span>
                            </div>
                            <div style={{ fontSize: 13, color: '#475569', marginTop: 4 }}>
                                👤 {c.usuario_nombre}
                            </div>
                            <div style={s.statsRow} className="cc-stats-row">
                                <span style={s.stat}>
                                    Cambio inicial: <span style={s.statVal}>{fmt(c.cambio_inicial)}</span>
                                </span>
                                {c.estado === 'CERRADO' && (
                                    <>
                                        <span style={s.stat}>
                                            Ventas efectivo: <span style={s.statVal}>{fmt(c.total_ventas_efectivo)}</span>
                                        </span>
                                        <span style={s.stat}>
                                            Egresos: <span style={s.statVal}>{fmt(c.total_egresos)}</span>
                                        </span>
                                        <span style={s.stat}>
                                            Teórico: <span style={s.statVal}>{fmt(totalTeorico)}</span>
                                        </span>
                                        <span style={s.stat}>
                                            Físico: <span style={s.statVal}>{fmt(c.total_recuento_fisico)}</span>
                                        </span>
                                        <span style={{ ...s.stat, fontWeight: 700, color: Number(c.diferencia) >= 0 ? '#1a6a40' : '#e25252' }}>
                                            Diferencia: {fmt(c.diferencia)}
                                        </span>
                                    </>
                                )}
                            </div>
                        </div>
                    );
                })
            )}

            {/* Modal detalle / recibo */}
            {detalle && (() => {
                // Para cierres abiertos, total_ventas_efectivo aún no está persistido en la DB.
                // Usamos el valor calculado en tiempo real por ventas-resumen.
                const efectivoParaResumen = detalle.estado === 'CERRADO'
                    ? Number(detalle.total_ventas_efectivo || 0)
                    : (ventasResumen.total_ventas_efectivo ?? Number(detalle.total_ventas_efectivo || 0));
                return (
                <div style={s.overlay} onClick={cerrarDetalle}>
                    <div style={s.modal} onClick={e => e.stopPropagation()} className="no-print-close cc-modal">
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 }}>
                            <p style={s.modalTitulo}>Detalle de Cierre de Caja</p>
                            <span style={s.badge(detalle.estado)}>{detalle.estado}</span>
                        </div>
                        <p style={s.modalSub}>
                            <strong style={{ color: '#1a2926' }}>👤 {detalle.usuario_nombre}</strong>
                            &nbsp;&nbsp;
                            {fmtFecha(detalle.fecha_apertura)}
                            {detalle.fecha_cierre ? ` → ${fmtFecha(detalle.fecha_cierre)}` : ' (turno abierto)'}
                        </p>

                        {/* Resumen financiero */}
                        <div style={s.section}>
                            <p style={s.sectionTitulo}>Resumen</p>
                            <table style={s.tabla}>
                                <tbody>
                                    <tr>
                                        <td style={s.td}>Cambio inicial</td>
                                        <td style={{ ...s.td, textAlign: 'right' }}>{fmt(detalle.cambio_inicial)}</td>
                                    </tr>
                                    <tr>
                                        <td style={s.td}>Ventas en efectivo</td>
                                        <td style={{ ...s.td, textAlign: 'right' }}>{fmt(efectivoParaResumen)}</td>
                                    </tr>
                                    {Number(detalle.total_ingresos_extra || 0) > 0 && (
                                        <tr>
                                            <td style={s.td}>Ingresos extra</td>
                                            <td style={{ ...s.td, textAlign: 'right', color: '#1a6a40' }}>+ {fmt(detalle.total_ingresos_extra || 0)}</td>
                                        </tr>
                                    )}
                                    {Number(detalle.total_gastos || 0) > 0 && (
                                        <tr>
                                            <td style={s.td}>Gastos</td>
                                            <td style={{ ...s.td, textAlign: 'right', color: '#e25252' }}>- {fmt(detalle.total_gastos || 0)}</td>
                                        </tr>
                                    )}
                                    {Number(detalle.total_retiros || 0) > 0 && (
                                        <tr>
                                            <td style={s.td}>Retiros de caja</td>
                                            <td style={{ ...s.td, textAlign: 'right', color: '#e25252' }}>- {fmt(detalle.total_retiros || 0)}</td>
                                        </tr>
                                    )}
                                    <tr style={s.totalRow}>
                                        <td style={s.td}>Total teórico en caja</td>
                                        <td style={{ ...s.td, textAlign: 'right' }}>
                                            {fmt(
                                                Number(detalle.cambio_inicial || 0) +
                                                efectivoParaResumen +
                                                Number(detalle.total_ingresos_extra || 0) -
                                                Number(detalle.total_gastos || 0) -
                                                Number(detalle.total_retiros || 0)
                                            )}
                                        </td>
                                    </tr>
                                    {detalle.estado === 'CERRADO' && (
                                        <>
                                            <tr>
                                                <td style={s.td}>Recuento físico</td>
                                                <td style={{ ...s.td, textAlign: 'right' }}>{fmt(detalle.total_recuento_fisico)}</td>
                                            </tr>
                                        </>
                                    )}
                                </tbody>
                            </table>
                            {detalle.estado === 'CERRADO' && (
                                <div style={s.diferencia(Number(detalle.diferencia))}>
                                    Diferencia de caja: {fmt(detalle.diferencia)}
                                    {Number(detalle.diferencia) >= 0 ? ' ✅' : ' ⚠️'}
                                </div>
                            )}
                        </div>

                        {/* Ventas por método de pago */}
                        <div style={s.section}>
                            <p style={s.sectionTitulo}>Ventas por Método de Pago</p>
                            {loadingDetalle ? (
                                <p style={{ color: '#94a3b8', fontSize: 13 }}>Cargando…</p>
                            ) : ventasResumen.por_metodo.length === 0 ? (
                                <p style={{ color: '#94a3b8', fontSize: 13 }}>Sin ventas en este turno.</p>
                            ) : (
                                <div className="cc-tabla-wrap">
                                <table style={s.tabla} className="cc-tabla">
                                    <thead>
                                        <tr>
                                            <th style={s.th}>Método de pago</th>
                                            <th style={{ ...s.th, textAlign: 'right' }}>Cantidad</th>
                                            <th style={{ ...s.th, textAlign: 'right' }}>Total</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {ventasResumen.por_metodo.map((m, i) => (
                                            <tr key={i}>
                                                <td style={s.td}>{m.metodo_pago || 'Sin especificar'}</td>
                                                <td style={{ ...s.td, textAlign: 'right' }}>{m.cantidad}</td>
                                                <td style={{ ...s.td, textAlign: 'right', fontWeight: 600 }}>{fmt(m.total)}</td>
                                            </tr>
                                        ))}
                                        <tr style={s.totalRow}>
                                            <td style={s.td}>Total general</td>
                                            <td style={{ ...s.td, textAlign: 'right' }}>
                                                {ventasResumen.por_metodo.reduce((a, m) => a + m.cantidad, 0)}
                                            </td>
                                            <td style={{ ...s.td, textAlign: 'right' }}>
                                                {fmt(ventasResumen.por_metodo.reduce((a, m) => a + Number(m.total), 0))}
                                            </td>
                                        </tr>
                                    </tbody>
                                </table>
                                </div>
                            )}
                        </div>

                        {/* Ventas efectivo */}
                        <div style={s.section}>
                            <p style={s.sectionTitulo}>Ventas en Efectivo (detalle)</p>
                            {loadingDetalle ? (
                                <p style={{ color: '#94a3b8', fontSize: 13 }}>Cargando ventas…</p>
                            ) : ventasDetalle.length === 0 ? (
                                <p style={{ color: '#94a3b8', fontSize: 13 }}>Sin ventas en efectivo en este turno.</p>
                            ) : (
                                <table style={s.tabla}>
                                    <thead>
                                        <tr>
                                            <th style={s.th}>Fecha</th>
                                            <th style={s.th}>Cliente</th>
                                            <th style={{ ...s.th, textAlign: 'right' }}>Importe</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {ventasDetalle.map(v => (
                                            <tr key={v.id}>
                                                <td style={s.td}>{fmtFecha(v.fecha_venta)}</td>
                                                <td style={s.td}>{v.cliente_nombre || 'Consumidor Final'}</td>
                                                <td style={{ ...s.td, textAlign: 'right' }}>{fmt(v.total)}</td>
                                            </tr>
                                        ))}
                                        <tr style={s.totalRow}>
                                            <td style={s.td} colSpan={2}>Total</td>
                                            <td style={{ ...s.td, textAlign: 'right' }}>
                                                {fmt(ventasDetalle.reduce((a, v) => a + Number(v.total), 0))}
                                            </td>
                                        </tr>
                                    </tbody>
                                </table>
                            )}
                        </div>

                        {/* Egresos */}
                        <div style={s.section}>
                            <p style={s.sectionTitulo}>Egresos de Caja</p>
                            {detalle.egresos.length === 0 ? (
                                <p style={{ color: '#94a3b8', fontSize: 13 }}>Sin egresos registrados.</p>
                            ) : (
                                <table style={s.tabla}>
                                    <thead>
                                        <tr>
                                            <th style={s.th}>Fecha</th>
                                            <th style={s.th}>Tipo</th>
                                            <th style={s.th}>Concepto</th>
                                            <th style={{ ...s.th, textAlign: 'right' }}>Importe</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {detalle.egresos.map(e => (
                                            <tr key={e.id}>
                                                <td style={s.td}>{fmtFecha(e.fecha)}</td>
                                                <td style={s.td}>{e.tipo_display}</td>
                                                <td style={s.td}>{e.concepto}</td>
                                                <td style={{ ...s.td, textAlign: 'right', color: '#e25252' }}>- {fmt(e.importe)}</td>
                                            </tr>
                                        ))}
                                        <tr style={s.totalRow}>
                                            <td style={s.td} colSpan={3}>Total</td>
                                            <td style={{ ...s.td, textAlign: 'right', color: '#e25252' }}>
                                                - {fmt(detalle.egresos.reduce((a, e) => a + Number(e.importe), 0))}
                                            </td>
                                        </tr>
                                    </tbody>
                                </table>
                            )}
                        </div>

                        {/* Recuento físico (si cerrado) */}
                        {detalle.estado === 'CERRADO' && (
                            <div style={s.section}>
                                <p style={s.sectionTitulo}>Recuento Físico de Billetes</p>
                                <table style={s.tabla}>
                                    <thead>
                                        <tr>
                                            <th style={s.th}>Denominación</th>
                                            <th style={{ ...s.th, textAlign: 'right' }}>Cantidad</th>
                                            <th style={{ ...s.th, textAlign: 'right' }}>Subtotal</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {[
                                            { label: '$20.000', key: 'billetes_20000', val: 20000 },
                                            { label: '$10.000', key: 'billetes_10000', val: 10000 },
                                            { label: '$2.000',  key: 'billetes_2000',  val: 2000 },
                                            { label: '$1.000',  key: 'billetes_1000',  val: 1000 },
                                            { label: '$500',    key: 'billetes_500',   val: 500 },
                                            { label: '$200',    key: 'billetes_200',   val: 200 },
                                            { label: '$100',    key: 'billetes_100',   val: 100 },
                                        ].map(({ label, key, val }) => (
                                            <tr key={key}>
                                                <td style={s.td}>{label}</td>
                                                <td style={{ ...s.td, textAlign: 'right' }}>{detalle[key]}</td>
                                                <td style={{ ...s.td, textAlign: 'right' }}>{fmt(detalle[key] * val)}</td>
                                            </tr>
                                        ))}
                                        <tr>
                                            <td style={s.td}>Monedas</td>
                                            <td style={{ ...s.td, textAlign: 'right' }}>-</td>
                                            <td style={{ ...s.td, textAlign: 'right' }}>{fmt(detalle.monedas)}</td>
                                        </tr>
                                        <tr style={s.totalRow}>
                                            <td style={s.td} colSpan={2}>Total físico</td>
                                            <td style={{ ...s.td, textAlign: 'right' }}>{fmt(detalle.total_recuento_fisico)}</td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>
                        )}

                        {detalle.notas && (
                            <div style={s.section}>
                                <p style={s.sectionTitulo}>Notas</p>
                                <p style={{ fontSize: 13, color: '#475569' }}>{detalle.notas}</p>
                            </div>
                        )}

                        <div style={s.acciones} className="cc-acciones">
                            <button style={{ ...s.btn, background: '#e2e8f0', color: '#475569' }} onClick={cerrarDetalle}>
                                Cerrar
                            </button>
                            {detalle.estado !== 'CERRADO' && (user?.is_superuser || user?.is_supervisor) && (
                                <button
                                    style={{ ...s.btn, background: '#e25252', color: '#fff' }}
                                    onClick={() => setMostrarModalCerrar(true)}
                                >
                                    🔒 Cerrar Caja
                                </button>
                            )}
                            <button style={{ ...s.btn, ...s.btnPrimary }} onClick={imprimirRecibo}>
                                Imprimir recibo
                            </button>
                        </div>
                    </div>
                </div>
                );
            })()}

            {/* ── Modal de cierre forzado ───────────────────────────────────────── */}
            {mostrarModalCerrar && detalle && (() => {
                const efectivo = ventasResumen.total_ventas_efectivo ?? Number(detalle.total_ventas_efectivo || 0);
                const ingresos = Number(detalle.total_ingresos_extra || 0);
                const gastos   = Number(detalle.total_gastos || 0);
                const retiros  = Number(detalle.total_retiros || 0);
                const teorico  = Number(detalle.cambio_inicial || 0) + efectivo + ingresos - gastos - retiros;
                const fisico   = BILLETES_DEFS.reduce((acc, { key, val }) =>
                    acc + (parseFloat(billetes[key] || 0) * val), 0);
                const diferencia = fisico - teorico;
                return (
                <div style={{ ...s.overlay, zIndex: 1100 }} onClick={() => setMostrarModalCerrar(false)}>
                    <div style={{ ...s.modal, maxWidth: 820, maxHeight: '90vh', overflowY: 'auto' }} onClick={e => e.stopPropagation()}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                            <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: '#1a2926' }}>
                                Cerrar Caja — {detalle.usuario_nombre}
                            </h2>
                            <button onClick={() => setMostrarModalCerrar(false)}
                                style={{ background: 'none', border: 'none', fontSize: 22, cursor: 'pointer', color: '#94a3b8' }}>✕</button>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }} className="cc-cierre-grid">
                            {/* Columna izquierda: resumen financiero */}
                            <div>
                                <div style={{ background: '#f8fafc', borderRadius: 10, padding: 16, border: '1px solid #e2e8f0', marginBottom: 14 }}>
                                    <p style={{ fontWeight: 700, fontSize: 13, color: '#475569', textTransform: 'uppercase', marginBottom: 10 }}>Resumen del turno</p>
                                    {[
                                        { label: 'Cambio inicial',      val: detalle.cambio_inicial, color: '#1a2926' },
                                        { label: 'Ventas en efectivo',  val: efectivo,               color: '#1a2926' },
                                        ...(ingresos > 0 ? [{ label: '+ Ingresos extra', val: ingresos, color: '#1a6a40' }] : []),
                                        ...(gastos   > 0 ? [{ label: '- Gastos',         val: gastos,   color: '#e25252', neg: true }] : []),
                                        ...(retiros  > 0 ? [{ label: '- Retiros',        val: retiros,  color: '#e25252', neg: true }] : []),
                                    ].map(({ label, val, color, neg }) => (
                                        <div key={label} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14, padding: '3px 0', color }}>
                                            <span>{label}</span>
                                            <span style={{ fontWeight: 600 }}>{neg ? '- ' : ''}{fmt(Math.abs(val))}</span>
                                        </div>
                                    ))}
                                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 15, fontWeight: 700, borderTop: '1px solid #e2e8f0', marginTop: 8, paddingTop: 8 }}>
                                        <span>Total teórico en caja</span>
                                        <span>{fmt(teorico)}</span>
                                    </div>
                                </div>

                                {ventasResumen.por_metodo.length > 0 && (
                                    <div style={{ background: '#f8fafc', borderRadius: 10, padding: 16, border: '1px solid #e2e8f0' }}>
                                        <p style={{ fontWeight: 700, fontSize: 13, color: '#475569', textTransform: 'uppercase', marginBottom: 8 }}>Ventas por método</p>
                                        {ventasResumen.por_metodo.map((m, i) => (
                                            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, padding: '2px 0', color: '#475569' }}>
                                                <span>{m.metodo_pago || 'Sin especificar'} <span style={{ color: '#94a3b8', fontSize: 11 }}>({m.cantidad})</span></span>
                                                <span style={{ fontWeight: 500 }}>{fmt(m.total)}</span>
                                            </div>
                                        ))}
                                    </div>
                                )}

                                <div style={{ marginTop: 14 }}>
                                    <label style={{ fontSize: 13, fontWeight: 600, color: '#475569', display: 'block', marginBottom: 4 }}>Notas</label>
                                    <textarea
                                        value={notasCierre}
                                        onChange={e => setNotasCierre(e.target.value)}
                                        rows={3}
                                        placeholder="Observaciones del cierre..."
                                        style={{ width: '100%', padding: '8px 10px', borderRadius: 10, border: '1px solid #e2e8f0', fontSize: 13, boxSizing: 'border-box', resize: 'vertical', backgroundColor: '#f8fafc', color: '#1a2926' }}
                                    />
                                </div>
                            </div>

                            {/* Columna derecha: recuento físico */}
                            <div>
                                <div style={{ background: '#1a6a40', borderRadius: 10, padding: 18, color: '#fff' }}>
                                    <p style={{ fontWeight: 800, fontSize: 15, textAlign: 'center', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 16 }}>
                                        Recuento Físico
                                    </p>
                                    <table style={{ width: '100%', fontSize: 14, borderCollapse: 'collapse' }}>
                                        <thead>
                                            <tr>
                                                <th style={{ textAlign: 'left', paddingBottom: 8, opacity: .8 }}>Billete</th>
                                                <th style={{ textAlign: 'center', paddingBottom: 8, opacity: .8 }}>Cantidad</th>
                                                <th style={{ textAlign: 'right', paddingBottom: 8, opacity: .8 }}>Total</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {BILLETES_DEFS.map(({ label, key, val }) => (
                                                <tr key={key} style={{ borderTop: '1px solid rgba(255,255,255,.15)' }}>
                                                    <td style={{ padding: '7px 4px' }}>{label}</td>
                                                    <td style={{ padding: '7px 4px', textAlign: 'center' }}>
                                                        <input
                                                            type="number" min="0"
                                                            value={billetes[key]}
                                                            onChange={e => setBilletes(b => ({ ...b, [key]: e.target.value }))}
                                                            style={{
                                                                width: 70, padding: '4px 6px', borderRadius: 5,
                                                                border: 'none', textAlign: 'center', fontSize: 14,
                                                                background: 'rgba(255,255,255,.2)', color: '#fff',
                                                            }}
                                                            placeholder="0"
                                                        />
                                                    </td>
                                                    <td style={{ padding: '7px 4px', textAlign: 'right', fontWeight: 600 }}>
                                                        {fmt(parseFloat(billetes[key] || 0) * val)}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                    <div style={{ borderTop: '2px solid rgba(255,255,255,.3)', marginTop: 10, paddingTop: 10, display: 'flex', justifyContent: 'space-between', fontWeight: 700, fontSize: 15 }}>
                                        <span>Total físico:</span>
                                        <span>{fmt(fisico)}</span>
                                    </div>
                                </div>

                                <div style={{
                                    marginTop: 14, borderRadius: 10, padding: 16, textAlign: 'center',
                                    fontWeight: 800, fontSize: 20,
                                    background: diferencia >= 0 ? '#edfaf3' : '#fef2f2',
                                    color: diferencia >= 0 ? '#1a6a40' : '#e25252',
                                }}>
                                    DIFERENCIA: {fmt(diferencia)}
                                </div>

                                <button
                                    onClick={handleCerrarCaja}
                                    disabled={guardandoCierre}
                                    style={{
                                        marginTop: 16, width: '100%', padding: 14, borderRadius: 10,
                                        border: 'none', cursor: guardandoCierre ? 'not-allowed' : 'pointer',
                                        background: guardandoCierre ? '#94a3b8' : '#e25252',
                                        color: '#fff', fontWeight: 700, fontSize: 16,
                                    }}
                                >
                                    {guardandoCierre ? 'Cerrando...' : '🔒 Confirmar Cierre de Caja'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
                );
            })()}
        </div>
        </>
    );
}
