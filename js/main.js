/**
 * Velvet Vogue — main.js  v2.1
 * Modules: Nav · Cart State · Cart Drawer · Toast · Auth Forms · Checkout
 */
'use strict';

/* ════════════════════════════════════════════════════════
   1. UTILITIES
════════════════════════════════════════════════════════ */
const $ = (sel, ctx = document) => ctx.querySelector(sel);
const $$ = (sel, ctx = document) => [...ctx.querySelectorAll(sel)];
function fmt(n) { return '£' + Number(n).toFixed(2); }
function rootPath() {
  return window.location.pathname.includes('/pages/') ? '../' : '';
}

/* ════════════════════════════════════════════════════════
   2. TOAST NOTIFICATIONS
════════════════════════════════════════════════════════ */
(function initToasts() {
  const c = document.createElement('div');
  c.className = 'toast-container';
  c.setAttribute('aria-live', 'polite');
  document.body.appendChild(c);
  window._toastContainer = c;
})();

function showToast(msg, type = 'success', duration = 3200) {
  const icons = { success: '✓', error: '✕', info: 'ℹ' };
  const t = document.createElement('div');
  t.className = `toast toast--${type}`;
  t.setAttribute('role', 'status');
  t.innerHTML = `<span class="toast__icon" aria-hidden="true">${icons[type] || 'ℹ'}</span><span>${msg}</span>`;
  window._toastContainer.appendChild(t);
  requestAnimationFrame(() => requestAnimationFrame(() => t.classList.add('show')));
  setTimeout(() => { t.classList.remove('show'); setTimeout(() => t.remove(), 400); }, duration);
}

/* ════════════════════════════════════════════════════════
   3. CART STATE
════════════════════════════════════════════════════════ */
const Cart = {
  get() { try { return JSON.parse(localStorage.getItem('vv_cart_v2') || '[]'); } catch { return []; } },
  save(items) { localStorage.setItem('vv_cart_v2', JSON.stringify(items)); Cart.broadcast(); },
  broadcast() { document.dispatchEvent(new CustomEvent('cartUpdated', { detail: Cart.get() })); },
  add(product) {
    const items = Cart.get();
    const idx = items.findIndex(i => i.id === product.id && i.size === product.size);
    if (idx > -1) items[idx].qty = Math.min(items[idx].qty + 1, 10);
    else items.push({ ...product, qty: 1 });
    Cart.save(items);
    showToast(`<strong>${product.name}</strong> added to your bag`, 'success');
  },
  remove(id, size) { Cart.save(Cart.get().filter(i => !(i.id === id && i.size === size))); },
  updateQty(id, size, qty) {
    const items = Cart.get();
    const idx = items.findIndex(i => i.id === id && i.size === size);
    if (idx > -1) {
      if (qty < 1) { Cart.remove(id, size); return; }
      items[idx].qty = Math.min(qty, 10);
      Cart.save(items);
    }
  },
  clear() { localStorage.removeItem('vv_cart_v2'); Cart.broadcast(); },
  total(items) { return items.reduce((s, i) => s + i.price * i.qty, 0); },
  count(items) { return items.reduce((s, i) => s + i.qty, 0); }
};

/* ════════════════════════════════════════════════════════
   4. AUTH STATE
════════════════════════════════════════════════════════ */
const Auth = {
  getUser() { try { return JSON.parse(localStorage.getItem('vv_user')); } catch { return null; } },
  login(data) { localStorage.setItem('vv_user', JSON.stringify(data)); document.dispatchEvent(new CustomEvent('authChanged')); },
  logout() {
    localStorage.removeItem('vv_user');
    document.dispatchEvent(new CustomEvent('authChanged'));
    showToast('You have been signed out.', 'info');
    setTimeout(() => { window.location.href = rootPath() + 'index.html'; }, 700);
  },
  isLoggedIn() { return !!Auth.getUser(); }
};

/* ════════════════════════════════════════════════════════
   5. NAVIGATION
════════════════════════════════════════════════════════ */
(function initNav() {
  const hamburger = $('.navbar__hamburger');
  const navWrap   = $('.navbar__nav-wrap');
  if (hamburger && navWrap) {
    hamburger.addEventListener('click', () => {
      const open = navWrap.classList.toggle('is-open');
      hamburger.setAttribute('aria-expanded', open.toString());
    });
    navWrap.querySelectorAll('a').forEach(a => a.addEventListener('click', () => {
      navWrap.classList.remove('is-open');
      hamburger.setAttribute('aria-expanded', 'false');
    }));
    document.addEventListener('click', e => {
      if (!hamburger.contains(e.target) && !navWrap.contains(e.target)) {
        navWrap.classList.remove('is-open');
        hamburger.setAttribute('aria-expanded', 'false');
      }
    });
  }

  function updateBadge(items) {
    $$('.cart-badge').forEach(b => {
      const c = Cart.count(items);
      b.textContent = c;
      b.hidden = c === 0;
    });
  }
  document.addEventListener('cartUpdated', e => updateBadge(e.detail));
  updateBadge(Cart.get());

  function updateAuthUI() {
    const user = Auth.getUser();
    $$('[data-auth-link]').forEach(el => {
      el.textContent = user ? user.firstName + "'s Account" : 'Login';
      el.href = user ? (rootPath() + 'pages/account.html') : (rootPath() + 'pages/login.html');
    });
    $$('[data-logout-btn]').forEach(btn => { btn.style.display = user ? 'inline-flex' : 'none'; });
  }
  document.addEventListener('authChanged', updateAuthUI);
  updateAuthUI();
})();

/* ════════════════════════════════════════════════════════
   6. CART DRAWER
════════════════════════════════════════════════════════ */
(function initCartDrawer() {
  const overlay = $('#cartOverlay');
  const drawer  = $('#cartDrawer');
  if (!overlay || !drawer) return;

  function open()  {
    overlay.classList.add('is-open'); drawer.classList.add('is-open');
    drawer.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
    renderDrawer();
  }
  function close() {
    overlay.classList.remove('is-open'); drawer.classList.remove('is-open');
    drawer.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
  }
  window.openCartDrawer  = open;
  window.closeCartDrawer = close;
  window.renderCartDrawer = renderDrawer;

  overlay.addEventListener('click', close);
  $('#cartClose')?.addEventListener('click', close);
  document.addEventListener('keydown', e => { if (e.key === 'Escape') close(); });
  $$('[data-open-cart]').forEach(btn => btn.addEventListener('click', open));

  function renderDrawer() {
    const items = Cart.get();
    const body  = $('#cartDrawerBody');
    const countEl  = $('#cartDrawerCount');
    const footerEl = $('#cartDrawerFooter');
    if (!body) return;

    const count = Cart.count(items);
    if (countEl) countEl.textContent = count === 0 ? '' : `(${count} items)`;

    if (items.length === 0) {
      body.innerHTML = `<div class="cart-empty">
        <div class="cart-empty__icon" aria-hidden="true">🛍</div>
        <p>Your bag is empty.</p>
        <a href="${rootPath()}pages/services.html" class="btn btn--outline btn--sm" onclick="closeCartDrawer()">Shop Now</a>
      </div>`;
      if (footerEl) footerEl.style.display = 'none';
      return;
    }
    if (footerEl) footerEl.style.display = '';

    body.innerHTML = items.map(item => `
      <div class="cart-item" role="listitem">
        <img class="cart-item__img" src="${rootPath()}images/${item.image || 'product-placeholder.jpg'}" alt="${item.name}" loading="lazy">
        <div>
          <p class="cart-item__name">${item.name}</p>
          <p class="cart-item__variant">Size: ${item.size || 'One Size'}</p>
          <p class="cart-item__price">${fmt(item.price * item.qty)}</p>
          <div class="qty-control">
            <button class="qty-btn" aria-label="Decrease quantity"
              onclick="Cart.updateQty('${item.id}','${item.size}',${item.qty-1});renderCartDrawer()">−</button>
            <span class="qty-display">${item.qty}</span>
            <button class="qty-btn" aria-label="Increase quantity"
              onclick="Cart.updateQty('${item.id}','${item.size}',${item.qty+1});renderCartDrawer()">+</button>
          </div>
        </div>
        <button class="cart-item__remove" aria-label="Remove ${item.name}"
          onclick="Cart.remove('${item.id}','${item.size}');renderCartDrawer()">✕</button>
      </div>`).join('');

    const sub      = Cart.total(items);
    const shipping = sub >= 60 ? 0 : 4.99;
    footerEl.innerHTML = `
      <div class="cart-summary-row"><span>Subtotal</span><span>${fmt(sub)}</span></div>
      <div class="cart-summary-row"><span>Shipping</span><span>${shipping === 0 ? '<span style="color:var(--color-success)">Free</span>' : fmt(shipping)}</span></div>
      ${sub < 60 ? `<p style="font-size:0.74rem;color:var(--color-muted);margin:0.3rem 0 0.6rem">Spend ${fmt(60-sub)} more for free shipping.</p>` : ''}
      <div class="cart-summary-row cart-summary-row--total"><span>Total</span><span>${fmt(sub+shipping)}</span></div>
      <a href="${rootPath()}pages/cart.html" onclick="closeCartDrawer()" class="btn btn--primary" style="width:100%;justify-content:center;margin-top:1rem;">View Bag</a>
      <a href="${rootPath()}pages/checkout.html" onclick="closeCartDrawer()" class="btn btn--outline" style="width:100%;justify-content:center;margin-top:0.5rem;">Checkout →</a>`;
  }

  document.addEventListener('cartUpdated', () => {
    if (drawer.classList.contains('is-open')) renderDrawer();
  });
})();

/* ════════════════════════════════════════════════════════
   7. ADD-TO-CART BUTTONS
════════════════════════════════════════════════════════ */
(function initAddToCart() {
  $$('[data-add-to-cart]').forEach(btn => {
    btn.addEventListener('click', () => {
      const id    = btn.dataset.addToCart;
      const name  = btn.dataset.name;
      const price = parseFloat(btn.dataset.price);
      const image = btn.dataset.image || 'product-placeholder.jpg';
      const card  = btn.closest('[data-product-card]');
      const sizeEl = card?.querySelector('[data-size-select]');
      const size   = sizeEl ? sizeEl.value : 'One Size';
      if (sizeEl && !sizeEl.value) {
        showToast('Please select a size first.', 'error');
        sizeEl.focus();
        return;
      }
      Cart.add({ id, name, price, image, size });
      if (window.openCartDrawer) openCartDrawer();
    });
  });
})();

/* ════════════════════════════════════════════════════════
   8. SCROLL ANIMATIONS
════════════════════════════════════════════════════════ */
if ('IntersectionObserver' in window) {
  const obs = new IntersectionObserver(entries => {
    entries.forEach(e => { if (e.isIntersecting) { e.target.classList.add('in-view'); obs.unobserve(e.target); } });
  }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });
  $$('.animate-fade-up').forEach(el => obs.observe(el));
}

/* ════════════════════════════════════════════════════════
   9. FORM VALIDATION ENGINE
════════════════════════════════════════════════════════ */
function validateForm(formId, rules, onSuccess) {
  const form = document.getElementById(formId);
  if (!form) return;

  const getField = n => form.querySelector(`[name="${n}"]`);
  const getError = n => form.querySelector(`[data-error="${n}"]`);

  function check(name, value) {
    const r = rules[name];
    if (!r) return null;
    if (r.required && !value.trim()) return `${r.label} is required.`;
    if (r.minLength && value.trim().length < r.minLength) return `${r.label} must be at least ${r.minLength} characters.`;
    if (r.pattern && !r.pattern.test(value.trim())) return r.patternMsg || `Please enter a valid ${r.label.toLowerCase()}.`;
    if (r.match) {
      const matchVal = getField(r.match)?.value || '';
      if (value !== matchVal) return r.matchMsg || `${r.label} does not match.`;
    }
    return null;
  }

  function setErr(name, msg) {
    const f = getField(name), e = getError(name);
    if (!f) return;
    f.classList.toggle('is-invalid', !!msg);
    f.classList.toggle('is-valid', !msg && f.value.trim().length > 0);
    f.setAttribute('aria-invalid', msg ? 'true' : 'false');
    if (e) { e.textContent = msg || ''; e.classList.toggle('visible', !!msg); }
  }

  Object.keys(rules).forEach(name => {
    const f = getField(name);
    if (!f) return;
    f.addEventListener('blur',  () => setErr(name, check(name, f.value)));
    f.addEventListener('input', () => { if (f.classList.contains('is-invalid')) setErr(name, check(name, f.value)); });
  });

  form.addEventListener('submit', e => {
    e.preventDefault();
    let valid = true;
    let firstInvalid = null;
    Object.keys(rules).forEach(name => {
      const f = getField(name);
      if (!f) return;
      const err = check(name, f.value);
      setErr(name, err);
      if (err) { valid = false; if (!firstInvalid) firstInvalid = f; }
    });
    if (!valid) { firstInvalid?.focus(); return; }
    onSuccess(form);
  });
}

/* ════════════════════════════════════════════════════════
   10. LOGIN FORM
════════════════════════════════════════════════════════ */
validateForm('loginForm', {
  email:    { required: true, pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/, patternMsg: 'Please enter a valid email address.', label: 'Email' },
  password: { required: true, minLength: 6, label: 'Password' }
}, form => {
  const email = form.querySelector('[name="email"]').value.trim();
  const firstName = email.split('@')[0].replace(/[^a-zA-Z]/g, '');
  const name = firstName.charAt(0).toUpperCase() + firstName.slice(1);
  Auth.login({ email, firstName: name, lastName: '' });
  showToast(`Welcome back, ${name}!`, 'success');
  const redirect = new URLSearchParams(window.location.search).get('redirect') || rootPath() + 'index.html';
  setTimeout(() => { window.location.href = redirect; }, 800);
});

/* ════════════════════════════════════════════════════════
   11. REGISTER FORM
════════════════════════════════════════════════════════ */
validateForm('registerForm', {
  firstName:       { required: true, minLength: 2, label: 'First name' },
  lastName:        { required: true, minLength: 2, label: 'Last name' },
  email:           { required: true, pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/, patternMsg: 'Please enter a valid email.', label: 'Email' },
  password:        { required: true, minLength: 8, label: 'Password' },
  confirmPassword: { required: true, match: 'password', matchMsg: 'Passwords do not match.', label: 'Confirm password' }
}, form => {
  const firstName = form.querySelector('[name="firstName"]').value.trim();
  const lastName  = form.querySelector('[name="lastName"]').value.trim();
  const email     = form.querySelector('[name="email"]').value.trim();
  Auth.login({ email, firstName, lastName });
  showToast(`Welcome to Velvet Vogue, ${firstName}!`, 'success');
  setTimeout(() => { window.location.href = rootPath() + 'index.html'; }, 800);
});

/* Password strength meter */
(function () {
  const pw  = document.querySelector('#regPassword');
  const bar = document.querySelector('.password-strength__bar');
  const lbl = document.querySelector('.password-strength-label');
  if (!pw || !bar) return;
  pw.addEventListener('input', () => {
    const v = pw.value;
    let s = 0;
    if (v.length >= 8) s++;
    if (/[A-Z]/.test(v)) s++;
    if (/[0-9]/.test(v)) s++;
    if (/[^A-Za-z0-9]/.test(v)) s++;
    bar.className = 'password-strength__bar';
    if (!v) { bar.style.width = '0'; if (lbl) lbl.textContent = ''; return; }
    const map = [[1,'strength-weak','Weak','var(--color-error)'],[2,'strength-medium','Medium','#e5a020'],[4,'strength-strong','Strong','var(--color-success)']];
    const [,cls,txt,col] = s <= 1 ? map[0] : s <= 2 ? map[1] : map[2];
    bar.classList.add(cls);
    if (lbl) { lbl.textContent = txt; lbl.style.color = col; }
  });
})();

/* Toggle password visibility */
$$('.toggle-password').forEach(btn => {
  btn.addEventListener('click', () => {
    const inp = btn.previousElementSibling;
    const hidden = inp.type === 'password';
    inp.type = hidden ? 'text' : 'password';
    btn.textContent = hidden ? '🙈' : '👁';
    btn.setAttribute('aria-label', hidden ? 'Hide password' : 'Show password');
  });
});

/* ════════════════════════════════════════════════════════
   12. CONTACT FORM
════════════════════════════════════════════════════════ */
validateForm('contactForm', {
  firstName: { required: true, minLength: 2, label: 'First name' },
  lastName:  { required: true, minLength: 2, label: 'Last name' },
  email:     { required: true, pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/, patternMsg: 'Please enter a valid email.', label: 'Email' },
  subject:   { required: true, minLength: 3, label: 'Subject' },
  message:   { required: true, minLength: 20, label: 'Message' }
}, form => {
  const banner = document.getElementById('formSuccess');
  if (banner) { banner.hidden = false; banner.focus(); }
  form.reset();
  $$('.form-control', form).forEach(f => f.classList.remove('is-valid','is-invalid'));
  showToast("Message sent! We'll respond within 24 hours.", 'success');
});

/* ════════════════════════════════════════════════════════
   13. CART PAGE
════════════════════════════════════════════════════════ */
(function initCartPage() {
  const tbody = document.getElementById('cartTableBody');
  if (!tbody) return;

  function render() {
    const items      = Cart.get();
    const emptyEl    = document.getElementById('cartEmptyState');
    const contentEl  = document.getElementById('cartContent');
    if (items.length === 0) {
      if (emptyEl)   emptyEl.hidden   = false;
      if (contentEl) contentEl.hidden = true;
      return;
    }
    if (emptyEl)   emptyEl.hidden   = true;
    if (contentEl) contentEl.hidden = false;

    tbody.innerHTML = items.map(item => `
      <tr>
        <td>
          <div class="cart-table-item">
            <img class="cart-table-img" src="${rootPath()}images/${item.image||'product-placeholder.jpg'}" alt="${item.name}" loading="lazy">
            <div>
              <p class="cart-table-name">${item.name}</p>
              <p class="cart-table-variant">Size: ${item.size||'One Size'}</p>
              <button style="background:none;border:none;color:var(--color-error);font-size:0.78rem;cursor:pointer;padding:0;margin-top:0.4rem;"
                onclick="Cart.remove('${item.id}','${item.size}')">Remove</button>
            </div>
          </div>
        </td>
        <td>${fmt(item.price)}</td>
        <td>
          <div class="qty-control">
            <button class="qty-btn" aria-label="Decrease" onclick="Cart.updateQty('${item.id}','${item.size}',${item.qty-1})">−</button>
            <span class="qty-display">${item.qty}</span>
            <button class="qty-btn" aria-label="Increase" onclick="Cart.updateQty('${item.id}','${item.size}',${item.qty+1})">+</button>
          </div>
        </td>
        <td style="font-weight:600;color:var(--color-primary);">${fmt(item.price*item.qty)}</td>
      </tr>`).join('');

    const sub = Cart.total(items), ship = sub >= 60 ? 0 : 4.99;
    const set = (id, v) => { const el = document.getElementById(id); if (el) el.textContent = v; };
    set('summarySubtotal', fmt(sub));
    set('summaryShipping', ship === 0 ? 'Free' : fmt(ship));
    set('summaryTotal',    fmt(sub + ship));
  }

  document.addEventListener('cartUpdated', render);
  render();

  /* Promo code */
  document.getElementById('promoForm')?.addEventListener('submit', e => {
    e.preventDefault();
    const code = e.target.querySelector('[name="promoCode"]').value.trim().toUpperCase();
    if (code === 'VOGUE15') {
      const sub  = Cart.total(Cart.get());
      const ship = sub >= 60 ? 0 : 4.99;
      const disc = sub * 0.15;
      const savEl = document.getElementById('promoSavingsRow');
      if (savEl) { savEl.hidden = false; savEl.querySelector('span:last-child').textContent = '-' + fmt(disc); }
      const totEl = document.getElementById('summaryTotal');
      if (totEl) totEl.textContent = fmt(sub * 0.85 + ship);
      showToast('Promo code applied: 15% off!', 'success');
    } else { showToast('Invalid promo code. Try VOGUE15.', 'error'); }
  });
})();

/* ════════════════════════════════════════════════════════
   14. CHECKOUT
════════════════════════════════════════════════════════ */
(function initCheckout() {
  const orderItemsEl = document.getElementById('checkoutOrderItems');
  if (!orderItemsEl) return;

  function renderSidebar() {
    const items = Cart.get();
    const sub   = Cart.total(items);
    const ship  = sub >= 60 ? 0 : 4.99;
    orderItemsEl.innerHTML = !items.length
      ? '<p style="color:var(--color-muted);font-size:.88rem;">Your bag is empty.</p>'
      : items.map(item => `
          <div class="checkout-order-item">
            <div style="position:relative;flex-shrink:0;">
              <img src="${rootPath()}images/${item.image||'product-placeholder.jpg'}"
                   alt="${item.name}" style="width:56px;height:70px;object-fit:cover;border-radius:var(--radius-sm);" loading="lazy">
              <span class="checkout-order-qty">${item.qty}</span>
            </div>
            <span class="checkout-order-name">${item.name}<br><small style="color:var(--color-muted);">Size: ${item.size||'One Size'}</small></span>
            <span class="checkout-order-price">${fmt(item.price*item.qty)}</span>
          </div>`).join('');

    const set = (id, v) => { const el = document.getElementById(id); if (el) el.textContent = v; };
    set('checkoutSubtotal', fmt(sub));
    set('checkoutShipping', ship === 0 ? 'Free' : fmt(ship));
    set('checkoutTotal',    fmt(sub + ship));
  }

  renderSidebar();
  document.addEventListener('cartUpdated', renderSidebar);

  /* Payment method selection */
  $$('.payment-method').forEach(m => {
    m.addEventListener('click', () => {
      $$('.payment-method').forEach(x => x.classList.remove('selected'));
      m.classList.add('selected');
      m.querySelector('input[type="radio"]').checked = true;
      const cardFields = document.getElementById('cardFields');
      if (cardFields) cardFields.style.display = m.querySelector('input').value === 'card' ? '' : 'none';
    });
  });

  /* Step navigation */
  const steps  = $$('.checkout-step[data-step]');
  const panels = $$('.checkout-panel[data-step]');

  function goToStep(n) {
    steps.forEach(s => {
      s.classList.remove('active','done');
      const sn = parseInt(s.dataset.step);
      if (sn < n) s.classList.add('done');
      if (sn === n) s.classList.add('active');
    });
    panels.forEach(p => { p.hidden = parseInt(p.dataset.step) !== n; });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  $$('[data-go-step]').forEach(btn => {
    btn.addEventListener('click', () => {
      const target = parseInt(btn.dataset.goStep);
      if (target === 2) {
        const required = $$('.checkout-panel[data-step="1"] [required]');
        let ok = true;
        required.forEach(inp => {
          if (!inp.value.trim()) { inp.classList.add('is-invalid'); ok = false; }
          else inp.classList.remove('is-invalid');
        });
        if (!ok) { showToast('Please fill in all required shipping fields.', 'error'); return; }
      }
      goToStep(target);
    });
  });

  /* Place order */
  document.getElementById('placeOrderBtn')?.addEventListener('click', () => {
    if (!Cart.get().length) { showToast('Your cart is empty.', 'error'); return; }
    const payMethod = $('input[name="paymentMethod"]:checked')?.value;
    if (payMethod === 'card') {
      const num = $('[name="cardNumber"]')?.value.replace(/\s/g,'') || '';
      if (num.length < 16) { showToast('Please enter a valid 16-digit card number.', 'error'); return; }
      const expiry = $('[name="cardExpiry"]')?.value || '';
      if (!/^\d{2}\/\d{2}$/.test(expiry)) { showToast('Please enter a valid expiry (MM/YY).', 'error'); return; }
      const cvv = $('[name="cardCvv"]')?.value || '';
      if (cvv.length < 3) { showToast('Please enter a valid CVV.', 'error'); return; }
    }
    const btn = document.getElementById('placeOrderBtn');
    btn.textContent = 'Processing…';
    btn.disabled = true;
    setTimeout(() => {
      const orderNum = 'VV-' + Math.floor(100000 + Math.random() * 900000);
      Cart.clear();
      goToStep(4);
      const el = document.getElementById('orderNumber');
      if (el) el.textContent = orderNum;
    }, 1800);
  });

  /* Card field auto-formatting */
  $('[name="cardNumber"]')?.addEventListener('input', function() {
    let v = this.value.replace(/\D/g,'').substring(0,16);
    this.value = v.replace(/(.{4})/g,'$1 ').trim();
  });
  $('[name="cardExpiry"]')?.addEventListener('input', function() {
    let v = this.value.replace(/\D/g,'').substring(0,4);
    if (v.length > 2) v = v.slice(0,2) + '/' + v.slice(2);
    this.value = v;
  });
  $('[name="cardCvv"]')?.addEventListener('input', function() {
    this.value = this.value.replace(/\D/g,'').substring(0,4);
  });
})();

/* ════════════════════════════════════════════════════════
   15. SMOOTH ANCHOR SCROLL
════════════════════════════════════════════════════════ */
$$('a[href^="#"]').forEach(a => {
  a.addEventListener('click', e => {
    const t = document.querySelector(a.getAttribute('href'));
    if (t) { e.preventDefault(); t.scrollIntoView({ behavior:'smooth', block:'start' }); }
  });
});

/* Expose globals */
window.Cart = Cart;
window.Auth = Auth;
