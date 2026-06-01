import React, { useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import axios from 'axios';

const BASE_API_URL = (process.env.REACT_APP_API_URL || 'http://localhost:8000')
  .replace(/\/api\/?$/, '').replace(/\/$/, '');

export default function NuevaContrasena() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const uid   = searchParams.get('uid')   || '';
  const token = searchParams.get('token') || '';

  const [password, setPassword]     = useState('');
  const [confirmar, setConfirmar]   = useState('');
  const [enviando, setEnviando]     = useState(false);
  const [mensaje, setMensaje]       = useState('');
  const [exito, setExito]           = useState(false);
  const [mostrarPass, setMostrarPass] = useState(false);

  if (!uid || !token) {
    return (
      <div style={s.container}>
        <div style={s.card}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>⚠️</div>
          <h2 style={s.title}>Enlace inválido</h2>
          <p style={s.sub}>Este enlace de recuperación no es válido o ya expiró.</p>
          <button style={s.btn} onClick={() => navigate('/login')}>Volver al inicio</button>
        </div>
      </div>
    );
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMensaje('');
    if (password !== confirmar) {
      setMensaje('Las contraseñas no coinciden.');
      return;
    }
    if (password.length < 8) {
      setMensaje('La contraseña debe tener al menos 8 caracteres.');
      return;
    }
    setEnviando(true);
    try {
      await axios.post(`${BASE_API_URL}/api/auth/password-reset/confirm/`, {
        uid, token, new_password: password,
      });
      setExito(true);
      setTimeout(() => navigate('/login'), 3000);
    } catch (err) {
      setMensaje(err.response?.data?.error || 'El enlace es inválido o ya expiró.');
    } finally {
      setEnviando(false);
    }
  };

  return (
    <div style={s.container}>
      <div style={s.card}>
        {exito ? (
          <>
            <div style={{ fontSize: 52, marginBottom: 12 }}>✅</div>
            <h2 style={s.title}>¡Contraseña actualizada!</h2>
            <p style={s.sub}>Tu contraseña fue cambiada correctamente.<br />Serás redirigido al inicio de sesión…</p>
          </>
        ) : (
          <>
            <div style={{ fontSize: 44, marginBottom: 8 }}>🔒</div>
            <h2 style={s.title}>Nueva contraseña</h2>
            <p style={s.sub}>Ingresá tu nueva contraseña para <strong>Total Stock</strong>.</p>
            <form onSubmit={handleSubmit} style={s.form}>
              <div style={s.inputWrap}>
                <input
                  type={mostrarPass ? 'text' : 'password'}
                  placeholder="Nueva contraseña (mín. 8 caracteres)"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                  style={s.input}
                  autoFocus
                />
                <button type="button" style={s.ojo} onClick={() => setMostrarPass(v => !v)}>
                  {mostrarPass ? '🙈' : '👁️'}
                </button>
              </div>
              <input
                type={mostrarPass ? 'text' : 'password'}
                placeholder="Repetir contraseña"
                value={confirmar}
                onChange={e => setConfirmar(e.target.value)}
                required
                style={s.input}
              />
              {mensaje && (
                <div style={s.error}>{mensaje}</div>
              )}
              <button type="submit" disabled={enviando} style={{ ...s.btn, opacity: enviando ? .7 : 1 }}>
                {enviando ? 'Guardando…' : 'Guardar nueva contraseña'}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}

const s = {
  container: {
    minHeight: 'calc(100vh - 60px)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    background: '#f8fafc', padding: 20,
    fontFamily: "'Inter','Segoe UI',system-ui,sans-serif",
  },
  card: {
    background: '#fff', borderRadius: 16, padding: '40px 36px',
    maxWidth: 400, width: '100%', textAlign: 'center',
    boxShadow: '0 4px 24px rgba(0,0,0,.09)',
  },
  title: { fontSize: 22, fontWeight: 800, color: '#1e3a8a', margin: '0 0 8px' },
  sub:   { fontSize: 14, color: '#64748b', lineHeight: 1.6, margin: '0 0 24px' },
  form:  { display: 'flex', flexDirection: 'column', gap: 14, textAlign: 'left' },
  inputWrap: { position: 'relative' },
  input: {
    width: '100%', padding: '11px 14px', fontSize: 15,
    border: '1.5px solid #e2e8f0', borderRadius: 10,
    boxSizing: 'border-box', outline: 'none',
    fontFamily: "'Inter','Segoe UI',system-ui,sans-serif",
  },
  ojo: {
    position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
    background: 'none', border: 'none', cursor: 'pointer', fontSize: 16, padding: 0,
  },
  error: {
    fontSize: 13, color: '#b91c1c', background: '#fef2f2',
    border: '1px solid #fecaca', borderRadius: 8, padding: '9px 14px',
  },
  btn: {
    padding: '12px 0', fontSize: 15, fontWeight: 700,
    background: 'linear-gradient(135deg,#5dc87a,#38a080)',
    color: '#fff', border: 'none', borderRadius: 10, cursor: 'pointer',
    boxShadow: '0 4px 14px rgba(93,200,122,.35)', width: '100%',
  },
};
