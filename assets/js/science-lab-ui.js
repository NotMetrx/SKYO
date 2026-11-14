/**
 * SKYO 2.0 — Interfaz del Laboratorio Científico FITS Local-First
 * Filosofía Ponytail: Cero polling, reactividad por eventos, computación en Web Worker sin VPS.
 * Conecta el pipeline de WCS, máscaras de calidad y sustracción diferencial con la UI principal.
 */

import { saveLocal, loadLocal } from './science/opfs.js';

let worker = null;
const loaded = { A: false, B: false };
const selectedFiles = { A: null, B: null };
let lastReport = null;
let currentKernel = 'Inicializando motor WASM...';
let onBitacoraAdd = null;
let onHeraNotify = null;

function renderFits(canvas, rgba, width, height) {
  if (!canvas) return;
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d', { alpha: false });
  const img = new ImageData(rgba, width, height);
  const temp = document.createElement('canvas');
  temp.width = width;
  temp.height = height;
  temp.getContext('2d').putImageData(img, 0, 0);

  // FITS tiene origen (0,0) en la esquina inferior izquierda
  ctx.save();
  ctx.translate(0, height);
  ctx.scale(1, -1);
  ctx.drawImage(temp, 0, 0);
  ctx.restore();
}

function summaryText(data) {
  const parts = [
    `${data.width} × ${data.height} px`,
    data.detector ? `Detector D${data.detector}` : 'Detector desconocido',
    `Fecha: ${data.observationTime}`
  ];
  if (data.flagsCompressed) {
    parts.push('FLAGS comprimidas');
  } else {
    parts.push(data.flagsAvailable ? 'FLAGS disponibles' : 'FLAGS ausentes');
  }
  if (data.note) parts.push(data.note);
  if (String(data.origin).toUpperCase().includes('SKYO')) {
    parts.push('DATOS SINTÉTICOS SPHEREx');
  }
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
  selectedFiles[side] = file;
  loaded[side] = false;
  lastReport = null;

  const cmpBtn = document.getElementById('lab-compare-btn');
  if (cmpBtn) cmpBtn.disabled = true;

  const saveOpfsBtn = document.getElementById('lab-save-local');
  if (saveOpfsBtn) saveOpfsBtn.disabled = !(selectedFiles.A && selectedFiles.B);

  const nameEl = document.getElementById(`lab-name-${side.toLowerCase()}`);
  if (nameEl) nameEl.textContent = file.name;

  file.arrayBuffer().then(buffer => {
    worker.postMessage({ event: 'load', side, buffer, meta: { local_file: file.name } }, [buffer]);
  }).catch(err => {
    notify(`Error al leer archivo ${file.name}: ${err.message}`);
  });
}

function notify(msg) {
  const toast = document.getElementById('lab-toast');
  if (toast) {
    toast.textContent = msg;
    toast.hidden = false;
    clearTimeout(toast._timer);
    toast._timer = setTimeout(() => { toast.hidden = true; }, 4500);
  }
  if (typeof onHeraNotify === 'function') {
    onHeraNotify(msg);
  }
}

export function initScienceLab(callbacks = {}) {
  if (callbacks.onAddToBitacora) onBitacoraAdd = callbacks.onAddToBitacora;
  if (callbacks.onHeraNotify) onHeraNotify = callbacks.onHeraNotify;

  if (!worker) {
    try {
      worker = new Worker(new URL('./science/worker.js', import.meta.url), { type: 'module' });
      worker.addEventListener('message', ({ data }) => {
        if (data.event === 'kernel') {
          currentKernel = data.kernel;
          const kEl = document.getElementById('lab-kernel-status');
          if (kEl) kEl.textContent = data.kernel;
          return;
        }
        if (data.event === 'error') {
          const cmpBtn = document.getElementById('lab-compare-btn');
          if (cmpBtn) cmpBtn.disabled = !(loaded.A && loaded.B);
          notify(`Error de pipeline: ${data.message}`);
          return;
        }
        if (data.event === 'loaded') {
          const side = data.summary.side;
          loaded[side] = true;
          const canvas = document.getElementById(`canvas-lab-${side.toLowerCase()}`);
          renderFits(canvas, data.rgba, data.summary.width, data.summary.height);

          const hint = document.getElementById(`hint-lab-${side.toLowerCase()}`);
          if (hint) hint.hidden = true;

          const meta = document.getElementById(`meta-lab-${side.toLowerCase()}`);
          if (meta) meta.textContent = summaryText(data.summary);

          const cmpBtn = document.getElementById('lab-compare-btn');
          if (cmpBtn) cmpBtn.disabled = !(loaded.A && loaded.B);

          notify(`Época ${side} cargada con éxito (${data.summary.width}×${data.summary.height} px).`);
          return;
        }
        if (data.event === 'compared') {
          const diffCanvas = document.getElementById('canvas-lab-difference');
          renderFits(diffCanvas, data.rgba, data.info.width, data.info.height);

          const placeholder = document.getElementById('lab-diff-placeholder');
          if (placeholder) placeholder.hidden = true;

          showReport(data.info);
          const cmpBtn = document.getElementById('lab-compare-btn');
          if (cmpBtn) cmpBtn.disabled = false;

          notify('¡Sustracción diferencial completada! Revisa el informe y el mapa de cambio.');
        }
      });
    } catch (e) {
      notify(`Web Worker no disponible: ${e.message}`);
    }
  }

  // Event Listeners DOM (Cero Polling)
  const inputA = document.getElementById('file-lab-a');
  if (inputA) inputA.onchange = e => sendFile('A', e.target.files[0]);

  const inputB = document.getElementById('file-lab-b');
  if (inputB) inputB.onchange = e => sendFile('B', e.target.files[0]);

  const demoBtn = document.getElementById('lab-load-demo');
  if (demoBtn) {
    demoBtn.onclick = async () => {
      try {
        notify('Cargando recortes FITS de simulación SPHEREx (Épocas A y B)...');
        const resources = await Promise.all(['A', 'B'].map(async side => {
          const file = `./data/sample-fits/epoca_${side}.fits`;
          const res = await fetch(file);
          if (!res.ok) throw new Error(`No se encontró ${file}`);
          return [side, await res.arrayBuffer()];
        }));

        loaded.A = false;
        loaded.B = false;
        const cmpBtn = document.getElementById('lab-compare-btn');
        if (cmpBtn) cmpBtn.disabled = true;

        for (const [side, buffer] of resources) {
          const nameEl = document.getElementById(`lab-name-${side.toLowerCase()}`);
          if (nameEl) nameEl.textContent = `Simulación SPHEREx ${side}`;
          worker.postMessage({ event: 'load', side, buffer, meta: { local_file: `epoca_${side}.fits` } }, [buffer]);
        }
      } catch (err) {
        notify(`Error al cargar simulación: ${err.message}`);
      }
    };
  }

  const compareBtn = document.getElementById('lab-compare-btn');
  if (compareBtn) {
    compareBtn.onclick = () => {
      if (loaded.A && loaded.B && worker) {
        compareBtn.disabled = true;
        notify('Ejecutando reproyección WCS TAN-SIP y sustracción en Web Worker...');
        worker.postMessage({ event: 'compare' });
      }
    };
  }

  const saveOpfs = document.getElementById('lab-save-local');
  if (saveOpfs) {
    saveOpfs.onclick = async () => {
      try {
        await saveLocal(selectedFiles, { filenames: { A: selectedFiles.A?.name, B: selectedFiles.B?.name } });
        notify('Observaciones almacenadas en OPFS privado de este navegador.');
      } catch (err) {
        notify(`Error guardando en OPFS: ${err.message}`);
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
        notify('Observaciones recuperadas desde el almacenamiento OPFS.');
      } catch (err) {
        notify(`OPFS vacío o no soportado: ${err.message}`);
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
        const entry = {
          name: 'Detección FITS Diferencial (A vs B)',
          type: 'Candidato sin identificar',
          status: 'Candidato',
          epoch: 'Época A ➔ B (WCS TAN-SIP)',
          coords: `Offset: ${Number(lastReport.offset).toPrecision(4)} MJy/sr · ${lastReport.validCount} px`,
          motion: 'Señal diferencial detectada tras sustracción de fondo zodiacal',
          date: new Date().toLocaleDateString('es-ES', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })
        };
        onBitacoraAdd(entry);
        notify('✦ Detección diferencial archivada con éxito en la Bitácora de Aula.');
      }
    };
  }
}
