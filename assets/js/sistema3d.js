/**
 * SKYO — Vista Sistema Solar 3D (Controles HUD conectados al motor unificado Three.js)
 */

import { set3DFocus, toggle3DPlay, adjust3DZoom } from './cosmos3d.js';

let initialized = false;

export function startSistema3D() {
  if (initialized) return;

  const controlsEl = document.getElementById('fc');
  if (controlsEl) {
    controlsEl.onclick = e => {
      const btn = e.target.closest('button');
      if (!btn) return;

      if (btn.dataset.f) {
        set3DFocus(btn.dataset.f);
      } else if (btn.id === 'pp') {
        const playing = toggle3DPlay();
        btn.textContent = playing ? '⏸' : '▶';
        btn.setAttribute('aria-label', playing ? 'Pausar simulación' : 'Reanudar simulación');
      } else if (btn.id === 'zi') {
        adjust3DZoom(0.75);
      } else if (btn.id === 'zo') {
        adjust3DZoom(1.3);
      }
    };
  }

  initialized = true;
}
