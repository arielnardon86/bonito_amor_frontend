// BONITO_AMOR/frontend/src/components/PoliticaPrivacidad.js
import React from 'react';
import { Link } from 'react-router-dom';

const ULTIMA_ACTUALIZACION = '29 de julio de 2026';

function PoliticaPrivacidad() {
  return (
    <div style={s.page}>
      <div style={s.header}>
        <Link to="/" style={s.logo}>
          <img src="/logo-completo.png" alt="Total Stock" style={s.logoImg} />
        </Link>
      </div>
      <div style={s.container}>
        <h1 style={s.h1}>Política de privacidad</h1>
        <p style={s.updated}>Última actualización: {ULTIMA_ACTUALIZACION}</p>

        <p style={s.p}>
          Total Stock ("nosotros", "la plataforma") es un sistema de gestión de inventario, punto de venta
          y facturación para comercios. Esta política explica qué datos recolectamos, cómo los usamos y
          con qué integraciones de terceros los compartimos.
        </p>

        <h2 style={s.h2}>1. Datos que recolectamos</h2>
        <p style={s.p}>Al usar Total Stock, un comercio (nuestro cliente) carga y almacena en la plataforma:</p>
        <ul style={s.ul}>
          <li>Datos de la tienda: razón social, CUIT, domicilio y condición frente al IVA.</li>
          <li>Cuentas de usuario del personal del comercio: nombre de usuario, email y rol asignado.</li>
          <li>Catálogo de productos, precios, stock y códigos de barras.</li>
          <li>Ventas, compras, movimientos de caja y comprobantes (recibos, facturas, notas de crédito).</li>
          <li>Datos de clientes del comercio que este decida cargar (nombre, CUIT/CUIL, contacto), usados para
            facturación o cuenta corriente.</li>
        </ul>

        <h2 style={s.h2}>2. Integraciones con terceros</h2>
        <p style={s.p}>
          Total Stock se conecta, solo si el comercio lo habilita explícitamente, con los siguientes servicios:
        </p>
        <ul style={s.ul}>
          <li>
            <strong>Tienda Nube:</strong> mediante autorización OAuth, Total Stock lee y actualiza el catálogo
            de productos, variantes y stock de la tienda online del comercio, y recibe notificaciones de
            pedidos pagados (vía webhook) para descontar stock automáticamente. No accedemos a datos de pago
            ni credenciales de Tienda Nube — solo al token de acceso que la propia Tienda Nube emite para esta
            integración.
          </li>
          <li>
            <strong>Mercado Libre:</strong> mediante autorización OAuth, sincronizamos publicaciones, stock y
            ventas entre Mercado Libre y Total Stock.
          </li>
          <li>
            <strong>Mercado Pago / ARCA (AFIP):</strong> se usan para procesar la suscripción del comercio a
            Total Stock y para emitir facturas electrónicas en nombre del comercio ante el organismo fiscal,
            respectivamente.
          </li>
        </ul>
        <p style={s.p}>
          Estos servicios de terceros procesan los datos según sus propias políticas de privacidad; Total Stock
          solo transmite la información estrictamente necesaria para que la integración funcione (por ejemplo,
          nombre y stock de un producto, o el detalle de un pedido para descontar inventario).
        </p>

        <h2 style={s.h2}>3. Para qué usamos los datos</h2>
        <ul style={s.ul}>
          <li>Operar las funciones de la plataforma: ventas, stock, facturación, reportes.</li>
          <li>Mantener sincronizado el stock entre canales de venta (local, Tienda Nube, Mercado Libre).</li>
          <li>Emitir comprobantes válidos ante ARCA cuando el comercio tiene la facturación electrónica activada.</li>
          <li>Comunicarnos con el comercio por soporte técnico o novedades del servicio.</li>
        </ul>
        <p style={s.p}>No vendemos ni compartimos datos de comercios o de sus clientes con fines publicitarios de terceros.</p>

        <h2 style={s.h2}>4. Almacenamiento y seguridad</h2>
        <p style={s.p}>
          Los datos se almacenan en una base de datos PostgreSQL alojada en infraestructura en la nube, con
          conexión cifrada (HTTPS/SSL) entre el navegador, la aplicación y la base de datos. El acceso a cada
          cuenta requiere autenticación con usuario y contraseña.
        </p>

        <h2 style={s.h2}>5. Retención y eliminación de datos</h2>
        <p style={s.p}>
          Conservamos los datos mientras la cuenta del comercio esté activa. Un comercio puede solicitar la
          eliminación de su cuenta y sus datos, o la desconexión de cualquier integración (Tienda Nube, Mercado
          Libre), escribiendo a <a href="mailto:info@totalstock.com.ar" style={s.link}>info@totalstock.com.ar</a>.
          Al desinstalar la integración con Tienda Nube, se elimina el token de acceso asociado y dejan de
          registrarse los webhooks correspondientes.
        </p>

        <h2 style={s.h2}>6. Contacto</h2>
        <p style={s.p}>
          Ante cualquier consulta sobre esta política o sobre el tratamiento de datos, podés escribirnos a{' '}
          <a href="mailto:info@totalstock.com.ar" style={s.link}>info@totalstock.com.ar</a>.
        </p>

        <Link to="/" style={s.backLink}>← Volver al inicio</Link>
      </div>
    </div>
  );
}

const s = {
  page: { minHeight: '100vh', background: '#f8fafc', fontFamily: "'Inter', 'Segoe UI', system-ui, sans-serif" },
  header: { padding: '20px 40px', borderBottom: '1px solid #e2e8f0', background: '#fff' },
  logo: { textDecoration: 'none' },
  logoImg: { height: 40, display: 'block' },
  container: { maxWidth: 720, margin: '0 auto', padding: '48px 24px 80px' },
  h1: { fontSize: 28, fontWeight: 800, color: '#1a2926', margin: '0 0 4px' },
  updated: { fontSize: 13, color: '#94a3b8', margin: '0 0 28px' },
  h2: { fontSize: 18, fontWeight: 700, color: '#1a2926', margin: '32px 0 10px' },
  p: { fontSize: 15, color: '#334155', lineHeight: 1.7, margin: '0 0 12px' },
  ul: { fontSize: 15, color: '#334155', lineHeight: 1.8, margin: '0 0 12px', paddingLeft: 22 },
  link: { color: '#3b9ede', textDecoration: 'none', fontWeight: 600 },
  backLink: { display: 'inline-block', marginTop: 32, color: '#3b9ede', textDecoration: 'none', fontWeight: 600, fontSize: 14 },
};

export default PoliticaPrivacidad;
