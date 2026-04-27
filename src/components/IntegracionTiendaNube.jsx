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

    const popupRef   = useRef(null);
    const intervalRef = useRef(null);

    const headers = { Authorization: `Bearer ${token}` };

    const showSuccess = (msg) => { setSuccessMsg(msg); setTimeout(() => setSuccessMsg(''), 5000); };
    const showError   = (msg) => { setError(msg);      setTimeout(() => setError(null),    6000); };

    // ── ID de tienda ──────────────────────────────────────────────────────────
    const obtenerTiendaId = useCallback(async () => {
        if (!selectedStoreSlug || !token) return null;
        if (Array.isArray(stores) && stores.length > 0) {
            const found = stores.find(s => s.nombre === selectedStoreSlug);
            if (found?.id) return found.id;
        }
        try {
            const res  = await axios.get(`${BASE}/api/tiendas/`, { headers });
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

    // ── Limpiar listeners al desmontar ────────────────────────────────────────
    useEffect(() => {
        return () => {
            clearInterval(intervalRef.current);
            window.removeEventListener('message', handleMessage);
        };
    }, []); // eslint-disable-line

    // ── Conectar vía popup ────────────────────────────────────────────────────
    const handleMessage = useCallback((event) => {
        if (event.data?.type === 'TN_INSTALL_SUCCESS') {
            window.removeEventListener('message', handleMessage);
            clearInterval(intervalRef.current);
            setConectando(false);

            const id = tiendaId;
            if (id) fetchStatus(id);
            showSuccess(`¡Tienda Nube conectada! (${event.data.nombre})`);
        }
        if (event.data?.type === 'TN_INSTALL_ERROR') {
            window.removeEventListener('message', handleMessage);
            clearInterval(intervalRef.current);
            setConectando(false);
            showError('Error al conectar con Tienda Nube: ' + (event.data.error || ''));
        }
    }, [tiendaId, fetchStatus]); // eslint-disable-line

    const handleConectar = () => {
        setConectando(true);
        setError(null);

        window.addEventListener('message', handleMessage);

        const popup = window.open(TN_AUTH_URL, 'tn_oauth', 'width=620,height=720');
        popupRef.current = popup;

        // Fallback: si el popup se cierra sin enviar mensaje
        intervalRef.current = setInterval(() => {
            if (popup?.closed) {
                clearInterval(intervalRef.current);
                window.removeEventListener('message', handleMessage);
                setConectando(false);
            }
        }, 800);
    };

    // ── Registrar webhook ─────────────────────────────────────────────────────
    const handleRegistrarWebhook = async () => {
        if (!tiendaId) return;
        setRegistrando(true);
        try {
            const res = await axios.post(
                `${BASE}/api/tiendas/${tiendaId}/tiendanube/register-webhook/`, {}, { headers }
            );
            await fetchStatus(tiendaId);
            showSuccess(`Webhook registrado (ID: ${res.data.webhook_id})`);
        } catch (e) {
            showError(e.response?.data?.error || 'Error al registrar el webhook.');
        } finally { setRegistrando(false); }
    };

    // ── Sincronización de productos ───────────────────────────────────────────
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
            text: 'Se traerán todos los productos de tu tienda online y se vincularán por SKU o nombre.',
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

    // ── Desconectar ───────────────────────────────────────────────────────────
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

            {/* Conexión */}
            {!conectado ? (
                <div style={s.card}>
                    <div style={s.cardTitle}>Conectar con Tienda Nube</div>
                    <p style={s.cardDesc}>
                        Hacé clic en el botón para autorizar Total Stock en tu tienda.
                        Se abrirá una ventana de Tienda Nube — una vez que apruebes,
                        la conexión queda lista automáticamente.
                    </p>
                    <button
                        style={{ ...s.btnTN, opacity: conectando ? 0.7 : 1 }}
                        onClick={handleConectar}
                        disabled={conectando}
                    >
                        {conectando ? (
                            'Esperando autorización…'
                        ) : (
                            <>
                                <img src="/tiendanube-icon.png" alt=""
                                     style={{ width: 20, height: 20, borderRadius: 4, marginRight: 8 }}
                                     onError={e => { e.target.style.display = 'none'; }} />
                                Conectar con Tienda Nube
                            </>
                        )}
                    </button>
                </div>
            ) : (
                <>
                    {/* Info conexión */}
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

                    {/* Sincronización */}
                    <div style={s.card}>
                        <div style={s.cardTitle}>Sincronización de productos</div>
                        <p style={s.cardDesc}>
                            Publicá los productos de Total Stock en tu tienda online,
                            importá los existentes o actualizá el stock.
                        </p>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
                            <button style={s.btnPrimary} onClick={handleExportarProductos} disabled={exportando}
                                    title="Publica en Tienda Nube los productos que aún no están allí.">
                                {exportando ? 'Publicando…' : '↑ Publicar productos'}
                            </button>
                            <button style={s.btnSecondary} onClick={handleImportarProductos} disabled={importando}
                                    title="Trae los productos de Tienda Nube y los vincula por SKU o nombre.">
                                {importando ? 'Importando…' : '↓ Importar desde TN'}
                            </button>
                            <button style={s.btnSecondary} onClick={handleSyncStockTN} disabled={sincStockTN}
                                    title="Envía el stock actual de Total Stock a todos los productos vinculados.">
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
    cardDesc:  { fontSize: 13, color: '#6b7280', marginBottom: 16, lineHeight: 1.5 },
    btnTN: {
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '12px 24px', background: '#00b1ea', color: '#fff',
        border: 'none', borderRadius: 10, cursor: 'pointer',
        fontWeight: 700, fontSize: 15, width: '100%',
        transition: 'opacity 0.2s',
    },
    btnPrimary:  { padding: '9px 18px', background: '#2563eb', color: '#fff',
                   border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 600, fontSize: 14 },
    btnSecondary:{ padding: '9px 18px', background: '#f3f4f6', color: '#374151',
                   border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 600, fontSize: 14 },
    btnDanger:   { padding: '9px 18px', background: '#dc2626', color: '#fff',
                   border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 600, fontSize: 13 },
    infoRow:   { display: 'flex', gap: 10, marginBottom: 6, alignItems: 'center' },
    infoLabel: { fontSize: 13, color: '#6b7280', minWidth: 120 },
    infoVal:   { fontSize: 13, color: '#111827', fontWeight: 600 },
};
