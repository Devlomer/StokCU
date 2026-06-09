// StokCU — Shared Utility Functions

export function escapeHtml(str) {
  if (typeof str !== 'string') return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function groupItemsByCategory(items) {
  const grouped = {};
  for (const item of items) {
    const key = `${item.emoji || '📦'} ${item.category || 'Diğer'}`;
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(item);
  }
  return grouped;
}

export function getBoxQtyString(qty, boxQty) {
  if (!boxQty || boxQty <= 0) return '';
  const koliler = Math.floor(qty / boxQty);
  const kalan = qty % boxQty;
  if (koliler > 0) {
    if (kalan > 0) {
      return ` (${koliler} Koli + ${kalan} Adet)`;
    } else {
      return ` (${koliler} Koli)`;
    }
  }
  return '';
}

export function formatOrder(order) {
  const grouped = groupItemsByCategory(order.items);
  let text = `📦 STOK TALEBİ — ${order.date} ${order.time}\n`;
  if (order.block) {
    text += `Blok: ${order.block}\n`;
  }
  for (const [catTitle, items] of Object.entries(grouped)) {
    text += `\n${catTitle}\n`;
    for (const item of items) {
      const boxStr = getBoxQtyString(item.qty, item.boxQty);
      text += `• ${item.name} → ${item.qty}${boxStr}\n`;
    }
  }
  text += `\n━━━━━━━━━━━━━━━\nToplam: ${order.totalItems} kalem | ${order.totalQty} adet`;
  return text;
}

export function renderSummaryDetailsHtml(items) {
  const grouped = groupItemsByCategory(items);
  let html = '';
  for (const [catTitle, catItems] of Object.entries(grouped)) {
    html += `
      <div class="summary-category">
        <div class="summary-category-title">${escapeHtml(catTitle)}</div>
        ${catItems.map(item => `
          <div class="summary-item">
            <span class="summary-item-name">${escapeHtml(item.name)}</span>
            <span class="summary-item-qty">× ${item.qty}${getBoxQtyString(item.qty, item.boxQty)}</span>
          </div>
        `).join('')}
      </div>
    `;
  }
  return html;
}

// ── Custom Confirm Modal Wrapper ──
export function showConfirm({ title, message, yesText = 'Evet', noText = 'İptal' }) {
  return new Promise((resolve) => {
    const modal = document.getElementById('confirm-modal');
    const titleEl = document.getElementById('confirm-title');
    const msgEl = document.getElementById('confirm-message');
    const yesBtn = document.getElementById('confirm-yes-btn');
    const noBtn = document.getElementById('confirm-no-btn');

    if (!modal || !titleEl || !msgEl || !yesBtn || !noBtn) {
      resolve(false);
      return;
    }

    titleEl.textContent = title;
    msgEl.textContent = message;
    yesBtn.textContent = yesText;
    noBtn.textContent = noText;

    modal.classList.add('active');

    const handleYes = () => {
      cleanup();
      resolve(true);
    };

    const handleNo = () => {
      cleanup();
      resolve(false);
    };

    const cleanup = () => {
      yesBtn.removeEventListener('click', handleYes);
      noBtn.removeEventListener('click', handleNo);
      modal.classList.remove('active');
    };

    yesBtn.addEventListener('click', handleYes);
    noBtn.addEventListener('click', handleNo);
  });
}
