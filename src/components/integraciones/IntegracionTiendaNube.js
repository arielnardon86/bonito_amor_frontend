import React from 'react';
import {
    faSync, faBoxOpen, faShoppingCart, faFileInvoice, faStore,
} from '@fortawesome/free-solid-svg-icons';
import VerticalLanding from '../VerticalLanding';

const PAINS = [
    {
        icon: faStore,
        titulo: 'Publicar cada producto nuevo a mano en tu tienda online',
        descripcion: 'Cargar un producto en Total Stock y después volver a cargarlo en Tienda Nube, con sus variantes, es doble trabajo.',
        solucion: 'Publicá los productos pendientes en Tienda Nube directamente desde Total Stock, con sus variantes agrupadas.',
    },
    {
        icon: faSync,
        titulo: 'El stock de tu tienda online no coincide con el del local',
        descripcion: 'Vendés en el local y tu tienda en Tienda Nube sigue mostrando stock que ya no existe.',
        solucion: 'Sincronización automática de stock hacia Tienda Nube ante cada venta o ajuste.',
    },
    {
        icon: faBoxOpen,
        titulo: 'Cargar a mano cada venta de tu tienda online',
        descripcion: 'Cada pedido pago en Tienda Nube hay que copiarlo a mano para que aparezca en tus ventas y se descuente el stock.',
        solucion: 'Las órdenes pagas se importan solas como venta y descuentan el stock automáticamente.',
    },
    {
        icon: faFileInvoice,
        titulo: 'Facturar cada venta online por separado',
        descripcion: 'Además de vender online, tenés que facturar cada pedido a mano.',
        solucion: 'Facturación electrónica automática opcional para cada venta de Tienda Nube.',
    },
];

const FEATURES = [
    { icon: faStore, titulo: 'Publicá productos en Tienda Nube', desc: 'Publicá desde Total Stock los productos que todavía no están en tu tienda online, agrupando sus variantes bajo un mismo producto.' },
    { icon: faSync, titulo: 'Sincronización de stock', desc: 'El stock se actualiza en Tienda Nube automáticamente ante cada venta o ajuste en Total Stock.' },
    { icon: faShoppingCart, titulo: 'Importación automática de órdenes', desc: 'Cada pedido pago en Tienda Nube se registra como venta en Total Stock y descuenta el stock correspondiente.' },
    { icon: faFileInvoice, titulo: 'Facturación automática (opcional)', desc: 'Activá la facturación electrónica automática para que cada venta de Tienda Nube se facture sola.' },
];

const ACLARACION = {
    titulo: '¿Cómo sincroniza exactamente el stock?',
    texto: 'La sincronización es automática hacia Tienda Nube apenas cambia el stock en Total Stock, y las órdenes llegan por webhook cuando se pagan. Hoy la integración maneja el stock total de la tienda: no distingue depósito y local como ubicaciones separadas dentro de Tienda Nube.',
};

export default function IntegracionTiendaNube() {
    return (
        <VerticalLanding
            metaTitle="Integración con Tienda Nube para gestión de stock | Total Stock"
            metaDescription="Publicá productos en Tienda Nube, sincronizá stock en tiempo real e importá tus órdenes automáticamente como ventas, con facturación electrónica opcional. Disponible en el plan Advanced."
            canonical="https://www.totalstock.com.ar/integraciones/tienda-nube/"
            h1="Publicá y sincronizá tu tienda en Tienda Nube sin doble carga"
            heroSub="Publicá productos en Tienda Nube desde Total Stock, mantené el stock sincronizado en tiempo real e importá tus órdenes automáticamente como ventas."
            painsTitle="Los problemas de vender en Tienda Nube sin sincronización"
            pains={PAINS}
            featuresTitle="Cómo funciona la integración con Tienda Nube"
            features={FEATURES}
            aclaracion={ACLARACION}
            minPlanId="advanced"
            minPlanNote="No incluye integración con Tienda Nube"
        />
    );
}
