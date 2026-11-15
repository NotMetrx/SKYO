/**
 * SKYO — Orquestador Principal (Router, Motor Three.js Compartido y H.E.R.A 7)
 * Filosofía Ponytail: Cero polling, C-states con Page Visibility API y código conciso.
 */

import { MSG, GUIA_SPHEREX } from './data.js';
import { initCosmos3D, setCosmosRoute, setCosmosVisible, triggerWarpZoom, setKryoDockHandler } from './cosmos3d.js';
import { startExplorar, pauseExplorarBlink } from './explorar.js';
import { startSistema3D } from './sistema3d.js';
import { startFases } from './fases.js';
import { initHera3d, triggerKryoGesture } from './hera3d.js';
import { unlockAudio, isSoundMuted, setSoundMuted, playUiCue } from './sound.js';

// 1. Detección reactiva de preferencia de movimiento reducido
const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
window.__skyReducedMotion = motionQuery.matches;

motionQuery.addEventListener('change', e => {
  window.__skyReducedMotion = e.matches;
});

// 2. Estado de ruta y asistente KRYO-9 / H.E.R.A 7 (oculta en #inicio)
const ROUTES = ['inicio', 'explorar', '3d', 'fases'];
let currentRoute = '';
let leaveTimer = 0;

const topHeader = document.querySelector('.top');
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
    if (currentRoute === 'inicio' || !heraBubble || !heraText) return;
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
  });
}

const heraImg = document.getElementById('hera-img');
const heraPlaceholder = document.getElementById('hera-placeholder');
const avatarInput = document.getElementById('avatar-input');
const avatarResetBtn = document.getElementById('avatar-reset-btn');

function setCustomAvatar(dataUrl) {
  const canMountNow = currentRoute
    ? currentRoute !== 'inicio'
    : ['explorar', '3d', 'fases'].includes(window.location.hash.slice(1));
  if (dataUrl && heraImg) {
    heraImg.src = dataUrl;
    heraImg.hidden = false;
    if (heraPlaceholder) heraPlaceholder.hidden = true;
    if (avatarResetBtn) avatarResetBtn.hidden = false;
    if (heraTitle) heraTitle.textContent = 'Asistente H.E.R.A 7';
    initHera3d(heraAvatarBtn);
  } else if (heraImg) {
    heraImg.src = '';
    heraImg.hidden = true;
    if (heraPlaceholder) heraPlaceholder.hidden = false;
    if (avatarResetBtn) avatarResetBtn.hidden = true;
    if (heraTitle) heraTitle.textContent = 'KRYO-9 · Guía SPHEREx';
    if (canMountNow) initHera3d(heraAvatarBtn);
  }
}

const savedAvatar = localStorage.getItem('skyo_custom_avatar');
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
    localStorage.removeItem('skyo_custom_avatar');
    setCustomAvatar(null);
    hera.say('KRYO-9 3D activado nuevamente como tu guía SPHEREx.');
  });
}

if (heraAvatarBtn) {
  heraAvatarBtn.onclick = () => hera.toggle();
}

// 3. Router Reactivo por Hash con Transiciones GPU + Vuelo de Cámara 3D
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
    leaveTimer = setTimeout(() => clearLeavingSections(currentRoute), 440);
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

  // En móvil (<= 780px) o en #inicio ocultamos el globo de H.E.R.A 7 / KRYO-9
  if (isInicio) {
    clearTimeout(heraTimer);
    if (heraBubble) heraBubble.classList.remove('show');
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

  if (currentRoute === 'explorar') {
    startExplorar(hera.say.bind(hera));
  } else if (currentRoute === '3d') {
    startSistema3D();
    triggerKryoGesture('Scan_Sky', { duration: 1.35 });
  } else if (currentRoute === 'fases') {
    startFases(hera.say.bind(hera));
    triggerKryoGesture('Scan_Sky', { duration: 1.35 });
  }
}

window.addEventListener('hashchange', navigate);

// Despegue de KRYO-9 con audio espacial y acoplamiento dentro del módulo guía en #explorar
let isWarping = false;
let dockRevealFallback = 0;

setKryoDockHandler(() => {
  clearTimeout(dockRevealFallback);
  if (heraAvatarBtn) heraAvatarBtn.classList.remove('is-kryo-incoming');
  triggerKryoGesture('Wave_Hello', { duration: 1.5, timeScale: 1.15 });
});

function launchFromInicio() {
  if (currentRoute !== 'inicio' || isWarping) return;
  unlockAudio();
  const promptText = document.getElementById('hero-prompt-text');
  if (window.__skyReducedMotion) {
    triggerWarpZoom();
    window.location.hash = '#explorar';
    return;
  }
  isWarping = true;
  if (promptText) promptText.textContent = 'Secuencia de despegue en curso…';
  if (heraAvatarBtn && !localStorage.getItem('skyo_custom_avatar')) {
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
    setTimeout(() => {
      document.body.classList.remove('warp-zoom');
      if (promptText) promptText.textContent = 'Iniciar secuencia de despegue';
      isWarping = false;
    }, 360);
  }, 460);
}

window.addEventListener('keydown', e => {
  if (currentRoute !== 'inicio' || isWarping || e.metaKey || e.ctrlKey || e.altKey || e.repeat) return;
  const tag = document.activeElement?.tagName;
  if (['INPUT', 'TEXTAREA', 'SELECT', 'BUTTON', 'A'].includes(tag) || document.activeElement?.isContentEditable) return;
  if (e.key === 'Enter' || e.code === 'Space') {
    e.preventDefault();
    launchFromInicio();
  }
});

// Activación opcional por clic/toque sobre el prompt o el escenario de KRYO-9 (sin controles <button>/<a> en #inicio)
document.querySelector('#inicio .hero-prompt')?.addEventListener('click', launchFromInicio);
document.getElementById('kryo9-stage')?.addEventListener('click', launchFromInicio);

// 4. Gestión de C-States (Page Visibility API)
document.addEventListener('visibilitychange', () => {
  if (document.hidden) {
    pauseExplorarBlink();
  }
  setCosmosVisible(!document.hidden);
});

// 6. Inicialización inmediata
function initApp() {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('./sw.js').catch(() => {});
  }
  navigate();
  initCosmos3D(currentRoute);

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
