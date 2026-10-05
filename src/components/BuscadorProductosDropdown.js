// BuscadorProductosDropdown.js
// Input de búsqueda de producto (código de barras, código interno o nombre) que
// muestra un desplegable con sugerencias mientras se tipea -- foto en miniatura (o
// un ícono genérico si no tiene), nombre, código, precio y stock. Se usa en Punto de
// Venta y en Cambio/Devolución (mismo componente, para no duplicar la lógica).
//
// El código de barras exacto por Enter (cuando no hay sugerencias, o no coincide
// ninguna) lo sigue resolviendo cada pantalla con su propio handleBuscarProducto --
// este componente solo agrega el desplegable de sugerencias por nombre/código.
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { formatearMonto } from '../utils/formatearMonto';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';
const normalizeApiUrl = (url) => {
    let u = url;
    if (u.endsWith('/api/') || u.endsWith('/api')) u = u.replace(/\/api\/?$/, '');
    if (u.endsWith('/')) u = u.slice(0, -1);
    return u;
};
const BASE_API_ENDPOINT = normalizeApiUrl(API_BASE_URL);

// Unidad "chica" para productos de venta fraccionada (por peso o por medida).
const UNIDADES_FRACCIONADAS = { KG: 'kg', METRO: 'm' };
const abrevUnidad = (product) => UNIDADES_FRACCIONADAS[product?.unidad_fraccionada] || UNIDADES_FRACCIONADAS.KG;

const BuscadorProductosDropdown = ({
    token, tiendaSlug, value, onChange, onSeleccionarProducto, onEnterSinSugerencias,
    placeholder = 'Código de barras o nombre', inputStyle, inputClassName, autoFocus,
    inputRef, onAbrirCamara, iconoIzquierdo, badgeTexto,
}) => {
    const [sugerencias, setSugerencias] = useState([]);
    const [mostrar, setMostrar] = useState(false);

    useEffect(() => {
        const termino = value.trim();
        if (termino.length < 2 || !tiendaSlug || !token) {
            setSugerencias([]);
            setMostrar(false);
            return;
        }
        // AbortController en vez de un simple flag "cancelado": así, si el valor
        // cambia antes de que llegue la respuesta (ej. se escaneó un código y la
        // búsqueda directa por barcode ya encontró y agregó el producto, limpiando
        // el input), la request vieja se cancela de verdad en vez de solo ignorar
        // su resultado -- menos carga al backend y sin riesgo de que una respuesta
        // vieja que tarda más que una nueva pise el desplegable con algo desactualizado.
        const controller = new AbortController();
        const timeoutId = setTimeout(async () => {
            try {
                const response = await axios.get(`${BASE_API_ENDPOINT}/api/productos/`, {
                    headers: { Authorization: `Bearer ${token}` },
                    params: { tienda_slug: tiendaSlug, search: termino, page: 1 },
                    signal: controller.signal,
                });
                const resultados = response.data.results || response.data || [];
                // Un producto con variantes no es vendible como tal -- cada variante es
                // el ítem real, con su propio precio/stock. Mismo criterio de "aplanado"
                // que ya usa la tabla de abajo en Punto de Venta: sin esto, la sugerencia
                // mostraba el precio/stock del padre (sin sentido para una venta real) y
                // al elegirla no había forma de saber ni elegir qué variante se agregaba.
                const aplanados = resultados.flatMap((producto) => {
                    if (producto.variantes && producto.variantes.length > 0) {
                        return producto.variantes.map((variante) => ({
                            ...variante,
                            nombre: variante.nombre || producto.nombre,
                        }));
                    }
                    return [producto];
                });
                setSugerencias(aplanados.slice(0, 6));
                setMostrar(true);
            } catch (err) {
                if (axios.isCancel(err) || err.code === 'ERR_CANCELED') return; // reemplazada por una búsqueda más nueva
                setSugerencias([]);
            }
        }, 300);
        return () => {
            controller.abort();
            clearTimeout(timeoutId);
        };
    }, [value, tiendaSlug, token]);

    const seleccionar = (producto) => {
        onSeleccionarProducto(producto);
        onChange('');
        setSugerencias([]);
        setMostrar(false);
    };

    return (
        <div style={{ position: 'relative', flex: 1, minWidth: 0 }}>
            {(onAbrirCamara || badgeTexto) && (
                <style>{`
                    .buscador-productos-camera-btn { display: none; }
                    @media (max-width: 768px) {
                        .buscador-productos-camera-btn { display: flex; }
                        .buscador-productos-input-con-camara { padding-right: 42px !important; }
                        .buscador-productos-badge { display: none !important; }
                    }
                `}</style>
            )}
            {iconoIzquierdo && (
                <span style={styles.iconoIzquierdo} aria-hidden="true">{iconoIzquierdo}</span>
            )}
            <input
                ref={inputRef}
                type="text"
                placeholder={placeholder}
                value={value}
                onChange={(e) => onChange(e.target.value)}
                onKeyPress={(e) => {
                    if (e.key !== 'Enter') return;
                    if (mostrar && sugerencias.length > 0) {
                        seleccionar(sugerencias[0]);
                    } else if (onEnterSinSugerencias) {
                        onEnterSinSugerencias();
                    }
                }}
                onFocus={() => { if (sugerencias.length > 0) setMostrar(true); }}
                onBlur={() => setTimeout(() => setMostrar(false), 150)}
                style={{
                    ...inputStyle,
                    ...(iconoIzquierdo ? { paddingLeft: 40 } : {}),
                    ...(badgeTexto ? { paddingRight: 122 } : {}),
                }}
                className={[inputClassName, onAbrirCamara ? 'buscador-productos-input-con-camara' : ''].filter(Boolean).join(' ')}
                autoFocus={autoFocus}
                autoComplete="off"
            />
            {badgeTexto && (
                <span style={styles.badge} className="buscador-productos-badge" aria-hidden="true">{badgeTexto}</span>
            )}
            {onAbrirCamara && (
                <button
                    type="button"
                    onClick={onAbrirCamara}
                    className="buscador-productos-camera-btn"
                    style={styles.cameraButton}
                    title="Escanear con la cámara"
                    aria-label="Escanear con la cámara"
                >
                    📷
                </button>
            )}
            {mostrar && sugerencias.length > 0 && (
                <ul style={styles.dropdown} className="buscador-productos-dropdown">
                    <style>{`
                        .buscador-productos-dropdown button:hover,
                        .buscador-productos-dropdown button:focus-visible {
                            background: #f1f5f9;
                        }
                    `}</style>
                    {sugerencias.map((producto) => (
                        <li key={producto.id}>
                            <button
                                type="button"
                                onMouseDown={(e) => e.preventDefault()}
                                onClick={() => seleccionar(producto)}
                                style={styles.item}
                            >
                                {producto.imagen ? (
                                    <img src={producto.imagen} alt="" style={styles.imagen} />
                                ) : (
                                    <span style={styles.imagenPlaceholder} aria-hidden="true">📦</span>
                                )}
                                <span style={styles.texto}>
                                    <span style={styles.nombre}>
                                        {producto.nombre}
                                        {[producto.talle, producto.variante2].filter(Boolean).length > 0 && (
                                            <span style={styles.variante}> · {[producto.talle, producto.variante2].filter(Boolean).join(' · ')}</span>
                                        )}
                                    </span>
                                    {(producto.codigo_interno || producto.codigo_barras) && (
                                        <span style={styles.codigo}>{producto.codigo_interno || producto.codigo_barras}</span>
                                    )}
                                    <span style={styles.dato}>
                                        {producto.precio_variable ? 'Precio variable' : formatearMonto(producto.precio)}
                                        {producto.se_vende_por_peso ? ` /${abrevUnidad(producto)}` : ` · Stock: ${producto.stock}`}
                                    </span>
                                </span>
                            </button>
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
};

const styles = {
    dropdown: {
        position: 'absolute', top: 'calc(100% + 4px)', left: 0, right: 0, zIndex: 50,
        margin: 0, padding: 4, listStyle: 'none',
        background: '#fff', border: '1px solid #e2e8f0', borderRadius: 10,
        boxShadow: '0 8px 24px rgba(15,30,58,0.12)',
        maxHeight: 280, overflowY: 'auto',
    },
    item: {
        width: '100%', display: 'flex', alignItems: 'center', gap: 10,
        padding: '6px 10px', border: 'none', background: 'none', borderRadius: 6,
        cursor: 'pointer', textAlign: 'left',
    },
    imagen: { width: 32, height: 32, borderRadius: 6, objectFit: 'cover', border: '1px solid #e2e8f0', flexShrink: 0 },
    imagenPlaceholder: {
        width: 32, height: 32, borderRadius: 6, flexShrink: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: '#f1f5f9', fontSize: 14,
    },
    texto: { display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0 },
    nombre: { fontSize: 14, fontWeight: 600, color: '#1a2926' },
    variante: { fontWeight: 500, color: '#64748b' },
    codigo: { fontSize: 11, color: '#94a3b8' },
    dato: { fontSize: 12, color: '#64748b' },
    // display se maneja por CSS (.buscador-productos-camera-btn), no acá: solo se
    // muestra en mobile (ver el <style> de arriba) -- un inline style de display le
    // ganaría siempre a la regla CSS que lo oculta en desktop.
    cameraButton: {
        position: 'absolute', top: '50%', right: 8, transform: 'translateY(-50%)',
        width: 30, height: 30, alignItems: 'center', justifyContent: 'center',
        padding: 0, backgroundColor: 'transparent', color: '#1e8068',
        border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: 16,
    },
    iconoIzquierdo: {
        position: 'absolute', top: '50%', left: 15, transform: 'translateY(-50%)', zIndex: 1,
        color: '#8fb9a8', fontSize: 16, fontWeight: 700, pointerEvents: 'none', lineHeight: 1,
    },
    // display se maneja por CSS (.buscador-productos-badge), no acá: en mobile se
    // oculta para dejarle el lugar al ícono de cámara (ver el <style> de arriba).
    badge: {
        position: 'absolute', top: '50%', right: 10, transform: 'translateY(-50%)',
        background: '#eef2f6', color: '#64748b', fontSize: 11.5, fontWeight: 600,
        padding: '5px 10px', borderRadius: 999, whiteSpace: 'nowrap', pointerEvents: 'none',
    },
};

export default BuscadorProductosDropdown;
