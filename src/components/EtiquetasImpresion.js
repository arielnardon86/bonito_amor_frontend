// BONITO_AMOR/frontend/src/components/EtiquetasImpresion.js
import React from 'react';
import Barcode from 'react-barcode';

function EtiquetasImpresion({ productosParaImprimir }) {
  // Estilos para la impresión
  const printStyles = `
    @page {
      size: 72mm auto; /* Ancho de 72mm, alto automático */
      margin: 0; /* Márgenes a cero para aprovechar todo el ancho del rollo */
    }
    body {
      font-family: Arial, sans-serif;
      margin: 0;
      padding: 0;
    }
    .label-container {
      display: flex;
      flex-wrap: wrap;
      /* No se usa 'gap' en el contenedor principal para controlar mejor el espaciado
         entre etiquetas individuales con su propio margen. */
      justify-content: flex-start;
      align-items: flex-start;
      width: 72mm; /* Asegura que el contenedor se ajuste al ancho del rollo */
      box-sizing: border-box;
    }
    .label {
      /* border: 0.5px solid #eee; */ /* Borde muy sutil para visualización en pantalla, se puede quitar en impresión final */
      padding: 2mm;           /* Pequeño padding interno */
      margin: 0;              /* Sin margen en el div de la etiqueta, el espaciado se maneja con el flujo */
      display: inline-block;  /* Para que las etiquetas se coloquen una al lado de la otra */
      width: 72mm;            /* Ancho del rollo de la impresora térmica (72mm) */
      height: auto;           /* Alto automático según el contenido */
      min-height: 25mm;       /* Altura mínima para asegurar espacio */
      text-align: center;
      font-size: 10px;         /* Fuente más pequeña para etiquetas */
      page-break-inside: avoid; /* Evita que una etiqueta se corte entre páginas */
      box-sizing: border-box;  /* Incluir padding y borde en el ancho/alto */
      vertical-align: top;     /* Asegura que las etiquetas se alineen correctamente */
      overflow: hidden;       /* Oculta contenido que se desborde */
      /* Añadir un margen inferior para separar cada etiqueta si son continuas */
      margin-bottom: 2mm; 
    }
    .label:last-child {
        margin-bottom: 0; /* No hay margen inferior para la última etiqueta */
    }
    .label p {
      margin: 0;
      font-size: 8px;
      line-height: 1;
      white-space: nowrap; /* Evita saltos de línea en el nombre */
      overflow: hidden; /* Oculta el texto que se desborda */
      text-overflow: ellipsis; /* Añade puntos suspensivos si el texto es muy largo */
      max-width: 100%; /* Asegura que el texto no se desborde */
    }
    .label .barcode-wrapper {
      margin-top: 2px;
      margin-bottom: 2px;
      display: flex;
      justify-content: center;
      align-items: center;
      flex-grow: 1; /* Permite que el código de barras ocupe el espacio disponible */
    }
    .label .barcode-wrapper svg {
      width: 100%; /* Ajusta el ancho del SVG al contenedor */
      height: auto;
    }
    .label .price {
      font-weight: bold;
      font-size: 10px;
      margin-top: 2px;
    }
    /* Ocultar elementos que no son para impresión */
    @media print {
      button {
        display: none !important;
      }
      /* Asegurarse de que el body no tenga márgenes en la impresión */
      body {
        margin: 0;
        padding: 0;
      }
      /* Forzar que el contenedor de etiquetas use el ancho completo de la página de impresión */
      .label-container {
        width: 100%;
        display: block; /* Cambiar a block para que cada etiqueta ocupe su propia línea si es necesario */
      }
      .label {
        width: 100%; /* La etiqueta toma el 100% del ancho disponible en la página de impresión */
        margin-left: 0;
        margin-right: 0;
      }
    }
  `;

  // Prepara las etiquetas para imprimir, duplicando según labelQuantity
  const labelsToRender = [];
  productosParaImprimir.forEach(item => {
    const product = item; // El objeto ya es el producto con labelQuantity
    const quantity = product.labelQuantity || 1; // Asegura al menos 1 etiqueta

    for (let i = 0; i < quantity; i++) {
      // Depuración: Verifica el valor de codigo_barras
      console.log("Valor para código de barras:", product.codigo_barras);

      labelsToRender.push(
        <div key={`${product.id}-${i}`} className="label">
          <p style={{ fontWeight: 'bold', fontSize: '11px', marginBottom: '1mm' }}>{product.nombre}</p>
          {product.talle && <p style={{ fontSize: '9px', marginBottom: '1mm', color: '#555' }}>Talle: {product.talle}</p>}
          <div className="barcode-wrapper">
            {/* Asegúrate de que product.codigo_barras no sea null/undefined antes de usarlo */}
            {product.codigo_barras ? (
              <Barcode
                value={String(product.codigo_barras)} // Asegura que el valor sea una cadena
                format="CODE128" // ¡Cambiado a CODE128 para compatibilidad con UUIDs!
                width={1.2} // Ajusta el grosor de las barras. Puedes reducirlo (ej. 1.0, 0.8) si el código es muy ancho para 72mm.
                height={30} // Ajusta la altura del código de barras para ahorrar espacio
                displayValue={true} // Mostrar el número debajo del código de barras
                fontSize={9} // Tamaño de la fuente del número
                textMargin={2} // Margen entre el código y el texto
                background="#ffffff"
                lineColor="#000000"
              />
            ) : (
              <span style={{ fontSize: '8px', color: '#888' }}>Sin código</span>
            )}
          </div>
          <p className="price" style={{ marginTop: '1mm', fontSize: '13px', fontWeight: 'bold' }}>${parseFloat(product.precio_venta).toFixed(2)}</p>
        </div>
      );
    }
  });

  return (
    <div>
      <style>{printStyles}</style> {/* Inyecta los estilos de impresión */}
      <div className="label-container">
        {labelsToRender}
      </div>
    </div>
  );
}

export default EtiquetasImpresion;
