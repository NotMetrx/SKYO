/**
 * SKYO — Vista Fases y Pipeline Vivo 3D
 * Sincronizada con la constelación orbital Three.js (#cosmos) + nasa/ROADMAP.md + nasa/DETECCION-DE-CAMBIOS.md
 */

import { FASES_PROYECTO, ETAPAS_PIPELINE } from './data.js';
import { focusPhaseNode, updateFasesHandlers } from './cosmos3d.js';

let initialized = false;
let activeIndex = 0;
let subView = 'roadmap'; // 'roadmap' | 'pipeline'
let onHeraSpeak = null;

function renderPanelContent() {
  const panel = document.getElementById('phase-panel');
  if (!panel) return;

  panel.classList.add('swapping');
  requestAnimationFrame(() => {
    if (subView === 'pipeline') {
      panel.innerHTML = `
        <div class="phase-head">
          <div>
            <span class="phase-code">DETECCIÓN DE CAMBIOS · METODOLOGÍA</span>
            <h3 class="phase-title">Pipeline científico en 6 etapas</h3>
          </div>
          <span class="phase-status status-ac2">SPHEREx + JPL SSD</span>
        </div>
        <div class="pipeline-grid" role="list" aria-label="Pipeline de detección de cambios">
          ${ETAPAS_PIPELINE.map(p => `
            <article class="stage-card" role="listitem">
              <div class="stage-top">
                <span class="stage-num">${p.step} · ${p.name}</span>
                <span class="stage-code">${p.code}</span>
              </div>
              <p class="stage-detail">${p.detail}</p>
            </article>
          `).join('')}
        </div>
        <div class="phase-foot">
          <a class="btn pr" href="#explorar">Probar comparación en vivo</a>
          <button type="button" class="btn" id="phase-hera">¿Por qué no afirmar Planeta X?</button>
        </div>
      `;

      const heraBtn = document.getElementById('phase-hera');
      if (heraBtn) {
        heraBtn.onclick = () => {
          if (typeof onHeraSpeak === 'function') {
            onHeraSpeak('Un cuerpo muy lejano se mueve poco en seis meses. SKYO distingue «confirmado» (JPL) de «candidato» para cuidar el rigor científico.', true);
          }
        };
      }
    } else {
      const phase = FASES_PROYECTO[activeIndex];
      panel.innerHTML = `
        <div class="phase-head">
          <div>
            <span class="phase-code">FASE ${phase.num} · HOJA DE RUTA</span>
            <h3 class="phase-title">${phase.title}</h3>
          </div>
          <span class="phase-status status-${phase.tone}">${phase.status}</span>
        </div>
        <p class="phase-summary">${phase.summary}</p>
        <div class="stages-grid" role="list" aria-label="Etapas de la fase ${phase.num}">
          ${phase.etapas.map((etapa, idx) => `
            <article class="stage-card" role="listitem">
              <div class="stage-top">
                <span class="stage-num">${etapa.tag}</span>
                <span class="stage-idx">0${idx + 1}</span>
              </div>
              <h4 class="stage-name">${etapa.name}</h4>
              <p class="stage-detail">${etapa.detail}</p>
            </article>
          `).join('')}
        </div>
        <div class="phase-foot">
          <a class="btn pr" href="${phase.route}">${phase.routeLabel}</a>
          <button type="button" class="btn" id="phase-hera">Consultar a H.E.R.A 7</button>
        </div>
      `;

      const heraBtn = document.getElementById('phase-hera');
      if (heraBtn) {
        heraBtn.onclick = () => {
          if (typeof onHeraSpeak === 'function') {
            onHeraSpeak(`Fase ${phase.num} (${phase.title}): ${phase.summary}`, true);
          }
        };
      }
    }

    requestAnimationFrame(() => panel.classList.remove('swapping'));
  });
}

function selectPhase(index) {
  if (index < 0 || index >= FASES_PROYECTO.length) return;
  activeIndex = index;
  subView = 'roadmap';

  document.querySelectorAll('#fases-view-toggle button').forEach(b => {
    b.classList.toggle('on', b.dataset.view === 'roadmap');
  });

  document.querySelectorAll('#phase-rail button').forEach((btn, idx) => {
    const selected = idx === activeIndex;
    btn.classList.toggle('on', selected);
    btn.setAttribute('aria-selected', String(selected));
    btn.tabIndex = selected ? 0 : -1;
    if (selected) btn.scrollIntoView?.({ block: 'nearest', inline: 'center' });
  });

  focusPhaseNode(activeIndex);
  renderPanelContent();
}

function buildFasesUI() {
  const rail = document.getElementById('phase-rail');
  const toggleEl = document.getElementById('fases-view-toggle');

  if (toggleEl) {
    toggleEl.onclick = e => {
      const btn = e.target.closest('button[data-view]');
      if (!btn) return;
      subView = btn.dataset.view;
      toggleEl.querySelectorAll('button').forEach(b => b.classList.toggle('on', b === btn));
      if (rail) rail.classList.toggle('dimmed', subView === 'pipeline');
      renderPanelContent();
    };
  }

  if (rail && !rail.hasChildNodes()) {
    FASES_PROYECTO.forEach((phase, idx) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.role = 'tab';
      btn.id = `tab-${phase.id}`;
      btn.setAttribute('aria-controls', 'phase-panel');
      btn.setAttribute('aria-selected', String(idx === activeIndex));
      btn.tabIndex = idx === activeIndex ? 0 : -1;
      btn.className = idx === activeIndex ? 'phase-tab on' : 'phase-tab';
      btn.dataset.idx = String(idx);
      btn.innerHTML = `<span class="pt-num">F${phase.num}</span><span class="pt-name">${phase.title}</span>`;
      rail.appendChild(btn);
    });

    rail.addEventListener('click', e => {
      const btn = e.target.closest('button[data-idx]');
      if (!btn) return;
      selectPhase(Number(btn.dataset.idx));
    });

    rail.addEventListener('keydown', e => {
      if (!['ArrowRight', 'ArrowLeft', 'Home', 'End'].includes(e.key)) return;
      e.preventDefault();
      let next = activeIndex;
      if (e.key === 'Home') next = 0;
      else if (e.key === 'End') next = FASES_PROYECTO.length - 1;
      else {
        const delta = e.key === 'ArrowRight' ? 1 : -1;
        next = (activeIndex + delta + FASES_PROYECTO.length) % FASES_PROYECTO.length;
      }
      selectPhase(next);
      const nextBtn = rail.querySelector(`button[data-idx="${next}"]`);
      if (nextBtn) nextBtn.focus();
    });
  }

  updateFasesHandlers({
    onSelectPhase: idx => selectPhase(idx)
  });

  selectPhase(activeIndex);
}

export function startFases(heraHandler) {
  if (heraHandler) onHeraSpeak = heraHandler;
  if (!initialized) {
    buildFasesUI();
    initialized = true;
  } else {
    focusPhaseNode(activeIndex);
  }
}
