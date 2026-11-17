const client = window.supabase.createClient(window.AJ_STORE_CONFIG.supabaseUrl, window.AJ_STORE_CONFIG.supabaseAnonKey);
const DEFAULT_PRODUCTS = [
  { id: 1, name: 'SonicPods Air', category: 'Audio', price: 5499, emoji: '🎧', description: 'Wireless earbuds for music, calls and everyday listening.', tag: 'Bestseller', stock: 20 },
  { id: 2, name: 'VoltCharge 30W', category: 'Power', price: 3299, emoji: '⚡', description: 'Compact fast-charging wall adapter for compatible devices.', tag: 'Fast charge', stock: 18 },
  { id: 3, name: 'CrystalShield Case', category: 'Protection', price: 1499, emoji: '📱', description: 'A clean protective case with a comfortable grip.', tag: 'New', stock: 35 },
  { id: 4, name: 'PowerCore Mini', category: 'Power', price: 4999, emoji: '🔋', description: 'Pocket-friendly power bank for your daily commute.', tag: 'Popular', stock: 12 },
  { id: 5, name: 'StudioFlex Cable', category: 'Power', price: 899, emoji: '〰️', description: 'Durable charging cable for your everyday setup.', tag: 'Essential', stock: 50 },
  { id: 6, name: 'Magnetic Phone Stand', category: 'Lifestyle', price: 1899, emoji: '🧲', description: 'A handy stand for hands-free viewing at your desk.', tag: 'Smart pick', stock: 24 },
  { id: 7, name: 'BassBeat Headset', category: 'Audio', price: 6999, emoji: '🎵', description: 'Comfort-focused headphones for work and downtime.', tag: 'Featured', stock: 10 },
  { id: 8, name: 'LensGuard Kit', category: 'Protection', price: 1199, emoji: '◉', description: 'Extra camera-lens protection for compatible phones.', tag: 'New', stock: 30 }
];
let products = [], cart = JSON.parse(sessionStorage.getItem('aj_cart') || '{}'), activeFilter = 'All';
const $ = (id) => document.getElementById(id);
const money = (amount) => `Rs. ${Number(amount || 0).toLocaleString('en-PK')}`;
const safe = (value) => String(value ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
function message(node, text, error = false) { node.textContent = text; node.classList.toggle('error', error); }
async function loadProducts() {
  const { data, error } = await client.from('products').select('id,name,category,price,emoji,description,tag,stock').eq('active', true).order('id');
  if (error) {
    products = DEFAULT_PRODUCTS;
    $('products').innerHTML = `<div class="empty-state"><b>Store catalogue is not connected yet.</b><span>Showing demo products. Run the setup SQL in the repository README to load shared products.</span></div>` + renderCards(products);
    $('products').insertAdjacentHTML('beforeend', '');
    return;
  }
  products = data || [];
  renderProducts();
}
function renderCards(list) {
  if (!list.length) return '<div class="empty-state"><b>No products found</b><span>Try a different search or category.</span></div>';
  return list.map((p) => `<article class="product-card"><div class="product-art"><span class="product-tag">${safe(p.tag || 'AJ PICK')}</span><span class="product-icon">${safe(p.emoji || '📦')}</span></div><div class="product-info"><span class="category">${safe(p.category)}</span><h3>${safe(p.name)}</h3><p>${safe(p.description)}</p><div class="product-bottom"><b>${money(p.price)}</b><button class="add-button" data-add="${p.id}" ${Number(p.stock) < 1 ? 'disabled' : ''} aria-label="Add ${safe(p.name)}">${Number(p.stock) < 1 ? 'Out' : '+'}</button></div><small class="stock-note">${Number(p.stock) > 0 ? `${Number(p.stock)} in stock` : 'Currently unavailable'}</small></div></article>`).join('');
}
function renderProducts() {
  const query = $('search').value.trim().toLowerCase();
  const list = products.filter((p) => (activeFilter === 'All' || p.category === activeFilter) && `${p.name} ${p.description} ${p.category}`.toLowerCase().includes(query));
  $('products').innerHTML = renderCards(list);
}
function renderFilters() {
  const categories = ['All', ...new Set(products.map((p) => p.category).filter(Boolean))];
  $('filters').innerHTML = categories.map((cat) => `<button class="filter-chip ${cat === activeFilter ? 'active' : ''}" data-filter="${safe(cat)}">${safe(cat)}</button>`).join('');
}
function addToCart(id) {
  const item = products.find((p) => String(p.id) === String(id));
  if (!item) return;
  const next = Number(cart[id] || 0) + 1;
  if (next > Number(item.stock)) return toast('That is all the stock currently available.');
  cart[id] = next; saveCart(); renderBag(); toast(`${item.name} added to your bag.`);
}
function saveCart() { sessionStorage.setItem('aj_cart', JSON.stringify(cart)); }
function changeQuantity(id, delta) {
  const item = products.find((p) => String(p.id) === String(id));
  const next = Number(cart[id] || 0) + delta;
  if (next <= 0) delete cart[id]; else if (!item || next <= Number(item.stock)) cart[id] = next;
  saveCart(); renderBag();
}
function renderBag() {
  const lines = Object.entries(cart).map(([id, quantity]) => ({ product: products.find((p) => String(p.id) === String(id)), quantity })).filter((line) => line.product);
  const count = lines.reduce((sum, line) => sum + line.quantity, 0), total = lines.reduce((sum, line) => sum + Number(line.product.price) * line.quantity, 0);
  $('bag-count').textContent = count; $('drawer-count').textContent = `(${count})`; $('subtotal').textContent = money(total);
  $('bag-items').innerHTML = lines.length ? lines.map(({ product: p, quantity }) => `<div class="bag-line"><span class="bag-emoji">${safe(p.emoji)}</span><div class="bag-line-info"><b>${safe(p.name)}</b><small>${money(p.price)} each</small><div class="quantity"><button data-qty="${p.id}" data-delta="-1" aria-label="Remove one">−</button><span>${quantity}</span><button data-qty="${p.id}" data-delta="1" aria-label="Add one">+</button><button class="remove-line" data-remove="${p.id}">Remove</button></div></div></div>`).join('') : '<div class="empty-state"><b>Your bag is empty.</b><span>Add something from the collection.</span></div>';
  $('checkout-form').querySelector('button[type="submit"]').disabled = !lines.length;
}
function openBag(open) { $('bag-drawer').classList.toggle('open', open); $('drawer-shade').classList.toggle('open', open); document.body.classList.toggle('locked', open); }
let toastTimer;
function toast(text) { $('toast').textContent = text; $('toast').classList.add('show'); clearTimeout(toastTimer); toastTimer = setTimeout(() => $('toast').classList.remove('show'), 2200); }
$('products').addEventListener('click', (event) => { const add = event.target.closest('[data-add]'); if (add) addToCart(add.dataset.add); });
$('filters').addEventListener('click', (event) => { const button = event.target.closest('[data-filter]'); if (!button) return; activeFilter = button.dataset.filter; renderFilters(); renderProducts(); });
$('search').addEventListener('input', renderProducts);
$('bag-items').addEventListener('click', (event) => { const qty = event.target.closest('[data-qty]'); const remove = event.target.closest('[data-remove]'); if (qty) changeQuantity(qty.dataset.qty, Number(qty.dataset.delta)); if (remove) { delete cart[remove.dataset.remove]; saveCart(); renderBag(); } });
$('bag-open').onclick = () => openBag(true); $('bag-close').onclick = $('drawer-shade').onclick = () => openBag(false);
$('menu-toggle').onclick = () => document.querySelector('.topbar').classList.toggle('menu-open');
document.querySelector('.topbar nav').addEventListener('click', () => document.querySelector('.topbar').classList.remove('menu-open'));
document.addEventListener('keydown', (event) => { if (event.key === 'Escape') openBag(false); });
$('checkout-form').addEventListener('submit', async (event) => {
  event.preventDefault(); const form = event.currentTarget, submit = form.querySelector('button[type="submit"]');
  const items = Object.entries(cart).filter(([, qty]) => Number(qty) > 0).map(([product_id, quantity]) => ({ product_id: Number(product_id), quantity: Number(quantity) }));
  if (!items.length) return;
  submit.disabled = true; message($('checkout-message'), 'Submitting your order…');
  const values = new FormData(form);
  const { data, error } = await client.rpc('place_store_order', { p_customer_name: String(values.get('name')).trim(), p_email: String(values.get('email')).trim(), p_phone: String(values.get('phone')).trim(), p_address: String(values.get('address')).trim(), p_items: items });
  submit.disabled = false;
  if (error) { message($('checkout-message'), error.message.includes('stock') ? 'One or more items no longer have enough stock. Please review your bag.' : 'Could not place the order. The store database may not be configured yet.', true); return; }
  const orderId = typeof data === 'string' ? data : data?.order_id;
  cart = {}; saveCart(); form.reset(); renderBag(); await loadProducts();
  message($('checkout-message'), `Order received${orderId ? ` — reference ${String(orderId).slice(0, 8)}` : ''}. The store will contact you to confirm delivery. Online payment is not enabled.`);
});
async function init() {
  renderBag();
  if (!window.supabase || !window.AJ_STORE_CONFIG?.supabaseAnonKey) { $('products').innerHTML = '<div class="empty-state">Store connection configuration is missing.</div>'; return; }
  await loadProducts(); renderFilters();
  client.channel('public-products').on('postgres_changes', { event: '*', schema: 'public', table: 'products' }, async () => { await loadProducts(); renderFilters(); }).subscribe();
}
init();
