// StokCU — Main Entry Point
import { initOrderState } from './state.js';
import { switchView, updateClock } from './ui/navigation.js';
import * as order from './ui/views/order.js';
import * as history from './ui/views/history.js';

function initApp() {
  // Initialize order state (all quantities to 0)
  initOrderState();

  // Render initial view
  switchView('order');
  order.renderOrderView();

  // Clock
  updateClock();
  setInterval(updateClock, 15000);
}

// ── Expose to window.app for onclick handlers ──
window.app = {
  // Navigation
  switchView: (view) => {
    switchView(view);
    if (view === 'order') order.renderOrderView();
    if (view === 'history') history.renderHistoryView();
  },

  // Order view
  changeQty: order.changeQty,
  handleSearch: order.handleSearch,
  clearSearch: order.clearSearch,
  toggleCategory: order.toggleCategory,
  clearAllQty: order.clearAllQty,
  openSummaryModal: order.openSummaryModal,
  closeSummaryModal: order.closeSummaryModal,
  copyOrder: order.copyOrder,
  clearAndClose: order.clearAndClose,

  // History view
  toggleHistoryCard: history.toggleHistoryCard,
  copyHistoryOrder: history.copyHistoryOrder,
  repeatOrder: history.repeatOrder,
  clearOrderHistory: history.clearOrderHistory
};

document.addEventListener('DOMContentLoaded', initApp);
