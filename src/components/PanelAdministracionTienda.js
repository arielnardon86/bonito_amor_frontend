// frontend/src/components/PanelAdministracionTienda.js
import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../AuthContext';
import { useNavigate } from 'react-router-dom';
import { useNotifications } from '../hooks/useNotifications';
import axios from 'axios';
import Swal from 'sweetalert2';
import { formatearMonto } from '../utils/formatearMonto';

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
    
    const [activeTab, setActiveTab] = useState('usuarios'); // 'usuarios', 'medios-pago-aranceles', 'aranceles-ml'
    const [loading, setLoading] = useState(true);
    const [tiendaInfo, setTiendaInfo] = useState(null); // Para verificar integración ML
    
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

    // Cargar información de la tienda para verificar integración ML
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
            }
        } catch (err) {
            console.error('Error al cargar información de la tienda:', err);
        }
    }, [token, selectedStoreSlug]);

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
                {tiendaInfo && tiendaInfo.plataforma_ecommerce === 'MERCADO_LIBRE' && (
                    <button
                        onClick={() => setActiveTab('aranceles-ml')}
                        style={activeTab === 'aranceles-ml' ? { ...styles.tab, ...styles.tabActive } : styles.tab}
                        className="panel-admin-tab"
                    >
                        Aranceles Mercado Libre
                    </button>
                )}
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
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                                            <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
                                                <input type="radio" name="metodo_pago_modo" checked={!arancelForm.metodo_pago_nuevo} onChange={() => setArancelForm({ ...arancelForm, metodo_pago_nuevo: false })} />
                                                Seleccionar existente
                                            </label>
                                            <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
                                                <input type="radio" name="metodo_pago_modo" checked={arancelForm.metodo_pago_nuevo} onChange={() => setArancelForm({ ...arancelForm, metodo_pago_nuevo: true })} />
                                                Crear nuevo
                                            </label>
                                        </div>
                                        {!arancelForm.metodo_pago_nuevo ? (
                                            <select name="metodo_pago" value={arancelForm.metodo_pago} onChange={handleArancelFormChange} required={!arancelForm.metodo_pago_nuevo} style={styles.input}>
                                                <option value="">Seleccionar método...</option>
                                                {metodosPago.filter(m => m.es_financiero && m.nombre !== 'Mercado Libre').map(metodo => (
                                                    <option key={metodo.id} value={metodo.id}>{metodo.nombre}</option>
                                                ))}
                                            </select>
                                        ) : (
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                                <input type="text" name="nuevo_metodo_nombre" value={arancelForm.nuevo_metodo_nombre} onChange={handleArancelFormChange} placeholder="Nombre del método (ej: Tarjeta Visa)" style={styles.input} required={arancelForm.metodo_pago_nuevo} />
                                                <input type="text" name="nuevo_metodo_descripcion" value={arancelForm.nuevo_metodo_descripcion} onChange={handleArancelFormChange} placeholder="Descripción (opcional)" style={styles.input} />
                                            </div>
                                        )}
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
        fontFamily: 'Inter, sans-serif',
        width: '100%',
        maxWidth: '100%',
        color: '#333',
    },
    loadingMessage: {
        padding: '20px',
        textAlign: 'center',
        color: '#555',
        fontSize: '1.1em',
    },
    header: {
        marginBottom: '30px',
        paddingBottom: '20px',
        borderBottom: '2px solid #e0e0e0',
    },
    title: {
        fontSize: '1.5rem',
        fontWeight: 600,
        marginBottom: '10px',
        color: '#2c3e50',
    },
    subtitle: {
        fontSize: '1.1em',
        color: '#666',
        marginBottom: '15px',
    },
    backButton: {
        padding: '10px 20px',
        backgroundColor: '#6c757d',
        color: 'white',
        border: 'none',
        borderRadius: '5px',
        cursor: 'pointer',
        fontSize: '1em',
    },
    tabs: {
        display: 'flex',
        gap: '10px',
        marginBottom: '30px',
        borderBottom: '2px solid #e0e0e0',
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
        color: '#666',
        transition: 'all 0.3s',
    },
    tabActive: {
        color: '#007bff',
        borderBottomColor: '#007bff',
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
    sectionTitle: { fontSize: '1.1rem', fontWeight: 600, color: '#2c3e50', margin: 0 },
    addButton: {
        padding: '10px 20px',
        backgroundColor: '#28a745',
        color: 'white',
        border: 'none',
        borderRadius: '5px',
        cursor: 'pointer',
        fontSize: '1em',
    },
    formContainer: {
        backgroundColor: 'white',
        padding: '20px',
        borderRadius: '8px',
        marginBottom: '20px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
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
        color: '#555',
    },
    input: {
        padding: '10px',
        border: '1px solid #ccc',
        borderRadius: '5px',
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
        backgroundColor: '#007bff',
        color: 'white',
        border: 'none',
        borderRadius: '5px',
        cursor: 'pointer',
        fontSize: '1em',
    },
    cancelButton: {
        padding: '10px 20px',
        backgroundColor: '#6c757d',
        color: 'white',
        border: 'none',
        borderRadius: '5px',
        cursor: 'pointer',
        fontSize: '1em',
    },
    tableContainer: {
        backgroundColor: 'white',
        borderRadius: '8px',
        overflowX: 'auto',
        overflowY: 'visible',
        WebkitOverflowScrolling: 'touch',
        boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
    },
    table: {
        width: '100%',
        minWidth: '600px',
        borderCollapse: 'collapse',
    },
    th: {
        backgroundColor: '#f8f9fa',
        padding: '12px',
        textAlign: 'left',
        borderBottom: '2px solid #dee2e6',
        fontWeight: 'bold',
        color: '#495057',
    },
    td: {
        padding: '12px',
        borderBottom: '1px solid #dee2e6',
    },
    actionButtons: {
        display: 'flex',
        gap: '5px',
        flexWrap: 'wrap',
    },
    editButton: {
        padding: '5px 10px',
        backgroundColor: '#ffc107',
        color: 'black',
        border: 'none',
        borderRadius: '3px',
        cursor: 'pointer',
        fontSize: '0.9em',
    },
    passwordButton: {
        padding: '5px 10px',
        backgroundColor: '#17a2b8',
        color: 'white',
        border: 'none',
        borderRadius: '3px',
        cursor: 'pointer',
        fontSize: '0.9em',
    },
    deleteButton: {
        padding: '5px 10px',
        backgroundColor: '#dc3545',
        color: 'white',
        border: 'none',
        borderRadius: '3px',
        cursor: 'pointer',
        fontSize: '0.9em',
    },
    infoBox: {
        backgroundColor: '#d1ecf1',
        border: '1px solid #bee5eb',
        borderRadius: '5px',
        padding: '15px',
        marginBottom: '20px',
        color: '#0c5460',
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
        borderRadius: '8px',
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
        color: '#555',
        display: 'block',
    },
    modalInput: {
        width: '100%',
        padding: '8px',
        boxSizing: 'border-box',
        border: '1px solid #ccc',
        borderRadius: '5px',
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
        backgroundColor: '#28a745',
        color: 'white',
        border: 'none',
        borderRadius: '4px',
        cursor: 'pointer',
    },
    modalCancelButton: {
        padding: '10px 15px',
        backgroundColor: '#dc3545',
        color: 'white',
        border: 'none',
        borderRadius: '4px',
        cursor: 'pointer',
    },
};

export default PanelAdministracionTienda;

