import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../AuthContext';
import axios from 'axios';
import ImportarProductosSeleccionadosML from './ImportarProductosSeleccionadosML';

const normalizeApiUrl = (url) => {
    if (!url) return 'http://localhost:8000';
    let u = url;
    if (u.endsWith('/api/') || u.endsWith('/api')) u = u.replace(/\/api\/?$/, '');
    if (u.endsWith('/')) u = u.slice(0, -1);
    return u;
};

const BASE = normalizeApiUrl(process.env.REACT_APP_API_URL || 'http://localhost:8000');

export default function IntegracionMercadoLibrePanel() {
    const { token, isAuthenticated, selectedStoreSlug, stores } = useAuth();

    const [tiendaId,      setTiendaId]      = useState(null);
    const [tienda,        setTienda]        = useState(null);
    const [mlStatus,      setMlStatus]      = useState(null);
    const [loading,       setLoading]       = useState(true);
    const [guardando,     setGuardando]     = useState(false);
    const [conectando,    setConectando]    = useState(false);
    const [sincronizando, setSincronizando] = useState(false);
    const [desconectando, setDesconectando] = useState(false);
    const [error,         setError]         = useState(null);
    const [successMsg,    setSuccessMsg]    = useState('');
    const [mostrarImport, setMostrarImport] = useState(false);

    // Campos de configuración
    const [appId,       setAppId]       = useState('');
    const [clientSecret,setClientSecret]= useState('');
    const [facturar,    setFacturar]    = useState(true);

    const headers = { Authorization: `Bearer ${token}` };

    const showSuccess = (msg) => { setSuccessMsg(msg); setTimeout(() => setSuccessMsg(''), 5000); };
    const showError   = (msg) => { setError(msg);      setTimeout(() => setError(null),    6000); };

    // ── Obtener ID de tienda ──────────────────────────────────────────────────
    const obtenerTiendaId = useCallback(async () => {
        if (!selectedStoreSlug || !token) return null;
        if (Array.isArray(stores) && stores.length > 0) {
            const found = stores.find(s => s.nombre === selectedStoreSlug);
            if (found?.id) return found.id;
        }
        try {
            const res = await axios.get(`${BASE}/api/tiendas/`, { headers });
            const lista = res.data.results || res.data;
            const found = Array.isArray(lista) && lista.find(t => t.nombre === selectedStoreSlug);
            return found?.id || null;
        } catch { return null; }
    }, [selectedStoreSlug, token, stores]); // eslint-disable-line react-hooks/exhaustive-deps

    // ── Fetch ─────────────────────────────────────────────────────────────────
    const fetchTienda = useCallback(async (id) => {
        try {
            const res = await axios.get(`${BASE}/api/tiendas/${id}/`, { headers });
            setTienda(res.data);
            setAppId(res.data.ml_app_id || '');
            setFacturar(res.data.ml_facturar_ventas !== false);
        } catch { /* ignore */ }
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    const fetchStatus = useCallback(async (id) => {
        try {
            const res = await axios.get(`${BASE}/api/tiendas/${id}/mercadolibre/status/`, { headers });
            setMlStatus(res.data);
        } catch {
            setMlStatus({ authenticated: false, connected: false });
        }
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    useEffect(() => {
        if (!isAuthenticated || !token) { setLoading(false); return; }
        obtenerTiendaId().then(id => {
            setTiendaId(id);
            if (id) Promise.all([fetchTienda(id), fetchStatus(id)]).finally(() => setLoading(false));
            else setLoading(false);
        });
    }, [isAuthenticated, token, selectedStoreSlug]); // eslint-disable-line react-hooks/exhaustive-deps

    // ── Guardar credenciales ──────────────────────────────────────────────────
    const handleGuardar = async () => {
        if (!tiendaId) return;
        if (!appId.trim()) { showError('El App ID es obligatorio.'); return; }
        setGuardando(true);
        try {
            const body = {
                ml_app_id:         appId.trim(),
                ml_facturar_ventas: facturar,
                plataforma_ecommerce: 'MERCADO_LIBRE',
            };
            if (clientSecret.trim()) body.ml_client_secret = clientSecret.trim();
            await axios.patch(`${BASE}/api/tiendas/${tiendaId}/`, body, { headers });
            setClientSecret('');
            await Promise.all([fetchTienda(tiendaId), fetchStatus(tiendaId)]);
            showSuccess('Configuración guardada.');
        } catch (e) {
            showError(e.response?.data?.error || 'Error al guardar la configuración.');
        } finally { setGuardando(false); }
    };

    // ── OAuth ─────────────────────────────────────────────────────────────────
    const handleConectar = async () => {
        if (!tiendaId) return;
        setConectando(true);
        setError(null);
        try {
            const res = await axios.get(`${BASE}/api/tiendas/${tiendaId}/mercadolibre/auth-url/`, { headers });
            const authUrl = res.data.auth_url;

            const messageHandler = async (event) => {
                if (event.data?.type === 'ML_OAUTH_SUCCESS') {
                    window.removeEventListener('message', messageHandler);
                    await Promise.all([fetchTienda(tiendaId), fetchStatus(tiendaId)]);
                    showSuccess('¡Mercado Libre conectado exitosamente!');
                    setConectando(false);
                }
            };
            window.addEventListener('message', messageHandler);

            const popup = window.open(authUrl, 'ml_oauth', 'width=600,height=700');
            const interval = setInterval(() => {
                if (popup?.closed) {
                    clearInterval(interval);
                    window.removeEventListener('message', messageHandler);
                    setConectando(false);
                }
            }, 800);
        } catch (e) {
            showError(e.response?.data?.error || 'Error al obtener la URL de autorización.');
            setConectando(false);
        }
    };

    // ── Desconectar ───────────────────────────────────────────────────────────
    const handleDesconectar = async () => {
        if (!tiendaId || !window.confirm('¿Desconectar Mercado Libre? Se borrarán los tokens.')) return;
        setDesconectando(true);
        try {
            await axios.post(`${BASE}/api/tiendas/${tiendaId}/mercadolibre/disconnect/`, {}, { headers });
            await Promise.all([fetchTienda(tiendaId), fetchStatus(tiendaId)]);
            showSuccess('Mercado Libre desconectado.');
        } catch (e) {
            showError(e.response?.data?.error || 'Error al desconectar.');
        } finally { setDesconectando(false); }
    };

    // ── Acciones de sync ──────────────────────────────────────────────────────
    const handleActualizarStock = async () => {
        setSincronizando(true);
        try {
            const res = await axios.post(
                `${BASE}/api/tiendas/${tiendaId}/mercadolibre/sync-stock/`, {}, { headers, timeout: 300000 }
            );
            const { success, errors } = res.data;
            showSuccess(`Stock actualizado: ${success} exitosos, ${errors} errores.`);
        } catch (e) {
            showError(e.response?.data?.error || 'Error al actualizar stock.');
        } finally { setSincronizando(false); }
    };

    const handleActualizarExistentes = async () => {
        setSincronizando(true);
        try {
            const res = await axios.post(
                `${BASE}/api/tiendas/${tiendaId}/mercadolibre/update-existing-products/`, {}, { headers, timeout: 120000 }
            );
            const { success, errors } = res.data;
            showSuccess(`Actualización completada: ${success} exitosos, ${errors} errores.`);
        } catch (e) {
            if (e.response?.data?.reconnect_required) {
                showError('Token vencido. Desconectá y volvé a conectar.');
                fetchStatus(tiendaId);
            } else {
                showError(e.response?.data?.error || 'Error al actualizar productos.');
            }
        } finally { setSincronizando(false); }
    };

    const handleImportarSeleccionados = async (mlItemIds) => {
        if (!mlItemIds?.length) return;
        setSincronizando(true);
        try {
            const res = await axios.post(
                `${BASE}/api/tiendas/${tiendaId}/mercadolibre/import-products/`,
                { ml_item_ids: mlItemIds },
                { headers, timeout: 300000 }
            );
            const { success, errors } = res.data;
            showSuccess(`Importación completada: ${success} productos, ${errors} errores.`);
            await fetchTienda(tiendaId);
        } catch (e) {
            if (e.response?.data?.reconnect_required) {
                showError('Token vencido. Desconectá y volvé a conectar.');
                fetchStatus(tiendaId);
            } else {
                showError(e.response?.data?.error || 'Error al importar productos.');
            }
        } finally {
            setSincronizando(false);
            setMostrarImport(false);
        }
    };

    const handleActualizarConfig = async (field, value) => {
        try {
            await axios.patch(`${BASE}/api/tiendas/${tiendaId}/`, { [field]: value }, { headers });
            await fetchTienda(tiendaId);
        } catch (e) {
            showError(e.response?.data?.error || 'Error al actualizar configuración.');
        }
    };

    // ── Render ────────────────────────────────────────────────────────────────
    if (loading) return <div style={s.centered}>Cargando…</div>;
    if (!tiendaId) return <div style={s.centered}>No se encontró la tienda.</div>;

    const conectado    = mlStatus?.authenticated === true || mlStatus?.connected === true;
    const tieneConfig  = mlStatus?.has_app_id && mlStatus?.has_client_secret;

    return (
        <div style={s.root}>
            {/* Header */}
            <div style={s.header}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ width: 32, height: 32, background: '#3483fa', borderRadius: 6,
                                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                                  color: '#fff', fontWeight: 800, fontSize: 14 }}>ML</div>
                    <div>
                        <div style={{ fontWeight: 700, fontSize: 17 }}>Mercado Libre</div>
                        <div style={{ fontSize: 13, color: '#6b7280' }}>
                            Registrá ventas de ML automáticamente y sincronizá stock
                        </div>
                    </div>
                </div>
                <span style={conectado ? s.badgeOk : s.badgeNo}>
                    {conectado ? '● Conectado' : '● Desconectado'}
                </span>
            </div>

            {/* Mensajes */}
            {error      && <div style={s.alertErr}>{error}</div>}
            {successMsg && <div style={s.alertOk}>{successMsg}</div>}

            {/* Paso 1 — Credenciales */}
            <div style={s.card}>
                <div style={s.cardTitle}>Paso 1 — Credenciales de la aplicación</div>
                <p style={s.cardDesc}>
                    Ingresá el <strong>App ID</strong> y el <strong>Client Secret</strong> de tu aplicación de Mercado Libre.
                    Si no tenés una app, creala en{' '}
                    <a href="https://developers.mercadolibre.com.ar/es_ar/registra-tu-aplicacion"
                       target="_blank" rel="noreferrer" style={s.link}>
                        developers.mercadolibre.com.ar
                    </a>.
                </p>

                <label style={s.lbl}>App ID (Client ID) *</label>
                <input
                    style={s.inp} value={appId}
                    onChange={e => setAppId(e.target.value)}
                    placeholder="Ej: 1234567890"
                    disabled={guardando}
                />

                <label style={s.lbl}>Client Secret {tieneConfig ? '(dejar vacío para no cambiar)' : '*'}</label>
                <input
                    type="password" style={s.inp} value={clientSecret}
                    onChange={e => setClientSecret(e.target.value)}
                    placeholder={tieneConfig ? '••••••••••••••••' : 'Tu client secret'}
                    disabled={guardando}
                />

                <label style={{ ...s.lbl, display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                    <input type="checkbox" checked={facturar} onChange={e => setFacturar(e.target.checked)} />
                    Facturar ventas automáticamente (AFIP)
                </label>

                <button style={s.btnPrimary} onClick={handleGuardar} disabled={guardando}>
                    {guardando ? 'Guardando…' : 'Guardar configuración'}
                </button>
            </div>

            {/* Paso 2 — OAuth */}
            {tieneConfig && (
                <div style={s.card}>
                    <div style={s.cardTitle}>Paso 2 — Conectar tu cuenta</div>
                    {conectado ? (
                        <div>
                            {mlStatus?.user_id && (
                                <div style={s.infoRow}>
                                    <span style={s.infoLabel}>User ID ML</span>
                                    <span style={s.infoVal}>{mlStatus.user_id}</span>
                                </div>
                            )}
                            {mlStatus?.token_expires_at && (
                                <div style={s.infoRow}>
                                    <span style={s.infoLabel}>Token expira</span>
                                    <span style={s.infoVal}>
                                        {new Date(mlStatus.token_expires_at).toLocaleString('es-AR')}
                                    </span>
                                </div>
                            )}
                            <div style={{ marginTop: 12 }}>
                                <label style={{ display: 'flex', alignItems: 'center', gap: 8,
                                                cursor: 'pointer', fontSize: 13, color: '#374151' }}>
                                    <input
                                        type="checkbox"
                                        checked={tienda?.ml_facturar_ventas !== false}
                                        onChange={e => handleActualizarConfig('ml_facturar_ventas', e.target.checked)}
                                    />
                                    Facturar automáticamente las ventas de Mercado Libre
                                </label>
                            </div>
                            <button
                                style={{ ...s.btnDanger, marginTop: 14 }}
                                onClick={handleDesconectar}
                                disabled={desconectando}
                            >
                                {desconectando ? 'Desconectando…' : 'Desconectar'}
                            </button>
                        </div>
                    ) : (
                        <div>
                            <p style={s.cardDesc}>
                                Al hacer clic se abrirá una ventana de Mercado Libre para autorizar la app.
                                La redirect URL de tu app debe apuntar al dominio de este sistema.
                            </p>
                            <button style={{ ...s.btnPrimary, background: '#3483fa' }}
                                    onClick={handleConectar} disabled={conectando}>
                                {conectando ? 'Conectando…' : 'Conectar con Mercado Libre'}
                            </button>
                        </div>
                    )}
                </div>
            )}

            {/* Paso 3 — Acciones de sync */}
            {conectado && (
                <div style={s.card}>
                    <div style={s.cardTitle}>Paso 3 — Sincronización</div>

                    <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 12 }}>
                        <button style={s.btnSecondary} onClick={handleActualizarStock} disabled={sincronizando}>
                            {sincronizando ? 'Procesando…' : '↑ Actualizar stock a ML'}
                        </button>
                        <button style={s.btnSecondary} onClick={() => setMostrarImport(true)} disabled={sincronizando}>
                            ↓ Importar productos desde ML
                        </button>
                        <button style={s.btnSecondary} onClick={handleActualizarExistentes} disabled={sincronizando}>
                            ↻ Actualizar precio/stock de existentes
                        </button>
                    </div>
                    <p style={{ fontSize: 12, color: '#9ca3af', margin: 0 }}>
                        Las ventas de ML se registran automáticamente via webhook cuando el usuario completa una compra.
                    </p>
                </div>
            )}

            {/* Modal importar */}
            {mostrarImport && (
                <div style={s.overlay}>
                    <div style={s.modalWrap}>
                        <ImportarProductosSeleccionadosML
                            tiendaId={tiendaId}
                            token={token}
                            onClose={() => setMostrarImport(false)}
                            onImport={handleImportarSeleccionados}
                        />
                    </div>
                </div>
            )}
        </div>
    );
}

// ── Estilos ───────────────────────────────────────────────────────────────────
const s = {
    root:        { padding: '4px 0', maxWidth: 680 },
    centered:    { textAlign: 'center', padding: 40, color: '#6b7280' },
    header:      { display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                   flexWrap: 'wrap', gap: 10, marginBottom: 20 },
    badgeOk:     { background: '#d1fae5', color: '#065f46', padding: '4px 12px',
                   borderRadius: 999, fontSize: 13, fontWeight: 600 },
    badgeNo:     { background: '#fee2e2', color: '#991b1b', padding: '4px 12px',
                   borderRadius: 999, fontSize: 13, fontWeight: 600 },
    alertOk:     { background: '#d1fae5', color: '#065f46', padding: '10px 14px',
                   borderRadius: 8, fontSize: 13, fontWeight: 500, marginBottom: 12 },
    alertErr:    { background: '#fee2e2', color: '#991b1b', padding: '10px 14px',
                   borderRadius: 8, fontSize: 13, fontWeight: 500, marginBottom: 12 },
    card:        { background: '#fff', borderRadius: 10, padding: '18px 20px',
                   boxShadow: '0 1px 4px rgba(0,0,0,.08)', marginBottom: 14 },
    cardTitle:   { fontWeight: 700, fontSize: 15, color: '#111827', marginBottom: 6 },
    cardDesc:    { fontSize: 13, color: '#6b7280', marginBottom: 14, lineHeight: 1.5 },
    lbl:         { fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 4, display: 'block' },
    inp:         { width: '100%', padding: '8px 11px', border: '1px solid #d1d5db',
                   borderRadius: 8, fontSize: 14, boxSizing: 'border-box', marginBottom: 12 },
    btnPrimary:  { padding: '9px 20px', background: '#2563eb', color: '#fff',
                   border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 600, fontSize: 14 },
    btnSecondary:{ padding: '9px 16px', background: '#f3f4f6', color: '#374151',
                   border: '1px solid #e5e7eb', borderRadius: 8, cursor: 'pointer',
                   fontWeight: 600, fontSize: 13 },
    btnDanger:   { padding: '8px 18px', background: '#dc2626', color: '#fff',
                   border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 600, fontSize: 13 },
    infoRow:     { display: 'flex', gap: 10, marginBottom: 6, alignItems: 'center' },
    infoLabel:   { fontSize: 13, color: '#6b7280', minWidth: 120 },
    infoVal:     { fontSize: 13, color: '#111827', fontWeight: 600 },
    link:        { color: '#2563eb' },
    overlay:     { position: 'fixed', inset: 0, background: 'rgba(0,0,0,.5)',
                   display: 'flex', alignItems: 'center', justifyContent: 'center',
                   zIndex: 1000, padding: 20 },
    modalWrap:   { background: '#fff', borderRadius: 16, maxWidth: 900, width: '100%',
                   maxHeight: '90vh', overflow: 'auto' },
};
