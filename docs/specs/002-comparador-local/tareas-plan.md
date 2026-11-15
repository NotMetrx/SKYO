# Descomposición para implementación

Corrección inmersiva autorizada: `t-fba4afca4066`, RF-01/02/03/04/07/09/10/13/16/19/20.
Escena HiPS envolvente con mirar/volar/zoom, HUD ICRS/λ/fecha/píxel FITS,
Worker/Rust, controles de PC/tacto/gyro/WebXR y novedades IRSA. Estado técnico:
implementada y probada localmente según [plan](inmersivo-plan.md) e
[informe](../../VALIDACION_INMERSIVA_20261115.md); faltan ensayos físicos y
rendimiento por dispositivo. Se conserva pendiente en el registro central,
sin claim/finish ni aprobación automática.

Ampliación visual autorizada 2026-11-15: `t-17ae320f0f05`, FPA híbrido D1–D6,
cámara libre y FITS→RGBA Rust/WASM. RF-01/02/03/04/07/16/19/20; sin dependencias
administrativas cerradas ni claim/finish automático. Criterio: seis imágenes reales
íntegras con procedencia, cámara ratón/tacto/teclado, búsqueda IRSA acotada y carga
individual, errores/reintento, pruebas de build y raíz/subruta; rendimiento medido
y límites explícitos. Evidencia local en `../../VALIDACION_FPA_20261115.md`.

Fuente: §10 del [SPEC principal](../../SPEC_SKYO_2.1_AUDITADO.md).
Registradas por MCP en proyecto skyo, spec 002-comparador-local.
**Registro central: todas pendientes**, sin claim/finish ni aprobaciones
automáticas. El claim de T01 fue rechazado por aprobación pendiente/invalidada.
El usuario autorizó continuar localmente; el estado técnico se describe abajo.

| ID local / MCP | RF | Dependencias | Hecho cuando |
| --- | --- | --- | --- |
| T01 / t-5aa0315b2f01 | RF-03, RF-13, RF-14 | Ninguna | Orden de carga 3→1, demo A/A→A/B y hash inválido cubiertos; Worker, vista y export usan el mismo snapshot; NASA derivada no se etiqueta sintética; contrato runtime con nulidad y diagnóstico. |
| T02 / t-0b05cb1c52bf | RF-04, RF-05, RF-06 | T01 | VERSION/tiempos/EPSF/calibraciones preservados o declarados; QUERY_STATUS ERROR/OVERFLOW,503→200,Retry-After y escritura interrumpida probados; dataset previo íntegro y éxito parcial explícito. |
| T03 / t-cb1ce1062409 | RF-07, RF-08, RF-09, RF-20 | T01 | SATELLITE_HALO/bit31,HDUs truncadas,dimensiones por eje,CTYPE/CUNIT/RADESYS no soportados cubiertos; registro frente Astropy en muestra real multizona. |
| T04 / t-84a639257a6f | RF-06, RF-10, RF-11, RF-12 | T02, T03 | Par de IDs/épocas reales y banda/footprint documentados; control negativo y rechazo de incompatibles; lectura, diferencia y reporte reproducibles con estado exploratorio. |
| T05 / t-588d59a1e6c3 | RF-01, RF-02, RF-19 | T01, T04 | Lugar/Tiempo/Luz,blink manual,proveniencia,teclado/reduced-motion y pausa probados; logo cumple label-in-name; interfaz incorporada validada con datos compatibles. |
| T06 / t-912519c09382 | RF-14, RF-15, RF-16 | T01, T04 | OPFS con fallo de segundo archivo/cuota/borrado y reapertura verificados; PWA raíz/subruta/offline con cabeceras Vary:Origin y actualización coherente; export nunca obsoleto. |
| T07 / t-be1c18b51240 | RF-12, RF-16, RF-20 | T03, T04 | wasm-bindgen/glue JS generado,carga real Worker y fallback probados raíz/subruta; equivalencia NaN/máscaras y tolerancia f32 medida; rendimiento comparado, sin prometer mejora. |
| T08 / t-e5eaafd81e45 | RF-10, RF-11, RF-12, RF-17, RF-18 | T04, T06 | CWAVE/CBAND y ePSF/versiones/geometría correctas; observador/época/marco JPL y propagación Gaia documentados; inyecciones/controles,FPR/completitud e incertidumbres revisadas, sin afirmar descubrimiento. |

## Evidencia local de implementación — 2026-11-14

Ver [informe y recibos](../../VALIDACION_IMPLEMENTACION_20261114.md). Esta tabla
no modifica el estado operativo central ni sustituye sus aprobaciones.

| Tarea | Estado técnico local | Evidencia principal |
| --- | --- | --- |
| T01 | Implementada y probada | Sesión/Worker/contrato, carreras, snapshot, diagnóstico y export de ambos laboratorios |
| T02 | Implementada y probada | Seis pruebas de curador; originales y metadatos preservados; descargas reales; TAP nuevo fallido documentado |
| T03 | Implementada para subconjunto admitido | FITS/máscaras/WCS negativos; 27 muestras Astropy en D2/D3/D6 |
| T04 | Comparador visual reproducido | m101-visual-v2, dos épocas y dos ROI, mapas de cobertura y control A/A; estado exploratorio |
| T05 | Integrada y verificada en Chromium | Lugar/Tiempo/Luz, blink manual, vistas, HERA, móvil, teclado/reduced-motion y Axe |
| T06 | Implementada y probada | Generaciones OPFS, fallos inyectados/cuota/borrado; PWA raíz/subruta y actualización |
| T07 | Integrada y medida | Rust, wasm32, glue, carga Worker y fallback; equivalencia cinco casos; benchmark sin mejora universal |
| T08 | Preparación parcial, sin aceptación | Inspección CWAVE/CBAND y ePSF por zona; scienceReady=false |

T08 requiere asociación de versiones, PSF integrada a píxel y matching,
propagación de incertidumbres, geometría/épocas/catálogos e inyección/recuperación
con revisión independiente. Los resultados I/V/G7 quedan disponibles para
revisión técnica; no prueban detección astronómica ni Android físico.

