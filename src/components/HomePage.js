// BONITO_AMOR/frontend/src/components/HomePage.js
import React, { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom'; 
import { useAuth } from '../AuthContext';
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
    faShoppingBag,
    faCheck,
    faTimes
} from '@fortawesome/free-solid-svg-icons';

const HomePage = () => {
    const { isAuthenticated, selectedStoreSlug, loading, login, error: authError, clearError } = useAuth();
    const navigate = useNavigate();
    const [showAccessModal, setShowAccessModal] = useState(false);
    const [accessUsername, setAccessUsername] = useState('');
    const [accessPassword, setAccessPassword] = useState('');

    useEffect(() => {
        if (!loading && isAuthenticated && selectedStoreSlug) {
            navigate('/punto-venta', { replace: true });
        }
    }, [loading, isAuthenticated, selectedStoreSlug, navigate]);

    const scrollToSection = (sectionId) => {
        const element = document.getElementById(sectionId);
        if (element) {
            element.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    };

    const handleAccessLogin = async (e) => {
        e.preventDefault();
        clearError();

        if (!accessUsername || !accessPassword) {
            Swal.fire({
                icon: 'warning',
                title: 'Campos incompletos',
                text: 'Por favor ingresa usuario y contraseña.'
            });
            return;
        }

        const success = await login(accessUsername, accessPassword);

        if (success) {
            Swal.fire({
                icon: 'success',
                title: '¡Inicio de sesión exitoso!',
                text: 'Serás redirigido al panel principal.',
                timer: 2000,
                showConfirmButton: false
            });
            setShowAccessModal(false);
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
                    <div style={styles.navbarContainer} className="navbar-container">
                        <div style={styles.navbarLogoContainer}>
                            <img 
                                src="/logo-completo.png" 
                                alt="Total Stock Logo" 
                                style={styles.navbarLogo}
                            />
                        </div>
                        <ul style={styles.navbarLinks}>
                            <li className="navbar-link-item">
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
                            <li className="navbar-link-item">
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
                            <li className="navbar-link-item">
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
                            <li className="navbar-link-item">
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
                            <li className="navbar-link-item">
                                <a 
                                    href="#precios" 
                                    onClick={(e) => {
                                        e.preventDefault();
                                        scrollToSection('precios');
                                    }}
                                    style={styles.navbarLink}
                                    className="navbar-link"
                                >
                                    Precios
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
                            src="/logo-completo.png" 
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

            {/* Pricing Section */}
            <section id="precios" style={styles.pricingSection}>
                <div style={styles.pricingContainer}>
                    <h2 style={styles.sectionTitle}>Planes y Precios</h2>
                    <p style={styles.sectionSubtitle}>
                        Elige el plan que mejor se adapte a las necesidades de tu negocio.
                    </p>
                    <div style={styles.pricingGrid}>
                        {/* Starter Plan */}
                        <div 
                            style={styles.pricingCard}
                            onMouseEnter={(e) => {
                                e.currentTarget.style.transform = 'translateY(-8px)';
                                e.currentTarget.style.boxShadow = '0 12px 40px rgba(0,0,0,0.15)';
                            }}
                            onMouseLeave={(e) => {
                                e.currentTarget.style.transform = 'translateY(0)';
                                e.currentTarget.style.boxShadow = '0 8px 30px rgba(0,0,0,0.1)';
                            }}
                        >
                            <div style={styles.pricingHeader}>
                                <h3 style={styles.pricingPlanName}>Starter</h3>
                                <div style={styles.pricingPriceContainer}>
                                    <span style={styles.pricingCurrency}>$</span>
                                    <span style={styles.pricingAmount}>35.000</span>
                                </div>
                                <p style={styles.pricingPeriod}>Por tienda, por mes</p>
                            </div>
                            <div style={styles.pricingFeatures}>
                                <div style={styles.pricingFeature}>
                                    <FontAwesomeIcon icon={faCheck} style={styles.featureIconCheck} />
                                    <span>Carga de hasta 1000 productos en stock</span>
                                </div>
                                <div style={styles.pricingFeature}>
                                    <FontAwesomeIcon icon={faCheck} style={styles.featureIconCheck} />
                                    <span>2 usuarios por caja</span>
                                </div>
                                <div style={styles.pricingFeature}>
                                    <FontAwesomeIcon icon={faCheck} style={styles.featureIconCheck} />
                                    <span>Emisión de Recibos de compra</span>
                                </div>
                            </div>
                        </div>

                        {/* Pro Plan */}
                        <div 
                            className="pricing-card-pro"
                            style={{...styles.pricingCardPro, transform: 'scale(1.05)'}}
                            onMouseEnter={(e) => {
                                e.currentTarget.style.transform = 'scale(1.08) translateY(-8px)';
                                e.currentTarget.style.boxShadow = '0 16px 50px rgba(59, 130, 246, 0.3)';
                            }}
                            onMouseLeave={(e) => {
                                e.currentTarget.style.transform = 'scale(1.05)';
                                e.currentTarget.style.boxShadow = '0 12px 40px rgba(59, 130, 246, 0.2)';
                            }}
                        >
                            <div style={styles.pricingBadge}>MÁS POPULAR</div>
                            <div style={styles.pricingHeader}>
                                <h3 style={styles.pricingPlanName}>Pro</h3>
                                <div style={styles.pricingPriceContainer}>
                                    <span style={styles.pricingCurrency}>$</span>
                                    <span style={styles.pricingAmount}>40.000</span>
                                </div>
                                <p style={styles.pricingPeriod}>Por tienda, por mes</p>
                            </div>
                            <div style={styles.pricingFeatures}>
                                <div style={styles.pricingFeature}>
                                    <FontAwesomeIcon icon={faCheck} style={styles.featureIconCheck} />
                                    <span>Carga de hasta 2500 productos en stock</span>
                                </div>
                                <div style={styles.pricingFeature}>
                                    <FontAwesomeIcon icon={faCheck} style={styles.featureIconCheck} />
                                    <span>4 usuarios por caja</span>
                                </div>
                                <div style={styles.pricingFeature}>
                                    <FontAwesomeIcon icon={faCheck} style={styles.featureIconCheck} />
                                    <span>Emisión de Recibos de compra</span>
                                </div>
                                <div style={styles.pricingFeature}>
                                    <FontAwesomeIcon icon={faCheck} style={styles.featureIconCheck} />
                                    <span>Emisión de Factura electrónica (Integración con ARCA)</span>
                                </div>
                            </div>
                        </div>

                        {/* Advanced Plan */}
                        <div 
                            style={styles.pricingCard}
                            onMouseEnter={(e) => {
                                e.currentTarget.style.transform = 'translateY(-8px)';
                                e.currentTarget.style.boxShadow = '0 12px 40px rgba(0,0,0,0.15)';
                            }}
                            onMouseLeave={(e) => {
                                e.currentTarget.style.transform = 'translateY(0)';
                                e.currentTarget.style.boxShadow = '0 8px 30px rgba(0,0,0,0.1)';
                            }}
                        >
                            <div style={styles.pricingHeader}>
                                <h3 style={styles.pricingPlanName}>Advanced</h3>
                                <div style={styles.pricingPriceContainer}>
                                    <span style={styles.pricingCurrency}>$</span>
                                    <span style={styles.pricingAmount}>50.000</span>
                                </div>
                                <p style={styles.pricingPeriod}>Por tienda, por mes</p>
                            </div>
                            <div style={styles.pricingFeatures}>
                                <div style={styles.pricingFeature}>
                                    <FontAwesomeIcon icon={faCheck} style={styles.featureIconCheck} />
                                    <span>Carga ilimitada de productos en stock</span>
                                </div>
                                <div style={styles.pricingFeature}>
                                    <FontAwesomeIcon icon={faCheck} style={styles.featureIconCheck} />
                                    <span>Usuarios ilimitados por caja</span>
                                </div>
                                <div style={styles.pricingFeature}>
                                    <FontAwesomeIcon icon={faCheck} style={styles.featureIconCheck} />
                                    <span>Emisión de Recibos de compra</span>
                                </div>
                                <div style={styles.pricingFeature}>
                                    <FontAwesomeIcon icon={faCheck} style={styles.featureIconCheck} />
                                    <span>Emisión de Factura electrónica (Integración con ARCA)</span>
                                </div>
                            </div>
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
                            src="/logo-completo.png" 
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

            {/* WhatsApp Floating Button */}
            <a 
                href="https://api.whatsapp.com/send/?phone=5493515464113&text&type=phone_number&app_absent=0"
                target="_blank"
                rel="noopener noreferrer"
                style={styles.whatsappButton}
                className="whatsapp-float"
                aria-label="Contactar por WhatsApp"
            >
                <svg 
                    width="36" 
                    height="36" 
                    viewBox="0 0 24 24" 
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                    style={styles.whatsappIcon}
                >
                    {/* Modern WhatsApp Logo - Clean and minimal */}
                    <path 
                        d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" 
                        fill="#FFFFFF"
                    />
                </svg>
            </a>
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
    pricingSection: {
        padding: '100px 20px',
        backgroundColor: '#ffffff',
    },
    pricingContainer: {
        maxWidth: '1200px',
        margin: '0 auto',
    },
    pricingGrid: {
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
        gap: '40px',
        marginTop: '50px',
    },
    pricingCard: {
        backgroundColor: '#ffffff',
        borderRadius: '16px',
        padding: '40px 30px',
        textAlign: 'center',
        boxShadow: '0 8px 30px rgba(0,0,0,0.1)',
        border: '2px solid #e2e8f0',
        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        cursor: 'default',
        position: 'relative',
    },
    pricingCardPro: {
        backgroundColor: '#ffffff',
        borderRadius: '16px',
        padding: '40px 30px',
        textAlign: 'center',
        boxShadow: '0 12px 40px rgba(59, 130, 246, 0.2)',
        border: '3px solid #3b82f6',
        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        cursor: 'default',
        position: 'relative',
    },
    pricingBadge: {
        position: 'absolute',
        top: '-15px',
        left: '50%',
        transform: 'translateX(-50%)',
        backgroundColor: '#3b82f6',
        color: '#ffffff',
        padding: '8px 20px',
        borderRadius: '20px',
        fontSize: '0.85em',
        fontWeight: '700',
        textTransform: 'uppercase',
        letterSpacing: '0.5px',
        boxShadow: '0 4px 12px rgba(59, 130, 246, 0.4)',
    },
    pricingHeader: {
        marginBottom: '35px',
        paddingBottom: '30px',
        borderBottom: '2px solid #e2e8f0',
    },
    pricingPlanName: {
        fontSize: '1.8em',
        fontWeight: '700',
        color: '#1e293b',
        marginBottom: '20px',
    },
    pricingPriceContainer: {
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'center',
        marginBottom: '10px',
    },
    pricingCurrency: {
        fontSize: '1.5em',
        fontWeight: '600',
        color: '#3b82f6',
        marginTop: '5px',
    },
    pricingAmount: {
        fontSize: '3em',
        fontWeight: '700',
        color: '#1e3a8a',
        lineHeight: '1',
    },
    pricingPeriod: {
        fontSize: '0.95em',
        color: '#64748b',
        marginTop: '10px',
    },
    pricingFeatures: {
        textAlign: 'left',
        listStyle: 'none',
        padding: 0,
        margin: 0,
    },
    pricingFeature: {
        display: 'flex',
        alignItems: 'flex-start',
        marginBottom: '20px',
        fontSize: '1em',
        color: '#475569',
        lineHeight: '1.6',
        gap: '12px',
    },
    featureIconCheck: {
        color: '#10b981',
        fontSize: '1.2em',
        marginTop: '3px',
        flexShrink: 0,
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
    whatsappButton: {
        position: 'fixed',
        bottom: '30px',
        right: '30px',
        width: '60px',
        height: '60px',
        background: 'linear-gradient(135deg, #25D366 0%, #20BA5A 100%)',
        borderRadius: '50%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        boxShadow: '0 4px 16px rgba(37, 211, 102, 0.35)',
        zIndex: 999,
        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        textDecoration: 'none',
        cursor: 'pointer',
        padding: '0',
    },
    whatsappIcon: {
        width: '32px',
        height: '32px',
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
    
    .whatsapp-float:hover {
        background: linear-gradient(135deg, #20BA5A 0%, #1DA851 100%) !important;
        transform: scale(1.08);
        box-shadow: 0 6px 20px rgba(37, 211, 102, 0.45) !important;
    }
    
    .whatsapp-float:active {
        transform: scale(0.95);
    }
    
    @keyframes pulse {
        0% {
            box-shadow: 0 4px 16px rgba(37, 211, 102, 0.35);
        }
        50% {
            box-shadow: 0 4px 20px rgba(37, 211, 102, 0.5), 0 0 0 4px rgba(37, 211, 102, 0.1);
        }
        100% {
            box-shadow: 0 4px 16px rgba(37, 211, 102, 0.35);
        }
    }
    
    .whatsapp-float {
        animation: pulse 3s ease-in-out infinite;
    }
    
    .whatsapp-float:hover {
        animation: none;
    }

    @media (max-width: 768px) {
        .hero {
            padding: 80px 20px !important;
            min-height: 500px !important;
        }
        
        .business-grid,
        .features-grid,
        .benefits-grid,
        .pricing-grid {
            grid-template-columns: 1fr !important;
            gap: 25px !important;
        }
        
        .business-section,
        .features-section,
        .benefits-section,
        .pricing-section {
            padding: 60px 20px !important;
        }
        
        .pricing-card-pro {
            transform: scale(1) !important;
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
            gap: 10px !important;
        }
        
        .navbar-link-item {
            display: none !important;
        }
        
        .access-button {
            padding: 8px 20px !important;
            font-size: 0.9em !important;
        }
        
        .navbar-container {
            padding: 0 15px !important;
        }
        
        .modal-content {
            padding: 30px 25px !important;
        }
        
        .whatsapp-float {
            width: 56px !important;
            height: 56px !important;
            bottom: 20px !important;
            right: 20px !important;
        }
        
        .whatsapp-float svg {
            width: 28px !important;
            height: 28px !important;
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
