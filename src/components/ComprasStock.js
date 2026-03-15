import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import Swal from 'sweetalert2';
import { useAuth } from '../AuthContext';

const normalizeApiUrl = (url) => {
    if (!url) return 'http://localhost:8000';
    let u = url;
    if (u.endsWith('/api/') || u.endsWith('/api')) u = u.replace(/\/api\/?$/, '');
    if (u.endsWith('/')) u = u.slice(0, -1);
    return u;
};

const BASE = normalizeApiUrl(process.env.REACT_APP_API_URL || 'http://localhost:8000');

const fmt = (n) =>
    new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(n ?? 0);

const fmtDate = (str) => {
    if (!str) return '-';
    return new Date(str + 'T12:00:00').toLocaleDateString('es-AR', {
        day: '2-digit', month: '2-digit', year: 'numeric',
    });
};

const todayISO = () => new Date().toISOString().slice(0, 10);

const cs = {
    page: { padding: '28px 32px', maxWidth: 1100, margin: '0 auto' },
    header: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24, flexWrap: 'wrap', gap: 12 },
    h1: { margin: 0, fontSize: '1.6rem', fontWeight: 800, color: 'var(--ts-text)', letterSpacing: '-0.01em' },
    badge: { display: 'inline-flex', alignItems: 'center', gap: 6, padding: '4px 12px', borderRadius: 20, fontSize: 13, fontWeight: 600, background: '#edfaf3', color: '#1a7a3f', border: '1px solid #a8e6c5' },
    cards: { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 28 },
    card: (border) => ({
        background: 'var(--ts-surface)', borderRadius: 14, padding: '20px 24px',
        boxShadow: 'var(--ts-shadow-sm)', border: `1px solid ${border}`,
        display: 'flex', flexDirection: 'column', gap: 4,
    }),
    cardLabel: { fontSize: 12, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--ts-text-3)' },
    cardValue: (color) => ({ fontSize: '1.8rem', fontWeight: 800, color, letterSpacing: '-0.02em', lineHeight: 1.1 }),
    cardSub: { fontSize: 12, color: 'var(--ts-text-3)', marginTop: 2 },
    formCard: { background: 'var(--ts-surface)', borderRadius: 14, padding: '20px 24px', boxShadow: 'var(--ts-shadow-sm)', border: '1px solid #a8e6c5', marginBottom: 24 },
    formGrid: { display: 'grid', gridTemplateColumns: '1fr 2fr 1fr 2fr', gap: 14, alignItems: 'end' },
    label: { display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--ts-text-2)', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.04em' },
    input: { width: '100%', padding: '9px 12px', border: '1px solid var(--ts-border)', borderRadius: 9, fontSize: 14, color: 'var(--ts-text)', background: 'var(--ts-surface)', boxSizing: 'border-box', outline: 'none', fontFamily: 'var(--ts-font)' },
    btnPrimary: { display: 'inline-flex', alignItems: 'center', gap: 7, padding: '10px 22px', background: 'linear-gradient(135deg, #5dc87a 0%, #38a080 100%)', color: '#fff', border: 'none', borderRadius: 10, cursor: 'pointer', fontSize: 14, fontWeight: 700, boxShadow: '0 4px 14px rgba(93,200,122,0.28)', fontFamily: 'var(--ts-font)', whiteSpace: 'nowrap' },
    btnSecondary: { display: 'inline-flex', alignItems: 'center', gap: 7, padding: '9px 18px', background: '#fff', color: 'var(--ts-text)', border: '1px solid var(--ts-border)', borderRadius: 10, cursor: 'pointer', fontSize: 14, fontWeight: 600, fontFamily: 'var(--ts-font)' },
    btnDanger: { padding: '6px 13px', background: 'rgba(226,82,82,0.09)', color: '#dc2626', border: '1px solid rgba(226,82,82,0.25)', borderRadius: 8, cursor: 'pointer', fontSize: 13, fontWeight: 600, fontFamily: 'var(--ts-font)' },
    btnEdit: { padding: '6px 13px', background: 'rgba(59,154,222,0.09)', color: '#1d6fa8', border: '1px solid rgba(59,154,222,0.25)', borderRadius: 8, cursor: 'pointer', fontSize: 13, fontWeight: 600, fontFamily: 'var(--ts-font)' },
    tableWrap: { background: 'var(--ts-surface)', borderRadius: 14, boxShadow: 'var(--ts-shadow-sm)', border: '1px solid var(--ts-border)', overflow: 'hidden' },
    tableHeader: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px 12px', borderBottom: '1px solid var(--ts-border)' },
    th: { padding: '10px 14px', background: 'var(--ts-surface-alt)', color: 'var(--ts-text-2)', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '2px solid var(--ts-border)', textAlign: 'left' },
    td: { padding: '11px 14px', borderBottom: '1px solid var(--ts-border-light)', fontSize: 14, color: 'var(--ts-text)', verticalAlign: 'middle' },
    recibidoBadge: (ok) => ({
        display: 'inline-block', padding: '3px 10px', borderRadius: 20, fontSize: 12, fontWeight: 700,
        background: ok ? '#edfaf3' : '#fff8ec',
        color: ok ? '#1a7a3f' : '#92400e',
        border: `1px solid ${ok ? '#a8e6c5' : '#fcd34d'}`,
        cursor: 'pointer',
    }),
    overlay: { position: 'fixed', inset: 0, background: 'rgba(15,25,22,0.55)', backdropFilter: 'blur(2px)', zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 },
    modal: { background: 'var(--ts-surface)', borderRadius: 16, padding: 28, width: '100%', maxWidth: 480, boxShadow: '0 20px 60px rgba(0,0,0,0.25)', maxHeight: '90vh', overflowY: 'auto' },
    modalTitle: { margin: '0 0 20px', fontSize: '1.1rem', fontWeight: 800, color: 'var(--ts-text)' },
    modalActions: { display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 24 },
};

const MOBILE_STYLES = `
@media (max-width: 768px) {
  .cs-page { padding: 16px 12px !important; }
  .cs-cards { grid-template-columns: 1fr !important; }
  .cs-form-grid { grid-template-columns: 1fr 1fr !important; }
  .cs-table-wrap { overflow-x: auto; }
  .cs-table { min-width: 680px; }
}
@media (max-width: 480px) {
  .cs-form-grid { grid-template-columns: 1fr !important; }
}
`;

export default function ComprasStock() {
    const { token, selectedStoreSlug } = useAuth();

    // Budget from metrics
    const [presupuesto, setPresupuesto] = useState(null);
    const [loadingPresupuesto, setLoadingPresupuesto] = useState(true);

    // Purchases list
    const [compras, setCompras] = useState([]);
    const [loadingCompras, setLoadingCompras] = useState(true);

    // Form
    const [formVisible, setFormVisible] = useState(false);
    const [newFecha, setNewFecha] = useState(todayISO());
    const [newProveedor, setNewProveedor] = useState('');
    const [newMonto, setNewMonto] = useState('');
    const [newNotas, setNewNotas] = useState('');
    const [saving, setSaving] = useState(false);

    // Edit modal
    const [editCompra, setEditCompra] = useState(null);
    const [editFecha, setEditFecha] = useState('');
    const [editProveedor, setEditProveedor] = useState('');
    const [editMonto, setEditMonto] = useState('');
    const [editNotas, setEditNotas] = useState('');
    const [editSaving, setEditSaving] = useState(false);

    // Month/year navigation
    const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
    const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);

    const mesActual = new Date(selectedYear, selectedMonth - 1, 1).toLocaleString('es-AR', { month: 'long', year: 'numeric' });
    const firstDay = `${selectedYear}-${String(selectedMonth).padStart(2, '0')}-01`;
    const lastDay = new Date(selectedYear, selectedMonth, 0).toISOString().slice(0, 10);
    const realNow = new Date();
    const isCurrentMonth = selectedYear === realNow.getFullYear() && selectedMonth === realNow.getMonth() + 1;

    const fetchPresupuesto = useCallback(async () => {
        if (!token || !selectedStoreSlug) return;
        setLoadingPresupuesto(true);
        try {
            const res = await axios.get(`${BASE}/api/metricas/metrics/`, {
                headers: { Authorization: `Bearer ${token}` },
                params: {
                    tienda_slug: selectedStoreSlug,
                    date_from: firstDay,
                    date_to: lastDay,
                },
            });
            const val = res.data?.total_costo_vendido_periodo ?? res.data?.costo_vendido ?? 0;
            setPresupuesto(parseFloat(val) || 0);
        } catch {
            setPresupuesto(0);
        } finally {
            setLoadingPresupuesto(false);
        }
    }, [token, selectedStoreSlug, firstDay, lastDay]);

    const fetchCompras = useCallback(async () => {
        if (!token || !selectedStoreSlug) return;
        setLoadingCompras(true);
        try {
            const res = await axios.get(`${BASE}/api/compras-stock/`, {
                headers: { Authorization: `Bearer ${token}` },
                params: {
                    tienda_slug: selectedStoreSlug,
                    date_from: firstDay,
                    date_to: lastDay,
                },
            });
            const data = res.data;
            setCompras(Array.isArray(data) ? data : (data.results ?? []));
        } catch (err) {
            Swal.fire('Error', err.response?.data?.detail || 'No se pudieron cargar las compras', 'error');
        } finally {
            setLoadingCompras(false);
        }
    }, [token, selectedStoreSlug, firstDay, lastDay]);

    useEffect(() => {
        fetchPresupuesto();
        fetchCompras();
    }, [fetchPresupuesto, fetchCompras]);

    const totalComprometido = compras.reduce((acc, c) => acc + parseFloat(c.monto || 0), 0);
    const saldo = (presupuesto ?? 0) - totalComprometido;
    const saldoColor = saldo >= 0 ? '#16a34a' : '#dc2626';
    const saldoCardBorder = saldo >= 0 ? '#a8e6c5' : 'rgba(226,82,82,0.3)';

    const handleAdd = async (e) => {
        e.preventDefault();
        if (!newMonto || isNaN(parseFloat(newMonto))) {
            Swal.fire('Aviso', 'Ingresá un monto válido', 'warning');
            return;
        }
        setSaving(true);
        try {
            await axios.post(`${BASE}/api/compras-stock/`, {
                tienda_slug: selectedStoreSlug,
                fecha_compra: newFecha,
                proveedor: newProveedor.trim(),
                monto: parseFloat(newMonto),
                notas: newNotas.trim(),
            }, { headers: { Authorization: `Bearer ${token}` } });
            setNewFecha(todayISO());
            setNewProveedor('');
            setNewMonto('');
            setNewNotas('');
            setFormVisible(false);
            await fetchCompras();
        } catch (err) {
            Swal.fire('Error', err.response?.data?.detail || 'No se pudo guardar la compra', 'error');
        } finally {
            setSaving(false);
        }
    };

    const handleToggleRecibido = async (compra) => {
        try {
            await axios.patch(`${BASE}/api/compras-stock/${compra.id}/`, {
                recibido: !compra.recibido,
            }, { headers: { Authorization: `Bearer ${token}` } });
            setCompras(prev => prev.map(c => c.id === compra.id ? { ...c, recibido: !c.recibido } : c));
        } catch (err) {
            Swal.fire('Error', 'No se pudo actualizar el estado', 'error');
        }
    };

    const handleDelete = async (id) => {
        const result = await Swal.fire({
            title: '¿Eliminar compra?',
            text: 'Esta acción no se puede deshacer.',
            icon: 'warning',
            showCancelButton: true,
            confirmButtonText: 'Eliminar',
            cancelButtonText: 'Cancelar',
            confirmButtonColor: '#dc2626',
        });
        if (!result.isConfirmed) return;
        try {
            await axios.delete(`${BASE}/api/compras-stock/${id}/`, { headers: { Authorization: `Bearer ${token}` } });
            setCompras(prev => prev.filter(c => c.id !== id));
        } catch {
            Swal.fire('Error', 'No se pudo eliminar la compra', 'error');
        }
    };

    const handleOpenEdit = (c) => {
        setEditCompra(c);
        setEditFecha(c.fecha_compra);
        setEditProveedor(c.proveedor || '');
        setEditMonto(String(c.monto));
        setEditNotas(c.notas || '');
    };

    const handlePrevMonth = () => {
        if (selectedMonth === 1) { setSelectedMonth(12); setSelectedYear(y => y - 1); }
        else { setSelectedMonth(m => m - 1); }
    };
    const handleNextMonth = () => {
        if (selectedMonth === 12) { setSelectedMonth(1); setSelectedYear(y => y + 1); }
        else { setSelectedMonth(m => m + 1); }
    };
    const handleCurrentMonth = () => {
        const n = new Date();
        setSelectedYear(n.getFullYear());
        setSelectedMonth(n.getMonth() + 1);
    };

    const handleSaveEdit = async (e) => {
        e.preventDefault();
        if (!editMonto || isNaN(parseFloat(editMonto))) {
            Swal.fire('Aviso', 'Ingresá un monto válido', 'warning');
            return;
        }
        setEditSaving(true);
        try {
            await axios.patch(`${BASE}/api/compras-stock/${editCompra.id}/`, {
                fecha_compra: editFecha,
                proveedor: editProveedor.trim(),
                monto: parseFloat(editMonto),
                notas: editNotas.trim(),
            }, { headers: { Authorization: `Bearer ${token}` } });
            setEditCompra(null);
            await fetchCompras();
        } catch (err) {
            Swal.fire('Error', err.response?.data?.detail || 'No se pudo actualizar la compra', 'error');
        } finally {
            setEditSaving(false);
        }
    };

    return (
        <>
            <style>{MOBILE_STYLES}</style>
            <div className="cs-page" style={cs.page}>
                {/* Header */}
                <div style={cs.header}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
                        <h1 style={cs.h1}>Compras / Stock</h1>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <button type="button" onClick={handlePrevMonth} style={{ background: 'none', border: '1px solid var(--ts-border)', borderRadius: 7, padding: '3px 10px', cursor: 'pointer', fontSize: 15, color: 'var(--ts-text-2)', lineHeight: 1 }}>‹</button>
                            <span style={cs.badge}>● {mesActual}</span>
                            <button type="button" onClick={handleNextMonth} style={{ background: 'none', border: '1px solid var(--ts-border)', borderRadius: 7, padding: '3px 10px', cursor: 'pointer', fontSize: 15, color: 'var(--ts-text-2)', lineHeight: 1 }}>›</button>
                            {!isCurrentMonth && (
                                <button type="button" onClick={handleCurrentMonth} style={{ background: 'none', border: '1px solid var(--ts-border)', borderRadius: 7, padding: '3px 9px', cursor: 'pointer', fontSize: 11, color: 'var(--ts-text-3)', fontWeight: 600 }}>Hoy</button>
                            )}
                        </div>
                    </div>
                    <button
                        type="button"
                        style={formVisible ? cs.btnSecondary : cs.btnPrimary}
                        onClick={() => setFormVisible(v => !v)}
                    >
                        {formVisible ? '✕ Cancelar' : '+ Nueva compra'}
                    </button>
                </div>

                {/* Summary cards */}
                <div className="cs-cards" style={cs.cards}>
                    <div style={cs.card('#a8e6c5')}>
                        <span style={cs.cardLabel}>Presupuesto del mes</span>
                        <span style={cs.cardValue('#16a34a')}>
                            {loadingPresupuesto ? '...' : fmt(presupuesto)}
                        </span>
                        <span style={cs.cardSub}>Costo de productos vendidos</span>
                    </div>
                    <div style={cs.card('#fcd34d')}>
                        <span style={cs.cardLabel}>Comprometido</span>
                        <span style={cs.cardValue('#92400e')}>{fmt(totalComprometido)}</span>
                        <span style={cs.cardSub}>{compras.length} {compras.length === 1 ? 'compra' : 'compras'} registradas</span>
                    </div>
                    <div style={cs.card(saldoCardBorder)}>
                        <span style={cs.cardLabel}>Saldo disponible</span>
                        <span style={cs.cardValue(saldoColor)}>
                            {saldo >= 0 ? '' : '−'}{fmt(Math.abs(saldo))}
                        </span>
                        <span style={cs.cardSub}>{saldo >= 0 ? 'Disponible para comprar' : 'Excedido del presupuesto'}</span>
                    </div>
                </div>

                {/* Warning banner when saldo is negative */}
                {saldo < 0 && (
                    <div style={{ background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: 10, padding: '12px 18px', marginBottom: 20, color: '#991b1b', fontWeight: 600, fontSize: 14, display: 'flex', alignItems: 'center', gap: 10 }}>
                        <span style={{ fontSize: 18 }}>⚠️</span>
                        Presupuesto excedido en {fmt(Math.abs(saldo))}. Revisá las compras comprometidas este mes.
                    </div>
                )}

                {/* New purchase form */}
                {formVisible && (
                    <div style={cs.formCard}>
                        <p style={{ margin: '0 0 16px', fontWeight: 700, fontSize: 14, color: 'var(--ts-text-2)' }}>Registrar nueva compra</p>
                        <form onSubmit={handleAdd}>
                            <div className="cs-form-grid" style={cs.formGrid}>
                                <div>
                                    <label style={cs.label}>Fecha</label>
                                    <input
                                        type="date"
                                        style={cs.input}
                                        value={newFecha}
                                        onChange={e => setNewFecha(e.target.value)}
                                        required
                                    />
                                </div>
                                <div>
                                    <label style={cs.label}>Proveedor</label>
                                    <input
                                        type="text"
                                        style={cs.input}
                                        placeholder="Nombre del proveedor"
                                        value={newProveedor}
                                        onChange={e => setNewProveedor(e.target.value)}
                                    />
                                </div>
                                <div>
                                    <label style={cs.label}>Monto ($)</label>
                                    <input
                                        type="number"
                                        min="0"
                                        step="0.01"
                                        style={cs.input}
                                        placeholder="0.00"
                                        value={newMonto}
                                        onChange={e => setNewMonto(e.target.value)}
                                        required
                                    />
                                </div>
                                <div>
                                    <label style={cs.label}>Notas</label>
                                    <input
                                        type="text"
                                        style={cs.input}
                                        placeholder="Descripción opcional"
                                        value={newNotas}
                                        onChange={e => setNewNotas(e.target.value)}
                                    />
                                </div>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 16 }}>
                                <button type="submit" style={cs.btnPrimary} disabled={saving}>
                                    {saving ? 'Guardando...' : 'Guardar compra'}
                                </button>
                            </div>
                        </form>
                    </div>
                )}

                {/* Purchases table */}
                <div className="cs-table-wrap" style={cs.tableWrap}>
                    <div style={cs.tableHeader}>
                        <span style={{ fontWeight: 700, fontSize: 15, color: 'var(--ts-text)' }}>
                            Compras del mes
                        </span>
                        <span style={{ fontSize: 13, color: 'var(--ts-text-3)' }}>
                            {compras.length} {compras.length === 1 ? 'registro' : 'registros'}
                        </span>
                    </div>
                    {loadingCompras ? (
                        <p style={{ textAlign: 'center', padding: '40px 0', color: 'var(--ts-text-3)' }}>Cargando...</p>
                    ) : compras.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: '48px 20px', color: 'var(--ts-text-3)' }}>
                            <div style={{ fontSize: 36, marginBottom: 10 }}>📦</div>
                            <p style={{ margin: 0, fontWeight: 600 }}>Sin compras registradas este mes</p>
                            <p style={{ margin: '6px 0 0', fontSize: 13 }}>Usá el botón "+ Nueva compra" para agregar una.</p>
                        </div>
                    ) : (
                        <div style={{ overflowX: 'auto' }}>
                            <table className="cs-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
                                <thead>
                                    <tr>
                                        <th style={cs.th}>Fecha</th>
                                        <th style={cs.th}>Proveedor</th>
                                        <th style={{ ...cs.th, textAlign: 'right' }}>Monto</th>
                                        <th style={{ ...cs.th, textAlign: 'center' }}>Recibido</th>
                                        <th style={cs.th}>Notas</th>
                                        <th style={{ ...cs.th, textAlign: 'center' }}>Acciones</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {compras.map((c) => (
                                        <tr key={c.id} style={{ transition: 'background 0.15s' }}
                                            onMouseEnter={e => e.currentTarget.style.background = 'var(--ts-surface-alt)'}
                                            onMouseLeave={e => e.currentTarget.style.background = ''}>
                                            <td style={cs.td}>{fmtDate(c.fecha_compra)}</td>
                                            <td style={cs.td}>{c.proveedor || <span style={{ color: 'var(--ts-text-3)', fontStyle: 'italic' }}>Sin proveedor</span>}</td>
                                            <td style={{ ...cs.td, textAlign: 'right', fontWeight: 700, color: '#1a2926' }}>{fmt(c.monto)}</td>
                                            <td style={{ ...cs.td, textAlign: 'center' }}>
                                                <span
                                                    style={cs.recibidoBadge(c.recibido)}
                                                    onClick={() => handleToggleRecibido(c)}
                                                    title="Clic para cambiar estado"
                                                >
                                                    {c.recibido ? '✓ Recibido' : '⏳ Pendiente'}
                                                </span>
                                            </td>
                                            <td style={{ ...cs.td, color: 'var(--ts-text-2)', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                {c.notas || '-'}
                                            </td>
                                            <td style={{ ...cs.td, textAlign: 'center' }}>
                                                <div style={{ display: 'flex', gap: 6, justifyContent: 'center' }}>
                                                    <button type="button" style={cs.btnEdit} onClick={() => handleOpenEdit(c)}>Editar</button>
                                                    <button type="button" style={cs.btnDanger} onClick={() => handleDelete(c.id)}>Eliminar</button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                                <tfoot>
                                    <tr>
                                        <td colSpan={2} style={{ ...cs.td, fontWeight: 700, color: 'var(--ts-text-2)', fontSize: 13, textTransform: 'uppercase', letterSpacing: '0.04em', background: 'var(--ts-surface-alt)' }}>
                                            Total
                                        </td>
                                        <td style={{ ...cs.td, textAlign: 'right', fontWeight: 800, fontSize: 16, color: '#1a2926', background: 'var(--ts-surface-alt)' }}>
                                            {fmt(totalComprometido)}
                                        </td>
                                        <td colSpan={3} style={{ ...cs.td, background: 'var(--ts-surface-alt)' }} />
                                    </tr>
                                </tfoot>
                            </table>
                        </div>
                    )}
                </div>
            </div>

            {/* Edit modal */}
            {editCompra && (
                <div style={cs.overlay} onClick={() => setEditCompra(null)}>
                    <div style={cs.modal} onClick={e => e.stopPropagation()}>
                        <h3 style={cs.modalTitle}>Editar compra</h3>
                        <form onSubmit={handleSaveEdit}>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                                <div>
                                    <label style={cs.label}>Fecha</label>
                                    <input type="date" style={cs.input} value={editFecha} onChange={e => setEditFecha(e.target.value)} required />
                                </div>
                                <div>
                                    <label style={cs.label}>Proveedor</label>
                                    <input type="text" style={cs.input} placeholder="Nombre del proveedor" value={editProveedor} onChange={e => setEditProveedor(e.target.value)} />
                                </div>
                                <div>
                                    <label style={cs.label}>Monto ($)</label>
                                    <input type="number" min="0" step="0.01" style={cs.input} value={editMonto} onChange={e => setEditMonto(e.target.value)} required />
                                </div>
                                <div>
                                    <label style={cs.label}>Notas</label>
                                    <input type="text" style={cs.input} placeholder="Descripción opcional" value={editNotas} onChange={e => setEditNotas(e.target.value)} />
                                </div>
                            </div>
                            <div style={cs.modalActions}>
                                <button type="button" style={cs.btnSecondary} onClick={() => setEditCompra(null)}>Cancelar</button>
                                <button type="submit" style={cs.btnPrimary} disabled={editSaving}>
                                    {editSaving ? 'Guardando...' : 'Guardar cambios'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </>
    );
}
