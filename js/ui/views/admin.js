// StokCU — Admin Portal View
import { 
  CATEGORIES, 
  initOrderState, 
  syncCategories, 
  isAdmin, 
  setAdminLoggedIn 
} from '../../state.js';
import { toast } from '../toast.js';
import { escapeHtml, getBoxQtyString, showConfirm } from '../../utils.js';
import { 
  verifyAdminPassword, 
  listenToRequests, 
  deleteRequestFromDb, 
  saveProductsToDb 
} from '../../firebase.js';

let activeTab = 'requests'; // 'requests' | 'products'
let rawRequests = [];
let unsubscribeRequests = null;

// Local editable categories clone
let editableCategories = [];

export function renderAdminView() {
  const container = document.getElementById('view-admin');
  if (!container) return;

  if (!isAdmin) {
    container.innerHTML = renderLoginScreen();
    return;
  }

  let html = `
    <div class="admin-header">
      <h2>🔒 Yönetim Paneli</h2>
      <button class="btn-logout" onclick="window.app.adminLogout()">Çıkış Yap</button>
    </div>
    
    <div class="admin-tabs">
      <button class="admin-tab-btn ${activeTab === 'requests' ? 'active' : ''}" 
              onclick="window.app.setAdminTab('requests')">📜 Talepler</button>
      <button class="admin-tab-btn ${activeTab === 'products' ? 'active' : ''}" 
              onclick="window.app.setAdminTab('products')">⚙️ Ürün Ayarları</button>
    </div>
  `;

  if (activeTab === 'requests') {
    html += renderRequestsTab();
  } else {
    html += renderProductsTab();
  }

  container.innerHTML = html;
}

function renderLoginScreen() {
  return `
    <div class="admin-login-card">
      <div class="login-icon">🔒</div>
      <h2>Yönetici Girişi</h2>
      <p>Lütfen devam etmek için admin şifresini girin.</p>
      <div class="login-form">
        <input type="password" id="admin-pass-input" placeholder="Şifre" onkeydown="if(event.key==='Enter') window.app.adminLogin()">
        <button onclick="window.app.adminLogin()">Giriş Yap</button>
      </div>
    </div>
  `;
}

export async function adminLogin() {
  const input = document.getElementById('admin-pass-input');
  if (!input) return;
  const pass = input.value;
  if (!pass) {
    toast('Lütfen şifre girin!', 'error');
    return;
  }

  const success = await verifyAdminPassword(pass);
  if (success) {
    setAdminLoggedIn(true);
    toast('Giriş başarılı!', 'success');
    
    // Deep clone categories for local editing
    editableCategories = JSON.parse(JSON.stringify(CATEGORIES));
    
    // Start listening to Firebase requests
    startRequestsListener();
    renderAdminView();
  } else {
    toast('Hatalı şifre!', 'error');
  }
}

export function adminLogout() {
  setAdminLoggedIn(false);
  if (unsubscribeRequests) {
    unsubscribeRequests();
    unsubscribeRequests = null;
  }
  toast('Çıkış yapıldı', 'success');
  renderAdminView();
}

export function setAdminTab(tab) {
  activeTab = tab;
  if (tab === 'products') {
    // Refresh editable categories clone on tab switch
    editableCategories = JSON.parse(JSON.stringify(CATEGORIES));
  }
  renderAdminView();
}

export function startRequestsListener() {
  if (unsubscribeRequests) unsubscribeRequests();
  unsubscribeRequests = listenToRequests((requests) => {
    rawRequests = requests;
    if (activeTab === 'requests' && isAdmin) {
      renderAdminView();
    }
  });
}

// Helper: Sort items according to active configuration database order
function sortItemsByConfig(items) {
  const orderMap = {};
  let index = 0;
  for (const cat of CATEGORIES) {
    for (const p of cat.products) {
      const name = typeof p === 'string' ? p : p.name;
      orderMap[name] = index++;
    }
  }
  return [...items].sort((a, b) => {
    const indexA = orderMap[a.name] !== undefined ? orderMap[a.name] : 9999;
    const indexB = orderMap[b.name] !== undefined ? orderMap[b.name] : 9999;
    return indexA - indexB;
  });
}

// ── TALEPLER TAB ──

function renderRequestsTab() {
  if (rawRequests.length === 0) {
    return `
      <div class="history-empty">
        <div class="history-empty-icon">📭</div>
        <p>Henüz gelen aktif stok talebi bulunmuyor.</p>
      </div>
    `;
  }

  // Aggregate totals
  const aggregated = {};
  for (const req of rawRequests) {
    for (const item of req.items) {
      if (!aggregated[item.name]) {
        aggregated[item.name] = { 
          qty: 0, 
          boxQty: item.boxQty || 0,
          category: item.category || 'Diğer',
          emoji: item.emoji || '📦'
        };
      }
      aggregated[item.name].qty += item.qty;
    }
  }

  // Group aggregated items by category for rendering, sorted by config
  const groupedAggregated = [];
  for (const cat of CATEGORIES) {
    const items = [];
    for (const p of cat.products) {
      const pName = typeof p === 'string' ? p : p.name;
      const pBoxQty = typeof p === 'string' ? 0 : p.boxQty;
      if (aggregated[pName]) {
        items.push({
          name: pName,
          qty: aggregated[pName].qty,
          boxQty: pBoxQty
        });
      }
    }
    if (items.length > 0) {
      groupedAggregated.push({
        category: cat.name,
        emoji: cat.emoji,
        items
      });
    }
  }

  let html = `
    <!-- Toplam İhtiyaçlar (Preparation Board) -->
    <div class="admin-card-section">
      <h3 class="section-title" style="padding: 12px 12px 0; font-weight:700;">📊 Toplam Hazırlanacak Ürünler</h3>
      <div class="aggregated-box">
  `;

  for (const group of groupedAggregated) {
    html += `
      <div class="agg-category" style="margin-bottom:12px;">
        <div class="agg-cat-title" style="font-size:11px; font-weight:700; color:var(--lujo-orange); margin-bottom:6px;">${group.emoji} ${escapeHtml(group.category)}</div>
        ${group.items.map(item => `
          <div class="agg-item" style="display:flex; justify-content:space-between; padding:4px 0 4px 8px; font-size:12.5px; border-bottom:1px solid rgba(255,255,255,0.02);">
            <span class="agg-item-name" style="color:var(--t2);">${escapeHtml(item.name)}</span>
            <span class="agg-item-qty" style="font-family:var(--font-mono); font-weight:700; color:var(--t1);"><b>${item.qty}</b> adet${getBoxQtyString(item.qty, item.boxQty)}</span>
          </div>
        `).join('')}
      </div>
    `;
  }

  html += `
      </div>
    </div>
    
    <!-- Blok Talepleri Listesi -->
    <h3 class="section-title" style="margin-top:20px; padding:0 8px;">🏢 Blok Talepleri</h3>
  `;

  // Group requests by block
  const requestsByBlock = {};
  for (const req of rawRequests) {
    if (!requestsByBlock[req.block]) {
      requestsByBlock[req.block] = [];
    }
    requestsByBlock[req.block].push(req);
  }

  // Render grouped block requests
  for (const [block, reqs] of Object.entries(requestsByBlock)) {
    // Sort block requests by timestamp asc so oldest is first
    const sortedReqs = [...reqs].sort((a, b) => a.timestamp - b.timestamp);

    let cardBodyHtml = '';
    for (let i = 0; i < sortedReqs.length; i++) {
      const req = sortedReqs[i];
      const sortedItems = sortItemsByConfig(req.items);
      
      const itemsHtml = sortedItems.map(item => `
        <div class="req-detail-item" style="display:flex; justify-content:space-between; padding:4px 0; font-size:12px; color:var(--t2);">
          <span>• ${escapeHtml(item.name)}</span>
          <span><b>${item.qty}</b> adet${getBoxQtyString(item.qty, item.boxQty)}</span>
        </div>
      `).join('');

      const titleLabel = i === 0 ? `Ana Talep (${req.time})` : `Ek Talep (${req.time})`;

      cardBodyHtml += `
        <div class="req-sub-group" style="${i > 0 ? 'margin-top: 12px; padding-top: 12px; border-top: 1px dashed var(--border2);' : ''}">
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom: 6px;">
            <span class="req-sub-title" style="font-size:11px; font-weight:700; color: ${i === 0 ? 'var(--t2)' : 'var(--lujo-orange)'}">${titleLabel}</span>
            <button class="btn-logout" style="padding: 2px 6px; font-size:9px;" onclick="window.app.completeRequest('${req.id}')">Kapat</button>
          </div>
          ${itemsHtml}
        </div>
      `;
    }

    const allIds = reqs.map(r => r.id).join(',');

    html += `
      <div class="admin-req-card">
        <div class="admin-req-card-header">
          <div>
            <div class="admin-req-card-block">${block} Bloğu</div>
            <div class="admin-req-card-meta" style="font-size:10px; color:var(--t3); margin-top:2px;">${reqs.length} talep aktif</div>
          </div>
          <button class="btn-complete-req" onclick="window.app.completeGroupRequest('${allIds}', '${block}')">✓ Tümünü Kapat</button>
        </div>
        <div class="admin-req-card-body" style="padding:10px 14px;">
          ${cardBodyHtml}
        </div>
      </div>
    `;
  }

  return html;
}

export async function completeRequest(requestId) {
  const confirmed = await showConfirm({
    title: '✓ Talebi Kapat',
    message: 'Bu talebi tamamlandı olarak işaretleyip listeden silmek istediğinize emin misiniz?'
  });
  if (confirmed) {
    try {
      await deleteRequestFromDb(requestId);
      toast('Talep tamamlandı olarak işaretlendi.', 'success');
    } catch (err) {
      console.error(err);
      toast('Talep silinemedi, interneti kontrol edin.', 'error');
    }
  }
}

export async function completeGroupRequest(idsString, blockName) {
  const ids = idsString.split(',');
  const confirmed = await showConfirm({
    title: '✓ Grubu Kapat',
    message: `"${blockName}" bloğuna ait tüm talepleri tamamlandı olarak işaretlemek istediğinize emin misiniz?`
  });
  if (confirmed) {
    try {
      for (const id of ids) {
        await deleteRequestFromDb(id);
      }
      toast(`${blockName} bloğunun tüm talepleri kapatıldı.`, 'success');
    } catch (err) {
      console.error(err);
      toast('Bazı talepler silinemedi, interneti kontrol edin.', 'error');
    }
  }
}

// ── ÜRÜN AYARLARI TAB ──

function renderProductsTab() {
  let html = `
    <div class="admin-card-section" style="padding: 12px;">
      <p class="settings-desc">Kategorileri ve ürünleri düzenleyebilirsiniz. İşlemlerinizin geçerli olması için en alttaki <b>Değişiklikleri Kaydet</b> butonuna basmalısınız.</p>
    </div>
  `;

  for (let cIdx = 0; cIdx < editableCategories.length; cIdx++) {
    const cat = editableCategories[cIdx];
    html += `
      <div class="admin-settings-section">
        <div class="settings-cat-header">
          <div style="display:flex; align-items:center; gap:6px; flex:1;">
            <input type="text" class="settings-input cat-emoji" value="${escapeHtml(cat.emoji)}" onchange="window.app.updateCategoryMeta(${cIdx}, 'emoji', this.value)">
            <input type="text" class="settings-input cat-name" value="${escapeHtml(cat.name)}" onchange="window.app.updateCategoryMeta(${cIdx}, 'name', this.value)">
          </div>
          <div class="sort-btns">
            <button onclick="window.app.sortCategory(${cIdx}, -1)" ${cIdx === 0 ? 'disabled' : ''}>▲</button>
            <button onclick="window.app.sortCategory(${cIdx}, 1)" ${cIdx === editableCategories.length - 1 ? 'disabled' : ''}>▼</button>
            <button class="btn-delete-cat" onclick="window.app.deleteCategory(${cIdx})">🗑️</button>
          </div>
        </div>
        
        <div class="settings-cat-body">
          ${cat.products.map((p, pIdx) => `
            <div class="settings-prod-item">
              <div style="display:flex; flex-direction:column; gap:4px; flex:1;">
                <input type="text" class="settings-input prod-name" value="${escapeHtml(p.name)}" onchange="window.app.updateProductField(${cIdx}, ${pIdx}, 'name', this.value)" placeholder="Ürün Adı">
                <div style="display:flex; align-items:center; gap:8px;">
                  <span class="settings-label">Koli Adet:</span>
                  <input type="number" class="settings-input prod-box" value="${p.boxQty || 0}" onchange="window.app.updateProductField(${cIdx}, ${pIdx}, 'boxQty', parseInt(this.value)||0)" min="0" style="width:70px;">
                  <span class="settings-label" style="margin-left:6px;">Grup:</span>
                  <select class="settings-select" onchange="window.app.moveProductToCategory(${cIdx}, ${pIdx}, parseInt(this.value))" style="flex:1;">
                    ${editableCategories.map((c, i) => `<option value="${i}" ${i === cIdx ? 'selected' : ''}>${c.name}</option>`).join('')}
                  </select>
                </div>
              </div>
              <div class="sort-btns" style="flex-direction:row;">
                <button onclick="window.app.sortProduct(${cIdx}, ${pIdx}, -1)" ${pIdx === 0 ? 'disabled' : ''}>▲</button>
                <button onclick="window.app.sortProduct(${cIdx}, ${pIdx}, 1)" ${pIdx === cat.products.length - 1 ? 'disabled' : ''}>▼</button>
                <button class="btn-delete-prod" onclick="window.app.deleteProduct(${cIdx}, ${pIdx})">🗑️</button>
              </div>
            </div>
          `).join('')}
          
          <button class="btn-add-item" onclick="window.app.addProduct(${cIdx})">➕ Ürün Ekle</button>
        </div>
      </div>
    `;
  }

  html += `
    <div style="padding: 16px 0; display:flex; flex-direction:column; gap:10px;">
      <button class="btn-clear-all" onclick="window.app.addCategory()" style="border-color: var(--accent); color: var(--t1); background: var(--input);">
        ➕ Yeni Kategori Ekle
      </button>
      <button class="btn-copy" onclick="window.app.saveDatabaseChanges()" style="box-shadow:none; padding:16px;">
        💾 Değişiklikleri Kaydet
      </button>
    </div>
  `;

  return html;
}

// ── Product Settings Actions ──

export function updateCategoryMeta(catIdx, field, value) {
  if (editableCategories[catIdx]) {
    editableCategories[catIdx][field] = value;
  }
}

export function updateProductField(catIdx, prodIdx, field, value) {
  if (editableCategories[catIdx] && editableCategories[catIdx].products[prodIdx]) {
    editableCategories[catIdx].products[prodIdx][field] = value;
  }
}

export function sortCategory(idx, direction) {
  const targetIdx = idx + direction;
  if (targetIdx < 0 || targetIdx >= editableCategories.length) return;
  const temp = editableCategories[idx];
  editableCategories[idx] = editableCategories[targetIdx];
  editableCategories[targetIdx] = temp;
  renderAdminView();
}

export function sortProduct(catIdx, prodIdx, direction) {
  const cat = editableCategories[catIdx];
  if (!cat) return;
  const targetIdx = prodIdx + direction;
  if (targetIdx < 0 || targetIdx >= cat.products.length) return;
  const temp = cat.products[prodIdx];
  cat.products[prodIdx] = cat.products[targetIdx];
  cat.products[targetIdx] = temp;
  renderAdminView();
}

export function deleteProduct(catIdx, prodIdx) {
  if (editableCategories[catIdx]) {
    editableCategories[catIdx].products.splice(prodIdx, 1);
    renderAdminView();
  }
}

export function addProduct(catIdx) {
  if (editableCategories[catIdx]) {
    editableCategories[catIdx].products.push({
      name: '',
      boxQty: 24
    });
    renderAdminView();
  }
}

export function moveProductToCategory(sourceCatIdx, prodIdx, targetCatIdx) {
  if (sourceCatIdx === targetCatIdx) return;
  const sourceCat = editableCategories[sourceCatIdx];
  const targetCat = editableCategories[targetCatIdx];
  if (sourceCat && targetCat) {
    const [product] = sourceCat.products.splice(prodIdx, 1);
    targetCat.products.push(product);
    renderAdminView();
  }
}

export async function deleteCategory(catIdx) {
  const cat = editableCategories[catIdx];
  if (!cat) return;
  const confirmed = await showConfirm({
    title: '⚠️ Kategoriyi Sil',
    message: `"${cat.name}" kategorisini ve içindeki tüm ürünleri silmek istediğinize emin misiniz?`
  });
  if (confirmed) {
    editableCategories.splice(catIdx, 1);
    renderAdminView();
  }
}

export function addCategory() {
  editableCategories.push({
    id: 'kategori_' + Date.now(),
    name: 'Yeni Kategori',
    emoji: '📦',
    products: []
  });
  renderAdminView();
}

export async function saveDatabaseChanges() {
  // Validate product names are not empty
  for (const cat of editableCategories) {
    if (!cat.name.trim()) {
      toast('Kategori ismi boş bırakılamaz!', 'error');
      return;
    }
    for (const p of cat.products) {
      if (!p.name.trim()) {
        toast('Ürün ismi boş bırakılamaz!', 'error');
        return;
      }
    }
  }

  const confirmed = await showConfirm({
    title: '💾 Veritabanını Kaydet',
    message: 'Tüm kategori ve ürün düzenlemelerini Firebase veritabanına kaydetmek istediğinize emin misiniz?'
  });

  if (confirmed) {
    try {
      await saveProductsToDb(editableCategories);
      // Sync local state categories
      await syncCategories();
      initOrderState();
      
      toast('💾 Değişiklikler Firebase veritabanına kaydedildi!', 'success');
      
      // Clone again for fresh editing
      editableCategories = JSON.parse(JSON.stringify(CATEGORIES));
      renderAdminView();
    } catch (err) {
      console.warn('Firebase sync failed, writing to fallback local storage:', err);
      // Local fallback sync
      localStorage.setItem('stokcu_db_fallback', JSON.stringify(editableCategories));
      CATEGORIES.length = 0;
      CATEGORIES.push(...editableCategories);
      initOrderState();
      toast('⚠️ Firebase bağlantısı yok. Yerel hafızaya kaydedildi!', 'warning');
    }
  }
}
