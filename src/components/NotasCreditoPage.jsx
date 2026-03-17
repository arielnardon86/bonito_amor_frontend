import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { useAuth } from '../AuthContext';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';

const normalizeApiUrl = (url) => {
    if (!url) return 'http://localhost:8000';
    let u = url.replace(/\/api\/?$/, '').replace(/\/$/, '');
    return u;
};

const BASE = normalizeApiUrl(API_BASE_URL);

const fmt = (n) =>
    Number(n).toLocaleString('es-AR', { style: 'currency', currency: 'ARS', minimumFractionDigits: 2 });

const fmtFecha = (iso) => {
    if (!iso) return '—';
    const d = new Date(iso);
    return d.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' });
};

const CHIP_ESTADO = {
    EMITIDA:  { bg: '#d1fae5', color: '#065f46', label: 'Emitida' },
    PENDIENTE:{ bg: '#fef9c3', color: '#713f12', label: 'Pendiente' },
    ERROR:    { bg: '#fee2e2', color: '#991b1b', label: 'Error' },
};

const ChipEstado = ({ estado }) => {
    const s = CHIP_ESTADO[estado] || { bg: '#f3f4f6', color: '#374151', label: estado };
    return (
        <span style={{
            background: s.bg, color: s.color,
            padding: '2px 10px', borderRadius: 999, fontSize: 12, fontWeight: 600,
        }}>{s.label}</span>
    );
};

export default function NotasCreditoPage() {
    const { token, selectedStoreSlug } = useAuth();

    const [facturas,       setFacturas]       = useState([]);
    const [ncPorFactura,   setNcPorFactura]   = useState({});   // { facturaId: [nc...] }
    const [loading,        setLoading]        = useState(true);
    const [error,          setError]          = useState(null);

    // Modal generar NC
    const [modalFactura,   setModalFactura]   = useState(null);
    const [modalMonto,     setModalMonto]     = useState('');
    const [modalMotivo,    setModalMotivo]    = useState('');
    const [emitiendo,      setEmitiendo]      = useState(false);
    const [modalError,     setModalError]     = useState('');

    // Alert banner
    const [alertMsg,       setAlertMsg]       = useState('');
    const [alertOk,        setAlertOk]        = useState(true);

    const showAlert = (msg, ok = true) => {
        setAlertMsg(msg); setAlertOk(ok);
        setTimeout(() => setAlertMsg(''), 4000);
    };

    const headers = { Authorization: `Bearer ${token}` };

    const fetchData = useCallback(async () => {
        if (!token || !selectedStoreSlug) { setLoading(false); return; }
        setLoading(true);
        setError(null);
        try {
            const [facRes, ncRes] = await Promise.all([
                axios.get(`${BASE}/api/facturas/?estado=EMITIDA`, { headers }),
                axios.get(`${BASE}/api/notas-credito/`, { headers }),
            ]);
            const facts = Array.isArray(facRes.data) ? facRes.data : (facRes.data.results ?? []);
            const ncs   = Array.isArray(ncRes.data)  ? ncRes.data  : (ncRes.data.results  ?? []);

            // Índice NCs por factura_origen
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
    }, [token, selectedStoreSlug]); // eslint-disable-line react-hooks/exhaustive-deps

    useEffect(() => { fetchData(); }, [fetchData]);

    // ── Abrir modal ──────────────────────────────────────────────────────────
    const abrirModal = (factura) => {
        setModalFactura(factura);
        setModalMonto(String(factura.total));
        setModalMotivo('');
        setModalError('');
    };

    const cerrarModal = () => {
        if (emitiendo) return;
        setModalFactura(null);
        setModalMonto('');
        setModalMotivo('');
        setModalError('');
    };

    // ── Emitir NC ────────────────────────────────────────────────────────────
    const emitirNC = async () => {
        if (!modalFactura) return;
        const monto = parseFloat(modalMonto);
        if (isNaN(monto) || monto <= 0) { setModalError('Ingresá un monto válido mayor a cero.'); return; }
        if (monto > parseFloat(modalFactura.total)) {
            setModalError(`El monto no puede superar el total de la factura (${fmt(modalFactura.total)}).`);
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
            // Actualizar índice local
            setNcPorFactura(prev => {
                const arr = [...(prev[modalFactura.id] || []), nc];
                return { ...prev, [modalFactura.id]: arr };
            });
            showAlert(`✅ NC ${nc.tipo_comprobante} ${nc.numero_nc_completo} emitida — CAE: ${nc.cae}`);
            cerrarModal();
        } catch (e) {
            const msg = e.response?.data?.error || 'Error al emitir la nota de crédito';
            setModalError(msg);
        } finally {
            setEmitiendo(false);
        }
    };

    // ── Estilos ──────────────────────────────────────────────────────────────
    const s = {
        page:      { padding: '24px 20px', maxWidth: 1100, margin: '0 auto' },
        title:     { fontSize: 22, fontWeight: 700, color: '#111827', marginBottom: 6 },
        subtitle:  { color: '#6b7280', fontSize: 14, marginBottom: 20 },
        alert:     (ok) => ({
            padding: '10px 16px', borderRadius: 8, marginBottom: 16,
            background: ok ? '#d1fae5' : '#fee2e2', color: ok ? '#065f46' : '#991b1b',
            fontWeight: 600, fontSize: 14,
        }),
        card:      {
            background: '#fff', borderRadius: 10, boxShadow: '0 1px 4px rgba(0,0,0,.08)',
            marginBottom: 16, overflow: 'hidden',
        },
        cardHead:  {
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '14px 20px', borderBottom: '1px solid #f3f4f6',
        },
        factNum:   { fontWeight: 700, fontSize: 16, color: '#1f2937' },
        meta:      { fontSize: 13, color: '#6b7280', marginTop: 2 },
        btnGen:    {
            padding: '7px 18px', background: '#2563eb', color: '#fff',
            border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 600, fontSize: 14,
        },
        ncRow:     {
            display: 'flex', alignItems: 'center', gap: 12,
            padding: '10px 20px', borderTop: '1px solid #f9fafb',
            background: '#f9fafb',
        },
        ncLabel:   { fontSize: 13, color: '#374151' },
        // Modal
        overlay:   {
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,.45)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 999,
        },
        modal:     {
            background: '#fff', borderRadius: 12, padding: 28, width: 460, maxWidth: '95vw',
            boxShadow: '0 8px 32px rgba(0,0,0,.18)',
        },
        mTitle:    { fontSize: 18, fontWeight: 700, color: '#111827', marginBottom: 4 },
        mSub:      { fontSize: 13, color: '#6b7280', marginBottom: 20 },
        label:     { fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 4, display: 'block' },
        input:     {
            width: '100%', padding: '9px 12px', border: '1px solid #d1d5db',
            borderRadius: 8, fontSize: 14, boxSizing: 'border-box', marginBottom: 14,
        },
        btnRow:    { display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 6 },
        btnCan:    {
            padding: '9px 20px', background: '#f3f4f6', color: '#374151',
            border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 600,
        },
        btnConf:   {
            padding: '9px 20px', background: '#2563eb', color: '#fff',
            border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 600,
        },
    };

    if (loading) return <div style={{ padding: 32, textAlign: 'center', color: '#6b7280' }}>Cargando facturas…</div>;
    if (error)   return <div style={{ padding: 32, color: '#dc2626' }}>{error}</div>;

    return (
        <div style={s.page}>
            <h1 style={s.title}>Notas de Crédito AFIP</h1>
            <p style={s.subtitle}>
                Facturas electrónicas emitidas — generá una nota de crédito vinculada a cada una.
            </p>

            {alertMsg && <div style={s.alert(alertOk)}>{alertMsg}</div>}

            {facturas.length === 0 ? (
                <div style={{ textAlign: 'center', padding: 48, color: '#9ca3af' }}>
                    No hay facturas emitidas. Emití facturas desde Punto de Venta para verlas aquí.
                </div>
            ) : (
                facturas.map(f => {
                    const ncs = ncPorFactura[f.id] || [];
                    return (
                        <div key={f.id} style={s.card}>
                            <div style={s.cardHead}>
                                <div>
                                    <div style={s.factNum}>
                                        Factura {f.tipo_comprobante} {f.numero_factura_completo}
                                    </div>
                                    <div style={s.meta}>
                                        {fmtFecha(f.fecha_emision)} — {f.cliente_nombre}
                                        {f.cliente_cuit ? ` · CUIT ${f.cliente_cuit}` : ''}
                                        {' · '}<strong>{fmt(f.total)}</strong>
                                        {' · CAE: '}{f.cae || '—'}
                                    </div>
                                </div>
                                <button style={s.btnGen} onClick={() => abrirModal(f)}>
                                    + Generar NC
                                </button>
                            </div>

                            {ncs.length > 0 && ncs.map(nc => (
                                <div key={nc.id} style={s.ncRow}>
                                    <span style={{ fontSize: 18 }}>↳</span>
                                    <span style={s.ncLabel}>
                                        <strong>NC {nc.tipo_comprobante} {nc.numero_nc_completo}</strong>
                                        {' — '}{fmt(nc.monto)}
                                        {nc.cae ? ` — CAE: ${nc.cae}` : ''}
                                        {nc.motivo ? ` — "${nc.motivo}"` : ''}
                                    </span>
                                    <ChipEstado estado={nc.estado} />
                                    {nc.estado === 'ERROR' && nc.error_mensaje && (
                                        <span style={{ fontSize: 12, color: '#dc2626', flex: 1 }}>
                                            {nc.error_mensaje}
                                        </span>
                                    )}
                                </div>
                            ))}
                        </div>
                    );
                })
            )}

            {/* ── Modal ──────────────────────────────────────────────── */}
            {modalFactura && (
                <div style={s.overlay} onClick={cerrarModal}>
                    <div style={s.modal} onClick={e => e.stopPropagation()}>
                        <div style={s.mTitle}>Generar Nota de Crédito</div>
                        <div style={s.mSub}>
                            Factura {modalFactura.tipo_comprobante} {modalFactura.numero_factura_completo}
                            {' — '}{modalFactura.cliente_nombre}
                            {' — Total: '}<strong>{fmt(modalFactura.total)}</strong>
                        </div>

                        <label style={s.label}>Monto de la NC *</label>
                        <input
                            type="number"
                            min="0.01"
                            step="0.01"
                            max={modalFactura.total}
                            value={modalMonto}
                            onChange={e => setModalMonto(e.target.value)}
                            style={s.input}
                            disabled={emitiendo}
                        />

                        <label style={s.label}>Motivo (opcional)</label>
                        <input
                            type="text"
                            maxLength={200}
                            value={modalMotivo}
                            onChange={e => setModalMotivo(e.target.value)}
                            placeholder="Ej: Devolución por producto defectuoso"
                            style={s.input}
                            disabled={emitiendo}
                        />

                        {modalError && (
                            <div style={{
                                background: '#fee2e2', color: '#991b1b', padding: '8px 12px',
                                borderRadius: 8, fontSize: 13, marginBottom: 12,
                            }}>
                                {modalError}
                            </div>
                        )}

                        <div style={s.btnRow}>
                            <button style={s.btnCan} onClick={cerrarModal} disabled={emitiendo}>
                                Cancelar
                            </button>
                            <button style={s.btnConf} onClick={emitirNC} disabled={emitiendo}>
                                {emitiendo ? 'Emitiendo…' : 'Emitir NC'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
