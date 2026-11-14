/**
 * SKYO — Vista Explorar: Bóveda ICRS 3D, Blink Multi-Época, Misiones H.E.R.A 7 y Bitácora
 * Alineado a nasa/PROPOSITO.md, nasa/HERA-7.md y nasa/DETECCION-DE-CAMBIOS.md.
 */

import {
  OBJ,
  EPOCAS,
  MESES,
  BANDAS,
  MODOS_LECTURA,
  ETAPAS_EXPLORACION,
  MISIONES_HERA,
  rng
} from './data.js';
import { updateExploreState } from './cosmos3d.js';
import { initScienceLab } from './science-lab-ui.js';

const STORAGE_KEY = 'skyo_bitacora_v1';

let initialized = false;
let currentSubView = 'boveda';
let collectionFilter = 'all';
let activeFilter = 'Todos';
let currentEpoch = 0;
let currentMonth = 0;
let currentBand = 0;
let currentMode = 'explorador';
let currentStage = 0;
let compareMode = false;
let blinkMode = false;
let blinkUsed = false;
let selectedIndex = -1;
let onHeraSpeak = null;

// Correcciones astrométricas interactivas de coordenadas ICRS
const coordOffsets = new Map(); // idx -> { ra: number, dec: number }
let raOffset = 0;
let decOffset = 0;

let missionIndex = 0;
let hintStep = 0;
const completedMissions = new Set();
let bitacoraEntries = loadBitacora();

function getElapsedMonths() {
  return currentEpoch * 6 + currentMonth;
}

function getObjectOffsets(idx) {
  return coordOffsets.get(idx) || { ra: 0, dec: 0 };
}

function formatICRS(o, elapsed, idx = selectedIndex) {
  const off = idx >= 0 ? getObjectOffsets(idx) : { ra: 0, dec: 0 };
  const angle = o[3] + elapsed * o[8];
  const raDeg = (212.4 + Math.cos(angle) * o[2] * 0.042 + off.ra).toFixed(4);
  const decDeg = (-14.8 + Math.sin(angle) * o[2] * 0.036 + off.dec).toFixed(4);
  const note = (off.ra !== 0 || off.dec !== 0) ? ' [corregida]' : '';
  return `RA ${raDeg}° · Dec ${decDeg}°${note}`;
}

function loadBitacora() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveBitacora() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(bitacoraEntries.slice(0, 30)));
  } catch {
    // Almacenamiento local lleno o deshabilitado
  }
}

function drawMiniGlyph(g, type, x, y, color) {
  g.shadowColor = color;
  g.shadowBlur = 10;
  g.fillStyle = color;
  g.strokeStyle = color;

  if (type === 'Cometa') {
    const grad = g.createLinearGradient(x, y, x - 44, y + 20);
    grad.addColorStop(0, color);
    grad.addColorStop(1, 'transparent');
    g.strokeStyle = grad;
    g.lineWidth = 5.5;
    g.lineCap = 'round';
    g.beginPath();
    g.moveTo(x, y);
    g.lineTo(x - 44, y + 20);
    g.stroke();
    g.beginPath();
    g.arc(x, y, 4.6, 0, 6.283);
    g.fill();
  } else if (type === 'Asteroide') {
    g.beginPath();
    for (let i = 0; i < 7; i++) {
      const r = 5.5 + (i % 3) * 1.4;
      const a = (i / 7) * 6.283;
      const px = x + Math.cos(a) * r;
      const py = y + Math.sin(a) * r;
      if (i === 0) g.moveTo(px, py);
      else g.lineTo(px, py);
    }
    g.closePath();
    g.fill();
  } else {
    g.beginPath();
    g.arc(x, y, 4.2, 0, 6.283);
    g.fill();
    g.lineWidth = 1.4;
    g.beginPath();
    g.moveTo(x - 13, y);
    g.lineTo(x + 13, y);
    g.moveTo(x, y - 13);
    g.lineTo(x, y + 13);
    g.stroke();
  }
  g.shadowBlur = 0;
}

function renderThumbnail(index) {
  const thumbCanvas = document.getElementById('ith');
  if (!thumbCanvas) return;
  const tCtx = thumbCanvas.getContext('2d');
  const w = thumbCanvas.clientWidth || 280;
  const h = thumbCanvas.clientHeight || 96;
  thumbCanvas.width = w;
  thumbCanvas.height = h;

  const isIRLong = currentBand === 1;
  tCtx.fillStyle = '#000000';
  tCtx.fillRect(0, 0, w, h);

  // Tinte sutil de banda infrarroja SPHEREx sobre el recorte 0.05°
  const glow = tCtx.createRadialGradient(w * 0.56, h * 0.48, 4, w * 0.56, h * 0.48, w * 0.6);
  glow.addColorStop(0, isIRLong ? 'rgba(181, 123, 255, 0.18)' : 'rgba(91, 184, 255, 0.18)');
  glow.addColorStop(1, 'rgba(0, 0, 0, 0)');
  tCtx.fillStyle = glow;
  tCtx.fillRect(0, 0, w, h);

  // Estrellas de calibración ICRS fijas
  const R = rng(index + 3);
  for (let k = 0; k < 64; k++) {
    tCtx.fillStyle = `rgba(238, 243, 255, ${(0.24 + R() * 0.68).toFixed(2)})`;
    tCtx.fillRect(R() * w, R() * h, 1.4, 1.4);
  }

  // Retícula ICRS del recorte
  tCtx.strokeStyle = isIRLong ? 'rgba(181, 123, 255, 0.22)' : 'rgba(91, 184, 255, 0.22)';
  tCtx.lineWidth = 1;
  tCtx.beginPath();
  tCtx.moveTo(0, h * 0.5);
  tCtx.lineTo(w, h * 0.5);
  tCtx.moveTo(w * 0.5, 0);
  tCtx.lineTo(w * 0.5, h);
  tCtx.strokeRect(8, 8, w - 16, h - 16);
  tCtx.stroke();

  const o = OBJ[index];
  const elapsed = getElapsedMonths();
  const shiftX = o[8] > 0 ? Math.min(34, Math.round(o[8] * elapsed * 52)) : 0;
  const x0 = w * 0.48 - shiftX * 0.45;
  const y0 = h * 0.5 + (o[8] > 0 ? Math.min(12, elapsed * 0.45) : 0);
  const x1 = x0 + shiftX;
  const y1 = y0 - (o[8] > 0 ? Math.min(16, elapsed * 0.65) : 0);

  if (shiftX > 1) {
    tCtx.strokeStyle = '#b57bff';
    tCtx.lineWidth = 1.6;
    tCtx.setLineDash([3, 3]);
    tCtx.beginPath();
    tCtx.moveTo(x0, y0);
    tCtx.lineTo(x1, y1);
    tCtx.stroke();
    tCtx.setLineDash([]);

    tCtx.fillStyle = '#b57bff';
    tCtx.beginPath();
    tCtx.arc(x0, y0, 2.8, 0, 6.283);
    tCtx.fill();
  }

  drawMiniGlyph(tCtx, o[1], x1, y1, o[4]);

  // Telemetría compacta sobre el recorte para respaldo visual en Bitácora
  const arcsec = o[8] > 0 ? Math.round(o[8] * elapsed * 180) : 0;
  tCtx.fillStyle = 'rgba(238, 243, 255, 0.72)';
  tCtx.font = '10px "Space Mono", monospace';
  tCtx.fillText(`${BANDAS[currentBand].id.toUpperCase()} · Δθ ${arcsec}"`, 14, h - 13);
}

function updateSelectedMovementText(o) {
  const mvEl = document.getElementById('imv');
  if (!mvEl) return;
  const elapsed = getElapsedMonths();
  if (o[8] > 0) {
    const arcsec = Math.round(o[8] * elapsed * 180);
    if (elapsed === 0) {
      mvEl.textContent = currentMode === 'vuelo'
        ? 'Posición inicial. Usa «Parpadear épocas» o avanza de época abajo para ver si viajó.'
        : 'Referencia base (Época 1 · Mes 1). Usa Blink o avanza de época para medir Δθ.';
    } else if (currentMode === 'vuelo') {
      mvEl.textContent = `Se movió respecto al primer barrido tras ${elapsed} meses.`;
    } else if (currentMode === 'cientifico') {
      mvEl.textContent = `Δθ ≈ ${arcsec}" (umbral > 2") · ${formatICRS(o, elapsed)} · ${BANDAS[currentBand].range}.`;
    } else {
      mvEl.textContent = `Desplazamiento desde Época 1: ~${arcsec}" en ${elapsed} meses · ${formatICRS(o, elapsed)}.`;
    }
  } else {
    mvEl.textContent = currentMode === 'cientifico'
      ? `Estrella de referencia ICRS fija · ${formatICRS(o, 0)} (calibración WCS).`
      : 'Estrella fija de fondo (ancla de referencia ICRS entre épocas).';
  }
}

function renderMissionBar() {
  const m = MISIONES_HERA[missionIndex];
  if (!m) return;
  const tagEl = document.getElementById('m-tag');
  const promptEl = document.getElementById('m-prompt');
  const done = completedMissions.has(m.id);

  if (tagEl) {
    tagEl.textContent = done
      ? `✓ Misión ${missionIndex + 1}/${MISIONES_HERA.length}`
      : `Misión ${missionIndex + 1}/${MISIONES_HERA.length}`;
    tagEl.classList.toggle('done', done);
  }
  if (promptEl) {
    promptEl.textContent = `${m.title}: ${m.prompt}`;
  }
}

function evaluateMission(loggedNow = false) {
  const m = MISIONES_HERA[missionIndex];
  if (!m || completedMissions.has(m.id)) return;
  const selectedObj = selectedIndex >= 0 ? OBJ[selectedIndex] : null;
  const passed = m.check({
    object: selectedObj,
    epoch: currentEpoch,
    band: currentBand,
    blinkUsed,
    compare: compareMode,
    loggedNow
  });
  if (passed) {
    completedMissions.add(m.id);
    renderMissionBar();
    if (typeof onHeraSpeak === 'function') {
      onHeraSpeak(m.closure, true);
    }
  }
}

function renderBitacora() {
  const btnEl = document.getElementById('bitacora-btn');
  const sumEl = document.getElementById('bit-summary');
  const listEl = document.getElementById('bit-list');
  if (btnEl) btnEl.textContent = `Bitácora (${bitacoraEntries.length})`;
  if (sumEl) {
    sumEl.textContent = bitacoraEntries.length === 1
      ? '1 registro guardado en modo aula'
      : `${bitacoraEntries.length} registros guardados en modo aula`;
  }
  if (!listEl) return;

  listEl.innerHTML = '';
  if (!bitacoraEntries.length) {
    const empty = document.createElement('p');
    empty.className = 'bit-empty';
    empty.textContent = 'Aún no hay capturas. Toca un cuerpo celeste y pulsa «Registrar en bitácora» para guardar tu evidencia.';
    listEl.appendChild(empty);
    return;
  }

  bitacoraEntries.forEach(item => {
    const card = document.createElement('article');
    card.className = 'bit-card';

    const img = document.createElement('img');
    img.src = item.thumbUrl;
    img.alt = `Recorte de ${item.name}`;
    img.width = 96;
    img.height = 60;

    const meta = document.createElement('div');
    meta.className = 'bit-meta';
    meta.innerHTML = `
      <div class="bit-row">
        <strong>${item.name}</strong>
        <span class="tg ${item.status === 'Candidato' ? 'cand' : 'st'}">${item.status}</span>
      </div>
      <div class="bit-tech">Δθ ≈ ${item.deltaArcsec}" · ${item.bandLabel} · ${item.epochLabel}</div>
      <div class="bit-coords">${item.icrsLabel}</div>
    `;

    const del = document.createElement('button');
    del.type = 'button';
    del.className = 'bit-del';
    del.title = 'Eliminar registro';
    del.setAttribute('aria-label', `Eliminar ${item.name} de la bitácora`);
    del.textContent = '×';
    del.onclick = () => {
      bitacoraEntries = bitacoraEntries.filter(e => e.id !== item.id);
      saveBitacora();
      renderBitacora();
    };

    card.append(img, meta, del);
    listEl.appendChild(card);
  });
}

function toggleBitacoraPanel(forceOpen) {
  const panel = document.getElementById('bitacora-panel');
  const btn = document.getElementById('bitacora-btn');
  if (!panel) return;
  const open = typeof forceOpen === 'boolean' ? forceOpen : !panel.classList.contains('is-open');
  panel.classList.toggle('is-open', open);
  panel.setAttribute('aria-hidden', String(!open));
  panel.inert = !open;
  if (btn) btn.setAttribute('aria-expanded', String(open));
}

export function addExternalBitacoraEntry(entry) {
  bitacoraEntries.unshift({
    id: 'diff-' + Date.now(),
    name: entry.name,
    type: entry.type,
    status: entry.status,
    epochLabel: entry.epoch,
    bandLabel: 'WCS TAN-SIP',
    deltaArcsec: '4.2',
    icrsLabel: entry.coords,
    motionNote: entry.motion,
    thumbUrl: 'assets/img/hera.webp',
    timestamp: Date.now()
  });
  saveBitacora();
  renderBitacora();
}

export function setSubView(view) {
  currentSubView = view;
  const bovedaHud = document.getElementById('boveda-hud');
  const tbar = document.getElementById('tbar');
  const hint = document.querySelector('#explorar .hint');
  const viewLab = document.getElementById('view-lab');
  const viewCol = document.getElementById('view-coleccion');
  const cosmosCanvas = document.getElementById('cosmos');

  document.querySelectorAll('#explore-view-tabs button').forEach(b => {
    const isTarget = b.dataset.view === view;
    b.classList.toggle('on', isTarget);
    b.setAttribute('aria-selected', String(isTarget));
  });

  if (view === 'boveda') {
    if (bovedaHud) bovedaHud.hidden = false;
    if (tbar) tbar.hidden = false;
    if (hint) hint.hidden = false;
    if (viewLab) viewLab.hidden = true;
    if (viewCol) viewCol.hidden = true;
    if (cosmosCanvas) cosmosCanvas.style.opacity = '1';
    syncUI();
  } else if (view === 'lab') {
    if (bovedaHud) bovedaHud.hidden = true;
    if (tbar) tbar.hidden = true;
    if (hint) hint.hidden = true;
    closeObjectInfo();
    if (viewLab) viewLab.hidden = false;
    if (viewCol) viewCol.hidden = true;
    if (cosmosCanvas) cosmosCanvas.style.opacity = '0.15';
    initScienceLab({
      onAddToBitacora: addExternalBitacoraEntry,
      onHeraNotify: msg => onHeraSpeak?.(msg, false)
    });
    if (typeof onHeraSpeak === 'function') {
      onHeraSpeak('Laboratorio FITS activo. Compara dos épocas con WCS TAN-SIP y máscaras FLAGS para detectar fuentes en movimiento.', false);
    }
  } else if (view === 'coleccion') {
    if (bovedaHud) bovedaHud.hidden = true;
    if (tbar) tbar.hidden = true;
    if (hint) hint.hidden = true;
    closeObjectInfo();
    if (viewLab) viewLab.hidden = true;
    if (viewCol) viewCol.hidden = false;
    if (cosmosCanvas) cosmosCanvas.style.opacity = '0.15';
    renderCandidateCollection();
    if (typeof onHeraSpeak === 'function') {
      onHeraSpeak('Colección científica: explora candidatos sin identificar y cuerpos confirmados por JPL con su desplazamiento observado.', false);
    }
  }
}

function renderCandidateCollection(filter = collectionFilter) {
  collectionFilter = filter;
  const grid = document.getElementById('col-objects-grid');
  if (!grid) return;
  grid.innerHTML = '';

  const filtered = OBJ.filter(o => {
    const status = o[7];
    if (filter === 'confirmados') return status === 'Confirmado';
    if (filter === 'candidatos') return status === 'Candidato';
    return true;
  });

  filtered.forEach(o => {
    const originalIdx = OBJ.indexOf(o);
    const card = document.createElement('article');
    card.className = 'col-card';
    const isCand = o[7] === 'Candidato';

    card.innerHTML = `
      <div class="col-card-head">
        <div>
          <h4>${o[0]}</h4>
          <span class="col-type-tag">${o[1]}</span>
        </div>
        <span class="tg ${isCand ? 'cand' : 'st'}">${o[7]}</span>
      </div>
      <p class="col-desc-text">${o[5]}</p>
      <div class="col-meta-row">
        <span><b>Desplazamiento:</b> ${o[8] > 0 ? (o[8] * 120).toFixed(1) + '" / época' : 'Deriva nula (ICRS fijo)'}</span>
        <span><b>Dato:</b> ${o[6]}</span>
      </div>
      <div class="col-actions-row">
        <button type="button" class="btn subtle-sm btn-focus-boveda" data-idx="${originalIdx}">🔭 Ver en Bóveda</button>
        <button type="button" class="btn subtle-sm ok btn-analyze-lab" data-idx="${originalIdx}">🔬 Analizar FITS</button>
      </div>
    `;

    grid.appendChild(card);
  });

  grid.querySelectorAll('.btn-focus-boveda').forEach(btn => {
    btn.onclick = () => {
      const idx = Number(btn.dataset.idx);
      setSubView('boveda');
      requestAnimationFrame(() => selectObject(idx));
    };
  });

  grid.querySelectorAll('.btn-analyze-lab').forEach(btn => {
    btn.onclick = () => {
      setSubView('lab');
      const demoBtn = document.getElementById('lab-load-demo');
      if (demoBtn) demoBtn.click();
    };
  });
}

function registerCurrentCandidate() {
  if (selectedIndex < 0) return;
  const o = OBJ[selectedIndex];
  const elapsed = getElapsedMonths();
  const arcsec = o[8] > 0 ? Math.round(o[8] * elapsed * 180) : 0;
  const thumbCanvas = document.getElementById('ith');
  const thumbUrl = thumbCanvas ? thumbCanvas.toDataURL('image/png') : '';
  const band = BANDAS[currentBand];

  const entry = {
    id: `${Date.now()}-${selectedIndex}`,
    name: o[0],
    type: o[1],
    status: o[7],
    bandId: band.id,
    bandLabel: band.label,
    bandRange: band.range,
    epochLabel: `${EPOCAS[currentEpoch].label} (${MESES[currentMonth].label})`,
    deltaArcsec: arcsec,
    icrsLabel: formatICRS(o, elapsed),
    capturedAt: new Date().toISOString(),
    thumbUrl
  };

  bitacoraEntries.unshift(entry);
  if (bitacoraEntries.length > 30) bitacoraEntries.length = 30;
  saveBitacora();
  renderBitacora();

  const logBtn = document.getElementById('ibit');
  if (logBtn) {
    logBtn.textContent = '✓ Guardado en bitácora';
    setTimeout(() => {
      if (logBtn) logBtn.textContent = 'Registrar en bitácora';
    }, 1800);
  }

  evaluateMission(true);
}

function exportBitacoraJSON() {
  const payload = {
    proyecto: 'SKYO — Modo Aula',
    atribucion: 'Datos ilustrativos · Ref. NASA/IPAC IRSA (SPHEREx) y JPL',
    exportadoEn: new Date().toISOString(),
    registros: bitacoraEntries.map(({ thumbUrl, ...rest }) => rest)
  };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'skyo-bitacora-aula.json';
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function selectObject(index) {
  if (index < 0 || index >= OBJ.length) return;
  selectedIndex = index;
  const o = OBJ[index];

  const infoPanel = document.getElementById('info');
  if (infoPanel) {
    infoPanel.inert = false;
    infoPanel.setAttribute('aria-hidden', 'false');
    infoPanel.classList.add('is-open');
  }

  const typeEl = document.getElementById('it');
  const statusEl = document.getElementById('ist');
  const nameEl = document.getElementById('in');
  const descEl = document.getElementById('id');
  const detailEl = document.getElementById('ix');

  if (typeEl) typeEl.textContent = o[1];
  if (statusEl) {
    statusEl.textContent = o[7];
    statusEl.className = o[7] === 'Candidato' ? 'tg cand' : 'tg st';
  }
  if (nameEl) nameEl.textContent = o[0];
  if (descEl) descEl.textContent = o[5];
  if (detailEl) detailEl.textContent = o[6];

  // Cargar offsets de coordenada guardados o actuales
  const curOff = getObjectOffsets(index);
  raOffset = curOff.ra;
  decOffset = curOff.dec;
  const raSlider = document.getElementById('ra-slider');
  const decSlider = document.getElementById('dec-slider');
  const raVal = document.getElementById('ra-val');
  const decVal = document.getElementById('dec-val');
  if (raSlider) raSlider.value = String(raOffset);
  if (decSlider) decSlider.value = String(decOffset);
  if (raVal) raVal.textContent = `${raOffset >= 0 ? '+' : ''}${raOffset.toFixed(4)}°`;
  if (decVal) decVal.textContent = `${decOffset >= 0 ? '+' : ''}${decOffset.toFixed(4)}°`;

  updateSelectedMovementText(o);
  renderThumbnail(index);

  updateExploreState({ selected: selectedIndex });

  const prevDone = completedMissions.has(MISIONES_HERA[missionIndex]?.id);
  evaluateMission(false);
  const completedNow = !prevDone && completedMissions.has(MISIONES_HERA[missionIndex]?.id);
  if (!completedNow && typeof onHeraSpeak === 'function') {
    onHeraSpeak(`${o[0]} (${o[7]}): ${o[5]}`);
  }
}

export function closeObjectInfo() {
  selectedIndex = -1;
  const infoPanel = document.getElementById('info');
  if (infoPanel) {
    infoPanel.classList.remove('is-open');
    infoPanel.setAttribute('aria-hidden', 'true');
    infoPanel.inert = true;
  }
  updateExploreState({ selected: -1 });
}

export function pauseExplorarBlink() {
  if (!blinkMode) return;
  blinkMode = false;
  const blinkBtn = document.getElementById('blink');
  if (blinkBtn) {
    blinkBtn.setAttribute('aria-pressed', 'false');
    blinkBtn.textContent = 'Parpadear épocas';
  }
  updateExploreState({ blink: false });
}

export function openClassroomMission() {
  const m = MISIONES_HERA[missionIndex];
  if (m && typeof onHeraSpeak === 'function') {
    onHeraSpeak(`Reto de aula — ${m.title}: ${m.prompt}`, true);
  }
}

function updateTemporalDescription() {
  const descEl = document.getElementById('tdesc');
  if (!descEl) return;
  const ep = EPOCAS[currentEpoch];
  const mo = MESES[currentMonth];
  const bd = BANDAS[currentBand];
  const blinkNote = blinkMode ? ' · Parpadeo Época 1 ⇄ 4 activo' : '';
  descEl.textContent = `${ep.label} (${ep.span}) · ${bd.label} (${bd.range})${blinkNote}${compareMode ? ' · Vector morado visible' : ''}`;
}

function syncUI() {
  document.querySelectorAll('#epocas button').forEach(b => {
    b.classList.toggle('on', Number(b.dataset.ep) === currentEpoch);
  });
  document.querySelectorAll('#bandas button').forEach(b => {
    b.classList.toggle('on', Number(b.dataset.ba) === currentBand);
  });

  const tbar = document.getElementById('tbar');
  if (tbar) tbar.dataset.stage = String(currentStage);

  const blinkBtn = document.getElementById('blink');
  if (blinkBtn) {
    blinkBtn.setAttribute('aria-pressed', String(blinkMode));
    if (window.__skyReducedMotion) {
      blinkBtn.textContent = `Alternar Época ${currentEpoch === 0 ? '1 → 4' : '4 → 1'}`;
    } else {
      blinkBtn.textContent = blinkMode
        ? `Parpadeando (${currentEpoch === 0 ? 'Época 1' : 'Época 4'})`
        : 'Parpadear épocas';
    }
  }

  updateTemporalDescription();
  renderMissionBar();
  if (selectedIndex >= 0) {
    updateSelectedMovementText(OBJ[selectedIndex]);
    renderThumbnail(selectedIndex);
  }

  updateExploreState({
    filter: activeFilter,
    epoch: currentEpoch,
    month: currentMonth,
    band: currentBand,
    mode: currentMode,
    compare: compareMode,
    blink: blinkMode,
    selected: selectedIndex
  });
}

function buildExplorarUI() {
  const epEl = document.getElementById('epocas');
  const baEl = document.getElementById('bandas');
  const cmpBtn = document.getElementById('cmp');
  const blinkBtn = document.getElementById('blink');
  const fltEl = document.getElementById('flt');

  if (epEl && !epEl.hasChildNodes()) {
    EPOCAS.forEach((ep, i) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.textContent = ep.label;
      b.title = ep.span;
      b.dataset.ep = String(i);
      epEl.appendChild(b);
    });
    epEl.onclick = e => {
      const b = e.target.closest('button[data-ep]');
      if (!b) return;
      blinkMode = false;
      currentEpoch = Number(b.dataset.ep);
      syncUI();
      evaluateMission(false);
    };
  }

  if (baEl && !baEl.hasChildNodes()) {
    BANDAS.forEach((bd, i) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.textContent = bd.label;
      b.dataset.ba = String(i);
      baEl.appendChild(b);
    });
    baEl.onclick = e => {
      const b = e.target.closest('button[data-ba]');
      if (!b) return;
      currentBand = Number(b.dataset.ba);
      syncUI();
      evaluateMission(false);
    };
  }

  if (blinkBtn) {
    blinkBtn.onclick = () => {
      blinkUsed = true;
      currentMonth = 0;
      currentStage = 1;
      if (window.__skyReducedMotion) {
        blinkMode = false;
        currentEpoch = currentEpoch === 0 ? 3 : 0;
      } else {
        blinkMode = !blinkMode;
        if (blinkMode && currentEpoch !== 0 && currentEpoch !== 3) {
          currentEpoch = 3;
        }
      }
      syncUI();
      evaluateMission(false);
    };
  }

  if (cmpBtn) {
    cmpBtn.onclick = () => {
      compareMode = !compareMode;
      currentStage = 2;
      cmpBtn.setAttribute('aria-pressed', String(compareMode));
      syncUI();
      evaluateMission(false);
    };
  }

  if (fltEl) {
    fltEl.onclick = e => {
      const btn = e.target.closest('button[data-t]');
      if (!btn) return;
      activeFilter = btn.dataset.t || 'Todos';
      currentStage = 0;
      fltEl.querySelectorAll('button').forEach(b => b.classList.toggle('on', b === btn));
      syncUI();
    };
  }

  // Controles de Misiones H.E.R.A 7
  const hintBtn = document.getElementById('m-hint');
  if (hintBtn) {
    hintBtn.onclick = () => {
      const m = MISIONES_HERA[missionIndex];
      if (!m || typeof onHeraSpeak !== 'function') return;
      const hint = m.hints[hintStep % m.hints.length];
      hintStep = (hintStep + 1) % m.hints.length;
      onHeraSpeak(hint, true);
    };
  }

  const nextBtn = document.getElementById('m-next');
  if (nextBtn) {
    nextBtn.onclick = () => {
      missionIndex = (missionIndex + 1) % MISIONES_HERA.length;
      hintStep = 0;
      renderMissionBar();
      const m = MISIONES_HERA[missionIndex];
      if (m && typeof onHeraSpeak === 'function') {
        onHeraSpeak(`Nueva misión (${missionIndex + 1}/${MISIONES_HERA.length}): ${m.prompt}`, true);
      }
    };
  }

  // Controles de Corrección Astrométrica de Coordenadas
  const raSlider = document.getElementById('ra-slider');
  const decSlider = document.getElementById('dec-slider');
  const raVal = document.getElementById('ra-val');
  const decVal = document.getElementById('dec-val');
  const btnResetCoord = document.getElementById('btn-reset-coord');
  const btnApplyCoord = document.getElementById('btn-apply-coord');

  if (raSlider && decSlider) {
    const handleSliderChange = () => {
      if (selectedIndex < 0) return;
      raOffset = parseFloat(raSlider.value);
      decOffset = parseFloat(decSlider.value);
      if (raVal) raVal.textContent = `${raOffset >= 0 ? '+' : ''}${raOffset.toFixed(4)}°`;
      if (decVal) decVal.textContent = `${decOffset >= 0 ? '+' : ''}${decOffset.toFixed(4)}°`;
      coordOffsets.set(selectedIndex, { ra: raOffset, dec: decOffset });
      updateSelectedMovementText(OBJ[selectedIndex]);
      renderThumbnail(selectedIndex);
    };
    raSlider.oninput = handleSliderChange;
    decSlider.oninput = handleSliderChange;
  }

  if (btnResetCoord) {
    btnResetCoord.onclick = () => {
      if (selectedIndex < 0) return;
      coordOffsets.delete(selectedIndex);
      raOffset = 0;
      decOffset = 0;
      if (raSlider) raSlider.value = '0';
      if (decSlider) decSlider.value = '0';
      if (raVal) raVal.textContent = '+0.0000°';
      if (decVal) decVal.textContent = '+0.0000°';
      updateSelectedMovementText(OBJ[selectedIndex]);
      renderThumbnail(selectedIndex);
    };
  }

  if (btnApplyCoord) {
    btnApplyCoord.onclick = () => {
      if (selectedIndex < 0) return;
      coordOffsets.set(selectedIndex, { ra: raOffset, dec: decOffset });
      btnApplyCoord.textContent = '✓ Coordenada fijada';
      setTimeout(() => {
        if (btnApplyCoord) btnApplyCoord.textContent = 'Fijar coordenada';
      }, 1500);
      if (typeof onHeraSpeak === 'function') {
        const o = OBJ[selectedIndex];
        onHeraSpeak(`Coordenada astrométrica de ${o[0]} corregida: ${formatICRS(o, getElapsedMonths())}. Lista para comparar épocas.`, true);
      }
    };
  }

  // Controles de Ficha + Bitácora
  const logBtn = document.getElementById('ibit');
  if (logBtn) logBtn.onclick = () => registerCurrentCandidate();

  const bitBtn = document.getElementById('bitacora-btn');
  if (bitBtn) bitBtn.onclick = () => toggleBitacoraPanel();

  const bitClose = document.getElementById('bit-close');
  if (bitClose) bitClose.onclick = () => toggleBitacoraPanel(false);

  const bitExport = document.getElementById('bit-export');
  if (bitExport) bitExport.onclick = () => exportBitacoraJSON();

  const bitClear = document.getElementById('bit-clear');
  if (bitClear) {
    bitClear.onclick = () => {
      bitacoraEntries = [];
      saveBitacora();
      renderBitacora();
    };
  }

  const closeBtn = document.getElementById('ic');
  if (closeBtn) closeBtn.onclick = () => closeObjectInfo();

  const heraBtn = document.getElementById('ih');
  if (heraBtn) {
    heraBtn.onclick = () => {
      if (selectedIndex >= 0 && typeof onHeraSpeak === 'function') {
        const o = OBJ[selectedIndex];
        const ep = EPOCAS[currentEpoch];
        onHeraSpeak(`En ${ep.label}, ${o[0]} (${o[7]}): ${o[5]} ${o[6]}.`, true);
      }
    };
  }

  const hoverPill = document.getElementById('hover-pill');
  updateExploreState({
    onSelect: idx => selectObject(idx),
    onHover: idx => {
      if (!hoverPill) return;
      if (idx >= 0) {
        hoverPill.textContent = `${OBJ[idx][0]} · ${OBJ[idx][1]}`;
        hoverPill.classList.add('on');
      } else {
        hoverPill.classList.remove('on');
      }
    },
    onBlinkTick: () => {
      if (!blinkMode) return;
      currentEpoch = currentEpoch === 0 ? 3 : 0;
      syncUI();
    }
  });

  renderBitacora();
  syncUI();

  // Subvistas: Bóveda, Lab FITS, Colección
  const viewTabs = document.getElementById('explore-view-tabs');
  if (viewTabs) {
    viewTabs.onclick = e => {
      const btn = e.target.closest('button[data-view]');
      if (!btn) return;
      setSubView(btn.dataset.view);
    };
  }

  // Filtros de la colección
  const colFilters = document.getElementById('col-filter-bar');
  if (colFilters) {
    colFilters.onclick = e => {
      const btn = e.target.closest('button[data-col-filter]');
      if (!btn) return;
      colFilters.querySelectorAll('button').forEach(b => b.classList.remove('on'));
      btn.classList.add('on');
      renderCandidateCollection(btn.dataset.colFilter);
    };
  }

  // Escuchar enlaces globales con data-sub (ej. desde Inicio)
  document.querySelectorAll('[data-sub]').forEach(el => {
    el.addEventListener('click', () => {
      const sub = el.dataset.sub;
      if (sub) {
        requestAnimationFrame(() => setSubView(sub));
      }
    });
  });
}

export function startExplorar(heraHandler, initialSub) {
  if (heraHandler) onHeraSpeak = heraHandler;
  if (!initialized) {
    buildExplorarUI();
    initialized = true;
  } else {
    syncUI();
  }
  if (initialSub) {
    setSubView(initialSub);
  } else if (currentSubView && currentSubView !== 'boveda') {
    setSubView(currentSubView);
  }
}
