import React from 'react';
import {
    faTshirt, faSync, faExchangeAlt, faClock,
    faShoppingCart, faGlobe, faFileInvoice, faPrint,
} from '@fortawesome/free-solid-svg-icons';
import VerticalLanding from '../VerticalLanding';

const PAINS = [
    {
        icon: faTshirt,
        titulo: 'No sabés qué talles te quedan',
        descripcion: 'Vendés un buzo y no sabés si queda el talle M en gris hasta que vas físicamente al perchero.',
        solucion: 'Stock por variante (talle, color o la combinación de ambos) en tiempo real, visible desde la caja.',
    },
    {
        icon: faSync,
        titulo: 'Tu local y tu tienda online no cuadran',
        descripcion: 'Publicás una prenda en Mercado Libre o Tienda Nube y el stock del local no se actualiza solo.',
        solucion: 'Sincronización automática de stock entre canales.',
    },
    {
        icon: faExchangeAlt,
        titulo: 'Los cambios de talle te comen el día',
        descripcion: 'El cliente vuelve a cambiar una prenda por otro talle y armar la nota de crédito a mano es un lío.',
        solucion: 'Cambios y devoluciones con nota de crédito y ajuste de stock automático.',
    },
    {
        icon: faClock,
        titulo: 'Cerrar la caja te lleva horas',
        descripcion: 'Entre ventas, cambios y liquidaciones, cuadrar la caja a mano al final del día es un dolor de cabeza.',
        solucion: 'Cierre de caja automático y reportes de ventas al instante.',
    },
];

const FEATURES = [
    { icon: faTshirt, titulo: 'Variantes por talle y color', desc: 'Cargá un modelo una sola vez y administrá el stock de cada variante (talle, color o la combinación de ambos) por separado, con precio y código de barras propios.' },
    { icon: faShoppingCart, titulo: 'Punto de venta ágil', desc: 'Cobrá rápido con múltiples métodos de pago y el carrito de cada venta bajo control.' },
    { icon: faExchangeAlt, titulo: 'Cambios y devoluciones', desc: 'Gestioná cambios de talle o color con nota de crédito y ajuste de stock automático.' },
    { icon: faGlobe, titulo: 'Mercado Libre y Tienda Nube', desc: 'Publicá tus prendas y sincronizá stock entre tu local y tus canales online.' },
    { icon: faFileInvoice, titulo: 'Factura electrónica ARCA', desc: 'Emití facturas A, B y C sin salir del sistema.' },
    { icon: faPrint, titulo: 'Etiquetas con código de barras', desc: 'Imprimí etiquetas por talle y color, compatibles con impresoras térmicas.' },
];

const TESTIMONIOS = [
    { src: '/clientes/bonito-amor.jpeg', nombre: 'Bonito Amor' },
    { src: '/clientes/acces.jpg', nombre: 'Acces' },
    { src: '/clientes/eria.jpg', nombre: 'Eria' },
    { src: '/clientes/euforicas.png', nombre: 'Eufóricas' },
    { src: '/clientes/las-cholitas.jpg', nombre: 'Las Cholitas' },
];

export default function SistemaParaIndumentaria() {
    return (
        <VerticalLanding
            metaTitle="Sistema de gestión para tiendas de ropa | Total Stock"
            metaDescription="Sistema de gestión para tiendas de ropa: stock por talle y color, punto de venta, facturación electrónica ARCA y sincronización con Mercado Libre y Tienda Nube."
            canonical="https://www.totalstock.com.ar/sistema-para-indumentaria/"
            h1="Gestioná tu tienda de ropa sin perder el control del stock"
            heroSub="Controlá stock por talle y color, vendé rápido en el mostrador, facturá con ARCA y sincronizá tu tienda online. Todo en un mismo sistema pensado para indumentaria."
            painsTitle="Los problemas de todos los días en una tienda de ropa"
            pains={PAINS}
            featuresTitle="Todo lo que necesita una tienda de ropa"
            features={FEATURES}
            testimoniosTitle="Tiendas de ropa que ya usan Total Stock"
            testimonios={TESTIMONIOS}
        />
    );
}
