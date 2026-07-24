// frontend/src/components/PanelAdministracionTienda.js
import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../AuthContext';
import { useNavigate } from 'react-router-dom';
import { useNotifications } from '../hooks/useNotifications';
import axios from 'axios';
import Swal from 'sweetalert2';
import { formatearMonto } from '../utils/formatearMonto';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPencil, faTrash, faKey } from '@fortawesome/free-solid-svg-icons';
import HelpButton from './HelpButton';
import NotasCreditoPage from './NotasCreditoPage';
import IntegracionTiendaNube from './IntegracionTiendaNube';
import IntegracionMercadoLibrePanel from './IntegracionMercadoLibrePanel';
import ModalUpgrade from './ModalUpgrade';

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

// Estilos responsivos para móviles
const mobileStyles = `
    @media (max-width: 768px) {
        .panel-admin-container {
            padding: 10px !important;
            overflow-x: hidden;
            max-width: 100%;
        }
        .panel-admin-tabs {
            flex-direction: column;
            gap: 5px;
        }
        .panel-admin-tab {
            width: 100%;
            padding: 10px !important;
            text-align: center;
        }
        .panel-admin-section-header {
            flex-direction: column;
            align-items: flex-start !important;
            gap: 12px;
        }
        .panel-admin-add-button {
            width: auto;
            padding: 8px 14px !important;
            font-size: 0.9em !important;
            white-space: nowrap;
        }
        .panel-admin-form-grid {
            grid-template-columns: 1fr !important;
        }
        .panel-admin-form-actions {
            flex-direction: column;
        }
        .panel-admin-form-actions button {
            width: 100%;
        }
        .panel-admin-table-container {
            overflow-x: auto;
            -webkit-overflow-scrolling: touch;
            max-width: 100%;
        }
        .panel-admin-table {
            min-width: 600px;
            font-size: 0.85em;
        }
        .panel-admin-action-buttons {
            flex-direction: column;
            gap: 5px;
        }
        .panel-admin-action-buttons button {
            width: 100%;
        }
        .panel-admin-modal-content {
            padding: 20px !important;
            margin: 20px;
        }
    }
    @media (max-width: 480px) {
        .panel-admin-add-button {
            padding: 6px 12px !important;
            font-size: 0.85em !important;
        }
        .panel-admin-table {
            font-size: 0.75em;
        }
        .panel-admin-table th,
        .panel-admin-table td {
            padding: 8px 4px !important;
        }
    }
`;

const notificacionesSoportadas = () =>
    typeof window !== 'undefined' && 'Notification' in window && 'serviceWorker' in navigator;

const PanelAdministracionTienda = () => {
    const { user, isAuthenticated, loading: authLoading, selectedStoreSlug, token, tiendasAutorizadas, logout } = useAuth();
    const navigate = useNavigate();
    const { notificationPermission, fcmToken, solicitarPermiso, eliminarToken, error: notificationError } = useNotifications();
    
    const [activeTab, setActiveTab] = useState('usuarios');
    const [loading, setLoading] = useState(true);
    const [tiendaInfo, setTiendaInfo] = useState(null);

    // Estados para el wizard de facturación ARCA
    const [afipEstado, setAfipEstado] = useState(null); // resultado de facturacion/estado
    const [afipPasoActivo, setAfipPasoActivo] = useState(1);
    const [afipForm, setAfipForm] = useState({
        cuit: '',
        punto_venta: 1,
        tipo_facturacion: 'AFIP',
        condicion_iva_emisor: 'MT',
        modo_test_afip: false,
    });
    const [afipCertFile, setAfipCertFile] = useState(null);
    const [afipCertB64, setAfipCertB64] = useState('');
    const [afipCertModo, setAfipCertModo] = useState('archivo'); // 'archivo' | 'base64'
    const [afipSaving, setAfipSaving] = useState(false);
    const [puntoVentaGuardadoLocal, setPuntoVentaGuardadoLocal] = useState(false);
    
    // Estados para usuarios
    const [users, setUsers] = useState([]);
    const [showUserForm, setShowUserForm] = useState(false);
    const [editingUser, setEditingUser] = useState(null);
    const [userForm, setUserForm] = useState({
        username: '',
        email: '',
        password: '',
        password2: '',
        first_name: '',
        last_name: '',
        is_staff: false,
        is_superuser: false,
        is_supervisor: false,
        cierre_caja_habilitado: false,
        tienda: selectedStoreSlug || ''
    });
    const [showPasswordModal, setShowPasswordModal] = useState(false);
    const [passwordForm, setPasswordForm] = useState({
        new_password: '',
        new_password2: ''
    });
    const [selectedUserId, setSelectedUserId] = useState(null);
    const [showTiendasModal, setShowTiendasModal]   = useState(false);
    const [tiendasModalUser, setTiendasModalUser]   = useState(null);   // usuario target
    const [tiendasModalSel, setTiendasModalSel]     = useState([]);     // ids seleccionados
    const [guardandoTiendas, setGuardandoTiendas]   = useState(false);

    // Estados para aranceles
    const [aranceles, setAranceles] = useState([]);
    const [showArancelForm, setShowArancelForm] = useState(false);
    const [showEditArancelModal, setShowEditArancelModal] = useState(false);
    const [editArancelData, setEditArancelData] = useState(null);
    const [arancelForm, setArancelForm] = useState({
        metodo_pago: '',
        metodo_pago_nuevo: false,
        nuevo_metodo_nombre: '',
        nuevo_metodo_descripcion: '',
        nombre_plan: 'CONTADO',
        plan_custom: false,
        plan_custom_nombre: '',
        arancel_porcentaje: '0.00',
        tienda: selectedStoreSlug || ''
    });
    
    // Estados para aranceles Mercado Libre (por producto: arancel % + costo envío)
    const [arancelesML, setArancelesML] = useState([]);
    const [productosML, setProductosML] = useState([]);
    const [mlArancelesAutomaticos, setMlArancelesAutomaticos] = useState(true);
    const [guardandoModoML, setGuardandoModoML] = useState(false);
    const [showArancelMLForm, setShowArancelMLForm] = useState(false);
    const [showEditArancelMLModal, setShowEditArancelMLModal] = useState(false);
    const [editArancelMLData, setEditArancelMLData] = useState(null);
    const [arancelMLForm, setArancelMLForm] = useState({
        producto: '',
        arancel_porcentaje: '0.00',
        costo_envio: '0.00',
        tienda: selectedStoreSlug || ''
    });

    // Estados para Mi Plan
    const [planInfo, setPlanInfo] = useState(null);
    const [loadingPlan, setLoadingPlan] = useState(false);
    const [showUpgradeModal, setShowUpgradeModal] = useState(false);
    const [upgradeMotivo, setUpgradeMotivo] = useState('');   // 'factura' | 'ecommerce'
    const [showCancelModal, setShowCancelModal] = useState(false);
    const [cancelando, setCancelando] = useState(false);

    // Estados para Historial de Acciones
    const [historial, setHistorial] = useState([]);
    const [loadingHistorial, setLoadingHistorial] = useState(false);
    const [historialFechaDesde, setHistorialFechaDesde] = useState('');
    const [historialFechaHasta, setHistorialFechaHasta] = useState('');
    const [historialUsuarioId, setHistorialUsuarioId] = useState('');
    const [usuarios, setUsuarios] = useState([]);

    // Cargar información de la tienda (ML, facturación, etc.)
    // Cargar estado de facturación ARCA desde el backend (debe ir ANTES de fetchTiendaInfo)
    const fetchAfipEstado = useCallback(async (tiendaId) => {
        if (!token || !tiendaId) return;
        try {
            const res = await axios.get(
                `${BASE_API_ENDPOINT}/api/tiendas/${tiendaId}/facturacion/estado/`,
                { headers: { 'Authorization': `Bearer ${token}` } }
            );
            const d = res.data;
            setAfipEstado(d);
            setAfipForm(prev => ({
                ...prev,
                cuit: d.cuit || '',
                punto_venta: d.punto_venta || 1,
                // Único sistema con integración real hoy; el valor 'ARCA' quedó de una
                // versión anterior que lo ofrecía como alternativa pero nunca se implementó
                // (la prueba de conexión sólo funciona con 'AFIP'), así que se normaliza acá.
                tipo_facturacion: 'AFIP',
                condicion_iva_emisor: d.condicion_iva_emisor || 'MT',
                modo_test_afip: false,
            }));
            // Ir al primer paso incompleto
            if (!d.paso1_config) setAfipPasoActivo(1);
            else if (!d.paso2_csr) setAfipPasoActivo(2);
            else if (!d.paso4_cert) setAfipPasoActivo(4);
            else setAfipPasoActivo(5);
        } catch (err) {
            console.error('Error al cargar estado de facturación:', err);
        }
    }, [token]);

    const fetchTiendaInfo = useCallback(async () => {
        if (!token || !selectedStoreSlug) return;
        try {
            const response = await axios.get(`${BASE_API_ENDPOINT}/api/tiendas/`, {
                headers: { 'Authorization': `Bearer ${token}` },
                params: { nombre: selectedStoreSlug }
            });
            const tiendas = response.data.results || response.data;
            const tienda = Array.isArray(tiendas) ? tiendas.find(t => t.nombre === selectedStoreSlug) : tiendas;
            if (tienda) {
                setTiendaInfo(tienda);
                setMlArancelesAutomaticos(tienda.ml_aranceles_automaticos !== false);
                await fetchAfipEstado(tienda.id);
            }
        } catch (err) {
            console.error('Error al cargar información de la tienda:', err);
        }
    }, [token, selectedStoreSlug, fetchAfipEstado]);

    // Guardar configuración básica ARCA (paso 1, y también reutilizado en el paso 5 para el punto de venta)
    const handleGuardarConfigAfip = useCallback(async (siguientePaso = 2) => {
        if (!tiendaInfo?.id) return;
        const cuitDigits = afipForm.cuit.replace(/\D/g, '');
        if (cuitDigits.length !== 11) {
            Swal.fire('Error', 'El CUIT debe tener 11 dígitos (formato: XX-XXXXXXXX-X).', 'error');
            return;
        }
        setAfipSaving(true);
        try {
            await axios.post(
                `${BASE_API_ENDPOINT}/api/tiendas/${tiendaInfo.id}/facturacion/configurar/`,
                afipForm,
                { headers: { 'Authorization': `Bearer ${token}` } }
            );
            await fetchAfipEstado(tiendaInfo.id);
            await fetchTiendaInfo();
            Swal.fire({ icon: 'success', title: 'Configuración guardada', timer: 1800, showConfirmButton: false });
            if (siguientePaso === 6) setPuntoVentaGuardadoLocal(true);
            setAfipPasoActivo(siguientePaso);
        } catch (err) {
            const msg = err.response?.data?.error || err.message || 'Error al guardar.';
            Swal.fire('Error', msg, 'error');
        } finally {
            setAfipSaving(false);
        }
    }, [token, tiendaInfo, afipForm, fetchAfipEstado, fetchTiendaInfo]);

    // Cargar certificado ARCA (paso 4)
    const handleCargarCertificado = useCallback(async () => {
        if (!tiendaInfo?.id) return;
        setAfipSaving(true);
        try {
            let body, headers;
            if (afipCertModo === 'archivo' && afipCertFile) {
                const formData = new FormData();
                formData.append('certificado_file', afipCertFile);
                body = formData;
                headers = { 'Authorization': `Bearer ${token}` };
            } else if (afipCertModo === 'base64' && afipCertB64.trim()) {
                body = { certificado_base64: afipCertB64.trim() };
                headers = { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' };
            } else {
                Swal.fire('Error', 'Seleccioná un archivo .crt o pegá el certificado en base64.', 'error');
                setAfipSaving(false);
                return;
            }
            await axios.post(
                `${BASE_API_ENDPOINT}/api/tiendas/${tiendaInfo.id}/facturacion/cargar-certificado/`,
                body,
                { headers }
            );
            await fetchAfipEstado(tiendaInfo.id);
            setAfipCertFile(null);
            setAfipCertB64('');
            Swal.fire({ icon: 'success', title: 'Certificado cargado', timer: 1800, showConfirmButton: false });
            setAfipPasoActivo(5);
        } catch (err) {
            const msg = err.response?.data?.error || err.message || 'Error al cargar certificado.';
            Swal.fire('Error', msg, 'error');
        } finally {
            setAfipSaving(false);
        }
    }, [token, tiendaInfo, afipCertModo, afipCertFile, afipCertB64, fetchAfipEstado]);

    // Probar configuración de facturación: emite una factura de prueba de $1 y muestra el resultado
    const handleProbarFacturacion = useCallback(async () => {
        if (!token || !tiendaInfo?.id) {
            Swal.fire('Error', 'No se encontró la tienda o falta autenticación.', 'error');
            return;
        }

        try {
            Swal.fire({
                title: 'Probando facturador...',
                text: 'Se emitirá una factura de prueba por $1 para verificar la configuración.',
                allowOutsideClick: false,
                didOpen: () => {
                    Swal.showLoading();
                }
            });

            const response = await axios.post(
                `${BASE_API_ENDPOINT}/api/tiendas/${tiendaInfo.id}/facturacion/test/`,
                {},
                { headers: { 'Authorization': `Bearer ${token}` } }
            );

            const data = response.data || {};

            Swal.fire({
                icon: 'success',
                title: 'Facturador verificado',
                html: `
                    <p>La factura de prueba se emitió correctamente.</p>
                    ${data.numero_comprobante ? `<p><strong>Comprobante:</strong> ${data.tipo_comprobante || 'B'} ${data.punto_venta || ''}-${data.numero_comprobante}</p>` : ''}
                `
            });
        } catch (err) {
            const data = err.response?.data || {};
            const msg = data.message || data.error || err.message || 'No se pudo emitir la factura de prueba.';
            const faltantes = Array.isArray(data.missing_fields) && data.missing_fields.length
                ? `<br/><small>Faltan campos: ${data.missing_fields.join(', ')}</small>`
                : '';

            Swal.fire({
                icon: 'error',
                title: 'Error al probar facturador',
                html: `${msg}${faltantes}`
            });
        }
    }, [token, tiendaInfo]);

    // Generar clave privada y CSR para ARCA (clave se guarda en la tienda en base64; se devuelve CSR para descargar)
    const handleGenerarCsr = useCallback(async () => {
        if (!token || !tiendaInfo?.id) {
            Swal.fire('Error', 'No se encontró la tienda o falta autenticación.', 'error');
            return;
        }
        if (!tiendaInfo.cuit || !String(tiendaInfo.cuit).trim()) {
            Swal.fire('Error', 'La tienda debe tener CUIT configurado. Configurá el CUIT en la configuración de la tienda y volvé acá.', 'error');
            return;
        }

        const { value: formValues } = await Swal.fire({
            title: 'Generar clave y CSR para ARCA',
            html: `
                <p style="text-align:left; margin-bottom:12px;">Total Stock generará la clave privada (y la guardará) y un archivo CSR con los datos de tu tienda. Opcionalmente indicá alias y razón social para el certificado.</p>
                <label style="display:block; text-align:left; margin-bottom:4px;">Alias (CN) – ej. TotalStock</label>
                <input id="swal-alias" class="swal2-input" value="TotalStock" placeholder="TotalStock" style="width:100%; margin:0 0 12px 0;">
                <label style="display:block; text-align:left; margin-bottom:4px;">Razón social (O) – ej. nombre de la empresa</label>
                <input id="swal-razon" class="swal2-input" value="${(tiendaInfo.nombre || '').replace(/"/g, '&quot;')}" placeholder="Nombre de la empresa" style="width:100%; margin:0;">
            `,
            showCancelButton: true,
            confirmButtonText: 'Generar y descargar CSR',
            cancelButtonText: 'Cancelar',
            preConfirm: () => ({
                alias: document.getElementById('swal-alias').value.trim() || 'TotalStock',
                razon_social: document.getElementById('swal-razon').value.trim() || (tiendaInfo.nombre || 'Empresa')
            })
        });

        if (!formValues) return;

        try {
            Swal.fire({ title: 'Generando...', allowOutsideClick: false, didOpen: () => { Swal.showLoading(); } });
            const response = await axios.post(
                `${BASE_API_ENDPOINT}/api/tiendas/${tiendaInfo.id}/facturacion/generar-csr/`,
                { alias: formValues.alias, razon_social: formValues.razon_social },
                { headers: { 'Authorization': `Bearer ${token}` } }
            );
            const data = response.data || {};
            if (!data.success || !data.csr_pem) {
                Swal.fire('Error', data.message || 'No se pudo generar el CSR.', 'error');
                return;
            }

            // Descargar archivo .csr
            const blob = new Blob([data.csr_pem], { type: 'application/x-pem-file' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `pedido_certificado_afip_${tiendaInfo.id}.csr`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);

            Swal.fire({
                icon: 'success',
                title: 'Listo',
                html: `
                    <p>La clave privada quedó guardada en Total Stock.</p>
                    <p>Se descargó el archivo <strong>.csr</strong>. Subilo en ARCA (Certificados → Obtener certificado), descargá el .crt y pegá su contenido en base64 en el campo "Certificado ARCA" en la configuración de la tienda.</p>
                `
            });
        } catch (err) {
            const msg = err.response?.data?.message || err.message || 'No se pudo generar el CSR.';
            Swal.fire('Error', msg, 'error');
        }
    }, [token, tiendaInfo]);

    useEffect(() => {
        if (!authLoading) {
            if (!isAuthenticated || !user?.is_superuser) {
                setLoading(false);
                return;
            } else {
                setLoading(false);
                fetchTiendaInfo();
                // Cargar info del plan al montar para poder bloquear tabs restringidas
                if (!planInfo) {
                    axios.get(`${BASE_API_ENDPOINT}/api/suscripcion/mi-plan/`, {
                        headers: { Authorization: `Bearer ${token}` }
                    }).then(r => setPlanInfo(r.data)).catch(() => {});
                }
                if (activeTab === 'usuarios') {
                    fetchUsers();
                } else if (activeTab === 'medios-pago-aranceles') {
                    fetchMetodosPago();
                    fetchAranceles();
                } else if (activeTab === 'aranceles-ml') {
                    fetchArancelesML();
                    fetchProductosML();
                }
            }
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [authLoading, isAuthenticated, user, navigate, activeTab, selectedStoreSlug, fetchTiendaInfo]);

    // ========== HISTORIAL DE ACCIONES ==========
    const fetchHistorial = useCallback(async () => {
        if (!token || !selectedStoreSlug) return;
        setLoadingHistorial(true);
        try {
            const params = new URLSearchParams();
            if (historialFechaDesde) params.append('fecha_desde', historialFechaDesde);
            if (historialFechaHasta) params.append('fecha_hasta', historialFechaHasta);
            if (historialUsuarioId)  params.append('usuario_id', historialUsuarioId);
            const res = await axios.get(
                `${BASE_API_ENDPOINT}/api/historial-acciones/?${params.toString()}`,
                { headers: { Authorization: `Bearer ${token}` } }
            );
            setHistorial(res.data.results || res.data);
        } catch (err) {
            console.error('Error cargando historial:', err);
        } finally {
            setLoadingHistorial(false);
        }
    }, [token, selectedStoreSlug, historialFechaDesde, historialFechaHasta, historialUsuarioId]);

    const fetchUsuariosHistorial = useCallback(async () => {
        if (!token || !selectedStoreSlug) return;
        try {
            const res = await axios.get(
                `${BASE_API_ENDPOINT}/api/users/?tienda_slug=${selectedStoreSlug}`,
                { headers: { Authorization: `Bearer ${token}` } }
            );
            setUsuarios(res.data.results || res.data);
        } catch (err) {
            console.error('Error cargando usuarios para filtro:', err);
        }
    }, [token, selectedStoreSlug]);

    useEffect(() => {
        if (activeTab === 'historial') {
            fetchHistorial();
            if (usuarios.length === 0) fetchUsuariosHistorial();
        }
    }, [activeTab, fetchHistorial, fetchUsuariosHistorial, usuarios.length]);

    // ========== FUNCIONES PARA USUARIOS ==========
    const fetchUsers = useCallback(async () => {
        if (!token || !selectedStoreSlug) return;
        try {
            const response = await axios.get(`${BASE_API_ENDPOINT}/api/users/?tienda_slug=${selectedStoreSlug}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            setUsers(response.data.results || response.data);
        } catch (err) {
            console.error('Error al cargar usuarios:', err);
            Swal.fire({
                icon: 'error',
                title: 'Error',
                text: 'No se pudieron cargar los usuarios.'
            });
        }
    }, [token, selectedStoreSlug]);

    const handleUserFormChange = (e) => {
        const { name, value, type, checked } = e.target;
        setUserForm({
            ...userForm,
            [name]: type === 'checkbox' ? checked : value
        });
    };

    const handleCreateUser = async (e) => {
        e.preventDefault();
        
        if (userForm.password !== userForm.password2) {
            Swal.fire({
                icon: 'error',
                title: 'Error',
                text: 'Las contraseñas no coinciden.'
            });
            return;
        }

        try {
            await axios.post(`${BASE_API_ENDPOINT}/api/users/`, {
                ...userForm,
                tienda: selectedStoreSlug
            }, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            
            Swal.fire({
                icon: 'success',
                title: 'Éxito',
                text: 'Usuario creado correctamente.'
            });
            
            setShowUserForm(false);
            setUserForm({
                username: '',
                email: '',
                password: '',
                password2: '',
                first_name: '',
                last_name: '',
                is_staff: false,
                is_superuser: false,
                is_supervisor: false,
                cierre_caja_habilitado: false,
                tienda: selectedStoreSlug
            });
            fetchUsers();
        } catch (err) {
            console.error('Error al crear usuario:', err);
            Swal.fire({
                icon: 'error',
                title: 'Error',
                text: err.response?.data?.username?.[0] || err.response?.data?.detail || 'Error al crear el usuario.'
            });
        }
    };

    const handleEditUser = (user) => {
        setEditingUser(user);
        setUserForm({
            username: user.username,
            email: user.email || '',
            password: '',
            password2: '',
            first_name: user.first_name || '',
            last_name: user.last_name || '',
            is_staff: user.is_staff || false,
            is_superuser: user.is_superuser || false,
            is_supervisor: user.is_supervisor || false,
            cierre_caja_habilitado: user.cierre_caja_habilitado || false,
            tienda: selectedStoreSlug
        });
        setShowUserForm(true);
    };

    const handleUpdateUser = async (e) => {
        e.preventDefault();
        
        try {
            await axios.patch(`${BASE_API_ENDPOINT}/api/users/${editingUser.id}/`, {
                username: userForm.username,
                email: userForm.email,
                first_name: userForm.first_name,
                last_name: userForm.last_name,
                is_staff: userForm.is_staff,
                is_superuser: userForm.is_superuser,
                is_supervisor: userForm.is_supervisor,
                cierre_caja_habilitado: userForm.cierre_caja_habilitado,
                tienda: selectedStoreSlug
            }, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            
            Swal.fire({
                icon: 'success',
                title: 'Éxito',
                text: 'Usuario actualizado correctamente.'
            });
            
            setShowUserForm(false);
            setEditingUser(null);
            setUserForm({
                username: '',
                email: '',
                password: '',
                password2: '',
                first_name: '',
                last_name: '',
                is_staff: false,
                is_superuser: false,
                is_supervisor: false,
                cierre_caja_habilitado: false,
                tienda: selectedStoreSlug
            });
            fetchUsers();
        } catch (err) {
            console.error('Error al actualizar usuario:', err);
            Swal.fire({
                icon: 'error',
                title: 'Error',
                text: err.response?.data?.detail || 'Error al actualizar el usuario.'
            });
        }
    };

    const handleDeleteUser = async (userId) => {
        const result = await Swal.fire({
            title: '¿Estás seguro?',
            text: 'Esta acción no se puede deshacer.',
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#d33',
            cancelButtonColor: '#3085d6',
            confirmButtonText: 'Sí, eliminar',
            cancelButtonText: 'Cancelar'
        });

        if (result.isConfirmed) {
            try {
                await axios.delete(`${BASE_API_ENDPOINT}/api/users/${userId}/`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                
                Swal.fire({
                    icon: 'success',
                    title: 'Éxito',
                    text: 'Usuario eliminado correctamente.'
                });
                
                fetchUsers();
            } catch (err) {
                console.error('Error al eliminar usuario:', err);
                Swal.fire({
                    icon: 'error',
                    title: 'Error',
                    text: err.response?.data?.detail || 'Error al eliminar el usuario.'
                });
            }
        }
    };

    const handleAbrirTiendasModal = (targetUser) => {
        const actualesIds = (targetUser.tiendas_autorizadas || []).map(t => t.id);
        setTiendasModalUser(targetUser);
        setTiendasModalSel(actualesIds);
        setShowTiendasModal(true);
    };

    const handleGuardarTiendasAutorizadas = async () => {
        if (!tiendasModalUser) return;
        setGuardandoTiendas(true);
        try {
            await axios.post(
                `${BASE_API_ENDPOINT}/api/users/${tiendasModalUser.id}/set-tiendas-autorizadas/`,
                { tiendas: tiendasModalSel },
                { headers: { Authorization: `Bearer ${token}` } }
            );
            Swal.fire({ icon: 'success', title: 'Acceso actualizado', timer: 1500, showConfirmButton: false });
            setShowTiendasModal(false);
            fetchUsers();
        } catch (err) {
            Swal.fire('Error', err.response?.data?.error || 'No se pudo actualizar el acceso.', 'error');
        } finally {
            setGuardandoTiendas(false);
        }
    };

    const handleChangePassword = async (userId) => {
        setSelectedUserId(userId);
        setPasswordForm({ new_password: '', new_password2: '' });
        setShowPasswordModal(true);
    };

    const handleSubmitPasswordChange = async (e) => {
        e.preventDefault();
        
        if (passwordForm.new_password !== passwordForm.new_password2) {
            Swal.fire({
                icon: 'error',
                title: 'Error',
                text: 'Las contraseñas no coinciden.'
            });
            return;
        }

        try {
            await axios.post(`${BASE_API_ENDPOINT}/api/users/${selectedUserId}/change_password/`, {
                new_password: passwordForm.new_password,
                new_password2: passwordForm.new_password2
            }, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            
            Swal.fire({
                icon: 'success',
                title: 'Éxito',
                text: 'Contraseña actualizada correctamente.'
            });
            
            setShowPasswordModal(false);
            setPasswordForm({ new_password: '', new_password2: '' });
            setSelectedUserId(null);
        } catch (err) {
            console.error('Error al cambiar contraseña:', err);
            Swal.fire({
                icon: 'error',
                title: 'Error',
                text: err.response?.data?.new_password?.[0] || err.response?.data?.detail || 'Error al cambiar la contraseña.'
            });
        }
    };

    // ========== FUNCIONES PARA MÉTODOS DE PAGO (solo para aranceles) ==========
    const [metodosPago, setMetodosPago] = useState([]);
    
    const fetchMetodosPago = useCallback(async () => {
        if (!token) return;
        try {
            const response = await axios.get(`${BASE_API_ENDPOINT}/api/metodos-pago/`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            setMetodosPago(response.data.results || response.data);
        } catch (err) {
            console.error('Error al cargar métodos de pago:', err);
            Swal.fire({
                icon: 'error',
                title: 'Error',
                text: 'No se pudieron cargar los métodos de pago.'
            });
        }
    }, [token]);

    // ========== FUNCIONES PARA ARANCELES ==========
    const fetchAranceles = useCallback(async () => {
        if (!token || !selectedStoreSlug) return;
        try {
            const response = await axios.get(`${BASE_API_ENDPOINT}/api/aranceles-tienda/?tienda_slug=${selectedStoreSlug}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            setAranceles(response.data.results || response.data);
        } catch (err) {
            console.error('Error al cargar aranceles:', err);
            Swal.fire({
                icon: 'error',
                title: 'Error',
                text: 'No se pudieron cargar los aranceles.'
            });
        }
    }, [token, selectedStoreSlug]);

    const handleArancelFormChange = (e) => {
        const { name, value, type, checked } = e.target;
        setArancelForm({
            ...arancelForm,
            [name]: type === 'checkbox' ? checked : value
        });
    };

    const handleCreateArancel = async (e) => {
        e.preventDefault();
        
        if (arancelForm.metodo_pago_nuevo && !arancelForm.nuevo_metodo_nombre?.trim()) {
            Swal.fire({ icon: 'error', title: 'Error', text: 'Ingresa el nombre del nuevo método de pago.' });
            return;
        }
        if (!arancelForm.metodo_pago_nuevo && !arancelForm.metodo_pago) {
            Swal.fire({ icon: 'error', title: 'Error', text: 'Selecciona un método de pago o crea uno nuevo.' });
            return;
        }
        if (arancelForm.plan_custom && !arancelForm.plan_custom_nombre?.trim()) {
            Swal.fire({ icon: 'error', title: 'Error', text: 'Ingresa el nombre del plan personalizado.' });
            return;
        }
        
        try {
            let metodoPagoId = arancelForm.metodo_pago;
            
            if (arancelForm.metodo_pago_nuevo && arancelForm.nuevo_metodo_nombre?.trim()) {
                const metodoRes = await axios.post(`${BASE_API_ENDPOINT}/api/metodos-pago/`, {
                    nombre: arancelForm.nuevo_metodo_nombre.trim(),
                    descripcion: arancelForm.nuevo_metodo_descripcion?.trim() || '',
                    activo: true,
                    es_financiero: true
                }, { headers: { 'Authorization': `Bearer ${token}` } });
                metodoPagoId = metodoRes.data.id;
                fetchMetodosPago();
            }
            
            const planFinal = arancelForm.plan_custom && arancelForm.plan_custom_nombre?.trim()
                ? arancelForm.plan_custom_nombre.trim()
                : arancelForm.nombre_plan;
            
            await axios.post(`${BASE_API_ENDPOINT}/api/aranceles-tienda/`, {
                metodo_pago: metodoPagoId,
                nombre_plan: planFinal,
                arancel_porcentaje: parseFloat(arancelForm.arancel_porcentaje) || 0,
                tienda: selectedStoreSlug
            }, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            
            Swal.fire({
                icon: 'success',
                title: 'Éxito',
                text: 'Arancel creado correctamente.'
            });
            
            setShowArancelForm(false);
            setArancelForm({
                metodo_pago: '',
                metodo_pago_nuevo: false,
                nuevo_metodo_nombre: '',
                nuevo_metodo_descripcion: '',
                nombre_plan: 'CONTADO',
                plan_custom: false,
                plan_custom_nombre: '',
                arancel_porcentaje: '0.00',
                tienda: selectedStoreSlug
            });
            fetchAranceles();
        } catch (err) {
            console.error('Error al crear arancel:', err);
            Swal.fire({
                icon: 'error',
                title: 'Error',
                text: err.response?.data?.detail || err.response?.data?.non_field_errors?.[0] || (typeof err.response?.data === 'object' ? Object.values(err.response.data).flat().join(' ') : 'Error al crear el arancel.')
            });
        }
    };

    const handleEditArancel = (arancel) => {
        const metodoPagoId = typeof arancel.metodo_pago === 'object' && arancel.metodo_pago !== null ? arancel.metodo_pago.id : arancel.metodo_pago;
        const planVal = arancel.nombre_plan || 'CONTADO';
        const isPlanCustom = !PLAN_CHOICES.some(p => p.value === planVal);
        
        setEditArancelData({
            id: arancel.id,
            metodo_pago: metodoPagoId || '',
            metodo_pago_nuevo: false,
            nuevo_metodo_nombre: '',
            nuevo_metodo_descripcion: '',
            nombre_plan: isPlanCustom ? 'CONTADO' : planVal,
            plan_custom: isPlanCustom,
            plan_custom_nombre: isPlanCustom ? planVal : '',
            arancel_porcentaje: arancel.arancel_porcentaje ? arancel.arancel_porcentaje.toString() : '0.00'
        });
        setShowEditArancelModal(true);
    };

    const handleUpdateArancel = async () => {
        if (editArancelData.metodo_pago_nuevo && !editArancelData.nuevo_metodo_nombre?.trim()) {
            Swal.fire({ icon: 'error', title: 'Error', text: 'Ingresa el nombre del nuevo método de pago.' });
            return;
        }
        if (!editArancelData.metodo_pago_nuevo && !editArancelData.metodo_pago) {
            Swal.fire({ icon: 'error', title: 'Error', text: 'Selecciona un método de pago o crea uno nuevo.' });
            return;
        }
        if (editArancelData.plan_custom && !editArancelData.plan_custom_nombre?.trim()) {
            Swal.fire({ icon: 'error', title: 'Error', text: 'Ingresa el nombre del plan personalizado.' });
            return;
        }
        
        try {
            let metodoPagoId = editArancelData.metodo_pago;
            if (editArancelData.metodo_pago_nuevo && editArancelData.nuevo_metodo_nombre?.trim()) {
                const metodoRes = await axios.post(`${BASE_API_ENDPOINT}/api/metodos-pago/`, {
                    nombre: editArancelData.nuevo_metodo_nombre.trim(),
                    descripcion: editArancelData.nuevo_metodo_descripcion?.trim() || '',
                    activo: true,
                    es_financiero: true
                }, { headers: { 'Authorization': `Bearer ${token}` } });
                metodoPagoId = metodoRes.data.id;
                fetchMetodosPago();
            }
            const planFinal = editArancelData.plan_custom && editArancelData.plan_custom_nombre?.trim()
                ? editArancelData.plan_custom_nombre.trim()
                : editArancelData.nombre_plan;
            
            await axios.patch(`${BASE_API_ENDPOINT}/api/aranceles-tienda/${editArancelData.id}/`, {
                metodo_pago: metodoPagoId,
                nombre_plan: planFinal,
                arancel_porcentaje: parseFloat(editArancelData.arancel_porcentaje) || 0,
                tienda: selectedStoreSlug
            }, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            
            Swal.fire({
                icon: 'success',
                title: 'Éxito',
                text: 'Arancel actualizado correctamente.'
            });
            
            setShowEditArancelModal(false);
            setEditArancelData(null);
            fetchAranceles();
        } catch (err) {
            console.error('Error al actualizar arancel:', err);
            Swal.fire({
                icon: 'error',
                title: 'Error',
                text: err.response?.data?.detail || 'Error al actualizar el arancel.'
            });
        }
    };

    const handleDeleteArancel = async (arancelId) => {
        const result = await Swal.fire({
            title: '¿Estás seguro?',
            text: 'Esta acción no se puede deshacer.',
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#d33',
            cancelButtonColor: '#3085d6',
            confirmButtonText: 'Sí, eliminar',
            cancelButtonText: 'Cancelar'
        });

        if (result.isConfirmed) {
            try {
                await axios.delete(`${BASE_API_ENDPOINT}/api/aranceles-tienda/${arancelId}/`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                
                Swal.fire({
                    icon: 'success',
                    title: 'Éxito',
                    text: 'Arancel eliminado correctamente.'
                });
                
                fetchAranceles();
            } catch (err) {
                console.error('Error al eliminar arancel:', err);
                Swal.fire({
                    icon: 'error',
                    title: 'Error',
                    text: err.response?.data?.detail || 'Error al eliminar el arancel.'
                });
            }
        }
    };

    const handleGuardarModoArancelesML = async (nuevoValor) => {
        if (!tiendaInfo?.id) return;
        setGuardandoModoML(true);
        try {
            await axios.patch(
                `${BASE_API_ENDPOINT}/api/tiendas/${tiendaInfo.id}/`,
                { ml_aranceles_automaticos: nuevoValor },
                { headers: { 'Authorization': `Bearer ${token}` } }
            );
            setMlArancelesAutomaticos(nuevoValor);
            Swal.fire({ icon: 'success', title: 'Modo guardado', timer: 1500, showConfirmButton: false });
        } catch (err) {
            Swal.fire('Error', err.response?.data?.detail || 'No se pudo guardar el modo.', 'error');
        } finally {
            setGuardandoModoML(false);
        }
    };

    // ========== FUNCIONES PARA ARANCELES MERCADO LIBRE ==========
    const fetchArancelesML = useCallback(async () => {
        if (!token || !selectedStoreSlug) return;
        try {
            const response = await axios.get(`${BASE_API_ENDPOINT}/api/aranceles-ml/?tienda_slug=${selectedStoreSlug}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            setArancelesML(response.data.results || response.data);
        } catch (err) {
            console.error('Error al cargar aranceles ML:', err);
            Swal.fire({
                icon: 'error',
                title: 'Error',
                text: 'No se pudieron cargar los aranceles de Mercado Libre.'
            });
        }
    }, [token, selectedStoreSlug]);

    const fetchProductosML = useCallback(async () => {
        if (!token || !selectedStoreSlug) return;
        try {
            let allProducts = [];
            let nextUrl = `${BASE_API_ENDPOINT}/api/productos/?tienda_slug=${selectedStoreSlug}`;
            while (nextUrl) {
                const response = await axios.get(nextUrl, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                const results = response.data.results || response.data;
                const pageProducts = Array.isArray(results) ? results : [];
                allProducts = allProducts.concat(pageProducts);
                nextUrl = response.data.next || null;
            }
            setProductosML(allProducts);
        } catch (err) {
            console.error('Error al cargar productos para aranceles ML:', err);
            setProductosML([]);
        }
    }, [token, selectedStoreSlug]);

    const handleArancelMLFormChange = (e) => {
        const { name, value } = e.target;
        setArancelMLForm({
            ...arancelMLForm,
            [name]: value
        });
    };

    const handleCreateArancelML = async (e) => {
        e.preventDefault();
        
        try {
            await axios.post(`${BASE_API_ENDPOINT}/api/aranceles-ml/`, {
                producto: arancelMLForm.producto,
                arancel_porcentaje: parseFloat(arancelMLForm.arancel_porcentaje) || 0,
                costo_envio: parseFloat(arancelMLForm.costo_envio) || 0,
                tienda: selectedStoreSlug
            }, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            
            Swal.fire({
                icon: 'success',
                title: 'Éxito',
                text: 'Arancel de Mercado Libre creado correctamente.'
            });
            
            setShowArancelMLForm(false);
            setArancelMLForm({
                producto: '',
                arancel_porcentaje: '0.00',
                costo_envio: '0.00',
                tienda: selectedStoreSlug
            });
            fetchArancelesML();
        } catch (err) {
            console.error('Error al crear arancel ML:', err);
            Swal.fire({
                icon: 'error',
                title: 'Error',
                text: err.response?.data?.detail || err.response?.data?.non_field_errors?.[0] || (typeof err.response?.data === 'object' ? Object.values(err.response.data).flat().join(' ') : 'Error al crear el arancel.')
            });
        }
    };

    const handleEditArancelML = (arancel) => {
        const productoId = typeof arancel.producto === 'object' && arancel.producto !== null
            ? arancel.producto.id
            : arancel.producto;
        
        setEditArancelMLData({
            id: arancel.id,
            producto: productoId,
            arancel_porcentaje: arancel.arancel_porcentaje != null ? arancel.arancel_porcentaje.toString() : '0.00',
            costo_envio: arancel.costo_envio != null ? arancel.costo_envio.toString() : '0.00'
        });
        setShowEditArancelMLModal(true);
    };

    const handleUpdateArancelML = async () => {
        try {
            await axios.patch(`${BASE_API_ENDPOINT}/api/aranceles-ml/${editArancelMLData.id}/`, {
                producto: editArancelMLData.producto,
                arancel_porcentaje: parseFloat(editArancelMLData.arancel_porcentaje) || 0,
                costo_envio: parseFloat(editArancelMLData.costo_envio) || 0,
                tienda: selectedStoreSlug
            }, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            
            Swal.fire({
                icon: 'success',
                title: 'Éxito',
                text: 'Arancel de Mercado Libre actualizado correctamente.'
            });
            
            setShowEditArancelMLModal(false);
            setEditArancelMLData(null);
            fetchArancelesML();
        } catch (err) {
            console.error('Error al actualizar arancel ML:', err);
            Swal.fire({
                icon: 'error',
                title: 'Error',
                text: err.response?.data?.detail || 'Error al actualizar el arancel.'
            });
        }
    };

    const handleDeleteArancelML = async (arancelId) => {
        const result = await Swal.fire({
            title: '¿Estás seguro?',
            text: 'Esta acción no se puede deshacer.',
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#d33',
            cancelButtonColor: '#3085d6',
            confirmButtonText: 'Sí, eliminar',
            cancelButtonText: 'Cancelar'
        });

        if (result.isConfirmed) {
            try {
                await axios.delete(`${BASE_API_ENDPOINT}/api/aranceles-ml/${arancelId}/`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                
                Swal.fire({
                    icon: 'success',
                    title: 'Éxito',
                    text: 'Arancel de Mercado Libre eliminado correctamente.'
                });
                
                fetchArancelesML();
            } catch (err) {
                console.error('Error al eliminar arancel ML:', err);
                Swal.fire({
                    icon: 'error',
                    title: 'Error',
                    text: err.response?.data?.detail || 'Error al eliminar el arancel.'
                });
            }
        }
    };

    const PLAN_CHOICES = [
        { value: 'CONTADO', label: 'Contado / Pago Único' },
        { value: '1', label: '1 Cuota' },
        { value: '3', label: '3 Cuotas' },
        { value: '6', label: '6 Cuotas' },
        { value: '12', label: '12 Cuotas' },
        { value: 'Z', label: 'Z (Plan Z)' }
    ];

    if (loading || authLoading) {
        return <div style={styles.loadingMessage}>Cargando...</div>;
    }

    if (!isAuthenticated || !user?.is_superuser) {
        return (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '50vh', gap: 12, padding: 24, textAlign: 'center' }}>
                <div style={{ background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: 10, padding: '28px 32px', maxWidth: 380 }}>
                    <div style={{ fontSize: 32, marginBottom: 12 }}>🔒</div>
                    <p style={{ fontSize: 16, fontWeight: 700, color: '#1a2926', margin: '0 0 8px' }}>Acceso restringido</p>
                    <p style={{ fontSize: 14, color: '#475569', margin: 0 }}>Esta sección es solo para administradores. Si creés que es un error, contactá al soporte.</p>
                </div>
            </div>
        );
    }

    return (
        <>
            <style>{mobileStyles}</style>
            <div style={styles.container} className="panel-admin-container">
            <div style={styles.header}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <h1 style={styles.title}>Administración</h1>
                    <HelpButton
                        titulo={{
                            'usuarios': 'Gestión de Usuarios',
                            'medios-pago-aranceles': 'Medios de Pago y Aranceles',
                            'habilitar-facturador': 'Facturación electrónica (ARCA)',
                            'notas-credito': 'Notas de Crédito',
                            'aranceles-ml': 'Aranceles MercadoLibre',
                            'tiendanube': 'Integración TiendaNube',
                            'mercadolibre-panel': 'Integración MercadoLibre',
                        }[activeTab] || 'Panel de Administración'}
                        bullets={{
                            'usuarios': [
                                'Creá y administrá los usuarios de la tienda (staff, supervisores y administradores).',
                                'Asigná roles: Staff solo ve el Punto de Venta, Supervisor puede ver ventas y compras, Admin tiene acceso total.',
                                'Podés resetear la contraseña de cualquier usuario desde aquí.',
                                'Activá o desactivá el permiso de "Abrir Caja" por usuario.',
                            ],
                            'medios-pago-aranceles': [
                                'Configurá los medios de pago disponibles en el Punto de Venta.',
                                'Definí el arancel (%) de cada medio de pago para el cálculo de costos.',
                                'Los aranceles afectan el análisis de rentabilidad por venta.',
                            ],
                            'habilitar-facturador': [
                                'Configurá los datos de tu empresa para emitir facturas electrónicas ante ARCA.',
                                'El proceso requiere configurar CUIT, punto de venta, CSR y certificado.',
                                'Una vez operativo, podrás emitir Facturas A y B desde el Punto de Venta.',
                            ],
                            'notas-credito': [
                                'Emitir notas de crédito para anular o ajustar facturas electrónicas ya emitidas.',
                                'Buscá la factura original por número y generá la nota de crédito correspondiente.',
                                'Requiere que el facturador ARCA esté operativo.',
                            ],
                            'aranceles-ml': [
                                'Configurá los aranceles de MercadoLibre según categoría de producto.',
                                'Los aranceles se usan para calcular la rentabilidad de ventas por ML.',
                                'Podés definir aranceles manuales o usar los automáticos por categoría.',
                            ],
                            'tiendanube': [
                                'Conectá tu tienda TiendaNube para sincronizar productos y stock.',
                                'Configurá las credenciales de la API de TiendaNube.',
                                'El stock se actualiza automáticamente al registrar ventas.',
                            ],
                            'mercadolibre-panel': [
                                'Conectá tu cuenta de MercadoLibre para gestionar publicaciones y ventas.',
                                'Sincronizá el stock entre Total Stock y tus publicaciones de ML.',
                                'Visualizá las ventas de ML y su impacto en el inventario.',
                            ],
                        }[activeTab] || [
                            'Panel de administración de la tienda.',
                            'Seleccioná una pestaña para ver las opciones disponibles.',
                        ]}
                    />
                </div>
            </div>

            <div style={styles.tabs} className="panel-admin-tabs">
                <button
                    onClick={() => setActiveTab('usuarios')}
                    style={activeTab === 'usuarios' ? { ...styles.tab, ...styles.tabActive } : styles.tab}
                    className="panel-admin-tab"
                >
                    Usuarios
                </button>
                <button
                    onClick={() => setActiveTab('medios-pago-aranceles')}
                    style={activeTab === 'medios-pago-aranceles' ? { ...styles.tab, ...styles.tabActive } : styles.tab}
                    className="panel-admin-tab"
                >
                    Medios de Pago y Aranceles
                </button>
                <button
                    onClick={() => {
                        if (planInfo && !planInfo.legacy && !planInfo.permite_factura_electronica) {
                            setUpgradeMotivo('factura');
                            setShowUpgradeModal(true);
                        } else {
                            setActiveTab('habilitar-facturador');
                        }
                    }}
                    style={activeTab === 'habilitar-facturador' ? { ...styles.tab, ...styles.tabActive } : styles.tab}
                    className="panel-admin-tab"
                >
                    Habilitar facturador
                    {afipEstado && (
                        <span style={{
                            marginLeft: 8, fontSize: 11, fontWeight: 700, padding: '2px 7px', borderRadius: 10,
                            ...(afipEstado.paso1_config && afipEstado.paso2_csr && afipEstado.paso4_cert
                                ? { background: '#edfaf3', color: '#1a7a3f', border: '1px solid #a8e6c5' }
                                : afipEstado.paso1_config
                                    ? { background: '#fffbeb', color: '#92400e', border: '1px solid #fcd34d' }
                                    : { background: '#fef2f2', color: '#991b1b', border: '1px solid #fca5a5' }
                            )
                        }}>
                            {afipEstado.paso1_config && afipEstado.paso2_csr && afipEstado.paso4_cert ? '✅ Operativo' : afipEstado.paso1_config ? '⚠️ Incompleto' : '❌ Sin config'}
                        </span>
                    )}
                </button>
                {afipEstado?.paso1_config && afipEstado?.paso2_csr && afipEstado?.paso4_cert && (
                    <button
                        onClick={() => setActiveTab('notas-credito')}
                        style={activeTab === 'notas-credito' ? { ...styles.tab, ...styles.tabActive } : styles.tab}
                        className="panel-admin-tab"
                    >
                        Notas de Crédito
                    </button>
                )}
                {tiendaInfo && tiendaInfo.plataforma_ecommerce === 'MERCADO_LIBRE' && (
                    <button
                        onClick={() => setActiveTab('aranceles-ml')}
                        style={activeTab === 'aranceles-ml' ? { ...styles.tab, ...styles.tabActive } : styles.tab}
                        className="panel-admin-tab"
                    >
                        Aranceles Mercado Libre
                    </button>
                )}
                <button
                    onClick={() => {
                        if (planInfo && !planInfo.legacy && !planInfo.permite_integracion_ecommerce) {
                            setUpgradeMotivo('ecommerce');
                            setShowUpgradeModal(true);
                        } else {
                            setActiveTab('tiendanube');
                        }
                    }}
                    style={activeTab === 'tiendanube' ? { ...styles.tab, ...styles.tabActive } : styles.tab}
                    className="panel-admin-tab"
                >
                    Tienda Nube
                </button>
                <button
                    onClick={() => {
                        if (planInfo && !planInfo.legacy && !planInfo.permite_integracion_ecommerce) {
                            setUpgradeMotivo('ecommerce');
                            setShowUpgradeModal(true);
                        } else {
                            setActiveTab('mercadolibre-panel');
                        }
                    }}
                    style={activeTab === 'mercadolibre-panel' ? { ...styles.tab, ...styles.tabActive } : styles.tab}
                    className="panel-admin-tab"
                >
                    Mercado Libre
                </button>
                <button
                    onClick={() => {
                        setActiveTab('mi-plan');
                        setLoadingPlan(true);
                        axios.get(`${BASE_API_ENDPOINT}/api/suscripcion/mi-plan/`, {
                            headers: { Authorization: `Bearer ${token}` }
                        }).then(r => setPlanInfo(r.data)).catch(() => setPlanInfo(null)).finally(() => setLoadingPlan(false));
                    }}
                    style={activeTab === 'mi-plan' ? { ...styles.tab, ...styles.tabActive } : styles.tab}
                    className="panel-admin-tab"
                >
                    Mi Plan
                </button>
                <button
                    onClick={() => setActiveTab('historial')}
                    style={activeTab === 'historial' ? { ...styles.tab, ...styles.tabActive } : styles.tab}
                    className="panel-admin-tab"
                >
                    Historial
                </button>
            </div>

            {/* TAB: USUARIOS */}
            {activeTab === 'usuarios' && (
                <div style={styles.tabContent}>
                    <div style={styles.sectionHeader} className="panel-admin-section-header">
                        <button onClick={() => {
                            setEditingUser(null);
                            setUserForm({
                                username: '',
                                email: '',
                                password: '',
                                password2: '',
                                first_name: '',
                                last_name: '',
                                is_staff: false,
                                is_superuser: false,
                                is_supervisor: false,
                                cierre_caja_habilitado: false,
                                tienda: selectedStoreSlug
                            });
                            setShowUserForm(true);
                        }} style={styles.addButton} className="panel-admin-add-button">
                            + Nuevo Usuario
                        </button>
                    </div>

                    {showUserForm && (
                        <div style={styles.formContainer}>
                            <h3>{editingUser ? 'Editar Usuario' : 'Nuevo Usuario'}</h3>
                            <form onSubmit={editingUser ? handleUpdateUser : handleCreateUser}>
                                <div style={styles.formGrid} className="panel-admin-form-grid">
                                    <div style={styles.formGroup}>
                                        <label>Usuario *</label>
                                        <input
                                            type="text"
                                            name="username"
                                            value={userForm.username}
                                            onChange={handleUserFormChange}
                                            required
                                            style={styles.input}
                                        />
                                    </div>
                                    <div style={styles.formGroup}>
                                        <label>Email</label>
                                        <input
                                            type="email"
                                            name="email"
                                            value={userForm.email}
                                            onChange={handleUserFormChange}
                                            style={styles.input}
                                        />
                                    </div>
                                    {!editingUser && (
                                        <>
                                            <div style={styles.formGroup}>
                                                <label>Contraseña *</label>
                                                <input
                                                    type="password"
                                                    name="password"
                                                    value={userForm.password}
                                                    onChange={handleUserFormChange}
                                                    required={!editingUser}
                                                    style={styles.input}
                                                />
                                            </div>
                                            <div style={styles.formGroup}>
                                                <label>Confirmar Contraseña *</label>
                                                <input
                                                    type="password"
                                                    name="password2"
                                                    value={userForm.password2}
                                                    onChange={handleUserFormChange}
                                                    required={!editingUser}
                                                    style={styles.input}
                                                />
                                            </div>
                                        </>
                                    )}
                                    <div style={styles.formGroup}>
                                        <label>Nombre</label>
                                        <input
                                            type="text"
                                            name="first_name"
                                            value={userForm.first_name}
                                            onChange={handleUserFormChange}
                                            style={styles.input}
                                        />
                                    </div>
                                    <div style={styles.formGroup}>
                                        <label>Apellido</label>
                                        <input
                                            type="text"
                                            name="last_name"
                                            value={userForm.last_name}
                                            onChange={handleUserFormChange}
                                            style={styles.input}
                                        />
                                    </div>
                                    <div style={styles.formGroup}>
                                        <label>
                                            <input
                                                type="checkbox"
                                                name="is_staff"
                                                checked={userForm.is_staff}
                                                onChange={handleUserFormChange}
                                                style={styles.checkbox}
                                            />
                                            Es Staff
                                        </label>
                                    </div>
                                    <div style={styles.formGroup}>
                                        <label>
                                            <input
                                                type="checkbox"
                                                name="is_supervisor"
                                                checked={userForm.is_supervisor}
                                                onChange={handleUserFormChange}
                                                style={styles.checkbox}
                                            />
                                            Es Supervisor
                                        </label>
                                    </div>
                                    <div style={styles.formGroup}>
                                        <label>
                                            <input
                                                type="checkbox"
                                                name="is_superuser"
                                                checked={userForm.is_superuser}
                                                onChange={handleUserFormChange}
                                                style={styles.checkbox}
                                            />
                                            Es Administrador
                                        </label>
                                    </div>
                                    <div style={styles.formGroup}>
                                        <label>
                                            <input
                                                type="checkbox"
                                                name="cierre_caja_habilitado"
                                                checked={userForm.cierre_caja_habilitado}
                                                onChange={handleUserFormChange}
                                                style={styles.checkbox}
                                            />
                                            Habilitar cierre de caja (turno)
                                        </label>
                                    </div>
                                </div>
                                <div style={styles.formActions} className="panel-admin-form-actions">
                                    <button type="submit" style={styles.saveButton}>
                                        {editingUser ? 'Actualizar' : 'Crear'}
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setShowUserForm(false);
                                            setEditingUser(null);
                                        }}
                                        style={styles.cancelButton}
                                    >
                                        Cancelar
                                    </button>
                                </div>
                            </form>
                        </div>
                    )}

                    {/* Calcula si el admin logueado tiene tiendas para delegar */}
                    {(() => {
                        const tiendasDelegables = tiendasAutorizadas.filter(t => t.nombre !== selectedStoreSlug);
                        const mostrarColTiendas = tiendasDelegables.length > 0;
                        const colSpanTotal = mostrarColTiendas ? 9 : 8;
                        return (
                    <div style={styles.tableContainer} className="panel-admin-table-container">
                        <table style={styles.table} className="panel-admin-table">
                            <thead>
                                <tr>
                                    <th style={styles.th}>Usuario</th>
                                    <th style={styles.th}>Email</th>
                                    <th style={styles.th}>Nombre</th>
                                    <th style={styles.th}>Apellido</th>
                                    <th style={styles.th}>Staff</th>
                                    <th style={styles.th}>Supervisor</th>
                                    <th style={styles.th}>Admin</th>
                                    {mostrarColTiendas && <th style={styles.th}>Tiendas autorizadas</th>}
                                    <th style={styles.th}>Acciones</th>
                                </tr>
                            </thead>
                            <tbody>
                                {users.length === 0 ? (
                                    <tr>
                                        <td colSpan={colSpanTotal} style={styles.td}>No hay usuarios registrados</td>
                                    </tr>
                                ) : (
                                    users.map(user => (
                                        <tr key={user.id}>
                                            <td style={styles.td}>{user.username}</td>
                                            <td style={styles.td}>{user.email || '-'}</td>
                                            <td style={styles.td}>{user.first_name || '-'}</td>
                                            <td style={styles.td}>{user.last_name || '-'}</td>
                                            <td style={styles.td}>{user.is_staff ? 'Sí' : 'No'}</td>
                                            <td style={styles.td}>{user.is_supervisor ? 'Sí' : 'No'}</td>
                                            <td style={styles.td}>{user.is_superuser ? 'Sí' : 'No'}</td>
                                            {mostrarColTiendas && (
                                                <td style={styles.td}>
                                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, alignItems: 'center' }}>
                                                        {(user.tiendas_autorizadas || [])
                                                            .filter(t => tiendasDelegables.some(d => d.id === t.id))
                                                            .map(t => (
                                                                <span key={t.id} style={{ background: '#ebf8ff', color: '#2b6cb0', borderRadius: 10, padding: '2px 8px', fontSize: 11, fontWeight: 600 }}>
                                                                    {t.nombre}
                                                                </span>
                                                            ))
                                                        }
                                                        <button
                                                            onClick={() => handleAbrirTiendasModal(user)}
                                                            style={{ padding: '2px 8px', borderRadius: 6, border: '1px solid #bee3f8', background: '#fff', color: '#2b6cb0', fontSize: 11, cursor: 'pointer' }}
                                                        >
                                                            Editar
                                                        </button>
                                                    </div>
                                                </td>
                                            )}
                                            <td style={styles.td}>
                                                <div style={styles.actionButtons} className="panel-admin-action-buttons">
                                                    <button
                                                        className="icon-btn"
                                                        onClick={() => handleEditUser(user)}
                                                        style={{ color: 'white', backgroundColor: '#f59e0b' }}
                                                        data-tooltip="Editar usuario"
                                                    >
                                                        <FontAwesomeIcon icon={faPencil} />
                                                    </button>
                                                    <button
                                                        className="icon-btn"
                                                        onClick={() => handleChangePassword(user.id)}
                                                        style={{ color: 'white', backgroundColor: '#3b9ede' }}
                                                        data-tooltip="Cambiar contraseña"
                                                    >
                                                        <FontAwesomeIcon icon={faKey} />
                                                    </button>
                                                    <button
                                                        className="icon-btn"
                                                        onClick={() => handleDeleteUser(user.id)}
                                                        style={{ color: 'white', backgroundColor: '#e25252' }}
                                                        data-tooltip="Eliminar usuario"
                                                    >
                                                        <FontAwesomeIcon icon={faTrash} />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                        );
                    })()}
                </div>
            )}

            {/* TAB: MEDIOS DE PAGO Y ARANCELES */}
            {activeTab === 'medios-pago-aranceles' && (
                <div style={styles.tabContent}>
                    <div style={styles.sectionHeader} className="panel-admin-section-header">
                        <button onClick={() => {
                            setArancelForm({
                                metodo_pago: '',
                                metodo_pago_nuevo: false,
                                nuevo_metodo_nombre: '',
                                nuevo_metodo_descripcion: '',
                                nombre_plan: 'CONTADO',
                                plan_custom: false,
                                plan_custom_nombre: '',
                                arancel_porcentaje: '0.00',
                                tienda: selectedStoreSlug
                            });
                            setShowArancelForm(true);
                        }} style={styles.addButton} className="panel-admin-add-button">
                            + Nuevo Arancel
                        </button>
                    </div>

                    {showArancelForm && (
                        <div style={styles.formContainer} className="panel-admin-form-container">
                            <h3>Nuevo Arancel</h3>
                            <form onSubmit={handleCreateArancel}>
                                <div style={styles.formGrid} className="panel-admin-form-grid">
                                    <div style={{ ...styles.formGroup, gridColumn: '1 / -1' }}>
                                        <label>Método de Pago *</label>
                                        <select name="metodo_pago" value={arancelForm.metodo_pago} onChange={handleArancelFormChange} required style={styles.input}>
                                            <option value="">Seleccionar método...</option>
                                            {metodosPago.filter(m => m.es_financiero && m.nombre !== 'Mercado Libre').map(metodo => (
                                                <option key={metodo.id} value={metodo.id}>{metodo.nombre}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div style={{ ...styles.formGroup, gridColumn: '1 / -1' }}>
                                        <label>Plan *</label>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                                            <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
                                                <input type="radio" name="plan_modo" checked={!arancelForm.plan_custom} onChange={() => setArancelForm({ ...arancelForm, plan_custom: false })} />
                                                Seleccionar existente
                                            </label>
                                            <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
                                                <input type="radio" name="plan_modo" checked={arancelForm.plan_custom} onChange={() => setArancelForm({ ...arancelForm, plan_custom: true })} />
                                                Crear nuevo
                                            </label>
                                        </div>
                                        {!arancelForm.plan_custom ? (
                                            <select name="nombre_plan" value={arancelForm.nombre_plan} onChange={handleArancelFormChange} required={!arancelForm.plan_custom} style={styles.input}>
                                                {PLAN_CHOICES.map(plan => (
                                                    <option key={plan.value} value={plan.value}>{plan.label}</option>
                                                ))}
                                            </select>
                                        ) : (
                                            <input type="text" name="plan_custom_nombre" value={arancelForm.plan_custom_nombre} onChange={handleArancelFormChange} placeholder="Nombre del plan (ej: 18 cuotas)" style={styles.input} required={arancelForm.plan_custom} />
                                        )}
                                    </div>
                                    <div style={styles.formGroup}>
                                        <label>Arancel (%) *</label>
                                        <input
                                            type="number"
                                            name="arancel_porcentaje"
                                            value={arancelForm.arancel_porcentaje}
                                            onChange={handleArancelFormChange}
                                            required
                                            min="0"
                                            max="100"
                                            step="0.01"
                                            style={styles.input}
                                        />
                                    </div>
                                </div>
                                <div style={styles.formActions} className="panel-admin-form-actions">
                                    <button type="submit" style={styles.saveButton}>
                                        Crear
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setShowArancelForm(false);
                                        }}
                                        style={styles.cancelButton}
                                    >
                                        Cancelar
                                    </button>
                                </div>
                            </form>
                        </div>
                    )}

                    <div style={styles.infoBox}>
                        <h3 style={{ marginTop: 0, marginBottom: '10px' }}>Medios de Pago Disponibles</h3>
                        <p style={{ marginBottom: '10px' }}>Los medios de pago se configuran globalmente. A continuación puedes configurar los aranceles para cada método de pago que lo permita.</p>
                        <div style={styles.tableContainer} className="panel-admin-table-container">
                            <table style={styles.table} className="panel-admin-table">
                                <thead>
                                    <tr>
                                        <th style={styles.th}>Nombre</th>
                                        <th style={styles.th}>Descripción</th>
                                        <th style={styles.th}>Activo</th>
                                        <th style={styles.th}>Permite Aranceles</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {metodosPago.length === 0 ? (
                                        <tr>
                                            <td colSpan="4" style={styles.td}>No hay métodos de pago registrados</td>
                                        </tr>
                                    ) : (
                                        metodosPago.map(metodo => (
                                            <tr key={metodo.id}>
                                                <td style={styles.td}>{metodo.nombre}</td>
                                                <td style={styles.td}>{metodo.descripcion || '-'}</td>
                                                <td style={styles.td}>{metodo.activo ? 'Sí' : 'No'}</td>
                                                <td style={styles.td}>{metodo.es_financiero ? 'Sí' : 'No'}</td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    <h3 style={{ marginTop: '30px', marginBottom: '15px' }}>Aranceles Configurados</h3>
                    <div style={styles.tableContainer} className="panel-admin-table-container">
                        <table style={styles.table} className="panel-admin-table">
                            <thead>
                                <tr>
                                    <th style={styles.th}>Método de Pago</th>
                                    <th style={styles.th}>Plan</th>
                                    <th style={styles.th}>Arancel (%)</th>
                                    <th style={styles.th}>Acciones</th>
                                </tr>
                            </thead>
                            <tbody>
                                {aranceles.length === 0 ? (
                                    <tr>
                                        <td colSpan="4" style={styles.td}>No hay aranceles configurados</td>
                                    </tr>
                                ) : (
                                    aranceles.map(arancel => (
                                        <tr key={arancel.id}>
                                            <td style={styles.td}>{arancel.metodo_pago_nombre || '-'}</td>
                                            <td style={styles.td}>
                                                {PLAN_CHOICES.find(p => p.value === arancel.nombre_plan)?.label || arancel.nombre_plan}
                                            </td>
                                            <td style={styles.td}>{parseFloat(arancel.arancel_porcentaje).toFixed(2)}%</td>
                                            <td style={styles.td}>
                                                <div style={styles.actionButtons} className="panel-admin-action-buttons">
                                                    <button
                                                        className="icon-btn"
                                                        onClick={() => handleEditArancel(arancel)}
                                                        style={{ color: 'white', backgroundColor: '#f59e0b' }}
                                                        data-tooltip="Editar arancel"
                                                    >
                                                        <FontAwesomeIcon icon={faPencil} />
                                                    </button>
                                                    <button
                                                        className="icon-btn"
                                                        onClick={() => handleDeleteArancel(arancel.id)}
                                                        style={{ color: 'white', backgroundColor: '#e25252' }}
                                                        data-tooltip="Eliminar arancel"
                                                    >
                                                        <FontAwesomeIcon icon={faTrash} />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* TAB: HABILITAR FACTURADOR - Información para alta en facturación electrónica (ARCA) */}
            {activeTab === 'habilitar-facturador' && (() => {
                const pasos = [
                    { num: 1, label: 'Configurar datos', ok: afipEstado?.paso1_config },
                    { num: 2, label: 'Generar clave y CSR', ok: afipEstado?.paso2_csr },
                    { num: 3, label: 'Subir CSR a ARCA', ok: afipEstado?.paso2_csr }, // completado si ya generó el CSR
                    { num: 4, label: 'Cargar certificado', ok: afipEstado?.paso4_cert },
                    { num: 5, label: 'Configurar punto de venta', ok: puntoVentaGuardadoLocal },
                    { num: 6, label: 'Probar conexión', ok: false },
                ];
                const todoListo = afipEstado?.paso1_config && afipEstado?.paso2_csr && afipEstado?.paso4_cert;

                const stepStyle = (num) => ({
                    display: 'flex', alignItems: 'center', gap: 10, padding: '10px 16px',
                    borderRadius: 10, cursor: 'pointer', marginBottom: 6,
                    background: afipPasoActivo === num ? '#edfaf3' : 'transparent',
                    border: afipPasoActivo === num ? '1.5px solid #5dc87a' : '1.5px solid transparent',
                    fontWeight: afipPasoActivo === num ? 600 : 400,
                    color: '#1a2926',
                    transition: 'all 0.15s',
                });
                const badgeStyle = (ok) => ({
                    width: 22, height: 22, borderRadius: '50%', display: 'flex', alignItems: 'center',
                    justifyContent: 'center', fontSize: 13, fontWeight: 700, flexShrink: 0,
                    background: ok ? '#5dc87a' : '#e2e8f0',
                    color: ok ? '#fff' : '#94a3b8',
                });
                const inputStyle = {
                    width: '100%', padding: '9px 12px', borderRadius: 6,
                    border: '1px solid #e2e8f0', fontSize: 14, boxSizing: 'border-box',
                    marginTop: 4, marginBottom: 12,
                };
                const btnPrimary = (disabled) => ({
                    padding: '10px 22px', backgroundColor: disabled ? '#94a3b8' : '#3b9ede',
                    color: '#fff', border: 'none', borderRadius: 6, cursor: disabled ? 'not-allowed' : 'pointer',
                    fontSize: 14, fontWeight: 600,
                });
                const btnSuccess = (disabled) => ({
                    padding: '10px 22px', backgroundColor: disabled ? '#94a3b8' : '#5dc87a',
                    color: '#fff', border: 'none', borderRadius: 6, cursor: disabled ? 'not-allowed' : 'pointer',
                    fontSize: 14, fontWeight: 600,
                });

                return (
                <div style={styles.tabContent}>
                    <div style={{ maxWidth: 820 }}>
                        <h2 style={{ marginTop: 0, marginBottom: 4, fontSize: '1.35rem', color: '#1a2926' }}>
                            Facturación electrónica ARCA
                        </h2>
                        <p style={{ marginBottom: 24, color: '#475569', fontSize: 14 }}>
                            Seguí los pasos para conectar tu tienda con ARCA y emitir facturas electrónicas.
                        </p>

                        {/* Estado general */}
                        {todoListo && (
                            <div style={{ background: '#edfaf3', border: '1px solid #a8e6c5', borderRadius: 10, padding: '12px 18px', marginBottom: 24, display: 'flex', alignItems: 'center', gap: 10 }}>
                                <span style={{ fontSize: 20 }}>✅</span>
                                <span style={{ color: '#1a6a40', fontWeight: 600 }}>
                                    Facturador configurado. Podés probar la conexión en el paso 5.
                                </span>
                            </div>
                        )}

                        <div style={{ display: 'flex', gap: 28 }}>

                            {/* Sidebar de pasos */}
                            <div style={{ minWidth: 200, flexShrink: 0 }}>
                                {pasos.map(p => (
                                    <div key={p.num} style={stepStyle(p.num)} onClick={() => setAfipPasoActivo(p.num)}>
                                        <div style={badgeStyle(p.ok)}>{p.ok ? '✓' : p.num}</div>
                                        <span style={{ fontSize: 14 }}>{p.label}</span>
                                    </div>
                                ))}
                            </div>

                            {/* Contenido del paso activo */}
                            <div style={{ flex: 1, background: '#fff', border: '1px solid #e2e8f0', borderRadius: 10, padding: '24px 28px', minHeight: 300 }}>

                                {/* PASO 1: Configurar datos */}
                                {afipPasoActivo === 1 && (
                                    <div>
                                        <h3 style={{ marginTop: 0, color: '#1a2926' }}>Paso 1 — Configurar datos ARCA</h3>
                                        <p style={{ color: '#475569', fontSize: 14, marginBottom: 20 }}>
                                            Ingresá el CUIT y la condición frente al IVA de la tienda. El <strong>punto de venta</strong> se configura más adelante, en el paso 5 — no hace falta tenerlo a mano todavía.
                                        </p>

                                        <label style={{ fontSize: 13, fontWeight: 600, color: '#475569' }}>CUIT <span style={{ color: '#e25252' }}>*</span></label>
                                        <input
                                            style={inputStyle}
                                            type="text"
                                            placeholder="Ej: 20-12345678-9"
                                            value={afipForm.cuit}
                                            onChange={e => setAfipForm(p => ({ ...p, cuit: e.target.value }))}
                                        />

                                        <label style={{ fontSize: 13, fontWeight: 600, color: '#475569' }}>Condición IVA del emisor <span style={{ color: '#e25252' }}>*</span></label>
                                        <select
                                            style={{ ...inputStyle, background: '#fff' }}
                                            value={afipForm.condicion_iva_emisor}
                                            onChange={e => setAfipForm(p => ({ ...p, condicion_iva_emisor: e.target.value }))}
                                        >
                                            <option value="MT">Monotributo — emite Factura C</option>
                                            <option value="RI">Responsable Inscripto — emite A, B o C según el cliente</option>
                                            <option value="EX">IVA Exento — emite Factura B</option>
                                            <option value="CF">Consumidor Final</option>
                                            <option value="NR">No Responsable</option>
                                        </select>
                                        <p style={{ marginTop: -8, marginBottom: 16, fontSize: 13, color: '#475569' }}>
                                            ¿No sabés cuál sos? Es la misma categoría con la que estás inscripto en ARCA: si pagás una cuota fija mensual sos <strong>Monotributo</strong>; si facturás IVA discriminado sos <strong>Responsable Inscripto</strong>. Ante la duda, consultá con tu contador.
                                        </p>

                                        <button style={btnPrimary(afipSaving)} onClick={() => handleGuardarConfigAfip(2)} disabled={afipSaving}>
                                            {afipSaving ? 'Guardando...' : 'Guardar y continuar →'}
                                        </button>
                                    </div>
                                )}

                                {/* PASO 2: Generar clave y CSR */}
                                {afipPasoActivo === 2 && (
                                    <div>
                                        <h3 style={{ marginTop: 0, color: '#1a2926' }}>Paso 2 — Generar clave privada y CSR</h3>
                                        {!afipEstado?.paso1_config && (
                                            <div style={{ background: '#fffbeb', border: '1px solid #f59e0b', borderRadius: 6, padding: '10px 14px', marginBottom: 16, fontSize: 14 }}>
                                                ⚠️ Completá el paso 1 (CUIT y punto de venta) antes de continuar.
                                            </div>
                                        )}
                                        <p style={{ color: '#475569', fontSize: 14, marginBottom: 16 }}>
                                            Total Stock genera una <strong>clave privada RSA</strong> y un <strong>CSR</strong> (Certificate Signing Request) con los datos de tu tienda. La clave privada queda guardada de forma segura; vos solo te llevás el archivo <code>.csr</code> para subirlo a ARCA en el siguiente paso.
                                        </p>
                                        {afipEstado?.paso2_csr && (
                                            <div style={{ background: '#edfaf3', border: '1px solid #a8e6c5', borderRadius: 6, padding: '10px 14px', marginBottom: 16, fontSize: 14, color: '#1a6a40' }}>
                                                ✅ Ya generaste la clave y el CSR. Podés regenerarlos si es necesario.
                                            </div>
                                        )}
                                        <button
                                            style={btnPrimary(!afipEstado?.paso1_config)}
                                            onClick={handleGenerarCsr}
                                            disabled={!afipEstado?.paso1_config}
                                        >
                                            Generar clave privada y descargar CSR
                                        </button>
                                        {afipEstado?.paso2_csr && (
                                            <button
                                                style={{ ...btnPrimary(false), marginLeft: 12 }}
                                                onClick={() => setAfipPasoActivo(3)}
                                            >
                                                Siguiente →
                                            </button>
                                        )}
                                    </div>
                                )}

                                {/* PASO 3: Subir CSR a ARCA */}
                                {afipPasoActivo === 3 && (
                                    <div>
                                        <h3 style={{ marginTop: 0, color: '#1a2926' }}>Paso 3 — Subir el CSR a ARCA</h3>
                                        <p style={{ color: '#475569', fontSize: 14, marginBottom: 16 }}>
                                            Con el archivo <code>.csr</code> que descargaste, hacé lo siguiente en ARCA:
                                        </p>
                                        <ol style={{ paddingLeft: 20, color: '#475569', lineHeight: 1.9, fontSize: 14 }}>
                                            <li>Ingresá a <a href="https://auth.afip.gob.ar/contribuyente_/login.xhtml" target="_blank" rel="noopener noreferrer" style={{ color: '#3b9ede' }}>ARCA con tu CUIT y clave fiscal</a>.</li>
                                            <li>Buscá el servicio <strong>"Administración de Certificados Digitales"</strong>.</li>
                                            <li>Hacé clic en <strong>"Agregar alias"</strong> y completá un nombre (ej. <em>TotalStock</em>).</li>
                                            <li>En el alias creado, elegí <strong>"Nueva solicitud de certificado"</strong> y subí el archivo <code>.csr</code>.</li>
                                            <li>ARCA te devuelve un archivo <strong>.crt</strong> — descargalo.</li>
                                        </ol>
                                        <div style={{ background: '#f1f5f9', border: '1px solid #e2e8f0', borderRadius: 10, padding: '12px 16px', marginTop: 16, marginBottom: 20 }}>
                                            <strong style={{ color: '#1a2926' }}>🔗 Enlace directo:</strong>{' '}
                                            <a href="https://wsaahomo.afip.gov.ar/ws/services/LoginCms" target="_blank" rel="noopener noreferrer" style={{ color: '#3b9ede' }}>ARCA – Administración de Certificados</a>
                                            <br />
                                            <span style={{ fontSize: 13, color: '#475569' }}>Si tu modo está en "prueba", usá el ambiente de <strong>homologación</strong>; si es producción, usá el ambiente real.</span>
                                        </div>
                                        <button style={btnPrimary(false)} onClick={() => setAfipPasoActivo(4)}>
                                            Ya tengo el .crt — continuar →
                                        </button>
                                    </div>
                                )}

                                {/* PASO 4: Cargar certificado */}
                                {afipPasoActivo === 4 && (
                                    <div>
                                        <h3 style={{ marginTop: 0, color: '#1a2926' }}>Paso 4 — Cargar el certificado ARCA</h3>
                                        <p style={{ color: '#475569', fontSize: 14, marginBottom: 16 }}>
                                            Cargá el certificado que obtuviste de ARCA. Podés subir el archivo <code>.crt</code> directamente o pegar el contenido en base64.
                                        </p>

                                        {/* Selector de modo */}
                                        <div style={{ display: 'flex', gap: 12, marginBottom: 20 }}>
                                            {['archivo', 'base64'].map(modo => (
                                                <label key={modo} style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontWeight: afipCertModo === modo ? 700 : 400, fontSize: 14 }}>
                                                    <input type="radio" name="certModo" value={modo} checked={afipCertModo === modo} onChange={() => setAfipCertModo(modo)} />
                                                    {modo === 'archivo' ? '📁 Subir archivo .crt / .pem' : '📋 Pegar en base64'}
                                                </label>
                                            ))}
                                        </div>

                                        {afipCertModo === 'archivo' ? (
                                            <div>
                                                <input
                                                    type="file"
                                                    accept=".crt,.pem,.cer"
                                                    style={{ fontSize: 14, marginBottom: 16 }}
                                                    onChange={e => setAfipCertFile(e.target.files[0] || null)}
                                                />
                                                {afipCertFile && (
                                                    <p style={{ fontSize: 13, color: '#1a6a40', marginBottom: 16 }}>
                                                        ✅ Archivo seleccionado: <strong>{afipCertFile.name}</strong>
                                                    </p>
                                                )}
                                            </div>
                                        ) : (
                                            <div>
                                                <p style={{ fontSize: 13, color: '#475569', marginBottom: 8 }}>
                                                    Podés pegar el bloque PEM completo (con <code>-----BEGIN CERTIFICATE-----</code>) o solo el base64 sin encabezados.
                                                </p>
                                                <textarea
                                                    style={{ ...inputStyle, height: 140, fontFamily: 'monospace', fontSize: 12, resize: 'vertical' }}
                                                    placeholder="-----BEGIN CERTIFICATE-----&#10;MIIDxTC...&#10;-----END CERTIFICATE-----"
                                                    value={afipCertB64}
                                                    onChange={e => setAfipCertB64(e.target.value)}
                                                />
                                            </div>
                                        )}

                                        {afipEstado?.paso4_cert && (
                                            <div style={{ background: '#edfaf3', border: '1px solid #a8e6c5', borderRadius: 6, padding: '10px 14px', marginBottom: 16, fontSize: 14, color: '#1a6a40' }}>
                                                ✅ Ya hay un certificado cargado. Podés reemplazarlo si es necesario.
                                            </div>
                                        )}

                                        <button style={btnSuccess(afipSaving)} onClick={handleCargarCertificado} disabled={afipSaving}>
                                            {afipSaving ? 'Cargando...' : 'Guardar certificado'}
                                        </button>
                                    </div>
                                )}

                                {/* PASO 5: Configurar punto de venta */}
                                {afipPasoActivo === 5 && (
                                    <div>
                                        <h3 style={{ marginTop: 0, color: '#1a2926' }}>Paso 5 — Configurar el punto de venta</h3>
                                        <p style={{ color: '#475569', fontSize: 14, marginBottom: 16 }}>
                                            Ahora que ya tenés el certificado cargado, necesitás un <strong>punto de venta habilitado para Web Service</strong> en ARCA. No se puede reutilizar un punto de venta manual/aplicativo — tiene que darse de alta específicamente para facturación electrónica por Web Service.
                                        </p>

                                        <div style={{ background: '#f1f5f9', border: '1px solid #e2e8f0', borderRadius: 10, padding: '14px 18px', marginBottom: 20, fontSize: 14, color: '#1a2926' }}>
                                            <strong>🔗 En ARCA:</strong> Ingresá a{' '}
                                            <a href="https://auth.afip.gob.ar/contribuyente_/login.xhtml" target="_blank" rel="noopener noreferrer" style={{ color: '#3b9ede' }}>
                                                ARCA con tu CUIT y clave fiscal
                                            </a>{' '}
                                            y buscá <strong>"Puntos de Venta y Domicilios"</strong> (dentro de Comprobantes en línea) para dar de alta uno nuevo o revisar los existentes.
                                            <div style={{ marginTop: 12 }}>
                                                {afipForm.condicion_iva_emisor === 'MT' && (
                                                    <span>Como tu condición IVA es <strong>Monotributo</strong>, al crearlo elegí la modalidad: <strong>"Factura Electrónica - Monotributo - Web Service"</strong>.</span>
                                                )}
                                                {afipForm.condicion_iva_emisor === 'RI' && (
                                                    <span>Como tu condición IVA es <strong>Responsable Inscripto</strong>, al crearlo elegí la modalidad: <strong>"RECE para aplicativo y Web Service"</strong>.</span>
                                                )}
                                                {!['MT', 'RI'].includes(afipForm.condicion_iva_emisor) && (
                                                    <span>Tu condición IVA no es Monotributo ni Responsable Inscripto — consultá con tu contador o el soporte de ARCA qué modalidad de punto de venta corresponde a tu categoría (en general, alguna variante "Web Service").</span>
                                                )}
                                            </div>
                                        </div>

                                        <label style={{ fontSize: 13, fontWeight: 600, color: '#475569' }}>Número de punto de venta <span style={{ color: '#e25252' }}>*</span></label>
                                        <input
                                            style={inputStyle}
                                            type="number"
                                            min={1}
                                            placeholder="Ej: 1"
                                            value={afipForm.punto_venta}
                                            onChange={e => setAfipForm(p => ({ ...p, punto_venta: parseInt(e.target.value) || 1 }))}
                                        />

                                        <button style={btnPrimary(afipSaving)} onClick={() => handleGuardarConfigAfip(6)} disabled={afipSaving}>
                                            {afipSaving ? 'Guardando...' : 'Guardar y continuar →'}
                                        </button>
                                    </div>
                                )}

                                {/* PASO 6: Probar conexión */}
                                {afipPasoActivo === 6 && (
                                    <div>
                                        <h3 style={{ marginTop: 0, color: '#1a2926' }}>Paso 6 — Probar la conexión</h3>
                                        {!todoListo && (
                                            <div style={{ background: '#fffbeb', border: '1px solid #f59e0b', borderRadius: 6, padding: '10px 14px', marginBottom: 16, fontSize: 14 }}>
                                                ⚠️ Completá los pasos anteriores antes de probar.
                                                {!afipEstado?.paso1_config && <div>— Falta: configurar CUIT (paso 1)</div>}
                                                {!afipEstado?.paso2_csr && <div>— Falta: generar clave y CSR (paso 2)</div>}
                                                {!afipEstado?.paso4_cert && <div>— Falta: cargar el certificado (paso 4)</div>}
                                            </div>
                                        )}
                                        <div style={{ background: '#f1f5f9', border: '1px solid #e2e8f0', borderRadius: 10, padding: '14px 18px', marginBottom: 20, fontSize: 14, color: '#1a2926' }}>
                                            <strong>⚠️ Antes de continuar, autorizá el certificado en ARCA:</strong>
                                            <ol style={{ margin: '10px 0 0 0', paddingLeft: 20, lineHeight: 2 }}>
                                                <li>Ingresá a <strong>ARCA</strong> con tu CUIT y clave fiscal.</li>
                                                <li>Abrí <strong>Administrador de Relaciones de Clave Fiscal</strong>.</li>
                                                <li>Hacé clic en <strong>Nueva Relación</strong>.</li>
                                                <li>Seleccioná <strong>ARCA → Web Services → Facturación Electrónica</strong>.</li>
                                                <li>En "Representante" elegí <strong>Computador Fiscal</strong>.</li>
                                                <li>Seleccioná el alias que diste de alta al generar el certificado (por ejemplo, <em>TotalStock</em>).</li>
                                                <li>Confirmá la relación.</li>
                                            </ol>
                                        </div>
                                        <p style={{ color: '#475569', fontSize: 14, marginBottom: 20 }}>
                                            Una vez autorizado el certificado en ARCA, Total Stock va a emitir una <strong>factura de prueba por $1</strong> para verificar que la conexión funciona correctamente. El comprobante quedará registrado en ARCA.
                                        </p>
                                        <button style={btnSuccess(!todoListo)} onClick={handleProbarFacturacion} disabled={!todoListo}>
                                            Probar facturación (emitir $1 de prueba)
                                        </button>
                                        <div style={{ marginTop: 24, padding: '12px 16px', background: '#f8fafc', borderRadius: 10, fontSize: 13, color: '#475569' }}>
                                            ¿Algo no funciona?{' '}
                                            <a href="https://www.afip.gob.ar/fe/comprobantes/" target="_blank" rel="noopener noreferrer" style={{ color: '#3b9ede' }}>
                                                Documentación ARCA — Facturación electrónica
                                            </a>
                                        </div>
                                    </div>
                                )}

                            </div>
                        </div>

                        {/* Requisitos previos colapsados */}
                        <details style={{ marginTop: 24, border: '1px solid #e2e8f0', borderRadius: 10, padding: '12px 16px' }}>
                            <summary style={{ cursor: 'pointer', fontWeight: 600, color: '#475569', fontSize: 14 }}>
                                Ver requisitos previos
                            </summary>
                            <ul style={{ margin: '12px 0 0 0', paddingLeft: 20, color: '#475569', lineHeight: 1.8, fontSize: 14 }}>
                                <li><strong>CUIT</strong> al día (persona física o jurídica).</li>
                                <li><strong>Clave fiscal nivel 3</strong> en ARCA.</li>
                                <li>Inscripción en el <strong>régimen correspondiente</strong> (Monotributo, Responsable Inscripto, IVA Exento, etc.).</li>
                                <li>Un <strong>punto de venta</strong> habilitado para facturación electrónica en ARCA (Comprobantes en línea → Punto de venta).</li>
                            </ul>
                        </details>
                    </div>
                </div>
                );
            })()}

            {/* TAB: NOTAS DE CRÉDITO */}
            {activeTab === 'notas-credito' && (
                <div style={styles.tabContent}>
                    <NotasCreditoPage />
                </div>
            )}

            {/* TAB: TIENDA NUBE */}
            {activeTab === 'tiendanube' && (
                <div style={styles.tabContent}>
                    <IntegracionTiendaNube />
                </div>
            )}

            {/* TAB: MERCADO LIBRE PANEL */}
            {activeTab === 'mercadolibre-panel' && (
                <div style={styles.tabContent}>
                    <IntegracionMercadoLibrePanel />
                </div>
            )}

            {/* TAB: NOTIFICACIONES */}
            {activeTab === 'notificaciones' && (
                <div style={styles.tabContent}>
                    <div style={{ ...styles.infoBox, maxWidth: '520px', marginBottom: 24 }}>
                        <h3 style={{ marginTop: 0, marginBottom: 12 }}>Notificaciones de ventas</h3>
                        <p style={{ marginBottom: 16, color: '#475569' }}>
                            Recibí notificaciones push en este dispositivo cuando se registre una venta en la tienda. Funciona en navegador y en la PWA (app instalada).
                        </p>
                        {!notificacionesSoportadas() ? (
                            <p style={{ margin: 0, color: '#92400e', background: '#fffbeb', padding: 12, borderRadius: 6 }}>
                                Las notificaciones no están disponibles en este navegador. Probá en Chrome, Edge o Safari (iOS 16.4+).
                            </p>
                        ) : notificationPermission === 'denied' ? (
                            <p style={{ margin: 0, color: '#92400e', background: '#fffbeb', padding: 12, borderRadius: 6 }}>
                                Las notificaciones están bloqueadas. Habilitálas en la configuración del navegador o del sistema para poder activarlas acá.
                            </p>
                        ) : notificationPermission === 'granted' && fcmToken ? (
                            <div>
                                <p style={{ margin: '0 0 16px', color: '#1a6a40', background: '#edfaf3', padding: 12, borderRadius: 6 }}>
                                    Notificaciones activas. Vas a recibir un aviso en este dispositivo por cada venta.
                                </p>
                                <button
                                    type="button"
                                    onClick={() => eliminarToken(fcmToken)}
                                    style={{ ...styles.cancelButton, padding: '10px 20px' }}
                                >
                                    Desactivar notificaciones
                                </button>
                            </div>
                        ) : (
                            <div>
                                {notificationError && (
                                    <p style={{ margin: '0 0 12px', color: '#c53030', background: '#fef2f2', padding: 10, borderRadius: 6, fontSize: 14 }}>
                                        {notificationError}
                                    </p>
                                )}
                                <button
                                    type="button"
                                    onClick={() => solicitarPermiso()}
                                    style={{ ...styles.saveButton, padding: '10px 20px' }}
                                >
                                    Activar notificaciones de ventas
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* MODAL DE EDICIÓN DE ARANCEL */}
            {showEditArancelModal && editArancelData && (
                <div style={styles.modalOverlay}>
                    <div style={styles.modalContent}>
                        <h3>Editar Arancel</h3>
                        <div style={styles.inputGroupModal}>
                            <label style={styles.label}>Método de Pago *</label>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                                <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
                                    <input type="radio" checked={!editArancelData.metodo_pago_nuevo} onChange={() => setEditArancelData({ ...editArancelData, metodo_pago_nuevo: false })} />
                                    Seleccionar existente
                                </label>
                                <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
                                    <input type="radio" checked={editArancelData.metodo_pago_nuevo} onChange={() => setEditArancelData({ ...editArancelData, metodo_pago_nuevo: true })} />
                                    Crear nuevo
                                </label>
                            </div>
                            {!editArancelData.metodo_pago_nuevo ? (
                                <select value={editArancelData.metodo_pago} onChange={(e) => setEditArancelData({ ...editArancelData, metodo_pago: e.target.value })} style={styles.modalInput}>
                                    <option value="">Seleccionar...</option>
                                    {metodosPago.filter(m => m.es_financiero && m.nombre !== 'Mercado Libre').map(metodo => (
                                        <option key={metodo.id} value={metodo.id}>{metodo.nombre}</option>
                                    ))}
                                </select>
                            ) : (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                    <input type="text" value={editArancelData.nuevo_metodo_nombre} onChange={(e) => setEditArancelData({ ...editArancelData, nuevo_metodo_nombre: e.target.value })} placeholder="Nombre del método" style={styles.modalInput} />
                                    <input type="text" value={editArancelData.nuevo_metodo_descripcion} onChange={(e) => setEditArancelData({ ...editArancelData, nuevo_metodo_descripcion: e.target.value })} placeholder="Descripción (opcional)" style={styles.modalInput} />
                                </div>
                            )}
                        </div>
                        <div style={styles.inputGroupModal}>
                            <label style={styles.label}>Plan *</label>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                                <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
                                    <input type="radio" checked={!editArancelData.plan_custom} onChange={() => setEditArancelData({ ...editArancelData, plan_custom: false })} />
                                    Seleccionar existente
                                </label>
                                <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
                                    <input type="radio" checked={editArancelData.plan_custom} onChange={() => setEditArancelData({ ...editArancelData, plan_custom: true })} />
                                    Crear nuevo
                                </label>
                            </div>
                            {!editArancelData.plan_custom ? (
                                <select value={editArancelData.nombre_plan} onChange={(e) => setEditArancelData({ ...editArancelData, nombre_plan: e.target.value })} style={styles.modalInput}>
                                    {PLAN_CHOICES.map(plan => (
                                        <option key={plan.value} value={plan.value}>{plan.label}</option>
                                    ))}
                                </select>
                            ) : (
                                <input type="text" value={editArancelData.plan_custom_nombre} onChange={(e) => setEditArancelData({ ...editArancelData, plan_custom_nombre: e.target.value })} placeholder="Nombre del plan" style={styles.modalInput} />
                            )}
                        </div>
                        <div style={styles.inputGroupModal}>
                            <label style={styles.label}>Arancel (%) *</label>
                            <input
                                type="number"
                                value={editArancelData.arancel_porcentaje}
                                onChange={(e) => setEditArancelData({ ...editArancelData, arancel_porcentaje: e.target.value })}
                                style={styles.modalInput}
                                required
                                min="0"
                                max="100"
                                step="0.01"
                            />
                        </div>
                        <div style={styles.modalActions}>
                            <button onClick={handleUpdateArancel} style={styles.modalConfirmButton}>Guardar</button>
                            <button onClick={() => {
                                setShowEditArancelModal(false);
                                setEditArancelData(null);
                            }} style={styles.modalCancelButton}>Cancelar</button>
                        </div>
                    </div>
                </div>
            )}

            {/* TAB: ARANCELES MERCADO LIBRE */}
            {activeTab === 'aranceles-ml' && (
                <div style={styles.tabContent}>
                    {/* Selector de modo de cálculo */}
                    <div style={{ background: '#f1f5f9', border: '1px solid #e2e8f0', borderRadius: 10, padding: '18px 22px', marginBottom: 24 }}>
                        <p style={{ fontWeight: 700, fontSize: 15, color: '#1a2926', marginBottom: 12 }}>
                            Modo de cálculo de aranceles ML
                        </p>
                        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                            <button
                                onClick={() => !mlArancelesAutomaticos && handleGuardarModoArancelesML(true)}
                                disabled={guardandoModoML || mlArancelesAutomaticos}
                                style={{
                                    padding: '10px 20px', borderRadius: 10, fontWeight: 700, fontSize: 14, cursor: mlArancelesAutomaticos ? 'default' : 'pointer',
                                    border: `2px solid ${mlArancelesAutomaticos ? '#3b9ede' : '#e2e8f0'}`,
                                    background: mlArancelesAutomaticos ? '#3b9ede' : '#fff',
                                    color: mlArancelesAutomaticos ? '#fff' : '#475569',
                                }}
                            >
                                ⚡ Automático (vía notificaciones ML)
                            </button>
                            <button
                                onClick={() => mlArancelesAutomaticos && handleGuardarModoArancelesML(false)}
                                disabled={guardandoModoML || !mlArancelesAutomaticos}
                                style={{
                                    padding: '10px 20px', borderRadius: 10, fontWeight: 700, fontSize: 14, cursor: !mlArancelesAutomaticos ? 'default' : 'pointer',
                                    border: `2px solid ${!mlArancelesAutomaticos ? '#3b9ede' : '#e2e8f0'}`,
                                    background: !mlArancelesAutomaticos ? '#3b9ede' : '#fff',
                                    color: !mlArancelesAutomaticos ? '#fff' : '#475569',
                                }}
                            >
                                ✏️ Manual (aranceles configurados)
                            </button>
                        </div>
                        <p style={{ fontSize: 13, color: '#475569', marginTop: 10, marginBottom: 0 }}>
                            {mlArancelesAutomaticos
                                ? 'Los cargos de ML (comisión, envío, impuestos) se obtienen automáticamente de las notificaciones. Se muestran en la card "Descuentos Mercado Libre" de Métricas.'
                                : 'Los aranceles se calculan según la configuración manual por producto. Se muestran en la card "Aranceles" de Métricas.'}
                        </p>
                    </div>

                    {/* Formulario manual — solo visible en modo manual */}
                    {!mlArancelesAutomaticos && (
                    <div style={styles.sectionHeader}>
                        <h2>Aranceles Mercado Libre por Producto</h2>
                        <button onClick={() => {
                            setArancelMLForm({
                                producto: '',
                                arancel_porcentaje: '0.00',
                                costo_envio: '0.00',
                                tienda: selectedStoreSlug
                            });
                            setShowArancelMLForm(true);
                        }} style={styles.addButton} className="panel-admin-add-button">
                            + Nuevo Arancel ML
                        </button>
                    </div>
                    )}

                    {!mlArancelesAutomaticos && showArancelMLForm && (
                        <div style={styles.formContainer} className="panel-admin-form-container">
                            <h3>Nuevo Arancel Mercado Libre</h3>
                            <form onSubmit={handleCreateArancelML}>
                                <div style={styles.formGrid} className="panel-admin-form-grid">
                                    <div style={styles.formGroup}>
                                        <label>Producto *</label>
                                        <select
                                            name="producto"
                                            value={arancelMLForm.producto}
                                            onChange={handleArancelMLFormChange}
                                            required
                                            style={styles.input}
                                        >
                                            <option value="">Seleccionar producto...</option>
                                            {productosML
                                                .filter(p => !arancelesML.some(a => (a.producto?.id ?? a.producto) === p.id))
                                                .map(p => (
                                                <option key={p.id} value={p.id}>
                                                    {p.nombre} {p.codigo ? `(${p.codigo})` : ''}
                                                </option>
                                            ))}
                                        </select>
                                        {productosML.length === 0 && (
                                            <p style={{ fontSize: '0.9em', color: '#94a3b8', marginTop: '5px' }}>
                                                No hay productos disponibles. Primero añade productos a la tienda.
                                            </p>
                                        )}
                                    </div>
                                    <div style={styles.formGroup}>
                                        <label>Arancel (%) *</label>
                                        <input
                                            type="number"
                                            name="arancel_porcentaje"
                                            value={arancelMLForm.arancel_porcentaje}
                                            onChange={handleArancelMLFormChange}
                                            required
                                            min="0"
                                            max="100"
                                            step="0.01"
                                            style={styles.input}
                                        />
                                    </div>
                                    <div style={styles.formGroup}>
                                        <label>Costo de envío (por unidad)</label>
                                        <input
                                            type="number"
                                            name="costo_envio"
                                            value={arancelMLForm.costo_envio}
                                            onChange={handleArancelMLFormChange}
                                            min="0"
                                            step="0.01"
                                            style={styles.input}
                                        />
                                    </div>
                                </div>
                                <div style={styles.formActions} className="panel-admin-form-actions">
                                    <button type="submit" style={styles.saveButton}>
                                        Crear
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setShowArancelMLForm(false);
                                        }}
                                        style={styles.cancelButton}
                                    >
                                        Cancelar
                                    </button>
                                </div>
                            </form>
                        </div>
                    )}

                    {!mlArancelesAutomaticos && <>
                    <div style={styles.infoBox}>
                        <h3 style={{ marginTop: 0, marginBottom: '10px' }}>Información</h3>
                        <p style={{ marginBottom: '10px' }}>
                            Configura arancel (%) y costo de envío por unidad para cada producto. Las ventas con medio de pago "Mercado Libre" descontarán estos valores en las métricas.
                        </p>
                        <p style={{ marginBottom: '10px', fontSize: '0.9em', color: '#94a3b8' }}>
                            Cada producto puede tener un arancel distinto según su categoría en ML. El costo de envío se aplica por unidad vendida.
                        </p>
                    </div>

                    <h3 style={{ marginTop: '30px', marginBottom: '15px' }}>Aranceles Configurados</h3>
                    <div style={styles.tableContainer} className="panel-admin-table-container">
                        <table style={styles.table} className="panel-admin-table">
                            <thead>
                                <tr>
                                    <th style={styles.th}>Producto</th>
                                    <th style={styles.th}>Arancel (%)</th>
                                    <th style={styles.th}>Costo envío/u</th>
                                    <th style={styles.th}>Acciones</th>
                                </tr>
                            </thead>
                            <tbody>
                                {arancelesML.length === 0 ? (
                                    <tr>
                                        <td colSpan="4" style={styles.td}>No hay aranceles de Mercado Libre configurados</td>
                                    </tr>
                                ) : (
                                    arancelesML.map(arancel => (
                                        <tr key={arancel.id}>
                                            <td style={styles.td}>{arancel.producto_nombre || arancel.producto?.nombre || '-'}</td>
                                            <td style={styles.td}>{parseFloat(arancel.arancel_porcentaje || 0).toFixed(2)}%</td>
                                            <td style={styles.td}>{formatearMonto(parseFloat(arancel.costo_envio || 0))}</td>
                                            <td style={styles.td}>
                                                <div style={styles.actionButtons} className="panel-admin-action-buttons">
                                                    <button
                                                        className="icon-btn"
                                                        onClick={() => handleEditArancelML(arancel)}
                                                        style={{ color: 'white', backgroundColor: '#f59e0b' }}
                                                        data-tooltip="Editar arancel ML"
                                                    >
                                                        <FontAwesomeIcon icon={faPencil} />
                                                    </button>
                                                    <button
                                                        className="icon-btn"
                                                        onClick={() => handleDeleteArancelML(arancel.id)}
                                                        style={{ color: 'white', backgroundColor: '#e25252' }}
                                                        data-tooltip="Eliminar arancel ML"
                                                    >
                                                        <FontAwesomeIcon icon={faTrash} />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                    </>}
                </div>
            )}

            {/* TAB: MI PLAN */}
            {activeTab === 'mi-plan' && (
                <div style={styles.tabContent}>
                    {loadingPlan ? (
                        <p style={{ color: '#94a3b8', textAlign: 'center', padding: 40 }}>Cargando información del plan...</p>
                    ) : !planInfo ? (
                        <p style={{ color: '#94a3b8', textAlign: 'center', padding: 40 }}>No se pudo cargar la información del plan.</p>
                    ) : planInfo.legacy ? (
                        <div style={{ background: '#edfaf3', border: '1px solid #a8e6c5', borderRadius: 16, padding: '24px 28px', maxWidth: 480 }}>
                            <p style={{ fontWeight: 700, fontSize: 16, color: '#1a2926', marginBottom: 8 }}>Cuenta legacy</p>
                            <p style={{ fontSize: 14, color: '#475569' }}>Tu cuenta tiene acceso completo sin restricciones de plan.</p>
                        </div>
                    ) : (() => {
                        const enTrial = planInfo.estado === 'trial';
                        const enGracia = planInfo.estado === 'gracia';
                        const diasTrialRestantes = planInfo.fecha_fin_trial
                            ? Math.max(0, Math.ceil((new Date(planInfo.fecha_fin_trial) - new Date()) / 86400000))
                            : 0;
                        return (
                        <>
                            {/* Plan header */}
                            <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 24, flexWrap: 'wrap' }}>
                                <div style={{
                                    background: planInfo.plan === 'pro' ? '#3b82f6' : planInfo.plan === 'advanced' ? '#10b981' : '#5dc87a',
                                    color: '#fff', borderRadius: 10, padding: '10px 20px', fontSize: 18, fontWeight: 700
                                }}>
                                    {planInfo.plan_display}
                                </div>
                                <div>
                                    <div style={{ fontSize: 13, color: '#94a3b8' }}>Estado</div>
                                    <div style={{
                                        fontWeight: 600, fontSize: 14,
                                        color: planInfo.estado === 'activa' || enTrial ? '#1a6a40' : enGracia ? '#f59e0b' : '#e25252'
                                    }}>
                                        {enTrial ? 'Período de prueba' : planInfo.estado === 'activa' ? 'Activa' : enGracia ? 'Período de gracia' : planInfo.estado === 'cancelada' ? 'Cancelada' : planInfo.estado === 'pausada' ? 'Pausada' : 'Inactiva'}
                                    </div>
                                </div>
                                {enTrial && (
                                    <div style={{ marginLeft: 'auto', background: '#fef9c3', border: '1px solid #fde047', borderRadius: 8, padding: '8px 14px', fontSize: 13, color: '#713f12', fontWeight: 600 }}>
                                        {diasTrialRestantes > 0 ? `${diasTrialRestantes} días de prueba restantes` : 'Último día de prueba'}
                                    </div>
                                )}
                                {enGracia && (
                                    <div style={{ marginLeft: 'auto', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, padding: '8px 14px', fontSize: 13, color: '#991b1b', fontWeight: 600 }}>
                                        {planInfo.dias_gracia_restantes} días para regularizar el pago
                                    </div>
                                )}
                            </div>

                            {/* Uso de recursos */}
                            <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 10, padding: '20px 24px', marginBottom: 20 }}>
                                <p style={{ fontWeight: 700, fontSize: 14, color: '#1a2926', marginBottom: 16 }}>Uso actual</p>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                                    {/* Productos */}
                                    <div>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: '#475569', marginBottom: 5 }}>
                                            <span>Productos</span>
                                            <span style={{ fontWeight: 600 }}>
                                                {planInfo.cantidad_productos ?? '—'}{planInfo.max_productos ? ` / ${planInfo.max_productos}` : ' (ilimitados)'}
                                            </span>
                                        </div>
                                        {planInfo.max_productos > 0 && (
                                            <div style={{ background: '#e2e8f0', borderRadius: 999, height: 8 }}>
                                                <div style={{
                                                    background: (planInfo.cantidad_productos / planInfo.max_productos) > 0.9 ? '#e25252' : '#5dc87a',
                                                    width: `${Math.min(100, (planInfo.cantidad_productos / planInfo.max_productos) * 100)}%`,
                                                    height: 8, borderRadius: 999, transition: 'width 0.3s'
                                                }} />
                                            </div>
                                        )}
                                    </div>
                                    {/* Usuarios */}
                                    <div>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: '#475569', marginBottom: 5 }}>
                                            <span>Usuarios</span>
                                            <span style={{ fontWeight: 600 }}>
                                                {planInfo.cantidad_usuarios ?? '—'}{planInfo.max_usuarios ? ` / ${planInfo.max_usuarios}` : ' (ilimitados)'}
                                            </span>
                                        </div>
                                        {planInfo.max_usuarios > 0 && (
                                            <div style={{ background: '#e2e8f0', borderRadius: 999, height: 8 }}>
                                                <div style={{
                                                    background: (planInfo.cantidad_usuarios / planInfo.max_usuarios) > 0.9 ? '#e25252' : '#3b82f6',
                                                    width: `${Math.min(100, (planInfo.cantidad_usuarios / planInfo.max_usuarios) * 100)}%`,
                                                    height: 8, borderRadius: 999, transition: 'width 0.3s'
                                                }} />
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Features */}
                            <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 10, padding: '20px 24px', marginBottom: 20 }}>
                                <p style={{ fontWeight: 700, fontSize: 14, color: '#1a2926', marginBottom: 14 }}>Funcionalidades</p>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                                    {[
                                        { key: 'permite_factura_electronica', label: 'Factura electrónica (ARCA)' },
                                        { key: 'permite_integracion_ecommerce', label: 'Integraciones (Tienda Nube / Mercado Libre)' },
                                    ].map(({ key, label }) => {
                                        const enabled = planInfo[key];
                                        return (
                                            <div key={key} style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 14 }}>
                                                <span style={{
                                                    width: 22, height: 22, borderRadius: '50%', display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                                                    background: enabled ? '#5dc87a' : '#e2e8f0', color: enabled ? '#fff' : '#94a3b8', fontWeight: 700, fontSize: 13
                                                }}>
                                                    {enabled ? '✓' : '✕'}
                                                </span>
                                                <span style={{ color: enabled ? '#1a2926' : '#94a3b8' }}>{label}</span>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* Próximo cobro */}
                            {planInfo.fecha_proximo_cobro && (
                                <p style={{ fontSize: 13, color: '#94a3b8', marginBottom: 20 }}>
                                    Próximo cobro: <strong>{new Date(planInfo.fecha_proximo_cobro).toLocaleDateString('es-AR')}</strong>
                                    {planInfo.precio_mensual && ` — $${Number(planInfo.precio_mensual).toLocaleString('es-AR')}/mes`}
                                </p>
                            )}

                            {/* Botón upgrade */}
                            {planInfo.plan !== 'advanced' && (
                                <button
                                    onClick={() => setShowUpgradeModal(true)}
                                    style={{
                                        background: '#5dc87a', color: '#fff', border: 'none', borderRadius: 8,
                                        padding: '12px 28px', fontSize: 15, fontWeight: 600, cursor: 'pointer'
                                    }}
                                >
                                    Mejorar plan
                                </button>
                            )}

                            {/* Botón de baja / re-suscripción */}
                            {planInfo.estado === 'cancelada' ? (
                                <div style={{ marginTop: 20, background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 10, padding: '16px 20px', textAlign: 'center' }}>
                                    <p style={{ fontSize: 13, color: '#991b1b', margin: '0 0 12px', fontWeight: 600 }}>
                                        Tu suscripción fue cancelada. Tus datos se conservan por 30 días.
                                    </p>
                                    <a
                                        href="/#precios"
                                        style={{
                                            display: 'inline-block', background: '#5dc87a', color: '#fff',
                                            borderRadius: 8, padding: '10px 20px', fontSize: 13,
                                            fontWeight: 700, textDecoration: 'none',
                                        }}
                                    >
                                        Ver planes y volver a suscribirme →
                                    </a>
                                </div>
                            ) : (
                                <button
                                    onClick={() => setShowCancelModal(true)}
                                    style={{
                                        marginTop: 16, background: 'none', color: '#94a3b8',
                                        border: '1px solid #e2e8f0', borderRadius: 8,
                                        padding: '10px 20px', fontSize: 13, cursor: 'pointer'
                                    }}
                                >
                                    Dar de baja mi suscripción
                                </button>
                            )}
                        </>
                        );
                    })()}
                </div>
            )}

            {/* Modal upgrade (Mi Plan o feature bloqueada) */}
            {showUpgradeModal && planInfo && (
                <ModalUpgrade
                    visible={showUpgradeModal}
                    onClose={() => { setShowUpgradeModal(false); setUpgradeMotivo(''); }}
                    planActual={planInfo.plan}
                    planesSugeridos={
                        upgradeMotivo === 'ecommerce'
                            ? ['advanced']
                            : upgradeMotivo === 'factura'
                                ? ['pro', 'advanced']
                                : ['starter', 'pro', 'advanced']
                    }
                    mensaje={
                        upgradeMotivo === 'ecommerce'
                            ? 'Las integraciones con Mercado Libre y Tienda Nube requieren el plan Advanced.'
                            : upgradeMotivo === 'factura'
                                ? 'La facturación electrónica (ARCA) requiere el plan Pro o Advanced.'
                                : ''
                    }
                    token={token}
                    onUpgradeOk={(nuevoPlan) => {
                        setPlanInfo(prev => prev ? { ...prev, plan: nuevoPlan } : prev);
                        setLoadingPlan(true);
                        axios.get(`${BASE_API_ENDPOINT}/api/suscripcion/mi-plan/`, {
                            headers: { Authorization: `Bearer ${token}` }
                        }).then(r => setPlanInfo(r.data)).catch(() => {}).finally(() => setLoadingPlan(false));
                    }}
                />
            )}

            {/* Modal confirmación de baja */}
            {showCancelModal && (
                <div style={{
                    position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9500
                }}>
                    <div style={{
                        background: '#fff', borderRadius: 12, padding: '36px 32px',
                        maxWidth: 440, width: '90%', textAlign: 'center', boxShadow: '0 8px 32px rgba(0,0,0,0.18)'
                    }}>
                        <div style={{ fontSize: 40, marginBottom: 12 }}>⚠️</div>
                        <h3 style={{ fontSize: 20, fontWeight: 700, color: '#1a2926', margin: '0 0 12px' }}>
                            ¿Dar de baja la suscripción?
                        </h3>
                        <p style={{ fontSize: 14, color: '#94a3b8', lineHeight: 1.6, margin: '0 0 8px' }}>
                            Tu cuenta y todos tus datos (productos, ventas, clientes)
                            se conservarán por <strong>30 días</strong>.
                        </p>
                        <p style={{ fontSize: 14, color: '#e25252', margin: '0 0 24px' }}>
                            Después del período de retención, todos los datos serán eliminados permanentemente.
                        </p>
                        <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
                            <button
                                onClick={() => setShowCancelModal(false)}
                                disabled={cancelando}
                                style={{
                                    padding: '11px 24px', borderRadius: 8, border: '1px solid #e2e8f0',
                                    background: '#fff', color: '#475569', fontSize: 14, cursor: 'pointer', fontWeight: 600
                                }}
                            >
                                Volver
                            </button>
                            <button
                                disabled={cancelando}
                                onClick={async () => {
                                    setCancelando(true);
                                    try {
                                        await axios.post(
                                            `${BASE_API_ENDPOINT}/api/suscripcion/cancelar/`,
                                            {},
                                            { headers: { Authorization: `Bearer ${token}` } }
                                        );
                                        setShowCancelModal(false);
                                        alert('Tu suscripción fue cancelada. Tus datos se conservarán por 30 días.');
                                        logout();
                                    } catch (err) {
                                        alert(err?.response?.data?.error || 'Error al cancelar. Intentá nuevamente.');
                                    } finally {
                                        setCancelando(false);
                                    }
                                }}
                                style={{
                                    padding: '11px 24px', borderRadius: 8, border: 'none',
                                    background: '#e25252', color: '#fff', fontSize: 14,
                                    cursor: cancelando ? 'not-allowed' : 'pointer', fontWeight: 600, opacity: cancelando ? 0.7 : 1
                                }}
                            >
                                {cancelando ? 'Cancelando...' : 'Sí, dar de baja'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* MODAL DE EDICIÓN DE ARANCEL ML */}
            {showEditArancelMLModal && editArancelMLData && (
                <div style={styles.modalOverlay}>
                    <div style={styles.modalContent}>
                        <h3>Editar Arancel Mercado Libre</h3>
                        <div style={styles.inputGroupModal}>
                            <label style={styles.label}>Producto *</label>
                            <select
                                value={editArancelMLData.producto}
                                onChange={(e) => setEditArancelMLData({ ...editArancelMLData, producto: e.target.value })}
                                style={styles.modalInput}
                                required
                            >
                                <option value="">Seleccionar producto...</option>
                                {productosML.map(p => (
                                    <option key={p.id} value={p.id}>
                                        {p.nombre} {p.codigo ? `(${p.codigo})` : ''}
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div style={styles.inputGroupModal}>
                            <label style={styles.label}>Arancel (%) *</label>
                            <input
                                type="number"
                                value={editArancelMLData.arancel_porcentaje}
                                onChange={(e) => setEditArancelMLData({ ...editArancelMLData, arancel_porcentaje: e.target.value })}
                                style={styles.modalInput}
                                required
                                min="0"
                                max="100"
                                step="0.01"
                            />
                        </div>
                        <div style={styles.inputGroupModal}>
                            <label style={styles.label}>Costo de envío (por unidad)</label>
                            <input
                                type="number"
                                value={editArancelMLData.costo_envio}
                                onChange={(e) => setEditArancelMLData({ ...editArancelMLData, costo_envio: e.target.value })}
                                style={styles.modalInput}
                                min="0"
                                step="0.01"
                            />
                        </div>
                        <div style={styles.modalActions}>
                            <button onClick={handleUpdateArancelML} style={styles.modalConfirmButton}>Guardar</button>
                            <button onClick={() => {
                                setShowEditArancelMLModal(false);
                                setEditArancelMLData(null);
                            }} style={styles.modalCancelButton}>Cancelar</button>
                        </div>
                    </div>
                </div>
            )}

            {/* MODAL DE CAMBIO DE CONTRASEÑA */}
            {showTiendasModal && tiendasModalUser && (() => {
                const tiendasDisponibles = tiendasAutorizadas.filter(t => t.nombre !== tiendasModalUser.tienda);
                return (
                    <div style={styles.modalOverlay}>
                        <div style={{ ...styles.modalContent, maxWidth: 420 }} className="panel-admin-modal-content">
                            <h3 style={{ marginTop: 0, marginBottom: 4 }}>Acceso a tiendas</h3>
                            <p style={{ fontSize: 13, color: '#94a3b8', marginBottom: 16 }}>
                                Tiendas a las que <strong>{tiendasModalUser.username}</strong> puede acceder (además de la suya):
                            </p>
                            {tiendasDisponibles.length === 0 ? (
                                <p style={{ color: '#94a3b8', fontSize: 13 }}>No tenés tiendas adicionales para delegar.</p>
                            ) : (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 20 }}>
                                    {tiendasDisponibles.map(t => (
                                        <label key={t.id} style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 14, cursor: 'pointer' }}>
                                            <input
                                                type="checkbox"
                                                checked={tiendasModalSel.includes(t.id)}
                                                onChange={e => {
                                                    if (e.target.checked) setTiendasModalSel(prev => [...prev, t.id]);
                                                    else setTiendasModalSel(prev => prev.filter(id => id !== t.id));
                                                }}
                                                style={{ width: 16, height: 16 }}
                                            />
                                            {t.nombre}
                                        </label>
                                    ))}
                                </div>
                            )}
                            <div style={styles.formActions}>
                                <button
                                    onClick={handleGuardarTiendasAutorizadas}
                                    disabled={guardandoTiendas}
                                    style={styles.saveButton}
                                >
                                    {guardandoTiendas ? 'Guardando...' : 'Guardar'}
                                </button>
                                <button
                                    onClick={() => setShowTiendasModal(false)}
                                    style={styles.cancelButton}
                                >
                                    Cancelar
                                </button>
                            </div>
                        </div>
                    </div>
                );
            })()}

            {showPasswordModal && (
                <div style={styles.modalOverlay}>
                    <div style={styles.modalContent} className="panel-admin-modal-content">
                        <h3>Cambiar Contraseña</h3>
                        <form onSubmit={handleSubmitPasswordChange}>
                            <div style={styles.formGroup}>
                                <label>Nueva Contraseña *</label>
                                <input
                                    type="password"
                                    name="new_password"
                                    value={passwordForm.new_password}
                                    onChange={(e) => setPasswordForm({ ...passwordForm, new_password: e.target.value })}
                                    required
                                    style={styles.input}
                                />
                            </div>
                            <div style={styles.formGroup}>
                                <label>Confirmar Nueva Contraseña *</label>
                                <input
                                    type="password"
                                    name="new_password2"
                                    value={passwordForm.new_password2}
                                    onChange={(e) => setPasswordForm({ ...passwordForm, new_password2: e.target.value })}
                                    required
                                    style={styles.input}
                                />
                            </div>
                            <div style={styles.formActions}>
                                <button type="submit" style={styles.saveButton}>
                                    Cambiar Contraseña
                                </button>
                                <button
                                    type="button"
                                    onClick={() => {
                                        setShowPasswordModal(false);
                                        setPasswordForm({ new_password: '', new_password2: '' });
                                        setSelectedUserId(null);
                                    }}
                                    style={styles.cancelButton}
                                >
                                    Cancelar
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
            {/* TAB: HISTORIAL DE ACCIONES */}
            {activeTab === 'historial' && (
                <div style={styles.tabContent}>
                    {/* Filtros */}
                    <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 20, alignItems: 'flex-end' }}>
                        <div>
                            <label style={{ fontSize: 12, color: '#94a3b8', display: 'block', marginBottom: 4 }}>Desde</label>
                            <input type="date" value={historialFechaDesde}
                                onChange={e => setHistorialFechaDesde(e.target.value)}
                                style={{ padding: '7px 10px', borderRadius: 6, border: '1px solid #e2e8f0', fontSize: 13 }} />
                        </div>
                        <div>
                            <label style={{ fontSize: 12, color: '#94a3b8', display: 'block', marginBottom: 4 }}>Hasta</label>
                            <input type="date" value={historialFechaHasta}
                                onChange={e => setHistorialFechaHasta(e.target.value)}
                                style={{ padding: '7px 10px', borderRadius: 6, border: '1px solid #e2e8f0', fontSize: 13 }} />
                        </div>
                        <div>
                            <label style={{ fontSize: 12, color: '#94a3b8', display: 'block', marginBottom: 4 }}>Usuario</label>
                            <select value={historialUsuarioId} onChange={e => setHistorialUsuarioId(e.target.value)}
                                style={{ padding: '7px 10px', borderRadius: 6, border: '1px solid #e2e8f0', fontSize: 13, minWidth: 150 }}>
                                <option value="">Todos</option>
                                {usuarios.map(u => (
                                    <option key={u.id} value={u.id}>{u.username}</option>
                                ))}
                            </select>
                        </div>
                        <button onClick={fetchHistorial}
                            style={{ padding: '8px 18px', background: '#5dc87a', color: '#fff', border: 'none', borderRadius: 7, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
                            Filtrar
                        </button>
                    </div>

                    {loadingHistorial ? (
                        <p style={{ color: '#94a3b8', padding: 20 }}>Cargando...</p>
                    ) : historial.length === 0 ? (
                        <p style={{ color: '#94a3b8', padding: 20 }}>Sin registros para los filtros seleccionados.</p>
                    ) : (
                        <div style={styles.tableContainer}>
                            <table style={styles.table}>
                                <thead>
                                    <tr>
                                        <th style={styles.th}>Fecha</th>
                                        <th style={styles.th}>Acción</th>
                                        <th style={styles.th}>Detalle</th>
                                        <th style={styles.th}>Usuario</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {historial.map(h => (
                                        <tr key={h.id} style={{ borderBottom: '1px solid #f0f4f3' }}>
                                            <td style={{ ...styles.td, whiteSpace: 'nowrap', color: '#94a3b8', fontSize: 13 }}>
                                                {new Date(h.fecha).toLocaleString('es-AR', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' })}
                                            </td>
                                            <td style={{ ...styles.td, whiteSpace: 'nowrap' }}>
                                                <span style={{
                                                    display: 'inline-block', fontSize: 12, fontWeight: 600, padding: '2px 10px', borderRadius: 10,
                                                    ...(h.accion === 'ingreso_stock'     ? { background: '#e0f2fe', color: '#0369a1' } :
                                                        h.accion === 'anulacion_venta'   ? { background: '#fef2f2', color: '#e25252' } :
                                                        h.accion === 'anulacion_item'    ? { background: '#fff7ed', color: '#c2410c' } :
                                                        h.accion === 'cambio_devolucion' ? { background: '#f0fdf4', color: '#15803d' } :
                                                        { background: '#f1f5f9', color: '#475569' })
                                                }}>
                                                    {h.accion_display}
                                                </span>
                                            </td>
                                            <td style={{ ...styles.td, fontSize: 13, color: '#475569' }}>{h.detalle}</td>
                                            <td style={{ ...styles.td, fontSize: 13, fontWeight: 600, color: '#475569' }}>{h.usuario_username}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            )}

        </div>
        </>
    );
};

const styles = {
    container: {
        padding: 0,
        fontFamily: "'Inter', 'Segoe UI', system-ui, sans-serif",
        width: '100%',
        maxWidth: '100%',
        color: '#1a2926',
    },
    loadingMessage: {
        padding: '20px',
        textAlign: 'center',
        color: '#475569',
        fontSize: '1.1em',
    },
    header: {
        marginBottom: '30px',
        paddingBottom: '20px',
        borderBottom: '2px solid #e2e8f0',
    },
    title: {
        fontSize: '1.5rem',
        fontWeight: 600,
        marginBottom: '10px',
        color: '#1a2926',
    },
    subtitle: {
        fontSize: '1.1em',
        color: '#475569',
        marginBottom: '15px',
    },
    backButton: {
        padding: '10px 20px',
        backgroundColor: '#94a3b8',
        color: 'white',
        border: 'none',
        borderRadius: '6px',
        cursor: 'pointer',
        fontSize: '1em',
    },
    tabs: {
        display: 'flex',
        gap: '10px',
        marginBottom: '30px',
        borderBottom: '2px solid #e2e8f0',
    },
    tab: {
        padding: '12px 24px',
        backgroundColor: 'transparent',
        border: 'none',
        borderBottomWidth: '3px',
        borderBottomStyle: 'solid',
        borderBottomColor: 'transparent',
        cursor: 'pointer',
        fontSize: '1em',
        color: '#475569',
        transition: 'all 0.2s',
    },
    tabActive: {
        color: '#5dc87a',
        borderBottomColor: '#5dc87a',
        fontWeight: 'bold',
    },
    tabContent: {
        padding: '20px 0',
    },
    sectionHeader: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '20px',
    },
    sectionTitle: { fontSize: '1.1rem', fontWeight: 600, color: '#1a2926', margin: 0 },
    addButton: {
        padding: '10px 20px',
        backgroundColor: '#5dc87a',
        color: 'white',
        border: 'none',
        borderRadius: '6px',
        cursor: 'pointer',
        fontSize: '1em',
    },
    formContainer: {
        backgroundColor: 'white',
        padding: '20px',
        borderRadius: '10px',
        marginBottom: '20px',
        border: '1px solid #e2e8f0',
        boxShadow: '0 4px 12px rgba(0,0,0,.06), 0 2px 4px rgba(0,0,0,.04)',
    },
    formGrid: {
        display: 'grid',
        gridTemplateColumns: 'repeat(2, 1fr)',
        gap: '15px',
        marginBottom: '20px',
        flexWrap: 'wrap',
    },
    formGroup: {
        display: 'flex',
        flexDirection: 'column',
    },
    formLabel: {
        marginBottom: '5px',
        fontWeight: 'bold',
        color: '#475569',
    },
    input: {
        padding: '10px',
        border: '1px solid #e2e8f0',
        borderRadius: '6px',
        fontSize: '1em',
    },
    checkbox: {
        marginRight: '8px',
        cursor: 'pointer',
    },
    formActions: {
        display: 'flex',
        gap: '10px',
        justifyContent: 'flex-end',
        flexWrap: 'wrap',
    },
    saveButton: {
        padding: '10px 20px',
        backgroundColor: '#5dc87a',
        color: 'white',
        border: 'none',
        borderRadius: '6px',
        cursor: 'pointer',
        fontSize: '1em',
    },
    cancelButton: {
        padding: '10px 20px',
        backgroundColor: '#94a3b8',
        color: 'white',
        border: 'none',
        borderRadius: '6px',
        cursor: 'pointer',
        fontSize: '1em',
    },
    tableContainer: {
        backgroundColor: 'white',
        borderRadius: '10px',
        overflowX: 'auto',
        overflowY: 'visible',
        WebkitOverflowScrolling: 'touch',
        border: '1px solid #e2e8f0',
        boxShadow: '0 4px 12px rgba(0,0,0,.06), 0 2px 4px rgba(0,0,0,.04)',
    },
    table: {
        width: '100%',
        minWidth: '600px',
        borderCollapse: 'collapse',
    },
    th: {
        backgroundColor: '#f1f5f9',
        padding: '12px',
        textAlign: 'left',
        borderBottom: '2px solid #e2e8f0',
        fontWeight: 'bold',
        color: '#475569',
    },
    td: {
        padding: '12px',
        borderBottom: '1px solid #e2e8f0',
    },
    actionButtons: {
        display: 'flex',
        gap: '5px',
        flexWrap: 'wrap',
    },
    editButton: {
        padding: '5px 10px',
        backgroundColor: '#f59e0b',
        color: 'white',
        border: 'none',
        borderRadius: '6px',
        cursor: 'pointer',
        fontSize: '0.9em',
    },
    passwordButton: {
        padding: '5px 10px',
        backgroundColor: '#3b9ede',
        color: 'white',
        border: 'none',
        borderRadius: '6px',
        cursor: 'pointer',
        fontSize: '0.9em',
    },
    deleteButton: {
        padding: '5px 10px',
        backgroundColor: '#e25252',
        color: 'white',
        border: 'none',
        borderRadius: '6px',
        cursor: 'pointer',
        fontSize: '0.9em',
    },
    infoBox: {
        backgroundColor: '#f1f5f9',
        border: '1px solid #e2e8f0',
        borderRadius: '10px',
        padding: '15px',
        marginBottom: '20px',
        color: '#1a2926',
    },
    modalOverlay: {
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0,0,0,0.5)',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 1000,
    },
    modalContent: {
        backgroundColor: 'white',
        padding: '30px',
        borderRadius: '16px',
        maxWidth: '500px',
        width: '90%',
        maxHeight: '90vh',
        overflowY: 'auto',
        boxShadow: '0 8px 32px rgba(0,0,0,0.18)',
        textAlign: 'center',
    },
    inputGroupModal: {
        marginBottom: '15px',
        textAlign: 'left',
    },
    label: {
        marginBottom: '5px',
        fontWeight: 'bold',
        color: '#475569',
        display: 'block',
    },
    modalInput: {
        width: '100%',
        padding: '8px',
        boxSizing: 'border-box',
        border: '1px solid #e2e8f0',
        borderRadius: '6px',
        fontSize: '1em',
    },
    modalActions: {
        display: 'flex',
        justifyContent: 'center',
        gap: '10px',
        marginTop: '15px',
    },
    modalConfirmButton: {
        padding: '10px 15px',
        backgroundColor: '#5dc87a',
        color: 'white',
        border: 'none',
        borderRadius: '6px',
        cursor: 'pointer',
    },
    modalCancelButton: {
        padding: '10px 15px',
        backgroundColor: '#94a3b8',
        color: 'white',
        border: 'none',
        borderRadius: '6px',
        cursor: 'pointer',
    },
};

export default PanelAdministracionTienda;

