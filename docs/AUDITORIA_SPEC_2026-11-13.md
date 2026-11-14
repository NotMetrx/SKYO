# Auditoría del SPEC científico y del acceso NASA/IRSA

Fecha local: 2026-11-13, America/Lima (recibos HTTP del 14 de noviembre UTC).
Documento revisado: `SPEC_SKYO_2.1_AUDITADO.md`, SHA-256
`0f0d5d1b7ee4d8c87686ca394b28d1f39e192ff960e88b05d7238fee36ea81e2`.
Actor: codex. El SPEC y el código de aplicación permanecen sin cambios.

**Veredicto: corregir los hallazgos 1–6 antes de validar el comparador para
trabajar con datos NASA.** La arquitectura local-first y las precauciones
científicas son razonables. Los enlaces bibliográficos están activos, pero eso
no demuestra la corrección del flujo completo ni su reproducibilidad.

## Alcance y método

Se leyeron SPEC, README, curador Python, contratos, parser, WCS, pipeline,
Worker, interfaz, OPFS y configuración de publicación. Se consultaron protocolo
y skill SDD de mente_general y se registró la actividad mediante MCP.

Se comprobaron por GET los **14 enlaces Markdown del SPEC**, dos referencias
adicionales del README y ambos DOI: **18/18 HTTP 200**. Ocho de estos corresponden
a SPHEREx/IRSA/IPAC y sus DOI; los otros diez son referencias técnicas.
No se recorrieron recursivamente todos los enlaces de los sitios de NASA.
Las URLs de ejemplo localhost/LAN no se tratan como fuentes de datos públicas.

Además se probaron TAP, SIA DR1/QR3/cubo, propiedades HiPS, cabecera de un cubo
FITS y solicitudes acotadas de recortes. Astropy 8.0.2 se instaló solamente en
un entorno temporal `/tmp/skyo-spec-audit-venv`; no se añadieron dependencias
al proyecto. Se descargó un recorte DR1 real a `/tmp`, sin alterar las demos.

## Hallazgos que deben corregirse

### 1. Una carga antigua puede reemplazar la observación que aparece en pantalla — alto

**Qué ocurre:** `web/main.js:29` lee el File de forma asíncrona y lo envía al
Worker sin comprobar de nuevo si el job sigue vigente. `web/worker.js:40`
reemplaza `images[side]` sin rechazar jobs anteriores. La interfaz sí ignora
respuestas antiguas (`web/main.js:129`), pero eso no protege el estado del Worker.

**Caso comprobado:** cargar A con job 3 y luego recibir tardíamente A con job 1.
La pantalla conserva job 3; la comparación siguiente utiliza job 1. En la
reproducción, comparar B contra B debía producir offset 0, pero después de la
carga tardía produjo **−7.001718521118164**, correspondiente a otra pareja.
Contradice la garantía operativa que se atribuye a jobId en §7.

**Corrección mínima:** descartar lecturas antiguas antes de postMessage y
proteger la última carga por lado dentro del Worker; invalidar comparación y
reporte al cambiar las entradas. Probar el orden de llegada 3 → 1.
Sin corregirlo, los resultados pueden corresponder a archivos distintos de los visibles.

Evidencia: [worker-stale-load.json](evidence/auditoria-spec-20261113/worker-stale-load.json).
Es una reproducción del manejador del Worker en Node, no una prueba de navegador.

### 2. Los datos NASA del curador se etiquetan como sintéticos — alto

**Qué ocurre:** el curador escribe `ORIGIN="NASA/IPAC via SKYO curator"`
(`tools/curate_irsa.py:105`); `summaryText` considera sintético cualquier origen
que contenga SKYO (`web/main.js:95`). Por tanto, un FITS NASA derivado legítimo
recibe la etiqueta **DATOS SINTÉTICOS**.

Se reprodujo tanto con la condición exacta como con el origen del FITS real
procesado. Esto contradice §3: procedencia discriminada y nunca deducida de un
nombre o texto informal. Los tipos `.d.ts` no aportan validación en ejecución;
el manifiesto solo exige `items` como array y el hash es opcional.

**Corrección mínima:** normalizar y validar sourceKind al cargar, distinguir
NASA-DERIVED de SYNTHETIC y mantener USER-LOCAL si no hay procedencia comprobada.
No usar el texto ORIGIN como prueba de autenticidad ni de simulación.
Sin corregirlo, el usuario no puede confiar en la clasificación de procedencia.

Evidencia: [reproducciones-locales.json](evidence/auditoria-spec-20261113/reproducciones-locales.json)
y [fits-real-inspection.json](evidence/auditoria-spec-20261113/fits-real-inspection.json).

### 3. El curador elimina la versión de procesamiento necesaria para trazabilidad — medio

**Qué ocurre:** `save_cutout` crea un PRIMARY vacío (`tools/curate_irsa.py:111`)
y no registra `VERSION` en su manifiesto. El recorte real traía **VERSION 7.0.5**;
el derivado no la conserva. También omite EPSF sin registrar explícitamente esa
exclusión en un campo de capacidad del manifiesto.

La documentación oficial explica que la versión permite interpretar la ePSF;
véase el [tutorial de ePSF](https://caltech-ipac.github.io/irsa-tutorials/spherex-psf/).
La omisión de EPSF puede ser intencional en un producto solo visual para reducir
tamaño, pero ese derivado no debe presentarse como paquete completo para M6.

**Corrección mínima:** copiar los metadatos originales pertinentes de PRIMARY,
registrar versión de pipeline/curador y lista de HDU conservadas u omitidas.
Mantener EPSF o declarar que se requiere recuperar el original para análisis PSF.
Sin corregirlo, el paquete derivado pierde información necesaria para repetir
o ampliar el análisis aunque conserve el hash y URL del recorte de origen.

Evidencia real en fits-real-inspection.json. `save_cutout` procesó los bytes
descargados mediante una respuesta requests reutilizada en memoria para evitar
otra descarga. No se ejecutó main() completo con astroquery.

### 4. El lector WCS acepta sistemas que interpreta incorrectamente — medio

**Qué ocurre:** `wcsFromHeader` solo exige que CTYPE contenga TAN
(`web/src/wcs.js:31`) y no comprueba CUNIT ni los ejes RA/Dec.
Se le entregó `GLON-TAN/GLAT-TAN` en radianes y lo aceptó como coordenadas
ecuatoriales en grados. Contradice P5, que exige rechazar WCS desconocidos.

**Corrección mínima:** aceptar explícitamente los pares RA---TAN/DEC--TAN y
RA---TAN-SIP/DEC--TAN-SIP, con unidades admitidas; rechazar o convertir otros.
Sin corregirlo, un FITS manual con otra convención puede producir una reproyección
incorrecta sin error visible. Esto no invalida el buen resultado del recorte DR1
ensayado, cuyos ejes y unidades sí son compatibles.

Evidencia: reproducciones-locales.json y wcs-vs-astropy.json.

### 5. El informe exportado no permite reconstruir qué observaciones se compararon — medio

**Qué ocurre:** `web/main.js:115` exporta info del Worker, que no incluye IDs,
hashes, fechas, release, URLs ni WCS de las dos entradas. Tampoco aplica el
ComparisonReport declarado en contracts.d.ts (observationA/B y estados en inglés);
el runtime devuelve `status: "exploratorio"` y otros nombres de propiedades.
Por ejemplo, `lastReport` conserva validCount, mientras el contrato pide validPixels.

Esto incumple el objetivo de informe reproducible de P10. La matriz de aceptación
ya deja la exportación completa pendiente: no es un criterio que deba marcarse
como cumplido por la mera existencia del botón JSON.

**Corrección mínima:** incluir dos registros de procedencia completos y unificar
un único esquema de reporte entre Worker, exportación y `.d.ts`, con validación
de runtime o comprobación de tipos efectiva. Sin corregirlo, guardar el JSON
no basta para reconstruir ni verificar el análisis.

Evidencia: bloque exacto de reporte en reproducciones-locales.json.

### 6. La ruta de datos reales necesita distinguir servicio ocupado y datos inexistentes — medio

TAP y SIA funcionaron. Sin embargo, el recorte inicial de 0.1° respondió 503;
el de 0.01° del mismo archivo respondió 200 y descargó un FITS completo. Dos
solicitudes QR3 también recibieron 503, una con `Retry-After: 5` y cuerpo
`Server busy, retry later.` No se puede concluir que QR3 carezca de datos:
SIA sí devolvió una observación QR3.

El curador no reintenta descargas transitorias: descarta cada fallo y puede
terminar con un conjunto incompleto o sin observaciones. §12 solo destaca
CORS/compresión; debe añadir disponibilidad, reintentos acotados y un mínimo
de dos épocas compatibles antes de anunciar una demostración real.

**Corrección mínima:** respetar Retry-After con reintentos limitados para errores
transitorios y declarar éxito parcial; comprobar cantidad/fechas/compatibilidad
antes de considerar listo un dataset. Sin corregirlo, una caída temporal puede
confundirse con falta de cobertura o dejar un dataset insuficiente.

Evidencia: cutout-download.json, cutout-retries.json y qr3-download.json.

## Ajustes documentales adicionales

| Ubicación | Inconsistencia o precisión necesaria | Ajuste mínimo |
| --- | --- | --- |
| M1, línea 289 | `npm run build` falla: ese script no existe | Usar `npm run web:build`, como indica README |
| §5, línea 195 | Se cita `web/sw.js`, que no existe | Ruta real: `web/public/sw.js` |
| Encabezado, §1 y fuente 10 | `SPEC(1).md` no está incluido | Adjuntar la fuente v1 o marcar trazabilidad no comprobable |
| ADR, línea 13 | «aprobadas para proponer» mezcla propuesta y aprobación | Indicar estado y evidencia de revisión por decisión |
| §13 / P9 | Se mencionan JPL/Gaia/WISE sin interfaces/versiones concretas | Añadir fuentes específicas y geometría/época del observador; Gaia es ESA, no NASA |
| §3 / diseño de selector λ | Son 102 capas nominales; HiPS informa dos vacías, índices 50 y 51, base 0 | Mostrar disponibilidad y no interpretar una capa vacía como ausencia de una fuente |
| §5 / tabla de limitaciones | Los recortes no son necesariamente iguales al MEF original comprimido | En el recorte DR1 ensayado FLAGS ya vino como ImageHDU sin compresión |
| §11 y notas de entrega | «No se probó contra IRSA/Astropy» describe el pasado | Incorporar esta evidencia parcial sin marcar la validación completa como cumplida |

Los estados sin implementar (detección, ePSF, WCS espectral por píxel, HERA,
integración con frontend original y validación Android) ya están reconocidos en
el SPEC. No son por sí mismos contradicciones ni hallazgos de código nuevo.

## Enlaces originales verificados

Todos respondieron 200 por GET siguiendo redirecciones. Evidencia con método,
URL final, título, tipo de contenido y hora: [enlaces-http.json](evidence/auditoria-spec-20261113/enlaces-http.json).

| Fuente | Enlace | Resultado |
| --- | --- | --- |
| IRSA SPHEREx | https://irsa.ipac.caltech.edu/Missions/spherex.html | 200 |
| Overview DR1 | https://irsa.ipac.caltech.edu/data/SPHEREx/docs/overview_dr1.html | 200 |
| Tutorial de imágenes | https://caltech-ipac.github.io/irsa-tutorials/spherex-intro/ | 200 |
| Tutorial de recortes | https://caltech-ipac.github.io/irsa-tutorials/spherex-cutouts/ | 200 |
| Tutorial HiPS | https://caltech-ipac.github.io/irsa-tutorials/spherex-hipscube/ | 200 |
| Releases (README) | https://caltech-ipac.github.io/spherex-archive-documentation/spherex-data-releases/ | 200 |
| DOI imágenes DR1 | https://doi.org/10.26131/IRSA678 | 200; título correcto |
| DOI cubo DR1 | https://doi.org/10.26131/IRSA679 | 200; título correcto |
| Aladin | https://github.com/cds-astro/aladin-lite | 200 |
| Licencia Aladin | https://github.com/cds-astro/aladin-lite/blob/master/LICENSE | 200 |
| WebAssembly | https://developer.mozilla.org/en-US/docs/WebAssembly | 200 |
| Workers | https://developer.mozilla.org/en-US/docs/Web/API/Web_Workers_API/Using_web_workers | 200 |
| OPFS | https://developer.mozilla.org/en-US/docs/Web/API/File_System_API/Origin_private_file_system | 200 |
| Aislamiento | https://developer.mozilla.org/en-US/docs/Web/API/Window/crossOriginIsolated | 200 |
| Vite build | https://vite.dev/guide/build.html | 200 |
| Vite assets (README) | https://vite.dev/guide/assets | 200 |
| fitsio-pure | https://docs.rs/crate/fitsio-pure/latest | 200; no se probó su compatibilidad |
| fitsy | https://docs.rs/fitsy/latest/fitsy/ | 200; no se probó su compatibilidad |

## Acceso real y fuentes complementarias

| Servicio | Comprobación ejecutada | Resultado y límite |
| --- | --- | --- |
| TAP `/TAP/sync` | Esquema y consulta del curador con TOP 1 | 200, URL DR1, MJD 60805.711548, colección spherex_dr1 |
| TAP con TOP 40 | Parámetros M101/D2 del README | 40 registros, 3 épocas tras filtro de separación de 14 días; no demuestra λ compatible |
| SIA DR1 | Consulta de M101, MAXREC=1 | 200, una observación real |
| SIA QR3 | Consulta de M101, MAXREC=1 | 200, una observación real; descarga ensayada 503 |
| SIA cubo DR1 | Consulta de M101, MAXREC=1 | 200, metadatos y URL de cubo; sin descargar cientos de MB |
| HiPS properties | GET del recurso del tutorial | 200, 102 capas, dos vacías, Access-Control-Allow-Origin: * |
| Cubo FITS Npix445 | HEAD del ejemplo oficial | 200; no se descargó ni validó el contenido completo |
| Directorios IBE raíz/dr1/qr3 | GET de rutas indicadas en guía oficial | 404; no implican que los archivos individuales sean inaccesibles |
| JPL Horizons y SBDB | GET de documentación oficial | 200; no se generaron efemérides ni se identificaron objetos |
| WISE y Gaia | GET de portales oficiales | 200; sin cruces de catálogos |

Fuentes complementarias:
[acceso SPHEREx](https://caltech-ipac.github.io/spherex-archive-documentation/spherex-data-access/),
[propiedades HiPS](https://irsa.ipac.caltech.edu/data/hips/SPHEREx/spherex_allsky_cube/properties),
[Horizons](https://ssd-api.jpl.nasa.gov/doc/horizons.html),
[SBDB](https://ssd-api.jpl.nasa.gov/doc/sbdb.html),
[WISE](https://irsa.ipac.caltech.edu/Missions/wise.html),
[Gaia ESA](https://gea.esac.esa.int/archive/).

**CORS:** se enviaron solicitudes con Origin `https://skyo-audit.example` a SIA,
recortes y HiPS. SIA y el recorte FITS descargado no devolvieron
Access-Control-Allow-Origin; HiPS properties sí devolvió `*`. La consulta TAP
inicial tampoco mostró esa cabecera, aunque no llevaba Origin. Una prueba CLI
200 no equivale a fetch permitido desde la web. Mantener carga manual y paquetes
del mismo origen como ruta soportada; verificar de nuevo en el origen publicado.
No se hicieron preflights ni pruebas CORS en un navegador real.

## Lo confirmado científicamente y sus límites

La [documentación de releases](https://caltech-ipac.github.io/spherex-archive-documentation/spherex-data-releases/)
está fechada el 12/11/2026 y recomienda DR1+QR3 frente a QR2. El overview y los
DOI confirman el release de noviembre de 2026 y la correspondencia de los dos
identificadores citados. Esa fecha documental no fija por sí sola una hora
exacta de anuncio. No se encontró una contradicción de release que justifique
volver a QR2.

La estructura IMAGE/FLAGS/VARIANCE/ZODI/EPSF/WCS-WAVE del SPEC coincide con el
recorte real inspeccionado. La documentación distingue mapas de brillo, varianza
y ZODI; sustraer ZODI como opción y no presentar el SNR como descubrimiento
son decisiones coherentes. El WCS espectral exige la tabla y desactivar SIP
en la alternativa W, como hace el curador; el navegador todavía no lo interpreta.

Resultados del ensayo real:

- Recorte DR1 D2 de 0.01° en M101: **3.954.240 bytes**, imagen **6×6 píxeles**,
  con EPSF de 441 filas. El tamaño de la imagen por sí solo no predice la descarga.
- SHA-256: `c801cfc42275ef1e762a460f796dda2843279db31f8b843b918b4508cd0575e8`.
- Parser JS: IMAGE, FLAGS sin compresión, VARIANCE y ZODI legibles.
- Astropy: centro λ ≈ **1.506421284 µm**, ancho ≈ **0.036952739 µm**.
- WCS JS frente a Astropy, cuatro puntos: error angular máximo
  **1.81×10⁻¹⁰ arcsec** y error inverso **1.26×10⁻¹¹ píxeles**.
  Esto es consistencia numérica sobre una muestra, no precisión astrométrica
  absoluta, calibración de todo el detector ni validación de todos los FITS.
- `npm test`: **12 aprobadas, 0 fallos**. No cubren las cargas fuera de orden
  ni certifican detección con observaciones reales.

El [tutorial HiPS](https://caltech-ipac.github.io/irsa-tutorials/spherex-hipscube/)
y las propiedades recuperadas confirman 102 capas nominales y los canales vacíos.
La [guía de acceso](https://caltech-ipac.github.io/spherex-archive-documentation/spherex-data-access/)
identifica colecciones SIA separadas de DR1, QR3, deep y cubo: el SPEC debería
fijar esos endpoints en lugar de limitarse a nombrar protocolos.

## Cierre

No se aprueba el SPEC ni se marca la matriz completa como superada. Orden de
corrección sugerido: jobs/procedencia → trazabilidad del curador/reporte → WCS
admitidos → errores transitorios → ajustes de documentación. Después repetir
con dos fechas reales de λ compatible y verificar la UI.

No comprobado: build real Vite, Rust/WASM, Android/Safari/PWA, browser CORS,
ePSF matching, detección, movimientos propios ni cruces JPL/Gaia/WISE.
