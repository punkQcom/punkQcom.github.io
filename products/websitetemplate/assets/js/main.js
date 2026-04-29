/* ===================================================
   punkQ Website Template — Main JS
   Theme toggle, navigation, scroll animations,
   and general interactivity
   =================================================== */

'use strict';

/* ---------- 1. Theme Management ---------- */
const THEME_KEY = 'punkq-theme';

function getStoredTheme() {
  return localStorage.getItem(THEME_KEY);
}

function setTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  localStorage.setItem(THEME_KEY, theme);
}

function initTheme() {
  const stored = getStoredTheme();
  const preferred = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  setTheme(stored || preferred);
}

function toggleTheme() {
  const current = document.documentElement.getAttribute('data-theme');
  setTheme(current === 'dark' ? 'light' : 'dark');
}

/* ---------- 2. Navigation ---------- */
function initNav() {
  const nav = document.getElementById('nav');
  const hamburger = document.getElementById('nav-hamburger');
  const mobileMenu = document.getElementById('nav-mobile');
  const themeToggle = document.getElementById('theme-toggle');

  // Scroll state
  let lastScroll = 0;
  window.addEventListener('scroll', () => {
    const scrollY = window.scrollY;
    if (nav) {
      if (scrollY > 20) {
        nav.classList.add('scrolled');
      } else {
        nav.classList.remove('scrolled');
      }
    }
    lastScroll = scrollY;
  }, { passive: true });

  // Hamburger
  if (hamburger && mobileMenu) {
    hamburger.addEventListener('click', () => {
      const isOpen = mobileMenu.classList.toggle('open');
      hamburger.setAttribute('aria-expanded', isOpen);
    });

    // Close on link click
    mobileMenu.querySelectorAll('.nav-link').forEach(link => {
      link.addEventListener('click', () => {
        mobileMenu.classList.remove('open');
        hamburger.setAttribute('aria-expanded', 'false');
      });
    });
  }

  // Theme toggle
  if (themeToggle) {
    themeToggle.addEventListener('click', toggleTheme);
  }

  // Mark active nav link
  const currentPath = window.location.pathname;
  document.querySelectorAll('.nav-link[data-page]').forEach(link => {
    const page = link.getAttribute('data-page');
    if (
      (page === 'home' && (currentPath.endsWith('index.html') || currentPath.endsWith('/'))) ||
      (page !== 'home' && currentPath.includes(page))
    ) {
      link.classList.add('active');
    }
  });
}

/* ---------- 3. Scroll Reveal ---------- */
function initReveal() {
  const elements = document.querySelectorAll('.reveal');
  if (!elements.length) return;

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
          observer.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.12, rootMargin: '0px 0px -40px 0px' }
  );

  elements.forEach(el => observer.observe(el));
}

/* ---------- 4. Progress Bar Animation ---------- */
function initProgressBars() {
  const bars = document.querySelectorAll('.progress-fill[data-width]');
  if (!bars.length) return;

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const bar = entry.target;
          const width = bar.getAttribute('data-width');
          setTimeout(() => { bar.style.width = width; }, 100);
          observer.unobserve(bar);
        }
      });
    },
    { threshold: 0.5 }
  );

  bars.forEach(bar => {
    bar.style.width = '0%';
    observer.observe(bar);
  });
}

/* ---------- 5. Typed / Animated Text ---------- */
function initTyped() {
  const el = document.getElementById('typed-text');
  if (!el) return;

  const words = el.getAttribute('data-words').split('|');
  let wordIdx = 0;
  let charIdx = 0;
  let deleting = false;
  let paused = false;

  el.style.borderRight = '2px solid var(--color-accent)';
  el.style.paddingRight = '2px';

  function type() {
    const word = words[wordIdx];

    if (deleting) {
      el.textContent = word.substring(0, charIdx - 1);
      charIdx--;
    } else {
      el.textContent = word.substring(0, charIdx + 1);
      charIdx++;
    }

    let speed = deleting ? 60 : 100;

    if (!deleting && charIdx === word.length) {
      paused = true;
      setTimeout(() => {
        paused = false;
        deleting = true;
        setTimeout(type, 80);
      }, 1800);
      return;
    }

    if (deleting && charIdx === 0) {
      deleting = false;
      wordIdx = (wordIdx + 1) % words.length;
      speed = 350;
    }

    setTimeout(type, speed);
  }

  setTimeout(type, 600);
}

/* ---------- 6. Counter animation ---------- */
function initCounters() {
  const counters = document.querySelectorAll('[data-count]');
  if (!counters.length) return;

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const el = entry.target;
          const target = parseInt(el.getAttribute('data-count'), 10);
          const suffix = el.getAttribute('data-suffix') || '';
          const duration = 1200;
          const steps = 50;
          const increment = target / steps;
          let current = 0;
          let step = 0;

          const timer = setInterval(() => {
            step++;
            current += increment;
            if (step >= steps) {
              el.textContent = target + suffix;
              clearInterval(timer);
            } else {
              el.textContent = Math.round(current) + suffix;
            }
          }, duration / steps);

          observer.unobserve(el);
        }
      });
    },
    { threshold: 0.5 }
  );

  counters.forEach(el => observer.observe(el));
}

/* ---------- 7. Contact Form ---------- */
function initContactForm() {
  const form = document.getElementById('contact-form');
  if (!form) return;

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const btn = form.querySelector('button[type="submit"]');
    const original = btn.textContent;

    btn.disabled = true;
    btn.textContent = 'Sending…';

    // Simulate async send
    setTimeout(() => {
      btn.textContent = '✓ Sent!';
      btn.style.background = 'linear-gradient(135deg, #10b981, #059669)';
      form.reset();

      setTimeout(() => {
        btn.disabled = false;
        btn.textContent = original;
        btn.style.background = '';
      }, 3000);
    }, 1200);
  });
}

/* ---------- 8. Smooth scroll for anchors ---------- */
function initSmoothScroll() {
  document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', (e) => {
      const target = document.querySelector(anchor.getAttribute('href'));
      if (target) {
        e.preventDefault();
        const navHeight = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--nav-height'), 10);
        const top = target.getBoundingClientRect().top + window.scrollY - navHeight - 16;
        window.scrollTo({ top, behavior: 'smooth' });
      }
    });
  });
}

/* ---------- 9. Base path helper ---------- */
// Resolve paths correctly whether at root or /products/websitetemplate/
window.SITE_BASE = (() => {
  const scripts = document.querySelectorAll('script[src]');
  for (const s of scripts) {
    const m = s.src.match(/^(.*\/)assets\/js\/main\.js/);
    if (m) return m[1];
  }
  return './';
})();

/* ---------- 10. Particle Canvas ---------- */
function initParticles() {
  const canvas = document.createElement('canvas');
  canvas.id = 'particle-canvas';
  canvas.setAttribute('aria-hidden', 'true');
  document.body.prepend(canvas);

  const ctx = canvas.getContext('2d');
  let W, H, particles = [];
  const NUM = 55;

  function resize() {
    W = canvas.width = window.innerWidth;
    H = canvas.height = window.innerHeight;
  }

  function getAccentColor() {
    const theme = document.documentElement.getAttribute('data-theme');
    return theme === 'dark'
      ? { r: 167, g: 139, b: 250 }   // a78bfa
      : { r: 124, g: 58, b: 237 };   // 7c3aed
  }

  function createParticle() {
    return {
      x: Math.random() * W,
      y: Math.random() * H,
      r: Math.random() * 1.8 + 0.4,
      vx: (Math.random() - 0.5) * 0.35,
      vy: (Math.random() - 0.5) * 0.35,
      a: Math.random() * 0.6 + 0.1,
    };
  }

  function initParticleSet() {
    particles = [];
    for (let i = 0; i < NUM; i++) particles.push(createParticle());
  }

  function draw() {
    ctx.clearRect(0, 0, W, H);
    const c = getAccentColor();

    particles.forEach(p => {
      p.x += p.vx;
      p.y += p.vy;
      if (p.x < 0) p.x = W;
      if (p.x > W) p.x = 0;
      if (p.y < 0) p.y = H;
      if (p.y > H) p.y = 0;

      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(${c.r},${c.g},${c.b},${p.a})`;
      ctx.fill();
    });

    // Draw connections
    for (let i = 0; i < particles.length; i++) {
      for (let j = i + 1; j < particles.length; j++) {
        const dx = particles[i].x - particles[j].x;
        const dy = particles[i].y - particles[j].y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 130) {
          ctx.beginPath();
          ctx.moveTo(particles[i].x, particles[i].y);
          ctx.lineTo(particles[j].x, particles[j].y);
          const alpha = (1 - dist / 130) * 0.15;
          ctx.strokeStyle = `rgba(${c.r},${c.g},${c.b},${alpha})`;
          ctx.lineWidth = 0.8;
          ctx.stroke();
        }
      }
    }

    requestAnimationFrame(draw);
  }

  resize();
  initParticleSet();
  draw();
  window.addEventListener('resize', () => { resize(); initParticleSet(); }, { passive: true });
}

/* ---------- 11. Demo Tab Switcher ---------- */
function initDemoTabs() {
  const tabs = document.querySelectorAll('.demo-tab[data-tab]');
  if (!tabs.length) return;

  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      const target = tab.getAttribute('data-tab');

      // Update tabs
      tabs.forEach(t => {
        t.classList.remove('active');
        t.setAttribute('aria-selected', 'false');
      });
      tab.classList.add('active');
      tab.setAttribute('aria-selected', 'true');

      // Update panels
      document.querySelectorAll('.demo-panel').forEach(panel => {
        panel.classList.remove('active');
        panel.hidden = true;
      });
      const panel = document.getElementById(`panel-${target}`);
      if (panel) {
        panel.classList.add('active');
        panel.hidden = false;
      }
    });

    // Keyboard navigation for tab role
    tab.addEventListener('keydown', (e) => {
      const allTabs = [...tabs];
      const idx = allTabs.indexOf(tab);
      if (e.key === 'ArrowRight') {
        allTabs[(idx + 1) % allTabs.length].focus();
        allTabs[(idx + 1) % allTabs.length].click();
      } else if (e.key === 'ArrowLeft') {
        allTabs[(idx - 1 + allTabs.length) % allTabs.length].focus();
        allTabs[(idx - 1 + allTabs.length) % allTabs.length].click();
      }
    });
  });
}

/* ---------- 12. Blog Filter ---------- */
function initBlogFilter() {
  const filterBtns = document.querySelectorAll('.filter-btn[data-filter]');
  if (!filterBtns.length) return;

  filterBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const filter = btn.getAttribute('data-filter');

      filterBtns.forEach(b => {
        b.classList.remove('active');
        b.setAttribute('aria-selected', 'false');
      });
      btn.classList.add('active');
      btn.setAttribute('aria-selected', 'true');

      document.querySelectorAll('.blog-card[data-category]').forEach(card => {
        if (filter === 'all' || card.getAttribute('data-category') === filter) {
          card.style.display = '';
          card.setAttribute('aria-hidden', 'false');
        } else {
          card.style.display = 'none';
          card.setAttribute('aria-hidden', 'true');
        }
      });
    });
  });
}

/* ---------- 13. Newsletter Form ---------- */
function initNewsletterForm() {
  const form = document.querySelector('.newsletter-form');
  if (!form) return;

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const btn = form.querySelector('button[type="submit"]');
    const input = form.querySelector('input[type="email"]');
    if (!input.value || !input.validity.valid) {
      input.focus();
      return;
    }
    const original = btn.textContent;
    btn.disabled = true;
    btn.textContent = 'Subscribing…';

    setTimeout(() => {
      btn.textContent = '✓ You\'re in!';
      btn.style.background = 'linear-gradient(135deg,#10b981,#059669)';
      form.reset();
      setTimeout(() => {
        btn.disabled = false;
        btn.textContent = original;
        btn.style.background = '';
      }, 3500);
    }, 900);
  });
}

/* ---------- 14. Mini Canvas Visualisations (Demo page) ---------- */
function initMiniCanvases() {
  document.querySelectorAll('.mini-canvas').forEach(canvas => {
    const type = canvas.getAttribute('data-type');
    const ctx = canvas.getContext('2d');
    const W = canvas.width;
    const H = canvas.height;

    function getColor(alpha) {
      const theme = document.documentElement.getAttribute('data-theme');
      return theme === 'dark'
        ? `rgba(167,139,250,${alpha})`
        : `rgba(124,58,237,${alpha})`;
    }

    function drawWave(t) {
      ctx.clearRect(0, 0, W, H);
      ctx.beginPath();
      for (let x = 0; x <= W; x++) {
        const y = H / 2 + Math.sin((x / W) * Math.PI * 4 + t) * 18
                        + Math.sin((x / W) * Math.PI * 8 + t * 1.3) * 8;
        x === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
      }
      ctx.strokeStyle = getColor(0.8);
      ctx.lineWidth = 2;
      ctx.stroke();
    }

    function drawBars(t) {
      ctx.clearRect(0, 0, W, H);
      const bars = 12;
      const gap = 4;
      const bw = (W - gap * (bars - 1)) / bars;
      for (let i = 0; i < bars; i++) {
        const h = (Math.sin(t + i * 0.5) * 0.4 + 0.6) * H * 0.8;
        const x = i * (bw + gap);
        const y = H - h;
        const grad = ctx.createLinearGradient(0, y, 0, H);
        grad.addColorStop(0, getColor(0.9));
        grad.addColorStop(1, getColor(0.2));
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.roundRect(x, y, bw, h, 3);
        ctx.fill();
      }
    }

    function drawNetwork(t) {
      ctx.clearRect(0, 0, W, H);
      const nodes = [
        { x: W * 0.1 + Math.sin(t) * 4, y: H * 0.5 + Math.cos(t * 0.8) * 6 },
        { x: W * 0.35 + Math.sin(t * 0.9 + 1) * 4, y: H * 0.25 + Math.cos(t) * 5 },
        { x: W * 0.5 + Math.sin(t * 1.1) * 5, y: H * 0.7 + Math.cos(t * 1.2) * 4 },
        { x: W * 0.7 + Math.sin(t * 0.7 + 2) * 4, y: H * 0.35 + Math.cos(t * 0.9) * 6 },
        { x: W * 0.88 + Math.sin(t * 1.2) * 3, y: H * 0.6 + Math.cos(t * 0.8) * 5 },
      ];
      nodes.forEach((a, i) => {
        nodes.forEach((b, j) => {
          if (i >= j) return;
          ctx.beginPath();
          ctx.moveTo(a.x, a.y);
          ctx.lineTo(b.x, b.y);
          ctx.strokeStyle = getColor(0.25);
          ctx.lineWidth = 1;
          ctx.stroke();
        });
      });
      nodes.forEach(n => {
        ctx.beginPath();
        ctx.arc(n.x, n.y, 4, 0, Math.PI * 2);
        ctx.fillStyle = getColor(0.9);
        ctx.fill();
      });
    }

    let frame = 0;
    let raf;
    function animate() {
      const t = frame * 0.03;
      if (type === 'wave') drawWave(t);
      else if (type === 'bars') drawBars(t);
      else if (type === 'network') drawNetwork(t);
      frame++;
      raf = requestAnimationFrame(animate);
    }

    // Only animate when visible
    const obs = new IntersectionObserver(entries => {
      entries.forEach(e => {
        if (e.isIntersecting) animate();
        else cancelAnimationFrame(raf);
      });
    }, { threshold: 0.1 });
    obs.observe(canvas);
  });
}

/* ---------- 10. Init ---------- */
document.addEventListener('DOMContentLoaded', () => {
  initTheme();
  initNav();
  initReveal();
  initProgressBars();
  initTyped();
  initCounters();
  initContactForm();
  initSmoothScroll();
  initParticles();
  initDemoTabs();
  initBlogFilter();
  initNewsletterForm();
  initMiniCanvases();
});
