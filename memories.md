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
