import React from 'react';
import { useNavigate } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCheck } from '@fortawesome/free-solid-svg-icons';

const C = {
    verde: '#5dc87a',
    verdeOsc: '#3ab87a',
    texto: '#1a2926',
    gris: '#475569',
    pro: '#3b82f6',
    advanced: '#10b981',
};

const PLAN_ORDER = ['starter', 'pro', 'advanced'];

const PLANS = [
    {
        id: 'starter',
        nombre: 'Starter',
        precio: '35.000',
        color: C.verde,
        features: ['Hasta 1.000 productos', '2 usuarios', 'Punto de venta', 'Gestión de stock', 'Recibos de compra'],
        ctaClass: 'plan-cta-green',
    },
    {
        id: 'pro',
        nombre: 'Pro',
        precio: '40.000',
        color: C.pro,
        destacado: true,
        badge: 'MÁS POPULAR',
        features: ['Hasta 2.500 productos', '4 usuarios', 'Punto de venta + stock', 'Recibos de compra', 'Factura electrónica ARCA'],
        ctaClass: 'plan-cta-blue',
    },
    {
        id: 'advanced',
        nombre: 'Advanced',
        precio: '60.000',
        color: C.advanced,
        avanzado: true,
        badge: 'COMPLETO',
        features: ['Productos ilimitados', 'Usuarios ilimitados', 'Todo lo del plan Pro', 'Integración Mercado Libre', 'Integración Tienda Nube'],
        ctaClass: 'plan-cta-green',
    },
];

/**
 * Sección de precios reutilizada en la home y en las páginas verticales.
 * Fuente única de los planes: cambiar precios/features acá los actualiza en todas partes.
 *
 * minPlanId: si se pasa (ej. "advanced"), los planes por debajo de ese nivel
 * se muestran atenuados con una nota en vez del CTA — para páginas de una
 * integración/feature que solo está disponible desde cierto plan en adelante.
 */
export default function PricingSection({ minPlanId, minPlanNote = 'No incluye esta integración' }) {
    const navigate = useNavigate();
    const minRank = minPlanId ? PLAN_ORDER.indexOf(minPlanId) : -1;

    return (
        <section id="precios" style={s.pricingSection}>
            <div style={s.sectionWrap}>
                <span style={s.sectionPill}>Sin permanencia mínima</span>
                <h2 style={s.sectionH2}>Planes para cada etapa de tu negocio</h2>
                <p style={s.sectionSub}>
                    Todos incluyen 7 días de prueba gratis. Pagás con Mercado Pago, cancelás cuando quieras.
                </p>
                <div style={s.pricingGrid}>
                    {PLANS.map((plan) => {
                        const dimmed = minRank >= 0 && PLAN_ORDER.indexOf(plan.id) < minRank;
                        return (
                            <div
                                key={plan.id}
                                style={{
                                    ...(plan.destacado ? s.pricingCardFeatured : plan.avanzado ? s.pricingCardAdvanced : s.pricingCard),
                                    ...(dimmed ? s.pricingCardDimmed : {}),
                                }}
                                className={plan.destacado ? 'pricing-card-featured' : 'pricing-card'}
                            >
                                {plan.badge && (
                                    <div style={plan.destacado ? s.popularBadge : s.advancedBadge}>{plan.badge}</div>
                                )}
                                <div style={s.pricingHeader}>
                                    <h3 style={{ ...s.planName, ...(plan.avanzado ? { color: '#1a6a40' } : {}) }}>{plan.nombre}</h3>
                                    <div style={s.priceRow}>
                                        <span style={{ ...s.priceCurrency, color: plan.color }}>$</span>
                                        <span style={{ ...s.priceNum, ...(plan.avanzado ? { color: '#1a6a40' } : {}) }}>{plan.precio}</span>
                                    </div>
                                    <p style={s.pricePer}>por tienda / por mes</p>
                                </div>
                                <div style={s.featureList}>
                                    {plan.features.map((f) => (
                                        <div key={f} style={s.featureRow}>
                                            <FontAwesomeIcon icon={faCheck} style={{ color: plan.color, fontSize: 12, marginTop: 3, flexShrink: 0 }} />
                                            <span>{f}</span>
                                        </div>
                                    ))}
                                </div>
                                {dimmed ? (
                                    <div style={s.dimmedNote}>{minPlanNote}</div>
                                ) : (
                                    <button
                                        onClick={() => navigate(`/registro?plan=${plan.id}`)}
                                        style={{ ...s.planCta, background: plan.color }}
                                        className={plan.ctaClass}
                                    >
                                        Empezar gratis 7 días →
                                    </button>
                                )}
                            </div>
                        );
                    })}
                </div>
                <p style={s.pricingNote}>
                    ✓ Sin permanencia mínima &nbsp;·&nbsp; ✓ Cancelás en cualquier momento &nbsp;·&nbsp; ✓ Pagás con Mercado Pago
                </p>
            </div>
        </section>
    );
}

const s = {
    sectionWrap: { maxWidth: 1200, margin: '0 auto', padding: '0 24px' },
    sectionPill: { display: 'inline-block', background: `rgba(93,200,122,0.1)`, color: C.verdeOsc, border: `1px solid rgba(93,200,122,0.3)`, borderRadius: 20, padding: '5px 14px', fontSize: 12, fontWeight: 700, letterSpacing: 0.5, textTransform: 'uppercase', marginBottom: 16 },
    sectionH2: { fontSize: 'clamp(1.7em, 3.5vw, 2.6em)', fontWeight: 800, color: '#1a2926', marginBottom: 14, lineHeight: 1.2, letterSpacing: -0.5 },
    sectionSub: { fontSize: '1.05em', color: C.gris, maxWidth: 640, margin: '0 auto 52px', lineHeight: 1.7 },

    pricingSection: { padding: '90px 0', background: '#fff', textAlign: 'center' },
    pricingGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 28, alignItems: 'stretch' },
    pricingCard: { background: '#fff', border: '2px solid #e2e8f0', borderRadius: 16, padding: '36px 28px', display: 'flex', flexDirection: 'column', position: 'relative', transition: 'all 0.25s' },
    pricingCardFeatured: { background: '#fff', border: `3px solid ${C.pro}`, borderRadius: 16, padding: '36px 28px', display: 'flex', flexDirection: 'column', position: 'relative', boxShadow: `0 8px 32px rgba(59,130,246,0.15)`, transform: 'scale(1.03)', transition: 'all 0.25s' },
    pricingCardAdvanced: { background: '#edfaf3', border: `2px solid ${C.advanced}`, borderRadius: 16, padding: '36px 28px', display: 'flex', flexDirection: 'column', position: 'relative', transition: 'all 0.25s' },
    popularBadge: { position: 'absolute', top: -14, left: '50%', transform: 'translateX(-50%)', background: C.pro, color: '#fff', borderRadius: 20, padding: '5px 18px', fontSize: 11, fontWeight: 800, letterSpacing: 0.5, whiteSpace: 'nowrap' },
    advancedBadge: { position: 'absolute', top: -14, left: '50%', transform: 'translateX(-50%)', background: C.advanced, color: '#fff', borderRadius: 20, padding: '5px 18px', fontSize: 11, fontWeight: 800, letterSpacing: 0.5, whiteSpace: 'nowrap' },
    pricingHeader: { marginBottom: 24, paddingBottom: 20, borderBottom: '1.5px solid #e2e8f0' },
    planName: { fontSize: '1.4em', fontWeight: 800, color: C.texto, marginBottom: 12 },
    priceRow: { display: 'flex', alignItems: 'flex-start', justifyContent: 'center', gap: 2 },
    priceCurrency: { fontSize: '1.4em', fontWeight: 700, marginTop: 4 },
    priceNum: { fontSize: '2.8em', fontWeight: 800, color: '#1a2926', lineHeight: 1 },
    pricePer: { fontSize: 13, color: C.gris, marginTop: 6 },
    featureList: { flex: 1, marginBottom: 24, textAlign: 'left' },
    featureRow: { display: 'flex', gap: 10, alignItems: 'flex-start', marginBottom: 14, fontSize: '0.92em', color: '#475569', lineHeight: 1.5 },
    planCta: { width: '100%', padding: '13px', color: '#fff', border: 'none', borderRadius: 10, fontSize: 15, fontWeight: 700, cursor: 'pointer', transition: 'opacity 0.2s', marginTop: 'auto' },
    pricingNote: { marginTop: 32, fontSize: 13, color: C.gris },
    pricingCardDimmed: { opacity: 0.5, filter: 'grayscale(0.6)' },
    dimmedNote: { width: '100%', padding: '13px', textAlign: 'center', color: C.gris, fontSize: 13, fontWeight: 600, fontStyle: 'italic', marginTop: 'auto', border: '1.5px dashed #cbd5e1', borderRadius: 10 },
};
