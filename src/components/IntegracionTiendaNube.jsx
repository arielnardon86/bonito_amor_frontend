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

// Medios de pago conocidos de Tienda Nube -- 'value' es el slug canónico que
// también normaliza el backend (ver GATEWAY_TN_ALIASES en views.py) para las
// dos variantes que a veces manda Tienda Nube para un mismo procesador
// (ej. 'mercadopago'/'mercado_pago', 'decidir'/'payway'), así que da lo mismo
// cuál de las dos llegue en la orden real.
const GATEWAYS_TN = [
    { value: 'gocuotas', label: 'GOcuotas' },
    { value: 'pagonube', label: 'Pago Nube (nativo de Tiendanube)' },
    { value: 'mercadopago', label: 'Mercado Pago' },
    { value: 'decidir', label: 'Payway / Decidir' },
    { value: 'ualabis', label: 'Ualá Bis' },
    { value: 'getnet', label: 'Getnet' },
    { value: 'mobbex', label: 'Mobbex' },
    { value: 'nave', label: 'Nave (Galicia)' },
    { value: 'modo', label: 'MODO' },
    { value: '__otro__', label: 'Otro (especificar)' },
];

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

    const [facturar,    setFacturar]    = useState(false);

    // Aranceles Tienda Nube (tasa + IVA + CPT por gateway; a diferencia de ML acá
    // no hay modo "automático" -- TN no informa el cargo real en el webhook)
    const [arancelesTN,            setArancelesTN]            = useState([]);
    const [showArancelTNForm,      setShowArancelTNForm]      = useState(false);
    const [showEditArancelTNModal, setShowEditArancelTNModal] = useState(false);
    const [editArancelTNData,      setEditArancelTNData]      = useState(null);
    const arancelTNFormVacio = { gateway: '', gateway_nombre: '', criterio: '', tasa_porcentaje: '0.00', iva_porcentaje: '21.00', cpt_porcentaje: '0.00' };
    const [arancelTNForm, setArancelTNForm] = useState(arancelTNFormVacio);
    const [selKeyGatewayTN, setSelKeyGatewayTN] = useState('');

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

    const fetchArancelesTN = useCallback(async () => {
        if (!token || !selectedStoreSlug) return;
        try {
            const res = await axios.get(`${BASE}/api/aranceles-tn/?tienda_slug=${selectedStoreSlug}`, { headers });
            setArancelesTN(res.data.results || res.data);
        } catch { setArancelesTN([]); }
    }, [token, selectedStoreSlug]); // eslint-disable-line react-hooks/exhaustive-deps

    useEffect(() => {
        if (!isAuthenticated || !token) { setLoading(false); return; }
        obtenerTiendaId().then(id => {
            setTiendaId(id);
            if (id) Promise.all([fetchTienda(id), fetchStatus(id), fetchArancelesTN()]).finally(() => setLoading(false));
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

    // ── Aranceles Tienda Nube (tasa + IVA + CPT por gateway) ──────────────────
    const handleArancelTNFormChange = (e) => {
        const { name, value } = e.target;
        setArancelTNForm(f => ({ ...f, [name]: value }));
    };

    const handleCreateArancelTN = async (e) => {
        e.preventDefault();
        try {
            await axios.post(`${BASE}/api/aranceles-tn/`, {
                gateway: arancelTNForm.gateway,
                gateway_nombre: arancelTNForm.gateway_nombre,
                criterio: arancelTNForm.criterio,
                tasa_porcentaje: parseFloat(arancelTNForm.tasa_porcentaje) || 0,
                iva_porcentaje: parseFloat(arancelTNForm.iva_porcentaje) || 0,
                cpt_porcentaje: parseFloat(arancelTNForm.cpt_porcentaje) || 0,
                tienda: selectedStoreSlug,
            }, { headers });
            showSuccess('Arancel de Tienda Nube creado.');
            setShowArancelTNForm(false);
            setArancelTNForm(arancelTNFormVacio);
            fetchArancelesTN();
        } catch (err) {
            const data = err.response?.data;
            showError(data?.detail || data?.non_field_errors?.[0] || (typeof data === 'object' ? Object.values(data).flat().join(' ') : 'Error al crear el arancel.'));
        }
    };

    const handleEditArancelTN = (arancel) => {
        const aTexto = (v) => v != null ? v.toString() : '0.00';
        setEditArancelTNData({
            id: arancel.id,
            gateway: arancel.gateway,
            gateway_nombre: arancel.gateway_nombre || '',
            criterio: arancel.criterio || '',
            tasa_porcentaje: aTexto(arancel.tasa_porcentaje),
            iva_porcentaje: aTexto(arancel.iva_porcentaje),
            cpt_porcentaje: aTexto(arancel.cpt_porcentaje),
        });
        setShowEditArancelTNModal(true);
    };

    const handleUpdateArancelTN = async () => {
        try {
            await axios.patch(`${BASE}/api/aranceles-tn/${editArancelTNData.id}/`, {
                gateway: editArancelTNData.gateway,
                gateway_nombre: editArancelTNData.gateway_nombre,
                criterio: editArancelTNData.criterio,
                tasa_porcentaje: parseFloat(editArancelTNData.tasa_porcentaje) || 0,
                iva_porcentaje: parseFloat(editArancelTNData.iva_porcentaje) || 0,
                cpt_porcentaje: parseFloat(editArancelTNData.cpt_porcentaje) || 0,
                tienda: selectedStoreSlug,
            }, { headers });
            showSuccess('Arancel de Tienda Nube actualizado.');
            setShowEditArancelTNModal(false);
            setEditArancelTNData(null);
            fetchArancelesTN();
        } catch (err) {
            showError(err.response?.data?.detail || 'Error al actualizar el arancel.');
        }
    };

    const handleDeleteArancelTN = async (arancelId) => {
        const result = await Swal.fire({
            title: '¿Eliminar este arancel?',
            text: 'Esta acción no se puede deshacer.',
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#e25252',
            cancelButtonColor: '#475569',
            confirmButtonText: 'Sí, eliminar',
            cancelButtonText: 'Cancelar',
        });
        if (!result.isConfirmed) return;
        try {
            await axios.delete(`${BASE}/api/aranceles-tn/${arancelId}/`, { headers });
            showSuccess('Arancel eliminado.');
            fetchArancelesTN();
        } catch (err) {
            showError(err.response?.data?.detail || 'Error al eliminar el arancel.');
        }
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
                        Para vincular manualmente un producto que ya creaste vos mismo en Tienda Nube, editalo en Gestión de Productos e ingresá su ID de producto de Tienda Nube.
                    </p>
                </div>
            )}

            {/* Paso 4 — Aranceles Tienda Nube */}
            {conectado && (
                <div style={s.card}>
                    <div style={s.cardTitle}>Paso 4 — Aranceles Tienda Nube</div>
                    <p style={s.cardDesc}>
                        Cargá acá la tasa, el IVA y el CPT de cada medio de pago (los ves en tu panel de Tienda Nube,
                        en "Medios de pago"). A diferencia de Mercado Libre, Tienda Nube no informa el cargo real
                        cobrado en cada venta, así que esta estimación siempre es manual.
                    </p>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10, flexWrap: 'wrap', gap: 8 }}>
                        <span style={{ fontWeight: 700, fontSize: 13, color: '#111827' }}>Aranceles configurados</span>
                        <button
                            type="button"
                            style={s.btnPrimary}
                            onClick={() => { setArancelTNForm(arancelTNFormVacio); setSelKeyGatewayTN(''); setShowArancelTNForm(true); }}
                        >
                            + Nuevo arancel
                        </button>
                    </div>

                    {showArancelTNForm && (
                        <form onSubmit={handleCreateArancelTN} style={{ marginBottom: 16 }}>
                            <label style={s.lbl}>Medio de pago *</label>
                            <select
                                value={selKeyGatewayTN}
                                onChange={(e) => {
                                    const key = e.target.value;
                                    setSelKeyGatewayTN(key);
                                    const conocido = GATEWAYS_TN.find(g => g.value === key);
                                    if (key === '__otro__') {
                                        setArancelTNForm(f => ({ ...f, gateway: '', gateway_nombre: '' }));
                                    } else if (conocido) {
                                        setArancelTNForm(f => ({ ...f, gateway: conocido.value, gateway_nombre: conocido.label }));
                                    }
                                }}
                                required
                                style={s.inp}
                            >
                                <option value="" disabled>Seleccionar medio de pago...</option>
                                {GATEWAYS_TN.map(g => <option key={g.value} value={g.value}>{g.label}</option>)}
                            </select>

                            {selKeyGatewayTN === '__otro__' && (
                                <>
                                    <label style={s.lbl}>Gateway (tal cual lo manda Tienda Nube)</label>
                                    <input
                                        type="text" name="gateway" value={arancelTNForm.gateway}
                                        onChange={handleArancelTNFormChange} required style={s.inp}
                                        placeholder="slug del medio de pago"
                                    />

                                    <label style={s.lbl}>Nombre para mostrar</label>
                                    <input
                                        type="text" name="gateway_nombre" value={arancelTNForm.gateway_nombre}
                                        onChange={handleArancelTNFormChange} style={s.inp}
                                        placeholder="Nombre del medio de pago"
                                    />
                                </>
                            )}

                            <label style={s.lbl}>Se aplica a</label>
                            <select name="criterio" value={arancelTNForm.criterio} onChange={handleArancelTNFormChange} style={s.inp}>
                                <option value="">Todos los medios</option>
                                <option value="DEBITO">Solo tarjeta de débito</option>
                                <option value="CREDITO">Solo tarjeta de crédito</option>
                                <option value="TRANSFERENCIA">Transferencia bancaria</option>
                                <option value="BILLETERA">Billetera virtual</option>
                            </select>
                            <p style={{ ...s.cardDesc, marginTop: -8 }}>
                                Dejá "Todos los medios" salvo que este gateway cobre distinto según el medio de pago (ej. MODO,
                                que cobra distinto en débito y crédito) — en ese caso cargá una fila para cada uno.
                            </p>

                            <label style={s.lbl}>Tasa (%)</label>
                            <input type="number" name="tasa_porcentaje" value={arancelTNForm.tasa_porcentaje}
                                   onChange={handleArancelTNFormChange} min="0" max="100" step="0.01" style={s.inp} />

                            <label style={s.lbl}>IVA (%)</label>
                            <input type="number" name="iva_porcentaje" value={arancelTNForm.iva_porcentaje}
                                   onChange={handleArancelTNFormChange} min="0" max="100" step="0.01" style={s.inp} />

                            <label style={s.lbl}>CPT (%) — costo por cobrar el dinero antes</label>
                            <input type="number" name="cpt_porcentaje" value={arancelTNForm.cpt_porcentaje}
                                   onChange={handleArancelTNFormChange} min="0" max="100" step="0.01" style={s.inp} />

                            <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                                <button type="submit" style={s.btnPrimary}>Crear</button>
                                <button type="button" style={s.btnSecondary} onClick={() => setShowArancelTNForm(false)}>Cancelar</button>
                            </div>
                        </form>
                    )}

                    <div style={{ overflowX: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                            <thead>
                                <tr>
                                    <th style={s.th}>Gateway</th>
                                    <th style={s.th}>Se aplica a</th>
                                    <th style={s.th}>Tasa</th>
                                    <th style={s.th}>IVA</th>
                                    <th style={s.th}>CPT</th>
                                    <th style={s.th}></th>
                                </tr>
                            </thead>
                            <tbody>
                                {arancelesTN.length === 0 ? (
                                    <tr><td colSpan="6" style={s.td}>No hay aranceles configurados.</td></tr>
                                ) : (
                                    arancelesTN.map(a => (
                                        <tr key={a.id}>
                                            <td style={s.td}>{a.gateway_nombre || a.gateway}</td>
                                            <td style={s.td}>{a.criterio_display || 'Todos los medios'}</td>
                                            <td style={s.td}>{parseFloat(a.tasa_porcentaje || 0).toFixed(2)}%</td>
                                            <td style={s.td}>{parseFloat(a.iva_porcentaje || 0).toFixed(2)}%</td>
                                            <td style={s.td}>{parseFloat(a.cpt_porcentaje || 0).toFixed(2)}%</td>
                                            <td style={{ ...s.td, whiteSpace: 'nowrap' }}>
                                                <button type="button" style={s.btnIcono} onClick={() => handleEditArancelTN(a)} title="Editar">✏️</button>
                                                <button type="button" style={s.btnIcono} onClick={() => handleDeleteArancelTN(a.id)} title="Eliminar">🗑️</button>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Modal editar arancel Tienda Nube */}
            {showEditArancelTNModal && editArancelTNData && (
                <div style={s.overlay}>
                    <div style={{ ...s.card, maxWidth: 420, width: '100%', margin: 0 }}>
                        <div style={s.cardTitle}>Editar arancel Tienda Nube</div>

                        <label style={s.lbl}>Se aplica a</label>
                        <select
                            value={editArancelTNData.criterio}
                            onChange={e => setEditArancelTNData({ ...editArancelTNData, criterio: e.target.value })}
                            style={s.inp}
                        >
                            <option value="">Todos los medios</option>
                            <option value="DEBITO">Solo tarjeta de débito</option>
                            <option value="CREDITO">Solo tarjeta de crédito</option>
                            <option value="TRANSFERENCIA">Transferencia bancaria</option>
                            <option value="BILLETERA">Billetera virtual</option>
                        </select>

                        <label style={s.lbl}>Tasa (%)</label>
                        <input type="number" value={editArancelTNData.tasa_porcentaje}
                               onChange={e => setEditArancelTNData({ ...editArancelTNData, tasa_porcentaje: e.target.value })}
                               min="0" max="100" step="0.01" style={s.inp} />

                        <label style={s.lbl}>IVA (%)</label>
                        <input type="number" value={editArancelTNData.iva_porcentaje}
                               onChange={e => setEditArancelTNData({ ...editArancelTNData, iva_porcentaje: e.target.value })}
                               min="0" max="100" step="0.01" style={s.inp} />

                        <label style={s.lbl}>CPT (%)</label>
                        <input type="number" value={editArancelTNData.cpt_porcentaje}
                               onChange={e => setEditArancelTNData({ ...editArancelTNData, cpt_porcentaje: e.target.value })}
                               min="0" max="100" step="0.01" style={s.inp} />

                        <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                            <button style={s.btnPrimary} onClick={handleUpdateArancelTN}>Guardar</button>
                            <button style={s.btnSecondary} onClick={() => { setShowEditArancelTNModal(false); setEditArancelTNData(null); }}>Cancelar</button>
                        </div>
                    </div>
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
    btnPrimary:  { padding: '9px 20px', background: '#3b9ede', color: '#fff',
                   border: 'none', borderRadius: 10, cursor: 'pointer', fontWeight: 600, fontSize: 14 },
    btnSecondary:{ padding: '9px 20px', background: '#f8fafc', color: '#475569',
                   border: 'none', borderRadius: 10, cursor: 'pointer', fontWeight: 600, fontSize: 14 },
    btnDanger:   { padding: '8px 18px', background: '#e25252', color: '#fff',
                   border: 'none', borderRadius: 10, cursor: 'pointer', fontWeight: 600, fontSize: 13 },
    infoRow:   { display: 'flex', gap: 10, marginBottom: 6, alignItems: 'center' },
    infoLabel: { fontSize: 13, color: '#475569', minWidth: 120 },
    infoVal:   { fontSize: 13, color: '#111827', fontWeight: 600 },
    inp:       { width: '100%', padding: '9px 12px', border: '1px solid #e2e8f0', borderRadius: 8,
                 fontSize: 14, marginBottom: 12, boxSizing: 'border-box' },
    th:        { textAlign: 'left', padding: '8px 10px', borderBottom: '2px solid #e2e8f0',
                 color: '#475569', fontSize: 12, fontWeight: 700, whiteSpace: 'nowrap' },
    td:        { padding: '8px 10px', borderBottom: '1px solid #f1f5f9', color: '#111827' },
    btnIcono:  { background: 'none', border: 'none', cursor: 'pointer', fontSize: 15, padding: '2px 6px' },
    overlay:   { position: 'fixed', inset: 0, background: 'rgba(15,23,42,.5)', display: 'flex',
                 alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 16 },
};
