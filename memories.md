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
- 2026-11-14 — Eclipse Solar Realista y Continuidad en Transición / Pantalla 2 (`cosmos3d.js`, `main.css`): contraluz físico estricto con umbra lunar oscura (`#060913`), corona solar radiante generada proceduralmente en canvas con filamentos plasmáticos (`makeSolarCoronaTexture`), destello de diamante anamórfico en el limbo (`makeDiamondStarburstTexture`), expansión luminosa de portal durante la transición warp-zoom hacia la cámara, y anclaje cósmico reflejado en la Bóveda Celeste 3D de `#explorar` (`BovedaEclipseAnchor` con corona pulsante y luz puntual ambiental en reposo Ponytail). Verificado con `npm test` 8/8 y auditoría visual en 7 viewports (0 errores).
- 2026-11-15 — Calibración PBR y Estudio de Render FPA SPHEREx vía Blender MCP (`assets/models/focal_plane.glb`): 19 materiales físicos estrictos (oro puro 1.0/0.09, cobre OFHC 1.0/0.22, nitruro de aluminio AlN dieléctrico con Coat 0.45, titanio/aluminio espacial anodizado 1.0/0.20, detectores LVF D1–D6 en zafiro IOR 1.76 con película delgada 480nm y emisión espectral calibrada). Suavizado con modificadores Weighted Normal, estudio de 3 puntos (Key 6500K 240W, Rim cian 160W, Fill morado 85W), cámara Hero 85mm y trazado de rayos en tiempo real EEVEE Next con AgX High Contrast. Exportado a GLB óptimo (5.582 polígonos, 509 KB) y sincronizado con el visor.
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

- 2026-11-15 — Identidad de pestaña y Favicon Eclipse SKYO (`assets/img/favicon.svg`, `favicon-32x32.png`, `favicon-192x192.png`, `apple-touch-icon.png`): icono circular de alto contraste en `#000000` con anillo de diamante y corona espectral (cian `--ac` / morado `--ac2`), vinculado en `index.html`, `lab.html`, `SKYO · Explora el cosmos con SPHEREx.html`, `manifest.webmanifest` y `sw.js` (v2.3.8). Título limpio sin el carácter `◐` (`SKYO · ...`).
- 2026-11-15 — Sección unificada de Resumen de Trabajo y Contactos del Equipo Neois: integrados los contactos de integrantes (GitHub, Email, roles) y los 5 hitos clave de arquitectura (Bóveda 3D, FPA PBR, Laboratorio FITS, Eclipse Solar y KRYO-9) tanto en la subvista «Misión & Equipo Neois» de la app principal (`#fases` en `fases.js`, `data.js`, `main.css`) como en la landing personal `SKYO · Explora el cosmos con SPHEREx.html` (`#trabajo` y `#neois`). Verificado con `npm test` (8/8).

## 2026-11-15 — Unificación visual y estructural de `#inicio` (Grupo Neois + SPHEREx) + pulido global
- Conservado al 100% el trabajo previo de Sofía (favicons `assets/img/favicon*.png`/`svg`, `data/manifests/manifest.webmanifest`, `document.title` limpio sin `◐`, `EQUIPO_NEOIS`, `RESUMEN_TRABAJO`, `MISION_SPHEREX` y pestaña «Misión & Equipo Neois» en `#fases`).
- `index.html`, `main.css`, `app.js`, `cosmos3d.js`: convertida `#inicio` en portada híbrida desplazable: Hero 3D intacto (`SKYO` + `eclipse.glb` + `#kryo9-stage` + transición warp `Enter`) seguido de `.inicio-showcase` con `// 01 ¿Qué es SPHEREx?` + espectro infrarrojo `0.75–5.01 µm`, `// 02 La plataforma SKYO`, `// 03 Grupo Neois` (`EQUIPO_NEOIS` con `IntersectionObserver`), `// 04 Nuestra misión` + CTA `ENTER` y pie institucional (`© 2026 Grupo Neois · SKYO`, atribución NASA/IPAC IRSA y JPL, aviso exploratorio y acceso a `lab.html`) sin `<button>` ni `<a>` nativos en `#inicio` (mantiene `PV-01`).
- Pulido visual global (`main.css`, `fases.js`, `cosmos3d.js`, `lab.html`): metadatos OpenGraph/Twitter en `index.html` y `lab.html`, banner `<noscript>`, barra espectral `.mission-spec-bar`/`.ir-spec-bar` y avatares `.team-av`/`.neois-av` alineados a `PALETA.md` (`--ac`/`--ac2`), oscurecimiento de `.phase-panel` para legibilidad, ocultamiento de rigs 3D del Hero al desplazarse fuera de pantalla y refuerzo lumínico en `#3d` (`buildSistemaScene`). Caché `sw.js` `skyo-v2.3.9`.

## 2026-11-15 — Reorganización profesional + fusión `origin/main` (`2e73278`)
- Fusionadas las nuevas capacidades de `origin/main` (`inmersivo.html`, `espectral.html`, `contexto.html`, `fits-inspector.js`, `fpa.js`, módulo inmersivo HEALPix/L2, WASM `skyo_wasm` y 13 suites unitarias) preservando el diseño local de `#inicio` (Hero 3D + Showcase SPHEREx/Neois con `E_MINIMAL=0`), paleta (`#000000` / `#5bb8ff` / `#b57bff`) y KRYO-9 3D en `hera3d.js`.
- Reestructurado el proyecto en orden limpio **`frontend/`** (`index.html`, páginas satélite, `sw.js`, `assets/`, `public/`), **`backend/`** (`server/dev-server.mjs`, `science-core/`, `python/`) y el resto (`data/`, `docs/`, `tests/unit|browser|fixtures`, `scripts/`, `_archivo/`).
- Actualizados `package.json`, `vite.config.mjs`, `backend/server/dev-server.mjs`, `scripts/*.mjs|py`, `backend/python/*.py` y todas las rutas de pruebas (`npm test`: 62/62).

## 2026-11-15 — Portada `#inicio` Opción 2, `Heras7`, fallback WebGL/2D y 4 transiciones continuas en `frontend/` (`b384d02`)
- Integrados sobre `origin/main` (`b384d02`) dentro de la estructura `frontend/`/`backend/` (preservando `inmersivo.html`, `espectral.html`, `contexto.html`, `lab.html`, `manifest.webmanifest`, plantilla Vite PWA `frontend/sw.js` y `skyo_wasm`):
  - `#inicio` (`frontend/index.html`, `main.css`, `cosmos3d.js`): Opción 2 póster centrado con **SKYO** ampliado, Eclipse GLSL de 4 capas + destello de diamante + retícula coronográfica al hover, Vía Láctea GLSL oscura con paralaje de 4 capas, coreografía Eclipse ↔ **Heras7**, telemetría `.inicio-telemetry` e insignia **`Heras7 · Copiloto orbital`** (sin `.inicio-showcase`).
  - Resiliencia WebGL / `pane` (`createSafeWebGLRenderer`, `createSafeTransparentWebGLRenderer`, fixes GLSL `pow`/`atan`, `.eclipse-flare` `184px 68px`, fallback 2D cósmico interactivo con `<svg class="diamond-eclipse">` y `.agent-2d-emblem`) en `cosmos3d.js`, `hera3d.js` y `main.css`.
  - 4 mejoras de transición continua: portal gravitacional `inicioGroup`+`uWarp` sin corte, túnel 3D de estelas estelares y onda de choque (`buildWarpEffects`), cámara `C¹` continua + pulso `.is-kryo-docked` / `#brand-home.is-eclipse-arrived` y HUD escalonado (`hudPortalArriveTop`/`Bottom`, `body.route-shifting`) junto a `syncCosmosVisibility()` compatible con `espectral`/`contexto`/`fases`.
  - **`Heras7`** unificado en `#hera`, `app.js`, `data.js` y `fases.js`, `.phase-panel` oscuro (`color-scheme: dark`), `rawEmissiveStrength` en `glb-lite.js` y MIME `.mp4`/`.webm` en `backend/server/dev-server.mjs`.
- Verificado con `node --check`, `npm test` (**62/62**), `npm run validate:docs` y auditoría Firefox headless BiDi + `test_no_webgl.mjs` (`0` errores de consola, `0` desbordamiento).

## 2026-11-15 — Integración `origin/main` (`e93e106`) + `origin/feat/nosotros` (`a75840d`) y correcciones CSS/Warp
- Incorporados commits `aa3ee80..e93e106` (reutilización de WASM precompilado, `build:wasm` y apertura en `espectral`) e integrada la rama `origin/feat/nosotros` (`c723525`, `a75840d`: ruta `#nosotros`, `frontend/assets/js/nosotros.js`, estilos `#nosotros`/`.nx*`, perfiles LinkedIn/GitHub/correo en `data.js`, `/nosotros` en `dev-server.mjs`, cámara `cosmos3d.js` y `scripts/audit-visual.mjs`) manteniendo intacta `#inicio`.
- Corregido el bloqueo MIME `text/css` en `npm start`: trasladadas las importaciones CSS de `immersive/main.js`, `fpa.js` y `contexto.js` a `<link rel="stylesheet">` en `inmersivo.html`, `espectral.html` y `contexto.html` (compatible con Vite y servidor estático).
- Coordinado el aterrizaje desde `#inicio` en `app.js` + `explorar.js` (`getSubView()`) + `main.css`: durante `warp-zoom` y vuelo de **Heras7** permanece activa la Bóveda 3D y al completar `setKryoDockHandler` (`+240 ms`, respaldo `2800 ms`) entra con fundido suave (`espectralFadeIn`) en `espectral` (*Espacio inmersivo*).
- Verificado con `node --check`, `npm test` (**63/63**), `npm run validate:docs`, `npm run wasm:build` y Firefox headless BiDi + `test_no_webgl.mjs` (`0` errores de consola en rutas/iframes, `0` overflow).

## 2026-11-16 — Heras7 Navegante (Opción 2) e integración `origin/main` (`0af244d`)
- Implementado **Heras7 Navegante** (`hera-pilot.js`, `hera3d.js`, `cosmos3d.js`, `main.css`, `index.html`): personaje 3D flotante sin marco circular rígido (`148×148` px escritorio, `124×124` px altura reducida, `58×58` px móvil), herramientas agrupadas en `.hb-head .hb-tools`, empuje cian e inclinación aerodinámica durante el vuelo, giro de diálogo por cuadrante (`data-hb-side`/`data-hb-v`), arrastre libre con `#pilot-reset-btn` y `0 rAF` en reposo.
- Conectado en `app.js`, `explorar.js`, `fases.js`, `nosotros.js`, `science/lab-ui.js` y `immersive/main.js` (vuelo/orientación contextual en Bóveda, `skyo:hera-focus` en Lab/Fases/Nosotros y detección de canales ciegos `51/52` en `inmersivo.html`) e integrado con `0af244d` (fixes de carga inmersiva, `controls.test.mjs`, responsive horizontal y enlace accesible en `.hero-prompt` preservando `#inicio` 3D).
- Verificado con `node --check`, `npm test` (**65/65**), `npm run validate:docs`, `npm run wasm:build` y Firefox 160 headless BiDi (`verify_hera_pilot.mjs`, `test_no_webgl.mjs`) sobre `http://127.0.0.1:8000` (`0` errores propios de JS/página, `0` overflow; nota: la carga del Worker `worker.js` con import JSON nativo queda sujeta a Vite/Chromium).
