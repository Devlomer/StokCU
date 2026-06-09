// StokCU — State Management & LocalStorage CRUD
import { STORAGE_KEY, CATEGORIES } from './config.js';

// Current order quantities: { 'PRODUCT_NAME': qty, ... }
export const orderState = {};

// Initialize orderState with all products at 0
export function initOrderState() {
  for (const cat of CATEGORIES) {
    for (const p of cat.products) {
      if (!(p in orderState)) {
        orderState[p] = 0;
      }
    }
  }
}

// Set quantity for a product
export function setQty(productName, qty) {
  orderState[productName] = Math.max(0, qty);
}

// Get quantity for a product
export function getQty(productName) {
  return orderState[productName] || 0;
}

// Get all selected items (qty > 0) grouped by category
export function getSelectedItems() {
  const result = [];
  for (const cat of CATEGORIES) {
    const items = [];
    for (const p of cat.products) {
      if (orderState[p] > 0) {
        items.push({ name: p, qty: orderState[p] });
      }
    }
    if (items.length > 0) {
      result.push({ category: cat.name, emoji: cat.emoji, items });
    }
  }
  return result;
}

// Get total selected product count (unique items) and total quantity
export function getTotals() {
  let totalItems = 0;
  let totalQty = 0;
  for (const key in orderState) {
    if (orderState[key] > 0) {
      totalItems++;
      totalQty += orderState[key];
    }
  }
  return { totalItems, totalQty };
}

// Clear all quantities
export function clearAll() {
  for (const key in orderState) {
    orderState[key] = 0;
  }
}

// Load quantities from an order (for "repeat" feature)
export function loadOrder(items) {
  clearAll();
  for (const item of items) {
    if (item.name in orderState) {
      orderState[item.name] = item.qty;
    }
  }
}

// ── LocalStorage: Order History ──

export function getHistory() {
  try {
    const data = localStorage.getItem(STORAGE_KEY + '_history');
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

export function saveToHistory(order) {
  const history = getHistory();
  history.unshift(order);
  // Keep last 30 orders
  if (history.length > 30) history.length = 30;
  localStorage.setItem(STORAGE_KEY + '_history', JSON.stringify(history));
}

export function clearHistory() {
  localStorage.removeItem(STORAGE_KEY + '_history');
}
