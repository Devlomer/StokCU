// StokCU — Main Entry Point
import { 
  initOrderState, 
  loadActiveOrderFromStorage, 
  activeBlock, 
  CATEGORIES, 
  syncCategories 
} from './state.js';
import { 
  switchView, 
  updateClock, 
  openBlockModal, 
  closeBlockModal, 
  selectBlock, 
  updateBlockHeaderBtn 
} from './ui/navigation.js';
import './firebase.js'; // Firebase auto-inits on import (compat SDK pattern)
import * as order from './ui/views/order.js';
import * as history from './ui/views/history.js';
import * as admin from './ui/views/admin.js';

function initApp() {
  // Load local backup DB if present
  try {
    const fallbackData = localStorage.getItem('stokcu_db_fallback');
    if (fallbackData) {
      const parsed = JSON.parse(fallbackData);
      CATEGORIES.length = 0;
      CATEGORIES.push(...parsed);
    }
  } catch {}

  // Initialize and load saved state
  loadActiveOrderFromStorage();
  initOrderState();

  // Render initial view
  switchView('order');
  order.renderOrderView();

  // Clock
  updateClock();
  setInterval(updateClock, 15000);

  // Setup active block header
  updateBlockHeaderBtn();

  // Show block select modal if not selected
  if (!activeBlock) {
    setTimeout(openBlockModal, 600);
  }

  // Sync categories from Firebase Realtime DB
  syncCategories().then((synced) => {
    if (synced) {
      order.renderOrderView();
    }
  });
}

// ── Expose to window.app for onclick and event handlers ──
window.app = {
  // Navigation
  switchView: (view) => {
    switchView(view);
    if (view === 'order') order.renderOrderView();
    if (view === 'history') history.renderHistoryView();
    if (view === 'admin') admin.renderAdminView();
  },

  // Block Modal
  openBlockModal,
  closeBlockModal,
  selectBlock,

  // Order View
  changeQty: order.changeQty,
  handleQtyInputChange: order.setProductQtyDirectly,
  handleSearch: order.handleSearch,
  clearSearch: order.clearSearch,
  toggleCategory: order.toggleCategory,
  clearAllQty: order.clearAllQty,
  openSummaryModal: order.openSummaryModal,
  closeSummaryModal: order.closeSummaryModal,
  submitOrder: order.submitOrder,
  copyOrder: order.copyOrder,
  clearAndClose: order.clearAndClose,

  // History View
  toggleHistoryCard: history.toggleHistoryCard,
  copyHistoryOrder: history.copyHistoryOrder,
  repeatOrder: history.repeatOrder,
  clearOrderHistory: history.clearOrderHistory,

  // Admin View
  adminLogin: admin.adminLogin,
  adminLogout: admin.adminLogout,
  setAdminTab: admin.setAdminTab,
  completeRequest: admin.completeRequest,
  
  // Product Configurations
  updateCategoryMeta: admin.updateCategoryMeta,
  updateProductField: admin.updateProductField,
  sortCategory: admin.sortCategory,
  sortProduct: admin.sortProduct,
  deleteProduct: admin.deleteProduct,
  addProduct: admin.addProduct,
  moveProductToCategory: admin.moveProductToCategory,
  deleteCategory: admin.deleteCategory,
  addCategory: admin.addCategory,
  saveDatabaseChanges: admin.saveDatabaseChanges
};

document.addEventListener('DOMContentLoaded', initApp);
