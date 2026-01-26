// frontend/src/components/IntegracionMercadoLibre.js
import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../AuthContext';
import axios from 'axios';
import Swal from 'sweetalert2';
import SeleccionarProductosML from './SeleccionarProductosML';

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

    // Estado para mostrar modal de selección
    const [mostrarModalSeleccion, setMostrarModalSeleccion] = useState(false);

    // Sincronizar productos con selección
    const handleSincronizarProductos = async (productosParaSincronizar) => {
        if (!tiendaId) return;

        setSincronizando(true);
        try {
            Swal.fire({
                title: 'Sincronizando productos...',
                allowOutsideClick: false,
                didOpen: () => {
                    Swal.showLoading();
                }
            });

            const response = await axios.post(
                `${BASE_API_ENDPOINT}/api/tiendas/${tiendaId}/mercadolibre/sync-products/`,
                { productos: productosParaSincronizar },
                { 
                    headers: { 'Authorization': `Bearer ${token}` },
                    timeout: 600000
                }
            );

            const { total, success, errors, results } = response.data;

            let detallesHtml = '<ul style="text-align: left; max-height: 400px; overflow-y: auto;">';
            results.details.forEach(detail => {
                const icon = detail.status === 'success' ? '✅' : '❌';
                detallesHtml += `<li style="margin: 5px 0;">${icon} <strong>${detail.nombre}</strong>: ${detail.message}</li>`;
            });
            detallesHtml += '</ul>';

            Swal.fire({
                title: 'Sincronización Completada',
                html: `
                    <p><strong>Total:</strong> ${total} productos</p>
                    <p><strong>Exitosos:</strong> ${success}</p>
                    <p><strong>Errores:</strong> ${errors}</p>
                    ${results.details.length > 0 ? `<hr/><h4>Detalles:</h4>${detallesHtml}` : ''}
                `,
                icon: errors === 0 ? 'success' : 'warning',
                width: '600px'
            });

            await fetchTienda();
            setMostrarModalSeleccion(false);
        } catch (err) {
            let errorMsg = 'Error desconocido';
            if (err.code === 'ECONNABORTED' || err.message.includes('timeout')) {
                errorMsg = 'La sincronización tardó demasiado tiempo. Algunos productos pueden haberse sincronizado. Por favor, verifica el estado.';
            } else if (err.response?.data?.error) {
                errorMsg = err.response.data.error;
            } else if (err.response?.data?.message) {
                errorMsg = err.response.data.message;
            } else if (err.message) {
                errorMsg = err.message;
            }
            Swal.fire('Error', `Error al sincronizar productos: ${errorMsg}`, 'error');
            console.error('Error sincronizando productos:', err);
        } finally {
            setSincronizando(false);
        }
    };

    // Actualizar solo el stock de productos existentes
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
                    <div style={{
                        backgroundColor: '#f9f9f9',
                        padding: '20px',
                        borderRadius: '8px',
                        marginBottom: '30px',
                        border: '1px solid #ddd'
                    }}>
                        <h3 style={{ marginTop: 0, color: '#333' }}>Configuración de Sincronización</h3>
                        
                        <div style={{ marginTop: '15px' }}>
                            <label style={{ display: 'flex', alignItems: 'center', marginBottom: '15px' }}>
                                <input
                                    type="checkbox"
                                    checked={tienda?.ml_sync_habilitado || false}
                                    onChange={(e) => handleActualizarConfig('ml_sync_habilitado', e.target.checked)}
                                    style={{ marginRight: '10px', width: '20px', height: '20px' }}
                                />
                                <span><strong>Habilitar sincronización automática</strong></span>
                            </label>
                            
                            {tienda?.ml_sync_habilitado && (
                                <>
                                    <label style={{ display: 'flex', alignItems: 'center', marginBottom: '15px', marginLeft: '30px' }}>
                                        <input
                                            type="checkbox"
                                            checked={tienda?.ml_sincronizar_stock || false}
                                            onChange={(e) => handleActualizarConfig('ml_sincronizar_stock', e.target.checked)}
                                            style={{ marginRight: '10px', width: '20px', height: '20px' }}
                                        />
                                        <span>Sincronizar stock automáticamente</span>
                                    </label>
                                    
                                    <label style={{ display: 'flex', alignItems: 'center', marginBottom: '15px', marginLeft: '30px' }}>
                                        <input
                                            type="checkbox"
                                            checked={tienda?.ml_sincronizar_precios || false}
                                            onChange={(e) => handleActualizarConfig('ml_sincronizar_precios', e.target.checked)}
                                            style={{ marginRight: '10px', width: '20px', height: '20px' }}
                                        />
                                        <span>Sincronizar precios automáticamente</span>
                                    </label>
                                    
                                    <label style={{ display: 'flex', alignItems: 'center', marginBottom: '15px', marginLeft: '30px' }}>
                                        <input
                                            type="checkbox"
                                            checked={tienda?.ml_sincronizar_productos || false}
                                            onChange={(e) => handleActualizarConfig('ml_sincronizar_productos', e.target.checked)}
                                            style={{ marginRight: '10px', width: '20px', height: '20px' }}
                                        />
                                        <span>Sincronizar nuevos productos automáticamente</span>
                                    </label>
                                </>
                            )}
                        </div>
                    </div>

                    {/* Sincronización manual */}
                    <div style={{
                        backgroundColor: '#e7f3ff',
                        padding: '20px',
                        borderRadius: '8px',
                        marginBottom: '30px',
                        border: '1px solid #b3d9ff'
                    }}>
                        <h3 style={{ marginTop: 0, color: '#004085' }}>Sincronización Manual</h3>
                        <p>Puedes sincronizar todos los productos de la tienda con Mercado Libre manualmente.</p>
                        <div style={{ display: 'flex', gap: '15px', marginTop: '15px', flexWrap: 'wrap' }}>
                            <button
                                onClick={() => setMostrarModalSeleccion(true)}
                                disabled={sincronizando}
                                style={{
                                    padding: '12px 24px',
                                    backgroundColor: sincronizando ? '#ccc' : '#28a745',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '5px',
                                    cursor: sincronizando ? 'not-allowed' : 'pointer',
                                    fontSize: '16px'
                                }}
                            >
                                {sincronizando ? 'Sincronizando...' : 'Seleccionar y Sincronizar Productos'}
                            </button>
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
                                {sincronizando ? 'Actualizando...' : 'Actualizar Stock'}
                            </button>
                        </div>
                        <p style={{ marginTop: '15px', fontSize: '14px', color: '#666' }}>
                            <strong>Nota:</strong> "Actualizar Stock" solo actualiza el stock de productos que ya están sincronizados con Mercado Libre. 
                            Si tienes productos nuevos, usa "Sincronizar Productos" primero.
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
                    <li>La sincronización automática actualiza el stock y los precios cuando modificas productos en Total Stock.</li>
                    <li>Puedes seleccionar qué productos sincronizar y elegir la categoría de Mercado Libre para cada uno.</li>
                    <li>Los productos sincronizados tienen un indicador en la lista de productos.</li>
                </ul>
            </div>

            {/* Modal de selección de productos */}
            {mostrarModalSeleccion && (
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
                        <SeleccionarProductosML
                            tiendaId={tiendaId}
                            selectedStoreSlug={selectedStoreSlug}
                            token={token}
                            onClose={() => setMostrarModalSeleccion(false)}
                            onConfirm={handleSincronizarProductos}
                        />
                    </div>
                </div>
            )}
        </div>
    );
};

export default IntegracionMercadoLibre;
