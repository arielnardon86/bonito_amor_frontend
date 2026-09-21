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
    inputRef, onAbrirCamara,
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
        const timeoutId = setTimeout(async () => {
            try {
                const response = await axios.get(`${BASE_API_ENDPOINT}/api/productos/`, {
                    headers: { Authorization: `Bearer ${token}` },
                    params: { tienda_slug: tiendaSlug, search: termino, page: 1 },
                });
                setSugerencias((response.data.results || response.data || []).slice(0, 6));
                setMostrar(true);
            } catch {
                setSugerencias([]);
            }
        }, 300);
        return () => clearTimeout(timeoutId);
    }, [value, tiendaSlug, token]);

    const seleccionar = (producto) => {
        onSeleccionarProducto(producto);
        onChange('');
        setSugerencias([]);
        setMostrar(false);
    };

    return (
        <div style={{ position: 'relative', flex: 1, minWidth: 0 }}>
            {onAbrirCamara && (
                <style>{`
                    .buscador-productos-camera-btn { display: none; }
                    @media (max-width: 768px) {
                        .buscador-productos-camera-btn { display: flex; }
                        .buscador-productos-input-con-camara { padding-right: 42px !important; }
                    }
                `}</style>
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
                style={inputStyle}
                className={[inputClassName, onAbrirCamara ? 'buscador-productos-input-con-camara' : ''].filter(Boolean).join(' ')}
                autoFocus={autoFocus}
                autoComplete="off"
            />
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
                                    <span style={styles.nombre}>{producto.nombre}</span>
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
};

export default BuscadorProductosDropdown;
