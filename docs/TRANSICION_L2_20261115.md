# Zoom de panorama a observación original

Solicitud autorizada: añadir detalle de las observaciones L2 al acercar el cielo.
La misma ruta `index.html#explorar` y el visor independiente conservan panorama,
flujo de cubo y canales existentes. No se añaden dependencias ni se modifica Rust:
se reutiliza su kernel FITS→RGBA compilado y verificado.

## Comportamiento

- Zoom permite 0.05°–95°. Bajo 1.25° y tras 700 ms de posición estable se
  consultan observaciones del detector actual. Se prueban hasta seis de las doce
  más recientes por TAP DR1/QR3; no es una búsqueda exhaustiva de todo el archivo.
- IBE devuelve un recorte espacial de 0.25°, conservando píxeles nativos y HDUs.
  Se admite como máximo 256² en IMAGE, 32 MB por respuesta y 64 MB por búsqueda,
  con tiempo acotado. No se descarga automáticamente el MEF completo como fallback.
- WCS espacial TAN/SIP ICRS coloca una malla de 16×16 sobre la misma esfera
  de radio 1000 que define la retícula. El orden de render separa capas sin
  inventar paralaje por radios distintos durante vuelo.
- La tabla WCS-WAVE restringida X/Y/VALUES, WAVE-TAB en µm, proporciona λ y
  ancho de banda por píxel mediante interpolación bilineal. No se ignora ni se
  confunde con un canal uniforme. Cada píxel fuera del intervalo del canal
  seleccionado o inválido por FLAGS es transparente. El flujo usa el píxel
  nativo redondeado y su λ correspondiente, sin interpolación fotométrica.
- Se valida detector, unidades, versión, OBSID de cabecera frente a consulta,
  colección frente a URL y escala UTC. El render se obtiene en Worker/Rust.
- Fundido por escala: opacidad 0 a 1.25°, completa desde 0.5°; desaparece al
  alejarse a 1.5°. El fondo sigue siendo el mosaico; no se reconstruye un nuevo
  mosaico científico ni se combinan arbitrariamente observaciones/épocas.
- Al completar el fundido, bajo un píxel L2 válido, HUD/export indican flujo,
  λ, fecha, OBSID, versión, URL del recorte, bytes y SHA256 de esa observación.
  Fuera del recorte o en píxeles transparentes sigue la lectura del cubo.
- Canal/posición/origen/edición, ocultación y salida invalidan resultados tardíos,
  abortan solicitudes y liberan texturas. Reintentar cielo reintenta L2 también.
  Entrar en VR retira el recorte; se conserva panorama y HUD XR existentes.

## Evidencia

Fixture real intacto `tests/fixtures/l2/observation.fits`, 3965760 bytes,
SHA256 `5a5a18a74a30b81af5457ec719d49f1d5b5e3849252b19938014feeae430a1b7`.
Su URL, ID y muestras de Astropy están en `tests/fixtures/l2/astropy.json`.
Es un recorte IBE de 29×29 de la observación `2025W20_2D_0065_1`, detector 2;
centro de prueba RA 210.80057988°, Dec 54.34658513°, λ 1.19349165 µm.
Originales de curación permanecen en `data/`; no se fabricaron píxeles.

Pruebas numéricas: tabla espectral y WCS frente a Astropy, selección de canal,
identidad/detector/colección incompatibles, geometría sin paralaje en vuelo
tangencial. Node 58/58, sin omitidas: `docs/evidence/immersive-l2-20261115/node-final.txt`.
Build genera el Worker L2 y 46 recursos de precache; el FITS de prueba no entra
en el bundle. WASM sigue con SHA256 `c61e0668dea746c4ddaacbbc9e7923c7faa1f7411994c6054d4c89ee3bf2cac2`.

Navegador: `tests/browser/l2.spec.mjs` prueba transición, λ/fecha/flujo propios,
exportación con hash original, retorno al panorama y respuesta tardía tras cambio
de canal, usando red controlada con FITS real y PNG repetidos para el fondo.
Resultado final en `docs/evidence/immersive-l2-20261115/browser-final.json`.
Pasaron 23/23 pruebas de navegador, sin omitidas ni reintentos: transición L2
raíz/subruta, cámara/canales/caché, FPA e integración completa y accesibilidad.
La repetición final de L2 pasó 4/4 e incluye además la ruta
`index.html#explorar` con controles flotantes y desmontaje al abrir el laboratorio:
`docs/evidence/immersive-l2-20261115/browser-l2-last.json`.
No se presenta esta red controlada como aceptación del servicio remoto.

Revisión independiente corrigió: radio de overlay que desplazaba la posición
aparente durante vuelo; OBSID/UTC no contrastados; suspensión de la capa al
entrar en VR; λ muestreada en posición distinta al píxel de flujo. Revalidación
sin críticos ni importantes pendientes. El navegador detectó además un hash
invocado con TypedArray en vez de ArrayBuffer; corregido antes de la entrega.

## Límites

Prueba remota actual: TAP agotó 35 s y el servicio de recortes IBE respondió
HTTP 503 a una URL real conocida (respuesta registrada en la bitácora). Por eso
no se acredita disponibilidad remota continua ni una transición en vivo exitosa
en esta sesión. La interfaz informa el fallo y mantiene el mosaico; el botón de
reintento permite consultar cuando IRSA se recupere.

Faltan pruebas físicas móviles/VR, fps, validación fotométrica y ciencia de
candidatos. No se aplican PSF matching ni calibraciones adicionales, ni se supone
misma época entre mosaico y exposición. El recorte más fino aporta muestreo
nativo disponible; no inventa resolución superior a la observación instrumental.

## Fuentes

- [Servicio de recortes SPHEREx](https://irsa.ipac.caltech.edu/data/SPHEREx/docs/cutout_tool.html).
- [Tutorial oficial y cálculo WCS-WAVE](https://caltech-ipac.github.io/irsa-tutorials/spherex-cutouts/).
- [Productos y HDU](https://caltech-ipac.github.io/spherex-archive-documentation/spherex-data-products/).
