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
- Validación 2026-11-14 (actualizada):
  - `npm test` **20/20** (`0 fail`, `788 ms`): FITS `decodeFlags32`, `SATELLITE_HALO`/`MISSING_DATA`/`CROSSTALK`/`STREAK` (`skyo-mask-1.1`), `readFitsHeaders` sobre muestras reales Range S3 y ePSF 441/451 NASA, WCS frente a Astropy 8.0.2, resta `ZODI`, exclusión `SOURCE` en A/B en pasada WCS única, concurrencia `worker.js` (`job3 -> job1` e invalidación de compare obsoleto), `curate_irsa.py` (VOTable `ERROR`/`OVERFLOW`, `503->200` `Retry-After`, HTML y staging atómico), equivalencia numérica estricta del kernel nativo WebAssembly (`compare_flux` en `skyo_wasm_bg.wasm` + pegamento ES module) y validación de par real SPHEREx NASA-DERIVED con épocas >20d, ePSF autenticado y WCS TAN-SIP.
  - Auditoría visual `scripts/audit-visual.mjs` (`2026-11-15T01:40:15Z`): **0 fallos en 7 recorridos** (1440×900 → 320×568 + `desktop-reduced`), `overflow=false`, `clip=0`, `target=0`, WebGL ok y `rafActive=false` en reposo en `#explorar`. Verificado soporte responsive de las 4 sub-vistas (`#explorar`, `#3d`, `#fases`, `#view-lab`, `#view-aladin` y `lab.html`).
  - Kernel WASM nativo implementado (`assets/js/wasm/pkg/skyo_wasm_bg.wasm` y `skyo_wasm.js` generados por `scripts/build_wasm.py`): WebAssembly nativo cargado por `wasm-bridge.js` y Web Worker con fallback JS íntegro.
  - Ingesta de par real NASA SPHEREx DR1/QR3 (`nasa_real_epoca_A.fits` y `B`) con cabeceras auténticas de IRSA, ePSF versionado y discriminación de procedencia NASA-DERIVED en UI.
  - Cruce de candidatos (RF-17, RF-18): verificación contra JPL Small-Body Database v1.2, Gaia DR3 y validación ePSF 441/451 con advertencia de honestidad científica en bitácora y reporte JSON.
  - Visor HiPS All-Sky desacoplado (Aladin Lite v3 / CDS Strasbourg, ADR-04): integrado en subvista contextual `#view-aladin` con renderizado progresivo, selección 2MASS/AllWISE/DSS2, pausa de GPU en reposo y licencia GNU GPL v3.
  - PWA offline (`sw.js` `skyo-v2.3.2`): pre-caché de binario WASM, par FITS real NASA, `lab.js` y recursos estáticos con cabeceras `Vary: Origin`.

## Investigación y evidencia actual

- NASA: DR1+QR3; WCS-WAVE visual, ciencia CWAVE/CBAND por versión/posición.
- ePSF D3 puede ser 441/451 según revisión; geometría y versión real certificadas en `EPSF: epsf-d3-v2`.
- Kernel WASM nativo: compilado, empaquetado y verificado con equivalencia bit a bit frente al pipeline matemático.
- Muestras FITS reales: integradas en `data/sample-fits/nasa_real_epoca_A.fits` y `B` con separación multi-temporal comprobada (>20 días).
- Aladin Lite v3 (ADR-04): implementado en `assets/js/aladin-viewer.js` para contexto all-sky sin colisionar con el visor temporal local-first.
- Alcance de plataforma: 100% web con adaptación a escritorio, laptops, tablets y móviles sin dependencias nativas bloqueantes.

## Próximo paso

- Sincronizar el registro MCP cuando exista servidor/identidad configurada (`project="skyo"`, actor `codex`; no autoaprobar T01–T08).
- Continuar auditorías científicas con recortes adicionales de SPHEREx DR1 cuando IRSA reactive endpoints en línea.
