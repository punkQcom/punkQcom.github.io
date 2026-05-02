/* ===================================================
   AI Companion — Main JS
   Theme toggle, language toggle (FI/EN),
   navigation, scroll animations, interactivity
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

/* ---------- 2. Language Management ---------- */
const LANG_KEY = 'aicompanion-lang';
let currentLang = 'fi';

function getStoredLang() {
  return localStorage.getItem(LANG_KEY);
}

function setLang(lang) {
  currentLang = lang;
  localStorage.setItem(LANG_KEY, lang);
  document.documentElement.setAttribute('lang', lang);
  applyTranslations(lang);
  updateLangToggle(lang);
}

function initLang() {
  const stored = getStoredLang();
  setLang(stored || 'fi');
}

function applyTranslations(lang) {
  document.querySelectorAll('[data-fi]').forEach(el => {
    const text = el.getAttribute('data-' + lang);
    if (text !== null) {
      // Support innerHTML for elements that may have child formatting
      if (el.tagName === 'A' || el.tagName === 'BUTTON' || el.getAttribute('data-html') === 'true') {
        el.textContent = text;
      } else {
        el.innerHTML = text;
      }
    }
  });
}

function updateLangToggle(lang) {
  const toggles = document.querySelectorAll('.lang-toggle');
  toggles.forEach(btn => {
    btn.setAttribute('aria-pressed', btn.getAttribute('data-lang') === lang ? 'true' : 'false');
    btn.classList.toggle('active', btn.getAttribute('data-lang') === lang);
  });
}

/* ---------- 3. Navigation ---------- */
function initNav() {
  const nav = document.getElementById('nav');
  const hamburger = document.getElementById('nav-hamburger');
  const mobileMenu = document.getElementById('nav-mobile');
  const themeToggle = document.getElementById('theme-toggle');

  // Scroll state
  window.addEventListener('scroll', () => {
    if (nav) {
      nav.classList.toggle('scrolled', window.scrollY > 20);
    }
  }, { passive: true });

  // Hamburger
  if (hamburger && mobileMenu) {
    hamburger.addEventListener('click', () => {
      const isOpen = mobileMenu.classList.toggle('open');
      hamburger.setAttribute('aria-expanded', isOpen);
    });

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

  // Language toggles
  document.querySelectorAll('.lang-toggle').forEach(btn => {
    btn.addEventListener('click', () => {
      setLang(btn.getAttribute('data-lang'));
    });
  });

  // Mark active nav link
  const currentPath = window.location.pathname;
  document.querySelectorAll('.nav-link[data-page]').forEach(link => {
    const page = link.getAttribute('data-page');
    if (
      (page === 'home' && (currentPath.endsWith('index.html') || currentPath.endsWith('aicompanion/') || currentPath.endsWith('/'))) ||
      (page !== 'home' && currentPath.includes(page))
    ) {
      link.classList.add('active');
    }
  });
}

/* ---------- 4. Scroll Reveal ---------- */
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

/* ---------- 5. Progress Bar Animation ---------- */
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

/* ---------- 6. Smooth scroll for anchors ---------- */
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

/* ---------- 7. Base path helper ---------- */
window.SITE_BASE = (() => {
  const scripts = document.querySelectorAll('script[src]');
  for (const s of scripts) {
    const m = s.src.match(/^(.*\/)assets\/js\/main\.js/);
    if (m) return m[1];
  }
  return './';
})();

/* ---------- 8. Particle Canvas ---------- */
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
      ? { r: 167, g: 139, b: 250 }
      : { r: 124, g: 58, b: 237 };
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

/* ---------- 9. Init ---------- */
document.addEventListener('DOMContentLoaded', () => {
  initTheme();
  initLang();
  initNav();
  initReveal();
  initProgressBars();
  initSmoothScroll();
  initParticles();
});
