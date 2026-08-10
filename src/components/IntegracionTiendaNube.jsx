import React, { useState, useEffect, useCallback } from 'react';
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
    const [exportando,   setExportando]  = useState(false);
    const [sincStockTN,  setSincStockTN] = useState(false);
    const [error,        setError]       = useState(null);
    const [successMsg,   setSuccessMsg]  = useState('');

    const [facturar,    setFacturar]    = useState(true);

    // Conexión manual con token
    const [manualToken,   setManualToken]   = useState('');
    const [manualStoreId, setManualStoreId] = useState('');
    const [guardandoToken, setGuardandoToken] = useState(false);

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

    // ── Guardar configuración (facturar automáticamente) ──────────────────────
    const handleGuardar = async () => {
        if (!tiendaId) return;
        setGuardando(true);
        try {
            await axios.patch(`${BASE}/api/tiendas/${tiendaId}/`, { tn_facturar_ventas: facturar }, { headers });
            await fetchTienda(tiendaId);
            showSuccess('Configuración guardada.');
        } catch (e) {
            showError(e.response?.data?.error || 'Error al guardar la configuración.');
        } finally { setGuardando(false); }
    };

    // ── Conexión manual con access_token + store_id ──────────────────────────
    const handleConectarManual = async () => {
        if (!tiendaId) return;
        if (!manualToken.trim() || !manualStoreId.trim()) {
            showError('Completá el access_token y el store_id.');
            return;
        }
        setGuardandoToken(true);
        try {
            await axios.post(
                `${BASE}/api/tiendas/${tiendaId}/tiendanube/set-token/`,
                { access_token: manualToken.trim(), store_id: manualStoreId.trim() },
                { headers },
            );
            setManualToken('');
            setManualStoreId('');
            await Promise.all([fetchTienda(tiendaId), fetchStatus(tiendaId)]);
            showSuccess('¡Tienda Nube conectada con token manual!');
        } catch (e) {
            showError(e.response?.data?.error || 'Error al guardar el token.');
        } finally { setGuardandoToken(false); }
    };

    // ── OAuth: redirigir a Tienda Nube ────────────────────────────────────────
    // Tienda Nube vuelve a mandar al comerciante a /tiendanube/instalar?code=...
    // (la misma página que se usa para instalaciones nuevas desde la App
    // Store); como ya tiene sesión iniciada, esa página lo conecta directo y
    // lo trae de vuelta acá.
    const handleConectar = async () => {
        if (!tiendaId) return;
        setConectando(true);
        setError(null);
        try {
            const res = await axios.get(`${BASE}/api/tiendas/${tiendaId}/tiendanube/auth-url/`, { headers });
            window.location.href = res.data.auth_url;
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

    // ── Publicar productos de Total Stock → TN ───────────────────────────────
    const handleExportarProductos = async () => {
        if (!tiendaId) return;
        const result = await Swal.fire({
            title: '¿Publicar productos en Tienda Nube?',
            text: 'Se crearán en tu tienda online todos los productos de Total Stock que aún no están publicados. Esta acción no se puede deshacer.',
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#10b981',
            cancelButtonColor: '#475569',
            confirmButtonText: 'Sí, publicar',
            cancelButtonText: 'Cancelar',
        });
        if (!result.isConfirmed) return;
        setExportando(true);
        try {
            const res = await axios.post(
                `${BASE}/api/tiendas/${tiendaId}/tiendanube/export-products/`,
                {},
                { headers },
            );
            showSuccess(res.data.mensaje || 'Publicación iniciada.');
        } catch (e) {
            showError(e.response?.data?.error || 'Error al publicar productos.');
        } finally { setExportando(false); }
    };

    // ── Importar productos desde TN ───────────────────────────────────────────
    const handleImportarProductos = async () => {
        if (!tiendaId) return;
        const result = await Swal.fire({
            title: '¿Importar productos desde Tienda Nube?',
            html: 'Se traerán todos los productos de tu tienda online. Los que coincidan por SKU o nombre se vincularán automáticamente; los que no, se crearán como nuevos en Total Stock.'
                + '<br><br><strong>¿Traer también el precio?</strong> El precio de Tienda Nube puede ser distinto al de Total Stock a propósito — elegí si querés pisarlo o dejar el local como está (siempre se actualiza el stock).',
            icon: 'question',
            showDenyButton: true,
            showCancelButton: true,
            confirmButtonColor: '#3b9ede',
            denyButtonColor: '#10b981',
            cancelButtonColor: '#475569',
            confirmButtonText: 'Precio y stock',
            denyButtonText: 'Solo stock',
            cancelButtonText: 'Cancelar',
        });
        if (!result.isConfirmed && !result.isDenied) return;
        const importarPrecio = result.isConfirmed;
        setImportando(true);
        try {
            const res = await axios.post(
                `${BASE}/api/tiendas/${tiendaId}/tiendanube/import-products/`,
                { importar_precio: importarPrecio },
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
        const result = await Swal.fire({
            title: '¿Actualizar stock en Tienda Nube?',
            text: 'Se enviará el stock actual de Total Stock a todos los productos vinculados en tu tienda online. Esta acción sobreescribe el stock en Tienda Nube.',
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#10b981',
            cancelButtonColor: '#475569',
            confirmButtonText: 'Sí, actualizar',
            cancelButtonText: 'Cancelar',
        });
        if (!result.isConfirmed) return;
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
    const tieneConfig = tnStatus?.app_configurada;
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
                        <div style={{ fontSize: 13, color: '#475569' }}>
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

            {!tieneConfig && (
                <div style={s.alertErr}>
                    La app de Tienda Nube todavía no está configurada del lado del servidor. Contactá a soporte de Total Stock.
                </div>
            )}

            {/* Configuración: facturación automática */}
            <div style={s.card}>
                <div style={s.cardTitle}>Configuración</div>
                <label style={{ ...s.lbl, display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', marginBottom: 12 }}>
                    <input type="checkbox" checked={facturar} onChange={e => setFacturar(e.target.checked)} />
                    Facturar ventas automáticamente (ARCA)
                </label>
                <button style={s.btnSecondary} onClick={handleGuardar} disabled={guardando}>
                    {guardando ? 'Guardando…' : 'Guardar'}
                </button>
            </div>

            {/* Paso 1 — Conectar OAuth */}
            {tieneConfig && (
                <div style={s.card}>
                    <div style={s.cardTitle}>Paso 1 — Conectar tu tienda</div>
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
                                Al hacer clic te vamos a redirigir a Tienda Nube para autorizar la app, y después volvés acá automáticamente.
                            </p>
                            <button style={s.btnPrimary} onClick={handleConectar} disabled={conectando}>
                                {conectando ? 'Conectando…' : 'Conectar con Tienda Nube'}
                            </button>

                            <div style={s.divider} />

                            <div style={s.cardTitle}>Conexión manual (app en desarrollo)</div>
                            <p style={s.cardDesc}>
                                Si TN solo ofrece tiendas de prueba, ingresá el token directamente.
                                El <strong>store_id</strong> es el número en la URL del admin de TN
                                (<code>tiendanube.com/admin/</code> → el número que aparece en la URL o en el curl del portal de partners).
                            </p>
                            <label style={s.lbl}>Access Token</label>
                            <input
                                style={s.inp} value={manualToken}
                                onChange={e => setManualToken(e.target.value)}
                                placeholder="Pegá el access_token aquí"
                                disabled={guardandoToken}
                            />
                            <label style={s.lbl}>Store ID (user_id)</label>
                            <input
                                style={s.inp} value={manualStoreId}
                                onChange={e => setManualStoreId(e.target.value)}
                                placeholder="Ej: 7452837"
                                disabled={guardandoToken}
                            />
                            <button style={s.btnSecondary} onClick={handleConectarManual} disabled={guardandoToken}>
                                {guardandoToken ? 'Guardando…' : 'Conectar con token manual'}
                            </button>
                        </div>
                    )}
                </div>
            )}

            {/* Paso 2 — Webhook */}
            {conectado && (
                <div style={s.card}>
                    <div style={s.cardTitle}>Paso 2 — Webhook de ventas</div>
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

            {/* Paso 3 — Sincronización de productos */}
            {conectado && (
                <div style={s.card}>
                    <div style={s.cardTitle}>Paso 3 — Sincronización de productos</div>
                    <p style={s.cardDesc}>
                        Importá los productos de tu tienda online o actualizá el stock en Tienda Nube
                        con los valores actuales de Total Stock.
                    </p>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginBottom: 12 }}>
                        <button
                            style={s.btnPrimary}
                            onClick={handleExportarProductos}
                            disabled={exportando}
                            title="Publica en Tienda Nube los productos de Total Stock que aún no están allí."
                        >
                            {exportando ? 'Publicando…' : '↑ Publicar productos en Tienda Nube'}
                        </button>
                        <button
                            style={s.btnSecondary}
                            onClick={handleImportarProductos}
                            disabled={importando}
                            title="Trae los productos de Tienda Nube y los vincula con los de Total Stock por SKU o nombre."
                        >
                            {importando ? 'Importando…' : '↓ Importar desde Tienda Nube'}
                        </button>
                        <button
                            style={s.btnSecondary}
                            onClick={handleSyncStockTN}
                            disabled={sincStockTN}
                            title="Envía el stock actual de Total Stock hacia Tienda Nube para todos los productos vinculados."
                        >
                            {sincStockTN ? 'Actualizando…' : '↑ Actualizar stock en Tienda Nube'}
                        </button>
                    </div>
                    <p style={{ ...s.cardDesc, marginBottom: 0 }}>
                        <strong>Publicar</strong>: crea en TN los productos que no están aún.
                        <strong> Importar</strong>: vincula los de TN con los de Total Stock por SKU o nombre.
                        Para vincular manualmente un producto existente, editalo en Gestión de Productos e ingresá su ID de variante de Tienda Nube.
                    </p>
                </div>
            )}
        </div>
    );
}

// ── Estilos ───────────────────────────────────────────────────────────────────
const s = {
    root:      { padding: '4px 0', maxWidth: 680 },
    centered:  { textAlign: 'center', padding: 40, color: '#475569' },
    header:    { display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                 flexWrap: 'wrap', gap: 10, marginBottom: 20 },
    badgeOk:   { background: '#d1fae5', color: '#065f46', padding: '4px 12px',
                 borderRadius: 999, fontSize: 13, fontWeight: 600 },
    badgeNo:   { background: '#fee2e2', color: '#991b1b', padding: '4px 12px',
                 borderRadius: 999, fontSize: 13, fontWeight: 600 },
    alertOk:   { background: '#d1fae5', color: '#065f46', padding: '10px 14px',
                 borderRadius: 10, fontSize: 13, fontWeight: 500, marginBottom: 12 },
    alertErr:  { background: '#fee2e2', color: '#991b1b', padding: '10px 14px',
                 borderRadius: 10, fontSize: 13, fontWeight: 500, marginBottom: 12 },
    card:      { background: '#fff', borderRadius: 10, padding: '18px 20px',
                 boxShadow: '0 1px 4px rgba(0,0,0,.08)', marginBottom: 14 },
    cardTitle: { fontWeight: 700, fontSize: 15, color: '#111827', marginBottom: 6 },
    cardDesc:  { fontSize: 13, color: '#475569', marginBottom: 14, lineHeight: 1.5 },
    lbl:       { fontSize: 13, fontWeight: 600, color: '#475569', marginBottom: 4, display: 'block' },
    inp:       { width: '100%', padding: '8px 11px', border: '1px solid #d1d5db',
                 borderRadius: 10, fontSize: 14, boxSizing: 'border-box', marginBottom: 12 },
    btnPrimary:  { padding: '9px 20px', background: '#3b9ede', color: '#fff',
                   border: 'none', borderRadius: 10, cursor: 'pointer', fontWeight: 600, fontSize: 14 },
    btnSecondary:{ padding: '9px 20px', background: '#f8fafc', color: '#475569',
                   border: 'none', borderRadius: 10, cursor: 'pointer', fontWeight: 600, fontSize: 14 },
    btnDanger:   { padding: '8px 18px', background: '#e25252', color: '#fff',
                   border: 'none', borderRadius: 10, cursor: 'pointer', fontWeight: 600, fontSize: 13 },
    infoRow:   { display: 'flex', gap: 10, marginBottom: 6, alignItems: 'center' },
    infoLabel: { fontSize: 13, color: '#475569', minWidth: 120 },
    infoVal:   { fontSize: 13, color: '#111827', fontWeight: 600 },
    link:      { color: '#3b9ede' },
    divider:   { borderTop: '1px solid #f8fafc', margin: '18px 0' },
};
