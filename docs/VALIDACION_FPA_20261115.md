# Vista espectral FPA — 2026-11-15

Solicitud: carga híbrida, seis detectores D1–D6 con cámara libre y pipeline de
imagen en Rust/WASM. Implementación local; sin publicación ni aceptación científica.

## Datos y alcance

Seis MEF DR1 reales de la exposición `2025W31_2A_0156_1`, observada
2025-08-01, versión 7.0.5. Fuentes verificadas contra el CSV histórico de IRSA
`docs/evidence/investigacion-nasa-20261113/3iatlas-first-exposure-current-valid.csv`.
Descargas nuevas desde el espejo oficial AWS. Originales intactos en
`data/fpa-originals/` (ignorados por Git, fuera del bundle). SHA256, URLs y tamaños
en `public/datasets/fpa-dr1/manifest.json`.

Cada preview conserva la huella 2040×2040 de IMAGE reducida por media finita 8×8
a 255×255. Los seis FITS de apertura suman 1.59 MB, frente a unos 387 MB de MEF.
No se aplican FLAGS ni se copian WCS alterados. La procedencia y transformación
son visibles. El tablero 2×3 es esquemático: no muestra un campo registrado común.

Rust interpreta el binario, escala valores, estima límites y genera RGBA gris
con Asinh; el Worker verifica integridad y transfiere el buffer a Three.js.
ZScale aproximado usa 2000 muestras y rechazo sigma, sin crecimiento IRAF.
Las texturas no se recalculan con cada frame. Render por cambios, límite DPR2,
texturas liberadas al reemplazar y Worker terminado al salir de la pestaña.
TAP devuelve hasta 60 observaciones DR1/QR3 por coordenadas; se descarga un MEF
completo solo al elegir cargarlo. Límites: 96 MB/archivo, 2048 px/eje, 64 HDU.

## Fuentes consultadas

- [Búsqueda oficial](https://irsa.ipac.caltech.edu/onlinehelp/spherex/spherex/searching.html):
  filtros espaciales, temporales y espectrales; panorama HiPS/MOC y resultados.
- [Visualización](https://irsa.ipac.caltech.edu/onlinehelp/spherex/spherex/visualization.html):
  FITS, HDU, intensidad y longitud de onda por píxel.
- [Acceso a datos](https://irsa.ipac.caltech.edu/spherex-archive-documentation/spherex-data-access/):
  IRSA/AWS, DR1/QR3, SIA2 y recortes.

La URL solicitada cargó solo la cabecera IRSA en la inspección Chromium; la
descripción funcional procede de su documentación oficial, no de una búsqueda
interactiva completada ni de un perfil del rendimiento de su servidor.

## Verificación

- npm test: 45/45, cero omitidas. Rust: 5/5; curador Python: 6/6.
- Kernel WASM generado y cargado: 96.332 bytes, SHA256
  `7acff41c01e0ff7f78b6452a60fc29063a81d2771c507e665ffa8508964a706d`.
- MEF D1 completo: 2040×2040, 16.646.400 bytes RGBA, 4314 ms en una
  ejecución Node; incluye copias de memoria, no red/GPU.
- Previews: 68–434 ms por imagen en una ejecución fría de cada detector.
  No es benchmark comparativo ni acredita 60 fps. Recibos JSON en
  `docs/evidence/fpa-20261115/`.
- Consulta IRSA real desde Chromium: timeout de 30 s, registrado en
  `live-irsa.json`; no se confunde con ausencia de cobertura. Los datos
  curados sí se descargaron y validaron. Búsqueda/carga también tienen
  ensayo controlado de navegador con respuesta simulada.
- Navegador: 9/9 comprobaciones finales de interfaz pasan, en
  `browser-ui-final.json`: accesibilidad, móvil320/390px, seis imágenes,
  raíz/subruta, cámara/contraste, hash erróneo/reintento, consulta/carga simulada,
  salida/reentrada de pestaña/ruta y Bitácora.
- La repetición selectiva anterior (`browser-targeted.json`) pasó 12/14 casos,
  incluidos KRYO-9 subruta y los cuatro de WASM (identidad/fallback/corrupción y
  benchmark). Sus dos fallos de oclusión se corrigieron y pasan en el cierre UI.
- La suite general de 32 casos terminó con señal/código137 tras 29 casos;
  25 habían pasado y cuatro habían fallado. Las expectativas del modo inicial
  se adaptaron, KRYO pasó al repetir y las oclusiones se corrigieron. Los casos
  WASM que faltaban se ejecutaron en la repetición selectiva. No se declara una
  ejecución general completa de 32/32 en un único snapshot.
- Build Vite, `validate:build`, `validate:docs`, sintaxis JS y `git diff --check`
  pasan. WASM, Worker, nueva entrada y datasets presentes en raíz/subruta.
- Recorrido real adicional, sin respuestas simuladas: botón de resolución
  original D1 → AWS GET → SHA256 verificado → Rust/WASM en Worker → textura
  2040×2040 en navegador. Preparación de datos15.625ms incluyendo descarga;
  FITS→RGBA1905.8ms en Worker. Captura de la textura completada, cero pageerror.
  Recibo: `live-original-browser.json`. Estos tiempos no equivalen a fps.

## Correcciones de integración

Se eliminó la excepción CSS de escritorio bajo que movía las pestañas a10px,
debajo del encabezado. En móvil se reserva espacio para las cinco pestañas.
HERA deja pasar clics en su contenedor transparente, conservando interacción
en avatar y burbuja visible. Las pruebas recorren estos controles sin clics
forzados; la Bitácora cierra la guía por su botón antes de registrar el resultado.

## Límites

No es réplica completa de IRSA: no incorpora sus mapas HiPS/MOC, todos sus
filtros, catálogo ilimitado, lectura de todas las HDU ni calibración por píxel.
No se ha demostrado que Rust mejore la latencia HTTP de IRSA ni que el visor
sostenga 60 fps en Android. La aceptación científica T08 permanece pendiente.
