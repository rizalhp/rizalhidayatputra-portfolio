(() => {
'use strict';
/* ASPIK PORTFOLIO — V2 */

const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
const coarsePointer = window.matchMedia('(pointer: coarse)');
try { history.scrollRestoration = 'manual'; } catch (error) {}

/* Stage 2 performance profile — preserve the same art direction while scaling
   procedural density to the device instead of forcing one desktop workload
   everywhere. */
const hardwareThreads = navigator.hardwareConcurrency || 4;
const deviceMemoryGB = navigator.deviceMemory || null;
const viewportWidth = () => Math.max(window.innerWidth, 1);
const viewportHeight = () => Math.max(window.innerHeight, 1);
const getPerfTier = () => {
  const width = viewportWidth();
  if (reducedMotion.matches) return 'reduced';
  if (coarsePointer.matches || width <= 560 || hardwareThreads <= 4 || (deviceMemoryGB && deviceMemoryGB <= 4)) return 'lite';
  if (width <= 900 || hardwareThreads <= 6) return 'balanced';
  return 'full';
};
const qualityForTier = (tier = getPerfTier()) => ({ reduced: 0, lite: .44, balanced: .62, full: .78 }[tier] ?? .62);
const scaledCount = (base, minimum = 1) => Math.max(minimum, Math.round(base * qualityForTier()));
const getEdgeHeight = () => viewportWidth() <= 560 ? 205 : viewportWidth() <= 900 ? 245 : 320;
const syncPerfTierClass = () => {
  const tier = getPerfTier();
  document.documentElement.dataset.perfTier = tier;
  return tier;
};
syncPerfTierClass();

/* 01 — true scroll-scrubbed reversible mosaic welcome <-> portfolio transition */
const welcomeScreen = document.querySelector('.welcome-screen');
const welcomeEnter = document.querySelector('.welcome-enter');
const transitionStage = document.querySelector('.portfolio-transition');
const mosaicDesaturate = document.querySelector('.mosaic-desaturate');
const mosaicEdge = document.querySelector('.mosaic-edge');
const mosaicContourBand = document.querySelector('.mosaic-contour-band');
const mosaicNeutral = document.querySelector('.mosaic-neutral');
const mosaicOrganicField = document.querySelector('.mosaic-organic-field');
const mosaicGrain = document.querySelector('.mosaic-grain');
const mosaicDividerSvg = document.querySelector('.mosaic-divider-svg');
const mosaicDividerLine = document.querySelector('.mosaic-divider-line');
const mosaicDividerEcho = document.querySelector('.mosaic-divider-echo');
const returnWelcomeTriggers = [...document.querySelectorAll('.js-return-welcome')];
const siteHeader = document.querySelector('.site-header');
const mainContent = document.querySelector('main');
let initialDeepLink = null;
if (location.hash && location.hash !== '#welcome') {
  try { initialDeepLink = document.getElementById(decodeURIComponent(location.hash.slice(1))); }
  catch (error) { initialDeepLink = null; }
}

let introProgress = 0;
let introTargetProgress = 0;
let introView = 'welcome';
let introTransitioning = false;
/* Once the physical scroll has clearly left the welcome screen, finish the
   intertitle -> portfolio portion automatically. This removes the small
   'stuck' feeling where the user previously had to keep scrolling through
   the Portfolio Introduction card. */
const INTRO_AUTO_FORWARD_THRESHOLD = 0.50;
let scrubFrame = 0;
let programmaticToken = 0;
let touchLastY = null;
let historyView = 'welcome';
let dividerFrame = 0;
let currentEdgeY = window.innerHeight * 1.12;
let currentEdgeHeight = 230;
let currentEdgeOpacity = 0;
let contourAssetsReady = false;

function ensureContourAssets() {
  if (contourAssetsReady) return;
  contourAssetsReady = true;
  document.querySelectorAll('.mosaic-contour-art[data-src]').forEach((img) => {
    const src = img.dataset.src;
    if (src && !img.getAttribute('src')) img.setAttribute('src', src);
  });
}

/* Warm the contour artwork only for the cinematic route. Deep links from a
   project record bypass it entirely, avoiding an unnecessary image decode. */
if (!initialDeepLink) {
  if ('requestIdleCallback' in window) requestIdleCallback(ensureContourAssets, { timeout: 1400 });
  else window.setTimeout(ensureContourAssets, 700);
}

const clamp01 = (value) => Math.min(1, Math.max(0, value));
const smoothstep = (a, b, value) => {
  const t = clamp01((value - a) / Math.max(0.0001, b - a));
  return t * t * (3 - 2 * t);
};


function hashNoise(value) {
  const x = Math.sin(value * 127.1 + 311.7) * 43758.5453123;
  return (x - Math.floor(x)) * 2 - 1;
}

function valueNoise1D(x, seed = 0) {
  const i = Math.floor(x);
  const f = x - i;
  const u = f * f * (3 - 2 * f);
  const a = hashNoise(i + seed * 19.37);
  const b = hashNoise(i + 1 + seed * 19.37);
  return a + (b - a) * u;
}

function organicNoise1D(x, phase) {
  /* Fractal VALUE noise rather than stacked sine waves. This is important:
     the shoreline no longer repeats at obvious intervals and reads more like
     erosion / ink dissolution in the Silver Palace reference. */
  const n1 = valueNoise1D(x * 2.35 + phase * .055, 7);
  const n2 = valueNoise1D(x * 5.15 - phase * .037, 23);
  const n3 = valueNoise1D(x * 11.8 + phase * .018, 61);
  const n4 = valueNoise1D(x * 24.0 - phase * .009, 101);
  return n1 * .54 + n2 * .27 + n3 * .135 + n4 * .055;
}

function waveCutPoints(now = performance.now()) {
  const width = Math.max(window.innerWidth, 1);
  const height = viewportHeight();
  const mobile = width <= 560;
  const tablet = width <= 900;
  const tier = getPerfTier();
  const count = tier === 'lite' ? (mobile ? 54 : 68) : tier === 'balanced' ? (mobile ? 62 : tablet ? 78 : 92) : (mobile ? 68 : tablet ? 88 : 108);
  const phase = now * 0.001;
  const macroAmp = mobile ? 18 : tablet ? 26 : 34;
  const erosionAmp = mobile ? 20 : tablet ? 29 : 38;
  const microAmp = mobile ? 7 : tablet ? 10 : 13;
  const points = [];

  const gaussian = (x, center, spread) => {
    const d = (x - center) / spread;
    return Math.exp(-(d * d) * 0.5);
  };

  for (let i = 0; i <= count; i += 1) {
    const t = i / count;
    const x = t * width;

    /* Silver Palace's front is not a giant sine-wave.  Its macro silhouette
       is comparatively calm while the *band around it* does the visual work.
       Keep only a few broad, shallow shoulders here. */
    const macro =
      gaussian(t, .12, .095) * macroAmp * .36 -
      gaussian(t, .28, .075) * macroAmp * .28 +
      gaussian(t, .44, .115) * macroAmp * .22 -
      gaussian(t, .58, .080) * macroAmp * .34 +
      gaussian(t, .72, .110) * macroAmp * .27 -
      gaussian(t, .88, .070) * macroAmp * .20;

    const erosion = organicNoise1D(t * 2.8 + .31, phase * .88) * erosionAmp;
    const living =
      valueNoise1D(t * 15.0 + phase * .14, 149) * microAmp * .54 +
      valueNoise1D(t * 36.0 - phase * .105, 211) * microAmp * .32 +
      valueNoise1D(t * 62.0 + phase * .19, 287) * microAmp * .16 +
      Math.sin(phase * .82 + t * 10.5) * microAmp * .18;

    const bias = (t - .5) * macroAmp * .10;
    points.push({ x, y: currentEdgeY + macro + erosion + living + bias });
  }

  return points.map((point) => ({
    x: Number.isFinite(point.x) ? point.x : 0,
    y: Number.isFinite(point.y) ? point.y : height,
  }));
}
function pointsToBezier(points) {
  if (!points.length) return '';
  if (points.length < 2) return `M ${points[0].x.toFixed(2)} ${points[0].y.toFixed(2)}`;
  let d = `M ${points[0].x.toFixed(2)} ${points[0].y.toFixed(2)}`;
  const tension = 0.36;
  for (let i = 0; i < points.length - 1; i += 1) {
    const p0 = points[Math.max(0, i - 1)];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[Math.min(points.length - 1, i + 2)];
    const c1x = p1.x + ((p2.x - p0.x) / 6) * tension;
    const c1y = p1.y + ((p2.y - p0.y) / 6) * tension;
    const c2x = p2.x - ((p3.x - p1.x) / 6) * tension;
    const c2y = p2.y - ((p3.y - p1.y) / 6) * tension;
    d += ` C ${c1x.toFixed(2)} ${c1y.toFixed(2)}, ${c2x.toFixed(2)} ${c2y.toFixed(2)}, ${p2.x.toFixed(2)} ${p2.y.toFixed(2)}`;
  }
  return d;
}

function boundaryYAt(points, x) {
  if (!points.length) return innerHeight;
  const width = Math.max(innerWidth, 1);
  const raw = (x / width) * (points.length - 1);
  const i = Math.max(0, Math.min(points.length - 2, Math.floor(raw)));
  const f = raw - i;
  return points[i].y + (points[i + 1].y - points[i].y) * f;
}

const seededCache = new Map();
function seeded01(value) {
  const cached = seededCache.get(value);
  if (cached !== undefined) return cached;
  const result = (hashNoise(value) + 1) * .5;
  seededCache.set(value, result);
  return result;
}

const organicCtx = mosaicOrganicField?.getContext('2d', { alpha: true, desynchronized: true }) || null;

function renderOrganicField(points, now = performance.now()) {
  const canvas = mosaicOrganicField;
  if (!canvas || !points.length) return;
  const width = Math.max(innerWidth, 1);
  const height = viewportHeight();
  const mobile = width <= 560;
  const tablet = width <= 900;
  const tier = getPerfTier();
  const dprCap = tier === 'lite' ? .82 : tier === 'balanced' ? .95 : 1.05;
  const dpr = Math.min(window.devicePixelRatio || 1, dprCap);
  const cw = Math.max(1, Math.round(width * dpr));
  const ch = Math.max(1, Math.round(height * dpr));
  if (canvas.width !== cw || canvas.height !== ch) {
    canvas.width = cw;
    canvas.height = ch;
  }
  const ctx = organicCtx;
  if (!ctx) return;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, width, height);

  const phase = now * .001;
  const bandDepth = mobile ? 76 : tablet ? 104 : 126;
  const bandRise = mobile ? 50 : tablet ? 68 : 84;
  /* Keep the dissolve zone alive even while the user pauses mid-scroll.
     These offsets create a gentle tidal motion rather than a static mask. */
  const bandFloat = Math.sin(phase * .86) * (mobile ? 3.0 : tablet ? 4.0 : 5.2);
  const bandBreath = valueNoise1D(phase * .18, 911) * (mobile ? 3.4 : tablet ? 4.7 : 6.0);
  const bandTide = Math.sin(phase * .42 + .9) * (mobile ? 2.0 : tablet ? 2.8 : 3.6);
  const bandCenterDrift = bandFloat + bandBreath + bandTide;

  const beginLowerField = () => {
    ctx.beginPath();
    ctx.moveTo(points[0].x, points[0].y);
    for (let i = 1; i < points.length; i += 1) ctx.lineTo(points[i].x, points[i].y);
    ctx.lineTo(width, height + 4);
    ctx.lineTo(0, height + 4);
    ctx.closePath();
  };

  ctx.save();
  beginLowerField();

  /* Dark cloth / slate body.  It continues to the bottom, but the top edge is
     deliberately destroyed by the abstract erosion band below, so the eye no
     longer reads a simple polygon or divider line. */
  const gradient = ctx.createLinearGradient(0, Math.max(-40, currentEdgeY - 72), 0, height + 16);
  gradient.addColorStop(0, 'rgba(17,20,26,.90)');
  gradient.addColorStop(.10, 'rgba(22,25,32,.93)');
  gradient.addColorStop(.34, 'rgba(31,35,44,.95)');
  gradient.addColorStop(.62, 'rgba(48,53,64,.95)');
  gradient.addColorStop(.84, 'rgba(67,73,84,.94)');
  gradient.addColorStop(1, 'rgba(92,98,108,.92)');
  ctx.fillStyle = gradient;
  ctx.fill();

  /* Add a very light atmospheric wash so the lower field feels less like a
     flat panel and more like a soft cinematic space. These are only a few
     large gradients, so the cost stays low. */
  ctx.save();
  beginLowerField();
  ctx.clip();
  ctx.globalCompositeOperation = 'screen';

  const centralBloom = ctx.createRadialGradient(
    width * .52 + Math.sin(phase * .22) * width * .018,
    currentEdgeY + (height - currentEdgeY) * .68,
    0,
    width * .52 + Math.sin(phase * .22) * width * .018,
    currentEdgeY + (height - currentEdgeY) * .68,
    Math.max(width, height) * .58
  );
  centralBloom.addColorStop(0, 'rgba(236,238,242,.120)');
  centralBloom.addColorStop(.32, 'rgba(214,220,230,.075)');
  centralBloom.addColorStop(.70, 'rgba(160,170,184,.024)');
  centralBloom.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = centralBloom;
  ctx.fillRect(0, Math.max(0, currentEdgeY - 10), width, height - Math.max(0, currentEdgeY - 10));

  const topFeather = ctx.createLinearGradient(0, currentEdgeY - 10, 0, currentEdgeY + bandDepth * 1.3);
  topFeather.addColorStop(0, 'rgba(255,255,255,.070)');
  topFeather.addColorStop(.18, 'rgba(225,228,234,.045)');
  topFeather.addColorStop(.58, 'rgba(165,172,184,.015)');
  topFeather.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = topFeather;
  ctx.fillRect(0, Math.max(0, currentEdgeY - 16), width, bandDepth * 1.55);

  const sideMist = ctx.createRadialGradient(
    width * .84 + Math.cos(phase * .17) * width * .016,
    currentEdgeY + (height - currentEdgeY) * .44,
    0,
    width * .84 + Math.cos(phase * .17) * width * .016,
    currentEdgeY + (height - currentEdgeY) * .44,
    Math.max(width, height) * .34
  );
  sideMist.addColorStop(0, 'rgba(198,205,214,.055)');
  sideMist.addColorStop(.52, 'rgba(150,160,176,.018)');
  sideMist.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = sideMist;
  ctx.fillRect(0, Math.max(0, currentEdgeY - 10), width, height - Math.max(0, currentEdgeY - 10));
  ctx.restore();

  ctx.save();
  beginLowerField();
  ctx.clip();
  ctx.globalCompositeOperation = 'multiply';
  const vignette = ctx.createLinearGradient(0, currentEdgeY + bandDepth * .55, 0, height);
  vignette.addColorStop(0, 'rgba(0,0,0,0)');
  vignette.addColorStop(.52, 'rgba(10,12,16,.055)');
  vignette.addColorStop(1, 'rgba(6,8,12,.11)');
  ctx.fillStyle = vignette;
  ctx.fillRect(0, Math.max(0, currentEdgeY), width, height - Math.max(0, currentEdgeY));
  ctx.restore();

  /* Broad woven / charcoal strokes inside the lower material.  These mirror
     the smeared fabric-like marks in the reference rather than a flat plate. */
  ctx.save();
  beginLowerField();
  ctx.clip();
  ctx.globalCompositeOperation = 'soft-light';
  const weaveRows = scaledCount(mobile ? 16 : 26, 10);
  for (let i = 0; i < weaveRows; i += 1) {
    const seed = 1100 + i * 37.71;
    const y = currentEdgeY + 26 + seeded01(seed) * Math.max(90, height - currentEdgeY) + Math.sin(phase * .42 + i * .38) * (1.5 + seeded01(seed + 21.5) * 5.5);
    const x0 = -40 + seeded01(seed + 3.2) * width * .16;
    const x1 = width + 40;
    const wobble = 5 + seeded01(seed + 7.8) * 18;
    ctx.beginPath();
    ctx.moveTo(x0, y);
    const pieces = 7;
    for (let j = 1; j <= pieces; j += 1) {
      const t = j / pieces;
      const x = x0 + (x1 - x0) * t;
      const yy = y + valueNoise1D(i * 2.3 + j * .64 + phase * .012, 619) * wobble;
      ctx.lineTo(x, yy);
    }
    ctx.strokeStyle = `rgba(235,238,241,${(.008 + seeded01(seed + 15) * .015).toFixed(3)})`;
    ctx.lineWidth = .7 + seeded01(seed + 17) * 2.1;
    ctx.stroke();
  }
  ctx.restore();

  /* Shred the mathematical ridge itself before adding any debris.  This pass
     deliberately destroys long uninterrupted spans of the fill boundary, so
     even at a glance there is no single wave/path left to follow. */
  ctx.globalCompositeOperation = 'destination-out';
  let shredX = -8;
  let shredIndex = 0;
  while (shredX < width + 8) {
    const base = 2511 + shredIndex * 29.47;
    const gap = 2.5 + seeded01(base) * (mobile ? 7 : 11);
    shredX += gap;
    const by = boundaryYAt(points, shredX) + bandCenterDrift * .55;
    if (seeded01(base + 3.7) > .21) {
      const rw = 1.2 + Math.pow(seeded01(base + 5.2), 1.8) * (mobile ? 8 : 15);
      const rh = .7 + Math.pow(seeded01(base + 8.4), 2.2) * (mobile ? 4.5 : 8.5);
      const yy = by + (seeded01(base + 11.9) - .15) * (mobile ? 13 : 20);
      ctx.globalAlpha = .42 + seeded01(base + 14.1) * .58;
      ctx.save();
      ctx.translate(shredX, yy);
      ctx.rotate((seeded01(base + 16.7) - .5) * .9);
      ctx.beginPath();
      ctx.ellipse(0, 0, rw, rh, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
    shredIndex += 1;
  }
  ctx.globalAlpha = 1;

  /* First break the remaining nominal border. Hundreds of holes cut back
     into the grey at different depths, with a long-tail distribution so a few
     cuts reach much deeper than their neighbours. */
  ctx.globalCompositeOperation = 'destination-out';
  const holeCount = scaledCount(mobile ? 180 : tablet ? 280 : 420, 90);
  for (let i = 0; i < holeCount; i += 1) {
    const base = i * 19.713 + 17;
    const x = seeded01(base) * width;
    const by = boundaryYAt(points, x) + bandCenterDrift;
    const r = seeded01(base + 4.1);
    const depth = Math.pow(r, 2.4) * bandDepth;
    const drift = valueNoise1D(i * .29 + phase * .10, 307) * (mobile ? 5 : 8);
    const bob = Math.sin(phase * (1.05 + seeded01(base + 18.2) * .85) + x * .011 + base * .013) * (1.8 + seeded01(base + 24.7) * (mobile ? 4.5 : 7.5));
    const y = by + depth + drift + bob - 2;
    const rw = .8 + Math.pow(seeded01(base + 8.7), 2.1) * (mobile ? 12 : 22);
    const rh = .55 + Math.pow(seeded01(base + 12.4), 2.5) * (mobile ? 4.8 : 9.5);
    const alpha = .28 + seeded01(base + 20.9) * .72;
    ctx.globalAlpha = alpha * Math.max(.08, 1 - depth / (bandDepth * 1.06));
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate((seeded01(base + 2.3) - .5) * 1.15);
    if (seeded01(base + 31.2) > .44) {
      ctx.fillRect(-rw, -rh * .5, rw * 2, rh);
    } else {
      ctx.beginPath();
      ctx.ellipse(0, 0, rw, rh, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }
  ctx.globalAlpha = 1;

  /* Slate fragments protrude ABOVE the base boundary.  This is the main fix:
     the transition is a *zone* of disconnected islands, not one continuous
     line. Some pieces are hairline, some are chunky torn patches. */
  ctx.globalCompositeOperation = 'source-over';
  const islandCount = scaledCount(mobile ? 220 : tablet ? 360 : 540, 110);
  for (let i = 0; i < islandCount; i += 1) {
    const base = i * 27.19 + 71;
    const x = seeded01(base) * width + Math.sin(phase * .63 + base * .004) * (seeded01(base + 2.4) * (mobile ? 1.8 : 3.4));
    const by = boundaryYAt(points, x) + bandCenterDrift * .7;
    const reach = Math.pow(seeded01(base + 7.8), 2.25) * bandRise;
    const bob = Math.sin(phase * (1.22 + seeded01(base + 9.8) * .72) + x * .009) * (2.4 + seeded01(base + 12.7) * (mobile ? 5 : 8));
    const y = by - reach + valueNoise1D(i * .21 + phase * .13, 401) * 7 + bob;
    const closeness = Math.max(0, 1 - reach / (bandRise * 1.15));
    if (closeness <= 0) continue;
    const w = .8 + Math.pow(seeded01(base + 11.2), 2.35) * (mobile ? 16 : 29);
    const h = .5 + Math.pow(seeded01(base + 13.9), 2.8) * (mobile ? 5 : 10);
    const a = (.08 + seeded01(base + 18.4) * .24) * closeness * currentEdgeOpacity;
    ctx.fillStyle = `rgba(${70 + Math.round(seeded01(base + 20.2) * 27)},${75 + Math.round(seeded01(base + 22.7) * 30)},${85 + Math.round(seeded01(base + 25.8) * 33)},${Math.max(0, a).toFixed(3)})`;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate((seeded01(base + 31.1) - .5) * .82);
    if (seeded01(base + 35.8) > .52) ctx.fillRect(-w * .5, -h * .5, w, h);
    else {
      ctx.beginPath();
      ctx.ellipse(0, 0, w * .46, h, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  /* Long, broken charcoal ribbons around the shoreline. They are deliberately
     discontinuous and overlap at unrelated angles, producing the abstract
     "line" seen in Silver Palace without ever drawing a divider path. */
  ctx.globalCompositeOperation = 'source-over';
  const ribbonCount = scaledCount(mobile ? 38 : 64, 20);
  for (let i = 0; i < ribbonCount; i += 1) {
    const base = i * 83.17 + 909;
    const x = seeded01(base) * width + Math.sin(phase * .52 + i * .41) * (mobile ? .9 : 1.7);
    const by = boundaryYAt(points, x) + bandCenterDrift * .48;
    const y = by + (seeded01(base + 2.7) - .58) * (mobile ? 42 : 66) + Math.sin(phase * (0.88 + seeded01(base + 7.1) * .45) + base * .017) * (1.4 + seeded01(base + 8.8) * 4.2);
    const len = 12 + Math.pow(seeded01(base + 4.1), 1.55) * (mobile ? 58 : 110);
    const segs = 3 + Math.floor(seeded01(base + 6.2) * 5);
    const tilt = (seeded01(base + 9.3) - .5) * .34;
    const alpha = (.06 + seeded01(base + 11.4) * .15) * currentEdgeOpacity;
    ctx.strokeStyle = `rgba(13,15,19,${alpha.toFixed(3)})`;
    ctx.lineWidth = .8 + seeded01(base + 15.7) * 3.4;
    ctx.beginPath();
    for (let j = 0; j <= segs; j += 1) {
      const tt = j / segs;
      const xx = x - len * .5 + len * tt;
      const yy = y + Math.sin(tilt) * (xx - x) + valueNoise1D(base * .01 + j * .61 + phase * .025, 733) * (3 + seeded01(base + 19) * 8);
      if (j === 0) ctx.moveTo(xx, yy); else ctx.lineTo(xx, yy);
    }
    ctx.stroke();
  }

  /* Liquid veils: soft translucent swells that breathe up and down across
     the transition zone, making the dissolve feel less static and more fluid. */
  ctx.globalCompositeOperation = 'screen';
  const veilCount = scaledCount(mobile ? 10 : tablet ? 16 : 20, 7);
  for (let i = 0; i < veilCount; i += 1) {
    const base = 2801 + i * 71.17;
    const x = seeded01(base) * width + Math.sin(phase * (.25 + seeded01(base + 1.8) * .35) + base * .014) * (mobile ? 14 : 24);
    const by = boundaryYAt(points, x) + bandCenterDrift * 1.1;
    const y = by + (seeded01(base + 3.2) - .5) * (mobile ? 58 : 86) + Math.sin(phase * (.78 + seeded01(base + 5.5) * .65) + x * .008) * (mobile ? 8 : 14);
    const rx = 14 + Math.pow(seeded01(base + 7.1), 1.5) * (mobile ? 22 : 44);
    const ry = 4 + Math.pow(seeded01(base + 9.6), 1.6) * (mobile ? 10 : 20);
    const alpha = (.018 + seeded01(base + 13.2) * .030) * currentEdgeOpacity;
    ctx.fillStyle = `rgba(${228 + Math.round(seeded01(base + 15.9) * 16)},${232 + Math.round(seeded01(base + 18.7) * 14)},${238 + Math.round(seeded01(base + 21.4) * 12)},${alpha.toFixed(3)})`;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate((seeded01(base + 23.6) - .5) * .35);
    ctx.beginPath();
    ctx.ellipse(0, 0, rx, ry, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  /* Bright chalk flecks and short line segments.  Importantly these do not
     align into a single stroke: there are gaps, doubled clusters and isolated
     specks, making the eye read granular erosion instead of a wave. */
  ctx.globalCompositeOperation = 'screen';
  const fleckCount = scaledCount(mobile ? 320 : tablet ? 520 : 760, 170);
  for (let i = 0; i < fleckCount; i += 1) {
    const base = i * 43.113 + 101;
    const x = seeded01(base) * width + Math.sin(phase * .70 + base * .008) * (mobile ? 1.2 : 2.4);
    const by = boundaryYAt(points, x) + bandCenterDrift;
    const spread = mobile ? 70 : tablet ? 94 : 116;
    const band = (seeded01(base + 6.6) - .50) * spread;
    const y = by + band + valueNoise1D(i * .39 + phase * .17, 503) * 5 + Math.cos(phase * (1.4 + seeded01(base + 12.2) * .8) + x * .014) * (1.1 + seeded01(base + 15.6) * (mobile ? 2.8 : 4.8));
    const closeness = Math.max(0, 1 - Math.abs(band) / (spread * .62));
    if (closeness <= 0) continue;
    const a = (.06 + seeded01(base + 15.3) * .42) * closeness * currentEdgeOpacity;
    if (a < .018) continue;
    const len = .8 + Math.pow(seeded01(base + 21.7), 2.1) * (mobile ? 7 : 13);
    const thick = .35 + Math.pow(seeded01(base + 26.4), 3.0) * 2.1;
    ctx.strokeStyle = `rgba(246,247,245,${Math.min(.64, a).toFixed(3)})`;
    ctx.fillStyle = `rgba(246,247,245,${Math.min(.50, a * .85).toFixed(3)})`;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate((seeded01(base + 33.9) - .5) * 1.45);
    if (seeded01(base + 39.2) > .46) {
      ctx.beginPath();
      ctx.moveTo(-len * .5, 0);
      ctx.lineTo(len * .5, (seeded01(base + 41.8) - .5) * 2.2);
      ctx.lineWidth = thick;
      ctx.stroke();
    } else {
      ctx.beginPath();
      ctx.ellipse(0, 0, len * .23, thick * .72, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  /* Micro-granular dust fills the zone between large fragments so the edge
     reads rich and filmic rather than sparse. */
  const microDustCount = scaledCount(mobile ? 420 : tablet ? 760 : 1100, 210);
  for (let i = 0; i < microDustCount; i += 1) {
    const base = 5201 + i * 17.31;
    const x = seeded01(base) * width + Math.sin(phase * (.95 + seeded01(base + 1.7) * .9) + base * .005) * (mobile ? .9 : 1.7);
    const by = boundaryYAt(points, x) + bandCenterDrift;
    const spread = mobile ? 82 : tablet ? 108 : 132;
    const band = (seeded01(base + 4.8) - .50) * spread;
    const y = by + band + Math.sin(phase * (1.45 + seeded01(base + 8.2) * 1.1) + x * .022) * (0.8 + seeded01(base + 10.5) * 2.1);
    const closeness = Math.max(0, 1 - Math.abs(band) / (spread * .78));
    if (closeness <= 0) continue;
    const alpha = (.010 + seeded01(base + 12.9) * .085) * closeness * currentEdgeOpacity;
    ctx.fillStyle = `rgba(247,247,244,${Math.min(.16, alpha).toFixed(3)})`;
    const rw = .35 + seeded01(base + 15.6) * 1.3;
    const rh = .22 + seeded01(base + 18.2) * .9;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate((seeded01(base + 22.4) - .5) * 1.5);
    if (seeded01(base + 24.8) > .55) ctx.fillRect(-rw * .5, -rh * .5, rw, rh);
    else {
      ctx.beginPath();
      ctx.ellipse(0, 0, rw * .5, rh * .5, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  /* Clustered chalk scratches. Independent dust alone still reads as a fuzzy
     wave; these little families of strokes create the broken calligraphic /
     abstract-line character visible in the Silver Palace edge. */
  const clusterCount = scaledCount(mobile ? 30 : tablet ? 46 : 64, 18);
  for (let c = 0; c < clusterCount; c += 1) {
    const seed = 3301 + c * 91.73;
    const cx = seeded01(seed) * width + Math.sin(phase * .48 + c * .39) * (mobile ? 1.0 : 2.1);
    const cy = boundaryYAt(points, cx) + bandCenterDrift * .82 + (seeded01(seed + 2.1) - .53) * (mobile ? 48 : 70) + Math.sin(phase * (1.06 + seeded01(seed + 6.1) * .72) + cx * .01) * (1.8 + seeded01(seed + 7.5) * (mobile ? 3.4 : 5.4));
    const arms = 3 + Math.floor(seeded01(seed + 4.4) * 8);
    for (let a = 0; a < arms; a += 1) {
      const b = seed + a * 13.27;
      const ox = (seeded01(b + 1.4) - .5) * (mobile ? 30 : 52);
      const oy = (seeded01(b + 3.8) - .5) * (mobile ? 20 : 34);
      const len = 2 + Math.pow(seeded01(b + 6.1), 1.8) * (mobile ? 12 : 22);
      const ang = (seeded01(b + 9.2) - .5) * 2.2;
      const alpha = (.06 + seeded01(b + 11.6) * .28) * currentEdgeOpacity;
      ctx.strokeStyle = `rgba(248,248,244,${alpha.toFixed(3)})`;
      ctx.lineWidth = .45 + seeded01(b + 15.2) * 1.45;
      ctx.beginPath();
      ctx.moveTo(cx + ox, cy + oy);
      ctx.lineTo(cx + ox + Math.cos(ang) * len, cy + oy + Math.sin(ang) * len);
      ctx.stroke();
    }
  }

  /* Mobile glints / travelling shimmer: brighter than the base flecks but
     sparse, so the band catches light in brief moments instead of glowing all the time. */
  ctx.globalCompositeOperation = 'screen';
  const shimmerCount = scaledCount(mobile ? 8 : tablet ? 12 : 16, 6);
  for (let i = 0; i < shimmerCount; i += 1) {
    const base = 6101 + i * 111.41;
    const travel = (phase * (.06 + seeded01(base + 2.2) * .08) + seeded01(base + 4.9) * 3.7) % 1;
    const x = travel * width;
    const by = boundaryYAt(points, x) + bandCenterDrift * .9;
    const y = by + (seeded01(base + 7.1) - .54) * (mobile ? 34 : 52) + Math.sin(phase * (.92 + seeded01(base + 9.6) * .55) + x * .006) * (mobile ? 3.6 : 5.8);
    const len = 14 + Math.pow(seeded01(base + 12.7), 1.6) * (mobile ? 20 : 38);
    const alpha = (.045 + seeded01(base + 15.2) * .12) * currentEdgeOpacity;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate((seeded01(base + 18.4) - .5) * .42);
    ctx.shadowBlur = 10 + seeded01(base + 21.8) * 14;
    ctx.shadowColor = `rgba(255,255,246,${Math.min(.18, alpha * 1.2).toFixed(3)})`;
    ctx.strokeStyle = `rgba(252,252,245,${Math.min(.22, alpha).toFixed(3)})`;
    ctx.lineWidth = 1.0 + seeded01(base + 24.9) * 1.8;
    ctx.beginPath();
    ctx.moveTo(-len * .5, 0);
    ctx.lineTo(len * .5, (seeded01(base + 27.4) - .5) * 2.4);
    ctx.stroke();
    ctx.restore();
  }

  /* A sparse second layer of cool-grey sparks gives the subtle doubled edge
     visible in the reference without becoming a clean white outline. */
  const coolCount = scaledCount(mobile ? 110 : 180, 65);
  for (let i = 0; i < coolCount; i += 1) {
    const base = i * 61.33 + 1701;
    const x = seeded01(base) * width + Math.sin(phase * .58 + base * .005) * (mobile ? .7 : 1.4);
    const by = boundaryYAt(points, x) + bandCenterDrift;
    const y = by + (seeded01(base + 3.4) - .55) * (mobile ? 64 : 92) + Math.sin(phase * (1.7 + seeded01(base + 8.9)) + x * .016) * (0.9 + seeded01(base + 12.6) * (mobile ? 1.8 : 3.0));
    const a = (.035 + seeded01(base + 9.4) * .13) * currentEdgeOpacity;
    const r = .4 + seeded01(base + 13.3) * 2.2;
    ctx.fillStyle = `rgba(190,201,216,${a.toFixed(3)})`;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }

  /* Breathing mist / dissolve bloom around the erosion zone.
     This is the extra liveliness requested: the zone subtly rises, falls and
     shimmers instead of reading as a frozen procedural snapshot. */
  ctx.globalCompositeOperation = 'screen';
  const mistCount = scaledCount(mobile ? 36 : tablet ? 56 : 80, 22);
  for (let i = 0; i < mistCount; i += 1) {
    const base = 4401 + i * 67.23;
    const x = seeded01(base) * width;
    const by = boundaryYAt(points, x) + bandCenterDrift * 1.15;
    const y = by + (seeded01(base + 2.4) - .48) * (mobile ? 88 : 126) +
      Math.sin(phase * (.64 + seeded01(base + 4.9) * .9) + base * .012) * (mobile ? 8 : 13);
    const rx = 8 + Math.pow(seeded01(base + 7.5), 1.6) * (mobile ? 26 : 42);
    const ry = 3 + Math.pow(seeded01(base + 11.7), 1.8) * (mobile ? 11 : 19);
    const alpha = (.010 + seeded01(base + 15.1) * .032) * currentEdgeOpacity;
    ctx.fillStyle = `rgba(${220 + Math.round(seeded01(base + 18.2) * 18)},${223 + Math.round(seeded01(base + 20.6) * 18)},${229 + Math.round(seeded01(base + 22.8) * 16)},${alpha.toFixed(3)})`;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate((seeded01(base + 25.2) - .5) * .5);
    ctx.beginPath();
    ctx.ellipse(0, 0, rx, ry, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  /* Very fine paper grain below the front. */
  ctx.globalCompositeOperation = 'soft-light';
  const grainCount = scaledCount(mobile ? 240 : 420, 130);
  for (let i = 0; i < grainCount; i += 1) {
    const base = i * 59.71 + 199;
    const x = seeded01(base) * width;
    const by = boundaryYAt(points, x);
    const minY = Math.max(0, by + 18);
    if (minY >= height) continue;
    const y = minY + seeded01(base + 10.4) * (height - minY);
    const a = .010 + seeded01(base + 18.8) * .032;
    ctx.fillStyle = `rgba(255,255,255,${a.toFixed(3)})`;
    ctx.fillRect(x, y, 1 + seeded01(base + 2.8) * 2, 1);
  }
  ctx.restore();
}
function renderAnimatedWaveCut(now = performance.now()) {
  if (!transitionStage) return;
  const width = Math.max(window.innerWidth, 1);
  const height = viewportHeight();
  const points = waveCutPoints(now);
  if (!points.length) return;

  /* The old CSS plate is still clipped for fallback/reduced-motion support,
     but the visible live field is now the procedural canvas. */
  const platePolygon = [
    ...points.map((point) => `${point.x.toFixed(1)}px ${point.y.toFixed(1)}px`),
    `${width}px ${height + 2}px`,
    `0px ${height + 2}px`,
  ].join(',');
  const plateClip = `polygon(${platePolygon})`;
  [mosaicNeutral, mosaicGrain].forEach((layer) => {
    if (!layer) return;
    layer.style.clipPath = plateClip;
    layer.style.webkitClipPath = plateClip;
  });

  const upperRegion = [
    `0px 0px`,
    `${width}px 0px`,
    ...[...points].reverse().map((point) => `${point.x.toFixed(1)}px ${point.y.toFixed(1)}px`),
  ].join(',');
  const upperClip = `polygon(${upperRegion})`;

  /* Keep contour local to the erosion front rather than turning the whole
     image into a line drawing. */
  const contourFadeStart = Math.max(0, currentEdgeY - (window.innerWidth <= 560 ? 190 : window.innerWidth <= 900 ? 235 : 285));
  const contourFull = Math.max(0, currentEdgeY - (window.innerWidth <= 560 ? 70 : window.innerWidth <= 900 ? 88 : 105));
  const contourMask = `linear-gradient(to bottom, transparent 0px, transparent ${contourFadeStart.toFixed(1)}px, rgba(0,0,0,.28) ${(contourFadeStart + 48).toFixed(1)}px, #000 ${contourFull.toFixed(1)}px, #000 100%)`;
  if (mosaicContourBand) {
    mosaicContourBand.style.clipPath = upperClip;
    mosaicContourBand.style.webkitClipPath = upperClip;
    mosaicContourBand.style.maskImage = contourMask;
    mosaicContourBand.style.webkitMaskImage = contourMask;
  }

  const desaturateFadeStart = Math.max(0, currentEdgeY - (window.innerWidth <= 560 ? 245 : window.innerWidth <= 900 ? 300 : 360));
  const desaturateFull = Math.max(0, currentEdgeY - (window.innerWidth <= 560 ? 120 : window.innerWidth <= 900 ? 150 : 185));
  const desaturateMask = `linear-gradient(to bottom, transparent 0px, transparent ${desaturateFadeStart.toFixed(1)}px, rgba(0,0,0,.18) ${(desaturateFadeStart + 58).toFixed(1)}px, #000 ${desaturateFull.toFixed(1)}px, #000 100%)`;
  if (mosaicDesaturate) {
    mosaicDesaturate.style.clipPath = upperClip;
    mosaicDesaturate.style.webkitClipPath = upperClip;
    mosaicDesaturate.style.maskImage = desaturateMask;
    mosaicDesaturate.style.webkitMaskImage = desaturateMask;
  }

  /* Legacy vector line retained only for reduced-motion fallback; in the live
     experience CSS hides it. */
  if (mosaicDividerSvg) mosaicDividerSvg.setAttribute('viewBox', `0 0 ${width} ${height}`);
  const path = pointsToBezier(points);
  mosaicDividerLine?.setAttribute('d', path);
  mosaicDividerEcho?.setAttribute('d', path);

  renderOrganicField(points, now);
}
let dividerLastPaint = 0;
let lastIntroInputAt = 0;
let programmaticIntroActive = false;
function markIntroInput() { lastIntroInputAt = performance.now(); }
function startDividerLoop() {
  if (dividerFrame || reducedMotion.matches) return;
  const tick = (now) => {
    dividerFrame = 0;
    const live = introTransitioning || (introProgress > 0.001 && introProgress < 0.999);
    if (!live || document.hidden) return;
    const tier = getPerfTier();
    const recentlyDriven = programmaticIntroActive || now - lastIntroInputAt < 180;
    const minFrameMs = recentlyDriven
      ? (tier === 'lite' ? 42 : tier === 'balanced' ? 36 : 32)
      : (tier === 'lite' ? 92 : tier === 'balanced' ? 68 : 52);
    if (now - dividerLastPaint >= minFrameMs) {
      dividerLastPaint = now;
      renderAnimatedWaveCut(now);
    }
    dividerFrame = requestAnimationFrame(tick);
  };
  dividerFrame = requestAnimationFrame(tick);
}

function stopDividerLoop() {
  if (!dividerFrame) return;
  cancelAnimationFrame(dividerFrame);
  dividerFrame = 0;
}

/* Physical scroll controls the welcome half of the cinematic. Once that
   portion is clearly complete, V19.1 hands the intertitle -> portfolio half
   to a short automatic finish so the user never has to 'push through' it. */
const introScrollDistance = () => Math.max(1650, Math.min(2700, innerHeight * 2.2));

function lockViewport(locked) {
  document.documentElement.classList.toggle('intro-locked', locked);
  document.body.classList.toggle('intro-locked', locked);
}

function syncInteractiveState(view, transitioning = false) {
  const portfolioInteractive = view === 'portfolio' && !transitioning;
  const welcomeInteractive = view === 'welcome' && !transitioning;
  siteHeader?.toggleAttribute('inert', !portfolioInteractive);
  mainContent?.toggleAttribute('inert', !portfolioInteractive);
  welcomeScreen?.toggleAttribute('inert', !welcomeInteractive);
}

function renderIntroProgress(value) {
  introProgress = clamp01(value);
  const p = introProgress;
  const viewportH = viewportHeight();
  const edgeHeight = getEdgeHeight();

  /* Phase A — the coloured welcome is physically divided by a moving
     grey/white fracture. Its position is a pure function of scroll progress. */
  const sweep = smoothstep(0.015, 0.605, p);
  const edgeY = viewportH * 1.12 - sweep * viewportH * 1.34;
  const ridgeOffset = edgeHeight * 0.455;
  const mosaicY = edgeY - ridgeOffset;
  currentEdgeY = edgeY;
  currentEdgeHeight = edgeHeight;

  /* Phase B — the neutral chapter card bridges the two scenes. Forward
     navigation auto-completes shortly after this chapter becomes established. */
  const titleIn = smoothstep(0.33, 0.49, p);
  const titleOut = smoothstep(0.735, 0.875, p);
  const titleOpacity = titleIn * (1 - titleOut);

  /* Phase C — dissolve into the already-mounted portfolio. */
  const destination = smoothstep(0.775, 0.992, p);
  const stageOpacity = p <= 0.001 ? 0 : 1 - destination;
  const welcomeOpacity = 1 - smoothstep(0.59, 0.765, p);
  const edgeOpacity = smoothstep(0.012, 0.065, p) * (1 - smoothstep(0.585, 0.685, p));
  const desaturateOpacity = smoothstep(0.025, 0.15, p) * (1 - smoothstep(0.59, 0.70, p));
  currentEdgeOpacity = edgeOpacity;

  document.body.style.setProperty('--portfolio-opacity', destination.toFixed(4));
  document.body.style.setProperty('--portfolio-shift', `${((1 - destination) * 24).toFixed(2)}px`);
  document.body.style.setProperty('--welcome-opacity', welcomeOpacity.toFixed(4));
  document.body.style.setProperty('--intro-progress', p.toFixed(4));

  transitionStage?.style.setProperty('--mosaic-y', `${mosaicY.toFixed(2)}px`);
  transitionStage?.style.setProperty('--panel-ridge', `${ridgeOffset.toFixed(2)}px`);
  transitionStage?.style.setProperty('--transition-opacity', stageOpacity.toFixed(4));
  transitionStage?.style.setProperty('--edge-opacity', edgeOpacity.toFixed(4));
  transitionStage?.style.setProperty('--contour-opacity', (edgeOpacity * .88).toFixed(4));
  transitionStage?.style.setProperty('--desaturate-opacity', desaturateOpacity.toFixed(4));
  transitionStage?.style.setProperty('--intertitle-opacity', titleOpacity.toFixed(4));
  transitionStage?.style.setProperty('--intertitle-y', `${((1 - titleIn) * 14 - titleOut * 10).toFixed(2)}px`);
  transitionStage?.style.setProperty('--intertitle-scale', (0.992 + titleIn * 0.008 + titleOut * 0.004).toFixed(4));

  const live = introTransitioning || (p > 0.001 && p < 0.999);
  transitionStage?.classList.toggle('is-live', live);
  if (reducedMotion.matches || !live) renderAnimatedWaveCut(performance.now());
  if (live) startDividerLoop();
  else stopDividerLoop();
}

function updateIntroHistory(view, push, { preserveHash = false } = {}) {
  if (historyView === view && push) return;
  historyView = view;
  try {
    const method = push ? 'pushState' : 'replaceState';
    const hash = preserveHash && view === 'portfolio' ? location.hash : '';
    history[method]({ aspikView: view }, '', location.pathname + location.search + hash);
  } catch (error) {}
}

function beginIntroTransition() {
  if (introTransitioning) return;
  ensureContourAssets();
  introTransitioning = true;
  document.body.classList.add('intro-transitioning');
  document.body.classList.remove('welcome-active', 'portfolio-active');
  welcomeScreen?.classList.remove('is-hidden');
  transitionStage?.classList.add('is-live');
  syncInteractiveState(introView, true);
  lockViewport(true);
  /* Reverse only begins at the actual top of the portfolio, so this never
     steals normal scrolling from the content below the hero. */
  if (window.scrollY !== 0) window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
}

function finishIntroAt(target, { updateHistory = true, pushHistory = true } = {}) {
  const endpoint = target >= 0.5 ? 1 : 0;
  introProgress = endpoint;
  introTargetProgress = endpoint;
  renderIntroProgress(endpoint);
  introTransitioning = false;
  programmaticIntroActive = false;
  document.body.classList.remove('intro-transitioning');

  if (endpoint === 1) {
    introView = 'portfolio';
    document.body.classList.remove('welcome-active');
    document.body.classList.add('portfolio-active');
    window.dispatchEvent(new CustomEvent('aspik:viewchange', { detail: { view: 'portfolio' } }));
    welcomeScreen?.classList.add('is-hidden');
    transitionStage?.classList.remove('is-live');
    syncInteractiveState('portfolio', false);
    lockViewport(false);
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
    if (updateHistory) updateIntroHistory('portfolio', pushHistory);
  } else {
    introView = 'welcome';
    document.body.classList.remove('portfolio-active');
    document.body.classList.add('welcome-active');
    window.dispatchEvent(new CustomEvent('aspik:viewchange', { detail: { view: 'welcome' } }));
    welcomeScreen?.classList.remove('is-hidden');
    transitionStage?.classList.remove('is-live');
    syncInteractiveState('welcome', false);
    lockViewport(true);
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
    if (updateHistory) updateIntroHistory('welcome', pushHistory);
  }
}

function cancelProgrammaticIntro() {
  programmaticToken += 1;
  programmaticIntroActive = false;
}

function stopScrubRender() {
  if (!scrubFrame) return;
  cancelAnimationFrame(scrubFrame);
  scrubFrame = 0;
}

function maybeAutoCompleteIntro(deltaPixels) {
  if (deltaPixels <= 0 || introView !== 'welcome' || programmaticIntroActive) return;
  if (introTargetProgress < INTRO_AUTO_FORWARD_THRESHOLD) return;

  /* Let the current input frame paint first, then hand the second half of
     the timeline to the cinematic animation. */
  requestAnimationFrame(() => {
    if (introView !== 'welcome' || programmaticIntroActive) return;
    if (introTargetProgress >= INTRO_AUTO_FORWARD_THRESHOLD) animateIntroTo(1);
  });
}

/* Render only toward the position requested by physical scroll. This tiny
   RAF interpolation removes mouse-wheel stepping; importantly it NEVER
   chooses an endpoint or keeps travelling beyond the user's target. */
function scheduleScrubRender() {
  if (scrubFrame) return;
  scrubFrame = requestAnimationFrame(function tick() {
    scrubFrame = 0;
    const distance = introTargetProgress - introProgress;
    if (Math.abs(distance) < 0.0007) {
      renderIntroProgress(introTargetProgress);
      if (introTargetProgress >= 0.9999) finishIntroAt(1);
      else if (introTargetProgress <= 0.0001) finishIntroAt(0);
      return;
    }

    /* Responsive enough for a Mac trackpad, soft enough for a 100px
       mouse-wheel notch. It converges only to the last scroll position. */
    const factor = coarsePointer.matches ? 0.50 : 0.36;
    renderIntroProgress(introProgress + distance * factor);
    scrubFrame = requestAnimationFrame(tick);
  });
}

function normalizedWheelDelta(event) {
  let delta = event.deltaY;
  if (event.deltaMode === 1) delta *= 16;
  else if (event.deltaMode === 2) delta *= innerHeight;
  /* Avoid one coarse desktop wheel packet skipping most of the scene. */
  return Math.max(-180, Math.min(180, delta));
}

function scrubIntroByPixels(deltaPixels) {
  cancelProgrammaticIntro();
  markIntroInput();
  beginIntroTransition();
  introTargetProgress = clamp01(introTargetProgress + deltaPixels / introScrollDistance());
  scheduleScrubRender();
  maybeAutoCompleteIntro(deltaPixels);
}

/* Programmatic motion is reserved for explicit CLICK / history navigation.
   Wheel, trackpad, touch and keyboard all use the scrub path above. */
function animateIntroTo(target, { updateHistory = true } = {}) {
  target = target >= 0.5 ? 1 : 0;
  if (!welcomeScreen || !transitionStage) return;
  cancelProgrammaticIntro();
  stopScrubRender();
  const token = programmaticToken;
  const from = introProgress;

  if (Math.abs(target - from) < 0.002) {
    finishIntroAt(target, { updateHistory });
    return;
  }
  if (reducedMotion.matches) {
    finishIntroAt(target, { updateHistory });
    return;
  }

  beginIntroTransition();
  programmaticIntroActive = true;
  introTargetProgress = target;
  const duration = Math.max(600, 1750 * Math.abs(target - from));
  const startedAt = performance.now();

  const tick = (now) => {
    if (token !== programmaticToken) return;
    const t = clamp01((now - startedAt) / duration);
    /* Explicit button motion uses soft ease only; scroll itself never does. */
    const eased = t * t * (3 - 2 * t);
    renderIntroProgress(from + (target - from) * eased);
    if (t < 1) requestAnimationFrame(tick);
    else finishIntroAt(target, { updateHistory });
  };
  requestAnimationFrame(tick);
}

window.addEventListener('wheel', (event) => {
  const delta = normalizedWheelDelta(event);

  /* Ignore same-direction trackpad momentum while auto-finishing. An
     intentional reverse gesture still cancels the auto motion immediately. */
  if (programmaticIntroActive && introTargetProgress >= 0.999) {
    event.preventDefault();
    if (delta >= 0) return;
    scrubIntroByPixels(delta);
    return;
  }

  if (introTransitioning || introView === 'welcome') {
    event.preventDefault();
    scrubIntroByPixels(delta);
    return;
  }

  /* Native page scrolling remains untouched. Only an upward gesture at the
     absolute top re-engages the exact same scrub timeline in reverse. */
  if (introView === 'portfolio' && window.scrollY <= 1 && delta < 0) {
    event.preventDefault();
    introProgress = 1;
    introTargetProgress = 1;
    scrubIntroByPixels(delta);
  }
}, { passive: false });

window.addEventListener('touchstart', (event) => {
  touchLastY = event.touches?.[0]?.clientY ?? null;
}, { passive: true });

window.addEventListener('touchmove', (event) => {
  const y = event.touches?.[0]?.clientY;
  if (y == null || touchLastY == null) return;
  const delta = touchLastY - y; /* swipe up = scroll down = positive */
  touchLastY = y;

  const shouldCapture = introTransitioning || introView === 'welcome' ||
    (introView === 'portfolio' && window.scrollY <= 1 && delta < 0);
  if (!shouldCapture) return;

  event.preventDefault();
  if (programmaticIntroActive && introTargetProgress >= 0.999 && delta >= 0) return;
  if (introView === 'portfolio' && !introTransitioning) {
    introProgress = 1;
    introTargetProgress = 1;
  }
  scrubIntroByPixels(delta * 1.12);
}, { passive: false });

window.addEventListener('touchend', () => { touchLastY = null; }, { passive: true });
window.addEventListener('touchcancel', () => { touchLastY = null; }, { passive: true });

window.addEventListener('keydown', (event) => {
  const down = ['ArrowDown', 'PageDown', ' '].includes(event.key);
  const up = ['ArrowUp', 'PageUp'].includes(event.key);
  if (!down && !up) return;

  const canCapture = introTransitioning || introView === 'welcome' ||
    (introView === 'portfolio' && window.scrollY <= 1 && up);
  if (!canCapture) return;

  event.preventDefault();
  if (programmaticIntroActive && introTargetProgress >= 0.999 && down) return;
  if (introView === 'portfolio' && !introTransitioning) {
    introProgress = 1;
    introTargetProgress = 1;
  }
  const amount = event.key.startsWith('Page') || event.key === ' ' ? 300 : 105;
  scrubIntroByPixels(down ? amount : -amount);
});

welcomeEnter?.addEventListener('click', () => animateIntroTo(1));
returnWelcomeTriggers.forEach((trigger) => trigger.addEventListener('click', (event) => {
  event.preventDefault();
  animateIntroTo(0);
}));

let introResizeFrame = 0;
let introViewportWidth = viewportWidth();
let introViewportHeight = viewportHeight();
window.addEventListener('resize', () => {
  if (introResizeFrame) return;
  introResizeFrame = requestAnimationFrame(() => {
    introResizeFrame = 0;
    const nextWidth = viewportWidth();
    const nextHeight = viewportHeight();
    const widthChanged = Math.abs(nextWidth - introViewportWidth) > 2;
    const heightDelta = Math.abs(nextHeight - introViewportHeight);
    const chromeOnlyResize = coarsePointer.matches && !widthChanged && heightDelta < 96;
    if (chromeOnlyResize) return;
    introViewportWidth = nextWidth;
    introViewportHeight = nextHeight;
    syncPerfTierClass();
    renderIntroProgress(introProgress);
  });
}, { passive: true });
window.addEventListener('orientationchange', () => {
  window.setTimeout(() => {
    introViewportWidth = viewportWidth();
    introViewportHeight = viewportHeight();
    syncPerfTierClass();
    renderIntroProgress(introProgress);
  }, 120);
}, { passive: true });

document.addEventListener('visibilitychange', () => {
  if (document.hidden) stopDividerLoop();
  else if (introTransitioning || (introProgress > .001 && introProgress < .999)) startDividerLoop();
});

window.addEventListener('popstate', (event) => {
  const view = event.state?.aspikView;
  if (view === 'welcome') { historyView = 'welcome'; animateIntroTo(0, { updateHistory: false }); }
  if (view === 'portfolio') { historyView = 'portfolio'; animateIntroTo(1, { updateHistory: false }); }
});

/* Fresh root loads start at the cinematic welcome. Deep links from project
   records (for example index.html#projects) bypass the intro so Back/Contact
   navigation feels like normal portfolio navigation instead of replaying it. */
document.body.classList.add('transition-managed');
document.body.classList.remove('intro-transitioning');

if (initialDeepLink) {
  introView = 'portfolio';
  introProgress = 1;
  introTargetProgress = 1;
  historyView = 'portfolio';
  document.body.classList.remove('welcome-active');
  document.body.classList.add('portfolio-active');
  welcomeScreen?.classList.add('is-hidden');
  transitionStage?.classList.remove('is-live');
  renderIntroProgress(1);
  syncInteractiveState('portfolio', false);
  lockViewport(false);
  updateIntroHistory('portfolio', false, { preserveHash: true });
  document.documentElement.classList.remove('has-deep-link');
  requestAnimationFrame(() => {
    initialDeepLink.scrollIntoView({ behavior: 'auto', block: 'start' });
  });
} else {
  introView = 'welcome';
  introProgress = 0;
  introTargetProgress = 0;
  historyView = 'welcome';
  document.body.classList.add('welcome-active');
  document.body.classList.remove('portfolio-active');
  welcomeScreen?.classList.remove('is-hidden');
  renderIntroProgress(0);
  syncInteractiveState('welcome', false);
  lockViewport(true);
  updateIntroHistory('welcome', false);
  document.documentElement.classList.remove('has-deep-link');
}


})();
