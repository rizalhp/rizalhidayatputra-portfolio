const HQ_ASSETS = {
  chibi: ['assets/hq/chibi-hero-avif.b64'],
  airline: ['assets/hq/airline-01.b64', 'assets/hq/airline-02.b64']
};

async function hydrateHqAsset(key, parts) {
  try {
    const chunks = await Promise.all(parts.map(async (path) => {
      const response = await fetch(path, { cache: 'force-cache' });
      if (!response.ok) throw new Error(`Failed to load ${path}`);
      return response.text();
    }));

    const base64 = chunks.join('').replace(/\s+/g, '');
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
    const objectUrl = URL.createObjectURL(new Blob([bytes], { type: 'image/avif' }));

    document.querySelectorAll(`img[data-hq="${key}"]`).forEach((img) => {
      const preload = new Image();
      preload.onload = () => {
        img.src = objectUrl;
        img.removeAttribute('data-hq');
        img.classList.add('hq-ready');
      };
      preload.src = objectUrl;
    });
  } catch (error) {
    console.warn(`HQ asset "${key}" could not be loaded; using fallback image.`, error);
  }
}

Object.entries(HQ_ASSETS).forEach(([key, parts]) => hydrateHqAsset(key, parts));

const menuButton = document.querySelector('.menu-button');
const nav = document.querySelector('.nav');

menuButton?.addEventListener('click', () => {
  const open = nav.classList.toggle('is-open');
  menuButton.setAttribute('aria-expanded', String(open));
});

document.querySelectorAll('.nav a').forEach((link) => {
  link.addEventListener('click', () => {
    nav.classList.remove('is-open');
    menuButton?.setAttribute('aria-expanded', 'false');
  });
});

['dragstart', 'selectstart', 'copy', 'cut', 'contextmenu'].forEach((eventName) => {
  document.addEventListener(eventName, (event) => event.preventDefault());
});

document.querySelectorAll('img').forEach((img) => img.setAttribute('draggable', 'false'));

document.addEventListener('keydown', (event) => {
  const key = event.key.toLowerCase();
  if ((event.metaKey || event.ctrlKey) && ['a', 'c', 'x', 's', 'u', 'p'].includes(key)) {
    event.preventDefault();
  }
});

const observer = new IntersectionObserver((entries) => {
  entries.forEach((entry) => {
    if (entry.isIntersecting) {
      entry.target.classList.add('is-visible');
      observer.unobserve(entry.target);
    }
  });
}, { threshold: 0.12, rootMargin: '0px 0px -7% 0px' });

document.querySelectorAll('.reveal').forEach((el) => observer.observe(el));

const canvas = document.querySelector('.particles');
const ctx = canvas?.getContext('2d');
let particles = [];
let rafId = null;

function createParticles() {
  const count = Math.max(48, Math.min(110, Math.floor(window.innerWidth / 18)));
  particles = Array.from({ length: count }, () => ({
    x: Math.random() * window.innerWidth,
    y: Math.random() * window.innerHeight,
    r: Math.random() * 1.8 + 0.35,
    a: Math.random() * 0.45 + 0.18,
    vx: (Math.random() - 0.5) * 0.18,
    vy: -(Math.random() * 0.45 + 0.10),
    twinkle: Math.random() * Math.PI * 2
  }));
}

function resizeCanvas() {
  if (!canvas || !ctx) return;
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = Math.floor(window.innerWidth * dpr);
  canvas.height = Math.floor(window.innerHeight * dpr);
  canvas.style.width = `${window.innerWidth}px`;
  canvas.style.height = `${window.innerHeight}px`;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  createParticles();
}

function drawParticles() {
  if (!canvas || !ctx) return;
  ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);

  const glow = ctx.createRadialGradient(
    window.innerWidth * 0.62, window.innerHeight * 0.12, 0,
    window.innerWidth * 0.62, window.innerHeight * 0.12,
    Math.max(window.innerWidth, window.innerHeight) * 0.7
  );
  glow.addColorStop(0, 'rgba(185, 144, 79, 0.10)');
  glow.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, window.innerWidth, window.innerHeight);

  particles.forEach((p) => {
    p.x += p.vx;
    p.y += p.vy;
    p.twinkle += 0.03;
    if (p.y < -10) {
      p.y = window.innerHeight + 10;
      p.x = Math.random() * window.innerWidth;
    }
    if (p.x < -20) p.x = window.innerWidth + 20;
    if (p.x > window.innerWidth + 20) p.x = -20;

    const alpha = Math.max(0.07, p.a + Math.sin(p.twinkle) * 0.09);
    ctx.beginPath();
    ctx.fillStyle = `rgba(220, 193, 138, ${alpha})`;
    ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
    ctx.fill();
  });

  rafId = requestAnimationFrame(drawParticles);
}

if (canvas && ctx) {
  resizeCanvas();
  if (!matchMedia('(prefers-reduced-motion: reduce)').matches) drawParticles();
  window.addEventListener('resize', resizeCanvas, { passive: true });
  document.addEventListener('visibilitychange', () => {
    if (document.hidden && rafId) {
      cancelAnimationFrame(rafId);
      rafId = null;
    } else if (!document.hidden && !rafId && !matchMedia('(prefers-reduced-motion: reduce)').matches) {
      drawParticles();
    }
  });
}
