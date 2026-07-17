// Clientes.js
import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
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

const FORM_INICIAL = { nombre_razon_social: '', cuit_cuil: '', direccion: '', telefono: '', email: '' };

const Clientes = () => {
    const { token, selectedStoreSlug } = useAuth();
    const navigate = useNavigate();

    const [clientes, setClientes] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [nextPageUrl, setNextPageUrl] = useState(null);
    const [prevPageUrl, setPrevPageUrl] = useState(null);

    const [busqueda, setBusqueda] = useState('');
    const [busquedaAplicada, setBusquedaAplicada] = useState('');

    // Alta de cliente nuevo (la edición se hace desde la página del cliente)
    const [mostrarNuevoCliente, setMostrarNuevoCliente] = useState(false);
    const [formData, setFormData] = useState(FORM_INICIAL);
    const [guardando, setGuardando] = useState(false);

    const fetchClientes = useCallback(async (pageUrl = null) => {
        if (!token || !selectedStoreSlug) return;
        setLoading(true);
        setError(null);
        try {
            const headers = { 'Authorization': `Bearer ${token}` };
            const response = pageUrl
                ? await axios.get(pageUrl, { headers })
                : await axios.get(`${BASE_API_ENDPOINT}/api/clientes/`, {
                    headers,
                    params: { tienda_slug: selectedStoreSlug, search: busquedaAplicada || undefined },
                });
            setClientes(response.data.results ?? response.data ?? []);
            setNextPageUrl(response.data.next || null);
            setPrevPageUrl(response.data.previous || null);
        } catch (err) {
            setError('Error al cargar clientes: ' + (err.response ? JSON.stringify(err.response.data) : err.message));
        } finally {
            setLoading(false);
        }
    }, [token, selectedStoreSlug, busquedaAplicada]);

    useEffect(() => { fetchClientes(); }, [fetchClientes]);

    // ── Alta de cliente ─────────────────────────────────────────────────────
    const abrirNuevoCliente = () => {
        setFormData(FORM_INICIAL);
        setMostrarNuevoCliente(true);
    };

    const guardarCliente = async () => {
        if (!formData.nombre_razon_social.trim() || !formData.cuit_cuil.trim()) {
            Swal.fire('Error', 'Nombre/Razón Social y CUIT-CUIL son obligatorios.', 'error');
            return;
        }
        setGuardando(true);
        try {
            await axios.post(`${BASE_API_ENDPOINT}/api/clientes/`, { ...formData, tienda_slug: selectedStoreSlug }, {
                headers: { 'Authorization': `Bearer ${token}` },
            });
            setMostrarNuevoCliente(false);
            fetchClientes();
            Swal.fire('¡Listo!', 'Cliente creado correctamente.', 'success');
        } catch (err) {
            const data = err.response?.data;
            const msg = data ? Object.entries(data).map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(', ') : v}`).join(' — ') : err.message;
            Swal.fire('Error', msg, 'error');
        } finally {
            setGuardando(false);
        }
    };

    const desactivarCliente = (cliente) => {
        Swal.fire({
            title: '¿Desactivar cliente?',
            text: `${cliente.nombre_razon_social} no aparecerá más en las búsquedas, pero se conserva su historial.`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonText: 'Sí, desactivar',
            cancelButtonText: 'Cancelar',
            confirmButtonColor: '#e25252',
        }).then(async (result) => {
            if (!result.isConfirmed) return;
            try {
                await axios.delete(`${BASE_API_ENDPOINT}/api/clientes/${cliente.id}/`, {
                    headers: { 'Authorization': `Bearer ${token}` },
                });
                fetchClientes();
            } catch (err) {
                Swal.fire('Error', 'No se pudo desactivar el cliente.', 'error');
            }
        });
    };

    return (
        <div style={styles.container}>
            <h1 style={styles.pageTitle}>Clientes</h1>

            <div style={styles.section}>
                <div style={styles.inputGroup}>
                    <input
                        type="text"
                        placeholder="Buscar por nombre o CUIT/CUIL..."
                        value={busqueda}
                        onChange={(e) => setBusqueda(e.target.value)}
                        onKeyPress={(e) => { if (e.key === 'Enter') setBusquedaAplicada(busqueda); }}
                        style={styles.inputField}
                    />
                    <button onClick={() => setBusquedaAplicada(busqueda)} style={styles.secondaryButton}>Buscar</button>
                    <button onClick={abrirNuevoCliente} style={styles.primaryButton}>+ Nuevo Cliente</button>
                </div>

                {error && <div style={styles.errorMessage}>{error}</div>}
                {loading ? (
                    <p style={styles.noDataMessage}>Cargando clientes...</p>
                ) : clientes.length === 0 ? (
                    <p style={styles.noDataMessage}>No hay clientes para mostrar.</p>
                ) : (
                    <div style={styles.tableResponsive}>
                        <table style={styles.table}>
                            <thead>
                                <tr style={styles.tableHeaderRow}>
                                    <th style={styles.th}>Nombre / Razón Social</th>
                                    <th style={styles.th}>CUIT-CUIL</th>
                                    <th style={styles.th}>Teléfono</th>
                                    <th style={styles.th}>Saldo pendiente</th>
                                    <th style={styles.th}>Acciones</th>
                                </tr>
                            </thead>
                            <tbody>
                                {clientes.map((cliente) => {
                                    const saldo = parseFloat(cliente.saldo_pendiente || 0);
                                    return (
                                        <tr key={cliente.id} style={styles.tableRow}>
                                            <td style={styles.td}>{cliente.nombre_razon_social}</td>
                                            <td style={styles.td}>{cliente.cuit_cuil}</td>
                                            <td style={styles.td}>{cliente.telefono || '—'}</td>
                                            <td style={{ ...styles.td, fontWeight: 700, color: saldo > 0 ? '#e25252' : '#1a6a40' }}>
                                                {formatearMonto(saldo)}
                                            </td>
                                            <td style={styles.td}>
                                                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                                                    <button onClick={() => navigate(`/clientes/${cliente.id}`)} style={styles.smallButtonGreen}>Ver</button>
                                                    <button onClick={() => desactivarCliente(cliente)} style={styles.smallButtonRed}>Desactivar</button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}

                {(nextPageUrl || prevPageUrl) && (
                    <div style={{ display: 'flex', gap: 10, marginTop: 15, justifyContent: 'center' }}>
                        <button onClick={() => fetchClientes(prevPageUrl)} disabled={!prevPageUrl} style={styles.secondaryButton}>Anterior</button>
                        <button onClick={() => fetchClientes(nextPageUrl)} disabled={!nextPageUrl} style={styles.secondaryButton}>Siguiente</button>
                    </div>
                )}
            </div>

            {/* Modal alta de cliente */}
            {mostrarNuevoCliente && (
                <div style={styles.modalOverlay}>
                    <div style={styles.modalContent}>
                        <h2 style={styles.sectionHeader}>Nuevo Cliente</h2>
                        <div style={styles.formGrid}>
                            <label style={styles.formLabel}>Nombre y Apellido o Razón Social *
                                <input style={styles.inputField} value={formData.nombre_razon_social}
                                    onChange={(e) => setFormData({ ...formData, nombre_razon_social: e.target.value })} />
                            </label>
                            <label style={styles.formLabel}>CUIT-CUIL *
                                <input style={styles.inputField} value={formData.cuit_cuil}
                                    onChange={(e) => setFormData({ ...formData, cuit_cuil: e.target.value })} />
                            </label>
                            <label style={styles.formLabel}>Dirección
                                <input style={styles.inputField} value={formData.direccion}
                                    onChange={(e) => setFormData({ ...formData, direccion: e.target.value })} />
                            </label>
                            <label style={styles.formLabel}>Teléfono
                                <input style={styles.inputField} value={formData.telefono}
                                    onChange={(e) => setFormData({ ...formData, telefono: e.target.value })} />
                            </label>
                            <label style={styles.formLabel}>Mail
                                <input type="email" style={styles.inputField} value={formData.email}
                                    onChange={(e) => setFormData({ ...formData, email: e.target.value })} />
                            </label>
                        </div>
                        <div style={{ display: 'flex', gap: 10, marginTop: 20, justifyContent: 'flex-end' }}>
                            <button onClick={() => setMostrarNuevoCliente(false)} style={styles.modalCancelButton}>Cancelar</button>
                            <button onClick={guardarCliente} disabled={guardando} style={styles.primaryButton}>
                                {guardando ? 'Guardando...' : 'Guardar'}
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
    pageTitle: { color: '#1a2926', fontSize: '1.5rem', fontWeight: 600, marginBottom: '0.5rem' },
    section: { marginBottom: '30px', padding: '20px', backgroundColor: '#f1f5f9', borderRadius: '10px' },
    sectionHeader: { color: '#475569', fontSize: '1.1rem', borderBottom: '1px solid #e2e8f0', paddingBottom: '8px', marginTop: '1rem', marginBottom: '0.5rem' },
    errorMessage: { color: '#e25252', padding: '10px', backgroundColor: '#fef2f2', border: '1px solid #fca5a5', borderRadius: '6px', marginBottom: 15 },
    noDataMessage: { textAlign: 'center', fontStyle: 'italic', color: '#94a3b8' },
    inputGroup: { display: 'flex', gap: '10px', marginBottom: '20px', alignItems: 'center', flexWrap: 'wrap' },
    inputField: { padding: '8px', border: '1px solid #e2e8f0', borderRadius: '10px', boxSizing: 'border-box', flex: 1, width: '100%', marginTop: 4 },
    primaryButton: { padding: '10px 15px', backgroundColor: '#5dc87a', color: 'white', border: 'none', borderRadius: '10px', cursor: 'pointer' },
    secondaryButton: { padding: '10px 15px', backgroundColor: '#94a3b8', color: 'white', border: 'none', borderRadius: '10px', cursor: 'pointer' },
    smallButtonGreen: { fontSize: 13, padding: '6px 10px', borderRadius: 6, border: 'none', background: '#5dc87a', color: 'white', cursor: 'pointer', fontWeight: 600 },
    smallButtonRed: { fontSize: 13, padding: '6px 10px', borderRadius: 6, border: 'none', background: '#e25252', color: 'white', cursor: 'pointer', fontWeight: 600 },
    tableResponsive: { overflowX: 'auto', WebkitOverflowScrolling: 'touch' },
    table: { width: '100%', borderCollapse: 'collapse', marginTop: '15px' },
    tableHeaderRow: { backgroundColor: '#f1f5f9' },
    th: { padding: '10px', borderBottom: '2px solid #e2e8f0', textAlign: 'left' },
    tableRow: { '&:nth-child(even)': { backgroundColor: '#f1f5f9' } },
    td: { padding: '10px', borderBottom: '1px solid #e2e8f0', verticalAlign: 'middle' },
    modalOverlay: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000, padding: 20 },
    modalContent: { backgroundColor: 'white', padding: '24px', borderRadius: '10px', width: '90%', maxWidth: '480px', boxShadow: '0 10px 30px rgba(0,0,0,0.10)', maxHeight: '90vh', overflowY: 'auto' },
    modalCancelButton: { padding: '10px 15px', backgroundColor: '#e2e8f0', color: '#475569', border: 'none', borderRadius: '10px', cursor: 'pointer' },
    formGrid: { display: 'flex', flexDirection: 'column', gap: 12, marginTop: 10 },
    formLabel: { display: 'flex', flexDirection: 'column', fontSize: 13, fontWeight: 600, color: '#475569', marginBottom: 10 },
};

export default Clientes;
