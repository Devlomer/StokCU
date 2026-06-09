// StokCU — Order View (Product selection with accordion categories)
import { 
  CATEGORIES, 
  activeBlock, 
  getQty, 
  setQty, 
  getTotals, 
  getSelectedItems, 
  clearAll, 
  saveToHistory,
  multiExpandMode,
  setMultiExpandMode
} from '../../state.js';
import { toast } from '../toast.js';
import { escapeHtml, formatOrder, renderSummaryDetailsHtml, showConfirm } from '../../utils.js';
import { sendRequestToDb } from '../../firebase.js';

let searchQuery = '';
const collapsedCategories = new Set();
let collapsedInitialized = false;

function initializeCollapsedSet() {
  if (!collapsedInitialized && CATEGORIES.length > 0) {
    for (const cat of CATEGORIES) {
      collapsedCategories.add(cat.id);
    }
    collapsedInitialized = true;
  }
}

// ── Render the full order view ──
export function renderOrderView() {
  const container = document.getElementById('view-order');
  if (!container) return;

  initializeCollapsedSet();
  const { totalItems } = getTotals();

  let html = '';

  // Search bar & Multi-Expand toggle
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
      <div class="multi-expand-wrapper" style="margin-top: 8px; display: flex; align-items: center; justify-content: flex-end; padding: 0 4px;">
        <label class="multi-expand-label" style="display: flex; align-items: center; gap: 6px; font-size: 11px; color: var(--t3); cursor: pointer; user-select: none;">
          <input type="checkbox" id="multi-expand-toggle" ${multiExpandMode ? 'checked' : ''} onchange="window.app.handleMultiExpandToggle(this.checked)" style="accent-color: var(--lujo-orange); cursor: pointer;">
          <span>Çoklu Kategori Modu</span>
        </label>
      </div>
    </div>
  `;

  // Clear all button (always visible, disabled if totalItems is 0)
  html += `
    <div class="clear-all-container visible" id="clear-all-bar">
      <button class="btn-clear-all" onclick="window.app.clearAllQty()" ${totalItems === 0 ? 'disabled' : ''}>
        🗑️ Tümünü Temizle ${totalItems > 0 ? `(${totalItems} ürün seçili)` : ''}
      </button>
    </div>
  `;

  // Categories
  for (const cat of CATEGORIES) {
    const filteredProducts = filterProducts(cat.products);
    if (searchQuery && filteredProducts.length === 0) continue;

    const productsToShow = searchQuery ? filteredProducts : cat.products;
    const selectedCount = productsToShow.filter(p => getQty(p.name) > 0).length;
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

function renderProductItem(p) {
  const name = typeof p === 'string' ? p : p.name;
  const boxQty = typeof p === 'string' ? 0 : p.boxQty;
  const bQty = boxQty || 1;

  const qty = getQty(name);
  const boxes = Math.floor(qty / bQty);
  const hasQty = qty > 0;
  const productId = nameToId(name);
  const boxText = boxQty > 0 ? `<span class="product-box-qty">(${boxQty}'li Koli)</span>` : '';
  const piecesText = qty > 0 ? `<span class="product-pieces-count">${qty} adet</span>` : '';

  return `
    <div class="product-item ${hasQty ? 'has-qty' : ''}" id="product-${productId}">
      <div class="product-name">
        ${escapeHtml(name)}
        ${boxText}
        <div class="pieces-wrapper" style="margin-top:2px;">${piecesText}</div>
      </div>
      <div class="qty-control">
        <button class="qty-btn minus" onclick="window.app.changeQty('${escapeAttr(name)}', -1)" ${!hasQty ? 'style="opacity:.3;pointer-events:none"' : ''}>−</button>
        <input type="number" class="qty-input ${hasQty ? 'active' : ''}" id="qty-${productId}" 
               value="${boxes}" onfocus="this.select()"
               onchange="window.app.handleQtyInputChange('${escapeAttr(name)}', this.value)" min="0">
        <button class="qty-btn plus" onclick="window.app.changeQty('${escapeAttr(name)}', 1)">+</button>
      </div>
    </div>
  `;
}

// ── Accordion Toggle Mode Handler ──
export function handleMultiExpandToggle(checked) {
  setMultiExpandMode(checked);
  if (!checked) {
    // Collapse all except the first expanded category
    let openedOne = false;
    for (const cat of CATEGORIES) {
      if (!collapsedCategories.has(cat.id)) {
        if (openedOne) {
          collapsedCategories.add(cat.id);
        } else {
          openedOne = true;
        }
      }
    }
  }
  renderOrderView();
}

// ── Quantity Change & Manual Editing ──
function findProductByName(name) {
  for (const cat of CATEGORIES) {
    for (const p of cat.products) {
      if ((typeof p === 'string' ? p : p.name) === name) {
        return p;
      }
    }
  }
  return null;
}

export function changeQty(name, delta) {
  const product = findProductByName(name);
  const boxQty = (product && product.boxQty) || 1;

  const oldQty = getQty(name);
  const newQty = Math.max(0, oldQty + (delta * boxQty));
  updateQtyStateAndUI(name, newQty);

  // Pulse animation on quantity change
  const productId = nameToId(name);
  const qtyEl = document.getElementById('qty-' + productId);
  if (qtyEl) {
    qtyEl.classList.remove('pulse');
    void qtyEl.offsetWidth; // Force reflow
    qtyEl.classList.add('pulse');
  }
}

export function handleQtyInputChange(name, value) {
  const product = findProductByName(name);
  const boxQty = (product && product.boxQty) || 1;
  const boxes = Math.max(0, parseInt(value, 10) || 0);
  const newQty = boxes * boxQty;
  updateQtyStateAndUI(name, newQty);
}

export function updateQtyStateAndUI(name, qty) {
  setQty(name, qty);

  const product = findProductByName(name);
  const boxQty = (product && product.boxQty) || 1;
  const boxes = Math.floor(qty / boxQty);

  const productId = nameToId(name);
  const itemEl = document.getElementById('product-' + productId);
  const qtyEl = document.getElementById('qty-' + productId);

  if (qtyEl) {
    qtyEl.value = boxes;
    qtyEl.classList.toggle('active', qty > 0);
  }

  if (itemEl) {
    itemEl.classList.toggle('has-qty', qty > 0);
    
    // Update pieces count text dynamically
    const pWrapper = itemEl.querySelector('.pieces-wrapper');
    if (pWrapper) {
      pWrapper.innerHTML = qty > 0 ? `<span class="product-pieces-count">${qty} adet</span>` : '';
    }

    // Update minus button
    const minusBtn = itemEl.querySelector('.qty-btn.minus');
    if (minusBtn) {
      minusBtn.style.opacity = qty > 0 ? '' : '.3';
      minusBtn.style.pointerEvents = qty > 0 ? '' : 'none';
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
    const isMatched = cat.products.some(p => (typeof p === 'string' ? p : p.name) === productName);
    if (isMatched) {
      const count = cat.products.filter(p => getQty(typeof p === 'string' ? p : p.name) > 0).length;
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
    bar.classList.toggle('visible', true); // always show clear all bar
    const btn = bar.querySelector('.btn-clear-all');
    if (btn) {
      btn.disabled = totalItems === 0;
      btn.textContent = '🗑️ Tümünü Temizle' + (totalItems > 0 ? ' (' + totalItems + ' ürün seçili)' : '');
    }
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
  return products.filter(p => {
    const name = typeof p === 'string' ? p : p.name;
    return normalizeForSearch(name).includes(q);
  });
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
export function toggleCategory(catId) {
  initializeCollapsedSet();
  const isCurrentlyCollapsed = collapsedCategories.has(catId);

  if (isCurrentlyCollapsed) {
    // Open it
    if (!multiExpandMode) {
      // Collapse everything else
      collapsedCategories.clear();
      for (const cat of CATEGORIES) {
        collapsedCategories.add(cat.id);
      }
    }
    collapsedCategories.delete(catId);
  } else {
    // Collapse it
    collapsedCategories.add(catId);
  }
  
  renderOrderView();
}

function isCategoryCollapsed(catId) {
  return collapsedCategories.has(catId);
}

// ── Clear All ──
export async function clearAllQty() {
  const confirmed = await showConfirm({
    title: '🗑️ Tümünü Temizle',
    message: 'Seçili tüm ürün miktarlarını sıfırlamak istediğinize emin misiniz?'
  });
  if (confirmed) {
    clearAll();
    renderOrderView();
    toast('Tüm ürünler temizlendi', 'success');
  }
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

  const allItems = [];
  for (const group of selected) {
    for (const item of group.items) {
      allItems.push({ name: item.name, qty: item.qty, boxQty: item.boxQty, category: group.category, emoji: group.emoji });
    }
  }

  let bodyHtml = renderSummaryDetailsHtml(allItems);

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

// ── Submit Order to Firebase & Copy to Clipboard ──
export async function submitOrder() {
  if (!activeBlock) {
    toast('Lütfen önce bir blok seçin!', 'error');
    window.app.openBlockModal();
    return;
  }

  const selected = getSelectedItems();
  if (selected.length === 0) return;

  const { totalItems, totalQty } = getTotals();
  const now = new Date();
  const dateStr = now.toLocaleDateString('tr-TR', { day: '2-digit', month: '2-digit', year: 'numeric' });
  const timeStr = now.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });

  const allItems = [];
  for (const group of selected) {
    for (const item of group.items) {
      allItems.push({
        name: item.name,
        qty: item.qty,
        boxQty: item.boxQty,
        category: group.category,
        emoji: group.emoji
      });
    }
  }

  const orderObj = {
    timestamp: Date.now(),
    date: dateStr,
    time: timeStr,
    block: activeBlock,
    totalItems,
    totalQty,
    items: allItems
  };

  try {
    let sentToDb = false;
    try {
      await sendRequestToDb(orderObj);
      sentToDb = true;
    } catch (dbErr) {
      console.warn('Could not upload to Firebase DB:', dbErr);
    }

    // Format and copy to clipboard
    const text = formatOrder(orderObj);
    await navigator.clipboard.writeText(text);

    // Save locally
    saveToHistory(orderObj);

    // Clear and close
    clearAll();
    closeSummaryModal();
    renderOrderView();

    if (sentToDb) {
      toast('🚀 Talep şefe gönderildi ve kopyalandı!', 'success');
    } else {
      toast('📋 İnternet yok/Kurulum eksik. Talep kopyalandı!', 'warning');
    }
  } catch (err) {
    console.error(err);
    toast('Gönderim başarısız!', 'error');
  }
}

// ── Copy to Clipboard ──
export function copyOrder() {
  const selected = getSelectedItems();
  if (selected.length === 0) return;

  const { totalItems, totalQty } = getTotals();
  const now = new Date();
  const dateStr = now.toLocaleDateString('tr-TR', { day: '2-digit', month: '2-digit', year: 'numeric' });
  const timeStr = now.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });

  const allItems = [];
  for (const group of selected) {
    for (const item of group.items) {
      allItems.push({
        name: item.name,
        qty: item.qty,
        boxQty: item.boxQty,
        category: group.category,
        emoji: group.emoji
      });
    }
  }

  const orderObj = {
    timestamp: Date.now(),
    date: dateStr,
    time: timeStr,
    block: activeBlock || 'Seçilmedi',
    totalItems,
    totalQty,
    items: allItems
  };

  const text = formatOrder(orderObj);

  navigator.clipboard.writeText(text).then(() => {
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

    toast('📋 Talep panoya kopyalandı!', 'success');
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

function escapeAttr(str) {
  return str.replace(/'/g, "\\'").replace(/"/g, '\\"');
}
