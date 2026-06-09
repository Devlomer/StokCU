// StokCU — Order View (Product selection with accordion categories)
import { CATEGORIES } from '../../config.js';
import { orderState, getQty, setQty, getTotals, getSelectedItems, clearAll, saveToHistory } from '../../state.js';
import { toast } from '../toast.js';

let searchQuery = '';

// ── Render the full order view ──
export function renderOrderView() {
  const container = document.getElementById('view-order');
  if (!container) return;

  const { totalItems } = getTotals();

  let html = '';

  // Search bar
  html += `
    <div class="search-container">
      <div class="search-wrapper">
        <span class="search-icon">🔍</span>
        <input type="text" class="search-bar" id="search-input"
               placeholder="Ürün ara..."
               value="${escapeHtml(searchQuery)}"
               oninput="window.app.handleSearch(this.value)">
        <button class="search-clear ${searchQuery ? 'visible' : ''}"
                onclick="window.app.clearSearch()">✕</button>
      </div>
    </div>
  `;

  // Clear all button
  html += `
    <div class="clear-all-container ${totalItems > 0 ? 'visible' : ''}" id="clear-all-bar">
      <button class="btn-clear-all" onclick="window.app.clearAllQty()">
        🗑️ Tümünü Temizle (${totalItems} ürün seçili)
      </button>
    </div>
  `;

  // Categories
  for (const cat of CATEGORIES) {
    const filteredProducts = filterProducts(cat.products);
    if (searchQuery && filteredProducts.length === 0) continue;

    const productsToShow = searchQuery ? filteredProducts : cat.products;
    const selectedCount = productsToShow.filter(p => getQty(p) > 0).length;
    const isCollapsed = !searchQuery && isCategoryCollapsed(cat.id);

    html += `
      <div class="category-section ${isCollapsed ? 'collapsed' : ''}" id="cat-${cat.id}">
        <div class="category-header" onclick="window.app.toggleCategory('${cat.id}')">
          <div class="category-header-left">
            <div class="category-emoji">${cat.emoji}</div>
            <div class="category-info">
              <div class="category-name">${cat.name}</div>
              <div class="category-count">${productsToShow.length} ürün</div>
            </div>
          </div>
          <div class="category-header-right">
            <span class="category-selected-badge ${selectedCount > 0 ? 'visible' : ''}"
                  id="badge-${cat.id}">${selectedCount} seçili</span>
            <span class="category-chevron">▸</span>
          </div>
        </div>
        <div class="category-body">
          ${productsToShow.map(p => renderProductItem(p)).join('')}
        </div>
      </div>
    `;
  }

  container.innerHTML = html;

  // Update FAB
  updateFAB();

  // Focus search if it was focused
  if (searchQuery) {
    const input = document.getElementById('search-input');
    if (input) {
      input.focus();
      input.setSelectionRange(searchQuery.length, searchQuery.length);
    }
  }
}

function renderProductItem(name) {
  const qty = getQty(name);
  const hasQty = qty > 0;
  const productId = nameToId(name);

  return `
    <div class="product-item ${hasQty ? 'has-qty' : ''}" id="product-${productId}">
      <div class="product-name">${escapeHtml(name)}</div>
      <div class="qty-control">
        <button class="qty-btn minus" onclick="window.app.changeQty('${escapeAttr(name)}', -1)" ${!hasQty ? 'style="opacity:.3;pointer-events:none"' : ''}>−</button>
        <span class="qty-value ${hasQty ? 'active' : ''}" id="qty-${productId}">${qty}</span>
        <button class="qty-btn plus" onclick="window.app.changeQty('${escapeAttr(name)}', 1)">+</button>
      </div>
    </div>
  `;
}

// ── Quantity Change (optimized, no full re-render) ──
export function changeQty(name, delta) {
  const oldQty = getQty(name);
  const newQty = Math.max(0, oldQty + delta);
  setQty(name, newQty);

  const productId = nameToId(name);
  const itemEl = document.getElementById('product-' + productId);
  const qtyEl = document.getElementById('qty-' + productId);

  if (qtyEl) {
    qtyEl.textContent = newQty;
    qtyEl.classList.toggle('active', newQty > 0);
    // Pulse animation
    qtyEl.classList.remove('pulse');
    void qtyEl.offsetWidth; // Force reflow
    qtyEl.classList.add('pulse');
  }

  if (itemEl) {
    itemEl.classList.toggle('has-qty', newQty > 0);
    // Update minus button
    const minusBtn = itemEl.querySelector('.qty-btn.minus');
    if (minusBtn) {
      minusBtn.style.opacity = newQty > 0 ? '' : '.3';
      minusBtn.style.pointerEvents = newQty > 0 ? '' : 'none';
    }
  }

  // Update category badge
  updateCategoryBadge(name);

  // Update FAB
  updateFAB();

  // Update clear all bar
  updateClearAllBar();
}

function updateCategoryBadge(productName) {
  for (const cat of CATEGORIES) {
    if (cat.products.includes(productName)) {
      const count = cat.products.filter(p => getQty(p) > 0).length;
      const badge = document.getElementById('badge-' + cat.id);
      if (badge) {
        badge.textContent = count + ' seçili';
        badge.classList.toggle('visible', count > 0);
      }
      break;
    }
  }
}

// ── FAB (Floating Action Bar) ──
function updateFAB() {
  const fab = document.getElementById('fab-container');
  const badge = document.getElementById('fab-badge');
  const { totalItems, totalQty } = getTotals();

  if (fab) {
    fab.classList.toggle('visible', totalItems > 0);
  }
  if (badge) {
    badge.textContent = totalItems + ' kalem · ' + totalQty + ' adet';
  }
}

function updateClearAllBar() {
  const bar = document.getElementById('clear-all-bar');
  const { totalItems } = getTotals();
  if (bar) {
    bar.classList.toggle('visible', totalItems > 0);
    const btn = bar.querySelector('.btn-clear-all');
    if (btn) btn.textContent = '🗑️ Tümünü Temizle (' + totalItems + ' ürün seçili)';
  }
}

// ── Search ──
export function handleSearch(query) {
  searchQuery = query;
  const clearBtn = document.querySelector('.search-clear');
  if (clearBtn) clearBtn.classList.toggle('visible', query.length > 0);
  renderOrderView();
}

export function clearSearch() {
  searchQuery = '';
  renderOrderView();
}

function filterProducts(products) {
  if (!searchQuery) return products;
  const q = normalizeForSearch(searchQuery);
  return products.filter(p => normalizeForSearch(p).includes(q));
}

function normalizeForSearch(str) {
  return str
    .toLowerCase()
    .replace(/ı/g, 'i')
    .replace(/ö/g, 'o')
    .replace(/ü/g, 'u')
    .replace(/ş/g, 's')
    .replace(/ç/g, 'c')
    .replace(/ğ/g, 'g')
    .replace(/İ/g, 'i');
}

// ── Category Toggle ──
const collapsedCategories = new Set();

export function toggleCategory(catId) {
  if (collapsedCategories.has(catId)) {
    collapsedCategories.delete(catId);
  } else {
    collapsedCategories.add(catId);
  }
  const section = document.getElementById('cat-' + catId);
  if (section) {
    section.classList.toggle('collapsed');
  }
}

function isCategoryCollapsed(catId) {
  return collapsedCategories.has(catId);
}

// ── Clear All ──
export function clearAllQty() {
  clearAll();
  renderOrderView();
  toast('Tüm ürünler temizlendi', 'success');
}

// ── Summary Modal: Open ──
export function openSummaryModal() {
  const selected = getSelectedItems();
  if (selected.length === 0) {
    toast('Henüz ürün seçmediniz!', 'error');
    return;
  }

  const { totalItems, totalQty } = getTotals();
  const now = new Date();
  const dateStr = now.toLocaleDateString('tr-TR', { day: '2-digit', month: '2-digit', year: 'numeric' });
  const timeStr = now.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });

  let bodyHtml = '';
  for (const group of selected) {
    bodyHtml += `
      <div class="summary-category">
        <div class="summary-category-title">${group.emoji} ${group.category}</div>
        ${group.items.map(item => `
          <div class="summary-item">
            <span class="summary-item-name">${escapeHtml(item.name)}</span>
            <span class="summary-item-qty">× ${item.qty}</span>
          </div>
        `).join('')}
      </div>
    `;
  }

  bodyHtml += `
    <div class="summary-total">
      <span>Toplam</span>
      <span class="summary-total-highlight">${totalItems} kalem · ${totalQty} adet</span>
    </div>
  `;

  document.getElementById('summary-body').innerHTML = bodyHtml;
  document.getElementById('summary-date').textContent = dateStr + ' — ' + timeStr;
  document.getElementById('summary-modal').classList.add('active');

  // Reset copy button
  const copyBtn = document.getElementById('btn-copy');
  if (copyBtn) {
    copyBtn.innerHTML = '📋 Panoya Kopyala';
    copyBtn.classList.remove('copied');
  }
}

// ── Summary Modal: Close ──
export function closeSummaryModal(event) {
  if (event && event.target !== event.currentTarget) return;
  document.getElementById('summary-modal').classList.remove('active');
}

// ── Copy to Clipboard ──
export function copyOrder() {
  const selected = getSelectedItems();
  if (selected.length === 0) return;

  const { totalItems, totalQty } = getTotals();
  const now = new Date();
  const dateStr = now.toLocaleDateString('tr-TR', { day: '2-digit', month: '2-digit', year: 'numeric' });
  const timeStr = now.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });

  let text = `📦 STOK TALEBİ — ${dateStr} ${timeStr}\n`;

  for (const group of selected) {
    text += `\n${group.emoji} ${group.category}\n`;
    for (const item of group.items) {
      text += `• ${item.name} → ${item.qty}\n`;
    }
  }

  text += `\n━━━━━━━━━━━━━━━\nToplam: ${totalItems} kalem | ${totalQty} adet`;

  navigator.clipboard.writeText(text).then(() => {
    // Save to history
    const allItems = [];
    for (const group of selected) {
      for (const item of group.items) {
        allItems.push({ name: item.name, qty: item.qty, category: group.category, emoji: group.emoji });
      }
    }
    saveToHistory({
      timestamp: Date.now(),
      date: dateStr,
      time: timeStr,
      totalItems,
      totalQty,
      items: allItems
    });

    // UI feedback
    const copyBtn = document.getElementById('btn-copy');
    if (copyBtn) {
      copyBtn.innerHTML = '✅ Kopyalandı!';
      copyBtn.classList.add('copied');
      setTimeout(() => {
        copyBtn.innerHTML = '📋 Panoya Kopyala';
        copyBtn.classList.remove('copied');
      }, 2000);
    }

    toast('📋 Talep kopyalandı — WhatsApp\'a yapıştır!', 'success');
  }).catch(() => {
    toast('Kopyalama başarısız!', 'error');
  });
}

// ── Clear & Close ──
export function clearAndClose() {
  clearAll();
  closeSummaryModal();
  renderOrderView();
  toast('Sipariş temizlendi', 'success');
}

// ── Helpers ──
function nameToId(name) {
  return name.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase();
}

function escapeHtml(str) {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function escapeAttr(str) {
  return str.replace(/'/g, "\\'").replace(/"/g, '\\"');
}
