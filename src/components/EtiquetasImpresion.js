// BONITO_AMOR/frontend/src/components/EtiquetasImpresion.js
import React, { useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import JsBarcode from 'jsbarcode';

const EtiquetasImpresion = () => {
    const location = useLocation();
    const navigate = useNavigate();
    // AQUI: La variable se declara correctamente, tomando el estado de la ubicación
    const productosParaImprimir = location.state?.productosParaImprimir || [];
    const labelsRef = useRef(null);

    useEffect(() => {
        if (productosParaImprimir.length > 0 && labelsRef.current) {
            labelsRef.current.innerHTML = '';
            
            productosParaImprimir.forEach((producto) => {
                for (let i = 0; i < producto.labelQuantity; i++) {
                    const tempDiv = document.createElement('div');
                    tempDiv.className = 'label';
                    
                    const svgElement = document.createElementNS("http://www.w3.org/2000/svg", "svg");
                    try {
                        // Ajuste del código de barras para una impresión térmica más robusta
                        JsBarcode(svgElement, String(producto.codigo_barras), {
                            format: 'EAN13',
                            displayValue: true,
                            fontSize: 8, // Un tamaño de fuente que se ajusta a la impresión de recibos
                            width: 1.5, // Aumentamos el ancho de las barras para mejor legibilidad en la impresión térmica
                            height: 20,
                            margin: 0,
                            displayValue: false,
                        });
                    } catch (e) {
                        console.error('Error generando código de barras:', e);
                        tempDiv.innerHTML = `<p>Error en el código de barras</p><p>${producto.codigo_barras}</p>`;
                        labelsRef.current.appendChild(tempDiv);
                        continue;
                    }

                    tempDiv.innerHTML = `
                        <p class="product-name">${producto.nombre}</p>
                        <p class="product-talle">Talle: ${producto.talle}</p>
                        <div class="barcode-wrapper"></div>
                        <p class="price">Precio: $${parseFloat(producto.precio).toFixed(2)}</p>
                    `;
                    if (svgElement) {
                        tempDiv.querySelector('.barcode-wrapper').appendChild(svgElement);
                    }
                    
                    labelsRef.current.appendChild(tempDiv);
                }
            });
        }
    }, [productosParaImpresion]);

    const handlePrint = () => {
        window.print();
    };

    const handleGoBack = () => {
        navigate('/productos');
    };

    // AQUI: El componente utiliza la variable declarada al inicio
    if (productosParaImprimir.length === 0) {
        return (
            <div className="container" style={mobileStyles.noLabelsContainer}>
                <h1>No hay etiquetas para imprimir.</h1>
                <button onClick={handleGoBack} style={mobileStyles.backButton}>Volver a Gestión de Productos</button>
            </div>
        );
    }

    return (
        <div className="container" style={mobileStyles.labelsContainer}>
            <div className="no-print" style={mobileStyles.printControls}>
                <button onClick={handleGoBack} style={mobileStyles.backButton}>Volver</button>
                <button onClick={handlePrint} style={mobileStyles.printButton}>Imprimir</button>
            </div>

            <div className="label-container" ref={labelsRef}>
                {/* Las etiquetas se renderizarán aquí */}
            </div>

            <style>
                {`
                    body {
                        margin: 0;
                        padding: 0;
                        -webkit-print-color-adjust: exact;
                    }

                    .label-container {
                        display: flex;
                        flex-wrap: wrap;
                        justify-content: flex-start;
                        align-items: flex-start;
                        width: 72mm; 
                        margin: 0 auto; 
                        box-sizing: border-box;
                    }

                    .label {
                        width: 55mm;
                        height: 49mm; 
                        padding: 2mm;
                        display: inline-block;
                        text-align: center;
                        page-break-before: auto;
                        page-break-after: always;
                        page-break-inside: avoid;
                        box-sizing: border-box;
                        vertical-align: top;
                        overflow: hidden;
                        margin: 0 auto;
                    }

                    .label p {
                        margin: 0;
                        font-size: 2mm;
                        line-height: 1.2;
                        white-space: nowrap;
                        overflow: hidden;
                        text-overflow: ellipsis;
                        max-width: 100%;
                        font-weight: bold;
                        color: #000;
                        -webkit-font-smoothing: none;
                    }
                    .label .product-name {
                        font-weight: bold;
                        font-size: 2.5mm;
                    }
                    .label .barcode-wrapper {
                        margin-top: 2px;
                        margin-bottom: 2px;
                    }
                    .label .price {
                        font-weight: bold;
                        font-size: 3mm;
                        margin-top: 2px;
                    }
                    @media print {
                        .no-print {
                            display: none !important;
                        }
                        
                        body, html {
                            margin: 0;
                            padding: 0;
                        }

                        @page { 
                            margin: 0;
                            @top-left { content: none; }
                            @top-center { content: none; }
                            @top-right { content: none; }
                            @bottom-left { content: none; }
                            @bottom-center { content: none; }
                            @bottom-right { content: none; }
                        }
                    }
                `}
            </style>
        </div>
    );
};

// Se movieron los estilos en línea a un objeto para mejor manejo.
const mobileStyles = {
    noLabelsContainer: {
        textAlign: 'center', 
        marginTop: '50px' 
    },
    labelsContainer: {
        padding: '20px', 
        fontFamily: 'Arial, sans-serif' 
    },
    printControls: {
        display: 'flex', 
        justifyContent: 'center', 
        gap: '10px', 
        marginBottom: '20px'
    },
    backButton: {
        padding: '10px 20px', 
        cursor: 'pointer', 
        border: '1px solid #ccc', 
        borderRadius: '5px', 
        backgroundColor: '#f0f0f0'
    },
    printButton: {
        padding: '10px 20px', 
        cursor: 'pointer', 
        border: 'none', 
        borderRadius: '5px', 
        backgroundColor: '#28a745', 
        color: 'white'
    },
};


export default EtiquetasImpresion;