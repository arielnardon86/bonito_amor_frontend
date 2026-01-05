// frontend/src/components/PanelAdministracionTienda.js
import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../AuthContext';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import Swal from 'sweetalert2';

const normalizeApiUrl = (url) => {
    let normalizedUrl = url;
    if (normalizedUrl.endsWith('/api/') || normalizedUrl.endsWith('/api')) {
        normalizedUrl = normalizedUrl.replace(/\/api\/?$/, '');
    }
    if (normalizedUrl.endsWith('/')) {
        normalizedUrl = normalizedUrl.slice(0, -1);
    }
    return normalizedUrl;
};

const BASE_API_ENDPOINT = normalizeApiUrl(process.env.REACT_APP_API_URL);

// Estilos responsivos para móviles
const mobileStyles = `
    @media (max-width: 768px) {
        .panel-admin-container {
            padding: 10px !important;
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
            gap: 15px;
        }
        .panel-admin-add-button {
            width: 100%;
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
        .panel-admin-table {
            font-size: 0.75em;
        }
        .panel-admin-table th,
        .panel-admin-table td {
            padding: 8px 4px !important;
        }
    }
`;

const PanelAdministracionTienda = () => {
    const { user, isAuthenticated, loading: authLoading, selectedStoreSlug, token } = useAuth();
    const navigate = useNavigate();
    
    const [activeTab, setActiveTab] = useState('usuarios'); // 'usuarios', 'medios-pago-aranceles'
    const [loading, setLoading] = useState(true);
    
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
        nombre_plan: 'CONTADO',
        arancel_porcentaje: '0.00',
        tienda: selectedStoreSlug || ''
    });

    useEffect(() => {
        if (!authLoading) {
            if (!isAuthenticated || !user?.is_superuser) {
                navigate('/');
            } else {
                setLoading(false);
                if (activeTab === 'usuarios') {
                    fetchUsers();
                } else if (activeTab === 'medios-pago-aranceles') {
                    fetchMetodosPago();
                    fetchAranceles();
                }
            }
        }
    }, [authLoading, isAuthenticated, user, navigate, activeTab, selectedStoreSlug]);

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
        const { name, value } = e.target;
        setArancelForm({
            ...arancelForm,
            [name]: value
        });
    };

    const handleCreateArancel = async (e) => {
        e.preventDefault();
        
        try {
            await axios.post(`${BASE_API_ENDPOINT}/api/aranceles-tienda/`, {
                ...arancelForm,
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
                nombre_plan: 'CONTADO',
                arancel_porcentaje: '0.00',
                tienda: selectedStoreSlug
            });
            fetchAranceles();
        } catch (err) {
            console.error('Error al crear arancel:', err);
            Swal.fire({
                icon: 'error',
                title: 'Error',
                text: err.response?.data?.detail || err.response?.data?.non_field_errors?.[0] || 'Error al crear el arancel.'
            });
        }
    };

    const handleEditArancel = (arancel) => {
        // Asegurar que metodo_pago sea el ID, no un objeto
        const metodoPagoId = typeof arancel.metodo_pago === 'object' && arancel.metodo_pago !== null
            ? arancel.metodo_pago.id
            : arancel.metodo_pago;
        
        setEditArancelData({
            id: arancel.id,
            metodo_pago: metodoPagoId || '',
            nombre_plan: arancel.nombre_plan || 'CONTADO',
            arancel_porcentaje: arancel.arancel_porcentaje ? arancel.arancel_porcentaje.toString() : '0.00'
        });
        setShowEditArancelModal(true);
    };

    const handleUpdateArancel = async () => {
        try {
            await axios.patch(`${BASE_API_ENDPOINT}/api/aranceles-tienda/${editArancelData.id}/`, {
                metodo_pago: editArancelData.metodo_pago,
                nombre_plan: editArancelData.nombre_plan,
                arancel_porcentaje: editArancelData.arancel_porcentaje,
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
                <h1 style={styles.title}>Panel de Administración de Tienda</h1>
                <p style={styles.subtitle}>Tienda: <strong>{selectedStoreSlug}</strong></p>
                <button onClick={() => navigate('/punto-venta')} style={styles.backButton}>
                    ← Volver a Punto de Venta
                </button>
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
            </div>

            {/* TAB: USUARIOS */}
            {activeTab === 'usuarios' && (
                <div style={styles.tabContent}>
                    <div style={styles.sectionHeader}>
                        <h2>Gestión de Usuarios</h2>
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
                    <div style={styles.sectionHeader}>
                        <h2>Medios de Pago y Aranceles</h2>
                        <button onClick={() => {
                            setArancelForm({
                                metodo_pago: '',
                                nombre_plan: 'CONTADO',
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
                                    <div style={styles.formGroup}>
                                        <label>Método de Pago *</label>
                                        <select
                                            name="metodo_pago"
                                            value={arancelForm.metodo_pago}
                                            onChange={handleArancelFormChange}
                                            required
                                            style={styles.input}
                                        >
                                            <option value="">Seleccionar...</option>
                                            {metodosPago.filter(m => m.es_financiero).map(metodo => (
                                                <option key={metodo.id} value={metodo.id}>
                                                    {metodo.nombre}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                    <div style={styles.formGroup}>
                                        <label>Plan *</label>
                                        <select
                                            name="nombre_plan"
                                            value={arancelForm.nombre_plan}
                                            onChange={handleArancelFormChange}
                                            required
                                            style={styles.input}
                                        >
                                            {PLAN_CHOICES.map(plan => (
                                                <option key={plan.value} value={plan.value}>
                                                    {plan.label}
                                                </option>
                                            ))}
                                        </select>
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

            {/* MODAL DE EDICIÓN DE ARANCEL */}
            {showEditArancelModal && editArancelData && (
                <div style={styles.modalOverlay}>
                    <div style={styles.modalContent}>
                        <h3>Editar Arancel</h3>
                        <div style={styles.inputGroupModal}>
                            <label style={styles.label}>Método de Pago *</label>
                            <select
                                value={editArancelData.metodo_pago}
                                onChange={(e) => setEditArancelData({ ...editArancelData, metodo_pago: e.target.value })}
                                style={styles.modalInput}
                                required
                            >
                                <option value="">Seleccionar...</option>
                                {metodosPago.filter(m => m.es_financiero).map(metodo => (
                                    <option key={metodo.id} value={metodo.id}>
                                        {metodo.nombre}
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div style={styles.inputGroupModal}>
                            <label style={styles.label}>Plan *</label>
                            <select
                                value={editArancelData.nombre_plan}
                                onChange={(e) => setEditArancelData({ ...editArancelData, nombre_plan: e.target.value })}
                                style={styles.modalInput}
                                required
                            >
                                {PLAN_CHOICES.map(plan => (
                                    <option key={plan.value} value={plan.value}>
                                        {plan.label}
                                    </option>
                                ))}
                            </select>
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
        padding: '20px',
        fontFamily: 'Inter, sans-serif',
        maxWidth: '1200px',
        margin: '20px auto',
        backgroundColor: '#f8f9fa',
        borderRadius: '8px',
        boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
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
        fontSize: '2em',
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
        borderBottom: '3px solid transparent',
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
        overflow: 'hidden',
        boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
    },
    table: {
        width: '100%',
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

