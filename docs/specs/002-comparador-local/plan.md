# Plan técnico

## Fuente y alcance

La corrección inmersiva aprobada sustituye el FPA como entrada de Explorar:
esfera HiPS real, primera persona, HUD y WebXR; FPA y laboratorio auxiliares.
Ejecución en [inmersivo-plan.md](inmersivo-plan.md), tarea `t-fba4afca4066`;
[evidencia y límites](../../VALIDACION_INMERSIVA_20261115.md). Implementada y
probada localmente, sin cierre administrativo ni validación física de VR/móvil.

Ampliación autorizada 2026-11-15: vista real FPA híbrida, integrada sin retirar el
laboratorio. Alcance: `espectral.html`, `assets/js/fpa.{js,css}`, Worker visual,
`science-core/src/texture.rs`, puente WASM, curador `scripts/curate_fpa.py`, dataset
`public/datasets/fpa-dr1/`, pestañas de Explorar, entrada Vite, verificadores y
pruebas. Primero curar D1–D6 de una exposición conservando MEF; después decodificar
y estirar en Rust, subir RGBA una vez y mover cámara por GPU; finalmente consulta
TAP acotada y carga individual. Ver evidencia en `docs/VALIDACION_FPA_20261115.md`.
Objetivo 60 fps pendiente de medición en dispositivo real; no se traslada DOM,
HTTP ni Three.js a Rust. Los formatos científicos existentes no se amplían.

[El SPEC principal](../../SPEC_SKYO_2.1_AUDITADO.md) contiene RF-01 a RF-20,
contratos y puertas G0–G8. Su §10 es el plan normativo por fases. Esta hoja
organiza el arranque; no cambia decisiones de producto ni duplica el SPEC.

Preparación ejecutada: investigar fuentes NASA/IPAC/JPL/ESA, revisar aplicación,
compilar y probar el snapshot, registrar defectos y actualizar documentación.
Implementación local T01–T07 ejecutada y sometida a pruebas; T08 tiene solo
inspección de insumos. Ver el [informe actual](../../VALIDACION_IMPLEMENTACION_20261114.md).
El registro central sigue pendiente; esta evidencia no autoaprueba ni cierra tareas.

## Archivos y responsabilidades

| Etapa | Archivos | RF |
| --- | --- | --- |
| T01 selección/procedencia/reporte | assets/js/science-lab-ui.js, assets/js/science/{session,lab-ui,contracts,worker}.js y pruebas | 03,13,14 |
| T02 curador/dataset | scripts/curate_irsa.py, manifiestos/fixtures | 04,05,06 |
| T03 FITS/WCS/máscaras | assets/js/science/{fits,wcs}.js, tests | 07,08,09,20 |
| T04 comparación real | assets/js/science/pipeline.js y datasets versionados | 06,10,11,12 |
| T05 interfaz | assets/js/app.js, index.html, assets/css/main.css | 01,02,19 |
| T06 publicación/persistencia | opfs.js, sw.js, postbuild.mjs, bridge | 14,15,16 |
| T07 WASM opcional | science-core/, assets/js/science/wasm-bridge.js | 12,16,20 |
| T08 calibración/catálogos | mapas CWAVE/CBAND, ePSF y paquetes de referencias | 10,11,12,17,18 |

## Decisiones y alternativas

Se mantiene local-first, curación puntual y JS como fallback. Rust es opcional
hasta medir mejora. Se separa comparador visual de ciencia de candidatos;
no se adopta un servidor o un framework nuevo para resolver límites de CORS.
La consulta M101 histórica devolvió 84 filas; el intento nuevo falló por
502/timeout. Se conservó ese límite y se usaron metadatos históricos con
recortes nuevos verificados. La interfaz original está incorporada y los dos
laboratorios usan el paquete visual m101-visual-v2.

## Algoritmos y dependencias

Reutilizar funciones existentes, corregir causas compartidas y añadir regresiones
que fallen antes del arreglo. Resolver dependencias por los IDs de tareas, no
por copiar código de varias skills. No instalar librerías científicas en el
navegador sin comprobar WASM/formatos/release y coste de memoria.
Para repetir verificación de este snapshot: Node24.21.0/Vite7.3.8; el informe
conserva versiones de Rust, Playwright y herramientas. El package-lock.json de la migración fija las dependencias JavaScript; instalar con npm ci. Un módulo wasm32 bruto no
sustituye wasm-bindgen ni la prueba de carga en Worker.

## Validación por RF

Ejecutar las puertas de §11 del SPEC y guardar evidencia por tarea. T01 exige
llegada fuera de orden y export obsoleto; T02 errores/reintentos/atomicidad;
T03 formatos/flags/marcos; T04 un par NASA compatible; T05 accesibilidad;
T06 cuota/offline con Vary:Origin y actualización; T07 equivalencia y carga real;
T08 inyección/recuperación, error astrométrico, geometría y revisión independiente.
No repetir toda la investigación por un arreglo local que no cambia sus hipótesis.


## Migración del shell — 2026-11-14

Autorizada por el usuario antes de iniciar T01. Entradas Vite: index.html, lab.html y contexto.html; interfaz en assets/, Worker en assets/js/science/ y crate en science-core/. La interfaz original ya está incorporada en el commit 2bb7e1e; web/ queda como referencia histórica. Ver docs/VALIDACION_MIGRACION_STACK.md en la raíz del proyecto.

La migración cubre rutas/publicación, contexto HiPS separado, carga diferida 3D y
shell offline. Después de la parada solicitada, el usuario autorizó iniciar T01
y continuar las demás tareas. El trabajo local y sus límites figuran en el
informe actual; no hay aprobación ni cierre automático en MCP. El siguiente
trabajo científico es resolver los requisitos restantes de T08, sin activar
science-ready ni detecciones con insumos no verificados.
