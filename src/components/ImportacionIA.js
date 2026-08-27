// ImportacionIA.js
import React, { useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../AuthContext';
import Swal from 'sweetalert2';

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

const NUEVO = 'nuevo';

// Arma la lista editable de filas a partir de la respuesta de /productos/importacion_ia/,
// precargando el match sugerido por el backend (si lo hay) y su precio/IVA actuales
// -- así una reposición común no pisa esos valores si el usuario no los toca.
const construirFilasIniciales = (lineas, margenDefecto) => {
    return lineas.map((l) => {
        const seleccionInicial = l.match_exacto ? l.match_exacto.producto_id : NUEVO;
        const matchInicial = l.match_exacto || null;
        return {
            fila: l.fila,
            nombre: l.talle ? `${l.nombre} - ${l.talle}` : (l.nombre || ''),
            cantidad: l.cantidad ?? '',
            costo: l.costo_unitario ?? '',
            codigoBarras: l.codigo_barras || '',
            match_exacto: l.match_exacto,
            sugerencias: l.sugerencias || [],
            codigoInternoPropuesto: l.codigo_interno_propuesto,
            seleccion: seleccionInicial,
            precioVenta: matchInicial ? matchInicial.precio : '',
            ivaPorcentaje: matchInicial ? matchInicial.iva_porcentaje : '',
            rubro: '',
            margenPorcentaje: matchInicial ? '' : margenDefecto,
        };
    });
};

const ImportacionIA = () => {
    const { token, selectedStoreSlug } = useAuth();
    const navigate = useNavigate();

    const [step, setStep] = useState('upload'); // upload | extrayendo | preview | resultado
    const [error, setError] = useState(null);
    const [nombreArchivo, setNombreArchivo] = useState('');

    const [metadata, setMetadata] = useState(null); // { proveedor, numero_documento, fecha }
    const [filas, setFilas] = useState([]);
    const [margenDefecto, setMargenDefecto] = useState('30');
    const [confirmando, setConfirmando] = useState(false);
    const [resultadoFinal, setResultadoFinal] = useState(null);

    const resetear = () => {
        setStep('upload');
        setError(null);
        setNombreArchivo('');
        setMetadata(null);
        setFilas([]);
        setResultadoFinal(null);
    };

    const actualizarFila = (fila, cambios) => {
        setFilas((prev) => prev.map((f) => (f.fila === fila ? { ...f, ...cambios } : f)));
    };

    const opcionesMatch = (f) => {
        const opciones = [];
        if (f.match_exacto) opciones.push(f.match_exacto);
        f.sugerencias.forEach((s) => opciones.push(s));
        return opciones;
    };

    const handleCambiarSeleccion = (f, nuevaSeleccion) => {
        if (nuevaSeleccion === NUEVO) {
            actualizarFila(f.fila, {
                seleccion: NUEVO,
                precioVenta: '',
                ivaPorcentaje: '',
                margenPorcentaje: margenDefecto,
            });
            return;
        }
        const producto = opcionesMatch(f).find((p) => p.producto_id === nuevaSeleccion);
        actualizarFila(f.fila, {
            seleccion: nuevaSeleccion,
            precioVenta: producto ? producto.precio : '',
            ivaPorcentaje: producto ? producto.iva_porcentaje : '',
            rubro: '',
            margenPorcentaje: '',
        });
    };

    const handleArchivo = async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        setError(null);
        setNombreArchivo(file.name);

        if (file.size > 15 * 1024 * 1024) {
            setError('El archivo no puede superar los 15MB.');
            return;
        }

        setStep('extrayendo');
        const formData = new FormData();
        formData.append('archivo', file);
        formData.append('tienda_slug', selectedStoreSlug);

        try {
            const resp = await axios.post(`${BASE_API_ENDPOINT}/api/productos/importacion_ia/`, formData, {
                headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'multipart/form-data' },
            });
            const { proveedor, numero_documento, fecha, lineas } = resp.data;
            setMetadata({ proveedor, numero_documento, fecha });
            setFilas(construirFilasIniciales(lineas, margenDefecto));
            setStep('preview');
        } catch (err) {
            Swal.fire('Error', err.response?.data?.error || 'No se pudo procesar el archivo.', 'error');
            setStep('upload');
        }
    };

    const filasInvalidas = () => {
        return filas.filter((f) => {
            if (!f.nombre || !f.cantidad || f.costo === '' || f.costo === null) return true;
            const sinPrecio = (f.precioVenta === '' || f.precioVenta === null) && (f.margenPorcentaje === '' || f.margenPorcentaje === null);
            return sinPrecio;
        });
    };

    const confirmarImportacion = async () => {
        const invalidas = filasInvalidas();
        if (invalidas.length > 0) {
            Swal.fire('Faltan datos', `Completá nombre, cantidad, costo y precio de venta (o margen %) en las ${invalidas.length} fila(s) marcadas en rojo.`, 'error');
            return;
        }

        const { isConfirmed } = await Swal.fire({
            title: '¿Confirmar importación?',
            html: `Se van a crear/actualizar <strong>${filas.length}</strong> producto(s) a partir de esta factura.`,
            icon: 'question',
            showCancelButton: true,
            confirmButtonText: 'Sí, importar',
            cancelButtonText: 'Cancelar',
            confirmButtonColor: '#5dc87a',
        });
        if (!isConfirmed) return;

        const filasParaEnviar = filas.map((f, i) => {
            const productoElegido = f.seleccion !== NUEVO ? opcionesMatch(f).find((p) => p.producto_id === f.seleccion) : null;
            return {
                fila: i + 1,
                codigo_interno: productoElegido ? productoElegido.codigo_interno : f.codigoInternoPropuesto,
                nombre: f.nombre,
                rubro: f.rubro || '',
                iva_porcentaje: f.ivaPorcentaje !== '' ? f.ivaPorcentaje : undefined,
                costo: f.costo,
                precio_venta: f.precioVenta !== '' ? f.precioVenta : undefined,
                margen_porcentaje: f.margenPorcentaje !== '' ? f.margenPorcentaje : undefined,
                cantidad: f.cantidad,
                // Solo se manda código de barras en altas nuevas: en una reposición, el
                // código que trae la factura del proveedor puede no coincidir con el
                // que ya tiene el producto en el local, y carga_masiva lo pisaría.
                codigo_barras: productoElegido ? '' : (f.codigoBarras || ''),
            };
        });

        setConfirmando(true);
        try {
            const resp = await axios.post(`${BASE_API_ENDPOINT}/api/productos/carga_masiva/`, {
                tienda_slug: selectedStoreSlug, modo: 'confirmar', filas: filasParaEnviar,
            }, { headers: { Authorization: `Bearer ${token}` } });
            setResultadoFinal(resp.data);
            setStep('resultado');
        } catch (err) {
            Swal.fire('Error', err.response?.data?.error || 'No se pudo completar la importación.', 'error');
        } finally {
            setConfirmando(false);
        }
    };

    return (
        <div style={styles.container}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: 10 }}>
                <h1 style={styles.pageTitle}>Importación IA</h1>
                <button onClick={() => navigate('/productos')} style={styles.secondaryButton}>‹ Volver a Gestión de Productos</button>
            </div>

            {step === 'upload' && (
                <div style={styles.section}>
                    <h2 style={styles.sectionHeader}>Subí la foto o el PDF de la factura</h2>
                    <ul style={styles.helpList}>
                        <li>Sirve para <strong>crear productos nuevos</strong> y para <strong>reponer stock</strong> de productos que ya tenés cargados, a partir de una factura o proforma de un proveedor.</li>
                        <li>Podés sacar una foto con el celular o subir el PDF original.</li>
                        <li>Después de extraer los productos vas a poder revisar y corregir cada línea antes de confirmar: nada se guarda todavía.</li>
                    </ul>
                    <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap', marginTop: 16 }}>
                        <label style={styles.fileLabel}>
                            {nombreArchivo || 'Elegir foto o PDF'}
                            <input
                                type="file" accept="image/*,application/pdf" capture="environment"
                                onChange={handleArchivo} style={{ display: 'none' }}
                            />
                        </label>
                    </div>
                    {error && <div style={styles.errorMessage}>{error}</div>}
                </div>
            )}

            {step === 'extrayendo' && (
                <div style={styles.section}>
                    <p style={styles.noDataMessage}>Leyendo la factura con IA, puede tardar unos segundos...</p>
                </div>
            )}

            {step === 'preview' && (
                <div style={styles.section}>
                    <h2 style={styles.sectionHeader}>Revisá antes de confirmar</h2>
                    {metadata && (metadata.proveedor || metadata.numero_documento || metadata.fecha) && (
                        <p style={{ color: '#475569', fontSize: 14 }}>
                            {metadata.proveedor && <>Proveedor: <strong>{metadata.proveedor}</strong>{' · '}</>}
                            {metadata.numero_documento && <>Documento: <strong>{metadata.numero_documento}</strong>{' · '}</>}
                            {metadata.fecha && <>Fecha: <strong>{metadata.fecha}</strong></>}
                        </p>
                    )}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                        <label style={{ fontSize: 14, color: '#475569' }}>Margen % por defecto para productos nuevos:</label>
                        <input
                            type="number" min="0" step="0.01" value={margenDefecto}
                            onChange={(e) => setMargenDefecto(e.target.value)}
                            style={{ ...styles.inputField, width: 80 }}
                        />
                    </div>
                    <div style={styles.tableResponsive}>
                        <table style={styles.table}>
                            <thead>
                                <tr style={styles.tableHeaderRow}>
                                    <th style={styles.th}>Producto extraído</th>
                                    <th style={styles.th}>Cantidad</th>
                                    <th style={styles.th}>Costo</th>
                                    <th style={styles.th}>Match</th>
                                    <th style={styles.th}>Precio venta</th>
                                    <th style={styles.th}>IVA %</th>
                                    <th style={styles.th}>Margen %</th>
                                    <th style={styles.th}>Rubro</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filas.map((f) => {
                                    const esNuevo = f.seleccion === NUEVO;
                                    const invalida = filasInvalidas().includes(f);
                                    return (
                                        <tr key={f.fila} style={invalida ? styles.tableRowError : styles.tableRow}>
                                            <td style={styles.td}>
                                                <input
                                                    type="text" value={f.nombre}
                                                    onChange={(e) => actualizarFila(f.fila, { nombre: e.target.value })}
                                                    style={{ ...styles.inputField, width: 180 }}
                                                />
                                            </td>
                                            <td style={styles.td}>
                                                <input
                                                    type="number" min="0" value={f.cantidad}
                                                    onChange={(e) => actualizarFila(f.fila, { cantidad: e.target.value })}
                                                    style={{ ...styles.inputField, width: 70 }}
                                                />
                                            </td>
                                            <td style={styles.td}>
                                                <input
                                                    type="number" min="0" step="0.01" value={f.costo}
                                                    onChange={(e) => actualizarFila(f.fila, { costo: e.target.value })}
                                                    style={{ ...styles.inputField, width: 90 }}
                                                />
                                            </td>
                                            <td style={styles.td}>
                                                <select
                                                    value={f.seleccion}
                                                    onChange={(e) => handleCambiarSeleccion(f, e.target.value)}
                                                    style={{ ...styles.inputField, width: 220 }}
                                                >
                                                    <option value={NUEVO}>+ Crear producto nuevo</option>
                                                    {opcionesMatch(f).map((p) => (
                                                        <option key={p.producto_id} value={p.producto_id}>
                                                            Reponer: {p.nombre} {p.codigo_interno ? `(${p.codigo_interno})` : ''}
                                                        </option>
                                                    ))}
                                                </select>
                                                {f.seleccion !== NUEVO && !f.match_exacto && (
                                                    <div style={{ fontSize: 12, color: '#b8860b', marginTop: 4 }}>Sugerido por nombre, revisá que sea correcto.</div>
                                                )}
                                            </td>
                                            <td style={styles.td}>
                                                <input
                                                    type="number" min="0" step="0.01" value={f.precioVenta}
                                                    placeholder={f.margenPorcentaje ? 'auto' : ''}
                                                    onChange={(e) => actualizarFila(f.fila, { precioVenta: e.target.value })}
                                                    style={{ ...styles.inputField, width: 90 }}
                                                />
                                            </td>
                                            <td style={styles.td}>
                                                <input
                                                    type="number" min="0" step="0.01" value={f.ivaPorcentaje}
                                                    onChange={(e) => actualizarFila(f.fila, { ivaPorcentaje: e.target.value })}
                                                    style={{ ...styles.inputField, width: 70 }}
                                                />
                                            </td>
                                            <td style={styles.td}>
                                                <input
                                                    type="number" min="0" step="0.01" value={f.margenPorcentaje}
                                                    disabled={!esNuevo && !!f.precioVenta}
                                                    onChange={(e) => actualizarFila(f.fila, { margenPorcentaje: e.target.value, precioVenta: e.target.value ? '' : f.precioVenta })}
                                                    style={{ ...styles.inputField, width: 70 }}
                                                />
                                            </td>
                                            <td style={styles.td}>
                                                <input
                                                    type="text" value={f.rubro} disabled={!esNuevo}
                                                    placeholder={esNuevo ? 'Opcional' : '—'}
                                                    onChange={(e) => actualizarFila(f.fila, { rubro: e.target.value })}
                                                    style={{ ...styles.inputField, width: 100 }}
                                                />
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                    <p style={{ fontSize: 13, color: '#94a3b8', marginTop: 10 }}>
                        Las filas en rojo tienen datos faltantes (nombre, cantidad, costo o precio de venta/margen).
                        En las filas de "Reponer", el precio e IVA ya vienen precargados con el valor actual del producto.
                    </p>
                    <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
                        <button onClick={resetear} style={styles.modalCancelButton}>Cancelar</button>
                        <button
                            onClick={confirmarImportacion}
                            disabled={confirmando || filas.length === 0}
                            style={styles.primaryButton}
                        >
                            {confirmando ? 'Importando...' : 'Confirmar importación'}
                        </button>
                    </div>
                </div>
            )}

            {step === 'resultado' && resultadoFinal && (
                <div style={styles.section}>
                    <h2 style={styles.sectionHeader}>¡Importación completa!</h2>
                    <p><strong>{resultadoFinal.creados}</strong> producto(s) nuevo(s) creado(s).</p>
                    <p><strong>{resultadoFinal.actualizados}</strong> producto(s) repuestos (stock/precio actualizado).</p>
                    {resultadoFinal.errores > 0 && (
                        <p style={{ color: '#e25252' }}><strong>{resultadoFinal.errores}</strong> fila(s) no se pudieron procesar.</p>
                    )}
                    <div style={{ display: 'flex', gap: 10, marginTop: 20, flexWrap: 'wrap' }}>
                        <button onClick={resetear} style={styles.secondaryButton}>Importar otra factura</button>
                        <button onClick={() => navigate('/productos')} style={styles.primaryButton}>Ir a Gestión de Productos</button>
                    </div>
                </div>
            )}
        </div>
    );
};

const styles = {
    container: { padding: 0, fontFamily: "'Inter', 'Segoe UI', system-ui, sans-serif", width: '100%' },
    pageTitle: { color: '#1a2926', fontSize: '1.5rem', fontWeight: 600, margin: 0 },
    section: { marginBottom: '30px', padding: '20px', backgroundColor: '#f1f5f9', borderRadius: '10px' },
    sectionHeader: { color: '#475569', fontSize: '1.1rem', borderBottom: '1px solid #e2e8f0', paddingBottom: '8px', marginTop: 0, marginBottom: '0.5rem' },
    helpList: { fontSize: 14, color: '#475569', lineHeight: 1.6, paddingLeft: 20 },
    errorMessage: { color: '#e25252', padding: '10px', backgroundColor: '#fef2f2', border: '1px solid #fca5a5', borderRadius: '6px', marginTop: 15 },
    noDataMessage: { textAlign: 'center', fontStyle: 'italic', color: '#94a3b8' },
    primaryButton: { padding: '10px 15px', backgroundColor: '#5dc87a', color: 'white', border: 'none', borderRadius: '10px', cursor: 'pointer' },
    secondaryButton: { padding: '10px 15px', backgroundColor: '#94a3b8', color: 'white', border: 'none', borderRadius: '10px', cursor: 'pointer' },
    fileLabel: { padding: '10px 15px', backgroundColor: 'white', border: '1px dashed #94a3b8', borderRadius: '10px', cursor: 'pointer', color: '#475569', fontSize: 14 },
    inputField: { padding: '8px', border: '1px solid #e2e8f0', borderRadius: '10px', boxSizing: 'border-box' },
    modalCancelButton: { padding: '10px 15px', backgroundColor: '#e2e8f0', color: '#475569', border: 'none', borderRadius: '10px', cursor: 'pointer' },
    tableResponsive: { overflowX: 'auto', WebkitOverflowScrolling: 'touch' },
    table: { width: '100%', borderCollapse: 'collapse', marginTop: '15px' },
    tableHeaderRow: { backgroundColor: '#f1f5f9' },
    th: { padding: '10px', borderBottom: '2px solid #e2e8f0', textAlign: 'left' },
    tableRow: {},
    tableRowError: { backgroundColor: '#fef2f2' },
    td: { padding: '10px', borderBottom: '1px solid #e2e8f0', verticalAlign: 'middle' },
};

export default ImportacionIA;
