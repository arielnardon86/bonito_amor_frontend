import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { useAuth } from '../AuthContext';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';
const BASE = API_BASE_URL.replace(/\/api\/?$/, '').replace(/\/$/, '');

const MESES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio',
               'Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];

const fmt = (n) =>
    Number(n).toLocaleString('es-AR', { style: 'currency', currency: 'ARS', minimumFractionDigits: 2 });

const fmtFecha = (iso) => {
    if (!iso) return '—';
    return new Date(iso).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' });
};

const primerDia  = (y, m) => `${y}-${String(m).padStart(2,'0')}-01`;
const ultimoDia  = (y, m) => {
    const d = new Date(y, m, 0); // día 0 del mes siguiente = último del actual
    return `${y}-${String(m).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
};

const CHIP = {
    EMITIDA:   { bg: '#d1fae5', color: '#065f46' },
    PENDIENTE: { bg: '#fef9c3', color: '#713f12' },
    ERROR:     { bg: '#fee2e2', color: '#991b1b' },
};

const Chip = ({ estado }) => {
    const s = CHIP[estado] || { bg: '#f3f4f6', color: '#374151' };
    return (
        <span style={{ background: s.bg, color: s.color, padding: '2px 10px',
                       borderRadius: 999, fontSize: 12, fontWeight: 600 }}>
            {estado}
        </span>
    );
};

export default function NotasCreditoPage() {
    const { token, selectedStoreSlug } = useAuth();

    const today = new Date();
    const [navYear,  setNavYear]  = useState(today.getFullYear());
    const [navMonth, setNavMonth] = useState(today.getMonth() + 1);

    const [facturas,     setFacturas]     = useState([]);
    const [ncPorFactura, setNcPorFactura] = useState({});
    const [loading,      setLoading]      = useState(true);
    const [error,        setError]        = useState(null);

    // Modal
    const [modalFactura, setModalFactura] = useState(null);
    const [modalMonto,   setModalMonto]   = useState('');
    const [modalMotivo,  setModalMotivo]  = useState('');
    const [emitiendo,    setEmitiendo]    = useState(false);
    const [modalError,   setModalError]   = useState('');

    // Alert
    const [alertMsg, setAlertMsg] = useState('');
    const [alertOk,  setAlertOk]  = useState(true);

    const showAlert = (msg, ok = true) => {
        setAlertMsg(msg); setAlertOk(ok);
        setTimeout(() => setAlertMsg(''), 4000);
    };

    const headers = { Authorization: `Bearer ${token}` };

    // ── Navegación de mes ────────────────────────────────────────────────────
    const handlePrevMonth = () => {
        if (navMonth === 1) { setNavYear(y => y - 1); setNavMonth(12); }
        else setNavMonth(m => m - 1);
    };
    const handleNextMonth = () => {
        if (navMonth === 12) { setNavYear(y => y + 1); setNavMonth(1); }
        else setNavMonth(m => m + 1);
    };
    const handleHoy = () => {
        setNavYear(today.getFullYear());
        setNavMonth(today.getMonth() + 1);
    };

    const esMesActual = navYear === today.getFullYear() && navMonth === today.getMonth() + 1;

    // ── Fetch ────────────────────────────────────────────────────────────────
    const fetchData = useCallback(async () => {
        if (!token || !selectedStoreSlug) { setLoading(false); return; }
        setLoading(true);
        setError(null);
        const desde = primerDia(navYear, navMonth);
        const hasta = ultimoDia(navYear, navMonth);
        try {
            const [facRes, ncRes] = await Promise.all([
                axios.get(`${BASE}/api/facturas/?estado=EMITIDA&venta_anulada=true&fecha_desde=${desde}&fecha_hasta=${hasta}`, { headers }),
                axios.get(`${BASE}/api/notas-credito/`, { headers }),
            ]);
            const facts = Array.isArray(facRes.data) ? facRes.data : (facRes.data.results ?? []);
            const ncs   = Array.isArray(ncRes.data)  ? ncRes.data  : (ncRes.data.results  ?? []);

            const idx = {};
            for (const nc of ncs) {
                const fid = nc.factura_origen;
                if (!idx[fid]) idx[fid] = [];
                idx[fid].push(nc);
            }
            setFacturas(facts);
            setNcPorFactura(idx);
        } catch (e) {
            setError(e.response?.data?.error || 'Error al cargar datos');
        } finally {
            setLoading(false);
        }
    }, [token, selectedStoreSlug, navYear, navMonth]); // eslint-disable-line react-hooks/exhaustive-deps

    useEffect(() => { fetchData(); }, [fetchData]);

    // ── Modal ────────────────────────────────────────────────────────────────
    const abrirModal = (f) => {
        setModalFactura(f);
        setModalMonto(String(f.total));
        setModalMotivo('');
        setModalError('');
    };
    const cerrarModal = () => {
        if (emitiendo) return;
        setModalFactura(null);
    };

    const emitirNC = async () => {
        if (!modalFactura) return;
        const monto = parseFloat(modalMonto);
        if (isNaN(monto) || monto <= 0) { setModalError('Ingresá un monto válido mayor a cero.'); return; }
        if (monto > parseFloat(modalFactura.total)) {
            setModalError(`No puede superar el total de la factura (${fmt(modalFactura.total)}).`);
            return;
        }
        setEmitiendo(true);
        setModalError('');
        try {
            const res = await axios.post(
                `${BASE}/api/facturas/${modalFactura.id}/emitir_nota_credito/`,
                { monto: monto.toFixed(2), motivo: modalMotivo },
                { headers },
            );
            const nc = res.data.nota_credito;
            setNcPorFactura(prev => ({
                ...prev,
                [modalFactura.id]: [...(prev[modalFactura.id] || []), nc],
            }));
            showAlert(`✅ NC ${nc.tipo_comprobante} ${nc.numero_nc_completo} emitida — CAE: ${nc.cae}`);
            cerrarModal();
        } catch (e) {
            setModalError(e.response?.data?.error || 'Error al emitir la nota de crédito');
        } finally {
            setEmitiendo(false);
        }
    };

    // ── Totales del mes ──────────────────────────────────────────────────────
    const totalFacturado = facturas.reduce((s, f) => s + parseFloat(f.total || 0), 0);
    const totalNC = Object.values(ncPorFactura)
        .flat()
        .filter(nc => nc.estado === 'EMITIDA')
        .reduce((s, nc) => s + parseFloat(nc.monto || 0), 0);

    // ── Render ───────────────────────────────────────────────────────────────
    return (
        <div style={{ padding: '8px 0' }}>

            {/* Navegación de mes */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
                <button onClick={handlePrevMonth} style={btnNav}>‹</button>
                <span style={{ fontWeight: 700, fontSize: 16, minWidth: 160, textAlign: 'center' }}>
                    {MESES[navMonth - 1]} {navYear}
                </span>
                <button onClick={handleNextMonth} style={btnNav}>›</button>
                {!esMesActual && (
                    <button onClick={handleHoy} style={btnHoy}>Hoy</button>
                )}
            </div>

            {/* Resumen */}
            {!loading && !error && (
                <div style={{ display: 'flex', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
                    <div style={chipResumen('#dbeafe','#1d4ed8')}>
                        {facturas.length} factura{facturas.length !== 1 ? 's' : ''} · {fmt(totalFacturado)}
                    </div>
                    {totalNC > 0 && (
                        <div style={chipResumen('#fce7f3','#9d174d')}>
                            NC emitidas · {fmt(totalNC)}
                        </div>
                    )}
                </div>
            )}

            {alertMsg && (
                <div style={{
                    padding: '10px 16px', borderRadius: 8, marginBottom: 14, fontWeight: 600, fontSize: 14,
                    background: alertOk ? '#d1fae5' : '#fee2e2',
                    color:      alertOk ? '#065f46' : '#991b1b',
                }}>
                    {alertMsg}
                </div>
            )}

            {loading && <div style={{ textAlign: 'center', padding: 40, color: '#6b7280' }}>Cargando…</div>}
            {error   && <div style={{ color: '#dc2626', padding: 12 }}>{error}</div>}

            {!loading && !error && facturas.length === 0 && (
                <div style={{ textAlign: 'center', padding: 48, color: '#9ca3af' }}>
                    No hay facturas de ventas anuladas en {MESES[navMonth - 1]} {navYear}.
                </div>
            )}

            {!loading && !error && facturas.map(f => {
                const ncs = ncPorFactura[f.id] || [];
                const tieneNcEmitida = ncs.some(nc => nc.estado === 'EMITIDA');
                return (
                    <div key={f.id} style={{ ...card, opacity: tieneNcEmitida ? 0.75 : 1 }}>
                        <div style={cardHead}>
                            <div>
                                <div style={{ fontWeight: 700, fontSize: 15, color: '#1f2937' }}>
                                    Factura {f.tipo_comprobante} {f.numero_factura_completo}
                                </div>
                                <div style={{ fontSize: 13, color: '#6b7280', marginTop: 2 }}>
                                    {fmtFecha(f.fecha_emision)} · {f.cliente_nombre}
                                    {f.cliente_cuit ? ` · CUIT ${f.cliente_cuit}` : ''}
                                    {' · '}<strong>{fmt(f.total)}</strong>
                                    {' · CAE: '}{f.cae || '—'}
                                </div>
                            </div>
                            {tieneNcEmitida ? (
                                <span style={badgeNcEmitida}>NC emitida</span>
                            ) : (
                                <button style={btnGen} onClick={() => abrirModal(f)}>+ Generar NC</button>
                            )}
                        </div>

                        {ncs.map(nc => (
                            <div key={nc.id} style={ncRow}>
                                <span style={{ fontSize: 16, color: '#9ca3af' }}>↳</span>
                                <span style={{ fontSize: 13, color: '#374151', flex: 1 }}>
                                    <strong>NC {nc.tipo_comprobante} {nc.numero_nc_completo}</strong>
                                    {' · '}{fmt(nc.monto)}
                                    {nc.cae  ? ` · CAE: ${nc.cae}` : ''}
                                    {nc.motivo ? ` · "${nc.motivo}"` : ''}
                                </span>
                                <Chip estado={nc.estado} />
                                {nc.estado === 'ERROR' && nc.error_mensaje && (
                                    <span style={{ fontSize: 12, color: '#dc2626' }}>{nc.error_mensaje}</span>
                                )}
                            </div>
                        ))}
                    </div>
                );
            })}

            {/* Modal */}
            {modalFactura && (
                <div style={overlay} onClick={cerrarModal}>
                    <div style={modal} onClick={e => e.stopPropagation()}>
                        <div style={{ fontSize: 17, fontWeight: 700, color: '#111827', marginBottom: 4 }}>
                            Generar Nota de Crédito
                        </div>
                        <div style={{ fontSize: 13, color: '#6b7280', marginBottom: 20 }}>
                            Factura {modalFactura.tipo_comprobante} {modalFactura.numero_factura_completo}
                            {' · '}{modalFactura.cliente_nombre}
                            {' · Total: '}<strong>{fmt(modalFactura.total)}</strong>
                        </div>

                        <label style={lbl}>Monto de la NC *</label>
                        <input type="number" min="0.01" step="0.01" max={modalFactura.total}
                               value={modalMonto} onChange={e => setModalMonto(e.target.value)}
                               style={inp} disabled={emitiendo} />

                        <label style={lbl}>Motivo (opcional)</label>
                        <input type="text" maxLength={200} value={modalMotivo}
                               onChange={e => setModalMotivo(e.target.value)}
                               placeholder="Ej: Devolución por producto defectuoso"
                               style={inp} disabled={emitiendo} />

                        {modalError && (
                            <div style={{ background: '#fee2e2', color: '#991b1b', padding: '8px 12px',
                                          borderRadius: 8, fontSize: 13, marginBottom: 12 }}>
                                {modalError}
                            </div>
                        )}

                        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 6 }}>
                            <button style={btnCan} onClick={cerrarModal} disabled={emitiendo}>Cancelar</button>
                            <button style={btnConf} onClick={emitirNC}   disabled={emitiendo}>
                                {emitiendo ? 'Emitiendo…' : 'Emitir NC'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

// ── Estilos ──────────────────────────────────────────────────────────────────
const btnNav = {
    background: '#f3f4f6', border: '1px solid #e5e7eb', borderRadius: 8,
    width: 34, height: 34, cursor: 'pointer', fontSize: 18, lineHeight: 1,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
};
const btnHoy = {
    padding: '4px 14px', background: '#e0e7ff', color: '#3730a3',
    border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 600, fontSize: 13,
};
const chipResumen = (bg, color) => ({
    background: bg, color, padding: '5px 14px', borderRadius: 999,
    fontSize: 13, fontWeight: 600,
});
const card = {
    background: '#fff', borderRadius: 10,
    boxShadow: '0 1px 4px rgba(0,0,0,.08)', marginBottom: 12, overflow: 'hidden',
};
const cardHead = {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    padding: '13px 18px', borderBottom: '1px solid #f3f4f6',
    flexWrap: 'wrap', gap: 8,
};
const ncRow = {
    display: 'flex', alignItems: 'center', gap: 10,
    padding: '8px 18px', borderTop: '1px solid #f9fafb', background: '#f9fafb',
    flexWrap: 'wrap',
};
const btnGen = {
    padding: '6px 16px', background: '#2563eb', color: '#fff',
    border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 600, fontSize: 13,
    whiteSpace: 'nowrap',
};
const overlay = {
    position: 'fixed', inset: 0, background: 'rgba(0,0,0,.45)',
    display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 999,
};
const modal = {
    background: '#fff', borderRadius: 12, padding: 26, width: 440, maxWidth: '94vw',
    boxShadow: '0 8px 32px rgba(0,0,0,.18)',
};
const lbl = { fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 4, display: 'block' };
const inp = {
    width: '100%', padding: '8px 11px', border: '1px solid #d1d5db',
    borderRadius: 8, fontSize: 14, boxSizing: 'border-box', marginBottom: 14,
};
const btnCan = {
    padding: '8px 18px', background: '#f3f4f6', color: '#374151',
    border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 600,
};
const btnConf = {
    padding: '8px 18px', background: '#2563eb', color: '#fff',
    border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 600,
};
const badgeNcEmitida = {
    padding: '6px 14px', background: '#d1fae5', color: '#065f46',
    borderRadius: 8, fontWeight: 700, fontSize: 13, whiteSpace: 'nowrap',
};
