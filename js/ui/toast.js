// StokCU — Toast Notification System

let toastTimer = null;

export function toast(message, type = '') {
  const el = document.getElementById('toast');
  if (!el) return;

  clearTimeout(toastTimer);
  el.className = 'toast';
  el.textContent = message;

  requestAnimationFrame(() => {
    el.className = 'toast show' + (type ? ' ' + type : '');
    toastTimer = setTimeout(() => {
      el.className = 'toast';
    }, 2200);
  });
}
