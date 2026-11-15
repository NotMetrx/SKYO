# Validación local de implementación — 2026-11-14

Proyecto `skyo`, actor `codex`, spec `002-comparador-local`. El usuario autorizó
iniciar T01 y continuar las tareas restantes, después de integrar `origin/main`
en `4ee3f74`. Este informe describe trabajo local; no registra aprobación ni
cierre de tareas en la mente general. No se hizo commit ni push.

## Resultado y alcance

Se implementaron las rutas técnicas T01–T07 del comparador exploratorio en los
laboratorios integrado e independiente. T08 tiene una inspección reproducible
de insumos, sin aceptación científica. La demostración sintética, los archivos
manuales y el paquete NASA derivado tienen procedencias diferentes y explícitas.

| Tarea / RF | Cambio y evidencia | Límite |
| --- | --- | --- |
| T01 / 03,13,14 | Sesión compartida, versiones por selección, hash y snapshot; Worker y render rechazan mensajes obsoletos; contratos runtime de análisis/diagnóstico; regresiones de carreras y exportación | Un manifiesto arbitrario no autentica procedencia NASA |
| T02 / 04,05,06 | Curador conserva originales, HDUs, VERSION, tiempos y geometría EPSF; reintentos acotados, QUERY_STATUS, publicación atómica y salida parcial; seis pruebas Python | La consulta TAP nueva agotó su presupuesto; selección desde CSV previamente obtenido y descargas FITS nuevas verificadas |
| T03 / 07,08,09,20 | Validación FITS antes de asignación, FLAGS uint32/BZERO, política por propósito, TAN/SIP y marcos/unidades admitidos; 27 muestras reales D2/D3/D6 contra Astropy | Equivalencia de software, no exactitud astrométrica absoluta ni soporte de todo FITS/WCS |
| T04 / 06,10,11,12 | Dos épocas DR1 D2, dos ROI de M101, cobertura espacial/espectral visual, control A/A; fondo robusto, SOURCE excluida del fondo de ambos lados, ZODI solo si existen ambos mapas | Selección espectral heurística, PSF sin igualar y significancia sin calibrar |
| T05 / 01,02,19 | Lugar/Tiempo/Luz, vistas A/B/diferencia/SNR y blink manual; HERA determinista; bitácora sin movimiento inventado, nombres escapados; navegador móvil y Axe | Sin certificación WCAG ni baseline visual aprobado |
| T06 / 14,15,16 | OPFS por generaciones y publicación de estado; cuota/segundo archivo/commit fallidos preservan pareja previa; hash al reabrir, borrado explícito; PWA raíz/subruta y actualización | Cuota ensayada por inyección de fallo, no llenando un disco; evicción sigue dependiendo del navegador |
| T07 / 12,16,20 | Rust + wasm32 + glue real, hash verificado, Worker raíz/subruta y fallback ante ausencia/corrupción/trap; cinco casos de equivalencia y benchmark | No mejora universal; mediciones locales de Chromium, sin Android físico |
| T08 / 10,11,12,17,18 | CWAVE/CBAND D2 y ePSF por zona extraídos, coordenadas contrastadas con cabeceras padre y hashes preservados | `scienceReady:false`; faltan compatibilidad de versión, PSF integrada, geometría del observador, catálogos, controles y revisión independiente |

## Pruebas ejecutadas

Los comandos reproducibles están en el [pipeline local](pipelines/validacion-local.md).
Recibos actuales en [implementacion-20261114](evidence/implementacion-20261114/):

| Comprobación | Resultado | Recibo |
| --- | --- | --- |
| `npm test` | 43/43, cero omitidas; incluye las cuatro regresiones antes fallidas | [Node](evidence/implementacion-20261114/node-tests.txt) |
| Curador Python | 6/6 | [Python](evidence/implementacion-20261114/python-tests.txt) |
| `cargo test --locked` | 2/2 | [Rust](evidence/implementacion-20261114/rust-tests.txt) |
| Compilación wasm32 y generación/carga del glue | Correctas | [Build WASM](evidence/implementacion-20261114/wasm-glue-build.txt) |
| Vite y postbuild | Correctos, 36 recursos precache; WASM presente | [Build](evidence/implementacion-20261114/build.txt) |
| Navegador Chromium | 26/26, cero omitidas (6,3 minutos) | [Suite final](evidence/implementacion-20261114/browser-final.json) |
| Desarrollo Vite, datos reales y export | Sin pageerror, Rust/WASM activo | [Desarrollo](evidence/implementacion-20261114/dev-server.json) |

La suite de navegador comprueba ambos laboratorios, archivos reales y demo,
exportación, estados inválidos, accesibilidad automatizada, ancho móvil, OPFS,
offline con `Vary: Origin`, actualización consentida, gráficos diferidos y
fallback WASM. Sus fallos no se convierten en aprobación por pasar Node.

## Dataset visual y procedencia

[m101-visual-v2](../public/datasets/m101-visual-v2/manifest.json) contiene cuatro
FITS de 12×12, dos regiones no solapadas del mismo campo, con selección y mapas
de cobertura por píxel. Los FITS publicados suman 345.600 bytes. Se omite EPSF
en el perfil visual y se conserva referencia al original completo.

Las observaciones son `2025W19_2B_0377_1` y `2025W20_2D_0120_1`, DR1, D2,
VERSION `7.0.5`. Sus MJD medios UTC son `60805.91604884` y `60811.215360576`:
intervalo aproximado de 5,2993 días. La selección registra IDs/grupos, footprint,
hashes, transformaciones y política espectral en
[pair-selection.json](../public/datasets/m101-visual-v2/pair-selection.json).

Las dos ROI tienen 120 y 121 píxeles de solapamiento espacial; el 100% de ese
solapamiento cumple la heurística visual `|λA−λB| ≤ 0.25·min(ancho de banda)`.
Este umbral es una decisión del proyecto, no un criterio científico de NASA.
Tras calidad y remuestreo quedan 110 y 111 píxeles de análisis. El fondo dispone
de solo 6 y 44 muestras limpias: muestra pequeña que limita la interpretación.
El centro de M101 rechazado por carecer de fondo limpio se conserva con su motivo.

La consulta TAP nueva tuvo 502/timeout y no se presenta como exitosa. El CSV
histórico de 84 filas sustentó la selección; los recortes se descargaron de IRSA
durante este trabajo, con bytes y SHA-256 verificados. Los originales de curación
se mantienen en `data/datasets/` y no se publican automáticamente en `dist/`.
El constructor es `scripts/build_visual_dataset.py`, con publicación atómica y
autocomprobaciones. Las carpetas de evidencia T02–T04 conservan los recibos.

La procedencia NASA solo se reconoce con el hash del registro curado incluido
en la aplicación. Un archivo manual desconocido sigue siendo `USER-LOCAL`;
`ORIGIN`, nombre o metadatos aportados por el visitante no bastan. La clasificación
no acredita una detección ni una calibración científica completa.

## WCS, diferencia e incertidumbre

Los fixtures reales de `tests/fixtures/wcs-real.json` comparan nueve posiciones
por detector D2/D3/D6 con Astropy 8.0.2. El error máximo de equivalencia medido es
`9.149e-11` píxeles, por debajo de `1e-4` píxeles de tolerancia de software.
Se rechazan otros ejes/unidades/marcos, SIP mal formado, matrices singulares y
dimensiones mayores de 512 por eje; no se afirma soporte WCS universal.

IMAGE no se modifica. El fondo excluye SOURCE de A y B, ajusta plano robusto en
copias y usa ZODI solo cuando está en ambas imágenes. La varianza remuestreada
usa pesos bilineales al cuadrado. El reporte declara los términos omitidos:
PSF, covarianza de remuestreo, incertidumbre del fondo y calibración. El SNR es
aproximado, no una probabilidad de hallazgo. Los controles idénticos se rotulan.

## WASM medido

Se usó `wasm-bindgen-cli 0.2.130`, coincidente con `science-core/Cargo.lock`.
El generador comprueba versión, compila con `--locked`, genera glue web y carga
el binario con una llamada real. No requiere `wasm-pack`.
Binario: 25.278 bytes, SHA-256
`173039a1888940f97b3ca1c65603d600d54527343bd92284060c1dec6ba02524`.

Una prueba roja detectó pérdida de precisión del offset y desbordamiento de
varianza al calcular en f32. El núcleo calcula intermedios en f64 y devuelve f32.
La [equivalencia](evidence/t07-wasm-20261114/equivalence.json) cubre cinco casos,
incluidos dos pares NASA preparados: error absoluto máximo 0 y acuerdo NaN/máscara.

[Benchmark](evidence/t07-wasm-20261114/benchmark.json), medianas en ms dentro de
Worker Chromium, con copia del glue; excluye WCS, fondo y arranque:

| Píxeles | JavaScript | WASM |
| --- | --- | --- |
| 144 | 0,0675 | 0,0655 |
| 16.384 | 2,1825 | 2,0400 |
| 262.144 | 64,4833 | 33,0750 |

En la [corrida anterior](evidence/t07-wasm-20261114/benchmark-anterior.json),
el tamaño intermedio fue más lento con WASM (2,655 ms frente a 1,930 ms JS).
La variación entre corridas impide prometer una mejora universal. JS permanece
como fallback explícito. El hash completo se conserva en el reporte, no en el texto
visible del control. No extrapolar estos tiempos a un dispositivo móvil.

## T08: preparado, sin aceptación científica

[Inspección](evidence/t08-preparacion-20261114/inspection.json): calibración D2
CWAVE/CBAND de 33.312.960 bytes, SHA-256
`0eb4e27f351e6161e21372818f9e811480a7ab8bab9295722f180791e151a463`.
El original está en `data/calibrations/originals/`. Se verificaron coordenadas
de ROI contra cabeceras padre; se extrajo ePSF 33×33 de la zona correspondiente,
con sobremuestreo 5×5 leído de las tarjetas, sin integrarlo ni usarlo en ciencia.

La calibración declara software `7.0.0b6.post2+g6b3a1a7` y las imágenes `7.0.5`.
La diferencia no demuestra incompatibilidad: falta establecer la asociación
versionada correcta. `versionCompatibilityVerified:false` y `scienceReady:false`
impiden presentar estos insumos como aceptados. Tampoco se verificó geometría
orbital del observador ni se hicieron asociaciones Gaia/JPL.

Para cerrar T08 faltan: vínculo de calibración/versiones; integración y fase
subpíxel de ePSF con normalización/PSF matching; propagación de incertidumbres;
observador, época y marcos; referencias Gaia/WISE/JPL; inyección/recuperación,
falsos positivos/completitud y revisión independiente. Referencias primarias:
[tutorial ePSF](https://caltech-ipac.github.io/irsa-tutorials/spherex-psf/) y
[suplemento SPHEREx](https://irsa.ipac.caltech.edu/data/SPHEREx/docs/SPHEREx_Expsupp.pdf).

## Estado administrativo y límites de entrega

El registro central conserva T01–T08 pendientes. El claim de T01 fue rechazado
por aprobación pendiente/invalidada; no se autoaprobaron documentos ni se ejecutó
`finish`. Los cambios locales están autorizados por el usuario y se registran en
`log`, sin inventar una sesión MCP autenticada. Las copias centrales antiguas no
se sincronizaron implícitamente al actualizar estos archivos.

Los resultados sustentan la revisión técnica del comparador I/V y del motor
opcional G7; no constituyen aprobación formal ni aceptación C/G8. No se probó
Android/Safari físico, producción HTTPS, rendimiento móvil ni revisión científica
independiente. El control de cuota usa fallos inyectados y no prueba evicción.
Las licencias y atribuciones de Aladin se conservan; su distribución requiere la
decisión de licencia pendiente indicada en la memoria. FITS originales preservados.

Recibo de hashes del código, configuración, pruebas, paquete y resultados:
[receipt.json](evidence/implementacion-20261114/receipt.json).
