#!/usr/bin/env node
/**
 * Auditoría visual automática de SKYO (protocolos PV-01…PV-08).
 *
 * No añade dependencias al proyecto: usa Playwright si está disponible en el
 * entorno (`PLAYWRIGHT_MODULE`, `playwright`, caché de npx o `playwright-core`).
 * Requiere el servidor local: `npm start` (o BASE=http://host:puerto).
 *
 * Uso:
 *   node scripts/audit-visual.mjs                 # matriz completa, sin capturas
 *   node scripts/audit-visual.mjs --shots         # + capturas en docs/evidence/shots/
 *   node scripts/audit-visual.mjs --json out.json # + informe máquina-legible
 *
 * Códigos de salida: 0 todo pasa · 1 hay fallos · 2 no se pudo ejecutar.
 * Filosofía Ponytail: una sola pasada por vista, sin polling ni bucles de espera.
 */
import { readdir, mkdir, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const BASE = process.env.BASE || 'http://127.0.0.1:4173';
const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const args = process.argv.slice(2);
const has = name => args.includes(`--${name}`);
const value = (name, fallback) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 && args[i + 1] && !args[i + 1].startsWith('--') ? args[i + 1] : fallback;
};

const ROUTES = ['inicio', 'explorar', '3d', 'fases'];
const VIEWPORTS = [
  { name: 'desktop', width: 1440, height: 900, dpr: 1 },
  { name: 'laptop', width: 1280, height: 720, dpr: 1 },
  { name: 'tablet', width: 820, height: 1180, dpr: 1 },
  { name: 'mobile', width: 390, height: 844, dpr: 2 },
  { name: 'mobile-s', width: 360, height: 740, dpr: 2 },
  { name: 'mobile-xs', width: 320, height: 568, dpr: 2 },
];

const SHOTS = has('shots') ? path.join(ROOT, 'docs/evidence/shots', `audit-${new Date().toISOString().slice(0, 10)}`) : null;
const JSON_OUT = value('json', null);

async function loadPlaywright() {
  const candidates = [];
  if (process.env.PLAYWRIGHT_MODULE) candidates.push(process.env.PLAYWRIGHT_MODULE);
  candidates.push('playwright');
  // Caché de npx: la usan las sesiones de agentes sin node_modules local.
  const npx = path.join(os.homedir(), '.npm/_npx');
  if (existsSync(npx)) {
    for (const dir of await readdir(npx)) {
      const entry = path.join(npx, dir, 'node_modules/playwright/index.mjs');
      if (existsSync(entry)) candidates.push(entry);
    }
  }
  candidates.push('playwright-core');
  for (const spec of candidates) {
    try { return await import(spec); } catch { /* siguiente candidato */ }
  }
  console.error('✖ Playwright no disponible. Instálalo en el entorno (no en el proyecto) o define PLAYWRIGHT_MODULE.');
  console.error('  Ejemplo: npm i -g playwright && npx playwright install chromium');
  process.exit(2);
}

/** Se ejecuta dentro de la página: devuelve el estado medible de una vista. */
const probe = () => {
  const vw = innerWidth, vh = innerHeight;
  const cs = getComputedStyle;
  const visible = el => {
    let node = el;
    while (node && node !== document.documentElement) {
      const s = cs(node);
      if (s.display === 'none' || s.visibility === 'hidden' || +s.opacity === 0) return false;
      node = node.parentElement;
    }
    return true;
  };
  const inScroller = (el, axis) => {
    for (let p = el.parentElement; p && p !== document.body; p = p.parentElement) {
      const s = cs(p);
      if (axis === 'x' && (s.overflowX === 'auto' || s.overflowX === 'scroll') && p.scrollWidth > p.clientWidth + 1) return true;
      if (axis === 'y' && (s.overflowY === 'auto' || s.overflowY === 'scroll') && p.scrollHeight > p.clientHeight + 1) return true;
    }
    return false;
  };
  const rect = el => {
    const r = el.getBoundingClientRect();
    return { x: Math.round(r.left), y: Math.round(r.top), right: Math.round(r.right), bottom: Math.round(r.bottom), w: Math.round(r.width), h: Math.round(r.height) };
  };
  const section = document.querySelector('.sec.on');
  const inter = section ? [...section.querySelectorAll('button, a[href], [role="tab"], input, select')].filter(visible) : [];
  const clipped = inter.filter(el => {
    const r = el.getBoundingClientRect();
    const outX = r.right > vw + 1.5 || r.left < -1.5;
    const outY = r.bottom > vh + 1.5 || r.top < -1.5;
    return (outX && !inScroller(el, 'x')) || (outY && !inScroller(el, 'y'));
  }).map(el => ({ text: el.textContent.trim().slice(0, 24), ...rect(el) }));
  const smallTargets = [...document.querySelectorAll('.sec.on button, .sec.on [role="tab"]')]
    .filter(visible)
    .filter(el => { const r = el.getBoundingClientRect(); return r.height < 24 || r.width < 24; })
    .map(el => ({ text: el.textContent.trim().slice(0, 18), ...rect(el) }));
  const canvas = document.querySelector('canvas');
  let webgl = canvas ? 'sin-contexto' : 'sin-canvas';
  if (canvas) {
    try { webgl = canvas.getContext('webgl2') || canvas.getContext('webgl') ? 'ok' : 'sin-contexto'; }
    catch { webgl = 'error'; }
  }
  const top = document.querySelector('.top');
  const hera = document.getElementById('hera');
  const hb = document.getElementById('hb');
  const rawFocus = document.querySelector('#nav a');
  rawFocus?.focus();
  const focusStyle = rawFocus ? `${cs(rawFocus).outlineWidth} ${cs(rawFocus).outlineStyle} ${cs(rawFocus).outlineColor}` : null;
  return {
    route: document.body.dataset.route,
    ready: document.body.classList.contains('anim-ready'),
    hash: location.hash,
    vw, vh,
    docW: document.documentElement.scrollWidth,
    overflow: document.documentElement.scrollWidth > vw + 1,
    visibleSection: section?.id || null,
    sections: [...document.querySelectorAll('.sec')].map(s => ({ id: s.id, on: s.classList.contains('on'), inert: s.inert, aria: s.getAttribute('aria-hidden') })),
    nav: [...document.querySelectorAll('#nav a')].map(a => ({ text: a.textContent.trim(), current: a.getAttribute('aria-current') === 'page' })),
    top: top ? { visible: cs(top).visibility !== 'hidden' && +cs(top).opacity > 0, inert: top.inert } : null,
    hera: hera ? {
      visible: cs(hera).display !== 'none' && cs(hera).visibility !== 'hidden',
      inert: hera.inert,
      bubble: hb?.classList.contains('show') || false,
      bubbleLive: hb?.getAttribute('aria-live') || null,
      rect: rect(hera),
    } : null,
    webgl,
    interactives: inter.length,
    clipped,
    smallTargets,
    focusStyle,
  };
};

const playwright = await loadPlaywright();
const chromium = playwright.chromium;
const failures = [];
const results = [];
const base = BASE.replace(/\/$/, '');

const browser = await chromium.launch({ args: ['--enable-unsafe-swiftshader', '--enable-webgl'] });
if (SHOTS) await mkdir(SHOTS, { recursive: true });

function fail(run, code, detail) {
  const entry = { run, code, detail };
  failures.push(entry);
  console.log(`  ✖ ${code}: ${detail}`);
}

async function audit({ name, width, height, dpr }, reduced = false) {
  const ctx = await browser.newContext({
    viewport: { width, height }, deviceScaleFactor: dpr,
    reducedMotion: reduced ? 'reduce' : 'no-preference', colorScheme: 'dark',
  });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(`pageerror: ${e.message}`));
  page.on('console', m => { if (m.type() === 'error') errors.push(`console: ${m.text().slice(0, 180)}`); });
  const run = `${name}${reduced ? '-reduced' : ''}`;
  console.log(`\n## ${run} · ${width}x${height}@${dpr}`);

  await page.goto(`${base}/#inicio`, { waitUntil: 'load' });
  await page.waitForFunction(() => document.body.classList.contains('anim-ready'), null, { timeout: 15000 });
  await page.waitForTimeout(700);

  for (const route of ROUTES) {
    if (route !== 'inicio') {
      await page.evaluate(r => { location.hash = `#${r}`; }, route);
      await page.waitForTimeout(800);
    }
    const s = await page.evaluate(probe);
    s.routeAsked = route;
    results.push({ run, route, ...s });
    if (SHOTS) await page.screenshot({ path: path.join(SHOTS, `${run}-${route}.png`) });
    if (!s.ready) fail(run, 'E_READY', 'falta body.anim-ready');
    if (s.visibleSection !== route) fail(run, 'E_SECTION', `${route}: visible=${s.visibleSection}`);
    if (s.overflow) fail(run, 'E_OVERFLOW', `${route}: docW=${s.docW} > ${s.vw}`);
    if (s.webgl !== 'ok') fail(run, 'E_WEBGL', `${route}: ${s.webgl}`);
    if (s.clipped.length) fail(run, 'E_CLIP', `${route}: ${s.clipped.length} control(es) fuera del viewport: ${s.clipped.map(c => c.text || '·').slice(0, 3).join(' | ')}`);
    if (s.smallTargets.length) fail(run, 'E_TARGET', `${route}: ${s.smallTargets.length} objetivo(s) < 24px: ${s.smallTargets.map(t => t.text || '·').slice(0, 3).join(' | ')}`);
    for (const other of s.sections) {
      if (other.id === route) {
        if (other.inert || other.aria !== 'false') fail(run, 'E_ARIA', `${route}: sección activa con inert=${other.inert} aria=${other.aria}`);
      } else if (!other.inert || other.aria !== 'true') {
        fail(run, 'E_ARIA', `${route}: ${other.id} debería estar inert/aria-hidden`);
      }
    }
    if (route === 'inicio') {
      if (s.nav.length !== 3) fail(run, 'E_NAV', `enlaces de #nav=${s.nav.length}`);
      if (s.top?.visible) fail(run, 'E_TOP', 'la barra superior es visible en #inicio');
      if (s.hera?.visible) fail(run, 'E_HERA', 'H.E.R.A visible en #inicio');
      if (s.interactives !== 0) fail(run, 'E_MINIMAL', `#inicio conserva ${s.interactives} control(es)`);
    } else {
      if (s.hera && !s.hera.visible) fail(run, 'E_HERA', `${route}: H.E.R.A oculta`);
      const current = s.nav.find(n => n.current);
      if (!s.nav.length) fail(run, 'E_NAV', `${route}: sin enlaces de navegación`);
      if (s.nav.length === 3 && current && !current.text.toLowerCase().includes(route)) fail(run, 'E_CURRENT', `${route}: aria-current=${current.text}`);
    }
    console.log(`- ${route}: visible=${s.visibleSection} overflow=${s.overflow} clip=${s.clipped.length} target=${s.smallTargets.length} webgl=${s.webgl} hera=${s.hera?.visible} interactivos=${s.interactives}`);
  }

  // H.E.R.A: el avatar alterna el globo; nunca auto-abre en móvil estrecho
  await page.evaluate(() => { location.hash = '#explorar'; });
  await page.waitForTimeout(500);
  const hb0 = await page.evaluate(() => document.getElementById('hb')?.classList.contains('show'));
  if (hb0) { await page.evaluate(() => document.getElementById('ha')?.click()); await page.waitForTimeout(150); }
  await page.evaluate(() => document.getElementById('ha')?.click());
  await page.waitForTimeout(200);
  const hb1 = await page.evaluate(() => {
    const hb = document.getElementById('hb');
    const t = document.getElementById('ht');
    return !!(hb?.classList.contains('show') && t?.textContent.trim());
  });
  if (!hb1) fail(run, 'E_HERA_BUBBLE', 'el clic en #ha no abre el globo');
  if (SHOTS) await page.screenshot({ path: path.join(SHOTS, `${run}-hera.png`) });

  // Teclado: Enter desde #inicio debe llegar a #explorar y limpiar el warp
  await page.evaluate(() => { location.hash = '#inicio'; });
  await page.waitForTimeout(650);
  await page.evaluate(() => document.activeElement?.blur());
  await page.keyboard.press('Enter');
  await page.waitForTimeout(1000);
  const kb = await page.evaluate(() => ({ hash: location.hash, warp: document.body.classList.contains('warp-zoom') }));
  if (kb.hash !== '#explorar') fail(run, 'E_KEYBOARD', `Enter dejó hash=${kb.hash}`);
  if (kb.warp) fail(run, 'E_WARP', 'body.warp-zoom no se limpió');

  // Laboratorio FITS
  await page.goto(`${base}/lab.html`, { waitUntil: 'load' });
  await page.waitForTimeout(900);
  const lab = await page.evaluate(() => ({
    overflow: document.documentElement.scrollWidth > innerWidth + 1,
    docW: document.documentElement.scrollWidth,
    vw: innerWidth,
    h1: document.querySelector('h1')?.textContent?.trim() || '',
    interactives: [...document.querySelectorAll('button,input,select,a')].filter(e => {
      const r = e.getBoundingClientRect();
      return r.width && r.height && getComputedStyle(e).visibility !== 'hidden';
    }).length,
    wasm: document.body.innerText.includes('JavaScript (WASM pendiente de compilar)') ? 'fallback' : 'otro',
  }));
  if (SHOTS) await page.screenshot({ path: path.join(SHOTS, `${run}-lab.png`) });
  if (lab.overflow) fail(run, 'E_LAB_OVERFLOW', `lab.html docW=${lab.docW} > ${lab.vw}`);
  if (!lab.h1) fail(run, 'E_LAB', 'lab.html sin h1');
  console.log(`- lab: overflow=${lab.overflow} h1="${lab.h1.slice(0, 30)}" wasm=${lab.wasm} interactivos=${lab.interactives}`);
  console.log(`- teclado: ${kb.hash} warp=${kb.warp} · globo H.E.R.A=${hb1}`);

  if (errors.length) fail(run, 'E_CONSOLE', `${errors.length} error(es): ${errors.slice(0, 3).join(' · ')}`);
  results.push({ run, lab, keyboard: kb, hera: { before: hb0, after: hb1 }, errors });
  await ctx.close();
}

for (const vp of VIEWPORTS) await audit(vp);
await audit(VIEWPORTS[0], true);
await browser.close();

const summary = {
  base,
  generated: new Date().toISOString(),
  viewports: VIEWPORTS.map(v => `${v.name}:${v.width}x${v.height}`),
  reducedMotionCheck: true,
  failures,
  results,
};
if (JSON_OUT) {
  await mkdir(path.dirname(path.resolve(JSON_OUT)), { recursive: true });
  await writeFile(JSON_OUT, JSON.stringify(summary, null, 2), 'utf8');
  console.log(`\n📄 Informe: ${JSON_OUT}`);
}
if (SHOTS) console.log(`📸 Capturas: ${SHOTS}`);
console.log(`\n${failures.length ? '✖' : '✔'} ${failures.length ? failures.length + ' fallo(s)' : 'sin fallos'} en ${VIEWPORTS.length + 1} recorridos.`);
process.exit(failures.length ? 1 : 0);
