# Cielo inmersivo SPHEREx — entrega local

Actualización de detalle/rendimiento posterior: ver
[optimización y evidencia vigente](OPTIMIZACION_INMERSIVA_20261115.md).
Los límites de teselas y kernel descritos abajo corresponden a la primera entrega.

Solicitud aprobada por el usuario: mirar 360°, vuelo visual, imágenes SPHEREx,
novedades IRSA y adaptación a PC/móvil/WebXR. Decisiones transmitidas de Agy:
esfera de radio constante, profundidad ilustrativa declarada, HUD esencial y
FITS/comparador como enlaces al laboratorio. No es una simulación de distancias
astronómicas ni un producto oficial NASA.

## Resultado

`inmersivo.html` es la entrada inicial de Explorar. El cielo usa 12 teselas HiPS
reales curadas (849825bytes, canal62 base 0, λ3.293µm) y carga detalle progresivo
y otros canales cuando verifica la edición de IRSA. Máximo 48 teselas y 2 descargas
concurrentes; geometría HEALPix, no una textura rectangular inventada. Se
conservan el laboratorio científico y el plano FPA auxiliar.

Ratón/teclado: arrastre o captura del ratón, WASD/flechas, Q/E vertical,
Mayús para acelerar, rueda para zoom, clic para seleccionar e Inicio/origen.
Móvil: arrastre, pellizco, botón de vuelo y giroscopio con permiso y calibración
inicial; sin eventos válidos se informa del fallo. El vuelo queda dentro de la
esfera de visualización y no interpreta la traslación como una nueva medición.

WebXR: detección de capacidad/contexto seguro, entrada mediante gesto,
cabeza/mandos a través de Three.js r128, vuelo, giro de 45° con antirrepetición,
rayos de selección, HUD y retícula 3D; acciones de canal/flujo/origen/salida
dentro de la sesión. Sin WebXR o con permiso denegado continúa modo pantalla.
Durante VR se mantiene el bucle de presentación; fuera de VR se duerme en
reposo y al ocultarse la vista. Workers, imágenes y texturas se liberan al salir.

## Información y procedencia

HUD: ICRS RA/Dec, canal 1–102 y λ nominal, intervalo UTC del mosaico y valor
IMAGE bajo la retícula en MJy/sr. Los canales 50/51 base 0 están vacíos por
diseño. Un PNG HiPS no se interpreta como flujo: se consulta IMAGE FITS.

Los cubos originales del ejemplo tienen 320909760 bytes. Se recuperan 17280 bytes
de cabeceras y 1048576 bytes del plano elegido mediante HTTP 206. Se verifica
estructura/orden/tesela/HPX, tamaños y límites antes/durante la lectura; no se
acepta HTTP 200 como Range. Rust interpreta float32 big-endian, BSCALE/BZERO,
NaN, contraste ZScale aproximado/Asinh, RGBA y valores de píxel. La ruta visual
no aplica FLAGS ni VARIANCE ni valida ciencia de candidatos.

El manifiesto conserva propiedades de la edición, origen y SHA256 de cada PNG.
La exportación JSON incluye dirección, canal/λ, flujo, unidades, URL/rango/hash
del plano FITS, cabeceras, kernel y limitaciones; scienceReady=false.

PNG y FITS se alinearon contra 6 puntos WCS HPX de Astropy; otras 48 posiciones
HEALPix se contrastaron con astropy-healpix 2.0.1. La transformación ICRS a la
escena conserva paridad positiva: norte arriba, RA creciente hacia la izquierda
al mirar hacia RA 0. La comparación independiente PNG/FITS favorece flipY
(correlación 0.843 frente a 0.011 identidad), coherente con filas de imagen y FITS;
no es una validación fotométrica.

## Publicaciones nuevas

Consulta al abrir, al seleccionar/cambiar canal y cada 10 min visible: últimas
observaciones DR1/QR3 que contienen el punto, por detector, hasta 12 resultados
con límite explícito. Son enlaces a FITS reales para descargar/abrir en el
laboratorio; no se descargan automáticamente los MEF completos.

La edición del mosaico se comprueba aparte. PNG remotos quedan bloqueados hasta
comparar fecha de edición, marco, orden, tamaño y tabla λ. Una edición nueva se
anuncia y requiere aplicar el cambio; no se mezclan teselas con el paquete
curado. Tras aplicarla, el flujo del cubo 20261026 queda deshabilitado hasta
verificar su asociación con la nueva edición. El curador aborta ante cambio de
edición o hash local corrupto antes de reutilizar o relabelar imágenes.

## Evidencia

- Node 53/53, cero omitidas: `evidence/immersive-20261115/node-final.txt`.
- Rust 6/6: `evidence/immersive-20261115/rust-final.txt`.
- Curador Python 6/6; build Vite, validadores raíz/subruta/documentos y diff-check.
- Pipeline navegador 39/39: `evidence/immersive-20261115/browser-full.json`.
  Después se ajustaron paridad ICRS, límites de streaming y selección con ratón
  capturado. La repetición focalizada final pasó 9/9, sin omitidas ni reintentos;
  cubre esos cambios y gyro exitoso. Su resultado se conserva en
  `evidence/immersive-20261115/browser-final.json`.
- Navegador real sin mocks: 12 teselas y flujo 12.0051 MJy/sr en
  RA 60.81100°/Dec 51.34040°, intervalo 2025-08-19→2026-02-22, Worker/Rust 112 ms,
  cero pageerror. `evidence/immersive-20261115/live-browser.json`.
- Revisión independiente: tres importantes corregidos (ediciones mezcladas,
  HUD final obsoleto, recuración inconsistente). Revalidación sin críticos ni
  importantes; revisión adicional favorable de paridad y streaming.

WASM 102109 bytes, SHA256
`ad4422eed36f72b4f48c84e32d7a5e933d0b1cf1f83a3a02344f477129d82128`.
Los tiempos registrados no son una comparación de velocidad ni una medida de fps.

## Límites y siguiente paso

Presentación completa solicitada después: el host espectral y su canvas cubren
el viewport sin márgenes, borde ni esquinas recortadas. Los componentes de SKYO
y los paneles del visor flotan encima; las zonas libres dejan pasar el puntero.
Se conserva el motor existente en su documento, con cabecera duplicada oculta
y enlaces científicos trasladados al desplegable de procedencia. Bitácora queda
sobre el cielo y el asistente se abre mediante su botón. En móvil las pestañas
deslizan horizontalmente y el selector queda separado de la navegación inferior.

Validación del ajuste: `npm test` 53/53 y navegador 4/4 sin omitidas ni reintentos,
incluido Axe y entrada directa raíz/subruta. Bounds de host/canvas iguales al
viewport en 1440×900, 390×844, 320×740 y 768×1024; centro interactivo, paneles
HUD/acciones sin intersección, selector separado de navegación, bitácora por
encima del cielo, vuelo y cambio/regreso al laboratorio. Build y validadores
correctos. Evidencia: `evidence/immersive-20261115/browser-fullscreen.json` y
capturas en `test-results/immersive-fullscreen/`. Inspección del servidor 4176
sin pageerror; este cambio visual no acredita nuevo rendimiento ni hardware.

Integración solicitada en `http://localhost:4176/index.html#explorar`:
selección inicial HTML de Espacio inmersivo alineada con el router. Pruebas
adicionales 3/3 de entrada desde Inicio y entrada directa en raíz/subruta,
vuelo con teclado dentro del iframe y cambio/regreso al laboratorio; conserva
la URL de Explorar y descarga el visor al salir. Evidencia:
`evidence/immersive-20261115/browser-explorar.json`. Repetidos `npm test` (53/53),
build, validadores y diff-check, todos correctos. Inspección remota real de la
URL local con Chromium: 12 teselas, flujo 12.0051 MJy/sr y cero pageerror.

No hay validación física con visor VR, giroscopio de celular ni garantía de 60 fps.
Los ensayos XR/sensores son pruebas de lógica y permisos simulados; Chromium
emulado no acredita Android/Safari/visores concretos. WebXR necesita soporte
del dispositivo/navegador y HTTPS o localhost. Falta ensayar el despliegue HTTPS.

El cubo usado para flujo está fijado a la edición 20261026; una edición nueva
debe asociarse/verificarse antes de habilitar su flujo. Los fallos de IRSA se
informan, no significan ausencia de cobertura. No se construye un volumen 3D
físico ni se certifican fotometría, detecciones o calibración espectral.
Siguiente: pruebas con los dispositivos reales elegidos por el usuario y
medición CPU/GPU/memoria/cadencia XR; T08 científico conserva su puerta.

## Fuentes

- [IRSA HiPS Cube](https://caltech-ipac.github.io/irsa-tutorials/spherex-hipscube/).
- [Productos](https://caltech-ipac.github.io/spherex-archive-documentation/spherex-data-products/)
  y [acceso IRSA](https://irsa.ipac.caltech.edu/spherex-archive-documentation/spherex-data-access/).
- [Three.js WebXRManager](https://threejs.org/docs/pages/WebXRManager.html)
  y [sesiones WebXR](https://developer.mozilla.org/en-US/docs/Web/API/WebXR_Device_API/Startup_and_shutdown).
