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
  const { user, isAuthenticated, loading: authLoading, selectedStoreSlug, token } = useAuth();

  const [productos, setProductos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [nombre, setNombre] = useState('');
  const [codigoBarras, setCodigoBarras] = useState('');
  const [precioVenta, setPrecioVenta] = useState('');
  const [stock, setStock] = useState('');
  const [talle, setTalle] = useState('UNICA');

  const [successMessage, setSuccessMessage] = useState(null);
  const [mensajeError, setMensajeError] = useState(null);

  const [selectedProductsForLabels, setSelectedProductsForLabels] = useState({});
  const [showPrintPreview, setShowPrintPreview] = useState(false);

  const [editingStockId, setEditingStockId] = useState(null);
  const [newStockValue, setNewStockValue] = useState('');

  const [editingPriceId, setEditingPriceId] = useState(null);
  const [newPriceValue, setNewPriceValue] = useState('');

  // Estados para el modal de confirmación
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [confirmMessage, setConfirmMessage] = useState('');
  const [confirmAction, setConfirmAction] = useState(() => () => {});

  // Estados para el cuadro de mensaje de alerta personalizado
  const [showAlertMessage, setShowAlertMessage] = useState(false);
  const [alertMessage, setAlertMessage] = useState('');

  // Función para mostrar un mensaje de alerta personalizado
  const showCustomAlert = (message, type = 'success') => {
      setAlertMessage(message);
      setShowAlertMessage(true);
      setTimeout(() => {
          setShowAlertMessage(false);
          setAlertMessage('');
      }, 3000);
  };


  const fetchProductos = useCallback(async () => {
    if (!token || !selectedStoreSlug) { 
        setLoading(false);
        return;
    }
    setLoading(true);
    setError(null);
    try {
      // CAMBIO CLAVE: Añadir /api/
      const response = await axios.get(`${API_BASE_URL}/api/productos/`, {
        headers: { 'Authorization': `Bearer ${token}` },
        params: { tienda_slug: selectedStoreSlug }
      });
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
      tienda: selectedStoreSlug // Asegúrate de enviar la tienda
    };

    try {
      // CAMBIO CLAVE: Añadir /api/
      const response = await axios.post(`${API_BASE_URL}/api/productos/`, nuevoProducto, {
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
      showCustomAlert('Por favor, selecciona al menos un producto para imprimir.', 'error'); // Usar alerta personalizada
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
        showCustomAlert("Por favor, selecciona una tienda antes de eliminar un producto.", 'error'); // Usar alerta personalizada
        return;
    }

    setConfirmMessage('¿Estás seguro de que quieres eliminar este producto? Esta acción es irreversible.');
    setConfirmAction(() => async () => {
        setShowConfirmModal(false); // Cerrar el modal después de confirmar
        try {
            // CAMBIO CLAVE: Añadir /api/
            await axios.delete(`${API_BASE_URL}/api/productos/${productId}/`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            setSuccessMessage('Producto eliminado con éxito!');
            fetchProductos(); 
        } catch (err) {
            setMensajeError('Error al eliminar el producto: ' + (err.response?.data ? JSON.stringify(err.response.data) : err.message));
            console.error('Error deleting product:', err.response || err);
        }
    });
    setShowConfirmModal(true); // Mostrar el modal
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
      // CAMBIO CLAVE: Añadir /api/
      await axios.patch(`${API_BASE_URL}/api/productos/${productId}/`, { stock: stockInt }, {
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
      // CAMBIO CLAVE: Añadir /api/
      await axios.patch(`${API_BASE_URL}/api/productos/${productId}/`, { precio: priceFloat }, {
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
    return <div style={styles.loadingMessage}>Cargando datos de usuario...</div>;
  }

  if (!isAuthenticated || !(user.is_superuser || user.is_staff)) { 
    return <div style={styles.accessDeniedMessage}>Acceso denegado. No tienes permisos para ver/gestionar productos.</div>;
  }

  if (!selectedStoreSlug) {
    return (
        <div style={styles.noStoreSelectedMessage}>
            <h2>Por favor, selecciona una tienda en la barra de navegación para gestionar productos.</h2>
        </div>
    );
  }

  if (loading) {
    return <div style={styles.loadingMessage}>Cargando productos de {selectedStoreSlug}...</div>;
  }

  if (error) {
    return <div style={styles.errorMessage}>{error}</div>;
  }

  if (showPrintPreview) {
    return (
      <div style={styles.printPreviewContainer}>
        <button onClick={handleClosePrintPreview} style={styles.backButton}>
          Volver a Gestión de Productos
        </button>
        <button onClick={() => window.print()} style={styles.printButton}>
          Imprimir Etiquetas
        </button>
        <EtiquetasImpresion productosParaImprimir={productosParaImprimir} />
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <h1>Gestión de Productos ({selectedStoreSlug})</h1>

      {mensajeError && <div style={styles.errorMessage}>{mensajeError}</div>}
      {successMessage && <div style={styles.successMessage}>{successMessage}</div>}

      <h2>Añadir Nuevo Producto</h2>
      <form onSubmit={handleSubmit} style={styles.formContainer}>
        <div style={styles.formGroup}>
          <label style={styles.label}>Nombre:</label>
          <input type="text" value={nombre} onChange={(e) => setNombre(e.target.value)} required style={styles.input} />
        </div>
        <div style={styles.formGroup}>
          <label style={styles.label}>Código de Barras (Opcional - se genera automáticamente si está vacío):</label>
          <input type="text" value={codigoBarras} onChange={(e) => setCodigoBarras(e.target.value)} style={styles.input} />
        </div>
        <div style={styles.formGroup}>
          <label style={styles.label}>Talle:</label>
          <select value={talle} onChange={(e) => setTalle(e.target.value)} required style={styles.input}>
            {TALLE_OPTIONS.map(option => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>
        </div>
        <div style={styles.formGroup}>
          <label style={styles.label}>Precio Venta:</label>
          <input type="number" step="0.01" value={precioVenta} onChange={(e) => setPrecioVenta(e.target.value)} required style={styles.input} />
        </div>
        <div style={styles.formGroup}>
          <label style={styles.label}>Stock:</label>
          <input type="number" value={stock} onChange={(e) => setStock(e.target.value)} required style={styles.input} />
        </div>
        <button type="submit" style={styles.submitButton}>
          Añadir Producto
        </button>
      </form>

      <h2>Lista de Productos Existentes</h2>
      {productos.length === 0 ? (
        <p style={styles.noDataMessage}>No hay productos disponibles en esta tienda.</p>
      ) : (
        <>
          <div style={styles.tableActions}>
            <button onClick={handlePrintSelected} style={styles.printSelectedButton}>
              Imprimir Códigos de Barras Seleccionados ({Object.keys(selectedProductsForLabels).length})
            </button>
          </div>
          <table style={styles.table}>
            <thead>
              <tr style={styles.tableHeaderRow}>
                <th style={styles.th}>
                  <input
                    type="checkbox"
                    onChange={handleSelectAll}
                    checked={Object.keys(selectedProductsForLabels).length === productos.length && productos.length > 0}
                  />
                </th>
                <th style={styles.th}>Cant. Etiquetas</th> 
                <th style={styles.th}>ID</th>
                <th style={styles.th}>Nombre</th>
                <th style={styles.th}>Talle</th>
                <th style={styles.th}>Código</th>
                <th style={styles.th}>Imagen Código</th>
                <th style={styles.th}>P. Venta</th>
                <th style={styles.th}>Stock</th>
                <th style={styles.th}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {productos.map(producto => (
                <tr key={producto.id}>
                  <td style={styles.td}>
                    <input
                      type="checkbox"
                      checked={!!selectedProductsForLabels[producto.id]} 
                      onChange={(e) => handleSelectProduct(producto.id, e.target.checked)}
                    />
                  </td>
                  <td style={styles.td}>
                    {!!selectedProductsForLabels[producto.id] && ( 
                      <input
                        type="number"
                        min="1"
                        value={selectedProductsForLabels[producto.id] || 1}
                        onChange={(e) => handleLabelQuantityChange(producto.id, e.target.value)}
                        style={styles.quantityInput}
                      />
                    )}
                  </td>
                  <td style={styles.td}>{producto.id}</td>
                  <td style={styles.td}>{producto.nombre}</td>
                  <td style={styles.td}>{producto.talle || 'N/A'}</td>
                  <td style={styles.td}>{producto.codigo_barras || 'N/A'}</td>
                  <td style={styles.td}>
                    {producto.codigo_barras ? (
                      <div style={styles.barcodeContainer}>
                          <Barcode
                              value={String(producto.codigo_barras)}
                              format="CODE128" 
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
                      <span style={styles.noBarcodeText}>Sin código</span>
                    )}
                  </td>
                  <td style={styles.td}>
                    {editingPriceId === producto.id ? (
                      <div style={styles.editControls}>
                        <input
                          type="number"
                          step="0.01"
                          value={newPriceValue}
                          onChange={(e) => setNewPriceValue(e.target.value)}
                          min="0"
                          style={styles.editInput}
                        />
                        <button onClick={() => handleSavePrice(producto.id)} style={styles.saveButton}>
                          Guardar
                        </button>
                        <button onClick={handleCancelEditPrice} style={styles.cancelButton}>
                          Cancelar
                        </button>
                      </div>
                    ) : (
                      <div style={styles.displayControls}>
                        <span>${parseFloat(producto.precio).toFixed(2)}</span> 
                        <button onClick={() => handleEditPriceClick(producto.id, producto.precio)} style={styles.editButton}>
                          Editar
                        </button>
                      </div>
                    )}
                  </td>
                  <td style={styles.td}>
                    {editingStockId === producto.id ? (
                      <div style={styles.editControls}>
                        <input
                          type="number"
                          value={newStockValue}
                          onChange={(e) => setNewStockValue(e.target.value)}
                          min="0"
                          style={styles.editInput}
                        />
                        <button onClick={() => handleSaveStock(producto.id)} style={styles.saveButton}>
                          Guardar
                        </button>
                        <button onClick={handleCancelEditStock} style={styles.cancelButton}>
                          Cancelar
                        </button>
                      </div>
                    ) : (
                      <div style={styles.displayControls}>
                        <span>{producto.stock}</span>
                        <button onClick={() => handleEditStockClick(producto.id, producto.stock)} style={styles.editButton}>
                          Editar
                        </button>
                      </div>
                    )}
                  </td>
                  <td style={styles.td}>
                    <button
                      onClick={() => handleDeleteProduct(producto.id)}
                      style={styles.deleteButton}
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

      {/* Modal de Confirmación */}
      {showConfirmModal && (
          <div style={styles.modalOverlay}>
              <div style={styles.modalContent}>
                  <p style={styles.modalMessage}>{confirmMessage}</p>
                  <div style={styles.modalActions}>
                      <button onClick={confirmAction} style={styles.modalConfirmButton}>Sí</button>
                      <button onClick={() => setShowConfirmModal(false)} style={styles.modalCancelButton}>No</button>
                  </div>
              </div>
          </div>
      )}

      {/* Cuadro de Mensaje de Alerta */}
      {showAlertMessage && (
          <div style={styles.alertBox}>
              <p>{alertMessage}</p>
          </div>
      )}
    </div>
  );
}

// Estilos CSS para el componente
const styles = {
    container: {
        padding: '20px',
        fontFamily: 'Arial, sans-serif',
        maxWidth: '1200px',
        margin: 'auto',
        backgroundColor: '#fff',
        borderRadius: '8px',
        boxShadow: '0 0 10px rgba(0,0,0,0.1)',
    },
    loadingMessage: {
        padding: '20px',
        textAlign: 'center',
        color: '#555',
    },
    accessDeniedMessage: {
        color: 'red',
        marginBottom: '10px',
        padding: '20px',
        border: '1px solid red',
        textAlign: 'center',
        borderRadius: '5px',
        backgroundColor: '#ffe3e6',
    },
    noStoreSelectedMessage: {
        padding: '50px',
        textAlign: 'center',
        color: '#777',
    },
    errorMessage: {
        color: 'red',
        marginBottom: '10px',
        border: '1px solid red',
        padding: '10px',
        borderRadius: '5px',
        backgroundColor: '#ffe3e6',
    },
    successMessage: {
        color: 'green',
        marginBottom: '10px',
        border: '1px solid green',
        padding: '10px',
        borderRadius: '5px',
        backgroundColor: '#e6ffe6',
    },
    formContainer: {
        marginBottom: '30px',
        border: '1px solid #e0e0e0',
        padding: '20px',
        borderRadius: '8px',
        backgroundColor: '#f9f9f9',
    },
    formGroup: {
        marginBottom: '15px',
    },
    label: {
        display: 'block',
        marginBottom: '5px',
        fontWeight: 'bold',
        color: '#555',
    },
    input: {
        width: '100%',
        padding: '10px',
        border: '1px solid #ccc',
        borderRadius: '4px',
        boxSizing: 'border-box',
    },
    submitButton: {
        padding: '10px 20px',
        backgroundColor: '#007bff',
        color: 'white',
        border: 'none',
        borderRadius: '5px',
        cursor: 'pointer',
        fontSize: '16px',
        transition: 'background-color 0.3s ease',
    },
    submitButtonHover: {
        backgroundColor: '#0056b3',
    },
    noDataMessage: {
        textAlign: 'center',
        marginTop: '20px',
        color: '#777',
        fontStyle: 'italic',
    },
    tableActions: {
        marginBottom: '15px',
        display: 'flex',
        justifyContent: 'flex-start',
    },
    printSelectedButton: {
        padding: '10px 20px',
        backgroundColor: '#007bff',
        color: 'white',
        border: 'none',
        borderRadius: '5px',
        cursor: 'pointer',
        fontSize: '16px',
        transition: 'background-color 0.3s ease',
    },
    printSelectedButtonHover: {
        backgroundColor: '#0056b3',
    },
    table: {
        width: '100%',
        borderCollapse: 'collapse',
        textAlign: 'left',
        border: '1px solid #ddd',
        borderRadius: '8px',
        overflow: 'hidden',
        boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
    },
    tableHeaderRow: {
        backgroundColor: '#f2f2f2',
    },
    th: {
        padding: '12px',
        border: '1px solid #ddd',
        fontWeight: 'bold',
        color: '#333',
    },
    td: {
        padding: '12px',
        border: '1px solid #ddd',
        verticalAlign: 'middle',
    },
    quantityInput: {
        width: '60px',
        padding: '5px',
        border: '1px solid #ccc',
        borderRadius: '3px',
    },
    barcodeContainer: {
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        minWidth: '150px',
    },
    noBarcodeText: {
        color: '#888',
        fontStyle: 'italic',
    },
    editControls: {
        display: 'flex',
        alignItems: 'center',
        gap: '5px',
    },
    editInput: {
        width: '80px',
        padding: '5px',
        border: '1px solid #ccc',
        borderRadius: '3px',
    },
    saveButton: {
        padding: '5px 8px',
        backgroundColor: '#28a745',
        color: 'white',
        border: 'none',
        borderRadius: '3px',
        cursor: 'pointer',
        transition: 'background-color 0.3s ease',
    },
    saveButtonHover: {
        backgroundColor: '#218838',
    },
    cancelButton: {
        padding: '5px 8px',
        backgroundColor: '#6c757d',
        color: 'white',
        border: 'none',
        borderRadius: '3px',
        cursor: 'pointer',
        transition: 'background-color 0.3s ease',
    },
    cancelButtonHover: {
        backgroundColor: '#5a6268',
    },
    displayControls: {
        display: 'flex',
        alignItems: 'center',
        gap: '5px',
    },
    editButton: {
        padding: '5px 8px',
        backgroundColor: '#ffc107',
        color: 'black',
        border: 'none',
        borderRadius: '3px',
        cursor: 'pointer',
        transition: 'background-color 0.3s ease',
    },
    editButtonHover: {
        backgroundColor: '#e0a800',
    },
    deleteButton: {
        padding: '8px 12px',
        backgroundColor: '#dc3545',
        color: 'white',
        border: 'none',
        borderRadius: '5px',
        cursor: 'pointer',
        transition: 'background-color 0.3s ease',
    },
    deleteButtonHover: {
        backgroundColor: '#c82333',
    },
    printPreviewContainer: {
        padding: '20px',
    },
    backButton: {
        marginBottom: '10px',
        padding: '10px 20px',
        backgroundColor: '#dc3545',
        color: 'white',
        border: 'none',
        borderRadius: '5px',
        cursor: 'pointer',
        transition: 'background-color 0.3s ease',
    },
    backButtonHover: {
        backgroundColor: '#c82333',
    },
    printButton: {
        marginLeft: '10px',
        marginBottom: '10px',
        padding: '10px 20px',
        backgroundColor: '#28a745',
        color: 'white',
        border: 'none',
        borderRadius: '5px',
        cursor: 'pointer',
        transition: 'background-color 0.3s ease',
    },
    printButtonHover: {
        backgroundColor: '#218838',
    },
    // Estilos para el modal de confirmación
    modalOverlay: {
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.6)',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 1000,
    },
    modalContent: {
        backgroundColor: '#fff',
        padding: '30px',
        borderRadius: '10px',
        boxShadow: '0 5px 15px rgba(0, 0, 0, 0.3)',
        textAlign: 'center',
        maxWidth: '450px',
        width: '90%',
        animation: 'fadeIn 0.3s ease-out',
    },
    modalMessage: {
        fontSize: '1.1em',
        marginBottom: '25px',
        color: '#333',
    },
    modalActions: {
        display: 'flex',
        justifyContent: 'center',
        gap: '20px',
    },
    modalConfirmButton: {
        backgroundColor: '#dc3545',
        color: 'white',
        padding: '12px 25px',
        border: 'none',
        borderRadius: '6px',
        cursor: 'pointer',
        fontSize: '1em',
        fontWeight: 'bold',
        transition: 'background-color 0.3s ease, transform 0.2s ease',
    },
    modalConfirmButtonHover: {
        backgroundColor: '#c82333',
        transform: 'scale(1.02)',
    },
    modalCancelButton: {
        backgroundColor: '#6c757d',
        color: 'white',
        padding: '12px 25px',
        border: 'none',
        borderRadius: '6px',
        cursor: 'pointer',
        fontSize: '1em',
        fontWeight: 'bold',
        transition: 'background-color 0.3s ease, transform 0.2s ease',
    },
    modalCancelButtonHover: {
        backgroundColor: '#5a6268',
        transform: 'scale(1.02)',
    },
    // Estilos para el cuadro de mensaje de alerta
    alertBox: {
        position: 'fixed',
        top: '20px',
        right: '20px',
        backgroundColor: '#28a745', // Color verde para éxito
        color: 'white',
        padding: '15px 25px',
        borderRadius: '8px',
        boxShadow: '0 2px 10px rgba(0, 0, 0, 0.1)',
        zIndex: 1001,
        opacity: 0, // Inicialmente oculto
        animation: 'fadeInOut 3s forwards',
    },
};

export default Productos;
