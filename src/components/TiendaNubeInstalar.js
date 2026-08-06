// Página pública que recibe la redirección de Tienda Nube tras autorizar la
// instalación (?code=...). No requiere que el comerciante tenga sesión activa:
// si ya tiene cuenta de Total Stock, la conecta directo; si no, lo manda a
// crear cuenta o a iniciar sesión, y termina de vincular ahí.
import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../AuthContext';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';

export default function TiendaNubeInstalar() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { isAuthenticated, token } = useAuth();

  const [estado, setEstado] = useState('procesando'); // procesando | elegir | ya_conectada | vinculada | error
  const [error, setError] = useState('');

  useEffect(() => {
    const code = searchParams.get('code');
    const errorTn = searchParams.get('error');

    if (errorTn) {
      setEstado('error');
      setError('Tienda Nube no autorizó la instalación.');
      return;
    }
    if (!code) {
      setEstado('error');
      setError('Falta el código de autorización de Tienda Nube.');
      return;
    }

    axios.post(`${API_BASE_URL}/api/tiendanube/instalar/iniciar/`, { code })
      .then(async ({ data }) => {
        if (data.ya_conectada) {
          setEstado('ya_conectada');
          return;
        }

        const instalacionToken = data.instalacion_token;

        if (isAuthenticated && token) {
          // Ya hay una sesión de Total Stock activa: conectar directo, sin pedir nada más.
          try {
            await axios.post(
              `${API_BASE_URL}/api/tiendanube/instalar/vincular-cuenta-existente/`,
              { instalacion_token: instalacionToken },
              { headers: { Authorization: `Bearer ${token}` } },
            );
            setEstado('vinculada');
            setTimeout(() => navigate('/panel-administracion-tienda?tab=tiendanube'), 1800);
          } catch (err) {
            setEstado('error');
            setError(err.response?.data?.error || 'No se pudo conectar la tienda.');
          }
          return;
        }

        sessionStorage.setItem('tn_instalacion_token', instalacionToken);
        setEstado('elegir');
      })
      .catch(err => {
        setEstado('error');
        setError(err.response?.data?.error || 'No se pudo procesar la instalación.');
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div style={s.page}>
      <div style={s.card}>
        <div style={s.logo}>Total<span style={{ color: '#5dc87a' }}>Stock</span></div>

        {estado === 'procesando' && (
          <>
            <div style={s.spinner} />
            <p style={s.texto}>Conectando con Tienda Nube…</p>
          </>
        )}

        {estado === 'vinculada' && (
          <>
            <div style={s.icono}>✅</div>
            <h2 style={s.titulo}>¡Listo! Tu tienda ya está conectada</h2>
            <p style={s.texto}>Te llevamos a Total Stock…</p>
          </>
        )}

        {estado === 'ya_conectada' && (
          <>
            <div style={s.icono}>🔄</div>
            <h2 style={s.titulo}>Esta tienda ya tenía una cuenta</h2>
            <p style={s.texto}>Volvimos a conectar tu tienda de Tienda Nube. Iniciá sesión con tu cuenta de Total Stock para seguir usándola.</p>
            <Link to="/login" style={s.boton}>Iniciar sesión →</Link>
          </>
        )}

        {estado === 'elegir' && (
          <>
            <div style={s.icono}>🛍️</div>
            <h2 style={s.titulo}>Ya autorizaste el acceso</h2>
            <p style={s.texto}>Para terminar de conectar tu tienda de Tienda Nube con Total Stock, creá una cuenta o iniciá sesión si ya tenés una.</p>
            <Link to="/registro" style={s.boton}>Crear cuenta nueva →</Link>
            <Link to="/login" style={s.botonSecundario}>Ya tengo cuenta</Link>
          </>
        )}

        {estado === 'error' && (
          <>
            <div style={s.icono}>⚠️</div>
            <h2 style={s.titulo}>No pudimos completar la instalación</h2>
            <p style={{ ...s.texto, color: '#e25252' }}>{error}</p>
            <Link to="/" style={s.botonSecundario}>Volver al inicio</Link>
          </>
        )}
      </div>
    </div>
  );
}

const s = {
  page: {
    minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
    background: '#f8fafc', fontFamily: "'Inter', 'Segoe UI', system-ui, sans-serif", padding: 20,
  },
  card: {
    background: '#fff', borderRadius: 16, padding: '44px 40px', maxWidth: 440, width: '100%',
    textAlign: 'center', boxShadow: '0 4px 24px rgba(0,0,0,0.08)',
  },
  logo: { fontSize: 22, fontWeight: 700, color: '#1a2926', marginBottom: 24 },
  icono: { fontSize: 44, marginBottom: 12 },
  titulo: { fontSize: 20, fontWeight: 700, color: '#1a2926', margin: '0 0 10px' },
  texto: { fontSize: 14, color: '#64748b', lineHeight: 1.6, marginBottom: 22 },
  spinner: {
    width: 36, height: 36, margin: '0 auto 20px', borderRadius: '50%',
    border: '3px solid #e2e8f0', borderTopColor: '#5dc87a',
    animation: 'tn-spin 0.8s linear infinite',
  },
  boton: {
    display: 'block', width: '100%', padding: '13px', marginBottom: 10,
    background: '#5dc87a', color: '#fff', borderRadius: 10, fontWeight: 700,
    fontSize: 15, textDecoration: 'none', boxSizing: 'border-box',
  },
  botonSecundario: {
    display: 'block', width: '100%', padding: '13px',
    background: '#fff', color: '#475569', border: '1.5px solid #e2e8f0', borderRadius: 10,
    fontWeight: 600, fontSize: 14, textDecoration: 'none', boxSizing: 'border-box',
  },
};

if (typeof document !== 'undefined' && !document.getElementById('tn-instalar-keyframes')) {
  const style = document.createElement('style');
  style.id = 'tn-instalar-keyframes';
  style.textContent = '@keyframes tn-spin { to { transform: rotate(360deg); } }';
  document.head.appendChild(style);
}
