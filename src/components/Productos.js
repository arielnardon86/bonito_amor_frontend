// BONITO_AMOR/frontend/src/components/Productos.js
import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import Barcode from 'react-barcode';
import EtiquetasImpresion from './EtiquetasImpresion';
import { useAuth } from '../AuthContext'; // Importar useAuth para obtener selectedStoreSlug y token

// Define TALLE_OPTIONS aquí o impórtalo desde un archivo de constantes si lo tienes
const TALLE_OPTIONS = [
    { value: 'XS', label: 'Extra Pequeño' },
    { value: 'S', label: 'Pequeño' },
    { value: 'M', label: 'Mediano' },
    { value: 'L', label: 'Grande' },
    { value: 'XL', label: 'Extra Grande' },
    { value: 'UNICA', label: 'Talla Única' },
    { value: 'NUM36', label: '36' },
    { value: 'NUM38', label: '38' },
    { value: 'NUM40', label: '40' },
    { value: 'NUM42', label: '42' },
    { value: 'NUM44', label: '44' },
];

const API_BASE_URL = process.env.REACT_APP_API_URL; 

function Productos() {
  const { user, isAuthenticated, loading: authLoading, selectedStoreSlug, token } = useAuth(); // Obtener selectedStoreSlug y token

  const [productos, setProductos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [nombre, setNombre] = useState('');
  const [codigoBarras, setCodigoBarras] = useState('');
  const [precioVenta, setPrecioVenta] = useState(''); // Este es el que mapearemos a 'precio' en backend
  const [stock, setStock] = useState('');
  const [talle, setTalle] = useState('UNICA');
  // Eliminado: const [categoria, setCategoria] = useState(''); // Eliminado
  // Eliminado: const [categorias, setCategorias] = useState([]); // Eliminado

  const [successMessage, setSuccessMessage] = useState(null);
  const [mensajeError, setMensajeError] = useState(null);

  const [selectedProductsForLabels, setSelectedProductsForLabels] = useState({}); // { productId: quantity }
  const [showPrintPreview, setShowPrintPreview] = useState(false);

  const [editingStockId, setEditingStockId] = useState(null);
  const [newStockValue, setNewStockValue] = useState('');

  const [editingPriceId, setEditingPriceId] = useState(null);
  const [newPriceValue, setNewPriceValue] = useState('');


  // Eliminado: fetchCategorias ya no es necesaria

  const fetchProductos = useCallback(async () => {
    if (!token || !selectedStoreSlug) { 
        setLoading(false);
        return;
    }
    setLoading(true);
    setError(null);
    try {
      const response = await axios.get(`${API_BASE_URL}/productos/`, {
        headers: { 'Authorization': `Bearer ${token}` },
        params: { tienda_slug: selectedStoreSlug }
      });
      // CAMBIO CLAVE AQUÍ: Asegurar que setProductos siempre reciba un array
      setProductos(Array.isArray(response.data.results) ? response.data.results : (Array.isArray(response.data) ? response.data : []));
      setLoading(false);
      setError(null);
    } catch (err) {
      setError('Error al cargar los productos: ' + (err.response ? JSON.stringify(err.response.data) : err.message));
      setLoading(false);
      console.error('Error fetching products:', err.response || err.message);
    }
  }, [token, selectedStoreSlug]); 


  useEffect(() => {
    if (!authLoading && isAuthenticated && user && (user.is_superuser || user.is_staff) && selectedStoreSlug) {
        fetchProductos();
    } else if (!authLoading && (!isAuthenticated || !user || (!user.is_superuser && !user.is_staff))) {
        setError("Acceso denegado. No tienes permisos para ver/gestionar productos.");
        setLoading(false);
    } else if (!authLoading && isAuthenticated && user && (user.is_superuser || user.is_staff) && !selectedStoreSlug) {
        setLoading(false); 
    }
  }, [isAuthenticated, user, authLoading, selectedStoreSlug, fetchProductos]); 


  const handleSubmit = async (e) => {
    e.preventDefault();
    setMensajeError(null);
    setSuccessMessage(null);

    if (!selectedStoreSlug) {
        setMensajeError("Por favor, selecciona una tienda antes de añadir un producto.");
        return;
    }

    if (!nombre || precioVenta === '' || stock === '' || !talle) { 
        setMensajeError('Por favor, completa todos los campos requeridos (Nombre, Precio Venta, Stock, Talle).');
        return;
    }
    
    const parsedPrecioVenta = parseFloat(precioVenta);
    const parsedStock = parseInt(stock, 10);

    if (isNaN(parsedPrecioVenta) || parsedPrecioVenta < 0) {
        setMensajeError('El precio de venta debe ser un número válido y no negativo.');
        return;
    }
    if (isNaN(parsedStock) || parsedStock < 0) {
        setMensajeError('El stock debe ser un número entero no negativo.');
        return;
    }

    const nuevoProducto = {
      nombre,
      codigo_barras: codigoBarras || null, 
      precio: parsedPrecioVenta, 
      stock: parsedStock,                 
      talle,
    };

    try {
      const response = await axios.post(`${API_BASE_URL}/productos/`, nuevoProducto, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      console.log('Producto añadido:', response.data);
      setSuccessMessage('Producto añadido con éxito!');
      fetchProductos(); 
      setNombre('');
      setCodigoBarras('');
      setPrecioVenta('');
      setStock('');
      setTalle('UNICA');
    } catch (err) {
      setMensajeError('Error al añadir el producto: ' + (err.response?.data ? JSON.stringify(err.response.data) : err.message));
      console.error('Error adding product:', err.response || err);
    }
  };

  const handleSelectProduct = (productId, isChecked) => {
    setSelectedProductsForLabels(prevSelected => {
      const newSelected = { ...prevSelected };
      if (isChecked) {
        newSelected[productId] = newSelected[productId] || 1; 
      } else {
        delete newSelected[productId];
      }
      return newSelected;
    });
  };

  const handleLabelQuantityChange = (productId, quantity) => {
    setSelectedProductsForLabels(prevSelected => ({
      ...prevSelected,
      [productId]: parseInt(quantity) || 1 
    }));
  };

  const handleSelectAll = (e) => {
    if (e.target.checked) {
      const allSelected = {};
      productos.forEach(p => {
        allSelected[p.id] = 1; 
      });
      setSelectedProductsForLabels(allSelected);
    } else {
      setSelectedProductsForLabels({});
    }
  };

  const handlePrintSelected = () => {
    if (Object.keys(selectedProductsForLabels).length === 0) {
      alert('Por favor, selecciona al menos un producto para imprimir.');
      return;
    }
    setShowPrintPreview(true);
  };

  const handleClosePrintPreview = () => {
    setSelectedProductsForLabels({}); 
    setShowPrintPreview(false);
  };

  const productosParaImprimir = productos
    .filter(p => selectedProductsForLabels[p.id]) 
    .map(p => ({
      ...p,
      labelQuantity: selectedProductsForLabels[p.id] 
    }));

  const handleDeleteProduct = async (productId) => {
    if (!selectedStoreSlug) {
        alert("Por favor, selecciona una tienda antes de eliminar un producto.");
        return;
    }
    if (window.confirm('¿Estás seguro de que quieres eliminar este producto? Esta acción es irreversible.')) {
      try {
        await axios.delete(`${API_BASE_URL}/productos/${productId}/`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        setSuccessMessage('Producto eliminado con éxito!');
        fetchProductos(); 
      } catch (err) {
        setMensajeError('Error al eliminar el producto: ' + (err.response?.data ? JSON.stringify(err.response.data) : err.message));
        console.error('Error deleting product:', err.response || err);
      }
    }
  };

  const handleEditStockClick = (productId, currentStock) => {
    setEditingStockId(productId);
    setNewStockValue(currentStock.toString()); 
  };

  const handleSaveStock = async (productId) => {
    setMensajeError(null);
    setSuccessMessage(null);

    if (!selectedStoreSlug) {
        setMensajeError("Por favor, selecciona una tienda antes de actualizar el stock.");
        return;
    }

    const stockInt = parseInt(newStockValue, 10); 

    if (isNaN(stockInt) || stockInt < 0) {
      setMensajeError('El stock debe ser un número entero no negativo.');
      return;
    }

    try {
      await axios.patch(`${API_BASE_URL}/productos/${productId}/`, { stock: stockInt }, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      setSuccessMessage('Stock actualizado con éxito!');
      setEditingStockId(null); 
      setNewStockValue(''); 
      fetchProductos(); 
    } catch (err) {
      setMensajeError('Error al actualizar el stock: ' + (err.response?.data ? JSON.stringify(err.response.data) : err.message));
      console.error('Error updating stock:', err.response || err);
    }
  };

  const handleCancelEditStock = () => {
    setEditingStockId(null);
    setNewStockValue('');
  };

  const handleEditPriceClick = (productId, currentPrice) => {
    setEditingPriceId(productId);
    setNewPriceValue(currentPrice.toString()); 
  };

  const handleSavePrice = async (productId) => {
    setMensajeError(null);
    setSuccessMessage(null);

    if (!selectedStoreSlug) {
        setMensajeError("Por favor, selecciona una tienda antes de actualizar el precio.");
        return;
    }

    const priceFloat = parseFloat(newPriceValue);

    if (isNaN(priceFloat) || priceFloat < 0) {
      setMensajeError('El precio de venta debe ser un número válido y no negativo.');
      return;
    }

    try {
      await axios.patch(`${API_BASE_URL}/productos/${productId}/`, { precio: priceFloat }, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      setSuccessMessage('Precio de venta actualizado con éxito!');
      setEditingPriceId(null); 
      setNewPriceValue(''); 
      fetchProductos(); 
    } catch (err) {
      setMensajeError('Error al actualizar el precio de venta: ' + (err.response?.data ? JSON.stringify(err.response.data) : err.message));
      console.error('Error updating price:', err.response || err);
    }
  };

  const handleCancelEditPrice = () => {
    setEditingPriceId(null);
    setNewPriceValue('');
  };


  if (authLoading || (isAuthenticated && !user)) {
    return <div style={{ padding: '20px', textAlign: 'center' }}>Cargando datos de usuario...</div>;
  }

  if (!isAuthenticated || !(user.is_superuser || user.is_staff)) { 
    return <div style={{ color: 'red', marginBottom: '10px', padding: '20px', border: '1px solid red', textAlign: 'center' }}>Acceso denegado. No tienes permisos para ver/gestionar productos.</div>;
  }

  if (!selectedStoreSlug) {
    return (
        <div style={{ padding: '50px', textAlign: 'center' }}>
            <h2>Por favor, selecciona una tienda en la barra de navegación para gestionar productos.</h2>
        </div>
    );
  }

  if (loading) {
    return <div style={{ padding: '20px', textAlign: 'center' }}>Cargando productos de {selectedStoreSlug}...</div>;
  }

  if (error) {
    return <div style={{ color: 'red', marginBottom: '10px', padding: '20px', border: '1px solid red' }}>{error}</div>;
  }

  if (showPrintPreview) {
    return (
      <div style={{ padding: '20px' }}>
        <button onClick={handleClosePrintPreview} style={{ marginBottom: '10px', padding: '10px 20px', backgroundColor: '#dc3545', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer' }}>
          Volver a Gestión de Productos
        </button>
        <button onClick={() => window.print()} style={{ marginLeft: '10px', marginBottom: '10px', padding: '10px 20px', backgroundColor: '#28a745', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer' }}>
          Imprimir Etiquetas
        </button>
        <EtiquetasImpresion productosParaImprimir={productosParaImprimir} />
      </div>
    );
  }

  return (
    <div style={{ padding: '20px', fontFamily: 'Arial, sans-serif', maxWidth: '1200px', margin: 'auto' }}>
      <h1>Gestión de Productos ({selectedStoreSlug})</h1>

      {mensajeError && <div style={{ color: 'red', marginBottom: '10px', border: '1px solid red', padding: '10px' }}>{mensajeError}</div>}
      {successMessage && <div style={{ color: 'green', marginBottom: '10px', border: '1px solid green', padding: '10px' }}>{successMessage}</div>}

      <h2>Añadir Nuevo Producto</h2>
      <form onSubmit={handleSubmit} style={{ marginBottom: '30px', border: '1px solid #ccc', padding: '20px', borderRadius: '5px', backgroundColor: '#f9f9f9' }}>
        <div style={{ marginBottom: '10px' }}>
          <label style={{ display: 'block', marginBottom: '5px' }}>Nombre:</label>
          <input type="text" value={nombre} onChange={(e) => setNombre(e.target.value)} required style={{ width: 'calc(100% - 12px)', padding: '8px', border: '1px solid #ddd', borderRadius: '4px' }} />
        </div>
        <div style={{ marginBottom: '10px' }}>
          <label style={{ display: 'block', marginBottom: '5px' }}>Código de Barras (Opcional - se genera automáticamente si está vacío):</label>
          <input type="text" value={codigoBarras} onChange={(e) => setCodigoBarras(e.target.value)} style={{ width: 'calc(100% - 12px)', padding: '8px', border: '1px solid #ddd', borderRadius: '4px' }} />
        </div>
        <div style={{ marginBottom: '10px' }}>
          <label style={{ display: 'block', marginBottom: '5px' }}>Talle:</label>
          <select value={talle} onChange={(e) => setTalle(e.target.value)} required style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '4px' }}>
            {TALLE_OPTIONS.map(option => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>
        </div>
        <div style={{ marginBottom: '10px' }}>
          <label style={{ display: 'block', marginBottom: '5px' }}>Precio Venta:</label>
          <input type="number" step="0.01" value={precioVenta} onChange={(e) => setPrecioVenta(e.target.value)} required style={{ width: 'calc(100% - 12px)', padding: '8px', border: '1px solid #ddd', borderRadius: '4px' }} />
        </div>
        <div style={{ marginBottom: '20px' }}>
          <label style={{ display: 'block', marginBottom: '5px' }}>Stock:</label>
          <input type="number" value={stock} onChange={(e) => setStock(e.target.value)} required style={{ width: 'calc(100% - 12px)', padding: '8px', border: '1px solid #ddd', borderRadius: '4px' }} />
        </div>
        <button type="submit" style={{ padding: '10px 20px', backgroundColor: '#007bff', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer', fontSize: '16px' }}>
          Añadir Producto
        </button>
      </form>

      <h2>Lista de Productos Existentes</h2>
      {productos.length === 0 ? (
        <p>No hay productos disponibles en esta tienda.</p>
      ) : (
        <>
          <div style={{ marginBottom: '15px' }}>
            <button onClick={handlePrintSelected} style={{ padding: '10px 20px', backgroundColor: '#007bff', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer' }}>
              Imprimir Códigos de Barras Seleccionados ({Object.keys(selectedProductsForLabels).length})
            </button>
          </div>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', border: '1px solid #ddd' }}>
            <thead>
              <tr style={{ backgroundColor: '#f2f2f2' }}>
                <th style={{ padding: '12px', border: '1px solid #ddd' }}>
                  <input
                    type="checkbox"
                    onChange={handleSelectAll}
                    checked={Object.keys(selectedProductsForLabels).length === productos.length && productos.length > 0}
                  />
                </th>
                <th style={{ padding: '12px', border: '1px solid #ddd' }}>Cant. Etiquetas</th> 
                <th style={{ padding: '12px', border: '1px solid #ddd' }}>ID</th>
                <th style={{ padding: '12px', border: '1px solid #ddd' }}>Nombre</th>
                <th style={{ padding: '12px', border: '1px solid #ddd' }}>Talle</th>
                <th style={{ padding: '12px', border: '1px solid #ddd' }}>Código</th>
                <th style={{ padding: '12px', border: '1px solid #ddd' }}>Imagen Código</th>
                <th style={{ padding: '12px', border: '1px solid #ddd' }}>P. Venta</th>
                <th style={{ padding: '12px', border: '1px solid #ddd' }}>Stock</th>
                <th style={{ padding: '12px', border: '1px solid #ddd' }}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {productos.map(producto => (
                <tr key={producto.id}>
                  <td style={{ padding: '12px', border: '1px solid #ddd' }}>
                    <input
                      type="checkbox"
                      checked={!!selectedProductsForLabels[producto.id]} 
                      onChange={(e) => handleSelectProduct(producto.id, e.target.checked)}
                    />
                  </td>
                  <td style={{ padding: '12px', border: '1px solid #ddd' }}>
                    {!!selectedProductsForLabels[producto.id] && ( 
                      <input
                        type="number"
                        min="1"
                        value={selectedProductsForLabels[producto.id] || 1}
                        onChange={(e) => handleLabelQuantityChange(producto.id, e.target.value)}
                        style={{ width: '60px', padding: '5px', border: '1px solid #ccc', borderRadius: '3px' }}
                      />
                    )}
                  </td>
                  <td style={{ padding: '12px', border: '1px solid #ddd' }}>{producto.id}</td>
                  <td style={{ padding: '12px', border: '1px solid #ddd' }}>{producto.nombre}</td>
                  <td style={{ padding: '12px', border: '1px solid #ddd' }}>{producto.talle || 'N/A'}</td>
                  <td style={{ padding: '12px', border: '1px solid #ddd' }}>{producto.codigo_barras || 'N/A'}</td>
                  <td style={{ padding: '12px', border: '1px solid #ddd' }}>
                    {producto.codigo_barras ? (
                      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minWidth: '150px' }}>
                          <Barcode
                              value={String(producto.codigo_barras)}
                              format="EAN13"
                              width={1.2}
                              height={50}
                              displayValue={true}
                              fontSize={11}
                              textMargin={3}
                              background="#ffffff"
                              lineColor="#000000"
                          />
                      </div>
                    ) : (
                      <span style={{ color: '#888' }}>Sin código</span>
                    )}
                  </td>
                  <td style={{ padding: '12px', border: '1px solid #ddd' }}>
                    {editingPriceId === producto.id ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                        <input
                          type="number"
                          step="0.01"
                          value={newPriceValue}
                          onChange={(e) => setNewPriceValue(e.target.value)}
                          min="0"
                          style={{ width: '80px', padding: '5px', border: '1px solid #ccc', borderRadius: '3px' }}
                        />
                        <button onClick={() => handleSavePrice(producto.id)} style={{ padding: '5px 8px', backgroundColor: '#28a745', color: 'white', border: 'none', borderRadius: '3px', cursor: 'pointer' }}>
                          Guardar
                        </button>
                        <button onClick={handleCancelEditPrice} style={{ padding: '5px 8px', backgroundColor: '#6c757d', color: 'white', border: 'none', borderRadius: '3px', cursor: 'pointer' }}>
                          Cancelar
                        </button>
                      </div>
                    ) : (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                        <span>${parseFloat(producto.precio).toFixed(2)}</span> 
                        <button onClick={() => handleEditPriceClick(producto.id, producto.precio)} style={{ padding: '5px 8px', backgroundColor: '#ffc107', color: 'black', border: 'none', borderRadius: '3px', cursor: 'pointer' }}>
                          Editar
                        </button>
                      </div>
                    )}
                  </td>
                  <td style={{ padding: '12px', border: '1px solid #ddd' }}>
                    {editingStockId === producto.id ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                        <input
                          type="number"
                          value={newStockValue}
                          onChange={(e) => setNewStockValue(e.target.value)}
                          min="0"
                          style={{ width: '60px', padding: '5px', border: '1px solid #ccc', borderRadius: '3px' }}
                        />
                        <button onClick={() => handleSaveStock(producto.id)} style={{ padding: '5px 8px', backgroundColor: '#28a745', color: 'white', border: 'none', borderRadius: '3px', cursor: 'pointer' }}>
                          Guardar
                        </button>
                        <button onClick={handleCancelEditStock} style={{ padding: '5px 8px', backgroundColor: '#6c757d', color: 'white', border: 'none', borderRadius: '3px', cursor: 'pointer' }}>
                          Cancelar
                        </button>
                      </div>
                    ) : (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                        <span>{producto.stock}</span>
                        <button onClick={() => handleEditStockClick(producto.id, producto.stock)} style={{ padding: '5px 8px', backgroundColor: '#ffc107', color: 'black', border: 'none', borderRadius: '3px', cursor: 'pointer' }}>
                          Editar
                        </button>
                      </div>
                    )}
                  </td>
                  <td style={{ padding: '12px', border: '1px solid #ddd' }}>
                    <button
                      onClick={() => handleDeleteProduct(producto.id)}
                      style={{ padding: '8px 12px', backgroundColor: '#dc3545', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer' }}
                    >
                      Eliminar
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}
    </div>
  );
}

export default Productos;
