import React from 'react';
import {
    faTshirt, faSync, faExchangeAlt, faClock,
    faShoppingCart, faGlobe, faFileInvoice, faPrint,
} from '@fortawesome/free-solid-svg-icons';
import VerticalLanding from '../VerticalLanding';

const PAINS = [
    {
        icon: faTshirt,
        titulo: 'No sabés qué talles de camiseta te quedan',
        descripcion: 'Se acerca el partido, vendés una camiseta y no sabés si te queda ese talle o numeración hasta ir a buscarla.',
        solucion: 'Stock por variante (talle, numeración o modelo) en tiempo real, visible desde la caja.',
    },
    {
        icon: faClock,
        titulo: 'Los días de partido te desbordan en la caja',
        descripcion: 'Picos de venta antes de un partido o torneo, y cerrar la caja al final del día se vuelve un caos.',
        solucion: 'Punto de venta ágil con cierre de caja automático.',
    },
    {
        icon: faSync,
        titulo: 'Tu local y tu tienda online no cuadran',
        descripcion: 'Vendés camisetas y merchandising por Mercado Libre o Tienda Nube y el stock del local no se actualiza solo.',
        solucion: 'Sincronización automática de stock entre canales.',
    },
    {
        icon: faExchangeAlt,
        titulo: 'Los cambios de talle te comen el día',
        descripcion: 'Un cliente vuelve a cambiar una camiseta por otro talle y armar la nota de crédito a mano es un lío.',
        solucion: 'Cambios y devoluciones con nota de crédito y ajuste de stock automático.',
    },
];

const FEATURES = [
    { icon: faTshirt, titulo: 'Variantes por talle y modelo', desc: 'Cargá una camiseta o modelo una sola vez y administrá el stock de cada variante por separado, con precio y código de barras propios.' },
    { icon: faShoppingCart, titulo: 'Punto de venta ágil', desc: 'Cobrá rápido con múltiples métodos de pago, ideal para los picos de venta antes de un partido.' },
    { icon: faExchangeAlt, titulo: 'Cambios y devoluciones', desc: 'Gestioná cambios de talle con nota de crédito y ajuste de stock automático.' },
    { icon: faGlobe, titulo: 'Mercado Libre y Tienda Nube', desc: 'Publicá camisetas y merchandising en Tienda Nube, y sincronizá stock automáticamente con Mercado Libre.' },
    { icon: faFileInvoice, titulo: 'Factura electrónica ARCA', desc: 'Emití facturas A, B y C sin salir del sistema.' },
    { icon: faPrint, titulo: 'Etiquetas con código de barras', desc: 'Imprimí etiquetas por variante, compatibles con impresoras térmicas.' },
];

const TESTIMONIOS = [
    { src: '/clientes/fanaticos-sport.jpg', nombre: 'Fanáticos Sport' },
    { src: '/clientes/la-pasion-del-hincha.jpeg', nombre: 'La Pasión del Hincha' },
];

export default function SistemaParaDeportes() {
    return (
        <VerticalLanding
            metaTitle="Sistema de gestión para indumentaria deportiva | Total Stock"
            metaDescription="Sistema de gestión para negocios de indumentaria deportiva y merchandising: stock por variante, punto de venta, facturación electrónica ARCA y sincronización con Mercado Libre y Tienda Nube."
            canonical="https://www.totalstock.com.ar/sistema-para-deportes/"
            h1="Gestioná tu negocio de indumentaria deportiva sin perder ventas por falta de stock"
            heroSub="Controlá stock por talle y modelo, vendé rápido en los picos antes de un partido, facturá con ARCA y sincronizá tu tienda online. Todo en un mismo sistema."
            painsTitle="Los problemas de todos los días en un negocio deportivo"
            pains={PAINS}
            featuresTitle="Todo lo que necesita un negocio de indumentaria deportiva"
            features={FEATURES}
            testimoniosTitle="Negocios de indumentaria deportiva que ya usan Total Stock"
            testimonios={TESTIMONIOS}
        />
    );
}
