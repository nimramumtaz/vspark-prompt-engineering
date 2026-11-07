/* Shared helpers for every page. No framework, no build step. */
(function () {
  'use strict';

  const VSPARK = {};

  VSPARK.escape = function (value) {
    return String(value ?? '').replace(/[&<>"']/g, (ch) => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;'
    }[ch]));
  };

  VSPARK.api = async function (url, options = {}) {
    const response = await fetch(url, {
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
      ...options,
      body: options.body && typeof options.body !== 'string' ? JSON.stringify(options.body) : options.body
    });

    let payload = null;
    try {
      payload = await response.json();
    } catch {
      payload = { ok: false, error: 'Unexpected server response.' };
    }
    return { status: response.status, ok: response.ok && payload.ok !== false, data: payload };
  };

  VSPARK.money = function (value) {
    const n = Number(value) || 0;
    return 'PKR ' + n.toLocaleString('en-PK');
  };

  VSPARK.date = function (iso, withTime = false) {
    if (!iso) return '—';
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return '—';
    return d.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      ...(withTime ? { hour: '2-digit', minute: '2-digit' } : {})
    });
  };

  VSPARK.statusBadge = function (status) {
    const map = {
      approved: ['badge-approved', 'Approved'],
      pending: ['badge-pending', 'Pending'],
      rejected: ['badge-rejected', 'Rejected']
    };
    const [cls, label] = map[status] || map.pending;
    return `<span class="badge ${cls}">${label}</span>`;
  };

  VSPARK.paymentBadge = function (status) {
    return status === 'paid'
      ? '<span class="badge badge-approved">Paid</span>'
      : '<span class="badge">Unpaid</span>';
  };

  VSPARK.toast = function (message, type = 'info') {
    let stack = document.querySelector('.toast-stack');
    if (!stack) {
      stack = document.createElement('div');
      stack.className = 'toast-stack';
      document.body.appendChild(stack);
    }
    const el = document.createElement('div');
    el.className = `toast toast-${type}`;
    el.setAttribute('role', 'status');
    el.innerHTML = `<svg class="icon"><use href="/assets/icons.svg#${type === 'error' ? 'x' : 'check-circle'}"></use></svg><span>${VSPARK.escape(message)}</span>`;
    stack.appendChild(el);
    setTimeout(() => {
      el.style.opacity = '0';
      el.style.transform = 'translateY(6px)';
      el.style.transition = 'all .25s ease';
      setTimeout(() => el.remove(), 260);
    }, 4200);
  };

  VSPARK.icon = function (name, cls = 'icon') {
    return `<svg class="${cls}"><use href="/assets/icons.svg#${name}"></use></svg>`;
  };

  /** Debounce helper for search inputs. */
  VSPARK.debounce = function (fn, wait = 280) {
    let timer;
    return function (...args) {
      clearTimeout(timer);
      timer = setTimeout(() => fn.apply(this, args), wait);
    };
  };

  window.VSPARK = VSPARK;
})();
