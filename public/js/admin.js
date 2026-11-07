/* VSPARK admin dashboard */
(function () {
  'use strict';

  const state = {
    view: 'overview',
    categories: [],
    filters: { search: '', category: '', status: '', payment: '', sort: 'newest', page: 1, perPage: 8 },
    total: 0,
    pages: 1,
    current: null
  };

  const $ = (sel) => document.querySelector(sel);
  const $$ = (sel) => Array.from(document.querySelectorAll(sel));

  const els = {
    title: $('#view-title'),
    sub: $('#view-sub'),
    regBody: $('#reg-body'),
    recentBody: $('#recent-body'),
    count: $('#reg-count'),
    pager: $('#pager'),
    drawer: $('#drawer'),
    backdrop: $('#drawer-backdrop'),
    drawerBody: $('#drawer-body'),
    dTeam: $('#d-team'),
    dMeta: $('#d-meta'),
    notes: $('#admin-notes'),
    activity: $('#activity-list'),
    competitionChart: $('#competition-chart'),
    statusBreakdown: $('#status-breakdown'),
    miniStats: $('#mini-stats')
  };

  const VIEW_META = {
    overview: ['Overview', 'Live snapshot of Prompt Engineering registrations'],
    registrations: ['Registrations', 'Review, approve and manage every entry'],
    activity: ['Activity log', 'Audit trail of admin actions'],
    settings: ['Settings', 'Account and event configuration']
  };

  /* ---------------- Helpers ---------------- */
  function handleUnauthorized(res) {
    if (res.status === 401) {
      window.location.href = '/admin/login.html';
      return true;
    }
    return false;
  }

  async function api(url, options) {
    const res = await VSPARK.api(url, options);
    handleUnauthorized(res);
    return res;
  }

  function setAdminIdentity(admin) {
    $$('[data-admin-name]').forEach((el) => (el.textContent = admin.name));
    $$('[data-admin-email]').forEach((el) => (el.textContent = admin.email));
    const initials = (admin.name || 'A')
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0].toUpperCase())
      .join('');
    $$('[data-admin-initials]').forEach((el) => (el.textContent = initials || 'A'));
  }

  function statusIcon(status) {
    return status === 'approved' ? 'check' : status === 'rejected' ? 'x' : 'clock';
  }

  function actionIcon(action) {
    if (action.startsWith('status:approved') || action === 'registered') return 'check';
    if (action.startsWith('status:rejected') || action === 'deleted') return 'x';
    if (action.startsWith('status:pending')) return 'clock';
    return 'edit';
  }

  function actionClass(action) {
    if (action.startsWith('status:approved') || action === 'registered') return 'ok';
    if (action.startsWith('status:rejected') || action === 'deleted') return 'bad';
    if (action.startsWith('status:pending')) return 'warn';
    return '';
  }

  function actionLabel(action) {
    if (action === 'registered') return 'New registration';
    if (action === 'deleted') return 'Registration deleted';
    if (action === 'updated') return 'Registration updated';
    if (action.startsWith('status:')) return `Status set to ${action.split(':')[1]}`;
    if (action.startsWith('payment:')) return `Payment marked ${action.split(':')[1]}`;
    return action;
  }

  /* ---------------- Navigation ---------------- */
  function switchView(view) {
    state.view = view;
    $$('.side-link').forEach((btn) => btn.classList.toggle('is-active', btn.dataset.view === view));
    $$('.panel').forEach((panel) => {
      panel.hidden = panel.dataset.panel !== view;
    });
    const [title, sub] = VIEW_META[view] || VIEW_META.overview;
    els.title.textContent = title;
    els.sub.textContent = sub;
    closeSidebar();

    if (view === 'registrations' && !els.regBody.dataset.loaded) loadRegistrations();
    if (view === 'activity') loadActivity();
    if (view === 'overview') loadOverview();
  }

  $$('.side-link').forEach((btn) => btn.addEventListener('click', () => switchView(btn.dataset.view)));
  $$('[data-goto]').forEach((btn) => btn.addEventListener('click', () => switchView(btn.dataset.goto)));

  /* Sidebar (mobile) */
  const sidebar = $('#sidebar');
  const scrim = $('#sidebar-scrim');

  function openSidebar() {
    sidebar.classList.add('is-open');
    scrim.classList.add('is-open');
  }

  function closeSidebar() {
    sidebar.classList.remove('is-open');
    scrim.classList.remove('is-open');
  }

  $('#sidebar-toggle').addEventListener('click', openSidebar);
  scrim.addEventListener('click', closeSidebar);

  /* ---------------- Overview ---------------- */
  async function loadOverview() {
    const res = await api('/api/admin/stats');
    if (!res.ok) return;
    const s = res.data.stats;
    state.categories = res.data.categories || [];

    $('#kpi-total').textContent = s.total;
    $('#kpi-total-note').textContent = `${s.participants} participants`;
    $('#kpi-pending').textContent = s.byStatus.pending;
    $('#kpi-today').textContent = `${s.newToday} today`;
    $('#kpi-approved').textContent = s.byStatus.approved;
    $('#kpi-rate').textContent = `${s.approvedRate}% approval`;
    $('#kpi-collected').textContent = VSPARK.money(s.collected);
    $('#kpi-outstanding').textContent = `${VSPARK.money(s.outstanding)} outstanding`;

    const counts = state.categories.map((c) => ({
      name: c.name,
      count: s.byCategory[c.slug] || 0
    }));
    const max = Math.max(1, ...counts.map((c) => c.count));

    els.competitionChart.innerHTML = counts
      .map(
        (c) => `
      <div class="bar-row">
        <span class="bar-name" title="${VSPARK.escape(c.name)}">${VSPARK.escape(c.name)}</span>
        <div class="bar-track"><div class="bar-fill" style="width:${Math.round((c.count / max) * 100)}%"></div></div>
        <span class="bar-value">${c.count}</span>
      </div>`
      )
      .join('');

    const statusRows = [
      ['Approved', s.byStatus.approved, 'approved'],
      ['Pending', s.byStatus.pending, 'pending'],
      ['Rejected', s.byStatus.rejected, 'rejected']
    ];
    els.statusBreakdown.innerHTML = statusRows
      .map(([label, count, cls]) => {
        const pct = s.total ? Math.round((count / s.total) * 100) : 0;
        return `
        <div class="sb-row">
          <div class="sb-top"><span>${label}</span><strong>${count} · ${pct}%</strong></div>
          <div class="sb-track"><div class="sb-fill ${cls}" style="width:${pct}%"></div></div>
        </div>`;
      })
      .join('');

    els.miniStats.innerHTML = `
      <div class="mini-stat"><div class="v">${VSPARK.money(s.revenue)}</div><div class="l">Total expected fees</div></div>
      <div class="mini-stat"><div class="v">${s.universities}</div><div class="l">Universities represented</div></div>
      <div class="mini-stat"><div class="v">${s.participants}</div><div class="l">Registered participants</div></div>
      <div class="mini-stat"><div class="v">${s.total - s.byStatus.approved - s.byStatus.rejected}</div><div class="l">Awaiting a decision</div></div>`;

    const pendingBadge = document.querySelector('[data-pending-count]');
    if (pendingBadge) {
      pendingBadge.textContent = s.byStatus.pending;
      pendingBadge.style.display = s.byStatus.pending ? '' : 'none';
    }

    loadRecent();
  }

  async function loadRecent() {
    const res = await api('/api/admin/recent');
    if (!res.ok) return;
    const rows = res.data.rows;

    if (!rows.length) {
      els.recentBody.innerHTML = '<tr><td colspan="7" class="table-empty">No registrations yet. Share the public form to start collecting entries.</td></tr>';
      return;
    }

    els.recentBody.innerHTML = rows
      .map(
        (r) => `
      <tr class="is-clickable" data-open="${r.id}">
        <td><div class="team-cell"><strong>${VSPARK.escape(r.team_name)}</strong><span>${VSPARK.escape(r.code)}</span></div></td>
        <td>${VSPARK.escape(r.category_name || '—')}</td>
        <td>${VSPARK.escape(r.university)}</td>
        <td class="nowrap">${VSPARK.money(r.fee)}</td>
        <td class="nowrap">${VSPARK.statusBadge(r.status)}</td>
        <td class="cell-muted nowrap">${VSPARK.date(r.created_at)}</td>
        <td class="nowrap"><button class="btn btn-sm btn-soft btn-view" type="button" data-open="${r.id}">View</button></td>
      </tr>`
      )
      .join('');
  }

  /* ---------------- Registrations ---------------- */
  function filterQuery(extra = {}) {
    const params = new URLSearchParams();
    const f = state.filters;
    if (f.search) params.set('search', f.search);
    if (f.category) params.set('category', f.category);
    if (f.status) params.set('status', f.status);
    if (f.payment) params.set('payment', f.payment);
    if (f.sort) params.set('sort', f.sort);
    Object.entries(extra).forEach(([key, value]) => params.set(key, value));
    return params.toString();
  }

  async function loadRegistrations() {
    els.regBody.innerHTML = '<tr><td colspan="9" class="table-empty">Loading registrations…</td></tr>';
    const res = await api(
      `/api/admin/registrations?${filterQuery({ page: state.filters.page, perPage: state.filters.perPage })}`
    );
    if (!res.ok) {
      els.regBody.innerHTML = `<tr><td colspan="9" class="table-empty">${VSPARK.escape(res.data.error || 'Could not load registrations.')}</td></tr>`;
      return;
    }

    els.regBody.dataset.loaded = 'true';
    state.total = res.data.total;
    state.pages = res.data.pages;
    state.filters.page = res.data.page;

    if (!res.data.rows.length) {
      els.regBody.innerHTML = '<tr><td colspan="9" class="table-empty">No registrations match these filters.</td></tr>';
      els.count.textContent = '0 registrations';
      els.pager.innerHTML = '';
      return;
    }

    els.regBody.innerHTML = res.data.rows
      .map(
        (r) => `
      <tr class="is-clickable" data-open="${r.id}">
        <td><div class="team-cell"><strong>${VSPARK.escape(r.team_name)}</strong><span>${VSPARK.escape(r.code)}</span></div></td>
        <td>${VSPARK.escape(r.category_name || '—')}<br><span class="cell-muted">${VSPARK.escape(r.team_size)} member${r.team_size > 1 ? 's' : ''}</span></td>
        <td>${VSPARK.escape(r.leader_name)}<br><span class="cell-muted">${VSPARK.escape(r.leader_email)}</span></td>
        <td>${VSPARK.escape(r.university)}<br><span class="cell-muted">${VSPARK.escape(r.city || '—')}</span></td>
        <td class="nowrap">${VSPARK.money(r.fee)}</td>
        <td class="nowrap">${VSPARK.paymentBadge(r.payment_status)}</td>
        <td class="nowrap">${VSPARK.statusBadge(r.status)}</td>
        <td class="cell-muted nowrap">${VSPARK.date(r.created_at)}</td>
        <td class="nowrap"><button class="btn btn-sm btn-soft btn-view" type="button" data-open="${r.id}">View</button></td>
      </tr>`
      )
      .join('');

    const start = (res.data.page - 1) * res.data.perPage + 1;
    const end = Math.min(start + res.data.rows.length - 1, res.data.total);
    els.count.textContent = `Showing ${start}–${end} of ${res.data.total} registrations`;

    renderPager(res.data.page, res.data.pages);
  }

  function renderPager(page, pages) {
    const buttons = [];
    buttons.push(
      `<button type="button" data-page="${page - 1}" ${page === 1 ? 'disabled' : ''} aria-label="Previous page">‹</button>`
    );

    const windowStart = Math.max(1, Math.min(page - 2, pages - 4));
    const windowEnd = Math.min(pages, windowStart + 4);
    for (let i = windowStart; i <= windowEnd; i += 1) {
      buttons.push(`<button type="button" data-page="${i}" class="${i === page ? 'is-active' : ''}">${i}</button>`);
    }

    buttons.push(
      `<button type="button" data-page="${page + 1}" ${page === pages ? 'disabled' : ''} aria-label="Next page">›</button>`
    );
    els.pager.innerHTML = buttons.join('');
  }

  els.pager.addEventListener('click', (event) => {
    const btn = event.target.closest('button[data-page]');
    if (!btn || btn.disabled) return;
    state.filters.page = Number(btn.dataset.page);
    loadRegistrations();
  });

  /* Filters */
  const onFilterChange = () => {
    state.filters.search = $('#search-input').value.trim();
    state.filters.category = $('#filter-category').value;
    state.filters.status = $('#filter-status').value;
    state.filters.payment = $('#filter-payment').value;
    state.filters.sort = $('#filter-sort').value;
    state.filters.page = 1;
    loadRegistrations();
  };

  $('#search-input').addEventListener('input', VSPARK.debounce(onFilterChange, 320));
  ['#filter-category', '#filter-status', '#filter-payment', '#filter-sort'].forEach((sel) => {
    $(sel).addEventListener('change', onFilterChange);
  });

  $('#reset-filters').addEventListener('click', () => {
    $('#search-input').value = '';
    $('#filter-category').value = '';
    $('#filter-status').value = '';
    $('#filter-payment').value = '';
    $('#filter-sort').value = 'newest';
    onFilterChange();
  });

  /* Export */
  $('#export-btn').addEventListener('click', () => {
    window.location.href = `/api/admin/export.csv?${filterQuery()}`;
    VSPARK.toast('Preparing CSV download…');
  });

  /* ---------------- Activity ---------------- */
  async function loadActivity() {
    const res = await api('/api/admin/activity');
    if (!res.ok) return;
    if (!res.data.activity.length) {
      els.activity.innerHTML = '<li class="table-empty">No activity recorded yet.</li>';
      return;
    }
    els.activity.innerHTML = res.data.activity
      .map(
        (a) => `
      <li class="activity-item">
        <span class="activity-dot ${actionClass(a.action)}">
          <svg class="icon"><use href="/assets/icons.svg#${actionIcon(a.action)}"></use></svg>
        </span>
        <div class="activity-body">
          <strong>${VSPARK.escape(actionLabel(a.action))} · ${VSPARK.escape(a.target)}</strong>
          <span>${VSPARK.escape(a.detail || '')}${a.detail ? ' · ' : ''}by ${VSPARK.escape(a.actor)}</span>
        </div>
        <span class="activity-time">${VSPARK.date(a.at, true)}</span>
      </li>`
      )
      .join('');
  }

  /* ---------------- Drawer ---------------- */
  async function openDrawer(id) {
    const res = await api(`/api/admin/registrations/${id}`);
    if (!res.ok) {
      VSPARK.toast(res.data.error || 'Could not load that registration.', 'error');
      return;
    }
    state.current = res.data.registration;
    renderDrawer(state.current);
    els.drawer.classList.add('is-open');
    els.backdrop.classList.add('is-open');
    els.drawer.setAttribute('aria-hidden', 'false');
  }

  function closeDrawer() {
    els.drawer.classList.remove('is-open');
    els.backdrop.classList.remove('is-open');
    els.drawer.setAttribute('aria-hidden', 'true');
    state.current = null;
  }

  function renderDrawer(r) {
    els.dTeam.textContent = r.team_name;
    els.dMeta.textContent = `${r.code} · ${r.category_name || 'Prompt Engineering'} · ${VSPARK.date(r.created_at, true)}`;
    els.notes.value = r.admin_notes || '';

    const paymentAction = els.drawer.querySelector('#toggle-payment');
    if (paymentAction) {
      paymentAction.textContent = r.payment_status === 'paid' ? 'Mark unpaid' : 'Mark paid';
    }

    $$('.drawer-actions [data-decision]').forEach((btn) => {
      const active = btn.dataset.decision === r.status;
      btn.classList.toggle('btn-outline', !active);
      btn.setAttribute('aria-pressed', String(active));
    });

    els.drawerBody.innerHTML = `
      <section class="drawer-section">
        <h4>Overview</h4>
        <div class="detail-grid">
          <div class="detail-field"><div class="label">Status</div><div class="value">${VSPARK.statusBadge(r.status)}</div></div>
          <div class="detail-field"><div class="label">Payment</div><div class="value">${VSPARK.paymentBadge(r.payment_status)}</div></div>
          <div class="detail-field"><div class="label">Prompt category</div><div class="value">${VSPARK.escape(r.category_name || '—')}</div></div>
          <div class="detail-field"><div class="label">Category time</div><div class="value">${VSPARK.escape(r.category_duration || '—')}</div></div>
          <div class="detail-field"><div class="label">Fee</div><div class="value">${VSPARK.money(r.fee)}</div></div>
          <div class="detail-field"><div class="label">Team size</div><div class="value">${r.team_size} member${r.team_size > 1 ? 's' : ''}</div></div>
          <div class="detail-field"><div class="label">Experience</div><div class="value">${VSPARK.escape(r.experience || '—')}</div></div>
        </div>
      </section>

      <section class="drawer-section">
        <h4>Team leader</h4>
        <div class="drawer-person">
          <strong>${VSPARK.escape(r.leader_name)}</strong>
          <span><a href="mailto:${VSPARK.escape(r.leader_email)}">${VSPARK.escape(r.leader_email)}</a> · <a href="tel:${VSPARK.escape(r.leader_phone)}">${VSPARK.escape(r.leader_phone)}</a></span>
        </div>
      </section>

      ${
        r.member2_name
          ? `<section class="drawer-section">
        <h4>Second member</h4>
        <div class="drawer-person">
          <strong>${VSPARK.escape(r.member2_name)}</strong>
          <span><a href="mailto:${VSPARK.escape(r.member2_email)}">${VSPARK.escape(r.member2_email)}</a></span>
        </div>
      </section>`
          : ''
      }

      <section class="drawer-section">
        <h4>Academic details</h4>
        <div class="detail-grid">
          <div class="detail-field full"><div class="label">University</div><div class="value">${VSPARK.escape(r.university)}</div></div>
          <div class="detail-field"><div class="label">City</div><div class="value">${VSPARK.escape(r.city || '—')}</div></div>
          <div class="detail-field"><div class="label">Semester</div><div class="value">${VSPARK.escape(r.semester || '—')}</div></div>
          <div class="detail-field"><div class="label">Discipline</div><div class="value">${VSPARK.escape(r.discipline || '—')}</div></div>
          <div class="detail-field"><div class="label">CNIC / B-Form</div><div class="value">${VSPARK.escape(r.cnic || '—')}</div></div>
        </div>
      </section>

      <section class="drawer-section">
        <h4>Registration</h4>
        <div class="detail-grid">
          <div class="detail-field"><div class="label">Team code</div><div class="value">${VSPARK.escape(r.code)}</div></div>
          <div class="detail-field"><div class="label">Received</div><div class="value">${VSPARK.date(r.created_at, true)}</div></div>
          <div class="detail-field"><div class="label">Last update</div><div class="value">${VSPARK.date(r.updated_at, true)}</div></div>
          <div class="detail-field"><div class="label">Heard about us</div><div class="value">${VSPARK.escape(r.heard_from || '—')}</div></div>
        </div>
      </section>`;
  }

  document.addEventListener('click', (event) => {
    const trigger = event.target.closest('[data-open]');
    if (trigger) {
      event.stopPropagation();
      openDrawer(trigger.dataset.open);
    }
  });

  $('#drawer-close').addEventListener('click', closeDrawer);
  els.backdrop.addEventListener('click', closeDrawer);
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') closeDrawer();
  });

  async function patchCurrent(patch, successMessage) {
    if (!state.current) return;
    const res = await api(`/api/admin/registrations/${state.current.id}`, { method: 'PATCH', body: patch });
    if (!res.ok) {
      VSPARK.toast(res.data.error || 'Update failed.', 'error');
      return;
    }
    state.current = res.data.registration;
    renderDrawer(state.current);
    VSPARK.toast(successMessage || 'Registration updated.', 'success');
    loadRegistrations();
    loadOverview();
  }

  $$('.drawer-actions [data-decision]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const status = btn.dataset.decision;
      patchCurrent({ status }, `Marked as ${status}.`);
    });
  });

  $('#toggle-payment').addEventListener('click', () => {
    if (!state.current) return;
    const next = state.current.payment_status === 'paid' ? 'unpaid' : 'paid';
    patchCurrent({ payment_status: next }, `Payment marked ${next}.`);
  });

  $('#save-notes').addEventListener('click', () => {
    patchCurrent({ admin_notes: els.notes.value }, 'Note saved.');
  });

  $('#delete-reg').addEventListener('click', async () => {
    if (!state.current) return;
    const confirmed = window.confirm(
      `Delete registration ${state.current.code} (${state.current.team_name})? This cannot be undone.`
    );
    if (!confirmed) return;

    const res = await api(`/api/admin/registrations/${state.current.id}`, { method: 'DELETE' });
    if (!res.ok) {
      VSPARK.toast(res.data.error || 'Delete failed.', 'error');
      return;
    }
    VSPARK.toast(res.data.message || 'Registration deleted.', 'success');
    closeDrawer();
    loadRegistrations();
    loadOverview();
  });

  /* ---------------- Settings ---------------- */
  $('#password-form').addEventListener('submit', async (event) => {
    event.preventDefault();
    const current = $('#current-password').value;
    const next = $('#new-password').value;
    const confirm = $('#confirm-password').value;
    const box = $('#password-alert');
    const text = $('#password-alert-text');

    const show = (message, type) => {
      box.className = `alert alert-${type}`;
      text.textContent = message;
      box.classList.remove('hidden');
    };

    if (next.length < 8) return show('New password must be at least 8 characters.', 'error');
    if (next !== confirm) return show('The new passwords do not match.', 'error');

    const res = await api('/api/admin/password', { method: 'POST', body: { current, next } });
    if (!res.ok) return show(res.data.error || 'Could not update password.', 'error');

    show('Password updated. Use the new password next time you sign in.', 'success');
    $('#password-form').reset();
  });

  /* ---------------- Logout ---------------- */
  $('#logout-btn').addEventListener('click', async () => {
    await api('/api/admin/logout', { method: 'POST' });
    window.location.href = '/admin/login.html';
  });

  /* ---------------- Boot ---------------- */
  async function boot() {
    const me = await api('/api/admin/me');
    if (!me.ok) return;
    setAdminIdentity(me.data.admin);

    await loadOverview();

    const filterSelect = $('#filter-category');
    state.categories.forEach((c) => {
      const option = document.createElement('option');
      option.value = c.slug;
      option.textContent = c.name;
      filterSelect.appendChild(option);
    });

    loadRegistrations();
    loadActivity();
  }

  boot();
})();
