/* Prompt Engineering registration page */
(function () {
  'use strict';

  const form = document.getElementById('register-form');
  if (!form) return;

  const alertBox = document.getElementById('form-alert');
  const alertText = document.getElementById('form-alert-text');
  const submitBtn = document.getElementById('submit-btn');
  const shell = document.getElementById('register-shell');
  const successPanel = document.getElementById('success-panel');
  const details = document.getElementById('success-details');
  const codeEl = document.getElementById('team-code');

  const $ = (id) => document.getElementById(id);
  const sum = {
    category: $('sum-category'),
    duration: $('sum-duration'),
    size: $('sum-size'),
    team: $('sum-team')
  };

  let categories = [];
  let fee = 1000;

  function selectedCategory() {
    const checked = form.querySelector('input[name="category"]:checked');
    return checked ? categories.find((c) => c.slug === checked.value) || null : null;
  }

  function setError(name, message) {
    const field = form.querySelector(`[name="${name}"]`);
    const slot = form.querySelector(`[data-error="${name}"]`);
    if (field && field.type !== 'radio') field.classList.toggle('invalid', Boolean(message));
    if (slot) slot.textContent = message || '';
  }

  function clearErrors() {
    form.querySelectorAll('[data-error]').forEach((slot) => (slot.textContent = ''));
    form.querySelectorAll('.invalid').forEach((el) => el.classList.remove('invalid'));
  }

  function showAlert(message) {
    alertText.textContent = message;
    alertBox.classList.remove('hidden');
    alertBox.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }

  function hideAlert() {
    alertBox.classList.add('hidden');
  }

  function updateSummary() {
    const category = selectedCategory();
    sum.category.textContent = category ? category.name : 'Not selected';
    sum.duration.textContent = category ? category.duration : '—';
    sum.team.textContent = $('team_name').value.trim() || '—';

    const second = $('member2_name').value.trim() || $('member2_email').value.trim();
    sum.size.textContent = second ? '2 members' : '1 member';
  }

  function validate() {
    const errors = {};
    const emailRe = /^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i;

    if (!selectedCategory()) errors.category = 'Choose a prompt category.';
    if ($('team_name').value.trim().length < 3) errors.team_name = 'Team name must be at least 3 characters.';
    if ($('leader_name').value.trim().length < 3) errors.leader_name = 'Please enter the leader’s full name.';

    const email = $('leader_email').value.trim();
    if (!emailRe.test(email)) errors.leader_email = 'Enter a valid email address.';

    const phoneDigits = $('leader_phone').value.replace(/[^\d+]/g, '').replace(/^\+/, '');
    if (phoneDigits.length < 10 || phoneDigits.length > 15) errors.leader_phone = 'Enter a valid phone number (10–15 digits).';

    if ($('university').value.trim().length < 2) errors.university = 'Please enter your university or institute.';

    const cnicDigits = $('cnic').value.replace(/\D/g, '');
    if (cnicDigits.length && cnicDigits.length !== 13) errors.cnic = 'CNIC / B-Form must contain 13 digits.';

    const name2 = $('member2_name').value.trim();
    const email2 = $('member2_email').value.trim();
    if (name2 || email2) {
      if (name2.length < 3) errors.member2_name = 'Please enter the second member’s full name.';
      if (!emailRe.test(email2)) errors.member2_email = 'Enter a valid email for the second member.';
      if (email2 && email2.toLowerCase() === email.toLowerCase()) errors.member2_email = 'Second member needs a different email.';
    }

    if (!$('agree').checked) errors.agree = 'Please accept the competition rules.';

    return errors;
  }

  /* ---------------- Init ---------------- */
  VSPARK.api('/api/config')
    .then((res) => {
      if (!res.ok) throw new Error('Could not load the competition configuration.');
      categories = res.data.categories || [];
      fee = res.data.competition?.fee || fee;

      const requested = new URLSearchParams(location.search).get('category');
      if (requested && categories.some((c) => c.slug === requested)) {
        const input = form.querySelector(`input[name="category"][value="${requested}"]`);
        if (input) input.checked = true;
      }
      updateSummary();
    })
    .catch(() => {
      VSPARK.toast('Category details could not load. Durations will be confirmed by the organisers.', 'error');
    });

  /* ---------------- Interactions ---------------- */
  ['team_name', 'member2_name', 'member2_email'].forEach((id) => {
    $(id).addEventListener('input', updateSummary);
  });

  form.querySelectorAll('input[name="category"]').forEach((input) => {
    input.addEventListener('change', () => {
      setError('category', '');
      updateSummary();
    });
  });

  form.querySelectorAll('input, select').forEach((input) => {
    input.addEventListener('input', () => {
      if (input.closest('.field')?.querySelector('.invalid')) setError(input.name, '');
    });
  });

  /* Light CNIC formatting: 12345-1234567-1 */
  const cnic = $('cnic');
  cnic.addEventListener('input', () => {
    const digits = cnic.value.replace(/\D/g, '').slice(0, 13);
    let out = digits;
    if (digits.length > 5) out = digits.slice(0, 5) + '-' + digits.slice(5);
    if (digits.length > 12) out = digits.slice(0, 5) + '-' + digits.slice(5, 12) + '-' + digits.slice(12);
    cnic.value = out;
  });

  /* ---------------- Submit ---------------- */
  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    hideAlert();
    clearErrors();

    const errors = validate();
    if (Object.keys(errors).length) {
      Object.entries(errors).forEach(([name, message]) => setError(name, message));
      showAlert('Please fix the highlighted fields and try again.');
      const firstInvalid = form.querySelector('.invalid');
      if (firstInvalid) firstInvalid.focus({ preventScroll: true });
      return;
    }

    const category = selectedCategory();
    const payload = {
      category: category ? category.slug : '',
      team_name: $('team_name').value.trim(),
      leader_name: $('leader_name').value.trim(),
      leader_email: $('leader_email').value.trim(),
      leader_phone: $('leader_phone').value.trim(),
      university: $('university').value.trim(),
      city: $('city').value.trim(),
      discipline: $('discipline').value.trim(),
      semester: $('semester').value.trim(),
      cnic: $('cnic').value.trim(),
      experience: $('experience').value,
      heard_from: $('heard_from').value,
      member2_name: $('member2_name').value.trim(),
      member2_email: $('member2_email').value.trim(),
      agree: $('agree').checked
    };

    submitBtn.disabled = true;
    const original = submitBtn.innerHTML;
    submitBtn.textContent = 'Submitting…';

    try {
      const res = await VSPARK.api('/api/register', { method: 'POST', body: payload });

      if (!res.ok) {
        if (res.data.errors) {
          Object.entries(res.data.errors).forEach(([name, message]) => setError(name, message));
        }
        showAlert(res.data.error || 'Registration failed. Please try again.');
        submitBtn.disabled = false;
        submitBtn.innerHTML = original;
        return;
      }

      const reg = res.data.registration;
      codeEl.textContent = reg.code;
      details.innerHTML = `
        <div class="summary-row"><span>Team</span><strong>${VSPARK.escape(reg.team_name)}</strong></div>
        <div class="summary-row"><span>Category</span><strong>${VSPARK.escape(reg.category_name)}</strong></div>
        <div class="summary-row"><span>Event</span><strong>${VSPARK.escape(reg.competition_name)} · VSPARK 2026</strong></div>
        <div class="summary-row"><span>Fee payable</span><strong>${VSPARK.money(reg.fee)}</strong></div>
        <div class="summary-row"><span>Status</span><strong>${VSPARK.statusBadge(reg.status)}</strong></div>`;

      shell.classList.add('hidden');
      successPanel.classList.remove('hidden');
      window.scrollTo({ top: 0, behavior: 'smooth' });
      VSPARK.toast('Registration submitted successfully.', 'success');
    } catch {
      showAlert('Network error — please check your connection and try again.');
    } finally {
      submitBtn.disabled = false;
      submitBtn.innerHTML = original;
    }
  });

  /* ---------------- Success actions ---------------- */
  $('copy-code').addEventListener('click', async () => {
    const code = codeEl.textContent.trim();
    try {
      await navigator.clipboard.writeText(code);
      VSPARK.toast('Team code copied.', 'success');
    } catch {
      VSPARK.toast('Copy failed — please note the code manually.', 'error');
    }
  });

  $('register-another').addEventListener('click', () => {
    form.reset();
    clearErrors();
    hideAlert();
    successPanel.classList.add('hidden');
    shell.classList.remove('hidden');
    updateSummary();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });

  updateSummary();
})();
