# Fuentes y citas de SKYO

Documento de referencia para **citar** lo que SKYO usa y afirma. Reúne las
fuentes primarias (datos, servicios y literatura), las fuentes técnicas y la
documentación interna, con una clave estable por fuente, su estado de
verificación HTTP real y el límite de lo que cada una permite afirmar.

> **Estado:** propuesta documental. No aprueba el SPEC, no valida ciencia y no
> sustituye a [`SPEC_SKYO_2.1_AUDITADO.md`](SPEC_SKYO_2.1_AUDITADO.md).
> Fecha: 2026-11-14. Actor: `codex`. Ver [§8](#8-mantenimiento) para actualizar.

---

## Para qué sirve

1. Que cualquier afirmación del proyecto (docs, UI, informe o respuesta) pueda
   rastrearse hasta una fuente concreta.
2. Que nadie tenga que volver a buscar las URLs ni decidir cómo llamarlas.
3. Que la diferencia entre **fuente**, **medición de este entorno** y
   **decisión del proyecto** quede explícita, como exige la
   [constitución](constitution.md).

Regla de oro: una cifra de este repositorio (84 filas, 441/451 filas de ePSF,
102 capas HiPS, 259 filas de 3I/ATLAS) se cita **con su recibo**, no con la
página oficial sola. La página dice qué debería pasar; el recibo dice qué
respondió el servicio ese día.

---

## Cómo se cita

Formato de clave: `ÁREA-TEMA` en mayúsculas, estable y sin fechas.

```
[SPX-PRODUCTS]  Productos científicos y calibraciones de SPHEREx (IRSA)
[JPL-SBIDENT]   JPL Small-Body Identification API
[GAIA-DR3]      Gaia DR3, modelo gaia_source
```

En texto:

> El WCS-WAVE solo sirve para visualización; la ciencia exige `CWAVE`/`CBAND`
> [SPX-PRODUCTS], [SPX-SPECWCS].

En tablas: una fila por fuente con su clave y su URL. En bibliografía final:
orden alfabético por clave, URL completa y fecha de consulta.

**No** se citan capturas de pantalla, resultados de otra sesión, ni «se probó y
funcionó». Lo que no tiene recibo se marca como pendiente.

---

## 1. Fuentes primarias: datos y servicios

### 1.1 SPHEREx / IRSA

| Clave | Fuente | URL | Qué sostiene en SKYO | Verificado |
| --- | --- | --- | --- | --- |
| `SPX-MISSION` | Misión SPHEREx en IRSA | <https://irsa.ipac.caltech.edu/Missions/spherex.html> | Punto de entrada oficial; existencia del archivo y servicios | 200 · 2026-11-14 04:20Z |
| `SPX-RELEASES` | Releases oficiales (DR1, QR3, QR2) | <https://caltech-ipac.github.io/spherex-archive-documentation/spherex-data-releases/> | DR1+QR3 sustituyen a QR2 para trabajo nuevo; QR2 buscable hasta feb-2027 | 200 · 2026-11-14 04:20Z |
| `SPX-DR1` | Overview de DR1 y DOI | <https://irsa.ipac.caltech.edu/data/SPHEREx/docs/overview_dr1.html> | DR1 reprocesa Surveys 1–2 con calibración QR3; release de noviembre 2026 | 200 · 2026-11-14 04:20Z |
| `SPX-PRODUCTS` | Productos científicos y calibraciones | <https://caltech-ipac.github.io/spherex-archive-documentation/spherex-data-products/> | WCS-WAVE visual (~1 nm); CWAVE/CBAND para ciencia; geometría ePSF por detector | 200 · 2026-11-14 16:48Z |
| `SPX-ACCESS` | Acceso, SIA y colecciones | <https://caltech-ipac.github.io/spherex-archive-documentation/spherex-data-access/> | Colecciones `spherex_dr1`/`spherex_qr3`; retraso ~1 día de SIA frente a TAP | 200 · `servicios-http.json` (sin barra final) |
| `SPX-INTRO-WCS` | Tutorial de imágenes y WCS | <https://caltech-ipac.github.io/irsa-tutorials/spherex-intro/> | WCS alternativo `W` se evalúa sin SIP; el espacial conserva SIP | 200 · 2026-11-14 04:20Z |
| `SPX-CUTOUTS` | Tutorial de recortes (TAP + IBE) | <https://caltech-ipac.github.io/irsa-tutorials/spherex-cutouts/> | Patrón artifact+plane y `center`/`size` para pedir un recorte | 200 · 2026-11-14 04:20Z |
| `SPX-EPSF` | Tutorial ePSF | <https://caltech-ipac.github.io/irsa-tutorials/spherex-psf/> | Selección de zona ePSF, `OVSMPX/OVSMPY`, traslado al detector padre | 200 · 2026-11-14 16:48Z |
| `SPX-HIPS` | Tutorial HiPS y cubo | <https://caltech-ipac.github.io/irsa-tutorials/spherex-hipscube/> | 102 capas nominales; `properties`; PNG visuales, no una época | 200 · 2026-11-14 04:20Z |
| `SPX-SPECWCS` | Calibraciones espectrales | <https://irsa.ipac.caltech.edu/data/SPHEREx/docs/spherex_spectral_calibrations.html> | Capas `CWAVE`/`CBAND` por píxel; distinción con índice de canal | 200 · 2026-11-14 16:48Z |
| `SPX-PHOT` | Ayuda de fotometría y flags | <https://irsa.ipac.caltech.edu/onlinehelp/spherex/spherex/sp.html> | Fotometría forzada, conversión a μJy, bits 32/33 de flags | 200 · 2026-11-14 16:48Z |
| `SPX-SUPP` | Suplemento de exploración v2.1 (2026-11-10) | <https://irsa.ipac.caltech.edu/data/SPHEREx/docs/SPHEREx_Expsupp.pdf> | FINAST (0 bueno, 1 parcial); cubos DR1 ya restan ZODI | 200 · 2026-11-14 16:48Z |
| `SPX-SUPP-QR` | Suplemento QR (cabeceras, posición/velocidad) | <https://irsa.ipac.caltech.edu/data/SPHEREx/docs/SPHEREx_Expsupp_QR.pdf> | `MJD-OBS/BEG` vs `MJD-AVG`; `X_SC/Y_SC/Z_SC` geocéntrico, no ICRF | 200 · 2026-11-14 16:48Z |
| `SPX-3IATLAS` | Página y tabla de 3I/ATLAS | <https://irsa.ipac.caltech.edu/data/SPHEREx/docs/comet3iatlas/index.html> | 259 filas QR2, posiciones predichas; SNR bajo y objeto extendido | 200 · 2026-11-14 16:48Z |
| `SPX-SDT` | Source Discovery Tool (notebook) | <https://caltech-ipac.github.io/irsa-tutorials/spherex-source-discovery-tool-demo/> | Busca fuentes rojas por D4−D2; **no** es detección de movimiento | 200 · 2026-11-14 16:48Z |
| `SPX-DOI-IMG` | DOI imágenes DR1 | <https://doi.org/10.26131/IRSA678> | Identificador citable del release de imágenes | 200 · 2026-11-14 04:20Z |
| `SPX-DOI-CUBE` | DOI cubo DR1 | <https://doi.org/10.26131/IRSA679> | Identificador citable del cubo espectral | 200 · 2026-11-14 04:20Z |

### 1.2 Servicios IRSA / IVOA (endpoints y contratos)

| Clave | Fuente | URL | Qué sostiene en SKYO | Verificado |
| --- | --- | --- | --- | --- |
| `IRSA-TAP-DOC` | Documentación TAP (límites, sync/async) | <https://irsa.ipac.caltech.edu/docs/program_interface/TAP.html> | Sync ≤ 5 min; `QUERY_STATUS`; `MAXREC` frente a `TOP` | 200 · 2026-11-14 16:48Z |
| `IRSA-SIA-DOC` | Documentación SIA | <https://irsa.ipac.caltech.edu/ibe/sia.html> | `BAND` en metros; `TIME` en MJD; cancelación a los 5 min | 200 · 2026-11-14 16:48Z |
| `IRSA-CUTOUTS-DOC` | Parámetros de recortes IBE | <https://irsa.ipac.caltech.edu/ibe/cutouts.html> | `center`, `size` en grados o `pix`; el recorte conserva orientación | 200 · 2026-11-14 16:48Z |
| `IRSA-CLOUD` | Cloud Access (S3 anónimo) | <https://irsa.ipac.caltech.edu/cloud_access/> | Bucket `nasa-irsa-spherex`, `us-east-1`, prefijos `dr1`/`qr3` | 200 · 2026-11-14 16:48Z |
| `IRSA-TAP-EP` | Endpoint TAP sync | <https://irsa.ipac.caltech.edu/TAP/sync> | Consulta del curador (metadatos artifact/plane/observation) | 200 · 2026-11-14 04:40Z (con consulta válida)¹ |
| `IRSA-SIA-EP` | Endpoint SIA | <https://irsa.ipac.caltech.edu/SIA> | Descubrir imágenes por colección y posición | 200 · `servicios-http.json` (con `COLLECTION`+`POS`)¹ |
| `IRSA-HIPS-PROPS` | `properties` del HiPS SPHEREx | <https://irsa.ipac.caltech.edu/data/hips/SPHEREx/spherex_allsky_cube/properties> | Longitudes de onda y disponibilidad por capa; CORS `*` | 200 · 2026-11-14 04:40Z |
| `IRSA-DATA-DIR` | Directorio web de datos SPHEREx | <https://irsa.ipac.caltech.edu/ibe/data/spherex/> | **Sin estado 200** en el recibo; un 404 de directorio no invalida un `access_url` | sin 200 · `servicios-http.json` (sin fecha) |

¹ Las raíces `TAP` y `SIA` devolvieron **502** al comprobarlas sin parámetros el
2026-11-14 16:48Z; con consulta válida constan 200 a las 04:20–04:40Z del mismo
día. No es un enlace roto: es un servicio que exige parámetros y puede estar
caído o limitado. Ver [§4.3](#43-discrepancias-y-observaciones).

### 1.3 JPL Solar System Dynamics

| Clave | Fuente | URL | Qué sostiene en SKYO | Verificado |
| --- | --- | --- | --- | --- |
| `JPL-SBIDENT` | Small-Body Identification API | <https://ssd-api.jpl.nasa.gov/doc/sb_ident.html> | Qué cuerpos conocidos caen en un campo/instante; `xobs` geocéntrico ICRF | 200 · 2026-11-14 16:48Z |
| `JPL-HORIZONS` | Horizons API | <https://ssd-api.jpl.nasa.gov/doc/horizons.html> | Efemérides con `CENTER`, `REF_SYSTEM`, `TLIST_TYPE=MJD` | 200 · `servicios-http.json` (sin fecha) |
| `JPL-HORIZONS-MANUAL` | Manual de Horizons | <https://ssd.jpl.nasa.gov/horizons/manual.html> | Semántica de coordenadas astrométricas vs aparentes | 200 · 2026-11-14 16:48Z |
| `JPL-SBDB` | Small-Body Database API | <https://ssd-api.jpl.nasa.gov/doc/sbdb.html> | Identidad y órbita de un cuerpo; **no** detecta fuentes | 200 · `servicios-http.json` (sin fecha) |

### 1.4 Catálogos de contrapartes

| Clave | Fuente | URL | Qué sostiene en SKYO | Verificado |
| --- | --- | --- | --- | --- |
| `GAIA-ARCHIVE` | Archivo Gaia (ESA) | <https://gea.esac.esa.int/archive/> | Punto de entrada del catálogo estelar | 200 · `servicios-http.json` (sin fecha) |
| `GAIA-DR3` | Gaia DR3, modelo `gaia_source` | <https://gea.esac.esa.int/archive/documentation/GDR3/Gaia_archive/chap_datamodel/sec_dm_main_source_catalogue/ssec_dm_gaia_source.html> | `source_id` como cadena, `ref_epoch`, `pmra` con cos(dec) | 200 · 2026-11-14 16:48Z |
| `WISE-ALLWISE-FIELDS` | AllWISE: campos y calidades | <https://irsa.ipac.caltech.edu/data/WISE/docs/release/AllWISE/expsup/sec2_1a.html> | Contraparte infrarroja; MJD mínimo/máximo/medio por banda | 200 · 2026-11-14 16:48Z |
| `WISE-ALLWISE-MOTION` | AllWISE: advertencia sobre movimientos | <https://irsa.ipac.caltech.edu/data/WISE/docs/release/AllWISE/expsup/sec2_6.html> | `pmra/pmdec` mezclan movimiento propio y paralaje; no predicen otra época | 200 · 2026-11-14 16:48Z |

### 1.5 Literatura

| Clave | Fuente | URL | Qué sostiene en SKYO | Verificado |
| --- | --- | --- | --- | --- |
| `LIT-ZACKAY-2016` | Zackay, Ofek y Gal-Yam (2016), sustracción de imágenes | <https://arxiv.org/abs/1601.02655> | Hipótesis de registro, muestreo y ruido para interpretar una significancia | 200 · 2026-11-14 16:48Z |

> La cita de este artículo en [CRITERIOS_CIENTIFICOS_SKYO.md](CRITERIOS_CIENTIFICOS_SKYO.md)
> es **contextual**: no se replicó su método ni se validó su estadístico.

---

## 2. Fuentes técnicas

No son fuentes científicas. Sostienen decisiones de implementación.

| Clave | Fuente | URL | Qué sostiene en SKYO | Verificado |
| --- | --- | --- | --- | --- |
| `TECH-ALADIN` | Aladin Lite (CDS) | <https://github.com/cds-astro/aladin-lite> | Visor HiPS en navegador; `newImageSurvey(URL)` para capas propias | 200 · 2026-11-14 04:20Z |
| `TECH-ALADIN-LICENSE` | Licencia de Aladin Lite (GPL v3) | <https://github.com/cds-astro/aladin-lite/blob/master/LICENSE> | Compatibilidad de licencia con SKYO (MIT): **abierta** | 200 · 2026-11-14 04:20Z |
| `TECH-VITE-BUILD` | Vite: build | <https://vite.dev/guide/build.html> | Empaquetado estático y rutas base para publicar | 200 · 2026-11-14 04:20Z |
| `TECH-VITE-ASSETS` | Vite: assets | <https://vite.dev/guide/assets> | Manejo de assets y rutas con hash | 200 · 2026-11-14 04:20Z |
| `TECH-MDN-WASM` | MDN WebAssembly | <https://developer.mozilla.org/en-US/docs/WebAssembly> | Carga del módulo WASM opcional y su fallback | 200 · 2026-11-14 04:20Z |
| `TECH-MDN-WORKERS` | MDN Web Workers | <https://developer.mozilla.org/en-US/docs/Web/API/Web_Workers_API/Using_web_workers> | Worker del pipeline FITS | 200 · 2026-11-14 04:20Z |
| `TECH-MDN-OPFS` | MDN OPFS | <https://developer.mozilla.org/en-US/docs/Web/API/File_System_API/Origin_private_file_system> | Persistencia local de datasets | 200 · 2026-11-14 04:20Z |
| `TECH-MDN-COI` | MDN `crossOriginIsolated` | <https://developer.mozilla.org/en-US/docs/Web/API/Window/crossOriginIsolated> | Requisito de cabeceras para aislamiento | 200 · 2026-11-14 04:20Z |
| `TECH-FITSIO-PURE` | `fitsio-pure` (Rust) | <https://docs.rs/crate/fitsio-pure/latest> | Lector FITS candidato para el núcleo | 200 · 2026-11-14 04:20Z |
| `TECH-FITSY` | `fitsy` (Rust) | <https://docs.rs/fitsy/latest/fitsy/> | Alternativa de lectura FITS, sin decidir | 200 · 2026-11-14 04:20Z |

**Bibliotecas citadas por nombre, sin URL fijada en el repositorio:** Astropy,
`reproject`, `photutils`, `astropy-healpix`, `scikit-image`, `pyvo`,
`astroquery`, `pyvo`/`astroquery` para TAP y SIA2, FastAPI, Three.js (vendorizado
en `assets/js/vendor/three.min.js`), Lottie (vendorizado). Antes de citarlas en
un informe, fijar versión y URL canónica; no se inventan aquí.

---

## 3. Trazabilidad: afirmación → fuente

Afirmaciones que el proyecto **sí** puede sostener, con su fuente y su recibo
cuando la cifra procede de una medición propia.

| # | Afirmación | Fuente | Recibo / nota |
| --- | --- | --- | --- |
| 1 | DR1+QR3 reemplazan a QR2 para trabajo nuevo | `SPX-RELEASES`, `SPX-DR1` | — |
| 2 | WCS-WAVE (~1 nm) es visual; ciencia exige CWAVE/CBAND | `SPX-PRODUCTS`, `SPX-SPECWCS` | — |
| 3 | ePSF no tiene geometría universal: D3 11×41=451; resto 21×21=441 | `SPX-PRODUCTS`, `SPX-EPSF` | Cabeceras D3: `evidence/investigacion-nasa-20261113/epsf-d3-*` |
| 4 | Coexisten calibraciones D3 v1 (441) y v2 (451) con sobremuestreo 5 | `SPX-PRODUCTS` | Listado ePSF en `http-probes.json` |
| 5 | `FINAST=0` bueno, `1` parcial, otros malos | `SPX-SUPP` | Recibo del PDF: `expsupp-receipt.json` (SHA-256) |
| 6 | Los cubos DR1 ya restan ZODI; las imágenes L2 no | `SPX-SUPP` | — |
| 7 | SIA se consulta por `COLLECTION=spherex_dr1` o `spherex_qr3`; `BAND` en metros; `TIME` MJD | `SPX-ACCESS`, `IRSA-SIA-DOC` | `servicios-http.json` (SIA 200) |
| 8 | TAP sync corta a 5 min; HTTP 200 puede contener `QUERY_STATUS=ERROR` | `IRSA-TAP-DOC` | `3iatlas-first-exposure-query-error.xml` |
| 9 | Solo `MAXREC` activa la señal de overflow, no `TOP` | `IRSA-TAP-DOC` | — |
| 10 | Recortes por `center`/`size`, con `size=128pix` posible | `IRSA-CUTOUTS-DOC`, `SPX-CUTOUTS` | `cutout-download.json` |
| 11 | S3 anónimo en `nasa-irsa-spherex` (us-east-1), sin egreso | `IRSA-CLOUD` | `s3_head` 200, `s3_range` 206, CORS `*` |
| 12 | HiPS: 102 capas nominales; índices 50/51 base 0 vacíos | `SPX-HIPS`, `IRSA-HIPS-PROPS` | `hips_props` 200 + `hips-and-directories.json` |
| 13 | 3I/ATLAS: 259 filas QR2, SNR bajo, extendido | `SPX-3IATLAS` | `3iatlas-summary.json`, `.vot` |
| 14 | Source Discovery Tool busca fuentes rojas (D4−D2), no movimiento | `SPX-SDT` | — |
| 15 | Fotometría forzada y flags con bits 32/33 (no operar en 32 bits JS) | `SPX-PHOT` | — |
| 16 | SB Ident admite `xobs` geocéntrico ICRF; Horizons exige `CENTER`/`REF_SYSTEM` | `JPL-SBIDENT`, `JPL-HORIZONS` | — |
| 17 | Gaia: `source_id` decimal como cadena, `ref_epoch` en TCB, `pmra` con cos(dec) | `GAIA-DR3` | — |
| 18 | AllWISE: sus movimientos mezclan movimiento propio y paralaje | `WISE-ALLWISE-MOTION` | — |
| 19 | Consulta TAP M101/D2 devuelve 84 filas (52 DR1 + 32 QR3), `provenance_version=7.0.5` | medición propia | `http-probes.json`, `tap_candidates` (SHA-256 del cuerpo) |
| 20 | `quality_flag` vacío **no** equivale a calidad aprobada | `SPX-SUPP` | `http-probes.json` (columna vacía) |
| 21 | Un recorte real DR1 de 6×6 se contrastó con Astropy en 4 puntos WCS | medición propia previa | `wcs-vs-astropy.json` (parcial, no repetido) |
| 22 | La app no declara detección astronómica | decisión del proyecto | [Constitución](constitution.md), `CRITERIOS_CIENTIFICOS_SKYO.md` |

Las afirmaciones **19** y **21** son mediciones del entorno, no propiedades de
la fuente: al citarlas, indicar fecha, consulta y hash, nunca «IRSA dice que…».

---

## 4. Estado de verificación

### 4.1 Recibos existentes en el repositorio

| Recibo | Contenido | Fecha UTC | Resultado |
| --- | --- | --- | --- |
| [`enlaces-http.json`](evidence/auditoria-spec-20261113/enlaces-http.json) | Enlaces Markdown del SPEC, README y ambos DOI (18) | 2026-11-14 04:20:55 | 18/18 → 200 |
| [`servicios-http.json`](evidence/auditoria-spec-20261113/servicios-http.json) | SIA DR1/QR3, guía de acceso, JPL, WISE, Gaia (8) | sin campo UTC (auditoría 2026-11-13) | 7 con 200; el directorio de datos no devuelve 200 |
| [`http-probes.json`](evidence/investigacion-nasa-20261113/http-probes.json) | TAP M101, S3 HEAD/Range, HiPS properties | 2026-11-14 04:40:53 | 200, 200, 206, 200 |
| [`expsupp-receipt.json`](evidence/investigacion-nasa-20261113/expsupp-receipt.json) | Suplemento v2.1: URL, fecha, SHA-256 | 2026-11-14 | 200 |
| Este documento | 22 URLs sin recibo previo (+2 ya registradas) | 2026-11-14 16:48:54 | 19 → 200 · 2 → 502 · 1 → 000 |

En total, **51 URLs externas únicas** tienen al menos una comprobación HTTP
registrada (29 previas + 22 nuevas de este documento).

### 4.2 Cómo se comprobó esta sesión

```sh
curl -sIL --max-time 20 -A 'SKYO-doc-check/1.0' \
  -o /dev/null -w '%{http_code} %{url_effective}\n' "$URL"
```

Se usó `HEAD` con redirecciones; cuando el servicio no admite `HEAD`, se repitió
con `GET`. Un 000 significa **sin conexión** (no un 404): no se interpreta como
fuente inexistente hasta repetir desde otra red.

### 4.3 Discrepancias y observaciones

1. **`validacion.md` afirma «28 enlaces externos … HTTP 200»**, pero el recibo
   [`enlaces-http.json`](evidence/auditoria-spec-20261113/enlaces-http.json)
   contiene **18** resultados. La diferencia probable son enlaces de
   [`DATOS-Y-APIS.md`](DATOS-Y-APIS.md) y de la investigación NASA que no
   entraron en ese lote. **No se corrige aquí**: queda anotado para que la
   revisión del SPEC fije la cifra con su propio recibo.
2. **`TAP` y `SIA` sin parámetros → 502** (16:48Z; `TAP/sync` también devolvió
   502 con una consulta trivial) frente a **200 con consulta válida** en los
   recibos previos. Es comportamiento esperado de servicios IVOA y posible
   indisponibilidad transitoria; no se declara caída permanente.
3. **`spaceappschallenge.org` → 000** (sin conexión). El enlace de la NASA
   Space Apps Challenge aparece en la documentación de investigación, pero no
   es fuente de ningún requisito. Se marca **no verificado**.
4. **`irsa.ipac.caltech.edu/ibe/data/spherex/`** no devolvió 200. Un 404 de
   directorio no invalida un `access_url` concreto, como ya advierte el SPEC
   §4.1; no se usa como prueba de disponibilidad.

---

## 5. Atribución obligatoria

Toda vista o informe con datos de SPHEREx debe indicar, literalmente:

> «Datos: NASA / IPAC Infrared Science Archive».

Y, cuando corresponda:

- SPHEREx: «NASA/JPL-Caltech», release y colección (`DR1`, `QR3`).
- JPL SBDB/Horizons/SB Ident: «JPL Solar System Dynamics».
- Gaia: «ESA/Gaia/DPAC».
- AllWISE: «NASA/JPL-Caltech/UCLA».
- Aladin Lite / HiPS: «CDS, Estrasburgo».

SKYO **no es un servicio oficial** de NASA, IPAC, JPL, ESA ni CDS. La atribución
no implica aval. Fuente de esta regla: [DATOS-Y-APIS.md](DATOS-Y-APIS.md) §Atribución
y §5 de la [constitución](constitution.md).

---

## 6. Licencias y límites de uso

| Elemento | Licencia / condición | Consecuencia para SKYO |
| --- | --- | --- |
| Código de SKYO | MIT (`LICENSE`) | — |
| Aladin Lite | GPL v3 | **Incompatible con MIT** si se enlaza o distribuye como parte del bundle; usar como servicio externo o aislar. Decisión abierta. |
| Datos SPHEREx/IRSA | Política de archivo NASA/IPAC; atribución obligatoria | Citar release, colección y DOI cuando se redistribuya un derivado. |
| DOIs `IRSA678`/`IRSA679` | Citables | Usar el DOI, no la URL de descarga, en publicaciones. |
| Documentación de IRSA/JPL | Uso con atribución | No copiar tablas completas al producto; enlazar. |
| Three.js / Lottie vendorizados | Ver cabecera de cada archivo | No afirmar autoría propia. |

La licencia de Aladin es una **decisión pendiente**, no un detalle: afecta a si
puede ir dentro del bundle publicado.

---

## 7. Lo que estas fuentes NO permiten afirmar

Ni con estas fuentes ni con los recibos:

- Que SKYO haya **detectado** un objeto, un cambio o un candidato. No hay par
  espectral validado, fotometría certificada ni tasa de falsos positivos.
- Que el **WASM** esté compilado o validado: `assets/js/wasm/pkg/skyo_wasm.js`
  no existe; la app degrada a JavaScript y lo rotula.
- Que haya **validación Android** o en dispositivo físico.
- Que la app sea **accesible WCAG 2.2 AA**: hay mediciones parciales, no
  auditoría completa.
- Que la consulta de 84 filas sea una **muestra representativa** del release.
- Que `quality_flag` vacío signifique calidad buena.
- Que una ausencia en Gaia/AllWISE/JPL sea un **descubrimiento**.
- Que las cifras de 3I/ATLAS sean mediciones de SKYO: son posiciones predichas.

Ver [CRITERIOS_CIENTIFICOS_SKYO.md](CRITERIOS_CIENTIFICOS_SKYO.md) y
[`docs/specs/002-comparador-local/validacion.md`](specs/002-comparador-local/validacion.md).

---

## 8. Mantenimiento

Al añadir o cambiar una fuente:

1. Asignar clave estable `ÁREA-TEMA` y comprobar que no exista.
2. Medir con el `curl` de §4.2 y guardar fecha, código y URL final en el recibo
   de evidencia de la fecha (`docs/evidence/<tema>-<YYYYMMDD>/`).
3. Añadir la fila a la tabla correspondiente con la columna **Verificado**.
4. Si sostiene una afirmación, añadirla a la matriz de §3.
5. Si la fuente es interna, enlazarla en el [Anexo A](#anexo-a-fuentes-internas).

Un cambio de release, pipeline, esquema o calibración **obliga** a releer la
documentación y repetir las puertas afectadas (SPEC §13). La disponibilidad HTTP
no sustituye la prueba de contenido.

---

## Anexo A. Fuentes internas

Estas no se citan como externas; son el registro del proyecto.

| Clave | Documento | Qué contiene |
| --- | --- | --- |
| `SKYO-SPEC` | [`SPEC_SKYO_2.1_AUDITADO.md`](SPEC_SKYO_2.1_AUDITADO.md) | Única referencia normativa: 20 RF, contratos, puertas, fuentes (§13) |
| `SKYO-CONST` | [`constitution.md`](constitution.md) | Reglas de trazabilidad, evidencia y no-claims |
| `SKYO-CRIT` | [`CRITERIOS_CIENTIFICOS_SKYO.md`](CRITERIOS_CIENTIFICOS_SKYO.md) | Contrato temporal, asociación, PSF, significancia |
| `SKYO-NASA` | [`INVESTIGACION_DATOS_NASA.md`](INVESTIGACION_DATOS_NASA.md) | Correcciones científicas y pruebas acotadas de IRSA |
| `SKYO-APIS` | [`DATOS-Y-APIS.md`](DATOS-Y-APIS.md) | Inventario de servicios, bibliotecas y atribución |
| `SKYO-AUDIT` | [`AUDITORIA_SPEC_2026-11-13.md`](AUDITORIA_SPEC_2026-11-13.md) | Revisión previa del SPEC con recibos |
| `SKYO-VALID` | [`specs/002-comparador-local/validacion.md`](specs/002-comparador-local/validacion.md) | Estado ejecutado y pendientes de validación |
| `SKYO-VISUAL` | [`evidence/auditoria-visual-2026-11-14.md`](evidence/auditoria-visual-2026-11-14.md) | Auditoría visual medida (28 estados) |
| `SKYO-PROTO` | [`protocols/README.md`](protocols/README.md) | Protocolos PV-01…PV-08 |
| `SKYO-MEM` | [`../MEMORY.md`](../MEMORY.md) | Memoria de sesión y decisiones vigentes |

---

## Anexo B. Catálogo de skills (no científico)

URLs del catálogo de skills usadas para elegir herramientas de diseño y de
implementación, documentadas en [`SELECCION_SKILLS.md`](SELECCION_SKILLS.md).
**No se citan como fuente científica** y no sostienen ninguna afirmación sobre
datos. Se listan aquí solo para que nadie las confunda con bibliografía.

- `skills.sh`: `anthropics/skills/frontend-design`,
  `nextlevelbuilder/ui-ux-pro-max-skill`,
  `leonxlnx/taste-skill/design-taste-frontend`,
  `pbakaus/impeccable`, `vercel-labs/agent-skills/web-design-guidelines`,
  `cloudai-x/threejs-skills/{fundamentals,shaders,interaction,postprocessing}`,
  `apollographql/skills/rust-best-practices`,
  `leonardomso/rust-skills`, `wshobson/agents/rust-async-patterns`,
  `cesartevisual/threejs-skills`.
- `github.com`: `anthropics/skills`, `nextlevelbuilder/ui-ux-pro-max-skill`,
  `Leonxlnx/taste-skill`, `pbakaus/impeccable`, `vercel-labs/agent-skills`,
  `CloudAI-X/threejs-skills`, `actionbook/rust-skills`,
  `leonardomso/rust-skills`, `apollographql/skills`, `cds-astro/aladin-lite`.
- Agregadores: `hotskills.dev`, `skillsmp.com`, `www.skillhub.club`.

Estado: **sin comprobación HTTP registrada** en esta sesión. Son recomendaciones
de terceros, no documentación oficial de las bibliotecas.

---

## Anexo C. URLs locales o de ejemplo (excluidas)

Aparecen en la documentación pero **no son fuentes**:

| URL | Motivo |
| --- | --- |
| `http://127.0.0.1:8123` | Servidor local de la auditoría visual |
| `http://192.168…` | Ejemplo de acceso en red local |
| `https://skyo-audit.example` | Dominio de ejemplo, no existe |

Se citan solo como configuración de una prueba, con su fecha y comando.

---

## Anexo D. Cómo referenciar este documento

> SKYO. *Fuentes y citas de SKYO*. Documento de referencia, 2026-11-14.
> `docs/FUENTES.md`.

Si cambia una cifra o una URL, cambia la fecha de este documento y el recibo
asociado; no se reescribe el pasado.
