import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faBolt } from '@fortawesome/free-solid-svg-icons';
import useSeoMeta from '../hooks/useSeoMeta';
import PricingSection from './marketing/PricingSection';
import MarketingFooter from './marketing/MarketingFooter';

const C = {
    verde: '#5dc87a',
    verdeOsc: '#3ab87a',
    azul: '#1a2926',
    gris: '#475569',
    grisClaro: '#f8fafc',
};

/**
 * Template para páginas de vertical (indumentaria, kioscos, ferreterías...).
 * Cada vertical es un componente delgado en src/components/verticals/ que
 * pasa su propio contenido acá adentro; el layout, precios y footer se
 * comparten. Para agregar una vertical nueva: sumar el contenido, la ruta
 * en App.js, la entrada en public/sitemap.xml y public/_redirects, y la
 * ruta en scripts/prerender.js.
 */
export default function VerticalLanding({
    metaTitle,
    metaDescription,
    canonical,
    badge = '7 días de prueba gratis',
    h1,
    heroSub,
    painsTitle = 'Los problemas de todos los días',
    pains, // [{ icon, titulo, descripcion, solucion }]
    featuresTitle = 'Todo lo que necesitás, en un solo lugar',
    featuresSub,
    features, // [{ icon, titulo, desc }]
    testimoniosTitle = 'Orgullosos de nuestros clientes',
    testimonios, // [{ src, nombre }]
}) {
    useSeoMeta({ title: metaTitle, description: metaDescription, canonical });

    const [scrolled, setScrolled] = useState(() => (typeof window !== 'undefined' ? window.scrollY > 40 : false));
    useEffect(() => {
        const onScroll = () => setScrolled(window.scrollY > 40);
        window.addEventListener('scroll', onScroll);
        return () => window.removeEventListener('scroll', onScroll);
    }, []);

    const scrollTo = (id) => {
        const el = document.getElementById(id);
        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    };

    return (
        <div style={s.page}>
            {/* ── NAVBAR ── */}
            <nav style={{ ...s.nav, ...(scrolled ? s.navScrolled : {}) }}>
                <div style={s.navInner}>
                    <Link to="/"><img src="/logo-completo.png" alt="Total Stock" style={s.navLogo} /></Link>
                    <ul style={s.navLinks}>
                        {[['Soluciones', 'soluciones'], ['Características', 'caracteristicas'], ['Precios', 'precios']].map(([label, id]) => (
                            <li key={id}>
                                <a
                                    href={`#${id}`}
                                    onClick={e => { e.preventDefault(); scrollTo(id); }}
                                    style={{ ...s.navLink, color: scrolled ? C.azul : '#fff' }}
                                >{label}</a>
                            </li>
                        ))}
                        <li>
                            <Link to="/preguntas-frecuentes/" style={{ ...s.navLink, color: scrolled ? C.azul : '#fff' }}>
                                Preguntas frecuentes
                            </Link>
                        </li>
                        <li>
                            <Link to="/login" style={{
                                ...s.navBtnSecondary,
                                ...(scrolled ? { background: 'transparent', color: C.azul, border: `1.5px solid ${C.azul}` } : {}),
                            }}>Iniciar sesión</Link>
                        </li>
                        <li>
                            <button onClick={() => scrollTo('precios')} style={s.navBtnPrimary}>
                                Probalo gratis →
                            </button>
                        </li>
                    </ul>
                </div>
            </nav>

            {/* ── HERO ── */}
            <section id="inicio" style={s.hero}>
                <div style={s.heroOverlay} />
                <div style={s.heroContent}>
                    <span style={s.heroPill}>
                        <FontAwesomeIcon icon={faBolt} style={{ marginRight: 6, fontSize: 11 }} />
                        {badge}
                    </span>
                    <h1 style={s.heroH1}>{h1}</h1>
                    <p style={s.heroSub}>{heroSub}</p>
                    <div style={s.heroCtas}>
                        <button onClick={() => scrollTo('precios')} style={s.ctaPrimary}>
                            Empezar gratis 7 días →
                        </button>
                        <Link to="/login" style={s.ctaSecondary}>Ya tengo cuenta</Link>
                    </div>
                </div>
            </section>

            {/* ── PAINS ── */}
            {pains && pains.length > 0 && (
                <section id="soluciones" style={s.painSection}>
                    <div style={s.sectionWrap}>
                        <h2 style={{ ...s.sectionH2, textAlign: 'center' }}>{painsTitle}</h2>
                        <div style={s.painGrid}>
                            {pains.map((p, i) => (
                                <div key={i} style={s.painCard}>
                                    <FontAwesomeIcon icon={p.icon} style={{ fontSize: 22, color: C.verde, marginBottom: 14 }} />
                                    <h3 style={s.painTitulo}>{p.titulo}</h3>
                                    <p style={s.painDesc}>{p.descripcion}</p>
                                    <p style={s.painSolucion}>✓ {p.solucion}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                </section>
            )}

            {/* ── FEATURES ── */}
            {features && features.length > 0 && (
                <section id="caracteristicas" style={s.featSection}>
                    <div style={{ ...s.sectionWrap, textAlign: 'center' }}>
                        <h2 style={s.sectionH2}>{featuresTitle}</h2>
                        {featuresSub && <p style={s.sectionSub}>{featuresSub}</p>}
                        <div style={s.featGrid}>
                            {features.map((f, i) => (
                                <div key={i} style={s.featCard}>
                                    <FontAwesomeIcon icon={f.icon} style={{ fontSize: 22, color: C.verde, marginBottom: 14 }} />
                                    <h3 style={s.featTitulo}>{f.titulo}</h3>
                                    <p style={s.featDesc}>{f.desc}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                </section>
            )}

            {/* ── TESTIMONIOS ── */}
            {testimonios && testimonios.length > 0 && (
                <section style={s.clientesSection}>
                    <div style={{ ...s.sectionWrap, textAlign: 'center' }}>
                        <h2 style={s.sectionH2}>{testimoniosTitle}</h2>
                    </div>
                    <div style={s.clientesGrid}>
                        {testimonios.map((cl, i) => (
                            <div key={i} style={s.clienteItem}>
                                <div style={s.clienteCircle}>
                                    <img src={cl.src} alt={cl.nombre} style={s.clienteImg} />
                                </div>
                                <span style={s.clienteNombre}>{cl.nombre}</span>
                            </div>
                        ))}
                    </div>
                </section>
            )}

            <PricingSection />

            {/* ── CTA FINAL ── */}
            <section style={s.ctaFinal}>
                <div style={{ ...s.sectionWrap, textAlign: 'center' }}>
                    <h2 style={{ fontSize: 'clamp(1.8em, 3.5vw, 2.8em)', fontWeight: 700, color: '#fff', marginBottom: 16 }}>
                        ¿Listo para ordenar tu negocio?
                    </h2>
                    <p style={{ color: 'rgba(255,255,255,0.8)', fontSize: '1.1em', marginBottom: 36 }}>
                        Empezá hoy con 7 días gratis. Sin tarjeta de crédito. Sin letra chica.
                    </p>
                    <Link to="/registro" style={s.ctaFinalBtn}>Crear mi cuenta gratis →</Link>
                    <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 13, marginTop: 16 }}>
                        Cancelá cuando quieras desde el panel de tu cuenta.
                    </p>
                </div>
            </section>

            <MarketingFooter />
        </div>
    );
}

const s = {
    page: { minHeight: '100vh', backgroundColor: '#fff', fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif", color: C.azul },

    nav: { position: 'fixed', top: 0, left: 0, right: 0, zIndex: 1000, padding: '14px 0', transition: 'all 0.25s', background: 'transparent' },
    navScrolled: { background: '#fff', boxShadow: '0 2px 12px rgba(0,0,0,0.08)', padding: '10px 0' },
    navInner: { maxWidth: 1200, margin: '0 auto', padding: '0 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
    navLogo: { height: 44, borderRadius: 6, background: 'rgba(255,255,255,0.9)', padding: '4px 8px' },
    navLinks: { display: 'flex', listStyle: 'none', margin: 0, padding: 0, gap: 8, alignItems: 'center' },
    navLink: { color: '#fff', textDecoration: 'none', fontSize: 14, fontWeight: 600, padding: '6px 14px', borderRadius: 6 },
    navBtnSecondary: { display: 'inline-block', background: 'rgba(255,255,255,0.15)', color: '#fff', border: '1.5px solid rgba(255,255,255,0.4)', borderRadius: 6, padding: '8px 18px', fontSize: 14, fontWeight: 600, cursor: 'pointer', textDecoration: 'none' },
    navBtnPrimary: { background: C.verde, color: '#fff', border: 'none', borderRadius: 6, padding: '8px 18px', fontSize: 14, fontWeight: 700, cursor: 'pointer' },

    hero: { background: `linear-gradient(135deg, #0d1f3c 0%, #1a3a5c 50%, #1d4ed8 100%)`, padding: '160px 24px 100px', textAlign: 'center', position: 'relative', overflow: 'hidden', minHeight: '520px', display: 'flex', alignItems: 'center', justifyContent: 'center' },
    heroOverlay: { position: 'absolute', inset: 0, background: 'radial-gradient(ellipse 80% 60% at 50% 40%, rgba(93,200,122,0.12) 0%, transparent 70%)', zIndex: 0 },
    heroContent: { position: 'relative', zIndex: 2, maxWidth: 820, margin: '0 auto' },
    heroPill: { display: 'inline-block', background: 'rgba(93,200,122,0.18)', color: C.verde, border: `1px solid rgba(93,200,122,0.4)`, borderRadius: 20, padding: '6px 16px', fontSize: 13, fontWeight: 600, marginBottom: 28, letterSpacing: 0.3 },
    heroH1: { fontSize: 'clamp(2.1em, 5vw, 3.6em)', fontWeight: 800, color: '#fff', lineHeight: 1.2, marginBottom: 22, letterSpacing: -1 },
    heroSub: { fontSize: 'clamp(1em, 1.8vw, 1.2em)', color: 'rgba(255,255,255,0.82)', lineHeight: 1.7, marginBottom: 36, maxWidth: 680, margin: '0 auto 36px' },
    heroCtas: { display: 'flex', gap: 14, justifyContent: 'center', flexWrap: 'wrap' },
    ctaPrimary: { background: C.verde, color: '#fff', border: 'none', borderRadius: 9, padding: '15px 32px', fontSize: 16, fontWeight: 700, cursor: 'pointer', boxShadow: `0 4px 20px rgba(93,200,122,0.4)` },
    ctaSecondary: { display: 'inline-block', background: 'transparent', color: '#fff', border: '1.5px solid rgba(255,255,255,0.45)', borderRadius: 9, padding: '15px 28px', fontSize: 16, fontWeight: 600, cursor: 'pointer', textDecoration: 'none' },

    sectionWrap: { maxWidth: 1200, margin: '0 auto', padding: '0 24px' },
    sectionH2: { fontSize: 'clamp(1.7em, 3.5vw, 2.6em)', fontWeight: 800, color: C.azul, marginBottom: 14, lineHeight: 1.2, letterSpacing: -0.5 },
    sectionSub: { fontSize: '1.05em', color: C.gris, maxWidth: 640, margin: '0 auto 40px', lineHeight: 1.7 },

    painSection: { padding: '90px 0', background: C.grisClaro },
    painGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 24, marginTop: 48 },
    painCard: { background: '#fff', border: '1px solid #e2e8f0', borderRadius: 14, padding: '28px 24px' },
    painTitulo: { fontSize: '1.1em', fontWeight: 700, marginBottom: 10, color: C.azul },
    painDesc: { fontSize: '0.95em', color: C.gris, lineHeight: 1.6, marginBottom: 14 },
    painSolucion: { fontSize: '0.9em', color: C.verdeOsc, fontWeight: 700, margin: 0 },

    featSection: { padding: '90px 0', background: '#fff' },
    featGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 24, marginTop: 24, textAlign: 'left' },
    featCard: { background: C.grisClaro, borderRadius: 14, padding: '28px 24px' },
    featTitulo: { fontSize: '1.05em', fontWeight: 700, marginBottom: 8, color: C.azul },
    featDesc: { fontSize: '0.92em', color: C.gris, lineHeight: 1.6, margin: 0 },

    clientesSection: { padding: '70px 0', background: C.grisClaro },
    clientesGrid: { display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: 32, marginTop: 32, padding: '0 24px' },
    clienteItem: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, width: 100 },
    clienteCircle: { width: 72, height: 72, borderRadius: '50%', overflow: 'hidden', border: '1px solid #e2e8f0', background: '#fff' },
    clienteImg: { width: '100%', height: '100%', objectFit: 'cover' },
    clienteNombre: { fontSize: 12, color: C.gris, fontWeight: 600, textAlign: 'center' },

    ctaFinal: { padding: '90px 24px', background: `linear-gradient(135deg, ${C.verdeOsc} 0%, #3ab87a 100%)` },
    ctaFinalBtn: { display: 'inline-block', background: '#fff', color: C.verdeOsc, border: 'none', borderRadius: 10, padding: '17px 40px', fontSize: 17, fontWeight: 800, cursor: 'pointer', textDecoration: 'none' },
};
