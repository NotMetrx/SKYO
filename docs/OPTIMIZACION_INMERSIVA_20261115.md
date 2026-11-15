# Detalle y fluidez del cielo SPHEREx

Se corrige la calidad de la vista en `index.html#explorar` y `inmersivo.html`.
No se modificaron originales FITS ni PNG curados. Rust/WASM procesa FITS,
contraste, geometría y selección de detalle. JavaScript conserva DOM, red,
controles, ciclo de render y Three.js r128; la aplicación no es íntegramente Rust.

## Causas y cambios

El LOD anterior era `floor(log2(100/FOV))`: a 70° solo usaba las 12 imágenes de
orden 0, independientemente de los píxeles de la pantalla. Truncaba el detalle
a 24 teselas y borraba toda imagen al cambiar de canal. Además limitaba el
pixel ratio a 1.75, incluso en pantallas de mayor densidad.

Ahora el planificador Rust calcula frustum y resolución por región, FOV,
posición y píxeles físicos. Incluye todos los nodos visibles y sus ancestros,
sin truncar 24; el detalle llega progresivamente hasta el orden 5 publicado por
IRSA. La geometría HEALPix también se genera en Rust. Existe fallback JS con el
mismo criterio. El pixel ratio conserva la densidad del dispositivo dentro del
máximo renderbuffer de la GPU. No se agregan píxeles astronómicos inexistentes.

La primera variante usaba solo distancia al centro: mirar hacia atrás desde el
borde solicitaba 1786 nodos a 1800 px o 6766 a 4320 px. La revisión lo detectó;
el cálculo por región reduce esos casos a 172 y 542, respectivamente. Conserva
resolución donde se proyecta mayor tamaño y no sobrerresuelve el hemisferio lejano.

Cuatro peticiones HiPS concurrentes, prioridad al canal actual y baja resolución
antes de detalle. Se precargan las bases de hasta cuatro canales vecinos cuando
el actual está completo. Al cambiar se conserva temporalmente la imagen anterior
con su canal declarado, hasta completar las 12 bases nuevas. Los canales vacíos
50/51 base 0 ocultan imágenes; el flujo nunca se atribuye al canal anterior.
Ediciones nuevas siguen requiriendo aplicar y verificar su cubo FITS compatible.

La caché conserva ±2 canales y expulsa detalle no visible por LRU al superar
256 teselas. Este es un presupuesto de caché expulsable, no un tope rígido del
footprint visible. Una pantalla muy grande puede requerir más imágenes y memoria;
no se reduce detalle silenciosamente para respetar ese presupuesto.
El Worker guarda cinco planos procesados (unos 10 MiB) y cuatro cabeceras; repetir
una lectura evita red y decodificación. Mantiene copias propias antes de transferir.

## Optimización numérica sin pérdida de bytes

El coste medido principal era `asinh` f64 por cada píxel. El kernel utiliza una
tabla de umbrales de cuantización RGBA y resuelve las fronteras con la fórmula
original. No usa un polinomio que cambie el flujo ni la imagen. Un millón de
valores y las fronteras se contrastan en Rust. El plano NASA conserva exactamente
límites, valores float32 y hash RGBA:
`89484e7bdf50aaa624e04dee2c89ab1708d5ee121d8208e67fa224cf994cd78b`.
FPA y la comparación científica conservan sus pruebas de equivalencia.

Compilación `opt-level=3`, sin instrucciones SIMD obligatorias: conserva soporte
escalar portable. WASM final: 112331 bytes; SHA256
`c61e0668dea746c4ddaacbbc9e7923c7faa1f7411994c6054d4c89ee3bf2cac2`.

## Medición reproducible

`node scripts/benchmark-immersive.mjs --baseline /tmp/skyo-perf-baseline --out resultado.json`
compara 30 repeticiones tras 5 de calentamiento, mismo plano NASA 512², incluyendo
getters RGBA/píxeles. La carpeta de baseline contiene el artefacto anterior cuyo
hash figura en los recibos; no es una dependencia del producto. Sin baseline el
script mide el kernel actual y comprueba hashes igualmente.

| Variante | Mediana base → nueva | Resultado |
| --- | --- | --- |
| Tabla exacta, compilación por tamaño | 74.97 → 19.93 ms | Mismos bytes |
| Tabla exacta, compilación por velocidad | 58.06 → 17.07 ms | Mismos bytes |
| Kernel final con LOD adaptativo | 98.74 → 26.00 ms | Mismos bytes |

Las cifras varían con la carga del equipo: la tercera se ejecutó mientras había
pruebas de navegador. Las mejoras repetidas rondan 3.4–3.8× en este ensayo CPU,
no equivalen a un benchmark GPU, una garantía de fps ni a latencia de red.
Recibos: `evidence/immersive-quality-20261115/kernel-*.json`.

## Verificación y límites

- Node 55/55 sin omitidas y Rust 8/8: recibos `node-final.txt`, `rust-final.txt`.
- Cobertura de rayos en polos/costura, distintos FOV/aspectos, vuelo hacia dentro
  y fuera. Geometría frente a fórmulas y fixtures Astropy anteriores.
- Órbita de 36 vistas: expulsa detalle fuera de pantalla y cierra bitmaps.
- Revisor independiente: dos importantes corregidos (expulsión de caché y LOD
  radial); sin críticos/importantes restantes. Paridad JS/Rust en 12 escenarios.
- Navegador: DPR 2 sin reescalado, más de 24 imágenes refinadas, zoom hasta orden
  5, precarga del canal vecino y lectura FITS repetida sin HTTP Range adicional.
  Fixtures PNG repetidas en esta prueba verifican planificación, no fotometría.
- IRSA real sin mocks: viewport 1440×900 a DPR 2, canvas 2880×1800, 12 bases y
  71/71 teselas de detalle en orden 2, 131 entradas incluyendo caché, flujo
  12.0051 MJy/sr y cero pageerror. `live-final.json` y `live-dpr2.png`.
- Primera ejecución completa: 43/45; dos recorridos antiguos fueron corregidos
  (panel móvil frente a pantalla completa y gesto de zoom limitado por evento).
  Repetición afectada 2/2 en `browser-fixed.json`. Segunda ejecución completa:
  44/45 en 7.2 min, sin omisiones; el único fallo fue la carrera gyro descrita
  abajo. Su corrección se comprobó aparte tres veces. No se afirma una ejecución
  única de 45/45. Recibo: `evidence/immersive-quality-20261115/browser-final.json`.
- Una repetición completa expuso una carrera del simulador gyro: publicaba la
  segunda orientación antes del cuadro que calibra la primera. Se sincronizó la
  prueba con dos cuadros; tres repeticiones pasan en `browser-gyro.json`. No se
  modificó el control gyro ni se equipara este ensayo a un celular físico.

No se implementaron PBO, SharedArrayBuffer ni SIMD especulativos. WebGL2 admite
PBO pero no promete mapeo directo de memoria WASM sin copias ni DMA sin bloqueo;
la transferencia Worker ya usa transfer lists. La subida GPU, el navegador,
la red y el hardware requieren medición separada. No se prometen 60–120 fps,
cero GC ni lectura submilisegundo universal. Ver [WebGL2 de Khronos](https://registry.khronos.org/webgl/specs/latest/2.0/).

La resolución máxima y los huecos de cobertura pertenecen al producto de origen;
el visor no rellena datos faltantes. Se conserva PNG oficial para apariencia y
FITS IMAGE para flujo exploratorio, sin FLAGS/VARIANCE ni validación fotométrica.
VR/gyro/Android/Safari físicos y despliegue HTTPS siguen sin validar.
