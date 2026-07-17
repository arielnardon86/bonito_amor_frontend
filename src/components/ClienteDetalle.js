// ClienteDetalle.js
import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../AuthContext';
import Swal from 'sweetalert2';
import { formatearMonto } from '../utils/formatearMonto';

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
    const { token, selectedStoreSlug } = useAuth();

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
        <div>
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
                    <p style={{ margin: 0 }}>{valor || '—'}</p>
                    <button onClick={() => empezarEdicion(campo, valor)} style={styles.pencilButton} title={`Editar ${label}`}>✏️</button>
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
            </div>

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
                                {historial.ventas.map(v => (
                                    <tr key={v.id} style={styles.tableRow}>
                                        <td style={styles.td}>{new Date(v.fecha_venta).toLocaleString()}</td>
                                        <td style={styles.td}>{v.metodo_pago}</td>
                                        <td style={styles.td}>{formatearMonto(v.total)}</td>
                                        <td style={styles.td}>
                                            <button onClick={() => navigate('/recibo', { state: { venta: v } })} style={styles.smallButton}>
                                                Ver recibo
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            <div style={styles.section}>
                <h2 style={styles.sectionHeader}>Movimientos de cuenta corriente</h2>
                {historial.movimientos.length === 0 ? (
                    <p style={styles.noDataMessage}>Sin movimientos.</p>
                ) : (
                    <div style={styles.tableResponsive}>
                        <table style={styles.table}>
                            <thead>
                                <tr style={styles.tableHeaderRow}>
                                    <th style={styles.th}>Fecha</th>
                                    <th style={styles.th}>Tipo</th>
                                    <th style={styles.th}>Concepto</th>
                                    <th style={styles.th}>Monto</th>
                                    <th style={styles.th}></th>
                                </tr>
                            </thead>
                            <tbody>
                                {historial.movimientos.map(m => (
                                    <tr key={m.id} style={styles.tableRow}>
                                        <td style={styles.td}>{new Date(m.fecha).toLocaleString()}</td>
                                        <td style={{ ...styles.td, color: m.tipo === 'DEBITO' ? '#e25252' : '#1a6a40', fontWeight: 600 }}>
                                            {m.tipo_display}
                                        </td>
                                        <td style={styles.td}>{m.concepto}</td>
                                        <td style={styles.td}>{formatearMonto(m.monto)}</td>
                                        <td style={styles.td}>
                                            {/* Los débitos son la venta en sí (ya tiene su recibo en Consumos);
                                                acá solo se reimprime el comprobante de los cobros. */}
                                            {m.tipo === 'CREDITO' && (
                                                <button
                                                    onClick={() => navigate('/recibo-cobro', {
                                                        state: { movimiento: m, cliente, tienda_nombre: selectedStoreSlug },
                                                    })}
                                                    style={styles.smallButton}
                                                >
                                                    Ver recibo
                                                </button>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
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
    infoGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 16 },
    infoLabel: { fontSize: 12, color: '#94a3b8', textTransform: 'uppercase', fontWeight: 700, letterSpacing: 0.4 },
    pencilButton: { background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, color: '#94a3b8', padding: 2, lineHeight: 1 },
    iconButtonGreen: { background: '#5dc87a', color: 'white', border: 'none', borderRadius: 6, cursor: 'pointer', width: 28, height: 28, fontWeight: 700 },
    iconButtonGray: { background: '#e2e8f0', color: '#475569', border: 'none', borderRadius: 6, cursor: 'pointer', width: 28, height: 28, fontWeight: 700 },
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
