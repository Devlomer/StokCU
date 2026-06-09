// StokCU — State Management & LocalStorage CRUD
import { STORAGE_KEY, CATEGORIES as staticCategories } from './config.js';
import { fetchProductsFromDb } from './firebase.js';

// Current order quantities: { 'PRODUCT_NAME': qty, ... }
export const orderState = {};

// Dynamically synchronized categories (starts with static config)
export let CATEGORIES = JSON.parse(JSON.stringify(staticCategories));

// Selected block (1-2, 3-4, 5-6, 8-9)
export let activeBlock = localStorage.getItem(STORAGE_KEY + '_block') || '';

export function setActiveBlock(block) {
  activeBlock = block;
  localStorage.setItem(STORAGE_KEY + '_block', block);
}

// Sync categories list with Firebase database
export async function syncCategories() {
  const dbCats = await fetchProductsFromDb();
  if (dbCats && dbCats.length > 0) {
    CATEGORIES = dbCats;
    initOrderState();
    return true;
  }
  return false;
}

// Initialize orderState with all products at 0 (preserves existing quantities)
export function initOrderState() {
  for (const cat of CATEGORIES) {
    for (const p of cat.products) {
      const pName = typeof p === 'string' ? p : p.name;
      if (!(pName in orderState)) {
        orderState[pName] = 0;
      }
    }
  }
}

// Set quantity for a product
export function setQty(productName, qty) {
  orderState[productName] = Math.max(0, qty);
  saveActiveOrderToStorage();
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
      const pName = typeof p === 'string' ? p : p.name;
      const pBoxQty = typeof p === 'string' ? 0 : p.boxQty;
      const qty = orderState[pName] || 0;
      if (qty > 0) {
        items.push({ name: pName, qty, boxQty: pBoxQty });
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
  saveActiveOrderToStorage();
}

// Load quantities from an order (for "repeat" feature)
export function loadOrder(items) {
  clearAll();
  for (const item of items) {
    if (item.name in orderState) {
      orderState[item.name] = item.qty;
    }
  }
  saveActiveOrderToStorage();
}

// ── LocalStorage: Persistence ──

export function saveActiveOrderToStorage() {
  localStorage.setItem(STORAGE_KEY + '_active', JSON.stringify(orderState));
}

export function loadActiveOrderFromStorage() {
  try {
    const data = localStorage.getItem(STORAGE_KEY + '_active');
    if (data) {
      const parsed = JSON.parse(data);
      for (const k in parsed) {
        orderState[k] = parsed[k];
      }
    }
  } catch {
    // Ignore error
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
