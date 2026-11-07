/* Public site behaviour */
(function () {
  'use strict';

  const header = document.querySelector('.site-header');
  const toggle = document.querySelector('.nav-toggle');

  if (header) {
    const onScroll = () => header.classList.toggle('is-scrolled', window.scrollY > 8);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
  }

  if (toggle && header) {
    toggle.addEventListener('click', () => {
      const open = header.classList.toggle('nav-open');
      toggle.setAttribute('aria-expanded', String(open));
    });
    document.querySelectorAll('.nav-links a').forEach((link) =>
      link.addEventListener('click', () => header.classList.remove('nav-open'))
    );
  }

  /* Scroll reveal */
  const revealItems = document.querySelectorAll('[data-reveal]');
  if (revealItems.length) {
    if ('IntersectionObserver' in window) {
      const observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              const delay = Number(entry.target.dataset.revealDelay || 0);
              setTimeout(() => entry.target.classList.add('is-visible'), delay);
              observer.unobserve(entry.target);
            }
          });
        },
        { threshold: 0.12, rootMargin: '0px 0px -40px' }
      );
      revealItems.forEach((el) => observer.observe(el));
    } else {
      revealItems.forEach((el) => el.classList.add('is-visible'));
    }
  }

  /* Footer year */
  document.querySelectorAll('[data-year]').forEach((el) => {
    el.textContent = new Date().getFullYear();
  });

  /* Counters — values arrive from the API, then count up once. */
  const counters = document.querySelectorAll('[data-counter]');
  function animateCounter(el, target) {
    const duration = 1100;
    const start = performance.now();
    function frame(now) {
      const progress = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      el.textContent = Math.round(target * eased).toLocaleString('en-PK') + (el.dataset.suffix || '');
      if (progress < 1) requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
  }
  function runCounters(stats) {
    counters.forEach((el) => {
      const key = el.dataset.counter;
      const value = Number(stats[key] ?? el.dataset.fallback ?? 0);
      animateCounter(el, value);
    });
  }
  if (counters.length) {
    if ('IntersectionObserver' in window) {
      const co = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          co.disconnect();
          VSPARK.api('/api/stats')
            .then((res) => runCounters(res.ok ? res.data.stats : {}))
            .catch(() => runCounters({}));
        });
      }, { threshold: 0.3 });
      const strip = document.querySelector('.stat-strip');
      co.observe(strip || counters[0]);
    } else {
      VSPARK.api('/api/stats')
        .then((res) => runCounters(res.ok ? res.data.stats : {}))
        .catch(() => runCounters({}));
    }
  }

  /* Countdown on the homepage hero (to the event date) */
  const countdown = document.querySelector('[data-countdown]');
  if (countdown) {
    const target = new Date(countdown.dataset.countdown).getTime();
    const tick = () => {
      const diff = target - Date.now();
      if (Number.isNaN(target) || diff <= 0) {
        countdown.textContent = 'Registration open';
        return;
      }
      const days = Math.floor(diff / 86400000);
      const hours = Math.floor((diff % 86400000) / 3600000);
      countdown.textContent = `${days}d ${hours}h to go`;
    };
    tick();
    setInterval(tick, 60000);
  }
})();
