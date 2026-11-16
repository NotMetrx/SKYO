/**
 * KRYO-9 / H.E.R.A 7 — Módulo 3D del Asistente en el Botón Circular (#ha)
 * - Modo por defecto: KRYO-9 acoplado en 3D tras su vuelo orbital, con gestos (Wave_Hello, Scan_Sky, Found_PlanetX)
 *   para explicar SPHEREx y la búsqueda sin afirmar descubrimientos.
 * - Modo avatar personalizado: si el usuario sube su imagen, conserva el relieve 2.5D con visor especular.
 * Filosofía Ponytail: render bajo demanda (gestos / puntero / resize), 0 rAF en reposo y pausa con document.hidden.
 */

const scriptPromises = new Map();
let dockController = null;
const liveFlight = {
  bankTarget: 0,
  pitchFlyTarget: 0,
  thrusterTarget: 0,
  flying: false,
  lookAt: null
};

export function setHeraFlightState({ vx = 0, vy = 0, speed = 0, flying = false, lookAt = null } = {}) {
  liveFlight.bankTarget = Math.max(-0.34, Math.min(0.34, -vx * 0.00055));
  liveFlight.pitchFlyTarget = Math.max(-0.18, Math.min(0.22, vy * 0.00038));
  liveFlight.thrusterTarget = flying ? Math.min(1, 0.35 + speed / 520) : 0;
  liveFlight.flying = Boolean(flying);
  liveFlight.lookAt = lookAt || null;
  dockController?.onFlightUpdate?.();
}

function loadScriptOnce(src, isReady) {
  if (isReady?.()) return Promise.resolve();
  if (scriptPromises.has(src)) return scriptPromises.get(src);
  const existing = [...document.scripts].find(s => s.getAttribute('src') === src || s.src?.endsWith(src));
  const p = new Promise((resolve, reject) => {
    if (existing) {
      if (existing.dataset.loaded === '1' || isReady?.()) {
        resolve();
        return;
      }
      existing.addEventListener('load', () => {
        existing.dataset.loaded = '1';
        resolve();
      }, { once: true });
      existing.addEventListener('error', reject, { once: true });
      return;
    }
    const s = document.createElement('script');
    s.src = src;
    s.onload = () => {
      s.dataset.loaded = '1';
      resolve();
    };
    s.onerror = reject;
    document.head.appendChild(s);
  });
  scriptPromises.set(src, p);
  return p;
}

async function ensureThreeAndGltf() {
  await loadScriptOnce('assets/js/vendor/three.min.js', () => Boolean(window.THREE));
  const T = window.THREE;
  await loadScriptOnce('assets/js/vendor/DRACOLoader.js', () => Boolean(T.DRACOLoader));
  await loadScriptOnce('assets/js/vendor/GLTFLoader.js', () => Boolean(T.GLTFLoader));
  await loadScriptOnce('assets/js/vendor/RoomEnvironment.js', () => Boolean(T.RoomEnvironment));
  return T;
}

function cleanupHost(button) {
  if (!button) return;
  if (typeof button._heraCleanup === 'function') {
    button._heraCleanup();
    button._heraCleanup = null;
  }
  button.querySelectorAll('.hera-3d, .kryo-dock-3d').forEach(el => el.remove());
  button.classList.remove('is-kryo');
  dockController = null;
}

function getBoxSize(button, minDefault = 96) {
  const rect = button.getBoundingClientRect();
  const side = Math.round(Math.max(rect.width || 0, rect.height || 0));
  return side >= 24 ? side : minDefault;
}

function createSafeTransparentWebGLRenderer(ThreeLib) {
  if (!ThreeLib) return null;
  const contextNames = ['webgl2', 'webgl', 'experimental-webgl'];
  const configs = [
    { alpha: true, antialias: true, powerPreference: 'low-power', failIfMajorPerformanceCaveat: false },
    { alpha: true, antialias: false, powerPreference: 'default', failIfMajorPerformanceCaveat: false },
    { alpha: true, antialias: false }
  ];
  for (const cfg of configs) {
    for (const kind of contextNames) {
      const offscreen = document.createElement('canvas');
      if (typeof offscreen.getContext !== 'function') return null;
      let ctx = null;
      try {
        ctx = offscreen.getContext(kind, cfg);
      } catch {
        ctx = null;
      }
      if (!ctx) continue;
      try {
        return new ThreeLib.WebGLRenderer({
          canvas: offscreen,
          context: ctx,
          antialias: cfg.antialias,
          alpha: true,
          powerPreference: cfg.powerPreference || 'default'
        });
      } catch {
        // Probar siguiente perfil WebGL en un canvas limpio
      }
    }
  }
  return null;
}

export function isKryoDockActive() {
  return Boolean(dockController && dockController.active);
}

export function getKryoDockState() {
  return {
    active: Boolean(dockController?.active),
    hasModel: Boolean(dockController?.hasModel),
    lastClip: dockController?.lastClip || null
  };
}

export function triggerKryoGesture(clipName = 'Wave_Hello', options = {}) {
  if (!dockController || !dockController.active) return false;
  dockController.lastClip = clipName;
  return dockController.playGesture(clipName, options);
}

export function disposeHeraHost(button) {
  cleanupHost(button);
}

/**
 * Monta KRYO-9 en 3D dentro del círculo #ha cuando no hay avatar subido por el usuario.
 */
export function initKryoDock(button, { initialGesture = 'Wave_Hello', onInteract } = {}) {
  if (!button) return;
  const img = document.getElementById('hera-img');
  if (img && !img.hidden && img.src) return;

  if (dockController && dockController.active && dockController.button === button) {
    if (initialGesture) dockController.playGesture(initialGesture, { duration: 1.4 });
    return;
  }

  cleanupHost(button);
  let disposed = false;
  let rafId = 0;
  let ro = null;
  let renderer = null;
  let pmrem = null;
  let envRT = null;

  const placeholder = document.getElementById('hera-placeholder');

  const controller = {
    active: true,
    button,
    playGesture: () => false
  };
  dockController = controller;

  ensureThreeAndGltf()
    .then(T => {
      if (disposed || !T || !T.GLTFLoader || !T.DRACOLoader) return;

      renderer = createSafeTransparentWebGLRenderer(T);
      if (!renderer) {
        controller.active = false;
        if (placeholder) placeholder.hidden = false;
        return;
      }

      let lastSize = getBoxSize(button, 148);
      let lastDpr = Math.min(window.devicePixelRatio || 1, 2.5);
      renderer.setPixelRatio(lastDpr);
      renderer.setSize(lastSize, lastSize, false);
      renderer.outputEncoding = T.sRGBEncoding;
      renderer.toneMapping = T.ACESFilmicToneMapping;
      renderer.toneMappingExposure = 1.08;

      const cv = renderer.domElement;
      cv.className = 'hera-3d kryo-dock-3d';
      cv.setAttribute('aria-hidden', 'true');
      cv.style.maxWidth = '100%';
      cv.style.maxHeight = '100%';

      const scene = new T.Scene();
      if (T.RoomEnvironment && T.PMREMGenerator) {
        pmrem = new T.PMREMGenerator(renderer);
        envRT = pmrem.fromScene(new T.RoomEnvironment(), 0.04);
        scene.environment = envRT.texture;
      }

      const keyLight = new T.DirectionalLight(0xfff4e6, 2.25);
      keyLight.position.set(2.8, 3.8, 4.4);
      const rimCyan = new T.DirectionalLight(0x38bdf8, 1.95);
      rimCyan.position.set(-3.2, 2.1, -2.0);
      const rimCoral = new T.PointLight(0xff784f, 1.15, 9);
      rimCoral.position.set(0.2, -1.4, 1.3);
      const hemi = new T.HemisphereLight(0xdbeafe, 0x0b1224, 0.9);
      scene.add(keyLight, rimCyan, rimCoral, hemi);

      const cam = new T.PerspectiveCamera(33, 1, 0.1, 30);
      cam.position.set(0, 0.03, 5.25);

      const pivot = new T.Group();
      scene.add(pivot);

      const draco = new T.DRACOLoader();
      draco.setDecoderPath('assets/js/vendor/draco/gltf/');
      const loader = new T.GLTFLoader();
      loader.setDRACOLoader(draco);

      let mixer = null;
      const actions = {};
      let currentAction = null;
      let headNode = null;
      const thrusterMats = [];
      const cyanMats = [];
      let microLifeTimer = 0;
      const st = {
        ty: -0.18,
        tp: 0.04,
        yaw: -0.18,
        pitch: 0.04,
        bank: 0,
        flyPitch: 0,
        thrusterMix: 0,
        floatPhase: 0,
        bounce: 0,
        gestureLeft: 0,
        last: 0
      };

      const renderFrame = () => {
        if (disposed || !renderer) return;
        renderer.render(scene, cam);
      };

      const syncLookTarget = () => {
        if (!liveFlight.lookAt) return false;
        const r = cv.getBoundingClientRect();
        if (!r.width) return false;
        const cx = r.left + r.width * 0.5;
        const cy = r.top + r.height * 0.5;
        const dx = (liveFlight.lookAt.x - cx) / Math.max(260, window.innerWidth * 0.6);
        const dy = (liveFlight.lookAt.y - cy) / Math.max(260, window.innerHeight * 0.6);
        st.ty = Math.max(-0.68, Math.min(0.68, dx * 0.95));
        st.tp = Math.max(-0.34, Math.min(0.38, dy * 0.65));
        return true;
      };

      const scheduleMicroLife = () => {
        clearTimeout(microLifeTimer);
        if (disposed || document.hidden || window.__skyReducedMotion || document.body.dataset.route === 'inicio') return;
        microLifeTimer = setTimeout(() => {
          microLifeTimer = 0;
          if (disposed || document.hidden || window.__skyReducedMotion || document.body.dataset.route === 'inicio') return;
          if (liveFlight.flying || st.gestureLeft > 0.1 || !mixer) {
            scheduleMicroLife();
            return;
          }
          playClip('Scan_Sky', {
            fade: 0.35,
            loopOnce: true,
            timeScale: 0.9,
            duration: 1.25,
            fromAutoReturn: true
          });
        }, 7600);
      };

      const wake = () => {
        if (disposed || rafId || document.hidden || document.body.dataset.route === 'inicio') return;
        clearTimeout(microLifeTimer);
        st.last = performance.now();
        rafId = requestAnimationFrame(tick);
      };

      controller.onFlightUpdate = () => {
        syncLookTarget();
        if (liveFlight.flying || liveFlight.thrusterTarget > 0.02 || st.thrusterMix > 0.02 || liveFlight.lookAt) {
          wake();
        }
      };

      const playClip = (name, { fade = 0.24, loopOnce = true, timeScale = 1, duration = 1.45, fromAutoReturn = false } = {}) => {
        if (!mixer) return false;
        const next = actions[name] || actions.Idle_Float;
        if (!next) return false;
        if (!fromAutoReturn) controller.lastClip = name;
        if (window.__skyReducedMotion) {
          next.reset().setEffectiveTimeScale(1).setEffectiveWeight(1).play();
          mixer.update(0.08);
          renderFrame();
          return true;
        }
        next.reset();
        next.enabled = true;
        next.setEffectiveTimeScale(timeScale);
        next.setEffectiveWeight(1);
        next.setLoop(loopOnce ? T.LoopOnce : T.LoopRepeat, loopOnce ? 1 : Infinity);
        next.clampWhenFinished = loopOnce;
        if (currentAction && currentAction !== next) {
          currentAction.crossFadeTo(next, fade, true);
        }
        next.play();
        currentAction = next;
        st.gestureLeft = Math.max(st.gestureLeft, duration);
        wake();
        return true;
      };

      controller.playGesture = (clipName = 'Wave_Hello', opts = {}) => playClip(clipName, opts);

      function tick(now) {
        if (disposed || document.hidden || document.body.dataset.route === 'inicio') {
          rafId = 0;
          return;
        }
        const dt = Math.min((now - st.last) / 1000, 0.05);
        st.last = now;

        syncLookTarget();
        st.yaw += (st.ty - st.yaw) * 0.14;
        st.pitch += (st.tp - st.pitch) * 0.14;
        st.bank += (liveFlight.bankTarget - st.bank) * 0.16;
        st.flyPitch += (liveFlight.pitchFlyTarget - st.flyPitch) * 0.16;
        st.thrusterMix += (liveFlight.thrusterTarget - st.thrusterMix) * 0.16;
        st.floatPhase += dt * (liveFlight.flying ? 3.2 : 1.9);

        let sc = 1;
        let roll = st.bank;
        if (st.bounce > 0) {
          st.bounce = Math.max(0, st.bounce - dt);
          const k = 1 - st.bounce / 0.72;
          sc = 1 + Math.abs(Math.sin(k * 16)) * 0.045 * (1 - k);
          roll += Math.sin(k * 20) * 0.055 * (1 - k);
        }

        const bobY = Math.sin(st.floatPhase) * (liveFlight.flying ? 0.06 : 0.032);
        pivot.position.y = bobY;
        pivot.rotation.set(st.pitch + st.flyPitch, st.yaw, roll, 'YXZ');
        pivot.scale.setScalar(sc);

        for (const m of thrusterMats) {
          if (m.emissiveIntensity !== undefined) {
            m.emissiveIntensity = 2.1 + st.thrusterMix * 2.4;
          }
        }
        for (const m of cyanMats) {
          if (m.emissiveIntensity !== undefined) {
            m.emissiveIntensity = 1.75 + st.thrusterMix * 0.95;
          }
        }
        rimCoral.intensity = 1.15 + st.thrusterMix * 1.1;

        if (headNode && !window.__skyReducedMotion) {
          headNode.rotation.y = Math.max(-0.38, Math.min(0.38, (st.ty + 0.14) * 0.48));
          headNode.rotation.x = Math.max(-0.24, Math.min(0.28, (st.tp - 0.04) * 0.36));
        }

        if (mixer && (st.gestureLeft > 0 || liveFlight.flying)) {
          mixer.update(dt);
          if (st.gestureLeft > 0) st.gestureLeft = Math.max(0, st.gestureLeft - dt);
        }

        renderFrame();

        const rotSettled = Math.abs(st.ty - st.yaw) < 0.002 && Math.abs(st.tp - st.pitch) < 0.002 && Math.abs(st.bank) < 0.003 && Math.abs(st.flyPitch) < 0.003 && st.thrusterMix < 0.02;
        if (st.bounce > 0 || st.gestureLeft > 0 || liveFlight.flying || !rotSettled) {
          rafId = requestAnimationFrame(tick);
        } else {
          rafId = 0;
          scheduleMicroLife();
        }
      }

      const handlePointerMove = e => {
        if (window.__skyReducedMotion || document.body.dataset.route === 'inicio' || liveFlight.lookAt) return;
        const r = cv.getBoundingClientRect();
        if (!r.width) return;
        const dx = (e.clientX - (r.left + r.width * 0.5)) / Math.max(320, window.innerWidth);
        const dy = (e.clientY - (r.top + r.height * 0.5)) / Math.max(320, window.innerHeight);
        st.ty = Math.max(-0.62, Math.min(0.45, -0.18 + dx * 0.95));
        st.tp = Math.max(-0.28, Math.min(0.36, 0.04 + dy * 0.65));
        wake();
      };

      const handleClick = () => {
        st.bounce = 0.72;
        playClip('Wave_Hello', { duration: 1.4, timeScale: 1.15 });
        onInteract?.();
      };

      const handleVis = () => {
        if (document.hidden) {
          clearTimeout(microLifeTimer);
        } else if (document.body.dataset.route !== 'inicio') {
          renderFrame();
          if (!rafId) scheduleMicroLife();
        }
      };

      window.addEventListener('pointermove', handlePointerMove, { passive: true });
      button.addEventListener('click', handleClick);
      document.addEventListener('visibilitychange', handleVis);

      if (typeof ResizeObserver === 'function') {
        ro = new ResizeObserver(() => {
          const nextSize = getBoxSize(button, 148);
          const nextDpr = Math.min(window.devicePixelRatio || 1, 2.5);
          if (nextSize !== lastSize || nextDpr !== lastDpr) {
            lastSize = nextSize;
            lastDpr = nextDpr;
            renderer.setPixelRatio(nextDpr);
            renderer.setSize(nextSize, nextSize, false);
            if (!document.hidden) renderFrame();
          }
        });
        ro.observe(button);
      }

      button._heraCleanup = () => {
        disposed = true;
        clearTimeout(microLifeTimer);
        if (rafId) cancelAnimationFrame(rafId);
        rafId = 0;
        window.removeEventListener('pointermove', handlePointerMove);
        button.removeEventListener('click', handleClick);
        document.removeEventListener('visibilitychange', handleVis);
        ro?.disconnect();
        draco.dispose();
        envRT?.dispose();
        pmrem?.dispose();
        renderer?.dispose();
      };

      loader.load(
        './assets/models/kryo9.glb',
        gltf => {
          draco.dispose();
          if (disposed) return;

          const model = gltf.scene;
          const box = new T.Box3().setFromObject(model);
          const size = new T.Vector3();
          const center = new T.Vector3();
          box.getSize(size);
          box.getCenter(center);

          const normScale = 1.92 / Math.max(size.y, 0.5);
          model.position.set(-center.x * normScale, -center.y * normScale + 0.04, -center.z * normScale);
          model.scale.setScalar(normScale);

          model.traverse(obj => {
            if (!obj.isMesh || !obj.material) return;
            const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
            for (const m of mats) {
              if (m.name === 'Mat_InfraredThruster') {
                if (m.emissiveIntensity !== undefined) m.emissiveIntensity = 2.1;
                thrusterMats.push(m);
              } else if (m.name === 'Mat_CyanGlow' || m.name === 'Mat_CyanRing') {
                if (m.emissiveIntensity !== undefined) m.emissiveIntensity = 1.75;
                cyanMats.push(m);
              }
              if (m.name === 'Mat_VisorGlass') m.envMapIntensity = 1.6;
              else if (m.envMapIntensity !== undefined) m.envMapIntensity = 1.2;
            }
          });

          headNode = model.getObjectByName('Head') || null;
          pivot.add(model);

          const clips = gltf.animations || [];
          if (clips.length) {
            mixer = new T.AnimationMixer(model);
            for (const clip of clips) actions[clip.name] = mixer.clipAction(clip);
            mixer.addEventListener('finished', e => {
              if (!disposed && e.action !== actions.Idle_Float && actions.Idle_Float) {
                playClip('Idle_Float', { fade: 0.35, loopOnce: false, duration: 0.45, fromAutoReturn: true });
              }
            });
            playClip(initialGesture || 'Wave_Hello', {
              fade: 0.06,
              loopOnce: initialGesture !== 'Idle_Float',
              duration: 1.45,
              timeScale: 1.15
            });
          }

          if (placeholder) placeholder.hidden = true;
          controller.hasModel = true;
          button.classList.add('is-kryo');
          button.appendChild(cv);
          renderFrame();
        },
        undefined,
        () => {
          draco.dispose();
          controller.active = false;
          if (placeholder) placeholder.hidden = false;
        }
      );
    })
    .catch(() => {
      controller.active = false;
      if (placeholder) placeholder.hidden = false;
    });
}

/**
 * Modo avatar personalizado (hera-img): relieve 2.5D sobre plano 48×48 bajo demanda.
 */
export function initHera3d(button, onLaugh) {
  if (!button) return;
  const img = button.querySelector('img');
  if (!img || !img.src || img.hidden) {
    initKryoDock(button, { initialGesture: 'Wave_Hello', onInteract: onLaugh });
    return;
  }

  cleanupHost(button);
  let disposed = false;

  const load = window.THREE ? Promise.resolve() : loadScriptOnce('assets/js/vendor/three.min.js', () => Boolean(window.THREE));
  const src = new Image();
  src.src = img.src;
  Promise.all([load, src.decode()])
    .then(() => {
      if (!disposed) buildCustomAvatar(window.THREE, button, img, src, onLaugh);
    })
    .catch(() => {});

  button._heraCleanup = () => {
    disposed = true;
  };
}

function buildCustomAvatar(T, button, img, src, onLaugh) {
  let renderer;
  renderer = createSafeTransparentWebGLRenderer(T);
  if (!renderer) return;
  const W = 2.6;
  const H = W * src.naturalHeight / src.naturalWidth;
  let lastSize = getBoxSize(button, 96);
  let lastDpr = Math.min(window.devicePixelRatio || 1, 2.5);
  renderer.setPixelRatio(lastDpr);
  renderer.setSize(lastSize, lastSize);
  const cv = renderer.domElement;
  cv.style.maxWidth = '100%';
  cv.style.maxHeight = '100%';
  cv.className = 'hera-3d';
  cv.setAttribute('aria-hidden', 'true');

  const c = document.createElement('canvas');
  c.width = src.naturalWidth * 2;
  c.height = src.naturalHeight * 2;
  const g = c.getContext('2d');
  g.imageSmoothingQuality = 'high';
  g.drawImage(src, 0, 0, c.width, c.height);
  const d = g.getImageData(0, 0, c.width, c.height);
  const p = d.data;
  for (let i = 0; i < p.length; i += 4) {
    const m = Math.max(p[i], p[i + 1], p[i + 2]);
    p[i + 3] = Math.min(255, m * 9);
  }
  g.putImageData(d, 0, 0);
  const map = new T.CanvasTexture(c);
  map.anisotropy = 4;

  const seg = 48;
  const geo = new T.PlaneGeometry(W, H, seg, seg);
  const pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const u = pos.getX(i) / W;
    const v = pos.getY(i) / H + 0.5;
    const r = Math.hypot(u, (v - 0.7) * H / W) / 0.3;
    const helmet = Math.sqrt(Math.max(0, 1 - r * r)) * 0.55;
    const body = v < 0.62 ? 0.2 * Math.max(0, 1 - (2 * u) ** 2) : 0;
    pos.setZ(i, helmet + body);
  }
  geo.computeVertexNormals();

  const mat = new T.MeshStandardMaterial({
    map,
    transparent: true,
    roughness: 0.55,
    metalness: 0.15,
    bumpMap: map,
    bumpScale: 1.6,
    side: T.DoubleSide
  });
  const root = new T.Group();
  root.add(new T.Mesh(geo, mat));

  const glass = new T.Mesh(
    new T.SphereGeometry(0.62, 32, 20, 0, Math.PI * 2, 0, Math.PI / 2),
    new T.MeshPhysicalMaterial({ color: 0xffffff, transparent: true, opacity: 0.1, roughness: 0.04, metalness: 0.2, clearcoat: 1, clearcoatRoughness: 0.03 })
  );
  glass.rotation.x = Math.PI / 2;
  glass.position.set(0, (0.7 - 0.5) * H + 0.02, 0.5);
  root.add(glass);

  const scene = new T.Scene();
  scene.add(root);
  scene.add(new T.AmbientLight(0xffffff, 0.8));
  const key = new T.DirectionalLight(0xffffff, 1.1);
  key.position.set(2, 3, 4);
  scene.add(key);
  const cam = new T.PerspectiveCamera(30, 1, 0.1, 30);
  cam.position.set(0, 0, 5.6);

  button.appendChild(cv);
  img.style.display = 'none';

  const st = { ty: 0, tp: 0, yaw: 0, pitch: 0, laugh: 0, raf: 0, last: 0 };
  const render = () => renderer.render(scene, cam);
  function tick(now) {
    if (document.body.dataset.route === 'inicio') { st.raf = 0; return; }
    const dt = Math.min((now - st.last) / 1000, 0.05);
    st.last = now;
    st.yaw += (st.ty - st.yaw) * 0.14;
    st.pitch += (st.tp - st.pitch) * 0.14;
    let sc = 1;
    let roll = 0;
    if (st.laugh > 0) {
      st.laugh -= dt;
      const k = 1 - st.laugh / 0.9;
      sc = 1 + Math.abs(Math.sin(k * 22)) * 0.035 * (1 - k);
      roll = Math.sin(k * 30) * 0.05 * (1 - k);
    }
    root.rotation.set(st.pitch, st.yaw, roll);
    root.scale.setScalar(sc);
    key.position.x = 2 + st.yaw * 6;
    render();
    const settled = Math.abs(st.ty - st.yaw) < 0.002 && Math.abs(st.tp - st.pitch) < 0.002;
    st.raf = (st.laugh > 0 || !settled) && !document.hidden ? requestAnimationFrame(tick) : 0;
  }
  const wake = () => {
    if (!st.raf && !document.hidden && document.body.dataset.route !== 'inicio') {
      st.last = performance.now();
      st.raf = requestAnimationFrame(tick);
    }
  };

  const handleMove = e => {
    if (window.__skyReducedMotion || document.body.dataset.route === 'inicio') return;
    const r = cv.getBoundingClientRect();
    st.ty = Math.max(-0.5, Math.min(0.5, (e.clientX - (r.left + r.width / 2)) / innerWidth * 1.8));
    st.tp = Math.max(-0.3, Math.min(0.3, (e.clientY - (r.top + r.height / 2)) / innerHeight * 1.0));
    wake();
  };
  const handleClick = () => { st.laugh = 0.9; wake(); onLaugh?.(); };
  const handleVis = () => { if (!document.hidden) render(); };

  window.addEventListener('pointermove', handleMove, { passive: true });
  button.addEventListener('click', handleClick);
  document.addEventListener('visibilitychange', handleVis);

  let ro = null;
  if (typeof ResizeObserver === 'function') {
    ro = new ResizeObserver(() => {
      const nextSize = getBoxSize(button, 96);
      const nextDpr = Math.min(window.devicePixelRatio || 1, 2.5);
      if (nextSize !== lastSize || nextDpr !== lastDpr) {
        lastSize = nextSize;
        lastDpr = nextDpr;
        renderer.setPixelRatio(nextDpr);
        renderer.setSize(nextSize, nextSize);
        if (!document.hidden) render();
      }
    });
    ro.observe(button);
  }

  button._heraCleanup = () => {
    if (st.raf) cancelAnimationFrame(st.raf);
    window.removeEventListener('pointermove', handleMove);
    button.removeEventListener('click', handleClick);
    document.removeEventListener('visibilitychange', handleVis);
    ro?.disconnect();
    map.dispose();
    geo.dispose();
    mat.dispose();
    renderer.dispose();
  };

  render();
}
