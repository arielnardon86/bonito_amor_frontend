// BONITO_AMOR/frontend/src/components/EtiquetasImpresion.js
import React, { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import JsBarcode from 'jsbarcode';
import { formatearMonto } from '../utils/formatearMonto';

const TIPO_IMPRESION_STORAGE_KEY = 'etiquetas_tipo_impresora';

const EtiquetasImpresion = () => {
    const location = useLocation();
    const navigate = useNavigate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
    const productosParaImprimir = location.state?.productosParaImprimir || [];
    const labelsRef = useRef(null);
    const [tipoImpresion, setTipoImpresion] = useState(
        () => localStorage.getItem(TIPO_IMPRESION_STORAGE_KEY) || 'estandar'
    );

    const handleTipoImpresionChange = (e) => {
        const valor = e.target.value;
        setTipoImpresion(valor);
        localStorage.setItem(TIPO_IMPRESION_STORAGE_KEY, valor);
    };

    useEffect(() => {
        if (productosParaImprimir.length > 0 && labelsRef.current) {
            labelsRef.current.innerHTML = '';

            const esTermica = tipoImpresion === 'xprinter_39x20';

            const truncate = (str, max) =>
                str && str.length > max ? str.slice(0, max) + '…' : (str || '');

            productosParaImprimir.forEach((producto) => {
                if (!producto || (!producto.id && !producto.nombre)) return;
                const codigoBarras = producto.codigo_barras && String(producto.codigo_barras).trim()
                    ? String(producto.codigo_barras).trim()
                    : `PROD-${producto.id || 'N/A'}`;
                const isEAN13 = /^\d{12,13}$/.test(codigoBarras);

                const nombreMostrado = truncate(producto.nombre, esTermica ? 16 : 24);
                const detalleMostrado = producto.variante_detalle
                    ? truncate(producto.variante_detalle, esTermica ? 14 : 20)
                    : '';

                for (let i = 0; i < producto.labelQuantity; i++) {
                    const tempDiv = document.createElement('div');
                    tempDiv.className = 'label';

                    const svgElement = document.createElementNS("http://www.w3.org/2000/svg", "svg");
                    try {
                        JsBarcode(svgElement, codigoBarras, {
                            format: isEAN13 ? 'EAN13' : 'CODE128',
                            displayValue: false,
                            fontSize: 8,
                            width: esTermica ? 2 : 3,
                            height: esTermica ? 28 : 60,
                            margin: 0,
                        });
                    } catch (e) {
                        console.error('Error generando código de barras:', e);
                        tempDiv.innerHTML = `<p>Sin código de barras</p><p class="product-name">${nombreMostrado}</p><p class="price">${formatearMonto(producto.precio)}</p>`;
                        labelsRef.current.appendChild(tempDiv);
                        continue;
                    }

                    tempDiv.innerHTML = `
                        <p class="product-name">${nombreMostrado}</p>
                        ${detalleMostrado ? `<p class="variant-detail">${detalleMostrado}</p>` : ''}
                        <div class="barcode-wrapper"></div>
                        <p class="price">${formatearMonto(producto.precio)}</p>
                    `;
                    if (svgElement) {
                        tempDiv.querySelector('.barcode-wrapper').appendChild(svgElement);
                    }

                    labelsRef.current.appendChild(tempDiv);
                }
            });
        }
    }, [productosParaImprimir, tipoImpresion]);

    const handlePrint = () => {
        window.print();
    };

    const handleGoBack = () => {
        navigate('/productos');
    };

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
                <select
                    value={tipoImpresion}
                    onChange={handleTipoImpresionChange}
                    style={mobileStyles.printerSelect}
                >
                    <option value="estandar">Impresora estándar (actual)</option>
                    <option value="xprinter_39x20">Térmica Xprinter XP-410B (rollo 39x20mm)</option>
                </select>
                <button onClick={handlePrint} style={mobileStyles.printButton}>Imprimir</button>
            </div>

            <div
                className={`label-container ${tipoImpresion === 'xprinter_39x20' ? 'layout-termica' : 'layout-estandar'}`}
                ref={labelsRef}
            >
                {/* Las etiquetas se renderizarán aquí */}
            </div>

            <style>
                {`
                    body {
                        margin: 0;
                        padding: 0;
                        -webkit-print-color-adjust: exact;
                    }

                    /* Layout "estandar": collage de etiquetas cuadradas 37x37mm (comportamiento histórico) */
                    .label-container.layout-estandar {
                        display: flex;
                        flex-wrap: wrap;
                        justify-content: center;
                        align-items: flex-start;
                        width: 72mm;
                        margin: 0 auto;
                        box-sizing: border-box;
                    }

                    .label-container.layout-estandar .label {
                        width: 37mm;
                        height: 37mm;
                        padding: 1mm 2mm;
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

                    .label-container.layout-estandar .label p {
                        margin: 0;
                        font-size: 2mm;
                        line-height: 1.1;
                        white-space: nowrap;
                        overflow: hidden;
                        text-overflow: ellipsis;
                        max-width: 100%;
                        font-weight: bold;
                        color: #000;
                        -webkit-font-smoothing: none;
                    }
                    .label-container.layout-estandar .label .product-name {
                        font-weight: bold;
                        font-size: 2.2mm;
                    }
                    .label-container.layout-estandar .label .variant-detail {
                        font-weight: 600;
                        font-size: 2mm;
                        margin-top: 1px;
                    }
                    .label-container.layout-estandar .label .barcode-wrapper {
                        margin-top: 2px;
                        margin-bottom: 2px;
                        padding: 0 1mm;
                    }
                    .label-container.layout-estandar .label .price {
                        font-weight: bold;
                        font-size: 3.6mm;
                        margin-top: 2px;
                    }

                    /* Layout "termica": una etiqueta por página, tamaño exacto del rollo de la Xprinter XP-410B (39x20mm) */
                    .label-container.layout-termica {
                        width: 39mm;
                        margin: 0 auto;
                        box-sizing: border-box;
                    }

                    .label-container.layout-termica .label {
                        width: 39mm;
                        height: 20mm;
                        padding: 0.5mm 1mm;
                        text-align: center;
                        page-break-before: auto;
                        page-break-after: always;
                        page-break-inside: avoid;
                        box-sizing: border-box;
                        overflow: hidden;
                        margin: 0 auto;
                        display: flex;
                        flex-direction: column;
                        justify-content: center;
                        align-items: center;
                    }

                    .label-container.layout-termica .label p {
                        margin: 0;
                        font-size: 1.8mm;
                        line-height: 1.05;
                        white-space: nowrap;
                        overflow: hidden;
                        text-overflow: ellipsis;
                        max-width: 100%;
                        font-weight: bold;
                        color: #000;
                        -webkit-font-smoothing: none;
                    }
                    .label-container.layout-termica .label .product-name {
                        font-weight: bold;
                        font-size: 1.9mm;
                    }
                    .label-container.layout-termica .label .variant-detail {
                        font-weight: 600;
                        font-size: 1.7mm;
                        margin-top: 0.3mm;
                    }
                    .label-container.layout-termica .label .barcode-wrapper {
                        margin-top: 0.5mm;
                        margin-bottom: 0.5mm;
                    }
                    .label-container.layout-termica .label .price {
                        font-weight: bold;
                        font-size: 3.2mm;
                        margin-top: 0.3mm;
                    }

                    /* Aseguramos que el SVG se ajuste bien al contenedor, en ambos layouts */
                    .label .barcode-wrapper svg {
                        max-width: 100%;
                        height: auto;
                        display: block;
                        margin: 0 auto;
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
                            ${tipoImpresion === 'xprinter_39x20' ? 'size: 39mm 20mm;' : ''}
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
    printerSelect: {
        padding: '10px 12px',
        borderRadius: '5px',
        border: '1px solid #ccc',
        fontSize: '14px',
    },
    printButton: {
        padding: '10px 20px',
        cursor: 'pointer',
        border: 'none',
        borderRadius: '5px',
        backgroundColor: '#5dc87a',
        color: 'white'
    },
};

export default EtiquetasImpresion;
