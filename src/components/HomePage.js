// BONITO_AMOR/frontend/src/components/HomePage.js
import React, { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom'; 
import { useAuth } from '../AuthContext';
import Login from './Login';
import Swal from 'sweetalert2';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
    faStore, 
    faShoppingCart, 
    faChartLine, 
    faExchangeAlt,
    faFileInvoice,
    faWarehouse,
    faPrint,
    faUsers,
    faStore as faStoreIcon,
    faShoppingBag
} from '@fortawesome/free-solid-svg-icons';

const HomePage = () => {
    const { isAuthenticated, selectedStoreSlug, stores, loading, login, error: authError, clearError } = useAuth();
    const navigate = useNavigate();
    const [selectedStore, setSelectedStore] = useState(null);
    const [showLogin, setShowLogin] = useState(false);
    const [showAccessModal, setShowAccessModal] = useState(false);
    const [accessStore, setAccessStore] = useState('');
    const [accessUsername, setAccessUsername] = useState('');
    const [accessPassword, setAccessPassword] = useState('');

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

    const scrollToSection = (sectionId) => {
        const element = document.getElementById(sectionId);
        if (element) {
            element.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    };

    const handleAccessLogin = async (e) => {
        e.preventDefault();
        clearError();
        
        if (!accessStore || !accessUsername || !accessPassword) {
            Swal.fire({
                icon: 'warning',
                title: 'Campos incompletos',
                text: 'Por favor completa todos los campos.'
            });
            return;
        }

        const slug = accessStore.toLowerCase().replace(/\s+/g, '-');
        const success = await login(accessUsername, accessPassword, slug);
        
        if (success) {
            Swal.fire({
                icon: 'success',
                title: '¡Inicio de sesión exitoso!',
                text: 'Serás redirigido al panel principal.',
                timer: 2000,
                showConfirmButton: false
            });
            setShowAccessModal(false);
            setAccessStore('');
            setAccessUsername('');
            setAccessPassword('');
            navigate('/');
        } else {
            Swal.fire({
                icon: 'error',
                title: 'Error de inicio de sesión',
                text: authError || 'Ocurrió un error inesperado. Por favor, inténtalo de nuevo.'
            });
        }
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

    // Tipos de negocios que pueden usar el sistema
    const businessTypes = [
        {
            icon: faStoreIcon,
            title: 'Kioscos, Almacenes y Supermercados',
            description: 'Adaptable a pequeños, medianos y grandes almacenes. Control completo de stock y ventas.'
        },
        {
            icon: faShoppingBag,
            title: 'Tiendas',
            description: 'Gestión de tiendas de cualquier rubro. Sistema flexible y personalizable según tus necesidades.'
        }
    ];

    // Funcionalidades principales
    const features = [
        {
            icon: faShoppingCart,
            title: 'Punto de Venta',
            description: 'Sistema completo de ventas con múltiples métodos de pago, gestión de carritos y aranceles configurables.'
        },
        {
            icon: faWarehouse,
            title: 'Stock en Tiempo Real',
            description: 'Control total de productos, stock, precios y categorías. Búsqueda por código de barras integrada.'
        },
        {
            icon: faChartLine,
            title: 'Métricas y Reportes',
            description: 'Análisis detallado de ventas, ingresos, productos más vendidos y estadísticas en tiempo real.'
        },
        {
            icon: faExchangeAlt,
            title: 'Cambios y Devoluciones',
            description: 'Gestión completa de cambios y devoluciones con notas de crédito y control de stock automático.'
        },
        {
            icon: faFileInvoice,
            title: 'Factura Electrónica',
            description: 'Integración con ARCA para facturación electrónica, emisión de comprobantes y gestión de CAE.'
        },
        {
            icon: faStore,
            title: 'Multi-Tienda',
            description: 'Administra múltiples tiendas desde una sola plataforma con control de acceso por usuario.'
        },
        {
            icon: faPrint,
            title: 'Recibos y Etiquetas',
            description: 'Impresión de recibos de compra, tickets de cambio y etiquetas compatibles con scanners e impresoras térmicas.'
        },
        {
            icon: faUsers,
            title: 'Control de Usuarios',
            description: 'Gestión de roles (admin/staff) con permisos diferenciados y control de acceso granular.'
        }
    ];

    return (
        <div style={styles.page}>
            {/* Navbar para Landing Page */}
            {!isAuthenticated && (
                <nav style={styles.landingNavbar}>
                    <div style={styles.navbarContainer}>
                        <div style={styles.navbarLogoContainer}>
                            <img 
                                src="/total-stock-logo.jpg" 
                                alt="Total Stock Logo" 
                                style={styles.navbarLogo}
                            />
                        </div>
                        <ul style={styles.navbarLinks}>
                            <li>
                                <a 
                                    href="#inicio" 
                                    onClick={(e) => {
                                        e.preventDefault();
                                        window.scrollTo({ top: 0, behavior: 'smooth' });
                                    }}
                                    style={styles.navbarLink}
                                    className="navbar-link"
                                >
                                    Inicio
                                </a>
                            </li>
                            <li>
                                <a 
                                    href="#negocios" 
                                    onClick={(e) => {
                                        e.preventDefault();
                                        scrollToSection('negocios');
                                    }}
                                    style={styles.navbarLink}
                                    className="navbar-link"
                                >
                                    Negocios
                                </a>
                            </li>
                            <li>
                                <a 
                                    href="#caracteristicas" 
                                    onClick={(e) => {
                                        e.preventDefault();
                                        scrollToSection('caracteristicas');
                                    }}
                                    style={styles.navbarLink}
                                    className="navbar-link"
                                >
                                    Características
                                </a>
                            </li>
                            <li>
                                <a 
                                    href="#beneficios" 
                                    onClick={(e) => {
                                        e.preventDefault();
                                        scrollToSection('beneficios');
                                    }}
                                    style={styles.navbarLink}
                                    className="navbar-link"
                                >
                                    Beneficios
                                </a>
                            </li>
                            <li>
                                <button 
                                    onClick={() => setShowAccessModal(true)}
                                    style={styles.accessButton}
                                    className="access-button"
                                >
                                    Acceso
                                </button>
                            </li>
                        </ul>
                    </div>
                </nav>
            )}

            {/* Hero Section */}
            <section id="inicio" style={styles.hero}>
                <div style={styles.heroOverlay}></div>
                <div style={styles.heroContent}>
                    <div style={styles.logoContainer}>
                        <img 
                            src="/total-stock-logo.jpg" 
                            alt="Total Stock Logo" 
                            style={styles.logo}
                        />
                    </div>
                    <h1 style={styles.heroTitle}>
                        Un sistema de gestión y facturación ágil y fácil de usar.
                        <span style={styles.heroTitleEmphasis}> Tu negocio lo necesita.</span>
                    </h1>
                    <p style={styles.heroDescription}>
                        Nuestra plataforma de gestión empresarial ágil y robusta te permite controlar todos los aspectos de tu negocio con facilidad.
                    </p>
                    <p style={styles.heroSubDescription}>
                        Software de última tecnología, práctico e intuitivo, que te permite administrar tus ventas, facturación, clientes, cuentas corrientes e inventario de manera eficiente.
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

            {/* Business Types Section */}
            <section id="negocios" style={styles.businessSection}>
                <div style={styles.businessContainer}>
                    <h2 style={styles.sectionTitle}>Administrá tu negocio con Total Stock</h2>
                    <p style={styles.sectionSubtitle}>
                        Nuestro software es adaptable a cualquier tipo de negocio.
                    </p>
                    <div style={styles.businessGrid}>
                        {businessTypes.map((business, index) => (
                            <div 
                                key={index} 
                                style={styles.businessCard}
                                onMouseEnter={(e) => {
                                    e.currentTarget.style.transform = 'translateY(-8px)';
                                    e.currentTarget.style.boxShadow = '0 12px 40px rgba(0,0,0,0.15)';
                                }}
                                onMouseLeave={(e) => {
                                    e.currentTarget.style.transform = 'translateY(0)';
                                    e.currentTarget.style.boxShadow = '0 8px 30px rgba(0,0,0,0.1)';
                                }}
                            >
                                <div style={styles.businessIconContainer}>
                                    <FontAwesomeIcon icon={business.icon} style={styles.businessIcon} />
                                </div>
                                <h3 style={styles.businessTitle}>{business.title}</h3>
                                <p style={styles.businessDescription}>{business.description}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Features Section */}
            <section id="caracteristicas" style={styles.featuresSection}>
                <div style={styles.featuresContainer}>
                    <h2 style={styles.sectionTitle}>Principales Características</h2>
                    <div style={styles.featuresGrid}>
                        {features.map((feature, index) => (
                            <div 
                                key={index} 
                                style={styles.featureCard}
                                onMouseEnter={(e) => {
                                    e.currentTarget.style.transform = 'translateY(-5px)';
                                    e.currentTarget.style.boxShadow = '0 12px 40px rgba(0,0,0,0.15)';
                                }}
                                onMouseLeave={(e) => {
                                    e.currentTarget.style.transform = 'translateY(0)';
                                    e.currentTarget.style.boxShadow = '0 6px 25px rgba(0,0,0,0.08)';
                                }}
                            >
                                <div style={styles.featureIconContainer}>
                                    <FontAwesomeIcon icon={feature.icon} style={styles.featureIcon} />
                                </div>
                                <h3 style={styles.featureTitle}>{feature.title}</h3>
                                <p style={styles.featureDescription}>{feature.description}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Benefits Section */}
            <section id="beneficios" style={styles.benefitsSection}>
                <div style={styles.benefitsContainer}>
                    <h2 style={styles.sectionTitle}>¿Por qué elegir Total Stock?</h2>
                    <div style={styles.benefitsGrid}>
                        <div style={styles.benefitItem}>
                            <h3 style={styles.benefitTitle}>Eficiencia</h3>
                            <p style={styles.benefitText}>
                                Aumenta la eficiencia de tu negocio y ahorra tiempo y dinero en el proceso.
                            </p>
                        </div>
                        <div style={styles.benefitItem}>
                            <h3 style={styles.benefitTitle}>Atención al Cliente</h3>
                            <p style={styles.benefitText}>
                                Soporte excepcional para ayudarte a alcanzar tus objetivos empresariales.
                            </p>
                        </div>
                        <div style={styles.benefitItem}>
                            <h3 style={styles.benefitTitle}>Interfaz Intuitiva</h3>
                            <p style={styles.benefitText}>
                                Sistema fácil de usar que se adapta a tus necesidades sin complicaciones.
                            </p>
                        </div>
                    </div>
                </div>
            </section>

            {/* Modal de Acceso */}
            {showAccessModal && (
                <div style={styles.modalOverlay} onClick={() => setShowAccessModal(false)}>
                    <div style={styles.modalContent} onClick={(e) => e.stopPropagation()}>
                        <div style={styles.modalHeader}>
                            <h2 style={styles.modalTitle}>Acceso al Sistema</h2>
                            <button 
                                onClick={() => {
                                    setShowAccessModal(false);
                                    setAccessStore('');
                                    setAccessUsername('');
                                    setAccessPassword('');
                                    clearError();
                                }}
                                style={styles.modalCloseButton}
                                className="modal-close-button"
                            >
                                ×
                            </button>
                        </div>
                        <form onSubmit={handleAccessLogin} style={styles.modalForm}>
                            <div style={styles.inputGroupModal}>
                                <label style={styles.label}>Tienda:</label>
                                <select
                                    value={accessStore}
                                    onChange={(e) => setAccessStore(e.target.value)}
                                    style={styles.modalInput}
                                    className="modal-input"
                                    required
                                >
                                    <option value="">-- Elige una tienda --</option>
                                    {stores && stores.results && stores.results.map(store => (
                                        <option key={store.id} value={store.nombre}>
                                            {store.nombre}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <div style={styles.inputGroupModal}>
                                <label style={styles.label}>Usuario:</label>
                                <input
                                    type="text"
                                    value={accessUsername}
                                    onChange={(e) => setAccessUsername(e.target.value)}
                                    placeholder="Nombre de usuario"
                                    style={styles.modalInput}
                                    className="modal-input"
                                    required
                                />
                            </div>
                            <div style={styles.inputGroupModal}>
                                <label style={styles.label}>Contraseña:</label>
                                <input
                                    type="password"
                                    value={accessPassword}
                                    onChange={(e) => setAccessPassword(e.target.value)}
                                    placeholder="Contraseña"
                                    style={styles.modalInput}
                                    className="modal-input"
                                    required
                                />
                            </div>
                            <div style={styles.modalActions}>
                                <button type="submit" style={styles.modalConfirmButton} className="modal-confirm-button">
                                    Iniciar Sesión
                                </button>
                                <button 
                                    type="button"
                                    onClick={() => {
                                        setShowAccessModal(false);
                                        setAccessStore('');
                                        setAccessUsername('');
                                        setAccessPassword('');
                                        clearError();
                                    }}
                                    style={styles.modalCancelButton}
                                    className="modal-cancel-button"
                                >
                                    Cancelar
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Footer */}
            <footer style={styles.footer}>
                <div style={styles.footerContent}>
                    <div style={styles.footerLogoContainer}>
                        <img 
                            src="/total-stock-logo.jpg" 
                            alt="Total Stock Logo" 
                            style={styles.footerLogo}
                        />
                    </div>
                    <p style={styles.footerText}>
                        © {new Date().getFullYear()} Total Stock | Todos los derechos reservados.
                    </p>
                    <p style={styles.footerSubtext}>
                        Desarrollado por Total Stock :)
                    </p>
                </div>
            </footer>
        </div>
    );
};

const styles = {
    page: {
        minHeight: '100vh',
        backgroundColor: '#ffffff',
        fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', sans-serif",
    },
    landingNavbar: {
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        backgroundColor: '#ffffff',
        boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
        zIndex: 1000,
        padding: '15px 0',
    },
    navbarContainer: {
        maxWidth: '1200px',
        margin: '0 auto',
        padding: '0 20px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    navbarLogoContainer: {
        display: 'flex',
        alignItems: 'center',
    },
    navbarLogo: {
        height: '50px',
        maxWidth: '180px',
        borderRadius: '6px',
    },
    navbarLinks: {
        display: 'flex',
        listStyle: 'none',
        margin: 0,
        padding: 0,
        gap: '30px',
        alignItems: 'center',
    },
    navbarLink: {
        color: '#1e3a8a',
        textDecoration: 'none',
        fontSize: '1em',
        fontWeight: '600',
        transition: 'color 0.3s ease',
        cursor: 'pointer',
    },
    accessButton: {
        padding: '10px 25px',
        backgroundColor: '#3b82f6',
        color: '#ffffff',
        border: 'none',
        borderRadius: '6px',
        fontSize: '1em',
        fontWeight: '600',
        cursor: 'pointer',
        transition: 'all 0.3s ease',
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
        backgroundImage: 'linear-gradient(135deg, rgba(30, 58, 138, 0.9) 0%, rgba(67, 56, 202, 0.9) 100%), url("https://images.unsplash.com/photo-1460925895917-afdab827c52f?ixlib=rb-4.0.3&auto=format&fit=crop&w=2015&q=80")',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
        color: 'white',
        padding: '180px 20px 120px',
        textAlign: 'center',
        position: 'relative',
        overflow: 'hidden',
        minHeight: '600px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
    },
    heroOverlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.3)',
        zIndex: 0,
    },
    heroContent: {
        maxWidth: '900px',
        margin: '0 auto',
        position: 'relative',
        zIndex: 2,
    },
    logoContainer: {
        marginBottom: '30px',
        display: 'flex',
        justifyContent: 'center',
    },
    logo: {
        maxWidth: '250px',
        height: 'auto',
        borderRadius: '12px',
        boxShadow: '0 10px 30px rgba(0, 0, 0, 0.3)',
        backgroundColor: 'rgba(255, 255, 255, 0.95)',
        padding: '15px',
    },
    heroTitle: {
        fontSize: 'clamp(1.8em, 4vw, 3em)',
        fontWeight: '700',
        letterSpacing: '-0.5px',
        lineHeight: '1.3',
        marginBottom: '25px',
        color: '#ffffff',
    },
    heroTitleEmphasis: {
        fontStyle: 'italic',
        fontWeight: '600',
    },
    heroDescription: {
        fontSize: 'clamp(1.1em, 1.8vw, 1.4em)',
        lineHeight: '1.8',
        marginBottom: '20px',
        opacity: 0.95,
        color: '#ffffff',
    },
    heroSubDescription: {
        fontSize: 'clamp(0.95em, 1.4vw, 1.15em)',
        lineHeight: '1.7',
        opacity: 0.9,
        color: '#ffffff',
        maxWidth: '800px',
        margin: '0 auto',
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
    storeSelectHover: {
        borderColor: '#3b82f6',
        backgroundColor: '#ffffff',
    },
    backButton: {
        padding: '10px 20px',
        marginTop: '15px',
        fontSize: '0.9em',
        backgroundColor: 'transparent',
        color: '#3b82f6',
        border: '1px solid #3b82f6',
        borderRadius: '8px',
        cursor: 'pointer',
        transition: 'all 0.3s ease',
        width: '100%',
        fontWeight: '500',
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
    businessSection: {
        padding: '100px 20px',
        backgroundColor: '#f8f9fa',
    },
    businessContainer: {
        maxWidth: '1200px',
        margin: '0 auto',
    },
    sectionTitle: {
        fontSize: 'clamp(2em, 4vw, 2.8em)',
        fontWeight: '700',
        color: '#1e3a8a',
        textAlign: 'center',
        marginBottom: '15px',
    },
    sectionSubtitle: {
        fontSize: '1.2em',
        color: '#64748b',
        textAlign: 'center',
        marginBottom: '60px',
        maxWidth: '700px',
        margin: '0 auto 60px',
    },
    businessGrid: {
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
        gap: '40px',
        marginTop: '40px',
    },
    businessCard: {
        backgroundColor: '#ffffff',
        borderRadius: '16px',
        padding: '40px 30px',
        textAlign: 'center',
        boxShadow: '0 8px 30px rgba(0,0,0,0.1)',
        border: '1px solid #e2e8f0',
        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        cursor: 'default',
    },
    businessIconContainer: {
        marginBottom: '25px',
        display: 'flex',
        justifyContent: 'center',
    },
    businessIcon: {
        fontSize: '3.5em',
        color: '#3b82f6',
    },
    businessTitle: {
        fontSize: '1.5em',
        fontWeight: '700',
        color: '#1e293b',
        marginBottom: '15px',
    },
    businessDescription: {
        fontSize: '1em',
        color: '#64748b',
        lineHeight: '1.7',
    },
    featuresSection: {
        padding: '100px 20px',
        backgroundColor: '#ffffff',
    },
    featuresContainer: {
        maxWidth: '1200px',
        margin: '0 auto',
    },
    featuresGrid: {
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
        gap: '30px',
        marginTop: '50px',
    },
    featureCard: {
        backgroundColor: '#ffffff',
        borderRadius: '16px',
        padding: '35px 25px',
        textAlign: 'center',
        boxShadow: '0 6px 25px rgba(0,0,0,0.08)',
        border: '1px solid #e2e8f0',
        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        cursor: 'default',
    },
    featureIconContainer: {
        marginBottom: '20px',
        display: 'flex',
        justifyContent: 'center',
    },
    featureIcon: {
        fontSize: '2.5em',
        color: '#3b82f6',
    },
    featureTitle: {
        fontSize: '1.3em',
        fontWeight: '600',
        color: '#1e293b',
        marginBottom: '12px',
    },
    featureDescription: {
        fontSize: '0.95em',
        color: '#64748b',
        lineHeight: '1.7',
    },
    benefitsSection: {
        padding: '100px 20px',
        backgroundColor: '#f1f5f9',
    },
    benefitsContainer: {
        maxWidth: '1200px',
        margin: '0 auto',
    },
    benefitsGrid: {
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
        gap: '40px',
        marginTop: '50px',
    },
    benefitItem: {
        textAlign: 'center',
        padding: '30px',
    },
    benefitTitle: {
        fontSize: '1.8em',
        fontWeight: '700',
        color: '#1e3a8a',
        marginBottom: '15px',
    },
    benefitText: {
        fontSize: '1.1em',
        color: '#475569',
        lineHeight: '1.7',
    },
    footer: {
        backgroundColor: '#1e293b',
        color: '#ffffff',
        padding: '60px 20px 40px',
        textAlign: 'center',
    },
    footerContent: {
        maxWidth: '1200px',
        margin: '0 auto',
    },
    footerLogoContainer: {
        marginBottom: '20px',
        display: 'flex',
        justifyContent: 'center',
    },
    footerLogo: {
        maxWidth: '180px',
        height: 'auto',
        borderRadius: '8px',
        backgroundColor: 'rgba(255, 255, 255, 0.95)',
        padding: '10px',
    },
    footerText: {
        fontSize: '1em',
        opacity: 0.9,
        marginBottom: '10px',
        color: '#cbd5e1',
    },
    footerSubtext: {
        fontSize: '0.9em',
        opacity: 0.7,
        color: '#94a3b8',
        fontStyle: 'italic',
    },
    modalOverlay: {
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.6)',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 2000,
        padding: '20px',
    },
    modalContent: {
        backgroundColor: '#ffffff',
        borderRadius: '16px',
        padding: '40px',
        width: '90%',
        maxWidth: '600px',
        maxHeight: '90vh',
        overflowY: 'auto',
        boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)',
        position: 'relative',
    },
    modalHeader: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '30px',
        paddingBottom: '20px',
        borderBottom: '2px solid #e2e8f0',
    },
    modalTitle: {
        fontSize: '2em',
        fontWeight: '700',
        color: '#1e3a8a',
        margin: 0,
    },
    modalCloseButton: {
        backgroundColor: 'transparent',
        border: 'none',
        fontSize: '2.5em',
        color: '#64748b',
        cursor: 'pointer',
        lineHeight: '1',
        padding: '0',
        width: '40px',
        height: '40px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: '50%',
        transition: 'all 0.3s ease',
    },
    modalForm: {
        display: 'flex',
        flexDirection: 'column',
    },
    inputGroupModal: {
        marginBottom: '25px',
    },
    label: {
        display: 'block',
        fontSize: '1.1em',
        fontWeight: '600',
        color: '#1e293b',
        marginBottom: '10px',
    },
    modalInput: {
        width: '100%',
        padding: '14px 16px',
        fontSize: '1em',
        border: '2px solid #e2e8f0',
        borderRadius: '8px',
        boxSizing: 'border-box',
        transition: 'border-color 0.3s ease',
        outline: 'none',
        fontFamily: 'inherit',
    },
    modalActions: {
        display: 'flex',
        justifyContent: 'flex-end',
        gap: '15px',
        marginTop: '30px',
        paddingTop: '20px',
        borderTop: '2px solid #e2e8f0',
    },
    modalConfirmButton: {
        padding: '12px 30px',
        backgroundColor: '#3b82f6',
        color: '#ffffff',
        border: 'none',
        borderRadius: '8px',
        fontSize: '1em',
        fontWeight: '600',
        cursor: 'pointer',
        transition: 'all 0.3s ease',
    },
    modalCancelButton: {
        padding: '12px 30px',
        backgroundColor: '#e2e8f0',
        color: '#475569',
        border: 'none',
        borderRadius: '8px',
        fontSize: '1em',
        fontWeight: '600',
        cursor: 'pointer',
        transition: 'all 0.3s ease',
    },
};

// Agregar estilos responsivos y animaciones
const responsiveStyles = `
    @keyframes spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
    }
    
    @keyframes fadeInUp {
        from {
            opacity: 0;
            transform: translateY(30px);
        }
        to {
            opacity: 1;
            transform: translateY(0);
        }
    }

    .navbar-link:hover {
        color: #3b82f6 !important;
    }
    
    .access-button:hover {
        background-color: #2563eb !important;
        transform: translateY(-2px);
        box-shadow: 0 4px 12px rgba(59, 130, 246, 0.4);
    }
    
    .modal-close-button:hover {
        background-color: #f1f5f9 !important;
        color: #1e293b !important;
    }
    
    .modal-confirm-button:hover {
        background-color: #2563eb !important;
        transform: translateY(-2px);
        box-shadow: 0 4px 12px rgba(59, 130, 246, 0.4);
    }
    
    .modal-cancel-button:hover {
        background-color: #cbd5e1 !important;
    }
    
    .modal-input:focus {
        border-color: #3b82f6 !important;
        box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
    }

    @media (max-width: 768px) {
        .hero {
            padding: 80px 20px !important;
            min-height: 500px !important;
        }
        
        .business-grid,
        .features-grid,
        .benefits-grid {
            grid-template-columns: 1fr !important;
            gap: 25px !important;
        }
        
        .login-card {
            padding: 30px 20px !important;
        }
        
        .business-section,
        .features-section,
        .benefits-section {
            padding: 60px 20px !important;
        }
        
        .logo {
            max-width: 180px !important;
        }
        
        .footer-logo {
            max-width: 150px !important;
        }
        
        .landing-navbar {
            padding: 10px 0 !important;
        }
        
        .navbar-links {
            gap: 15px !important;
            flex-wrap: wrap;
        }
        
        .navbar-link {
            font-size: 0.9em !important;
        }
        
        .access-button {
            padding: 8px 20px !important;
            font-size: 0.9em !important;
        }
        
        .modal-content {
            padding: 30px 25px !important;
        }
    }
    
    @media (max-width: 480px) {
        .hero {
            padding: 60px 15px !important;
            min-height: 400px !important;
        }
        
        .business-card,
        .feature-card {
            padding: 25px 20px !important;
        }
        
        .section-title {
            font-size: 1.8em !important;
        }
        
        .section-subtitle {
            font-size: 1em !important;
            margin-bottom: 40px !important;
        }
    }
`;

// Inyectar estilos responsivos
if (typeof document !== 'undefined') {
    const existingStyle = document.getElementById('homepage-responsive-styles');
    if (existingStyle) {
        existingStyle.remove();
    }
    const styleSheet = document.createElement('style');
    styleSheet.id = 'homepage-responsive-styles';
    styleSheet.type = 'text/css';
    styleSheet.innerText = responsiveStyles;
    document.head.appendChild(styleSheet);
}

export default HomePage;
