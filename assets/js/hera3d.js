/**
 * H.E.R.A 7 — imagen real (hera.webp) con volumen 3D solo donde se nota:
 * casco/visor (bulto esférico + brillo especular) y torso (relieve suave).
 * Ponytail: un solo plano 48x48, render SOLO bajo demanda (puntero/clic), pausa con document.hidden.
 */
export function initHera3d(button, onLaugh) {
  const existingCv = button.querySelector('.hera-3d');
  if (existingCv) existingCv.remove();
  const img = button.querySelector('img');
  if (!img || !img.src || img.hidden) return;
  const load = window.THREE ? Promise.resolve() : new Promise((ok, no) => {
    const s = document.createElement('script');
    s.src = 'assets/js/vendor/three.min.js'; s.onload = ok; s.onerror = no;
    document.head.appendChild(s);
  });
  const src = new Image();
  src.src = img.src;
  Promise.all([load, src.decode()]).then(() => build(window.THREE, button, img, src, onLaugh)).catch(() => {});
}

function build(T, button, img, src, onLaugh) {
  let renderer;
  try { renderer = new T.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'low-power' }); } catch { return; }
  const W = 2.6, H = W * src.naturalHeight / src.naturalWidth;
  const getBoxSize = () => {
    const rect = button.getBoundingClientRect();
    const side = Math.round(Math.max(rect.width || 0, rect.height || 0));
    return side >= 24 ? side : 112;
  };
  let lastSize = getBoxSize();
  let lastDpr = Math.min(window.devicePixelRatio || 1, 2.5);
  renderer.setPixelRatio(lastDpr);
  renderer.setSize(lastSize, lastSize);
  const cv = renderer.domElement;
  cv.style.maxWidth = '100%';
  cv.style.maxHeight = '100%';
  cv.className = 'hera-3d';
  cv.setAttribute('aria-hidden', 'true');

  // Textura 2x suavizada; el negro del fondo pasa a transparente (clave suave por luminancia)
  const c = document.createElement('canvas');
  c.width = src.naturalWidth * 2; c.height = src.naturalHeight * 2;
  const g = c.getContext('2d');
  g.imageSmoothingQuality = 'high';
  g.drawImage(src, 0, 0, c.width, c.height);
  const d = g.getImageData(0, 0, c.width, c.height), p = d.data;
  const lum = new Uint8Array(c.width * c.height);
  for (let i = 0, j = 0; i < p.length; i += 4, j++) {
    const m = Math.max(p[i], p[i + 1], p[i + 2]);
    lum[j] = m; p[i + 3] = Math.min(255, m * 9);
  }
  g.putImageData(d, 0, 0);
  const map = new T.CanvasTexture(c);
  map.anisotropy = 4;

  // Relieve: casco esférico + torso redondeado + hombros que retroceden
  const seg = 48, geo = new T.PlaneGeometry(W, H, seg, seg), pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const u = pos.getX(i) / W, v = pos.getY(i) / H + 0.5;
    const r = Math.hypot(u, (v - 0.7) * H / W) / 0.3;
    const helmet = Math.sqrt(Math.max(0, 1 - r * r)) * 0.55;
    const body = v < 0.62 ? 0.2 * Math.max(0, 1 - (2 * u) ** 2) : 0;
    pos.setZ(i, helmet + body);
  }
  geo.computeVertexNormals();

  const mat = new T.MeshStandardMaterial({ map, transparent: true, roughness: 0.55, metalness: 0.15, bumpMap: map, bumpScale: 1.6, side: T.DoubleSide });
  const root = new T.Group();
  root.add(new T.Mesh(geo, mat));

  // Brillo de cristal sobre el visor (esfera transparente brillante)
  const glass = new T.Mesh(
    new T.SphereGeometry(0.62, 32, 20, 0, Math.PI * 2, 0, Math.PI / 2),
    new T.MeshPhysicalMaterial({ color: 0xffffff, transparent: true, opacity: 0.1, roughness: 0.04, metalness: 0.2, clearcoat: 1, clearcoatRoughness: 0.03 }));
  glass.rotation.x = Math.PI / 2;
  glass.position.set(0, (0.7 - 0.5) * H + 0.02, 0.5);
  root.add(glass);

  const scene = new T.Scene();
  scene.add(root);
  scene.add(new T.AmbientLight(0xffffff, 0.8));
  const key = new T.DirectionalLight(0xffffff, 1.1); key.position.set(2, 3, 4); scene.add(key);
  const cam = new T.PerspectiveCamera(30, 1, 0.1, 30);
  cam.position.set(0, 0, 5.6);

  button.appendChild(cv);
  img.style.display = 'none';

  const st = { ty: 0, tp: 0, yaw: 0, pitch: 0, laugh: 0, raf: 0, last: 0 };
  const render = () => renderer.render(scene, cam);
  function tick(now) {
    if (document.body.dataset.route === 'inicio') { st.raf = 0; return; }
    const dt = Math.min((now - st.last) / 1000, 0.05); st.last = now;
    st.yaw += (st.ty - st.yaw) * 0.14; st.pitch += (st.tp - st.pitch) * 0.14;
    let sc = 1, roll = 0;
    if (st.laugh > 0) {
      st.laugh -= dt; const k = 1 - st.laugh / 0.9;
      sc = 1 + Math.abs(Math.sin(k * 22)) * 0.035 * (1 - k);
      roll = Math.sin(k * 30) * 0.05 * (1 - k);
    }
    root.rotation.set(st.pitch, st.yaw, roll);
    root.scale.setScalar(sc);
    key.position.x = 2 + st.yaw * 6; // el brillo recorre el casco al mover el cursor
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

  addEventListener('pointermove', e => {
    if (window.__skyReducedMotion || document.body.dataset.route === 'inicio') return;
    const r = cv.getBoundingClientRect();
    st.ty = Math.max(-0.5, Math.min(0.5, (e.clientX - (r.left + r.width / 2)) / innerWidth * 1.8));
    st.tp = Math.max(-0.3, Math.min(0.3, (e.clientY - (r.top + r.height / 2)) / innerHeight * 1.0));
    wake();
  }, { passive: true });
  button.addEventListener('click', () => { st.laugh = 0.9; wake(); onLaugh?.(); });
  document.addEventListener('visibilitychange', () => { if (!document.hidden) render(); });
  if (typeof ResizeObserver === 'function') {
    const ro = new ResizeObserver(() => {
      const nextSize = getBoxSize();
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
  render();
}
