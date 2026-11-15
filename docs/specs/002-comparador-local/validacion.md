# Validación de preparación

Revisión 2026-11-13, codex. **Especificación preparada para empezar T01–T03**;
producto actual sin aceptación de integridad/visual/ciencia. No es una aprobación
formal en la mente general. El usuario autorizó esta revisión y sus pruebas.

## Documentos y trazabilidad

El [SPEC principal](../../SPEC_SKYO_2.1_AUDITADO.md) contiene los únicos requisitos
normativos (20 RF), contrato/nulidad, decisiones, fuentes, fases, dependencias,
criterios de finalización y condiciones de parada. Plan y tareas remiten a él.
La revisión anterior se archivó; su hash/evidencia siguen ligados a aquel snapshot.
La consulta SQL exacta del nuevo documento devolvió HTTP200 y84 filas DR1/QR3.
Los 28 enlaces externos citados en la revisión del SPEC respondieron HTTP200.

## Evidencia ejecutada

- [Validación de aplicación](../../docs/VALIDACION_PREPARACION_SPEC.md):
  npm12/12, build Vite correcto, Rust1/1 y wasm32 bruto correctos; wasm-pack ausente.
- Chromium: seis recorridos, sin pageerror/overflow, demo/Worker/export básicos;
  offline estático en raíz/subruta y OPFS guardar/reabrir. No prueba Android real.
- Fallos confirmados: jobs/procedencia previos, reporte obsoleto, SATELLITE_HALO,
  nombre accesible del logo y caché offline con Vary:Origin. No corregidos aquí.
- [Investigación NASA](../../docs/INVESTIGACION_DATOS_NASA.md):
  productos/calibraciones,84metadatos,Range S3 y legado3I; no es par científico validado.
- [Criterios científicos](../../docs/CRITERIOS_CIENTIFICOS_SKYO.md):
  tiempos/observador,Gaia/WISE/JPL y reglas de significancia separadas de ingeniería.

- [Evidencia 2026-11-14 (Visual y E2E)](../../evidence/auditoria-visual-2026-11-14.md):
  `npm test` **18/18** (incluyendo `decodeFlags32`, `SATELLITE_HALO`, `MISSING_DATA`/`CROSSTALK`/`STREAK`, `readFitsHeaders` sobre muestras Range S3/ePSF NASA 441/451 y WCS frente a Astropy 8.0.2, `robustBackgroundPlane`, resta ZODI, exclusión `SOURCE` en A y B, concurrencia Worker `job3 -> job1` y `curate_irsa.py`); `audit-visual.mjs` **0 fallos en 7 recorridos** (desktop 1440×900 → mobile-xs 320×568 + reduced-motion); [`verificacion-pendientes-2026-11-14.json`](../../evidence/verificacion-pendientes-2026-11-14.json) valida PWA offline con y sin `Vary: Origin`, invalidación de reporte obsoleto y atomicidad OPFS.

## Veredicto por puerta

| Nivel | Estado | Razón |
| --- | --- | --- |
| Preparación documental | Completada como entrega de esta solicitud | Contratos, fuentes, pruebas reales y backlog registrados |
| I integridad | Implementada y verificada localmente (sin autoaprobación MCP) | T01–T04/T06 mitigados en `18/18` tests y E2E offline `Vary: Origin` / OPFS / Worker |
| V comparador real | Pendiente de par real validado | Flujo local sintético e historial de reporte verificados; plataforma 100% web adaptativa (escritorio/laptop/tablet prioridad + móvil web), falta par multi-época real SPHEREx |
| WASM integrado | No probado (bloqueado por entorno) | `wasm-pack` no instalado en este host (`wasm=fallback` activo) |
| C candidatos científicos | No aceptada | Falta validación científica con pares reales SPHEREx, ePSF y cruce catálogo JPL/Gaia |

No marcar tareas en `mente_general` como aprobadas automáticamente. Próximo
paso técnico: compilar `skyo_wasm` en un entorno con `wasm-pack` y ejecutar curación/validación científica con pares reales SPHEREx multi-época en plataforma web (priorizando escritorio, laptop y tablet).

