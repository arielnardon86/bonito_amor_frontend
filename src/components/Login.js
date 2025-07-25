// src/components/Login.js
import React, { useState, useEffect } from 'react';
import { useAuth } from '../AuthContext';
import { useNavigate, useParams } from 'react-router-dom';

const Login = () => {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const { login, isAuthenticated, error, clearError, selectedStoreSlug } = useAuth(); // Removed selectStore here, as login handles it
    const navigate = useNavigate();
    const { storeSlug } = useParams();

    useEffect(() => {
        clearError();
    }, [clearError]);

    useEffect(() => {
        if (isAuthenticated) {
            // If already authenticated and a store is selected, navigate to PuntoVenta
            // Otherwise, HomePage will prompt for store selection
            if (selectedStoreSlug) {
                navigate('/punto-venta'); // Navigate to Punto de Venta if a store is selected
            } else {
                navigate('/'); // Go to HomePage to select store
            }
        }
    }, [isAuthenticated, navigate, selectedStoreSlug]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        // Pass storeSlug from URL to login function
        const success = await login(username, password, storeSlug); // Pass storeSlug
        if (success) {
            // If login is successful, AuthContext will handle setting selectedStoreSlug
            // and the useEffect above will handle navigation.
        }
    };

    return (
        <div style={styles.container}>
            <div style={styles.loginBox}>
                <h2 style={styles.header}>Iniciar Sesión</h2>
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
    storeName: {
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
