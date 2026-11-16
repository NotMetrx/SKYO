/**
 * HeraPilot — Desplazamiento libre con físicas de resorte, evasión UI y orientación contextual.
 * Permite que Heras7 salga de la esquina fija, sobrevuele cualquier panel o iframe
 * sin robar arrastres de fondo (pointer-events selectivo) y voltee su diálogo según cuadrante.
 */

import { setHeraFlightState } from './hera3d.js';

const MOBILE_BP = 780;

function clamp(v, min, max) {
  return max < min ? min : Math.max(min, Math.min(max, v));
}

function overlapsRect(x, y, size, r, pad = 10) {
  return x < r.right + pad && x + size > r.left - pad && y < r.bottom + pad && y + size > r.top - pad;
}

export function initHeraPilot({ asideEl, buttonEl, bubbleEl, resetBtn, onToggleClick } = {}) {
  if (!asideEl || !buttonEl) return null;

  const state = {
    x: 0,
    y: 0,
    vx: 0,
    vy: 0,
    tx: 0,
    ty: 0,
    size: 148,
    route: 'inicio',
    subView: 'espectral',
    manualOverride: false,
    dragging: false,
    lookAt: null,
    rafId: 0,
    lastTs: 0,
    revertTimer: 0,
    lookClearTimer: 0,
    hasPlacedDesktop: false
  };

  function isDesktop() {
    return window.innerWidth > MOBILE_BP;
  }

  function measureSize() {
    const rect = buttonEl.getBoundingClientRect();
    const s = Math.round(Math.max(rect.width || 0, rect.height || 0));
    state.size = s >= 40 ? s : (window.innerHeight <= 760 ? 124 : 148);
    return state.size;
  }

  function bounds() {
    const vw = window.innerWidth || 1280;
    const vh = window.innerHeight || 720;
    const s = measureSize();
    return {
      vw,
      vh,
      s,
      minX: 14,
      maxX: Math.max(14, vw - s - 14),
      minY: 72,
      maxY: Math.max(72, vh - s - 16)
    };
  }

  function updateBubbleQuadrant() {
    if (!isDesktop()) {
      asideEl.removeAttribute('data-hb-side');
      asideEl.removeAttribute('data-hb-v');
      return;
    }
    const vw = window.innerWidth || 1280;
    const vh = window.innerHeight || 720;
    const cx = state.x + state.size * 0.5;
    const cy = state.y + state.size * 0.5;
    asideEl.dataset.hbSide = cx > vw * 0.44 ? 'left' : 'right';
    asideEl.dataset.hbV = cy < vh * 0.42 ? 'bottom' : 'top';
  }

  function applyTransform() {
    if (!isDesktop()) {
      asideEl.style.transform = '';
      asideEl.classList.remove('is-flying', 'is-dragging');
      updateBubbleQuadrant();
      return;
    }
    asideEl.style.transform = `translate3d(${state.x.toFixed(1)}px, ${state.y.toFixed(1)}px, 0)`;
    updateBubbleQuadrant();
  }

  function getDefaultAnchor(route = state.route, subView = state.subView) {
    const { vw, vh, s, minX, maxX, minY, maxY } = bounds();
    if (route === 'nosotros') {
      return {
        x: clamp(vw - s - 18, minX, maxX),
        y: clamp(84, minY, maxY)
      };
    }
    if (route === 'explorar' && subView === 'espectral') {
      if (vw < 1080) {
        return {
          x: clamp(vw - s - 18, minX, maxX),
          y: clamp(Math.round(vh * 0.44 - s * 0.5), 270, Math.max(270, vh - s - 196))
        };
      }
      return {
        x: clamp(vw - s - 24, minX, maxX),
        y: clamp(vh - s - 24, minY, maxY)
      };
    }
    if (route === 'fases') {
      return {
        x: clamp(vw - s - 22, minX, maxX),
        y: clamp(vh - s - 26, minY, maxY)
      };
    }
    return {
      x: clamp(vw - s - 24, minX, maxX),
      y: clamp(vh - s - 24, minY, maxY)
    };
  }

  function syncResetVisibility() {
    if (resetBtn) {
      resetBtn.hidden = !state.manualOverride || !isDesktop();
    }
  }

  function step(now) {
    if (document.hidden || !isDesktop() || state.dragging) {
      state.rafId = 0;
      return;
    }

    const dt = state.lastTs ? Math.min(0.04, (now - state.lastTs) / 1000) : 0.016;
    state.lastTs = now;

    if (window.__skyReducedMotion) {
      state.x = state.tx;
      state.y = state.ty;
      state.vx = 0;
      state.vy = 0;
      asideEl.classList.remove('is-flying');
      applyTransform();
      setHeraFlightState({ vx: 0, vy: 0, speed: 0, flying: false, lookAt: state.lookAt });
      state.rafId = 0;
      return;
    }

    // Resorte críticamente amortiguado: respuesta viva sin rebotes bruscos
    const stiffness = 78;
    const damping = 16.5;
    const ax = (state.tx - state.x) * stiffness - state.vx * damping;
    const ay = (state.ty - state.y) * stiffness - state.vy * damping;

    state.vx += ax * dt;
    state.vy += ay * dt;
    state.x += state.vx * dt;
    state.y += state.vy * dt;

    const { minX, maxX, minY, maxY } = bounds();
    state.x = clamp(state.x, minX, maxX);
    state.y = clamp(state.y, minY, maxY);

    const dist = Math.hypot(state.tx - state.x, state.ty - state.y);
    const speed = Math.hypot(state.vx, state.vy);
    const flying = speed > 18 || dist > 6;

    asideEl.classList.toggle('is-flying', flying && dist > 14);
    applyTransform();
    setHeraFlightState({
      vx: state.vx,
      vy: state.vy,
      speed,
      flying,
      lookAt: state.lookAt
    });

    if (dist < 0.8 && speed < 4) {
      state.x = state.tx;
      state.y = state.ty;
      state.vx = 0;
      state.vy = 0;
      asideEl.classList.remove('is-flying');
      applyTransform();
      setHeraFlightState({ vx: 0, vy: 0, speed: 0, flying: false, lookAt: state.lookAt });
      state.rafId = 0;
      return;
    }

    state.rafId = requestAnimationFrame(step);
  }

  function wakePhysics() {
    if (!isDesktop() || document.hidden || state.dragging || state.rafId) return;
    state.lastTs = performance.now();
    state.rafId = requestAnimationFrame(step);
  }

  function setTarget(x, y, { immediate = false, lookAt = state.lookAt } = {}) {
    const { minX, maxX, minY, maxY } = bounds();
    state.tx = clamp(x, minX, maxX);
    state.ty = clamp(y, minY, maxY);
    state.lookAt = lookAt;

    if (immediate || !isDesktop() || window.__skyReducedMotion) {
      state.x = state.tx;
      state.y = state.ty;
      state.vx = 0;
      state.vy = 0;
      asideEl.classList.remove('is-flying');
      applyTransform();
      setHeraFlightState({ vx: 0, vy: 0, speed: 0, flying: false, lookAt: state.lookAt });
      return;
    }
    wakePhysics();
  }

  function pickPerchNearRect(rect, preferredSide = 'auto') {
    const { vw, vh, s, minX, maxX, minY, maxY } = bounds();
    const gap = 16;
    const midY = rect.top + rect.height * 0.5 - s * 0.5;
    const midX = rect.left + rect.width * 0.5 - s * 0.5;

    const candidates = {
      left: { x: rect.left - s - gap, y: midY },
      right: { x: rect.right + gap, y: midY },
      top: { x: midX, y: rect.top - s - gap },
      bottom: { x: midX, y: rect.bottom + gap }
    };

    const order = preferredSide !== 'auto' && candidates[preferredSide]
      ? [preferredSide, 'left', 'right', 'top', 'bottom']
      : rect.left > vw * 0.45
        ? ['left', 'top', 'right', 'bottom']
        : ['right', 'bottom', 'left', 'top'];

    for (const side of order) {
      const c = candidates[side];
      const cx = clamp(c.x, minX, maxX);
      const cy = clamp(c.y, minY, maxY);
      if (!overlapsRect(cx, cy, s, rect, 6)) {
        return { x: cx, y: cy };
      }
    }

    // Respaldo libre lejos del objetivo si ocupa casi todo el centro
    return getDefaultAnchor();
  }

  function resolveElement(target) {
    if (!target) return null;
    if (typeof target === 'string') return document.querySelector(target);
    return target instanceof Element ? target : null;
  }

  function clearFocusTimers() {
    clearTimeout(state.revertTimer);
    clearTimeout(state.lookClearTimer);
  }

  function lookAtPoint(point, durationMs = 5200) {
    state.lookAt = point || null;
    clearTimeout(state.lookClearTimer);
    setHeraFlightState({
      vx: state.vx,
      vy: state.vy,
      speed: Math.hypot(state.vx, state.vy),
      flying: asideEl.classList.contains('is-flying'),
      lookAt: state.lookAt
    });
    if (point && durationMs > 0) {
      state.lookClearTimer = setTimeout(() => {
        state.lookAt = null;
        setHeraFlightState({
          vx: state.vx,
          vy: state.vy,
          speed: Math.hypot(state.vx, state.vy),
          flying: asideEl.classList.contains('is-flying'),
          lookAt: null
        });
      }, durationMs);
    }
  }

  function flyNearElement(target, { durationMs = 7200, preferredSide = 'auto', fly = true } = {}) {
    if (!isDesktop()) return;
    const el = resolveElement(target);
    if (!el) return;
    const rect = el.getBoundingClientRect();
    if (!rect.width || !rect.height) return;

    const point = {
      x: rect.left + rect.width * 0.5,
      y: rect.top + rect.height * 0.5
    };

    lookAtPoint(point, durationMs > 0 ? durationMs : 5200);

    if (!fly || state.manualOverride) return;

    const spot = pickPerchNearRect(rect, preferredSide);
    clearTimeout(state.revertTimer);
    setTarget(spot.x, spot.y, { lookAt: point });

    if (durationMs > 0) {
      state.revertTimer = setTimeout(() => {
        if (!state.manualOverride && state.route !== 'inicio') {
          const anchor = getDefaultAnchor();
          state.lookAt = null;
          setTarget(anchor.x, anchor.y, { lookAt: null });
        }
      }, durationMs);
    }
  }

  function flyToZone(zone, { durationMs = 7000 } = {}) {
    if (!isDesktop() || state.manualOverride) return;
    const { vw, vh, s, minX, maxX, minY, maxY } = bounds();
    let x = vw - s - 24;
    let y = vh - s - 24;
    let point = { x: vw * 0.5, y: vh * 0.5 };

    if (zone === 'spectral-slider') {
      x = clamp(vw * 0.5 + 334, minX, maxX);
      y = clamp(vh - s - 30, minY, maxY);
      point = { x: vw * 0.5, y: vh - 68 };
    } else if (zone === 'spectral-hud') {
      x = clamp(354, minX, maxX);
      y = clamp(160, minY, maxY);
      point = { x: 175, y: 240 };
    }

    lookAtPoint(point, durationMs);
    clearTimeout(state.revertTimer);
    setTarget(x, y, { lookAt: point });
    if (durationMs > 0) {
      state.revertTimer = setTimeout(() => {
        if (!state.manualOverride && state.route !== 'inicio') {
          const anchor = getDefaultAnchor();
          state.lookAt = null;
          setTarget(anchor.x, anchor.y, { lookAt: null });
        }
      }, durationMs);
    }
  }

  function setContextAnchor(route, subView = state.subView, { immediate = false } = {}) {
    const routeChanged = state.route !== route;
    state.route = route;
    state.subView = subView || 'espectral';
    clearFocusTimers();
    state.lookAt = null;

    if (route === 'inicio') {
      state.manualOverride = false;
      syncResetVisibility();
      const anchor = getDefaultAnchor('explorar', state.subView);
      setTarget(anchor.x, anchor.y, { immediate: true, lookAt: null });
      state.hasPlacedDesktop = true;
      return;
    }

    if (routeChanged) {
      state.manualOverride = false;
    }
    syncResetVisibility();

    if (state.manualOverride) {
      const { minX, maxX, minY, maxY } = bounds();
      setTarget(clamp(state.x, minX, maxX), clamp(state.y, minY, maxY), { immediate });
      return;
    }

    const anchor = getDefaultAnchor(state.route, state.subView);
    const snapNow = immediate || !state.hasPlacedDesktop || document.body.classList.contains('warp-zoom');
    setTarget(anchor.x, anchor.y, { immediate: snapNow, lookAt: null });
    state.hasPlacedDesktop = true;
  }

  function resetManualPosition() {
    state.manualOverride = false;
    syncResetVisibility();
    clearFocusTimers();
    state.lookAt = null;
    const anchor = getDefaultAnchor();
    setTarget(anchor.x, anchor.y, { lookAt: null });
  }

  // Interacción táctil / puntero: clic corto abre globo (#hb); arrastre > 6 px desplaza por el viewport
  let pointerState = null;

  const onPointerDown = e => {
    if (e.button !== 0 && e.pointerType === 'mouse') return;
    if (state.route === 'inicio') return;
    if (!isDesktop()) return;

    pointerState = {
      id: e.pointerId,
      startX: e.clientX,
      startY: e.clientY,
      baseX: state.x,
      baseY: state.y,
      lastX: e.clientX,
      lastY: e.clientY,
      lastTime: performance.now(),
      moved: false
    };
    try { buttonEl.setPointerCapture(e.pointerId); } catch {}
  };

  const onPointerMove = e => {
    if (!pointerState || e.pointerId !== pointerState.id) return;
    const dx = e.clientX - pointerState.startX;
    const dy = e.clientY - pointerState.startY;
    if (!pointerState.moved && Math.hypot(dx, dy) > 6) {
      pointerState.moved = true;
      state.dragging = true;
      clearFocusTimers();
      if (state.rafId) {
        cancelAnimationFrame(state.rafId);
        state.rafId = 0;
      }
      asideEl.classList.add('is-dragging', 'is-flying');
    }
    if (!pointerState.moved) return;

    const now = performance.now();
    const dt = Math.max(0.008, (now - pointerState.lastTime) / 1000);
    const vx = (e.clientX - pointerState.lastX) / dt;
    const vy = (e.clientY - pointerState.lastY) / dt;
    pointerState.lastX = e.clientX;
    pointerState.lastY = e.clientY;
    pointerState.lastTime = now;

    const { minX, maxX, minY, maxY } = bounds();
    state.x = clamp(pointerState.baseX + dx, minX, maxX);
    state.y = clamp(pointerState.baseY + dy, minY, maxY);
    state.tx = state.x;
    state.ty = state.y;
    state.vx = vx * 0.35;
    state.vy = vy * 0.35;
    applyTransform();
    setHeraFlightState({
      vx: state.vx,
      vy: state.vy,
      speed: Math.hypot(state.vx, state.vy),
      flying: true,
      lookAt: null
    });
  };

  let suppressNextClick = false;
  const finishPointer = e => {
    if (!pointerState || e.pointerId !== pointerState.id) return;
    const wasMoved = pointerState.moved;
    pointerState = null;
    try { buttonEl.releasePointerCapture(e.pointerId); } catch {}

    if (wasMoved) {
      state.dragging = false;
      state.manualOverride = true;
      syncResetVisibility();
      asideEl.classList.remove('is-dragging');
      suppressNextClick = true;
      setTimeout(() => { suppressNextClick = false; }, 120);

      // Ligera inercia al soltar y reposo en el punto elegido
      const { minX, maxX, minY, maxY } = bounds();
      state.tx = clamp(state.x + clamp(state.vx * 0.14, -46, 46), minX, maxX);
      state.ty = clamp(state.y + clamp(state.vy * 0.14, -46, 46), minY, maxY);
      wakePhysics();
    }
  };

  buttonEl.addEventListener('pointerdown', onPointerDown);
  window.addEventListener('pointermove', onPointerMove, { passive: true });
  window.addEventListener('pointerup', finishPointer);
  window.addEventListener('pointercancel', finishPointer);

  buttonEl.addEventListener('click', e => {
    if (suppressNextClick) {
      e.preventDefault();
      e.stopImmediatePropagation();
      return;
    }
    onToggleClick?.(e);
  }, { capture: true });

  if (resetBtn) {
    resetBtn.addEventListener('click', e => {
      e.stopPropagation();
      resetManualPosition();
    });
  }

  window.addEventListener('resize', () => {
    if (!isDesktop()) {
      if (state.rafId) {
        cancelAnimationFrame(state.rafId);
        state.rafId = 0;
      }
      state.dragging = false;
      applyTransform();
      syncResetVisibility();
      return;
    }
    const { minX, maxX, minY, maxY } = bounds();
    if (state.manualOverride) {
      setTarget(clamp(state.x, minX, maxX), clamp(state.y, minY, maxY), { immediate: true });
    } else {
      const anchor = getDefaultAnchor();
      setTarget(anchor.x, anchor.y, { immediate: true });
    }
    syncResetVisibility();
  }, { passive: true });

  document.addEventListener('visibilitychange', () => {
    if (document.hidden && state.rafId) {
      cancelAnimationFrame(state.rafId);
      state.rafId = 0;
    }
  });

  // Posición inicial lista antes del primer salto desde #inicio
  const initialAnchor = getDefaultAnchor('explorar', 'espectral');
  state.x = state.tx = initialAnchor.x;
  state.y = state.ty = initialAnchor.y;
  applyTransform();
  syncResetVisibility();

  return {
    setContextAnchor,
    flyNearElement,
    flyToZone,
    lookAtPoint,
    resetManualPosition,
    getState: () => ({ ...state, desktop: isDesktop() })
  };
}
