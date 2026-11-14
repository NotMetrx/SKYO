# Plan técnico

## Fuente y alcance

[El SPEC principal](../../SPEC_SKYO_2.1_AUDITADO.md) contiene RF-01 a RF-20,
contratos y puertas G0–G8. Su §10 es el plan normativo por fases. Esta hoja
organiza el arranque; no cambia decisiones de producto ni duplica el SPEC.

Preparación ejecutada: investigar fuentes NASA/IPAC/JPL/ESA, revisar aplicación,
compilar y probar el snapshot, registrar defectos y actualizar documentación.
Implementación de T01–T08: pendiente. La validación documental no cierra esas tareas.

## Archivos y responsabilidades

| Etapa | Archivos | RF |
| --- | --- | --- |
| T01 selección/procedencia/reporte | web/main.js, web/worker.js, web/src/contracts.d.ts y pruebas | 03,13,14 |
| T02 curador/dataset | tools/curate_irsa.py, manifiestos/fixtures | 04,05,06 |
| T03 FITS/WCS/máscaras | web/src/fits.js, web/src/wcs.js, tests | 07,08,09,20 |
| T04 comparación real | web/src/pipeline.js y datasets versionados | 06,10,11,12 |
| T05 interfaz | web/main.js, index.html, styles.css, integración futura v1 | 01,02,19 |
| T06 publicación/persistencia | opfs.js, sw.js, postbuild.mjs, bridge | 14,15,16 |
| T07 WASM opcional | wasm/, wasm-bridge.js | 12,16,20 |
| T08 calibración/catálogos | mapas CWAVE/CBAND, ePSF y paquetes de referencias | 10,11,12,17,18 |

## Decisiones y alternativas

Se mantiene local-first, curación puntual y JS como fallback. Rust es opcional
hasta medir mejora. Se separa comparador visual de ciencia de candidatos;
no se adopta un servidor o un framework nuevo para resolver límites de CORS.
La consulta M101 del SPEC se ejecutó sin errores; el frontend v1 no está
adjunto, por lo que no es requisito para empezar T01–T03.

## Algoritmos y dependencias

Reutilizar funciones existentes, corregir causas compartidas y añadir regresiones
que fallen antes del arreglo. Resolver dependencias por los IDs de tareas, no
por copiar código de varias skills. No instalar librerías científicas en el
navegador sin comprobar WASM/formatos/release y coste de memoria.
Para repetir verificación de este snapshot: Node24.21.0/Vite7.3.8; el informe
conserva versiones de Rust, Playwright y herramientas. Fijar lockfile antes de
considerar reproducible la instalación futura. Un módulo wasm32 bruto no
sustituye wasm-bindgen ni la prueba de carga en Worker.

## Validación por RF

Ejecutar las puertas de §11 del SPEC y guardar evidencia por tarea. T01 exige
llegada fuera de orden y export obsoleto; T02 errores/reintentos/atomicidad;
T03 formatos/flags/marcos; T04 un par NASA compatible; T05 accesibilidad;
T06 cuota/offline con Vary:Origin y actualización; T07 equivalencia y carga real;
T08 inyección/recuperación, error astrométrico, geometría y revisión independiente.
No repetir toda la investigación por un arreglo local que no cambia sus hipótesis.

