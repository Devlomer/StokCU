// StokCU — Navigation & View Switching

let currentView = 'order';

export function switchView(viewName) {
  currentView = viewName;

  // Hide all views
  document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));

  // Show target view
  const target = document.getElementById('view-' + viewName);
  if (target) target.classList.add('active');

  // Update nav buttons
  document.querySelectorAll('.nav-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.view === viewName);
  });

  // Show/hide FAB only on order view
  const fab = document.getElementById('fab-container');
  if (fab) {
    fab.style.display = viewName === 'order' ? '' : 'none';
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
