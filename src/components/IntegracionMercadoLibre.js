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
    const [importarActualizarExistentes, setImportarActualizarExistentes] = useState(false);
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

    // Completar OAuth con el código
    const handleCompletarOAuth = async (code) => {
        if (!tiendaId) return;

        try {
            Swal.fire({
                title: 'Completando autorización...',
                allowOutsideClick: false,
                didOpen: () => {
                    Swal.showLoading();
                }
            });

            await axios.post(
                `${BASE_API_ENDPOINT}/api/tiendas/${tiendaId}/mercadolibre/callback/`,
                { code },
                { headers: { 'Authorization': `Bearer ${token}` } }
            );

            Swal.fire('Éxito', 'Autorización completada correctamente', 'success');
            await fetchMLStatus();
            await fetchTienda();
        } catch (err) {
            const errorMsg = err.response?.data?.error || err.message;
            Swal.fire('Error', `Error al completar autorización: ${errorMsg}`, 'error');
            console.error('Error completando OAuth:', err);
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

    // Importar productos desde Mercado Libre (sincronización inversa)
    const handleImportarProductos = async () => {
        if (!tiendaId) return;

        setSincronizando(true);
        try {
            Swal.fire({
                title: 'Importando productos desde Mercado Libre...',
                allowOutsideClick: false,
                didOpen: () => {
                    Swal.showLoading();
                }
            });

            const response = await axios.post(
                `${BASE_API_ENDPOINT}/api/tiendas/${tiendaId}/mercadolibre/import-products/`,
                { solo_nuevos: !importarActualizarExistentes },
                { 
                    headers: { 'Authorization': `Bearer ${token}` },
                    timeout: 300000
                }
            );

            const { success, actualizados, errors, results } = response.data;

            let detallesHtml = '';
            if (results?.details?.length > 0) {
                detallesHtml = '<ul style="text-align: left; max-height: 300px; overflow-y: auto;">';
                results.details.slice(0, 30).forEach(detail => {
                    const icon = detail.status === 'success' ? '✅' : '❌';
                    detallesHtml += `<li style="margin: 5px 0;">${icon} <strong>${detail.nombre}</strong>: ${detail.message}</li>`;
                });
                if (results.details.length > 30) {
                    detallesHtml += `<li><em>... y ${results.details.length - 30} más</em></li>`;
                }
                detallesHtml += '</ul>';
            }

            Swal.fire({
                title: 'Importación Completada',
                html: `
                    <p><strong>Nuevos importados:</strong> ${success}</p>
                    <p><strong>Actualizados:</strong> ${actualizados || 0}</p>
                    <p><strong>Errores:</strong> ${errors}</p>
                    ${detallesHtml ? `<hr/><h4>Detalles:</h4>${detallesHtml}` : ''}
                `,
                icon: errors === 0 ? 'success' : (success > 0 ? 'warning' : 'error'),
                width: '600px'
            });
        } catch (err) {
            const data = err.response?.data || {};
            const errorMsg = data.error || err.message;
            const reconnectRequired = data.reconnect_required === true;
            if (reconnectRequired) {
                Swal.fire({
                    title: 'Reconectar Mercado Libre',
                    text: errorMsg,
                    icon: 'warning',
                    confirmButtonText: 'Entendido'
                });
                await fetchMLStatus();
            } else {
                Swal.fire('Error', `Error al importar productos: ${errorMsg}`, 'error');
            }
            console.error('Error importando productos:', err);
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
            <div style={{ padding: '20px', textAlign: 'center' }}>
                <p>Cargando información...</p>
            </div>
        );
    }

    if (!tiendaId) {
        return (
            <div style={{ padding: '20px', textAlign: 'center' }}>
                <p>No se encontró la tienda seleccionada.</p>
            </div>
        );
    }

    const isMLConfigurado = mlStatus?.plataforma_ecommerce === 'MERCADO_LIBRE';
    const isAutenticado = mlStatus?.authenticated === true;

    return (
        <div style={{ padding: 0, width: '100%', maxWidth: '100%' }}>
            <h1 style={{ marginBottom: '1.25rem', color: '#2c3e50', fontSize: '1.5rem', fontWeight: 600 }}>Mercado Libre</h1>

            {error && (
                <div style={{
                    padding: '15px',
                    backgroundColor: '#fee',
                    border: '1px solid #fcc',
                    borderRadius: '5px',
                    marginBottom: '20px',
                    color: '#c33'
                }}>
                    {error}
                </div>
            )}

            {/* Estado de la integración */}
            <div style={{
                backgroundColor: '#f9f9f9',
                padding: '20px',
                borderRadius: '8px',
                marginBottom: '30px',
                border: '1px solid #ddd'
            }}>
                <h2 style={{ marginTop: 0, marginBottom: '0.75rem', fontSize: '1.1rem', color: '#34495e' }}>Estado</h2>
                
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '15px', marginTop: '15px' }}>
                    <div>
                        <strong>Plataforma:</strong>
                        <p>{mlStatus?.plataforma_ecommerce || 'No configurada'}</p>
                    </div>
                    <div>
                        <strong>Autenticación:</strong>
                        <p>
                            {isAutenticado ? (
                                <span style={{ color: 'green' }}>✅ Autenticado</span>
                            ) : (
                                <span style={{ color: 'red' }}>❌ No autenticado</span>
                            )}
                        </p>
                    </div>
                    {mlStatus?.user_id && (
                        <div>
                            <strong>User ID ML:</strong>
                            <p>{mlStatus.user_id}</p>
                        </div>
                    )}
                    {mlStatus?.token_expires_at && (
                        <div>
                            <strong>Token expira:</strong>
                            <p>{new Date(mlStatus.token_expires_at).toLocaleString('es-AR')}</p>
                        </div>
                    )}
                </div>
                {isAutenticado && (
                    <div style={{ marginTop: '20px', paddingTop: '15px', borderTop: '1px solid #ddd' }}>
                        <p style={{ marginBottom: '10px', color: '#666', fontSize: '14px' }}>
                            Si cambiaste de cuenta de Mercado Libre o de aplicación, desconectá y volvé a autorizar.
                        </p>
                        <button
                            type="button"
                            onClick={handleDesconectar}
                            disabled={desconectando}
                            style={{
                                padding: '10px 20px',
                                backgroundColor: desconectando ? '#ccc' : '#dc3545',
                                color: 'white',
                                border: 'none',
                                borderRadius: '5px',
                                cursor: desconectando ? 'not-allowed' : 'pointer',
                                fontSize: '14px'
                            }}
                        >
                            {desconectando ? 'Desconectando...' : 'Desconectar y reconectar'}
                        </button>
                    </div>
                )}
            </div>

            {/* Configuración OAuth */}
            {!isAutenticado && (
                <div style={{
                    backgroundColor: '#fff3cd',
                    padding: '20px',
                    borderRadius: '8px',
                    marginBottom: '30px',
                    border: '1px solid #ffc107'
                }}>
                    <h3 style={{ marginTop: 0, color: '#856404' }}>Paso 1: Autenticación</h3>
                    <p>Para comenzar a usar la integración con Mercado Libre, necesitas autorizar la aplicación.</p>
                    <button
                        onClick={handleIniciarOAuth}
                        style={{
                            padding: '12px 24px',
                            backgroundColor: '#3483fa',
                            color: 'white',
                            border: 'none',
                            borderRadius: '5px',
                            cursor: 'pointer',
                            fontSize: '16px',
                            marginTop: '15px'
                        }}
                    >
                        Iniciar Autorización OAuth
                    </button>
                    {authUrl && (
                        <p style={{ marginTop: '15px', fontSize: '12px', color: '#666' }}>
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
                        backgroundColor: '#e7f3ff',
                        padding: '20px',
                        borderRadius: '8px',
                        marginBottom: '30px',
                        border: '1px solid #b3d9ff'
                    }}>
                        <h3 style={{ marginTop: 0, color: '#004085' }}>Desde Total Stock hacia Mercado Libre</h3>
                        <p style={{ marginBottom: '15px' }}>
                            Si vendiste por otro canal y querés reflejar el stock actual en Mercado Libre, actualizalo acá. Solo se actualiza el stock (no el precio).
                        </p>
                        <button
                            onClick={handleActualizarStock}
                            disabled={sincronizando}
                            style={{
                                padding: '12px 24px',
                                backgroundColor: sincronizando ? '#ccc' : '#17a2b8',
                                color: 'white',
                                border: 'none',
                                borderRadius: '5px',
                                cursor: sincronizando ? 'not-allowed' : 'pointer',
                                fontSize: '16px'
                            }}
                        >
                            {sincronizando ? 'Procesando...' : 'Actualizar stock a Mercado Libre'}
                        </button>
                    </div>

                    {/* Traer productos desde Mercado Libre */}
                    <div style={{
                        backgroundColor: '#e8f5e9',
                        padding: '20px',
                        borderRadius: '8px',
                        marginBottom: '30px',
                        border: '1px solid #4caf50'
                    }}>
                        <h3 style={{ marginTop: 0, color: '#2e7d32' }}>Traer productos a Total Stock</h3>
                        <p style={{ marginBottom: '15px' }}>
                            Importá tus productos publicados en Mercado Libre para vincularlos. Las ventas se registrarán automáticamente.
                        </p>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                                <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
                                    <input
                                        type="checkbox"
                                        checked={importarActualizarExistentes}
                                        onChange={(e) => setImportarActualizarExistentes(e.target.checked)}
                                        style={{ marginRight: '8px', width: '18px', height: '18px' }}
                                    />
                                    <span>Incluir actualización de productos ya importados</span>
                                </label>
                                <button
                                    onClick={handleImportarProductos}
                                    disabled={sincronizando}
                                    style={{
                                        padding: '10px 20px',
                                        backgroundColor: sincronizando ? '#ccc' : '#2e7d32',
                                        color: 'white',
                                        border: 'none',
                                        borderRadius: '5px',
                                        cursor: sincronizando ? 'not-allowed' : 'pointer',
                                        fontSize: '15px'
                                    }}
                                >
                                    {sincronizando ? 'Procesando...' : '📥 Importar productos'}
                                </button>
                            </div>
                            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                                <button
                                    onClick={() => setMostrarModalImportarSeleccionados(true)}
                                    disabled={sincronizando}
                                    style={{
                                        padding: '10px 20px',
                                        backgroundColor: sincronizando ? '#ccc' : '#388e3c',
                                        color: 'white',
                                        border: 'none',
                                        borderRadius: '5px',
                                        cursor: sincronizando ? 'not-allowed' : 'pointer',
                                        fontSize: '15px'
                                    }}
                                >
                                    Importar productos seleccionados
                                </button>
                                <button
                                    onClick={handleActualizarExistentes}
                                    disabled={sincronizando}
                                    style={{
                                        padding: '10px 20px',
                                        backgroundColor: sincronizando ? '#ccc' : '#43a047',
                                        color: 'white',
                                        border: 'none',
                                        borderRadius: '5px',
                                        cursor: sincronizando ? 'not-allowed' : 'pointer',
                                        fontSize: '15px'
                                    }}
                                >
                                    Actualizar precios y stock de productos existentes
                                </button>
                            </div>
                        </div>
                        <p style={{ marginTop: '12px', fontSize: '13px', color: '#666' }}>
                            <strong>Importar productos:</strong> Trae todos los de ML (con o sin actualizar los ya importados).<br/>
                            <strong>Importar seleccionados:</strong> Elegí con checkboxes cuáles importar.<br/>
                            <strong>Actualizar existentes:</strong> Refresca precio y stock de productos ya vinculados.
                        </p>
                    </div>
                </>
            )}

            {/* Información adicional */}
            <div style={{
                backgroundColor: '#f9f9f9',
                padding: '15px',
                borderRadius: '8px',
                border: '1px solid #ddd',
                fontSize: '14px',
                color: '#666'
            }}>
                <h4 style={{ marginTop: 0, color: '#333' }}>Información</h4>
                <ul style={{ marginBottom: 0 }}>
                    <li><strong>Desde Total Stock:</strong> Actualizá el stock en ML cuando vendas por otro canal (solo stock, no precio).</li>
                    <li><strong>Traer de ML:</strong> Importá productos, elegí cuáles o actualizá existentes (precio y stock desde ML).</li>
                    <li><strong>Facturación:</strong> Las ventas de ML se facturan automáticamente si tenés AFIP/ARCA configurado.</li>
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
                    backgroundColor: 'rgba(0,0,0,0.5)',
                    zIndex: 1000,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '20px'
                }}>
                    <div style={{
                        backgroundColor: 'white',
                        borderRadius: '8px',
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
