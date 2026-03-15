import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { useAuth } from '../AuthContext';
import Swal from 'sweetalert2';
import { formatearMonto } from '../utils/formatearMonto';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';

const normalizeApiUrl = (url) => {
    if (!url) return 'http://localhost:8000';
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
const PAGE_SIZE = 10;

const CATEGORIAS = ['Alquiler', 'Servicios', 'Impuestos', 'Sueldos', 'Otros'];

// Assembles proveedor string from category + detail
const buildConcepto = (category, detail) => {
    const d = (detail || '').trim();
    if (category && d) return `${category} \u2014 ${d}`;
    if (category) return category;
    return d;
};

// Color tokens per category
const categoryColor = (cat) => {
    const map = {
        'Alquiler':        { bg: '#eff6ff', color: '#1e4a8a', border: '#93c5fd' },
        'Servicios':       { bg: '#fffbeb', color: '#92400e', border: '#fcd34d' },
        'Impuestos':       { bg: '#fef2f2', color: '#991b1b', border: '#fca5a5' },
        'Sueldos':         { bg: '#f5f3ff', color: '#5b21b6', border: '#c4b5fd' },
        'Stock / Compras': { bg: '#edfaf3', color: '#1a6a40', border: '#a8e6c5' },
        'Otros':           { bg: '#f7faf9', color: '#4a6660', border: '#d8eae4' },
    };
    return map[cat] || { bg: '#f7faf9', color: '#4a6660', border: '#d8eae4' };
};

// Parse proveedor: detect category prefix from new format "Categoria \u2014 detalle"
// Old free-text records return { category: null, detail: proveedor } — backward compatible
const parseConcepto = (proveedor) => {
    if (!proveedor) return { category: null, detail: '' };
    for (const cat of CATEGORIAS) {
        if (proveedor === cat) return { category: cat, detail: '' };
        const prefix = `${cat} \u2014 `;
        if (proveedor.startsWith(prefix)) {
            return { category: cat, detail: proveedor.slice(prefix.length) };
        }
    }
    return { category: null, detail: proveedor };
};

const RegistroCompras = () => {
    const { token, isAuthenticated, user, loading: authLoading, selectedStoreSlug } = useAuth();

    // List state
    const [compras, setCompras] = useState([]);
    const [loadingCompras, setLoadingCompras] = useState(true);
    const [error, setError] = useState(null);
    const [nextPageUrl, setNextPageUrl] = useState(null);
    const [prevPageUrl, setPrevPageUrl] = useState(null);
    const [currentPageNumber, setCurrentPageNumber] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [totalCount, setTotalCount] = useState(0);

    // New egreso form
    const [formExpanded, setFormExpanded] = useState(false);
    const [newPurchaseDate, setNewPurchaseDate] = useState('');
    const [newPurchaseTotal, setNewPurchaseTotal] = useState('');
    const [newPurchaseCategory, setNewPurchaseCategory] = useState(() => sessionStorage.getItem('rc_lastCategory') || '');
    const [newPurchaseDetail, setNewPurchaseDetail] = useState('');

    // Edit state
    const [editingCompra, setEditingCompra] = useState(null);
    const [editDate, setEditDate] = useState('');
    const [editTotal, setEditTotal] = useState('');
    const [editConcepto, setEditConcepto] = useState('');

    // Filters
    const [pendingDateFrom, setPendingDateFrom] = useState('');
    const [pendingDateTo, setPendingDateTo] = useState('');
    const [pendingSearch, setPendingSearch] = useState('');
    const [filterDateFrom, setFilterDateFrom] = useState('');
    const [filterDateTo, setFilterDateTo] = useState('');
    const [filterSearch, setFilterSearch] = useState('');
    const [validationError, setValidationError] = useState(null);

    const buildParams = useCallback(() => {
        const params = { tienda_slug: selectedStoreSlug };
        if (filterDateFrom) params.date_from = filterDateFrom;
        if (filterDateTo) params.date_to = filterDateTo;
        if (filterSearch && filterSearch.trim()) params.search = filterSearch.trim();
        return params;
    }, [selectedStoreSlug, filterDateFrom, filterDateTo, filterSearch]);

    const fetchCompras = useCallback(async (pageUrl = null) => {
        if (!token || !selectedStoreSlug) {
            setLoadingCompras(false);
            return;
        }
        setLoadingCompras(true);
        try {
            const baseUrl = `${BASE_API_ENDPOINT}/api/compras/`;
            const usePaginatedUrl = pageUrl && pageUrl.includes('page=');
            const headers = { 'Authorization': `Bearer ${token}` };
            const response = usePaginatedUrl
                ? await axios.get(pageUrl, { headers })
                : await axios.get(baseUrl, { headers, params: buildParams() });
            setCompras(response.data.results ?? []);
            setNextPageUrl(response.data.next);
            setPrevPageUrl(response.data.previous);
            const count = response.data.count ?? 0;
            setTotalCount(count);
            setTotalPages(Math.max(1, Math.ceil(count / PAGE_SIZE)));
            if (usePaginatedUrl && pageUrl) {
                const urlParams = new URLSearchParams(new URL(pageUrl).search);
                setCurrentPageNumber(parseInt(urlParams.get('page'), 10) || 1);
            } else {
                setCurrentPageNumber(1);
            }
        } catch (err) {
            setError('Error al cargar los egresos: ' + (err.response ? JSON.stringify(err.response.data) : err.message));
            console.error('Error fetching purchases:', err.response || err.message);
        } finally {
            setLoadingCompras(false);
        }
    }, [token, selectedStoreSlug, buildParams]);

    const handleCreateCompra = async (e) => {
        e.preventDefault();
        if (!newPurchaseDate || !newPurchaseTotal || !selectedStoreSlug) {
            Swal.fire('Error', 'La fecha y el monto son obligatorios.', 'error');
            return;
        }
        if (newPurchaseCategory === 'Otros' && !newPurchaseDetail.trim()) {
            Swal.fire('Aviso', 'Para la categoría "Otros", el detalle es obligatorio.', 'warning');
            return;
        }
        if (newPurchaseCategory) {
            sessionStorage.setItem('rc_lastCategory', newPurchaseCategory);
        }
        const concepto = buildConcepto(newPurchaseCategory, newPurchaseDetail);
        Swal.fire({
            title: '¿Confirmar registro?',
            text: `Se registrará un egreso de ${formatearMonto(newPurchaseTotal)}${concepto ? ` · ${concepto}` : ''}.`,
            icon: 'question',
            showCancelButton: true,
            confirmButtonText: 'Sí, registrar',
            cancelButtonText: 'Cancelar',
        }).then(async (result) => {
            if (result.isConfirmed) {
                try {
                    await axios.post(`${BASE_API_ENDPOINT}/api/compras/`, {
                        fecha_compra: newPurchaseDate,
                        total: newPurchaseTotal,
                        proveedor: concepto,
                        tienda_slug: selectedStoreSlug,
                    }, {
                        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }
                    });
                    Swal.fire('¡Registrado!', 'El egreso se registró exitosamente.', 'success');
                    fetchCompras();
                    setNewPurchaseDate('');
                    setNewPurchaseTotal('');
                    setNewPurchaseCategory('');
                    setNewPurchaseDetail('');
                    setFormExpanded(false);
                } catch (err) {
                    Swal.fire('Error', 'Error al registrar: ' + (err.response ? JSON.stringify(err.response.data) : err.message), 'error');
                }
            }
        });
    };

    const handleOpenEdit = (compra) => {
        setEditingCompra(compra);
        setEditDate((compra.fecha_compra || '').split('T')[0]);
        setEditTotal(String(compra.total));
        setEditConcepto(compra.proveedor || '');
    };

    const handleEditCompra = async () => {
        if (!editingCompra) return;
        if (!editDate || !editTotal) {
            Swal.fire('Error', 'La fecha y el monto son obligatorios.', 'error');
            return;
        }
        try {
            await axios.patch(`${BASE_API_ENDPOINT}/api/compras/${editingCompra.id}/`, {
                fecha_compra: editDate,
                total: editTotal,
                proveedor: editConcepto.trim(),
            }, { headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' } });
            Swal.fire('¡Actualizado!', 'El egreso se actualizó correctamente.', 'success');
            setEditingCompra(null);
            fetchCompras();
        } catch (err) {
            Swal.fire('Error', 'Error al actualizar: ' + (err.response ? JSON.stringify(err.response.data) : err.message), 'error');
        }
    };

    const handleDeleteCompra = async (compraId) => {
        Swal.fire({
            title: '¿Estás seguro?',
            text: 'Estás a punto de eliminar este egreso. Esta acción no se puede deshacer.',
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#e25252',
            cancelButtonColor: '#6c757d',
            confirmButtonText: 'Sí, eliminar',
            cancelButtonText: 'Cancelar',
        }).then(async (result) => {
            if (result.isConfirmed) {
                try {
                    await axios.delete(`${BASE_API_ENDPOINT}/api/compras/${compraId}/`, {
                        headers: { 'Authorization': `Bearer ${token}` }
                    });
                    Swal.fire('¡Eliminado!', 'El egreso fue eliminado.', 'success');
                    fetchCompras();
                } catch (err) {
                    Swal.fire('Error', 'Error al eliminar: ' + (err.response ? JSON.stringify(err.response.data) : err.message), 'error');
                }
            }
        });
    };

    useEffect(() => {
        if (!authLoading && isAuthenticated && user && (user.is_superuser || user.is_staff) && selectedStoreSlug) {
            fetchCompras();
        } else if (!authLoading && (!isAuthenticated || !user || (!user.is_superuser && !user.is_staff))) {
            setError("Acceso denegado. Solo el personal autorizado puede ver esta página.");
            setLoadingCompras(false);
        } else if (!authLoading && isAuthenticated && user && (user.is_superuser || user.is_staff) && !selectedStoreSlug) {
            setLoadingCompras(false);
        }
    }, [isAuthenticated, user, authLoading, selectedStoreSlug, fetchCompras]);

    const handleApplyFilters = () => {
        if (pendingDateFrom && pendingDateTo && pendingDateFrom > pendingDateTo) {
            setValidationError('La fecha "Desde" debe ser anterior o igual a "Hasta".');
            return;
        }
        setValidationError(null);
        setFilterDateFrom(pendingDateFrom);
        setFilterDateTo(pendingDateTo);
        setFilterSearch(pendingSearch.trim());
    };

    const handleMesActual = () => {
        setValidationError(null);
        const today = new Date();
        const y = today.getFullYear();
        const m = (today.getMonth() + 1).toString().padStart(2, '0');
        const firstDay = `${y}-${m}-01`;
        const lastDay = `${y}-${m}-${new Date(y, today.getMonth() + 1, 0).getDate().toString().padStart(2, '0')}`;
        setPendingDateFrom(firstDay);
        setPendingDateTo(lastDay);
        setFilterDateFrom(firstDay);
        setFilterDateTo(lastDay);
    };

    const handleClearFilters = () => {
        setValidationError(null);
        setPendingDateFrom('');
        setPendingDateTo('');
        setPendingSearch('');
        setFilterDateFrom('');
        setFilterDateTo('');
        setFilterSearch('');
    };

    // Computed
    const totalPaginaActual = compras.reduce((sum, c) => sum + parseFloat(c.total || 0), 0);
    const hasActiveFilter = !!(filterDateFrom || filterDateTo || filterSearch);

    // Per-category totals for summary
    const totalsPorCategoria = compras.reduce((acc, c) => {
        const { category } = parseConcepto(c.proveedor);
        const cat = category || 'Sin categoría';
        acc[cat] = (acc[cat] || 0) + parseFloat(c.total || 0);
        return acc;
    }, {});

    if (authLoading || (isAuthenticated && !user)) {
        return <div style={styles.loadingMessage}>Cargando datos de usuario...</div>;
    }
    if (!isAuthenticated || (!user.is_superuser && !user.is_staff)) {
        return <div style={styles.accessDeniedMessage}>Acceso denegado. Solo el personal autorizado puede ver esta página.</div>;
    }
    if (!selectedStoreSlug) {
        return <div style={styles.noStoreSelectedMessage}><p>Selecciona una tienda en el menú para ver los egresos.</p></div>;
    }
    if (loadingCompras) {
        return <div style={styles.loadingMessage}>Cargando registros de egresos...</div>;
    }
    if (error) {
        return <div style={styles.errorMessage}>{error}</div>;
    }

    return (
        <>
            <style>{rcStyles}</style>
            <div style={styles.container} className="rc-container">

                {/* ── Header ──────────────────────────────────────────────────── */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem', flexWrap: 'wrap', gap: 12 }}>
                    <h1 style={styles.pageTitle}>Egresos</h1>
                    <button
                        onClick={() => setFormExpanded(v => !v)}
                        style={{ ...styles.newButton, ...(formExpanded ? styles.newButtonCancel : {}) }}
                    >
                        {formExpanded ? '✕  Cancelar' : '+ Nuevo egreso'}
                    </button>
                </div>

                {/* ── Formulario colapsable ────────────────────────────────────── */}
                {formExpanded && (
                    <div style={styles.formCard} className="rc-form-card">
                        <h2 style={styles.cardTitle}>Nuevo egreso</h2>

                        {/* Categorías */}
                        <div style={{ marginBottom: 18 }}>
                            <label style={styles.formLabel}>Categoría</label>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 8 }}>
                                {CATEGORIAS.map(cat => {
                                    const c = categoryColor(cat);
                                    const selected = newPurchaseCategory === cat;
                                    return (
                                        <button
                                            key={cat}
                                            type="button"
                                            onClick={() => {
                                                const next = selected ? '' : cat;
                                                setNewPurchaseCategory(next);
                                                if (next) sessionStorage.setItem('rc_lastCategory', next);
                                            }}
                                            style={{
                                                padding: '5px 14px',
                                                borderRadius: '9999px',
                                                border: `1.5px solid ${selected ? c.color : c.border}`,
                                                backgroundColor: selected ? c.color : c.bg,
                                                color: selected ? '#fff' : c.color,
                                                fontSize: 13, fontWeight: 600,
                                                cursor: 'pointer',
                                                transition: 'all 0.15s ease',
                                                fontFamily: "'Inter', 'Segoe UI', system-ui, sans-serif",
                                            }}
                                        >
                                            {cat}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        <form onSubmit={handleCreateCompra} style={styles.form} className="rc-form">
                            <div style={styles.formGroup} className="rc-form-group">
                                <label style={styles.formLabel}>Fecha*</label>
                                <input
                                    type="date"
                                    value={newPurchaseDate}
                                    onChange={(e) => setNewPurchaseDate(e.target.value)}
                                    required
                                    style={styles.input}
                                    className="rc-input"
                                />
                            </div>
                            <div style={styles.formGroup} className="rc-form-group">
                                <label style={styles.formLabel}>Monto*</label>
                                <input
                                    type="number"
                                    value={newPurchaseTotal}
                                    onChange={(e) => setNewPurchaseTotal(e.target.value)}
                                    required
                                    style={styles.input}
                                    className="rc-input"
                                    step="0.01"
                                    min="0"
                                    placeholder="0.00"
                                />
                            </div>
                            <div style={{ ...styles.formGroup, flex: 2 }} className="rc-form-group">
                                <label style={styles.formLabel}>
                                    Detalle{newPurchaseCategory === 'Otros'
                                        ? <span style={{ color: '#dc2626', fontWeight: 700, marginLeft: 4 }}>*</span>
                                        : <span style={{ color: '#8aa8a0', fontWeight: 400, textTransform: 'none', letterSpacing: 0 }}> (opcional)</span>
                                    }
                                </label>
                                <input
                                    type="text"
                                    value={newPurchaseDetail}
                                    onChange={(e) => setNewPurchaseDetail(e.target.value)}
                                    style={{ ...styles.input, ...(newPurchaseCategory === 'Otros' && !newPurchaseDetail.trim() ? { borderColor: '#fca5a5' } : {}) }}
                                    className="rc-input"
                                    placeholder={newPurchaseCategory === 'Otros' ? 'Obligatorio: describí el egreso' : (newPurchaseCategory ? `Ej: ${newPurchaseCategory} mes de marzo` : 'Ej: Luz mes de marzo')}
                                    required={newPurchaseCategory === 'Otros'}
                                />
                            </div>
                            <div style={{ ...styles.formGroup, minWidth: 'auto', flex: 'none' }} className="rc-form-group rc-submit-group">
                                <label style={{ ...styles.formLabel, visibility: 'hidden' }}>_</label>
                                <button type="submit" style={styles.submitButton} className="rc-submit-btn">
                                    Registrar
                                </button>
                            </div>
                        </form>
                    </div>
                )}

                {/* ── Filtros ──────────────────────────────────────────────────── */}
                <div style={styles.filtersCard} className="rc-filters-card">
                    <div style={styles.periodSection}>
                        <span style={styles.periodSectionTitle}>Período</span>
                        <div style={styles.periodInputs} className="rc-period-inputs">
                            <div style={styles.filterGroup} className="rc-filter-group">
                                <label style={styles.filterLabel}>Desde</label>
                                <input
                                    type="date"
                                    value={pendingDateFrom}
                                    onChange={(e) => { setValidationError(null); setPendingDateFrom(e.target.value); }}
                                    style={styles.filterInput}
                                    className="rc-filter-input"
                                />
                            </div>
                            <div style={styles.filterGroup} className="rc-filter-group">
                                <label style={styles.filterLabel}>Hasta</label>
                                <input
                                    type="date"
                                    value={pendingDateTo}
                                    onChange={(e) => { setValidationError(null); setPendingDateTo(e.target.value); }}
                                    style={styles.filterInput}
                                    className="rc-filter-input"
                                />
                            </div>
                        </div>
                        <p style={styles.periodHint}>Dejar vacío = mostrar todos. Solo Desde = ese día en adelante.</p>
                    </div>

                    <div style={styles.filtersRow2} className="rc-filters-row2">
                        <div style={styles.filterGroup} className="rc-filter-group">
                            <label style={styles.filterLabel}>Buscar por concepto</label>
                            <input
                                type="text"
                                placeholder="Palabras clave..."
                                value={pendingSearch}
                                onChange={(e) => setPendingSearch(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && handleApplyFilters()}
                                style={styles.filterInput}
                                className="rc-filter-input"
                            />
                        </div>

                        {/* Atajos de categoría */}
                        <div style={{ ...styles.filterGroup, minWidth: 0 }} className="rc-filter-group">
                            <label style={styles.filterLabel}>Categoría rápida</label>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, paddingTop: 2 }}>
                                {CATEGORIAS.map(cat => {
                                    const c = categoryColor(cat);
                                    const active = pendingSearch === cat;
                                    return (
                                        <button
                                            key={cat}
                                            type="button"
                                            onClick={() => setPendingSearch(active ? '' : cat)}
                                            style={{
                                                padding: '4px 11px',
                                                borderRadius: '9999px',
                                                border: `1px solid ${active ? c.color : c.border}`,
                                                backgroundColor: active ? c.color : c.bg,
                                                color: active ? '#fff' : c.color,
                                                fontSize: 12, fontWeight: 600,
                                                cursor: 'pointer',
                                                transition: 'all 0.15s ease',
                                                fontFamily: "'Inter', 'Segoe UI', system-ui, sans-serif",
                                            }}
                                        >
                                            {cat}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        <div style={styles.filterActions} className="rc-filter-actions">
                            <button onClick={handleMesActual} style={{ ...styles.filterButton, ...styles.filterButtonSecondary }}>Mes actual</button>
                            <button onClick={handleApplyFilters} style={styles.filterButton}>Aplicar</button>
                            <button onClick={handleClearFilters} style={{ ...styles.filterButton, ...styles.filterButtonMuted }}>Limpiar</button>
                        </div>
                    </div>
                    {validationError && <p style={styles.validationError}>{validationError}</p>}
                </div>

                {/* ── Resumen del período ──────────────────────────────────────── */}
                {compras.length > 0 && (
                    <div style={styles.summaryCard} className="rc-summary-card">
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap', marginBottom: Object.keys(totalsPorCategoria).length > 0 ? 12 : 0 }}>
                            <span style={{ fontSize: 20 }}>💸</span>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                                <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#92400e', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                    Total{hasActiveFilter ? ' · filtro activo' : ' · página actual'}
                                </span>
                                <span style={{ fontSize: '1.5rem', fontWeight: 800, color: '#1a2926', lineHeight: 1.1 }}>
                                    {formatearMonto(totalPaginaActual)}
                                </span>
                            </div>
                            <span style={{ fontSize: 12, color: '#8aa8a0', marginLeft: 4, borderLeft: '1px solid #fcd34d', paddingLeft: 12 }}>
                                {compras.length} egreso{compras.length !== 1 ? 's' : ''} en esta página
                                {totalCount > compras.length && ` · ${totalCount} en total`}
                            </span>
                        </div>
                        {Object.keys(totalsPorCategoria).length > 1 && (
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, borderTop: '1px solid #fcd34d', paddingTop: 10 }}>
                                {Object.entries(totalsPorCategoria).sort((a, b) => b[1] - a[1]).map(([cat, total]) => {
                                    const c = categoryColor(cat);
                                    return (
                                        <div key={cat} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '4px 10px', borderRadius: 20, background: c.bg, border: `1px solid ${c.border}` }}>
                                            <span style={{ fontSize: 11, fontWeight: 700, color: c.color }}>{cat}</span>
                                            <span style={{ fontSize: 12, fontWeight: 800, color: '#1a2926' }}>{formatearMonto(total)}</span>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                )}

                {/* ── Historial ────────────────────────────────────────────────── */}
                <div style={styles.tableCard} className="rc-table-card">
                    <h2 style={styles.cardTitle}>Historial</h2>

                    {compras.length > 0 ? (
                        <div style={{ overflowX: 'auto' }} className="rc-table-wrapper">
                            <table style={styles.table} className="rc-table">
                                <thead>
                                    <tr>
                                        <th style={styles.th}>Fecha</th>
                                        <th style={styles.th}>Monto</th>
                                        <th style={styles.th}>Concepto</th>
                                        <th style={styles.th}>Registrado por</th>
                                        <th style={styles.th}>Acciones</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {compras.map((compra) => {
                                        const { category, detail } = parseConcepto(compra.proveedor);
                                        const c = category ? categoryColor(category) : null;
                                        return (
                                            <tr key={compra.id} className="rc-tr">
                                                <td style={styles.td}>
                                                    {new Date((compra.fecha_compra || '').split('T')[0] + 'T12:00:00').toLocaleDateString('es-AR', {
                                                        day: '2-digit', month: '2-digit', year: 'numeric'
                                                    })}
                                                </td>
                                                <td style={{ ...styles.td, fontWeight: 700, color: '#991b1b', whiteSpace: 'nowrap' }}>
                                                    {formatearMonto(compra.total)}
                                                </td>
                                                <td style={styles.td}>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: 7, flexWrap: 'wrap' }}>
                                                        {category && c && (
                                                            <span style={{
                                                                display: 'inline-flex', alignItems: 'center',
                                                                padding: '2px 9px', borderRadius: '9999px',
                                                                fontSize: 11, fontWeight: 700, flexShrink: 0,
                                                                backgroundColor: c.bg, color: c.color, border: `1px solid ${c.border}`,
                                                            }}>
                                                                {category}
                                                            </span>
                                                        )}
                                                        <span style={{ fontSize: 13, color: '#1a2926' }}>
                                                            {detail || (!category ? (compra.proveedor || '—') : '')}
                                                        </span>
                                                    </div>
                                                </td>
                                                <td style={{ ...styles.td, color: '#4a6660', fontSize: 13 }}>
                                                    {compra.usuario?.username || '—'}
                                                </td>
                                                <td style={styles.td}>
                                                    <div style={{ display: 'flex', gap: 8 }}>
                                                        <button onClick={() => handleOpenEdit(compra)} style={styles.editButton}>
                                                            Editar
                                                        </button>
                                                        <button onClick={() => handleDeleteCompra(compra.id)} style={styles.deleteButton}>
                                                            Eliminar
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    ) : (
                        <div style={{ textAlign: 'center', padding: '40px 20px' }}>
                            <div style={{ fontSize: 42, marginBottom: 12 }}>📭</div>
                            <p style={{ color: '#8aa8a0', fontStyle: 'italic', margin: '0 0 14px' }}>
                                {hasActiveFilter
                                    ? 'No hay egresos que coincidan con el filtro aplicado.'
                                    : 'No hay egresos registrados para esta tienda.'}
                            </p>
                            {hasActiveFilter && (
                                <button onClick={handleClearFilters} style={{ ...styles.filterButton, fontSize: 13 }}>
                                    Limpiar filtros
                                </button>
                            )}
                        </div>
                    )}

                    {/* Paginación */}
                    {totalPages > 1 && (
                        <div style={styles.paginationContainer}>
                            <button
                                onClick={() => fetchCompras(prevPageUrl)}
                                disabled={!prevPageUrl}
                                style={{
                                    ...styles.paginationButton,
                                    opacity: !prevPageUrl ? 0.4 : 1,
                                    cursor: !prevPageUrl ? 'not-allowed' : 'pointer',
                                }}
                            >
                                ← Anterior
                            </button>
                            <span style={styles.pageInfo}>
                                Página {currentPageNumber} de {totalPages}
                                <span style={{ color: '#8aa8a0', marginLeft: 6 }}>· {totalCount} registros</span>
                            </span>
                            <button
                                onClick={() => fetchCompras(nextPageUrl)}
                                disabled={!nextPageUrl}
                                style={{
                                    ...styles.paginationButton,
                                    opacity: !nextPageUrl ? 0.4 : 1,
                                    cursor: !nextPageUrl ? 'not-allowed' : 'pointer',
                                }}
                            >
                                Siguiente →
                            </button>
                        </div>
                    )}
                </div>

                {/* ── Modal de edición ────────────────────────────────────────── */}
                {editingCompra && (
                    <div style={styles.modalOverlay} onClick={() => setEditingCompra(null)}>
                        <div style={styles.modalCard} onClick={(e) => e.stopPropagation()}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
                                <h3 style={{ margin: 0, color: '#1a2926', fontSize: '1.05rem', fontWeight: 700 }}>Editar egreso</h3>
                                <button
                                    onClick={() => setEditingCompra(null)}
                                    style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: '#8aa8a0', lineHeight: 1, padding: 4 }}
                                >✕</button>
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                                <div>
                                    <label style={styles.formLabel}>Fecha*</label>
                                    <input
                                        type="date"
                                        value={editDate}
                                        onChange={(e) => setEditDate(e.target.value)}
                                        style={{ ...styles.input, marginTop: 6 }}
                                        className="rc-input"
                                    />
                                </div>
                                <div>
                                    <label style={styles.formLabel}>Monto*</label>
                                    <input
                                        type="number"
                                        value={editTotal}
                                        onChange={(e) => setEditTotal(e.target.value)}
                                        style={{ ...styles.input, marginTop: 6 }}
                                        className="rc-input"
                                        step="0.01"
                                        min="0"
                                    />
                                </div>
                                <div>
                                    <label style={styles.formLabel}>Concepto</label>
                                    <input
                                        type="text"
                                        value={editConcepto}
                                        onChange={(e) => setEditConcepto(e.target.value)}
                                        style={{ ...styles.input, marginTop: 6 }}
                                        className="rc-input"
                                        placeholder="Ej: Alquiler — mes de marzo"
                                    />
                                    <p style={{ margin: '6px 0 0', fontSize: 11, color: '#8aa8a0' }}>
                                        Formato sugerido: Categoría — Detalle (ej: Servicios — Luz)
                                    </p>
                                </div>
                            </div>
                            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 22 }}>
                                <button
                                    onClick={() => setEditingCompra(null)}
                                    style={{ ...styles.filterButton, ...styles.filterButtonMuted }}
                                >
                                    Cancelar
                                </button>
                                <button onClick={handleEditCompra} style={styles.submitButton}>
                                    Guardar cambios
                                </button>
                            </div>
                        </div>
                    </div>
                )}

            </div>
        </>
    );
};

const styles = {
    container: {
        padding: 0,
        fontFamily: "'Inter', 'Segoe UI', system-ui, sans-serif",
        width: '100%',
        maxWidth: '100%',
        color: '#1a2926',
    },
    pageTitle: { color: '#1a2926', fontSize: '1.5rem', fontWeight: 700, margin: 0 },
    newButton: {
        display: 'inline-flex', alignItems: 'center', gap: 8,
        padding: '10px 20px',
        background: 'linear-gradient(135deg, #5dc87a 0%, #38a080 100%)',
        color: '#fff', border: 'none', borderRadius: '10px',
        cursor: 'pointer', fontWeight: 700, fontSize: 14,
        fontFamily: "'Inter', 'Segoe UI', system-ui, sans-serif",
        boxShadow: '0 4px 14px rgba(93,200,122,0.30)',
        transition: 'all 0.18s ease',
    },
    newButtonCancel: {
        background: '#d8eae4', color: '#4a6660', boxShadow: 'none',
    },
    loadingMessage: { padding: '20px', textAlign: 'center', color: '#4a6660', fontSize: '1.1em' },
    accessDeniedMessage: {
        color: '#991b1b', marginBottom: '10px', padding: '20px',
        border: '1px solid #fca5a5', textAlign: 'center',
        borderRadius: '10px', backgroundColor: '#fef2f2', fontWeight: 'bold',
    },
    noStoreSelectedMessage: { padding: '50px', textAlign: 'center', color: '#8aa8a0', fontSize: '1.2em' },
    errorMessage: {
        color: '#991b1b', marginBottom: '20px', border: '1px solid #fca5a5',
        padding: '15px', borderRadius: '10px', backgroundColor: '#fef2f2',
        textAlign: 'center', fontWeight: 'bold',
    },
    formCard: {
        backgroundColor: '#ffffff',
        padding: '20px 24px',
        borderRadius: '14px',
        boxShadow: '0 1px 3px rgba(0,0,0,.07)',
        border: '1px solid #a8e6c5',
        marginBottom: '16px',
    },
    filtersCard: {
        backgroundColor: '#ffffff',
        padding: '18px 20px',
        borderRadius: '12px',
        boxShadow: '0 1px 3px rgba(0,0,0,.07)',
        border: '1px solid #edf5f2',
        marginBottom: '16px',
        display: 'flex',
        flexDirection: 'column',
        gap: 16,
    },
    summaryCard: {
        backgroundColor: '#fffbeb',
        border: '1px solid #fcd34d',
        borderRadius: '12px',
        padding: '14px 20px',
        marginBottom: '16px',
    },
    tableCard: {
        backgroundColor: '#ffffff',
        padding: '20px 24px',
        borderRadius: '14px',
        boxShadow: '0 1px 3px rgba(0,0,0,.07)',
        border: '1px solid #edf5f2',
    },
    cardTitle: {
        color: '#4a6660', fontSize: '0.78rem', fontWeight: 700,
        textTransform: 'uppercase', letterSpacing: '0.05em', margin: '0 0 16px 0',
    },
    periodSection: { display: 'flex', flexDirection: 'column', gap: 6 },
    periodSectionTitle: {
        fontWeight: 700, color: '#4a6660', fontSize: '0.78rem',
        textTransform: 'uppercase', letterSpacing: '0.05em',
    },
    periodInputs: { display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'flex-end' },
    periodHint: { margin: '4px 0 0', fontSize: 12, color: '#8aa8a0' },
    filtersRow2: { display: 'flex', flexWrap: 'wrap', gap: 16, alignItems: 'flex-end' },
    filterGroup: { display: 'flex', flexDirection: 'column', minWidth: 160 },
    filterLabel: {
        marginBottom: 4, fontWeight: 600, color: '#4a6660',
        fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '0.05em',
    },
    filterInput: {
        padding: '8px 12px', border: '1.5px solid #d8eae4', borderRadius: '8px',
        fontSize: 13, color: '#1a2926', backgroundColor: '#f7faf9',
        fontFamily: "'Inter', 'Segoe UI', system-ui, sans-serif",
    },
    filterActions: { display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'flex-end' },
    filterButton: {
        padding: '9px 18px',
        background: 'linear-gradient(135deg, #5dc87a 0%, #38a080 100%)',
        color: 'white', border: 'none', borderRadius: '8px',
        cursor: 'pointer', fontWeight: 700, fontSize: 13,
        fontFamily: "'Inter', 'Segoe UI', system-ui, sans-serif",
        transition: 'all 0.18s ease',
        boxShadow: '0 2px 8px rgba(93,200,122,0.25)',
    },
    filterButtonSecondary: { background: '#3b9ede', boxShadow: '0 2px 8px rgba(59,158,222,0.20)' },
    filterButtonMuted: { background: '#d8eae4', color: '#4a6660', boxShadow: 'none' },
    validationError: { marginTop: 8, color: '#e25252', fontSize: 13, fontWeight: 600 },
    form: { display: 'flex', flexWrap: 'wrap', gap: 16, alignItems: 'flex-end' },
    formGroup: { flex: 1, minWidth: '180px', display: 'flex', flexDirection: 'column' },
    formLabel: {
        marginBottom: 5, fontWeight: 600, color: '#4a6660',
        fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '0.05em',
    },
    input: {
        width: '100%', padding: '9px 12px',
        border: '1.5px solid #d8eae4', borderRadius: '8px',
        fontSize: 14, color: '#1a2926', backgroundColor: '#f7faf9',
        fontFamily: "'Inter', 'Segoe UI', system-ui, sans-serif",
        boxSizing: 'border-box', outline: 'none',
        transition: 'border-color 0.15s',
    },
    submitButton: {
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8,
        padding: '10px 24px',
        background: 'linear-gradient(135deg, #5dc87a 0%, #38a080 100%)',
        color: 'white', border: 'none', borderRadius: '8px',
        cursor: 'pointer', fontWeight: 700, fontSize: 14,
        fontFamily: "'Inter', 'Segoe UI', system-ui, sans-serif",
        boxShadow: '0 4px 14px rgba(93,200,122,0.30)',
        transition: 'all 0.18s ease',
        whiteSpace: 'nowrap',
    },
    table: { width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: 14 },
    th: {
        padding: '10px 14px', borderBottom: '2px solid #d8eae4',
        backgroundColor: '#f7faf9', fontWeight: 600, fontSize: '0.75rem',
        color: '#4a6660', textTransform: 'uppercase', letterSpacing: '0.04em',
        whiteSpace: 'nowrap',
    },
    td: {
        padding: '11px 14px', borderBottom: '1px solid #edf5f2',
        verticalAlign: 'middle', color: '#1a2926',
    },
    editButton: {
        display: 'inline-flex', alignItems: 'center',
        padding: '6px 14px', borderRadius: '7px',
        backgroundColor: '#eff6ff', color: '#1e4a8a',
        border: '1px solid #93c5fd',
        cursor: 'pointer', fontWeight: 600, fontSize: 12,
        fontFamily: "'Inter', 'Segoe UI', system-ui, sans-serif",
        transition: 'all 0.15s ease', whiteSpace: 'nowrap',
    },
    deleteButton: {
        display: 'inline-flex', alignItems: 'center',
        padding: '6px 14px', borderRadius: '7px',
        backgroundColor: 'rgba(226,82,82,0.08)', color: '#e25252',
        border: '1px solid rgba(226,82,82,0.25)',
        cursor: 'pointer', fontWeight: 600, fontSize: 12,
        fontFamily: "'Inter', 'Segoe UI', system-ui, sans-serif",
        transition: 'all 0.15s ease', whiteSpace: 'nowrap',
    },
    paginationContainer: {
        display: 'flex', justifyContent: 'center', alignItems: 'center',
        marginTop: '20px', gap: '12px', paddingTop: '16px',
        borderTop: '1px solid #edf5f2',
    },
    paginationButton: {
        padding: '8px 18px',
        background: 'linear-gradient(135deg, #5dc87a 0%, #38a080 100%)',
        color: 'white', border: 'none', borderRadius: '8px',
        fontWeight: 600, fontSize: 13,
        fontFamily: "'Inter', 'Segoe UI', system-ui, sans-serif",
        boxShadow: '0 2px 8px rgba(93,200,122,0.20)',
        transition: 'all 0.18s ease',
    },
    pageInfo: { fontSize: 13, fontWeight: 600, color: '#4a6660' },
    modalOverlay: {
        position: 'fixed', inset: 0,
        backgroundColor: 'rgba(15,25,22,0.55)',
        backdropFilter: 'blur(2px)',
        zIndex: 1000,
        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20,
    },
    modalCard: {
        backgroundColor: '#ffffff', borderRadius: '16px',
        border: '1px solid #d8eae4', boxShadow: '0 10px 30px rgba(0,0,0,.10)',
        width: '100%', maxWidth: 460, padding: '24px 28px',
    },
};

const rcStyles = `
    .rc-tr:hover td { background-color: #f7faf9; }
    .rc-input:focus { border-color: #5dc87a !important; background-color: #fff !important; box-shadow: 0 0 0 3px rgba(93,200,122,0.12) !important; }
    .rc-submit-btn:hover { filter: brightness(1.06); }
    @media (max-width: 768px) {
        .rc-form { flex-direction: column !important; }
        .rc-form-group { min-width: 0 !important; width: 100% !important; }
        .rc-submit-group { align-items: stretch !important; }
        .rc-submit-btn { width: 100% !important; }
        .rc-period-inputs { flex-direction: column !important; }
        .rc-filter-group { min-width: 0 !important; width: 100% !important; }
        .rc-filter-input { width: 100% !important; box-sizing: border-box !important; }
        .rc-filters-row2 { flex-direction: column !important; align-items: stretch !important; }
        .rc-filters-card { padding: 14px 16px !important; }
        .rc-form-card { padding: 16px !important; }
        .rc-table-card { padding: 14px 12px !important; }
        .rc-table-wrapper { overflow-x: auto; -webkit-overflow-scrolling: touch; }
        .rc-table { min-width: 560px; font-size: 0.85em; }
        .rc-filter-actions { flex-wrap: wrap !important; }
        .rc-summary-card { padding: 12px 14px !important; }
    }
    @media (max-width: 480px) {
        .rc-table { min-width: 480px; font-size: 0.8em; }
    }
`;

export default RegistroCompras;
