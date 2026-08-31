// Proveedores.js
import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { useAuth } from '../AuthContext';
import Swal from 'sweetalert2';

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

const FORM_INICIAL = { nombre_razon_social: '', cuit: '', direccion: '', telefono: '', email: '' };

const Proveedores = () => {
    const { token, selectedStoreSlug } = useAuth();

    const [proveedores, setProveedores] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [nextPageUrl, setNextPageUrl] = useState(null);
    const [prevPageUrl, setPrevPageUrl] = useState(null);

    const [busqueda, setBusqueda] = useState('');
    const [busquedaAplicada, setBusquedaAplicada] = useState('');

    // Alta / edición de proveedor
    const [mostrarForm, setMostrarForm] = useState(false);
    const [editandoId, setEditandoId] = useState(null);
    const [formData, setFormData] = useState(FORM_INICIAL);
    const [guardando, setGuardando] = useState(false);

    // Buscador de productos por proveedor
    const [busquedaProducto, setBusquedaProducto] = useState('');
    const [productosEncontrados, setProductosEncontrados] = useState(null); // null = sin buscar todavía
    const [buscandoProducto, setBuscandoProducto] = useState(false);

    const fetchProveedores = useCallback(async (pageUrl = null) => {
        if (!token || !selectedStoreSlug) return;
        setLoading(true);
        setError(null);
        try {
            const headers = { 'Authorization': `Bearer ${token}` };
            const response = pageUrl
                ? await axios.get(pageUrl, { headers })
                : await axios.get(`${BASE_API_ENDPOINT}/api/proveedores/`, {
                    headers,
                    params: { tienda_slug: selectedStoreSlug, search: busquedaAplicada || undefined },
                });
            setProveedores(response.data.results ?? response.data ?? []);
            setNextPageUrl(response.data.next || null);
            setPrevPageUrl(response.data.previous || null);
        } catch (err) {
            setError('Error al cargar proveedores: ' + (err.response ? JSON.stringify(err.response.data) : err.message));
        } finally {
            setLoading(false);
        }
    }, [token, selectedStoreSlug, busquedaAplicada]);

    useEffect(() => { fetchProveedores(); }, [fetchProveedores]);

    // ── Alta / edición de proveedor ──────────────────────────────────────────
    const abrirNuevoProveedor = () => {
        setEditandoId(null);
        setFormData(FORM_INICIAL);
        setMostrarForm(true);
    };

    const abrirEditarProveedor = (proveedor) => {
        setEditandoId(proveedor.id);
        setFormData({
            nombre_razon_social: proveedor.nombre_razon_social || '',
            cuit: proveedor.cuit || '',
            direccion: proveedor.direccion || '',
            telefono: proveedor.telefono || '',
            email: proveedor.email || '',
        });
        setMostrarForm(true);
    };

    const guardarProveedor = async () => {
        if (!formData.nombre_razon_social.trim()) {
            Swal.fire('Error', 'El nombre/razón social es obligatorio.', 'error');
            return;
        }
        setGuardando(true);
        try {
            const headers = { 'Authorization': `Bearer ${token}` };
            const body = { ...formData, tienda_slug: selectedStoreSlug };
            if (editandoId) {
                await axios.patch(`${BASE_API_ENDPOINT}/api/proveedores/${editandoId}/`, body, { headers });
            } else {
                await axios.post(`${BASE_API_ENDPOINT}/api/proveedores/`, body, { headers });
            }
            setMostrarForm(false);
            fetchProveedores();
            Swal.fire('¡Listo!', `Proveedor ${editandoId ? 'actualizado' : 'creado'} correctamente.`, 'success');
        } catch (err) {
            const data = err.response?.data;
            const msg = data ? Object.entries(data).map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(', ') : v}`).join(' — ') : err.message;
            Swal.fire('Error', msg, 'error');
        } finally {
            setGuardando(false);
        }
    };

    const desactivarProveedor = (proveedor) => {
        Swal.fire({
            title: '¿Desactivar proveedor?',
            text: `${proveedor.nombre_razon_social} no aparecerá más en las búsquedas ni en el desplegable de productos.`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonText: 'Sí, desactivar',
            cancelButtonText: 'Cancelar',
            confirmButtonColor: '#e25252',
        }).then(async (result) => {
            if (!result.isConfirmed) return;
            try {
                await axios.delete(`${BASE_API_ENDPOINT}/api/proveedores/${proveedor.id}/`, {
                    headers: { 'Authorization': `Bearer ${token}` },
                });
                fetchProveedores();
            } catch (err) {
                Swal.fire('Error', 'No se pudo desactivar el proveedor.', 'error');
            }
        });
    };

    // ── Buscador de productos por proveedor ──────────────────────────────────
    const buscarProductoPorProveedor = async () => {
        if (!busquedaProducto.trim() || !token || !selectedStoreSlug) return;
        setBuscandoProducto(true);
        try {
            const response = await axios.get(`${BASE_API_ENDPOINT}/api/productos/`, {
                headers: { 'Authorization': `Bearer ${token}` },
                params: { tienda_slug: selectedStoreSlug, search: busquedaProducto.trim() },
            });
            setProductosEncontrados(response.data.results ?? response.data ?? []);
        } catch (err) {
            Swal.fire('Error', 'No se pudo buscar el producto.', 'error');
            setProductosEncontrados([]);
        } finally {
            setBuscandoProducto(false);
        }
    };

    return (
        <div style={styles.container}>
            <h1 style={styles.pageTitle}>Proveedores</h1>

            {/* ── Buscar a qué proveedor corresponde un producto ─────────────── */}
            <div style={styles.section}>
                <h2 style={styles.sectionHeader}>Buscar proveedor de un producto</h2>
                <p style={styles.helpText}>Escaneá el código de barras o buscá por nombre para ver a qué proveedor corresponde.</p>
                <div style={styles.inputGroup}>
                    <input
                        type="text"
                        placeholder="Nombre, código de barras o código interno..."
                        value={busquedaProducto}
                        onChange={(e) => setBusquedaProducto(e.target.value)}
                        onKeyPress={(e) => { if (e.key === 'Enter') buscarProductoPorProveedor(); }}
                        style={styles.inputField}
                        autoFocus
                    />
                    <button onClick={buscarProductoPorProveedor} disabled={buscandoProducto} style={styles.primaryButton}>
                        {buscandoProducto ? 'Buscando...' : 'Buscar'}
                    </button>
                </div>

                {productosEncontrados !== null && (
                    productosEncontrados.length === 0 ? (
                        <p style={styles.noDataMessage}>No se encontró ningún producto con esa búsqueda.</p>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 10 }}>
                            {productosEncontrados.map((producto) => {
                                const proveedor = producto.proveedor_detalle;
                                return (
                                    <div key={producto.id} style={styles.resultCard}>
                                        <div style={{ fontWeight: 700, color: '#1a2926' }}>
                                            {producto.nombre} {producto.codigo_interno ? `(${producto.codigo_interno})` : ''}
                                        </div>
                                        {proveedor ? (
                                            <div style={{ marginTop: 6, fontSize: 13, color: '#475569' }}>
                                                <div><strong>Proveedor:</strong> {proveedor.nombre_razon_social}</div>
                                                {proveedor.cuit && <div><strong>CUIT:</strong> {proveedor.cuit}</div>}
                                                {proveedor.telefono && <div><strong>Teléfono:</strong> {proveedor.telefono}</div>}
                                                {proveedor.email && <div><strong>Mail:</strong> {proveedor.email}</div>}
                                            </div>
                                        ) : (
                                            <p style={{ marginTop: 6, fontSize: 13, color: '#94a3b8', fontStyle: 'italic' }}>
                                                Este producto no tiene proveedor asignado.
                                            </p>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    )
                )}
            </div>

            {/* ── Listado de proveedores ──────────────────────────────────────── */}
            <div style={styles.section}>
                <h2 style={styles.sectionHeader}>Proveedores registrados</h2>
                <div style={styles.inputGroup}>
                    <input
                        type="text"
                        placeholder="Buscar por nombre o CUIT..."
                        value={busqueda}
                        onChange={(e) => setBusqueda(e.target.value)}
                        onKeyPress={(e) => { if (e.key === 'Enter') setBusquedaAplicada(busqueda); }}
                        style={styles.inputField}
                    />
                    <button onClick={() => setBusquedaAplicada(busqueda)} style={styles.secondaryButton}>Buscar</button>
                    <button onClick={abrirNuevoProveedor} style={styles.primaryButton}>+ Nuevo Proveedor</button>
                </div>

                {error && <div style={styles.errorMessage}>{error}</div>}
                {loading ? (
                    <p style={styles.noDataMessage}>Cargando proveedores...</p>
                ) : proveedores.length === 0 ? (
                    <p style={styles.noDataMessage}>No hay proveedores para mostrar.</p>
                ) : (
                    <div style={styles.tableResponsive}>
                        <table style={styles.table}>
                            <thead>
                                <tr style={styles.tableHeaderRow}>
                                    <th style={styles.th}>Nombre / Razón Social</th>
                                    <th style={styles.th}>CUIT</th>
                                    <th style={styles.th}>Teléfono</th>
                                    <th style={styles.th}>Mail</th>
                                    <th style={styles.th}>Acciones</th>
                                </tr>
                            </thead>
                            <tbody>
                                {proveedores.map((proveedor) => (
                                    <tr key={proveedor.id} style={styles.tableRow}>
                                        <td style={styles.td}>{proveedor.nombre_razon_social}</td>
                                        <td style={styles.td}>{proveedor.cuit || '—'}</td>
                                        <td style={styles.td}>{proveedor.telefono || '—'}</td>
                                        <td style={styles.td}>{proveedor.email || '—'}</td>
                                        <td style={styles.td}>
                                            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                                                <button onClick={() => abrirEditarProveedor(proveedor)} style={styles.smallButtonGreen}>Editar</button>
                                                <button onClick={() => desactivarProveedor(proveedor)} style={styles.smallButtonRed}>Desactivar</button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}

                {(nextPageUrl || prevPageUrl) && (
                    <div style={{ display: 'flex', gap: 10, marginTop: 15, justifyContent: 'center' }}>
                        <button onClick={() => fetchProveedores(prevPageUrl)} disabled={!prevPageUrl} style={styles.secondaryButton}>Anterior</button>
                        <button onClick={() => fetchProveedores(nextPageUrl)} disabled={!nextPageUrl} style={styles.secondaryButton}>Siguiente</button>
                    </div>
                )}
            </div>

            {/* Modal alta/edición de proveedor */}
            {mostrarForm && (
                <div style={styles.modalOverlay}>
                    <div style={styles.modalContent}>
                        <h2 style={styles.sectionHeader}>{editandoId ? 'Editar Proveedor' : 'Nuevo Proveedor'}</h2>
                        <div style={styles.formGrid}>
                            <label style={styles.formLabel}>Nombre y Apellido o Razón Social *
                                <input style={styles.inputField} value={formData.nombre_razon_social}
                                    onChange={(e) => setFormData({ ...formData, nombre_razon_social: e.target.value })} />
                            </label>
                            <label style={styles.formLabel}>CUIT
                                <input style={styles.inputField} value={formData.cuit}
                                    onChange={(e) => setFormData({ ...formData, cuit: e.target.value })} />
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
                            <button onClick={() => setMostrarForm(false)} style={styles.modalCancelButton}>Cancelar</button>
                            <button onClick={guardarProveedor} disabled={guardando} style={styles.primaryButton}>
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
    sectionHeader: { color: '#475569', fontSize: '1.1rem', borderBottom: '1px solid #e2e8f0', paddingBottom: '8px', marginTop: 0, marginBottom: '0.5rem' },
    helpText: { color: '#94a3b8', fontSize: 13, marginBottom: 12, marginTop: 0 },
    errorMessage: { color: '#e25252', padding: '10px', backgroundColor: '#fef2f2', border: '1px solid #fca5a5', borderRadius: '6px', marginBottom: 15 },
    noDataMessage: { textAlign: 'center', fontStyle: 'italic', color: '#94a3b8' },
    inputGroup: { display: 'flex', gap: '10px', marginBottom: '20px', alignItems: 'center', flexWrap: 'wrap' },
    inputField: { padding: '8px', border: '1px solid #e2e8f0', borderRadius: '10px', boxSizing: 'border-box', flex: 1, width: '100%', marginTop: 4 },
    primaryButton: { padding: '10px 15px', backgroundColor: '#5dc87a', color: 'white', border: 'none', borderRadius: '10px', cursor: 'pointer' },
    secondaryButton: { padding: '10px 15px', backgroundColor: '#94a3b8', color: 'white', border: 'none', borderRadius: '10px', cursor: 'pointer' },
    smallButtonGreen: { fontSize: 13, padding: '6px 10px', borderRadius: 6, border: 'none', background: '#5dc87a', color: 'white', cursor: 'pointer', fontWeight: 600 },
    smallButtonRed: { fontSize: 13, padding: '6px 10px', borderRadius: 6, border: 'none', background: '#e25252', color: 'white', cursor: 'pointer', fontWeight: 600 },
    resultCard: { background: '#fff', border: '1px solid #e2e8f0', borderRadius: 10, padding: '12px 16px' },
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

export default Proveedores;
