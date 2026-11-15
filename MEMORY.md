# Memoria

## Fuente y decisiones vigentes

- Proyecto MCP skyo, actor codex, spec actual 002-comparador-local.
- Fuente normativa: SPEC_SKYO_2.1_AUDITADO.md (preparación 2026-11-13).
- 20 RF y T01–T08 definidos; tareas registradas pendientes, sin claim/finish.
- Plan y validación en specs/002-comparador-local/. 001-inicial es incorporación histórica.
- Se conserva laboratorio local-first; frontend v1 y SPEC(1).md no disponibles.
- Skills portátiles: skills/, 83 de11fuentes; no activación global.
- Consulta 2026-11-14: bóveda MCP sin skill de delegación multimodelo; índice skyo no registrado.
- Esta sesión dispone de ecc:team-agent-orchestration; no se ejecutaron agentes ni instalaciones.
- Revisión 2026-11-14: pipeline local cubre 001; falta flujo para 002 con build/puertas y chequeo documental reproducible. Node24.21.0/npm test pasan (1 archivo informado).
- Validación visual 2026-11-14: protocolos PV-01…PV-08 en `docs/protocols/`, runner `scripts/audit-visual.mjs` y pipeline `docs/pipelines/validacion-visual.md`. 7 recorridos (320→1440 + reduced): sin pageerror, sin overflow de documento, WebGL y teclado correctos; 1 fallo a 320 px (pestaña «Colección y Candidatos» recortada en `#explorar`). `npm test` 8/8.
- Fuentes 2026-11-14: `docs/FUENTES.md` reúne 47 URLs citadas con clave estable, matriz afirmación→fuente y estado HTTP real. 51 URLs externas con recibo (29 previas + 22 comprobadas hoy: 19×200, SIA/TAP raíz 502, NASA Space Apps sin conexión). Aladin GPL v3 sigue siendo decisión de licencia abierta.

## Investigación y evidencia actual

- NASA: DR1+QR3; WCS-WAVE visual, ciencia CWAVE/CBAND por versión/posición.
- ePSF D3 puede ser441/451 según revisión; leer geometría real. Conservar FINAST.
- Consulta SQL exacta del SPEC devuelve84filas;28enlaces externos HTTP200 declarados, pero el recibo `enlaces-http.json` solo conserva18 (discrepancia anotada en docs/FUENTES.md §4.3).
- S3 Range206/CORS* y calibraciones listadas; tabla3I aúnQR2, una exposición resueltaDR1.
- RecorteDR1 leído y WCS comparado con Astropy en4puntos: evidencia puntual, no ciencia validada.
- Aplicación: npm12/12 y Vite7.3.8 build pasan; cargo1/1 y wasm32bruto pasan.
- wasm-pack ausente: sin glue/integración/equivalencia JS-WASM.
- Chromium6recorridos: responsive y flujo demo pasan; PWA offline estática raíz/subruta y OPFS básicos pasan.
- Fallos abiertos: jobs antiguos, NASA derivada rotulada sintética, VERSION/EPSF perdidas,
  reporte sin procedencia/obsoleto, SATELLITE_HALO omitida, logo a11y y offline con Vary:Origin.
- Ciencia: sin par real compatible validado, PSF/calibración/catálogos ni Android físico aceptados.
- Ver docs/VALIDACION_PREPARACION_SPEC.md, INVESTIGACION_DATOS_NASA.md y CRITERIOS_CIENTIFICOS_SKYO.md.
- Interfaz `#inicio` 2026-11-14: integrado agente 3D KRYO-9 (`assets/models/kryo9.glb`, pista `Takeoff_Launch` de vuelo orbital en `scripts/export_kryo9_skyo.py`) + loaders locales r128 (`GLTFLoader.js`, `DRACOLoader.js`, `RoomEnvironment.js`, `draco/gltf/*`) y caché `sw.js` `skyo-v2.3.3` (preservando `boveda.glb` y cambios de `origin/main`); transición `Enter`/clic hacia `#explorar` con vuelo curvo supersónico por la órbita (conos propulsores, estela, líneas radiales y aterrizaje saludando dentro de la bóveda ICRS) verificada tras el rebase en Firefox 160 headless (`warp < 1 s`, 0 errores consola) y `npm test` 8/8.
- Audio espacial + KRYO-9 acoplado como guía SPHEREx 2026-11-14 (`sw.js` `skyo-v2.3.5`): motor Web Audio "Deep Liquid Glass" (`assets/js/sound.js`, reverb convolucional estéreo de `2.05 s`, sub-bajo limpio, pad armónico en Re sus2 sin diente de sierra ni estática aguda, y micro-tactos vítreos; verificado vía `OfflineAudioContext` a pico `-8.9 dBFS` y RMS `-21.9 dBFS`), acoplamiento orbital hacia el botón circular `#ha` (`cosmos3d.js` + `hera3d.js` con render bajo demanda `0 rAF` en reposo y respaldo 2.5D si hay avatar personalizado), guía interactiva SPHEREx (`GUIA_SPHEREX` en `data.js`, píldoras `#hera-chips` en `index.html`, reacciones en `explorar.js`, `app.js` y `science-lab-ui.js`), y corrección de eco `jobId`/`snapshot` en `assets/js/science/worker.js`; verificado en Firefox headless (`1440×900` y vista móvil `390`/mínimo `500 px`, 0 errores de consola), `node --check` y `npm test` 8/8.
- Unificación visual `#inicio` + identidad Grupo Neois 2026-11-15 (`sw.js` `skyo-v2.3.9`): conservado el trabajo de Sofía (favicons Eclipse SKYO, `manifest.webmanifest`, `document.title` limpio, `EQUIPO_NEOIS`/`RESUMEN_TRABAJO`/`MISION_SPHEREX` y pestaña «Misión & Equipo Neois» en `#fases`); convertida `#inicio` en portada híbrida desplazable manteniendo el Hero 3D y protocolos `PV-01` (`E_MINIMAL=0`), con secciones editoriales `01`–`04`, `IntersectionObserver`, pie institucional con atribución NASA/IPAC IRSA y JPL, metadatos OpenGraph/Twitter en `index.html` y `lab.html`, `<noscript>`, alineación cromática a `PALETA.md`, contraste de `.phase-panel`, ocultamiento de rigs 3D fuera del Hero y refuerzo lumínico en `#3d`.

## Próximo paso

- Iniciar T01: t-5aa0315b2f01, integridad de selección/procedencia/reporte con regresiones.
- Corregir el recorte de `#explorar` a 320 px (parche CSS en auditoría visual) y repetir `node scripts/audit-visual.mjs`; completar a mano PV-03 (pausa 3D), PV-04 (teclado del carrusel), PV-07 (`aria-live` de H.E.R.A, objetivos de 13 px en `lab.html`) y PV-08 (pestaña en segundo plano).
- Después T02curación yT03FITS/WCS; validar par visual real antes de ciencia de candidatos.
- Preparación documental lista para implementación; producto no aceptado en puertas I/V/C.
- Sesiones MCP siguen requiriendo identidad; indicar project=skyo explícito.
