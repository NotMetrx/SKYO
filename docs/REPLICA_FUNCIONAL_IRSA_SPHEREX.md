# Funciones de IRSA SPHEREx para replicar en SKYO

Fecha: 2026-11-15. Estado: investigación y propuesta de implementación; no modifica
la spec aprobada ni registra tareas como aprobadas o terminadas.

Implementación posterior del subconjunto autorizado, con simplificaciones y
evidencia, en [Archivo e inspector simplificados](ARCHIVO_SIMPLIFICADO_20261115.md).
La matriz de abajo conserva el snapshot de la investigación inicial.

## Fuente y alcance

La aplicación fuente es [SPHEREx Data Explorer de IRSA](https://irsa.ipac.caltech.edu/applications/spherex/).
Se contrastó su documentación oficial con el código actual de SKYO. El endpoint de
la aplicación respondió HTTP 200; el navegador interactivo no estuvo disponible
(`browser access host unavailable`). Por tanto, las funciones de IRSA indicadas
abajo están documentadas, pero no se probaron de extremo a extremo en su interfaz.
No se enviaron archivos ni trabajos de procesamiento a IRSA.

La propuesta conserva el cielo inmersivo de SKYO y añade un recorrido de trabajo:
buscar observaciones → seleccionar un resultado → inspeccionar datos → extraer una
medición exploratoria → exportarla con su procedencia. Las prioridades son una
decisión de implementación de SKYO, no una clasificación publicada por IRSA.

Los recibos HTTP con fecha, URL, tamaño y SHA-256 de la documentación están en
[sources.json](evidence/irsa-funciones-20261115/sources.json). No se incorporaron
copias del código o de los manuales externos al repositorio.

## Estado local usado en la comparación

Snapshot observado: HEAD `156961a`, con numerosos módulos nuevos todavía sin
seguimiento en Git. «Parcial» significa que existe una parte verificable en el
código; no acredita paridad con IRSA. «Pendiente» significa que no se encontró una
función equivalente accesible al usuario en las rutas revisadas.

| Referencia local | Función existente y límite observado |
| --- | --- |
| A — [fpa.js](../assets/js/fpa.js), [fpa-worker.js](../assets/js/science/fpa-worker.js) | Vista de seis detectores, consulta TAP acotada, FITS manual y contraste. No es un buscador general del archivo. |
| B — [immersive/](../assets/js/immersive/main.js), [hips.js](../assets/js/immersive/hips.js) | Cielo HiPS, selección de canal, navegación y control inmersivo. |
| C — [inspector.js](../assets/js/immersive/inspector.js), [cube-worker.js](../assets/js/immersive/cube-worker.js), [spectral.js](../assets/js/immersive/spectral.js) | Consulta por clic, lectura de IMAGE del cubo, λ/ancho de banda cuando están disponibles, copia y JSON. |
| D — [detail.js](../assets/js/immersive/detail.js), [detail-data.js](../assets/js/immersive/detail-data.js), [irsa.js](../assets/js/immersive/irsa.js) | Consulta puntual y detalle L2 con WCS/FLAGS; tamaño y selección de productos limitados. |
| E — [lab-ui.js](../assets/js/science/lab-ui.js), [session.js](../assets/js/science/session.js), [wasm-bridge.js](../assets/js/science/wasm-bridge.js) | Laboratorio A/B, verificación/procedencia, máscaras/varianza y diagnósticos exploratorios; sin garantía de fotometría científica. |
| F — [contexto.js](../assets/js/contexto.js) | Contexto 2MASS mediante Aladin Lite; no equivale al buscador general de catálogos de IRSA. |

## Inventario funcional: 38 capacidades

P0: primer bloque útil de réplica. P1: ampliación del análisis interactivo.
P2: integración avanzada o procesamiento que necesita validación adicional.
Cada referencia enlaza el capítulo oficial que documenta la función.

| ID | Función documentada en IRSA | Estado en SKYO y brecha concreta | Prioridad |
| --- | --- | --- | --- |
| IRSA-F01 | Posición por coordenadas o nombre, con formatos y marcos distintos. [Búsqueda][search] | Parcial A/D: RA/Dec numéricos; falta resolución de nombres y conversión explícita. | P0 |
| IRSA-F02 | Búsqueda por cono/polígono y relación espacial con observaciones. [Búsqueda][search] | Parcial A/D: punto y radio acotados; faltan regiones editables y relaciones espaciales. | P0 |
| IRSA-F03 | Consulta de una lista de objetivos. [Búsqueda][search] | Pendiente: importar posiciones, validar filas y asociar resultados a cada objetivo. | P1 |
| IRSA-F04 | Filtro temporal por UTC/MJD o intervalo relativo. [Búsqueda][search] | Pendiente: controles de fecha y consulta temporal; C muestra metadatos disponibles. | P0 |
| IRSA-F05 | Filtro por detector/banda y longitud de onda o intervalo. [Búsqueda][search] | Parcial A/B/D: selección de detector/canal; falta filtro espectral de resultados. | P0 |
| IRSA-F06 | Consulta TAP/ADQL y exploración de ObsCore. [Otras búsquedas][other] | Parcial A/D: consultas prefijadas; falta editor y exploración de esquema. | P2 |
| IRSA-F07 | Fondo de cielo HiPS multicanal. [Búsqueda][search] | Parcial B: disponible para la edición curada; no selector general de encuestas. | P0 |
| IRSA-F08 | Cobertura MOC y huellas de observaciones. [Búsqueda][search] | Pendiente: D representa un detalle localizado, no toda la cobertura del archivo. | P0 |
| IRSA-F09 | Resultados en tablas, imágenes y cobertura enlazadas; búsquedas en pestañas. [Resultados][results] | Parcial A/D: listas puntuales; falta selección compartida y vistas de resultados persistentes. | P0 |
| IRSA-F10 | Pan, zoom, ajuste, giro/norte y flip FITS. [Visualización][vis] | Parcial B/D: navegación inmersiva; falta barra de orientación de imagen. | P1 |
| IRSA-F11 | Lectura de coordenadas/píxel/λ, bloqueo y copia. [Visualización][vis] | Parcial C: clic, ICRS decimal, píxel base cero y JSON; faltan otros formatos y marcos. | P0 |
| IRSA-F12 | Navegación de HDU y planos de cubo. [Visualización][vis] | Parcial B/C/E: canales e interpretación de archivos; falta selector general de HDU/cabeceras. | P0 |
| IRSA-F13 | Extensiones científicas y productos relacionados. [Visualización][vis] | Parcial D/E: datos usados internamente; falta inspector explícito de IMAGE/FLAGS/VARIANCE/ZODI/EPSF/WCS-WAVE. | P0 |
| IRSA-F14 | Composición RGB. [Visualización][vis] | Pendiente: tres selecciones compatibles y controles independientes. | P1 |
| IRSA-F15 | Paletas, histogramas y estiramientos de contraste. [Visualización][vis] | Parcial A/B/E: contraste limitado; falta control común con histograma. | P1 |
| IRSA-F16 | Vistas alineadas y enlazadas por WCS. [Visualización][vis] | Parcial D/E: transformaciones y comparación; falta bloqueo interactivo entre visores. | P1 |
| IRSA-F17 | Recortes por posición y tamaño. [Visualización][vis] | Parcial D: recorte L2 automático; faltan elección de tamaño/centro y descarga dedicada. | P0 |
| IRSA-F18 | Capas, regiones DS9, marcadores y footprints. [Visualización][vis] | Parcial B/D/F: capas específicas; falta gestor general/importación/exportación de regiones. | P1 |
| IRSA-F19 | Máscaras seleccionables por bits. [Visualización][vis] | Parcial D/E: FLAGS usados; falta leyenda por versión y selector visible de bits. | P0 |
| IRSA-F20 | Regla angular. [Visualización][vis] | Pendiente: medir separación celeste entre dos posiciones. | P0 |
| IRSA-F21 | Extracción puntual a través de los planos. [Visualización][vis] | Parcial C: un píxel/canal; falta serie con tabla/gráfico y selección de apertura. | P1 |
| IRSA-F22 | Perfiles por fila/columna/trazo y aperturas. [Visualización][vis] | Pendiente: extracción interactiva con exportación y tratamiento de inválidos. | P1 |
| IRSA-F23 | Tabla con ordenación, filtros y columnas configurables. [Tablas][tables] | Pendiente: A/D no tienen tabla de análisis de resultados. | P0 |
| IRSA-F24 | Detalle de fila y columnas calculadas. [Tablas][tables] | Parcial C: inspector específico; falta operación sobre una tabla genérica. | P1 |
| IRSA-F25 | Selección de filas y guardado de tablas. [Tablas][tables] | Parcial C/E: exportación de diagnósticos JSON; faltan subconjuntos tabulares y formatos de intercambio. | P0 |
| IRSA-F26 | Búsqueda de catálogos y superposición de fuentes. [Catálogos][catalogs] | Parcial F: fondo de contexto; faltan consultas reales, identificación y selección enlazada. | P1 |
| IRSA-F27 | Dispersión, histogramas, mapas de densidad y trazas enlazadas. [Gráficos][plots] | Pendiente: gráficos interactivos derivados de tablas, con selección compartida. | P1 |
| IRSA-F28 | Espectros con errores, unidades, fechas, líneas y redshift. [Espectros][spectra] | Pendiente: C informa λ de un píxel; eso no constituye un visor de espectros. | P1 |
| IRSA-F29 | Carga local/URL de imágenes, tablas, espectros, regiones y productos relacionados. [Carga][upload] | Parcial A/E: FITS/entradas conocidas; falta importador de tablas/regiones y previsualización multiformato. | P1 |
| IRSA-F30 | Descarga de FITS y representación visual PNG/regiones. [Descargas][downloads] | Parcial A/C/E: original y reportes; falta exportación visual uniforme con metadatos. | P0 |
| IRSA-F31 | Descarga por lotes con elección de productos y empaquetado. [Descargas][downloads] | Pendiente: selección de observaciones/productos y paquete trazable. | P1 |
| IRSA-F32 | Generación de un script de descarga. [Descargas][downloads] | Pendiente: receta reproducible para los elementos seleccionados. | P1 |
| IRSA-F33 | Monitor de trabajos, progreso, resultados y cancelación. [Descargas][downloads] | Parcial A/D/E: cancelación de consultas locales; no monitor de trabajos de archivo/procesamiento. | P2 |
| IRSA-F34 | Cuenta y espacio de trabajo del usuario. [Carga][upload] | Parcial E: OPFS local optativo; falta persistencia compartida. Propuesta: priorizar sesión local exportable. | P2 |
| IRSA-F35 | Creación de mosaicos/cubos con parámetros de salida. [Mosaicos][mosaic] | Pendiente: visualizar HiPS o proyectar un recorte no crea un mosaico científico. | P2 |
| IRSA-F36 | Espectrofotometría forzada con modelos de fuente y PSF. [Espectrofotometría][sp] | Pendiente: T08/calibración incompletos; requiere un diseño científico validado o integración de servicio verificada. | P2 |
| IRSA-F37 | API de componentes de imagen, tabla, gráfico y cobertura. [Firefly][api] | Pendiente de decisión: son APIs reales de Firefly, no funciones instaladas en SKYO. Véase contrato abajo. | P2 |
| IRSA-F38 | Consultas VO externas y objetos de NED. [Otras búsquedas][other] | Pendiente: integración con servicios externos y atribución de resultados. | P2 |

## Contrato mínimo de implementación propuesto

Estas decisiones son propuestas para SKYO, no comportamientos ya implementados.
Se extienden los módulos existentes, sin introducir otro framework o una segunda
cola de Workers por defecto.

| Bloque | Punto de integración existente | Criterio de aceptación de la réplica |
| --- | --- | --- |
| Búsqueda y resultados — F01–F05, F09, F23, F25 | `queryObservations` en `immersive/irsa.js` y búsqueda de `fpa.js` | Consulta estructurada con región/marco, UTC o MJD e intervalo espectral; validación antes de pedir datos. Resultados muestran identificador, release, detector, fecha, cobertura, λ y URL. Ordenar/filtrar opera sobre un alcance explícito; si hay truncamiento se informa. Seleccionar una fila actualiza imagen y huella de la misma observación. Cancelar o repetir una consulta impide que una respuesta antigua sustituya la actual. |
| Cobertura y orientación — F07–F11, F18, F20 | `createSky`, `createControls`, `createInspector`, `sky-math.js` | Capas identificadas por procedencia/edición y con visibilidad independiente. Huellas reales, sin sustituirlas por objetos educativos. Regla por geometría esférica: comprobar cruce RA 0°/360° y proximidad polar. Estado de selección y canal único, controles por teclado y alternativa accesible al lienzo. |
| Inspector FITS — F12, F13, F17, F19 | `readFitsHeader`, `parseFits`, `inspectCutout`, `cutoutUrl`, Workers y `initKernel`/`processFitsTexture` | Lista de HDU con nombre, dimensiones, tipo y unidades; lectura acotada y cancelable. Original inmutable. Bits FLAGS con definición de la versión correspondiente. Extensiones ausentes se indican como ausentes; no se inventan varianza ni calibraciones. Cabecera y plano seleccionados coinciden con lo exportado. |
| Visores y contraste — F10, F14–F16 | `worldToPixel`, `pixelToWorld`, texturizado WASM y visor existente | Comparar imágenes con WCS conocido; si falta transformación fiable, mostrar el límite. RGB exige registro y compatibilidad documentados; contraste/paleta no alteran datos originales ni unidades. Validar inversión y giro con coordenadas conocidas. |
| Extracción exploratoria — F21, F22 | `fetchRange`, `cubeHeader`, `spectralTable`, `wavelengthAt` y Workers existentes | Serie devuelve coordenadas, píxel, plano/canal, λ/ancho disponibles, valor/unidad, máscara y procedencia. Elegir media/suma y apertura de forma explícita; conservar huecos e inválidos. Tabla y gráfico representan las mismas muestras. Rotular como perfil exploratorio: no convertir brillo superficial en flujo integrado sin calibración. |
| Tablas, catálogos y gráficos — F24, F26–F29, F38 | Resultados del buscador y `contexto.js`; reutilizar selección del inspector | Identificadores estables entre filas, fuentes y puntos. Unidades y errores visibles. Importación valida tamaño/esquema y no ejecuta expresiones arbitrarias. Fuente externa identificada y fallo de red recuperable. Un gráfico espectral conserva errores, flags y fecha por muestra. |
| Exportación reproducible — F25, F30–F34 | Exportadores del inspector/laboratorio y sesión local | Exportar consulta, selección, versiones, URLs, hashes efectivamente calculados y transformación aplicada. Distinguir FITS original, PNG renderizado y medición derivada. Archivos locales permanecen locales salvo acción explícita de envío. No simular progreso o un trabajo remoto que no existe. |
| Ciencia avanzada — F35, F36 | Preparación científica T08 y contratos del laboratorio | Requiere datos de calibración/procedencia, PSF, varianza y máscaras compatibles; definir fondo, unidades, reproyección y propagación de incertidumbre. Validar con referencias independientes y documentar sesgos antes de habilitar `scienceReady`. Servicios remotos: comprobar API, autenticación, límites y recuperación de trabajos antes de prometer ejecución. |

Hay dos defectos locales reproducidos que deben corregirse antes de extender los
controles de canal/selección: cambiar canal antes de cargar el manifiesto y la
selección involuntaria al terminar un gesto de pellizco. Evidencia en
[la revisión reciente](evidence/revision-reciente-20261115/review.json).
Esta investigación no los corrige ni cambia su estado.

## Funciones públicas reales de Firefly

La [API oficial][api] ofrece estos puntos de entrada:

| Función | Uso |
| --- | --- |
| `firefly.showImage(targetDiv, request)` | Montar imagen. |
| `firefly.showTable(targetDiv, request, options)` | Montar tabla. |
| `firefly.showChart(targetDiv, parameters)` | Montar gráfico. |
| `firefly.showCoverage(div, options)` | Montar cobertura. |

Firefly permite compartir un modelo de datos y escuchar acciones entre componentes.
Es una opción de reutilización que debe evaluarse contra el stack existente. Su
[repositorio oficial](https://github.com/Caltech-IPAC/firefly) y
[documentación de despliegue](https://github.com/Caltech-IPAC/firefly/blob/dev/docs/firefly-docker.md)
incluyen infraestructura propia; añadir estas llamadas por sí solas no implementa
la aplicación de IRSA. No se instaló Firefly ni se eligió una migración. Una
reutilización efectiva exige revisar licencia, dependencias y despliegue de la
versión elegida. No se propone usar interfaces obsoletas.

## Orden de ejecución y límites

1. Corregir las dos regresiones de canal/gesto; implementar búsqueda combinada,
   tabla enlazada y cobertura real con F01/F02/F04/F05/F08/F09/F23/F25.
2. Completar inspección de HDU/extensiones/FLAGS, recortes exportables y regla
   angular con F11/F12/F13/F17/F19/F20/F30.
3. Añadir selección múltiple, vistas WCS/RGB, contraste, perfiles, catálogos y
   gráficos: las funciones P1 del inventario.
4. Diseñar y validar por separado mosaicos, espectrofotometría y trabajos remotos.
   Decidir entonces si conviene integrar un servicio, Firefly o cálculo local.

El primer incremento termina cuando una consulta devuelve una tabla real y
seleccionar una observación actualiza la imagen, sus metadatos y su huella, con
cancelación y procedencia comprobables. No hace falta implementar las 38 funciones
para entregar ese recorrido completo.

Permanece `scienceReady=false`. La extracción de perfiles no acredita fotometría:
la documentación de [extracción visual][vis] y de [espectrofotometría][sp] describe
herramientas diferentes. La segunda usa ajuste de fuentes con Tractor y PSF; no
equivale a leer IMAGE ni a restar dos imágenes.

No se incluyen una cuenta en la nube, notificaciones, clon del diseño de IRSA ni
reescritura del stack en el primer incremento. No se fijan como constantes los
límites operativos actuales de servicios remotos. Originales FITS, metadatos y
distinción entre datos reales, sintéticos y manuales se conservan. Sin pruebas de
hardware no se declara validación en Android/VR.

Decisiones pendientes para capacidades P2: procesamiento local frente a servicio
remoto; fuentes de PSF/calibraciones compatibles; persistencia compartida frente a
sesión exportable. Ninguna impide comenzar el primer incremento propuesto.

[search]: https://irsa.ipac.caltech.edu/onlinehelp/spherex/spherex/searching.html
[results]: https://irsa.ipac.caltech.edu/onlinehelp/spherex/spherex/results.html
[vis]: https://irsa.ipac.caltech.edu/onlinehelp/spherex/spherex/visualization.html
[tables]: https://irsa.ipac.caltech.edu/onlinehelp/spherex/spherex/tables.html
[catalogs]: https://irsa.ipac.caltech.edu/onlinehelp/spherex/spherex/catalogs.html
[plots]: https://irsa.ipac.caltech.edu/onlinehelp/spherex/spherex/plots.html
[spectra]: https://irsa.ipac.caltech.edu/onlinehelp/spherex/spherex/spectra.html
[upload]: https://irsa.ipac.caltech.edu/onlinehelp/spherex/spherex/upload.html
[downloads]: https://irsa.ipac.caltech.edu/onlinehelp/spherex/spherex/downloads.html
[other]: https://irsa.ipac.caltech.edu/onlinehelp/spherex/spherex/othersearches.html
[mosaic]: https://irsa.ipac.caltech.edu/onlinehelp/spherex/spherex/mosaic.html
[sp]: https://irsa.ipac.caltech.edu/onlinehelp/spherex/spherex/sp.html
[api]: https://github.com/Caltech-IPAC/firefly/blob/dev/docs/firefly-api-overview.md
