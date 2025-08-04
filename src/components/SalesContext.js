// Store/frontend/src/components/SalesContext.js
import React, { createContext, useState, useContext, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid'; 

const SalesContext = createContext();

export const useSales = () => {
  const context = useContext(SalesContext);
  if (!context) {
    throw new Error('useSales must be used within a SalesProvider');
  }
  return context;
};

export const SalesProvider = ({ children }) => {
  const [carts, setCarts] = useState([]);
  const [activeCartId, setActiveCartId] = useState(null);

  // Asegura que siempre haya al menos un carrito activo al cargar/inicializar
  useEffect(() => {
    if (carts.length === 0) { // Solo si no hay carritos, crea uno nuevo
      createNewCart('Venta #1');
    } else if (activeCartId === null && carts.length > 0) {
      // Si no hay carrito activo pero sí hay carritos en la lista, selecciona el primero
      setActiveCartId(carts[0].id);
    } else if (activeCartId !== null && !carts.some(cart => cart.id === activeCartId)) {
      // Si el activeCartId apunta a un carrito que ya no existe, selecciona el primero o crea uno
      if (carts.length > 0) {
        setActiveCartId(carts[0].id);
      } else {
        createNewCart('Venta #1');
      }
    }
  }, [carts, activeCartId]); // Dependencias para reaccionar a cambios en carritos o en el ID activo

  const createNewCart = (initialAlias = '') => {
    const newCartId = uuidv4(); 
    const newCart = {
      id: newCartId,
      name: `Venta #${carts.length + 1}`, // Nombre por defecto (ej. "Venta #1", "Venta #2")
      alias: initialAlias, 
      items: [],
      total: 0,
      createdAt: new Date(), 
    };
    setCarts(prevCarts => [...prevCarts, newCart]);
    setActiveCartId(newCartId); 
    return newCartId;
  };

  const selectCart = (id) => {
    if (carts.some(cart => cart.id === id)) {
      setActiveCartId(id);
    } else {
      console.warn("Carrito no encontrado:", id);
    }
  };

  const updateCartAlias = (cartId, newAlias) => {
    setCarts(prevCarts => 
      prevCarts.map(cart => 
        cart.id === cartId ? { ...cart, alias: newAlias } : cart
      )
    );
  };

  const addProductToCart = (productToAdd, quantity = 1) => {
    if (!activeCartId) {
      console.warn("No hay carrito activo. Crea uno primero.");
      return;
    }

    setCarts(prevCarts => prevCarts.map(cart => {
      if (cart.id === activeCartId) {
        const existingItemIndex = cart.items.findIndex(item => item.product.id === productToAdd.id);
        let updatedItems;
        let updatedTotal;

        if (existingItemIndex > -1) {
          updatedItems = cart.items.map((item, index) => 
            index === existingItemIndex 
              ? { ...item, quantity: item.quantity + quantity }
              : item
          );
        } else {
          updatedItems = [...cart.items, { product: productToAdd, quantity: quantity }];
        }
        
        updatedTotal = updatedItems.reduce((sum, item) => sum + (item.product.precio * item.quantity), 0);

        return { ...cart, items: updatedItems, total: updatedTotal };
      }
      return cart;
    }));
  };

  // CAMBIO CLAVE AQUÍ: Aceptar cartId como primer argumento
  const removeProductFromCart = (cartId, productId) => {
    if (!cartId) return; // Asegúrate de que el cartId es válido

    setCarts(prevCarts => prevCarts.map(cart => {
      if (cart.id === cartId) { // Usa cartId para encontrar el carrito correcto
        const updatedItems = cart.items.filter(item => item.product.id !== productId);
        const updatedTotal = updatedItems.reduce((sum, item) => sum + (item.product.precio * item.quantity), 0);
        return { ...cart, items: updatedItems, total: updatedTotal };
      }
      return cart;
    }));
  };

  // CAMBIO CLAVE AQUÍ: Aceptar cartId como primer argumento
  const decrementProductQuantity = (cartId, productId) => {
    if (!cartId) return; // Asegúrate de que el cartId es válido

    setCarts(prevCarts => prevCarts.map(cart => {
      if (cart.id === cartId) { // Usa cartId para encontrar el carrito correcto
        const existingItemIndex = cart.items.findIndex(item => item.product.id === productId);
        if (existingItemIndex === -1) return cart; 

        let updatedItems;
        let updatedTotal;

        if (cart.items[existingItemIndex].quantity > 1) {
          updatedItems = cart.items.map((item, index) => 
            index === existingItemIndex 
              ? { ...item, quantity: item.quantity - 1 }
              : item
          );
        } else {
          // Si la cantidad es 1, quita el producto del carrito
          updatedItems = cart.items.filter(item => item.product.id !== productId);
        }
        
        updatedTotal = updatedItems.reduce((sum, item) => sum + (item.product.precio * item.quantity), 0);

        return { ...cart, items: updatedItems, total: updatedTotal };
      }
      return cart;
    }));
  };

  const deleteCart = (cartIdToDelete) => {
    setCarts(prevCarts => {
      const remainingCarts = prevCarts.filter(cart => cart.id !== cartIdToDelete);
      
      // Si el carrito eliminado era el activo
      if (activeCartId === cartIdToDelete) {
        if (remainingCarts.length > 0) {
          setActiveCartId(remainingCarts[0].id); // Selecciona el primer carrito restante
        } else {
          setActiveCartId(null); 
        }
      }
      return remainingCarts;
    });
  };

  const finalizeCart = async (cartId) => {
    console.log(`Simulando finalización de carrito: ${cartId}`);
    deleteCart(cartId); 
  };

  const activeCart = carts.find(cart => cart.id === activeCartId);

  const value = {
    carts,
    activeCart,
    activeCartId,
    createNewCart,
    selectCart,
    updateCartAlias, 
    addProductToCart,
    removeProductFromCart,
    decrementProductQuantity,
    finalizeCart,
    deleteCart,
  };

  return (
    <SalesContext.Provider value={value}>
      {children}
    </SalesContext.Provider>
  );
};