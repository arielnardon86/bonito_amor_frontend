// BONITO_AMOR/frontend/src/components/HomePage.js
import React, { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom'; 
import { useAuth } from '../AuthContext';
import Login from './Login';

const HomePage = () => {
    const { isAuthenticated, selectedStoreSlug, stores, loading } = useAuth();
    const navigate = useNavigate();
    const [selectedStore, setSelectedStore] = useState(null);
    const [showLogin, setShowLogin] = useState(false);

    useEffect(() => {
        if (!loading && isAuthenticated && selectedStoreSlug) {
            navigate('/punto-venta', { replace: true });
        }
    }, [loading, isAuthenticated, selectedStoreSlug, navigate]);

    const handleStoreSelect = (storeName) => {
        const slug = storeName.toLowerCase().replace(/\s+/g, '-');
        setSelectedStore(storeName);
        setShowLogin(true);
        navigate(`/login/${slug}`);
    };

    if (loading) {
        return (
            <div style={styles.loadingContainer}>
                <div style={styles.spinner}></div>
                <p style={styles.loadingText}>Cargando datos de la aplicación...</p>
            </div>
        );
    }

    // Si está autenticado y tiene tienda, no mostrar landing page
    if (isAuthenticated && selectedStoreSlug) {
        return null; // Se redirige automáticamente
    }

    const hasStores = stores && stores.results && stores.results.length > 0;

    // Funcionalidades de la aplicación
    const features = [
        {
            icon: '💰',
            title: 'Punto de Venta',
            description: 'Sistema completo de ventas con múltiples métodos de pago, gestión de carritos y aranceles configurables.'
        },
        {
            icon: '📦',
            title: 'Gestión de Inventario',
            description: 'Control total de productos, stock, precios y categorías. Búsqueda por código de barras integrada.'
        },
        {
            icon: '📊',
            title: 'Métricas y Reportes',
            description: 'Análisis detallado de ventas, ingresos, productos más vendidos y estadísticas en tiempo real.'
        },
        {
            icon: '🔄',
            title: 'Cambios y Devoluciones',
            description: 'Gestión completa de cambios y devoluciones con notas de crédito y control de stock automático.'
        },
        {
            icon: '🧾',
            title: 'Facturación Electrónica',
            description: 'Integración con AFIP para facturación electrónica, emisión de comprobantes y gestión de CAE.'
        },
        {
            icon: '🏪',
            title: 'Multi-Tienda',
            description: 'Administra múltiples tiendas desde una sola plataforma con control de acceso por usuario.'
        },
        {
            icon: '📄',
            title: 'Recibos y Tickets',
            description: 'Impresión de recibos, facturas, tickets de cambio y etiquetas con formato profesional.'
        },
        {
            icon: '👥',
            title: 'Control de Usuarios',
            description: 'Gestión de roles (admin/staff) con permisos diferenciados y control de acceso granular.'
        }
    ];

    return (
        <div style={styles.page}>
            {/* Hero Section */}
            <section style={styles.hero}>
                <div style={styles.heroContent}>
                    <h1 style={styles.heroTitle}>
                        <span style={styles.heroTitleMain}>Total Stock</span>
                        <span style={styles.heroTitleSub}>Sistema de Gestión Integral</span>
                    </h1>
                    <p style={styles.heroDescription}>
                        La solución completa para gestionar tu negocio: ventas, inventario, facturación y mucho más, todo en un solo lugar.
                    </p>
                </div>
            </section>

            {/* Login Section */}
            <section style={styles.loginSection}>
                <div style={styles.loginCard}>
                    <h2 style={styles.loginTitle}>Iniciar Sesión</h2>
                    <p style={styles.loginSubtitle}>Selecciona tu tienda y accede a tu panel de control</p>
                    
                    {hasStores ? (
                        <>
                            {!showLogin ? (
                                <div style={styles.storeSelector}>
                                    <label htmlFor="store-select" style={styles.storeLabel}>
                                        Selecciona tu Tienda:
                                    </label>
                                    <select
                                        id="store-select"
                                        value=""
                                        onChange={(e) => {
                                            if (e.target.value) {
                                                handleStoreSelect(e.target.value);
                                            }
                                        }}
                                        style={styles.storeSelect}
                                    >
                                        <option value="">-- Elige una tienda --</option>
                                        {stores.results.map(store => (
                                            <option key={store.id} value={store.nombre}>
                                                {store.nombre}
                                            </option>
                                        ))}
                                    </select>
                                    {selectedStore && (
                                        <button
                                            onClick={() => setShowLogin(false)}
                                            style={styles.backButton}
                                        >
                                            ← Volver a seleccionar tienda
                                        </button>
                                    )}
                                </div>
                            ) : (
                                <div>
                                    <button
                                        onClick={() => {
                                            setShowLogin(false);
                                            setSelectedStore(null);
                                            navigate('/');
                                        }}
                                        style={styles.backButton}
                                    >
                                        ← Volver
                                    </button>
                                    <Login />
                                </div>
                            )}
                        </>
                    ) : (
                        <div style={styles.noStores}>
                            <p style={styles.noStoresText}>
                                No hay tiendas disponibles. Contacta al administrador del sistema.
                            </p>
                        </div>
                    )}
                </div>
            </section>

            {/* Features Section */}
            <section style={styles.featuresSection}>
                <div style={styles.featuresContainer}>
                    <h2 style={styles.featuresTitle}>Funcionalidades Principales</h2>
                    <p style={styles.featuresSubtitle}>
                        Todo lo que necesitas para gestionar tu negocio de manera eficiente
                    </p>
                    <div style={styles.featuresGrid}>
                        {features.map((feature, index) => (
                            <div key={index} style={styles.featureCard}>
                                <div style={styles.featureIcon}>{feature.icon}</div>
                                <h3 style={styles.featureTitle}>{feature.title}</h3>
                                <p style={styles.featureDescription}>{feature.description}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Footer */}
            <footer style={styles.footer}>
                <p style={styles.footerText}>
                    © {new Date().getFullYear()} Total Stock. Todos los derechos reservados.
                </p>
            </footer>
        </div>
    );
};

const styles = {
    page: {
        minHeight: '100vh',
        backgroundColor: '#f8f9fa',
        fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
    },
    loadingContainer: {
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        gap: '20px',
    },
    spinner: {
        width: '50px',
        height: '50px',
        border: '4px solid #f3f3f3',
        borderTop: '4px solid #007bff',
        borderRadius: '50%',
        animation: 'spin 1s linear infinite',
    },
    '@keyframes spin': {
        '0%': { transform: 'rotate(0deg)' },
        '100%': { transform: 'rotate(360deg)' },
    },
    loadingText: {
        fontSize: '1.1em',
        color: '#666',
    },
    hero: {
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        color: 'white',
        padding: '80px 20px',
        textAlign: 'center',
        position: 'relative',
        overflow: 'hidden',
    },
    heroContent: {
        maxWidth: '800px',
        margin: '0 auto',
        position: 'relative',
        zIndex: 1,
    },
    heroTitle: {
        display: 'flex',
        flexDirection: 'column',
        gap: '10px',
        marginBottom: '20px',
    },
    heroTitleMain: {
        fontSize: 'clamp(2.5em, 5vw, 4em)',
        fontWeight: '800',
        letterSpacing: '-1px',
        lineHeight: '1.1',
    },
    heroTitleSub: {
        fontSize: 'clamp(1.2em, 2.5vw, 1.8em)',
        fontWeight: '300',
        opacity: 0.9,
    },
    heroDescription: {
        fontSize: 'clamp(1em, 1.5vw, 1.3em)',
        lineHeight: '1.6',
        maxWidth: '600px',
        margin: '0 auto',
        opacity: 0.95,
    },
    loginSection: {
        padding: '60px 20px',
        backgroundColor: '#ffffff',
    },
    loginCard: {
        maxWidth: '500px',
        margin: '0 auto',
        backgroundColor: '#ffffff',
        borderRadius: '16px',
        padding: '40px',
        boxShadow: '0 10px 40px rgba(0,0,0,0.1)',
        border: '1px solid #e9ecef',
    },
    loginTitle: {
        fontSize: '2em',
        fontWeight: '700',
        color: '#333',
        marginBottom: '10px',
        textAlign: 'center',
    },
    loginSubtitle: {
        fontSize: '1.1em',
        color: '#666',
        marginBottom: '30px',
        textAlign: 'center',
    },
    storeSelector: {
        display: 'flex',
        flexDirection: 'column',
        gap: '15px',
    },
    storeLabel: {
        fontSize: '1.1em',
        fontWeight: '600',
        color: '#333',
    },
    storeSelect: {
        padding: '14px 16px',
        fontSize: '1em',
        borderRadius: '8px',
        border: '2px solid #e9ecef',
        backgroundColor: '#f8f9fa',
        cursor: 'pointer',
        transition: 'all 0.3s ease',
        outline: 'none',
    },
    backButton: {
        padding: '10px 20px',
        marginTop: '15px',
        fontSize: '0.9em',
        backgroundColor: 'transparent',
        color: '#007bff',
        border: '1px solid #007bff',
        borderRadius: '6px',
        cursor: 'pointer',
        transition: 'all 0.3s ease',
        width: '100%',
    },
    noStores: {
        padding: '30px',
        textAlign: 'center',
    },
    noStoresText: {
        color: '#dc3545',
        fontSize: '1.1em',
        fontWeight: '500',
    },
    featuresSection: {
        padding: '80px 20px',
        backgroundColor: '#ffffff',
    },
    featuresContainer: {
        maxWidth: '1200px',
        margin: '0 auto',
    },
    featuresTitle: {
        fontSize: 'clamp(2em, 4vw, 2.8em)',
        fontWeight: '700',
        color: '#333',
        textAlign: 'center',
        marginBottom: '15px',
    },
    featuresSubtitle: {
        fontSize: '1.2em',
        color: '#666',
        textAlign: 'center',
        marginBottom: '50px',
        maxWidth: '600px',
        margin: '0 auto 50px',
    },
    featuresGrid: {
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
        gap: '30px',
        marginTop: '40px',
    },
    featureCard: {
        backgroundColor: '#ffffff',
        borderRadius: '12px',
        padding: '30px',
        textAlign: 'center',
        boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
        border: '1px solid #e9ecef',
        transition: 'all 0.3s ease',
        cursor: 'default',
    },
    featureIcon: {
        fontSize: '3em',
        marginBottom: '20px',
        display: 'block',
    },
    featureTitle: {
        fontSize: '1.4em',
        fontWeight: '600',
        color: '#333',
        marginBottom: '12px',
    },
    featureDescription: {
        fontSize: '0.95em',
        color: '#666',
        lineHeight: '1.6',
    },
    footer: {
        backgroundColor: '#212529',
        color: '#ffffff',
        padding: '30px 20px',
        textAlign: 'center',
    },
    footerText: {
        fontSize: '0.9em',
        opacity: 0.8,
    },
};

// Agregar estilos responsivos
const responsiveStyles = `
    @media (max-width: 768px) {
        .features-grid {
            grid-template-columns: 1fr !important;
        }
        .login-card {
            padding: 30px 20px !important;
        }
        .hero {
            padding: 60px 20px !important;
        }
    }
`;

// Inyectar estilos responsivos
if (typeof document !== 'undefined') {
    const styleSheet = document.createElement('style');
    styleSheet.type = 'text/css';
    styleSheet.innerText = responsiveStyles;
    document.head.appendChild(styleSheet);
}

export default HomePage;
