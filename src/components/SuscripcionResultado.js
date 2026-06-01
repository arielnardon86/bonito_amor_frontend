import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCheckCircle, faTimesCircle, faClock, faSpinner } from '@fortawesome/free-solid-svg-icons';

const API_BASE_URL = (process.env.REACT_APP_API_URL || 'http://localhost:8000').replace(/\/api\/?$/, '').replace(/\/$/, '');

const COLORES = {
  verde:    '#5dc87a',
  rojo:     '#dc2626',
  amarillo: '#f59e0b',
  gris:     '#6b7280',
  texto:    '#1a3a2a',
};

export default function SuscripcionResultado() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [contador, setContador] = useState(5);
  const [verificando, setVerificando] = useState(false);
  const [resultado, setResultado] = useState(null); // { estado, activa, username }

  const preapprovalId = searchParams.get('preapproval_id') || '';
  // MP puede enviar status directamente o via preapproval_id
  const statusParam = searchParams.get('status') || searchParams.get('collection_status') || '';

  // Si viene preapproval_id, verificar con el backend
  useEffect(() => {
    if (!preapprovalId) return;
    setVerificando(true);
    axios.get(`${API_BASE_URL}/api/suscripcion/verificar/`, {
      params: { preapproval_id: preapprovalId },
    }).then(r => {
      setResultado(r.data);
    }).catch(() => {
      setResultado({ estado: 'error_mp', activa: false });
    }).finally(() => setVerificando(false));
  }, [preapprovalId]);

  // Derivar estado final
  const esOk = resultado
    ? resultado.activa
    : statusParam === 'approved';

  const esPendiente = resultado
    ? (!resultado.activa && resultado.estado !== 'error_mp')
    : (statusParam === 'pending' || statusParam === 'in_process' || (!statusParam && !preapprovalId));

  const esFallo = resultado
    ? resultado.estado === 'error_mp'
    : (statusParam === 'failure' || statusParam === 'rejected');

  // Auto-redirect cuando esOk
  useEffect(() => {
    if (!esOk) return;
    const interval = setInterval(() => {
      setContador(c => {
        if (c <= 1) { clearInterval(interval); window.location.href = '/'; return 0; }
        return c - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [esOk, navigate]);

  const renderContenido = () => {
    // Mientras verifica con el backend
    if (verificando) return (
      <>
        <FontAwesomeIcon icon={faSpinner} spin style={{ fontSize: 56, color: COLORES.verde, marginBottom: 20 }} />
        <h1 style={s.titulo}>Verificando tu suscripción...</h1>
        <p style={s.subtitulo}>Estamos confirmando tu pago con Mercado Pago.</p>
      </>
    );

    if (esOk) return (
      <>
        <FontAwesomeIcon icon={faCheckCircle} style={{ fontSize: 64, color: COLORES.verde, marginBottom: 20 }} />
        <h1 style={s.titulo}>¡Bienvenido a Total Stock!</h1>
        <p style={s.subtitulo}>
          Tu suscripción fue activada exitosamente.<br />
          Empezá tu período de prueba de 7 días gratis.
        </p>
        <div style={s.trialBadge}>🎉 7 días de prueba gratuita activados</div>
        {resultado?.username && (
          <p style={{ color: COLORES.gris, fontSize: 13, marginTop: 12 }}>
            Tu usuario: <strong>{resultado.username}</strong>
          </p>
        )}
        <p style={{ color: COLORES.gris, fontSize: 14, marginTop: 16 }}>
          Redirigiendo en <strong>{contador}</strong> segundos...
        </p>
        <button style={s.btnPrimario} onClick={() => { window.location.href = '/'; }}>
          Ir al sistema ahora
        </button>
      </>
    );

    if (esPendiente) return (
      <>
        <FontAwesomeIcon icon={faClock} style={{ fontSize: 64, color: COLORES.amarillo, marginBottom: 20 }} />
        <h1 style={s.titulo}>Suscripción en proceso</h1>
        <p style={s.subtitulo}>
          Mercado Pago está procesando tu suscripción.<br />
          Cuando se confirme, tu cuenta quedará activada automáticamente.
        </p>
        <p style={{ color: COLORES.gris, fontSize: 14, marginTop: 8 }}>
          Recibirás un email de confirmación. No hace falta que hagas nada más.
        </p>
      </>
    );

    // Fallo
    return (
      <>
        <FontAwesomeIcon icon={faTimesCircle} style={{ fontSize: 64, color: COLORES.rojo, marginBottom: 20 }} />
        <h1 style={s.titulo}>El pago no se completó</h1>
        <p style={s.subtitulo}>
          Hubo un problema al procesar tu pago en Mercado Pago.<br />
          Podés intentarlo de nuevo o usar otro método de pago.
        </p>
        <div style={s.accionesError}>
          <button style={s.btnPrimario} onClick={() => navigate('/registro')}>
            Reintentar registro
          </button>
          <Link to="/" style={s.linkSecundario}>Ir al inicio</Link>
        </div>
      </>
    );
  };

  return (
    <div style={s.page}>
      <div style={s.header}>
        <Link to="/" style={s.logo}>
          <span style={s.logoText}>Total<span style={{ color: COLORES.verde }}>Stock</span></span>
        </Link>
      </div>
      <div style={s.container}>
        <div style={s.card}>{renderContenido()}</div>
      </div>
    </div>
  );
}

const s = {
  page: { minHeight: '100vh', background: 'linear-gradient(135deg, #f0fdf4 0%, #ecfdf5 100%)', fontFamily: "'Segoe UI', sans-serif" },
  header: { padding: '20px 40px', borderBottom: '1px solid #e5e7eb', background: '#fff' },
  logo: { textDecoration: 'none' },
  logoText: { fontSize: 24, fontWeight: 700, color: '#1a3a2a' },
  container: { maxWidth: 520, margin: '80px auto', padding: '0 20px' },
  card: { background: '#fff', borderRadius: 16, padding: '48px 40px', boxShadow: '0 4px 24px rgba(0,0,0,0.08)', textAlign: 'center' },
  titulo: { fontSize: 26, fontWeight: 700, color: COLORES.texto, margin: '0 0 12px' },
  subtitulo: { fontSize: 15, color: COLORES.gris, lineHeight: 1.6, margin: '0 0 20px' },
  trialBadge: { display: 'inline-block', background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 20, padding: '6px 20px', fontSize: 14, fontWeight: 600, color: COLORES.texto },
  btnPrimario: { display: 'block', width: '100%', padding: '14px', background: COLORES.verde, color: '#fff', border: 'none', borderRadius: 8, fontSize: 16, fontWeight: 600, cursor: 'pointer', marginTop: 24 },
  accionesError: { display: 'flex', flexDirection: 'column', gap: 12, marginTop: 24 },
  linkSecundario: { color: COLORES.gris, fontSize: 14, textDecoration: 'none' },
};
