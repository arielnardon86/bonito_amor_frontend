// BONITO_AMOR/frontend/src/components/Login.js
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../AuthContext';
import Swal from 'sweetalert2';

function Login() {
  const { login, error: authError, clearError } = useAuth();
  const navigate = useNavigate();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    clearError();

    const success = await login(username, password);
    
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
    <>
      <style>{loginMobileStyles}</style>
      <div style={styles.container} className="login-container">
      <h2 style={styles.header} className="login-header">Iniciar Sesión</h2>
      
      {/* Eliminamos el mensaje de error anterior ya que usaremos SweetAlert */}
      {/* {(authError) && <p style={styles.error}>{authError}</p>} */}

      <form onSubmit={handleSubmit} style={styles.form} className="login-form">
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
    </>
  );
}

const styles = {
    container: {
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: 'calc(100vh - 60px)',
        backgroundColor: '#f2f7f5',
        fontFamily: "'Inter', 'Segoe UI', system-ui, sans-serif",
        padding: '20px',
        textAlign: 'center',
    },
    header: {
        fontSize: '1.8em',
        color: '#1a2926',
        marginBottom: '30px',
    },
    form: {
        display: 'flex',
        flexDirection: 'column',
        gap: '16px',
        width: '100%',
        maxWidth: '350px',
        padding: '32px',
        backgroundColor: '#fff',
        borderRadius: '16px',
        boxShadow: '0 4px 12px rgba(0,0,0,.08)',
    },
    input: {
        padding: '11px 14px',
        fontSize: '15px', /* Previene zoom en iOS */
        border: '1.5px solid #d8eae4',
        borderRadius: '10px',
        minHeight: '44px', /* Tamaño mínimo para touch */
        boxSizing: 'border-box',
        fontFamily: "'Inter', 'Segoe UI', system-ui, sans-serif",
    },
    button: {
        padding: '12px',
        fontSize: '1.1em',
        backgroundColor: '#5dc87a',
        color: 'white',
        border: 'none',
        borderRadius: '10px',
        cursor: 'pointer',
        transition: 'background-color 0.3s ease',
        minHeight: '44px', /* Tamaño mínimo para touch */
        fontWeight: 600,
        boxShadow: '0 4px 14px rgba(93,200,122,.30)',
    },
    error: {
        color: '#e25252',
        marginBottom: '10px',
        fontWeight: 'bold',
    },
};

// Estilos responsivos para Login
const loginMobileStyles = `
    @media (max-width: 768px) {
        .login-container {
            padding: 15px !important;
            min-height: calc(100vh - 40px) !important;
        }
        .login-header {
            font-size: 1.5em !important;
            margin-bottom: 20px !important;
        }
        .login-form {
            padding: 20px !important;
            max-width: 100% !important;
        }
    }
    @media (max-width: 480px) {
        .login-header {
            font-size: 1.3em !important;
        }
        .login-form {
            padding: 15px !important;
        }
    }
`;

export default Login;
