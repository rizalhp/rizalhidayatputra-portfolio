(() => {
'use strict';
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
const coarsePointer = window.matchMedia('(pointer: coarse)');
const isProjectPage = document.body.classList.contains('project-page');
const hasManagedWelcome = Boolean(document.querySelector('.welcome-screen'));

/* Shared page readiness: project loaders are dismissed on load, with a short fallback. */
const hasSiteLoader = Boolean(document.querySelector('.site-loader'));
let pageReady = false;
const markPageReady = () => {
  if (pageReady) return;
  pageReady = true;
  document.body.classList.add('site-ready');
  if (hasSiteLoader) {
    try { sessionStorage.setItem('aspik-loader-seen', '1'); } catch (error) {}
  }
};
if (document.readyState === 'complete') markPageReady();
else window.addEventListener('load', markPageReady, { once: true });
window.setTimeout(markPageReady, 900);

/* mobile navigation */
const menuButton = document.querySelector('.menu-button');
const nav = document.querySelector('.nav');
const closeMobileNav = ({ returnFocus = false } = {}) => {
  if (!nav?.classList.contains('is-open')) return;
  nav.classList.remove('is-open');
  menuButton?.setAttribute('aria-expanded', 'false');
  if (returnFocus) menuButton?.focus({ preventScroll: true });
};
menuButton?.addEventListener('click', () => {
  const open = nav?.classList.toggle('is-open') ?? false;
  menuButton.setAttribute('aria-expanded', String(open));
});
document.querySelectorAll('.nav a').forEach((link) => link.addEventListener('click', () => closeMobileNav()));
document.addEventListener('pointerdown', (event) => {
  if (!nav?.classList.contains('is-open')) return;
  const target = event.target;
  if (target instanceof Node && (nav.contains(target) || menuButton?.contains(target))) return;
  closeMobileNav();
}, { passive: true });
document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape') closeMobileNav({ returnFocus: true });
});
window.addEventListener('resize', () => {
  if (innerWidth > 760) closeMobileNav();
}, { passive: true });

/* image protection — text remains selectable/copyable */
document.querySelectorAll('img').forEach((img) => img.setAttribute('draggable', 'false'));
document.addEventListener('dragstart', (event) => {
  if (event.target instanceof HTMLImageElement) event.preventDefault();
});
document.addEventListener('contextmenu', (event) => {
  if (event.target instanceof HTMLImageElement) event.preventDefault();
});

/* 02 — reveal once, then keep content visible */
const revealElements = [...document.querySelectorAll('.reveal')];
if (reducedMotion.matches || !('IntersectionObserver' in window)) {
  revealElements.forEach((element) => element.classList.add('is-visible', 'has-revealed'));
} else {
  const revealObserver = new IntersectionObserver((entries, observer) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      entry.target.classList.add('is-visible', 'has-revealed');
      observer.unobserve(entry.target);
    });
  }, { threshold: 0.11, rootMargin: '-3% 0px -7% 0px' });
  revealElements.forEach((element) => revealObserver.observe(element));
}

/* 03 — chapter transition + active navbar */
const trackedSections = [...document.querySelectorAll('main section[id]')];
const navLinks = [...document.querySelectorAll('.nav a[href^="#"]')];
if ('IntersectionObserver' in window && trackedSections.length) {
  const sectionObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry) => entry.target.classList.toggle('section-in-view', entry.isIntersecting));
  }, { threshold: 0.12, rootMargin: '-14% 0px -14% 0px' });
  trackedSections.forEach((section) => sectionObserver.observe(section));
}

let navFrame = null;
const updateActiveNav = () => {
  if (!trackedSections.length || !navLinks.length) { navFrame = null; return; }
  const probe = innerHeight * 0.36;
  let activeId = trackedSections[0]?.id || '';
  trackedSections.forEach((section) => {
    const rect = section.getBoundingClientRect();
    if (rect.top <= probe && rect.bottom > probe) activeId = section.id;
  });
  navLinks.forEach((link) => {
    const active = link.getAttribute('href') === `#${activeId}`;
    link.classList.toggle('active', active);
    if (active) link.setAttribute('aria-current', 'location');
    else link.removeAttribute('aria-current');
  });
  navFrame = null;
};
window.addEventListener('scroll', () => {
  if (!navFrame) navFrame = requestAnimationFrame(updateActiveNav);
}, { passive: true });
updateActiveNav();

/* 04 — custom cursor */
const cursorDot = document.querySelector('.cursor-dot');
const cursorRing = document.querySelector('.cursor-ring');
let mouseX = innerWidth / 2;
let mouseY = innerHeight / 2;
let ringX = mouseX;
let ringY = mouseY;
if (cursorDot && cursorRing && !coarsePointer.matches) {
  window.addEventListener('pointermove', (event) => {
    mouseX = event.clientX; mouseY = event.clientY;
    cursorDot.style.left = `${mouseX}px`; cursorDot.style.top = `${mouseY}px`;
    document.body.classList.add('pointer-ready');
    requestCursorFrame();
  }, { passive: true });

  let cursorFrame = 0;
  const animateCursor = () => {
    cursorFrame = 0;
    ringX += (mouseX - ringX) * 0.20;
    ringY += (mouseY - ringY) * 0.20;
    cursorRing.style.left = `${ringX}px`;
    cursorRing.style.top = `${ringY}px`;
    if (Math.abs(mouseX - ringX) > 0.25 || Math.abs(mouseY - ringY) > 0.25) {
      cursorFrame = requestAnimationFrame(animateCursor);
    }
  };
  const requestCursorFrame = () => {
    if (!cursorFrame) cursorFrame = requestAnimationFrame(animateCursor);
  };

  document.querySelectorAll('a, button, .project-link').forEach((el) => {
    el.addEventListener('pointerenter', () => document.body.classList.add('cursor-active'));
    el.addEventListener('pointerleave', () => document.body.classList.remove('cursor-active'));
  });
}

/* 05 — hero mouse parallax */
const hero = document.querySelector('.hero');
const parallaxLayers = [...document.querySelectorAll('[data-parallax]')];
if (hero && parallaxLayers.length && !coarsePointer.matches && !reducedMotion.matches) {
  let px = 0, py = 0, frame = null;
  let heroRect = null;
  const measureHero = () => { heroRect = hero.getBoundingClientRect(); };
  const renderParallax = () => {
    parallaxLayers.forEach((layer) => {
      const depth = Number(layer.dataset.parallax || 0);
      layer.style.setProperty('--parallax-x', `${px * depth}px`);
      layer.style.setProperty('--parallax-y', `${py * depth}px`);
    });
    frame = null;
  };
  hero.addEventListener('pointerenter', measureHero, { passive: true });
  hero.addEventListener('pointermove', (event) => {
    const rect = heroRect;
    if (!rect) return;
    px = (event.clientX - (rect.left + rect.width / 2)) / 9;
    py = (event.clientY - (rect.top + rect.height / 2)) / 9;
    if (!frame) frame = requestAnimationFrame(renderParallax);
  }, { passive: true });
  hero.addEventListener('pointerleave', () => {
    px = py = 0;
    heroRect = null;
    if (!frame) frame = requestAnimationFrame(renderParallax);
  });
  window.addEventListener('resize', () => { if (heroRect) measureHero(); }, { passive: true });
}

/* 06 — richer particles: dust + embers */
const canvas = document.querySelector('.particles');
const ctx = canvas?.getContext('2d');
let particles = [];
let particleFrame = null;
let particleGlow = null;
let particleResizeFrame = 0;
let particleViewportWidth = 0;
let particleViewportHeight = 0;

function createParticleSprite(type) {
  const sprite = document.createElement('canvas');
  const size = type === 'ember' ? 40 : 20;
  sprite.width = sprite.height = size;
  const sctx = sprite.getContext('2d');
  if (!sctx) return sprite;
  const radius = size / 2;
  const gradient = sctx.createRadialGradient(radius, radius, 0, radius, radius, radius);
  if (type === 'ember') {
    gradient.addColorStop(0, 'rgba(245,199,120,.95)');
    gradient.addColorStop(.24, 'rgba(229,173,91,.72)');
    gradient.addColorStop(.62, 'rgba(220,154,72,.18)');
    gradient.addColorStop(1, 'rgba(220,154,72,0)');
  } else {
    gradient.addColorStop(0, 'rgba(230,220,200,.78)');
    gradient.addColorStop(.48, 'rgba(218,204,177,.34)');
    gradient.addColorStop(1, 'rgba(218,204,177,0)');
  }
  sctx.fillStyle = gradient;
  sctx.fillRect(0, 0, size, size);
  return sprite;
}

const particleSprites = {
  ember: createParticleSprite('ember'),
  dust: createParticleSprite('dust'),
};

function createParticles() {
  const baseCount = isProjectPage
    ? (coarsePointer.matches ? 16 : Math.max(20, Math.min(34, Math.floor(innerWidth / 44))))
    : (coarsePointer.matches ? 22 : Math.max(28, Math.min(52, Math.floor(innerWidth / 30))));
  particles = Array.from({ length: baseCount }, (_, index) => {
    const ember = index % 8 === 0;
    return {
      type: ember ? 'ember' : 'dust',
      x: Math.random() * innerWidth,
      y: Math.random() * innerHeight,
      radius: ember ? Math.random() * 1.8 + 1.0 : Math.random() * 1.15 + 0.25,
      alpha: ember ? Math.random() * .28 + .20 : Math.random() * .24 + .08,
      vx: (Math.random() - .5) * (ember ? .22 : .12),
      vy: -(Math.random() * (ember ? .42 : .22) + (ember ? .11 : .035)),
      phase: Math.random() * Math.PI * 2,
      drift: Math.random() * .7 + .3,
    };
  });
}

function resizeCanvas({ force = false } = {}) {
  if (!canvas || !ctx) return;
  const width = Math.max(innerWidth, 1);
  const height = Math.max(innerHeight, 1);
  const widthChanged = Math.abs(width - particleViewportWidth) > 2;
  const heightDelta = Math.abs(height - particleViewportHeight);
  if (!force && coarsePointer.matches && !widthChanged && particleViewportHeight && heightDelta < 96) return;
  particleViewportWidth = width;
  particleViewportHeight = height;
  const dprCap = isProjectPage ? 1 : (coarsePointer.matches ? .92 : 1.18);
  const dpr = Math.min(devicePixelRatio || 1, dprCap);
  canvas.width = Math.floor(width * dpr);
  canvas.height = Math.floor(height * dpr);
  canvas.style.width = `${width}px`;
  canvas.style.height = `${height}px`;
  ctx.setTransform(dpr,0,0,dpr,0,0);
  particleGlow = ctx.createRadialGradient(width*.66, height*.1, 0, width*.66, height*.1, Math.max(width,height)*.78);
  particleGlow.addColorStop(0,'rgba(185,144,79,.105)');
  particleGlow.addColorStop(.45,'rgba(118,72,30,.026)');
  particleGlow.addColorStop(1,'rgba(0,0,0,0)');
  createParticles();
}

let particleLastPaint = 0;
function drawParticles(now = performance.now()) {
  if (!canvas || !ctx) return;
  const minFrameMs = isProjectPage ? (coarsePointer.matches ? 54 : 42) : (coarsePointer.matches ? 45 : 34);
  if (now - particleLastPaint < minFrameMs) {
    particleFrame = requestAnimationFrame(drawParticles);
    return;
  }
  particleLastPaint = now;
  ctx.clearRect(0,0,innerWidth,innerHeight);
  if (particleGlow) {
    ctx.fillStyle = particleGlow;
    ctx.fillRect(0,0,innerWidth,innerHeight);
  }

  particles.forEach((p) => {
    p.phase += p.type === 'ember' ? .027 : .014;
    p.x += p.vx + Math.sin(p.phase) * .06 * p.drift;
    p.y += p.vy;
    if (p.y < -12) { p.y = innerHeight + 12; p.x = Math.random() * innerWidth; }
    if (p.x < -20) p.x = innerWidth + 20;
    if (p.x > innerWidth + 20) p.x = -20;
    const flicker = Math.sin(p.phase * 1.9) * (p.type === 'ember' ? .09 : .04);
    const a = Math.max(.035, p.alpha + flicker);
    const sprite = particleSprites[p.type];
    const scale = p.type === 'ember' ? p.radius * 5.8 : p.radius * 4.1;
    ctx.globalAlpha = Math.min(1, a * (p.type === 'ember' ? 1.25 : 1.5));
    ctx.drawImage(sprite, p.x - scale / 2, p.y - scale / 2, scale, scale);
  });
  ctx.globalAlpha = 1;
  particleFrame = requestAnimationFrame(drawParticles);
}

if (canvas && ctx) {
  resizeCanvas({ force: true });

  const particlesShouldRun = () => !document.hidden && !reducedMotion.matches &&
    (!hasManagedWelcome || document.body.classList.contains('portfolio-active'));
  const syncParticleLoop = () => {
    if (!particlesShouldRun()) {
      if (particleFrame) cancelAnimationFrame(particleFrame);
      particleFrame = null;
      return;
    }
    if (!particleFrame) particleFrame = requestAnimationFrame(drawParticles);
  };

  syncParticleLoop();
  window.addEventListener('aspik:viewchange', syncParticleLoop);
  window.addEventListener('resize', () => {
    if (particleResizeFrame) return;
    particleResizeFrame = requestAnimationFrame(() => {
      particleResizeFrame = 0;
      resizeCanvas();
    });
  }, { passive: true });
  window.addEventListener('orientationchange', () => {
    window.setTimeout(() => resizeCanvas({ force: true }), 120);
  }, { passive: true });
  document.addEventListener('visibilitychange', syncParticleLoop);
}

/* 07 — internal links */
document.querySelectorAll('a[href^="#"]').forEach((anchor) => {
  anchor.addEventListener('click', (event) => {
    /* The cinematic home button owns its own reversible timeline. Do not let
       the generic anchor scroller fight that animation. */
    if (hasManagedWelcome && anchor.classList.contains('js-return-welcome')) return;
    const href = anchor.getAttribute('href');
    if (!href || href === '#') return;
    const target = document.querySelector(href);
    if (!target) return;
    event.preventDefault();
    target.scrollIntoView({ behavior: reducedMotion.matches ? 'auto' : 'smooth', block: 'start' });
  });
});

/* =========================================================
   CERTIFICATION CAROUSEL
========================================================= */

const credentialTrack = document.querySelector('.credential-track');
const credentialPrev = document.querySelector('.credential-arrow--prev');
const credentialNext = document.querySelector('.credential-arrow--next');
const credentialProgress = document.querySelector('.credential-progress span');

function getCredentialStep() {
  if (!credentialTrack) return 0;
  const firstCard = credentialTrack.querySelector('.credential-card');
  if (!firstCard) return credentialTrack.clientWidth * 0.82;

  const styles = window.getComputedStyle(credentialTrack);
  const gap = Number.parseFloat(styles.columnGap || styles.gap || '0') || 0;
  return firstCard.getBoundingClientRect().width + gap;
}

function updateCredentialCarousel() {
  if (!credentialTrack) return;

  const maxScroll = Math.max(0, credentialTrack.scrollWidth - credentialTrack.clientWidth);
  const progress = maxScroll > 0 ? credentialTrack.scrollLeft / maxScroll : 0;
  const edge = 3;

  if (credentialPrev) credentialPrev.disabled = credentialTrack.scrollLeft <= edge;
  if (credentialNext) credentialNext.disabled = credentialTrack.scrollLeft >= maxScroll - edge;

  if (credentialProgress) {
    credentialProgress.style.left = `${progress * 75}%`;
  }
}

credentialPrev?.addEventListener('click', () => {
  credentialTrack?.scrollBy({
    left: -getCredentialStep(),
    behavior: 'smooth'
  });
});

credentialNext?.addEventListener('click', () => {
  credentialTrack?.scrollBy({
    left: getCredentialStep(),
    behavior: 'smooth'
  });
});

credentialTrack?.addEventListener('scroll', updateCredentialCarousel, { passive: true });
let credentialResizeFrame = 0;
window.addEventListener('resize', () => {
  if (credentialResizeFrame) return;
  credentialResizeFrame = requestAnimationFrame(() => {
    credentialResizeFrame = 0;
    updateCredentialCarousel();
  });
}, { passive: true });

/* pointer drag for the certification rail */
let credentialDragging = false;
let credentialMoved = false;
let credentialStartX = 0;
let credentialStartScroll = 0;
let suppressCredentialClick = false;

credentialTrack?.addEventListener('pointerenter', () => {
  if (!coarsePointer.matches) document.body.classList.add('credential-hover');
});

credentialTrack?.addEventListener('pointerleave', () => {
  document.body.classList.remove('credential-hover');
  if (!credentialDragging) credentialTrack.classList.remove('is-dragging');
});

credentialTrack?.addEventListener('pointerdown', (event) => {
  if (event.button !== 0) return;
  credentialDragging = true;
  credentialMoved = false;
  credentialStartX = event.clientX;
  credentialStartScroll = credentialTrack.scrollLeft;
  credentialTrack.classList.add('is-dragging');
  try { credentialTrack.setPointerCapture(event.pointerId); } catch (error) {}
});

credentialTrack?.addEventListener('pointermove', (event) => {
  if (!credentialDragging) return;
  const delta = event.clientX - credentialStartX;
  if (Math.abs(delta) > 5) credentialMoved = true;
  credentialTrack.scrollLeft = credentialStartScroll - delta * 1.05;
});

const stopCredentialDrag = (event) => {
  if (!credentialDragging) return;
  credentialDragging = false;
  credentialTrack?.classList.remove('is-dragging');
  try { credentialTrack?.releasePointerCapture(event.pointerId); } catch (error) {}
  if (credentialMoved) {
    suppressCredentialClick = true;
    window.setTimeout(() => { suppressCredentialClick = false; }, 80);
  }
};

credentialTrack?.addEventListener('pointerup', stopCredentialDrag);
credentialTrack?.addEventListener('pointercancel', stopCredentialDrag);
credentialTrack?.addEventListener('click', (event) => {
  if (suppressCredentialClick) {
    event.preventDefault();
    event.stopPropagation();
  }
}, true);

updateCredentialCarousel();

})();
