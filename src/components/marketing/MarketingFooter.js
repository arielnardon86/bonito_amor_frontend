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
                <p style={{ margin: '10px 0 0', fontSize: '0.85em' }}>
                    <Link to="/sistema-para-indumentaria" style={{ color: '#475569', textDecoration: 'none' }}>
                        Sistema para tiendas de ropa
                    </Link>
                    {' · '}
                    <Link to="/preguntas-frecuentes" style={{ color: '#475569', textDecoration: 'none' }}>
                        Preguntas frecuentes
                    </Link>
                    {' · '}
                    <Link to="/privacidad" style={{ color: '#475569', textDecoration: 'none' }}>
                        Política de privacidad
                    </Link>
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
};
