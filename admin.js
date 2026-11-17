const client = window.supabase.createClient(window.AJ_STORE_CONFIG.supabaseUrl, window.AJ_STORE_CONFIG.supabaseAnonKey);
const $ = (id) => document.getElementById(id);
const money = (amount) => `Rs. ${Number(amount || 0).toLocaleString('en-PK')}`;
const esc = (value) => String(value ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
function setMessage(id, text, error = false) { const el = $(id); el.textContent = text; el.classList.toggle('error', error); }
function showAdmin(isAdmin) { $('auth-panel').hidden = isAdmin; $('admin-app').hidden = !isAdmin; }
async function checkSession() {
  const { data: { session } } = await client.auth.getSession();
  if (!session) { showAdmin(false); return; }
  const { data, error } = await client.rpc('is_store_admin');
  if (error || data !== true) { showAdmin(false); setMessage('auth-message', 'This account is signed in but is not assigned store-admin access. Ask the owner to add your user ID to public.store_admins.', true); return; }
  showAdmin(true); await refreshDashboard();
}
$('auth-form').addEventListener('submit', async (event) => {
  event.preventDefault(); const values = new FormData(event.currentTarget);
  setMessage('auth-message', 'Signing in…');
  const { error } = await client.auth.signInWithPassword({ email: values.get('email'), password: values.get('password') });
  if (error) { setMessage('auth-message', error.message, true); return; }
  await checkSession();
});
$('signup').onclick = async () => {
  const values = new FormData($('auth-form'));
  if (!values.get('email') || !values.get('password')) return setMessage('auth-message', 'Enter an email and password first.', true);
  setMessage('auth-message', 'Creating account…');
  const { error } = await client.auth.signUp({ email: values.get('email'), password: values.get('password') });
  if (error) setMessage('auth-message', error.message, true);
  else setMessage('auth-message', 'Account created. Verify your email if requested, then ask the owner to grant admin access in Supabase.');
};
$('signout').onclick = async () => { await client.auth.signOut(); showAdmin(false); };
$('refresh').onclick = refreshDashboard;
async function refreshDashboard() {
  const [productsResult, ordersResult] = await Promise.all([
    client.from('products').select('*').order('id'),
    client.from('orders').select('id,customer_name,email,phone,address,items,total,status,created_at').order('created_at', { ascending: false }).limit(50)
  ]);
  if (productsResult.error || ordersResult.error) { setMessage('auth-message', (productsResult.error || ordersResult.error).message, true); showAdmin(false); return; }
  const products = productsResult.data || [], orders = ordersResult.data || [];
  $('stat-products').textContent = products.length; $('stat-low').textContent = products.filter((p) => Number(p.stock) < 5).length; $('stat-units').textContent = products.reduce((sum, p) => sum + Number(p.stock || 0), 0); $('stat-orders').textContent = orders.filter((o) => o.status === 'pending').length;
  $('product-rows').innerHTML = products.length ? products.map((p) => `<tr><td><span class="table-emoji">${esc(p.emoji)}</span><b>${esc(p.name)}</b><small>${esc(p.tag || '')}</small></td><td>${esc(p.category)}</td><td>${money(p.price)}</td><td>${p.stock}</td><td class="row-actions"><button class="mini-button" data-edit="${p.id}">Edit</button><button class="mini-button danger" data-delete="${p.id}">Delete</button></td></tr>`).join('') : '<tr><td colspan="5" class="empty-state">No products yet. Add your first product.</td></tr>';
  $('order-list').innerHTML = orders.length ? orders.map((o) => `<article class="order-card"><div class="order-top"><b>Order ${esc(String(o.id).slice(0, 8))}</b><select data-status="${esc(o.id)}" aria-label="Order status"><option ${o.status === 'pending' ? 'selected' : ''}>pending</option><option ${o.status === 'confirmed' ? 'selected' : ''}>confirmed</option><option ${o.status === 'fulfilled' ? 'selected' : ''}>fulfilled</option><option ${o.status === 'cancelled' ? 'selected' : ''}>cancelled</option></select></div><p><b>${esc(o.customer_name)}</b> · ${esc(o.email)} · ${esc(o.phone)}</p><p>${esc(o.address)}</p><div class="order-items">${(o.items || []).map((item) => `${esc(item.name)} × ${Number(item.quantity)}`).join('<br>')}</div><div class="order-bottom"><time>${new Date(o.created_at).toLocaleString()}</time><b>${money(o.total)}</b></div></article>`).join('') : '<div class="empty-state"><b>No orders yet</b><span>New customer orders will appear here.</span></div>';
}
function showProductModal(product = null) {
  const form = $('product-form'); form.reset(); form.elements.id.value = product?.id || ''; form.elements.name.value = product?.name || ''; form.elements.category.value = product?.category || ''; form.elements.price.value = product?.price ?? ''; form.elements.stock.value = product?.stock ?? 0; form.elements.emoji.value = product?.emoji || '📦'; form.elements.tag.value = product?.tag || ''; form.elements.description.value = product?.description || ''; $('modal-title').textContent = product ? 'Edit product' : 'Add product'; $('product-modal').hidden = false;
}
function closeModal() { $('product-modal').hidden = true; }
$('new-product').onclick = () => showProductModal(); $('modal-close').onclick = closeModal;
$('product-modal').addEventListener('click', (event) => { if (event.target === $('product-modal')) closeModal(); });
$('product-rows').addEventListener('click', async (event) => {
  const edit = event.target.closest('[data-edit]'), remove = event.target.closest('[data-delete]');
  if (edit) { const { data, error } = await client.from('products').select('*').eq('id', edit.dataset.edit).single(); if (error) return alert(error.message); showProductModal(data); }
  if (remove && confirm('Delete this product from the catalogue?')) { const { error } = await client.from('products').delete().eq('id', remove.dataset.delete); if (error) alert(error.message); else await refreshDashboard(); }
});
$('product-form').addEventListener('submit', async (event) => {
  event.preventDefault(); const form = event.currentTarget, f = new FormData(form), id = f.get('id');
  const product = { name: String(f.get('name')).trim(), category: String(f.get('category')).trim(), price: Number(f.get('price')), stock: Number(f.get('stock')), emoji: String(f.get('emoji') || '📦'), tag: String(f.get('tag') || '').trim(), description: String(f.get('description') || '').trim(), active: true };
  if (!Number.isInteger(product.price) || product.price < 1 || !Number.isInteger(product.stock) || product.stock < 0) return setMessage('product-message', 'Enter a whole-number price and non-negative stock amount.', true);
  const result = id ? await client.from('products').update(product).eq('id', id) : await client.from('products').insert(product);
  if (result.error) return setMessage('product-message', result.error.message, true);
  closeModal(); await refreshDashboard();
});
$('order-list').addEventListener('change', async (event) => {
  const select = event.target.closest('[data-status]'); if (!select) return;
  const { error } = await client.from('orders').update({ status: select.value }).eq('id', select.dataset.status);
  if (error) { alert(error.message); await refreshDashboard(); }
  else await refreshDashboard();
});
client.auth.onAuthStateChange(() => { setTimeout(checkSession, 0); });
checkSession();
