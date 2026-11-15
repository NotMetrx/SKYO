/**
 * SKYO — Motor Unificado Three.js en Vivo para Todos los Paneles (#000000)
 * Filosofía Ponytail:
 *  - Un único contexto WebGLRenderer en negro absoluto (#000000) para todas las vistas.
 *  - Carga local diferida/única de three.min.js (r128), cero dependencias externas.
 *  - Pausa automática con Page Visibility API, dirty-render en pausa 3D y respeto a reduced-motion.
 */

import { OBJ, PLANETAS, BANDAS, FASES_PROYECTO, FI, rng } from './data.js';
import { loadGlbGroup } from './glb-lite.js';
import { renderState, clearState } from './ui-states.js';

let T = null;
let canvas = null;
let renderer = null;
let scene = null;
let camera = null;
let raycaster = null;
const pointerNDC = { x: -9, y: -9 };
let _tmpVecA = null;
let _tmpVecB = null;
let cachedSpeed3D = 1;
let emaFrameMs = 16.7;
let lastPerfAdjustTs = 0;

let isInitialized = false;
let isLoading = false;
let isVisible = true;
let rafId = 0;
let activeRoute = 'inicio';
let hasRoutedOnce = false;

let simTime = 0;
let isPlaying3D = true;
let focus3D = 'Sistema';

// Control orbital de cámara interpolado suavemente entre vistas e interacciones
const camCurr = { t: 0.9, p: 1.35, r: 190, tx: 0, ty: 0, tz: 0 };
const camGoal = { t: 0.9, p: 1.35, r: 190, tx: 0, ty: 0, tz: 0 };
const activePointers = new Map();
let dragDistance = 0;
let lastPinchDist = 0;
let cursorParallax = { x: 0, y: 0 };
let warpBoost = 0;
let isWarpingFromInicio = false;

// Eclipse 3D (Blender GLB) como la "O" de SKYO y protagonista de la transición
let eclipseRig = null;
let eclipseModelPivot = null;
let eclipseHalo = null;
let eclipseMixer = null;
const eclipseMats = [];
let eclipsePhase = 'idle'; // 'idle' | 'transition' | 'done'
let eclipseWarpT = 0;
const eclipseSlot = { cx: 0, cy: 0, size: 0 };

// Grupos por panel
let starField = null;
let inicioGroup = null;
let inicioRing = null;
let inicioOuterRing = null;
let inicioNearLayer = null;
let inicioMidLayer = null;
let inicioNebula = null;
let inicioNodes = [];
let inicioMeteors = [];

let explorarGroup = null;
let vaultPoints = null;
let vaultBaseColors = null;
let healpixDome = null;
let cutoutFrame = null;
let bovedaModelLoaded = false;
let bovedaAstrolabe = null;
let bovedaBezelGuides = null;
let bovedaPolycount = 0;
let selectRing = null;
let hoverRing = null;
const objEntries = [];
const exploreState = {
  filter: 'Todos',
  epoch: 0,
  month: 0,
  band: 0,
  mode: 'explorador',
  compare: false,
  blink: false,
  selected: -1,
  hovered: -1,
  onSelect: null,
  onHover: null,
  onBlinkTick: null
};
let blinkAccumMs = 0;
let lastLoopTs = 0;
let lastVaultBand = -1;
let exploreHitMeshes = [];
let fasesHitMeshes = [];
let rafPickId = 0;
let pendingPickX = 0;
let pendingPickY = 0;

let sistemaGroup = null;
let beltPoints = null;
let cometHead = null;
let cometTail = null;
const planets = [];

let fasesGroup = null;
let fasesCore = null;
let fasesCones = null;
let phaseSignal = null;
let phaseCurve = null;
const phaseNodes = [];
const fasesState = {
  activeIdx: 0,
  onSelectPhase: null
};

function ensureThreeLoaded() {
  if (window.THREE) return Promise.resolve(window.THREE);
  if (isLoading) {
    return new Promise(resolve => {
      const wait = () => (window.THREE ? resolve(window.THREE) : setTimeout(wait, 40));
      wait();
    });
  }
  isLoading = true;
  return new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = 'assets/js/vendor/three.min.js';
    s.onload = () => {
      isLoading = false;
      resolve(window.THREE);
    };
    s.onerror = err => {
      isLoading = false;
      reject(err);
    };
    document.head.appendChild(s);
  });
}

function makeGlowTexture(innerColor, midColor) {
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const g = c.getContext('2d');
  const grad = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  grad.addColorStop(0, innerColor);
  grad.addColorStop(0.3, midColor);
  grad.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = grad;
  g.fillRect(0, 0, 128, 128);
  const tex = new T.CanvasTexture(c);
  if (renderer?.capabilities?.getMaxAnisotropy) {
    tex.anisotropy = Math.min(4, renderer.capabilities.getMaxAnisotropy());
  }
  return tex;
}

const _eclipseRay = { v: null, fwd: null, initialized: false };

function updateEclipseSlotRect() {
  const el = document.querySelector('#inicio .eclipse-o');
  if (!el) return;
  const r = el.getBoundingClientRect();
  if (r.width > 4 && r.height > 4) {
    eclipseSlot.cx = r.left + r.width * 0.5;
    eclipseSlot.cy = r.top + r.height * 0.5;
    eclipseSlot.size = Math.min(r.width, r.height);
  }
}

function resetEclipseMaterials() {
  for (const entry of eclipseMats) {
    entry.mat.opacity = entry.baseOpacity;
    if (entry.mat.emissiveIntensity !== undefined) {
      entry.mat.emissiveIntensity = entry.baseEmissive;
    }
  }
  if (eclipseHalo) eclipseHalo.material.opacity = 0.62;
  if (eclipseModelPivot) eclipseModelPivot.rotation.set(0, 0, 0);
}

function buildEclipsePortal() {
  eclipseRig = new T.Group();
  eclipseRig.name = 'EclipsePortal';
  eclipseRig.visible = activeRoute === 'inicio';

  const haloMat = new T.SpriteMaterial({
    map: makeGlowTexture('rgba(181,123,255,0.44)', 'rgba(91,184,255,0.16)'),
    transparent: true,
    opacity: 0.62,
    blending: T.AdditiveBlending,
    depthWrite: false
  });
  eclipseHalo = new T.Sprite(haloMat);
  eclipseHalo.position.set(0, 0, -0.35);
  eclipseHalo.scale.set(4.1, 4.1, 1);
  eclipseRig.add(eclipseHalo);

  const rimLight = new T.DirectionalLight(0x8fd2ff, 2.25);
  rimLight.position.set(2.2, 1.8, 3.6);
  const purpleFill = new T.PointLight(0xb57bff, 1.75, 16);
  purpleFill.position.set(-2.4, -1.6, 2.8);
  const backRim = new T.DirectionalLight(0xffffff, 1.15);
  backRim.position.set(-1.5, 2.6, -1.4);
  eclipseRig.add(rimLight, purpleFill, backRim);

  const slotEl = document.querySelector('#inicio .eclipse-o');
  if (slotEl) {
    renderState(slotEl, { state: 'loading', variant: 'slot' });
  }

  scene.add(eclipseRig);
  updateEclipseSlotRect();

  loadGlbGroup(T, './assets/models/eclipse.glb')
    .then(model => {
      if (slotEl) slotEl.replaceChildren();
      clearState(document.getElementById('cosmos-state'));
      if (!eclipseRig) return;
      eclipseModelPivot = model;
      eclipseMats.length = 0;
      model.traverse(obj => {
        if (!obj.isMesh || !obj.material) return;
        const m = obj.material;
        m.transparent = true;
        m.depthWrite = true;
        eclipseMats.push({
          mat: m,
          baseOpacity: typeof m.opacity === 'number' ? m.opacity : 1,
          baseEmissive: typeof m.emissiveIntensity === 'number' ? m.emissiveIntensity : 1
        });
      });
      const clips = model.userData.clips || [];
      if (clips.length) {
        eclipseMixer = new T.AnimationMixer(model);
        for (const clip of clips) eclipseMixer.clipAction(clip).play();
      }
      eclipseRig.add(model);
      updateEclipseSlotRect();
      eclipseRig.visible = activeRoute === 'inicio' || eclipsePhase === 'transition';
      if (eclipseRig.visible) wakeLoop();
    })
    .catch(() => {
      if (slotEl) slotEl.replaceChildren();
      if (eclipseRig) eclipseRig.visible = false;
      if (activeRoute === 'inicio') {
        renderState(document.getElementById('cosmos-state'), {
          state: 'error',
          variant: 'compact',
          title: 'Modelo 3D del eclipse no disponible',
          detail: 'Comprueba assets/models/eclipse.glb o continúa hacia la bóveda.',
          actionLabel: 'Reintentar',
          onAction: () => buildEclipsePortal()
        });
      }
    });
}

function updateEclipsePortalFrame(dt) {
  if (!eclipseRig || !camera) return;
  if (eclipsePhase === 'done') {
    eclipseRig.visible = false;
    return;
  }

  if (eclipsePhase === 'idle' && activeRoute !== 'inicio') {
    eclipseRig.visible = false;
    return;
  }

  if (eclipseSlot.size <= 0) updateEclipseSlotRect();
  const w = window.innerWidth || 1280;
  const h = window.innerHeight || 720;
  const cx = eclipseSlot.size > 0 ? eclipseSlot.cx : w * 0.62;
  const cy = eclipseSlot.size > 0 ? eclipseSlot.cy : h * 0.5;
  const slotSize = eclipseSlot.size > 0 ? eclipseSlot.size : Math.min(w, h) * 0.16;

  if (!_eclipseRay.initialized) {
    _eclipseRay.v = new T.Vector3();
    _eclipseRay.fwd = new T.Vector3();
    _eclipseRay.initialized = true;
  }

  let progress = 0;
  if (eclipsePhase === 'transition') {
    eclipseWarpT = Math.min(1, eclipseWarpT + dt / 0.88);
    progress = eclipseWarpT;
  }

  const ease = progress < 0.5
    ? 2 * progress * progress
    : 1 - Math.pow(-2 * progress + 2, 2) / 2;

  const slotNdcX = (cx / w) * 2 - 1;
  const slotNdcY = -(cy / h) * 2 + 1;
  const ndcX = slotNdcX * (1 - ease);
  const ndcY = slotNdcY * (1 - ease);

  const depth = eclipsePhase === 'transition'
    ? 26 * (1 - Math.pow(progress, 1.55)) + 0.8 * (1 - progress)
    : 26;

  _eclipseRay.fwd.set(0, 0, -1).applyQuaternion(camera.quaternion).normalize();
  _eclipseRay.v.set(ndcX, ndcY, 0.5).unproject(camera).sub(camera.position).normalize();
  const cosTheta = Math.max(0.25, _eclipseRay.v.dot(_eclipseRay.fwd));
  const rayDist = depth / cosTheta;

  eclipseRig.visible = true;
  eclipseRig.position.copy(camera.position).addScaledVector(_eclipseRay.v, rayDist);
  eclipseRig.quaternion.copy(camera.quaternion);

  const worldScreenH = 2 * depth * Math.tan((camera.fov * Math.PI) / 360);
  const baseScale = ((slotSize / h) * worldScreenH) * 0.44;
  const zoomScale = eclipsePhase === 'transition'
    ? baseScale * (1 + 4.4 * Math.pow(progress, 1.45))
    : baseScale;
  eclipseRig.scale.setScalar(zoomScale);

  if (eclipseMixer && !window.__skyReducedMotion) {
    eclipseMixer.update(dt * (eclipsePhase === 'transition' ? 2.4 : 1.0));
  }

  if (eclipseModelPivot) {
    if (eclipsePhase === 'idle') {
      const targetRx = 0.14 - cursorParallax.y * 0.22 + Math.sin(simTime * 0.65) * 0.04;
      const targetRy = -0.18 + cursorParallax.x * 0.28 + Math.cos(simTime * 0.45) * 0.06;
      eclipseModelPivot.rotation.x += (targetRx - eclipseModelPivot.rotation.x) * 0.08;
      eclipseModelPivot.rotation.y += (targetRy - eclipseModelPivot.rotation.y) * 0.08;
      eclipseModelPivot.rotation.z *= 0.92;
    } else {
      eclipseModelPivot.rotation.z += dt * 1.15;
      eclipseModelPivot.rotation.y *= 0.9;
      eclipseModelPivot.rotation.x *= 0.9;
    }
  }

  const fadeAlpha = eclipsePhase === 'transition' && progress > 0.66
    ? Math.max(0, 1 - (progress - 0.66) / 0.34)
    : 1;

  for (const entry of eclipseMats) {
    entry.mat.opacity = entry.baseOpacity * fadeAlpha;
    if (entry.mat.emissiveIntensity !== undefined && eclipsePhase === 'transition') {
      entry.mat.emissiveIntensity = entry.baseEmissive * (1 + progress * 1.1) * fadeAlpha;
    }
  }
  if (eclipseHalo) {
    const hPulse = 4.1 + 0.25 * Math.sin(simTime * 1.9);
    eclipseHalo.scale.set(hPulse, hPulse, 1);
    eclipseHalo.material.opacity = (0.58 + 0.08 * Math.sin(simTime * 1.9)) * fadeAlpha;
  }

  if (eclipsePhase === 'transition' && progress >= 1) {
    eclipsePhase = 'done';
    eclipseRig.visible = false;
    resetEclipseMaterials();
  }
}

/* ==========================================================================
   1. Campo Estelar Profundo Compartido (Fondo #000000)
   ========================================================================== */
function buildSharedStarfield() {
  const R = rng(19);
  const count = 2200;
  const pos = new Float32Array(count * 3);
  const col = new Float32Array(count * 3);

  for (let i = 0; i < count; i++) {
    const a = R() * 6.283;
    const b = Math.acos(2 * R() - 1);
    const radius = 900 + R() * 550;
    pos.set([
      Math.sin(b) * Math.cos(a) * radius,
      Math.cos(b) * radius,
      Math.sin(b) * Math.sin(a) * radius
    ], i * 3);

    // Estrellas blancas con sutiles temperaturas azul #5bb8ff y cálidas #ff9e58
    const tint = R();
    if (tint < 0.22) col.set([0.45, 0.78, 1.0], i * 3);
    else if (tint > 0.88) col.set([1.0, 0.72, 0.48], i * 3);
    else col.set([0.94, 0.96, 1.0], i * 3);
  }

  const geom = new T.BufferGeometry();
  geom.setAttribute('position', new T.BufferAttribute(pos, 3));
  geom.setAttribute('color', new T.BufferAttribute(col, 3));
  starField = new T.Points(geom, new T.PointsMaterial({
    size: 2.0,
    vertexColors: true,
    sizeAttenuation: false,
    transparent: true,
    opacity: 0.9
  }));
  scene.add(starField);
}

/* ==========================================================================
   2. Escena Panel 1: Inicio (Constelaciones 3D + Anillo Corona Profundo)
   ========================================================================== */
function buildInicioScene() {
  inicioGroup = new T.Group();
  const R = rng(11);
  const starTex = makeGlowTexture('#ffffff', 'rgba(91, 184, 255, 0.55)');
  const coolNebTex = makeGlowTexture('rgba(91, 184, 255, 0.22)', 'rgba(30, 82, 185, 0.09)');
  const warmNebTex = makeGlowTexture('rgba(181, 123, 255, 0.18)', 'rgba(84, 40, 150, 0.06)');

  // Capas de nebulosa infrarroja aditiva muy sutil sobre negro absoluto
  inicioNebula = new T.Group();
  const nebSpecs = [
    { tex: coolNebTex, pos: [-38, 16, -24], scale: 128, opacity: 0.45 },
    { tex: coolNebTex, pos: [44, -14, 18], scale: 112, opacity: 0.38 },
    { tex: warmNebTex, pos: [12, 26, -42], scale: 105, opacity: 0.34 }
  ];
  for (const nb of nebSpecs) {
    const sp = new T.Sprite(new T.SpriteMaterial({
      map: nb.tex,
      blending: T.AdditiveBlending,
      transparent: true,
      opacity: nb.opacity,
      depthWrite: false
    }));
    sp.position.set(nb.pos[0], nb.pos[1], nb.pos[2]);
    sp.scale.set(nb.scale, nb.scale, 1);
    inicioNebula.add(sp);
  }
  inicioGroup.add(inicioNebula);

  // Dos planos estelares en distinta profundidad para parallax reactivo real
  const makeDepthLayer = (count, rMin, rMax, size, opacity, seed) => {
    const L = rng(seed);
    const pos = new Float32Array(count * 3);
    const col = new Float32Array(count * 3);
    const cBlue = new T.Color(0x5bb8ff);
    const cWhite = new T.Color(0xeef3ff);
    const cWarm = new T.Color(0xff9e58);
    for (let i = 0; i < count; i++) {
      const th = L() * Math.PI * 2;
      const ph = Math.acos(2 * L() - 1);
      const rad = rMin + L() * (rMax - rMin);
      pos[i * 3] = rad * Math.sin(ph) * Math.cos(th);
      pos[i * 3 + 1] = rad * Math.cos(ph) * 0.78;
      pos[i * 3 + 2] = rad * Math.sin(ph) * Math.sin(th);
      const t = L();
      const pick = t < 0.42 ? cBlue : (t < 0.84 ? cWhite : cWarm);
      col[i * 3] = pick.r;
      col[i * 3 + 1] = pick.g;
      col[i * 3 + 2] = pick.b;
    }
    const geom = new T.BufferGeometry();
    geom.setAttribute('position', new T.BufferAttribute(pos, 3));
    geom.setAttribute('color', new T.BufferAttribute(col, 3));
    return new T.Points(geom, new T.PointsMaterial({
      size,
      map: starTex,
      vertexColors: true,
      transparent: true,
      opacity,
      blending: T.AdditiveBlending,
      depthWrite: false
    }));
  };

  inicioNearLayer = makeDepthLayer(260, 46, 108, 2.35, 0.82, 41);
  inicioMidLayer = makeDepthLayer(420, 110, 215, 1.55, 0.58, 73);
  inicioGroup.add(inicioNearLayer);
  inicioGroup.add(inicioMidLayer);

  // 8 constelaciones distribuidas en el espacio 3D
  for (let c = 0; c < 8; c++) {
    const baseTheta = (c / 8) * Math.PI * 2 + R() * 0.4;
    const basePhi = 0.7 + R() * 1.4;
    const rad = 112 + R() * 52;
    let x = rad * Math.sin(basePhi) * Math.cos(baseTheta);
    let y = rad * Math.cos(basePhi) * 0.75;
    let z = rad * Math.sin(basePhi) * Math.sin(baseTheta);

    const pts = [];
    const nodeCount = 5 + ((R() * 3) | 0);
    for (let i = 0; i < nodeCount; i++) {
      x += (R() - 0.5) * 34;
      y += (R() - 0.5) * 26;
      z += (R() - 0.5) * 30;
      const v = new T.Vector3(x, y, z);
      pts.push(v);

      const sp = new T.Sprite(new T.SpriteMaterial({
        map: starTex,
        color: i === 0 ? 0xb57bff : 0x5bb8ff,
        blending: T.AdditiveBlending,
        transparent: true,
        depthWrite: false
      }));
      sp.position.copy(v);
      const baseScale = i === 0 ? 5.6 : 3.8 + R() * 2.2;
      sp.scale.set(baseScale, baseScale, 1);
      inicioGroup.add(sp);
      inicioNodes.push({ sprite: sp, phase: R() * 6.28, baseScale });
    }

    const lineGeom = new T.BufferGeometry().setFromPoints(pts);
    inicioGroup.add(new T.Line(lineGeom, new T.LineBasicMaterial({
      color: 0x5bb8ff,
      transparent: true,
      opacity: 0.34
    })));
  }

  // Doble anillo astrolabio Nothing-design contrarrotante en profundidad
  inicioRing = new T.Group();
  const ringPts = [];
  const dotPts = [];
  for (let k = 0; k <= 128; k++) {
    const a = (k / 128) * 6.283;
    ringPts.push(new T.Vector3(Math.cos(a) * 62, Math.sin(a) * 14, Math.sin(a) * 62));
    if (k < 72 && k % 2 === 0) {
      const da = (k / 72) * 6.283;
      dotPts.push(new T.Vector3(Math.cos(da) * 66, Math.sin(da) * 15, Math.sin(da) * 66));
    }
  }
  inicioRing.add(new T.Line(
    new T.BufferGeometry().setFromPoints(ringPts),
    new T.LineBasicMaterial({ color: 0x5bb8ff, transparent: true, opacity: 0.22 })
  ));
  inicioRing.add(new T.Points(
    new T.BufferGeometry().setFromPoints(dotPts),
    new T.PointsMaterial({ color: 0x5bb8ff, size: 1.5, transparent: true, opacity: 0.5, depthWrite: false })
  ));
  inicioRing.rotation.set(0.32, 0.2, -0.18);
  inicioGroup.add(inicioRing);

  inicioOuterRing = new T.Group();
  const outerPts = [];
  for (let k = 0; k <= 96; k++) {
    const a = (k / 96) * 4.4; // arco abierto
    outerPts.push(new T.Vector3(Math.cos(a) * 90, Math.sin(a) * 22, Math.sin(a) * 90));
  }
  inicioOuterRing.add(new T.Line(
    new T.BufferGeometry().setFromPoints(outerPts),
    new T.LineBasicMaterial({ color: 0xb57bff, transparent: true, opacity: 0.2 })
  ));
  inicioOuterRing.rotation.set(-0.42, -0.35, 0.24);
  inicioGroup.add(inicioOuterRing);

  // 2 trazos meteóricos parabólicos suaves (animados en el RAF unificado)
  inicioMeteors = [];
  for (let m = 0; m < 2; m++) {
    const segs = 12;
    const pos = new Float32Array(segs * 3);
    const col = new Float32Array(segs * 3);
    for (let s = 0; s < segs; s++) {
      const f = 1 - s / (segs - 1);
      col[s * 3] = (0.36 + 0.64 * f) * f;
      col[s * 3 + 1] = (0.72 + 0.28 * f) * f;
      col[s * 3 + 2] = 1.0 * f;
    }
    const geom = new T.BufferGeometry();
    geom.setAttribute('position', new T.BufferAttribute(pos, 3));
    geom.setAttribute('color', new T.BufferAttribute(col, 3));
    const mat = new T.LineBasicMaterial({
      vertexColors: true,
      transparent: true,
      opacity: 0.72,
      blending: T.AdditiveBlending
    });
    const line = new T.Line(geom, mat);
    inicioGroup.add(line);
    inicioMeteors.push({
      line,
      segs,
      offset: m * 3.7,
      period: 7.4 + m * 2.1,
      baseY: m === 0 ? 28 : -16,
      tiltZ: m === 0 ? -0.38 : 0.26
    });
  }

  scene.add(inicioGroup);
}

/* ==========================================================================
   3. Escena Panel 2: Explorar (Plano Focal IR SPHEREx + Telemetría ICRS)
   ========================================================================== */
const VAULT_CENTER_Z = 110;

function getElapsedMonths() {
  return exploreState.epoch * 6 + exploreState.month;
}

function projectICRS(ra, dec, radius, centerZ = VAULT_CENTER_Z) {
  const cosD = Math.cos(dec);
  return new T.Vector3(
    radius * cosD * Math.sin(ra),
    radius * Math.sin(dec),
    centerZ - radius * cosD * Math.cos(ra)
  );
}

function getExploreObjectPos3D(o, monthsElapsed) {
  // Estrellas fijas como anclas astrométricas sobre el campo profundo;
  // cometas y asteroides se desplazan en el plano frontal de paralaje IR.
  const angle = o[3] + monthsElapsed * o[8];
  const ra = Math.cos(angle) * o[2] * 0.52;
  const dec = Math.sin(angle) * o[2] * 0.34;
  const isFixedStar = o[1] === 'Estrella';
  const radius = isFixedStar ? 116 : 94;
  const centerZ = isFixedStar ? VAULT_CENTER_Z - 2 : VAULT_CENTER_Z - 14;
  return projectICRS(ra, dec, radius, centerZ);
}

function setBovedaObjectStyle(obj, colorHex, opacity, emissiveIntensity) {
  if (!obj) return;
  const applyMat = m => {
    if (!m) return;
    if (m.color && colorHex !== null) m.color.setHex(colorHex);
    if (m.emissive && colorHex !== null) m.emissive.setHex(colorHex);
    if (typeof opacity === 'number') {
      const scale = typeof m.userData?.baseOpacityScale === 'number' ? m.userData.baseOpacityScale : 1;
      const finalOpacity = Math.min(1, opacity * scale);
      m.transparent = finalOpacity < 1;
      m.opacity = finalOpacity;
    }
    if (typeof emissiveIntensity === 'number' && typeof m.emissiveIntensity === 'number') {
      m.emissiveIntensity = emissiveIntensity;
    }
  };
  if (obj.material) {
    applyMat(obj.material);
  } else if (typeof obj.traverse === 'function') {
    obj.traverse(child => {
      if (child.material) applyMat(child.material);
    });
  }
}

function makeLockedReticle(color, radius, withCrosshairs = false) {
  const group = new T.Group();
  const ringPts = [];
  for (let i = 0; i <= 48; i++) {
    const a = (i / 48) * Math.PI * 2;
    ringPts.push(new T.Vector3(Math.cos(a) * radius, Math.sin(a) * radius, 0));
  }
  group.add(new T.Line(
    new T.BufferGeometry().setFromPoints(ringPts),
    new T.LineBasicMaterial({ color, transparent: true, opacity: withCrosshairs ? 0.85 : 0.72 })
  ));

  const bracketSegs = [];
  const inner = radius * 0.78;
  const outer = radius * 1.24;
  if (withCrosshairs) {
    for (let k = 0; k < 4; k++) {
      const a = (k * Math.PI) / 2;
      const ca = Math.cos(a);
      const sa = Math.sin(a);
      bracketSegs.push(
        new T.Vector3(ca * inner, sa * inner, 0),
        new T.Vector3(ca * outer, sa * outer, 0)
      );
    }
    const c = radius * 0.92;
    const arm = radius * 0.28;
    for (const sx of [-1, 1]) {
      for (const sy of [-1, 1]) {
        bracketSegs.push(
          new T.Vector3(sx * c, sy * (c - arm), 0), new T.Vector3(sx * c, sy * c, 0),
          new T.Vector3(sx * (c - arm), sy * c, 0), new T.Vector3(sx * c, sy * c, 0)
        );
      }
    }
  } else {
    const d = radius * 0.95;
    bracketSegs.push(
      new T.Vector3(0, d, 0), new T.Vector3(d, 0, 0),
      new T.Vector3(d, 0, 0), new T.Vector3(0, -d, 0),
      new T.Vector3(0, -d, 0), new T.Vector3(-d, 0, 0),
      new T.Vector3(-d, 0, 0), new T.Vector3(0, d, 0)
    );
  }
  group.add(new T.LineSegments(
    new T.BufferGeometry().setFromPoints(bracketSegs),
    new T.LineBasicMaterial({ color, transparent: true, opacity: 0.95 })
  ));
  group.visible = false;
  return group;
}

function buildExplorarScene() {
  explorarGroup = new T.Group();
  const R = rng(5);

  // Iluminación PBR dedicada para el plano focal infrarrojo
  const keyLight = new T.DirectionalLight(0x8fd2ff, 1.05);
  keyLight.position.set(45, 38, 95);
  const fillLight = new T.PointLight(0xb57bff, 0.95, 220);
  fillLight.position.set(-42, -28, 80);
  const rimLight = new T.DirectionalLight(0xeef3ff, 0.55);
  rimLight.position.set(0, -45, 120);
  explorarGroup.add(keyLight, fillLight, rimLight);

  // 1. Campo profundo de 2.400 estrellas astrométricas ICRS con paralaje en Z
  const count = 2400;
  const pos = new Float32Array(count * 3);
  const col = new Float32Array(count * 3);
  vaultBaseColors = new Float32Array(count * 3);

  for (let i = 0; i < count; i++) {
    const ra = (R() - 0.5) * 1.95;
    const dec = (R() - 0.5) * 1.28;
    const depth = 117 + R() * 18;
    const pt = projectICRS(ra, dec, depth);
    pos.set([pt.x, pt.y, pt.z], i * 3);

    const temp = R();
    const cr = 0.62 + temp * 0.36;
    const cg = 0.72 + temp * 0.22;
    const cb = 1.0 - temp * 0.28;
    col.set([cr, cg, cb], i * 3);
    vaultBaseColors.set([cr, cg, cb], i * 3);
  }

  const gGeom = new T.BufferGeometry();
  gGeom.setAttribute('position', new T.BufferAttribute(pos, 3));
  gGeom.setAttribute('color', new T.BufferAttribute(col, 3));
  vaultPoints = new T.Points(gGeom, new T.PointsMaterial({
    size: 1.95,
    map: makeGlowTexture('#ffffff', 'rgba(255, 255, 255, 0.32)'),
    vertexColors: true,
    transparent: true,
    opacity: 0.88,
    blending: T.AdditiveBlending,
    depthWrite: false
  }));
  explorarGroup.add(vaultPoints);

  // 2. Proyección tangente ICRS + Volumen Astrométrico (sin bóveda/astrolabio arcaico)
  healpixDome = new T.Group();
  const makeScaledLineMat = (color, baseOpacityScale) => {
    const mat = new T.LineBasicMaterial({
      color,
      transparent: true,
      opacity: baseOpacityScale
    });
    mat.userData = { baseOpacityScale };
    return mat;
  };

  const gridSegs = [];
  for (let r = -0.56; r <= 0.57; r += 0.14) {
    for (let d = -0.38; d < 0.38; d += 0.06) {
      gridSegs.push(projectICRS(r, d, 116), projectICRS(r, Math.min(0.38, d + 0.06), 116));
    }
  }
  for (let d = -0.36; d <= 0.37; d += 0.12) {
    for (let r = -0.58; r < 0.58; r += 0.06) {
      gridSegs.push(projectICRS(r, d, 116), projectICRS(Math.min(0.58, r + 0.06), d, 116));
    }
  }
  healpixDome.add(new T.LineSegments(
    new T.BufferGeometry().setFromPoints(gridSegs),
    makeScaledLineMat(0x5bb8ff, 0.32)
  ));

  // Anillos concéntricos de escala angular (15", 30", 60") y struts de paralaje en Z
  const scaleSegs = [];
  [13, 25, 39].forEach(rad => {
    const steps = 48;
    for (let k = 0; k < steps; k += 2) {
      const a0 = (k / steps) * Math.PI * 2;
      const a1 = ((k + 1.15) / steps) * Math.PI * 2;
      scaleSegs.push(
        new T.Vector3(Math.cos(a0) * rad, Math.sin(a0) * rad, -4.6),
        new T.Vector3(Math.cos(a1) * rad, Math.sin(a1) * rad, -4.6)
      );
    }
  });
  for (const sx of [-1, 1]) {
    for (const sy of [-1, 1]) {
      scaleSegs.push(
        new T.Vector3(sx * 31, sy * 21, -8.5),
        new T.Vector3(sx * 31, sy * 21, 3.5)
      );
    }
  }
  healpixDome.add(new T.LineSegments(
    new T.BufferGeometry().setFromPoints(scaleSegs),
    makeScaledLineMat(0x5bb8ff, 0.55)
  ));
  healpixDome.matrixAutoUpdate = false;
  healpixDome.updateMatrix();
  explorarGroup.add(healpixDome);

  // 3. Matriz de Plano Focal SPHEREx 2x3 (Detectores D1–D6 + Escuadras Vernier)
  cutoutFrame = new T.Group();
  const fw = 30;
  const fh = 20;
  const fz = -4.2;
  const bezelCornerSegs = [];
  const cornerLen = 4.6;
  for (const sx of [-1, 1]) {
    for (const sy of [-1, 1]) {
      bezelCornerSegs.push(
        new T.Vector3(sx * fw, sy * fh, fz), new T.Vector3(sx * (fw - cornerLen), sy * fh, fz),
        new T.Vector3(sx * fw, sy * fh, fz), new T.Vector3(sx * fw, sy * (fh - cornerLen), fz),
        new T.Vector3(sx * (fw + 1.2), sy * (fh + 1.2), fz + 0.6), new T.Vector3(sx * (fw - cornerLen * 0.6), sy * (fh + 1.2), fz + 0.6),
        new T.Vector3(sx * (fw + 1.2), sy * (fh + 1.2), fz + 0.6), new T.Vector3(sx * (fw + 1.2), sy * (fh - cornerLen * 0.6), fz + 0.6)
      );
    }
  }
  cutoutFrame.add(new T.LineSegments(
    new T.BufferGeometry().setFromPoints(bezelCornerSegs),
    makeScaledLineMat(0x5bb8ff, 1.0)
  ));

  // Sub-división 2×3 del mosaico de detectores D1–D6 y cruz óptica central
  bovedaBezelGuides = new T.Group();
  const guideSegs = [
    new T.Vector3(-fw, 0, fz), new T.Vector3(fw, 0, fz),
    new T.Vector3(-fw / 3, -fh, fz), new T.Vector3(-fw / 3, fh, fz),
    new T.Vector3(fw / 3, -fh, fz), new T.Vector3(fw / 3, fh, fz),
    new T.Vector3(-fw, -fh, fz), new T.Vector3(fw, -fh, fz),
    new T.Vector3(-fw, fh, fz), new T.Vector3(fw, fh, fz),
    new T.Vector3(-fw, -fh, fz), new T.Vector3(-fw, fh, fz),
    new T.Vector3(fw, -fh, fz), new T.Vector3(fw, fh, fz)
  ];
  bovedaBezelGuides.add(new T.LineSegments(
    new T.BufferGeometry().setFromPoints(guideSegs),
    makeScaledLineMat(0xb57bff, 0.55)
  ));
  bovedaBezelGuides.matrixAutoUpdate = false;
  bovedaBezelGuides.updateMatrix();
  cutoutFrame.add(bovedaBezelGuides);
  cutoutFrame.matrixAutoUpdate = false;
  cutoutFrame.updateMatrix();
  explorarGroup.add(cutoutFrame);

  // 4. Anillo Dicróico de Calibración Óptica (Vernier micrométrico rotatorio)
  bovedaAstrolabe = new T.Group();
  bovedaAstrolabe.position.set(0, 0, -3.8);
  const vernierPts = [];
  const tickInner = 40.5;
  const tickOuter = 42.4;
  for (let i = 0; i < 72; i++) {
    const a = (i / 72) * Math.PI * 2;
    const len = i % 6 === 0 ? tickOuter + 1.2 : tickOuter;
    vernierPts.push(
      new T.Vector3(Math.cos(a) * tickInner, Math.sin(a) * tickInner, 0),
      new T.Vector3(Math.cos(a) * len, Math.sin(a) * len, 0)
    );
  }
  bovedaAstrolabe.add(new T.LineSegments(
    new T.BufferGeometry().setFromPoints(vernierPts),
    makeScaledLineMat(0x5bb8ff, 0.48)
  ));
  for (const offsetA of [0.35, Math.PI + 0.35]) {
    const arcPts = [];
    for (let s = 0; s <= 24; s++) {
      const a = offsetA + (s / 24) * 0.95;
      arcPts.push(new T.Vector3(Math.cos(a) * 44.2, Math.sin(a) * 44.2, 0));
    }
    bovedaAstrolabe.add(new T.Line(
      new T.BufferGeometry().setFromPoints(arcPts),
      makeScaledLineMat(0xb57bff, 0.65)
    ));
  }
  explorarGroup.add(bovedaAstrolabe);

  // 5. Fuentes celestes interactivas (Spikes IR, Cometas coaxiales, Apertura fotométrica)
  const starTex = makeGlowTexture('#ffffff', 'rgba(91, 184, 255, 0.72)');

  OBJ.forEach((o, idx) => {
    const colorHex = new T.Color(o[4]);
    const holder = new T.Group();
    const hitMesh = new T.Mesh(
      new T.SphereGeometry(5.2, 12, 12),
      new T.MeshBasicMaterial({ visible: false })
    );
    hitMesh.userData = { type: 'object', index: idx };
    holder.add(hitMesh);

    const visualGroup = new T.Group();
    holder.add(visualGroup);

    if (o[1] === 'Cometa') {
      const head = new T.Mesh(
        new T.SphereGeometry(1.4, 16, 16),
        new T.MeshBasicMaterial({ color: colorHex })
      );
      visualGroup.add(head);

      const glow = new T.Sprite(new T.SpriteMaterial({
        map: starTex,
        color: colorHex,
        blending: T.AdditiveBlending,
        transparent: true,
        opacity: 0.48,
        depthWrite: false
      }));
      glow.scale.set(7.8, 7.8, 1);
      holder.add(glow);

      const tailGeom = new T.ConeGeometry(1.1, 12.5, 12, 1, true);
      tailGeom.translate(0, 6.2, 0);
      tailGeom.rotateX(Math.PI / 2);
      visualGroup.add(new T.Mesh(tailGeom, new T.MeshBasicMaterial({
        color: colorHex,
        transparent: true,
        opacity: 0.34,
        side: T.DoubleSide,
        blending: T.AdditiveBlending,
        depthWrite: false
      })));

      const ionGeom = new T.ConeGeometry(0.45, 14.5, 10, 1, true);
      ionGeom.translate(0, 7.2, 0);
      ionGeom.rotateX(Math.PI / 2);
      visualGroup.add(new T.Mesh(ionGeom, new T.MeshBasicMaterial({
        color: 0x5bb8ff,
        transparent: true,
        opacity: 0.48,
        side: T.DoubleSide,
        blending: T.AdditiveBlending,
        depthWrite: false
      })));
    } else if (o[1] === 'Asteroide') {
      const isCand = o[7] === 'Candidato';
      const rock = new T.Mesh(
        isCand ? new T.OctahedronGeometry(1.85, 1) : new T.IcosahedronGeometry(1.55, 0),
        new T.MeshStandardMaterial({
          color: colorHex,
          emissive: isCand ? 0xb57bff : 0x2a3b52,
          emissiveIntensity: isCand ? 0.65 : 0.25,
          roughness: 0.58,
          metalness: 0.2
        })
      );
      visualGroup.add(rock);

      const apPts = [
        new T.Vector3(0, 3.4, 0), new T.Vector3(3.4, 0, 0),
        new T.Vector3(0, -3.4, 0), new T.Vector3(-3.4, 0, 0),
        new T.Vector3(0, 3.4, 0)
      ];
      holder.add(new T.Line(
        new T.BufferGeometry().setFromPoints(apPts),
        new T.LineBasicMaterial({
          color: isCand ? 0xb57bff : colorHex,
          transparent: true,
          opacity: isCand ? 0.85 : 0.45
        })
      ));

      if (isCand) {
        const ringPts = [];
        for (let s = 0; s <= 32; s++) {
          const a = (s / 32) * Math.PI * 2;
          ringPts.push(new T.Vector3(Math.cos(a) * 4.5, Math.sin(a) * 4.5, 0));
        }
        holder.add(new T.Line(
          new T.BufferGeometry().setFromPoints(ringPts),
          new T.LineBasicMaterial({ color: 0xc9a2ff, transparent: true, opacity: 0.62 })
        ));
      }

      const halo = new T.Sprite(new T.SpriteMaterial({
        map: starTex,
        color: isCand ? 0xb57bff : colorHex,
        blending: T.AdditiveBlending,
        transparent: true,
        opacity: isCand ? 0.52 : 0.36,
        depthWrite: false
      }));
      halo.scale.set(6.8, 6.8, 1);
      holder.add(halo);
    } else {
      const starCore = new T.Sprite(new T.SpriteMaterial({
        map: starTex,
        color: colorHex,
        blending: T.AdditiveBlending,
        transparent: true,
        opacity: 0.62,
        depthWrite: false
      }));
      starCore.scale.set(7.6, 7.6, 1);
      holder.add(starCore);

      const spikeLen = 3.8;
      const diag = 2.0;
      const spikes = new T.LineSegments(
        new T.BufferGeometry().setFromPoints([
          new T.Vector3(-spikeLen, 0, 0), new T.Vector3(spikeLen, 0, 0),
          new T.Vector3(0, -spikeLen, 0), new T.Vector3(0, spikeLen, 0),
          new T.Vector3(-diag, -diag, 0), new T.Vector3(diag, diag, 0),
          new T.Vector3(-diag, diag, 0), new T.Vector3(diag, -diag, 0)
        ]),
        new T.LineBasicMaterial({ color: colorHex, transparent: true, opacity: 0.52 })
      );
      holder.add(spikes);
    }

    const vecGeom = new T.BufferGeometry().setFromPoints([new T.Vector3(), new T.Vector3()]);
    const vecLine = new T.Line(vecGeom, new T.LineBasicMaterial({
      color: 0xb57bff,
      transparent: true,
      opacity: 0.92
    }));
    vecLine.visible = false;

    const epochGeom = new T.BufferGeometry();
    epochGeom.setAttribute('position', new T.BufferAttribute(new Float32Array(12), 3));
    const epochDots = new T.Points(epochGeom, new T.PointsMaterial({
      color: 0xc9a2ff,
      size: 2.2,
      transparent: true,
      opacity: 0.9,
      depthWrite: false
    }));
    epochDots.visible = false;

    const originDot = new T.Mesh(
      new T.SphereGeometry(0.95, 10, 10),
      new T.MeshBasicMaterial({ color: 0xb57bff })
    );
    originDot.visible = false;

    explorarGroup.add(holder, vecLine, epochDots, originDot);
    objEntries.push({
      holder,
      visualGroup,
      model3D: visualGroup,
      hitMesh,
      vecLine,
      epochDots,
      originDot,
      data: o
    });
  });

  // 6. Retículas gimbal astrométricas de selección y hover
  selectRing = makeLockedReticle(0x5bb8ff, 5.8, true);
  hoverRing = makeLockedReticle(0xffffff, 4.9, false);
  explorarGroup.add(selectRing, hoverRing);

  bovedaPolycount = 640 + objEntries.length * 42;
  bovedaModelLoaded = true;
  scene.add(explorarGroup);
  syncExplorarVisuals();
}

export function syncExplorarVisuals() {
  if (!isInitialized) return;
  const elapsed = getElapsedMonths();
  const isIRLong = exploreState.band === 1;
  const activeAccent = isIRLong ? 0xb57bff : 0x5bb8ff;
  const secondaryAccent = isIRLong ? 0x5bb8ff : 0xb57bff;
  const isHighlighted = Boolean(exploreState.compare || exploreState.blink);

  // Tinte espectral dinámico del plano focal únicamente cuando cambia la banda SPHEREx
  if (vaultPoints && vaultBaseColors && exploreState.band !== lastVaultBand) {
    lastVaultBand = exploreState.band;
    const attr = vaultPoints.geometry.attributes.color;
    for (let i = 0; i < attr.count; i++) {
      const br = vaultBaseColors[i * 3];
      const bg = vaultBaseColors[i * 3 + 1];
      const bb = vaultBaseColors[i * 3 + 2];
      if (isIRLong) {
        attr.setXYZ(i, Math.min(1, br * 1.16 + 0.14), bg * 0.78, bb * 0.48);
      } else {
        attr.setXYZ(i, br * 0.78, Math.min(1, bg * 0.95), Math.min(1, bb * 1.15 + 0.08));
      }
    }
    attr.needsUpdate = true;
  }

  if (bovedaAstrolabe) {
    setBovedaObjectStyle(bovedaAstrolabe, activeAccent, isHighlighted ? 0.95 : 0.72);
  }
  if (healpixDome) {
    const gridOp = exploreState.mode === 'cientifico' ? 0.72 : (isHighlighted ? 0.62 : 0.44);
    setBovedaObjectStyle(healpixDome, activeAccent, gridOp);
  }
  if (cutoutFrame) {
    setBovedaObjectStyle(cutoutFrame, activeAccent, isHighlighted ? 0.96 : 0.74);
  }
  if (bovedaBezelGuides) {
    setBovedaObjectStyle(bovedaBezelGuides, secondaryAccent, isHighlighted ? 0.88 : 0.56);
  }

  // Posiciones ICRS, vector Δθ y traza discreta de épocas E1–E4 + lista cacheada de hitTest
  exploreHitMeshes.length = 0;
  objEntries.forEach((entry, i) => {
    const o = entry.data;
    const match = exploreState.filter === 'Todos' || exploreState.filter === o[1];
    entry.holder.visible = match;
    if (match) exploreHitMeshes.push(entry.hitMesh);

    const pNow = getExploreObjectPos3D(o, elapsed);
    entry.holder.position.copy(pNow);
    if (o[1] === 'Cometa') {
      entry.holder.lookAt(pNow.x + 14, pNow.y + 7, pNow.z + 3);
    }

    const showVec = exploreState.compare && match && o[8] > 0 && elapsed > 0;
    entry.vecLine.visible = showVec;
    entry.originDot.visible = showVec;
    if (entry.epochDots) entry.epochDots.visible = showVec;
    if (showVec) {
      const p0 = getExploreObjectPos3D(o, 0);
      entry.originDot.position.copy(p0);
      const posAttr = entry.vecLine.geometry.attributes.position;
      posAttr.setXYZ(0, p0.x, p0.y, p0.z);
      posAttr.setXYZ(1, pNow.x, pNow.y, pNow.z);
      posAttr.needsUpdate = true;

      if (entry.epochDots) {
        const eAttr = entry.epochDots.geometry.attributes.position;
        for (let k = 0; k < 4; k++) {
          const pk = getExploreObjectPos3D(o, Math.min(elapsed, k * 6));
          eAttr.setXYZ(k, pk.x, pk.y, pk.z);
        }
        eAttr.needsUpdate = true;
      }
    }

    if (i === exploreState.selected && match && selectRing) {
      selectRing.visible = true;
      selectRing.position.copy(pNow);
      selectRing.lookAt(0, 0, VAULT_CENTER_Z);
    }
  });

  if (exploreState.selected < 0 || (exploreState.filter !== 'Todos' && OBJ[exploreState.selected]?.[1] !== exploreState.filter)) {
    if (selectRing) selectRing.visible = false;
  }
}

/* ==========================================================================
   4. Escena Panel 3: Sistema Solar 3D (#3d)
   ========================================================================== */
function buildSistemaScene() {
  sistemaGroup = new T.Group();

  const sunTex = makeGlowTexture('#fff7d6', 'rgba(255, 122, 26, 0.52)');
  const sunMesh = new T.Mesh(
    new T.SphereGeometry(5, 32, 32),
    new T.MeshBasicMaterial({ color: 0xffb347 })
  );
  const sunSprite = new T.Sprite(new T.SpriteMaterial({
    map: sunTex,
    blending: T.AdditiveBlending,
    depthWrite: false
  }));
  sunSprite.scale.set(42, 42, 1);
  sistemaGroup.add(sunMesh, sunSprite);

  PLANETAS.forEach((p, idx) => {
    const [name, color, dist, speed, size] = p;
    const mesh = new T.Mesh(
      new T.SphereGeometry(size * 0.9, 24, 24),
      new T.MeshStandardMaterial({ color, roughness: 0.72 })
    );
    if (name === 'Saturno') {
      const ring = new T.Mesh(
        new T.RingGeometry(3.4, 5.6, 48),
        new T.MeshBasicMaterial({ color: 0xe3d3a3, side: T.DoubleSide, transparent: true, opacity: 0.65 })
      );
      ring.rotation.x = 1.2;
      mesh.add(ring);
    }
    sistemaGroup.add(mesh);
    planets.push({ mesh, dist, speed: speed * 0.5, angle: idx * 1.7 });

    const orbitPts = [];
    for (let k = 0; k <= 96; k++) {
      const rad = (k / 96) * 6.283;
      orbitPts.push(new T.Vector3(Math.cos(rad) * dist, 0, Math.sin(rad) * dist));
    }
    sistemaGroup.add(new T.Line(
      new T.BufferGeometry().setFromPoints(orbitPts),
      new T.LineBasicMaterial({ color: 0x3b4d7a, transparent: true, opacity: 0.55 })
    ));
  });

  // Cinturón de asteroides
  const R = rng(2);
  const beltPos = new Float32Array(2200 * 3);
  for (let i = 0; i < 2200; i++) {
    const r = 38 + R() * 9;
    const a = R() * 6.283;
    beltPos.set([Math.cos(a) * r, (R() - 0.5) * 3, Math.sin(a) * r], i * 3);
  }
  const beltGeom = new T.BufferGeometry();
  beltGeom.setAttribute('position', new T.BufferAttribute(beltPos, 3));
  beltPoints = new T.Points(beltGeom, new T.PointsMaterial({ size: 1.05, color: 0xc2b097 }));
  sistemaGroup.add(beltPoints);

  // Órbita Kepleriana y cometa
  const cometGrp = new T.Group();
  cometGrp.rotation.set(0.5, 0.6, 0);
  sistemaGroup.add(cometGrp);

  const cometPath = [];
  for (let k = 0; k <= 120; k++) {
    const E = (k / 120) * 6.283;
    cometPath.push(new T.Vector3(70 * (Math.cos(E) - 0.82), 0, 40 * Math.sin(E)));
  }
  cometGrp.add(new T.Line(
    new T.BufferGeometry().setFromPoints(cometPath),
    new T.LineBasicMaterial({ color: 0x5bb8ff, transparent: true, opacity: 0.42 })
  ));

  cometHead = new T.Mesh(new T.SphereGeometry(1.3, 16, 16), new T.MeshBasicMaterial({ color: 0xdff4ff }));
  cometGrp.add(cometHead);

  const tailPos = new Float32Array(150);
  const tailCol = new Float32Array(150);
  for (let i = 0; i < 50; i++) {
    const f = 1 - i / 50;
    tailCol.set([0.36 * f, 0.72 * f, 1.0 * f], i * 3);
  }
  cometTail = new T.Points(
    new T.BufferGeometry(),
    new T.PointsMaterial({ size: 2.3, vertexColors: true, transparent: true, blending: T.AdditiveBlending, depthWrite: false })
  );
  cometTail.geometry.setAttribute('position', new T.BufferAttribute(tailPos, 3));
  cometTail.geometry.setAttribute('color', new T.BufferAttribute(tailCol, 3));
  cometTail.frustumCulled = false;
  cometGrp.add(cometTail);

  scene.add(sistemaGroup);
}

/* ==========================================================================
   5. Escena Panel 4: Fases y Pipeline Vivo 3D (Esfera HEALPix + 7 Nodos Orbitales)
   ========================================================================== */
function buildFasesScene() {
  fasesGroup = new T.Group();
  const glowTex = makeGlowTexture('#ffffff', 'rgba(91, 184, 255, 0.65)');

  // Núcleo central: Esfera celeste HEALPix + Tierra/Observatorio oscuro
  const earthCore = new T.Mesh(
    new T.SphereGeometry(14, 28, 28),
    new T.MeshStandardMaterial({ color: 0x0b1626, emissive: 0x071a30, roughness: 0.55 })
  );
  fasesGroup.add(earthCore);

  fasesCore = new T.Mesh(
    new T.IcosahedronGeometry(23, 2),
    new T.MeshBasicMaterial({ color: 0x5bb8ff, wireframe: true, transparent: true, opacity: 0.25 })
  );
  fasesGroup.add(fasesCore);

  // Doble cono de barrido infrarrojo SPHEREx (IR Corto azul + IR Largo naranja)
  fasesCones = new T.Group();
  const mkCone = (color, rotZ) => {
    const geom = new T.ConeGeometry(22, 68, 24, 1, true);
    geom.translate(0, 34, 0);
    const mesh = new T.Mesh(geom, new T.MeshBasicMaterial({
      color,
      wireframe: true,
      transparent: true,
      opacity: 0.16
    }));
    mesh.rotation.z = rotZ;
    return mesh;
  };
  fasesCones.add(mkCone(0x5bb8ff, Math.PI / 2.2), mkCone(0xb57bff, -Math.PI / 2.2));
  fasesGroup.add(fasesCones);

  // 7 Nodos de Fase (0..6) a lo largo de una hélice orbital interactiva
  const curvePts = [];
  FASES_PROYECTO.forEach((phase, i) => {
    const a = (i / FASES_PROYECTO.length) * Math.PI * 2 - 0.6;
    const rad = 54 + Math.sin(i * 0.9) * 8;
    const y = (i - 3) * 5.2;
    const pos = new T.Vector3(Math.cos(a) * rad, y, Math.sin(a) * rad);
    curvePts.push(pos);

    const toneColor = phase.tone === 'ac2' ? 0xb57bff : (phase.tone === 'ok' ? 0x4ade80 : 0x5bb8ff);

    const mesh = new T.Mesh(
      new T.SphereGeometry(3.1, 20, 20),
      new T.MeshStandardMaterial({
        color: toneColor,
        emissive: toneColor,
        emissiveIntensity: 0.65,
        roughness: 0.35
      })
    );
    mesh.position.copy(pos);
    mesh.userData = { type: 'phase', index: i };

    const halo = new T.Sprite(new T.SpriteMaterial({
      map: glowTex,
      color: toneColor,
      blending: T.AdditiveBlending,
      transparent: true,
      depthWrite: false
    }));
    halo.scale.set(13, 13, 1);
    mesh.add(halo);

    fasesGroup.add(mesh);
    phaseNodes.push({ mesh, halo, pos, toneColor });
  });

  phaseCurve = new T.CatmullRomCurve3(curvePts, true);
  const tubeGeom = new T.BufferGeometry().setFromPoints(phaseCurve.getPoints(140));
  fasesGroup.add(new T.Line(tubeGeom, new T.LineBasicMaterial({
    color: 0x5bb8ff,
    transparent: true,
    opacity: 0.55
  })));

  // Pulso viajero a lo largo del pipeline
  phaseSignal = new T.Sprite(new T.SpriteMaterial({
    map: glowTex,
    color: 0xb57bff,
    blending: T.AdditiveBlending,
    transparent: true,
    depthWrite: false
  }));
  phaseSignal.scale.set(10, 10, 1);
  fasesGroup.add(phaseSignal);

  fasesHitMeshes = phaseNodes.map(n => n.mesh);
  scene.add(fasesGroup);
  syncFasesVisuals();
}

export function syncFasesVisuals() {
  if (!isInitialized) return;
  phaseNodes.forEach((n, idx) => {
    const active = idx === fasesState.activeIdx;
    n.mesh.scale.setScalar(active ? 1.55 : 0.95);
    n.halo.scale.set(active ? 22 : 12, active ? 22 : 12, 1);
  });
}

/* ==========================================================================
   6. Controles e Interacción Unificada (Órbita + Zoom + Raycaster)
   ========================================================================== */
function pickTarget(clientX, clientY) {
  if (!renderer || !camera) return;
  const w = adaptiveViewport.width || window.innerWidth || 1;
  const h = adaptiveViewport.height || window.innerHeight || 1;
  pointerNDC.x = (clientX / w) * 2 - 1;
  pointerNDC.y = -(clientY / h) * 2 + 1;
  raycaster.setFromCamera(pointerNDC, camera);

  if (activeRoute === 'explorar') {
    const hits = exploreHitMeshes.length ? raycaster.intersectObjects(exploreHitMeshes, false) : [];
    const idx = hits.length ? hits[0].object.userData.index : -1;
    if (idx !== exploreState.hovered) {
      exploreState.hovered = idx;
      canvas.style.cursor = idx >= 0 ? 'pointer' : 'grab';
      if (hoverRing) {
        if (idx >= 0) {
          hoverRing.visible = true;
          hoverRing.position.copy(objEntries[idx].holder.position);
          hoverRing.lookAt(0, 0, VAULT_CENTER_Z);
        } else {
          hoverRing.visible = false;
        }
      }
      if (typeof exploreState.onHover === 'function') {
        exploreState.onHover(idx);
      }
    }
  } else if (activeRoute === 'fases') {
    const hits = fasesHitMeshes.length ? raycaster.intersectObjects(fasesHitMeshes, false) : [];
    canvas.style.cursor = hits.length ? 'pointer' : 'grab';
  }
}

function handleClick(clientX, clientY) {
  if (!renderer || !camera) return;
  const w = adaptiveViewport.width || window.innerWidth || 1;
  const h = adaptiveViewport.height || window.innerHeight || 1;
  pointerNDC.x = (clientX / w) * 2 - 1;
  pointerNDC.y = -(clientY / h) * 2 + 1;
  raycaster.setFromCamera(pointerNDC, camera);

  if (activeRoute === 'explorar') {
    const hits = exploreHitMeshes.length ? raycaster.intersectObjects(exploreHitMeshes, false) : [];
    if (hits.length) {
      const idx = hits[0].object.userData.index;
      if (typeof exploreState.onSelect === 'function') exploreState.onSelect(idx);
    }
  } else if (activeRoute === 'fases') {
    const hits = fasesHitMeshes.length ? raycaster.intersectObjects(fasesHitMeshes, false) : [];
    if (hits.length) {
      const idx = hits[0].object.userData.index;
      if (typeof fasesState.onSelectPhase === 'function') fasesState.onSelectPhase(idx);
    }
  }
}

function bindPointerEvents() {
  canvas.addEventListener('pointerdown', e => {
    activePointers.set(e.pointerId, e);
    dragDistance = 0;
  });

  window.addEventListener('pointermove', e => {
    const w = adaptiveViewport.width || window.innerWidth || 1;
    const h = adaptiveViewport.height || window.innerHeight || 1;
    cursorParallax.x = (e.clientX / w - 0.5) * 0.28;
    cursorParallax.y = (e.clientY / h - 0.5) * 0.18;
    if (activeRoute === 'inicio' || (activeRoute === 'explorar' && e.target === canvas)) {
      wakeLoop();
    }

    const prev = activePointers.get(e.pointerId);
    if (prev) {
      const dx = e.clientX - prev.clientX;
      const dy = e.clientY - prev.clientY;
      dragDistance += Math.hypot(dx, dy);

      if (activePointers.size === 1) {
        camGoal.t -= dx * 0.007;
        camGoal.p = Math.min(2.85, Math.max(0.2, camGoal.p - dy * 0.007));
        wakeLoop();
      }
      activePointers.set(e.pointerId, e);

      if (activePointers.size === 2) {
        const [p1, p2] = [...activePointers.values()];
        const dist = Math.hypot(p1.clientX - p2.clientX, p1.clientY - p2.clientY);
        if (lastPinchDist) {
          camGoal.r = Math.min(480, Math.max(16, camGoal.r * (lastPinchDist / dist)));
          wakeLoop();
        }
        lastPinchDist = dist;
      } else {
        lastPinchDist = 0;
      }
    } else if (activeRoute === 'explorar' || activeRoute === 'fases') {
      if (e.pointerType === 'touch') return;
      if (e.target !== canvas) {
        if (exploreState.hovered >= 0) {
          exploreState.hovered = -1;
          if (hoverRing) hoverRing.visible = false;
          canvas.style.cursor = 'grab';
          if (typeof exploreState.onHover === 'function') exploreState.onHover(-1);
        }
        return;
      }
      pendingPickX = e.clientX;
      pendingPickY = e.clientY;
      if (!rafPickId) {
        rafPickId = requestAnimationFrame(() => {
          rafPickId = 0;
          pickTarget(pendingPickX, pendingPickY);
        });
      }
    }
  }, { passive: true });

  window.addEventListener('pointerup', e => {
    if (activePointers.has(e.pointerId)) {
      if (dragDistance < 6 && activePointers.size === 1) {
        handleClick(e.clientX, e.clientY);
      }
      activePointers.delete(e.pointerId);
      lastPinchDist = 0;
    }
  });

  window.addEventListener('pointercancel', e => {
    activePointers.delete(e.pointerId);
    lastPinchDist = 0;
  });

  canvas.addEventListener('wheel', e => {
    if (activeRoute === 'inicio') return;
    e.preventDefault();
    camGoal.r = Math.min(460, Math.max(18, camGoal.r * (1 + e.deltaY * 0.001)));
    wakeLoop();
  }, { passive: false });
}

/* ==========================================================================
   7. Orquestación de Vistas, Transición de Cámara y Bucle Ponytail
   ========================================================================== */
export function getEclipsePortalState() {
  return {
    phase: eclipsePhase,
    warpT: Number(eclipseWarpT.toFixed(3)),
    visible: Boolean(eclipseRig && eclipseRig.visible),
    hasModel: Boolean(eclipseModelPivot),
    clipsCount: eclipseModelPivot?.userData?.clips?.length || 0,
    mixerTime: eclipseMixer ? Number(eclipseMixer.time.toFixed(3)) : 0
  };
}

let adaptiveViewport = {
  width: 1280,
  height: 720,
  aspect: 1.778,
  dpr: 1,
  effectivePixelRatio: 1,
  qualityTier: 'hd',
  fitRadius: 132
};

function computeQualityProfile(w, h) {
  const safeW = Math.max(1, Number(w) || 1280);
  const safeH = Math.max(1, Number(h) || 720);
  const dpr = Math.max(1, Number(window.devicePixelRatio) || 1);
  const reducedMotion = Boolean(window.matchMedia?.('(prefers-reduced-motion: reduce)').matches);
  const cores = Number(navigator.hardwareConcurrency) || 4;
  const isPriorityWorkspace = Math.min(safeW, safeH) >= 600 && cores >= 4;
  const maxDpr = reducedMotion ? 1.5 : 2.5;
  const pixelBudget = reducedMotion
    ? 1_600_000
    : (isPriorityWorkspace ? 3_800_000 : 2_000_000);
  const cssPixels = safeW * safeH;
  const budgetCap = Math.sqrt(pixelBudget / Math.max(1, cssPixels));
  const effectivePixelRatio = Number(Math.max(1, Math.min(dpr, maxDpr, budgetCap)).toFixed(3));
  const effectivePixels = cssPixels * effectivePixelRatio * effectivePixelRatio;
  let qualityTier = 'standard';
  if (reducedMotion) qualityTier = 'eco';
  else if (effectivePixels >= 2_500_000 && Math.max(safeW, safeH) >= 1440) qualityTier = 'uhd';
  else if (isPriorityWorkspace || cssPixels >= 750_000) qualityTier = 'hd';
  return { dpr, effectivePixelRatio, qualityTier };
}

function computeAdaptiveDistance(baseR, minAspect, w, h) {
  const safeW = Math.max(1, Number(w) || 1280);
  const safeH = Math.max(1, Number(h) || 720);
  const aspect = safeW / safeH;
  const aspectScale = aspect < minAspect ? Math.min(1.72, minAspect / Math.max(0.46, aspect)) : 1;
  const shortViewportScale = safeH < 760 && safeW >= 780
    ? 1 + Math.min(0.14, ((760 - safeH) / 760) * 0.35)
    : 1;
  return Number((baseR * aspectScale * shortViewportScale).toFixed(2));
}

function getRouteFitRadius(route, w = window.innerWidth, h = window.innerHeight) {
  if (route === 'explorar') return computeAdaptiveDistance(132, 1.38, w, h);
  if (route === '3d') {
    const distances = { Sistema: 168, Cometa: 30, Cinturón: 78 };
    return computeAdaptiveDistance(distances[focus3D] || 168, 1.25, w, h);
  }
  if (route === 'fases') return computeAdaptiveDistance(128, 1.25, w, h);
  return computeAdaptiveDistance(165, 1.15, w, h);
}

function applyAdaptiveCameraForRoute(route = activeRoute) {
  const w = window.innerWidth || adaptiveViewport.width;
  const h = window.innerHeight || adaptiveViewport.height;
  const fitR = getRouteFitRadius(route, w, h);
  adaptiveViewport.fitRadius = fitR;
  camGoal.r = fitR;
  if (route === 'explorar') {
    camGoal.ty = h < 760 && w >= 780 ? -2 : 0;
  }
  return fitR;
}

export function getAdaptiveViewportState() {
  return { ...adaptiveViewport };
}

export function getBovedaModelState() {
  return {
    loaded: bovedaModelLoaded,
    hasAstrolabe: Boolean(bovedaAstrolabe),
    hasDome: Boolean(healpixDome),
    hasBezel: Boolean(cutoutFrame),
    polycount: bovedaPolycount,
    rafActive: Boolean(rafId)
  };
}

export function triggerWarpZoom() {
  if (!isInitialized) return;
  if (window.__skyReducedMotion) {
    eclipsePhase = 'done';
    if (eclipseRig) eclipseRig.visible = false;
    return;
  }
  updateEclipseSlotRect();
  eclipsePhase = 'transition';
  eclipseWarpT = 0;
  if (eclipseRig) eclipseRig.visible = true;
  isWarpingFromInicio = true;
  warpBoost = 1;
  camGoal.r = 22;
  wakeLoop();
}

export function setCosmosRoute(route) {
  const prev = activeRoute;
  activeRoute = route;
  if (!isInitialized) return;

  if (inicioGroup) inicioGroup.visible = route === 'inicio';
  if (explorarGroup) explorarGroup.visible = route === 'explorar';
  if (sistemaGroup) sistemaGroup.visible = route === '3d';
  if (fasesGroup) fasesGroup.visible = route === 'fases';

  if (route === 'inicio') {
    canvas.style.cursor = 'default';
    isWarpingFromInicio = false;
    warpBoost = 0;
    eclipsePhase = 'idle';
    eclipseWarpT = 0;
    resetEclipseMaterials();
    updateEclipseSlotRect();
    if (eclipseRig) eclipseRig.visible = true;
    if (inicioGroup) inicioGroup.scale.set(1, 1, 1);
    if (camera && camera.fov !== 50) {
      camera.fov = 50;
      camera.updateProjectionMatrix();
    }
    Object.assign(camGoal, { t: 0.4, p: 1.48, r: getRouteFitRadius('inicio'), tx: 0, ty: 0, tz: 0 });
    adaptiveViewport.fitRadius = camGoal.r;
  } else if (route === 'explorar') {
    canvas.style.cursor = 'grab';
    eclipsePhase = 'done';
    if (eclipseRig) eclipseRig.visible = false;
    const fitR = applyAdaptiveCameraForRoute('explorar');
    if (prev === 'inicio' && isWarpingFromInicio) {
      camCurr.r = fitR + 18; // entra haciendo zoom hacia la bóveda desde el hiperespacio
      warpBoost = Math.min(warpBoost, 0.2);
    }
    isWarpingFromInicio = false;
    Object.assign(camGoal, { t: Math.PI / 2, p: 1.54, r: fitR, tx: 0, ty: camGoal.ty, tz: 0 });
    syncExplorarVisuals();
  } else if (route === '3d') {
    canvas.style.cursor = 'grab';
    eclipsePhase = 'done';
    if (eclipseRig) eclipseRig.visible = false;
    set3DFocus(focus3D);
  } else if (route === 'fases') {
    canvas.style.cursor = 'grab';
    eclipsePhase = 'done';
    if (eclipseRig) eclipseRig.visible = false;
    focusPhaseNode(fasesState.activeIdx);
  }

  if (!hasRoutedOnce) {
    Object.assign(camCurr, camGoal);
    hasRoutedOnce = true;
  }

  wakeLoop();
}

export function set3DFocus(focusName) {
  focus3D = focusName;
  const fitR = getRouteFitRadius('3d');
  camGoal.r = fitR;
  if (activeRoute === '3d') adaptiveViewport.fitRadius = fitR;
  camGoal.p = focusName === 'Cometa' ? 1.15 : 1.05;
  const infoEl = document.getElementById('fi');
  if (infoEl) infoEl.textContent = FI[focusName] || '';
  document.querySelectorAll('#fc [data-f]').forEach(b => b.classList.toggle('on', b.dataset.f === focusName));
  wakeLoop();
}

export function toggle3DPlay() {
  isPlaying3D = !isPlaying3D;
  wakeLoop();
  return isPlaying3D;
}

export function adjust3DZoom(factor) {
  camGoal.r = Math.min(460, Math.max(18, camGoal.r * factor));
  wakeLoop();
}

export function focusPhaseNode(idx) {
  fasesState.activeIdx = idx;
  if (!isInitialized) return;
  syncFasesVisuals();
  const n = phaseNodes[idx];
  if (n) {
    const a = Math.atan2(n.pos.z, n.pos.x);
    camGoal.t = a + 0.35;
    camGoal.p = 1.25 - idx * 0.05;
    const fitR = getRouteFitRadius('fases');
    camGoal.r = fitR;
    if (activeRoute === 'fases') adaptiveViewport.fitRadius = fitR;
    camGoal.tx = n.pos.x * 0.25;
    camGoal.ty = n.pos.y * 0.35;
    camGoal.tz = n.pos.z * 0.25;
  }
  wakeLoop();
}

export function updateExploreState(patch) {
  if ('blink' in patch && patch.blink !== exploreState.blink) {
    blinkAccumMs = 0;
  }
  Object.assign(exploreState, patch);
  if (isInitialized) syncExplorarVisuals();
  wakeLoop();
}

export function updateFasesHandlers(handlers) {
  Object.assign(fasesState, handlers);
}

function wakeLoop() {
  if (isInitialized && isVisible && !rafId) {
    lastLoopTs = 0;
    rafId = requestAnimationFrame(renderLoop);
  }
}

function renderLoop(now = performance.now()) {
  if (!isInitialized || !isVisible || !camera) {
    rafId = 0;
    return;
  }

  const prevTs = lastLoopTs;
  const dt = prevTs ? Math.min(100, Math.max(0, now - prevTs)) : 16.667;
  lastLoopTs = now;
  const frameScale = Math.min(2.5, Math.max(0.25, dt / 16.667));
  const reduced = Boolean(window.__skyReducedMotion);

  if (!reduced && prevTs > 0 && dt < 80) {
    emaFrameMs = emaFrameMs * 0.9 + dt * 0.1;
    if (
      emaFrameMs > 30 &&
      now - lastPerfAdjustTs > 1500 &&
      adaptiveViewport.effectivePixelRatio > 1 &&
      renderer
    ) {
      lastPerfAdjustTs = now;
      const nextDpr = Math.max(1, Number((adaptiveViewport.effectivePixelRatio * 0.88).toFixed(3)));
      if (nextDpr < adaptiveViewport.effectivePixelRatio) {
        adaptiveViewport.effectivePixelRatio = nextDpr;
        renderer.setPixelRatio(nextDpr);
        renderer.setSize(adaptiveViewport.width, adaptiveViewport.height, false);
        emaFrameMs = 16.7;
      }
    }
  }

  const targetVaultRotY = reduced ? 0 : cursorParallax.x * 0.04;
  const targetVaultRotX = reduced ? 0 : cursorParallax.y * 0.03;

  if (!reduced) {
    simTime += activeRoute === '3d' ? (isPlaying3D ? 0.016 * frameScale * cachedSpeed3D : 0) : 0.016 * frameScale;
  }

  // Animación por escena activa
  if (activeRoute === 'inicio' && inicioGroup) {
    if (!reduced) {
      if (isWarpingFromInicio) {
        const s = 1 + (1 - Math.min(1, camCurr.r / 165)) * 0.65;
        inicioGroup.scale.set(s, s, s);
      }
      inicioGroup.rotation.y += (0.00055 + (isWarpingFromInicio ? 0.006 : 0)) * frameScale;
      if (inicioRing) inicioRing.rotation.z += 0.0011 * frameScale;
      if (inicioOuterRing) inicioOuterRing.rotation.y -= 0.00085 * frameScale;
      if (inicioNearLayer) {
        inicioNearLayer.rotation.y += 0.00045 * frameScale;
        inicioNearLayer.position.x = -cursorParallax.x * 26;
        inicioNearLayer.position.y = cursorParallax.y * 18;
      }
      if (inicioMidLayer) {
        inicioMidLayer.position.x = -cursorParallax.x * 11;
        inicioMidLayer.position.y = cursorParallax.y * 8;
      }
      if (inicioNebula) {
        inicioNebula.position.x = -cursorParallax.x * 16;
        inicioNebula.position.y = cursorParallax.y * 12;
      }
      for (let i = 0; i < inicioNodes.length; i++) {
        const n = inicioNodes[i];
        const s = n.baseScale * (0.88 + 0.22 * Math.sin(simTime * 2.1 + n.phase));
        n.sprite.scale.set(s, s, 1);
      }
      for (let m = 0; m < inicioMeteors.length; m++) {
        const mt = inicioMeteors[m];
        const phase = ((simTime + mt.offset) % mt.period) / mt.period;
        const active = phase < 0.22;
        mt.line.visible = active;
        if (active) {
          const u = phase / 0.22;
          mt.line.material.opacity = Math.sin(u * Math.PI) * 0.78;
          const attr = mt.line.geometry.attributes.position;
          for (let s = 0; s < mt.segs; s++) {
            const p = Math.max(0, u - s * 0.024);
            const x = -95 + p * 190;
            const y = mt.baseY + x * mt.tiltZ - p * p * 18;
            const z = -45 + p * 60;
            attr.setXYZ(s, x, y, z);
          }
          attr.needsUpdate = true;
        }
      }
    }
    camGoal.t = 0.4 + cursorParallax.x * 1.15;
    camGoal.p = 1.48 + cursorParallax.y * 1.15;
  } else if (activeRoute === 'explorar' && explorarGroup) {
    if (!reduced) {
      // Parallax suave sobre el grupo del plano focal independiente de la tasa de refresco
      const parallaxK = 1 - Math.pow(0.88, frameScale);
      explorarGroup.rotation.y += (targetVaultRotY - explorarGroup.rotation.y) * parallaxK;
      explorarGroup.rotation.x += (targetVaultRotX - explorarGroup.rotation.x) * parallaxK;
      if (Math.abs(targetVaultRotY - explorarGroup.rotation.y) < 0.0002) {
        explorarGroup.rotation.y = targetVaultRotY;
      }
      if (Math.abs(targetVaultRotX - explorarGroup.rotation.x) < 0.0002) {
        explorarGroup.rotation.x = targetVaultRotX;
      }

      if (bovedaAstrolabe) {
        bovedaAstrolabe.rotation.z += 0.0018 * frameScale;
      }
      for (let i = 0; i < objEntries.length; i++) {
        const entry = objEntries[i];
        if (entry.model3D && entry.data[1] === 'Asteroide' && entry.holder.visible) {
          const spin = (entry.data[0] === 'Candidato SPX-26' ? 0.018 : 0.01) * frameScale;
          entry.model3D.rotation.y += spin;
          entry.model3D.rotation.x += spin * 0.65;
        }
      }

      if (exploreState.blink && typeof exploreState.onBlinkTick === 'function') {
        blinkAccumMs += dt;
        if (blinkAccumMs >= 920) {
          blinkAccumMs = 0;
          exploreState.onBlinkTick();
        }
      }
    } else {
      explorarGroup.rotation.set(0, 0, 0);
    }
  } else if (activeRoute === '3d' && sistemaGroup) {
    if (isPlaying3D && !reduced) {
      for (let i = 0; i < planets.length; i++) {
        const p = planets[i];
        p.mesh.position.set(
          Math.cos(simTime * p.speed + p.angle) * p.dist,
          0,
          Math.sin(simTime * p.speed + p.angle) * p.dist
        );
      }
      if (beltPoints) beltPoints.rotation.y = simTime * 0.03;

      let E = simTime * 0.25;
      for (let i = 0; i < 6; i++) E = simTime * 0.25 + 0.82 * Math.sin(E);
      cometHead.position.set(70 * (Math.cos(E) - 0.82), 0, 40 * Math.sin(E));

      const d = cometHead.position.length() || 1;
      _tmpVecA.copy(cometHead.position).normalize();
      const len = Math.min(46, 700 / d);
      const posAttr = cometTail.geometry.attributes.position;
      for (let i = 0; i < 50; i++) {
        const k = len * (i / 50);
        posAttr.setXYZ(
          i,
          cometHead.position.x + _tmpVecA.x * k,
          cometHead.position.y + _tmpVecA.y * k,
          cometHead.position.z + _tmpVecA.z * k
        );
      }
      posAttr.needsUpdate = true;
    }

    if (focus3D === 'Cometa' && cometHead) {
      cometHead.getWorldPosition(_tmpVecB);
      camGoal.tx = _tmpVecB.x;
      camGoal.ty = _tmpVecB.y;
      camGoal.tz = _tmpVecB.z;
    } else {
      camGoal.tx = 0;
      camGoal.ty = 0;
      camGoal.tz = 0;
    }

    if (!activePointers.size && !reduced && focus3D === 'Sistema' && isPlaying3D) {
      camGoal.t += 0.0012 * frameScale;
    }
  } else if (activeRoute === 'fases' && fasesGroup) {
    if (!reduced) {
      if (fasesCore) fasesCore.rotation.y += 0.0022 * frameScale;
      if (fasesCones) {
        fasesCones.rotation.y -= 0.0065 * frameScale;
        fasesCones.rotation.x = Math.sin(simTime * 0.5) * 0.35;
      }
      if (phaseSignal && phaseCurve) {
        phaseCurve.getPointAt((simTime * 0.09) % 1, phaseSignal.position);
      }
      if (!activePointers.size) camGoal.t += 0.0008 * frameScale;
    }
  }

  // Decaimiento suave de hiper-zoom warp al cruzar desde #inicio hacia #explorar
  if (!reduced && warpBoost > 0.004) {
    if (!isWarpingFromInicio) warpBoost *= Math.pow(0.9, frameScale);
    camera.fov = 50 + warpBoost * 24;
    camera.updateProjectionMatrix();
  } else if (camera.fov !== 50) {
    warpBoost = 0;
    camera.fov = 50;
    camera.updateProjectionMatrix();
  }

  // Interpolación suave de cámara independiente del framerate con cierre limpio sin cola asintótica
  const baseLerp = isWarpingFromInicio ? 0.14 : 0.09;
  const lerpK = reduced ? 1 : (1 - Math.pow(1 - baseLerp, frameScale));
  camCurr.t += (camGoal.t - camCurr.t) * lerpK;
  camCurr.p += (camGoal.p - camCurr.p) * lerpK;
  camCurr.r += (camGoal.r - camCurr.r) * lerpK;
  camCurr.tx += (camGoal.tx - camCurr.tx) * lerpK;
  camCurr.ty += (camGoal.ty - camCurr.ty) * lerpK;
  camCurr.tz += (camGoal.tz - camCurr.tz) * lerpK;

  if (Math.abs(camGoal.t - camCurr.t) < 0.002) camCurr.t = camGoal.t;
  if (Math.abs(camGoal.p - camCurr.p) < 0.002) camCurr.p = camGoal.p;
  if (Math.abs(camGoal.r - camCurr.r) < 0.1) camCurr.r = camGoal.r;
  if (Math.abs(camGoal.tx - camCurr.tx) < 0.05) camCurr.tx = camGoal.tx;
  if (Math.abs(camGoal.ty - camCurr.ty) < 0.05) camCurr.ty = camGoal.ty;
  if (Math.abs(camGoal.tz - camCurr.tz) < 0.05) camCurr.tz = camGoal.tz;

  camera.position.set(
    camCurr.tx + camCurr.r * Math.sin(camCurr.p) * Math.cos(camCurr.t),
    camCurr.ty + camCurr.r * Math.cos(camCurr.p),
    camCurr.tz + camCurr.r * Math.sin(camCurr.p) * Math.sin(camCurr.t)
  );
  camera.lookAt(camCurr.tx, camCurr.ty, camCurr.tz);
  camera.updateMatrixWorld(true);
  updateEclipsePortalFrame(dt * 0.001);

  if (starField) {
    starField.position.copy(camera.position);
  }

  renderer.render(scene, camera);

  // Ponytail: dormir loop si reduced-motion, en #explorar en reposo sin blink, o en #3d pausado
  const vaultParallaxSettled = activeRoute !== 'explorar' || !explorarGroup || (
    Math.abs(explorarGroup.rotation.y - targetVaultRotY) < 0.0003 &&
    Math.abs(explorarGroup.rotation.x - targetVaultRotX) < 0.0003
  );
  const settled =
    eclipsePhase !== 'transition' &&
    warpBoost <= 0.004 &&
    Math.abs(camCurr.r - camGoal.r) < 0.05 &&
    Math.abs(camCurr.t - camGoal.t) < 0.002 &&
    Math.abs(camCurr.p - camGoal.p) < 0.002 &&
    vaultParallaxSettled &&
    activePointers.size === 0;
  if (
    (reduced && settled) ||
    (activeRoute === 'explorar' && !exploreState.blink && settled) ||
    (activeRoute === '3d' && !isPlaying3D && settled)
  ) {
    rafId = 0;
    return;
  }

  rafId = requestAnimationFrame(renderLoop);
}

export async function initCosmos3D(initialRoute = 'inicio') {
  if (isInitialized) {
    setCosmosRoute(initialRoute);
    return;
  }

  canvas = document.getElementById('cosmos');
  if (!canvas) return;

  const stateHost = document.getElementById('cosmos-state');
  const slotEl = document.querySelector('#inicio .eclipse-o');
  if (slotEl && initialRoute === 'inicio') {
    renderState(slotEl, { state: 'loading', variant: 'slot' });
  }

  try {
    T = await ensureThreeLoaded();
    const initW = window.innerWidth || 1280;
    const initH = window.innerHeight || 720;
    const powerPreference = Math.max(initW, initH) >= 900 ? 'high-performance' : 'default';
    renderer = new T.WebGLRenderer({ canvas, antialias: true, powerPreference, alpha: false });
  } catch (err) {
    if (slotEl) slotEl.replaceChildren();
    renderState(stateHost, {
      state: 'error',
      title: 'No se pudo iniciar el lienzo 3D',
      detail: 'WebGL no está activo o falló la carga del motor local. Puedes reintentar o usar el Laboratorio FITS.',
      actionLabel: 'Reintentar 3D',
      onAction: () => {
        clearState(stateHost);
        initCosmos3D(activeRoute);
      }
    });
    return;
  }

  clearState(stateHost);
  _tmpVecA = new T.Vector3();
  _tmpVecB = new T.Vector3();
  scene = new T.Scene();
  camera = new T.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.5, 3200);
  raycaster = new T.Raycaster();
  raycaster.params.Points.threshold = 4;

  const speedSlider = document.getElementById('sp');
  if (speedSlider) {
    const syncSpeed = () => {
      const v = parseFloat(speedSlider.value);
      cachedSpeed3D = Number.isFinite(v) ? v : 1;
    };
    syncSpeed();
    speedSlider.addEventListener('input', syncSpeed, { passive: true });
    speedSlider.addEventListener('change', syncSpeed, { passive: true });
  }

  renderer.setClearColor(0x000000, 1);
  renderer.setPixelRatio(computeQualityProfile(window.innerWidth, window.innerHeight).effectivePixelRatio);

  scene.add(new T.AmbientLight(0xffffff, 0.45), new T.PointLight(0xffffff, 1.8));

  buildSharedStarfield();
  buildInicioScene();
  buildEclipsePortal();
  buildExplorarScene();
  buildSistemaScene();
  buildFasesScene();

  let dprMediaQuery = null;
  let dprMediaHandler = null;

  const onResize = () => {
    const w = window.innerWidth;
    const h = window.innerHeight;
    if (!w || !h) return;
    emaFrameMs = 16.7;
    const profile = computeQualityProfile(w, h);
    renderer.setPixelRatio(profile.effectivePixelRatio);
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    adaptiveViewport = {
      width: w,
      height: h,
      aspect: Number((w / h).toFixed(3)),
      dpr: profile.dpr,
      effectivePixelRatio: profile.effectivePixelRatio,
      qualityTier: profile.qualityTier,
      fitRadius: applyAdaptiveCameraForRoute(activeRoute)
    };
    updateEclipseSlotRect();
    wakeLoop();
  };

  const watchDprChange = () => {
    if (dprMediaQuery && dprMediaHandler) {
      dprMediaQuery.removeEventListener('change', dprMediaHandler);
    }
    if (typeof window.matchMedia !== 'function') return;
    const currentDpr = window.devicePixelRatio || 1;
    dprMediaQuery = window.matchMedia(`(resolution: ${currentDpr}dppx)`);
    dprMediaHandler = () => {
      watchDprChange();
      onResize();
    };
    dprMediaQuery.addEventListener('change', dprMediaHandler, { once: true });
  };

  window.addEventListener('resize', onResize, { passive: true });
  window.visualViewport?.addEventListener('resize', onResize, { passive: true });
  watchDprChange();
  onResize();

  bindPointerEvents();
  isInitialized = true;
  setCosmosRoute(initialRoute);
}

export function setCosmosVisible(visible) {
  isVisible = visible;
  if (visible) wakeLoop();
  else if (rafId) {
    cancelAnimationFrame(rafId);
    rafId = 0;
  }
}
