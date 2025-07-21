// Store/frontend/src/components/UserManagement.js
import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { useAuth } from '../AuthContext';
import { useNavigate } from 'react-router-dom';

const UserManagement = () => {
    const { user, isAuthenticated, loading } = useAuth();
    const navigate = useNavigate();
    const [users, setUsers] = useState([]);
    const [loadingUsers, setLoadingUsers] = useState(true);
    const [error, setError] = useState('');
    const [showCreateForm, setShowCreateForm] = useState(false);
    const [newUser, setNewUser] = useState({
        username: '',
        email: '',
        password: '',
        password2: '',       // Necesario para el frontend y la validación inicial
        first_name: '',
        last_name: '',
        is_staff: false,
        is_superuser: false,
    });
    // Estado para el usuario que se está editando
    const [editingUser, setEditingUser] = useState(null);

    // `fetchUsers` envuelto en useCallback para estabilidad en useEffect
    const fetchUsers = useCallback(async () => {
        setLoadingUsers(true);
        setError('');
        try {
            // CORRECCIÓN CLAVE AQUÍ: Acceder a response.data.results
            const response = await axios.get(`${process.env.REACT_APP_API_URL}/users/`, {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('access_token')}` // Asegurarse de enviar el token
                }
            });
            setUsers(response.data.results); // <-- ¡CORRECCIÓN!
        } catch (err) {
            console.error('Error fetching users:', err.response ? err.response.data : err.message);
            setError('Error al cargar usuarios. Asegúrate de tener permisos de administrador.');
        } finally {
            setLoadingUsers(false);
        }
    }, []); // No tiene dependencias externas aquí porque los permisos se manejan en el useEffect principal


    useEffect(() => {
        if (!loading) {
            // Redirige si no está autenticado o no es superusuario
            if (!isAuthenticated || !user?.is_superuser) {
                navigate('/'); // O a una página de "Acceso Denegado"
            } else {
                fetchUsers(); // Si tiene permisos, carga los usuarios
            }
        }
    }, [isAuthenticated, user, loading, navigate, fetchUsers]);

    const handleCreateUserChange = (e) => {
        const { name, value, type, checked } = e.target;
        setNewUser({
            ...newUser,
            [name]: type === 'checkbox' ? checked : value
        });
    };

    const handleCreateUserSubmit = async (e) => {
        e.preventDefault();
        setError('');

        // Validación frontend: contraseñas coinciden
        if (newUser.password !== newUser.password2) {
            setError('Las contraseñas no coinciden.');
            return;
        }

        try {
            await axios.post(`${process.env.REACT_APP_API_URL}/users/`, newUser, {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('access_token')}` // Asegurarse de enviar el token
                }
            });
            setNewUser({ // Resetear formulario
                username: '',
                email: '',
                password: '',
                password2: '',
                first_name: '',
                last_name: '',
                is_staff: false,
                is_superuser: false,
            });
            setShowCreateForm(false);
            fetchUsers(); // Refrescar la lista de usuarios
        } catch (err) {
            console.error('Error creating user:', err.response ? err.response.data : err.message);
            const errorMessage = err.response?.data ?
                                 Object.values(err.response.data).flat().join(', ') :
                                 err.message;
            setError('Error al crear usuario: ' + errorMessage);
        }
    };

    const handleDeleteUser = async (userId) => {
        // No permitir que un superusuario se elimine a sí mismo
        if (user && userId === user.id) {
            setError('No puedes eliminar tu propia cuenta de superusuario.');
            return;
        }

        if (window.confirm('¿Estás seguro de que quieres eliminar este usuario?')) {
            setError('');
            try {
                await axios.delete(`${process.env.REACT_APP_API_URL}/users/${userId}/`, {
                    headers: {
                        'Authorization': `Bearer ${localStorage.getItem('access_token')}` // Asegurarse de enviar el token
                    }
                });
                fetchUsers(); // Refrescar la lista
            } catch (err) {
                console.error('Error deleting user:', err.response ? err.response.data : err.message);
                const errorMessage = err.response?.data ?
                                     Object.values(err.response.data).flat().join(', ') :
                                     err.message;
                setError('Error al eliminar usuario: ' + errorMessage);
            }
        }
    };

    const handleEditUserClick = (userToEdit) => {
        setEditingUser({
            ...userToEdit,
            password: '',
            password2: '' // También resetear password2 para edición
        });
    };

    const handleEditUserChange = (e) => {
        const { name, value, type, checked } = e.target;
        setEditingUser(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value
        }));
    };

    const handleEditUserSubmit = async (e) => {
        e.preventDefault();
        setError('');

        // Validación frontend: contraseñas coinciden SOLO si se están cambiando
        if (editingUser.password && editingUser.password !== editingUser.password2) {
            setError('Las nuevas contraseñas no coinciden.');
            return;
        }

        try {
            // Prepara los datos a enviar:
            const dataToSend = { ...editingUser };

            // Si la contraseña no se modificó (el campo está vacío), NO la enviamos.
            // Si se envió, entonces también se debe enviar password2.
            if (!dataToSend.password) {
                delete dataToSend.password;
                delete dataToSend.password2; // Eliminar también password2 si no se cambia la password
            }

            await axios.patch(`${process.env.REACT_APP_API_URL}/users/${editingUser.id}/`, dataToSend, {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('access_token')}` // Asegurarse de enviar el token
                }
            });
            setEditingUser(null); // Cerrar formulario de edición
            fetchUsers(); // Refrescar la lista
        } catch (err) {
            console.error('Error updating user:', err.response ? err.response.data : err.message);
            const errorMessage = err.response?.data ?
                                 Object.values(err.response.data).flat().join(', ') :
                                 err.message;
            setError('Error al actualizar usuario: ' + errorMessage);
        }
    };

    // Manejo de carga y permisos iniciales
    if (loading || (isAuthenticated && !user)) {
        return <div style={{ textAlign: 'center', marginTop: '50px' }}>Cargando datos de usuario...</div>;
    }

    // Redirige si no está autenticado o no es superusuario
    if (!isAuthenticated || !user.is_superuser) {
        // No renderizamos nada aquí, el useEffect ya manejará la navegación
        return <div style={{ textAlign: 'center', marginTop: '50px', color: 'red' }}>Acceso denegado. No tienes permisos de administrador.</div>;
    }

    return (
        <div style={styles.container}>
            <h2 style={styles.header}>Gestión de Usuarios</h2>

            {error && <p style={styles.error}>{error}</p>}

            <button
                onClick={() => setShowCreateForm(!showCreateForm)}
                style={styles.button}
            >
                {showCreateForm ? 'Cancelar Creación' : 'Crear Nuevo Usuario'}
            </button>

            {showCreateForm && (
                <div style={styles.formContainer}>
                    <h3>Crear Usuario</h3>
                    <form onSubmit={handleCreateUserSubmit} style={styles.form}>
                        <input type="text" name="username" placeholder="Usuario" value={newUser.username} onChange={handleCreateUserChange} required style={styles.input} />
                        <input type="email" name="email" placeholder="Email" value={newUser.email} onChange={handleCreateUserChange} required style={styles.input} />
                        <input type="text" name="first_name" placeholder="Nombre" value={newUser.first_name} onChange={handleCreateUserChange} style={styles.input} />
                        <input type="text" name="last_name" placeholder="Apellido" value={newUser.last_name} onChange={handleCreateUserChange} style={styles.input} />
                        <input type="password" name="password" placeholder="Contraseña" value={newUser.password} onChange={handleCreateUserChange} required style={styles.input} />
                        <input type="password" name="password2" placeholder="Confirmar Contraseña" value={newUser.password2} onChange={handleCreateUserChange} required style={styles.input} />

                        <div style={styles.checkboxGroup}>
                            <label style={styles.checkboxLabel}>
                                <input
                                    type="checkbox"
                                    name="is_staff"
                                    checked={newUser.is_staff}
                                    onChange={handleCreateUserChange}
                                    style={styles.checkboxInput}
                                />
                                Es Staff (Acceso al panel de administración)
                            </label>
                            <label style={styles.checkboxLabel}>
                                <input
                                    type="checkbox"
                                    name="is_superuser"
                                    checked={newUser.is_superuser}
                                    onChange={handleCreateUserChange}
                                    style={styles.checkboxInput}
                                />
                                Es Superusuario (Máximos privilegios)
                            </label>
                        </div>

                        <button type="submit" style={styles.submitButton}>Crear Usuario</button>
                    </form>
                </div>
            )}

            {editingUser && (
                <div style={styles.formContainer}>
                    <h3>Editar Usuario: {editingUser.username}</h3>
                    <form onSubmit={handleEditUserSubmit} style={styles.form}>
                        <input type="text" name="username" placeholder="Usuario" value={editingUser.username} onChange={handleEditUserChange} required style={styles.input} />
                        <input type="email" name="email" placeholder="Email" value={editingUser.email} onChange={handleEditUserChange} required style={styles.input} />
                        <input type="text" name="first_name" placeholder="Nombre" value={editingUser.first_name} onChange={handleEditUserChange} style={styles.input} />
                        <input type="text" name="last_name" placeholder="Apellido" value={editingUser.last_name} onChange={handleEditUserChange} style={styles.input} />
                        <input type="password" name="password" placeholder="Nueva Contraseña (dejar vacío para no cambiar)" value={editingUser.password} onChange={handleEditUserChange} style={styles.input} />
                        <input type="password" name="password2" placeholder="Confirmar Nueva Contraseña" value={editingUser.password2} onChange={handleEditUserChange} style={styles.input} />

                        <div style={styles.checkboxGroup}>
                            <label style={styles.checkboxLabel}>
                                <input
                                    type="checkbox"
                                    name="is_staff"
                                    checked={editingUser.is_staff}
                                    onChange={handleEditUserChange}
                                    style={styles.checkboxInput}
                                />
                                Es Staff (Acceso al panel de administración)
                            </label>
                            <label style={styles.checkboxLabel}>
                                <input
                                    type="checkbox"
                                    name="is_superuser"
                                    checked={editingUser.is_superuser}
                                    onChange={handleEditUserChange}
                                    style={styles.checkboxInput}
                                />
                                Es Superusuario (Máximos privilegios)
                            </label>
                        </div>

                        <button type="submit" style={styles.submitButton}>Actualizar Usuario</button>
                        <button type="button" onClick={() => setEditingUser(null)} style={{ ...styles.button, backgroundColor: '#6c757d', marginLeft: '10px' }}>Cancelar</button>
                    </form>
                </div>
            )}

            <h3 style={styles.subHeader}>Lista de Usuarios</h3>
            {loadingUsers ? (
                <p style={{ textAlign: 'center' }}>Cargando usuarios...</p>
            ) : (
                <table style={styles.table}>
                    <thead>
                        <tr>
                            <th style={styles.th}>ID</th>
                            <th style={styles.th}>Usuario</th>
                            <th style={styles.th}>Email</th>
                            <th style={styles.th}>Nombre</th>
                            <th style={styles.th}>Apellido</th>
                            <th style={styles.th}>Staff</th>
                            <th style={styles.th}>Superusuario</th>
                            <th style={styles.th}>Acciones</th>
                        </tr>
                    </thead>
                    <tbody>
                        {users.map((u) => (
                            <tr key={u.id}>
                                <td style={styles.td}>{u.id}</td>
                                <td style={styles.td}>{u.username}</td>
                                <td style={styles.td}>{u.email}</td>
                                <td style={styles.td}>{u.first_name}</td>
                                <td style={styles.td}>{u.last_name}</td>
                                <td style={styles.td}>{u.is_staff ? 'Sí' : 'No'}</td>
                                <td style={styles.td}>{u.is_superuser ? 'Sí' : 'No'}</td>
                                <td style={styles.td}>
                                    <button onClick={() => handleEditUserClick(u)} style={{ ...styles.actionButton, backgroundColor: '#ffc107' }}>Editar</button>
                                    {u.id !== user.id && (
                                        <button onClick={() => handleDeleteUser(u.id)} style={{ ...styles.actionButton, backgroundColor: '#dc3545', marginLeft: '5px' }}>Eliminar</button>
                                    )}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            )}
        </div>
    );
};

const styles = {
    container: {
        padding: '20px',
        maxWidth: '900px',
        margin: '20px auto',
        backgroundColor: '#fff',
        borderRadius: '8px',
        boxShadow: '0 0 10px rgba(0,0,0,0.1)',
    },
    header: {
        textAlign: 'center',
        color: '#333',
        marginBottom: '20px',
    },
    subHeader: {
        marginTop: '30px',
        marginBottom: '15px',
        color: '#555',
    },
    error: {
        color: 'red',
        backgroundColor: '#ffe3e6',
        padding: '10px',
        borderRadius: '5px',
        marginBottom: '15px',
        textAlign: 'center',
    },
    button: {
        backgroundColor: '#28a745',
        color: 'white',
        padding: '10px 15px',
        border: 'none',
        borderRadius: '5px',
        cursor: 'pointer',
        fontSize: '16px',
        marginBottom: '20px',
    },
    formContainer: {
        backgroundColor: '#f8f9fa',
        padding: '20px',
        borderRadius: '8px',
        marginBottom: '20px',
        border: '1px solid #e9ecef',
    },
    form: {
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: '15px',
    },
    input: {
        width: 'calc(100% - 20px)', // Ajuste para padding
        padding: '10px',
        border: '1px solid #ced4da',
        borderRadius: '4px',
    },
    checkboxGroup: {
        gridColumn: '1 / -1', // Ocupa ambas columnas
        display: 'flex',
        flexDirection: 'column',
        gap: '10px',
        marginTop: '10px',
        marginBottom: '10px',
    },
    checkboxLabel: {
        display: 'flex',
        alignItems: 'center',
        cursor: 'pointer',
    },
    checkboxInput: {
        marginRight: '8px',
        transform: 'scale(1.2)', // Hace el checkbox un poco más grande
    },
    submitButton: {
        gridColumn: '1 / -1', // Ocupa ambas columnas
        backgroundColor: '#007bff',
        color: 'white',
        padding: '10px 15px',
        border: 'none',
        borderRadius: '5px',
        cursor: 'pointer',
        fontSize: '16px',
        marginTop: '10px',
    },
    table: {
        width: '100%',
        borderCollapse: 'collapse',
        marginTop: '20px',
    },
    th: {
        backgroundColor: '#e9ecef',
        padding: '12px',
        textAlign: 'left',
        borderBottom: '1px solid #dee2e6',
    },
    td: {
        padding: '12px',
        borderBottom: '1px solid #dee2e6',
    },
    actionButton: {
        color: 'white',
        padding: '8px 12px',
        border: 'none',
        borderRadius: '5px',
        cursor: 'pointer',
        fontSize: '14px',
    },
};

export default UserManagement;
