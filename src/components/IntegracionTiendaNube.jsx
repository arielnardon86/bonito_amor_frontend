import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../AuthContext';
import axios from 'axios';

const normalizeApiUrl = (url) => {
    if (!url) return 'http://localhost:8000';
    let u = url;
    if (u.endsWith('/api/') || u.endsWith('/api')) u = u.replace(/\/api\/?$/, '');
    if (u.endsWith('/')) u = u.slice(0, -1);
    return u;
};

const BASE = normalizeApiUrl(process.env.REACT_APP_API_URL || 'http://localhost:8000');

export default function IntegracionTiendaNube() {
    const { token, isAuthenticated, selectedStoreSlug, stores } = useAuth();

    const [tiendaId,     setTiendaId]     = useState(null);
    const [tienda,       setTienda]       = useState(null);
    const [tnStatus,     setTnStatus]     = useState(null);
    const [loading,      setLoading]      = useState(true);
    const [guardando,    setGuardando]    = useState(false);
    const [conectando,   setConectando]   = useState(false);
    const [registrando,  setRegistrando]  = useState(false);
    const [desconectando,setDesconectando]= useState(false);
    const [importando,   setImportando]  = useState(false);
    const [sincStockTN,  setSincStockTN] = useState(false);
    const [error,        setError]       = useState(null);
    const [successMsg,   setSuccessMsg]  = useState('');

    // Campos del formulario de configuración
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

    // ── Fetch tienda + estado TN ──────────────────────────────────────────────
    const fetchTienda = useCallback(async (id) => {
        try {
            const res = await axios.get(`${BASE}/api/tiendas/${id}/`, { headers });
            setTienda(res.data);
            setAppId(res.data.tn_app_id || '');
            setFacturar(res.data.tn_facturar_ventas !== false);
        } catch { /* ignore */ }
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    const fetchStatus = useCallback(async (id) => {
        try {
            const res = await axios.get(`${BASE}/api/tiendas/${id}/tiendanube/status/`, { headers });
            setTnStatus(res.data);
        } catch { /* ignore */ }
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    useEffect(() => {
        if (!isAuthenticated || !token) { setLoading(false); return; }
        obtenerTiendaId().then(id => {
            setTiendaId(id);
            if (id) Promise.all([fetchTienda(id), fetchStatus(id)]).finally(() => setLoading(false));
            else setLoading(false);
        });
    }, [isAuthenticated, token, selectedStoreSlug]); // eslint-disable-line react-hooks/exhaustive-deps

    // ── Guardar configuración (app_id, client_secret, facturar) ──────────────
    const handleGuardar = async () => {
        if (!tiendaId) return;
        if (!appId.trim()) { showError('El App ID es obligatorio.'); return; }
        setGuardando(true);
        try {
            const body = { tn_app_id: appId.trim(), tn_facturar_ventas: facturar };
            if (clientSecret.trim()) body.tn_client_secret = clientSecret.trim();
            await axios.patch(`${BASE}/api/tiendas/${tiendaId}/`, body, { headers });
            setClientSecret('');
            await Promise.all([fetchTienda(tiendaId), fetchStatus(tiendaId)]);
            showSuccess('Configuración guardada.');
        } catch (e) {
            showError(e.response?.data?.error || 'Error al guardar la configuración.');
        } finally { setGuardando(false); }
    };

    // ── OAuth: abrir popup ────────────────────────────────────────────────────
    const handleConectar = async () => {
        if (!tiendaId) return;
        setConectando(true);
        setError(null);
        try {
            const res = await axios.get(`${BASE}/api/tiendas/${tiendaId}/tiendanube/auth-url/`, { headers });
            const authUrl = res.data.auth_url;

            // Configurar listener antes de abrir el popup
            const messageHandler = async (event) => {
                if (event.data?.type === 'TN_OAUTH_SUCCESS') {
                    window.removeEventListener('message', messageHandler);
                    const code = event.data.code;
                    try {
                        await axios.post(
                            `${BASE}/api/tiendas/${tiendaId}/tiendanube/callback/`,
                            { code },
                            { headers },
                        );
                        await Promise.all([fetchTienda(tiendaId), fetchStatus(tiendaId)]);
                        showSuccess('¡Tienda Nube conectada exitosamente!');
                    } catch (e2) {
                        showError(e2.response?.data?.error || 'Error al completar la autenticación.');
                    } finally { setConectando(false); }
                }
            };
            window.addEventListener('message', messageHandler);

            const popup = window.open(authUrl, 'tn_oauth', 'width=600,height=700');
            // Fallback: monitorear si el popup se cierra sin enviar mensaje
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

    // ── Registrar webhook ─────────────────────────────────────────────────────
    const handleRegistrarWebhook = async () => {
        if (!tiendaId) return;
        setRegistrando(true);
        try {
            const res = await axios.post(
                `${BASE}/api/tiendas/${tiendaId}/tiendanube/register-webhook/`,
                {},
                { headers },
            );
            await fetchStatus(tiendaId);
            showSuccess(`Webhook registrado (ID: ${res.data.webhook_id})`);
        } catch (e) {
            showError(e.response?.data?.error || 'Error al registrar el webhook.');
        } finally { setRegistrando(false); }
    };

    // ── Importar productos desde TN ───────────────────────────────────────────
    const handleImportarProductos = async () => {
        if (!tiendaId) return;
        setImportando(true);
        try {
            const res = await axios.post(
                `${BASE}/api/tiendas/${tiendaId}/tiendanube/import-products/`,
                {},
                { headers },
            );
            const { creados, vinculados, actualizados, errores } = res.data;
            let msg = `Importación completada: ${creados} nuevos, ${vinculados} vinculados, ${actualizados} actualizados.`;
            if (errores?.length) msg += ` (${errores.length} errores)`;
            showSuccess(msg);
        } catch (e) {
            showError(e.response?.data?.error || 'Error al importar productos.');
        } finally { setImportando(false); }
    };

    // ── Push de stock hacia TN ────────────────────────────────────────────────
    const handleSyncStockTN = async () => {
        if (!tiendaId) return;
        setSincStockTN(true);
        try {
            const res = await axios.post(
                `${BASE}/api/tiendas/${tiendaId}/tiendanube/sync-stock/`,
                {},
                { headers },
            );
            const { actualizados, errores } = res.data;
            let msg = `Stock actualizado en Tienda Nube: ${actualizados} productos.`;
            if (errores?.length) msg += ` (${errores.length} errores)`;
            showSuccess(msg);
        } catch (e) {
            showError(e.response?.data?.error || 'Error al sincronizar stock.');
        } finally { setSincStockTN(false); }
    };

    // ── Desconectar ───────────────────────────────────────────────────────────
    const handleDesconectar = async () => {
        if (!tiendaId || !window.confirm('¿Desconectar Tienda Nube? Se eliminará el webhook y el token.')) return;
        setDesconectando(true);
        try {
            await axios.post(`${BASE}/api/tiendas/${tiendaId}/tiendanube/disconnect/`, {}, { headers });
            await Promise.all([fetchTienda(tiendaId), fetchStatus(tiendaId)]);
            showSuccess('Tienda Nube desconectada.');
        } catch (e) {
            showError(e.response?.data?.error || 'Error al desconectar.');
        } finally { setDesconectando(false); }
    };

    // ── Render ────────────────────────────────────────────────────────────────
    if (loading) return <div style={s.centered}>Cargando…</div>;
    if (!tiendaId) return <div style={s.centered}>No se encontró la tienda.</div>;

    const conectado   = tnStatus?.connected;
    const tieneConfig = tnStatus?.has_app_id && tnStatus?.has_client_secret;
    const tieneWebhook = Boolean(tnStatus?.webhook_id);

    return (
        <div style={s.root}>
            {/* Header */}
            <div style={s.header}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <img src="/tiendanube-icon.png" alt="Tienda Nube" style={{ width: 32, height: 32, borderRadius: 6 }}
                         onError={e => { e.target.style.display = 'none'; }} />
                    <div>
                        <div style={{ fontWeight: 700, fontSize: 17 }}>Tienda Nube</div>
                        <div style={{ fontSize: 13, color: '#6b7280' }}>
                            Procesá ventas de tu tienda online automáticamente
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

            {/* Paso 1 — Configurar credenciales */}
            <div style={s.card}>
                <div style={s.cardTitle}>Paso 1 — Credenciales de la aplicación</div>
                <p style={s.cardDesc}>
                    Creá una app en el <a href="https://partners.tiendanube.com" target="_blank" rel="noreferrer" style={s.link}>
                    Panel de Partners de Tienda Nube</a> y copiá el App ID y Client Secret.
                </p>

                <label style={s.lbl}>App ID *</label>
                <input
                    style={s.inp} value={appId}
                    onChange={e => setAppId(e.target.value)}
                    placeholder="Ej: 12345"
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

            {/* Paso 2 — Conectar OAuth */}
            {tieneConfig && (
                <div style={s.card}>
                    <div style={s.cardTitle}>Paso 2 — Conectar tu tienda</div>
                    {conectado ? (
                        <div>
                            <div style={s.infoRow}>
                                <span style={s.infoLabel}>Store ID</span>
                                <span style={s.infoVal}>{tnStatus.store_id}</span>
                            </div>
                            <div style={s.infoRow}>
                                <span style={s.infoLabel}>Sync habilitado</span>
                                <span style={s.infoVal}>{tnStatus.sync_habilitado ? 'Sí' : 'No'}</span>
                            </div>
                            <button
                                style={{ ...s.btnDanger, marginTop: 12 }}
                                onClick={handleDesconectar}
                                disabled={desconectando}
                            >
                                {desconectando ? 'Desconectando…' : 'Desconectar'}
                            </button>
                        </div>
                    ) : (
                        <div>
                            <p style={s.cardDesc}>
                                Al hacer clic se abrirá una ventana de Tienda Nube para autorizar la app.
                            </p>
                            <button style={s.btnPrimary} onClick={handleConectar} disabled={conectando}>
                                {conectando ? 'Conectando…' : 'Conectar con Tienda Nube'}
                            </button>
                        </div>
                    )}
                </div>
            )}

            {/* Paso 3 — Webhook */}
            {conectado && (
                <div style={s.card}>
                    <div style={s.cardTitle}>Paso 3 — Webhook de ventas</div>
                    <p style={s.cardDesc}>
                        El webhook notifica a Total Stock cuando se paga una orden en Tienda Nube
                        y registra la venta automáticamente.
                    </p>
                    {tieneWebhook ? (
                        <div>
                            <div style={s.infoRow}>
                                <span style={s.infoLabel}>Webhook ID</span>
                                <span style={s.infoVal}>{tnStatus.webhook_id}</span>
                            </div>
                            <div style={{ ...s.alertOk, marginTop: 8 }}>
                                ✅ Webhook registrado. Las ventas pagas en Tienda Nube se importarán automáticamente.
                            </div>
                            <button
                                style={{ ...s.btnSecondary, marginTop: 10 }}
                                onClick={handleRegistrarWebhook}
                                disabled={registrando}
                            >
                                {registrando ? 'Actualizando…' : 'Volver a registrar webhook'}
                            </button>
                        </div>
                    ) : (
                        <button style={s.btnPrimary} onClick={handleRegistrarWebhook} disabled={registrando}>
                            {registrando ? 'Registrando…' : 'Registrar webhook'}
                        </button>
                    )}
                </div>
            )}

            {/* Paso 4 — Sincronización de productos */}
            {conectado && (
                <div style={s.card}>
                    <div style={s.cardTitle}>Paso 4 — Sincronización de productos</div>
                    <p style={s.cardDesc}>
                        Importá los productos de tu tienda online o actualizá el stock en Tienda Nube
                        con los valores actuales de Total Stock.
                    </p>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
                        <button
                            style={s.btnPrimary}
                            onClick={handleImportarProductos}
                            disabled={importando}
                            title="Trae todos los productos de Tienda Nube. Los vincula por SKU o nombre si ya existen, o los crea nuevos."
                        >
                            {importando ? 'Importando…' : '↓ Importar productos desde Tienda Nube'}
                        </button>
                        <button
                            style={s.btnSecondary}
                            onClick={handleSyncStockTN}
                            disabled={sincStockTN}
                            title="Envía el stock actual de Total Stock hacia Tienda Nube para todos los productos sincronizados."
                        >
                            {sincStockTN ? 'Actualizando…' : '↑ Actualizar stock en Tienda Nube'}
                        </button>
                    </div>
                    <p style={{ ...s.cardDesc, marginTop: 12, marginBottom: 0 }}>
                        Después de importar, las ventas de Tienda Nube descontarán stock automáticamente vía webhook.
                    </p>
                </div>
            )}
        </div>
    );
}

// ── Estilos ───────────────────────────────────────────────────────────────────
const s = {
    root:      { padding: '4px 0', maxWidth: 680 },
    centered:  { textAlign: 'center', padding: 40, color: '#6b7280' },
    header:    { display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                 flexWrap: 'wrap', gap: 10, marginBottom: 20 },
    badgeOk:   { background: '#d1fae5', color: '#065f46', padding: '4px 12px',
                 borderRadius: 999, fontSize: 13, fontWeight: 600 },
    badgeNo:   { background: '#fee2e2', color: '#991b1b', padding: '4px 12px',
                 borderRadius: 999, fontSize: 13, fontWeight: 600 },
    alertOk:   { background: '#d1fae5', color: '#065f46', padding: '10px 14px',
                 borderRadius: 8, fontSize: 13, fontWeight: 500, marginBottom: 12 },
    alertErr:  { background: '#fee2e2', color: '#991b1b', padding: '10px 14px',
                 borderRadius: 8, fontSize: 13, fontWeight: 500, marginBottom: 12 },
    card:      { background: '#fff', borderRadius: 10, padding: '18px 20px',
                 boxShadow: '0 1px 4px rgba(0,0,0,.08)', marginBottom: 14 },
    cardTitle: { fontWeight: 700, fontSize: 15, color: '#111827', marginBottom: 6 },
    cardDesc:  { fontSize: 13, color: '#6b7280', marginBottom: 14, lineHeight: 1.5 },
    lbl:       { fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 4, display: 'block' },
    inp:       { width: '100%', padding: '8px 11px', border: '1px solid #d1d5db',
                 borderRadius: 8, fontSize: 14, boxSizing: 'border-box', marginBottom: 12 },
    btnPrimary:  { padding: '9px 20px', background: '#2563eb', color: '#fff',
                   border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 600, fontSize: 14 },
    btnSecondary:{ padding: '9px 20px', background: '#f3f4f6', color: '#374151',
                   border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 600, fontSize: 14 },
    btnDanger:   { padding: '8px 18px', background: '#dc2626', color: '#fff',
                   border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 600, fontSize: 13 },
    infoRow:   { display: 'flex', gap: 10, marginBottom: 6, alignItems: 'center' },
    infoLabel: { fontSize: 13, color: '#6b7280', minWidth: 120 },
    infoVal:   { fontSize: 13, color: '#111827', fontWeight: 600 },
    link:      { color: '#2563eb' },
};
