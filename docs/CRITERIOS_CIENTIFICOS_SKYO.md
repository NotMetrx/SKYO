# Criterios científicos propuestos para SKYO

Revisión documental: 2026-11-13, actor `codex`. Propuesta para incorporar al
SPEC principal; **no es aprobación científica ni evidencia de ejecución**.
Conserva la arquitectura local-first. El comparador exploratorio puede empezar
con datos curados; la clasificación científica exige las puertas siguientes.

## 1. Tiempo y geometría: contrato mínimo

Guardar `timeScale`, `mjdStart`, `mjdMid`, `mjdEnd`, `timeSourceKeyword` y los
valores originales de cabecera. Mostrar qué instante representa cada fecha.
El suplemento oficial distingue `MJD-OBS`/`MJD-BEG` del comienzo y `MJD-AVG`
del punto medio; su ejemplo declara `TIMESYS=UTC`. Esa documentación QR debe
contrastarse con las cabeceras del release realmente descargado, sin asumir
que una columna TAP de límite inferior representa el punto medio.
`DATE` no será sustituto de la época observada. [Suplemento SPHEREx,
tabla de cabeceras](https://irsa.ipac.caltech.edu/data/SPHEREx/docs/SPHEREx_Expsupp_QR.pdf).

**Aceptación temporal propuesta:** conservar inicio/medio/fin, comprobar su
orden y la coherencia de ISO/MJD con una biblioteca astronómica; guardar la
tolerancia empleada y la precisión de los campos fuente. No convertir a UTC
añadiendo `Z` a una cadena de escala desconocida. Para efemérides y centroides,
usar el punto medio y registrar esa elección; si no existe, cualquier punto
medio derivado debe indicar fórmula y entradas. El reporte conservará también
el intervalo para evaluar desplazamiento durante la integración.

Guardar `observerOrigin`, `observerFrame`, `observerEpoch`, posición, velocidad,
unidades, fuente y versión. El suplemento enumera `X_SC/Y_SC/Z_SC` (km) y
`VX_SC/VY_SC/VZ_SC` (km/s) en el punto medio y declara origen geocéntrico.
**Origen geocéntrico no acredita orientación ICRF**: verificar el marco de esas
componentes antes de suministrarlas a otro servicio. No inventar un código
Horizons de SPHEREx. [Suplemento SPHEREx,
cabeceras de posición y velocidad](https://irsa.ipac.caltech.edu/data/SPHEREx/docs/SPHEREx_Expsupp_QR.pdf).

**Aceptación geométrica propuesta:** una identificación exacta debe utilizar
el observador SPHEREx y la época correspondiente. Un cálculo desde el centro
de la Tierra se etiqueta como aproximado y no basta para marcar «Conocido».
Si se quiere aceptar esa aproximación, cuantificar primero su error sobre ese
objeto y compararlo con el presupuesto astrométrico del experimento.

## 2. Interfaces concretas para contrastar objetos

| Fuente primaria | Uso y contrato propuesto | Condición de aceptación |
| --- | --- | --- |
| [JPL Small-Body Identification](https://ssd-api.jpl.nasa.gov/doc/sb_ident.html) | Buscar cuerpos menores por campo, instante y observador. Admite `xobs` geocéntrico en ICRF (km, km/s), o `xobs-hel` heliocéntrico (au, au/d). Guardar solicitud/respuesta, `signature.version`, instante y límites del campo; solicitar segunda pasada numérica. | Lista de posibles identidades; verificar cada asociación. Un resultado vacío no prueba que una fuente sea nueva. No usar un límite de magnitud V como garantía de detectabilidad en infrarrojo. |
| [JPL Horizons API](https://ssd-api.jpl.nasa.gov/doc/horizons.html) y [manual](https://ssd.jpl.nasa.gov/horizons/manual.html) | Efemérides de un cuerpo identificado: fijar `CENTER`, `REF_SYSTEM`, escala temporal y parámetros de salida. `TLIST` admite MJD con `TLIST_TYPE=MJD`. Para comparación con catálogo, Horizons distingue coordenadas astrométricas de aparentes; pedir el tipo coherente con el WCS. | Conservar centro y tipo de coordenadas devueltos. Para fechas SPHEREx, `TIME_TYPE=UT` corresponde a UTC según Horizons. No intercambiar salida aparente con RA/Dec astrométricas. Guardar incertidumbre orbital cuando esté disponible; ausente no equivale a cero. |
| [ESA Gaia DR3: modelo `gaia_source`](https://gea.esac.esa.int/archive/documentation/GDR3/Gaia_archive/chap_datamodel/sec_dm_main_source_catalogue/ssec_dm_gaia_source.html) | Contraparte estelar: fijar release; conservar `source_id` como cadena decimal, `ref_epoch`, RA/Dec ICRS, movimiento propio, paralaje, velocidad radial disponible, errores y correlaciones. La época del catálogo se expresa como año juliano TCB. | Propagar al instante observado con un método astronómico contrastado y tratar el paralaje del observador. `pmra` ya contiene cos(dec). Campos ausentes se declaran; nunca se rellenan con cero sin registrar la aproximación. |
| [AllWISE: campos](https://irsa.ipac.caltech.edu/data/WISE/docs/release/AllWISE/expsup/sec2_1a.html) y [movimientos](https://irsa.ipac.caltech.edu/data/WISE/docs/release/AllWISE/expsup/sec2_6.html) | Contraparte infrarroja/histórica: conservar catálogo, identificador, RA/Dec, errores, tiempos por banda, fotometría y flags de calidad. AllWISE proporciona MJD mínimo/máximo/medio por banda. | No extrapolar sus `pmra/pmdec` como movimiento propio puro: el suplemento advierte que mezclan movimiento y paralaje y no permiten predecir posiciones en otras épocas. Una coincidencia espacial aislada es una asociación posible. |

La separación angular se evalúa en el plano tangente con incertidumbres de
centroide, registro, catálogo/efeméride y propagación. **Propuesta:** guardar
residual y covarianza total, criterio de asociación y alternativas; elegir su
umbral con controles documentados. No fijar un radio universal de 2″. Si falta
el presupuesto de errores o hay varias asociaciones plausibles, devolver
«asociación no resuelta». Ausencia en Gaia o WISE tampoco demuestra novedad.

## 3. Compatibilidad espectral, PSF y significancia

La guía vigente de IRSA reserva `WCS-WAVE` para visualización (aproximación
de alrededor de 1 nm); exige `CWAVE` y `CBAND` del producto de calibración
Spectral WCS para análisis científico. Igual detector no significa igual
respuesta espectral. [Productos SPHEREx](https://caltech-ipac.github.io/spherex-archive-documentation/spherex-data-products/).

**Aceptación espectral propuesta:** cada comparación guarda λ y ancho de
banda en los píxeles usados, identificadores de calibración y política de
compatibilidad. No adoptar una tolerancia λ universal sin probarla con
espectros/controles adecuados. Una pareja sin calibración suficiente permite
vista individual o diferencia ilustrativa con aviso; bloquea interpretar el
residuo como cambio intrínseco.

Seleccionar la ePSF usando la posición en el detector original y la versión,
conservando la transformación desde el recorte y las convenciones de índices.
No fijar 441 zonas: DR1/QR3 documentan 21×21 salvo detector 3, con 11×41.
El tutorial pide leer las zonas de la tabla y advierte que su número depende
de la versión. [Productos SPHEREx](https://caltech-ipac.github.io/spherex-archive-documentation/spherex-data-products/),
[tutorial oficial ePSF](https://caltech-ipac.github.io/irsa-tutorials/spherex-psf/).

**Aceptación PSF propuesta:** separar comprobar una transformación WCS frente
a Astropy de medir la precisión astrométrica sobre fuentes reales. Registrar
residuales de registro y fotometría con ePSF o un procedimiento de igualación
validado. Una diferencia de matrices con distinto perfil no prueba variabilidad.
La literatura de sustracción precisa las hipótesis de registro, muestreo y
ruido bajo las cuales se puede interpretar una significancia; no garantiza
esas hipótesis para SKYO. [Zackay, Ofek y Gal-Yam,
2016](https://arxiv.org/abs/1601.02655).

El SNR actual por píxel seguirá siendo **exploratorio**. No se verificó un
umbral NASA aplicable a SKYO ni una tasa de falsos positivos de su pipeline.
**Propuesta:** habilitar clasificación solo con un perfil versionado que
declare estadístico (píxel/fuente/movimiento), umbral, máscaras, tratamiento de
covarianza por reproyección, número de pruebas y controles usados. Validarlo
con fuentes conocidas, regiones sin cambio e inyecciones rotuladas sintéticas
sobre fondos reales; publicar completitud, falsos positivos e incertidumbres
por rango de flujo y condiciones. Los umbrales son decisiones del experimento,
no constantes físicas ni criterios oficiales de NASA.

## 4. Puertas de entrega verificables

1. **Comparador real:** dos observaciones auténticas con distinta época,
   procedencia completa y calibraciones declaradas; controles temporales,
   espaciales, espectrales, flags y varianza; exportación que permita repetir
   exactamente la comparación. M101 es un campo de control, no un blanco de
   movimiento demostrado por tener cobertura.
2. **Asociación conocida:** además, observador/época/marco correctos, fuente
   identificada en cada época útil y residual compatible con su criterio de
   incertidumbre; guardar alternativas y respuesta del catálogo/servicio.
3. **Candidato para revisión:** además, perfil de significancia validado,
   inspección de artefactos y confirmación con observación independiente según
   el protocolo del experimento. Ninguna de estas puertas acredita «Planeta X».

Cada puerta tendrá informe, entradas con hash, versión del algoritmo y
resultado reproducible; permanece pendiente hasta ejecutar la prueba.

## 5. Blancos del reto y límites de esta revisión

No se recuperó la pestaña oficial Resources de «Planet X and SPHEREx»:
la [URL oficial](https://www.spaceappschallenge.org/2026/challenges/planet-x-and-spherex/)
devolvió error en el navegador de investigación; el GET local falló por cadena
de certificados. No se desactivó TLS. Por ello **no se certifica una lista de
cinco blancos oficiales** ni su detectabilidad. WISE 0855, Barnard, Epsilon
Indi B, RW Aurigae y R Draconis son únicamente nombres por cotejar con el reto,
no criterios de aceptación aprobados. Confirmar identidades/componentes,
coordenadas/épocas, cobertura, λ y visibilidad antes de preparar esos paquetes.

Se leyeron fuentes HTML oficiales y documentación JPL/ESA/IRSA. Las tablas
temporales y de estado del suplemento QR se consultaron mediante el índice
web oficial; no se descargó ni revisó íntegramente su PDF de gran tamaño.
No se generaron efemérides, cruces ni mediciones de fuentes; no se cambió código.
Pendiente: verificar el marco de los vectores SPHEREx del release elegido,
fijar el perfil experimental y ejecutar estas pruebas con datos reales.
