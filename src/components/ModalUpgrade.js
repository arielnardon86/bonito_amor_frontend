import React, { useState } from 'react';
import axios from 'axios';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCheck, faTimes, faArrowUp, faSpinner } from '@fortawesome/free-solid-svg-icons';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';

const PLAN_INFO = {
  starter:  { display: 'Starter',  precio: '35.000', color: '#5dc87a' },
  pro:      { display: 'Pro',      precio: '40.000', color: '#3b82f6' },
  advanced: { display: 'Advanced', precio: '60.000', color: '#10b981' },
};

const ORDEN = ['starter', 'pro', 'advanced'];

/**
 * Modal reutilizable para upgrade de plan.
 *
 * Props:
 *   visible        {bool}
 *   onClose        {fn}
 *   planActual     {string}  'starter' | 'pro' | 'advanced'
 *   planesSugeridos {string[]} planes a mostrar como opciones
 *   mensaje        {string}  texto de por qué se bloqueó
 *   token          {string}  JWT
 *   onUpgradeOk    {fn}      callback tras upgrade exitoso
 */
export default function ModalUpgrade({
  visible,
  onClose,
  planActual,
  planesSugeridos = [],
  mensaje = '',
  token,
  onUpgradeOk,
}) {
  const [planElegido, setPlanElegido] = useState(null);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState('');

  if (!visible) return null;

  // Planes candidatos: los sugeridos en orden lógico, excluyendo el actual
  const candidatos = ORDEN.filter(
    p => planesSugeridos.includes(p) && p !== planActual
  );

  const handleUpgrade = async () => {
    if (!planElegido) return;
    setCargando(true);
    setError('');
    try {
      const { data } = await axios.post(
        `${API_BASE_URL}/api/suscripcion/cambiar-plan/`,
        { plan: planElegido },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (data.checkout_url) {
        // Redirigir a MP para completar la nueva suscripción
        window.location.href = data.checkout_url;
      } else {
        if (onUpgradeOk) onUpgradeOk(planElegido);
        onClose();
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Error al cambiar el plan. Intentá de nuevo.');
      setCargando(false);
    }
    // No hacemos setCargando(false) si hay redirect: la página se va a reemplazar
  };

  const info = PLAN_INFO[planElegido] || {};

  return (
    <div style={s.overlay} onClick={onClose}>
      <div style={s.modal} onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div style={s.header}>
          <div style={s.headerLeft}>
            <FontAwesomeIcon icon={faArrowUp} style={{ color: '#5dc87a', marginRight: 10 }} />
            <span style={s.headerTitulo}>Actualizá tu plan</span>
          </div>
          <button style={s.btnClose} onClick={onClose}>
            <FontAwesomeIcon icon={faTimes} />
          </button>
        </div>

        {/* Mensaje */}
        {mensaje && (
          <div style={s.mensajeBloque}>
            {mensaje}
          </div>
        )}

        {/* Plan actual */}
        <div style={s.planActualWrap}>
          <span style={s.planActualLabel}>Plan actual: </span>
          <span style={s.planActualNombre}>
            {PLAN_INFO[planActual]?.display || planActual}
          </span>
        </div>

        {/* Opciones de upgrade */}
        {candidatos.length === 0 ? (
          <p style={{ color: '#6b7280', fontSize: 14, textAlign: 'center' }}>
            Ya estás en el plan máximo disponible.
          </p>
        ) : (
          <div style={s.planesGrid}>
            {candidatos.map(key => {
              const p = PLAN_INFO[key];
              const seleccionado = planElegido === key;
              return (
                <div
                  key={key}
                  style={{
                    ...s.planCard,
                    borderColor: seleccionado ? p.color : '#e5e7eb',
                    boxShadow: seleccionado ? `0 0 0 2px ${p.color}` : 'none',
                    background: seleccionado ? `${p.color}10` : '#fff',
                  }}
                  onClick={() => setPlanElegido(key)}
                >
                  <div style={{ ...s.planNombre, color: p.color }}>{p.display}</div>
                  <div style={s.planPrecio}>
                    <span style={{ color: '#9ca3af', fontSize: 13 }}>$</span>
                    <span style={{ ...s.planMonto, color: p.color }}>{p.precio}</span>
                    <span style={{ color: '#9ca3af', fontSize: 12 }}>/mes</span>
                  </div>
                  <div style={{ ...s.radio, borderColor: p.color, background: seleccionado ? p.color : 'transparent' }} />
                </div>
              );
            })}
          </div>
        )}

        <div style={s.notaCiclo}>
          <FontAwesomeIcon icon={faCheck} style={{ color: '#5dc87a', marginRight: 8 }} />
          El nuevo plan entra en vigor de inmediato. El nuevo precio se cobra en el próximo ciclo.
        </div>

        {error && <div style={s.errorMsg}>{error}</div>}

        {candidatos.length > 0 && (
          <button
            style={{
              ...s.btnPrimario,
              background: info.color || '#5dc87a',
              opacity: !planElegido || cargando ? 0.6 : 1,
              cursor: !planElegido || cargando ? 'not-allowed' : 'pointer',
            }}
            onClick={handleUpgrade}
            disabled={!planElegido || cargando}
          >
            {cargando
              ? <><FontAwesomeIcon icon={faSpinner} spin style={{ marginRight: 8 }} />Procesando...</>
              : planElegido
                ? `Cambiar a ${PLAN_INFO[planElegido]?.display}`
                : 'Seleccioná un plan'
            }
          </button>
        )}
      </div>
    </div>
  );
}

const s = {
  overlay: {
    position: 'fixed',
    inset: 0,
    background: 'rgba(0,0,0,0.5)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 9999,
    padding: 20,
  },
  modal: {
    background: '#fff',
    borderRadius: 16,
    padding: 32,
    width: '100%',
    maxWidth: 480,
    boxShadow: '0 20px 60px rgba(0,0,0,0.2)',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  headerLeft: { display: 'flex', alignItems: 'center' },
  headerTitulo: { fontSize: 18, fontWeight: 700, color: '#1a3a2a' },
  btnClose: {
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    color: '#9ca3af',
    fontSize: 18,
  },
  mensajeBloque: {
    background: '#fffbeb',
    border: '1px solid #fde68a',
    borderRadius: 8,
    padding: '10px 14px',
    fontSize: 13,
    color: '#92400e',
    marginBottom: 16,
  },
  planActualWrap: { marginBottom: 16, fontSize: 14 },
  planActualLabel: { color: '#6b7280' },
  planActualNombre: { fontWeight: 600, color: '#1a3a2a', marginLeft: 4 },
  planesGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))',
    gap: 12,
    marginBottom: 16,
  },
  planCard: {
    border: '2px solid #e5e7eb',
    borderRadius: 10,
    padding: '16px 12px',
    cursor: 'pointer',
    textAlign: 'center',
    transition: 'all 0.2s',
  },
  planNombre: { fontSize: 14, fontWeight: 700, marginBottom: 6 },
  planPrecio: { display: 'flex', alignItems: 'baseline', justifyContent: 'center', gap: 2 },
  planMonto: { fontSize: 20, fontWeight: 700 },
  radio: {
    width: 14,
    height: 14,
    borderRadius: '50%',
    border: '2px solid',
    margin: '10px auto 0',
    transition: 'all 0.2s',
  },
  notaCiclo: {
    display: 'flex',
    alignItems: 'flex-start',
    fontSize: 12,
    color: '#6b7280',
    background: '#f0fdf4',
    border: '1px solid #bbf7d0',
    borderRadius: 8,
    padding: '10px 12px',
    marginBottom: 16,
  },
  errorMsg: {
    color: '#dc2626',
    fontSize: 13,
    marginBottom: 12,
    textAlign: 'center',
  },
  btnPrimario: {
    width: '100%',
    padding: '13px',
    color: '#fff',
    border: 'none',
    borderRadius: 8,
    fontSize: 15,
    fontWeight: 600,
    transition: 'opacity 0.2s',
  },
};
