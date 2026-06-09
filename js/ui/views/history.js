// StokCU — History View (Past orders from localStorage)
import { getHistory, clearHistory, loadOrder } from '../../state.js';
import { renderOrderView } from './order.js';
import { switchView } from '../navigation.js';
import { toast } from '../toast.js';

export function renderHistoryView() {
  const container = document.getElementById('view-history');
  if (!container) return;

  const history = getHistory();

  let html = `
    <div class="history-hero">
      <h2>📜 Geçmiş Talepler</h2>
      <p>Son ${history.length} talep kayıtlı</p>
    </div>
  `;

  if (history.length === 0) {
    html += `
      <div class="history-empty">
        <div class="history-empty-icon">📦</div>
        <p>Henüz hiç stok talebi oluşturmadınız.<br>İlk talebi sipariş sekmesinden başlatın!</p>
      </div>
    `;
    container.innerHTML = html;
    return;
  }

  for (let i = 0; i < history.length; i++) {
    const order = history[i];
    html += renderHistoryCard(order, i);
  }

  // Clear all history button
  if (history.length > 0) {
    html += `
      <div style="padding: 16px 0;">
        <button class="btn-clear-all" onclick="window.app.clearOrderHistory()" style="border-color: rgba(232,90,79,.2); display: block;">
          🗑️ Tüm Geçmişi Temizle
        </button>
      </div>
    `;
  }

  container.innerHTML = html;
}

function renderHistoryCard(order, index) {
  // Group items by category for detail view
  const grouped = {};
  for (const item of order.items) {
    const key = (item.emoji || '📦') + ' ' + (item.category || 'Diğer');
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(item);
  }

  let detailHtml = '';
  for (const [catTitle, items] of Object.entries(grouped)) {
    detailHtml += `<div class="summary-category">
      <div class="summary-category-title">${escapeHtml(catTitle)}</div>
      ${items.map(item => `
        <div class="summary-item">
          <span class="summary-item-name">${escapeHtml(item.name)}</span>
          <span class="summary-item-qty">× ${item.qty}</span>
        </div>
      `).join('')}
    </div>`;
  }

  return `
    <div class="history-card" id="history-card-${index}">
      <div class="history-card-header" onclick="window.app.toggleHistoryCard(${index})">
        <div>
          <div class="history-card-date">${order.date} — ${order.time}</div>
          <div class="history-card-meta">${order.totalItems} kalem · ${order.totalQty} adet</div>
        </div>
        <span class="history-card-chevron">▸</span>
      </div>
      <div class="history-card-body">
        <div class="history-card-content">
          ${detailHtml}
        </div>
        <div class="history-card-actions">
          <button class="btn-history" onclick="window.app.copyHistoryOrder(${index})">
            📋 Kopyala
          </button>
          <button class="btn-history primary" onclick="window.app.repeatOrder(${index})">
            🔁 Tekrar Yükle
          </button>
        </div>
      </div>
    </div>
  `;
}

// ── Toggle card expand/collapse ──
export function toggleHistoryCard(index) {
  const card = document.getElementById('history-card-' + index);
  if (card) card.classList.toggle('expanded');
}

// ── Copy a past order to clipboard ──
export function copyHistoryOrder(index) {
  const history = getHistory();
  const order = history[index];
  if (!order) return;

  // Group items
  const grouped = {};
  for (const item of order.items) {
    const key = (item.emoji || '📦') + ' ' + (item.category || 'Diğer');
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(item);
  }

  let text = `📦 STOK TALEBİ — ${order.date} ${order.time}\n`;
  for (const [catTitle, items] of Object.entries(grouped)) {
    text += `\n${catTitle}\n`;
    for (const item of items) {
      text += `• ${item.name} → ${item.qty}\n`;
    }
  }
  text += `\n━━━━━━━━━━━━━━━\nToplam: ${order.totalItems} kalem | ${order.totalQty} adet`;

  navigator.clipboard.writeText(text).then(() => {
    toast('📋 Geçmiş talep kopyalandı!', 'success');
  }).catch(() => {
    toast('Kopyalama başarısız!', 'error');
  });
}

// ── Repeat: load past order quantities into order view ──
export function repeatOrder(index) {
  const history = getHistory();
  const order = history[index];
  if (!order) return;

  loadOrder(order.items);
  switchView('order');
  renderOrderView();
  toast('🔁 Talep yüklendi — düzenle veya gönder!', 'success');
}

// ── Clear all history ──
export function clearOrderHistory() {
  if (!confirm('Tüm geçmiş silinecek. Emin misiniz?')) return;
  clearHistory();
  renderHistoryView();
  toast('🗑️ Geçmiş temizlendi', 'success');
}

function escapeHtml(str) {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
