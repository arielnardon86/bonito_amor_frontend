import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import axios from 'axios';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faStore, faUser, faEnvelope, faLock, faPhone, faSpinner, faCheck, faIdCard } from '@fortawesome/free-solid-svg-icons';
import { resizeLogoToBase64 } from '../utils/resizeLogo';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';

const COLORES = {
  verde:    '#5dc87a',
  verdeOsc: '#3ab87a',
  texto:    '#1a2926',
  gris:     '#94a3b8',
  error:    '#e25252',
  pro:      '#3b82f6',
  proOsc:   '#2563eb',
  advanced: '#10b981',
  advOsc:   '#059669',
};

const PLAN_INFO = {
  starter: {
    display: 'Starter',
    precio: '35.000',
    color: COLORES.verde,
    colorOsc: COLORES.verdeOsc,
    features: ['Hasta 1.000 productos', '2 usuarios', 'Punto de venta', 'Gestión de stock'],
  },
  pro: {
    display: 'Pro',
    precio: '40.000',
    color: COLORES.pro,
    colorOsc: COLORES.proOsc,
    features: ['Hasta 2.500 productos', '4 usuarios', 'Factura electrónica (ARCA)'],
  },
  advanced: {
    display: 'Advanced',
    precio: '60.000',
    color: COLORES.advanced,
    colorOsc: COLORES.advOsc,
    features: ['Productos y usuarios ilimitados', 'Factura electrónica', 'ML + Tienda Nube'],
  },
};

export default function Registro() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [planSeleccionado, setPlanSeleccionado] = useState('starter');
  const [form, setForm] = useState({
    nombre_tienda: '', email: '', username: '',
    password: '', password2: '', telefono: '', cuit: '',
  });
  const [errores, setErrores] = useState({});
  const [errorGeneral, setErrorGeneral] = useState('');
  const [cargando, setCargando] = useState(false);
  const [logoBase64, setLogoBase64] = useState(null);
  const [logoError, setLogoError] = useState('');

  const handleLogoChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setLogoError('');
    try {
      setLogoBase64(await resizeLogoToBase64(file));
    } catch {
      setLogoError('No se pudo procesar la imagen. Probá con otro archivo.');
    }
  };

  useEffect(() => {
    const p = searchParams.get('plan');
    if (p && PLAN_INFO[p]) setPlanSeleccionado(p);
  }, [searchParams]);

  const validar = () => {
    const e = {};
    if (!form.nombre_tienda.trim()) e.nombre_tienda = 'El nombre de la tienda es obligatorio.';
    if (!form.email.trim() || !/\S+@\S+\.\S+/.test(form.email)) e.email = 'Email inválido.';
    if (!form.username.trim() || form.username.length < 3) e.username = 'El usuario debe tener al menos 3 caracteres.';
    if (form.cuit.replace(/\D/g, '').length !== 11) e.cuit = 'El CUIT/CUIL debe tener 11 dígitos.';
    if (!form.password || form.password.length < 6) e.password = 'La contraseña debe tener al menos 6 caracteres.';
    if (form.password !== form.password2) e.password2 = 'Las contraseñas no coinciden.';
    setErrores(e);
    return Object.keys(e).length === 0;
  };

  const instalacionTiendaNube = sessionStorage.getItem('tn_instalacion_token');

  const handleSubmit = async () => {
    if (!validar()) return;
    setCargando(true);
    setErrorGeneral('');
    try {
      const body = {
        nombre_tienda: form.nombre_tienda.trim(),
        email:         form.email.trim().toLowerCase(),
        username:      form.username.trim().toLowerCase(),
        password:      form.password,
        telefono:      form.telefono.trim(),
        cuit:          form.cuit.trim(),
        logo:          logoBase64,
        plan:          planSeleccionado,
      };
      const endpoint = instalacionTiendaNube
        ? `${API_BASE_URL}/api/tiendanube/instalar/completar-registro/`
        : `${API_BASE_URL}/api/registro/`;
      if (instalacionTiendaNube) body.instalacion_token = instalacionTiendaNube;

      const { data } = await axios.post(endpoint, body);

      // Si la validación falla no llegamos acá, así que recién ahora es seguro
      // dar por completada la instalación de Tienda Nube.
      sessionStorage.removeItem('tn_instalacion_token');

      localStorage.setItem('token',             data.token_access);
      localStorage.setItem('refreshToken',      data.token_refresh);
      localStorage.setItem('selectedStoreSlug', data.tienda_slug);

      if (data.init_point) {
        window.location.href = data.init_point;
      } else {
        navigate('/suscripcion/resultado?status=approved');
      }
    } catch (err) {
      setErrorGeneral(err.response?.data?.error || 'Error al crear la cuenta. Intentá de nuevo.');
    } finally {
      setCargando(false);
    }
  };

  const plan = PLAN_INFO[planSeleccionado];

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
          onKeyDown={e => e.key === 'Enter' && handleSubmit()}
        />
      </div>
      {errores[name] && <span style={s.errorMsg}>{errores[name]}</span>}
    </div>
  );

  return (
    <div style={s.page}>
      <div style={s.header}>
        <Link to="/" style={s.logo}>
          <span style={s.logoText}>Total<span style={{ color: COLORES.verde }}>Stock</span></span>
        </Link>
      </div>

      <div style={s.container}>
        <div style={s.card}>
          {/* Badge del plan elegido */}
          <div style={{ ...s.planBadge, background: `${plan.color}15`, borderColor: plan.color }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
              <div>
                <span style={{ ...s.planBadgeNombre, color: plan.color }}>Plan {plan.display}</span>
                <span style={s.planBadgePrecio}> — ${plan.precio}/mes</span>
              </div>
              <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                {plan.features.map(f => (
                  <span key={f} style={s.planFeature}>
                    <FontAwesomeIcon icon={faCheck} style={{ color: plan.color, marginRight: 4, fontSize: 11 }} />
                    {f}
                  </span>
                ))}
              </div>
            </div>
            <div style={{ marginTop: 8, fontSize: 12, color: COLORES.gris }}>
              7 días de prueba gratis · Mercado Pago · Cancelás cuando quieras
            </div>
          </div>

          <h2 style={s.titulo}>Creá tu cuenta</h2>

          {instalacionTiendaNube && (
            <div style={s.avisoTiendaNube}>🛍️ Al crear tu cuenta, la conectamos automáticamente con tu tienda de Tienda Nube. La integración requiere el plan Advanced.</div>
          )}

          {errorGeneral && <div style={s.alertaError}>{errorGeneral}</div>}

          {campo('nombre_tienda', 'Nombre de tu tienda', faStore, 'text', 'Ej: Ropa María')}

          <div style={s.campoWrap}>
            <label style={s.label}>Logo de tu tienda (opcional)</label>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{
                width: 52, height: 52, borderRadius: '50%', overflow: 'hidden',
                background: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center',
                border: '1.5px solid #e2e8f0', flexShrink: 0,
              }}>
                {logoBase64
                  ? <img src={logoBase64} alt="Logo" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  : <FontAwesomeIcon icon={faStore} style={{ color: '#94a3b8' }} />
                }
              </div>
              <label style={{ fontSize: 13, color: COLORES.verdeOsc, fontWeight: 600, cursor: 'pointer' }}>
                {logoBase64 ? 'Cambiar imagen' : 'Subir imagen'}
                <input type="file" accept="image/*" onChange={handleLogoChange} style={{ display: 'none' }} />
              </label>
            </div>
            {logoError && <span style={s.errorMsg}>{logoError}</span>}
          </div>

          {campo('email', 'Email', faEnvelope, 'email', 'tu@email.com')}
          {campo('username', 'Usuario', faUser, 'text', 'Ej: maria_ropa')}
          {campo('cuit', 'CUIT/CUIL de la tienda', faIdCard, 'text', 'Ej: 20-12345678-9')}
          {campo('telefono', 'Teléfono (opcional)', faPhone, 'tel', '+54 11...')}
          {campo('password', 'Contraseña', faLock, 'password', 'Mínimo 6 caracteres')}
          {campo('password2', 'Repetir contraseña', faLock, 'password', 'Repetí tu contraseña')}

          <button
            style={{ ...s.btnPrimario, background: plan.color, opacity: cargando ? 0.75 : 1 }}
            onClick={handleSubmit}
            disabled={cargando}
            onMouseEnter={e => !cargando && (e.currentTarget.style.background = plan.colorOsc)}
            onMouseLeave={e => !cargando && (e.currentTarget.style.background = plan.color)}
          >
            {cargando
              ? <><FontAwesomeIcon icon={faSpinner} spin style={{ marginRight: 8 }} />Procesando...</>
              : `Crear cuenta y continuar con ${plan.display} →`
            }
          </button>

          <p style={s.loginLink}>
            ¿Ya tenés cuenta?{' '}
            <Link to="/login" style={{ color: COLORES.verde, fontWeight: 600 }}>Iniciar sesión</Link>
          </p>
        </div>
      </div>
    </div>
  );
}

const s = {
  page: { minHeight: '100vh', background: '#f8fafc', fontFamily: "'Inter', 'Segoe UI', system-ui, sans-serif" },
  header: { padding: '20px 40px', borderBottom: '1px solid #e2e8f0', background: '#fff' },
  logo: { textDecoration: 'none' },
  logoText: { fontSize: 24, fontWeight: 700, color: '#1a2926' },
  container: { maxWidth: 560, margin: '0 auto', padding: '40px 20px 80px' },
  card: { background: '#fff', borderRadius: 16, padding: '36px 44px', boxShadow: '0 4px 24px rgba(0,0,0,0.08)' },
  planBadge: { border: '1.5px solid', borderRadius: 10, padding: '14px 18px', marginBottom: 28 },
  planBadgeNombre: { fontWeight: 700, fontSize: 15 },
  planBadgePrecio: { fontSize: 14, color: COLORES.gris },
  planFeature: { fontSize: 12, color: COLORES.texto, display: 'flex', alignItems: 'center' },
  titulo: { fontSize: 22, fontWeight: 700, color: COLORES.texto, margin: '0 0 20px' },
  campoWrap: { marginBottom: 16 },
  label: { display: 'block', fontSize: 13, fontWeight: 600, color: COLORES.texto, marginBottom: 5 },
  inputWrap: { position: 'relative' },
  inputIcon: { position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', fontSize: 14 },
  input: { width: '100%', padding: '11px 14px 11px 40px', border: '1.5px solid #e2e8f0', borderRadius: 10, fontSize: 14, color: COLORES.texto, outline: 'none', boxSizing: 'border-box' },
  inputError: { borderColor: COLORES.error },
  errorMsg: { fontSize: 12, color: COLORES.error, marginTop: 4, display: 'block' },
  alertaError: { background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: 10, padding: '12px 16px', color: '#991b1b', fontSize: 14, marginBottom: 18 },
  avisoTiendaNube: { background: '#edfaf3', border: '1px solid #a8e6c5', borderRadius: 10, padding: '12px 16px', color: '#1a2926', fontSize: 13, marginBottom: 18 },
  btnPrimario: { width: '100%', padding: '14px', color: '#fff', border: 'none', borderRadius: 10, fontSize: 15, fontWeight: 600, cursor: 'pointer', marginTop: 10, transition: 'background 0.2s' },
  loginLink: { textAlign: 'center', marginTop: 18, fontSize: 14, color: COLORES.gris },
};
