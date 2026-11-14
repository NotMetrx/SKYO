# Descomposición para implementación

Fuente: §10 del [SPEC principal](../../SPEC_SKYO_2.1_AUDITADO.md).
Registradas por MCP en proyecto skyo, spec 002-comparador-local.
**Estado: todas pendientes**, sin claim/finish ni aprobaciones automáticas.

| ID local / MCP | RF | Dependencias | Hecho cuando |
| --- | --- | --- | --- |
| T01 / t-5aa0315b2f01 | RF-03, RF-13, RF-14 | Ninguna | Orden de carga 3→1, demo A/A→A/B y hash inválido cubiertos; Worker, vista y export usan el mismo snapshot; NASA derivada no se etiqueta sintética; contrato runtime con nulidad y diagnóstico. |
| T02 / t-0b05cb1c52bf | RF-04, RF-05, RF-06 | T01 | VERSION/tiempos/EPSF/calibraciones preservados o declarados; QUERY_STATUS ERROR/OVERFLOW,503→200,Retry-After y escritura interrumpida probados; dataset previo íntegro y éxito parcial explícito. |
| T03 / t-cb1ce1062409 | RF-07, RF-08, RF-09, RF-20 | T01 | SATELLITE_HALO/bit31,HDUs truncadas,dimensiones por eje,CTYPE/CUNIT/RADESYS no soportados cubiertos; registro frente Astropy en muestra real multizona. |
| T04 / t-84a639257a6f | RF-06, RF-10, RF-11, RF-12 | T02, T03 | Par de IDs/épocas reales y banda/footprint documentados; control negativo y rechazo de incompatibles; lectura, diferencia y reporte reproducibles con estado exploratorio. |
| T05 / t-588d59a1e6c3 | RF-01, RF-02, RF-19 | T01, T04 | Lugar/Tiempo/Luz,blink manual,proveniencia,teclado/reduced-motion y pausa probados; logo cumple label-in-name; integración v1 solo al disponer fuente. |
| T06 / t-912519c09382 | RF-14, RF-15, RF-16 | T01, T04 | OPFS con fallo de segundo archivo/cuota/borrado y reapertura verificados; PWA raíz/subruta/offline con cabeceras Vary:Origin y actualización coherente; export nunca obsoleto. |
| T07 / t-be1c18b51240 | RF-12, RF-16, RF-20 | T03, T04 | wasm-pack/glue JS generado,carga real Worker y fallback probados raíz/subruta; equivalencia NaN/máscaras y tolerancia f32 medida; rendimiento comparado, sin prometer mejora. |
| T08 / t-e5eaafd81e45 | RF-10, RF-11, RF-12, RF-17, RF-18 | T04, T06 | CWAVE/CBAND y ePSF/versiones/geometría correctas; observador/época/marco JPL y propagación Gaia documentados; inyecciones/controles,FPR/completitud e incertidumbres revisadas, sin afirmar descubrimiento. |

El primer paso es T01; una base que compila no implica que esos defectos estén
resueltos. La integración del frontend v1 y la ciencia de candidatos se
mantienen como dependencias/etapas posteriores explícitas.

