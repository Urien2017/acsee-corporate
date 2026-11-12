(function () {
  'use strict';

  const STORAGE_KEY = 'acsee-corporate-demo-v1';
  const clone = (value) => JSON.parse(JSON.stringify(value));
  const money = (value) => `${new Intl.NumberFormat('fr-FR').format(Math.round(value || 0))} FCFA`;
  const shortMoney = (value) => {
    const amount = Math.round(value || 0);
    if (amount >= 1000000) return `${(amount / 1000000).toFixed(1).replace('.', ',')} M`;
    if (amount >= 1000) return `${Math.round(amount / 1000)} k`;
    return `${amount}`;
  };
  const escapeHtml = (value) => String(value ?? '').replace(/[&<>'"]/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#039;', '"': '&quot;' }[character]));
  const getProduct = (id) => state.products.find((product) => product.id === id);
  const getClient = (id) => state.clients.find((client) => client.id === id);
  const todayKey = () => new Date().toISOString().slice(0, 10);
  const orderDate = (date) => new Intl.DateTimeFormat('fr-FR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }).format(new Date(date));
  const dateLabel = () => new Intl.DateTimeFormat('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' }).format(new Date()).replace(/^./, (letter) => letter.toUpperCase());

  let state = loadState();
  let currentView = 'store-view';
  let activeCategory = 'Tous';
  let deliveryOrderId = null;
  let salesChart = null;
  let deferredInstallPrompt = null;

  function loadState() {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        return { ...clone(window.ACSEE_SEED_DATA), ...parsed, products: parsed.products || clone(window.ACSEE_SEED_DATA.products), clients: parsed.clients || clone(window.ACSEE_SEED_DATA.clients), orders: parsed.orders || [], notifications: parsed.notifications || [], salesHistory: parsed.salesHistory || clone(window.ACSEE_SEED_DATA.salesHistory), cart: parsed.cart || [] };
      }
    } catch (error) {
      console.warn('Impossible de charger les données locales.', error);
    }
    return clone(window.ACSEE_SEED_DATA);
  }

  function persist() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    renderAll();
    window.dispatchEvent(new CustomEvent('acsee:state-updated'));
  }

  function showToast(title, message, tone = 'success') {
    const container = document.getElementById('toastContainer');
    const icon = tone === 'warning' ? 'bi-exclamation-triangle' : tone === 'info' ? 'bi-info-circle' : 'bi-check-circle';
    const toast = document.createElement('div');
    toast.className = 'toast align-items-center border-0 shadow-sm';
    toast.setAttribute('role', 'alert');
    toast.innerHTML = `<div class="d-flex"><div class="toast-body"><div class="fw-bold"><i class="bi ${icon} me-2 text-${tone === 'warning' ? 'warning' : tone === 'info' ? 'primary' : 'success'}"></i>${escapeHtml(title)}</div><div class="small text-muted mt-1">${escapeHtml(message)}</div></div><button type="button" class="btn-close me-2 m-auto" data-bs-dismiss="toast" aria-label="Fermer"></button></div>`;
    container.appendChild(toast);
    const instance = new bootstrap.Toast(toast, { delay: 4500 });
    toast.addEventListener('hidden.bs.toast', () => toast.remove());
    instance.show();
  }

  function addNotification(type, title, message) {
    state.notifications.unshift({ id: `n-${Date.now()}`, type, title, message, createdAt: new Date().toISOString(), unread: true });
    state.notifications = state.notifications.slice(0, 20);
  }

  function setView(viewId) {
    currentView = viewId;
    document.querySelectorAll('.app-view').forEach((view) => view.classList.toggle('active-view', view.id === viewId));
    document.querySelectorAll('[data-view-target]').forEach((button) => button.classList.toggle('active', button.dataset.viewTarget === viewId));
    const nav = document.getElementById('mainNav');
    if (nav.classList.contains('show') && window.bootstrap) bootstrap.Collapse.getOrCreateInstance(nav).hide();
    if (viewId === 'cockpit-view') window.setTimeout(renderChart, 50);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function renderFilters() {
    const categories = ['Tous', ...new Set(state.products.map((product) => product.category))];
    document.getElementById('categoryFilters').innerHTML = categories.map((category) => `<button class="btn ${activeCategory === category ? 'active' : ''}" data-category="${escapeHtml(category)}" role="tab" aria-selected="${activeCategory === category}">${escapeHtml(category)}</button>`).join('');
  }

  function stockBadge(stock) {
    if (stock < 10) return '<span class="stock-badge critical"><i class="bi bi-exclamation-circle"></i> Stock critique</span>';
    if (stock <= 15) return '<span class="stock-badge warning"><i class="bi bi-dash-circle"></i> Stock surveillé</span>';
    return '<span class="stock-badge available"><i class="bi bi-check-circle"></i> En stock</span>';
  }

  function renderProducts() {
    const query = document.getElementById('productSearch').value.trim().toLowerCase();
    const filtered = state.products.filter((product) => {
      const matchesCategory = activeCategory === 'Tous' || product.category === activeCategory;
      const matchesSearch = !query || `${product.name} ${product.category} ${product.description}`.toLowerCase().includes(query);
      return matchesCategory && matchesSearch;
    });
    const grid = document.getElementById('productGrid');
    grid.innerHTML = filtered.length ? filtered.map((product) => `<div class="col-12 col-sm-6 col-xl-3"><article class="card product-card h-100"><div class="card-body d-flex flex-column"><div class="product-visual tone-${product.tone} mb-3"><i class="bi ${product.icon}"></i></div><div class="d-flex justify-content-between align-items-start gap-2 mb-2"><span class="product-category">${escapeHtml(product.category)}</span>${stockBadge(product.stock)}</div><h3 class="product-name mb-1">${escapeHtml(product.name)}</h3><p class="product-description mb-3">${escapeHtml(product.description)}</p><div class="price-box mt-auto"><div class="unit-price">Prix indicatif unité · ${money(product.unitPrice)}</div><div class="d-flex justify-content-between align-items-end gap-2 mt-1"><div><div class="carton-price">${money(product.cartonPrice)}</div><div class="unit-price">Carton de ${product.unitsPerCarton}</div></div><button class="btn btn-primary btn-sm" data-add-product="${product.id}" ${product.stock < 1 ? 'disabled' : ''}><i class="bi bi-plus-lg me-1"></i>Ajouter</button></div></div></div></article></div>`).join('') : '<div class="col-12"><div class="empty-cart py-5"><i class="bi bi-search"></i><p class="mb-0">Aucun produit ne correspond à votre recherche.</p></div></div>';
    const totalStock = state.products.reduce((sum, product) => sum + product.stock, 0);
    document.getElementById('heroStockValue').textContent = totalStock;
    const capacity = 180;
    const percent = Math.min(100, Math.round((totalStock / capacity) * 100));
    document.getElementById('heroStockProgress').style.width = `${percent}%`;
    document.getElementById('heroStockPercent').textContent = `${percent}%`;
  }

  function renderCart() {
    const count = state.cart.reduce((sum, item) => sum + item.quantity, 0);
    document.querySelectorAll('.cart-count').forEach((element) => { element.textContent = count; });
    const container = document.getElementById('cartItems');
    const total = state.cart.reduce((sum, item) => { const product = getProduct(item.productId); return sum + (product ? product.cartonPrice * item.quantity : 0); }, 0);
    document.getElementById('cartTotal').textContent = money(total);
    document.getElementById('placeOrderBtn').disabled = !state.cart.length;
    document.getElementById('cartClient').innerHTML = state.clients.map((client) => `<option value="${client.id}">${escapeHtml(client.name)} · ${escapeHtml(client.city)}</option>`).join('');
    if (!state.cart.length) {
      container.innerHTML = '<div class="empty-cart"><div><i class="bi bi-bag"></i><h3 class="h6 text-dark">Votre panier est vide</h3><p class="small mb-0">Ajoutez des cartons depuis la boutique.</p></div></div>';
      return;
    }
    container.innerHTML = state.cart.map((item) => { const product = getProduct(item.productId); if (!product) return ''; return `<div class="cart-item"><div class="cart-item-visual tone-${product.tone}"><i class="bi ${product.icon}"></i></div><div><div class="cart-item-name">${escapeHtml(product.shortName)}</div><div class="cart-item-price">${money(product.cartonPrice)} · carton</div><div class="quantity-control"><button data-cart-action="decrease" data-product-id="${product.id}" aria-label="Retirer un carton"><i class="bi bi-dash"></i></button><span>${item.quantity}</span><button data-cart-action="increase" data-product-id="${product.id}" aria-label="Ajouter un carton"><i class="bi bi-plus"></i></button></div></div><div class="text-end"><div class="cart-line-total">${money(product.cartonPrice * item.quantity)}</div><button class="btn btn-link btn-sm text-muted p-0 mt-2" data-cart-action="remove" data-product-id="${product.id}">Supprimer</button></div></div>`; }).join('');
  }

  function renderWarehouse() {
    const critical = state.products.filter((product) => product.stock < 10).length;
    const totalStock = state.products.reduce((sum, product) => sum + product.stock, 0);
    const stockValue = state.products.reduce((sum, product) => sum + product.stock * product.cartonPrice, 0);
    const pending = state.orders.filter((order) => order.status !== 'validated').length;
    document.getElementById('warehouseSummary').innerHTML = [{ icon: 'bi-box-seam', label: 'Cartons en stock', value: totalStock, caption: 'unités disponibles', tone: 'stock' }, { icon: 'bi-cash-stack', label: 'Valeur immobilisée', value: shortMoney(stockValue), caption: 'FCFA · au prix carton', tone: 'cash' }, { icon: 'bi-exclamation-triangle', label: 'Alertes stock', value: critical, caption: critical === 1 ? 'référence à traiter' : 'références à traiter', tone: 'alert' }].map((item) => `<div class="col-md-4"><div class="kpi-card ${item.tone}"><div class="d-flex justify-content-between align-items-start"><div><div class="kpi-label">${item.label}</div><div class="kpi-value mt-2">${item.value}</div><div class="kpi-trend mt-1 text-muted">${item.caption}</div></div><span class="kpi-icon"><i class="bi ${item.icon}"></i></span></div></div></div>`).join('');
    document.getElementById('stockAlertCount').textContent = `${critical} alerte${critical > 1 ? 's' : ''}`;
    document.getElementById('pendingOrderCount').textContent = `${pending} en attente`;
    document.getElementById('stockTableBody').innerHTML = state.products.map((product) => `<tr><td><div class="item-title">${escapeHtml(product.shortName)}</div><div class="item-subtitle">${escapeHtml(product.name)}</div></td><td><span class="item-subtitle">${escapeHtml(product.category)}</span></td><td><span class="stock-number ${product.stock < 10 ? 'critical' : ''}">${product.stock}</span> <span class="item-subtitle">cartons</span><div>${stockBadge(product.stock)}</div></td><td><span class="item-title">${money(product.stock * product.cartonPrice)}</span></td><td class="text-end"><button class="btn btn-outline-primary btn-sm" data-restock-product="${product.id}"><i class="bi bi-plus-lg me-1"></i>+10</button></td></tr>`).join('');
    document.getElementById('ordersList').innerHTML = state.orders.length ? state.orders.map((order) => `<div class="order-item"><div class="d-flex justify-content-between gap-2"><div><div class="order-id">${escapeHtml(order.id)} · ${orderDate(order.createdAt)}</div><div class="order-client mt-1">${escapeHtml(order.clientName)}</div><div class="order-meta mt-1">${order.lines.reduce((sum, line) => sum + line.quantity, 0)} cartons · ${escapeHtml(order.paymentMethod)}</div></div><div class="text-end"><div class="order-total">${money(order.total)}</div><span class="badge ${order.status === 'validated' ? 'badge-emerald' : order.status === 'ready' ? 'badge-soft' : 'stock-badge critical'} mt-2">${order.status === 'validated' ? 'Sortie validée' : order.status === 'ready' ? 'Prête' : 'À préparer'}</span></div></div><div class="order-actions d-flex justify-content-end gap-2 mt-3"><button class="btn btn-outline-primary btn-sm" data-delivery-order="${order.id}"><i class="bi bi-file-earmark-text me-1"></i>Générer BL</button>${order.status !== 'validated' ? `<button class="btn btn-emerald btn-sm" data-validate-order="${order.id}"><i class="bi bi-check2 me-1"></i>Valider sortie</button>` : '<span class="small text-success align-self-center"><i class="bi bi-check-circle me-1"></i>Encaissée</span>'}</div></div>`).join('') : '<div class="empty-cart py-5"><div><i class="bi bi-inbox"></i><p class="small mb-0">Aucune commande pour le moment.</p></div></div>';
  }

  function renderCockpit() {
    const todayOrders = state.orders.filter((order) => order.paymentStatus === 'paid' && order.createdAt.slice(0, 10) === todayKey());
    const revenueToday = todayOrders.reduce((sum, order) => sum + order.total, 0);
    const stockValue = state.products.reduce((sum, product) => sum + product.stock * product.cartonPrice, 0);
    const pending = state.orders.filter((order) => order.status !== 'validated').length;
    const kpis = [{ icon: 'bi-graph-up-arrow', label: "Chiffre d'affaires du jour", value: money(revenueToday), trend: '+12,4%', tone: 'revenue' }, { icon: 'bi-wallet2', label: 'Encaissements validés', value: todayOrders.length, trend: 'Aujourd’hui', tone: 'cash' }, { icon: 'bi-box-seam', label: 'Valeur du stock entrepôt', value: shortMoney(stockValue), trend: 'FCFA · prix carton', tone: 'stock' }, { icon: 'bi-clock-history', label: 'Commandes en attente', value: pending, trend: pending ? 'À traiter maintenant' : 'Flux à jour', tone: 'orders' }];
    document.getElementById('kpiGrid').innerHTML = kpis.map((kpi) => `<div class="col-6 col-xl-3"><div class="kpi-card ${kpi.tone}"><div class="d-flex justify-content-between align-items-start"><div><div class="kpi-label">${kpi.label}</div><div class="kpi-value mt-2">${kpi.value}</div><div class="kpi-trend mt-2"><i class="bi bi-arrow-up-right me-1"></i>${kpi.trend}</div></div><span class="kpi-icon"><i class="bi ${kpi.icon}"></i></span></div></div></div>`).join('');
    document.getElementById('currentDateLabel').textContent = dateLabel();
    const history = state.salesHistory || [];
    const first = history[0]?.amount || 0;
    const last = history[history.length - 1]?.amount || 0;
    document.getElementById('weeklyTrend').textContent = `+${first ? Math.round(((last - first) / first) * 100) : 0}%`;
    const feed = state.notifications.slice().sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).slice(0, 7);
    document.getElementById('notificationFeed').innerHTML = feed.length ? feed.map((notification) => { const icon = notification.type === 'payment' ? 'bi-wallet2' : notification.type === 'warehouse' ? 'bi-box-seam' : 'bi-bag-check'; return `<div class="notification-item ${notification.type}"><div class="notification-dot"><i class="bi ${icon}"></i></div><div class="flex-grow-1"><div class="d-flex justify-content-between gap-2"><div class="notification-title">${escapeHtml(notification.title)}</div>${notification.unread ? '<span class="unread-indicator"></span>' : ''}</div><div class="notification-message mt-1">${escapeHtml(notification.message)}</div><div class="notification-time mt-1">${formatRelativeTime(notification.createdAt)}</div></div></div>`; }).join('') : '<div class="empty-cart py-5"><div><i class="bi bi-bell-slash"></i><p class="small mb-0">Aucune notification.</p></div></div>';
    if (currentView === 'cockpit-view') renderChart();
  }

  function formatRelativeTime(date) {
    const minutes = Math.max(0, Math.floor((Date.now() - new Date(date).getTime()) / 60000));
    if (minutes < 1) return 'À l’instant';
    if (minutes < 60) return `Il y a ${minutes} min`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `Il y a ${hours} h`;
    return `Il y a ${Math.floor(hours / 24)} j`;
  }

  function renderChart() {
    const canvas = document.getElementById('salesChart');
    if (!canvas || !window.Chart) return;
    const context = canvas.getContext('2d');
    const gradient = context.createLinearGradient(0, 0, 0, 300);
    gradient.addColorStop(0, 'rgba(16,185,129,.25)');
    gradient.addColorStop(1, 'rgba(16,185,129,0)');
    const data = state.salesHistory || [];
    if (salesChart) salesChart.destroy();
    salesChart = new Chart(context, { type: 'line', data: { labels: data.map((item) => item.label), datasets: [{ data: data.map((item) => item.amount), borderColor: '#10b981', backgroundColor: gradient, fill: true, tension: .4, pointBackgroundColor: '#fff', pointBorderColor: '#10b981', pointBorderWidth: 2, pointRadius: 4, pointHoverRadius: 6 }] }, options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false }, tooltip: { displayColors: false, callbacks: { label: (context) => ` ${money(context.parsed.y)}` } } }, scales: { x: { grid: { display: false }, ticks: { color: '#8795a2', font: { size: 11, weight: '600' } } }, y: { beginAtZero: true, border: { display: false }, grid: { color: '#edf1f4' }, ticks: { color: '#a0abb4', font: { size: 10 }, callback: (value) => shortMoney(value) } } } } });
  }

  function renderDeliveryNote(order) {
    const client = getClient(order.clientId);
    const rows = order.lines.map((line) => { const product = getProduct(line.productId); return `<tr><td>${escapeHtml(product?.name || 'Produit')}</td><td>${line.quantity}</td><td>Carton</td><td>${money((product?.cartonPrice || 0) * line.quantity)}</td></tr>`; }).join('');
    document.getElementById('deliveryNoteContent').innerHTML = `<div class="print-sheet"><div class="bl-header"><div class="bl-brand"><span class="footer-mark"><i class="bi bi-droplet-half"></i></span><span>Acsee Corporate<small class="d-block text-muted fw-normal">Hygiène en gros · Québec</small></span></div><div class="bl-number"><div class="bl-label">Bon de livraison</div><strong>${escapeHtml(order.id)}</strong><div>${orderDate(order.createdAt)}</div></div></div><div class="bl-meta"><div><div class="bl-label">Expéditeur</div><div class="bl-value">Acsee Corporate SARL</div><div class="small text-muted">Zone industrielle Bassa, Douala<br>Tél. +237 6 99 00 00 00</div></div><div><div class="bl-label">Client livré</div><div class="bl-value">${escapeHtml(order.clientName)}</div><div class="small text-muted">${escapeHtml(client?.city || 'Cameroun')} · ${escapeHtml(client?.contact || 'Service achats')}</div></div></div><table class="bl-table"><thead><tr><th>Désignation</th><th>Qté</th><th>Unité</th><th>Montant</th></tr></thead><tbody>${rows}</tbody></table><div class="bl-total">Total commande :&nbsp; ${money(order.total)}</div><div class="bl-signatures"><div><div class="bl-label">Remis par</div><div class="signature-line">Signature & cachet Acsee Corporate</div></div><div><div class="bl-label">Reçu par</div><div class="signature-line">Signature & cachet client</div></div></div><p class="small text-muted mt-4 mb-0">Document généré par le prototype Acsee Corporate. Merci pour votre confiance.</p></div>`;
  }

  function addToCart(productId) {
    const product = getProduct(productId);
    if (!product || product.stock < 1) return showToast('Produit indisponible', 'Ce produit ne peut pas être ajouté pour le moment.', 'warning');
    const existing = state.cart.find((item) => item.productId === productId);
    if (existing) {
      if (existing.quantity >= product.stock) return showToast('Stock maximum atteint', `Il ne reste que ${product.stock} carton(s) de ${product.shortName}.`, 'warning');
      existing.quantity += 1;
    } else state.cart.push({ productId, quantity: 1 });
    persist();
    showToast('Ajouté au panier', `${product.shortName} est prêt à être commandé.`, 'success');
  }

  function updateCart(productId, action) {
    const item = state.cart.find((entry) => entry.productId === productId);
    const product = getProduct(productId);
    if (!item || !product) return;
    if (action === 'increase' && item.quantity < product.stock) item.quantity += 1;
    if (action === 'decrease') item.quantity -= 1;
    if (action === 'remove' || item.quantity <= 0) state.cart = state.cart.filter((entry) => entry.productId !== productId);
    persist();
  }

  function placeOrder() {
    if (!state.cart.length) return showToast('Panier vide', 'Ajoutez au moins un carton avant de valider.', 'warning');
    const invalid = state.cart.find((item) => !getProduct(item.productId) || item.quantity > getProduct(item.productId).stock);
    if (invalid) return showToast('Stock modifié', 'Actualisez les quantités de votre panier avant de valider.', 'warning');
    const clientId = document.getElementById('cartClient').value;
    const client = getClient(clientId) || state.clients[0];
    const paymentMethod = document.querySelector('input[name="paymentMethod"]:checked')?.value || 'MTN MoMo';
    const total = state.cart.reduce((sum, item) => sum + getProduct(item.productId).cartonPrice * item.quantity, 0);
    state.cart.forEach((item) => { getProduct(item.productId).stock -= item.quantity; });
    const nextNumber = state.orders.reduce((max, order) => Math.max(max, Number(order.id.replace(/\D/g, '')) || 0), 1042) + 1;
    const order = { id: `CMD-${nextNumber}`, clientId: client.id, clientName: client.name, createdAt: new Date().toISOString(), status: 'pending', paymentStatus: 'pending', paymentMethod, total, lines: clone(state.cart) };
    state.orders.unshift(order);
    addNotification('order', 'Nouvelle commande reçue', `${client.name} · ${money(total)}`);
    state.cart = [];
    persist();
    const offcanvas = bootstrap.Offcanvas.getInstance(document.getElementById('cartOffcanvas'));
    if (offcanvas) offcanvas.hide();
    showToast('Commande enregistrée', `${order.id} est maintenant visible dans l’entrepôt.`, 'success');
  }

  function restock(productId) {
    const product = getProduct(productId);
    if (!product) return;
    product.stock += 10;
    addNotification('warehouse', 'Réapprovisionnement enregistré', `${product.shortName} · +10 cartons en stock`);
    persist();
    showToast('Stock approvisionné', `${product.shortName} dispose maintenant de ${product.stock} cartons.`, 'success');
  }

  function validateOrder(orderId) {
    const order = state.orders.find((entry) => entry.id === orderId);
    if (!order || order.status === 'validated') return;
    order.status = 'validated';
    order.paymentStatus = 'paid';
    addNotification('payment', 'Sortie entrepôt validée', `${order.clientName} · Encaissement ${order.paymentMethod} · ${money(order.total)}`);
    const todayHistory = state.salesHistory[state.salesHistory.length - 1];
    if (todayHistory && todayHistory.label === 'Auj.') todayHistory.amount += order.total;
    persist();
    showToast('Sortie validée & encaissée', `${order.id} · ${money(order.total)} enregistré.`, 'success');
  }

  function resetDemo() {
    if (!window.confirm('Réinitialiser toutes les données de démonstration ?')) return;
    state = clone(window.ACSEE_SEED_DATA);
    persist();
    showToast('Démo réinitialisée', 'Les stocks, commandes et notifications sont revenus à leur état initial.', 'info');
  }

  function renderAll() {
    renderFilters();
    renderProducts();
    renderCart();
    renderWarehouse();
    renderCockpit();
  }

  document.addEventListener('click', (event) => {
    const viewButton = event.target.closest('[data-view-target]');
    if (viewButton) { event.preventDefault(); setView(viewButton.dataset.viewTarget); return; }
    const categoryButton = event.target.closest('[data-category]');
    if (categoryButton) { activeCategory = categoryButton.dataset.category; renderFilters(); renderProducts(); return; }
    const addButton = event.target.closest('[data-add-product]');
    if (addButton) { addToCart(addButton.dataset.addProduct); return; }
    const cartButton = event.target.closest('[data-cart-action]');
    if (cartButton) { updateCart(cartButton.dataset.productId, cartButton.dataset.cartAction); return; }
    const restockButton = event.target.closest('[data-restock-product]');
    if (restockButton) { restock(restockButton.dataset.restockProduct); return; }
    const deliveryButton = event.target.closest('[data-delivery-order]');
    if (deliveryButton) { const order = state.orders.find((entry) => entry.id === deliveryButton.dataset.deliveryOrder); if (order) { deliveryOrderId = order.id; renderDeliveryNote(order); bootstrap.Modal.getOrCreateInstance(document.getElementById('deliveryModal')).show(); } return; }
    const validateButton = event.target.closest('[data-validate-order]');
    if (validateButton) { validateOrder(validateButton.dataset.validateOrder); return; }
  });

  document.getElementById('productSearch').addEventListener('input', renderProducts);
  document.getElementById('placeOrderBtn').addEventListener('click', placeOrder);
  document.getElementById('resetDemoBtn').addEventListener('click', resetDemo);
  document.getElementById('printDeliveryBtn').addEventListener('click', () => window.print());
  document.getElementById('mobileInstallHint').addEventListener('click', () => showToast('Installation mobile', 'Dans le menu du navigateur, choisissez « Ajouter à l’écran d’accueil ».', 'info'));
  window.addEventListener('storage', (event) => { if (event.key === STORAGE_KEY) { state = loadState(); renderAll(); } });
  window.addEventListener('beforeinstallprompt', (event) => { event.preventDefault(); deferredInstallPrompt = event; document.getElementById('installAppBtn').classList.remove('d-none'); });
  document.getElementById('installAppBtn').addEventListener('click', async () => { if (!deferredInstallPrompt) return; deferredInstallPrompt.prompt(); await deferredInstallPrompt.userChoice; deferredInstallPrompt = null; document.getElementById('installAppBtn').classList.add('d-none'); });
  if ('serviceWorker' in navigator && (window.location.protocol === 'https:' || window.location.hostname === 'localhost')) navigator.serviceWorker.register('./sw.js').catch(() => {});

  renderAll();
})();
