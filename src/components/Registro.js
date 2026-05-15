import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import axios from 'axios';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCheck, faChevronLeft, faChevronRight, faStore, faUser, faEnvelope, faLock, faPhone, faSpinner } from '@fortawesome/free-solid-svg-icons';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';

const COLORES = {
  verde:      '#5dc87a',
  verdeOsc:   '#3da85f',
  fondoCard:  '#f8fffe',
  borde:      '#d4edda',
  texto:      '#1a3a2a',
  gris:       '#6b7280',
  error:      '#dc2626',
  pro:        '#3b82f6',
  proOsc:     '#2563eb',
  advanced:   '#10b981',
  advOsc:     '#059669',
};

const PLAN_INFO = {
  starter: {
    display: 'Starter',
    precio: '35.000',
    color: COLORES.verde,
    colorOsc: COLORES.verdeOsc,
    features: [
      'Hasta 1.000 productos',
      '2 usuarios por tienda',
      'Punto de venta',
      'Recibos de compra',
      'Gestión de stock',
    ],
    noIncluye: ['Factura electrónica', 'Integración ML / Tienda Nube'],
  },
  pro: {
    display: 'Pro',
    precio: '40.000',
    color: COLORES.pro,
    colorOsc: COLORES.proOsc,
    popular: true,
    features: [
      'Hasta 2.500 productos',
      '4 usuarios por tienda',
      'Punto de venta',
      'Recibos de compra',
      'Gestión de stock',
      'Factura electrónica (ARCA/AFIP)',
    ],
    noIncluye: ['Integración ML / Tienda Nube'],
  },
  advanced: {
    display: 'Advanced',
    precio: '60.000',
    color: COLORES.advanced,
    colorOsc: COLORES.advOsc,
    features: [
      'Productos ilimitados',
      'Usuarios ilimitados',
      'Punto de venta',
      'Recibos de compra',
      'Gestión de stock',
      'Factura electrónica (ARCA/AFIP)',
      'Integración Mercado Libre',
      'Integración Tienda Nube',
    ],
    noIncluye: [],
  },
};

export default function Registro() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [paso, setPaso] = useState(1); // 1 = datos, 2 = plan
  const [planSeleccionado, setPlanSeleccionado] = useState(
    searchParams.get('plan') || 'pro'
  );
  const [form, setForm] = useState({
    nombre_tienda: '',
    email: '',
    username: '',
    password: '',
    password2: '',
    telefono: '',
  });
  const [errores, setErrores] = useState({});
  const [errorGeneral, setErrorGeneral] = useState('');
  const [cargando, setCargando] = useState(false);

  useEffect(() => {
    const planParam = searchParams.get('plan');
    if (planParam && PLAN_INFO[planParam]) setPlanSeleccionado(planParam);
  }, [searchParams]);

  const validarPaso1 = () => {
    const e = {};
    if (!form.nombre_tienda.trim()) e.nombre_tienda = 'El nombre de la tienda es obligatorio.';
    if (!form.email.trim() || !/\S+@\S+\.\S+/.test(form.email)) e.email = 'Email inválido.';
    if (!form.username.trim() || form.username.length < 3) e.username = 'El usuario debe tener al menos 3 caracteres.';
    if (!form.password || form.password.length < 6) e.password = 'La contraseña debe tener al menos 6 caracteres.';
    if (form.password !== form.password2) e.password2 = 'Las contraseñas no coinciden.';
    setErrores(e);
    return Object.keys(e).length === 0;
  };

  const handleSiguiente = () => {
    if (validarPaso1()) setPaso(2);
  };

  const handleSubmit = async () => {
    setCargando(true);
    setErrorGeneral('');
    try {
      const { data } = await axios.post(`${API_BASE_URL}/api/registro/`, {
        nombre_tienda: form.nombre_tienda.trim(),
        email:         form.email.trim().toLowerCase(),
        username:      form.username.trim().toLowerCase(),
        password:      form.password,
        telefono:      form.telefono.trim(),
        plan:          planSeleccionado,
      });

      // Guardar tokens en localStorage para que quede logueado al volver
      localStorage.setItem('token',              data.token_access);
      localStorage.setItem('refreshToken',       data.token_refresh);
      localStorage.setItem('selectedStoreSlug',  data.tienda_slug);
      localStorage.setItem('pendingPlanSetup',   '1');

      // Redirigir a MP para suscribirse
      if (data.init_point) {
        window.location.href = data.init_point;
      } else {
        // Sin MP configurado (dev): ir directo al resultado
        navigate('/suscripcion/resultado?status=approved');
      }
    } catch (err) {
      const msg = err.response?.data?.error || 'Error al crear la cuenta. Intentá de nuevo.';
      setErrorGeneral(msg);
      setPaso(1);
    } finally {
      setCargando(false);
    }
  };

  const campo = (name, label, icon, type = 'text', placeholder = '') => (
    <div style={s.campoWrap}>
      <label style={s.label}>{label}</label>
      <div style={s.inputWrap}>
        <FontAwesomeIcon icon={icon} style={s.inputIcon} />
        <input
          type={type}
          style={{ ...s.input, ...(errores[name] ? s.inputError : {}) }}
          placeholder={placeholder || label}
          value={form[name]}
          onChange={e => {
            setForm(f => ({ ...f, [name]: e.target.value }));
            if (errores[name]) setErrores(er => ({ ...er, [name]: '' }));
          }}
          onKeyDown={e => e.key === 'Enter' && paso === 1 && handleSiguiente()}
        />
      </div>
      {errores[name] && <span style={s.errorMsg}>{errores[name]}</span>}
    </div>
  );

  return (
    <div style={s.page}>
      {/* Header */}
      <div style={s.header}>
        <Link to="/" style={s.logo}>
          <span style={s.logoText}>Total<span style={{ color: COLORES.verde }}>Stock</span></span>
        </Link>
      </div>

      <div style={s.container}>
        {/* Indicador de pasos */}
        <div style={s.pasos}>
          {[1, 2].map(n => (
            <React.Fragment key={n}>
              <div style={{ ...s.paso, ...(paso >= n ? s.pasoActivo : {}) }}>
                <div style={{ ...s.pasoCirculo, ...(paso >= n ? s.pasoCirculoActivo : {}) }}>
                  {paso > n ? <FontAwesomeIcon icon={faCheck} style={{ fontSize: 12 }} /> : n}
                </div>
                <span style={s.pasoLabel}>{n === 1 ? 'Tus datos' : 'Tu plan'}</span>
              </div>
              {n < 2 && <div style={{ ...s.pasoLinea, ...(paso > n ? s.pasoLineaActiva : {}) }} />}
            </React.Fragment>
          ))}
        </div>

        <div style={s.card}>
          {/* PASO 1 — Datos */}
          {paso === 1 && (
            <>
              <h2 style={s.titulo}>Creá tu cuenta</h2>
              <p style={s.subtitulo}>7 días de prueba gratis. Sin compromisos.</p>

              {errorGeneral && <div style={s.alertaError}>{errorGeneral}</div>}

              {campo('nombre_tienda', 'Nombre de tu tienda', faStore, 'text', 'Ej: Ropa María')}
              {campo('email', 'Email', faEnvelope, 'email', 'tu@email.com')}
              {campo('username', 'Usuario', faUser, 'text', 'Ej: maria_ropa')}
              {campo('telefono', 'Teléfono (opcional)', faPhone, 'tel', '+54 11...')}
              {campo('password', 'Contraseña', faLock, 'password', 'Mínimo 6 caracteres')}
              {campo('password2', 'Repetir contraseña', faLock, 'password', 'Repetí tu contraseña')}

              <button
                style={s.btnPrimario}
                onClick={handleSiguiente}
                onMouseEnter={e => e.currentTarget.style.background = COLORES.verdeOsc}
                onMouseLeave={e => e.currentTarget.style.background = COLORES.verde}
              >
                Elegir plan <FontAwesomeIcon icon={faChevronRight} style={{ marginLeft: 8 }} />
              </button>

              <p style={s.loginLink}>
                ¿Ya tenés cuenta?{' '}
                <Link to="/login" style={{ color: COLORES.verde, fontWeight: 600 }}>Iniciar sesión</Link>
              </p>
            </>
          )}

          {/* PASO 2 — Plan */}
          {paso === 2 && (
            <>
              <button
                style={s.btnVolver}
                onClick={() => setPaso(1)}
              >
                <FontAwesomeIcon icon={faChevronLeft} style={{ marginRight: 6 }} /> Volver
              </button>
              <h2 style={s.titulo}>Elegí tu plan</h2>
              <p style={s.subtitulo}>
                Probá 7 días gratis. Cancelás cuando quieras.
              </p>

              <div style={s.planesGrid}>
                {Object.entries(PLAN_INFO).map(([key, info]) => {
                  const seleccionado = planSeleccionado === key;
                  return (
                    <div
                      key={key}
                      style={{
                        ...s.planCard,
                        borderColor: seleccionado ? info.color : '#e5e7eb',
                        boxShadow: seleccionado ? `0 0 0 2px ${info.color}` : 'none',
                        background: seleccionado ? `${info.color}10` : '#fff',
                      }}
                      onClick={() => setPlanSeleccionado(key)}
                    >
                      {info.popular && (
                        <div style={{ ...s.badge, background: info.color }}>MÁS POPULAR</div>
                      )}
                      <div style={{ ...s.planNombre, color: info.color }}>{info.display}</div>
                      <div style={s.planPrecio}>
                        <span style={s.planMoneda}>$</span>
                        <span style={{ ...s.planMonto, color: info.color }}>{info.precio}</span>
                        <span style={s.planPeriodo}>/mes</span>
                      </div>
                      <div style={s.featuresList}>
                        {info.features.map(f => (
                          <div key={f} style={s.feature}>
                            <FontAwesomeIcon icon={faCheck} style={{ color: info.color, marginRight: 8, fontSize: 12 }} />
                            <span style={{ fontSize: 13 }}>{f}</span>
                          </div>
                        ))}
                      </div>
                      <div
                        style={{
                          ...s.radioBubble,
                          borderColor: info.color,
                          background: seleccionado ? info.color : 'transparent',
                        }}
                      />
                    </div>
                  );
                })}
              </div>

              <div style={s.trialNote}>
                <FontAwesomeIcon icon={faCheck} style={{ color: COLORES.verde, marginRight: 8 }} />
                <span>
                  <strong>7 días gratis.</strong> Se cobra $1 para verificar tu método de pago.
                  El plan comienza a cobrarse al finalizar el período de prueba.
                </span>
              </div>

              <button
                style={{ ...s.btnPrimario, background: PLAN_INFO[planSeleccionado].color }}
                onClick={handleSubmit}
                disabled={cargando}
                onMouseEnter={e => !cargando && (e.currentTarget.style.background = PLAN_INFO[planSeleccionado].colorOsc)}
                onMouseLeave={e => !cargando && (e.currentTarget.style.background = PLAN_INFO[planSeleccionado].color)}
              >
                {cargando
                  ? <><FontAwesomeIcon icon={faSpinner} spin style={{ marginRight: 8 }} />Procesando...</>
                  : `Comenzar con ${PLAN_INFO[planSeleccionado].display} →`
                }
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

const s = {
  page: {
    minHeight: '100vh',
    background: 'linear-gradient(135deg, #f0fdf4 0%, #ecfdf5 100%)',
    fontFamily: "'Segoe UI', sans-serif",
  },
  header: {
    padding: '20px 40px',
    borderBottom: '1px solid #e5e7eb',
    background: '#fff',
  },
  logo: { textDecoration: 'none' },
  logoText: {
    fontSize: 24,
    fontWeight: 700,
    color: '#1a3a2a',
  },
  container: {
    maxWidth: 720,
    margin: '0 auto',
    padding: '40px 20px 80px',
  },
  pasos: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 32,
    gap: 0,
  },
  paso: { display: 'flex', alignItems: 'center', flexDirection: 'column', gap: 6 },
  pasoActivo: {},
  pasoCirculo: {
    width: 32,
    height: 32,
    borderRadius: '50%',
    border: '2px solid #d1d5db',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 14,
    fontWeight: 600,
    color: '#9ca3af',
    background: '#fff',
  },
  pasoCirculoActivo: {
    borderColor: COLORES.verde,
    color: COLORES.verde,
    background: `${COLORES.verde}15`,
  },
  pasoLabel: { fontSize: 12, color: COLORES.gris, fontWeight: 500 },
  pasoLinea: {
    width: 80,
    height: 2,
    background: '#e5e7eb',
    margin: '0 12px',
    marginBottom: 22,
  },
  pasoLineaActiva: { background: COLORES.verde },
  card: {
    background: '#fff',
    borderRadius: 16,
    padding: '40px 48px',
    boxShadow: '0 4px 24px rgba(0,0,0,0.08)',
  },
  titulo: {
    fontSize: 26,
    fontWeight: 700,
    color: COLORES.texto,
    margin: '0 0 8px',
  },
  subtitulo: {
    fontSize: 15,
    color: COLORES.gris,
    marginBottom: 28,
  },
  campoWrap: { marginBottom: 18 },
  label: {
    display: 'block',
    fontSize: 13,
    fontWeight: 600,
    color: COLORES.texto,
    marginBottom: 6,
  },
  inputWrap: { position: 'relative' },
  inputIcon: {
    position: 'absolute',
    left: 14,
    top: '50%',
    transform: 'translateY(-50%)',
    color: '#9ca3af',
    fontSize: 14,
  },
  input: {
    width: '100%',
    padding: '11px 14px 11px 40px',
    border: '1.5px solid #e5e7eb',
    borderRadius: 8,
    fontSize: 14,
    color: COLORES.texto,
    outline: 'none',
    boxSizing: 'border-box',
    transition: 'border-color 0.2s',
  },
  inputError: { borderColor: COLORES.error },
  errorMsg: { fontSize: 12, color: COLORES.error, marginTop: 4, display: 'block' },
  alertaError: {
    background: '#fef2f2',
    border: '1px solid #fecaca',
    borderRadius: 8,
    padding: '12px 16px',
    color: COLORES.error,
    fontSize: 14,
    marginBottom: 20,
  },
  btnPrimario: {
    width: '100%',
    padding: '14px',
    background: COLORES.verde,
    color: '#fff',
    border: 'none',
    borderRadius: 8,
    fontSize: 16,
    fontWeight: 600,
    cursor: 'pointer',
    marginTop: 8,
    transition: 'background 0.2s',
  },
  btnVolver: {
    background: 'none',
    border: 'none',
    color: COLORES.gris,
    cursor: 'pointer',
    fontSize: 14,
    padding: 0,
    marginBottom: 16,
    display: 'flex',
    alignItems: 'center',
  },
  loginLink: {
    textAlign: 'center',
    marginTop: 20,
    fontSize: 14,
    color: COLORES.gris,
  },
  // Plan cards
  planesGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: 14,
    marginBottom: 24,
  },
  planCard: {
    border: '2px solid #e5e7eb',
    borderRadius: 12,
    padding: '20px 16px',
    cursor: 'pointer',
    position: 'relative',
    transition: 'all 0.2s',
  },
  badge: {
    position: 'absolute',
    top: -10,
    left: '50%',
    transform: 'translateX(-50%)',
    color: '#fff',
    fontSize: 10,
    fontWeight: 700,
    padding: '3px 10px',
    borderRadius: 20,
    whiteSpace: 'nowrap',
  },
  planNombre: {
    fontSize: 15,
    fontWeight: 700,
    marginBottom: 8,
    marginTop: 4,
  },
  planPrecio: {
    display: 'flex',
    alignItems: 'baseline',
    gap: 2,
    marginBottom: 14,
  },
  planMoneda: { fontSize: 14, color: COLORES.gris },
  planMonto: { fontSize: 24, fontWeight: 700 },
  planPeriodo: { fontSize: 12, color: COLORES.gris },
  featuresList: { display: 'flex', flexDirection: 'column', gap: 6 },
  feature: { display: 'flex', alignItems: 'flex-start' },
  radioBubble: {
    width: 16,
    height: 16,
    borderRadius: '50%',
    border: '2px solid',
    margin: '14px auto 0',
    transition: 'all 0.2s',
  },
  trialNote: {
    display: 'flex',
    alignItems: 'flex-start',
    background: '#f0fdf4',
    border: '1px solid #bbf7d0',
    borderRadius: 8,
    padding: '12px 16px',
    fontSize: 13,
    color: COLORES.texto,
    marginBottom: 20,
  },
};
