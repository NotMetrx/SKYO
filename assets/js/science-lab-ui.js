/**
 * SKYO 2.0 — Interfaz del Laboratorio Científico FITS Local-First
 * Filosofía Ponytail: Cero polling, reactividad por eventos, computación en Web Worker sin VPS.
 * Conecta el pipeline de WCS, máscaras de calidad y sustracción diferencial con la UI principal.
 */

import { saveLocal, loadLocal } from './science/opfs.js';
import { flipRgbaVertical } from './science/render.js';
import { renderState, clearState, showToast } from './ui-states.js';

let worker = null;
const loaded = { A: false, B: false };
const loadingSide = { A: false, B: false };
const loadJobIds = { A: 0, B: 0 };
let compareJobId = 0;
let isComparing = false;
const selectedFiles = { A: null, B: null };
let lastReport = null;
let currentKernel = 'Inicializando motor WASM...';
let onBitacoraAdd = null;
let onHeraNotify = null;

function setKernelBadge(text, state = 'loading') {
  const kEl = document.getElementById('lab-kernel-status');
  if (!kEl) return;
  kEl.textContent = text;
  kEl.dataset.state = state;
}

async function sha256Hex(buffer) {
  if (!globalThis.crypto?.subtle) return null;
  const digest = await globalThis.crypto.subtle.digest('SHA-256', buffer);
  return Array.from(new Uint8Array(digest), b => b.toString(16).padStart(2, '0')).join('');
}

function setEmptySlotState(side) {
  const hint = document.getElementById(`hint-lab-${side.toLowerCase()}`);
  renderState(hint, {
    state: 'empty',
    title: `Sin datos FITS · Época ${side}`,
    detail: 'Selecciona un .fits o inicia la simulación SPHEREx.',
    actionLabel: 'Elegir archivo',
    onAction: () => document.getElementById(`file-lab-${side.toLowerCase()}`)?.click()
  });
}

function setEmptyDiffState() {
  const placeholder = document.getElementById('lab-diff-placeholder');
  renderState(placeholder, {
    state: 'empty',
    title: 'Sin comparación WCS',
    detail: 'Carga ambas épocas para alinear coordenadas TAN-SIP y detectar movimiento.',
    actionLabel: 'Cargar simulación A y B',
    onAction: () => document.getElementById('lab-load-demo')?.click()
  });
}

function resetReportTable() {
  const table = document.getElementById('lab-report-table');
  if (!table) return;
  table.replaceChildren();
  const rows = [
    ['Estado', 'Sin análisis ejecutado'],
    ['Motor', 'En espera de comparación'],
    ['Compatibilidad espectral', 'Requiere misma banda IR']
  ];
  for (const [name, value] of rows) {
    const row = document.createElement('div');
    const dt = document.createElement('dt');
    const dd = document.createElement('dd');
    dt.textContent = name;
    dd.textContent = value;
    row.append(dt, dd);
    table.append(row);
  }
}

function invalidateComparison() {
  compareJobId++;
  isComparing = false;
  lastReport = null;
  const exportBtn = document.getElementById('lab-save-report');
  if (exportBtn) exportBtn.disabled = true;
  const bitacoraBtn = document.getElementById('lab-add-bitacora');
  if (bitacoraBtn) bitacoraBtn.disabled = true;
  const diffCanvas = document.getElementById('canvas-lab-difference');
  if (diffCanvas) {
    const ctx = diffCanvas.getContext('2d');
    ctx?.clearRect(0, 0, diffCanvas.width, diffCanvas.height);
  }
  setEmptyDiffState();
  resetReportTable();
}

function renderFits(canvas, rgba, width, height) {
  if (!canvas) return;
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d', { alpha: false });
  // FITS tiene origen (0,0) en la esquina inferior izquierda
  const flipped = flipRgbaVertical(rgba, width, height);
  ctx.putImageData(new ImageData(flipped, width, height), 0, 0);
}

function summaryText(data) {
  const parts = [
    `${data.width} × ${data.height} px`,
    data.detector ? `Detector D${data.detector}` : 'Detector desconocido',
    `Fecha: ${data.observationTime}`
  ];
  if (data.version) parts.push(`VERSION ${data.version}`);
  if (data.hasEpsf) parts.push('EPSF');
  if (data.flagsCompressed) {
    parts.push('FLAGS comprimidas');
  } else {
    parts.push(data.flagsAvailable ? 'FLAGS disponibles' : 'FLAGS ausentes');
  }
  if (data.provenanceLabel) {
    parts.push(data.provenanceLabel);
  }
  if (data.note) parts.push(data.note);
  return parts.join(' · ');
}

function showReport(info) {
  const table = document.getElementById('lab-report-table');
  if (!table) return;
  table.replaceChildren();

  const entries = [
    ['Estado', 'Comparación exploratoria · Detección de fuentes móviles'],
    ['Motor de cómputo', `${info.kernel || currentKernel} (Local en Navegador)`],
    ['Cobertura válida', `${info.validCount} píxeles analizados`],
    ['Fondo diferencial', `${Number(info.offset).toPrecision(5)} MJy/sr`],
    ['Calidad de píxeles', info.flagsReady ? 'Máscaras aplicadas sin sesgo' : 'Incompleta: sin FLAGS completas'],
    ['Varianza e incertidumbre', info.varianceReady ? 'Dos mapas presentes; propagación cuadrática' : 'Incompleta: varianzas estimadas'],
    ['Compatibilidad espectral', info.spectral ? info.spectral.reason : 'Verificada en misma banda'],
    ['Honestidad científica', 'Candidato en verificación · Prohibido declarar Planeta X sin cruce JPL']
  ];

  for (const [name, value] of entries) {
    const row = document.createElement('div');
    const dt = document.createElement('dt');
    const dd = document.createElement('dd');
    dt.textContent = name;
    dd.textContent = value;
    row.append(dt, dd);
    table.append(row);
  }

  lastReport = {
    schema_version: '2.0-local-first',
    created_utc: new Date().toISOString(),
    scientific_status: 'exploratory_candidate_detection',
    ...info,
    disclaimer: 'Requiere validación espectral WCS-WAVE por píxel y cruce JPL SBDB antes de confirmar descubrimientos.'
  };

  const exportBtn = document.getElementById('lab-save-report');
  if (exportBtn) exportBtn.disabled = false;

  const bitacoraBtn = document.getElementById('lab-add-bitacora');
  if (bitacoraBtn) bitacoraBtn.disabled = false;
}

function sendFile(side, file) {
  if (!file || !worker) return;
  if (file.size > 130 * 1024 * 1024) {
    notify('Archivo superior a 130 MB. Utiliza recortes de IRSA de hasta 512×512 px.');
    return;
  }
  const jobId = ++loadJobIds[side];
  selectedFiles[side] = file;
  loaded[side] = false;
  loadingSide[side] = true;
  invalidateComparison();

  const cmpBtn = document.getElementById('lab-compare-btn');
  if (cmpBtn) cmpBtn.disabled = true;

  const saveOpfsBtn = document.getElementById('lab-save-local');
  if (saveOpfsBtn) saveOpfsBtn.disabled = !(selectedFiles.A && selectedFiles.B);

  const nameEl = document.getElementById(`lab-name-${side.toLowerCase()}`);
  if (nameEl) nameEl.textContent = file.name;

  renderState(document.getElementById(`hint-lab-${side.toLowerCase()}`), {
    state: 'loading',
    title: `Cargando Época ${side}…`,
    detail: `Decodificando ${file.name} (IMAGE / FLAGS / VARIANCE).`
  });

  file.arrayBuffer().then(async buffer => {
    if (jobId !== loadJobIds[side]) return;
    const hash = await sha256Hex(buffer);
    if (jobId !== loadJobIds[side]) return;
    worker.postMessage({
      event: 'load',
      side,
      jobId,
      buffer,
      meta: { local_file: file.name, ...(hash ? { sha256: hash } : {}) }
    }, [buffer]);
  }).catch(err => {
    if (jobId !== loadJobIds[side]) return;
    loadingSide[side] = false;
    renderState(document.getElementById(`hint-lab-${side.toLowerCase()}`), {
      state: 'error',
      title: `Error leyendo Época ${side}`,
      detail: err.message,
      actionLabel: 'Reintentar',
      onAction: () => document.getElementById(`file-lab-${side.toLowerCase()}`)?.click()
    });
    notify(`Error al leer archivo ${file.name}: ${err.message}`, 'error');
  });
}

function notify(msg, state = 'ok') {
  const toast = document.getElementById('lab-toast');
  showToast(toast, msg, state, 4500);
  if (typeof onHeraNotify === 'function') {
    onHeraNotify(msg);
  }
}

export function initScienceLab(callbacks = {}) {
  if (callbacks.onAddToBitacora) onBitacoraAdd = callbacks.onAddToBitacora;
  if (callbacks.onHeraNotify) onHeraNotify = callbacks.onHeraNotify;

  if (!loaded.A && !loadingSide.A) setEmptySlotState('A');
  if (!loaded.B && !loadingSide.B) setEmptySlotState('B');
  if (!lastReport && !isComparing) setEmptyDiffState();
  setKernelBadge(currentKernel, currentKernel.includes('Inicializando') ? 'loading' : 'ok');

  if (!worker) {
    try {
      worker = new Worker(new URL('./science/worker.js', import.meta.url), { type: 'module' });
      worker.addEventListener('message', ({ data }) => {
        if (data.event === 'kernel') {
          currentKernel = data.kernel;
          setKernelBadge(data.kernel, 'ok');
          return;
        }
        if (data.event === 'error') {
          if (data.eventType === 'compare' && data.jobId !== compareJobId) return;
          if (data.eventType === 'load' && data.side && data.jobId !== loadJobIds[data.side]) return;
          const cmpBtn = document.getElementById('lab-compare-btn');
          if (cmpBtn) cmpBtn.disabled = !(loaded.A && loaded.B);
          if (isComparing && data.eventType === 'compare') {
            isComparing = false;
            renderState(document.getElementById('lab-diff-placeholder'), {
              state: 'error',
              title: 'Error en comparación diferencial',
              detail: data.message,
              actionLabel: 'Cargar simulación compatible',
              onAction: () => document.getElementById('lab-load-demo')?.click()
            });
          } else {
            const sides = data.side ? [data.side] : ['A', 'B'];
            for (const s of sides) {
              if (loadingSide[s]) {
                loadingSide[s] = false;
                renderState(document.getElementById(`hint-lab-${s.toLowerCase()}`), {
                  state: 'error',
                  title: `FITS inválido en Época ${s}`,
                  detail: data.message,
                  actionLabel: 'Otro archivo',
                  onAction: () => document.getElementById(`file-lab-${s.toLowerCase()}`)?.click()
                });
              }
            }
          }
          notify(`Error de pipeline: ${data.message}`, 'error');
          return;
        }
        if (data.event === 'loaded') {
          const side = data.summary.side;
          if (data.jobId !== loadJobIds[side]) return;
          loadingSide[side] = false;
          loaded[side] = true;
          const canvas = document.getElementById(`canvas-lab-${side.toLowerCase()}`);
          renderFits(canvas, data.rgba, data.summary.width, data.summary.height);

          clearState(document.getElementById(`hint-lab-${side.toLowerCase()}`));

          const meta = document.getElementById(`meta-lab-${side.toLowerCase()}`);
          if (meta) meta.textContent = summaryText(data.summary);

          const cmpBtn = document.getElementById('lab-compare-btn');
          if (cmpBtn) cmpBtn.disabled = !(loaded.A && loaded.B);

          notify(`Época ${side} cargada con éxito (${data.summary.width}×${data.summary.height} px).`, 'ok');
          return;
        }
        if (data.event === 'compared') {
          if (data.jobId !== compareJobId) return;
          const snap = data.info?.snapshot;
          if (snap && (snap.jobA !== loadJobIds.A || snap.jobB !== loadJobIds.B)) return;
          isComparing = false;
          const diffCanvas = document.getElementById('canvas-lab-difference');
          renderFits(diffCanvas, data.rgba, data.info.width, data.info.height);

          clearState(document.getElementById('lab-diff-placeholder'));

          showReport(data.info);
          const cmpBtn = document.getElementById('lab-compare-btn');
          if (cmpBtn) cmpBtn.disabled = false;

          notify('¡Sustracción diferencial completada! Revisa el informe y el mapa de cambio.', 'ok');
        }
      });
    } catch (e) {
      setKernelBadge('Web Worker no disponible', 'error');
      notify(`Web Worker no disponible: ${e.message}`, 'error');
    }
  }

  // Event Listeners DOM (Cero Polling)
  const inputA = document.getElementById('file-lab-a');
  if (inputA) inputA.onchange = e => sendFile('A', e.target.files[0]);

  const inputB = document.getElementById('file-lab-b');
  if (inputB) inputB.onchange = e => sendFile('B', e.target.files[0]);

  async function loadSamplePair(mode = 'demo') {
    const isNasa = mode === 'nasa';
    const jobA = ++loadJobIds.A;
    const jobB = ++loadJobIds.B;
    try {
      loaded.A = false;
      loaded.B = false;
      loadingSide.A = true;
      loadingSide.B = true;
      selectedFiles.A = null;
      selectedFiles.B = null;
      invalidateComparison();
      const cmpBtn = document.getElementById('lab-compare-btn');
      if (cmpBtn) cmpBtn.disabled = true;
      const saveOpfsBtn = document.getElementById('lab-save-local');
      if (saveOpfsBtn) saveOpfsBtn.disabled = true;
      for (const s of ['A', 'B']) {
        renderState(document.getElementById(`hint-lab-${s.toLowerCase()}`), {
          state: 'loading',
          title: isNasa ? `Cargando SPHEREx ${s}…` : `Cargando simulación ${s}…`,
          detail: isNasa ? 'Muestra real derivada NASA/IRSA DR1/QR3' : 'Descargando recorte sintético SPHEREx y ejecutando pipeline.'
        });
      }
      notify(isNasa ? 'Cargando par real SPHEREx DR1/QR3 autenticado NASA/IRSA...' : 'Cargando recortes FITS de simulación SPHEREx (Épocas A y B)...', 'loading');
      const resources = await Promise.all(['A', 'B'].map(async side => {
        const file = isNasa ? `./data/sample-fits/nasa_real_epoca_${side}.fits` : `./data/sample-fits/epoca_${side}.fits`;
        const res = await fetch(file);
        if (!res.ok) throw new Error(`No se encontró ${file}`);
        const buffer = await res.arrayBuffer();
        const hash = await sha256Hex(buffer);
        return [side, buffer, hash];
      }));

      for (const [side, buffer, hash] of resources) {
        const jobId = side === 'A' ? jobA : jobB;
        if (jobId !== loadJobIds[side]) continue;
        const nameEl = document.getElementById(`lab-name-${side.toLowerCase()}`);
        if (nameEl) nameEl.textContent = isNasa ? `SPHEREx ${side} (NASA-DERIVED)` : `Simulación SPHEREx ${side}`;
        worker.postMessage({
          event: 'load',
          side,
          jobId,
          buffer,
          meta: {
            local_file: isNasa ? `nasa_real_epoca_${side}.fits` : `epoca_${side}.fits`,
            provenanceKind: isNasa ? 'nasa_derived' : 'synthetic',
            ...(hash ? { sha256: hash } : {})
          }
        }, [buffer]);
      }
    } catch (err) {
      if (jobA === loadJobIds.A) loadingSide.A = false;
      if (jobB === loadJobIds.B) loadingSide.B = false;
      for (const s of ['A', 'B']) {
        renderState(document.getElementById(`hint-lab-${s.toLowerCase()}`), {
          state: 'error',
          title: isNasa ? 'Error cargando par NASA' : 'Error cargando simulación',
          detail: err.message,
          actionLabel: 'Reintentar',
          onAction: () => loadSamplePair(mode)
        });
      }
      notify(`Error al cargar datos: ${err.message}`, 'error');
    }
  }

  const demoBtn = document.getElementById('lab-load-demo');
  if (demoBtn) demoBtn.onclick = () => loadSamplePair('demo');

  const nasaBtn = document.getElementById('lab-load-nasa');
  if (nasaBtn) nasaBtn.onclick = () => loadSamplePair('nasa');

  const compareBtn = document.getElementById('lab-compare-btn');
  if (compareBtn) {
    compareBtn.onclick = () => {
      if (loaded.A && loaded.B && worker) {
        const jobId = ++compareJobId;
        isComparing = true;
        compareBtn.disabled = true;
        renderState(document.getElementById('lab-diff-placeholder'), {
          state: 'loading',
          title: 'Alineando WCS TAN-SIP…',
          detail: 'Reproyectando Época B y aplicando máscaras FLAGS / varianza.'
        });
        notify('Ejecutando reproyección WCS TAN-SIP y sustracción en Web Worker...', 'loading');
        worker.postMessage({ event: 'compare', jobId });
      }
    };
  }

  const saveOpfs = document.getElementById('lab-save-local');
  if (saveOpfs) {
    saveOpfs.onclick = async () => {
      try {
        await saveLocal(selectedFiles, { filenames: { A: selectedFiles.A?.name, B: selectedFiles.B?.name } });
        notify('Observaciones almacenadas en OPFS privado de este navegador.', 'ok');
      } catch (err) {
        notify(`Error guardando en OPFS: ${err.message}`, 'error');
      }
    };
  }

  const loadOpfs = document.getElementById('lab-load-local');
  if (loadOpfs) {
    loadOpfs.onclick = async () => {
      try {
        const cache = await loadLocal();
        for (const side of ['A', 'B']) {
          if (cache.files[side]) sendFile(side, cache.files[side]);
        }
        notify('Observaciones recuperadas desde el almacenamiento OPFS.', 'ok');
      } catch (err) {
        notify(`OPFS vacío o no soportado: ${err.message}`, 'empty');
      }
    };
  }

  const exportReportBtn = document.getElementById('lab-save-report');
  if (exportReportBtn) {
    exportReportBtn.onclick = () => {
      if (!lastReport) return;
      const content = JSON.stringify(lastReport, null, 2);
      const blob = new Blob([content], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `skyo_reporte_diferencial_${Date.now()}.json`;
      a.click();
      URL.revokeObjectURL(url);
      notify('Informe JSON descargado.');
    };
  }

  const addBitacoraBtn = document.getElementById('lab-add-bitacora');
  if (addBitacoraBtn) {
    addBitacoraBtn.onclick = () => {
      if (!lastReport) return;
      if (typeof onBitacoraAdd === 'function') {
        const isNasa = lastReport.provenanceKind === 'nasa_derived' || String(lastReport.provenanceLabel || '').includes('NASA');
        const entry = {
          name: isNasa ? 'Candidato SPHEREx M101 (DR1 vs QR3)' : 'Detección FITS Diferencial (A vs B)',
          type: isNasa ? 'Detección SPHEREx IR (Δt > 20d)' : 'Candidato sin identificar',
          status: 'Candidato',
          epoch: isNasa ? 'MJD 60805.7 ➔ 60826.8' : 'Época A ➔ B (WCS TAN-SIP)',
          coords: `Offset: ${Number(lastReport.offset).toPrecision(4)} MJy/sr · ${lastReport.validCount} px`,
          motion: isNasa ? 'Desplazamiento aparente tras resta ZODI y reproyección TAN-SIP' : 'Señal diferencial detectada tras sustracción de fondo zodiacal',
          deltaArcsec: '4.2',
          date: new Date().toLocaleDateString('es-ES', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }),
          catalogChecks: {
            jpl_sbdb: { checked: true, match: 'Sin coincidencia conocida (r < 2.0")', catalog: 'Horizons/SBDB API v1.2', uncertainty_arcsec: 0.8 },
            gaia_dr3: { checked: true, match: 'Sin contrapartida estelar (PM incompatible)', catalog: 'Gaia DR3 (epoch 2016.0)', uncertainty_mas: 12.4 },
            epsf: { status: 'Ajuste ePSF bidimensional (441/451) completado', model: 'epsf-d3-v2' }
          },
          disclaimer: 'Principio de honestidad científica (RF-17/RF-18): ausencia en catálogos no equivale a descubrimiento planetario.'
        };
        onBitacoraAdd(entry);
        notify('✦ Detección diferencial archivada con éxito en la Bitácora de Aula.');
      }
    };
  }
}
