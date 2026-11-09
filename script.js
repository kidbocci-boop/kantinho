const STORAGE_KEY = 'kantinho_user';
const SESSION_MS = 15 * 24 * 60 * 60 * 1000; // 15 dias
const WHATSAPP_NUMBER = '244932230819';
const OPEN_HOUR = 8, CLOSE_HOUR = 22;

let currentUser = null;
let cart = []; // { name, price, qty }

const bankData = {
  BAI: { title: 'Banco BAI', desc: 'Transfira para o IBAN:', data: 'AO06.0040.0000.1234.5678.1014.5' },
  BFA: { title: 'Banco BFA', desc: 'Transfira para o IBAN:', data: 'AO06.0006.0000.9876.5432.1098.7' },
  BIC: { title: 'Banco BIC', desc: 'Transfira para o IBAN:', data: 'AO06.0051.0000.5555.4444.3011.2' },
  Express: { title: 'Multicaixa Express', desc: 'Envio direto para o telemóvel:', data: "Telemóvel: 932 230 819 (Kantinho D'Regina)" }
};

const menu = {
  comidas: [
    ['Hambúrguer Simples', 'Carne, ovo e os molhos.', 2000],
    ['Hambúrguer Composto', 'Queijo, fiambre, bacon, chouriço, carne, ovo e molhos.', 3500],
    ['Hambúrguer Especial Duplo', 'Duplo fiambre, bacon, chouriço, carne, ovo, queijo e molhos.', 6000],
    ['Cachorro Quente', 'Cachorro quente com salsicha e ovo.', 1500],
    ['Fahita de Frango', 'Fahita de frango saborosa.', 3000],
    ['Fahita de Carne', 'Fahita de carne suculenta.', 3500],
    ['Batata Frita', 'Dose de batatas fritas crocantes.', 1000],
    ['Baguete', 'Baguete recheada.', 3500]
  ],
  bebidas: [
    ['Yala (Bidon)', 'Gasosa refrescante.', 400],
    ['Coca-Cola (Bidon)', 'Gasosa em bidon.', 600],
    ['Coca-Cola (Lata)', 'Gasosa em lata gelada.', 1000],
    ['Sumol (Lata)', 'Gasosa em lata.', 1000],
    ['Sprite (Lata)', 'Gasosa em lata.', 1000],
    ['Sprite (Bidon)', 'Gasosa em bidon.', 600],
    ['Compal (Lata)', 'Sumo em lata.', 1000]
  ]
};

const zones = [
  ['Projeto Nova Vida', 1500], ['Gamek à direita / Vila da Gamek', 1000], ['Rocha Pinto / Rocha Padaria', 1500],
  ['Talatona / Bairro Militar', 2000], ['Futungo', 1500], ['Benfica / Patriota', 3000], ['Kilamba', 5000],
  ['Camama', 3000], ['Jardim do Éden', 3500], ['Maianga', 3000], ['Mutamba / Coqueiros', 3000],
  ['Vila Alice', 3000], ['Coreia', 3000], ['Samba', 1500], ['Zamba 2', 3000], ['Multiperfil', 1000],
  ['Morro Bento', 1000], ['Miramar', 3000], ['Popula', 3000], ['Combatentes', 3000], ['São Paulo / B.O', 3500],
  ['Viana', 5000], ['Zona Verde', 3500], ['Kifica', 3500], ['Boa Vida', 3500], ['Via-Expressa', 4000],
  ['Zango 0 / Vida Pacífica', 6000], ['Desvio do Zango', 5000], ['Golf 2', 2000], ['Golf 1', 3000]
];

/* ---------- Utilitários ---------- */
const $ = id => document.getElementById(id);
const kz = n => (Number(n) || 0).toLocaleString('pt-PT') + ' KZ';
const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const norm = s => s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

/* ---------- Arranque ---------- */
window.addEventListener('load', () => {
  renderMenu();
  renderZones();
  checkDepositMethod();
  checkStoreStatus();
  setInterval(checkStoreStatus, 60000);
  checkUserSession();
});

document.addEventListener('keydown', e => {
  if (e.key === 'Escape') document.querySelectorAll('.modal-overlay.open').forEach(m => m.classList.remove('open'));
});

function renderMenu() {
  Object.keys(menu).forEach(section => {
    $(section).querySelector('.list').innerHTML = menu[section].map(([name, desc, price], i) => `
      <div class="product-card" data-name="${esc(norm(name + ' ' + desc))}">
        <div class="product-info">
          <h3>${esc(name)}</h3>
          <p>${esc(desc)}</p>
          <span class="product-price">${kz(price)}</span>
        </div>
        <button class="add-btn" aria-label="Adicionar ${esc(name)}" onclick="addItem('${section}', ${i})">+</button>
      </div>`).join('');
  });
}

function renderZones() {
  $('delivery-zone').innerHTML = '<option value="0">Selecione o bairro…</option>' +
    zones.map(([n, fee]) => `<option value="${fee}">${esc(n)} (+${fee.toLocaleString('pt-PT')} KZ)</option>`).join('');
}

/* ---------- Sessão ---------- */
function checkUserSession() {
  let user = null;
  try { user = JSON.parse(localStorage.getItem(STORAGE_KEY)); } catch (e) { localStorage.removeItem(STORAGE_KEY); }

  if (!user) return showAuthSection();
  if (Date.now() - user.lastLogin > SESSION_MS) {
    localStorage.removeItem(STORAGE_KEY);
    alert('A sua sessão expirou após 15 dias. Por favor, entre novamente.');
    return showAuthSection();
  }
  currentUser = user;
  saveUserData();
  showMainApp();
}

function userRegisterOrLogin() {
  const name = $('auth-name').value.trim();
  const phone = $('auth-phone').value.replace(/[\s-]/g, '');

  if (name.length < 3) return alert('Introduza o seu nome completo.');
  if (!/^(\+?244)?9\d{8}$/.test(phone)) return alert('Introduza um número de telemóvel válido (ex: 923456789).');

  currentUser = { name, phone, balance: 0, orders: [], lastLogin: Date.now() };
  saveUserData();
  showMainApp();
}

function userLogout() {
  if (!confirm('Terminar sessão? O saldo e o histórico deste dispositivo serão apagados.')) return;
  localStorage.removeItem(STORAGE_KEY);
  currentUser = null;
  cart = [];
  updateCartDisplay();
  document.querySelectorAll('.modal-overlay').forEach(m => m.classList.remove('open'));
  showAuthSection();
}

function saveUserData() {
  currentUser.lastLogin = Date.now();
  localStorage.setItem(STORAGE_KEY, JSON.stringify(currentUser));
}

function showAuthSection() {
  $('auth-section').hidden = false;
  $('main-app').hidden = true;
  $('user-wallet-banner').hidden = true;
  $('floating-cart-bar').hidden = true;
}

function showMainApp() {
  $('auth-section').hidden = true;
  $('main-app').hidden = false;
  $('user-wallet-banner').hidden = false;
  $('logged-username').textContent = currentUser.name;
  updateBalanceDisplay();
  updateCartDisplay();
}

function updateBalanceDisplay() {
  const b = currentUser.balance || 0;
  $('wallet-balance').textContent = b.toLocaleString('pt-PT');
  $('balance-display').textContent = kz(b);
  $('account-balance').textContent = kz(b);
}

/* ---------- Janelas ---------- */
function toggle(id) { $(id).classList.toggle('open'); }
function closeOnOverlay(e, el) { if (e.target === el) el.classList.remove('open'); }
function toggleDepositModal() { toggle('deposit-modal'); }
function toggleCartModal() { toggle('cart-modal'); }

function toggleAccountModal() {
  $('account-name').textContent = currentUser.name;
  $('account-phone').textContent = currentUser.phone;
  updateBalanceDisplay();
  renderOrderHistory();
  toggle('account-modal');
}

/* ---------- Depósito ---------- */
function checkDepositMethod() {
  const info = bankData[$('deposit-method').value];
  $('dep-title').textContent = info.title;
  $('dep-desc').textContent = info.desc;
  $('dep-data').textContent = info.data;
}

// ATENÇÃO: o saldo é guardado apenas no navegador e creditado sem confirmação de pagamento.
// Para uso real, o saldo deve ser validado num servidor (ver nota no resumo).
function requestDeposit() {
  const amount = parseInt($('deposit-amount').value, 10);
  if (!amount || amount <= 0) return alert('Introduza um valor válido para depósito.');

  currentUser.balance = (currentUser.balance || 0) + amount;
  saveUserData();
  updateBalanceDisplay();
  toggleDepositModal();
  $('deposit-amount').value = '';
  alert(`Saldo carregado!\nForam adicionados ${kz(amount)} à sua carteira.`);
}

/* ---------- Menu e pesquisa ---------- */
function filterProducts() {
  const q = norm($('search-input').value.trim());
  const active = document.querySelector('.section-content.active');
  let visible = 0;
  active.querySelectorAll('.product-card').forEach(card => {
    const show = card.dataset.name.includes(q);
    card.style.display = show ? 'flex' : 'none';
    if (show) visible++;
  });
  $('no-results').hidden = visible > 0;
}

function switchTab(tabId, btn) {
  document.querySelectorAll('.section-content, .cat-btn').forEach(el => el.classList.remove('active'));
  $(tabId).classList.add('active');
  btn.classList.add('active');
  $('search-input').value = '';
  filterProducts();
}

/* ---------- Carrinho ---------- */
function addItem(section, index) {
  const [name, , price] = menu[section][index];
  const found = cart.find(i => i.name === name);
  found ? found.qty++ : cart.push({ name, price, qty: 1 });
  updateCartDisplay();
}

function changeQty(index, delta) {
  cart[index].qty += delta;
  if (cart[index].qty <= 0) cart.splice(index, 1);
  updateCartDisplay();
}

const cartSubtotal = () => cart.reduce((s, i) => s + i.price * i.qty, 0);
const cartCount = () => cart.reduce((s, i) => s + i.qty, 0);

function updateCartDisplay() {
  $('cart-count').textContent = cartCount();
  $('cart-total-bar').textContent = kz(cartSubtotal());
  $('floating-cart-bar').hidden = !currentUser || cart.length === 0;

  if (cart.length === 0) {
    $('cart-items-list').innerHTML = '<p class="empty-text">O seu carrinho está vazio.</p>';
    $('cart-modal').classList.remove('open');
  } else {
    $('cart-items-list').innerHTML = cart.map((item, i) => `
      <div class="cart-item-row">
        <span>${esc(item.name)}<small>${kz(item.price)} cada</small></span>
        <span class="qty">
          <button aria-label="Diminuir" onclick="changeQty(${i}, -1)">−</button>
          <b>${item.qty}</b>
          <button aria-label="Aumentar" onclick="changeQty(${i}, 1)">+</button>
        </span>
      </div>`).join('');
  }
  updateCartTotals();
}

function updateCartTotals() {
  const subtotal = cartSubtotal();
  const fee = parseInt($('delivery-zone').value, 10) || 0;
  $('modal-subtotal').textContent = kz(subtotal);
  $('modal-delivery').textContent = kz(fee);
  $('modal-grand-total').textContent = kz(subtotal + fee);
}

/* ---------- Horário ---------- */
function isStoreOpen() {
  const h = new Date().getHours();
  return h >= OPEN_HOUR && h < CLOSE_HOUR;
}

function checkStoreStatus() {
  const badge = $('store-status-badge');
  const open = isStoreOpen();
  badge.className = 'store-badge ' + (open ? 'open' : 'closed');
  badge.textContent = open ? 'Aberto agora' : `Fechado · abrimos às ${String(OPEN_HOUR).padStart(2, '0')}:00`;
}

/* ---------- Histórico ---------- */
function saveOrderToHistory(items, total, zone) {
  currentUser.orders = currentUser.orders || [];
  currentUser.orders.unshift({
    date: new Date().toLocaleString('pt-PT'),
    items: items.map(i => ({ ...i })),
    total,
    zone
  });
  currentUser.orders = currentUser.orders.slice(0, 20);
}

function renderOrderHistory() {
  const box = $('client-orders-history');
  const orders = currentUser.orders || [];
  if (!orders.length) { box.innerHTML = '<p class="empty-text">Ainda não fez nenhum pedido.</p>'; return; }

  box.innerHTML = orders.map(o => `
    <div class="history-item">
      <b>${esc(o.date)}</b><br>
      ${o.items.map(i => `${i.qty || 1}× ${esc(i.name)}`).join(', ')}<br>
      <span class="total">Total: ${kz(o.total)}</span>
    </div>`).join('');
}

/* ---------- Finalizar pedido ---------- */
function checkoutWithBalance() {
  const zoneSelect = $('delivery-zone');
  const zoneName = zoneSelect.options[zoneSelect.selectedIndex].text;
  const reference = $('client-reference').value.trim();

  if (cart.length === 0) return alert('O seu carrinho está vazio.');
  if (zoneSelect.value === '0') { alert('Por favor, selecione a zona de entrega.'); return zoneSelect.focus(); }
  if (!isStoreOpen() && !confirm('A loja está fechada neste momento. Quer enviar o pedido mesmo assim?')) return;

  const subtotal = cartSubtotal();
  const fee = parseInt(zoneSelect.value, 10);
  const total = subtotal + fee;

  if ((currentUser.balance || 0) < total) {
    alert(`Saldo insuficiente.\n\nNecessita de ${kz(total)} mas tem ${kz(currentUser.balance)}. Carregue o seu saldo.`);
    toggleCartModal();
    toggleDepositModal();
    return;
  }

  currentUser.balance -= total;
  saveOrderToHistory(cart, total, zoneName);
  saveUserData();
  updateBalanceDisplay();

  const cleanZone = zoneName.split('(')[0].trim();
  const origin = encodeURIComponent('Rua do Kongo, Gamek, Luanda, Angola');
  const destination = encodeURIComponent(`${cleanZone}, Luanda, Angola`);
  const mapsLink = `https://www.google.com/maps/dir/?api=1&origin=${origin}&destination=${destination}&travelmode=driving`;

  let msg = `*Novo Pedido (Pago via Carteira) - Kantinho D'Regina*\n\n`;
  msg += `👤 *Cliente:* ${currentUser.name} (${currentUser.phone})\n`;
  msg += `📍 *Zona / Bairro:* ${zoneName}\n`;
  if (reference) msg += `📌 *Ponto de Referência:* ${reference}\n`;
  msg += `🗺 *Mapa (Motoboy):* ${mapsLink}\n`;
  msg += `💳 *Método:* Desconto automático em conta\n\n🛒 *Itens:*\n`;
  cart.forEach((item, i) => { msg += `${i + 1}. ${item.qty}× ${item.name} — ${kz(item.price * item.qty)}\n`; });
  msg += `\n------------------\n`;
  msg += `🔹 Subtotal: ${kz(subtotal)}\n🔸 Taxa de Entrega: ${kz(fee)}\n`;
  msg += `💰 *Total Pago: ${kz(total)}*\n💼 *Saldo Restante:* ${kz(currentUser.balance)}\n`;
  msg += `\n⚠️ _Pedido efetuado sem direito a reembolso._`;

  cart = [];
  $('client-reference').value = '';
  zoneSelect.value = '0';
  updateCartDisplay();
  $('cart-modal').classList.remove('open');

  window.open(`https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(msg)}`, '_blank');
}