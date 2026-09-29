// BONITO_AMOR/frontend/src/components/EtiquetasImpresion.js
import React, { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import axios from 'axios';
import JsBarcode from 'jsbarcode';
import { formatearMonto } from '../utils/formatearMonto';
import { useAuth } from '../AuthContext';

const TIPO_IMPRESION_STORAGE_KEY = 'etiquetas_tipo_impresora';
// Ajuste fino (en mm) de la grilla de la hoja 4x9, sumado al margen calculado por
// CSS -- las hojas adhesivas troqueladas varían de fabricación en fabricación (y
// según la impresora), así que en vez de perseguir el margen "perfecto" a ciegas
// desde fotos con regla, se lo deja calibrable por la propia tienda: imprimen una
// prueba, miden con regla cuánto falta correr la grilla, y lo cargan acá una sola
// vez (se guarda en localStorage, no hay que repetirlo en cada impresión).
const AJUSTE_HOJA4X9_STORAGE_KEY = 'etiquetas_hoja4x9_ajuste_mm';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';
const normalizeApiUrl = (url) => {
    let normalizedUrl = url;
    if (normalizedUrl.endsWith('/api/') || normalizedUrl.endsWith('/api')) {
        normalizedUrl = normalizedUrl.replace(/\/api\/?$/, '');
    }
    if (normalizedUrl.endsWith('/')) {
        normalizedUrl = normalizedUrl.slice(0, -1);
    }
    return normalizedUrl;
};
const BASE_API_ENDPOINT = normalizeApiUrl(API_BASE_URL);

const EtiquetasImpresion = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const { token, selectedStoreSlug } = useAuth();
    // eslint-disable-next-line react-hooks/exhaustive-deps
    const productosParaImprimir = location.state?.productosParaImprimir || [];
    const labelsRef = useRef(null);
    const [tipoImpresion, setTipoImpresion] = useState(
        () => localStorage.getItem(TIPO_IMPRESION_STORAGE_KEY) || 'estandar'
    );
    const [mostrarDescuento, setMostrarDescuento] = useState(false);
    const [descuentoInput, setDescuentoInput] = useState('');
    const [descuentoRedondeo, setDescuentoRedondeo] = useState(''); // '' | 'abajo' | 'arriba'
    const [ajusteHoja4x9, setAjusteHoja4x9] = useState(() => {
        try {
            const guardado = JSON.parse(localStorage.getItem(AJUSTE_HOJA4X9_STORAGE_KEY));
            if (guardado) return { x: Number(guardado.x) || 0, y: Number(guardado.y) || 0 };
        } catch { /* nada guardado todavía */ }
        // Punto de partida sugerido a partir de las fotos con regla del cliente
        // (Oxford Indumentaria): el contenido caía más abajo de lo que el margen
        // "centrado" calculado preveía -- no es una medición exacta, solo ahorra
        // el primer tanteo a ciegas.
        return { x: 0, y: 10 };
    });

    const handleTipoImpresionChange = (e) => {
        const valor = e.target.value;
        setTipoImpresion(valor);
        localStorage.setItem(TIPO_IMPRESION_STORAGE_KEY, valor);
    };

    const handleAjusteHoja4x9Change = (eje, valor) => {
        setAjusteHoja4x9(prev => {
            const nuevo = { ...prev, [eje]: valor === '' ? 0 : Number(valor) };
            localStorage.setItem(AJUSTE_HOJA4X9_STORAGE_KEY, JSON.stringify(nuevo));
            return nuevo;
        });
    };

    // Trae el % de descuento por efectivo configurado por defecto para la tienda
    // (Panel de Administración › Datos de la tienda), para no tener que tipearlo
    // cada vez. Se puede editar/desactivar acá mismo antes de imprimir.
    useEffect(() => {
        if (!token || !selectedStoreSlug) return;
        axios.get(`${BASE_API_ENDPOINT}/api/tiendas/`, {
            headers: { Authorization: `Bearer ${token}` },
            params: { nombre: selectedStoreSlug },
        }).then(({ data }) => {
            const tiendas = data.results || data;
            const tienda = Array.isArray(tiendas) ? tiendas.find(t => t.nombre === selectedStoreSlug) : tiendas;
            const pct = tienda?.descuento_efectivo_porcentaje;
            if (pct !== null && pct !== undefined) {
                setDescuentoInput(String(pct));
                setMostrarDescuento(true);
            }
            if (tienda?.descuento_efectivo_redondeo) {
                setDescuentoRedondeo(tienda.descuento_efectivo_redondeo);
            }
        }).catch(() => {});
    }, [token, selectedStoreSlug]);

    useEffect(() => {
        if (productosParaImprimir.length > 0 && labelsRef.current) {
            labelsRef.current.innerHTML = '';

            const esTermica = tipoImpresion === 'xprinter_39x20';
            const esHoja4x9 = tipoImpresion === 'hoja_4x9_36';
            const pctDescuento = mostrarDescuento ? parseFloat(descuentoInput) : NaN;
            const aplicarDescuento = !isNaN(pctDescuento) && pctDescuento > 0 && pctDescuento < 100;

            const truncate = (str, max) =>
                str && str.length > max ? str.slice(0, max) + '…' : (str || '');

            productosParaImprimir.forEach((producto) => {
                if (!producto || (!producto.id && !producto.nombre)) return;
                const codigoBarras = producto.codigo_barras && String(producto.codigo_barras).trim()
                    ? String(producto.codigo_barras).trim()
                    : `PROD-${producto.id || 'N/A'}`;
                const isEAN13 = /^\d{12,13}$/.test(codigoBarras);

                const nombreMostrado = truncate(producto.nombre, esTermica ? 16 : esHoja4x9 ? 28 : 24);
                const detalleMostrado = producto.variante_detalle
                    ? truncate(producto.variante_detalle, esTermica ? 14 : esHoja4x9 ? 24 : 20)
                    : '';

                const precioLista = parseFloat(producto.precio) || 0;
                let precioEfectivo = aplicarDescuento ? precioLista * (1 - pctDescuento / 100) : precioLista;
                // El redondeo a múltiplo de 100 solo tiene sentido para precios ya en ese
                // orden de magnitud: en precios chicos (< $100) Math.floor(precio/100)*100
                // daba $0, y Math.ceil directamente triplicaba/decuplicaba el precio real.
                if (aplicarDescuento && precioEfectivo >= 100 && descuentoRedondeo === 'abajo') {
                    precioEfectivo = Math.floor(precioEfectivo / 100) * 100;
                } else if (aplicarDescuento && precioEfectivo >= 100 && descuentoRedondeo === 'arriba') {
                    precioEfectivo = Math.ceil(precioEfectivo / 100) * 100;
                }
                const precioHtml = aplicarDescuento
                    ? `<p class="price-lista">Precio: ${formatearMonto(precioLista)}</p>
                       <div class="price-destacado-box">
                           <p class="price-destacado-label">Precio con descuento</p>
                           <p class="price">${formatearMonto(precioEfectivo)}</p>
                       </div>`
                    : `<p class="price">${formatearMonto(precioLista)}</p>`;

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
                            height: esTermica
                                ? (aplicarDescuento ? 22 : 28)
                                : esHoja4x9
                                    ? (aplicarDescuento ? 26 : 34)
                                    : (aplicarDescuento ? 48 : 60),
                            margin: 0,
                        });
                    } catch (e) {
                        console.error('Error generando código de barras:', e);
                        tempDiv.innerHTML = `<p>Sin código de barras</p><p class="product-name">${nombreMostrado}</p>${precioHtml}`;
                        labelsRef.current.appendChild(tempDiv);
                        continue;
                    }

                    tempDiv.innerHTML = `
                        <p class="product-name">${nombreMostrado}</p>
                        ${detalleMostrado ? `<p class="variant-detail">${detalleMostrado}</p>` : ''}
                        <div class="barcode-wrapper"></div>
                        ${precioHtml}
                    `;
                    if (svgElement) {
                        tempDiv.querySelector('.barcode-wrapper').appendChild(svgElement);
                    }

                    labelsRef.current.appendChild(tempDiv);
                }
            });
        }
    }, [productosParaImprimir, tipoImpresion, mostrarDescuento, descuentoInput, descuentoRedondeo]);

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
                    <option value="estandar">Impresora estándar (rollo angosto)</option>
                    <option value="a4_grilla">Hoja A4 (máx. etiquetas por hoja)</option>
                    <option value="hoja_4x9_36">Hoja de etiquetas 4×9 (36 por hoja, 5x3cm)</option>
                    <option value="xprinter_39x20">Térmica Xprinter XP-410B (rollo 39x20mm)</option>
                </select>
                {tipoImpresion === 'hoja_4x9_36' && (
                    <div style={mobileStyles.ajusteHoja4x9Container} title="Corrige la posición de toda la grilla si no cae justo sobre el troquelado físico. Se guarda para la próxima vez.">
                        <label style={mobileStyles.ajusteHoja4x9Label}>
                            Ajuste horizontal (mm)
                            <input
                                type="number" step="0.5"
                                value={ajusteHoja4x9.x}
                                onChange={(e) => handleAjusteHoja4x9Change('x', e.target.value)}
                                style={mobileStyles.ajusteHoja4x9Input}
                            />
                        </label>
                        <label style={mobileStyles.ajusteHoja4x9Label}>
                            Ajuste vertical (mm)
                            <input
                                type="number" step="0.5"
                                value={ajusteHoja4x9.y}
                                onChange={(e) => handleAjusteHoja4x9Change('y', e.target.value)}
                                style={mobileStyles.ajusteHoja4x9Input}
                            />
                        </label>
                    </div>
                )}
                <label style={mobileStyles.descuentoLabel}>
                    <input
                        type="checkbox"
                        checked={mostrarDescuento}
                        onChange={(e) => setMostrarDescuento(e.target.checked)}
                    />
                    Descuento efectivo
                </label>
                {mostrarDescuento && (
                    <input
                        type="number"
                        min="0"
                        max="99"
                        step="0.01"
                        value={descuentoInput}
                        onChange={(e) => setDescuentoInput(e.target.value)}
                        placeholder="%"
                        style={mobileStyles.descuentoInput}
                    />
                )}
                <button onClick={handlePrint} style={mobileStyles.printButton}>Imprimir</button>
            </div>

            <div
                className={`label-container ${
                    tipoImpresion === 'xprinter_39x20' ? 'layout-termica'
                    : tipoImpresion === 'a4_grilla' ? 'layout-a4'
                    : tipoImpresion === 'hoja_4x9_36' ? 'layout-hoja4x9'
                    : 'layout-estandar'
                }`}
                ref={labelsRef}
                style={tipoImpresion === 'hoja_4x9_36' ? {
                    // Pisa el margen calculado por CSS (centrado matemático) sumando el
                    // ajuste fino cargado arriba -- 0.795cm/0.47cm son el margen izq/sup.
                    // "centrado" de base, en cm; el ajuste del usuario viene en mm.
                    marginTop: `${0.47 + ajusteHoja4x9.y / 10}cm`,
                    marginLeft: `${0.795 + ajusteHoja4x9.x / 10}cm`,
                    marginRight: 0,
                } : undefined}
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
                        font-size: 4.4mm;
                        margin-top: 2px;
                    }
                    .label-container.layout-estandar .label .price-lista {
                        font-weight: 600;
                        font-size: 2mm;
                        color: #333;
                        margin-top: 2px;
                    }
                    .label-container.layout-estandar .label .price-destacado-box {
                        display: flex;
                        flex-direction: column;
                        align-items: center;
                        border: 0.3mm solid #000;
                        border-radius: 0.6mm;
                        padding: 0.3mm 1.2mm;
                        margin-top: 0.5mm;
                    }
                    .label-container.layout-estandar .label .price-destacado-label {
                        font-weight: 600;
                        font-size: 1.6mm;
                        margin: 0;
                    }
                    .label-container.layout-estandar .label .price-destacado-box .price {
                        font-size: 3.8mm;
                        margin-top: 0;
                    }

                    /* Layout "a4": misma etiqueta de 37x37mm que "estandar", pero en grilla a lo
                       ancho de toda la hoja A4 (5 columnas x 7 filas ≈ 35 etiquetas por hoja),
                       sin salto de página forzado por etiqueta — el navegador pagina solo
                       cuando la grilla no entra más en la hoja actual. */
                    .label-container.layout-a4 {
                        display: flex;
                        flex-wrap: wrap;
                        justify-content: flex-start;
                        align-content: flex-start;
                        width: 200mm;
                        margin: 0 auto;
                        box-sizing: border-box;
                    }

                    .label-container.layout-a4 .label {
                        width: 37mm;
                        height: 37mm;
                        padding: 1mm 2mm;
                        display: inline-block;
                        text-align: center;
                        page-break-inside: avoid;
                        break-inside: avoid;
                        box-sizing: border-box;
                        vertical-align: top;
                        overflow: hidden;
                    }

                    .label-container.layout-a4 .label p {
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
                    .label-container.layout-a4 .label .product-name {
                        font-weight: bold;
                        font-size: 2.2mm;
                    }
                    .label-container.layout-a4 .label .variant-detail {
                        font-weight: 600;
                        font-size: 2mm;
                        margin-top: 1px;
                    }
                    .label-container.layout-a4 .label .barcode-wrapper {
                        margin-top: 2px;
                        margin-bottom: 2px;
                        padding: 0 1mm;
                    }
                    .label-container.layout-a4 .label .price {
                        font-weight: bold;
                        font-size: 4.4mm;
                        margin-top: 2px;
                    }
                    .label-container.layout-a4 .label .price-lista {
                        font-weight: 600;
                        font-size: 2mm;
                        color: #333;
                        margin-top: 2px;
                    }
                    .label-container.layout-a4 .label .price-destacado-box {
                        display: flex;
                        flex-direction: column;
                        align-items: center;
                        border: 0.3mm solid #000;
                        border-radius: 0.6mm;
                        padding: 0.3mm 1.2mm;
                        margin-top: 0.5mm;
                    }
                    .label-container.layout-a4 .label .price-destacado-label {
                        font-weight: 600;
                        font-size: 1.6mm;
                        margin: 0;
                    }
                    .label-container.layout-a4 .label .price-destacado-box .price {
                        font-size: 3.8mm;
                        margin-top: 0;
                    }

                    /* Layout "hoja4x9": hoja de etiquetas autoadhesivas pre-troqueladas, tamaño
                       Carta/Letter (21,59x27,94cm -- confirmado real: la primera versión asumía
                       21,5x29cm, pero el diálogo de impresión del cliente mostraba "Carta"), 4
                       columnas x 9 filas = 36 etiquetas de 5x3cm cada una (corregido de 5x2,8cm:
                       el cliente midió con regla la hoja física real y confirmó 3cm de alto por
                       cuadrado -- esos 2mm de diferencia por fila son justo lo que desalineaba la
                       grilla cada vez más fila tras fila). A diferencia de "layout-a4" (que arma
                       una grilla libre y deja que el navegador pagine solo), acá la posición de
                       cada etiqueta tiene que calcar la del papel físico -- si se corre aunque sea
                       1-2mm, la impresión ya no cae sobre la etiqueta real. El margen superior
                       sigue siendo una estimación (centrado matemático, asumiendo que el margen de
                       fábrica antes de la primera fila es igual al margen después de la última) --
                       no hay confirmado cuánto mide realmente el margen superior de fábrica antes
                       del primer troquel; si sigue sin caer bien, medirlo con regla y ajustar el
                       margin-top de acá directo, ya no como resta de un centrado calculado. */
                    .label-container.layout-hoja4x9 {
                        display: grid;
                        grid-template-columns: repeat(4, 5cm);
                        grid-template-rows: repeat(9, 3cm);
                        width: 20cm;
                        /* Carta mide 27,94cm de alto; 9 filas de 3cm = 27cm -- centrado vertical
                           deja 0,47cm arriba y abajo. */
                        margin: 0.47cm auto 0 auto;
                        box-sizing: border-box;
                    }

                    .label-container.layout-hoja4x9 .label {
                        width: 5cm;
                        height: 3cm;
                        padding: 1mm 2mm;
                        display: flex;
                        flex-direction: column;
                        justify-content: center;
                        align-items: center;
                        text-align: center;
                        page-break-inside: avoid;
                        break-inside: avoid;
                        box-sizing: border-box;
                        overflow: hidden;
                    }

                    .label-container.layout-hoja4x9 .label p {
                        margin: 0;
                        line-height: 1.1;
                        white-space: nowrap;
                        overflow: hidden;
                        text-overflow: ellipsis;
                        max-width: 100%;
                        font-weight: bold;
                        color: #000;
                        -webkit-font-smoothing: none;
                    }
                    .label-container.layout-hoja4x9 .label .product-name {
                        font-weight: bold;
                        font-size: 2.4mm;
                    }
                    .label-container.layout-hoja4x9 .label .variant-detail {
                        font-weight: 600;
                        font-size: 2.1mm;
                        margin-top: 0.3mm;
                    }
                    .label-container.layout-hoja4x9 .label .barcode-wrapper {
                        margin-top: 0.5mm;
                        margin-bottom: 0.5mm;
                        width: 100%;
                    }
                    /* El margen de sobra real en esta hoja es de ~8mm por lado en el punto
                       neutro (20cm de grilla en una Carta de 21,59cm) -- descontando el margen
                       no imprimible propio de la impresora, no queda nada para tolerar un
                       desajuste. En vez de perseguir un margen de página perfecto (que además
                       varía de impresora en impresora), se achica el código de barras un 10%
                       dentro de su propia celda: no cambia su proporción (mismo ancho/alto,
                       sigue leyendo bien), solo deja ~2mm de aire de sobra a cada lado en la
                       columna más comprometida (la última), sin depender de que el margen de
                       toda la hoja esté calibrado al milímetro. */
                    .label-container.layout-hoja4x9 .label .barcode-wrapper svg {
                        max-width: 90%;
                    }
                    .label-container.layout-hoja4x9 .label .price {
                        font-weight: bold;
                        font-size: 5mm;
                        margin-top: 0.3mm;
                    }
                    .label-container.layout-hoja4x9 .label .price-lista {
                        font-weight: 600;
                        font-size: 1.8mm;
                        color: #333;
                        margin-top: 0.3mm;
                    }
                    .label-container.layout-hoja4x9 .label .price-destacado-box {
                        display: flex;
                        flex-direction: column;
                        align-items: center;
                        border: 0.3mm solid #000;
                        border-radius: 0.5mm;
                        padding: 0.2mm 1mm;
                        margin-top: 0.3mm;
                    }
                    .label-container.layout-hoja4x9 .label .price-destacado-label {
                        font-weight: 600;
                        font-size: 1.5mm;
                        margin: 0;
                    }
                    .label-container.layout-hoja4x9 .label .price-destacado-box .price {
                        font-size: 4mm;
                        margin-top: 0;
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
                        font-size: 3.9mm;
                        margin-top: 0.3mm;
                    }
                    .label-container.layout-termica .label .price-lista {
                        font-weight: 600;
                        font-size: 1.5mm;
                        color: #333;
                        margin-top: 0.3mm;
                    }
                    .label-container.layout-termica .label .price-destacado-box {
                        display: flex;
                        flex-direction: column;
                        align-items: center;
                        border: 0.25mm solid #000;
                        border-radius: 0.5mm;
                        padding: 0.1mm 0.8mm;
                        margin-top: 0.2mm;
                    }
                    .label-container.layout-termica .label .price-destacado-label {
                        font-weight: 600;
                        font-size: 1.3mm;
                        margin: 0;
                    }
                    .label-container.layout-termica .label .price-destacado-box .price {
                        font-size: 3.2mm;
                        margin-top: 0;
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
                            margin: ${tipoImpresion === 'a4_grilla' ? '5mm' : '0'};
                            ${tipoImpresion === 'xprinter_39x20' ? 'size: 39mm 20mm;' : ''}
                            ${tipoImpresion === 'a4_grilla' ? 'size: A4;' : ''}
                            ${tipoImpresion === 'hoja_4x9_36' ? 'size: letter;' : ''}
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
    ajusteHoja4x9Container: {
        display: 'flex',
        gap: '10px',
        padding: '6px 10px',
        border: '1px dashed #94a3b8',
        borderRadius: '6px',
        backgroundColor: '#f8fafc',
    },
    ajusteHoja4x9Label: {
        display: 'flex',
        flexDirection: 'column',
        fontSize: '11px',
        color: '#475569',
        fontWeight: 600,
    },
    ajusteHoja4x9Input: {
        width: '60px',
        padding: '4px 6px',
        borderRadius: '4px',
        border: '1px solid #ccc',
        marginTop: '2px',
    },
    descuentoLabel: {
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
        fontSize: '14px',
        cursor: 'pointer',
        whiteSpace: 'nowrap',
    },
    descuentoInput: {
        width: '70px',
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
