/**
 * SKYO — Orquestador Principal (Router, Motor Three.js Compartido y H.E.R.A 7)
 * Filosofía Ponytail: Cero polling, C-states con Page Visibility API y código conciso.
 */

import { MSG } from './data.js';
import { initCosmos3D, setCosmosRoute, setCosmosVisible, triggerWarpZoom } from './cosmos3d.js';
import { startExplorar, pauseExplorarBlink } from './explorar.js';
import { startSistema3D } from './sistema3d.js';
import { startFases } from './fases.js';
import { initHera3d } from './hera3d.js';

// 1. Detección reactiva de preferencia de movimiento reducido
const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
window.__skyReducedMotion = motionQuery.matches;

motionQuery.addEventListener('change', e => {
  window.__skyReducedMotion = e.matches;
});

// 2. Asistente de IA H.E.R.A 7 (solo fuera de #inicio y sin botones de acceso rápido)
const topHeader = document.querySelector('.top');
const heraAside = document.getElementById('hera');
const heraBubble = document.getElementById('hb');
const heraText = document.getElementById('ht');
const heraAvatarBtn = document.getElementById('ha');

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
    if (heraBubble.classList.contains('show')) {
      heraBubble.classList.remove('show');
    } else {
      this.say(MSG[currentRoute] || MSG.explorar, true);
    }
  }
};

if (heraAvatarBtn) {
  heraAvatarBtn.onclick = () => hera.toggle();
  initHera3d(heraAvatarBtn);
}

// 3. Router Reactivo por Hash con Transiciones GPU + Vuelo de Cámara 3D
const ROUTES = ['inicio', 'explorar', '3d', 'fases'];
let currentRoute = '';
let leaveTimer = 0;

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

  // En móvil (<= 780px) o en #inicio ocultamos el globo de H.E.R.A 7
  if (isInicio) {
    clearTimeout(heraTimer);
    if (heraBubble) heraBubble.classList.remove('show');
  } else if (MSG[currentRoute] && window.innerWidth > 780) {
    hera.say(MSG[currentRoute]);
  } else if (heraBubble && window.innerWidth <= 780) {
    heraBubble.classList.remove('show');
  }

  // Cambiar escena dentro del motor unificado Three.js
  if (prevRoute === 'explorar' && currentRoute !== 'explorar') {
    pauseExplorarBlink();
  }
  setCosmosRoute(currentRoute);

  if (currentRoute === 'explorar') {
    startExplorar(hera.say.bind(hera));
  } else if (currentRoute === '3d') {
    startSistema3D();
  } else if (currentRoute === 'fases') {
    startFases(hera.say.bind(hera));
  }
}

window.addEventListener('hashchange', navigate);

// Solo ENTER o BARRA DE ESPACIO activan animación zoom desde #inicio hacia #explorar
let isWarping = false;
window.addEventListener('keydown', e => {
  if (currentRoute !== 'inicio' || isWarping || e.metaKey || e.ctrlKey || e.altKey || e.repeat) return;
  const tag = document.activeElement?.tagName;
  if (['INPUT', 'TEXTAREA', 'SELECT', 'BUTTON', 'A'].includes(tag) || document.activeElement?.isContentEditable) return;
  if (e.key === 'Enter' || e.code === 'Space') {
    e.preventDefault();
    if (window.__skyReducedMotion) {
      window.location.hash = '#explorar';
      return;
    }
    isWarping = true;
    document.body.classList.add('warp-zoom');
    triggerWarpZoom();
    setTimeout(() => {
      window.location.hash = '#explorar';
      setTimeout(() => {
        document.body.classList.remove('warp-zoom');
        isWarping = false;
      }, 480);
    }, 340);
  }
});

// 4. Gestión de C-States (Page Visibility API)
document.addEventListener('visibilitychange', () => {
  setCosmosVisible(!document.hidden);
});

// 6. Inicialización inmediata
function initApp() {
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
