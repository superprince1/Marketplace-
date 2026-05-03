// src/context/CartContext.js
import React, { createContext, useReducer, useContext, useEffect } from 'react';

const CartContext = createContext();

const getCartItemId = (product, selectedVariations = {}) => {
  const variationKey = Object.keys(selectedVariations)
    .sort()
    .map(key => `${key}:${selectedVariations[key]}`)
    .join('|');
  return variationKey ? `${product._id}_${variationKey}` : product._id;
};

const cartReducer = (state, action) => {
  let newState;
  switch (action.type) {
    case 'LOAD_CART':
      return { ...state, items: action.payload, loading: false };
    case 'ADD_ITEM': {
      const { product, quantity = 1, selectedVariations = {} } = action.payload;
      const itemId = getCartItemId(product, selectedVariations);
      const existingIndex = state.items.findIndex(i => i.cartItemId === itemId);
      
      let finalPrice = product.price;
      if (product.hasVariations && Object.keys(selectedVariations).length) {
        const firstType = Object.keys(selectedVariations)[0];
        const selectedValue = selectedVariations[firstType];
        const variation = product.variations?.find(v => v.type === firstType);
        const option = variation?.options?.find(opt => opt.value === selectedValue);
        if (option?.priceAdjustment) finalPrice = product.price + option.priceAdjustment;
      }

      if (existingIndex !== -1) {
        const newItems = [...state.items];
        newItems[existingIndex].quantity += quantity;
        newState = { ...state, items: newItems };
      } else {
        newState = {
          ...state,
          items: [
            ...state.items,
            {
              ...product,
              quantity,
              selectedVariations,
              cartItemId: itemId,
              priceAtAdd: finalPrice,
            },
          ],
        };
      }
      localStorage.setItem('marketplace_cart', JSON.stringify(newState.items));
      return newState;
    }
    case 'REMOVE_ITEM':
      newState = { ...state, items: state.items.filter(i => i.cartItemId !== action.payload) };
      localStorage.setItem('marketplace_cart', JSON.stringify(newState.items));
      return newState;
    case 'UPDATE_QUANTITY': {
      const { cartItemId, quantity } = action.payload;
      if (quantity < 1) return state;
      const newItems = state.items.map(i =>
        i.cartItemId === cartItemId ? { ...i, quantity } : i
      );
      newState = { ...state, items: newItems };
      localStorage.setItem('marketplace_cart', JSON.stringify(newState.items));
      return newState;
    }
    case 'CLEAR_CART':
      newState = { ...state, items: [] };
      localStorage.setItem('marketplace_cart', JSON.stringify([]));
      return newState;
    default:
      return state;
  }
};

export const CartProvider = ({ children }) => {
  const [state, dispatch] = useReducer(cartReducer, { items: [], loading: true });

  useEffect(() => {
    const savedCart = localStorage.getItem('marketplace_cart');
    if (savedCart) {
      dispatch({ type: 'LOAD_CART', payload: JSON.parse(savedCart) });
    } else {
      dispatch({ type: 'LOAD_CART', payload: [] });
    }
  }, []);

  return (
    <CartContext.Provider value={{ state, dispatch }}>
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
};