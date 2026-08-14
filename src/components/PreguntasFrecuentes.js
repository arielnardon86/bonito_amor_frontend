import React from 'react';
import { Link } from 'react-router-dom';

const C = {
    verde: '#5dc87a',
    azul: '#1a2926',
    gris: '#475569',
    grisClaro: '#f8fafc',
};

const FAQS = [
    {
        q: '¿Qué es Total Stock?',
        a: 'Total Stock es un sistema de gestión y punto de venta para comercios argentinos. Permite controlar stock en tiempo real, vender desde un punto de venta ágil, facturar electrónicamente con ARCA y sincronizar tu tienda online (Mercado Libre y Tienda Nube) desde un mismo lugar.',
    },
    {
        q: '¿Para qué tipo de comercio sirve Total Stock?',
        a: 'Para cualquier comercio minorista con inventario: indumentaria, calzado, accesorios, ferreterías, kioscos, artículos deportivos, blanquería y en general cualquier local que necesite controlar stock y vender, con uno o varios locales.',
    },
    {
        q: '¿Cuánto cuesta Total Stock?',
        a: 'Hay tres planes mensuales por tienda: Starter ($35.000, hasta 1.000 productos y 2 usuarios), Pro ($40.000, hasta 2.500 productos, 4 usuarios y factura electrónica ARCA) y Advanced ($60.000, productos y usuarios ilimitados, integración con Mercado Libre y Tienda Nube). Se paga con Mercado Pago y no hay permanencia mínima.',
    },
    {
        q: '¿Tiene prueba gratuita?',
        a: 'Sí, los tres planes incluyen 7 días de prueba gratis, sin necesidad de tarjeta de crédito.',
    },
    {
        q: '¿Puedo controlar stock por talle y color?',
        a: 'Sí. Total Stock permite manejar productos con variantes (por ejemplo, un mismo modelo en distintos talles y colores) manteniendo el stock de cada combinación por separado.',
    },
    {
        q: '¿Total Stock factura electrónicamente? ¿Está integrado con ARCA?',
        a: 'Sí. Los planes Pro y Advanced incluyen facturación electrónica (facturas A, B y C) integrada con ARCA, sin salir del sistema.',
    },
    {
        q: '¿Puedo usar un lector de código de barras?',
        a: 'Sí. La búsqueda de productos por código de barras está incluida en la gestión de stock, y también podés imprimir etiquetas con código de barras compatibles con impresoras térmicas.',
    },
    {
        q: '¿Se integra con Mercado Libre?',
        a: 'Sí, en el plan Advanced. Total Stock sincroniza publicaciones, importa órdenes y mantiene el stock actualizado entre tu local y Mercado Libre.',
    },
    {
        q: '¿Se integra con Tienda Nube?',
        a: 'Sí, en el plan Advanced. El catálogo y el stock se sincronizan automáticamente entre tu tienda online en Tienda Nube y tu local.',
    },
    {
        q: '¿Puedo administrar más de una sucursal?',
        a: 'Sí, Total Stock es multi-tienda: podés administrar varios locales desde una misma cuenta, cada uno con su propio stock y vendedores.',
    },
    {
        q: '¿Puedo controlar la caja?',
        a: 'Sí, el punto de venta incluye gestión de caja durante el día y cierre de caja con cuadre automático al final de la jornada.',
    },
    {
        q: '¿Puedo importar productos desde Excel?',
        a: 'Sí, Total Stock permite cargar productos de forma masiva en lugar de ingresarlos uno por uno.',
    },
    {
        q: '¿Cuántos usuarios puedo tener y qué permisos manejan?',
        a: 'Según el plan, podés tener 2, 4 o usuarios ilimitados, con roles diferenciados: administrador, supervisor y cajero/vendedor, cada uno con permisos distintos dentro del sistema.',
    },
    {
        q: '¿Hay permanencia mínima? ¿Cómo cancelo?',
        a: 'No hay permanencia mínima. Podés cancelar cuando quieras desde el panel de tu cuenta; el pago se gestiona a través de Mercado Pago.',
    },
];

const faqJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: FAQS.map(({ q, a }) => ({
        '@type': 'Question',
        name: q,
        acceptedAnswer: { '@type': 'Answer', text: a },
    })),
};

export default function PreguntasFrecuentes() {
    return (
        <div style={s.page}>
            <script type="application/ld+json">{JSON.stringify(faqJsonLd)}</script>

            <header style={s.header}>
                <div style={s.headerInner}>
                    <Link to="/">
                        <img src="/logo-completo.png" alt="Total Stock" style={s.logo} />
                    </Link>
                    <Link to="/" style={s.volver}>← Volver al inicio</Link>
                </div>
            </header>

            <main style={s.main}>
                <h1 style={s.h1}>Preguntas frecuentes sobre Total Stock</h1>
                <p style={s.intro}>
                    Respuestas directas sobre qué es Total Stock, qué incluye cada plan y cómo funciona
                    el sistema de gestión y punto de venta para comercios argentinos.
                </p>

                <div style={s.list}>
                    {FAQS.map(({ q, a }) => (
                        <details key={q} style={s.item}>
                            <summary style={s.question}>{q}</summary>
                            <p style={s.answer}>{a}</p>
                        </details>
                    ))}
                </div>

                <div style={s.cta}>
                    <p style={s.ctaText}>¿Tenés otra pregunta?</p>
                    <a href="mailto:info@totalstock.com.ar" style={s.ctaBtn}>Escribinos a info@totalstock.com.ar</a>
                </div>
            </main>

            <footer style={s.footer}>
                <div style={s.footerInner}>
                    <img src="/logo-completo.png" alt="Total Stock" style={s.footerLogo} />
                    <p style={s.footerText}>© {new Date().getFullYear()} Total Stock · Todos los derechos reservados.</p>
                    <p style={{ margin: '10px 0 0', fontSize: '0.85em' }}>
                        <Link to="/privacidad" style={{ color: '#475569', textDecoration: 'none' }}>
                            Política de privacidad
                        </Link>
                    </p>
                </div>
            </footer>
        </div>
    );
}

const s = {
    page: { minHeight: '100vh', backgroundColor: '#fff', fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif", color: C.azul },
    header: { padding: '18px 24px', borderBottom: '1px solid #e2e8f0' },
    headerInner: { maxWidth: 900, margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
    logo: { height: 40 },
    volver: { color: C.gris, textDecoration: 'none', fontSize: 14, fontWeight: 600 },

    main: { maxWidth: 780, margin: '0 auto', padding: '56px 24px 80px' },
    h1: { fontSize: 'clamp(1.8em, 4vw, 2.6em)', fontWeight: 800, marginBottom: 16, lineHeight: 1.2 },
    intro: { fontSize: '1.05em', color: C.gris, lineHeight: 1.7, marginBottom: 40, maxWidth: 640 },

    list: { display: 'flex', flexDirection: 'column', gap: 12 },
    item: { border: '1px solid #e2e8f0', borderRadius: 10, padding: '16px 20px', background: C.grisClaro },
    question: { fontSize: '1.05em', fontWeight: 700, cursor: 'pointer', color: C.azul },
    answer: { marginTop: 12, marginBottom: 0, color: C.gris, fontSize: '0.98em', lineHeight: 1.7 },

    cta: { marginTop: 56, textAlign: 'center', padding: '32px 24px', background: C.grisClaro, borderRadius: 12 },
    ctaText: { fontWeight: 700, marginBottom: 12 },
    ctaBtn: { color: C.verde, textDecoration: 'none', fontWeight: 700 },

    footer: { borderTop: '1px solid #e2e8f0', padding: '32px 24px' },
    footerInner: { maxWidth: 900, margin: '0 auto', textAlign: 'center' },
    footerLogo: { height: 32, marginBottom: 12 },
    footerText: { color: C.gris, fontSize: '0.85em', margin: 0 },
};
