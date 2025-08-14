// BONITO_AMOR/frontend/src/components/Login.js
import React, { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../AuthContext';
import Swal from 'sweetalert2'; // <-- NUEVO: Importamos SweetAlert2

function Login() {
  const { login, error: authError, clearError } = useAuth();
  const navigate = useNavigate();
  const { storeSlug } = useParams();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    clearError();

    const success = await login(username, password, storeSlug);
    
    // Mostramos SweetAlert en base al resultado del login
    if (success) {
      Swal.fire({
        icon: 'success',
        title: '¡Inicio de sesión exitoso!',
        text: 'Serás redirigido al panel principal.',
        timer: 2000,
        showConfirmButton: false
      });
      navigate('/');
    } else {
      Swal.fire({
        icon: 'error',
        title: 'Error de inicio de sesión',
        text: authError || 'Ocurrió un error inesperado. Por favor, inténtalo de nuevo.'
      });
    }
  };

  return (
    <div style={styles.container}>
      <h2 style={styles.header}>Iniciar Sesión en {storeSlug ? storeSlug.replace(/-/g, ' ').toUpperCase() : 'Tu Tienda'}</h2>
      
      {/* Eliminamos el mensaje de error anterior ya que usaremos SweetAlert */}
      {/* {(authError) && <p style={styles.error}>{authError}</p>} */}

      <form onSubmit={handleSubmit} style={styles.form}>
        <input
          type="text"
          placeholder="Nombre de usuario"
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
        color: '#dc3545',
        marginBottom: '10px',
        fontWeight: 'bold',
    },
};

export default Login;
