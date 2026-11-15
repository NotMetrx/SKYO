/**
 * SKYO — Panel final «Acerca de nosotros» (#nosotros)
 * Layout a pantalla completa: titular grande editorial y perfiles estilo LinkedIn al pie.
 */

import { EQUIPO_NEOIS, MISION_SPHEREX } from './data.js';

let initialized = false;
let onHeraSpeak = null;

const card = m => {
  const actions = [
    m.linkedin ? `<a class="nx-btn pr" href="${m.linkedin}" target="_blank" rel="noopener noreferrer" aria-label="LinkedIn de ${m.name}">in · LinkedIn</a>` : '',
    m.github ? `<a class="nx-btn gh" href="${m.github}" target="_blank" rel="noopener noreferrer" aria-label="GitHub de ${m.name}">GitHub</a>` : ''
  ].filter(Boolean).join('');

  const handle = m.email || m.contact || 'Grupo Neois';

  return `
    <article class="nx-card" role="listitem">
      <div class="nx-cover" aria-hidden="true"></div>
      <div class="nx-av" aria-hidden="true">${m.initials}</div>
      <h3>${m.name}</h3>
      <span class="nx-role">${m.role}</span>
      <p class="nx-bio">${m.bio}</p>
      <span class="nx-handle">${handle}</span>
      ${actions ? `<div class="nx-actions">${actions}</div>` : ''}
    </article>`;
};

function renderNosotros() {
  const host = document.getElementById('nosotros-shell');
  if (!host) return;

  host.innerHTML = `
    <header class="nx-hero">
      <span class="nx-kicker">Acerca de nosotros · Grupo Neois</span>
      <h2 class="nx-title">Llevamos el universo infrarrojo a todas las personas.</h2>
      <p class="nx-lead">${MISION_SPHEREX.summary}</p>
      <div class="nx-cta">
        <a class="nx-btn pr" href="#explorar">Explorar Bóveda IR</a>
        <a class="nx-btn" href="lab.html">Laboratorio FITS</a>
        <button type="button" class="nx-btn" id="nosotros-hera">Presentar con Heras7</button>
      </div>
    </header>

    <section class="nx-people" aria-label="Integrantes del Grupo Neois">
      <div class="nx-people-head">
        <strong>Equipo · ${EQUIPO_NEOIS.length} integrantes</strong>
        <span>NASA Space Apps 2026 · Ciencia abierta</span>
      </div>
      <div class="nx-grid" role="list">${EQUIPO_NEOIS.map(card).join('')}</div>
    </section>

    <footer class="nx-foot">
      <span>© 2026 Grupo Neois · SKYO · Datos públicos NASA / IPAC IRSA (SPHEREx)</span>
      <span><a href="#fases">Fases 0–6</a> · <a href="inmersivo.html">Espacio Inmersivo</a> · <a href="#inicio">Inicio</a></span>
    </footer>
  `;

  document.getElementById('nosotros-hera').onclick = () => {
    onHeraSpeak?.('Somos el Grupo Neois: Edwin Lizana, Valentín García, Aron Ayala y Jhoao Lopez. Abajo encuentras nuestros perfiles de LinkedIn y GitHub.', true);
  };
}

export function startNosotros(speakCallback) {
  onHeraSpeak = speakCallback;
  if (initialized) return;
  initialized = true;
  renderNosotros();
}
