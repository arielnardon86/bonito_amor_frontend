// Store/frontend/src/components/Login.js (CORREGIDO)
import React, { useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../AuthContext';

const Login = () => {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const navigate = useNavigate();
    const { login, isAuthenticated } = useAuth();

    React.useEffect(() => {
        if (isAuthenticated) {
            navigate('/');
        }
    }, [isAuthenticated, navigate]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');

        try {
            // Paso 1: Obtener los tokens de acceso y refresco
            // ¡¡¡CORRECCIÓN CLAVE AQUÍ!!!
            // Cambiado de /token/ a /auth/jwt/create/ para coincidir con Djoser JWT
            const response = await axios.post(`${process.env.REACT_APP_API_URL}/auth/jwt/create/`, {
                username,
                password,
            });

            const { access, refresh } = response.data;

            localStorage.setItem('access_token', access);
            localStorage.setItem('refresh_token', refresh);

            // Paso 2: Obtener los datos del usuario logueado
            // Esta ruta `/users/me/` parece correcta para Djoser.
            const userResponse = await axios.get(`${process.env.REACT_APP_API_URL}/users/me/`, {
                headers: {
                    Authorization: `Bearer ${access}`
                }
            });

            if (userResponse.data) {
                login(userResponse.data); // Pasar el objeto de usuario directamente
                console.log("Login successful, user data:", userResponse.data);
            } else {
                console.warn("No user data received from /users/me/ after login.");
                setError("No se pudo obtener la información del usuario después del login.");
                localStorage.removeItem('access_token');
                localStorage.removeItem('refresh_token');
                return;
            }

            navigate('/');

        } catch (err) {
            console.error('Error de login:', err.response ? err.response.data : err.message);
            if (err.response && err.response.status === 401) {
                setError('Usuario o contraseña incorrectos. Por favor, inténtalo de nuevo.');
            } else if (err.response && err.response.status === 404) {
                // Mensaje de error más genérico o específico si sabes qué 404 esperas
                setError('Error de comunicación: Una ruta del backend no fue encontrada. Verifica las URLs.');
            }
            else {
                setError('Ocurrió un error inesperado al intentar iniciar sesión.');
            }
        }
    };

    return (
        <div style={{ padding: '20px', maxWidth: '400px', margin: '50px auto', border: '1px solid #ccc', borderRadius: '8px', boxShadow: '2px 2px 10px rgba(0,0,0,0.1)' }}>
            <h2>Iniciar Sesión</h2>
            <form onSubmit={handleSubmit}>
                <div style={{ marginBottom: '15px' }}>
                    <label htmlFor="username" style={{ display: 'block', marginBottom: '5px' }}>Usuario:</label>
                    <input
                        type="text"
                        id="username"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        required
                        style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '4px' }}
                    />
                </div>
                <div style={{ marginBottom: '15px' }}>
                    <label htmlFor="password" style={{ display: 'block', marginBottom: '5px' }}>Contraseña:</label>
                    <input
                        type="password"
                        id="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '4px' }}
                    />
                </div>
                {error && <p style={{ color: 'red', marginBottom: '15px' }}>{error}</p>}
                <button type="submit" style={{ width: '100%', padding: '10px', backgroundColor: '#007bff', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
                    Ingresar
                </button>
            </form>
        </div>
    );
};

export default Login;