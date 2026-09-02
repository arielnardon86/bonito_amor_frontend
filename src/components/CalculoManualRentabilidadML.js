import React, { useState, useEffect, useMemo, useRef } from 'react';
import * as XLSX from 'xlsx';
import axios from 'axios';
import { useAuth } from '../AuthContext';

const normalizeApiUrl = (url) => {
    if (!url) return 'http://localhost:8000';
    let u = url;
    if (u.endsWith('/api/') || u.endsWith('/api')) u = u.replace(/\/api\/?$/, '');
    if (u.endsWith('/')) u = u.slice(0, -1);
    return u;
};
const BASE = normalizeApiUrl(process.env.REACT_APP_API_URL || 'http://localhost:8000');

/* ===================== Parsing del Excel de ventas de ML (puro, sin DOM) ===================== */

const MESES = { enero: 0, febrero: 1, marzo: 2, abril: 3, mayo: 4, junio: 5, julio: 6, agosto: 7, septiembre: 8, setiembre: 8, octubre: 9, noviembre: 10, diciembre: 11 };

function toNum(v) {
    if (typeof v === 'number') return v;
    if (v == null) return 0;
    const s = String(v).trim();
    if (s === '') return 0;
    const n = parseFloat(s.replace(',', '.'));
    return isNaN(n) ? 0 : n;
}

function parseFechaVenta(s) {
    if (!s) return null;
    const str = String(s);
    const m = str.match(/(\d{1,2}) de (\p{L}+) de (\d{4})[^\d]*(\d{1,2}):(\d{2})/iu);
    if (m) {
        const mon1 = MESES[m[2].toLowerCase()];
        if (mon1 === undefined) return null;
        return new Date(+m[3], mon1, +m[1], +m[4], +m[5]);
    }
    const m2 = str.match(/(\d{1,2}) de (\p{L}+) de (\d{4})/iu);
    if (!m2) return null;
    const mon2 = MESES[m2[2].toLowerCase()];
    if (mon2 === undefined) return null;
    return new Date(+m2[3], mon2, +m2[1]);
}

function findHeaderRow(aoa) {
    for (let r = 0; r < Math.min(aoa.length, 30); r++) {
        const row = aoa[r];
        if (!row) continue;
        if (String(row[0] || '').trim() === '# de venta') return r;
    }
    for (let r = 0; r < Math.min(aoa.length, 30); r++) {
        const row2 = aoa[r] || [];
        let hasVenta = false, hasFecha = false;
        for (let c = 0; c < row2.length; c++) {
            const v = String(row2[c] || '').trim();
            if (v === '# de venta') hasVenta = true;
            if (v === 'Fecha de venta') hasFecha = true;
        }
        if (hasVenta && hasFecha) return r;
    }
    return -1;
}

function buildColumnMap(headerRow) {
    const map = {};
    headerRow.forEach((h, i) => {
        const name = String(h || '').trim();
        if (!name) return;
        if (!map[name]) map[name] = [];
        map[name].push(i);
    });
    return map;
}

function idx(map, name, occurrence) {
    occurrence = occurrence || 0;
    const arr = map[name];
    if (!arr || !arr.length) return -1;
    return arr[occurrence] !== undefined ? arr[occurrence] : arr[arr.length - 1];
}

function findProvinceIdx(headerRow, map) {
    const arr = map['Estado'] || [];
    for (let k = 0; k < arr.length; k++) {
        const i = arr[k];
        if (String(headerRow[i - 1] || '').trim() === 'Ciudad') return i;
    }
    return arr.length ? arr[arr.length - 1] : -1;
}

function findOrderStatusIdx(headerRow, map) {
    const arr = map['Estado'] || [];
    for (let k = 0; k < arr.length; k++) {
        const i = arr[k];
        if (String(headerRow[i - 1] || '').trim() === 'Fecha de venta') return i;
    }
    return arr.length ? arr[0] : -1;
}

function findUnidadesIdx(headerRow, map) {
    const arr = map['Unidades'] || [];
    for (let k = 0; k < arr.length; k++) {
        const i = arr[k];
        if (String(headerRow[i - 1] || '').trim() === 'Pertenece a un kit') return i;
    }
    return arr.length ? arr[0] : -1;
}

function parseWorkbookAOA(aoa) {
    const headerRowIdx = findHeaderRow(aoa);
    if (headerRowIdx < 0) throw new Error('No se encontró la fila de encabezados ("# de venta"). Verificá que sea un reporte de Ventas de Mercado Libre / Mercado Shops.');
    const headerRow = aoa[headerRowIdx].map((v) => String(v || '').trim());
    const map = buildColumnMap(headerRow);

    const iVenta = idx(map, '# de venta');
    const iFecha = idx(map, 'Fecha de venta');
    const iEstadoOrden = findOrderStatusIdx(headerRow, map);
    const iUnidades = findUnidadesIdx(headerRow, map);
    const iIngProd = idx(map, 'Ingresos por productos (ARS)');
    const iCargoVenta = idx(map, 'Cargo por venta');
    const iCostoFijo = idx(map, 'Costo fijo');
    const iCostoCuotas = idx(map, 'Costo por ofrecer cuotas');
    const iIngEnvio = idx(map, 'Ingresos por envío (ARS)');
    const iCostoEnvio = idx(map, 'Costos de envío (ARS)');
    const iCostoEnvioMedidas = idx(map, 'Costo de envío basado en medidas y peso declarados');
    const iCargoDifMedidas = idx(map, 'Cargo por diferencias en medidas y peso del paquete');
    const iImpuestos = idx(map, 'Impuestos');
    const iDescuentos = idx(map, 'Descuentos y bonificaciones');
    const iAnulaciones = idx(map, 'Anulaciones y reembolsos (ARS)');
    const iTotal = idx(map, 'Total (ARS)');
    const iSKU = idx(map, 'SKU');
    const iPublicacion = idx(map, '# de publicación');
    const iTienda = idx(map, 'Tienda oficial');
    const iTitulo = idx(map, 'Título de la publicación');
    const iVariante = idx(map, 'Variante');
    const iPrecioUnit = idx(map, 'Precio unitario de venta de la publicación (ARS)');
    const iCiudad = idx(map, 'Ciudad');
    const iProvincia = findProvinceIdx(headerRow, map);

    if ([iVenta, iFecha, iEstadoOrden, iUnidades, iTotal].some((i) => i < 0)) {
        throw new Error('El archivo no tiene el formato esperado del reporte de Ventas de Mercado Libre / Mercado Shops.');
    }

    const records = [];
    for (let r = headerRowIdx + 1; r < aoa.length; r++) {
        const row = aoa[r];
        if (!row) continue;
        const ventaId = row[iVenta];
        if (ventaId === undefined || ventaId === null || String(ventaId).trim() === '') continue;
        const estadoOrden = String(row[iEstadoOrden] || '').trim();
        const rec = {
            id: String(ventaId).trim(),
            fecha: parseFechaVenta(row[iFecha]),
            estado: estadoOrden,
            isCancelada: /cancelad/i.test(estadoOrden),
            isDevolucion: /devoluc/i.test(estadoOrden),
            unidades: toNum(row[iUnidades]),
            ingresosProductos: toNum(row[iIngProd]),
            cargoVenta: toNum(row[iCargoVenta]),
            costoFijo: toNum(row[iCostoFijo]),
            costoCuotas: toNum(row[iCostoCuotas]),
            ingresosEnvio: toNum(row[iIngEnvio]),
            costoEnvio: toNum(row[iCostoEnvio]),
            costoEnvioMedidas: toNum(row[iCostoEnvioMedidas]),
            cargoDifMedidas: toNum(row[iCargoDifMedidas]),
            impuestos: toNum(row[iImpuestos]),
            descuentos: toNum(row[iDescuentos]),
            anulaciones: toNum(row[iAnulaciones]),
            total: toNum(row[iTotal]),
            sku: String(row[iSKU] || '').trim(),
            publicacion: String(row[iPublicacion] || '').trim(),
            tienda: String(row[iTienda] || '').trim(),
            titulo: String(row[iTitulo] || '').trim(),
            variante: String(row[iVariante] || '').trim(),
            precioUnitario: toNum(row[iPrecioUnit]),
            ciudad: String(row[iCiudad] || '').trim(),
            provincia: String(row[iProvincia] || '').trim(),
        };
        rec.comisionTotal = rec.cargoVenta + rec.costoFijo + rec.costoCuotas;
        rec.envioNeto = rec.ingresosEnvio + rec.costoEnvio + rec.costoEnvioMedidas + rec.cargoDifMedidas;
        rec.productKey = rec.sku ? ('SKU:' + rec.sku) : (rec.publicacion ? ('PUB:' + rec.publicacion + (rec.variante ? ('|' + rec.variante) : '')) : ('TIT:' + rec.titulo));
        records.push(rec);
    }
    return records;
}

/* ===================== Mapa de provincias ===================== */

const PROVINCE_TILES = [
    { name: 'Jujuy', abbr: 'Jujuy', row: 1, col: 2 },
    { name: 'Formosa', abbr: 'Formosa', row: 1, col: 4 },
    { name: 'Salta', abbr: 'Salta', row: 2, col: 2 },
    { name: 'Chaco', abbr: 'Chaco', row: 2, col: 4 },
    { name: 'Misiones', abbr: 'Misiones', row: 2, col: 5 },
    { name: 'Catamarca', abbr: 'Catamarca', row: 3, col: 1 },
    { name: 'Tucumán', abbr: 'Tucumán', row: 3, col: 2 },
    { name: 'Santiago del Estero', abbr: 'Sgo. del Estero', row: 3, col: 3 },
    { name: 'Corrientes', abbr: 'Corrientes', row: 3, col: 5 },
    { name: 'La Rioja', abbr: 'La Rioja', row: 4, col: 1 },
    { name: 'Santa Fe', abbr: 'Santa Fe', row: 4, col: 4 },
    { name: 'Entre Ríos', abbr: 'Entre Ríos', row: 4, col: 5 },
    { name: 'San Juan', abbr: 'San Juan', row: 5, col: 1 },
    { name: 'Córdoba', abbr: 'Córdoba', row: 5, col: 3 },
    { name: 'Mendoza', abbr: 'Mendoza', row: 6, col: 1 },
    { name: 'San Luis', abbr: 'San Luis', row: 6, col: 2 },
    { name: 'La Pampa', abbr: 'La Pampa', row: 7, col: 2 },
    { name: 'Buenos Aires', abbr: 'Buenos Aires', row: 7, col: 4 },
    { name: 'Capital Federal', abbr: 'CABA', row: 7, col: 5 },
    { name: 'Neuquén', abbr: 'Neuquén', row: 8, col: 1 },
    { name: 'Río Negro', abbr: 'Río Negro', row: 8, col: 2 },
    { name: 'Chubut', abbr: 'Chubut', row: 9, col: 2 },
    { name: 'Santa Cruz', abbr: 'Santa Cruz', row: 10, col: 2 },
    { name: 'Tierra del Fuego', abbr: 'T. del Fuego', row: 11, col: 2 },
];
const TILE_GRID_ROWS = 11, TILE_GRID_COLS = 5;

function colorScale(v, max) {
    if (!max || v <= 0) return null;
    const t = Math.sqrt(v / max);
    const c0 = [219, 234, 254], c1 = [29, 78, 216];
    const rgb = c0.map((c, i) => Math.round(c + (c1[i] - c) * t));
    return { rgb, t };
}

/* ===================== Formato ===================== */

const fmtARS = new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 });
const fmtInt = new Intl.NumberFormat('es-AR');
const fmtDate = (d) => !d ? '-' : d.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' }) + ' ' + d.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' });

function normalizarClave(s) {
    return String(s || '').trim().toLowerCase();
}

function mesActualISO() {
    const hoy = new Date();
    const desde = new Date(hoy.getFullYear(), hoy.getMonth(), 1);
    const hasta = new Date(hoy.getFullYear(), hoy.getMonth() + 1, 0);
    const f = (d) => d.toISOString().slice(0, 10);
    return { desde: f(desde), hasta: f(hasta) };
}

export default function CalculoManualRentabilidadML({ onClose }) {
    const { token, selectedStoreSlug } = useAuth();
    const headers = useMemo(() => ({ Authorization: `Bearer ${token}` }), [token]);
    const fileInputRef = useRef(null);

    const [records, setRecords] = useState([]);
    const [fileName, setFileName] = useState('');
    const [error, setError] = useState('');

    const periodoInicial = mesActualISO();
    const [periodoDesde, setPeriodoDesde] = useState(periodoInicial.desde);
    const [periodoHasta, setPeriodoHasta] = useState(periodoInicial.hasta);

    const [productosTienda, setProductosTienda] = useState([]);
    const [cargandoProductos, setCargandoProductos] = useState(false);

    const [egresosPeriodo, setEgresosPeriodo] = useState([]);
    const [cargandoEgresos, setCargandoEgresos] = useState(false);

    const lsCostsKey = `mldash_costs_override_${selectedStoreSlug || 'default'}`;
    const [costOverrides, setCostOverrides] = useState(() => {
        try { return JSON.parse(localStorage.getItem(lsCostsKey) || '{}'); } catch { return {}; }
    });
    useEffect(() => { localStorage.setItem(lsCostsKey, JSON.stringify(costOverrides)); }, [costOverrides, lsCostsKey]);

    const [sortProd, setSortProd] = useState({ key: 'unidades', dir: -1 });
    const [sortSales, setSortSales] = useState({ key: 'fecha', dir: -1 });
    const [filterSearch, setFilterSearch] = useState('');
    const [filterStatus, setFilterStatus] = useState('__all__');
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(50);

    // Catálogo completo de la tienda, para completar el costo unitario automáticamente por SKU/código/nombre
    useEffect(() => {
        if (!token || !selectedStoreSlug) return;
        setCargandoProductos(true);
        axios.get(`${BASE}/api/productos/`, { headers, params: { tienda_slug: selectedStoreSlug, page_size: 5000 } })
            .then((res) => setProductosTienda(res.data.results || res.data || []))
            .catch(() => setProductosTienda([]))
            .finally(() => setCargandoProductos(false));
    }, [token, selectedStoreSlug, headers]);

    // Egresos (Registro de Egresos) del período seleccionado
    useEffect(() => {
        if (!token || !selectedStoreSlug || !periodoDesde || !periodoHasta) return;
        let cancelado = false;
        setCargandoEgresos(true);
        (async () => {
            let all = [];
            let url = `${BASE}/api/compras/`;
            let params = { tienda_slug: selectedStoreSlug, date_from: periodoDesde, date_to: periodoHasta, page_size: 200 };
            try {
                while (url) {
                    const res = await axios.get(url, { headers, params });
                    all = all.concat(res.data.results || []);
                    url = res.data.next || null;
                    params = undefined;
                }
                if (!cancelado) setEgresosPeriodo(all);
            } catch {
                if (!cancelado) setEgresosPeriodo([]);
            } finally {
                if (!cancelado) setCargandoEgresos(false);
            }
        })();
        return () => { cancelado = true; };
    }, [token, selectedStoreSlug, periodoDesde, periodoHasta, headers]);

    const productoPorClave = useMemo(() => {
        const map = new Map();
        productosTienda.forEach((p) => {
            if (p.codigo_interno) map.set('cod:' + normalizarClave(p.codigo_interno), p);
            if (p.codigo_barras) map.set('cod:' + normalizarClave(p.codigo_barras), p);
            map.set('nom:' + normalizarClave(p.nombre), p);
        });
        return map;
    }, [productosTienda]);

    const matchearProducto = React.useCallback((row) => {
        if (row.sku && productoPorClave.has('cod:' + normalizarClave(row.sku))) return productoPorClave.get('cod:' + normalizarClave(row.sku));
        if (row.publicacion && productoPorClave.has('cod:' + normalizarClave(row.publicacion))) return productoPorClave.get('cod:' + normalizarClave(row.publicacion));
        if (row.titulo && productoPorClave.has('nom:' + normalizarClave(row.titulo))) return productoPorClave.get('nom:' + normalizarClave(row.titulo));
        return null;
    }, [productoPorClave]);

    function handleFile(file) {
        setError('');
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const data = new Uint8Array(e.target.result);
                const wb = XLSX.read(data, { type: 'array', cellDates: false });
                const sheetName = wb.SheetNames.find((n) => /venta/i.test(n)) || wb.SheetNames[0];
                const ws = wb.Sheets[sheetName];
                const aoa = XLSX.utils.sheet_to_json(ws, { header: 1, raw: true, defval: '' });
                const recs = parseWorkbookAOA(aoa);
                if (!recs.length) {
                    setError('Se pudo leer el archivo pero no se encontraron filas de ventas. Verificá que sea el reporte de Ventas de Mercado Libre / Mercado Shops.');
                    return;
                }
                setRecords(recs);
                setFileName(file.name);
                setPage(1);
            } catch (err) {
                setError('No se pudo procesar el archivo: ' + err.message);
            }
        };
        reader.onerror = () => setError('No se pudo leer el archivo.');
        reader.readAsArrayBuffer(file);
    }

    // Registros dentro del período elegido (además del filtro por fecha del propio Excel)
    const recordsPeriodo = useMemo(() => {
        if (!periodoDesde || !periodoHasta) return records;
        const desde = new Date(periodoDesde + 'T00:00:00');
        const hasta = new Date(periodoHasta + 'T23:59:59');
        return records.filter((r) => r.fecha && r.fecha >= desde && r.fecha <= hasta);
    }, [records, periodoDesde, periodoHasta]);

    const activeRecords = useMemo(() => recordsPeriodo.filter((r) => !r.isCancelada), [recordsPeriodo]);

    const kpis = useMemo(() => {
        const sum = (arr, key) => arr.reduce((a, r) => a + r[key], 0);
        const facturacionBruta = sum(recordsPeriodo, 'ingresosProductos') + sum(recordsPeriodo, 'ingresosEnvio');
        const nVentas = new Set(activeRecords.map((r) => r.id)).size;
        const nCanceladas = new Set(recordsPeriodo.filter((r) => r.isCancelada).map((r) => r.id)).size;
        return {
            facturacionBruta,
            comisiones: sum(recordsPeriodo, 'comisionTotal'),
            envioNeto: sum(recordsPeriodo, 'envioNeto'),
            impuestos: sum(recordsPeriodo, 'impuestos'),
            descuentos: sum(recordsPeriodo, 'descuentos'),
            anulaciones: sum(recordsPeriodo, 'anulaciones'),
            netoRecibido: sum(recordsPeriodo, 'total'),
            unidadesVendidas: sum(activeRecords, 'unidades'),
            nVentas, nCanceladas,
            ticketPromedio: nVentas > 0 ? facturacionBruta / nVentas : 0,
        };
    }, [recordsPeriodo, activeRecords]);

    const productRows = useMemo(() => {
        const map = new Map();
        activeRecords.forEach((r) => {
            if (!map.has(r.productKey)) {
                map.set(r.productKey, {
                    key: r.productKey, titulo: r.titulo, variante: r.variante, sku: r.sku, publicacion: r.publicacion,
                    unidades: 0, ingresos: 0, comisiones: 0, envioNeto: 0, total: 0, productoMatch: null,
                });
            }
            const p = map.get(r.productKey);
            p.unidades += r.unidades;
            p.ingresos += r.ingresosProductos;
            p.comisiones += r.comisionTotal;
            p.envioNeto += r.envioNeto;
            p.total += r.total;
            if (!p.productoMatch) p.productoMatch = matchearProducto(r);
        });
        const rows = Array.from(map.values());
        rows.forEach((p) => {
            const override = costOverrides[p.key];
            const costoUnit = override !== undefined ? toNum(override) : (p.productoMatch ? toNum(p.productoMatch.costo) : 0);
            p.costoUnitario = costoUnit;
            p.costoAutomatico = !!p.productoMatch && override === undefined;
            p.costoTotal = costoUnit * p.unidades;
            p.margen = p.total - p.costoTotal;
            p.margenPct = p.ingresos > 0 ? (p.margen / p.ingresos) : 0;
        });
        return rows;
    }, [activeRecords, costOverrides, matchearProducto]);

    const provinciaMap = useMemo(() => {
        const map = new Map();
        recordsPeriodo.filter((r) => !r.isCancelada && !r.isDevolucion).forEach((r) => {
            const key = r.provincia || '';
            map.set(key, (map.get(key) || 0) + r.unidades);
        });
        return map;
    }, [recordsPeriodo]);

    const gastosPeriodo = useMemo(() => egresosPeriodo.reduce((a, e) => a + toNum(e.total), 0), [egresosPeriodo]);
    const costoProductosPeriodo = useMemo(() => productRows.reduce((a, p) => a + p.costoTotal, 0), [productRows]);
    const gananciaNeta = kpis.netoRecibido - costoProductosPeriodo - gastosPeriodo;
    const margenGlobal = kpis.facturacionBruta > 0 ? gananciaNeta / kpis.facturacionBruta : 0;

    function sortRows(rows, spec) {
        const arr = rows.slice();
        arr.sort((a, b) => {
            let av = a[spec.key], bv = b[spec.key];
            if (av instanceof Date || bv instanceof Date) { av = av ? av.getTime() : -Infinity; bv = bv ? bv.getTime() : -Infinity; }
            if (typeof av === 'string') { av = av.toLowerCase(); bv = (bv || '').toLowerCase(); }
            if (av < bv) return -1 * spec.dir;
            if (av > bv) return 1 * spec.dir;
            return 0;
        });
        return arr;
    }

    const productRowsSorted = useMemo(() => sortRows(productRows, sortProd), [productRows, sortProd]);

    const distinctStatuses = useMemo(() => Array.from(new Set(recordsPeriodo.map((r) => r.estado))).sort(), [recordsPeriodo]);

    const filteredSalesRows = useMemo(() => {
        const q = filterSearch.trim().toLowerCase();
        return recordsPeriodo.filter((r) => {
            if (filterStatus !== '__all__' && r.estado !== filterStatus) return false;
            if (q) {
                const hay = (r.titulo + ' ' + r.sku + ' ' + r.publicacion + ' ' + r.provincia + ' ' + r.variante + ' ' + r.id).toLowerCase();
                if (hay.indexOf(q) === -1) return false;
            }
            return true;
        });
    }, [recordsPeriodo, filterSearch, filterStatus]);

    const salesRowsSorted = useMemo(() => sortRows(filteredSalesRows, sortSales), [filteredSalesRows, sortSales]);
    const totalPages = Math.max(1, Math.ceil(salesRowsSorted.length / pageSize));
    const pageClamped = Math.min(page, totalPages);
    const salesPageRows = salesRowsSorted.slice((pageClamped - 1) * pageSize, (pageClamped - 1) * pageSize + pageSize);

    const maxProvincia = Math.max(0, ...PROVINCE_TILES.map((t) => provinciaMap.get(t.name) || 0));
    const cellsByPos = {};
    PROVINCE_TILES.forEach((t) => { cellsByPos[t.row + '-' + t.col] = t; });

    const rankEntries = Array.from(provinciaMap.entries()).filter((e) => e[1] > 0).sort((a, b) => b[1] - a[1]);
    const rankMax = rankEntries.length ? rankEntries[0][1] : 0;

    const setCostoManual = (key, value) => setCostOverrides((prev) => ({ ...prev, [key]: value }));

    const toggleSort = (setter, current, key) => {
        setter(current.key === key ? { key, dir: current.dir * -1 } : { key, dir: -1 });
    };

    return (
        <div style={s.root}>
            <div style={s.header}>
                <div>
                    <div style={s.title}>Cálculo manual de rentabilidad</div>
                    <div style={s.subtitle}>Subí el Excel de "Ventas" que descargás de Mercado Libre. El costo de cada producto se completa solo desde Gestión de Productos, y los gastos se toman de Registro de Egresos del período elegido.</div>
                </div>
                <button style={s.btnSecondary} onClick={onClose}>Cerrar</button>
            </div>

            {error && <div style={s.alertErr}>{error}</div>}

            <div style={s.card}>
                <div style={s.row}>
                    <div style={{ flex: '1 1 260px' }}>
                        <label style={s.lbl}>Archivo (.xlsx / .xls)</label>
                        <input ref={fileInputRef} type="file" accept=".xlsx,.xls"
                               onChange={(e) => e.target.files && e.target.files[0] && handleFile(e.target.files[0])}
                               style={s.inp} />
                        {fileName && <div style={s.hint}>Archivo: {fileName} — {records.length} líneas de venta cargadas</div>}
                    </div>
                    <div>
                        <label style={s.lbl}>Período desde</label>
                        <input type="date" value={periodoDesde} onChange={(e) => setPeriodoDesde(e.target.value)} style={s.inp} />
                    </div>
                    <div>
                        <label style={s.lbl}>Período hasta</label>
                        <input type="date" value={periodoHasta} onChange={(e) => setPeriodoHasta(e.target.value)} style={s.inp} />
                    </div>
                </div>
                {cargandoProductos && <div style={s.hint}>Cargando catálogo de productos para completar costos…</div>}
                {cargandoEgresos && <div style={s.hint}>Cargando egresos del período…</div>}
            </div>

            {records.length === 0 ? (
                <div style={s.centered}>Subí un archivo para ver los cálculos.</div>
            ) : (
                <>
                    <div style={s.kpiGrid}>
                        {[
                            { label: 'Facturación bruta', value: fmtARS.format(kpis.facturacionBruta) },
                            { label: 'Comisiones Mercado Libre', value: fmtARS.format(kpis.comisiones), bad: true },
                            { label: 'Costo de envío (neto)', value: fmtARS.format(kpis.envioNeto), bad: kpis.envioNeto < 0 },
                            { label: 'Impuestos / retenciones', value: fmtARS.format(kpis.impuestos), bad: true },
                            { label: 'Neto recibido de ML', value: fmtARS.format(kpis.netoRecibido), good: true },
                            { label: 'Unidades vendidas', value: fmtInt.format(kpis.unidadesVendidas) },
                            { label: 'Ventas (no canceladas)', value: fmtInt.format(kpis.nVentas), note: kpis.nCanceladas ? (kpis.nCanceladas + ' canceladas') : '' },
                            { label: 'Ticket promedio', value: fmtARS.format(kpis.ticketPromedio) },
                        ].map((c) => (
                            <div key={c.label} style={s.kpiCard}>
                                <div style={s.kpiLabel}>{c.label}</div>
                                <div style={{ ...s.kpiValue, color: c.bad ? '#991b1b' : c.good ? '#065f46' : '#111827' }}>{c.value}</div>
                                {c.note && <div style={s.kpiNote}>{c.note}</div>}
                            </div>
                        ))}
                    </div>

                    <div style={s.card}>
                        <div style={s.cardTitle}>Ganancia neta estimada del período</div>
                        <div style={s.profitLine}><span>Neto recibido de Mercado Libre</span><span>{fmtARS.format(kpis.netoRecibido)}</span></div>
                        <div style={s.profitLine}><span>Costo de productos vendidos</span><span style={{ color: '#991b1b' }}>−{fmtARS.format(costoProductosPeriodo)}</span></div>
                        <div style={s.profitLine}><span>Egresos del período (Registro de Egresos)</span><span style={{ color: '#991b1b' }}>−{fmtARS.format(gastosPeriodo)}</span></div>
                        <div style={s.profitTotal}>
                            <span>Ganancia neta estimada</span>
                            <span style={{ color: gananciaNeta >= 0 ? '#065f46' : '#991b1b' }}>{fmtARS.format(gananciaNeta)}</span>
                        </div>
                        <div style={s.profitLine}><span>Margen sobre facturación bruta</span><span>{(margenGlobal * 100).toFixed(1)}%</span></div>
                        <div style={s.hint}>Estimado: no incluye descuentos/bonificaciones ni anulaciones desglosadas del reporte de ML por separado.</div>
                    </div>

                    <div style={s.card}>
                        <div style={s.cardTitle}>Rentabilidad por producto</div>
                        <div style={s.cardDesc}>El costo unitario se completa solo cuando el SKU/código de la publicación coincide con un producto cargado en Gestión de Productos. Si no coincide, o querés ajustarlo, podés escribirlo a mano — se guarda en este navegador.</div>
                        <div style={s.tablaWrap}>
                            <table style={s.tabla}>
                                <thead>
                                    <tr>
                                        {[
                                            ['titulo', 'Producto', 'left'], ['unidades', 'Unidades', 'right'], ['ingresos', 'Ingresos', 'right'],
                                            ['comisiones', 'Comisión ML', 'right'], ['envioNeto', 'Envío neto', 'right'], ['total', 'Total', 'right'],
                                            ['costoUnitario', 'Costo unit.', 'right'], ['costoTotal', 'Costo total', 'right'],
                                            ['margen', 'Margen', 'right'], ['margenPct', 'Margen %', 'right'],
                                        ].map(([key, label, align]) => (
                                            <th key={key} style={{ ...s.th, textAlign: align, cursor: 'pointer' }} onClick={() => toggleSort(setSortProd, sortProd, key)}>
                                                {label}{sortProd.key === key ? (sortProd.dir === 1 ? ' ▲' : ' ▼') : ''}
                                            </th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {productRowsSorted.length === 0 ? (
                                        <tr><td colSpan="10" style={s.td}>No hay productos activos en este período.</td></tr>
                                    ) : productRowsSorted.map((p) => (
                                        <tr key={p.key}>
                                            <td style={s.td}>{p.titulo || p.sku || p.publicacion || '(sin título)'}{p.variante && <span style={{ color: '#94a3b8' }}> — {p.variante}</span>}</td>
                                            <td style={{ ...s.td, textAlign: 'right' }}>{fmtInt.format(p.unidades)}</td>
                                            <td style={{ ...s.td, textAlign: 'right' }}>{fmtARS.format(p.ingresos)}</td>
                                            <td style={{ ...s.td, textAlign: 'right' }}>{fmtARS.format(p.comisiones)}</td>
                                            <td style={{ ...s.td, textAlign: 'right' }}>{fmtARS.format(p.envioNeto)}</td>
                                            <td style={{ ...s.td, textAlign: 'right' }}>{fmtARS.format(p.total)}</td>
                                            <td style={{ ...s.td, textAlign: 'right' }}>
                                                <input type="number" min="0" step="1"
                                                       value={costOverrides[p.key] !== undefined ? costOverrides[p.key] : (p.costoUnitario || '')}
                                                       placeholder="0"
                                                       title={p.costoAutomatico ? 'Completado automáticamente desde Gestión de Productos' : ''}
                                                       style={{ ...s.inpNum, background: p.costoAutomatico ? '#f0fdf4' : '#fff' }}
                                                       onChange={(e) => setCostoManual(p.key, e.target.value)} />
                                            </td>
                                            <td style={{ ...s.td, textAlign: 'right' }}>{fmtARS.format(p.costoTotal)}</td>
                                            <td style={{ ...s.td, textAlign: 'right', color: p.margen >= 0 ? '#065f46' : '#991b1b' }}>{fmtARS.format(p.margen)}</td>
                                            <td style={{ ...s.td, textAlign: 'right' }}>{(p.margenPct * 100).toFixed(1)}%</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    <div style={s.card}>
                        <div style={s.cardTitle}>Egresos del período</div>
                        {egresosPeriodo.length === 0 ? (
                            <div style={s.hint}>No hay egresos cargados en Registro de Egresos para este período.</div>
                        ) : (
                            <div style={s.tablaWrap}>
                                <table style={s.tabla}>
                                    <thead><tr><th style={s.th}>Fecha</th><th style={s.th}>Proveedor</th><th style={{ ...s.th, textAlign: 'right' }}>Monto</th></tr></thead>
                                    <tbody>
                                        {egresosPeriodo.map((e) => (
                                            <tr key={e.id}>
                                                <td style={s.td}>{new Date(e.fecha_compra).toLocaleDateString('es-AR')}</td>
                                                <td style={s.td}>{e.proveedor || '-'}</td>
                                                <td style={{ ...s.td, textAlign: 'right' }}>{fmtARS.format(toNum(e.total))}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>

                    <div style={s.card}>
                        <div style={s.cardTitle}>Unidades vendidas por provincia</div>
                        <div style={s.mapWrap}>
                            <div style={{ display: 'grid', gridTemplateColumns: `repeat(${TILE_GRID_COLS}, 1fr)`, gap: 4, maxWidth: 360 }}>
                                {Array.from({ length: TILE_GRID_ROWS }).flatMap((_, rowI) =>
                                    Array.from({ length: TILE_GRID_COLS }).map((_, colI) => {
                                        const row = rowI + 1, col = colI + 1;
                                        const t = cellsByPos[row + '-' + col];
                                        if (!t) return <div key={row + '-' + col} />;
                                        const v = provinciaMap.get(t.name) || 0;
                                        const cs = colorScale(v, maxProvincia);
                                        const bg = cs ? `rgb(${cs.rgb.join(',')})` : '#eef2f7';
                                        const color = cs && cs.t > 0.55 ? '#fff' : '#334155';
                                        return (
                                            <div key={row + '-' + col} title={`${t.name}: ${fmtInt.format(v)} unidades`}
                                                 style={{ ...s.tile, background: bg, color }}>
                                                {t.abbr}<br />{fmtInt.format(v)}
                                            </div>
                                        );
                                    })
                                )}
                            </div>
                            <div style={{ flex: 1, minWidth: 220 }}>
                                <ul style={s.rankList}>
                                    {rankEntries.length === 0 ? <li style={s.hint}>Sin datos</li> : rankEntries.map(([name, v]) => (
                                        <li key={name || '(sin provincia)'} style={s.rankItem}>
                                            <span style={{ minWidth: 140 }}>{name || 'Sin datos de provincia'}</span>
                                            <span style={s.rankBarBg}><span style={{ ...s.rankBar, width: `${rankMax > 0 ? (v / rankMax * 100) : 0}%` }} /></span>
                                            <span>{fmtInt.format(v)}</span>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        </div>
                    </div>

                    <div style={s.card}>
                        <div style={s.cardTitle}>Detalle de ventas ({salesRowsSorted.length})</div>
                        <div style={s.row}>
                            <input type="text" placeholder="Buscar por título, SKU, provincia…" value={filterSearch}
                                   onChange={(e) => { setFilterSearch(e.target.value); setPage(1); }} style={{ ...s.inp, flex: '1 1 220px' }} />
                            <select value={filterStatus} onChange={(e) => { setFilterStatus(e.target.value); setPage(1); }} style={s.inp}>
                                <option value="__all__">Todos los estados</option>
                                {distinctStatuses.map((st) => <option key={st} value={st}>{st}</option>)}
                            </select>
                            <select value={pageSize} onChange={(e) => { setPageSize(parseInt(e.target.value, 10)); setPage(1); }} style={s.inp}>
                                {[25, 50, 100, 200].map((n) => <option key={n} value={n}>{n} por página</option>)}
                            </select>
                        </div>
                        <div style={s.tablaWrap}>
                            <table style={s.tabla}>
                                <thead>
                                    <tr>
                                        {[
                                            ['fecha', 'Fecha'], ['estado', 'Estado'], ['titulo', 'Producto'], ['provincia', 'Provincia'],
                                            ['unidades', 'Unidades'], ['ingresosProductos', 'Ingresos'], ['comisionTotal', 'Comisión'],
                                            ['envioNeto', 'Envío'], ['impuestos', 'Impuestos'], ['total', 'Total'],
                                        ].map(([key, label]) => (
                                            <th key={key} style={{ ...s.th, cursor: 'pointer' }} onClick={() => toggleSort(setSortSales, sortSales, key)}>
                                                {label}{sortSales.key === key ? (sortSales.dir === 1 ? ' ▲' : ' ▼') : ''}
                                            </th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {salesPageRows.length === 0 ? (
                                        <tr><td colSpan="10" style={s.td}>No hay ventas que coincidan con el filtro.</td></tr>
                                    ) : salesPageRows.map((r, i) => (
                                        <tr key={r.id + '-' + i}>
                                            <td style={s.td}>{fmtDate(r.fecha)}</td>
                                            <td style={s.td}>{r.estado}</td>
                                            <td style={s.td}>{r.titulo}{r.variante && <span style={{ color: '#94a3b8' }}> — {r.variante}</span>}</td>
                                            <td style={s.td}>{r.provincia || '—'}</td>
                                            <td style={{ ...s.td, textAlign: 'right' }}>{fmtInt.format(r.unidades)}</td>
                                            <td style={{ ...s.td, textAlign: 'right' }}>{fmtARS.format(r.ingresosProductos)}</td>
                                            <td style={{ ...s.td, textAlign: 'right' }}>{fmtARS.format(r.comisionTotal)}</td>
                                            <td style={{ ...s.td, textAlign: 'right' }}>{fmtARS.format(r.envioNeto)}</td>
                                            <td style={{ ...s.td, textAlign: 'right' }}>{fmtARS.format(r.impuestos)}</td>
                                            <td style={{ ...s.td, textAlign: 'right' }}>{fmtARS.format(r.total)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                        <div style={s.pagRow}>
                            <span style={s.hint}>Página {pageClamped} de {totalPages}</span>
                            <button style={s.btnSecondary} disabled={pageClamped <= 1} onClick={() => setPage(pageClamped - 1)}>Anterior</button>
                            <button style={s.btnSecondary} disabled={pageClamped >= totalPages} onClick={() => setPage(pageClamped + 1)}>Siguiente</button>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}

const s = {
    root: { padding: '4px 4px 20px' },
    header: { display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, marginBottom: 16 },
    title: { fontWeight: 700, fontSize: 17, color: '#111827' },
    subtitle: { fontSize: 13, color: '#475569', marginTop: 4, maxWidth: 640, lineHeight: 1.5 },
    centered: { textAlign: 'center', padding: 40, color: '#475569' },
    alertErr: { background: '#fee2e2', color: '#991b1b', padding: '10px 14px', borderRadius: 10, fontSize: 13, fontWeight: 500, marginBottom: 12 },
    card: { background: '#fff', borderRadius: 10, padding: '18px 20px', boxShadow: '0 1px 4px rgba(0,0,0,.08)', marginBottom: 14 },
    cardTitle: { fontWeight: 700, fontSize: 15, color: '#111827', marginBottom: 6 },
    cardDesc: { fontSize: 13, color: '#475569', marginBottom: 14, lineHeight: 1.5 },
    row: { display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'flex-end' },
    lbl: { fontSize: 12, fontWeight: 600, color: '#475569', marginBottom: 4, display: 'block' },
    inp: { padding: '8px 11px', border: '1px solid #d1d5db', borderRadius: 10, fontSize: 13, boxSizing: 'border-box' },
    inpNum: { width: 90, padding: '6px 8px', border: '1px solid #d1d5db', borderRadius: 8, fontSize: 13, textAlign: 'right', boxSizing: 'border-box' },
    hint: { fontSize: 12, color: '#64748b', marginTop: 6 },
    btnSecondary: { padding: '9px 16px', background: '#f8fafc', color: '#475569', border: '1px solid #e2e8f0', borderRadius: 10, cursor: 'pointer', fontWeight: 600, fontSize: 13 },
    kpiGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 10, marginBottom: 14 },
    kpiCard: { background: '#fff', borderRadius: 10, padding: '14px 16px', boxShadow: '0 1px 4px rgba(0,0,0,.08)' },
    kpiLabel: { fontSize: 12, color: '#64748b', marginBottom: 4 },
    kpiValue: { fontSize: 18, fontWeight: 700 },
    kpiNote: { fontSize: 11, color: '#94a3b8', marginTop: 2 },
    profitLine: { display: 'flex', justifyContent: 'space-between', padding: '6px 0', fontSize: 13.5, color: '#334155' },
    profitTotal: { display: 'flex', justifyContent: 'space-between', padding: '10px 0', fontSize: 16, fontWeight: 700, borderTop: '2px solid #e2e8f0', marginTop: 4 },
    tablaWrap: { overflowX: 'auto', marginTop: 4 },
    tabla: { width: '100%', borderCollapse: 'collapse', fontSize: 12.5 },
    th: { textAlign: 'left', padding: '8px 10px', borderBottom: '2px solid #e2e8f0', color: '#475569', fontWeight: 700, whiteSpace: 'nowrap' },
    td: { padding: '8px 10px', borderBottom: '1px solid #f1f5f9', color: '#111827' },
    mapWrap: { display: 'flex', gap: 24, flexWrap: 'wrap' },
    tile: { borderRadius: 6, padding: '6px 4px', fontSize: 10.5, textAlign: 'center', lineHeight: 1.3, fontWeight: 600 },
    rankList: { listStyle: 'none', margin: 0, padding: 0 },
    rankItem: { display: 'flex', alignItems: 'center', gap: 8, fontSize: 12.5, padding: '4px 0', color: '#334155' },
    rankBarBg: { flex: 1, height: 8, background: '#eef2f7', borderRadius: 999, overflow: 'hidden' },
    rankBar: { display: 'block', height: '100%', background: '#1d4ed8', borderRadius: 999 },
    pagRow: { display: 'flex', alignItems: 'center', gap: 10, marginTop: 10 },
};
