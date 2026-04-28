// frontend/src/components/PanelAdministracionTienda.js
import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../AuthContext';
import { useNavigate } from 'react-router-dom';
import { useNotifications } from '../hooks/useNotifications';
import axios from 'axios';
import Swal from 'sweetalert2';
import { formatearMonto } from '../utils/formatearMonto';
import NotasCreditoPage from './NotasCreditoPage';
import IntegracionTiendaNube from './IntegracionTiendaNube';
import IntegracionMercadoLibrePanel from './IntegracionMercadoLibrePanel';

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
    const { user, isAuthenticated, loading: authLoading, selectedStoreSlug, token } = useAuth();
    const navigate = useNavigate();
    const { notificationPermission, fcmToken, solicitarPermiso, eliminarToken, error: notificationError } = useNotifications();
    
    const [activeTab, setActiveTab] = useState('usuarios');
    const [loading, setLoading] = useState(true);
    const [tiendaInfo, setTiendaInfo] = useState(null);

    // Estados para el wizard AFIP
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
        tienda: selectedStoreSlug || ''
    });
    const [showPasswordModal, setShowPasswordModal] = useState(false);
    const [passwordForm, setPasswordForm] = useState({
        new_password: '',
        new_password2: ''
    });
    const [selectedUserId, setSelectedUserId] = useState(null);
    
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
    const [showArancelMLForm, setShowArancelMLForm] = useState(false);
    const [showEditArancelMLModal, setShowEditArancelMLModal] = useState(false);
    const [editArancelMLData, setEditArancelMLData] = useState(null);
    const [arancelMLForm, setArancelMLForm] = useState({
        producto: '',
        arancel_porcentaje: '0.00',
        costo_envio: '0.00',
        tienda: selectedStoreSlug || ''
    });

    // Cargar información de la tienda (ML, facturación, etc.)
    // Cargar estado AFIP desde el backend (debe ir ANTES de fetchTiendaInfo)
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
                tipo_facturacion: (d.tipo_facturacion && d.tipo_facturacion !== 'NINGUNA') ? d.tipo_facturacion : 'AFIP',
                condicion_iva_emisor: d.condicion_iva_emisor || 'MT',
                modo_test_afip: false,
            }));
            // Ir al primer paso incompleto
            if (!d.paso1_config) setAfipPasoActivo(1);
            else if (!d.paso2_csr) setAfipPasoActivo(2);
            else if (!d.paso4_cert) setAfipPasoActivo(4);
            else setAfipPasoActivo(5);
        } catch (err) {
            console.error('Error al cargar estado AFIP:', err);
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
                await fetchAfipEstado(tienda.id);
            }
        } catch (err) {
            console.error('Error al cargar información de la tienda:', err);
        }
    }, [token, selectedStoreSlug, fetchAfipEstado]);

    // Guardar configuración básica AFIP (paso 1)
    const handleGuardarConfigAfip = useCallback(async () => {
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
            setAfipPasoActivo(2);
        } catch (err) {
            const msg = err.response?.data?.error || err.message || 'Error al guardar.';
            Swal.fire('Error', msg, 'error');
        } finally {
            setAfipSaving(false);
        }
    }, [token, tiendaInfo, afipForm, fetchAfipEstado, fetchTiendaInfo]);

    // Cargar certificado AFIP (paso 4)
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

    // Generar clave privada y CSR para AFIP (clave se guarda en la tienda en base64; se devuelve CSR para descargar)
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
            title: 'Generar clave y CSR para AFIP',
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
                    <p>Se descargó el archivo <strong>.csr</strong>. Subilo en AFIP (Certificados → Obtener certificado), descargá el .crt y pegá su contenido en base64 en el campo "Certificado AFIP" en la configuración de la tienda.</p>
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
                navigate('/');
            } else {
                setLoading(false);
                fetchTiendaInfo();
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

    return (
        <>
            <style>{mobileStyles}</style>
            <div style={styles.container} className="panel-admin-container">
            <div style={styles.header}>
                <h1 style={styles.title}>Administración</h1>
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
                    onClick={() => setActiveTab('habilitar-facturador')}
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
                    onClick={() => setActiveTab('tiendanube')}
                    style={activeTab === 'tiendanube' ? { ...styles.tab, ...styles.tabActive } : styles.tab}
                    className="panel-admin-tab"
                >
                    Tienda Nube
                </button>
                <button
                    onClick={() => setActiveTab('mercadolibre-panel')}
                    style={activeTab === 'mercadolibre-panel' ? { ...styles.tab, ...styles.tabActive } : styles.tab}
                    className="panel-admin-tab"
                >
                    Mercado Libre
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
                                                name="is_superuser"
                                                checked={userForm.is_superuser}
                                                onChange={handleUserFormChange}
                                                style={styles.checkbox}
                                            />
                                            Es Administrador
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

                    <div style={styles.tableContainer} className="panel-admin-table-container">
                        <table style={styles.table} className="panel-admin-table">
                            <thead>
                                <tr>
                                    <th style={styles.th}>Usuario</th>
                                    <th style={styles.th}>Email</th>
                                    <th style={styles.th}>Nombre</th>
                                    <th style={styles.th}>Apellido</th>
                                    <th style={styles.th}>Staff</th>
                                    <th style={styles.th}>Admin</th>
                                    <th style={styles.th}>Acciones</th>
                                </tr>
                            </thead>
                            <tbody>
                                {users.length === 0 ? (
                                    <tr>
                                        <td colSpan="7" style={styles.td}>No hay usuarios registrados</td>
                                    </tr>
                                ) : (
                                    users.map(user => (
                                        <tr key={user.id}>
                                            <td style={styles.td}>{user.username}</td>
                                            <td style={styles.td}>{user.email || '-'}</td>
                                            <td style={styles.td}>{user.first_name || '-'}</td>
                                            <td style={styles.td}>{user.last_name || '-'}</td>
                                            <td style={styles.td}>{user.is_staff ? 'Sí' : 'No'}</td>
                                            <td style={styles.td}>{user.is_superuser ? 'Sí' : 'No'}</td>
                                            <td style={styles.td}>
                                                <div style={styles.actionButtons} className="panel-admin-action-buttons">
                                                    <button
                                                        onClick={() => handleEditUser(user)}
                                                        style={styles.editButton}
                                                    >
                                                        Editar
                                                    </button>
                                                    <button
                                                        onClick={() => handleChangePassword(user.id)}
                                                        style={styles.passwordButton}
                                                    >
                                                        Cambiar Contraseña
                                                    </button>
                                                    <button
                                                        onClick={() => handleDeleteUser(user.id)}
                                                        style={styles.deleteButton}
                                                    >
                                                        Eliminar
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
                                                        onClick={() => handleEditArancel(arancel)}
                                                        style={styles.editButton}
                                                    >
                                                        Editar
                                                    </button>
                                                    <button
                                                        onClick={() => handleDeleteArancel(arancel.id)}
                                                        style={styles.deleteButton}
                                                    >
                                                        Eliminar
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

            {/* TAB: HABILITAR FACTURADOR - Información para alta en facturación electrónica (AFIP) */}
            {activeTab === 'habilitar-facturador' && (() => {
                const pasos = [
                    { num: 1, label: 'Configurar datos', ok: afipEstado?.paso1_config },
                    { num: 2, label: 'Generar clave y CSR', ok: afipEstado?.paso2_csr },
                    { num: 3, label: 'Subir CSR a AFIP', ok: afipEstado?.paso2_csr }, // completado si ya generó el CSR
                    { num: 4, label: 'Cargar certificado', ok: afipEstado?.paso4_cert },
                    { num: 5, label: 'Probar conexión', ok: false },
                ];
                const todoListo = afipEstado?.paso1_config && afipEstado?.paso2_csr && afipEstado?.paso4_cert;

                const stepStyle = (num) => ({
                    display: 'flex', alignItems: 'center', gap: 10, padding: '10px 16px',
                    borderRadius: 8, cursor: 'pointer', marginBottom: 6,
                    background: afipPasoActivo === num ? '#e8f0fe' : 'transparent',
                    border: afipPasoActivo === num ? '1.5px solid #3c7ef3' : '1.5px solid transparent',
                    fontWeight: afipPasoActivo === num ? 600 : 400,
                    color: '#2c3e50',
                    transition: 'all 0.15s',
                });
                const badgeStyle = (ok) => ({
                    width: 22, height: 22, borderRadius: '50%', display: 'flex', alignItems: 'center',
                    justifyContent: 'center', fontSize: 13, fontWeight: 700, flexShrink: 0,
                    background: ok ? '#28a745' : '#dee2e6',
                    color: ok ? '#fff' : '#888',
                });
                const inputStyle = {
                    width: '100%', padding: '9px 12px', borderRadius: 6,
                    border: '1px solid #ced4da', fontSize: 14, boxSizing: 'border-box',
                    marginTop: 4, marginBottom: 12,
                };
                const btnPrimary = (disabled) => ({
                    padding: '10px 22px', backgroundColor: disabled ? '#adb5bd' : '#3c7ef3',
                    color: '#fff', border: 'none', borderRadius: 6, cursor: disabled ? 'not-allowed' : 'pointer',
                    fontSize: 14, fontWeight: 600,
                });
                const btnSuccess = (disabled) => ({
                    padding: '10px 22px', backgroundColor: disabled ? '#adb5bd' : '#28a745',
                    color: '#fff', border: 'none', borderRadius: 6, cursor: disabled ? 'not-allowed' : 'pointer',
                    fontSize: 14, fontWeight: 600,
                });

                return (
                <div style={styles.tabContent}>
                    <div style={{ maxWidth: 820 }}>
                        <h2 style={{ marginTop: 0, marginBottom: 4, fontSize: '1.35rem', color: '#2c3e50' }}>
                            Facturación electrónica AFIP
                        </h2>
                        <p style={{ marginBottom: 24, color: '#666', fontSize: 14 }}>
                            Seguí los pasos para conectar tu tienda con AFIP y emitir facturas electrónicas.
                        </p>

                        {/* Estado general */}
                        {todoListo && (
                            <div style={{ background: '#d4edda', border: '1px solid #c3e6cb', borderRadius: 8, padding: '12px 18px', marginBottom: 24, display: 'flex', alignItems: 'center', gap: 10 }}>
                                <span style={{ fontSize: 20 }}>✅</span>
                                <span style={{ color: '#155724', fontWeight: 600 }}>
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
                            <div style={{ flex: 1, background: '#fff', border: '1px solid #dee2e6', borderRadius: 10, padding: '24px 28px', minHeight: 300 }}>

                                {/* PASO 1: Configurar datos */}
                                {afipPasoActivo === 1 && (
                                    <div>
                                        <h3 style={{ marginTop: 0, color: '#2c3e50' }}>Paso 1 — Configurar datos AFIP</h3>
                                        <p style={{ color: '#666', fontSize: 14, marginBottom: 20 }}>
                                            Ingresá los datos fiscales de la tienda. Necesitás tener un <strong>punto de venta habilitado para factura electrónica</strong> en AFIP (Comprobantes en línea → Punto de venta).
                                        </p>

                                        <label style={{ fontSize: 13, fontWeight: 600, color: '#444' }}>CUIT <span style={{ color: '#dc3545' }}>*</span></label>
                                        <input
                                            style={inputStyle}
                                            type="text"
                                            placeholder="Ej: 20-12345678-9"
                                            value={afipForm.cuit}
                                            onChange={e => setAfipForm(p => ({ ...p, cuit: e.target.value }))}
                                        />

                                        <label style={{ fontSize: 13, fontWeight: 600, color: '#444' }}>Número de punto de venta AFIP <span style={{ color: '#dc3545' }}>*</span></label>
                                        <input
                                            style={inputStyle}
                                            type="number"
                                            min={1}
                                            placeholder="Ej: 1"
                                            value={afipForm.punto_venta}
                                            onChange={e => setAfipForm(p => ({ ...p, punto_venta: parseInt(e.target.value) || 1 }))}
                                        />

                                        <label style={{ fontSize: 13, fontWeight: 600, color: '#444' }}>Condición IVA del emisor <span style={{ color: '#dc3545' }}>*</span></label>
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

                                        <label style={{ fontSize: 13, fontWeight: 600, color: '#444' }}>Sistema de facturación</label>
                                        <select
                                            style={{ ...inputStyle, background: '#fff' }}
                                            value={afipForm.tipo_facturacion}
                                            onChange={e => setAfipForm(p => ({ ...p, tipo_facturacion: e.target.value }))}
                                        >
                                            <option value="AFIP">AFIP (recomendado)</option>
                                            <option value="ARCA">ARCA</option>
                                        </select>

                                        <button style={btnPrimary(afipSaving)} onClick={handleGuardarConfigAfip} disabled={afipSaving}>
                                            {afipSaving ? 'Guardando...' : 'Guardar y continuar →'}
                                        </button>
                                    </div>
                                )}

                                {/* PASO 2: Generar clave y CSR */}
                                {afipPasoActivo === 2 && (
                                    <div>
                                        <h3 style={{ marginTop: 0, color: '#2c3e50' }}>Paso 2 — Generar clave privada y CSR</h3>
                                        {!afipEstado?.paso1_config && (
                                            <div style={{ background: '#fff3cd', border: '1px solid #ffc107', borderRadius: 6, padding: '10px 14px', marginBottom: 16, fontSize: 14 }}>
                                                ⚠️ Completá el paso 1 (CUIT y punto de venta) antes de continuar.
                                            </div>
                                        )}
                                        <p style={{ color: '#666', fontSize: 14, marginBottom: 16 }}>
                                            Total Stock genera una <strong>clave privada RSA</strong> y un <strong>CSR</strong> (Certificate Signing Request) con los datos de tu tienda. La clave privada queda guardada de forma segura; vos solo te llevás el archivo <code>.csr</code> para subirlo a AFIP en el siguiente paso.
                                        </p>
                                        {afipEstado?.paso2_csr && (
                                            <div style={{ background: '#d4edda', border: '1px solid #c3e6cb', borderRadius: 6, padding: '10px 14px', marginBottom: 16, fontSize: 14, color: '#155724' }}>
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

                                {/* PASO 3: Subir CSR a AFIP */}
                                {afipPasoActivo === 3 && (
                                    <div>
                                        <h3 style={{ marginTop: 0, color: '#2c3e50' }}>Paso 3 — Subir el CSR a AFIP</h3>
                                        <p style={{ color: '#666', fontSize: 14, marginBottom: 16 }}>
                                            Con el archivo <code>.csr</code> que descargaste, hacé lo siguiente en AFIP:
                                        </p>
                                        <ol style={{ paddingLeft: 20, color: '#444', lineHeight: 1.9, fontSize: 14 }}>
                                            <li>Ingresá a <a href="https://auth.afip.gob.ar/contribuyente_/login.xhtml" target="_blank" rel="noopener noreferrer" style={{ color: '#3c7ef3' }}>AFIP con tu CUIT y clave fiscal</a>.</li>
                                            <li>Buscá el servicio <strong>"Administración de Certificados Digitales"</strong>.</li>
                                            <li>Hacé clic en <strong>"Agregar alias"</strong> y completá un nombre (ej. <em>TotalStock</em>).</li>
                                            <li>En el alias creado, elegí <strong>"Nueva solicitud de certificado"</strong> y subí el archivo <code>.csr</code>.</li>
                                            <li>AFIP te devuelve un archivo <strong>.crt</strong> — descargalo.</li>
                                        </ol>
                                        <div style={{ background: '#e7f3ff', border: '1px solid #b3d9ff', borderRadius: 8, padding: '12px 16px', marginTop: 16, marginBottom: 20 }}>
                                            <strong style={{ color: '#004085' }}>🔗 Enlace directo:</strong>{' '}
                                            <a href="https://wsaahomo.afip.gov.ar/ws/services/LoginCms" target="_blank" rel="noopener noreferrer" style={{ color: '#3c7ef3' }}>AFIP – Administración de Certificados</a>
                                            <br />
                                            <span style={{ fontSize: 13, color: '#555' }}>Si tu modo está en "prueba", usá el ambiente de <strong>homologación</strong>; si es producción, usá el ambiente real.</span>
                                        </div>
                                        <button style={btnPrimary(false)} onClick={() => setAfipPasoActivo(4)}>
                                            Ya tengo el .crt — continuar →
                                        </button>
                                    </div>
                                )}

                                {/* PASO 4: Cargar certificado */}
                                {afipPasoActivo === 4 && (
                                    <div>
                                        <h3 style={{ marginTop: 0, color: '#2c3e50' }}>Paso 4 — Cargar el certificado AFIP</h3>
                                        <p style={{ color: '#666', fontSize: 14, marginBottom: 16 }}>
                                            Cargá el certificado que obtuviste de AFIP. Podés subir el archivo <code>.crt</code> directamente o pegar el contenido en base64.
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
                                                    <p style={{ fontSize: 13, color: '#28a745', marginBottom: 16 }}>
                                                        ✅ Archivo seleccionado: <strong>{afipCertFile.name}</strong>
                                                    </p>
                                                )}
                                            </div>
                                        ) : (
                                            <div>
                                                <p style={{ fontSize: 13, color: '#666', marginBottom: 8 }}>
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
                                            <div style={{ background: '#d4edda', border: '1px solid #c3e6cb', borderRadius: 6, padding: '10px 14px', marginBottom: 16, fontSize: 14, color: '#155724' }}>
                                                ✅ Ya hay un certificado cargado. Podés reemplazarlo si es necesario.
                                            </div>
                                        )}

                                        <button style={btnSuccess(afipSaving)} onClick={handleCargarCertificado} disabled={afipSaving}>
                                            {afipSaving ? 'Cargando...' : 'Guardar certificado'}
                                        </button>
                                    </div>
                                )}

                                {/* PASO 5: Probar conexión */}
                                {afipPasoActivo === 5 && (
                                    <div>
                                        <h3 style={{ marginTop: 0, color: '#2c3e50' }}>Paso 5 — Probar la conexión</h3>
                                        {!todoListo && (
                                            <div style={{ background: '#fff3cd', border: '1px solid #ffc107', borderRadius: 6, padding: '10px 14px', marginBottom: 16, fontSize: 14 }}>
                                                ⚠️ Completá los pasos anteriores antes de probar.
                                                {!afipEstado?.paso1_config && <div>— Falta: configurar CUIT y punto de venta (paso 1)</div>}
                                                {!afipEstado?.paso2_csr && <div>— Falta: generar clave y CSR (paso 2)</div>}
                                                {!afipEstado?.paso4_cert && <div>— Falta: cargar el certificado (paso 4)</div>}
                                            </div>
                                        )}
                                        <div style={{ background: '#e8f4fd', border: '1px solid #bee3f8', borderRadius: 8, padding: '14px 18px', marginBottom: 20, fontSize: 14, color: '#2c3e50' }}>
                                            <strong>⚠️ Antes de continuar, autorizá el certificado en AFIP:</strong>
                                            <ol style={{ margin: '10px 0 0 0', paddingLeft: 20, lineHeight: 2 }}>
                                                <li>Ingresá a <strong>afip.gob.ar</strong> con tu CUIT y clave fiscal.</li>
                                                <li>Abrí <strong>Administrador de Relaciones de Clave Fiscal</strong>.</li>
                                                <li>Hacé clic en <strong>Nueva Relación</strong>.</li>
                                                <li>Seleccioná <strong>ARCA → Web Services → Facturación Electrónica</strong>.</li>
                                                <li>En "Representante" elegí <strong>Computador Fiscal</strong>.</li>
                                                <li>Seleccioná el alias que diste de alta al generar el certificado (por ejemplo, <em>TotalStock</em>).</li>
                                                <li>Confirmá la relación.</li>
                                            </ol>
                                        </div>
                                        <p style={{ color: '#666', fontSize: 14, marginBottom: 20 }}>
                                            Una vez autorizado el certificado en AFIP, Total Stock va a emitir una <strong>factura de prueba por $1</strong> para verificar que la conexión funciona correctamente. El comprobante quedará registrado en AFIP.
                                        </p>
                                        <button style={btnSuccess(!todoListo)} onClick={handleProbarFacturacion} disabled={!todoListo}>
                                            Probar facturación (emitir $1 de prueba)
                                        </button>
                                        <div style={{ marginTop: 24, padding: '12px 16px', background: '#f8f9fa', borderRadius: 8, fontSize: 13, color: '#555' }}>
                                            ¿Algo no funciona?{' '}
                                            <a href="https://www.afip.gob.ar/fe/comprobantes/" target="_blank" rel="noopener noreferrer" style={{ color: '#3c7ef3' }}>
                                                Documentación AFIP — Facturación electrónica
                                            </a>
                                        </div>
                                    </div>
                                )}

                            </div>
                        </div>

                        {/* Requisitos previos colapsados */}
                        <details style={{ marginTop: 24, border: '1px solid #dee2e6', borderRadius: 8, padding: '12px 16px' }}>
                            <summary style={{ cursor: 'pointer', fontWeight: 600, color: '#495057', fontSize: 14 }}>
                                Ver requisitos previos
                            </summary>
                            <ul style={{ margin: '12px 0 0 0', paddingLeft: 20, color: '#495057', lineHeight: 1.8, fontSize: 14 }}>
                                <li><strong>CUIT</strong> al día (persona física o jurídica).</li>
                                <li><strong>Clave fiscal nivel 3</strong> en AFIP.</li>
                                <li>Inscripción en el <strong>régimen correspondiente</strong> (Monotributo, Responsable Inscripto, IVA Exento, etc.).</li>
                                <li>Un <strong>punto de venta</strong> habilitado para facturación electrónica en AFIP (Comprobantes en línea → Punto de venta).</li>
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
                        <p style={{ marginBottom: 16, color: '#555' }}>
                            Recibí notificaciones push en este dispositivo cuando se registre una venta en la tienda. Funciona en navegador y en la PWA (app instalada).
                        </p>
                        {!notificacionesSoportadas() ? (
                            <p style={{ margin: 0, color: '#856404', background: '#fff3cd', padding: 12, borderRadius: 6 }}>
                                Las notificaciones no están disponibles en este navegador. Probá en Chrome, Edge o Safari (iOS 16.4+).
                            </p>
                        ) : notificationPermission === 'denied' ? (
                            <p style={{ margin: 0, color: '#856404', background: '#fff3cd', padding: 12, borderRadius: 6 }}>
                                Las notificaciones están bloqueadas. Habilitálas en la configuración del navegador o del sistema para poder activarlas acá.
                            </p>
                        ) : notificationPermission === 'granted' && fcmToken ? (
                            <div>
                                <p style={{ margin: '0 0 16px', color: '#155724', background: '#d4edda', padding: 12, borderRadius: 6 }}>
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
                                    <p style={{ margin: '0 0 12px', color: '#721c24', background: '#f8d7da', padding: 10, borderRadius: 6, fontSize: 14 }}>
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

                    {showArancelMLForm && (
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
                                            <p style={{ fontSize: '0.9em', color: '#666', marginTop: '5px' }}>
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

                    <div style={styles.infoBox}>
                        <h3 style={{ marginTop: 0, marginBottom: '10px' }}>Información</h3>
                        <p style={{ marginBottom: '10px' }}>
                            Configura arancel (%) y costo de envío por unidad para cada producto. Las ventas con medio de pago "Mercado Libre" descontarán estos valores en las métricas.
                        </p>
                        <p style={{ marginBottom: '10px', fontSize: '0.9em', color: '#666' }}>
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
                                                        onClick={() => handleEditArancelML(arancel)}
                                                        style={styles.editButton}
                                                    >
                                                        Editar
                                                    </button>
                                                    <button
                                                        onClick={() => handleDeleteArancelML(arancel.id)}
                                                        style={styles.deleteButton}
                                                    >
                                                        Eliminar
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
        color: '#4a6660',
        fontSize: '1.1em',
    },
    header: {
        marginBottom: '30px',
        paddingBottom: '20px',
        borderBottom: '2px solid #d8eae4',
    },
    title: {
        fontSize: '1.5rem',
        fontWeight: 600,
        marginBottom: '10px',
        color: '#1a2926',
    },
    subtitle: {
        fontSize: '1.1em',
        color: '#4a6660',
        marginBottom: '15px',
    },
    backButton: {
        padding: '10px 20px',
        backgroundColor: '#6c757d',
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
        borderBottom: '2px solid #d8eae4',
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
        color: '#4a6660',
        transition: 'all 0.3s',
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
        boxShadow: '0 4px 12px rgba(0,0,0,.08), 0 2px 4px rgba(0,0,0,.05)',
    },
    formGrid: {
        display: 'grid',
        gridTemplateColumns: 'repeat(2, 1fr)',
        gap: '15px',
        marginBottom: '20px',
    },
    formGroup: {
        display: 'flex',
        flexDirection: 'column',
    },
    formLabel: {
        marginBottom: '5px',
        fontWeight: 'bold',
        color: '#4a6660',
    },
    input: {
        padding: '10px',
        border: '1px solid #d8eae4',
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
        backgroundColor: '#6c757d',
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
        boxShadow: '0 4px 12px rgba(0,0,0,.08), 0 2px 4px rgba(0,0,0,.05)',
    },
    table: {
        width: '100%',
        minWidth: '600px',
        borderCollapse: 'collapse',
    },
    th: {
        backgroundColor: '#f7faf9',
        padding: '12px',
        textAlign: 'left',
        borderBottom: '2px solid #d8eae4',
        fontWeight: 'bold',
        color: '#4a6660',
    },
    td: {
        padding: '12px',
        borderBottom: '1px solid #d8eae4',
    },
    actionButtons: {
        display: 'flex',
        gap: '5px',
        flexWrap: 'wrap',
    },
    editButton: {
        padding: '5px 10px',
        backgroundColor: '#f59e0b',
        color: 'black',
        border: 'none',
        borderRadius: '3px',
        cursor: 'pointer',
        fontSize: '0.9em',
    },
    passwordButton: {
        padding: '5px 10px',
        backgroundColor: '#3b9ede',
        color: 'white',
        border: 'none',
        borderRadius: '3px',
        cursor: 'pointer',
        fontSize: '0.9em',
    },
    deleteButton: {
        padding: '5px 10px',
        backgroundColor: '#e25252',
        color: 'white',
        border: 'none',
        borderRadius: '3px',
        cursor: 'pointer',
        fontSize: '0.9em',
    },
    infoBox: {
        backgroundColor: '#eff6ff',
        border: '1px solid #93c5fd',
        borderRadius: '6px',
        padding: '15px',
        marginBottom: '20px',
        color: '#1e4a8a',
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
        borderRadius: '10px',
        maxWidth: '500px',
        width: '90%',
        boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
        textAlign: 'center',
    },
    inputGroupModal: {
        marginBottom: '15px',
        textAlign: 'left',
    },
    label: {
        marginBottom: '5px',
        fontWeight: 'bold',
        color: '#4a6660',
        display: 'block',
    },
    modalInput: {
        width: '100%',
        padding: '8px',
        boxSizing: 'border-box',
        border: '1px solid #d8eae4',
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
        borderRadius: '4px',
        cursor: 'pointer',
    },
    modalCancelButton: {
        padding: '10px 15px',
        backgroundColor: '#e25252',
        color: 'white',
        border: 'none',
        borderRadius: '4px',
        cursor: 'pointer',
    },
};

export default PanelAdministracionTienda;

