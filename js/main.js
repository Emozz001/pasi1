/**
 * Velvet Vogue — Main JavaScript
 * Handles: navigation, form validation, scroll animations, cart
 */

'use strict';

/* ======================================================
   NAV: Mobile hamburger toggle
   ====================================================== */
const hamburger   = document.querySelector('.navbar__hamburger');
const navWrap     = document.querySelector('.navbar__nav-wrap');

if (hamburger && navWrap) {
  hamburger.addEventListener('click', () => {
    const isOpen = navWrap.classList.toggle('is-open');
    hamburger.setAttribute('aria-expanded', isOpen.toString());
  });

  // Close nav when a link is clicked (mobile)
  navWrap.querySelectorAll('a').forEach(link => {
    link.addEventListener('click', () => {
      navWrap.classList.remove('is-open');
      hamburger.setAttribute('aria-expanded', 'false');
    });
  });

  // Close nav on outside click
  document.addEventListener('click', (e) => {
    if (!hamburger.contains(e.target) && !navWrap.contains(e.target)) {
      navWrap.classList.remove('is-open');
      hamburger.setAttribute('aria-expanded', 'false');
    }
  });
}

/* ======================================================
   SCROLL ANIMATIONS: IntersectionObserver fade-up
   ====================================================== */
if ('IntersectionObserver' in window) {
  const animEls = document.querySelectorAll('.animate-fade-up');
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('in-view');
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });

  animEls.forEach(el => observer.observe(el));
}

/* ======================================================
   FORM VALIDATION: Contact Form
   ====================================================== */
const contactForm = document.getElementById('contactForm');

if (contactForm) {
  const rules = {
    firstName: { required: true, minLength: 2, label: 'First name' },
    lastName:  { required: true, minLength: 2, label: 'Last name' },
    email:     { required: true, pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/, label: 'Email' },
    subject:   { required: true, minLength: 3, label: 'Subject' },
    message:   { required: true, minLength: 20, label: 'Message' },
  };

  function getField(name) {
    return contactForm.querySelector(`[name="${name}"]`);
  }

  function getError(name) {
    return contactForm.querySelector(`[data-error="${name}"]`);
  }

  function validateField(name, value) {
    const rule = rules[name];
    if (!rule) return true;
    if (rule.required && !value.trim()) {
      return `${rule.label} is required.`;
    }
    if (rule.minLength && value.trim().length < rule.minLength) {
      return `${rule.label} must be at least ${rule.minLength} characters.`;
    }
    if (rule.pattern && !rule.pattern.test(value.trim())) {
      return `Please enter a valid ${rule.label.toLowerCase()}.`;
    }
    return null;
  }

  function showError(name, msg) {
    const field = getField(name);
    const error = getError(name);
    if (!field) return;
    field.classList.toggle('is-invalid', !!msg);
    field.classList.toggle('is-valid',  !msg);
    if (error) {
      error.textContent = msg || '';
      error.classList.toggle('visible', !!msg);
    }
    if (field) field.setAttribute('aria-invalid', !!msg ? 'true' : 'false');
  }

  // Live validation on blur
  Object.keys(rules).forEach(name => {
    const field = getField(name);
    if (!field) return;
    field.addEventListener('blur', () => {
      const err = validateField(name, field.value);
      showError(name, err);
    });
    field.addEventListener('input', () => {
      if (field.classList.contains('is-invalid')) {
        const err = validateField(name, field.value);
        showError(name, err);
      }
    });
  });

  contactForm.addEventListener('submit', (e) => {
    e.preventDefault();
    let valid = true;
    Object.keys(rules).forEach(name => {
      const field = getField(name);
      if (!field) return;
      const err = validateField(name, field.value);
      showError(name, err);
      if (err) valid = false;
    });

    if (valid) {
      // In a real deployment this would POST to a backend endpoint
      const successBanner = document.getElementById('formSuccess');
      if (successBanner) {
        successBanner.hidden = false;
        successBanner.focus();
      }
      contactForm.reset();
      contactForm.querySelectorAll('.form-control').forEach(f => {
        f.classList.remove('is-valid', 'is-invalid');
      });
    }
  });
}

/* ======================================================
   MINI CART: localStorage-based
   ====================================================== */
function getCart() {
  try {
    return JSON.parse(localStorage.getItem('vv_cart') || '[]');
  } catch { return []; }
}

function saveCart(cart) {
  localStorage.setItem('vv_cart', JSON.stringify(cart));
}

function updateCartCount() {
  const badge = document.querySelector('.cart-count');
  if (!badge) return;
  const count = getCart().reduce((sum, item) => sum + item.qty, 0);
  badge.textContent = count;
  badge.hidden = count === 0;
}

function addToCart(id, name, price) {
  const cart = getCart();
  const existing = cart.find(i => i.id === id);
  if (existing) {
    existing.qty += 1;
  } else {
    cart.push({ id, name, price, qty: 1 });
  }
  saveCart(cart);
  updateCartCount();
  // Visual feedback
  const btn = document.querySelector(`[data-add-to-cart="${id}"]`);
  if (btn) {
    const original = btn.textContent;
    btn.textContent = '✓ Added';
    btn.disabled = true;
    setTimeout(() => {
      btn.textContent = original;
      btn.disabled = false;
    }, 1500);
  }
}

// Attach add-to-cart button listeners
document.querySelectorAll('[data-add-to-cart]').forEach(btn => {
  btn.addEventListener('click', () => {
    addToCart(btn.dataset.addToCart, btn.dataset.name, parseFloat(btn.dataset.price));
  });
});

updateCartCount();

/* ======================================================
   SMOOTH scroll for in-page anchors
   ====================================================== */
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
  anchor.addEventListener('click', (e) => {
    const target = document.querySelector(anchor.getAttribute('href'));
    if (target) {
      e.preventDefault();
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  });
});
