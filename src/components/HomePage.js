import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../AuthContext';
import axios from 'axios';
import Swal from 'sweetalert2';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
    faShoppingCart, faChartLine, faExchangeAlt, faFileInvoice,
    faWarehouse, faPrint, faUsers, faCheck, faGlobe,
    faBoxOpen, faClock, faSync, faStore,
    faExclamationCircle, faBolt, faShieldAlt,
} from '@fortawesome/free-solid-svg-icons';

const C = {
    verde:    '#5dc87a',
    verdeOsc: '#3da85f',
    azul:     '#1e3a8a',
    azulMed:  '#2563eb',
    texto:    '#1a3a2a',
    gris:     '#64748b',
    grisClaro:'#f8fafc',
    pro:      '#3b82f6',
    advanced: '#10b981',
};

const STATS = [
    { number: '9',    label: 'herramientas integradas', icon: faBolt },
    { number: '7',    label: 'días de prueba gratis',   icon: faCheck },
    { number: '3',    label: 'planes desde $35.000/mes',icon: faShieldAlt },
    { number: '24/7', label: 'soporte por WhatsApp',    icon: faUsers },
];

const PAINS = [
    {
        icon: faBoxOpen,
        titulo: 'No sabés cuánto stock tenés',
        descripcion: 'Vendés algo y no sabés si te queda. Te enterás cuando el cliente ya está en la caja.',
        solucion: 'Stock en tiempo real con alertas de bajo inventario.',
    },
    {
        icon: faClock,
        titulo: 'La caja del día te lleva horas',
        descripcion: 'Cerrar la caja manualmente, cuadrar con las planillas, revisar diferencias...',
        solucion: 'Punto de venta ágil con cierre de caja automático.',
    },
    {
        icon: faFileInvoice,
        titulo: 'La facturación es un dolor de cabeza',
        descripcion: 'Entrás al portal de ARCA, esperás, cargás datos, descargás el PDF...',
        solucion: 'Factura electrónica integrada con ARCA en segundos.',
    },
    {
        icon: faSync,
        titulo: 'Tu local y tu tienda online no cuadran',
        descripcion: 'Vendés en Mercado Libre o Tienda Nube y el stock del local queda desactualizado.',
        solucion: 'Sincronización automática de stock entre canales.',
    },
];

const FEATURES = [
    { icon: faShoppingCart, titulo: 'Punto de Venta', desc: 'Cobrá rápido con múltiples métodos de pago, gestión de caja y recibos impresos.' },
    { icon: faWarehouse,    titulo: 'Stock en Tiempo Real', desc: 'Controlá productos, precios y stock. Búsqueda por código de barras incluida.' },
    { icon: faChartLine,    titulo: 'Reportes y Métricas', desc: 'Sabé qué vendés, cuánto ganás y cuáles son tus productos estrella.' },
    { icon: faExchangeAlt,  titulo: 'Cambios y Devoluciones', desc: 'Gestioná cambios con notas de crédito y ajuste de stock automático.' },
    { icon: faFileInvoice,  titulo: 'Factura Electrónica', desc: 'Emití facturas A, B y C integradas con ARCA/AFIP sin salir del sistema.' },
    { icon: faPrint,        titulo: 'Recibos y Etiquetas', desc: 'Imprimí tickets, recibos y etiquetas compatibles con impresoras térmicas.' },
    { icon: faUsers,        titulo: 'Control de Usuarios', desc: 'Asigná roles con permisos diferenciados: admin, supervisor o cajero.' },
    { icon: faGlobe,        titulo: 'E-Commerce Integrado', desc: 'Publicá en Mercado Libre y Tienda Nube, importá órdenes y sincronizá stock.' },
    { icon: faStore,        titulo: 'Multi-Tienda', desc: 'Administrá varias sucursales desde una sola cuenta.' },
];

const CLIENTES = [
    { src: '/clientes/bonito-amor.jpeg',       nombre: 'Bonito Amor' },
    { src: '/clientes/acces.jpg',              nombre: 'Acces' },
    { src: '/clientes/eria.jpg',               nombre: 'Eria' },
    { src: '/clientes/euforicas.png',          nombre: 'Eufóricas' },
    { src: '/clientes/fanaticos-sport.jpg',    nombre: 'Fanáticos Sport' },
    { src: '/clientes/high-duo.png',           nombre: 'High Duo' },
    { src: '/clientes/la-pasion-del-hincha.jpeg', nombre: 'La Pasión del Hincha' },
    { src: '/clientes/total-dark.jpg',         nombre: 'Total Dark' },
];

const INTEGRACIONES = [
    { nombre: 'ARCA / AFIP', color: '#003087', letra: 'A', desc: 'Factura electrónica oficial' },
    { nombre: 'Mercado Libre', color: '#ffe600', textColor: '#333', letra: 'ML', desc: 'Publicaciones y órdenes' },
    { nombre: 'Tienda Nube', color: '#0097ff', letra: 'TN', desc: 'Sincronización de catálogo' },
    { nombre: 'Mercado Pago', color: '#009ee3', letra: 'MP', desc: 'Suscripciones y pagos' },
];

export default function HomePage() {
    const { isAuthenticated, selectedStoreSlug, loading, login, error: authError, clearError } = useAuth();
    const navigate = useNavigate();
    const [showAccessModal, setShowAccessModal] = useState(false);
    const [accessUsername, setAccessUsername] = useState('');
    const [accessPassword, setAccessPassword] = useState('');
    const [scrolled, setScrolled] = useState(false);

    // Recupero de contraseña dentro del modal
    // 'login' | 'recuperar' | 'enviado'
    const [vistaModal, setVistaModal] = useState('login');
    const [emailRecupero, setEmailRecupero] = useState('');
    const [enviandoRecupero, setEnviandoRecupero] = useState(false);
    const [errorRecupero, setErrorRecupero] = useState('');

    const handleRecupero = async (e) => {
        e.preventDefault();
        setErrorRecupero('');
        setEnviandoRecupero(true);
        try {
            await axios.post(
                `${(process.env.REACT_APP_API_URL || 'http://localhost:8000').replace(/\/api\/?$/, '').replace(/\/$/, '')}/api/auth/password-reset/`,
                { email: emailRecupero.trim().toLowerCase() }
            );
            setVistaModal('enviado');
        } catch (err) {
            setErrorRecupero(err.response?.data?.error || 'Error al enviar el correo. Intentá de nuevo.');
        } finally {
            setEnviandoRecupero(false);
        }
    };

    const cerrarModal = () => {
        setShowAccessModal(false);
        setVistaModal('login');
        setEmailRecupero('');
        setErrorRecupero('');
        clearError();
    };

    useEffect(() => {
        if (!loading && isAuthenticated && selectedStoreSlug) {
            navigate('/punto-venta', { replace: true });
        }
    }, [loading, isAuthenticated, selectedStoreSlug, navigate]);

    useEffect(() => {
        const onScroll = () => setScrolled(window.scrollY > 40);
        window.addEventListener('scroll', onScroll);
        return () => window.removeEventListener('scroll', onScroll);
    }, []);

    const scrollTo = (id) => {
        const el = document.getElementById(id);
        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    };

    const handleLogin = async (e) => {
        e.preventDefault();
        clearError();
        if (!accessUsername || !accessPassword) {
            Swal.fire({ icon: 'warning', title: 'Campos incompletos', text: 'Ingresá usuario y contraseña.' });
            return;
        }
        const ok = await login(accessUsername, accessPassword);
        if (ok) {
            setShowAccessModal(false);
            setAccessUsername('');
            setAccessPassword('');
            navigate('/');
        } else {
            Swal.fire({ icon: 'error', title: 'Error de acceso', text: authError || 'Credenciales incorrectas.' });
        }
    };

    if (loading) return (
        <div style={s.loading}>
            <div style={s.spinner} />
            <p style={{ color: C.gris }}>Cargando...</p>
        </div>
    );

    if (isAuthenticated && selectedStoreSlug) return null;

    return (
        <div style={s.page}>

            {/* ── NAVBAR ── */}
            <nav style={{ ...s.nav, ...(scrolled ? s.navScrolled : {}) }} className={scrolled ? 'nav-scrolled' : ''}>
                <div style={s.navInner}>
                    <img src="/logo-completo.png" alt="Total Stock" style={s.navLogo} />
                    <ul style={s.navLinks}>
                        {[['Soluciones','soluciones'],['Características','caracteristicas'],['Precios','precios']].map(([label, id]) => (
                            <li key={id} className="nav-link-item">
                                <a
                                    href={`#${id}`}
                                    onClick={e => { e.preventDefault(); scrollTo(id); }}
                                    style={{ ...s.navLink, color: scrolled ? C.azul : '#fff' }}
                                    className="nav-link"
                                >{label}</a>
                            </li>
                        ))}
                        <li>
                            <button
                                onClick={() => setShowAccessModal(true)}
                                style={{
                                    ...s.navBtnSecondary,
                                    ...(scrolled ? { background: 'transparent', color: C.azul, border: `1.5px solid ${C.azul}` } : {}),
                                }}
                                className="nav-btn-secondary"
                            >
                                Iniciar sesión
                            </button>
                        </li>
                        <li>
                            <button onClick={() => navigate('/registro?plan=starter')} style={s.navBtnPrimary} className="nav-btn-primary">
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
                        7 días de prueba gratis · Sin tarjeta de crédito
                    </span>
                    <h1 style={s.heroH1}>
                        Gestioná tu negocio<br />
                        <span style={{ color: C.verde }}>sin caos.</span>
                    </h1>
                    <p style={s.heroSub}>
                        Stock, ventas, facturación y e-commerce en una sola plataforma.<br />
                        Pensado para comercios argentinos que quieren ahorrar tiempo y vender más.
                    </p>
                    <div style={s.heroCtas}>
                        <button onClick={() => scrollTo('precios')} style={s.ctaPrimary} className="cta-primary">
                            Empezar gratis 7 días →
                        </button>
                        <button onClick={() => setShowAccessModal(true)} style={s.ctaSecondary} className="cta-secondary">
                            Ya tengo cuenta
                        </button>
                    </div>
                    <p style={s.heroNote}>
                        Decenas de comercios en Argentina ya nos eligieron
                    </p>
                </div>
            </section>

            {/* ── STATS STRIP ── */}
            <section style={s.statsStrip}>
                <div style={s.statsInner}>
                    {STATS.map((st, i) => (
                        <div key={i} style={s.statItem}>
                            <div style={s.statNum}>{st.number}</div>
                            <div style={s.statLabel}>
                                <FontAwesomeIcon icon={st.icon} style={{ color: C.verde, marginRight: 5, fontSize: 12 }} />
                                {st.label}
                            </div>
                        </div>
                    ))}
                </div>
            </section>

            {/* ── PROBLEMÁTICAS ── */}
            <section id="soluciones" style={s.painSection}>
                <div style={s.sectionWrap}>
                    <span style={s.sectionPill}>¿Te suena familiar?</span>
                    <h2 style={s.sectionH2}>Los problemas que resolvemos</h2>
                    <p style={s.sectionSub}>
                        Identificamos los 4 dolores más comunes de los comercios argentinos. Total Stock tiene una respuesta para cada uno.
                    </p>
                    <div style={s.painGrid}>
                        {PAINS.map((p, i) => (
                            <div key={i} style={s.painCard} className="pain-card">
                                <div style={s.painIconWrap}>
                                    <FontAwesomeIcon icon={p.icon} style={s.painIcon} />
                                </div>
                                <div>
                                    <div style={s.painBadge}>
                                        <FontAwesomeIcon icon={faExclamationCircle} style={{ marginRight: 5, color: '#ef4444' }} />
                                        Problema
                                    </div>
                                    <h3 style={s.painTitle}>{p.titulo}</h3>
                                    <p style={s.painDesc}>{p.descripcion}</p>
                                    <div style={s.painSolucion}>
                                        <FontAwesomeIcon icon={faCheck} style={{ color: C.verde, marginRight: 6, fontSize: 12 }} />
                                        <span style={{ color: C.verdeOsc, fontWeight: 600, fontSize: 13 }}>{p.solucion}</span>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ── CARACTERÍSTICAS ── */}
            <section id="caracteristicas" style={s.featSection}>
                <div style={s.sectionWrap}>
                    <span style={s.sectionPill}>Todo en un lugar</span>
                    <h2 style={s.sectionH2}>
                        <span style={{ color: C.verde }}>9 herramientas</span> integradas en una sola plataforma
                    </h2>
                    <p style={s.sectionSub}>
                        Sin integraciones externas complicadas. Todo lo que necesitás para operar tu negocio desde el día uno.
                    </p>
                    <div style={s.featGrid}>
                        {FEATURES.map((f, i) => (
                            <div key={i} style={s.featCard} className="feat-card">
                                <div style={s.featIconWrap}>
                                    <FontAwesomeIcon icon={f.icon} style={s.featIcon} />
                                </div>
                                <h3 style={s.featTitle}>{f.titulo}</h3>
                                <p style={s.featDesc}>{f.desc}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ── INTEGRACIONES ── */}
            <section style={s.integSection}>
                <div style={s.sectionWrap}>
                    <h2 style={{ ...s.sectionH2, color: '#fff' }}>Integrado con las plataformas que ya usás</h2>
                    <p style={{ ...s.sectionSub, color: 'rgba(255,255,255,0.75)' }}>
                        Conectamos tu negocio con el ecosistema digital argentino.
                    </p>
                    <div style={s.integGrid}>
                        {INTEGRACIONES.map((ig, i) => (
                            <div key={i} style={s.integCard} className="integ-card">
                                <div style={{ ...s.integLogo, background: ig.color, color: ig.textColor || '#fff' }}>
                                    {ig.letra}
                                </div>
                                <div style={s.integName}>{ig.nombre}</div>
                                <div style={s.integDesc}>{ig.desc}</div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ── CLIENTES ── */}
            <section style={s.clientesSection}>
                <div style={{ ...s.sectionWrap, textAlign: 'center' }}>
                    <span style={s.sectionPill}>Confianza real</span>
                    <h2 style={s.sectionH2}>Orgullosos de nuestros clientes</h2>
                    <p style={s.sectionSub}>Estos son algunos de ellos</p>
                </div>
                <div style={s.marqueeWrap}>
                    <div style={s.marqueeTrack} className="marquee-track">
                        {[...CLIENTES, ...CLIENTES].map((cl, i) => (
                            <div key={i} style={s.clienteItem}>
                                <div style={s.clienteCircle}>
                                    <img src={cl.src} alt={cl.nombre} style={s.clienteImg} />
                                </div>
                                <span style={s.clienteNombre}>{cl.nombre}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ── PRICING ── */}
            <section id="precios" style={s.pricingSection}>
                <div style={s.sectionWrap}>
                    <span style={s.sectionPill}>Sin permanencia mínima</span>
                    <h2 style={s.sectionH2}>Planes para cada etapa de tu negocio</h2>
                    <p style={s.sectionSub}>
                        Todos incluyen 7 días de prueba gratis. Pagás con Mercado Pago, cancelás cuando quieras.
                    </p>
                    <div style={s.pricingGrid}>
                        {/* STARTER */}
                        <div style={s.pricingCard} className="pricing-card">
                            <div style={s.pricingHeader}>
                                <h3 style={s.planName}>Starter</h3>
                                <div style={s.priceRow}>
                                    <span style={s.priceCurrency}>$</span>
                                    <span style={s.priceNum}>35.000</span>
                                </div>
                                <p style={s.pricePer}>por tienda / por mes</p>
                            </div>
                            <div style={s.featureList}>
                                {['Hasta 1.000 productos','2 usuarios','Punto de venta','Gestión de stock','Recibos de compra'].map(f => (
                                    <div key={f} style={s.featureRow}>
                                        <FontAwesomeIcon icon={faCheck} style={{ color: C.verde, fontSize: 12, marginTop: 3, flexShrink: 0 }} />
                                        <span>{f}</span>
                                    </div>
                                ))}
                            </div>
                            <button onClick={() => navigate('/registro?plan=starter')} style={{ ...s.planCta, background: C.verde }} className="plan-cta-green">
                                Empezar gratis 7 días →
                            </button>
                        </div>

                        {/* PRO */}
                        <div style={s.pricingCardFeatured} className="pricing-card-featured">
                            <div style={s.popularBadge}>MÁS POPULAR</div>
                            <div style={s.pricingHeader}>
                                <h3 style={s.planName}>Pro</h3>
                                <div style={s.priceRow}>
                                    <span style={{ ...s.priceCurrency, color: C.pro }}>$</span>
                                    <span style={s.priceNum}>40.000</span>
                                </div>
                                <p style={s.pricePer}>por tienda / por mes</p>
                            </div>
                            <div style={s.featureList}>
                                {['Hasta 2.500 productos','4 usuarios','Punto de venta + stock','Recibos de compra','Factura electrónica ARCA/AFIP'].map(f => (
                                    <div key={f} style={s.featureRow}>
                                        <FontAwesomeIcon icon={faCheck} style={{ color: C.pro, fontSize: 12, marginTop: 3, flexShrink: 0 }} />
                                        <span>{f}</span>
                                    </div>
                                ))}
                            </div>
                            <button onClick={() => navigate('/registro?plan=pro')} style={{ ...s.planCta, background: C.pro }} className="plan-cta-blue">
                                Empezar gratis 7 días →
                            </button>
                        </div>

                        {/* ADVANCED */}
                        <div style={s.pricingCardAdvanced} className="pricing-card">
                            <div style={s.advancedBadge}>COMPLETO</div>
                            <div style={s.pricingHeader}>
                                <h3 style={{ ...s.planName, color: '#064e3b' }}>Advanced</h3>
                                <div style={s.priceRow}>
                                    <span style={{ ...s.priceCurrency, color: C.advanced }}>$</span>
                                    <span style={{ ...s.priceNum, color: '#064e3b' }}>60.000</span>
                                </div>
                                <p style={s.pricePer}>por tienda / por mes</p>
                            </div>
                            <div style={s.featureList}>
                                {['Productos ilimitados','Usuarios ilimitados','Todo lo del plan Pro','Integración Mercado Libre','Integración Tienda Nube'].map(f => (
                                    <div key={f} style={s.featureRow}>
                                        <FontAwesomeIcon icon={faCheck} style={{ color: C.advanced, fontSize: 12, marginTop: 3, flexShrink: 0 }} />
                                        <span>{f}</span>
                                    </div>
                                ))}
                            </div>
                            <button onClick={() => navigate('/registro?plan=advanced')} style={{ ...s.planCta, background: C.advanced }} className="plan-cta-green">
                                Empezar gratis 7 días →
                            </button>
                        </div>
                    </div>
                    <p style={s.pricingNote}>
                        ✓ Sin permanencia mínima &nbsp;·&nbsp; ✓ Cancelás en cualquier momento &nbsp;·&nbsp; ✓ Pagás con Mercado Pago
                    </p>
                </div>
            </section>

            {/* ── CTA FINAL ── */}
            <section style={s.ctaFinal}>
                <div style={{ ...s.sectionWrap, textAlign: 'center' }}>
                    <h2 style={{ fontSize: 'clamp(1.8em, 3.5vw, 2.8em)', fontWeight: 700, color: '#fff', marginBottom: 16 }}>
                        ¿Listo para ordenar tu negocio?
                    </h2>
                    <p style={{ color: 'rgba(255,255,255,0.8)', fontSize: '1.1em', marginBottom: 36 }}>
                        Empezá hoy con 7 días gratis. Sin tarjeta de crédito. Sin letra chica.
                    </p>
                    <button onClick={() => navigate('/registro?plan=starter')} style={s.ctaFinalBtn} className="cta-final-btn">
                        Crear mi cuenta gratis →
                    </button>
                    <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 13, marginTop: 16 }}>
                        Cancelá cuando quieras desde el panel de tu cuenta.
                    </p>
                </div>
            </section>

            {/* ── FOOTER ── */}
            <footer style={s.footer}>
                <div style={s.footerInner}>
                    <img src="/logo-completo.png" alt="Total Stock" style={s.footerLogo} />
                    <p style={s.footerText}>© {new Date().getFullYear()} Total Stock · Todos los derechos reservados.</p>
                    <p style={s.footerSub}>Software de gestión para comercios argentinos.</p>
                    <p style={{ margin: '14px 0 0', fontSize: '0.85em', color: '#64748b' }}>
                        ¿Tenés dudas o consultas?{' '}
                        <a href="mailto:info@totalstock.com.ar" style={{ color: '#5dc87a', textDecoration: 'none', fontWeight: 600 }}>
                            info@totalstock.com.ar
                        </a>
                    </p>
                </div>
            </footer>

            {/* ── MODAL LOGIN / RECUPERO ── */}
            {showAccessModal && (
                <div style={s.modalOverlay} onClick={cerrarModal}>
                    <div style={s.modalBox} onClick={e => e.stopPropagation()}>
                        <div style={s.modalTop}>
                            <h2 style={s.modalTitle}>
                                {vistaModal === 'recuperar' ? 'Recuperar contraseña' : vistaModal === 'enviado' ? 'Revisá tu correo' : 'Iniciar sesión'}
                            </h2>
                            <button onClick={cerrarModal} style={s.modalClose} className="modal-close">×</button>
                        </div>

                        {/* Vista: enviado */}
                        {vistaModal === 'enviado' && (
                            <div style={{ textAlign: 'center', padding: '8px 0 16px' }}>
                                <div style={{ fontSize: 48, marginBottom: 12 }}>📧</div>
                                <p style={{ color: '#475569', fontSize: 14, lineHeight: 1.65, margin: '0 0 8px' }}>
                                    Enviamos las instrucciones a <strong>{emailRecupero}</strong>.
                                </p>
                                <p style={{ color: '#94a3b8', fontSize: 12, margin: '0 0 24px' }}>
                                    ¿No llegó? Revisá la carpeta de spam.
                                </p>
                                <button
                                    onClick={() => { setVistaModal('login'); setEmailRecupero(''); }}
                                    style={s.modalBtnOk}
                                >
                                    Volver al inicio de sesión
                                </button>
                            </div>
                        )}

                        {/* Vista: recuperar */}
                        {vistaModal === 'recuperar' && (
                            <form onSubmit={handleRecupero} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                                <p style={{ color: '#475569', fontSize: 14, margin: 0, lineHeight: 1.6 }}>
                                    Ingresá el email con el que te registraste y te enviaremos un enlace para crear una nueva contraseña.
                                </p>
                                <div>
                                    <label style={s.inputLabel}>Email</label>
                                    <input
                                        type="email"
                                        value={emailRecupero}
                                        onChange={e => { setEmailRecupero(e.target.value); setErrorRecupero(''); }}
                                        placeholder="tu@email.com"
                                        style={s.modalInput}
                                        className="modal-input"
                                        required
                                        autoFocus
                                    />
                                </div>
                                {errorRecupero && (
                                    <div style={{ fontSize: 13, color: '#b91c1c', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 7, padding: '8px 12px' }}>
                                        {errorRecupero}
                                    </div>
                                )}
                                <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end', marginTop: 4 }}>
                                    <button type="button" onClick={() => { setVistaModal('login'); setErrorRecupero(''); }} style={s.modalBtnCancel} className="modal-btn-cancel">
                                        ← Volver
                                    </button>
                                    <button type="submit" disabled={enviandoRecupero} style={{ ...s.modalBtnOk, opacity: enviandoRecupero ? .7 : 1 }} className="modal-btn-ok">
                                        {enviandoRecupero ? 'Enviando…' : 'Enviar instrucciones'}
                                    </button>
                                </div>
                            </form>
                        )}

                        {/* Vista: login */}
                        {vistaModal === 'login' && (
                            <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                                <div>
                                    <label style={s.inputLabel}>Usuario</label>
                                    <input type="text" value={accessUsername} onChange={e => setAccessUsername(e.target.value)} placeholder="tu_usuario" style={s.modalInput} className="modal-input" required />
                                </div>
                                <div>
                                    <label style={s.inputLabel}>Contraseña</label>
                                    <input type="password" value={accessPassword} onChange={e => setAccessPassword(e.target.value)} placeholder="••••••••" style={s.modalInput} className="modal-input" required />
                                </div>
                                <div style={{ textAlign: 'center', marginTop: -8 }}>
                                    <button
                                        type="button"
                                        onClick={() => { setVistaModal('recuperar'); setErrorRecupero(''); }}
                                        style={{ background: 'none', border: 'none', color: '#2563eb', fontSize: 13, cursor: 'pointer', textDecoration: 'underline', padding: 0 }}
                                    >
                                        ¿Olvidaste tu contraseña?
                                    </button>
                                </div>
                                <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
                                    <button type="button" onClick={cerrarModal} style={s.modalBtnCancel} className="modal-btn-cancel">Cancelar</button>
                                    <button type="submit" style={s.modalBtnOk} className="modal-btn-ok">Ingresar →</button>
                                </div>
                            </form>
                        )}
                    </div>
                </div>
            )}

            {/* ── WHATSAPP FLOTANTE ── */}
            <a href="https://api.whatsapp.com/send/?phone=5493515464113&text&type=phone_number&app_absent=0"
               target="_blank" rel="noopener noreferrer"
               style={s.whatsapp} className="whatsapp-float" aria-label="Contactar por WhatsApp"
            >
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" fill="#FFFFFF"/>
                </svg>
            </a>
        </div>
    );
}

const s = {
    page: { minHeight: '100vh', backgroundColor: '#fff', fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" },
    loading: { display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', gap: 16 },
    spinner: { width: 44, height: 44, border: '3px solid #e5e7eb', borderTop: `3px solid ${C.verde}`, borderRadius: '50%', animation: 'spin 0.8s linear infinite' },

    // Navbar
    nav: { position: 'fixed', top: 0, left: 0, right: 0, zIndex: 1000, padding: '14px 0', transition: 'all 0.25s', background: 'transparent' },
    navScrolled: { background: '#fff', boxShadow: '0 2px 12px rgba(0,0,0,0.08)', padding: '10px 0' },
    navInner: { maxWidth: 1200, margin: '0 auto', padding: '0 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
    navLogo: { height: 44, borderRadius: 6, background: 'rgba(255,255,255,0.9)', padding: '4px 8px' },
    navLinks: { display: 'flex', listStyle: 'none', margin: 0, padding: 0, gap: 8, alignItems: 'center' },
    navLink: { color: '#fff', textDecoration: 'none', fontSize: 14, fontWeight: 600, padding: '6px 14px', borderRadius: 6, transition: 'background 0.2s' },
    navBtnSecondary: { background: 'rgba(255,255,255,0.15)', color: '#fff', border: '1.5px solid rgba(255,255,255,0.4)', borderRadius: 7, padding: '8px 18px', fontSize: 14, fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s' },
    navBtnPrimary: { background: C.verde, color: '#fff', border: 'none', borderRadius: 7, padding: '8px 18px', fontSize: 14, fontWeight: 700, cursor: 'pointer', transition: 'all 0.2s' },

    // Hero
    hero: { background: `linear-gradient(135deg, #0d1f3c 0%, ${C.azul} 50%, #1d4ed8 100%)`, padding: '160px 24px 100px', textAlign: 'center', position: 'relative', overflow: 'hidden', minHeight: '580px', display: 'flex', alignItems: 'center', justifyContent: 'center' },
    heroOverlay: { position: 'absolute', inset: 0, background: 'radial-gradient(ellipse 80% 60% at 50% 40%, rgba(93,200,122,0.12) 0%, transparent 70%)', zIndex: 0 },
    heroContent: { position: 'relative', zIndex: 2, maxWidth: 820, margin: '0 auto' },
    heroPill: { display: 'inline-block', background: 'rgba(93,200,122,0.18)', color: C.verde, border: `1px solid rgba(93,200,122,0.4)`, borderRadius: 20, padding: '6px 16px', fontSize: 13, fontWeight: 600, marginBottom: 28, letterSpacing: 0.3 },
    heroH1: { fontSize: 'clamp(2.2em, 5.5vw, 4em)', fontWeight: 800, color: '#fff', lineHeight: 1.15, marginBottom: 22, letterSpacing: -1 },
    heroSub: { fontSize: 'clamp(1em, 1.8vw, 1.25em)', color: 'rgba(255,255,255,0.82)', lineHeight: 1.7, marginBottom: 36, maxWidth: 680, margin: '0 auto 36px' },
    heroCtas: { display: 'flex', gap: 14, justifyContent: 'center', flexWrap: 'wrap', marginBottom: 20 },
    ctaPrimary: { background: C.verde, color: '#fff', border: 'none', borderRadius: 9, padding: '15px 32px', fontSize: 16, fontWeight: 700, cursor: 'pointer', transition: 'all 0.2s', boxShadow: `0 4px 20px rgba(93,200,122,0.4)` },
    ctaSecondary: { background: 'transparent', color: '#fff', border: '1.5px solid rgba(255,255,255,0.45)', borderRadius: 9, padding: '15px 28px', fontSize: 16, fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s' },
    heroNote: { color: 'rgba(255,255,255,0.45)', fontSize: 13, marginTop: 24 },

    // Stats strip
    statsStrip: { background: '#f8fafc', borderBottom: '1px solid #e5e7eb', padding: '0 24px' },
    statsInner: { maxWidth: 1200, margin: '0 auto', display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 0 },
    statItem: { textAlign: 'center', padding: '32px 20px', borderRight: '1px solid #e5e7eb' },
    statNum: { fontSize: '2.4em', fontWeight: 800, color: C.azul, lineHeight: 1, marginBottom: 8 },
    statLabel: { fontSize: 13, color: C.gris, fontWeight: 500 },

    // Section commons
    sectionWrap: { maxWidth: 1200, margin: '0 auto', padding: '0 24px' },
    sectionPill: { display: 'inline-block', background: `rgba(93,200,122,0.1)`, color: C.verdeOsc, border: `1px solid rgba(93,200,122,0.3)`, borderRadius: 20, padding: '5px 14px', fontSize: 12, fontWeight: 700, letterSpacing: 0.5, textTransform: 'uppercase', marginBottom: 16 },
    sectionH2: { fontSize: 'clamp(1.7em, 3.5vw, 2.6em)', fontWeight: 800, color: C.azul, marginBottom: 14, lineHeight: 1.2, letterSpacing: -0.5 },
    sectionSub: { fontSize: '1.05em', color: C.gris, maxWidth: 640, margin: '0 auto 52px', lineHeight: 1.7 },

    // Pain section
    painSection: { padding: '90px 0', background: '#fff', textAlign: 'center' },
    painGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 24 },
    painCard: { background: '#fff', border: '1.5px solid #e5e7eb', borderRadius: 14, padding: '28px 24px', textAlign: 'left', transition: 'all 0.25s', cursor: 'default', display: 'flex', gap: 20, alignItems: 'flex-start' },
    painIconWrap: { width: 48, height: 48, background: '#fef2f2', borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
    painIcon: { fontSize: '1.4em', color: '#ef4444' },
    painBadge: { display: 'inline-flex', alignItems: 'center', background: '#fef2f2', color: '#ef4444', borderRadius: 6, padding: '2px 8px', fontSize: 11, fontWeight: 700, marginBottom: 8 },
    painTitle: { fontSize: '1em', fontWeight: 700, color: C.texto, marginBottom: 6 },
    painDesc: { fontSize: '0.88em', color: C.gris, lineHeight: 1.6, marginBottom: 12 },
    painSolucion: { display: 'flex', alignItems: 'flex-start', gap: 0, background: '#f0fdf4', borderRadius: 7, padding: '8px 10px' },

    // Features section
    featSection: { padding: '90px 0', background: C.grisClaro, textAlign: 'center' },
    featGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 22 },
    featCard: { background: '#fff', borderRadius: 14, padding: '28px 22px', textAlign: 'left', border: '1px solid #e5e7eb', transition: 'all 0.25s', cursor: 'default' },
    featIconWrap: { width: 46, height: 46, background: 'linear-gradient(135deg, #dbeafe 0%, #ede9fe 100%)', borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
    featIcon: { fontSize: '1.3em', color: C.azulMed },
    featTitle: { fontSize: '1em', fontWeight: 700, color: C.texto, marginBottom: 8 },
    featDesc: { fontSize: '0.88em', color: C.gris, lineHeight: 1.65 },

    // Clientes
    clientesSection: { padding: '80px 0 70px', background: C.grisClaro, overflow: 'hidden' },
    marqueeWrap: { overflow: 'hidden', marginTop: 40, position: 'relative' },
    marqueeTrack: { display: 'flex', gap: 36, width: 'max-content', animation: 'marquee 30s linear infinite' },
    clienteItem: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, flexShrink: 0 },
    clienteCircle: { width: 90, height: 90, borderRadius: '50%', overflow: 'hidden', border: '3px solid #e5e7eb', background: '#fff', boxShadow: '0 2px 12px rgba(0,0,0,0.08)', flexShrink: 0 },
    clienteImg: { width: '100%', height: '100%', objectFit: 'cover', display: 'block' },
    clienteNombre: { fontSize: 12, color: C.gris, fontWeight: 600, textAlign: 'center', maxWidth: 90, lineHeight: 1.3 },

    // Integraciones
    integSection: { padding: '80px 0', background: `linear-gradient(135deg, #0d1f3c 0%, ${C.azul} 100%)`, textAlign: 'center' },
    integGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 20, marginTop: 0 },
    integCard: { background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 14, padding: '28px 20px', transition: 'all 0.25s', cursor: 'default' },
    integLogo: { width: 56, height: 56, borderRadius: 14, margin: '0 auto 12px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '1.1em', letterSpacing: -0.5 },
    integName: { fontSize: '1em', fontWeight: 700, color: '#fff', marginBottom: 4 },
    integDesc: { fontSize: '0.82em', color: 'rgba(255,255,255,0.55)' },

    // Pricing
    pricingSection: { padding: '90px 0', background: '#fff', textAlign: 'center' },
    pricingGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 28, alignItems: 'stretch' },
    pricingCard: { background: '#fff', border: '2px solid #e5e7eb', borderRadius: 16, padding: '36px 28px', display: 'flex', flexDirection: 'column', position: 'relative', transition: 'all 0.25s' },
    pricingCardFeatured: { background: '#fff', border: `3px solid ${C.pro}`, borderRadius: 16, padding: '36px 28px', display: 'flex', flexDirection: 'column', position: 'relative', boxShadow: `0 8px 32px rgba(59,130,246,0.15)`, transform: 'scale(1.03)', transition: 'all 0.25s' },
    pricingCardAdvanced: { background: '#f0fdf4', border: `2px solid ${C.advanced}`, borderRadius: 16, padding: '36px 28px', display: 'flex', flexDirection: 'column', position: 'relative', transition: 'all 0.25s' },
    popularBadge: { position: 'absolute', top: -14, left: '50%', transform: 'translateX(-50%)', background: C.pro, color: '#fff', borderRadius: 20, padding: '5px 18px', fontSize: 11, fontWeight: 800, letterSpacing: 0.5, whiteSpace: 'nowrap' },
    advancedBadge: { position: 'absolute', top: -14, left: '50%', transform: 'translateX(-50%)', background: C.advanced, color: '#fff', borderRadius: 20, padding: '5px 18px', fontSize: 11, fontWeight: 800, letterSpacing: 0.5, whiteSpace: 'nowrap' },
    pricingHeader: { marginBottom: 24, paddingBottom: 20, borderBottom: '1.5px solid #e5e7eb' },
    planName: { fontSize: '1.4em', fontWeight: 800, color: C.texto, marginBottom: 12 },
    priceRow: { display: 'flex', alignItems: 'flex-start', justifyContent: 'center', gap: 2 },
    priceCurrency: { fontSize: '1.4em', fontWeight: 700, color: C.verde, marginTop: 4 },
    priceNum: { fontSize: '2.8em', fontWeight: 800, color: C.azul, lineHeight: 1 },
    pricePer: { fontSize: 13, color: C.gris, marginTop: 6 },
    featureList: { flex: 1, marginBottom: 24, textAlign: 'left' },
    featureRow: { display: 'flex', gap: 10, alignItems: 'flex-start', marginBottom: 14, fontSize: '0.92em', color: '#374151', lineHeight: 1.5 },
    planCta: { width: '100%', padding: '13px', color: '#fff', border: 'none', borderRadius: 8, fontSize: 15, fontWeight: 700, cursor: 'pointer', transition: 'opacity 0.2s', marginTop: 'auto' },
    pricingNote: { marginTop: 32, fontSize: 13, color: C.gris },

    // CTA Final
    ctaFinal: { padding: '90px 24px', background: `linear-gradient(135deg, ${C.verdeOsc} 0%, #16a34a 100%)` },
    ctaFinalBtn: { background: '#fff', color: C.verdeOsc, border: 'none', borderRadius: 10, padding: '17px 40px', fontSize: 17, fontWeight: 800, cursor: 'pointer', transition: 'all 0.2s', boxShadow: '0 4px 20px rgba(0,0,0,0.15)' },

    // Footer
    footer: { background: '#0f172a', padding: '50px 24px 36px', textAlign: 'center' },
    footerInner: { maxWidth: 1200, margin: '0 auto' },
    footerLogo: { maxWidth: 160, borderRadius: 8, background: 'rgba(255,255,255,0.95)', padding: '8px 12px', marginBottom: 18 },
    footerText: { color: '#94a3b8', fontSize: '0.9em', marginBottom: 6 },
    footerSub: { color: '#475569', fontSize: '0.8em', fontStyle: 'italic' },

    // Modal
    modalOverlay: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000, padding: 20 },
    modalBox: { background: '#fff', borderRadius: 16, padding: '36px 40px', width: '100%', maxWidth: 420, boxShadow: '0 20px 60px rgba(0,0,0,0.2)' },
    modalTop: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 28, paddingBottom: 20, borderBottom: '1.5px solid #e5e7eb' },
    modalTitle: { fontSize: '1.5em', fontWeight: 700, color: C.azul, margin: 0 },
    modalClose: { background: 'transparent', border: 'none', fontSize: '1.8em', color: C.gris, cursor: 'pointer', lineHeight: 1, padding: 4, borderRadius: 6 },
    inputLabel: { display: 'block', fontSize: 13, fontWeight: 600, color: C.texto, marginBottom: 6 },
    modalInput: { width: '100%', padding: '11px 14px', border: '1.5px solid #e5e7eb', borderRadius: 8, fontSize: 14, color: C.texto, outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit' },
    modalBtnCancel: { padding: '10px 22px', background: '#f1f5f9', color: '#64748b', border: 'none', borderRadius: 7, fontSize: 14, fontWeight: 600, cursor: 'pointer' },
    modalBtnOk: { padding: '10px 26px', background: C.azulMed, color: '#fff', border: 'none', borderRadius: 7, fontSize: 14, fontWeight: 700, cursor: 'pointer' },

    // WhatsApp
    whatsapp: { position: 'fixed', bottom: 28, right: 28, width: 58, height: 58, background: 'linear-gradient(135deg, #25D366 0%, #20BA5A 100%)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 16px rgba(37,211,102,0.35)', zIndex: 999, textDecoration: 'none', transition: 'all 0.25s' },
};

if (typeof document !== 'undefined') {
    const existing = document.getElementById('hp-styles');
    if (existing) existing.remove();
    const st = document.createElement('style');
    st.id = 'hp-styles';
    st.innerText = `
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes marquee { 0% { transform: translateX(0); } 100% { transform: translateX(-50%); } }
        .marquee-track:hover { animation-play-state: paused; }
        .nav-link:hover { background: rgba(128,128,128,0.12) !important; }
        .nav-scrolled .nav-link:hover { background: rgba(37,99,235,0.08) !important; }
        .nav-btn-secondary:hover { background: rgba(255,255,255,0.25) !important; }
        .nav-scrolled .nav-btn-secondary:hover { background: rgba(37,99,235,0.06) !important; }
        .nav-btn-primary:hover { background: #3da85f !important; transform: translateY(-1px); }
        .cta-primary:hover { background: #3da85f !important; transform: translateY(-2px); box-shadow: 0 6px 24px rgba(93,200,122,0.5) !important; }
        .cta-secondary:hover { background: rgba(255,255,255,0.08) !important; }
        .pain-card:hover { border-color: #5dc87a !important; box-shadow: 0 6px 24px rgba(93,200,122,0.12); transform: translateY(-3px); }
        .feat-card:hover { border-color: #93c5fd !important; box-shadow: 0 6px 24px rgba(37,99,235,0.1); transform: translateY(-3px); }
        .integ-card:hover { background: rgba(255,255,255,0.13) !important; transform: translateY(-3px); }
        .pricing-card:hover { box-shadow: 0 10px 36px rgba(0,0,0,0.1) !important; transform: translateY(-4px); }
        .pricing-card-featured:hover { box-shadow: 0 12px 40px rgba(59,130,246,0.25) !important; transform: scale(1.05) translateY(-4px) !important; }
        .plan-cta-green:hover { opacity: 0.88 !important; }
        .plan-cta-blue:hover { opacity: 0.88 !important; }
        .cta-final-btn:hover { transform: scale(1.03); box-shadow: 0 6px 24px rgba(0,0,0,0.2) !important; }
        .modal-close:hover { background: #f1f5f9 !important; }
        .modal-input:focus { border-color: #3b82f6 !important; box-shadow: 0 0 0 3px rgba(59,130,246,0.1); }
        .modal-btn-ok:hover { background: #1d4ed8 !important; }
        .whatsapp-float { animation: wa-pulse 3s ease-in-out infinite; }
        .whatsapp-float:hover { transform: scale(1.1) !important; animation: none; }
        @keyframes wa-pulse {
            0%, 100% { box-shadow: 0 4px 16px rgba(37,211,102,0.35); }
            50% { box-shadow: 0 4px 20px rgba(37,211,102,0.55), 0 0 0 5px rgba(37,211,102,0.1); }
        }
        @media (max-width: 900px) {
            .nav-link-item { display: none !important; }
        }
        @media (max-width: 640px) {
            .pricing-card-featured { transform: scale(1) !important; }
            .pricing-card-featured:hover { transform: translateY(-4px) !important; }
        }
    `;
    document.head.appendChild(st);
}
