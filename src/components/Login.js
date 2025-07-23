// src/components/Login.js
import React, { useState, useEffect } from 'react';
import { useAuth } from '../AuthContext';
import { useNavigate, useParams } from 'react-router-dom'; // Importa useParams

const Login = () => {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const { login, isAuthenticated, error, clearError } = useAuth();
    const navigate = useNavigate();
    const { storeSlug } = useParams(); // <--- ¡NUEVO! Captura el storeSlug de la URL

    // Limpiar errores al montar el componente
    useEffect(() => {
        clearError();
    }, [clearError]);

    // Redirigir si ya está autenticado
    useEffect(() => {
        if (isAuthenticated) {
            navigate('/'); // Redirige a la página principal después del login
        }
    }, [isAuthenticated, navigate]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        // Aquí podrías usar el storeSlug si tu backend lo necesitara para el login
        // Por ahora, el login es genérico, pero el slug ya está disponible.
        await login(username, password); 
    };

    return (
        <div style={styles.container}>
            <div style={styles.loginBox}>
                <h2 style={styles.header}>Iniciar Sesión</h2>
                {/* Muestra el slug de la tienda si está presente */}
                {storeSlug && <p style={styles.storeName}>Tienda: {storeSlug.replace(/-/g, ' ').toUpperCase()}</p>}
                {error && <p style={styles.error}>{error}</p>}
                <form onSubmit={handleSubmit}>
                    <div style={styles.inputGroup}>
                        <label htmlFor="username" style={styles.label}>Usuario:</label>
                        <input
                            type="text"
                            id="username"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            style={styles.input}
                            required
                        />
                    </div>
                    <div style={styles.inputGroup}>
                        <label htmlFor="password" style={styles.label}>Contraseña:</label>
                        <input
                            type="password"
                            id="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            style={styles.input}
                            required
                        />
                    </div>
                    <button type="submit" style={styles.button}>Entrar</button>
                </form>
            </div>
        </div>
    );
};

const styles = {
    container: {
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: 'calc(100vh - 60px)', // Ajusta para el navbar
        backgroundColor: '#f0f2f5',
        fontFamily: 'Arial, sans-serif',
    },
    loginBox: {
        backgroundColor: '#fff',
        padding: '40px',
        borderRadius: '10px',
        boxShadow: '0 4px 20px rgba(0, 0, 0, 0.1)',
        width: '100%',
        maxWidth: '400px',
        textAlign: 'center',
    },
    header: {
        marginBottom: '25px',
        color: '#333',
        fontSize: '2em',
    },
    storeName: { // Nuevo estilo para mostrar el nombre de la tienda
        marginBottom: '20px',
        color: '#007bff',
        fontSize: '1.2em',
        fontWeight: 'bold',
    },
    inputGroup: {
        marginBottom: '15px',
        textAlign: 'left',
    },
    label: {
        display: 'block',
        marginBottom: '8px',
        color: '#555',
        fontWeight: 'bold',
    },
    input: {
        width: 'calc(100% - 20px)',
        padding: '10px',
        border: '1px solid #ddd',
        borderRadius: '5px',
        fontSize: '1em',
    },
    button: {
        backgroundColor: '#007bff',
        color: 'white',
        padding: '12px 25px',
        border: 'none',
        borderRadius: '5px',
        cursor: 'pointer',
        fontSize: '1.1em',
        marginTop: '20px',
        width: '100%',
        transition: 'background-color 0.3s ease',
        '&:hover': {
            backgroundColor: '#0056b3',
        },
    },
    error: {
        color: 'red',
        marginBottom: '15px',
        backgroundColor: '#ffe3e6',
        padding: '10px',
        borderRadius: '5px',
    },
};

export default Login;
