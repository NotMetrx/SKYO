# Auditoría visual · 2026-11-14

Auditoría de las cuatro vistas de la SPA y de `lab.html`, con la matriz de PV-06.
Ejecutada por `codex` (sesión de agente) sobre el árbol de trabajo local.

## Snapshot medido (optimización de rendimiento y estabilidad multi-dispositivo)

- `BASE=http://127.0.0.1:8000` (servidor HTTP local sobre el árbol de trabajo actual, incluyendo reinvención de `#explorar` como **Plano Focal IR SPHEREx**, cierre E2E, adaptación automática de pantalla/calidad y optimización de rendimiento en motor WebGL + pipeline FITS/WCS; Bloque 5 / `aria-live` en `#hb` excluido por decisión del usuario).
- `generated`: `2026-11-15T00:40:35.410Z`.
- Hashes SHA-256 (12) verificados de los artefactos principales:

| Archivo | SHA-256 (12) |
| --- | --- |
| `index.html` | `12911f886096` |
| `lab.html` | `e97ab6d5f117` |
| `assets/css/main.css` | `ff0e43df5b99` |
| `assets/css/lab.css` | `0817d194e645` |
| `assets/js/app.js` | `0143de759192` |
| `assets/js/cosmos3d.js` | `116457eee70f` |
| `assets/js/explorar.js` | `080adc0879a3` |
| `assets/js/hera3d.js` | `fe03714edc16` |
| `assets/js/science/wcs.js` | `8deece2ca44a` |
| `assets/js/science/pipeline.js` | `f82866e306de` |
| `assets/js/science/render.js` | `6869403e9ef9` |
| `assets/js/science/lab.js` | `334db4a3c368` |
| `assets/js/science-lab-ui.js` | `cc993b9a3dfc` |
| `sw.js` | `8372df022b26` |

Informes máquina-legibles: [`auditoria-visual-2026-11-14.json`](auditoria-visual-2026-11-14.json) y [`verificacion-pendientes-2026-11-14.json`](verificacion-pendientes-2026-11-14.json) (`generatedUtc: 2026-11-14T21:49:43.364Z`).

## Comandos ejecutados

```sh
npm test
BASE=http://127.0.0.1:8000 node scripts/audit-visual.mjs \
  --json docs/evidence/auditoria-visual-2026-11-14.json
```

- `npm test`: **18/18 pass**, 0 fail (`430.71 ms`, bajando desde `640.46 ms` antes de la optimización), incluyendo T01–T04 (`decodeFlags32`, `SATELLITE_HALO`, `MISSING_DATA`/`CROSSTALK`/`STREAK`, `provenanceKind`, `readFitsHeaders` sobre muestras Range S3/ePSF NASA 441/451 y WCS frente a Astropy 8.0.2, plano de fondo robusto, resta ZODI, exclusión `SOURCE` en A y B con pasada WCS única, concurrencia `worker.js` `job3 -> job1` y `curate_irsa.py`).
- Runner Playwright: 7 recorridos × 4 rutas + `lab.html` = **0 fallos** (`failures: []`, errores recogidos = `0`).
- Verificación dinámica Playwright en vistas 3D y Laboratorio FITS (`1280×720@1.5`): `#explorar` tras *hover* regresa a reposo (`rafActive=false`), `#3d` y `#fases` sin errores de consola (`errs=[]`), `#view-lab` y `lab.html` completan carga + comparación WCS TAN-SIP y renderizado `flipRgbaVertical` en `128×128 px` habilitando descarga JSON.
- Verificación E2E navegador (`verificacion-pendientes-2026-11-14.json`): `varyOrigin: false/true` offline (`labOffline=true`, `indexOffline=true`), invalidación de reporte obsoleto tras recargar (`actualDownloadEnabledAfterReload=false`), atomicidad OPFS ante segundo archivo ausente/corrupto, y concurrencia Worker (`job3 -> job1` descartando `job1`).
- Inspección visual en navegador (Playwright Chromium con SwiftShader WebGL) sobre `#explorar` (**Plano Focal IR** en `1440×900` y `320×568`): confirmada grilla tangente ICRS, mosaico `D1–D6`, anillo Vernier, spikes de difracción, vector morado `E1–E4`, ficha `#info` libre de colisión con `.fpa-telemetry` y `#hb`, y separación entre `#mission-bar` y `#tbar` en `320×568`.

## Resultado por recorrido

| Recorrido | overflow | controles fuera (`clip`) | objetivos `<24px` | WebGL | H.E.R.A | teclado/warp | errores |
| --- | --- | --- | --- | --- | --- | --- | --- |
| desktop 1440×900 | no | 0 | 0 | ok | oculta en `#inicio`, visible fuera | `warp=false` | 0 |
| laptop 1280×720 | no | 0 | 0 | ok | idem | `warp=false` | 0 |
| tablet 820×1180 | no | 0 | 0 | ok | idem | `warp=false` | 0 |
| mobile 390×844 | no | 0 | 0 | ok | idem | `warp=false` | 0 |
| mobile-s 360×740 | no | 0 | 0 | ok | idem | `warp=false` | 0 |
| mobile-xs 320×568 | no | 0 | 0 | ok | idem | `warp=false` | 0 |
| desktop-reduced 1440×900 | no | 0 | 0 | ok | idem | `warp=false` (`reducedMotionCheck=true`) | 0 |

Datos comunes verificados en esta corrida: `interactivos=0` en `#inicio`, `33` en escritorio/tablet y `32` en móviles en `#explorar`, `7` en `#3d`, `11` en `#fases`, y `14` en `lab.html` (`h1="Una nueva manera de leer el un"`, `wasm=fallback`, `overflow=false`).

## Estado de los hallazgos previos

1. **Reinvención visual y conceptual de `#explorar` (IMPLEMENTADO):** sustituida la bóveda/astrolabio de `boveda.glb` por **Plano Focal IR (`◎ Plano Focal IR`)** en `assets/js/cosmos3d.js`, `index.html`, `assets/js/explorar.js`, `assets/js/data.js` y `assets/css/main.css` (`polycount=1228`, reposo `rafActive=false`).
2. **`E_CLIP` en `#explorar` y `lab.html` `< 24 px` a `320×568` (RESUELTO):** compactación responsiva de `.explore-view-tabs`, `.mission-bar`, `#tbar` y `.footnote a`; `clip=0` y `target=0` en los 7 recorridos.
3. **PV-03 pausa `#3d` (`#pp`) y PV-08 pestaña oculta (RESUELTO):** `#pp` alterna `aria-pressed` y `.on` (`0 rAF/s`); `visibilitychange` pausa parpadeo de `#explorar` cuando `document.hidden`.
4. **PV-04 teclado e indicación visual en `#fases` (RESUELTO):** `Home`/`End` junto a flechas, `scrollIntoView` en `fases.js` y máscara lateral de scroll en móvil (`main.css`).
5. **Comparador local (`#view-lab` y `lab.html`) y Service Worker offline (`Vary: Origin`) (VERIFICADO):** `sw.js` `skyo-v2.3.1` precachea `lab.js` y fuentes completas con `ignoreVary: true`; `app.js` registra `./sw.js`; E2E confirma carga offline en `lab.html` e `index.html` con y sin `Vary: Origin`, atomicidad OPFS y orden `jobId` en `worker.js`.
6. **`#hb` sin `aria-live` (DESCARTADO POR EL USUARIO):** Bloque 5 descartado explícitamente. En `assets/js/hera3d.js` únicamente se añadió ajuste reactivo al contenedor mediante `ResizeObserver` y soporte HiDPI hasta `2.5` DPR.
7. **Adaptación automática de viewport y calidad 100 % web (IMPLEMENTADO):** `assets/js/cosmos3d.js` (`computeQualityProfile`, `computeAdaptiveDistance`, `getAdaptiveViewportState`, `visualViewport.resize` y `matchMedia(resolution)` sin *polling*), miniatura HiDPI en `assets/js/explorar.js`, `ResizeObserver` en `assets/js/hera3d.js`, y *breakpoints* fluidos para QHD/4K (`>=1600px`), laptop compacta (`<=760px` alto) y tablet (`781px–1180px`) en `assets/css/main.css` y `assets/css/lab.css`.
8. **Optimización de rendimiento y estabilidad (IMPLEMENTADO):** `cosmos3d.js` (vectores temporales reutilizados `_tmpVecA`/`_tmpVecB`, `#sp` cacheado, escalado independiente de tasa de refresco `frameScale`, gobernador adaptativo de DPR con media móvil `emaFrameMs > 30`, raycasting coalescido por `rAF` con listas `exploreHitMeshes`/`fasesHitMeshes` sin `getBoundingClientRect()` ni carga repetida de `vaultPoints` y matrices estáticas), `wcs.js` + `pipeline.js` (`sinDec0`/`cosDec0` precalculados, máscara `SOURCE` reprojectada en una sola pasada `bSourceBit`, vecinos bilineales sin asignaciones de arreglo, `median` sobre `Float64Array`), `render.js` (`quantiles` de un paso sobre `Float64Array` y `flipRgbaVertical` en `Uint32Array` reutilizada por `science-lab-ui.js` y `lab.js`), y `contain: layout style` en `main.css`.
9. **WASM:** `assets/js/wasm/pkg/skyo_wasm.js` sigue ausente (`wasm=fallback`; `wasm-pack` no instalado en este host).

## Veredicto

- **0 fallos en los 7 recorridos** de `scripts/audit-visual.mjs` (320→1440 px + `desktop-reduced`), **18/18** en `npm test`, **verificación adaptativa multi-viewport** (`1920×1080`→`390×844`) y **E2E pendientes verificado** (`verificacion-pendientes-2026-11-14.json`).
- **Pendiente fuera del alcance resuelto hoy:** compilación/integración WASM (`wasm-pack` ausente en host) y validación científica en navegador web con pares reales SPHEREx multi-época y calibración ePSF/catálogos (puertas I/V/C sin autoaprobación; descartada validación nativa Android física al ser plataforma 100 % web).

## Registro MCP

`mente_general` / `log` no estaban disponibles en esta sesión (sin identidad ni
servidor MCP configurado). No se inventó sesión: el límite queda aquí y en
`MEMORY.md`. Las tareas no se marcaron con `claim` ni `finish`.
