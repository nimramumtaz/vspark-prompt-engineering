/* Admin sign-in */
(function () {
  'use strict';

  const form = document.getElementById('login-form');
  if (!form) return;

  const alertBox = document.getElementById('login-alert');
  const alertText = document.getElementById('login-alert-text');
  const btn = document.getElementById('login-btn');
  const password = document.getElementById('password');
  const toggle = document.getElementById('toggle-password');

  function showError(message) {
    alertText.textContent = message;
    alertBox.classList.remove('hidden');
  }

  toggle.addEventListener('click', () => {
    const isPassword = password.type === 'password';
    password.type = isPassword ? 'text' : 'password';
    toggle.setAttribute('aria-label', isPassword ? 'Hide password' : 'Show password');
    toggle.innerHTML = `<svg class="icon"><use href="/assets/icons.svg#${isPassword ? 'eye' : 'shield'}"></use></svg>`;
    password.focus();
  });

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    alertBox.classList.add('hidden');

    const email = document.getElementById('email').value.trim();
    const pass = password.value;

    if (!email || !pass) {
      showError('Enter your email and password.');
      return;
    }

    btn.disabled = true;
    const original = btn.innerHTML;
    btn.textContent = 'Signing in…';

    try {
      const res = await VSPARK.api('/api/admin/login', { method: 'POST', body: { email, password: pass } });
      if (!res.ok) {
        showError(res.data.error || 'Sign in failed. Please try again.');
        return;
      }
      window.location.href = '/admin/dashboard.html';
    } catch {
      showError('Network error — please try again.');
    } finally {
      btn.disabled = false;
      btn.innerHTML = original;
    }
  });
})();
