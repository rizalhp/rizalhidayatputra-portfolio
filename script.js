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

['dragstart','selectstart','copy','cut','contextmenu'].forEach((eventName) => {
  document.addEventListener(eventName, (event) => event.preventDefault());
});

document.addEventListener('keydown', (event) => {
  const key = event.key.toLowerCase();
  if ((event.metaKey || event.ctrlKey) && ['a','c','x','s','u','p'].includes(key)) {
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

function createParticles() {
  const count = Math.max(36, Math.min(84, Math.floor(window.innerWidth / 24)));
  particles = Array.from({ length: count }, () => ({
    x: Math.random() * window.innerWidth,
    y: Math.random() * window.innerHeight,
    r: Math.random() * 1.7 + 0.35,
    a: Math.random() * 0.5 + 0.15,
    vx: (Math.random() - 0.5) * 0.12,
    vy: -(Math.random() * 0.28 + 0.04),
    twinkle: Math.random() * Math.PI * 2
  }));
}

function drawParticles() {
  if (!canvas || !ctx) return;
  ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);

  const glow = ctx.createRadialGradient(
    window.innerWidth * 0.58, window.innerHeight * 0.12, 0,
    window.innerWidth * 0.58, window.innerHeight * 0.12, window.innerHeight * 0.9
  );
  glow.addColorStop(0, 'rgba(185, 144, 79, 0.11)');
  glow.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, window.innerWidth, window.innerHeight);

  particles.forEach((p) => {
    p.x += p.vx;
    p.y += p.vy;
    p.twinkle += 0.02;

    if (p.y < -10) {
      p.y = window.innerHeight + 10;
      p.x = Math.random() * window.innerWidth;
    }
    if (p.x < -20) p.x = window.innerWidth + 20;
    if (p.x > window.innerWidth + 20) p.x = -20;

    const alpha = Math.max(0.06, p.a + Math.sin(p.twinkle) * 0.08);
    ctx.beginPath();
    ctx.fillStyle = `rgba(220, 193, 138, ${alpha})`;
    ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
    ctx.fill();
  });

  window.requestAnimationFrame(drawParticles);
}

if (canvas && ctx && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
  resizeCanvas();
  drawParticles();
  window.addEventListener('resize', resizeCanvas);
} else if (canvas && ctx) {
  resizeCanvas();
}
