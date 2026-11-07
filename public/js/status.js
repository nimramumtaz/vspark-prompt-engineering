/* Track registration status */
(function () {
  'use strict';

  const form = document.getElementById('status-form');
  if (!form) return;

  const alertBox = document.getElementById('status-alert');
  const alertText = document.getElementById('status-alert-text');
  const result = document.getElementById('status-result');
  const btn = document.getElementById('status-btn');

  const params = new URLSearchParams(location.search);
  if (params.get('code')) document.getElementById('code').value = params.get('code');
  if (params.get('email')) document.getElementById('email').value = params.get('email');

  function showError(message) {
    alertText.textContent = message;
    alertBox.classList.remove('hidden');
    result.classList.add('hidden');
  }

  function render(reg) {
    document.getElementById('r-code').textContent = reg.code;
    document.getElementById('r-team').textContent = `${reg.team_name} · ${reg.team_size} member${reg.team_size > 1 ? 's' : ''}`;
    document.getElementById('r-badges').innerHTML = `${VSPARK.statusBadge(reg.status)} ${VSPARK.paymentBadge(reg.payment_status)}`;
    document.getElementById('r-category').textContent = (reg.category_name || '—') + (reg.duration ? ` · ${reg.duration}` : '');
    document.getElementById('r-leader').textContent = reg.leader_name;
    document.getElementById('r-university').textContent = reg.university;
    document.getElementById('r-size').textContent = `${reg.team_size} member${reg.team_size > 1 ? 's' : ''}`;
    document.getElementById('r-fee').textContent = VSPARK.money(reg.fee);
    document.getElementById('r-date').textContent = VSPARK.date(reg.created_at, true);

    const stepReview = document.getElementById('step-review');
    const stepFinal = document.getElementById('step-final');
    stepReview.classList.toggle('done', reg.status !== 'pending');
    stepFinal.classList.toggle('done', reg.status === 'approved');
    if (reg.status === 'rejected') {
      stepFinal.querySelector('.dot').textContent = '!';
      stepFinal.style.color = 'var(--danger)';
    } else {
      stepFinal.querySelector('.dot').textContent = '3';
      stepFinal.style.color = '';
    }

    const message = document.getElementById('r-message');
    const messageText = document.getElementById('r-message-text');
    let text = '';
    if (reg.status === 'approved') {
      text = reg.payment_status === 'paid'
        ? 'Your seat is confirmed and your fee is recorded. See you on December 10!'
        : 'Your seat is confirmed. Please pay the registration fee at the desk on event day.';
      message.className = 'alert alert-success';
    } else if (reg.status === 'rejected') {
      text = reg.admin_notes || 'This registration was not approved. Contact the organising team for details.';
      message.className = 'alert alert-error';
    } else {
      text = 'Your registration is waiting for organiser verification. This page updates automatically — check again later.';
      message.className = 'alert alert-info';
    }
    if (reg.admin_notes && reg.status !== 'rejected') {
      text += ' Note from organisers: ' + reg.admin_notes;
    }
    messageText.textContent = text;
    message.classList.remove('hidden');

    result.classList.remove('hidden');
    result.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    alertBox.classList.add('hidden');
    result.classList.add('hidden');

    const code = document.getElementById('code').value.trim();
    const email = document.getElementById('email').value.trim();

    if (!code || !email) {
      showError('Enter both your team code and leader email.');
      return;
    }

    btn.disabled = true;
    try {
      const res = await VSPARK.api(`/api/status?code=${encodeURIComponent(code)}&email=${encodeURIComponent(email)}`);
      if (!res.ok) {
        showError(res.data.error || 'No registration found for that code and email.');
        return;
      }
      render(res.data.registration);
    } catch {
      showError('Network error — please try again.');
    } finally {
      btn.disabled = false;
    }
  });
})();
