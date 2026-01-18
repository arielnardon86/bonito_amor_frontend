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

  // Ensures there is always at least one active cart on load/initialization
  useEffect(() => {
    if (carts.length === 0) { // Only if there are no carts, create a new one
      createNewCart('Venta #1');
    } else if (activeCartId === null && carts.length > 0) {
      // If there is no active cart but there are carts in the list, select the first one
      setActiveCartId(carts[0].id);
    } else if (activeCartId !== null && !carts.some(cart => cart.id === activeCartId)) {
      // If the activeCartId points to a cart that no longer exists, select the first one or create one
      if (carts.length > 0) {
        setActiveCartId(carts[0].id);
      } else {
        createNewCart('Venta #1');
      }
    }
  }, [carts, activeCartId]); // Dependencies to react to changes in carts or active ID

  const createNewCart = (initialAlias = '') => {
    const newCartId = uuidv4(); 
    const newCart = {
      id: newCartId,
      name: `Venta #${carts.length + 1}`, // Default name (e.g., "Sale #1", "Sale #2")
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
      console.warn("Cart not found:", id);
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
      console.warn("No active cart. Create one first.");
      return;
    }

    setCarts(prevCarts => prevCarts.map(cart => {
      if (cart.id === activeCartId) {
        const existingItemIndex = cart.items.findIndex(item => item.product.id === productToAdd.id);
        let updatedItems;
        let updatedTotal;

        // Ensure productToAdd.precio is a number before using it in calculations
        const productPrice = parseFloat(productToAdd.precio);
        if (isNaN(productPrice)) {
            console.error("Error: Product price is not a valid number:", productToAdd.precio);
            return cart; // Return current cart if price is invalid
        }

        if (existingItemIndex > -1) {
          updatedItems = cart.items.map((item, index) => 
            index === existingItemIndex 
              ? { ...item, quantity: item.quantity + quantity }
              : item
          );
        } else {
          // Store the product with its price ensured as a number
          updatedItems = [...cart.items, { product: { ...productToAdd, precio: productPrice }, quantity: quantity }];
        }
        
        // Recalculate total based on the numerical price
        updatedTotal = updatedItems.reduce((sum, item) => sum + (parseFloat(item.product.precio) * item.quantity), 0);

        return { ...cart, items: updatedItems, total: updatedTotal };
      }
      return cart;
    }));
  };

  // KEY CHANGE HERE: Accept cartId as the first argument
  const removeProductFromCart = (cartId, productId) => {
    if (!cartId) return; // Ensure cartId is valid

    setCarts(prevCarts => prevCarts.map(cart => {
      if (cart.id === cartId) { // Use cartId to find the correct cart
        const updatedItems = cart.items.filter(item => item.product.id !== productId);
        const updatedTotal = updatedItems.reduce((sum, item) => sum + (parseFloat(item.product.precio) * item.quantity), 0);
        return { ...cart, items: updatedItems, total: updatedTotal };
      }
      return cart;
    }));
  };

  // KEY CHANGE HERE: Accept cartId as the first argument
  const decrementProductQuantity = (cartId, productId) => {
    if (!cartId) return; // Ensure cartId is valid

    setCarts(prevCarts => prevCarts.map(cart => {
      if (cart.id === cartId) { // Use cartId to find the correct cart
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
          // If quantity is 1, remove the product from the cart
          updatedItems = cart.items.filter(item => item.product.id !== productId);
        }
        
        updatedTotal = updatedItems.reduce((sum, item) => sum + (parseFloat(item.product.precio) * item.quantity), 0);

        return { ...cart, items: updatedItems, total: updatedTotal };
      }
      return cart;
    }));
  };

  const deleteCart = (cartIdToDelete) => {
    setCarts(prevCarts => {
      const remainingCarts = prevCarts.filter(cart => cart.id !== cartIdToDelete);
      
      // If the deleted cart was the active one
      if (activeCartId === cartIdToDelete) {
        if (remainingCarts.length > 0) {
          setActiveCartId(remainingCarts[0].id); // Select the first remaining cart
        } else {
          setActiveCartId(null); 
        }
      }
      return remainingCarts;
    });
  };

  const finalizeCart = async (cartId) => {
    console.log(`Simulating cart finalization: ${cartId}`);
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
