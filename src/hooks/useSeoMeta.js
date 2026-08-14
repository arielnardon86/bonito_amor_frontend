import { useEffect } from 'react';

const DEFAULT_TITLE = 'Total Stock - Sistema de Gestión y Punto de Venta para Comercios';
const DEFAULT_DESCRIPTION = 'Sistema de gestión para comercios: punto de venta, stock en tiempo real, facturación electrónica ARCA e integración con Mercado Libre y Tienda Nube. Probalo gratis 7 días.';
const DEFAULT_CANONICAL = 'https://www.totalstock.com.ar/';

function setMeta(selector, attr, value) {
  const el = document.querySelector(selector);
  if (el) el.setAttribute(attr, value);
}

/**
 * Actualiza title/description/canonical/OG en el <head> compartido.
 * Necesario porque public/index.html es un único shell para todas las rutas:
 * sin esto, cada página nueva quedaría con el título y el canonical de la home
 * (le diría a Google que ignore esa página y use la home como "la real").
 * El prerender captura el DOM ya renderizado, así que este cambio queda
 * también en el HTML estático de cada página.
 */
export default function useSeoMeta({
  title = DEFAULT_TITLE,
  description = DEFAULT_DESCRIPTION,
  canonical = DEFAULT_CANONICAL,
} = {}) {
  useEffect(() => {
    document.title = title;
    setMeta('meta[name="description"]', 'content', description);
    setMeta('link[rel="canonical"]', 'href', canonical);
    setMeta('meta[property="og:title"]', 'content', title);
    setMeta('meta[property="og:description"]', 'content', description);
    setMeta('meta[property="og:url"]', 'content', canonical);
    setMeta('meta[name="twitter:title"]', 'content', title);
    setMeta('meta[name="twitter:description"]', 'content', description);
  }, [title, description, canonical]);
}
