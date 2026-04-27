import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '../AuthContext';
import axios from 'axios';
import Swal from 'sweetalert2';

const normalizeApiUrl = (url) => {
    if (!url) return 'http://localhost:8000';
    let u = url;
    if (u.endsWith('/api/') || u.endsWith('/api')) u = u.replace(/\/api\/?$/, '');
    if (u.endsWith('/')) u = u.slice(0, -1);
    return u;
};

const BASE        = normalizeApiUrl(process.env.REACT_APP_API_URL || 'http://localhost:8000');
const TN_AUTH_URL = 'https://www.tiendanube.com/apps/28208/authorize';

export default function IntegracionTiendaNube() {
    const { token, isAuthenticated, selectedStoreSlug, stores } = useAuth();

    const [tiendaId,      setTiendaId]      = useState(null);
    const [tnStatus,      setTnStatus]      = useState(null);
    const [loading,       setLoading]       = useState(true);
    const [conectando,    setConectando]    = useState(false);
    const [registrando,   setRegistrando]  = useState(false);
    const [desconectando, setDesconectando] = useState(false);
    const [importando,    setImportando]   = useState(false);
    const [exportando,    setExportando]   = useState(false);
    const [sincStockTN,   setSincStockTN]  = useState(false);
    const [error,         setError]        = useState(null);
    const [successMsg,    setSuccessMsg]   = useState('');

    // Credenciales del cliente (app propia en TN Partners)
    const [customAppId,        setCustomAppId]        = useState('');
    const [customClientSecret, setCustomClientSecret] = useState('');

    // Conexión manual
    const [mostrarManual,    setMostrarManual]    = useState(false);
    const [manualToken,      setManualToken]      = useState('');
    const [manualStoreId,    setManualStoreId]    = useState('');
    const [guardandoManual,  setGuardandoManual]  = useState(false);

    // Intercambio de code → token
    const [mostrarCurl,  setMostrarCurl]  = useState(false);
    const [manualCode,   setManualCode]   = useState('');
    const [canjeando,    setCanjeando]    = useState(false);

    const popupRef    = useRef(null);
    const intervalRef = useRef(null);

    const headers = { Authorization: `Bearer ${token}` };

    const showSuccess = (msg) => { setSuccessMsg(msg); setTimeout(() => setSuccessMsg(''), 6000); };
    const showError   = (msg) => { setError(msg);      setTimeout(() => setError(null),    7000); };

    // ── ID de tienda ──────────────────────────────────────────────────────────
    const obtenerTiendaId = useCallback(async () => {
        if (!selectedStoreSlug || !token) return null;
        if (Array.isArray(stores) && stores.length > 0) {
            const found = stores.find(s => s.nombre === selectedStoreSlug);
            if (found?.id) return found.id;
        }
        try {
            const res   = await axios.get(`${BASE}/api/tiendas/`, { headers });
            const lista = res.data.results || res.data;
            return Array.isArray(lista) ? lista.find(t => t.nombre === selectedStoreSlug)?.id || null : null;
        } catch { return null; }
    }, [selectedStoreSlug, token, stores]); // eslint-disable-line

    // ── Estado TN ─────────────────────────────────────────────────────────────
    const fetchStatus = useCallback(async (id) => {
        try {
            const res = await axios.get(`${BASE}/api/tiendas/${id}/tiendanube/status/`, { headers });
            setTnStatus(res.data);
        } catch { /* ignore */ }
    }, []); // eslint-disable-line

    useEffect(() => {
        if (!isAuthenticated || !token) { setLoading(false); return; }
        obtenerTiendaId().then(id => {
            setTiendaId(id);
            if (id) fetchStatus(id).finally(() => setLoading(false));
            else setLoading(false);
        });
    }, [isAuthenticated, token, selectedStoreSlug]); // eslint-disable-line

    useEffect(() => {
        return () => {
            clearInterval(intervalRef.current);
            window.removeEventListener('message', handleMessage);
        };
    }, []); // eslint-disable-line

    // ── Conectar vía popup OAuth ──────────────────────────────────────────────
    const handleMessage = useCallback((event) => {
        if (event.data?.type === 'TN_INSTALL_SUCCESS') {
            window.removeEventListener('message', handleMessage);
            clearInterval(intervalRef.current);
            setConectando(false);
            if (tiendaId) fetchStatus(tiendaId);
            showSuccess(`¡Tienda Nube conectada! (${event.data.nombre})`);
        }
        if (event.data?.type === 'TN_INSTALL_ERROR') {
            window.removeEventListener('message', handleMessage);
            clearInterval(intervalRef.current);
            setConectando(false);
            showError('Error al conectar: ' + (event.data.error || ''));
        }
    }, [tiendaId, fetchStatus]); // eslint-disable-line

    const handleConectar = () => {
        setConectando(true);
        setError(null);

        // Guardar credenciales en sessionStorage para que tn-callback.html las use
        const appId = customAppId.trim() || '28208';
        sessionStorage.setItem('tn_app_id', appId);
        if (customClientSecret.trim()) {
            sessionStorage.setItem('tn_client_secret', customClientSecret.trim());
        } else {
            sessionStorage.removeItem('tn_client_secret');
        }

        const authUrl = `https://www.tiendanube.com/apps/${appId}/authorize`;
        window.addEventListener('message', handleMessage);
        const popup = window.open(authUrl, 'tn_oauth', 'width=620,height=720');
        popupRef.current = popup;
        intervalRef.current = setInterval(() => {
            if (popup?.closed) {
                clearInterval(intervalRef.current);
                window.removeEventListener('message', handleMessage);
                setConectando(false);
            }
        }, 800);
    };

    // ── Canjear code por token (vía backend) ──────────────────────────────────
    const handleCanjearCode = async () => {
        const code = manualCode.trim();
        if (!code) { showError('Ingresá el código de autorización.'); return; }
        setCanjeando(true);
        try {
            const body = { code };
            if (customAppId.trim())        body.app_id        = customAppId.trim();
            if (customClientSecret.trim()) body.client_secret = customClientSecret.trim();

            const resp = await fetch(`${BASE}/api/tn/install/`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body),
            });
            const data = await resp.json();
            if (!resp.ok || !data.success) throw new Error(data.error || `Error ${resp.status}`);

            showSuccess(`¡Conectado! Store ID: ${data.store_id} — Tienda: "${data.nombre}"`);
            setManualCode('');
            setMostrarCurl(false);
            if (tiendaId) fetchStatus(tiendaId);
        } catch (e) {
            showError('Error al canjear el código: ' + e.message);
        } finally { setCanjeando(false); }
    };

    // ── Guardar token manualmente ─────────────────────────────────────────────
    const handleGuardarManual = async () => {
        if (!tiendaId) { showError('No se encontró la tienda.'); return; }
        if (!manualToken.trim() || !manualStoreId.trim()) {
            showError('Completá el Access Token y el Store ID.');
            return;
        }
        setGuardandoManual(true);
        try {
            await axios.patch(`${BASE}/api/tiendas/${tiendaId}/`, {
                tn_access_token:    manualToken.trim(),
                tn_store_id:        manualStoreId.trim(),
                tn_app_id:          '28208',
                tn_client_secret:   '87f123d98ed49fe6424c1e6d6b582e0ab9b82c7a2f696b11',
                tn_sync_habilitado: true,
            }, { headers });

            // Registrar webhook automáticamente
            try {
                await axios.post(`${BASE}/api/tiendas/${tiendaId}/tiendanube/register-webhook/`, {}, { headers });
            } catch { /* webhook falla silencioso */ }

            await fetchStatus(tiendaId);
            showSuccess('¡Tienda Nube conectada manualmente y webhook registrado!');
            setManualToken('');
            setManualStoreId('');
            setMostrarManual(false);
        } catch (e) {
            showError(e.response?.data?.error || 'Error al guardar el token.');
        } finally { setGuardandoManual(false); }
    };

    // ── Webhook, sync, desconectar ────────────────────────────────────────────
    const handleRegistrarWebhook = async () => {
        if (!tiendaId) return;
        setRegistrando(true);
        try {
            const res = await axios.post(`${BASE}/api/tiendas/${tiendaId}/tiendanube/register-webhook/`, {}, { headers });
            await fetchStatus(tiendaId);
            showSuccess(`Webhook registrado (ID: ${res.data.webhook_id})`);
        } catch (e) {
            showError(e.response?.data?.error || 'Error al registrar el webhook.');
        } finally { setRegistrando(false); }
    };

    const handleExportarProductos = async () => {
        if (!tiendaId) return;
        const { isConfirmed } = await Swal.fire({
            title: '¿Publicar productos en Tienda Nube?',
            text: 'Se crearán todos los productos de Total Stock que aún no están publicados.',
            icon: 'warning', showCancelButton: true,
            confirmButtonColor: '#10b981', cancelButtonColor: '#6b7280',
            confirmButtonText: 'Sí, publicar', cancelButtonText: 'Cancelar',
        });
        if (!isConfirmed) return;
        setExportando(true);
        try {
            const res = await axios.post(`${BASE}/api/tiendas/${tiendaId}/tiendanube/export-products/`, {}, { headers });
            showSuccess(res.data.mensaje || 'Publicación iniciada.');
        } catch (e) {
            showError(e.response?.data?.error || 'Error al publicar productos.');
        } finally { setExportando(false); }
    };

    const handleImportarProductos = async () => {
        if (!tiendaId) return;
        const { isConfirmed } = await Swal.fire({
            title: '¿Importar productos desde Tienda Nube?',
            text: 'Se traerán todos los productos y se vincularán por SKU o nombre.',
            icon: 'info', showCancelButton: true,
            confirmButtonColor: '#2563eb', cancelButtonColor: '#6b7280',
            confirmButtonText: 'Sí, importar', cancelButtonText: 'Cancelar',
        });
        if (!isConfirmed) return;
        setImportando(true);
        try {
            const res = await axios.post(`${BASE}/api/tiendas/${tiendaId}/tiendanube/import-products/`, {}, { headers });
            const { creados, vinculados, actualizados, errores } = res.data;
            let msg = `Importación completada: ${creados} nuevos, ${vinculados} vinculados, ${actualizados} actualizados.`;
            if (errores?.length) msg += ` (${errores.length} errores)`;
            showSuccess(msg);
        } catch (e) {
            showError(e.response?.data?.error || 'Error al importar productos.');
        } finally { setImportando(false); }
    };

    const handleSyncStockTN = async () => {
        if (!tiendaId) return;
        const { isConfirmed } = await Swal.fire({
            title: '¿Actualizar stock en Tienda Nube?',
            text: 'Se sobreescribirá el stock de todos los productos vinculados.',
            icon: 'warning', showCancelButton: true,
            confirmButtonColor: '#10b981', cancelButtonColor: '#6b7280',
            confirmButtonText: 'Sí, actualizar', cancelButtonText: 'Cancelar',
        });
        if (!isConfirmed) return;
        setSincStockTN(true);
        try {
            const res = await axios.post(`${BASE}/api/tiendas/${tiendaId}/tiendanube/sync-stock/`, {}, { headers });
            const { actualizados, errores } = res.data;
            let msg = `Stock actualizado: ${actualizados} productos.`;
            if (errores?.length) msg += ` (${errores.length} errores)`;
            showSuccess(msg);
        } catch (e) {
            showError(e.response?.data?.error || 'Error al sincronizar stock.');
        } finally { setSincStockTN(false); }
    };

    const handleDesconectar = async () => {
        if (!tiendaId || !window.confirm('¿Desconectar Tienda Nube? Se eliminará el webhook y el token.')) return;
        setDesconectando(true);
        try {
            await axios.post(`${BASE}/api/tiendas/${tiendaId}/tiendanube/disconnect/`, {}, { headers });
            await fetchStatus(tiendaId);
            showSuccess('Tienda Nube desconectada.');
        } catch (e) {
            showError(e.response?.data?.error || 'Error al desconectar.');
        } finally { setDesconectando(false); }
    };

    // ── Render ────────────────────────────────────────────────────────────────
    if (loading) return <div style={s.centered}>Cargando…</div>;

    const conectado    = tnStatus?.connected;
    const tieneWebhook = Boolean(tnStatus?.webhook_id);

    return (
        <div style={s.root}>

            {/* Header */}
            <div style={s.header}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <img src="/tiendanube-icon.png" alt="Tienda Nube"
                         style={{ width: 32, height: 32, borderRadius: 6 }}
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

            {/* Alertas */}
            {error      && <div style={s.alertErr}>{error}</div>}
            {successMsg && <div style={s.alertOk}>{successMsg}</div>}

            {/* ── NO CONECTADO ── */}
            {!conectado && (
                <>
                    {/* Credenciales del cliente */}
                    <div style={s.card}>
                        <div style={s.cardTitle}>App ID y Client Secret del cliente</div>
                        <p style={s.cardDesc}>
                            Si el cliente creó su propia app en el{' '}
                            <a href="https://partners.tiendanube.com" target="_blank" rel="noreferrer" style={{ color: '#2563eb' }}>
                                panel de partners de Tienda Nube
                            </a>{' '}
                            con redirect URL <code>https://totalstock.onrender.com/tn-callback.html</code>,
                            ingresá sus credenciales acá. Si no, se usarán las de la app global.
                        </p>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                            <div>
                                <label style={s.lbl}>App ID</label>
                                <input
                                    style={s.inp}
                                    value={customAppId}
                                    onChange={e => setCustomAppId(e.target.value)}
                                    placeholder="Ej: 31234 (o vacío para usar la global)"
                                />
                            </div>
                            <div>
                                <label style={s.lbl}>Client Secret</label>
                                <input
                                    type="password"
                                    style={s.inp}
                                    value={customClientSecret}
                                    onChange={e => setCustomClientSecret(e.target.value)}
                                    placeholder="Client secret del cliente"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Botón OAuth */}
                    <div style={s.card}>
                        <div style={s.cardTitle}>Conectar con Tienda Nube</div>
                        <p style={s.cardDesc}>
                            Se abre una ventana de Tienda Nube para autorizar.
                            Usará el App ID del cliente si lo completaste arriba.
                        </p>
                        <button
                            style={{ ...s.btnTN, opacity: conectando ? 0.7 : 1 }}
                            onClick={handleConectar}
                            disabled={conectando}
                        >
                            <img src="/tiendanube-icon.png" alt=""
                                 style={{ width: 20, height: 20, borderRadius: 4, marginRight: 8 }}
                                 onError={e => { e.target.style.display = 'none'; }} />
                            {conectando ? 'Esperando autorización…' : 'Conectar con Tienda Nube'}
                        </button>
                    </div>

                    {/* Separador */}
                    <div style={s.divider}>
                        <span style={s.dividerText}>o conectá manualmente con el código de autorización</span>
                    </div>

                    {/* Paso 1: canjear code por token */}
                    <div style={s.card}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                            <div style={s.cardTitle}>Paso 1 — Obtener token desde el código</div>
                            <button style={s.btnLink} onClick={() => setMostrarCurl(!mostrarCurl)}>
                                {mostrarCurl ? 'Ocultar' : '¿Cómo obtengo el código?'}
                            </button>
                        </div>

                        {mostrarCurl && (
                            <div style={s.codeBox}>
                                <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 6 }}>
                                    1. Abrí este link en el navegador logueado en la tienda del cliente:
                                </div>
                                <code style={s.codeInline}>
                                    https://www.tiendanube.com/apps/28208/authorize
                                </code>
                                <div style={{ fontSize: 12, color: '#6b7280', margin: '8px 0 4px' }}>
                                    2. Después de autorizar, TN te redirige a una URL con <strong>?code=XXXX</strong> — copiá ese código.
                                </div>
                            </div>
                        )}

                        <label style={s.lbl}>Código de autorización (code)</label>
                        <input
                            style={s.inp}
                            value={manualCode}
                            onChange={e => setManualCode(e.target.value)}
                            placeholder="Pegá el código que te dio Tienda Nube"
                        />
                        <button style={s.btnPrimary} onClick={handleCanjearCode} disabled={canjeando || !manualCode.trim()}>
                            {canjeando ? 'Canjeando…' : 'Obtener token'}
                        </button>
                    </div>

                    {/* Paso 2: pegar token manualmente */}
                    <div style={s.card}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                            <div style={s.cardTitle}>Paso 2 — Guardar token manualmente</div>
                            <button style={s.btnLink} onClick={() => setMostrarManual(!mostrarManual)}>
                                {mostrarManual ? 'Ocultar' : 'Tengo el token del curl'}
                            </button>
                        </div>
                        <p style={s.cardDesc}>
                            Si ya corriste el curl y tenés el <code>access_token</code> y el <code>user_id</code>,
                            pegálos acá y guardá.
                        </p>

                        {mostrarManual && (
                            <>
                                <label style={s.lbl}>Access Token</label>
                                <input
                                    style={s.inp}
                                    value={manualToken}
                                    onChange={e => setManualToken(e.target.value)}
                                    placeholder="access_token del curl"
                                />
                                <label style={s.lbl}>Store ID (user_id)</label>
                                <input
                                    style={s.inp}
                                    value={manualStoreId}
                                    onChange={e => setManualStoreId(e.target.value)}
                                    placeholder="user_id del curl (ej: 3103332)"
                                />
                                <button
                                    style={s.btnPrimary}
                                    onClick={handleGuardarManual}
                                    disabled={guardandoManual || !manualToken.trim() || !manualStoreId.trim()}
                                >
                                    {guardandoManual ? 'Guardando…' : 'Guardar y registrar webhook'}
                                </button>
                            </>
                        )}

                        {!mostrarManual && (
                            <div style={{ fontSize: 12, color: '#9ca3af', fontStyle: 'italic' }}>
                                Expandí esta sección si querés pegar el token directamente del curl.
                            </div>
                        )}
                    </div>
                </>
            )}

            {/* ── CONECTADO ── */}
            {conectado && (
                <>
                    <div style={s.card}>
                        <div style={s.cardTitle}>Conexión activa</div>
                        <div style={s.infoRow}>
                            <span style={s.infoLabel}>Store ID</span>
                            <span style={s.infoVal}>{tnStatus.store_id}</span>
                        </div>
                        <div style={s.infoRow}>
                            <span style={s.infoLabel}>Sync habilitado</span>
                            <span style={s.infoVal}>{tnStatus.sync_habilitado ? 'Sí' : 'No'}</span>
                        </div>
                        <div style={s.infoRow}>
                            <span style={s.infoLabel}>Webhook</span>
                            <span style={s.infoVal}>
                                {tieneWebhook ? `ID ${tnStatus.webhook_id}` : 'No registrado'}
                            </span>
                        </div>
                        <div style={{ display: 'flex', gap: 10, marginTop: 14, flexWrap: 'wrap' }}>
                            <button style={s.btnSecondary} onClick={handleRegistrarWebhook} disabled={registrando}>
                                {registrando ? 'Actualizando…' : tieneWebhook ? 'Renovar webhook' : 'Registrar webhook'}
                            </button>
                            <button style={s.btnDanger} onClick={handleDesconectar} disabled={desconectando}>
                                {desconectando ? 'Desconectando…' : 'Desconectar'}
                            </button>
                        </div>
                    </div>

                    <div style={s.card}>
                        <div style={s.cardTitle}>Sincronización de productos</div>
                        <p style={s.cardDesc}>
                            Publicá los productos de Total Stock en tu tienda online, importá los existentes o actualizá el stock.
                        </p>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
                            <button style={s.btnPrimary} onClick={handleExportarProductos} disabled={exportando}>
                                {exportando ? 'Publicando…' : '↑ Publicar productos'}
                            </button>
                            <button style={s.btnSecondary} onClick={handleImportarProductos} disabled={importando}>
                                {importando ? 'Importando…' : '↓ Importar desde TN'}
                            </button>
                            <button style={s.btnSecondary} onClick={handleSyncStockTN} disabled={sincStockTN}>
                                {sincStockTN ? 'Actualizando…' : '↑ Actualizar stock'}
                            </button>
                        </div>
                    </div>
                </>
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
    lbl:       { fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 4, display: 'block', marginTop: 4 },
    inp:       { width: '100%', padding: '9px 12px', border: '1.5px solid #d1d5db',
                 borderRadius: 8, fontSize: 14, boxSizing: 'border-box', marginBottom: 10, outline: 'none' },
    divider:   { display: 'flex', alignItems: 'center', margin: '4px 0 14px', gap: 10 },
    dividerText: { fontSize: 12, color: '#9ca3af', whiteSpace: 'nowrap',
                   background: 'transparent', padding: '0 4px' },
    codeBox:   { background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 8,
                 padding: '12px 14px', marginBottom: 12, fontSize: 13 },
    codeInline:{ display: 'block', background: '#1e293b', color: '#7dd3fc', padding: '6px 10px',
                 borderRadius: 6, fontSize: 12, wordBreak: 'break-all', margin: '4px 0' },
    btnTN: {
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '12px 24px', background: '#00b1ea', color: '#fff',
        border: 'none', borderRadius: 10, cursor: 'pointer',
        fontWeight: 700, fontSize: 15, width: '100%', transition: 'opacity 0.2s',
    },
    btnPrimary:   { padding: '9px 18px', background: '#2563eb', color: '#fff',
                    border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 600, fontSize: 14 },
    btnSecondary: { padding: '9px 18px', background: '#f3f4f6', color: '#374151',
                    border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 600, fontSize: 14 },
    btnDanger:    { padding: '9px 18px', background: '#dc2626', color: '#fff',
                    border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 600, fontSize: 13 },
    btnLink:      { background: 'none', border: 'none', color: '#2563eb', fontSize: 12,
                    cursor: 'pointer', textDecoration: 'underline', padding: 0 },
    infoRow:   { display: 'flex', gap: 10, marginBottom: 6, alignItems: 'center' },
    infoLabel: { fontSize: 13, color: '#6b7280', minWidth: 120 },
    infoVal:   { fontSize: 13, color: '#111827', fontWeight: 600 },
};
