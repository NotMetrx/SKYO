/**
 * SKYO — KRYO-9: Agente 3D de Bienvenida
 * Personaje procedural en Three.js: explorador orbital con casco, visor y propulsores.
 * Filosofía Ponytail: sin assets externos, geometría pura, animación en RAF unificado.
 */

/**
 * Construye el grupo Three.js de KRYO-9.
 * @param {object} T - window.THREE (r128)
 * @returns {{ rig: THREE.Group, update: (dt: number, t: number, parallax: {x,y}) => void, startLaunch: () => void, getLaunching: () => boolean, reset: () => void }}
 */
export function buildKryo9(T) {
  const rig = new T.Group();
  rig.name = 'KRYO9';

  // ── Paleta oficial SKYO ──────────────────────────────────────────────────
  const obsidian   = 0x07070a;
  const chrome     = 0xc9ced6;
  const sky        = 0x7cc8ff;
  const crimson    = 0xe11d48;
  const white      = 0xffffff;

  const matChrome  = new T.MeshStandardMaterial({ color: chrome,   metalness: 0.72, roughness: 0.26 });
  const matVisor   = new T.MeshStandardMaterial({ color: sky,      metalness: 0.35, roughness: 0.12, emissive: new T.Color(sky), emissiveIntensity: 0.55, transparent: true, opacity: 0.84 });
  const matDark    = new T.MeshStandardMaterial({ color: obsidian, metalness: 0.85, roughness: 0.32 });
  const matAcc     = new T.MeshStandardMaterial({ color: crimson,  metalness: 0.52, roughness: 0.38, emissive: new T.Color(crimson), emissiveIntensity: 0.45 });
  const matAntenna = new T.MeshStandardMaterial({ color: crimson,  metalness: 0.6,  roughness: 0.2,  emissive: new T.Color(crimson), emissiveIntensity: 0.6 });

  // ── Cuerpo ───────────────────────────────────────────────────────────────
  const body = new T.Mesh(
    new T.CylinderGeometry(0.38, 0.44, 1.1, 20, 1),
    matChrome
  );
  body.position.y = 0;
  rig.add(body);

  // Cinturón acento crimson
  const belt = new T.Mesh(
    new T.TorusGeometry(0.42, 0.045, 10, 36),
    matAcc
  );
  belt.rotation.x = Math.PI / 2;
  belt.position.y = 0.08;
  rig.add(belt);

  // ── Hombros (esferas laterales) ─────────────────────────────────────────
  [-1, 1].forEach(side => {
    const shoulder = new T.Mesh(new T.SphereGeometry(0.19, 14, 10), matChrome);
    shoulder.position.set(side * 0.54, 0.38, 0);
    rig.add(shoulder);
  });

  // ── Brazos ───────────────────────────────────────────────────────────────
  [-1, 1].forEach(side => {
    const arm = new T.Mesh(
      new T.CylinderGeometry(0.1, 0.09, 0.56, 12, 1),
      matDark
    );
    arm.position.set(side * 0.6, 0.1, 0);
    arm.rotation.z = side * 0.28;
    rig.add(arm);
  });

  // ── Casco ────────────────────────────────────────────────────────────────
  const helmet = new T.Mesh(
    new T.SphereGeometry(0.46, 22, 16),
    matChrome
  );
  helmet.position.y = 0.78;
  rig.add(helmet);

  // Visera frontal
  const visor = new T.Mesh(
    new T.SphereGeometry(0.33, 18, 12, 0, Math.PI * 2, 0, Math.PI * 0.55),
    matVisor
  );
  visor.position.set(0, 0.78, 0.22);
  visor.rotation.x = -0.3;
  rig.add(visor);

  // Acento superior casco
  const dome = new T.Mesh(
    new T.SphereGeometry(0.11, 12, 8),
    matAcc
  );
  dome.position.set(0, 1.22, 0);
  rig.add(dome);

  // ── Antena ───────────────────────────────────────────────────────────────
  const antennaPts = [new T.Vector3(0.12, 1.22, 0), new T.Vector3(0.22, 1.56, 0.06)];
  rig.add(new T.Line(
    new T.BufferGeometry().setFromPoints(antennaPts),
    new T.LineBasicMaterial({ color: chrome, transparent: true, opacity: 0.85 })
  ));
  const antennaTip = new T.Mesh(new T.SphereGeometry(0.04, 8, 6), matAntenna);
  antennaTip.position.set(0.22, 1.56, 0.06);
  rig.add(antennaTip);

  // ── Piernas ──────────────────────────────────────────────────────────────
  [-1, 1].forEach(side => {
    const leg = new T.Mesh(
      new T.CylinderGeometry(0.14, 0.11, 0.6, 12, 1),
      matDark
    );
    leg.position.set(side * 0.22, -0.75, 0);
    rig.add(leg);

    // Bota
    const boot = new T.Mesh(new T.CylinderGeometry(0.14, 0.17, 0.22, 12, 1), matChrome);
    boot.position.set(side * 0.22, -1.08, 0);
    rig.add(boot);
  });

  // ── Propulsores dorsales ─────────────────────────────────────────────────
  const jetGlows = [];

  [-1, 1].forEach((side) => {
    const jetPack = new T.Mesh(
      new T.CylinderGeometry(0.11, 0.09, 0.42, 10, 1),
      matDark
    );
    jetPack.position.set(side * 0.26, -0.1, -0.46);
    rig.add(jetPack);

    const nozzle = new T.Mesh(
      new T.CylinderGeometry(0.09, 0.14, 0.18, 10, 1),
      matAcc
    );
    nozzle.position.set(side * 0.26, -0.34, -0.46);
    rig.add(nozzle);

    // Llama del propulsor (Sprite glow aditivo)
    const flameTex = _makeFlameTexture();
    const flameMat = new T.SpriteMaterial({
      map: flameTex,
      blending: T.AdditiveBlending,
      transparent: true,
      opacity: 0.08,
      color: new T.Color(sky),
      depthWrite: false
    });
    const flame = new T.Sprite(flameMat);
    flame.position.set(side * 0.26, -0.68, -0.46);
    flame.scale.set(0.4, 0.6, 1);
    rig.add(flame);
    jetGlows.push({ sprite: flame, mat: flameMat });
  });

  // ── Halo de energía en visor (Sprite aditivo) ──────────────────────────────
  const visorGlowTex = _makeVisorGlow();
  const visorGlowMat = new T.SpriteMaterial({
    map: visorGlowTex,
    blending: T.AdditiveBlending,
    transparent: true,
    opacity: 0.38,
    color: new T.Color(sky),
    depthWrite: false
  });
  const visorGlow = new T.Sprite(visorGlowMat);
  visorGlow.position.set(0, 0.78, 0.26);
  visorGlow.scale.set(0.9, 0.9, 1);
  rig.add(visorGlow);

  // ── Posición y orientación en reposo ──────────────────────────────────────
  let _isLaunching = false;
  let _launchT     = 0;
  let _hoverPhase  = 0;
  let _orbitAngle  = 0;
  const _basePos   = new T.Vector3(56, -16, 26);

  rig.position.copy(_basePos);
  rig.rotation.set(0.1, -0.45, 0.05);
  rig.scale.setScalar(5.5);

  function _makeFlameTexture() {
    const c = document.createElement('canvas');
    c.width = c.height = 64;
    const ctx = c.getContext('2d');
    const g = ctx.createRadialGradient(32, 20, 2, 32, 32, 32);
    g.addColorStop(0,    'rgba(255,255,255,1)');
    g.addColorStop(0.22, 'rgba(124,200,255,0.95)');
    g.addColorStop(0.55, 'rgba(124,200,255,0.3)');
    g.addColorStop(1,    'rgba(0,0,0,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 64, 64);
    return new T.CanvasTexture(c);
  }

  function _makeVisorGlow() {
    const c = document.createElement('canvas');
    c.width = c.height = 64;
    const ctx = c.getContext('2d');
    const g = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
    g.addColorStop(0,   'rgba(124,200,255,0.85)');
    g.addColorStop(0.4, 'rgba(124,200,255,0.25)');
    g.addColorStop(1,   'rgba(0,0,0,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 64, 64);
    return new T.CanvasTexture(c);
  }

  /**
   * Llamar en cada frame desde el RAF unificado de cosmos3d.
   * @param {number} dt - delta time en segundos (e.g. 0.016)
   * @param {number} t  - simTime acumulado
   * @param {{x:number, y:number}} parallax - cursor parallax normalizado
   */
  function update(dt, t, parallax) {
    if (!rig.visible) return;

    _hoverPhase += dt;

    if (!_isLaunching) {
      // ── Flotación orbital en reposo con parallax reactivo ───────────────
      const hover = Math.sin(_hoverPhase * 1.1) * 1.2;
      const sway  = Math.cos(_hoverPhase * 0.7) * 0.6;
      rig.position.set(
        _basePos.x + sway - parallax.x * 12,
        _basePos.y + hover + parallax.y * 8,
        _basePos.z
      );
      rig.rotation.y = -0.45 + parallax.x * 0.32 + Math.sin(_hoverPhase * 0.45) * 0.06;
      rig.rotation.x = 0.1 + parallax.y * 0.16 + Math.sin(_hoverPhase * 0.65) * 0.04;
      rig.rotation.z = 0.05 + Math.sin(_hoverPhase * 0.4) * 0.03;

      // Destello sutil en jets en reposo
      const idleGlow = 0.08 + 0.05 * Math.sin(t * 3.5);
      for (const j of jetGlows) {
        j.mat.opacity = idleGlow;
        j.sprite.scale.set(0.35, 0.5, 1);
      }

      // Visor pulsa suavemente
      visorGlowMat.opacity = 0.35 + 0.12 * Math.sin(t * 2.0);

      // Antena emite pulsos periódicos de comunicación
      const pulse = t % 2.4 < 0.22 ? 1.4 : 0.45;
      antennaTip.material.emissiveIntensity = pulse;
      dome.material.emissiveIntensity = 0.35 + 0.25 * Math.sin(t * 1.6);

    } else {
      // ── Vuelo orbital de despegue hacia explorar ─────────────────────────
      _launchT = Math.min(1, _launchT + dt / 0.82);
      const ease = _launchT < 0.5
        ? 2 * _launchT * _launchT
        : 1 - Math.pow(-2 * _launchT + 2, 2) / 2;

      _orbitAngle += dt * (2.2 + ease * 5.2);

      // Curva espiral orbital ascendente hacia la bóveda celeste
      const radius = 38 * (1 - ease * 0.65);
      const ascent = ease * 130;

      rig.position.set(
        _basePos.x + Math.cos(_orbitAngle) * radius - ease * 42,
        _basePos.y + ascent,
        _basePos.z - ease * 85 + Math.sin(_orbitAngle) * 22
      );

      // Inclinación dinámica de vuelo espacial
      rig.rotation.x = -0.4 - ease * 0.85;
      rig.rotation.y = _orbitAngle + Math.PI * 0.4;
      rig.rotation.z = Math.sin(_orbitAngle) * 0.4;

      // Escala se aleja gradualmente en perspectiva
      const scaleFactor = 5.5 * (1 - ease * 0.55);
      rig.scale.setScalar(Math.max(0.1, scaleFactor));

      // Propulsores a máxima potencia con destello de plasma
      const jetIntensity = Math.min(1, _launchT * 3.2);
      for (const j of jetGlows) {
        j.mat.opacity = (0.8 + 0.2 * Math.sin(t * 22)) * (1 - ease * 0.25);
        j.sprite.scale.set(
          0.6 + jetIntensity * 0.9,
          1.1 + jetIntensity * 2.6,
          1
        );
      }

      // Visor hiperbrillante durante aceleración
      visorGlowMat.opacity = 0.55 + 0.35 * ease;
      matVisor.emissiveIntensity = 0.55 + ease * 1.4;

      // Al completar el arco, ocultar
      if (_launchT >= 1) {
        rig.visible = false;
      }
    }
  }

  function startLaunch() {
    if (_isLaunching) return;
    _isLaunching = true;
    _launchT     = 0;
    _orbitAngle  = 0;
  }

  function getLaunching() {
    return _isLaunching;
  }

  function reset() {
    _isLaunching = false;
    _launchT     = 0;
    _orbitAngle  = 0;
    rig.visible  = true;
    rig.position.copy(_basePos);
    rig.rotation.set(0.1, -0.45, 0.05);
    rig.scale.setScalar(5.5);
    matVisor.emissiveIntensity = 0.55;
    for (const j of jetGlows) j.mat.opacity = 0.08;
    antennaTip.material.emissiveIntensity = 0.6;
    dome.material.emissiveIntensity = 0.45;
  }

  return { rig, update, startLaunch, getLaunching, reset };
}
