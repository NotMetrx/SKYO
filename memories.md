# memories — Registro de cambios (consultar SIEMPRE antes de cada tarea)

Cada cambio se apunta aquí con fecha. Complementa a `history.md` (lo imprescindible a recordar).

## 2026-11-14 — H.E.R.A 7 astronauta 3D vintage
- Nuevo `assets/js/hera3d.js`: astronauta Three.js (primitivas, sin modelos externos) estilo Apolo 11: traje crema, casco con visor dorado, mochila PLSS, guantes/botas grises.
- Se eliminan detalles naranja/azul y antena LED. Identidad: bandera de Perú (pecho y hombro) + EE.UU. (hombro).
- Interacción: la cabeza sigue al cursor, saluda al pasar el cursor, ríe (rebote + inclinación) al clic.
- Fondo 3D en el canvas: estrellas, Tierra, suelo lunar con cráteres.
- Optimización: canvas 128px, DPR≤1.5, `low-power`, render solo bajo demanda (sin bucle en reposo; flotado por CSS), pausa en `document.hidden`, respeta `prefers-reduced-motion`.
- `app.js`: `initHera3d(#ha)`. `main.css`: marco `#ha` y `.hera-3d`. `hera.webp` queda como respaldo si no hay WebGL.

## 2026-11-13 — Landing `#inicio`
- Lottie estudiante+telescopio (`observer-lottie.json`), hero 2 columnas, fondo Three.js multicapa con paralaje, LERP DOM.
- Visor dorado con emisivo suave para que no se vea negro.

## 2026-11-14 — H.E.R.A 7: rediseño RECHAZADO → imagen real en 3D
- El astronauta vintage de primitivas NO fue aprobado por el usuario. Se usa la imagen real `assets/img/hera.webp`.
- `hera3d.js` reescrito: la imagen va en un plano con relieve (casco esférico + torso suave), brillo de cristal en el visor y luz especular que se mueve; solo se modela en 3D lo que más se nota. Fondo negro → transparente.
- Interacción: rota con el cursor (paralaje real), clic = rebote/risa. Render bajo demanda, pausa en `document.hidden`.
- Quitado el marco/fondo del botón `#ha`.

## 2026-11-14 — Reorganización de carpetas
- Raíz limpia: solo index.html, lab.html, sw.js, icon.svg, package.json, LICENSE, README.md (nuevo), memories/history y carpetas assets/, science-core/, scripts/, data/, docs/.
- Movido (no borrado) a `_archivo/`: `legacy/` (SKYO.html, dev-server.mjs raíz, Cargo.toml raíz, README antiguo) y `ajeno/` (notas, estilos-js, iconos, imagenes, herramientas, datos de otros proyectos/skills).

## 2026-11-14 — Liquid Glass + `#inicio` minimalista + H.E.R.A 7 fuera de inicio
- Liquid Glass en todos los paneles (`main.css`, `lab.css`): gradientes translúcidos saturados `--gl` / `--gl-strong` / `--gl-card`, `backdrop-filter: blur(22px) saturate(185%) brightness(1.06)`, sombras internas especulares `--gl-inset` y destello superior `::before`.
- `#inicio` minimalista: eliminado el estudiante Lottie (`#hero-lottie`), `¿QUÉ HAY MÁS ALLÁ?`, subtítulos, CTAs y tarjetas; solo queda el wordmark animado **SKYO** sobre el cosmos 3D.
- Barra `#nav`: oculta en `#inicio` (`.top` oculta + `inert`), y contiene solo los botones `Explorar`, `3D`, `Fases`.
- Teclado en `app.js`: `Enter` y `Barra de espacio` funcionan únicamente en `#inicio` para pasar a `#explorar`.
- H.E.R.A 7: oculta en `#inicio` (`display: none`, `inert` y pausa total de `hera3d.js` en `route === 'inicio'`) y eliminada su barra de acceso rápido por botón (`#hc` en `index.html`, `quickBtns` en `app.js`).

## 2026-11-14 — Animación Zoom al pulsar Enter o Espacio en `#inicio`
- `cosmos3d.js`: exporta `triggerWarpZoom()`, que impulsa la cámara WebGL hacia adelante (`r: 165 -> 22`), ensancha el `FOV` (`50 -> 74`) en `renderLoop()` sin crear nuevos timers y aterriza suavemente en la bóveda ICRS de `#explorar`.
- `app.js` + `main.css`: clase temporal `body.warp-zoom` al pulsar `Enter` o `Espacio` en `#inicio` (respeta `prefers-reduced-motion`): el wordmark **SKYO** hace zoom expansivo hacia el observador mientras `#explorar` emerge desde profundidad (`scale(0.84 -> 1)`).

## 2026-11-14 — Publicación Git en rama `skyo-ui-3d`
- `.gitignore`: excluye carpetas locales de agentes (`.agents/`, `.claude/`, `.opencode/`).
- Inicializado Git y publicado el proyecto en `https://github.com/NotMetrx/SKYO` en la rama `skyo-ui-3d` (conservando intacto `main`).
## 2026-11-14 — Fusión en rama principal `main`
- Fusionada la rama `skyo-ui-3d` sobre `main` conservando el historial remoto.
- Resueltos conflictos en `.gitignore`, `package.json`, `README.md` y `docs/IMPLEMENTACION_EN_SKYO.md`.
- Verificada suite de pruebas `pipeline.test.mjs` (8/8 pass).
- Autoría de commit asociada a `@aronemilio` en la rama principal.

## 2026-11-14 — Organización definitiva y experiencia clonable universal
- Raíz limpia de carpetas basura: `skills/` (2,391 archivos de agentes) movido a `_archivo/ajeno/skills/`; `web/`, `tools/`, `tests/`, `wasm/` y `vite.config.mjs` movidos a `_archivo/legacy/`; `specs/` y `pipelines/` movidos a `docs/`.
- Previews visuales reales del localhost integradas en `assets/img/previews/` e incluidas en el nuevo `README.md`.
- `sw.js`: lista de caché corregida con los assets reales del proyecto y controlada con `Promise.allSettled`.
- `scripts/dev-server.mjs`: servidor nativo Node.js en puerto 8000 con soporte de cabeceras Range, CORS y MIME types.
- `package.json`: metadatos estándar humanos, scripts `npm start` y `npm test` verificados.

## 2026-11-14 — Paleta de colores
- Nuevo `docs/PALETA.md`: documenta tokens `:root` de `main.css` (base, acentos `--ac`/`--ac2`/`--ok`, líneas, Liquid Glass, wordmark) y contraste WCAG.

### Historial recibido de origin/main (hasta 9022f46)

- 2026-11-14 — Acento naranja → morado `#b57bff` (`--ac2`) en CSS, SVG, cosmos3d, explorar, data, lab.css. Se conservan colores físicos (Sol, Betelgeuse, Antares, estrellas cálidas). Nuevo `docs/LAYOUT.md` (maqueta por vista). Previews actualizadas.
- 2026-11-14 — Eclipse 3D de Blender (`assets/models/eclipse.glb`, `assets/js/glb-lite.js`) reemplaza el SVG en la `O` de `SKYO`, reproduce los 5 clips de animación keyframeada en Blender vía `THREE.AnimationMixer` (`sculpted crater moon + astrolabe gimbal + purple arc + corona + diamond flare`), acompaña el salto `Enter`/`Espacio` hacia `#explorar` volando hacia la cámara y se oculta al finalizar (`eclipseRig.visible = false`). Bóveda Celeste (`#explorar`) simplificada sin `#modebar`, `#scale-pill`, `#stage-tabs` ni `#meses`; `sw.js` actualizado a `skyo-v2.2.0`.
- 2026-11-14 — Sistema unificado de estados UI (`assets/css/states.css`, `assets/js/ui-states.js`) con temática orbital Liquid Glass y WCAG 2.2 (`role="status"` / `role="alert"`, iconos propios, acciones de recuperación, `prefers-reduced-motion`) integrado en `#inicio`/`cosmos3d.js`, Bitácora, Bóveda/Colección (`explorar.js`), Laboratorio FITS (`science-lab-ui.js`) y `lab.html` (`science/lab.js`).
- 2026-11-14 — Bóveda Celeste 3D modelada en Blender (`assets/models/boveda.glb`, 534 KB, 23 380 triángulos): incluye `Boveda_Astrolabe_Rig`, `Boveda_Healpix_Dome`, `Boveda_Detector_Bezel` + `Boveda_Detector_Guides`, `Boveda_Asteroid_SPX26`, `Boveda_Asteroid_Confirmado`, `Boveda_Comet` + `Boveda_Comet_Tail` y `Boveda_Star_Anchor` con materiales PBR alineados a `docs/PALETA.md`. Integrado en `assets/js/cosmos3d.js` (`getBovedaModelState()`, iluminación PBR de 3 puntos en `explorarGroup`, rotación tumbling de asteroides, sincronización con bandas IR/Blink/Comparar/filtros y reposo Ponytail con `0 rAF/s` cuando la cámara está estable y bajo `prefers-reduced-motion`) y añadido a `sw.js`. Verificado con `npm test` (8/8) y E2E Playwright (`0` errores de consola/WebGL, `0 rAF/s` en reposo).
- 2026-11-14 — Avatar H.E.R.A 7 personalizable: retirado avatar fijo `assets/img/hera.webp`; habilitada ranura de subida de avatar propio (`#avatar-input`, `<input type="file" accept="image/*">`, tamaño máx 5MB) con botón de reseteo (`#avatar-reset-btn`), placeholder SVG Liquid Glass ("Subir avatar"), persistencia en `localStorage` (`skyo_custom_avatar`), sincronización con `hera3d.js` y fallback seguro en `explorar.js`.
- 2026-11-14 — Investigación de Sofía y propuesta de fusión de paneles: diagnóstico de fragmentación (Bóveda oculta al cambiar de pestaña, duplicidad de `lab.html`, Colección redundante de 14 tarjetas, Sistema Solar `#3d` desconectado de SPHEREx). Propuesta funcional: "Estación de Observación y Análisis" con Bóveda 3D continua, Catálogo como Rail lateral táctico, Laboratorio FITS como Drawer contextual deslizante precargado con el objeto seleccionado y Bitácora certificadora (Triángulo de Descubrimiento SPHEREx).

### Ajustes locales anteriores a la integración

- 2026-11-14 — Paleta de campaña: Obsidian Black `#07070A`, Chrome Silver `#C9CED6`/`#E6E8EC`, Laser Crimson `#E11D48` y Sky Blue `#7CC8FF` en CSS, SVG, cosmos3d, explorar, data y lab.css. Se conservan colores físicos (Sol, Betelgeuse, Antares, estrellas cálidas). Nuevo `docs/LAYOUT.md` (maqueta por vista). Previews actualizadas.
- 2026-11-14 — Eclipse 3D de Blender (`assets/models/eclipse.glb`, `assets/js/glb-lite.js`) reemplaza el SVG en la `O` de `SKYO`, reproduce los 5 clips de animación keyframeada en Blender vía `THREE.AnimationMixer` (`sculpted crater moon + astrolabe gimbal + crimson arc + corona + diamond flare`), acompaña el salto `Enter`/`Espacio` hacia `#explorar` volando hacia la cámara y se oculta al finalizar (`eclipseRig.visible = false`). Bóveda Celeste (`#explorar`) simplificada sin `#modebar`, `#scale-pill`, `#stage-tabs` ni `#meses`; `sw.js` actualizado a `skyo-v2.2.0`.



## 2026-11-14 — Integración remota con respaldo y delegación

- `main` actualizado por fast-forward `4ee3f74` → `9022f46`; tres commits
  recibidos, sin nuevo commit ni push de los cambios locales.
- Respaldo externo íntegro y verificado en
  `/home/metrx/Proyectos/SKYO-backups/integracion-9022f46-20261115T032838Z/`:
  193 rutas, índice, parches binarios y bundle; stash nuevo `6aa80315` y anterior
  `8df0722` conservados. Originales FITS y artefactos WASM recuperados.
- Reaplicar el stash produjo 12 conflictos. Se reparten por propietario entre
  integrador Git/documentos, resolutor frontend y resolutor científico/Explorar.
  OpenCode agotó cuota (429) sin propuestas; se reasignaron sus archivos al
  resolutor científico. Agy revisa refs sin modificarlas.
- Se conservan los registros históricos recibidos y los ajustes locales de paleta;
  la paleta normativa vigente es `docs/PALETA.md`, no las anotaciones antiguas.
- Resolución y revisión en curso; no se atribuyen pruebas anteriores a la fusión.
  Recibos: `docs/evidence/integracion-9022f46/`. Ciencia T08 sin aceptación.
