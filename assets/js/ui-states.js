/**
 * SKYO — Módulo compartido de estados UI (Cargando · Error · Sin datos)
 * Aplica WCAG 2.2 (icono + rol ARIA + texto + acción de recuperación) y estilo orbital SKYO.
 */

const ICONS = {
  loading: `
    <svg viewBox="0 0 40 40" fill="none" aria-hidden="true">
      <circle cx="20" cy="20" r="14" stroke="currentColor" stroke-opacity="0.22" stroke-width="1.6"/>
      <circle cx="20" cy="20" r="9.2" fill="#050914" stroke="currentColor" stroke-opacity="0.35" stroke-width="1"/>
      <path class="skyo-orbit-sweep" d="M20 6 A14 14 0 0 1 34 20" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/>
      <circle cx="29.9" cy="10.1" r="1.8" fill="#ffffff"/>
    </svg>`,
  error: `
    <svg viewBox="0 0 40 40" fill="none" aria-hidden="true">
      <circle cx="20" cy="20" r="14" stroke="currentColor" stroke-opacity="0.45" stroke-width="1.6" stroke-dasharray="18 5 7 5"/>
      <path d="M20 12.5V21.5" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/>
      <circle cx="20" cy="26.2" r="1.5" fill="currentColor"/>
    </svg>`,
  empty: `
    <svg viewBox="0 0 40 40" fill="none" aria-hidden="true">
      <circle cx="20" cy="20" r="13.5" stroke="currentColor" stroke-opacity="0.52" stroke-width="1.5" stroke-dasharray="4 4"/>
      <circle cx="20" cy="20" r="6" stroke="currentColor" stroke-opacity="0.35" stroke-width="1.2"/>
      <path d="M20 3.5V9M20 31V36.5M3.5 20H9M31 20H36.5" stroke="currentColor" stroke-opacity="0.42" stroke-width="1.3" stroke-linecap="round"/>
    </svg>`
};

export function createStateElement({
  state = 'empty',
  title = '',
  detail = '',
  actionLabel = '',
  onAction = null,
  variant = 'card'
} = {}) {
  const card = document.createElement('div');
  card.className = 'skyo-state';
  card.dataset.state = state;
  card.dataset.variant = variant;
  card.setAttribute('role', state === 'error' ? 'alert' : 'status');
  card.setAttribute('aria-live', state === 'error' ? 'assertive' : 'polite');

  const orbit = document.createElement('span');
  orbit.className = 'skyo-state-orbit';
  orbit.innerHTML = ICONS[state] || ICONS.empty;
  card.appendChild(orbit);

  if (title || detail) {
    const body = document.createElement('div');
    body.className = 'skyo-state-body';

    if (title) {
      const h = document.createElement('p');
      h.className = 'skyo-state-title';
      h.textContent = title;
      body.appendChild(h);
    }
    if (detail) {
      const p = document.createElement('p');
      p.className = 'skyo-state-detail';
      p.textContent = detail;
      body.appendChild(p);
    }
    card.appendChild(body);
  }

  if (actionLabel && typeof onAction === 'function') {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'skyo-state-btn';
    btn.textContent = actionLabel;
    btn.onclick = onAction;
    card.appendChild(btn);
  }

  return card;
}

export function renderState(container, options) {
  if (!container) return null;
  container.hidden = false;
  const el = createStateElement(options);
  container.replaceChildren(el);
  return el;
}

export function clearState(container) {
  if (!container) return;
  container.replaceChildren();
  container.hidden = true;
}

export function showToast(toastEl, message, state = 'ok', durationMs = 4500) {
  if (!toastEl) return;
  toastEl.dataset.state = state;
  toastEl.setAttribute('role', state === 'error' ? 'alert' : 'status');
  toastEl.setAttribute('aria-live', state === 'error' ? 'assertive' : 'polite');

  const dot = document.createElement('span');
  dot.className = 'skyo-toast-dot';
  dot.setAttribute('aria-hidden', 'true');

  const txt = document.createElement('span');
  txt.textContent = message;

  toastEl.replaceChildren(dot, txt);
  toastEl.hidden = false;

  clearTimeout(toastEl._timer);
  if (durationMs > 0) {
    toastEl._timer = setTimeout(() => {
      toastEl.hidden = true;
    }, durationMs);
  }
}
