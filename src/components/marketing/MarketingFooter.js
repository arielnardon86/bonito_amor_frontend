import React from 'react';
import { Link } from 'react-router-dom';

/**
 * Footer reutilizado en la home y en las páginas verticales.
 */
export default function MarketingFooter() {
    return (
        <footer style={s.footer}>
            <div style={s.footerInner}>
                <img src="/logo-completo.png" alt="Total Stock" style={s.footerLogo} />
                <p style={s.footerText}>© {new Date().getFullYear()} Total Stock · Todos los derechos reservados.</p>
                <p style={s.footerSub}>Software de gestión para comercios argentinos.</p>
                <p style={{ margin: '14px 0 0', fontSize: '0.85em', color: '#475569' }}>
                    ¿Tenés dudas o consultas?{' '}
                    <a href="mailto:info@totalstock.com.ar" style={{ color: '#5dc87a', textDecoration: 'none', fontWeight: 600 }}>
                        info@totalstock.com.ar
                    </a>
                </p>
                <p style={{ margin: '14px 0 0', fontSize: '0.85em', display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: '6px 10px' }}>
                    <Link to="/sistema-para-indumentaria/" style={s.footerLink}>Sistema para tiendas de ropa</Link>
                    <span style={s.footerDot}>·</span>
                    <Link to="/sistema-para-deportes/" style={s.footerLink}>Sistema para indumentaria deportiva</Link>
                    <span style={s.footerDot}>·</span>
                    <Link to="/sistema-para-ferreterias/" style={s.footerLink}>Sistema para ferreterías</Link>
                    <span style={s.footerDot}>·</span>
                    <Link to="/sistema-para-kioscos/" style={s.footerLink}>Sistema para kioscos</Link>
                    <span style={s.footerDot}>·</span>
                    <Link to="/integraciones/mercado-libre/" style={s.footerLink}>Integración con Mercado Libre</Link>
                    <span style={s.footerDot}>·</span>
                    <Link to="/integraciones/tienda-nube/" style={s.footerLink}>Integración con Tienda Nube</Link>
                    <span style={s.footerDot}>·</span>
                    <Link to="/facturacion-arca/" style={s.footerLink}>Facturación ARCA</Link>
                    <span style={s.footerDot}>·</span>
                    <Link to="/preguntas-frecuentes/" style={s.footerLink}>Preguntas frecuentes</Link>
                    <span style={s.footerDot}>·</span>
                    <Link to="/privacidad" style={s.footerLink}>Política de privacidad</Link>
                </p>
            </div>
        </footer>
    );
}

const s = {
    footer: { background: '#0f172a', padding: '50px 24px 36px', textAlign: 'center' },
    footerInner: { maxWidth: 1200, margin: '0 auto' },
    footerLogo: { maxWidth: 160, borderRadius: 8, background: 'rgba(255,255,255,0.95)', padding: '8px 12px', marginBottom: 18 },
    footerText: { color: '#94a3b8', fontSize: '0.9em', marginBottom: 6 },
    footerSub: { color: '#475569', fontSize: '0.8em', fontStyle: 'italic' },
    footerLink: { color: '#475569', textDecoration: 'none' },
    footerDot: { color: '#334155' },
};
