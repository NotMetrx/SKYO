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

