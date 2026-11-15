# Validación de implementación y preparación

## Preparación histórica — 2026-11-13

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

- [Validación de aplicación](../../VALIDACION_PREPARACION_SPEC.md):
  npm12/12, build Vite correcto, Rust1/1 y wasm32 bruto correctos; wasm-pack ausente.
- Chromium: seis recorridos, sin pageerror/overflow, demo/Worker/export básicos;
  offline estático en raíz/subruta y OPFS guardar/reabrir. No prueba Android real.
- Fallos confirmados: jobs/procedencia previos, reporte obsoleto, SATELLITE_HALO,
  nombre accesible del logo y caché offline con Vary:Origin. No corregidos aquí.
- [Investigación NASA](../../INVESTIGACION_DATOS_NASA.md):
  productos/calibraciones,84metadatos,Range S3 y legado3I; no es par científico validado.
- [Criterios científicos](../../CRITERIOS_CIENTIFICOS_SKYO.md):
  tiempos/observador,Gaia/WISE/JPL y reglas de significancia separadas de ingeniería.

## Veredicto por puerta

| Nivel | Estado | Razón |
| --- | --- | --- |
| Preparación documental | Completada como entrega de esta solicitud | Contratos, fuentes, pruebas reales y backlog registrados |
| I integridad | No aceptada | T01–T03 pendientes; fallos reproducidos |
| V comparador real | No aceptada | I, par compatible y UX/persistencia completas pendientes |
| WASM integrado | No probado | Falta glue/carga/equivalencia, aunque el módulo bruto compila |
| C candidatos científicos | No aceptada | Calibración,PSF,geometría,controles y revisión pendientes |

No marcar tareas de implementación como hechas por haberlas definido. Próximo
paso técnico: corregir T01 con sus regresiones y repetir únicamente pruebas afectadas.


## Migración del frontend — 2026-11-14

Ver [evidencia de migración](../../VALIDACION_MIGRACION_STACK.md). Se mantiene la falta de aceptación I/V/C: compilar y probar navegación/offline no sustituye las puertas científicas ni cierra T01–T08. La parada antes de T01 correspondió a esa entrega; después el usuario autorizó
iniciarla y continuar las demás tareas.


## Implementación local — 2026-11-14

El [informe actual](../../VALIDACION_IMPLEMENTACION_20261114.md) sustituye el
veredicto técnico histórico para este workspace, conserva los fallos iniciales
como evidencia y no registra aprobación administrativa.

| Puerta | Resultado técnico actual | Límite |
| --- | --- | --- |
| G0–G2 / I | Sesión, curador y FITS/WCS/máscaras implementados y con regresiones | Subconjunto FITS/WCS explícito; consulta TAP nueva fallida, recuperada desde metadatos previos |
| G3–G6 / V | Datos reales, Astropy, UX/export, OPFS/PWA y navegador verificados | Perfil visual exploratorio; fallos de cuota inyectados; sin dispositivo físico ni certificación WCAG |
| G7 / WASM | Binario y glue reales en Worker, raíz/subruta, fallback y equivalencia medidos | No mejora universal; benchmark local del núcleo |
| G8 / C | No superada | scienceReady=false; calibración/PSF/observador/catálogos/controles y revisión pendientes |

Recibos: 43 pruebas Node, seis Python, dos Rust y 26 Chromium pasan, sin
omisiones en Node ni navegador. Sus resultados están enlazados en el informe actual. La aceptación
formal y los estados de las tareas permanecen pendientes en MCP: no hay
claim/finish, autoaprobación ni sincronización implícita de documentos centrales.
