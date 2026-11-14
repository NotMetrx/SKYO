# Investigación de datos NASA/IPAC para SKYO

Fecha local: 2026-11-13; recibos UTC del 14 de noviembre. Actor: `codex`.
Propuesta documental para revisar antes de implementar. Complementa la
[auditoría](AUDITORIA_SPEC_2026-11-13.md); no modifica ni aprueba el SPEC.

**Decisión propuesta:** conservar DR1+QR3 y el curador puntual, pero exigir
calibraciones espectrales científicas, versiones de ePSF y un conjunto real
verificable antes de habilitar conclusiones sobre cambios. Los metadatos
descubiertos todavía no constituyen un par de épocas validado.

## Fuentes y correcciones científicas

La guía vigente, fechada el 12/11/2026, recomienda DR1+QR3: DR1 reprocesa
Surveys 1–2 con la calibración de QR3; QR3 cubre Surveys 3–4. QR2 deja de ser
buscable y su descarga directa está prevista hasta febrero de 2027. Por ello,
una URL histórica QR2 no es una selección adecuada para trabajo nuevo.
[Releases oficiales](https://caltech-ipac.github.io/spherex-archive-documentation/spherex-data-releases/).

Hay dos correcciones necesarias en §3/P4/M6 del SPEC:

- **WCS-WAVE sirve para visualización:** su interpolación aproxima λ con
  precisión de alrededor de 1 nm. Para ciencia, IRSA exige las capas `CWAVE`
  y `CBAND` del producto Spectral WCS, con valores por píxel. También distingue
  el índice geométrico de canal de la longitud de onda calibrada.
- **ePSF no tiene una geometría universal:** la guía actual indica 21×21 zonas
  para D1/D2/D4/D5/D6 y 11×41 para D3; modelos de 33×33 con sobremuestreo 5.
  Hay que leer la tabla y sus metadatos, sin imponer 441 filas.

Ambas precisiones proceden de [Data Products](https://caltech-ipac.github.io/spherex-archive-documentation/spherex-data-products/).

El suplemento oficial obtenido es **v2.1, 2026-11-10**. Confirma la distinción
espectral anterior (§4.3.1). Para astrometría, `FINAST=0` es bueno, `1` parcial
y otros valores malos (§4.2.2). Los cubos DR1 ya sustraen ZODI (§2.5), a diferencia
de las imágenes L2. No aplicarles otra sustracción ZODI usando una regla común.
[Suplemento oficial](https://irsa.ipac.caltech.edu/data/SPHEREx/docs/SPHEREx_Expsupp.pdf).
El [recibo](evidence/investigacion-nasa-20261113/expsupp-receipt.json) fija URL,
fecha y SHA-256; el PDF permanece en `/tmp`, fuera del producto.

Para ePSF, conservar `PRIMARY.VERSION`: versiones ≥7.0 contienen `EPSF`.
La posición del recorte debe trasladarse al detector padre con
`x_parent=1+x_cutout−CRPIX1A` y el equivalente en Y. Seleccionar la zona usando
`XCENTER`/`YCENTER`; leer `OVSMPX`, `OVSMPY` y dimensiones. Para ajuste en píxeles
nativos, el modelo requiere fase subpíxel, integración y normalización;
no usar directamente la matriz sobremuestreada como kernel nativo.
[Tutorial ePSF](https://caltech-ipac.github.io/irsa-tutorials/spherex-psf/).

La alternativa espectral `W` usa la tabla del MEF y debe desactivar SIP;
el WCS espacial conserva SIP. Esta lectura produce λ aproximada útil para
preselección, sin sustituir CWAVE/CBAND.
[Tutorial de imágenes](https://caltech-ipac.github.io/irsa-tutorials/spherex-intro/).

## Acceso y selección concretos

Usar `https://irsa.ipac.caltech.edu/SIA` con `COLLECTION=spherex_dr1` y
`COLLECTION=spherex_qr3`; agregar `_deep` únicamente si se desea esa cobertura.
Reservar `spherex_dr1_cube` para mosaicos. SIA devuelve `access_url` y
`cloud_access`; las calibraciones no se descubren por SIA. El alta semanal puede
aparecer en TAP aproximadamente un día antes que en SIA.
[Guía de acceso](https://caltech-ipac.github.io/spherex-archive-documentation/spherex-data-access/).

Consulta TAP ejecutada, resumida aquí; texto y recibo íntegros en
[http-probes.json](evidence/investigacion-nasa-20261113/http-probes.json):

```sql
SELECT TOP 200 ar.uri, p.planeid, p.productid,
       p.time_bounds_lower, p.time_bounds_upper,
       p.energy_bandpassname, p.provenance_version,
       p.provenance_runid, p.quality_flag, o.collection
FROM spherex.artifact ar
JOIN spherex.plane p ON ar.planeid=p.planeid
JOIN spherex.observation o ON o.obsid=p.obsid
WHERE 1=CONTAINS(POINT('ICRS',210.80227,54.34895),p.poly)
  AND p.energy_bandpassname='SPHEREx-D2'
  AND o.collection IN ('spherex_dr1','spherex_qr3')
ORDER BY p.time_bounds_lower
```

Para producción, añadir `MAXREC`, preferir VOTable y verificar
`QUERY_STATUS`: HTTP 200 también puede contener un error; solo `MAXREC`,
no `TOP`, activa el indicador de desbordamiento. TAP sync tiene límite de
cinco minutos; async permite trabajos grandes, innecesarios para esta demo.
[TAP oficial](https://irsa.ipac.caltech.edu/docs/program_interface/TAP.html).

En SIA, `BAND` se expresa en metros y selecciona imágenes por intersección
del intervalo `em_min/em_max`; no comprueba la λ de una fuente en un píxel.
`TIME` usa MJD. Acotar `POS`, colección y `MAXREC`; SIA cancela trabajos que
superan cinco minutos.
[SIA oficial](https://irsa.ipac.caltech.edu/ibe/sia.html).

El recorte se solicita al `access_url` IBE con `center` y `size`; acepta grados
o píxeles. Un ROI `size=128pix` expresa mejor el presupuesto del laboratorio
que asumir que 0.1° equivale a 128 píxeles. Se conserva la orientación del
detector y puede recortarse contra el borde: verificar dimensiones y cobertura
devueltas. Los recortes SPHEREx no vienen gzip.
[Servicio de recortes](https://irsa.ipac.caltech.edu/ibe/cutouts.html).

La alternativa S3 oficial es anónima, sin credenciales ni cargos de egreso,
en bucket `nasa-irsa-spherex`, región `us-east-1`, prefijos `dr1`/`qr3`.
[Cloud Access](https://irsa.ipac.caltech.edu/cloud_access/).
Propuesta: obtener rutas desde `cloud_access` o listado acotado; no fabricar
rutas a partir de ejemplos. El listado real usa **cal-swcs-v5-2026-191**,
mientras la guía ilustra `cal-wcs`. Fijar key, versión y SHA-256 del archivo
seleccionado; un ETag observado no sustituye esa huella.

HiPS es el camino de navegación global. Leer `properties` para longitudes de
onda y disponibilidad: 102 capas nominales, índices **50 y 51 base 0** vacíos
(canales 51/52 base 1). Mostrar «canal sin datos»; no inferir ausencia de fuente.
Los PNG son visuales y el cubo combina exposiciones, sin representar una época
individual. [Tutorial HiPS](https://caltech-ipac.github.io/irsa-tutorials/spherex-hipscube/).

## Qué se comprobó en esta investigación

Evidencia adicional en [esta carpeta](evidence/investigacion-nasa-20261113/):

| Prueba acotada | Resultado | Límite |
| --- | --- | --- |
| TAP M101/D2, TOP 200, DR1+QR3 | 84 filas: 52 DR1 y 32 QR3; `provenance_version=7.0.5`; MJD 60805.711548–61215.138195 | `quality_flag` vacío: no equivale a calidad aprobada; no mide λ en ROI |
| S3 HEAD del MEF DR1 usado en la auditoría | 200; tamaño 64.800.000 bytes | No se descargó el MEF |
| S3 GET `Range: bytes=0-17279` con Origin | 206; exactamente 17.280 bytes; `Access-Control-Allow-Origin: *` | Evidencia HTTP, falta ensayo navegador/origen publicado |
| HiPS properties con Origin | 200; 3.504 bytes; CORS `*` | No se verificaron todos los tiles |
| Listado Spectral WCS DR1 y QR3 | Seis productos por release, 33.312.960 bytes cada uno; mismas keys relativas y ETags | No se descargaron las matrices ni se certificó aplicación por exposición |
| Listado ePSF DR1 + cabeceras D3 por rango | Coexisten v1 de 441 filas y v2 de 451, ambas sobremuestreo 5 | No suponer que todo MEF D3 ya incorpora v2; resolver procedencia |
| Tabla oficial de 3I/ATLAS | 200; 276.887 bytes; 259 filas, todas QR2; contiene posición predicha y enlaces DataLink | Requiere migración a DR1; no se descargaron imágenes del cometa |
| Consulta inicial con `p.obsid='2025W31_2A_0156_1'` | HTTP 200, `QUERY_STATUS=ERROR`: el campo es UUID | El nombre legible se consulta como `o.observationid`; conservar error como caso de validación |
| Resolución corregida de esa exposición por `o.observationid` | Seis detectores DR1, `provenance_version=7.0.5`, MJD 60888.333440 | Solo se resolvió una exposición histórica; sin certificar el resto de la tabla |

La auditoría anterior ya inspeccionó un recorte real DR1 de 6×6 píxeles y
contrastó cuatro puntos WCS con Astropy. Esa evidencia sigue siendo parcial;
no se repitió ni se convirtió en prueba de precisión absoluta.

La [consulta corregida de 3I/ATLAS](evidence/investigacion-nasa-20261113/3iatlas-first-exposure-valid-query.json)
incluye rutas IBE actuales para los seis detectores. La tabla histórica aporta
RA 252.66330208911876°, Dec −17.490409029955288° para esa exposición;
son coordenadas predichas del cometa, no el centro del detector ni una medición
astrométrica realizada por SKYO.

## Fotometría y demostraciones

El Source Discovery Tool oficial busca **fuentes rojas** mediante diferencia
D4−D2; eso no es una detección de movimiento. Su flujo sirve como referencia:
conversión de brillo con Pixel Solid Angle Map, fondo local, máscaras,
reproyección y fotometría de apertura. Incluye dependencias Python/SExtractor
y conserva referencias QR2: no copiarlo como una implementación web DR1 ya
validada. [Notebook oficial](https://caltech-ipac.github.io/irsa-tutorials/spherex-source-discovery-tool-demo/).

El Spectrophotometry Tool oficial realiza fotometría forzada: ajusta flujo,
mantiene posición/morfología suministradas, modela fondo y usa el mapa de área
sólida para convertir a μJy. No recentra fuentes de alto movimiento propio.
Sus flags de fotometría incluyen bits 32/33, distintos del bitmap L2 de
32 bits: si se importan, no pasarlos por operaciones bitwise JS de 32 bits.
Puede servir como referencia externa para una fuente fija bien localizada;
no se ejecutó un trabajo en este estudio.
[Ayuda oficial](https://irsa.ipac.caltech.edu/onlinehelp/spherex/spherex/sp.html).

| Blanco propuesto | Uso concreto | Condición antes de llamarlo demo lista |
| --- | --- | --- |
| M101, RA 210.80227°, Dec 54.34895°, D2 | Continuar el caso real ya documentado; control de fondo/registro y prueba sin cambio esperado | Elegir dos fechas por λ y calidad, no las primeras separadas 14 días; encontrar estrellas de control, sin tratar la galaxia como fuente puntual |
| Campo del tutorial ePSF, RA 305.59875°, Dec 41.14888889° | Reproducir selección ePSF y desplazamiento del recorte al detector padre | Verificar la revisión concreta, borde y suficientes píxeles de fondo |
| 3I/ATLAS | Demostración posterior de un objeto móvil conocido con posiciones predichas por exposición | Resolver los IDs históricos en DR1; comprobar banda, SNR y extensión antes de seleccionar par |

IRSA advierte que 3I/ATLAS tiene SNR bajo en muchas λ y es extendido: no
recomienda su Spectrophotometry Tool para este objeto. Por eso es un candidato
educativo condicionado, no el primer ensayo de precisión ni evidencia de un
objeto nuevo. [Página primaria y tabla](https://irsa.ipac.caltech.edu/data/SPHEREx/docs/comet3iatlas/index.html).

## Requisitos propuestos para el plan y sus pruebas

1. **Curación reproducible:** conservar originales y separar el recorte IBE del
   derivado SKYO. Manifiesto validado con colección, UUID y observationid,
   detector, tiempos inicial/medio/final, `VERSION`, URLs/key, fecha de consulta,
   consulta exacta, hashes y bytes. Registrar HDU conservadas/omitidas,
   transformación, versión del curador y calibraciones. No usar `ORIGIN` como
   prueba de autenticidad o simulación.
2. **Capacidades explícitas:** distinguir vista, resta exploratoria y análisis
   pendiente de validación. Exigir CWAVE/CBAND mapeados al detector padre,
   ePSF y calidad para elevar capacidad. Un resumen λ central o el mismo detector
   no bastan. No se encontró un umbral oficial universal de Δλ para comparar
   movimiento; cualquier tolerancia deberá justificarse y probarse.
3. **Disponibilidad:** tres intentos totales de descarga transitoria, respetando
   `Retry-After`; sin él, espera limitada de 5/10 s. Registrar fallo/parcial y
   conservar dataset válido anterior. No anunciar éxito con un solo archivo.
   Validar FITS completo, huella y dimensiones antes de publicar el manifiesto.
   El tutorial ePSF ya reconoce errores transitorios; el 503 real con
   `Retry-After` está en la auditoría previa.
4. **Pruebas de aceptación antes de implementar el flujo completo:** fixtures
   de QUERY_STATUS ERROR/OVERFLOW, 503→200, agotamiento, descarga incompleta;
   ePSF 441/451 y offsets CRPIX1A/2A; contraste de CWAVE/CBAND con referencia;
   par real compatible y par incompatible; flags críticos y NaN; informe que
   permite reconstruir ambos insumos y calibraciones.
5. **Ensayo web separado:** probar HiPS, S3 Range y recorte IBE en navegador
   desde el origen publicado, límites de memoria y cancelación. El 206 con
   CORS observado no valida por sí solo un lector FITS remoto completo.

No se alteró aplicación/SPEC ni se descargaron cubos o MEFs completos. No se
validaron pares espectrales, fotometría, detección, navegador, WASM o Android.
