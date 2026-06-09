// StokCU — Navigation & View Switching
import { activeBlock, setActiveBlock, isAdmin } from '../state.js';

let currentView = 'order';

export function switchView(viewName) {
  currentView = viewName;

  // Hide all views
  document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));

  // Show target view
  const target = document.getElementById('view-' + viewName);
  if (target) target.classList.add('active');

  // Update nav buttons and hide based on admin status
  document.querySelectorAll('.nav-btn').forEach(btn => {
    const view = btn.dataset.view;
    btn.classList.toggle('active', view === viewName);
    if (isAdmin) {
      btn.style.display = view === 'admin' ? '' : 'none';
    } else {
      btn.style.display = '';
    }
  });

  // Show/hide FAB only on order view
  const fab = document.getElementById('fab-container');
  if (fab) {
    fab.style.display = (viewName === 'order' && !isAdmin) ? '' : 'none';
  }
}

export function getCurrentView() {
  return currentView;
}

// Header clock
export function updateClock() {
  const el = document.getElementById('header-clock');
  if (!el) return;
  const now = new Date();
  el.textContent = now.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
}

// ── Block Modal Controls ──

export function openBlockModal() {
  const modal = document.getElementById('block-modal');
  if (modal) modal.classList.add('active');
}

export function closeBlockModal(event) {
  if (event && event.target !== event.currentTarget) return;
  const modal = document.getElementById('block-modal');
  if (modal) modal.classList.remove('active');
}

export function selectBlock(block) {
  setActiveBlock(block);
  updateBlockHeaderBtn();
  closeBlockModal();
  import('./toast.js').then(({ toast }) => {
    toast(`🏢 ${block} Bloğu seçildi.`, 'success');
  });
}

export function updateBlockHeaderBtn() {
  const btn = document.getElementById('header-block-btn');
  if (btn) {
    if (isAdmin) {
      btn.style.display = 'none';
    } else {
      btn.style.display = '';
      btn.textContent = activeBlock ? `Blok: ${activeBlock}` : 'Blok Seç';
      btn.classList.toggle('selected', !!activeBlock);
    }
  }
}
