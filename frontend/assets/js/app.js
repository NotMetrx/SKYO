/**
 * SKYO — Orquestador Principal (Router, Motor Three.js Compartido y H.E.R.A 7)
 * Filosofía Ponytail: Cero polling, C-states con Page Visibility API y código conciso.
 */

import { MSG, GUIA_SPHEREX } from './data.js';
import { initCosmos3D, setCosmosRoute, setCosmosVisible, triggerWarpZoom, setKryoDockHandler } from './cosmos3d.js';
import { startExplorar, pauseExplorarBlink, getSubView, setSubView } from './explorar.js';
import { startSistema3D } from './sistema3d.js';
import { startFases } from './fases.js';
import { startNosotros } from './nosotros.js';
import { initHera3d, triggerKryoGesture } from './hera3d.js';
import { initHeraPilot } from './hera-pilot.js';
import { unlockAudio, isSoundMuted, setSoundMuted, playUiCue } from './sound.js';

// 1. Detección reactiva de preferencia de movimiento reducido
const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
window.__skyReducedMotion = motionQuery.matches;

motionQuery.addEventListener('change', e => {
  window.__skyReducedMotion = e.matches;
});

// 2. Estado de ruta y asistente KRYO-9 / H.E.R.A 7 (oculta en #inicio)
const ROUTES = ['inicio', 'explorar', '3d', 'fases', 'nosotros'];
let currentRoute = '';
let leaveTimer = 0;

const topHeader = document.querySelector('.top');
const brandLink = document.getElementById('brand-home') || document.querySelector('.top .brand');
const heraAside = document.getElementById('hera');
const heraBubble = document.getElementById('hb');
const heraTitle = document.getElementById('hb-title');
const heraText = document.getElementById('ht');
const heraAvatarBtn = document.getElementById('ha');
const heraChipsEl = document.getElementById('hera-chips');
const soundToggleBtn = document.getElementById('sound-toggle-btn');

let heraTimer = 0;

export const hera = {
  say(message, keep = false) {
    if (currentRoute === 'inicio' || !heraBubble || !heraText || (window.innerWidth <= 780 && !keep)) return;
    heraText.textContent = message;
    heraBubble.classList.add('show');
    clearTimeout(heraTimer);
    if (!keep) {
      heraTimer = setTimeout(() => {
        heraBubble.classList.remove('show');
      }, 8500);
    }
  },
  toggle() {
    if (currentRoute === 'inicio' || !heraBubble) return;
    unlockAudio();
    if (heraBubble.classList.contains('show')) {
      heraBubble.classList.remove('show');
    } else {
      playUiCue('guide');
      triggerKryoGesture('Wave_Hello', { duration: 1.4, timeScale: 1.15 });
      if (heraText && heraText.textContent.trim()) {
        heraBubble.classList.add('show');
        clearTimeout(heraTimer);
      } else {
        this.say(MSG[currentRoute] || MSG.explorar, true);
      }
    }
  }
};

function syncSoundToggleUI() {
  if (!soundToggleBtn) return;
  const muted = isSoundMuted();
  soundToggleBtn.textContent = muted ? '🔇' : '🔊';
  soundToggleBtn.setAttribute('aria-pressed', String(muted));
  soundToggleBtn.setAttribute('aria-label', muted ? 'Activar sonido espacial' : 'Silenciar sonido espacial');
}

syncSoundToggleUI();
if (soundToggleBtn) {
  soundToggleBtn.addEventListener('click', e => {
    e.stopPropagation();
    const nextMuted = !isSoundMuted();
    setSoundMuted(nextMuted);
    syncSoundToggleUI();
    if (!nextMuted) playUiCue('guide');
  });
}

const HERA_TOPIC_TARGETS = {
  blink: '#blink',
  bandas: '#bandas',
  planeta_x: '#info.is-open, #mission-bar',
  que_es: '#explore-view-tabs',
  neois: '#nav a[data-s="nosotros"]'
};

if (heraChipsEl) {
  heraChipsEl.addEventListener('click', e => {
    const btn = e.target.closest('button[data-topic]');
    if (!btn) return;
    const topicKey = btn.dataset.topic;
    const topic = GUIA_SPHEREX[topicKey];
    if (!topic) return;
    unlockAudio();
    heraChipsEl.querySelectorAll('.hera-chip').forEach(b => b.classList.toggle('on', b === btn));
    playUiCue(topicKey === 'planeta_x' ? 'candidate' : 'guide');
    triggerKryoGesture(topic.clip, { duration: 1.55, timeScale: 1.1 });
    hera.say(topic.text, true);
    const focusSel = HERA_TOPIC_TARGETS[topicKey];
    if (focusSel) {
      pilot?.flyNearElement(focusSel, { durationMs: 6500 });
    }
  });
}

const heraImg = document.getElementById('hera-img');
const heraPlaceholder = document.getElementById('hera-placeholder');
const avatarInput = document.getElementById('avatar-input');
const avatarResetBtn = document.getElementById('avatar-reset-btn');
const pilotResetBtn = document.getElementById('pilot-reset-btn');

const pilot = initHeraPilot({
  asideEl: heraAside,
  buttonEl: heraAvatarBtn,
  bubbleEl: heraBubble,
  resetBtn: pilotResetBtn,
  onToggleClick: () => hera.toggle()
});

function setCustomAvatar(dataUrl) {
  const canMountNow = currentRoute
    ? currentRoute !== 'inicio'
    : ['explorar', '3d', 'fases', 'nosotros'].includes(window.location.hash.slice(1));
  const hasCustom = Boolean(dataUrl);
  heraAvatarBtn?.classList.toggle('has-custom-avatar', hasCustom);
  if (hasCustom && heraImg) {
    heraImg.src = dataUrl;
    heraImg.hidden = false;
    if (heraPlaceholder) heraPlaceholder.hidden = true;
    if (avatarResetBtn) avatarResetBtn.hidden = false;
    if (heraTitle) heraTitle.textContent = 'Asistente H.E.R.A 7';
    if (canMountNow) initHera3d(heraAvatarBtn);
  } else if (heraImg) {
    heraImg.removeAttribute('src');
    heraImg.hidden = true;
    if (heraPlaceholder) heraPlaceholder.hidden = false;
    if (avatarResetBtn) avatarResetBtn.hidden = true;
    if (heraTitle) heraTitle.textContent = 'Heras7 · Guía SPHEREx';
    if (canMountNow) initHera3d(heraAvatarBtn);
  }
}

let savedAvatar = null;
try { savedAvatar = localStorage.getItem('skyo_custom_avatar'); } catch { /* El avatar no impide navegar si el almacenamiento está bloqueado. */ }
setCustomAvatar(savedAvatar);

if (avatarInput) {
  avatarInput.addEventListener('change', e => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      hera.say('Formato no compatible. Por favor sube una imagen (PNG, JPG o WebP).', true);
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      hera.say('La imagen supera los 5 MB. Por favor elige una imagen más ligera.', true);
      return;
    }
    const reader = new FileReader();
    reader.onload = ev => {
      const dataUrl = ev.target?.result;
      if (typeof dataUrl === 'string') {
        try {
          localStorage.setItem('skyo_custom_avatar', dataUrl);
          setCustomAvatar(dataUrl);
          hera.say('¡Avatar actualizado! Ahora este es tu asistente personalizado.');
        } catch {
          hera.say('Almacenamiento local lleno. Prueba con una imagen más pequeña.', true);
        }
      }
    };
    reader.readAsDataURL(file);
    avatarInput.value = '';
  });
}

if (avatarResetBtn) {
  avatarResetBtn.addEventListener('click', e => {
    e.stopPropagation();
    try { localStorage.removeItem('skyo_custom_avatar'); } catch {}
    setCustomAvatar(null);
    hera.say('Heras7 3D activado nuevamente como tu guía SPHEREx.');
  });
}

if (!pilot && heraAvatarBtn) {
  heraAvatarBtn.onclick = () => hera.toggle();
}

// 3. Router Reactivo por Hash con Transiciones GPU + Vuelo de Cámara 3D
let cosmosReady = null;
let lastPilotAnchorKey = '';
let warnedBlindChannel = false;
let lastImmersiveDetector = '';

function syncCosmosVisibility() {
  const view = document.body.dataset.exploreView || 'boveda';
  const frame = document.getElementById('hips-frame');
  const src = !document.hidden && currentRoute === 'explorar' && view === 'contexto' ? 'contexto.html' : 'about:blank';
  if (frame && frame.getAttribute('src') !== src) frame.src = src;
  const spectralFrame=document.getElementById('spectral-frame');
  const spectralSrc=!document.hidden && currentRoute==='explorar' && view==='espectral' ? 'inmersivo.html' : 'about:blank';
  if(spectralFrame && spectralFrame.getAttribute('src')!==spectralSrc)spectralFrame.src=spectralSrc;
  const warping = document.body.classList.contains('warp-zoom') || Boolean(warpReturnSubView);
  setCosmosVisible(!document.hidden && (warping || currentRoute === 'inicio' || currentRoute === '3d' || currentRoute === 'fases' || currentRoute === 'nosotros' || (currentRoute === 'explorar' && view === 'boveda')));
  const anchorKey = `${currentRoute}:${view}`;
  if (pilot && currentRoute && anchorKey !== lastPilotAnchorKey) {
    const prevWasInicio = !lastPilotAnchorKey || lastPilotAnchorKey.startsWith('inicio:');
    lastPilotAnchorKey = anchorKey;
    pilot.setContextAnchor(currentRoute, view, { immediate: currentRoute === 'inicio' || prevWasInicio });
  }
}

document.addEventListener('skyo:hera-focus', e => {
  const detail = e.detail || {};
  pilot?.flyNearElement(detail.target, detail);
});

window.addEventListener('message', e => {
  if (e.origin !== window.location.origin) return;
  const data = e.data;
  if (!data || data.source !== 'skyo-immersive') return;
  const view = document.body.dataset.exploreView || getSubView();
  if (currentRoute !== 'explorar' || view !== 'espectral') return;
  if (data.event === 'channel') {
    if (data.blind) {
      pilot?.flyToZone('spectral-slider', { durationMs: 6800 });
      triggerKryoGesture('Scan_Sky', { duration: 1.45, timeScale: 1.05 });
      if (!warnedBlindChannel) {
        warnedBlindChannel = true;
        const wl = Number.isFinite(Number(data.wavelengthUm)) ? ` (${Number(data.wavelengthUm).toFixed(2)} µm)` : '';
        hera.say(`Canal ${Number(data.channel) + 1}/102${wl}: transición ciega entre detectores sin captura instrumental en SPHEREx.`);
      }
    } else {
      warnedBlindChannel = false;
      if (data.detector && data.detector !== lastImmersiveDetector) {
        lastImmersiveDetector = data.detector;
        pilot?.lookAtPoint({ x: window.innerWidth * 0.5, y: window.innerHeight * 0.5 }, 3200);
      }
    }
  }
});
async function enableCosmos() {
  try {
    cosmosReady ||= initCosmos3D(currentRoute).then(() => {
      if (heraAvatarBtn) initHera3d(heraAvatarBtn);
    });
    await cosmosReady;
    setCosmosRoute(currentRoute);
    syncCosmosVisibility();
  } catch (error) {
    cosmosReady = null;
    const statusEl = document.getElementById('cosmos-status');
    if (statusEl) statusEl.textContent = 'La vista 3D no está disponible. Puedes usar el laboratorio FITS y el contexto HiPS.';
    console.warn('Vista 3D:', error);
  }
}
document.addEventListener('click', event => {
  if (event.target.closest('[data-enable-cosmos], #enable-eclipse')) enableCosmos();
});
document.addEventListener('skyo:subviewchange', () => {
  syncCosmosVisibility();
  if(currentRoute==='explorar'&&document.body.dataset.exploreView==='boveda')enableCosmos();
});

function clearLeavingSections(exceptId) {
  document.querySelectorAll('.sec.leaving').forEach(el => {
    if (el.id !== exceptId) el.classList.remove('leaving');
  });
}

function navigate() {
  let hash = window.location.hash.slice(1);
  if (!ROUTES.includes(hash)) {
    hash = 'inicio';
  }
  if (hash === currentRoute) return;

  const prevRoute = currentRoute;
  const prevIdx = ROUTES.indexOf(prevRoute);
  const nextIdx = ROUTES.indexOf(hash);
  const dir = prevIdx >= 0 && nextIdx < prevIdx ? 'back' : 'forward';

  document.body.dataset.dir = dir;
  document.body.dataset.route = hash;
  currentRoute = hash;
  const ROUTE_TITLES = {
    inicio: 'SKYO · Explora el cosmos con SPHEREx',
    explorar: 'SKYO · Explorar · SPHEREx',
    '3d': 'SKYO · Sistema Solar 3D',
    fases: 'SKYO · Fases & Misión Neois',
    nosotros: 'SKYO · Acerca de nosotros · Grupo Neois'
  };
  if (ROUTE_TITLES[currentRoute]) {
    document.title = ROUTE_TITLES[currentRoute];
  }
  if (currentRoute !== 'explorar') {
    cancelPendingWarpSubView();
  }
  clearTimeout(leaveTimer);

  document.querySelectorAll('.sec').forEach(section => {
    const isTarget = section.id === currentRoute;
    const isOutgoing = prevRoute && section.id === prevRoute;

    section.classList.remove('leaving');
    if (isTarget) {
      section.inert = false;
      section.setAttribute('aria-hidden', 'false');
      section.classList.add('on');
    } else {
      section.inert = true;
      section.setAttribute('aria-hidden', 'true');
      section.classList.remove('on');
      if (isOutgoing && !window.__skyReducedMotion) {
        section.classList.add('leaving');
      }
    }
  });

  if (prevRoute && !window.__skyReducedMotion) {
    document.body.classList.add('route-shifting');
    leaveTimer = setTimeout(() => {
      document.body.classList.remove('route-shifting');
      clearLeavingSections(currentRoute);
    }, 520);
  }
  if (!isWarping && currentRoute !== 'inicio') {
    document.body.classList.remove('warp-zoom');
  }

  document.querySelectorAll('#nav a').forEach(link => {
    if (link.dataset.s === currentRoute) {
      link.setAttribute('aria-current', 'page');
    } else {
      link.removeAttribute('aria-current');
    }
  });

  const isInicio = currentRoute === 'inicio';
  if (topHeader) {
    topHeader.inert = isInicio;
    topHeader.setAttribute('aria-hidden', String(isInicio));
  }
  if (heraAside) {
    heraAside.inert = isInicio;
    heraAside.setAttribute('aria-hidden', String(isInicio));
  }

  heraChipsEl?.querySelectorAll('.hera-chip').forEach(b => b.classList.remove('on'));

  // En móvil (<= 780px), #inicio o #nosotros ocultamos el globo de H.E.R.A 7 / Heras7
  if (isInicio || currentRoute === 'nosotros') {
    clearTimeout(heraTimer);
    if (heraBubble) heraBubble.classList.remove('show');
    if (currentRoute === 'nosotros' && heraText && MSG.nosotros) heraText.textContent = MSG.nosotros;
  } else if (MSG[currentRoute] && window.innerWidth > 780) {
    hera.say(MSG[currentRoute]);
  } else if (heraBubble && window.innerWidth <= 780) {
    heraBubble.classList.remove('show');
    if (heraText) heraText.textContent = MSG[currentRoute] || '';
  }

  // Cambiar escena dentro del motor unificado Three.js
  if (prevRoute === 'explorar' && currentRoute !== 'explorar') {
    pauseExplorarBlink();
  }
  if (prevRoute === 'inicio' && !isInicio) {
    initHera3d(heraAvatarBtn);
  }
  setCosmosRoute(currentRoute);
  syncCosmosVisibility();
  if (['inicio', '3d', 'fases', 'nosotros'].includes(currentRoute)) enableCosmos();

  if (currentRoute === 'explorar') {
    if (warpReturnSubView) {
      startExplorar(hera.say.bind(hera), 'boveda');
    } else {
      startExplorar(hera.say.bind(hera));
    }
  } else if (currentRoute === '3d') {
    startSistema3D();
    triggerKryoGesture('Scan_Sky', { duration: 1.35 });
  } else if (currentRoute === 'fases') {
    startFases(hera.say.bind(hera));
    triggerKryoGesture('Scan_Sky', { duration: 1.35 });
  } else if (currentRoute === 'nosotros') {
    startNosotros(hera.say.bind(hera));
    triggerKryoGesture('Wave_Hello', { duration: 1.4 });
  }
}

window.addEventListener('hashchange', navigate);
window.addEventListener('resize', () => {
  if (window.innerWidth <= 780) heraBubble?.classList.remove('show');
});

// Despegue de Heras7 / KRYO-9 con audio espacial y acoplamiento dentro del módulo guía en #explorar
let isWarping = false;
let dockRevealFallback = 0;
let brandArrivalTimer = 0;
let dockPulseTimer = 0;
let warpReturnSubView = '';
let warpSubViewTimer = 0;
let warpSubViewFallbackTimer = 0;

function cancelPendingWarpSubView() {
  warpReturnSubView = '';
  clearTimeout(warpSubViewTimer);
  clearTimeout(warpSubViewFallbackTimer);
}

function schedulePostWarpSubView(delayMs = 260) {
  if (!warpReturnSubView || currentRoute !== 'explorar') return;
  const targetView = warpReturnSubView;
  clearTimeout(warpSubViewTimer);
  clearTimeout(warpSubViewFallbackTimer);
  warpSubViewTimer = setTimeout(() => {
    if (warpReturnSubView === targetView && currentRoute === 'explorar') {
      warpReturnSubView = '';
      setSubView(targetView);
    }
  }, delayMs);
}

document.getElementById('explore-view-tabs')?.addEventListener('click', e => {
  if (e.target.closest('.view-tab[data-view]')) {
    cancelPendingWarpSubView();
  }
});

function flashBrandArrival() {
  if (!brandLink || window.__skyReducedMotion) return;
  brandLink.classList.remove('is-eclipse-arrived');
  void brandLink.offsetWidth;
  brandLink.classList.add('is-eclipse-arrived');
  clearTimeout(brandArrivalTimer);
  brandArrivalTimer = setTimeout(() => {
    brandLink.classList.remove('is-eclipse-arrived');
  }, 900);
}

function flashKryoDockArrival() {
  if (!heraAvatarBtn || window.__skyReducedMotion) return;
  heraAvatarBtn.classList.remove('is-kryo-docked');
  void heraAvatarBtn.offsetWidth;
  heraAvatarBtn.classList.add('is-kryo-docked');
  clearTimeout(dockPulseTimer);
  dockPulseTimer = setTimeout(() => {
    heraAvatarBtn.classList.remove('is-kryo-docked');
  }, 1150);
}

setKryoDockHandler(() => {
  clearTimeout(dockRevealFallback);
  if (heraAvatarBtn) heraAvatarBtn.classList.remove('is-kryo-incoming');
  flashKryoDockArrival();
  triggerKryoGesture('Wave_Hello', { duration: 1.5, timeScale: 1.15 });
  schedulePostWarpSubView(240);
});

function launchFromInicio(event) {
  event?.preventDefault();
  if (currentRoute !== 'inicio' || isWarping) return;
  unlockAudio();
  const promptText = document.getElementById('hero-prompt-text');
  if (window.__skyReducedMotion) {
    triggerWarpZoom();
    window.location.hash = '#explorar';
    return;
  }
  const activeSub = getSubView();
  warpReturnSubView = ['espectral', 'contexto'].includes(activeSub) ? activeSub : '';
  isWarping = true;
  if (promptText) promptText.textContent = 'Secuencia de despegue en curso…';
  let hasCustomAvatar = false;
  try { hasCustomAvatar = Boolean(localStorage.getItem('skyo_custom_avatar')); } catch {}
  if (heraAvatarBtn && !hasCustomAvatar) {
    heraAvatarBtn.classList.remove('is-kryo-docked');
    heraAvatarBtn.classList.add('is-kryo-incoming');
    initHera3d(heraAvatarBtn);
    clearTimeout(dockRevealFallback);
    dockRevealFallback = setTimeout(() => {
      heraAvatarBtn?.classList.remove('is-kryo-incoming');
    }, 1750);
  }
  document.body.classList.add('warp-zoom');
  triggerWarpZoom();
  setTimeout(() => {
    window.location.hash = '#explorar';
    flashBrandArrival();
  }, 210);
  setTimeout(() => {
    if (promptText) promptText.textContent = 'Iniciar secuencia de despegue';
    isWarping = false;
  }, 560);
  setTimeout(() => {
    document.body.classList.remove('warp-zoom');
    syncCosmosVisibility();
  }, 780);
  if (warpReturnSubView) {
    clearTimeout(warpSubViewFallbackTimer);
    warpSubViewFallbackTimer = setTimeout(() => schedulePostWarpSubView(0), 2800);
  }
}

window.addEventListener('keydown', e => {
  if (currentRoute !== 'inicio' || isWarping || e.metaKey || e.ctrlKey || e.altKey || e.repeat) return;
  const tag = document.activeElement?.tagName;
  if (['INPUT', 'TEXTAREA', 'SELECT', 'BUTTON', 'A'].includes(tag) || document.activeElement?.isContentEditable) return;
  if (e.key === 'Enter' || e.code === 'Space') {
    e.preventDefault();
    launchFromInicio(e);
  }
});

// Activación por clic/toque sobre el logo SKYO, el prompt o Heras7 (sin botones/enlaces en #inicio)
document.querySelector('#inicio .eclipse-wordmark')?.addEventListener('click', launchFromInicio);
document.querySelector('#inicio .hero-prompt')?.addEventListener('click', launchFromInicio);
document.getElementById('kryo9-stage')?.addEventListener('click', launchFromInicio);

// 4. Gestión de C-States (Page Visibility API)
document.addEventListener('visibilitychange', () => {
  if (document.hidden) {
    pauseExplorarBlink();
  }
  syncCosmosVisibility();
});

// 6. Inicialización inmediata
function initApp() {
  navigate();
  syncCosmosVisibility();

  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      document.body.classList.add('anim-ready');
    });
  });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initApp);
} else {
  initApp();
}

import './register-offline.js';
