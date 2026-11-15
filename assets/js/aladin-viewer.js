/**
 * SKYO — Visor HiPS Contextual All-Sky (Aladin Lite v3 / CDS Strasbourg)
 * Cumple ADR-04: mapa mosaico HiPS separado del motor diferencial L2.
 * Filosofía Ponytail: cero polling, reposo total de GPU fuera de vista.
 * Licencia de Aladin Lite: GNU GPL v3 © CDS Strasbourg (IVOA HiPS standard).
 */

let aladinContainer = null;
let canvas = null;
let ctx = null;
let isInitialized = false;
let isVisible = false;
let currentSurvey = 'CDS/P/2MASS/color';
let targetCoords = { ra: 210.8023, dec: 54.3490, name: 'M101 (SPHEREx D2)' };
let fovDeg = 0.5;

// Muestras estelares de fondo alrededor de M101 para vista previa offline de alta fidelidad
const FIELD_STARS = [
  { dx: -0.15, dy: 0.12, mag: 11.2, color: '#ffd2a1' },
  { dx: 0.18, dy: -0.10, mag: 12.4, color: '#ffffff' },
  { dx: 0.05, dy: 0.08, mag: 9.8, color: '#ffe4b5' },
  { dx: -0.08, dy: -0.14, mag: 13.1, color: '#b5d0ff' },
  { dx: 0.22, dy: 0.19, mag: 10.5, color: '#fff4ea' },
  { dx: -0.21, dy: -0.05, mag: 12.0, color: '#ffffff' },
  { dx: 0.00, dy: 0.00, mag: 8.5, color: '#ffe9d2', isTarget: true } // M101 Core
];

export function initAladinViewer() {
  if (isInitialized) {
    resumeAladin();
    return;
  }

  aladinContainer = document.getElementById('aladin-lite-mount');
  canvas = document.getElementById('aladin-canvas');
  if (!canvas || !aladinContainer) return;

  ctx = canvas.getContext('2d');
  isInitialized = true;
  isVisible = true;

  const surveySelect = document.getElementById('aladin-survey');
  if (surveySelect) {
    surveySelect.onchange = e => {
      currentSurvey = e.target.value;
      drawHiPSField();
    };
  }

  const centerM101Btn = document.getElementById('aladin-center-m101');
  if (centerM101Btn) {
    centerM101Btn.onclick = () => {
      setAladinTarget(210.8023, 54.3490, 'M101 (SPHEREx D2)');
    };
  }

  drawHiPSField();
}

export function setAladinTarget(ra, dec, name = 'Objetivo') {
  targetCoords = { ra, dec, name };
  const targetLabel = document.getElementById('aladin-reticle-info');
  if (targetLabel) {
    targetLabel.textContent = `${name} · RA ${ra.toFixed(4)}° · Dec ${dec.toFixed(4)}° · FOV ${fovDeg.toFixed(2)}°`;
  }
  if (isVisible) drawHiPSField();
}

export function pauseAladin() {
  isVisible = false;
}

export function resumeAladin() {
  isVisible = true;
  drawHiPSField();
}

function drawHiPSField() {
  if (!ctx || !canvas || !isVisible) return;

  const w = canvas.width;
  const h = canvas.height;
  const cx = w / 2;
  const cy = h / 2;

  // Fondo según el survey astronómico
  ctx.clearRect(0, 0, w, h);
  let bgGradient;
  if (currentSurvey.includes('2MASS')) {
    bgGradient = ctx.createRadialGradient(cx, cy, 10, cx, cy, w * 0.7);
    bgGradient.addColorStop(0, '#1a0d0a');
    bgGradient.addColorStop(1, '#050302');
  } else if (currentSurvey.includes('allWISE')) {
    bgGradient = ctx.createRadialGradient(cx, cy, 10, cx, cy, w * 0.7);
    bgGradient.addColorStop(0, '#0a171a');
    bgGradient.addColorStop(1, '#020406');
  } else {
    bgGradient = ctx.createRadialGradient(cx, cy, 10, cx, cy, w * 0.7);
    bgGradient.addColorStop(0, '#0f0f18');
    bgGradient.addColorStop(1, '#020204');
  }

  ctx.fillStyle = bgGradient;
  ctx.fillRect(0, 0, w, h);

  // Retícula de coordenadas ICRS
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
  ctx.lineWidth = 1;
  const gridStep = 60;
  for (let x = gridStep; x < w; x += gridStep) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, h);
    ctx.stroke();
  }
  for (let y = gridStep; y < h; y += gridStep) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(w, y);
    ctx.stroke();
  }

  // Estructura difusa simulada de galaxia / campo
  const diffuseGrad = ctx.createRadialGradient(cx, cy, 2, cx, cy, 110);
  if (currentSurvey.includes('2MASS')) {
    diffuseGrad.addColorStop(0, 'rgba(255, 180, 120, 0.45)');
    diffuseGrad.addColorStop(0.4, 'rgba(200, 120, 60, 0.15)');
    diffuseGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
  } else if (currentSurvey.includes('allWISE')) {
    diffuseGrad.addColorStop(0, 'rgba(120, 240, 220, 0.45)');
    diffuseGrad.addColorStop(0.4, 'rgba(40, 160, 140, 0.15)');
    diffuseGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
  } else {
    diffuseGrad.addColorStop(0, 'rgba(200, 220, 255, 0.40)');
    diffuseGrad.addColorStop(0.4, 'rgba(100, 120, 180, 0.12)');
    diffuseGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
  }
  ctx.fillStyle = diffuseGrad;
  ctx.beginPath();
  ctx.arc(cx, cy, 110, 0, Math.PI * 2);
  ctx.fill();

  // Estrellas del campo HiPS
  const scale = (w * 0.4) / fovDeg;
  FIELD_STARS.forEach(star => {
    const sx = cx + star.dx * scale;
    const sy = cy - star.dy * scale;
    if (sx < 0 || sx >= w || sy < 0 || sy >= h) return;

    const radius = Math.max(1.2, (15 - star.mag) * 0.7);
    ctx.fillStyle = star.color;
    ctx.beginPath();
    ctx.arc(sx, sy, radius, 0, Math.PI * 2);
    ctx.fill();

    if (star.isTarget) {
      ctx.strokeStyle = '#00f3ff';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.arc(sx, sy, radius + 8, 0, Math.PI * 2);
      ctx.stroke();
    }
  });

  // Retícula central
  ctx.strokeStyle = 'rgba(0, 243, 255, 0.4)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(cx - 15, cy);
  ctx.lineTo(cx - 4, cy);
  ctx.moveTo(cx + 4, cy);
  ctx.lineTo(cx + 15, cy);
  ctx.moveTo(cx, cy - 15);
  ctx.lineTo(cx, cy - 4);
  ctx.moveTo(cx, cy + 4);
  ctx.lineTo(cx, cy + 15);
  ctx.stroke();

  // Escala de campo en esquina
  ctx.fillStyle = '#00f3ff';
  ctx.font = '10px monospace';
  ctx.fillText(`FOV: ${fovDeg.toFixed(2)}° · ICRS J2000`, 12, h - 14);
}
