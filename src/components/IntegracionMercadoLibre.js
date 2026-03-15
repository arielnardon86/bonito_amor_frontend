// frontend/src/components/IntegracionMercadoLibre.js
import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../AuthContext';
import axios from 'axios';
import Swal from 'sweetalert2';
import ImportarProductosSeleccionadosML from './ImportarProductosSeleccionadosML';

const normalizeApiUrl = (url) => {
    if (!url) {
        return 'http://localhost:8000';
    }
    let normalizedUrl = url;
    if (normalizedUrl.endsWith('/api/') || normalizedUrl.endsWith('/api')) {
        normalizedUrl = normalizedUrl.replace(/\/api\/?$/, '');
    }
    if (normalizedUrl.endsWith('/')) {
        normalizedUrl = normalizedUrl.slice(0, -1);
    }
    return normalizedUrl;
};

const BASE_API_ENDPOINT = normalizeApiUrl(process.env.REACT_APP_API_URL || 'http://localhost:8000');

const IntegracionMercadoLibre = () => {
    const { token, isAuthenticated, selectedStoreSlug, stores } = useAuth();
    const [tienda, setTienda] = useState(null);
    const [tiendaId, setTiendaId] = useState(null);
    const [mlStatus, setMlStatus] = useState(null);
    const [loading, setLoading] = useState(true);
    const [sincronizando, setSincronizando] = useState(false);
    const [desconectando, setDesconectando] = useState(false);
    const [error, setError] = useState(null);
    const [authUrl, setAuthUrl] = useState(null);

    // Obtener el ID de la tienda desde stores o haciendo una búsqueda
    const obtenerTiendaId = useCallback(async () => {
        if (!selectedStoreSlug || !token) {
            setLoading(false);
            return null;
        }

        // Intentar obtener el ID desde stores si está disponible
        if (Array.isArray(stores) && stores.length > 0) {
            const tiendaEncontrada = stores.find(s => s.nombre === selectedStoreSlug);
            if (tiendaEncontrada?.id) {
                return tiendaEncontrada.id;
            }
        }

        // Si no está en stores, buscar por slug en la API
        try {
            const response = await axios.get(`${BASE_API_ENDPOINT}/api/tiendas/`, {
                headers: { 'Authorization': `Bearer ${token}` },
                params: { nombre: selectedStoreSlug }
            });
            const tiendas = response.data.results || response.data;
            if (Array.isArray(tiendas) && tiendas.length > 0) {
                const tiendaEncontrada = tiendas.find(t => t.nombre === selectedStoreSlug);
                if (tiendaEncontrada?.id) {
                    return tiendaEncontrada.id;
                }
            }
        } catch (err) {
            console.error('Error buscando tienda:', err);
        }

        return null;
    }, [selectedStoreSlug, token, stores]);

    // Cargar información de la tienda
    const fetchTienda = useCallback(async () => {
        if (!token || !tiendaId) {
            return;
        }

        try {
            const response = await axios.get(`${BASE_API_ENDPOINT}/api/tiendas/${tiendaId}/`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            setTienda(response.data);
        } catch (err) {
            setError('Error al cargar información de la tienda: ' + (err.response?.data?.error || err.message));
            console.error('Error fetching tienda:', err);
        }
    }, [token, tiendaId]);

    // Cargar estado de integración ML
    const fetchMLStatus = useCallback(async () => {
        if (!token || !tiendaId) {
            setLoading(false);
            return;
        }

        try {
            const response = await axios.get(`${BASE_API_ENDPOINT}/api/tiendas/${tiendaId}/mercadolibre/status/`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            setMlStatus(response.data);
        } catch (err) {
            console.error('Error fetching ML status:', err);
            setMlStatus({
                plataforma_ecommerce: 'NINGUNA',
                authenticated: false
            });
        } finally {
            setLoading(false);
        }
    }, [token, tiendaId]);

    // Efecto para obtener el ID de la tienda al inicio
    useEffect(() => {
        if (isAuthenticated && selectedStoreSlug && token) {
            obtenerTiendaId().then(id => {
                if (id) {
                    setTiendaId(id);
                } else {
                    setLoading(false);
                    setError('No se pudo encontrar la tienda seleccionada');
                }
            });
        } else {
            setLoading(false);
        }
    }, [isAuthenticated, selectedStoreSlug, token, obtenerTiendaId]);

    // Efecto para cargar datos cuando tenemos el ID
    useEffect(() => {
        if (isAuthenticated && tiendaId && token) {
            fetchTienda();
            fetchMLStatus();
        }
    }, [isAuthenticated, tiendaId, token, fetchTienda, fetchMLStatus]);

    // Iniciar proceso de autenticación OAuth
    const handleIniciarOAuth = async () => {
        if (!tiendaId) {
            Swal.fire('Error', 'No se encontró la tienda', 'error');
            return;
        }

        try {
            const response = await axios.get(
                `${BASE_API_ENDPOINT}/api/tiendas/${tiendaId}/mercadolibre/auth-url/`,
                { headers: { 'Authorization': `Bearer ${token}` } }
            );
            
            if (response.data.auth_url) {
                setAuthUrl(response.data.auth_url);
                
                // Configurar listener para recibir mensajes de la ventana popup
                const messageHandler = async (event) => {
                    // Verificar que el mensaje sea del tipo esperado
                    if (event.data && event.data.type === 'ML_OAUTH_SUCCESS') {
                        // Remover el listener
                        window.removeEventListener('message', messageHandler);
                        
                        // Mostrar mensaje de éxito
                        Swal.fire({
                            icon: 'success',
                            title: 'Autenticación exitosa',
                            text: 'La integración con Mercado Libre se configuró correctamente.',
                            timer: 2000,
                            showConfirmButton: false
                        });
                        
                        // Recargar el estado de ML
                        await fetchMLStatus();
                        await fetchTienda();
                    }
                };
                
                window.addEventListener('message', messageHandler);
                
                // Abrir la URL en una nueva ventana
                const popup = window.open(response.data.auth_url, '_blank', 'width=600,height=700');
                
                // Verificar si la ventana se cerró manualmente (sin mensaje)
                const checkClosed = setInterval(() => {
                    if (popup.closed) {
                        clearInterval(checkClosed);
                        window.removeEventListener('message', messageHandler);
                    }
                }, 1000);
                
                Swal.fire({
                    title: 'Autorización en proceso',
                    html: `
                        <p>Se abrió una ventana para autorizar la integración con Mercado Libre.</p>
                        <p>Por favor, completa la autorización en la ventana que se abrió.</p>
                        <p>La ventana se cerrará automáticamente cuando la autorización sea exitosa.</p>
                    `,
                    icon: 'info',
                    showConfirmButton: true,
                    confirmButtonText: 'Entendido'
                });
            }
        } catch (err) {
            const errorMsg = err.response?.data?.error || err.message;
            Swal.fire('Error', `Error al obtener URL de autorización: ${errorMsg}`, 'error');
            console.error('Error iniciando OAuth:', err);
        }
    };

    // Desconectar integración ML (borra tokens para poder reconectar con otra cuenta/App)
    const handleDesconectar = async () => {
        if (!tiendaId) return;
        const confirm = await Swal.fire({
            title: '¿Desconectar Mercado Libre?',
            text: 'Se borrarán los tokens. Podés volver a conectar la misma u otra cuenta después.',
            icon: 'question',
            showCancelButton: true,
            confirmButtonText: 'Sí, desconectar',
            cancelButtonText: 'Cancelar'
        });
        if (!confirm.isConfirmed) return;
        setDesconectando(true);
        try {
            await axios.post(
                `${BASE_API_ENDPOINT}/api/tiendas/${tiendaId}/mercadolibre/disconnect/`,
                {},
                { headers: { 'Authorization': `Bearer ${token}` } }
            );
            Swal.fire('Listo', 'Integración desconectada. Podés volver a autorizar cuando quieras.', 'success');
            await fetchMLStatus();
            await fetchTienda();
        } catch (err) {
            const errorMsg = err.response?.data?.error || err.message;
            Swal.fire('Error', `Error al desconectar: ${errorMsg}`, 'error');
        } finally {
            setDesconectando(false);
        }
    };

    const [mostrarModalImportarSeleccionados, setMostrarModalImportarSeleccionados] = useState(false);

    // Importar productos seleccionados desde ML
    const handleImportarSeleccionados = async (mlItemIds) => {
        if (!tiendaId || !mlItemIds?.length) return;
        setSincronizando(true);
        try {
            Swal.fire({ title: 'Importando productos...', allowOutsideClick: false, didOpen: () => { Swal.showLoading(); } });
            const response = await axios.post(
                `${BASE_API_ENDPOINT}/api/tiendas/${tiendaId}/mercadolibre/import-products/`,
                { ml_item_ids: mlItemIds },
                { headers: { 'Authorization': `Bearer ${token}` }, timeout: 300000 }
            );
            const { success, actualizados, errors, results } = response.data;
            let detallesHtml = '';
            if (results?.details?.length) {
                detallesHtml = '<ul style="text-align: left; max-height: 300px; overflow-y: auto;">';
                results.details.slice(0, 25).forEach(d => {
                    const icon = d.status === 'success' ? '✅' : '❌';
                    detallesHtml += `<li style="margin: 5px 0;">${icon} <strong>${d.nombre || d.ml_item_id}</strong>: ${d.message}</li>`;
                });
                if (results.details.length > 25) detallesHtml += `<li><em>... y ${results.details.length - 25} más</em></li>`;
                detallesHtml += '</ul>';
            }
            Swal.fire({
                title: 'Importación completada',
                html: `<p><strong>Nuevos:</strong> ${success} · <strong>Actualizados:</strong> ${actualizados || 0} · <strong>Errores:</strong> ${errors}</p>${detallesHtml}`,
                icon: errors === 0 ? 'success' : 'warning',
                width: '550px'
            });
            await fetchTienda();
        } catch (err) {
            const data = err.response?.data || {};
            if (data.reconnect_required) {
                Swal.fire({ title: 'Reconectar Mercado Libre', text: data.error, icon: 'warning' });
                await fetchMLStatus();
            } else {
                Swal.fire('Error', data.error || err.message || 'Error al importar', 'error');
            }
        } finally {
            setSincronizando(false);
        }
    };

    // Actualizar precios y stock de productos existentes desde ML
    const handleActualizarExistentes = async () => {
        if (!tiendaId) return;
        setSincronizando(true);
        try {
            Swal.fire({ title: 'Actualizando productos existentes...', allowOutsideClick: false, didOpen: () => { Swal.showLoading(); } });
            const response = await axios.post(
                `${BASE_API_ENDPOINT}/api/tiendas/${tiendaId}/mercadolibre/update-existing-products/`,
                {},
                { headers: { 'Authorization': `Bearer ${token}` }, timeout: 120000 }
            );
            const { success, errors, details } = response.data;
            let html = `<p><strong>Actualizados:</strong> ${success} · <strong>Errores:</strong> ${errors}</p>`;
            if (details?.length) {
                html += '<ul style="text-align: left; max-height: 250px; overflow-y: auto;">';
                details.slice(0, 20).forEach(d => { html += `<li>${d.status === 'success' ? '✅' : '❌'} ${d.nombre}: ${d.message}</li>`; });
                if (details.length > 20) html += `<li><em>... y ${details.length - 20} más</em></li>`;
                html += '</ul>';
            }
            Swal.fire({ title: 'Actualización completada', html, icon: errors === 0 ? 'success' : 'warning', width: '500px' });
            await fetchTienda();
        } catch (err) {
            const data = err.response?.data || {};
            if (data.reconnect_required) {
                Swal.fire({ title: 'Reconectar Mercado Libre', text: data.error, icon: 'warning' });
                await fetchMLStatus();
            } else {
                Swal.fire('Error', data.error || err.message || 'Error al actualizar', 'error');
            }
        } finally {
            setSincronizando(false);
        }
    };

    // Actualizar stock de Total Stock hacia Mercado Libre (solo stock, no precio)
    const handleActualizarStock = async () => {
        if (!tiendaId) return;

        setSincronizando(true);
        try {
            Swal.fire({
                title: 'Actualizando stock...',
                allowOutsideClick: false,
                didOpen: () => {
                    Swal.showLoading();
                }
            });

            const response = await axios.post(
                `${BASE_API_ENDPOINT}/api/tiendas/${tiendaId}/mercadolibre/sync-stock/`,
                {},
                { 
                    headers: { 'Authorization': `Bearer ${token}` },
                    timeout: 300000 // 5 minutos de timeout
                }
            );

            const { success, errors, details } = response.data;

            let detallesHtml = '<ul style="text-align: left; max-height: 400px; overflow-y: auto;">';
            details.forEach(detail => {
                if (detail.status === 'success') {
                    detallesHtml += `<li style="color: green; margin-bottom: 8px;">
                        ✅ <strong>${detail.nombre}</strong>: ${detail.message}
                    </li>`;
                } else {
                    detallesHtml += `<li style="color: red; margin-bottom: 8px;">
                        ❌ <strong>${detail.nombre}</strong>: ${detail.error || detail.message || 'Error desconocido'}
                    </li>`;
                }
            });
            detallesHtml += '</ul>';

            Swal.fire({
                title: 'Stock actualizado',
                html: `
                    <p><strong>Resultados:</strong></p>
                    <p>✅ Exitosos: ${success}</p>
                    <p>❌ Errores: ${errors}</p>
                    ${details.length > 0 ? `<p><strong>Detalles:</strong></p>${detallesHtml}` : ''}
                `,
                icon: errors === 0 ? 'success' : (success > 0 ? 'warning' : 'error'),
                width: '600px'
            });

        } catch (err) {
            let errorMsg = 'Error desconocido';
            if (err.response?.data?.error) {
                errorMsg = err.response.data.error;
            } else if (err.response?.data?.message) {
                errorMsg = err.response.data.message;
            } else if (err.message) {
                errorMsg = err.message;
            }
            Swal.fire('Error', `Error al actualizar stock: ${errorMsg}`, 'error');
            console.error('Error actualizando stock:', err);
        } finally {
            setSincronizando(false);
        }
    };

    // Actualizar configuración de sincronización
    const handleActualizarConfig = async (field, value) => {
        if (!tiendaId) return;

        try {
            await axios.patch(
                `${BASE_API_ENDPOINT}/api/tiendas/${tiendaId}/`,
                { [field]: value },
                { headers: { 'Authorization': `Bearer ${token}` } }
            );
            await fetchTienda();
            await fetchMLStatus();
        } catch (err) {
            Swal.fire('Error', `Error al actualizar configuración: ${err.response?.data?.error || err.message}`, 'error');
        }
    };

    if (loading) {
        return (
            <div style={{ padding: '20px', textAlign: 'center', color: '#4a6660' }}>
                <p>Cargando información...</p>
            </div>
        );
    }

    if (!tiendaId) {
        return (
            <div style={{ padding: '20px', textAlign: 'center', color: '#4a6660' }}>
                <p>No se encontró la tienda seleccionada.</p>
            </div>
        );
    }

    const isAutenticado = mlStatus?.authenticated === true;

    return (
        <div style={{ padding: 0, width: '100%', maxWidth: '100%' }}>
            <h1 style={{ marginBottom: '1.25rem', color: '#1a2926', fontSize: '1.5rem', fontWeight: 700 }}>Mercado Libre</h1>

            {error && (
                <div style={{
                    padding: '14px 16px',
                    backgroundColor: '#fef2f2',
                    border: '1px solid #fca5a5',
                    borderRadius: '10px',
                    marginBottom: '20px',
                    color: '#991b1b',
                    fontSize: '14px'
                }}>
                    {error}
                </div>
            )}

            {/* Estado de la integración */}
            <div style={{
                backgroundColor: '#f7faf9',
                padding: '20px 24px',
                borderRadius: '12px',
                marginBottom: '20px',
                border: '1px solid #d8eae4',
                boxShadow: '0 1px 3px rgba(0,0,0,.07)'
            }}>
                <h2 style={{ marginTop: 0, marginBottom: '0.75rem', fontSize: '1rem', fontWeight: 600, color: '#4a6660', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Estado de la integración</h2>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '14px', marginTop: '14px' }}>
                    <div>
                        <span style={{ fontSize: '12px', fontWeight: 600, color: '#8aa8a0', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Plataforma</span>
                        <p style={{ margin: '4px 0 0', color: '#1a2926', fontWeight: 500 }}>{mlStatus?.plataforma_ecommerce || 'No configurada'}</p>
                    </div>
                    <div>
                        <span style={{ fontSize: '12px', fontWeight: 600, color: '#8aa8a0', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Autenticación</span>
                        <p style={{ margin: '4px 0 0' }}>
                            {isAutenticado ? (
                                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '3px 10px', borderRadius: '9999px', fontSize: 12, fontWeight: 600, backgroundColor: '#edfaf3', color: '#1a6a40', border: '1px solid #a8e6c5' }}>✅ Autenticado</span>
                            ) : (
                                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '3px 10px', borderRadius: '9999px', fontSize: 12, fontWeight: 600, backgroundColor: '#fef2f2', color: '#991b1b', border: '1px solid #fca5a5' }}>❌ No autenticado</span>
                            )}
                        </p>
                    </div>
                    {mlStatus?.user_id && (
                        <div>
                            <span style={{ fontSize: '12px', fontWeight: 600, color: '#8aa8a0', textTransform: 'uppercase', letterSpacing: '0.04em' }}>User ID ML</span>
                            <p style={{ margin: '4px 0 0', color: '#1a2926', fontWeight: 500 }}>{mlStatus.user_id}</p>
                        </div>
                    )}
                    {mlStatus?.token_expires_at && (
                        <div>
                            <span style={{ fontSize: '12px', fontWeight: 600, color: '#8aa8a0', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Token expira</span>
                            <p style={{ margin: '4px 0 0', color: '#1a2926' }}>{new Date(mlStatus.token_expires_at).toLocaleString('es-AR')}</p>
                        </div>
                    )}
                </div>
                {isAutenticado && (
                    <div style={{ marginTop: '20px', paddingTop: '16px', borderTop: '1px solid #d8eae4' }}>
                        <p style={{ marginBottom: '12px', color: '#4a6660', fontSize: '13px' }}>
                            Si cambiaste de cuenta de Mercado Libre o de aplicación, desconectá y volvé a autorizar.
                        </p>
                        <button
                            type="button"
                            onClick={handleDesconectar}
                            disabled={desconectando}
                            style={{
                                display: 'inline-flex', alignItems: 'center', gap: 8,
                                padding: '9px 20px',
                                backgroundColor: desconectando ? '#d8eae4' : 'rgba(226,82,82,0.10)',
                                color: desconectando ? '#8aa8a0' : '#e25252',
                                border: '1px solid ' + (desconectando ? '#d8eae4' : 'rgba(226,82,82,0.3)'),
                                borderRadius: '10px',
                                cursor: desconectando ? 'not-allowed' : 'pointer',
                                fontSize: '14px', fontWeight: 600,
                                transition: 'all 0.18s ease'
                            }}
                        >
                            {desconectando ? 'Desconectando...' : 'Desconectar y reconectar'}
                        </button>
                        <div style={{ marginTop: '20px', paddingTop: '15px', borderTop: '1px solid #edf5f2' }}>
                            <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', fontSize: '14px', color: '#1a2926' }}>
                                <input
                                    type="checkbox"
                                    checked={tienda?.ml_facturar_ventas !== false}
                                    onChange={(e) => handleActualizarConfig('ml_facturar_ventas', e.target.checked)}
                                />
                                <span><strong>Facturar automáticamente</strong> las ventas de Mercado Libre</span>
                            </label>
                            <p style={{ margin: '8px 0 0 26px', fontSize: '12px', color: '#8aa8a0' }}>
                                Si está desactivado, las ventas se registran pero solo se emite recibo (no se genera factura electrónica AFIP/ARCA).
                            </p>
                        </div>
                    </div>
                )}
            </div>

            {/* Configuración OAuth */}
            {!isAutenticado && (
                <div style={{
                    backgroundColor: '#fffbeb',
                    padding: '20px 24px',
                    borderRadius: '12px',
                    marginBottom: '20px',
                    border: '1px solid #fcd34d',
                    boxShadow: '0 1px 3px rgba(0,0,0,.07)'
                }}>
                    <h3 style={{ marginTop: 0, color: '#92400e', fontSize: '1rem', fontWeight: 700 }}>Paso 1: Autenticación</h3>
                    <p style={{ color: '#4a6660', fontSize: '14px' }}>Para comenzar a usar la integración con Mercado Libre, necesitas autorizar la aplicación.</p>
                    <button
                        onClick={handleIniciarOAuth}
                        style={{
                            display: 'inline-flex', alignItems: 'center', gap: 8,
                            padding: '11px 24px',
                            backgroundColor: '#3483fa',
                            color: 'white',
                            border: 'none',
                            borderRadius: '10px',
                            cursor: 'pointer',
                            fontSize: '15px', fontWeight: 600,
                            marginTop: '12px',
                            boxShadow: '0 4px 12px rgba(52,131,250,0.30)',
                            transition: 'all 0.18s ease'
                        }}
                    >
                        Iniciar Autorización OAuth
                    </button>
                    {authUrl && (
                        <p style={{ marginTop: '15px', fontSize: '12px', color: '#8aa8a0' }}>
                            O copia y pega esta URL en tu navegador:<br />
                            <code style={{ wordBreak: 'break-all' }}>{authUrl}</code>
                        </p>
                    )}
                </div>
            )}

            {/* Configuración de sincronización */}
            {isAutenticado && (
                <>
                    {/* Desde Total Stock: solo actualizar stock a ML */}
                    <div style={{
                        backgroundColor: '#eff6ff',
                        padding: '20px 24px',
                        borderRadius: '12px',
                        marginBottom: '20px',
                        border: '1px solid #93c5fd',
                        boxShadow: '0 1px 3px rgba(0,0,0,.07)'
                    }}>
                        <h3 style={{ marginTop: 0, color: '#1e4a8a', fontSize: '1rem', fontWeight: 700 }}>Desde Total Stock hacia Mercado Libre</h3>
                        <p style={{ marginBottom: '16px', color: '#4a6660', fontSize: '14px' }}>
                            Si vendiste por otro canal y querés reflejar el stock actual en Mercado Libre, actualizalo acá. Solo se actualiza el stock (no el precio).
                        </p>
                        <button
                            onClick={handleActualizarStock}
                            disabled={sincronizando}
                            style={{
                                display: 'inline-flex', alignItems: 'center', gap: 8,
                                padding: '11px 24px',
                                backgroundColor: sincronizando ? '#d8eae4' : '#38a080',
                                color: sincronizando ? '#8aa8a0' : 'white',
                                border: 'none',
                                borderRadius: '10px',
                                cursor: sincronizando ? 'not-allowed' : 'pointer',
                                fontSize: '15px', fontWeight: 600,
                                boxShadow: sincronizando ? 'none' : '0 4px 12px rgba(56,160,128,0.25)',
                                transition: 'all 0.18s ease'
                            }}
                        >
                            {sincronizando ? 'Procesando...' : 'Actualizar stock a Mercado Libre'}
                        </button>
                    </div>

                    {/* Traer productos desde Mercado Libre */}
                    <div style={{
                        backgroundColor: '#edfaf3',
                        padding: '20px 24px',
                        borderRadius: '12px',
                        marginBottom: '20px',
                        border: '1px solid #a8e6c5',
                        boxShadow: '0 1px 3px rgba(0,0,0,.07)'
                    }}>
                        <h3 style={{ marginTop: 0, color: '#1a6a40', fontSize: '1rem', fontWeight: 700 }}>Traer productos a Total Stock</h3>
                        <p style={{ marginBottom: '16px', color: '#4a6660', fontSize: '14px' }}>
                            Importá tus productos publicados en Mercado Libre para vincularlos. Las ventas se registrarán automáticamente.
                        </p>
                        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
                            <button
                                onClick={() => setMostrarModalImportarSeleccionados(true)}
                                disabled={sincronizando}
                                style={{
                                    display: 'inline-flex', alignItems: 'center', gap: 8,
                                    padding: '11px 24px',
                                    background: sincronizando ? '#d8eae4' : 'linear-gradient(135deg, #5dc87a 0%, #38a080 100%)',
                                    color: sincronizando ? '#8aa8a0' : 'white',
                                    border: 'none',
                                    borderRadius: '10px',
                                    cursor: sincronizando ? 'not-allowed' : 'pointer',
                                    fontSize: '15px', fontWeight: 600,
                                    boxShadow: sincronizando ? 'none' : '0 4px 14px rgba(93,200,122,0.30)',
                                    transition: 'all 0.18s ease'
                                }}
                            >
                                {sincronizando ? 'Procesando...' : '📥 Importar productos'}
                            </button>
                            <button
                                onClick={handleActualizarExistentes}
                                disabled={sincronizando}
                                style={{
                                    display: 'inline-flex', alignItems: 'center', gap: 8,
                                    padding: '11px 24px',
                                    backgroundColor: sincronizando ? '#d8eae4' : '#3ab87a',
                                    color: sincronizando ? '#8aa8a0' : 'white',
                                    border: 'none',
                                    borderRadius: '10px',
                                    cursor: sincronizando ? 'not-allowed' : 'pointer',
                                    fontSize: '14px', fontWeight: 600,
                                    transition: 'all 0.18s ease'
                                }}
                            >
                                Actualizar precios y stock de existentes
                            </button>
                        </div>
                        <p style={{ marginTop: '12px', fontSize: '13px', color: '#4a6660' }}>
                            <strong>Importar productos:</strong> Elegí con checkboxes cuáles traer desde ML (incluye seleccionar todos).<br/>
                            <strong>Actualizar existentes:</strong> Refresca precio y stock de productos ya vinculados.
                        </p>
                    </div>
                </>
            )}

            {/* Información adicional */}
            <div style={{
                backgroundColor: '#f7faf9',
                padding: '16px 20px',
                borderRadius: '10px',
                border: '1px solid #d8eae4',
                fontSize: '13px',
                color: '#4a6660'
            }}>
                <h4 style={{ marginTop: 0, marginBottom: '10px', color: '#1a2926', fontSize: '0.875rem', fontWeight: 600 }}>Información</h4>
                <ul style={{ marginBottom: 0, paddingLeft: '18px', lineHeight: 1.7 }}>
                    <li><strong>Desde Total Stock:</strong> Actualizá el stock en ML cuando vendas por otro canal (solo stock, no precio).</li>
                    <li><strong>Traer de ML:</strong> Importá productos, elegí cuáles o actualizá existentes (precio y stock desde ML).</li>
                    <li><strong>Facturación:</strong> Podés elegir si las ventas de ML se facturan automáticamente (AFIP/ARCA) o solo se emite recibo.</li>
                </ul>
            </div>

            {/* Modal importar productos seleccionados */}
            {mostrarModalImportarSeleccionados && (
                <div style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    backgroundColor: 'rgba(15,25,22,0.55)',
                    backdropFilter: 'blur(2px)',
                    zIndex: 1000,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '20px'
                }}>
                    <div style={{
                        backgroundColor: '#ffffff',
                        borderRadius: '16px',
                        border: '1px solid #d8eae4',
                        boxShadow: '0 10px 30px rgba(0,0,0,.10)',
                        maxWidth: '900px',
                        width: '100%',
                        maxHeight: '90vh',
                        overflow: 'auto',
                        position: 'relative'
                    }}>
                        <ImportarProductosSeleccionadosML
                            tiendaId={tiendaId}
                            token={token}
                            onClose={() => setMostrarModalImportarSeleccionados(false)}
                            onImport={handleImportarSeleccionados}
                        />
                    </div>
                </div>
            )}
        </div>
    );
};

export default IntegracionMercadoLibre;
