// BONITO_AMOR/frontend/src/components/Productos.js

import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { useAuth } from '../AuthContext';
import '../styles/Productos.css';
import Modal from 'react-modal';
import { useNavigate } from 'react-router-dom';

Modal.setAppElement('#root');

const Productos = () => {
    const { authTokens, isAuthenticated, user, selectedStoreSlug, stores, selectStore } = useAuth();
    const [productos, setProductos] = useState([]);
    const [categorias, setCategorias] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [selectedProductoId, setSelectedProductoId] = useState(null);
    const [formData, setFormData] = useState({
        nombre: '',
        descripcion: '',
        precio: '',
        stock: '',
        categoria: '',
        codigo_barras: ''
    });

    const navigate = useNavigate();

    const fetchProductosYCategorias = useCallback(async () => {
        if (!isAuthenticated || !selectedStoreSlug) {
            setLoading(false);
            return;
        }

        const config = {
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${authTokens.access}`,
            }
        };

        try {
            // Fetch productos
            const productosResponse = await axios.get(`https://bonito-amor-backend.onrender.com/api/productos/?tienda_slug=${selectedStoreSlug}`, config);
            setProductos(productosResponse.data.results);

            // Fetch categorias
            const categoriasResponse = await axios.get('[https://bonito-amor-backend.onrender.com/api/categorias/](https://bonito-amor-backend.onrender.com/api/categorias/)', config);
            setCategorias(categoriasResponse.data.results);
        } catch (err) {
            setError('Error al cargar los productos o categorías.');
            console.error(err);
        } finally {
            setLoading(false);
        }
    }, [isAuthenticated, selectedStoreSlug, authTokens]);

    useEffect(() => {
        fetchProductosYCategorias();
    }, [fetchProductosYCategorias]);

    const openEditModal = (productoId) => {
        setSelectedProductoId(productoId);
        const productoToEdit = (productos || []).find(p => p.id === productoId);
        if (productoToEdit) {
            setFormData({
                nombre: productoToEdit.nombre,
                descripcion: productoToEdit.descripcion || '',
                precio: productoToEdit.precio,
                stock: productoToEdit.stock,
                categoria: productoToEdit.categoria ? productoToEdit.categoria.id : '',
                codigo_barras: productoToEdit.codigo_barras || '',
            });
            setIsModalOpen(true);
        }
    };
    
    const closeModal = () => {
        setIsModalOpen(false);
        setSelectedProductoId(null);
    };

    const openCreateModal = () => {
        setIsCreateModalOpen(true);
        setFormData({
            nombre: '',
            descripcion: '',
            precio: '',
            stock: '',
            categoria: '',
            codigo_barras: ''
        });
    };

    const closeCreateModal = () => {
        setIsCreateModalOpen(false);
    };

    const handleInputChange = (e) => {
        setFormData({
            ...formData,
            [e.target.name]: e.target.value
        });
    };

    const handleEditSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        const config = {
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${authTokens.access}`,
            }
        };

        try {
            const endpoint = `https://bonito-amor-backend.onrender.com/api/productos/${selectedProductoId}/`;
            const data = {
                ...formData,
                categoria: formData.categoria || null,
            };
            await axios.put(endpoint, data, config);
            fetchProductosYCategorias();
            closeModal();
        } catch (err) {
            setError('Error al actualizar el producto.');
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleCreateSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        const config = {
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${authTokens.access}`,
            }
        };

        try {
            const data = {
                ...formData,
                categoria: formData.categoria || null,
                tienda_slug: selectedStoreSlug
            };
            await axios.post('[https://bonito-amor-backend.onrender.com/api/productos/](https://bonito-amor-backend.onrender.com/api/productos/)', data, config);
            fetchProductosYCategorias();
            closeCreateModal();
        } catch (err) {
            setError('Error al crear el producto.');
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (productoId) => {
        setLoading(true);
        const config = {
            headers: {
                'Authorization': `Bearer ${authTokens.access}`,
            }
        };

        try {
            await axios.delete(`https://bonito-amor-backend.onrender.com/api/productos/${productoId}/`, config);
            fetchProductosYCategorias();
        } catch (err) {
            setError('Error al eliminar el producto.');
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return <div className="productos-loading">Cargando productos...</div>;
    }

    if (error) {
        return <div className="productos-error">{error}</div>;
    }

    if (!isAuthenticated) {
        return <div className="productos-error">Debes iniciar sesión para ver esta página.</div>;
    }

    const getCategoriaName = (id) => {
        const categoria = (categorias || []).find(c => c.id === id);
        return categoria ? categoria.nombre : 'Sin categoría';
    };

    return (
        <div className="productos-container">
            <h1 className="productos-title">Gestión de Productos</h1>
            <button onClick={openCreateModal} className="productos-button-add">Añadir Nuevo Producto</button>
            <div className="productos-list">
                {productos.length > 0 ? (
                    productos.map(producto => (
                        <div key={producto.id} className="productos-card">
                            <h3>{producto.nombre}</h3>
                            <p><strong>Descripción:</strong> {producto.descripcion}</p>
                            <p><strong>Precio:</strong> ${producto.precio}</p>
                            <p><strong>Stock:</strong> {producto.stock}</p>
                            <p><strong>Categoría:</strong> {getCategoriaName(producto.categoria)}</p>
                            <div className="productos-actions">
                                <button onClick={() => openEditModal(producto.id)} className="productos-button-edit">Editar</button>
                                <button onClick={() => handleDelete(producto.id)} className="productos-button-delete">Eliminar</button>
                            </div>
                        </div>
                    ))
                ) : (
                    <div className="productos-no-results">No hay productos disponibles para esta tienda.</div>
                )}
            </div>

            {/* Modal para Editar Producto */}
            <Modal
                isOpen={isModalOpen}
                onRequestClose={closeModal}
                contentLabel="Editar Producto"
                className="modal-content"
                overlayClassName="modal-overlay"
            >
                <h2>Editar Producto</h2>
                <form onSubmit={handleEditSubmit}>
                    <label>Nombre:</label>
                    <input type="text" name="nombre" value={formData.nombre} onChange={handleInputChange} required />

                    <label>Descripción:</label>
                    <textarea name="descripcion" value={formData.descripcion} onChange={handleInputChange} />

                    <label>Precio:</label>
                    <input type="number" name="precio" value={formData.precio} onChange={handleInputChange} required />

                    <label>Stock:</label>
                    <input type="number" name="stock" value={formData.stock} onChange={handleInputChange} required />

                    <label>Categoría:</label>
                    <select name="categoria" value={formData.categoria} onChange={handleInputChange}>
                        <option value="">-- Elige una categoría --</option>
                        {(categorias || []).map(cat => (
                            <option key={cat.id} value={cat.id}>{cat.nombre}</option>
                        ))}
                    </select>

                    <label>Código de Barras:</label>
                    <input type="text" name="codigo_barras" value={formData.codigo_barras} onChange={handleInputChange} />

                    <div className="modal-actions">
                        <button type="submit">Guardar Cambios</button>
                        <button type="button" onClick={closeModal}>Cancelar</button>
                    </div>
                </form>
            </Modal>

            {/* Modal para Crear Producto */}
            <Modal
                isOpen={isCreateModalOpen}
                onRequestClose={closeCreateModal}
                contentLabel="Añadir Producto"
                className="modal-content"
                overlayClassName="modal-overlay"
            >
                <h2>Añadir Nuevo Producto</h2>
                <form onSubmit={handleCreateSubmit}>
                    <label>Nombre:</label>
                    <input type="text" name="nombre" value={formData.nombre} onChange={handleInputChange} required />

                    <label>Descripción:</label>
                    <textarea name="descripcion" value={formData.descripcion} onChange={handleInputChange} />

                    <label>Precio:</label>
                    <input type="number" name="precio" value={formData.precio} onChange={handleInputChange} required />

                    <label>Stock:</label>
                    <input type="number" name="stock" value={formData.stock} onChange={handleInputChange} required />

                    <label>Categoría:</label>
                    <select name="categoria" value={formData.categoria} onChange={handleInputChange}>
                        <option value="">-- Elige una categoría --</option>
                        {(categorias || []).map(cat => (
                            <option key={cat.id} value={cat.id}>{cat.nombre}</option>
                        ))}
                    </select>

                    <label>Código de Barras:</label>
                    <input type="text" name="codigo_barras" value={formData.codigo_barras} onChange={handleInputChange} />

                    <div className="modal-actions">
                        <button type="submit">Crear Producto</button>
                        <button type="button" onClick={closeCreateModal}>Cancelar</button>
                    </div>
                </form>
            </Modal>
        </div>
    );
};

export default Productos;