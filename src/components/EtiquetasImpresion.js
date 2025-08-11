// BONITO_AMOR/frontend/src/components/EtiquetasImpresion.js
import React, { useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import JsBarcode from 'jsbarcode';

const EtiquetasImpresion = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const productosParaImprimir = location.state?.productosParaImprimir || [];
    const printRef = useRef(null);

    useEffect(() => {
        if (productosParaImprimir.length > 0 && printRef.current) {
            // Elimina cualquier contenido previo antes de renderizar
            printRef.current.innerHTML = '';
            
            productosParaImprimir.forEach((producto) => {
                // Itera para crear el número correcto de etiquetas
                for (let i = 0; i < producto.labelQuantity; i++) {
                    const tempDiv = document.createElement('div');
                    tempDiv.className = 'label';
                    
                    const svgElement = document.createElementNS("http://www.w3.org/2000/svg", "svg");
                    try {
                        JsBarcode(svgElement, producto.codigo_barras, {
                            format: 'EAN13',
                            displayValue: true,
                            fontSize: 12,
                            width: 1,
                            height: 30
                        });
                    } catch (e) {
                        console.error('Error generando código de barras:', e);
                        // En caso de error, muestra un mensaje en la etiqueta
                        tempDiv.innerHTML = `<p>Error en el código de barras</p><p>${producto.codigo_barras}</p>`;
                        printRef.current.appendChild(tempDiv);
                        continue;
                    }

                    tempDiv.innerHTML = `
                        <p><strong>${producto.nombre}</strong></p>
                        <p>Talle: ${producto.talle}</p>
                        <div class="barcode-wrapper"></div>
                        <p>Precio: $${parseFloat(producto.precio).toFixed(2)}</p>
                    `;
                    if (svgElement) {
                        tempDiv.querySelector('.barcode-wrapper').appendChild(svgElement);
                    }
                    
                    printRef.current.appendChild(tempDiv);
                }
            });
        }
    }, [productosParaImprimir]);

    const handlePrint = () => {
        window.print();
    };

    const handleGoBack = () => {
        navigate('/productos');
    };

    if (productosParaImprimir.length === 0) {
        return (
            <div className="container">
                <h1>No hay etiquetas para imprimir.</h1>
                <button onClick={handleGoBack} className="btn-back">Volver a Gestión de Productos</button>
            </div>
        );
    }

    return (
        <div className="container" style={{ padding: '20px', fontFamily: 'Arial, sans-serif' }}>
            <h1 style={{ textAlign: 'center', color: '#333' }}>Preparación de Etiquetas</h1>
            <p style={{ textAlign: 'center', color: '#666' }}>
                Haga clic en 'Imprimir' para abrir el diálogo de impresión o 'Volver' para regresar a la página anterior.
            </p>
            <div style={{ display: 'flex', justifyContent: 'center', gap: '10px', marginBottom: '20px' }} className="no-print">
                <button onClick={handleGoBack} style={{ padding: '10px 20px', cursor: 'pointer', border: '1px solid #ccc', borderRadius: '5px', backgroundColor: '#f0f0f0' }}>Volver</button>
                <button onClick={handlePrint} style={{ padding: '10px 20px', cursor: 'pointer', border: 'none', borderRadius: '5px', backgroundColor: '#28a745', color: 'white' }}>Imprimir</button>
            </div>

            {/* Este es el contenedor que se imprimirá */}
            <div className="label-container" ref={printRef}>
                {/* Aquí se renderizarán las etiquetas */}
            </div>

            <style>
                {`
                    .label-container {
                        display: flex;
                        flex-wrap: wrap;
                        justify-content: flex-start;
                        align-items: flex-start;
                        width: 72mm;
                        box-sizing: border-box;
                    }
                    .label {
                        padding: 2mm;
                        margin-bottom: 2mm;
                        display: inline-block;
                        width: 72mm;
                        text-align: center;
                        font-size: 10px;
                        page-break-inside: avoid;
                        box-sizing: border-box;
                        vertical-align: top;
                        overflow: hidden;
                    }
                    .label p {
                        margin: 0;
                        font-size: 8px;
                        line-height: 1;
                        white-space: nowrap;
                        overflow: hidden;
                        text-overflow: ellipsis;
                        max-width: 100%;
                    }
                    .label .barcode-wrapper {
                        margin-top: 2px;
                        margin-bottom: 2px;
                    }
                    @media print {
                        body {
                            margin: 0;
                            padding: 0;
                            -webkit-print-color-adjust: exact;
                        }
                        .no-print, .container h1, .container p {
                            display: none !important;
                        }
                        .label-container {
                            width: 100%;
                            display: block;
                        }
                        .label {
                            width: 100%;
                            margin-left: 0;
                            margin-right: 0;
                        }
                    }
                `}
            </style>
        </div>
    );
};

export default EtiquetasImpresion;