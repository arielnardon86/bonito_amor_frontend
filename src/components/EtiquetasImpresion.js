// BONITO_AMOR/frontend/src/components/EtiquetasImpresion.js
import React, { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import JsBarcode from 'jsbarcode';

function EtiquetasImpresion() {
    const location = useLocation();
    const productosParaImprimir = location.state?.productosParaImprimir || [];

    useEffect(() => {
        if (productosParaImprimir.length > 0) {
            // Este código se ejecuta una vez que la página se carga
            // Genera y muestra las etiquetas para la impresión automática
            
            const labelsToRender = productosParaImprimir.map((producto) => {
                const svgContainer = document.createElement('div');
                JsBarcode(svgContainer, producto.codigo_barras, {
                    format: 'EAN13',
                    displayValue: true,
                    fontSize: 12,
                    width: 1,
                    height: 30
                });

                return `
                    <div class="label">
                        <p><strong>${producto.nombre}</strong></p>
                        <p>Talle: ${producto.talle}</p>
                        <div class="barcode-wrapper">
                            ${svgContainer.innerHTML}
                        </div>
                        <p>Precio: $${parseFloat(producto.precio).toFixed(2)}</p>
                    </div>
                `;
            }).join('');

            const printableContent = `
                <html>
                <head>
                    <title>Etiquetas</title>
                    <style>
                        @page { size: 72mm auto; margin: 0; }
                        body { font-family: Arial, sans-serif; margin: 0; padding: 0; }
                        .label-container { display: flex; flex-wrap: wrap; width: 72mm; box-sizing: border-box; }
                        .label { padding: 2mm; margin-bottom: 2mm; display: inline-block; width: 72mm; text-align: center; font-size: 10px; page-break-inside: avoid; box-sizing: border-box; vertical-align: top; overflow: hidden; }
                        .label p { margin: 0; font-size: 8px; line-height: 1; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 100%; }
                        .label .barcode-wrapper { margin-top: 2px; margin-bottom: 2px; }
                        .label .price { font-weight: bold; font-size: 10px; margin-top: 2px; }
                        @media print {
                          body { margin: 0; padding: 0; }
                          .label-container { width: 100%; display: block; }
                          .label { width: 100%; margin-left: 0; margin-right: 0; }
                        }
                    </style>
                </head>
                <body onload="window.print(); window.close();">
                    <div class="label-container">${labelsToRender}</div>
                </body>
                </html>
            `;
            
            const printWindow = window.open('', '', 'height=600,width=800');
            printWindow.document.write(printableContent);
            printWindow.document.close();
        }
    }, [productosParaImprimir]);

    return (
        <div>
            <h1>Preparando etiquetas para imprimir...</h1>
            <p>Por favor, espere mientras se abre el diálogo de impresión.</p>
        </div>
    );
}

export default EtiquetasImpresion;