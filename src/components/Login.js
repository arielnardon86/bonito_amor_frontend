// BONITO_AMOR/frontend/src/components/Login.js
import React, { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom'; // Importa useParams
import { useAuth } from '../AuthContext';

function Login() {
  const { login, error: authError, clearError } = useAuth();
  const navigate = useNavigate();
  const { storeSlug } = useParams(); // Obtiene storeSlug de la URL

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  // No se necesita un estado de error local, se usa el error del AuthContext directamente

  const handleSubmit = async (e) => {
    e.preventDefault();
    clearError(); // Limpia cualquier error previo del AuthContext

    // Pasa el storeSlug de la URL a la función de login
    const success = await login(username, password, storeSlug);
    if (success) {
      // Si el login es exitoso, navega a la raíz.
      // AppContent en App.js manejará la redirección basada en selectedStoreSlug.
      navigate('/'); 
    }
  };

  return (
    <div style={styles.container}>
      <h2 style={styles.header}>Iniciar Sesión en {storeSlug ? storeSlug.replace(/-/g, ' ').toUpperCase() : 'Tu Tienda'}</h2> {/* Muestra el nombre de la tienda */}
      
      {(authError) && <p style={styles.error}>{authError}</p>} {/* Muestra el error del AuthContext */}

      <form onSubmit={handleSubmit} style={styles.form}>
        <input
          type="text"
          placeholder="Usuario"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          required
          style={styles.input}
        />
        <input
          type="password"
          placeholder="Contraseña"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          style={styles.input}
        />
        <button type="submit" style={styles.button}>Iniciar Sesión</button>
      </form>
    </div>
  );
}

const styles = {
    container: {
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: 'calc(100vh - 60px)',
        backgroundColor: '#f0f2f5',
        fontFamily: 'Arial, sans-serif',
        padding: '20px',
        textAlign: 'center',
    },
    header: {
        fontSize: '2em',
        color: '#333',
        marginBottom: '30px',
    },
    form: {
        display: 'flex',
        flexDirection: 'column',
        gap: '15px',
        width: '100%',
        maxWidth: '350px',
        padding: '25px',
        backgroundColor: '#fff',
        borderRadius: '8px',
        boxShadow: '0 4px 15px rgba(0, 0, 0, 0.1)',
    },
    input: {
        padding: '12px',
        fontSize: '1em',
        border: '1px solid #ddd',
        borderRadius: '5px',
    },
    button: {
        padding: '12px',
        fontSize: '1.1em',
        backgroundColor: '#007bff',
        color: 'white',
        border: 'none',
        borderRadius: '5px',
        cursor: 'pointer',
        transition: 'background-color 0.3s ease',
    },
    error: {
        color: 'red',
        backgroundColor: '#ffe3e6',
        padding: '10px',
        borderRadius: '5px',
        marginBottom: '15px',
        width: '100%',
        maxWidth: '350px',
        textAlign: 'center',
    },
};

export default Login;
