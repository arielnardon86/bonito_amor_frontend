import React from 'react';
import {
    faSync, faBoxOpen, faExchangeAlt, faStore,
    faTag, faShoppingCart,
} from '@fortawesome/free-solid-svg-icons';
import VerticalLanding from '../VerticalLanding';

const PAINS = [
    {
        icon: faSync,
        titulo: 'Vendés en el local y tu publicación de Mercado Libre sigue con el stock viejo',
        descripcion: 'Un cliente compra en Mercado Libre algo que ya no tenés, o al revés: vendés en el local y la publicación sigue mostrando stock que no existe.',
        solucion: 'Sincronización automática de stock en tiempo real, apenas cambia en Total Stock.',
    },
    {
        icon: faBoxOpen,
        titulo: 'Cargar cada venta de Mercado Libre a mano en tu sistema',
        descripcion: 'Tenés que copiar cada orden de Mercado Libre a mano para que tu stock y tus reportes reflejen esa venta.',
        solucion: 'Las órdenes de Mercado Libre se importan automáticamente como ventas y descuentan el stock solas.',
    },
    {
        icon: faExchangeAlt,
        titulo: 'Actualizar precios en dos lugares distintos',
        descripcion: 'Cambiás un precio en tu sistema y te olvidás de actualizarlo también en la publicación de Mercado Libre.',
        solucion: 'El precio se sincroniza junto con el stock hacia tus publicaciones existentes.',
    },
    {
        icon: faStore,
        titulo: 'Manejás más de un local, cada uno con su propia cuenta de Mercado Libre',
        descripcion: 'Si tenés varias tiendas, necesitás que cada una sincronice contra su propia cuenta de Mercado Libre, no una mezclada con todas.',
        solucion: 'Cada tienda de Total Stock se conecta a su propia cuenta de Mercado Libre, de forma independiente.',
    },
];

const FEATURES = [
    { icon: faSync, titulo: 'Sincronización de stock en tiempo real', desc: 'Apenas se vende o se ajusta el stock de un producto vinculado, Total Stock actualiza la cantidad disponible en tu publicación de Mercado Libre.' },
    { icon: faTag, titulo: 'Sincronización de precio', desc: 'El precio de tus publicaciones de Mercado Libre se actualiza junto con el de tu sistema.' },
    { icon: faShoppingCart, titulo: 'Importación automática de órdenes', desc: 'Cada venta de Mercado Libre se registra automáticamente como una venta en Total Stock y descuenta el stock correspondiente.' },
    { icon: faStore, titulo: 'Una cuenta de Mercado Libre por tienda', desc: 'Si administrás varios locales, cada uno se conecta de forma independiente a su propia cuenta de Mercado Libre.' },
];

const ACLARACION = {
    titulo: '¿Qué no hace esta integración?',
    texto: 'Total Stock no crea publicaciones nuevas en Mercado Libre: sincroniza el stock y el precio de las publicaciones que ya tenés activas, e importa tus órdenes automáticamente. Para publicar un producto nuevo, se hace desde Mercado Libre; una vez publicado, Total Stock lo mantiene sincronizado.',
};

export default function IntegracionMercadoLibre() {
    return (
        <VerticalLanding
            metaTitle="Integración con Mercado Libre para gestión de stock | Total Stock"
            metaDescription="Sincronizá stock y precio de tus publicaciones de Mercado Libre en tiempo real, e importá tus órdenes automáticamente como ventas. Disponible en el plan Advanced."
            canonical="https://www.totalstock.com.ar/integraciones/mercado-libre/"
            h1="Sincronizá tu stock de Mercado Libre sin planillas ni actualizaciones manuales"
            heroSub="Total Stock actualiza el stock y el precio de tus publicaciones de Mercado Libre en tiempo real, e importa tus órdenes automáticamente como ventas."
            painsTitle="Los problemas de vender en Mercado Libre sin sincronización"
            pains={PAINS}
            featuresTitle="Cómo funciona la integración con Mercado Libre"
            features={FEATURES}
            aclaracion={ACLARACION}
            minPlanId="advanced"
            minPlanNote="No incluye integración con Mercado Libre"
        />
    );
}
