// ClientesSaaS.js -- Panel de administración de clientes SaaS (solo superusuario).
// Lista todas las tiendas que pagan la suscripción de Total Stock, su estado
// (automático vía Mercado Pago) y permite marcar a mano el pago de las
// tiendas legacy que pagan por fuera de MP.
import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import Swal from 'sweetalert2';
import { useAuth } from '../AuthContext';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://127.0.0.1:8000';
const BASE_API_ENDPOINT = (() => {
    const url = API_BASE_URL;
    return url.replace(/\/api\/?$/, '').replace(/\/$/, '');
})();

const fmt = (n) =>
    n === null || n === undefined || n === '' ? '—' : new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).format(Number(n) || 0);

const fmtFecha = (iso) => {
    if (!iso) return '—';
    return new Date(iso).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' });
};

const MESES = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];

// Mismos colores que estado_badge en Django Admin (inventario/admin.py) --
// consistencia visual entre los dos lugares donde Ariel mira esto.
const ESTADO_COLOR = {
    pending: '#f59e0b',
    trial: '#3b82f6',
    activa: '#16a34a',
    gracia: '#f97316',
    pausada: '#dc2626',
    cancelada: '#6b7280',
    requiere_plan: '#e11d48',
};
const ESTADO_LABEL = {
    pending: 'Pendiente de pago',
    trial: 'Período de prueba',
    activa: 'Activa',
    gracia: 'Período de gracia',
    pausada: 'Pausada',
    cancelada: 'Cancelada',
    requiere_plan: 'Requiere elegir plan',
};

const EstadoBadge = ({ cliente }) => {
    if (cliente.legacy) {
        return <span style={{ ...badgeStyle, background: '#0f766e' }}>Legacy (sin plan)</span>;
    }
    const color = ESTADO_COLOR[cliente.estado] || '#6b7280';
    const label = ESTADO_LABEL[cliente.estado] || cliente.estado || '—';
    return <span style={{ ...badgeStyle, background: color }}>{label}</span>;
};

const badgeStyle = {
    display: 'inline-block', padding: '3px 10px', borderRadius: 20,
    color: '#fff', fontWeight: 700, fontSize: 12, whiteSpace: 'nowrap',
};

export default function ClientesSaaS() {
    const { token } = useAuth();
    const [clientes, setClientes] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [busqueda, setBusqueda] = useState('');

    // Modal marcar pago manual
    const [tiendaPago, setTiendaPago] = useState(null);
    const [pagoMes, setPagoMes] = useState('');
    const [pagoAnio, setPagoAnio] = useState('');
    const [pagoMonto, setPagoMonto] = useState('');
    const [pagoNota, setPagoNota] = useState('');
    const [guardandoPago, setGuardandoPago] = useState(false);

    // Modal historial
    const [tiendaHistorial, setTiendaHistorial] = useState(null);
    const [historial, setHistorial] = useState([]);
    const [loadingHistorial, setLoadingHistorial] = useState(false);

    const fetchClientes = useCallback(async () => {
        if (!token) return;
        setLoading(true);
        setError(null);
        try {
            const res = await axios.get(`${BASE_API_ENDPOINT}/api/admin-saas/clientes/`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            setClientes(res.data || []);
        } catch (err) {
            setError(err.response?.data?.error || 'No se pudo cargar la lista de clientes.');
        } finally {
            setLoading(false);
        }
    }, [token]);

    useEffect(() => { fetchClientes(); }, [fetchClientes]);

    const abrirMarcarPago = (cliente) => {
        const hoy = new Date();
        setTiendaPago(cliente);
        setPagoMes(String(hoy.getMonth() + 1));
        setPagoAnio(String(hoy.getFullYear()));
        setPagoMonto('');
        setPagoNota('');
    };

    const confirmarPago = async () => {
        if (!tiendaPago || !pagoMes || !pagoAnio) return;
        setGuardandoPago(true);
        try {
            const res = await axios.post(
                `${BASE_API_ENDPOINT}/api/admin-saas/clientes/${tiendaPago.tienda_id}/pagos-manuales/`,
                { mes: parseInt(pagoMes, 10), anio: parseInt(pagoAnio, 10), monto: pagoMonto || null, nota: pagoNota.trim() },
                { headers: { Authorization: `Bearer ${token}` } }
            );
            // Actualiza solo esta fila con lo que ya devuelve el POST, en vez de
            // volver a pedir la lista entera (antes recargaba toda la sección
            // después de cada pago -- lenta con muchas tiendas).
            const nuevoPago = res.data;
            const hoy = new Date();
            const esMesActual = nuevoPago.mes === hoy.getMonth() + 1 && nuevoPago.anio === hoy.getFullYear();
            setClientes(prev => prev.map(c => {
                if (c.tienda_id !== tiendaPago.tienda_id) return c;
                const ultimoActual = c.ultimo_pago_manual;
                const esMasReciente = !ultimoActual || nuevoPago.anio > ultimoActual.anio ||
                    (nuevoPago.anio === ultimoActual.anio && nuevoPago.mes >= ultimoActual.mes);
                return {
                    ...c,
                    ultimo_pago_manual: esMasReciente ? nuevoPago : ultimoActual,
                    pago_manual_mes_actual: c.pago_manual_mes_actual || esMesActual,
                };
            }));
            Swal.fire({ icon: 'success', title: 'Pago registrado', timer: 1400, showConfirmButton: false });
            setTiendaPago(null);
        } catch (err) {
            Swal.fire('Error', err.response?.data?.error || 'No se pudo registrar el pago.', 'error');
        } finally {
            setGuardandoPago(false);
        }
    };

    const abrirHistorial = async (cliente) => {
        setTiendaHistorial(cliente);
        setLoadingHistorial(true);
        try {
            const res = await axios.get(
                `${BASE_API_ENDPOINT}/api/admin-saas/clientes/${cliente.tienda_id}/pagos-manuales/`,
                { headers: { Authorization: `Bearer ${token}` } }
            );
            setHistorial(res.data || []);
        } catch {
            setHistorial([]);
        } finally {
            setLoadingHistorial(false);
        }
    };

    const eliminarPago = async (pagoId) => {
        const confirm = await Swal.fire({
            title: '¿Eliminar este pago?',
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#dc2626',
            confirmButtonText: 'Sí, eliminar',
            cancelButtonText: 'Cancelar',
        });
        if (!confirm.isConfirmed) return;
        try {
            await axios.delete(`${BASE_API_ENDPOINT}/api/admin-saas/pagos-manuales/${pagoId}/`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            // El historial ya viene ordenado -anio/-mes (ver backend), así que
            // tras sacar el pago borrado el primero que queda es el nuevo
            // "último pago manual" -- se actualiza la fila sin recargar toda
            // la lista de tiendas.
            const historialRestante = historial.filter(p => p.id !== pagoId);
            setHistorial(historialRestante);
            if (tiendaHistorial) {
                const hoy = new Date();
                const nuevoUltimo = historialRestante[0] || null;
                const siguePagoMesActual = historialRestante.some(
                    p => p.mes === hoy.getMonth() + 1 && p.anio === hoy.getFullYear()
                );
                setClientes(prev => prev.map(c => c.tienda_id === tiendaHistorial.tienda_id
                    ? { ...c, ultimo_pago_manual: nuevoUltimo, pago_manual_mes_actual: siguePagoMesActual }
                    : c
                ));
            }
        } catch (err) {
            Swal.fire('Error', 'No se pudo eliminar el pago.', 'error');
        }
    };

    const clientesFiltrados = clientes.filter(c =>
        !busqueda.trim() || (c.nombre || '').toLowerCase().includes(busqueda.trim().toLowerCase())
    );

    const anioActual = new Date().getFullYear();
    const aniosDisponibles = [anioActual - 1, anioActual, anioActual + 1];

    return (
        <div style={s.page}>
            <h1 style={s.titulo}>Clientes SaaS</h1>
            <p style={s.subtitulo}>Tiendas que pagan la suscripción de Total Stock -- estado automático vía Mercado Pago y pagos manuales para las legacy.</p>

            <input
                type="text"
                placeholder="Buscar por nombre de tienda..."
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                style={s.buscador}
            />

            {loading ? (
                <p style={s.mensaje}>Cargando...</p>
            ) : error ? (
                <p style={{ ...s.mensaje, color: '#e25252' }}>{error}</p>
            ) : clientesFiltrados.length === 0 ? (
                <p style={s.mensaje}>No hay tiendas para mostrar.</p>
            ) : (
                <div style={s.tableWrap}>
                    <table style={s.table}>
                        <thead>
                            <tr>
                                {['Tienda', 'Mail MP', 'Plan', 'Estado', 'Cobro', 'Próximo cobro', 'Último pago manual', 'Acciones'].map(h => (
                                    <th key={h} style={s.th}>{h}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {clientesFiltrados.map(c => (
                                <tr key={c.tienda_id} style={s.tr}>
                                    <td style={s.td}>
                                        <strong>{c.nombre}</strong>
                                        {c.hereda_suscripcion_de && (
                                            <div style={s.hint}>Hereda de: {c.hereda_suscripcion_de}</div>
                                        )}
                                    </td>
                                    <td style={s.td}>{c.mp_payer_email || '—'}</td>
                                    <td style={s.td}>{c.plan_display || (c.legacy ? '—' : '—')}</td>
                                    <td style={s.td}><EstadoBadge cliente={c} /></td>
                                    <td style={s.td}>
                                        {c.pago_atrasado ? (
                                            <span style={{ ...badgeStyle, background: '#f59e0b' }} title="Mercado Pago no pudo debitar el cobro y está reintentando">
                                                ⚠️ Atrasado
                                            </span>
                                        ) : !c.legacy ? (
                                            <span style={{ color: '#16a34a', fontSize: 12, fontWeight: 600 }}>Al día</span>
                                        ) : '—'}
                                    </td>
                                    <td style={s.td}>{c.legacy ? '—' : fmtFecha(c.fecha_proximo_cobro)}</td>
                                    <td style={s.td}>
                                        {c.ultimo_pago_manual ? (
                                            <span style={{ color: c.pago_manual_mes_actual ? '#16a34a' : '#475569', fontWeight: c.pago_manual_mes_actual ? 700 : 400 }}>
                                                {MESES[c.ultimo_pago_manual.mes - 1]} {c.ultimo_pago_manual.anio}
                                                {c.ultimo_pago_manual.monto ? ` — ${fmt(c.ultimo_pago_manual.monto)}` : ''}
                                            </span>
                                        ) : '—'}
                                    </td>
                                    <td style={s.td}>
                                        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                                            <button onClick={() => abrirMarcarPago(c)} style={s.btnGreen}>Marcar pago</button>
                                            <button onClick={() => abrirHistorial(c)} style={s.btnBlue}>Historial</button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Modal: marcar pago manual */}
            {tiendaPago && (
                <div style={s.overlay} onClick={() => setTiendaPago(null)}>
                    <div style={s.modal} onClick={(e) => e.stopPropagation()}>
                        <h3 style={s.modalTitulo}>Marcar pago — {tiendaPago.nombre}</h3>
                        <div style={s.formRow}>
                            <div style={{ flex: 1 }}>
                                <label style={s.label}>Mes</label>
                                <select value={pagoMes} onChange={(e) => setPagoMes(e.target.value)} style={s.input}>
                                    {MESES.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
                                </select>
                            </div>
                            <div style={{ flex: 1 }}>
                                <label style={s.label}>Año</label>
                                <select value={pagoAnio} onChange={(e) => setPagoAnio(e.target.value)} style={s.input}>
                                    {aniosDisponibles.map(a => <option key={a} value={a}>{a}</option>)}
                                </select>
                            </div>
                        </div>
                        <label style={s.label}>Monto (opcional)</label>
                        <input type="number" min="0" step="0.01" value={pagoMonto} onChange={(e) => setPagoMonto(e.target.value)} style={s.input} placeholder="$0.00" />
                        <label style={s.label}>Nota (opcional)</label>
                        <input type="text" value={pagoNota} onChange={(e) => setPagoNota(e.target.value)} style={s.input} placeholder="Ej: Transferencia, efectivo..." />
                        <p style={s.hint}>Si ya hay un pago cargado para {MESES[pagoMes - 1]} {pagoAnio}, se actualiza en vez de duplicarse.</p>
                        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 16 }}>
                            <button onClick={() => setTiendaPago(null)} style={s.btnMuted}>Cancelar</button>
                            <button onClick={confirmarPago} disabled={guardandoPago} style={s.btnGreen}>
                                {guardandoPago ? 'Guardando...' : 'Registrar pago'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal: historial de pagos manuales */}
            {tiendaHistorial && (
                <div style={s.overlay} onClick={() => setTiendaHistorial(null)}>
                    <div style={{ ...s.modal, maxWidth: 520 }} onClick={(e) => e.stopPropagation()}>
                        <h3 style={s.modalTitulo}>Historial de pagos — {tiendaHistorial.nombre}</h3>
                        {loadingHistorial ? (
                            <p style={s.mensaje}>Cargando...</p>
                        ) : historial.length === 0 ? (
                            <p style={s.mensaje}>Sin pagos manuales registrados.</p>
                        ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                                {historial.map(p => (
                                    <div key={p.id} style={s.historialRow}>
                                        <div>
                                            <strong>{MESES[p.mes - 1]} {p.anio}</strong>
                                            {p.monto && <span style={{ marginLeft: 8 }}>{fmt(p.monto)}</span>}
                                            {p.nota && <div style={s.hint}>{p.nota}</div>}
                                            <div style={s.hint}>Cargado el {fmtFecha(p.fecha_pago)}{p.registrado_por ? ` por ${p.registrado_por}` : ''}</div>
                                        </div>
                                        <button onClick={() => eliminarPago(p.id)} style={s.btnRojoChico}>✕</button>
                                    </div>
                                ))}
                            </div>
                        )}
                        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 16 }}>
                            <button onClick={() => setTiendaHistorial(null)} style={s.btnMuted}>Cerrar</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

const s = {
    page: { padding: '24px 20px', maxWidth: 1100, margin: '0 auto', fontFamily: "'Inter', 'Segoe UI', system-ui, sans-serif" },
    titulo: { fontSize: 22, fontWeight: 700, color: '#1a2926', margin: '0 0 4px' },
    subtitulo: { fontSize: 13, color: '#94a3b8', margin: '0 0 18px' },
    buscador: {
        width: '100%', maxWidth: 360, padding: '9px 12px', marginBottom: 18,
        border: '1.5px solid #e2e8f0', borderRadius: 10, fontSize: 14, color: '#1a2926',
        backgroundColor: '#f8fafc', boxSizing: 'border-box',
    },
    mensaje: { color: '#94a3b8', textAlign: 'center', padding: 30 },
    tableWrap: {
        overflowX: 'auto', backgroundColor: '#fff', borderRadius: 16,
        border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,.07)',
    },
    table: { width: '100%', borderCollapse: 'collapse', fontSize: 13 },
    th: {
        textAlign: 'left', padding: '10px 14px', background: '#f1f5f9',
        borderBottom: '2px solid #e2e8f0', fontWeight: 700, fontSize: 11,
        color: '#475569', textTransform: 'uppercase', letterSpacing: '0.04em', whiteSpace: 'nowrap',
    },
    tr: {},
    td: { padding: '11px 14px', borderBottom: '1px solid #e2e8f0', verticalAlign: 'top', color: '#1a2926' },
    hint: { fontSize: 11, color: '#94a3b8', marginTop: 2 },
    btnGreen: {
        padding: '6px 14px', borderRadius: 8, border: 'none', cursor: 'pointer',
        background: '#5dc87a', color: '#fff', fontWeight: 700, fontSize: 12, whiteSpace: 'nowrap',
    },
    btnBlue: {
        padding: '6px 14px', borderRadius: 8, border: 'none', cursor: 'pointer',
        background: '#3b9ede', color: '#fff', fontWeight: 700, fontSize: 12, whiteSpace: 'nowrap',
    },
    btnMuted: {
        padding: '9px 18px', borderRadius: 10, border: 'none', cursor: 'pointer',
        background: '#e2e8f0', color: '#475569', fontWeight: 700, fontSize: 13,
    },
    btnRojoChico: {
        background: 'none', border: 'none', color: '#e25252', cursor: 'pointer',
        fontSize: 16, lineHeight: 1, padding: 4,
    },
    overlay: {
        position: 'fixed', inset: 0, background: 'rgba(15,25,22,0.55)', backdropFilter: 'blur(2px)',
        zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20,
    },
    modal: {
        backgroundColor: '#fff', borderRadius: 16, border: '1px solid #e2e8f0',
        boxShadow: '0 10px 30px rgba(0,0,0,.10)', width: '100%', maxWidth: 420,
        padding: '24px 28px', maxHeight: '90vh', overflowY: 'auto',
    },
    modalTitulo: { margin: '0 0 16px', color: '#1a2926', fontSize: '1.05rem', fontWeight: 700 },
    formRow: { display: 'flex', gap: 10, marginBottom: 4 },
    label: {
        display: 'block', marginTop: 12, marginBottom: 5, fontWeight: 600, color: '#475569',
        fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '0.05em',
    },
    input: {
        width: '100%', padding: '9px 12px', border: '1.5px solid #e2e8f0', borderRadius: 10,
        fontSize: 14, color: '#1a2926', backgroundColor: '#f8fafc', boxSizing: 'border-box',
    },
    historialRow: {
        display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
        padding: '10px 12px', border: '1px solid #e2e8f0', borderRadius: 10, fontSize: 13,
    },
};
