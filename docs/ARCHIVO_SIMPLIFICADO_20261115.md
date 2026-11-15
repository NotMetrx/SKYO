# Archivo e inspector FITS simplificados

Implementación solicitada el 2026-11-15 a partir del
[inventario de IRSA](REPLICA_FUNCIONAL_IRSA_SPHEREX.md). Alcance y criterios en
[el plan local](specs/002-comparador-local/archivo-plan.md). La autorización
conversacional no cambia el estado pendiente de la tarea central
`t-e7004c435816` ni constituye aprobación científica.

## Uso

Desde el cielo: «Controles y procedencia» → «Archivo e inspector FITS».
También se puede abrir directamente `espectral.html`.

1. Buscar una posición: aparece una tabla y la cobertura de esos resultados.
   «Ver imagen» o una huella selecciona la observación y abre su recorte.
2. «Inspeccionar D1–D6» abre una de las vistas curadas ya incluidas. El selector
   de archivo permite examinar un FITS local sin enviarlo a ningún servidor.
3. El inspector ofrece contraste, resaltado de problemas y medición entre dos
   puntos. Con teclado se recorren píxeles con flechas y se marcan con Enter.
4. «Detalles del archivo» reúne extensiones HDU, plano de cubo y las tarjetas
   originales de cabecera. El hash queda dentro de esos detalles.

## Decisiones de simplificación

- Un único inspector reutiliza la cola del Worker del FPA; no se añade un
  framework, dependencia, servidor de cálculo ni otro flujo de archivos.
- RGB omitido: los seis previews no tienen WCS y no garantizan un mismo campo.
  No se fabrica una composición ni registro. El laboratorio conserva la
  alineación WCS automática de imágenes compatibles y queda enlazado.
- La regla se habilita solo con WCS ICRS TAN/TAN-SIP compatible. Los previews
  sin WCS lo indican. Mide ángulo, no distancia física.
- Solo se ofrece máscara cuando hay FLAGS compatibles. El resaltado no cambia
  intensidades originales; la política existente conserva las fuentes SOURCE.
- Cobertura de resultados de la consulta, hasta 60, no MOC del archivo completo.
  Sin geometría admitida se informa su ausencia. No se estiman huellas.
- Hasta 96 MB por FITS y 2048 píxeles por eje del plano; los cubos se leen de un
  plano en un plano. Tablas/compresión no admitida siguen mostrando cabeceras.

## Integridad y alcance técnico

Se comparte el inventario del parser FITS con el nuevo lector de planos,
manteniendo el contrato 2D del laboratorio. Se preservan bloques/dimensiones,
BSCALE/BZERO/BLANK, NaN y FLAGS uint32. La vista es exploratoria, sin PSF matching
ni calibración científica añadida; permanece `scienceReady=false`.

Cada selección invalida respuestas anteriores. Cambiar/cerrar el archivo cancela
la inspección remota y libera su caché; se retiene un único FITS. El resultado
remoto debe coincidir con DETECTOR/OBSID antes de mostrarse. Los previews curados
se verifican con su SHA-256. Originales FITS sin modificaciones.

## Evidencia

Recibos y comandos en [evidence/archivo-simple-20261115/](evidence/archivo-simple-20261115/).
La validación automatizada usa datos reales preservados y red controlada para
errores/selección. La consulta TAP real realizada durante la implementación
respondió HTTP 502; no se confunde con una consulta remota exitosa.
Los polígonos TAP y el cubo pequeño de los tests son sintéticos; verifican la
interfaz y los límites, no una cobertura astronómica observada. Los recortes y
previews FITS reales se mantienen identificados y separados de esos controles.

La compilación global estuvo transitoriamente bloqueada por conflictos de otra
sesión. Se compiló el visor de forma aislada; la primera ejecución omitió vendor
y WASM y falló una prueba. Se corrigió ese empaquetado. Después la otra sesión
resolvió su fusión y se pudo compilar y probar el sitio completo, sin resolver
ni sobrescribir sus archivos desde este trabajo.

La batería global detectó además una referencia de manifiesto introducida por
esa integración: Vite la trasladaba a `assets/` y su `start_url` apuntaba allí.
Se restauró el manifiesto público de raíz en las dos entradas, conservando la
identidad e iconos nuevos. El verificador ahora resuelve el enlace que usa cada
HTML; antes solo comprobaba una copia de manifiesto sin relación con ese enlace.

Resultados finales y huellas de fuentes en `review.json` de esa carpeta. No se
infiere de Chromium validación física de Android/VR, una certificación WCAG ni
aceptación científica.

| Comprobación | Resultado |
| --- | --- |
| `npm test` | 62/62; nuevas pruebas focales 4/4 repetidas tras el último ajuste de documentación del test. |
| `npm run web:build` | Pasa; 55 recursos precache y WASM presente en el build final. |
| `validate:build` y `validate:docs` | Pasan; el primero comprueba ahora el manifiesto enlazado realmente. |
| Inspector y FPA en Chromium | 7/7 casos relevantes pasan, incluidos raíz/subruta, FITS real, máscaras, planos, identidad, contraste, regla, móvil y Axe. |
| Batería Chromium completa inicial | 50/56; seis fallos, sin omitidas. No se declara globalmente verde. |
| Lectura pendiente | Test corregido para admitir la lectura automática ya iniciada: 3/3 repeticiones pasan. |
| Manifiesto raíz/subruta | Corregido y repetido sobre el build final: 2/2 pasan. |
| Pendientes 3D | Detalle/precarga agota 120 s también al repetir; KRYO-9 raíz/subruta agota 120 s. No se modificó ese motor para esta entrega. |

Los tres casos corregidos se comprobaron por separado; no se presenta la suma de
repeticiones como una ejecución completa sin fallos. La vista independiente del
archivo está servida localmente en `http://localhost:4195/espectral.html`.
