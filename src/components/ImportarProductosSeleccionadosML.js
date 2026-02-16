// Modal para importar productos seleccionados desde Mercado Libre
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import Swal from 'sweetalert2';

const normalizeApiUrl = (url) => {
    if (!url) return 'http://localhost:8000';
    let u = url;
    if (u.endsWith('/api/') || u.endsWith('/api')) u = u.replace(/\/api\/?$/, '');
    if (u.endsWith('/')) u = u.slice(0, -1);
    return u;
};

const BASE = normalizeApiUrl(process.env.REACT_APP_API_URL || 'http://localhost:8000');

const ImportarProductosSeleccionadosML = ({ tiendaId, token, onClose, onImport }) => {
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [seleccionados, setSeleccionados] = useState({});
    const [total, setTotal] = useState(0);
    const [offset, setOffset] = useState(0);
    const limit = 100;

    const cargarItems = async (off = 0) => {
        setLoading(true);
        try {
            const res = await axios.get(
                `${BASE}/api/tiendas/${tiendaId}/mercadolibre/items/`,
                {
                    headers: { Authorization: `Bearer ${token}` },
                    params: { limit, offset: off },
                    timeout: 60000
                }
            );
            const list = res.data.items || [];
            setItems(list);
            setTotal(res.data.paging?.total ?? list.length);
            setOffset(off);
            const sel = {};
            list.forEach(it => { sel[it.id] = false; });
            setSeleccionados(prev => ({ ...prev, ...sel }));
        } catch (err) {
            Swal.fire('Error', err.response?.data?.error || err.message || 'No se pudieron cargar los productos', 'error');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (tiendaId && token) cargarItems(0);
    }, [tiendaId, token]);

    const toggle = (id) => setSeleccionados(prev => ({ ...prev, [id]: !prev[id] }));
    const toggleTodos = () => {
        const all = Object.keys(seleccionados).every(k => seleccionados[k]);
        const next = {};
        Object.keys(seleccionados).forEach(k => { next[k] = !all; });
        setSeleccionados(next);
    };
    const seleccionadosIds = () => Object.keys(seleccionados).filter(k => seleccionados[k]);

    const handleImportar = async () => {
        const ids = seleccionadosIds();
        if (ids.length === 0) {
            Swal.fire('Aviso', 'Seleccioná al menos un producto para importar', 'warning');
            return;
        }
        onImport(ids);
        onClose();
    };

    return (
        <div style={{ padding: '20px', minHeight: '400px' }}>
            <h3 style={{ marginTop: 0, marginBottom: '15px' }}>Importar productos</h3>
            <p style={{ color: '#666', marginBottom: '15px', fontSize: '14px' }}>
                Elegí los productos de Mercado Libre que querés traer a Total Stock.
            </p>
            {loading ? (
                <p style={{ textAlign: 'center', padding: '40px' }}>Cargando productos...</p>
            ) : items.length === 0 ? (
                <p style={{ textAlign: 'center', padding: '40px', color: '#666' }}>No hay productos en tu tienda de Mercado Libre.</p>
            ) : (
                <>
                    <div style={{ marginBottom: '15px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px' }}>
                        <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer', fontWeight: 500 }}>
                            <input type="checkbox" checked={Object.keys(seleccionados).length > 0 && Object.keys(seleccionados).every(k => seleccionados[k])} onChange={toggleTodos} style={{ marginRight: '10px', width: '18px', height: '18px' }} />
                            <span>Seleccionar todos</span>
                        </label>
                        <span style={{ fontSize: '14px', color: '#666' }}>
                            {seleccionadosIds().length} de {items.length} seleccionados
                        </span>
                    </div>
                    <div style={{ maxHeight: '350px', overflowY: 'auto', border: '1px solid #ddd', borderRadius: '6px', padding: '10px' }}>
                        {items.map(it => (
                            <div key={it.id} style={{ display: 'flex', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid #eee', gap: '12px' }}>
                                <input
                                    type="checkbox"
                                    checked={!!seleccionados[it.id]}
                                    onChange={() => toggle(it.id)}
                                    style={{ width: '18px', height: '18px', flexShrink: 0 }}
                                />
                                {it.thumbnail && (
                                    <img src={it.thumbnail} alt="" style={{ width: 48, height: 48, objectFit: 'cover', borderRadius: 4 }} />
                                )}
                                <div style={{ flex: 1, minWidth: 0 }}>
                                    <div style={{ fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{it.title || it.id}</div>
                                    <div style={{ fontSize: '13px', color: '#666' }}>${it.price?.toLocaleString('es-AR')} · Stock ML: {it.available_quantity ?? '-'}</div>
                                </div>
                            </div>
                        ))}
                    </div>
                    {total > limit && (
                        <p style={{ fontSize: '13px', color: '#888', marginTop: '10px' }}>Mostrando los primeros {limit} de {total} productos.</p>
                    )}
                    <div style={{ marginTop: '20px', display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                        <button type="button" onClick={onClose} style={{ padding: '10px 20px', backgroundColor: '#6c757d', color: 'white', border: 'none', borderRadius: 5, cursor: 'pointer' }}>Cancelar</button>
                        <button type="button" onClick={handleImportar} style={{ padding: '10px 20px', backgroundColor: '#2e7d32', color: 'white', border: 'none', borderRadius: 5, cursor: 'pointer', fontWeight: 500 }}>
                            Importar ({seleccionadosIds().length})
                        </button>
                    </div>
                </>
            )}
        </div>
    );
};

export default ImportarProductosSeleccionadosML;
