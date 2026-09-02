// CargaMasivaProductos.js
import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import * as XLSX from 'xlsx';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../AuthContext';
import Swal from 'sweetalert2';
import { formatearMonto } from '../utils/formatearMonto';

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

// Normaliza un encabezado de columna: minúsculas, sin tildes, sin espacios/símbolos.
const normalizarHeader = (h) => String(h || '')
    .toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]/g, '');

const MAPEO_COLUMNAS = {
    codigointerno: 'codigo_interno',
    codigo: 'codigo_interno',
    nombre: 'nombre',
    rubro: 'rubro',
    iva: 'iva_porcentaje',
    ivaporcentaje: 'iva_porcentaje',
    costo: 'costo',
    preciodeventa: 'precio_venta',
    precioventa: 'precio_venta',
    precio: 'precio_venta',
    margen: 'margen_porcentaje',
    margenporcentaje: 'margen_porcentaje',
    cantidad: 'cantidad',
    codigodebarras: 'codigo_barras',
    codigobarras: 'codigo_barras',
};

const COLUMNAS_REQUERIDAS = ['codigo_interno', 'nombre', 'costo', 'cantidad'];

// Con archivos muy grandes, el navegador puede quedarse sin memoria al parsear
// el Excel y sobre todo al renderizar la tabla de vista previa (una fila = varios
// nodos DOM, sin virtualización). Por encima de este umbral pedimos dividir el
// archivo en partes, en vez de arriesgar un crash de la pestaña.
const MAX_FILAS_IMPORT = 5000;
// La tabla de preview solo muestra hasta esta cantidad de filas (priorizando las
// que tienen error, que son las que hay que corregir) para no generar decenas de
// miles de nodos DOM de golpe. Al confirmar se procesan TODAS las filas igual.
const PREVIEW_DISPLAY_LIMIT = 500;

const CargaMasivaProductos = () => {
    const { token, selectedStoreSlug } = useAuth();
    const navigate = useNavigate();

    const [step, setStep] = useState('upload'); // upload | asignar_rubros | preview | resultado
    const [error, setError] = useState(null);
    const [nombreArchivo, setNombreArchivo] = useState('');
    // Al re-subir un archivo ya importado (ej. para corregir precio/IVA/rubro),
    // permite no volver a sumar la cantidad de cada fila al stock existente.
    const [actualizarStock, setActualizarStock] = useState(true);

    const [filasParsed, setFilasParsed] = useState([]);
    const [rubrosPorAsignar, setRubrosPorAsignar] = useState([]);
    const [guardandoRubros, setGuardandoRubros] = useState(false);

    const [previewData, setPreviewData] = useState(null);
    const [loadingPreview, setLoadingPreview] = useState(false);
    const [confirmando, setConfirmando] = useState(false);
    const [resultadoFinal, setResultadoFinal] = useState(null);

    // Gestión de Rubros y % IVA (ver/editar/crear, independiente de una carga puntual)
    const [rubros, setRubros] = useState([]);
    const [loadingRubros, setLoadingRubros] = useState(true);
    const [rubroEditando, setRubroEditando] = useState(null);
    const [valorEditadoIva, setValorEditadoIva] = useState('');
    const [guardandoEdicionRubro, setGuardandoEdicionRubro] = useState(false);
    const [mostrarNuevoRubro, setMostrarNuevoRubro] = useState(false);
    const [nuevoRubroNombre, setNuevoRubroNombre] = useState('');
    const [nuevoRubroIva, setNuevoRubroIva] = useState('');
    const [guardandoNuevoRubro, setGuardandoNuevoRubro] = useState(false);

    // La API de rubros pagina de a 10 (PAGE_SIZE default de DRF): si se lee solo
    // resp.data.results, una tienda con más de 10 rubros deja los siguientes
    // invisibles acá -- y como esta lista es la que se usa para chequear duplicados
    // antes de crear uno nuevo, terminaba intentando recrear un rubro que ya
    // existía (pero no se veía) y fallando con "deben formar un conjunto único".
    const fetchTodosLosRubros = useCallback(async () => {
        if (!token || !selectedStoreSlug) return [];
        let todos = [];
        let nextUrl = `${BASE_API_ENDPOINT}/api/rubros/`;
        let params = { tienda_slug: selectedStoreSlug };
        while (nextUrl) {
            const resp = await axios.get(nextUrl, { headers: { Authorization: `Bearer ${token}` }, params });
            const pagina = resp.data.results || resp.data || [];
            todos = todos.concat(Array.isArray(pagina) ? pagina : []);
            nextUrl = resp.data.next || null;
            params = undefined; // la URL de "next" ya trae los query params incluidos
        }
        return todos;
    }, [token, selectedStoreSlug]);

    const fetchRubros = useCallback(async () => {
        if (!token || !selectedStoreSlug) return;
        setLoadingRubros(true);
        try {
            setRubros(await fetchTodosLosRubros());
        } catch (err) {
            // silencioso: no bloquea la pantalla de carga si falla
        } finally {
            setLoadingRubros(false);
        }
    }, [token, selectedStoreSlug, fetchTodosLosRubros]);

    useEffect(() => { fetchRubros(); }, [fetchRubros]);

    const empezarEdicionRubro = (rubro) => {
        setRubroEditando(rubro.id);
        setValorEditadoIva(String(rubro.iva_porcentaje));
    };

    const guardarEdicionRubro = async (rubroId) => {
        const iva = parseFloat(valorEditadoIva);
        if (isNaN(iva) || iva < 0) {
            Swal.fire('Error', 'Ingresá un % de IVA válido.', 'error');
            return;
        }
        setGuardandoEdicionRubro(true);
        try {
            await axios.patch(`${BASE_API_ENDPOINT}/api/rubros/${rubroId}/`, { iva_porcentaje: iva }, {
                headers: { Authorization: `Bearer ${token}` },
            });
            setRubroEditando(null);
            fetchRubros();
        } catch (err) {
            Swal.fire('Error', 'No se pudo actualizar el IVA del rubro.', 'error');
        } finally {
            setGuardandoEdicionRubro(false);
        }
    };

    const eliminarRubro = (rubro) => {
        Swal.fire({
            title: '¿Eliminar rubro?',
            html: `Se eliminará <strong>${rubro.nombre}</strong>. Los productos que ya lo tenían asignado quedan sin rubro (no se borran ni se modifican).`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonText: 'Sí, eliminar',
            cancelButtonText: 'Cancelar',
            confirmButtonColor: '#e25252',
        }).then(async (result) => {
            if (!result.isConfirmed) return;
            try {
                await axios.delete(`${BASE_API_ENDPOINT}/api/rubros/${rubro.id}/`, {
                    headers: { Authorization: `Bearer ${token}` },
                });
                fetchRubros();
            } catch (err) {
                Swal.fire('Error', 'No se pudo eliminar el rubro.', 'error');
            }
        });
    };

    const crearRubro = async () => {
        const iva = parseFloat(nuevoRubroIva);
        if (!nuevoRubroNombre.trim()) {
            Swal.fire('Error', 'Ingresá un nombre de rubro.', 'error');
            return;
        }
        if (isNaN(iva) || iva < 0) {
            Swal.fire('Error', 'Ingresá un % de IVA válido.', 'error');
            return;
        }
        setGuardandoNuevoRubro(true);
        try {
            await axios.post(`${BASE_API_ENDPOINT}/api/rubros/`, {
                tienda_slug: selectedStoreSlug, nombre: nuevoRubroNombre.trim(), iva_porcentaje: iva,
            }, { headers: { Authorization: `Bearer ${token}` } });
            setMostrarNuevoRubro(false);
            setNuevoRubroNombre('');
            setNuevoRubroIva('');
            fetchRubros();
        } catch (err) {
            const data = err.response?.data;
            const msg = data ? Object.values(data).flat().join(' — ') : 'No se pudo crear el rubro.';
            Swal.fire('Error', msg, 'error');
        } finally {
            setGuardandoNuevoRubro(false);
        }
    };

    const resetear = () => {
        setStep('upload');
        setError(null);
        setNombreArchivo('');
        setFilasParsed([]);
        setRubrosPorAsignar([]);
        setPreviewData(null);
        setResultadoFinal(null);
        setActualizarStock(true);
    };

    const descargarPlantilla = () => {
        const headers = ['Código Interno', 'Nombre', 'Rubro', 'IVA %', 'Costo', 'Precio de Venta', 'Margen %', 'Cantidad', 'Código de Barras'];
        const ejemplo = ['FER-001', 'Martillo de goma', 'Herramientas', '', 1000, '', 30, 10, ''];
        const wb = XLSX.utils.book_new();
        const ws = XLSX.utils.aoa_to_sheet([headers, ejemplo]);
        XLSX.utils.book_append_sheet(wb, ws, 'Productos');
        XLSX.writeFile(wb, 'plantilla_carga_productos.xlsx');
    };

    const ejecutarPreview = async (filas) => {
        setLoadingPreview(true);
        setStep('preview');
        try {
            const resp = await axios.post(`${BASE_API_ENDPOINT}/api/productos/carga_masiva/`, {
                tienda_slug: selectedStoreSlug, modo: 'preview', filas,
            }, { headers: { Authorization: `Bearer ${token}` } });
            setPreviewData(resp.data);
        } catch (err) {
            Swal.fire('Error', err.response?.data?.error || 'No se pudo generar la vista previa.', 'error');
            setStep('upload');
        } finally {
            setLoadingPreview(false);
        }
    };

    const resolverRubros = async (filas) => {
        const rubrosEnArchivo = new Set();
        filas.forEach((f) => {
            const tieneIvaDirecto = f.iva_porcentaje !== undefined && f.iva_porcentaje !== '' && f.iva_porcentaje !== null;
            const rubroNombre = (f.rubro || '').toString().trim();
            if (!tieneIvaDirecto && rubroNombre) rubrosEnArchivo.add(rubroNombre);
        });
        if (rubrosEnArchivo.size === 0) {
            await ejecutarPreview(filas);
            return;
        }
        try {
            const existentes = await fetchTodosLosRubros();
            const existentesLower = new Set(existentes.map((r) => r.nombre.trim().toLowerCase()));
            const faltantes = [...rubrosEnArchivo].filter((r) => !existentesLower.has(r.toLowerCase()));
            if (faltantes.length > 0) {
                setRubrosPorAsignar(faltantes.map((nombre) => ({ nombre, iva: '' })));
                setStep('asignar_rubros');
            } else {
                await ejecutarPreview(filas);
            }
        } catch (err) {
            setError('No se pudieron cargar los rubros existentes de la tienda.');
        }
    };

    const handleArchivo = async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        setError(null);
        setNombreArchivo(file.name);
        try {
            const data = await file.arrayBuffer();
            const workbook = XLSX.read(data, { type: 'array' });
            const sheet = workbook.Sheets[workbook.SheetNames[0]];
            const rawRows = XLSX.utils.sheet_to_json(sheet, { defval: '' });

            if (rawRows.length === 0) {
                setError('El archivo no tiene filas de datos.');
                return;
            }
            if (rawRows.length > MAX_FILAS_IMPORT) {
                setError(
                    `El archivo tiene ${rawRows.length.toLocaleString('es-AR')} filas. Por ahora el máximo por ` +
                    `importación es ${MAX_FILAS_IMPORT.toLocaleString('es-AR')} (archivos más grandes pueden hacer ` +
                    `quedarse sin memoria al navegador). Dividí el archivo en partes de hasta ` +
                    `${MAX_FILAS_IMPORT.toLocaleString('es-AR')} filas e importalas una por una.`
                );
                return;
            }

            const headersReales = Object.keys(rawRows[0]);
            const mapeo = {};
            headersReales.forEach((h) => {
                const campo = MAPEO_COLUMNAS[normalizarHeader(h)];
                if (campo) mapeo[h] = campo;
            });

            const columnasEncontradas = Object.values(mapeo);
            const faltantes = COLUMNAS_REQUERIDAS.filter((r) => !columnasEncontradas.includes(r));
            if (faltantes.length > 0) {
                setError(`Faltan columnas obligatorias en el archivo: ${faltantes.join(', ')}. Descargá la plantilla para ver el formato esperado.`);
                return;
            }

            const filas = rawRows.map((row, i) => {
                const filaObj = { fila: i + 2 };
                Object.entries(mapeo).forEach(([headerReal, campo]) => {
                    filaObj[campo] = row[headerReal];
                });
                return filaObj;
            });

            setFilasParsed(filas);
            await resolverRubros(filas);
        } catch (err) {
            setError('No se pudo leer el archivo. Verificá que sea un Excel (.xlsx) o CSV válido.');
        }
    };

    const guardarRubrosYContinuar = async () => {
        const invalido = rubrosPorAsignar.some((r) => r.iva === '' || isNaN(parseFloat(r.iva)) || parseFloat(r.iva) < 0);
        if (invalido) {
            Swal.fire('Error', 'Asigná un % de IVA válido (0 o mayor) a cada rubro.', 'error');
            return;
        }
        setGuardandoRubros(true);
        try {
            for (const r of rubrosPorAsignar) {
                await axios.post(`${BASE_API_ENDPOINT}/api/rubros/`, {
                    tienda_slug: selectedStoreSlug, nombre: r.nombre, iva_porcentaje: parseFloat(r.iva),
                }, { headers: { Authorization: `Bearer ${token}` } });
            }
            fetchRubros();
            await ejecutarPreview(filasParsed);
        } catch (err) {
            Swal.fire('Error', 'No se pudo guardar el IVA de los rubros.', 'error');
        } finally {
            setGuardandoRubros(false);
        }
    };

    const confirmarImportacion = async () => {
        const filasValidas = previewData.resultados.filter((r) => !r.error).length;
        const { isConfirmed } = await Swal.fire({
            title: '¿Confirmar importación?',
            html: `Se van a crear/actualizar <strong>${filasValidas}</strong> producto(s). Las filas con error no se van a procesar.` +
                (actualizarStock
                    ? ''
                    : '<br/><br/><strong>No se va a modificar el stock</strong> de los productos que ya existen (solo precio/IVA/rubro/código de barras).'),
            icon: 'question',
            showCancelButton: true,
            confirmButtonText: 'Sí, importar',
            cancelButtonText: 'Cancelar',
            confirmButtonColor: '#5dc87a',
        });
        if (!isConfirmed) return;
        setConfirmando(true);
        try {
            const resp = await axios.post(`${BASE_API_ENDPOINT}/api/productos/carga_masiva/`, {
                tienda_slug: selectedStoreSlug, modo: 'confirmar', filas: filasParsed, actualizar_stock: actualizarStock,
            }, { headers: { Authorization: `Bearer ${token}` } });
            setResultadoFinal(resp.data);
            setStep('resultado');
        } catch (err) {
            Swal.fire('Error', err.response?.data?.error || 'No se pudo completar la importación.', 'error');
        } finally {
            setConfirmando(false);
        }
    };

    const handleImprimirEtiquetasLote = () => {
        const productosParaImprimir = (resultadoFinal?.resultados || [])
            .filter((r) => !r.error && r.codigo_barras)
            .map((r) => ({
                id: r.codigo_interno,
                nombre: r.nombre,
                precio: parseFloat(r.precio_venta) || 0,
                codigo_barras: r.codigo_barras,
                variante_detalle: '',
                labelQuantity: 1,
            }));
        if (productosParaImprimir.length === 0) {
            Swal.fire('Sin etiquetas', 'Ninguna fila del lote tiene código de barras para imprimir.', 'info');
            return;
        }
        navigate('/etiquetas', { state: { productosParaImprimir } });
    };

    return (
        <div style={styles.container}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: 10 }}>
                <h1 style={styles.pageTitle}>Importar productos</h1>
                <button onClick={() => navigate('/productos')} style={styles.secondaryButton}>‹ Volver a Gestión de Productos</button>
            </div>

            {step === 'upload' && (
                <div style={styles.section}>
                    <h2 style={styles.sectionHeader}>1. Subí tu archivo</h2>
                    <ul style={styles.helpList}>
                        <li>Columnas obligatorias: <strong>Código Interno</strong>, <strong>Nombre</strong>, <strong>Costo</strong>, <strong>Cantidad</strong>.</li>
                        <li>Para el precio de venta: si cargás <strong>Precio de Venta</strong>, se usa ese. Si no, se calcula con <strong>Margen %</strong> (Costo + IVA + Margen).</li>
                        <li>El IVA puede venir por columna <strong>IVA %</strong> en cada fila, o asignarse por <strong>Rubro</strong> (te lo va a pedir si hay rubros nuevos).</li>
                        <li>Si el <strong>Código Interno</strong> ya existe en la tienda, no se duplica: se suma la cantidad al stock y se actualiza costo/precio.</li>
                        <li><strong>Código de Barras</strong> es opcional: si no lo cargás, se genera uno automáticamente para productos nuevos.</li>
                    </ul>
                    <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap', marginTop: 16 }}>
                        <button onClick={descargarPlantilla} style={styles.secondaryButton}>Descargar plantilla</button>
                        <label style={styles.fileLabel}>
                            {nombreArchivo || 'Elegir archivo (.xlsx o .csv)'}
                            <input type="file" accept=".xlsx,.xls,.csv" onChange={handleArchivo} style={{ display: 'none' }} />
                        </label>
                    </div>
                    {error && <div style={styles.errorMessage}>{error}</div>}
                </div>
            )}

            {step === 'upload' && (
                <div style={styles.section}>
                    <h2 style={styles.sectionHeader}>Rubros y % IVA</h2>
                    <p style={{ color: '#94a3b8', fontSize: 14, marginTop: 0 }}>
                        Acá se ven y se editan los rubros ya guardados para esta tienda. Se usan para calcular
                        el precio de venta cuando el archivo no trae un IVA explícito por fila.
                    </p>
                    {loadingRubros ? (
                        <p style={styles.noDataMessage}>Cargando...</p>
                    ) : rubros.length === 0 ? (
                        <p style={styles.noDataMessage}>Todavía no hay rubros guardados.</p>
                    ) : (
                        <div style={styles.tableResponsive}>
                            <table style={styles.table}>
                                <thead>
                                    <tr style={styles.tableHeaderRow}>
                                        <th style={styles.th}>Rubro</th>
                                        <th style={styles.th}>IVA %</th>
                                        <th style={styles.th}></th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {rubros.map((r) => (
                                        <tr key={r.id} style={styles.tableRow}>
                                            <td style={styles.td}>{r.nombre}</td>
                                            <td style={styles.td}>
                                                {rubroEditando === r.id ? (
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                                        <input
                                                            type="number" min="0" step="0.01" autoFocus
                                                            value={valorEditadoIva}
                                                            onChange={(e) => setValorEditadoIva(e.target.value)}
                                                            onKeyDown={(e) => { if (e.key === 'Enter') guardarEdicionRubro(r.id); if (e.key === 'Escape') setRubroEditando(null); }}
                                                            style={{ ...styles.inputField, width: 90 }}
                                                        />
                                                        <button onClick={() => guardarEdicionRubro(r.id)} disabled={guardandoEdicionRubro} style={styles.iconButtonGreen} title="Guardar">✓</button>
                                                        <button onClick={() => setRubroEditando(null)} style={styles.iconButtonGray} title="Cancelar">✕</button>
                                                    </div>
                                                ) : (
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                                        <span>{r.iva_porcentaje}%</span>
                                                        <button onClick={() => empezarEdicionRubro(r)} style={styles.pencilButton} title="Editar IVA">✏️</button>
                                                    </div>
                                                )}
                                            </td>
                                            <td style={styles.td}>
                                                <button onClick={() => eliminarRubro(r)} style={styles.pencilButton} title="Eliminar rubro">🗑️</button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}

                    {mostrarNuevoRubro ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 16, flexWrap: 'wrap' }}>
                            <input
                                type="text" placeholder="Nombre del rubro"
                                value={nuevoRubroNombre}
                                onChange={(e) => setNuevoRubroNombre(e.target.value)}
                                style={{ ...styles.inputField, width: 200 }}
                            />
                            <input
                                type="number" min="0" step="0.01" placeholder="% IVA"
                                value={nuevoRubroIva}
                                onChange={(e) => setNuevoRubroIva(e.target.value)}
                                style={{ ...styles.inputField, width: 100 }}
                            />
                            <button onClick={crearRubro} disabled={guardandoNuevoRubro} style={styles.primaryButton}>
                                {guardandoNuevoRubro ? 'Guardando...' : 'Guardar rubro'}
                            </button>
                            <button onClick={() => { setMostrarNuevoRubro(false); setNuevoRubroNombre(''); setNuevoRubroIva(''); }} style={styles.modalCancelButton}>
                                Cancelar
                            </button>
                        </div>
                    ) : (
                        <button onClick={() => setMostrarNuevoRubro(true)} style={{ ...styles.secondaryButton, marginTop: 16 }}>
                            + Nuevo rubro
                        </button>
                    )}
                </div>
            )}

            {step === 'asignar_rubros' && (
                <div style={styles.section}>
                    <h2 style={styles.sectionHeader}>2. Asigná el IVA a los rubros nuevos</h2>
                    <p style={{ color: '#94a3b8', fontSize: 14 }}>
                        Estos rubros aparecen en tu archivo pero todavía no tienen un % de IVA guardado en esta tienda.
                        Se va a recordar para la próxima carga.
                    </p>
                    {rubrosPorAsignar.map((r, i) => (
                        <div key={r.nombre} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                            <span style={{ minWidth: 180, fontWeight: 600 }}>{r.nombre}</span>
                            <input
                                type="number" min="0" step="0.01" placeholder="% IVA"
                                value={r.iva}
                                onChange={(e) => setRubrosPorAsignar((prev) => prev.map((x, j) => j === i ? { ...x, iva: e.target.value } : x))}
                                style={{ ...styles.inputField, width: 120 }}
                            />
                        </div>
                    ))}
                    <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
                        <button onClick={resetear} style={styles.modalCancelButton}>Cancelar</button>
                        <button onClick={guardarRubrosYContinuar} disabled={guardandoRubros} style={styles.primaryButton}>
                            {guardandoRubros ? 'Guardando...' : 'Guardar y continuar'}
                        </button>
                    </div>
                </div>
            )}

            {step === 'preview' && (
                <div style={styles.section}>
                    <h2 style={styles.sectionHeader}>3. Revisá antes de confirmar</h2>
                    {loadingPreview || !previewData ? (
                        <p style={styles.noDataMessage}>Calculando precios y revisando duplicados...</p>
                    ) : (
                        <>
                            <p>
                                <strong>{previewData.resultados.filter((r) => !r.error).length}</strong> fila(s) listas para importar,{' '}
                                <strong style={{ color: '#e25252' }}>{previewData.errores}</strong> con error.
                            </p>
                            {(() => {
                                const conError = previewData.resultados.filter((r) => r.error);
                                const sinError = previewData.resultados.filter((r) => !r.error);
                                const filasAMostrar = conError.length >= PREVIEW_DISPLAY_LIMIT
                                    ? conError.slice(0, PREVIEW_DISPLAY_LIMIT)
                                    : [...conError, ...sinError.slice(0, PREVIEW_DISPLAY_LIMIT - conError.length)];
                                const ocultas = previewData.resultados.length - filasAMostrar.length;
                                return (
                                    <>
                                        {ocultas > 0 && (
                                            <p style={{ color: '#94a3b8', fontSize: 13 }}>
                                                Mostrando {filasAMostrar.length.toLocaleString('es-AR')} de{' '}
                                                {previewData.resultados.length.toLocaleString('es-AR')} filas
                                                (priorizando las que tienen error). Al confirmar se procesan todas.
                                            </p>
                                        )}
                                        <div style={styles.tableResponsive}>
                                            <table style={styles.table}>
                                                <thead>
                                                    <tr style={styles.tableHeaderRow}>
                                                        <th style={styles.th}>Fila</th>
                                                        <th style={styles.th}>Código Interno</th>
                                                        <th style={styles.th}>Nombre</th>
                                                        <th style={styles.th}>Estado</th>
                                                        <th style={styles.th}>IVA %</th>
                                                        <th style={styles.th}>Precio de Venta</th>
                                                        <th style={styles.th}>Cantidad</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {filasAMostrar.map((r) => (
                                                        <tr key={r.fila} style={r.error ? styles.tableRowError : styles.tableRow}>
                                                            <td style={styles.td}>{r.fila}</td>
                                                            <td style={styles.td}>{r.codigo_interno}</td>
                                                            <td style={styles.td}>{r.nombre}</td>
                                                            <td style={styles.td}>
                                                                {r.error ? (
                                                                    <span style={{ color: '#e25252' }}>{r.error}</span>
                                                                ) : (
                                                                    <span style={{ color: r.estado === 'nuevo' ? '#1a6a40' : '#3b9ede', fontWeight: 700 }}>
                                                                        {r.estado === 'nuevo' ? 'Nuevo' : 'Reposición'}
                                                                    </span>
                                                                )}
                                                            </td>
                                                            <td style={styles.td}>{r.iva_porcentaje ?? '—'}</td>
                                                            <td style={styles.td}>{r.precio_venta ? formatearMonto(r.precio_venta) : '—'}</td>
                                                            <td style={styles.td}>{r.cantidad ?? '—'}</td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    </>
                                );
                            })()}
                            <label style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 16, fontSize: 14, cursor: 'pointer' }}>
                                <input
                                    type="checkbox"
                                    checked={!actualizarStock}
                                    onChange={(e) => setActualizarStock(!e.target.checked)}
                                />
                                No sumar stock (solo actualizar precio, IVA, rubro y código de barras de productos ya existentes)
                            </label>
                            <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
                                <button onClick={resetear} style={styles.modalCancelButton}>Cancelar</button>
                                <button
                                    onClick={confirmarImportacion}
                                    disabled={confirmando || previewData.resultados.every((r) => r.error)}
                                    style={styles.primaryButton}
                                >
                                    {confirmando ? 'Importando...' : 'Confirmar importación'}
                                </button>
                            </div>
                        </>
                    )}
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
                        <button onClick={resetear} style={styles.secondaryButton}>Importar otro archivo</button>
                        <button onClick={() => navigate('/productos')} style={styles.primaryButton}>Ir a Gestión de Productos</button>
                        {(resultadoFinal.creados > 0 || resultadoFinal.actualizados > 0) && (
                            <button onClick={handleImprimirEtiquetasLote} style={styles.primaryButton}>
                                Imprimir etiquetas de este lote
                            </button>
                        )}
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
    pencilButton: { background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, color: '#94a3b8', padding: 2, lineHeight: 1 },
    iconButtonGreen: { background: '#5dc87a', color: 'white', border: 'none', borderRadius: 6, cursor: 'pointer', width: 28, height: 28, fontWeight: 700 },
    iconButtonGray: { background: '#e2e8f0', color: '#475569', border: 'none', borderRadius: 6, cursor: 'pointer', width: 28, height: 28, fontWeight: 700 },
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
    tableRow: { '&:nth-child(even)': { backgroundColor: '#f1f5f9' } },
    tableRowError: { backgroundColor: '#fef2f2' },
    td: { padding: '10px', borderBottom: '1px solid #e2e8f0', verticalAlign: 'middle' },
};

export default CargaMasivaProductos;
