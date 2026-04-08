// VA by Anna - Main JavaScript

document.addEventListener('DOMContentLoaded', init);

function init() {
  updateCopyrightYear();
  setActiveNav();
  initMobileNav();
  initContactForm();
}

// ---------------------------------------------------------------------------
// Copyright year
// ---------------------------------------------------------------------------

function updateCopyrightYear() {
  const year = String(new Date().getFullYear());
  document.querySelectorAll('.copyright').forEach(el => {
    el.textContent = el.textContent.replace(/\d{4}/, year);
  });
}

// ---------------------------------------------------------------------------
// Active navigation
// ---------------------------------------------------------------------------

function setActiveNav() {
  const page = document.body.dataset.page;
  if (!page) return;
  document.querySelectorAll('.nav-link[data-page], .nav-mobile-link[data-page]').forEach(el => {
    if (el.dataset.page === page) {
      el.classList.add('active');
      el.setAttribute('aria-current', 'page');
    } else {
      el.classList.remove('active');
      el.removeAttribute('aria-current');
    }
  });
}

// ---------------------------------------------------------------------------
// Mobile navigation
// ---------------------------------------------------------------------------

function initMobileNav() {
  const toggle = document.querySelector('.mobile-menu-toggle');
  const nav    = document.querySelector('.nav-mobile');
  if (!toggle || !nav) return;

  let isOpen = false;

  function open() {
    isOpen = true;
    toggle.setAttribute('aria-expanded', 'true');
    toggle.classList.add('mobile-menu-toggle--active');
    nav.classList.add('nav-mobile--open');
    nav.setAttribute('aria-hidden', 'false');
    if (window.innerWidth < 768) document.body.style.overflow = 'hidden';
  }

  function close() {
    isOpen = false;
    toggle.setAttribute('aria-expanded', 'false');
    toggle.classList.remove('mobile-menu-toggle--active');
    nav.classList.remove('nav-mobile--open');
    nav.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
  }

  toggle.addEventListener('click', e => { e.preventDefault(); isOpen ? close() : open(); });
  nav.querySelectorAll('.nav-mobile-link').forEach(link => link.addEventListener('click', close));

  document.addEventListener('click', e => {
    if (isOpen && !toggle.contains(e.target) && !nav.contains(e.target)) close();
  });

  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && isOpen) { close(); toggle.focus(); }
  });

  let resizeTimer;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => { if (window.innerWidth >= 768 && isOpen) close(); }, 250);
  });
}

// ---------------------------------------------------------------------------
// Contact form
// ---------------------------------------------------------------------------

const RL_KEY    = 'cf_submissions';
const RL_MAX    = 3;
const RL_WINDOW = 60 * 60 * 1000; // 1 hour

function isRateLimited() {
  const now  = Date.now();
  const list = JSON.parse(localStorage.getItem(RL_KEY) || '[]');
  return list.filter(ts => now - ts < RL_WINDOW).length >= RL_MAX;
}

function recordSubmission() {
  const now  = Date.now();
  const list = JSON.parse(localStorage.getItem(RL_KEY) || '[]')
    .filter(ts => now - ts < RL_WINDOW);
  list.push(now);
  localStorage.setItem(RL_KEY, JSON.stringify(list));
}

function validateField(name, value) {
  const v = value.trim();
  switch (name) {
    case 'firstName':
    case 'lastName':
      if (!v)           return 'This field is required.';
      if (v.length < 2) return 'Must be at least 2 characters.';
      if (!/^[\p{L}\s'\-]+$/u.test(v)) return 'Please enter a valid name.';
      return null;
    case 'email':
      if (!v) return 'Email is required.';
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v)) return 'Please enter a valid email address.';
      return null;
    case 'phone':
      if (!v) return null; // optional
      if (!/^[\+\d\s\-\(\)]{7,20}$/.test(v)) return 'Please enter a valid phone number.';
      return null;
    case 'message':
      if (!v)            return 'Message is required.';
      if (v.length < 10) return 'Message must be at least 10 characters.';
      return null;
    default:
      return null;
  }
}

function setFieldError(form, name, message) {
  const input = form.querySelector(`[name="${name}"]`);
  const error = form.querySelector(`#${name}-error`);
  if (input) { input.classList.add('error'); input.setAttribute('aria-invalid', 'true'); }
  if (error) { error.textContent = message; error.style.display = 'block'; }
}

function clearFieldError(form, name) {
  const input = form.querySelector(`[name="${name}"]`);
  const error = form.querySelector(`#${name}-error`);
  if (input) { input.classList.remove('error'); input.setAttribute('aria-invalid', 'false'); }
  if (error) { error.style.display = 'none'; }
}

function validateForm(form) {
  const fields = ['firstName', 'lastName', 'email', 'phone', 'message'];
  let valid = true;
  fields.forEach(name => {
    const input = form.querySelector(`[name="${name}"]`);
    if (!input) return;
    const msg = validateField(name, input.value);
    if (msg) { setFieldError(form, name, msg); valid = false; }
    else      { clearFieldError(form, name); }
  });
  return valid;
}

function showFeedback(el, message, type) {
  if (!el) return;
  el.className = `form-feedback ${type}`;
  el.textContent = message;
  el.style.display = 'block';
  el.style.opacity = '1';
  el.style.transform = 'none';
}

function setLoading(btn, loading) {
  btn.disabled = loading;
  const text    = btn.querySelector('.button-text');
  const spinner = btn.querySelector('.button-loading');
  if (text)    text.style.display    = loading ? 'none' : '';
  if (spinner) spinner.style.display = loading ? 'inline' : 'none';
}

function initContactForm() {
  const form = document.getElementById('contactForm');
  if (!form) return;

  const fields    = ['firstName', 'lastName', 'email', 'phone', 'message'];
  const feedback  = document.getElementById('form-feedback');
  const submitBtn = document.getElementById('submit-button');

  // Real-time validation on blur; clear on input
  fields.forEach(name => {
    const input = form.querySelector(`[name="${name}"]`);
    if (!input) return;
    input.addEventListener('blur', () => {
      const msg = validateField(name, input.value);
      if (msg) setFieldError(form, name, msg);
      else     clearFieldError(form, name);
    });
    input.addEventListener('input', () => clearFieldError(form, name));
  });

  form.addEventListener('submit', async e => {
    // Prevent native form POST first — must be the very first thing
    e.preventDefault();

    if (!validateForm(form)) {
      const firstBad = form.querySelector('[aria-invalid="true"]');
      if (firstBad) firstBad.focus();
      return;
    }

    if (isRateLimited()) {
      showFeedback(feedback, 'You have sent 3 messages in the last hour. Please try again later.', 'error');
      return;
    }

    setLoading(submitBtn, true);

    try {
      const response = await fetch('/api/contact', {
        method: 'POST',
        body: new FormData(form)
      });

      if (response.ok) {
        recordSubmission();
        // Replace the form section with a thank you message
        const section = form.closest('section') || form.parentElement;
        section.innerHTML = `
          <div class="form-thank-you" role="status">
            <h2 class="section-title">Thank you!</h2>
            <p>Your message has been sent. I'll get back to you within 24 hours.</p>
          </div>
        `;
      } else {
        const msg = response.status === 429
          ? 'Too many requests. Please try again later.'
          : 'Something went wrong. Please try again or email anna@vabyanna.com directly.';
        showFeedback(feedback, msg, 'error');
        setLoading(submitBtn, false);
      }
    } catch {
      showFeedback(feedback, 'Network error. Please check your connection and try again.', 'error');
      setLoading(submitBtn, false);
    }
  });
}
