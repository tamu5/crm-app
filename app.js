(function () {
  'use strict';

  // --- Storage ---
  const KEYS = { customers: 'crm-customers', deals: 'crm-deals' };

  const load = (key) => JSON.parse(localStorage.getItem(key) || '[]');
  const save = (key, data) => localStorage.setItem(key, JSON.stringify(data));

  let customers = load(KEYS.customers);
  let deals = load(KEYS.deals);

  // --- State ---
  let selectedCustomerId = null;
  let editingCustomerId = null;
  let editingDealId = null;
  let currentView = 'customers';

  // --- Initial data ---
  function seedIfEmpty() {
    if (customers.length > 0) return;
    const now = new Date();
    const ts = (offset) => new Date(now - offset * 60000).toISOString();

    const c1 = { id: 'c_seed1', company: '株式会社アルファテック', name: '佐藤 健一', title: '情報システム部長', email: 'sato@alphatech.example', phone: '03-1111-2222', memo: '', createdAt: ts(30) };
    const c2 = { id: 'c_seed2', company: 'ベータ商事株式会社', name: '鈴木 美咲', title: '購買課長', email: 'suzuki@beta.example', phone: '06-3333-4444', memo: '', createdAt: ts(20) };
    const c3 = { id: 'c_seed3', company: 'ガンマコンサルティング合同会社', name: '田中 洋介', title: '代表社員', email: 'tanaka@gamma.example', phone: '090-5555-6666', memo: '', createdAt: ts(10) };
    customers = [c3, c2, c1];

    deals = [
      { id: 'd_seed1', customerId: 'c_seed1', dealTitle: 'クラウド移行支援サービス提案', amount: 1200000, status: 'proposal', followUpMemo: '', createdAt: ts(25), updatedAt: ts(5) },
      { id: 'd_seed2', customerId: 'c_seed1', dealTitle: '社内DXツール導入相談', amount: null, status: 'lead', followUpMemo: '', createdAt: ts(15), updatedAt: ts(15) },
      { id: 'd_seed3', customerId: 'c_seed2', dealTitle: '在庫管理システム刷新', amount: 3500000, status: 'won', followUpMemo: '', createdAt: ts(18), updatedAt: ts(3) },
      { id: 'd_seed4', customerId: 'c_seed3', dealTitle: '経営コンサルティング契約', amount: 800000, status: 'proposal', followUpMemo: '', createdAt: ts(9), updatedAt: ts(9) },
      { id: 'd_seed5', customerId: 'c_seed3', dealTitle: 'ウェブサイト改善コンサル', amount: 250000, status: 'lead', followUpMemo: '', createdAt: ts(8), updatedAt: ts(8) },
    ];
    save(KEYS.customers, customers);
    save(KEYS.deals, deals);
  }

  // --- Helpers ---
  const $ = (id) => document.getElementById(id);
  const statusLabel = { lead: '見込み', proposal: '提案', won: '成約' };
  const statusBadgeClass = { lead: 'badge-lead', proposal: 'badge-proposal', won: 'badge-won' };
  const statusOrder = ['lead', 'proposal', 'won'];

  function formatAmount(amount) {
    if (amount == null || amount === '') return '—';
    return Number(amount).toLocaleString('ja-JP') + ' 円';
  }

  function getCustomer(id) { return customers.find(c => c.id === id); }
  function getCustomerDeals(customerId) { return deals.filter(d => d.customerId === customerId); }

  // --- View switching ---
  function switchView(viewName) {
    currentView = viewName;
    ['customers', 'pipeline'].forEach(v => {
      const el = document.querySelector(`[data-view="${v}"]`);
      el.classList.toggle('hidden', v !== viewName);
    });
    document.querySelectorAll('.tab-btn').forEach(btn => {
      btn.classList.toggle('active-tab', btn.dataset.target === `view-${viewName}`);
    });
    if (viewName === 'pipeline') renderPipeline();
  }

  // --- Right pane switching ---
  function showPane(pane) {
    ['empty', 'detail', 'customer-form', 'deal-form'].forEach(p => {
      $(`pane-${p}`).classList.toggle('hidden', p !== pane);
    });
  }

  // --- Customer list ---
  function renderCustomerList(filter = '') {
    const q = filter.toLowerCase();
    const filtered = customers.filter(c =>
      c.company.toLowerCase().includes(q) ||
      c.name.toLowerCase().includes(q) ||
      (c.title || '').toLowerCase().includes(q)
    );
    const list = $('customer-list');
    list.innerHTML = filtered.length === 0
      ? '<p class="text-xs text-gray-400 text-center py-6">該当する顧客がいません</p>'
      : filtered.map(c => customerCardHTML(c)).join('');
    list.querySelectorAll('.customer-card').forEach(el => {
      el.addEventListener('click', () => selectCustomer(el.dataset.id));
    });
  }

  function customerCardHTML(c) {
    const selected = c.id === selectedCustomerId ? 'selected' : '';
    const dealCount = getCustomerDeals(c.id).length;
    return `<div class="customer-card ${selected}" data-id="${c.id}">
      <p class="font-semibold text-sm truncate">${esc(c.company)}</p>
      <p class="text-xs text-gray-500 mt-0.5">${esc(c.name)}${c.title ? ' · ' + esc(c.title) : ''}</p>
      ${dealCount > 0 ? `<p class="text-xs text-gray-400 mt-1">${dealCount}件の商談</p>` : ''}
    </div>`;
  }

  // --- Customer detail ---
  function selectCustomer(id) {
    selectedCustomerId = id;
    renderCustomerList($('input-search').value);
    showCustomerDetail(id);
  }

  function showCustomerDetail(id) {
    const c = getCustomer(id);
    if (!c) return;
    $('detail-company').textContent = c.company;
    $('detail-name').textContent = `${c.name}${c.title ? ' · ' + c.title : ''}`;
    renderDetailContacts(c);
    renderDetailMemo(c);
    renderDealList(id);
    showPane('detail');
  }

  function renderDetailContacts(c) {
    const fields = [
      ['メール', c.email, `<a href="mailto:${esc(c.email)}" class="text-blue-600 hover:underline">${esc(c.email)}</a>`],
      ['電話', c.phone, esc(c.phone)],
    ];
    $('detail-contacts').innerHTML = fields.filter(f => f[1]).map(f =>
      `<div><p class="text-xs text-gray-400">${f[0]}</p><p class="mt-0.5">${f[2]}</p></div>`
    ).join('') || '<p class="text-xs text-gray-400 col-span-2">連絡先情報なし</p>';
  }

  function renderDetailMemo(c) {
    const block = $('detail-memo-block');
    if (c.memo) {
      $('detail-memo').textContent = c.memo;
      block.classList.remove('hidden');
    } else {
      block.classList.add('hidden');
    }
  }

  function renderDealList(customerId) {
    const customerDeals = getCustomerDeals(customerId);
    const list = $('deal-list');
    list.innerHTML = customerDeals.length === 0
      ? '<p class="text-xs text-gray-400">商談はありません</p>'
      : customerDeals.map(d => dealRowHTML(d)).join('');
    list.querySelectorAll('.deal-row').forEach(el => {
      el.addEventListener('click', () => openDealForm(el.dataset.id));
    });
  }

  function dealRowHTML(d) {
    return `<div class="deal-row" data-id="${d.id}">
      <span class="badge ${statusBadgeClass[d.status]}">${statusLabel[d.status]}</span>
      <span class="flex-1 text-sm truncate">${esc(d.dealTitle)}</span>
      <span class="text-sm text-gray-400 flex-shrink-0">${formatAmount(d.amount)}</span>
    </div>`;
  }

  // --- Customer form ---
  function openCustomerForm(customerId = null) {
    editingCustomerId = customerId;
    $('customer-form-title').textContent = customerId ? '顧客を編集' : '新規顧客';
    const c = customerId ? getCustomer(customerId) : {};
    $('input-company').value = c.company || '';
    $('input-name').value = c.name || '';
    $('input-title').value = c.title || '';
    $('input-email').value = c.email || '';
    $('input-phone').value = c.phone || '';
    $('input-memo').value = c.memo || '';
    showPane('customer-form');
  }

  function saveCustomer(e) {
    e.preventDefault();
    const now = new Date().toISOString();
    if (editingCustomerId) {
      customers = customers.map(c => c.id !== editingCustomerId ? c : {
        ...c,
        company: $('input-company').value.trim(),
        name: $('input-name').value.trim(),
        title: $('input-title').value.trim(),
        email: $('input-email').value.trim(),
        phone: $('input-phone').value.trim(),
        memo: $('input-memo').value.trim(),
      });
    } else {
      const newC = {
        id: 'c_' + Date.now(),
        company: $('input-company').value.trim(),
        name: $('input-name').value.trim(),
        title: $('input-title').value.trim(),
        email: $('input-email').value.trim(),
        phone: $('input-phone').value.trim(),
        memo: $('input-memo').value.trim(),
        createdAt: now,
      };
      customers = [newC, ...customers];
      selectedCustomerId = newC.id;
    }
    save(KEYS.customers, customers);
    renderCustomerList($('input-search').value);
    showCustomerDetail(editingCustomerId || customers[0].id);
  }

  function deleteCustomer() {
    if (!confirm(`「${getCustomer(selectedCustomerId).company}」を削除しますか？\n紐付く商談もすべて削除されます。`)) return;
    deals = deals.filter(d => d.customerId !== selectedCustomerId);
    customers = customers.filter(c => c.id !== selectedCustomerId);
    save(KEYS.customers, customers);
    save(KEYS.deals, deals);
    selectedCustomerId = null;
    renderCustomerList($('input-search').value);
    showPane('empty');
  }

  // --- Deal form ---
  function openDealForm(dealId = null) {
    editingDealId = dealId;
    $('deal-form-title').textContent = dealId ? '商談を編集' : '商談を追加';
    const d = dealId ? deals.find(x => x.id === dealId) : {};
    $('input-deal-title').value = d.dealTitle || '';
    $('input-deal-amount').value = d.amount != null ? d.amount : '';
    $('input-deal-status').value = d.status || 'lead';
    $('input-deal-memo').value = d.followUpMemo || '';
    $('btn-delete-deal').classList.toggle('hidden', !dealId);
    showPane('deal-form');
  }

  function saveDeal(e) {
    e.preventDefault();
    const now = new Date().toISOString();
    const amountRaw = $('input-deal-amount').value;
    const amount = amountRaw !== '' ? parseInt(amountRaw, 10) : null;
    if (editingDealId) {
      deals = deals.map(d => d.id !== editingDealId ? d : {
        ...d,
        dealTitle: $('input-deal-title').value.trim(),
        amount,
        status: $('input-deal-status').value,
        followUpMemo: $('input-deal-memo').value.trim(),
        updatedAt: now,
      });
    } else {
      deals = [...deals, {
        id: 'd_' + Date.now(),
        customerId: selectedCustomerId,
        dealTitle: $('input-deal-title').value.trim(),
        amount,
        status: $('input-deal-status').value,
        followUpMemo: $('input-deal-memo').value.trim(),
        createdAt: now,
        updatedAt: now,
      }];
    }
    save(KEYS.deals, deals);
    showCustomerDetail(selectedCustomerId);
  }

  function deleteDeal() {
    const d = deals.find(x => x.id === editingDealId);
    if (!confirm(`「${d.dealTitle}」を削除しますか？`)) return;
    deals = deals.filter(x => x.id !== editingDealId);
    save(KEYS.deals, deals);
    showCustomerDetail(selectedCustomerId);
  }

  // --- Pipeline ---
  function renderPipeline() {
    statusOrder.forEach(status => {
      const col = $(`col-${status}`);
      const colDeals = deals.filter(d => d.status === status);
      $(`badge-${status}`).textContent = colDeals.length;
      col.innerHTML = colDeals.length === 0
        ? '<p class="text-xs text-gray-400 text-center py-4">なし</p>'
        : colDeals.map(d => pipelineCardHTML(d, status)).join('');
      col.querySelectorAll('.pipeline-card').forEach(el => {
        el.addEventListener('click', (e) => {
          if (e.target.closest('.move-btn')) return;
          navigateToDeal(el.dataset.id);
        });
      });
      col.querySelectorAll('.move-btn').forEach(btn => {
        btn.addEventListener('click', () => moveDeal(btn.dataset.id, btn.dataset.dir));
      });
    });
  }

  function pipelineCardHTML(d, status) {
    const c = getCustomer(d.customerId);
    const idx = statusOrder.indexOf(status);
    const prevBtn = idx > 0 ? `<button class="move-btn" data-id="${d.id}" data-dir="prev">←</button>` : '';
    const nextBtn = idx < 2 ? `<button class="move-btn" data-id="${d.id}" data-dir="next">→</button>` : '';
    return `<div class="pipeline-card status-${status}" data-id="${d.id}">
      <p class="text-sm font-medium mb-1 truncate">${esc(d.dealTitle)}</p>
      <p class="text-xs text-gray-500 mb-2">${c ? esc(c.company) : '不明'}</p>
      <div class="flex items-center justify-between">
        <span class="text-xs text-gray-400">${formatAmount(d.amount)}</span>
        <div class="flex gap-1">${prevBtn}${nextBtn}</div>
      </div>
    </div>`;
  }

  function moveDeal(dealId, dir) {
    const deal = deals.find(d => d.id === dealId);
    if (!deal) return;
    const idx = statusOrder.indexOf(deal.status);
    const newIdx = dir === 'next' ? idx + 1 : idx - 1;
    if (newIdx < 0 || newIdx >= statusOrder.length) return;
    deals = deals.map(d => d.id !== dealId ? d : { ...d, status: statusOrder[newIdx], updatedAt: new Date().toISOString() });
    save(KEYS.deals, deals);
    renderPipeline();
  }

  function navigateToDeal(dealId) {
    const deal = deals.find(d => d.id === dealId);
    if (!deal) return;
    selectedCustomerId = deal.customerId;
    switchView('customers');
    renderCustomerList($('input-search').value);
    openDealForm(dealId);
  }

  // --- XSS guard ---
  function esc(str) {
    return (str || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  // --- Event bindings ---
  function bindEvents() {
    document.querySelectorAll('.tab-btn').forEach(btn => {
      btn.addEventListener('click', () => switchView(btn.dataset.target.replace('view-', '')));
    });

    $('input-search').addEventListener('input', (e) => renderCustomerList(e.target.value));
    $('btn-new-customer').addEventListener('click', () => { selectedCustomerId = null; openCustomerForm(); });
    $('btn-edit-customer').addEventListener('click', () => openCustomerForm(selectedCustomerId));
    $('btn-delete-customer').addEventListener('click', deleteCustomer);
    $('btn-cancel-customer').addEventListener('click', () => {
      selectedCustomerId ? showCustomerDetail(selectedCustomerId) : showPane('empty');
    });
    $('form-customer').addEventListener('submit', saveCustomer);

    $('btn-add-deal').addEventListener('click', () => openDealForm());
    $('btn-cancel-deal').addEventListener('click', () => showCustomerDetail(selectedCustomerId));
    $('btn-delete-deal').addEventListener('click', deleteDeal);
    $('form-deal').addEventListener('submit', saveDeal);
  }

  // --- Init ---
  function init() {
    seedIfEmpty();
    bindEvents();
    renderCustomerList();
    showPane('empty');
  }

  init();
})();
