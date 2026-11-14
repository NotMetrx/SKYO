# SKYO 2.1 — Especificación técnica auditada para ejecución local

> **Estado:** PROPUESTA de arquitectura v2.1 + código de laboratorio corregido (no validado científicamente con IRSA).  
> **Fecha de revisión:** 2026-11-13 (America/Lima). **DR1:** comunicado por SPHEREx el 2026-11-12.  
> **Proyecto base:** `SPEC(1).md`, SKYO v1.0 del 2026-11-13.  
> **Objetivo:** NASA Space Apps Challenge 2026, «Planet X and SPHEREx».  
> **Naturaleza:** aplicación web local-first; **no** es un producto oficial de NASA, JPL ni IPAC.

## 0. Resumen ejecutivo y decisiones de arquitectura

SKYO mantiene su identidad visual, sus tres preguntas (**¿a dónde vamos?, ¿cuándo?, ¿con qué luz?**), el sistema solar 3D y H.E.R.A 7. Sustituye el **backend VPS propuesto en v1.0** por una aplicación web estática que ejecuta procesamiento de imágenes en el **navegador** del visitante, con **Rust → WebAssembly (WASM), Web Workers, FITS, WCS y caché local**. **Node.js es una herramienta de desarrollo y compilación**, no un proceso de servidor permanentemente requerido para usuarios.

### Decisiones aprobadas para proponer al equipo (ADR)

| ID | Decisión | Motivo | Consideración |
|---|---|---|---|
| ADR-01 | **Vite + TypeScript + componentes DOM/ES Modules** | Preserva la estructura actual, optimiza assets y permite migración gradual desde JS nativo | Lit opcional para componentes complejos; evitar reescribir SKYO a React/Svelte antes del MVP |
| ADR-02 | **Rust / wasm-bindgen** para kernels numéricos | Memoria tipada, portabilidad, lógica científica verificable | WASM **no** aporta automáticamente más rendimiento que JS para cada operación; medir |
| ADR-03 | **Web Worker** exclusivo para procesar FITS/WCS | No congelar interfaz ni animaciones | Usar `ArrayBuffer` transferibles, no copias masivas |
| ADR-04 | **Canvas 2D + WebGL2**, WebGPU optativo | Compatibilidad móvil; coloreado o compositado GPU si lo justifica un benchmark | Pérdida de contexto GPU debe admitir fallback |
| ADR-05 | **Aladin Lite v3** para mapa real | HiPS, coordenadas, overlays y soporte WebGL2 | A fecha de revisión el repositorio publica LGPL-3.0-or-later; revisar versión/obligaciones, mantener atribución/logo |
| ADR-06 | **Three.js lazy** en `#3d` | Reusar implementación actual y evitar cargar geometría en Inicio | 3D no debe consumir recursos al estar oculto |
| ADR-07 | **OPFS** para FITS/cache y **IndexedDB** para índices | Datos localmente, sin Redis/PostgreSQL | Cupos/evicción dependen del navegador; botones de limpieza/exportación |
| ADR-08 | **PWA + CDN estático** | No requiere VPS o backend propio | Se necesita conexión para descargas NASA no almacenadas |
| ADR-09 | **IRSA DR1 + QR3** como fuentes primarias | DR1 reprocesa QR2 y debe usarse con QR3 | No combinar observaciones espectralmente incompatibles |
| ADR-10 | **H.E.R.A 7 primero determinista y contextual offline** | Respuestas rápidas con fuentes, sin credenciales ni cobro por API | LLM local es mejora opcional, no requisito del hackatón |

**Restricciones no negociables:** no inventar observaciones ni fechas; no etiquetar un candidato como «Planeta X»; no alterar FITS originales; no deducir movimientos por una diferencia sin calidad y validación. La viabilidad de consultas CORS directas de IRSA **no ha sido comprobada** desde este entorno: usar paquetes curados alojados en el mismo origen y carga manual FITS como rutas fiables.

## 1. Trazabilidad contra el SPEC v1.0

| Área de v1.0 | Conservar | Modificar en v2.0 |
|---|---|---|
| `#inicio` (RF-01 a 05) | Logo, constelaciones, navegación hash, accesibilidad | Componentes TS cargados de forma diferida; contenido inicial sin procesamiento pesado |
| `#explorar` (RF-06 a 10) | Filtros, tiempos, bandas, bottom sheet y comparación | Distinguir visualización artística vs observación real; Aladin; pipeline FITS local; 102 canales en modo cubo, 6 detectores en modo época |
| Detección (RF-11 a 13) | Estados `Conocido/Candidato/Descartado`, responsabilidad científica | Reemplazar umbral fijo `>2 arcsec` por incertidumbre/sig. astrométrica dependiente de PSF/SNR; exigir validación WCS y espectral |
| `#3d` (RF-14 a 15) | Three.js diferido y dirty rendering | Órbitas JPL como carga optativa de manifiestos estáticos; interfaz puede operar offline con datos precargados |
| H.E.R.A 7 (RF-16 a 18) | Personaje, textos locales, contextualidad | Sin `POST /hera` obligatorio; knowledge base local con contexto de análisis y evidencias; LLM local solo si dispositivo permite |
| Infraestructura | Atribución NASA/IPAC, WCAG y modo móvil | Eliminar VPS, FastAPI, Redis, Postgres, servicios `/imagenes` `/recorte` `/cambios` `/hera` como requisitos de producción |

La especificación original describe el frontend con ES Modules, Canvas y Three.js, y deja backend/datos reales pendientes. **No se ha revisado el código fuente original**: la ruta de migración se ajustará cuando esté disponible `index.html` y la carpeta `assets/`.

## 2. Arquitectura de ejecución

```mermaid
flowchart TD
    subgraph Publicacion[Hosting estático / CDN - SIN VPS]
      S[HTML CSS JS + WASM + manifiestos + regiones curadas]
    end
    subgraph Navegador[Equipo del usuario: navegador PWA]
      UI[SKYO UI TypeScript: Inicio / Explorar / 3D]
      AL[Aladin Lite v3: HiPS y coordenadas]
      WK[Worker científico]
      FIT[Parser FITS multi-HDU]
      WCS[WCS TAN-SIP y espectral]
      WASM[Rust WASM: álgebra numérica]
      DSP[Canvas / WebGL2: vistas y diferencias]
      CACHE[(OPFS + IndexedDB + Service Worker)]
      HERA[H.E.R.A 7 contextual local]
      UI --> AL
      UI --> WK
      WK --> FIT --> WCS --> WASM --> DSP --> UI
      UI <--> CACHE
      UI <--> HERA
    end
    NASA[IRSA NASA/IPAC: TAP, SIA, IBE, HiPS]
    JPL[JPL SSD / Gaia / WISE]
    S --> UI
    NASA -.->|descarga bajo demanda si CORS habilitado| WK
    NASA -.->|curador en PC / CI, no servicio permanente| S
    JPL -.->|catálogos/efemérides en paquetes estáticos| S
    CACHE <--> WK
```

**Importante:** «Sin VPS» ≠ «sin Internet» o «sin hosting». Una página pública necesita archivos estáticos publicados en algún lugar. Una PWA previamente instalada puede operar sin conexión **solo sobre datos almacenados**. Cuando IRSA no permite CORS para un tipo de recurso, ningún WASM puede saltarse esa protección: recurrir a un archivo local del usuario o un paquete derivado servido en el mismo origen.

### Distribución de tareas

- **Main Thread:** interfaz, teclado, accesibilidad, navegación, estado y los controles visibles. Evitar cálculos > ~8 ms por frame.
- **Worker 1:** lectura de FITS, memoria de ROI, máscaras y proyección espacial, carga del WASM.
- **Worker 2 (futuro):** búsqueda de candidatos/ePSF/calibración más costosa; no activar simultáneamente en móviles de gama media sin medir.
- **GPU:** render de HiPS y 3D, y opcional coloreado/composición por textura. Las matrices originales nunca cambian al modificar colores.
- **OPFS:** FITS y metadatos locales (prototipo con API asíncrona desde main thread, segura para I/O); **IndexedDB:** índice propuesto, aún no implementado. `FileSystemSyncAccessHandle` requiere Dedicated Worker; la API asíncrona no. Tras descargar, conservar el `File` fuente para guardar de nuevo: el `ArrayBuffer` transferido al Worker queda detached.
- **Service Worker:** shell offline y recursos estáticos previamente seleccionados; **no** precachear automáticamente archivos NASA gigantes.

## 3. Modelo de datos: producto científico real

Una imagen individual SPHEREx L2 corresponde a una observación particular de un detector. El tutorial oficial describe un FITS de múltiples extensiones:

| HDU | Tipo | Función en SKYO | Nota científica |
|---|---|---|---|
| `PRIMARY` | Header | Versión y procedencia | `DATE` puede indicar procesamiento, **no** fecha de observación |
| `IMAGE` | `float32` | Radiancia calibrada (MJy/sr) | Contiene fondo zodiacal: no está sustraído |
| `FLAGS` | CompImageHDU/bitmap int32 | Máscara de calidad | En datos originales puede estar **comprimida**; `MSKNnnnn`/`MSKDnnnn` definen bits |
| `VARIANCE` | `float32` | Incertidumbre (MJy/sr)² | Tras interpolación, covarianzas requieren tratamiento adicional |
| `ZODI` | `float32` | Modelo de brillo zodiacal | Mantener por separado; sustraer solo como opción documentada |
| `EPSF` | Tabla | Perfil efectivo de fuentes por ubicación | 441 regiones (21 × 21), modelos subpíxel; crítico para detección fina |
| `WCS-WAVE` | Tabla binaria | Centro λ y ancho de banda según píxel | LVF: dos píxeles del **mismo detector** pueden medir λ distintos |

SPHEREx anunció DR1 el **12 de noviembre de 2026**; DR1 y QR3 se recomiendan para nuevas aplicaciones. Los **102 canales** corresponden al cubo/mosaico; **no** son 102 imágenes independientes de la misma época. El cubo HiPS all-sky sirve para seleccionar λ, mientras que los L2 con tiempo individual sirven para detectar cambios. Los cubos FITS HEALPix completos pueden rondar ~300 MB, inadecuados para descargas iniciales en móvil.

### Modelo de datos discriminado y protocolo TypeScript

El archivo `web/src/contracts.d.ts` contiene las definiciones completas. **La procedencia no se deduce de un nombre de archivo.** En un FITS original o derivado de NASA se exige `dataRelease` DR1/QR3, fuente, fecha observada y MJD; en una carga manual sin procedencia validada o dato sintético se utiliza `dataRelease: null`. No se asignan campos inventados a las simulaciones.

```ts
type SkyoObservation =
  | (ObservationBase & {
      sourceKind: 'NASA-ORIGINAL' | 'NASA-DERIVED';
      dataRelease: 'DR1' | 'QR3';
      mjd: number; observedUtc: string; sourceUrl: string;
    })
  | (ObservationBase & {
      sourceKind: 'USER-LOCAL' | 'SYNTHETIC';
      dataRelease: null;
      mjd: number | null; observedUtc: string | null; sourceUrl: null;
    });
```

**Diferencia:** devolver o mantener identificadores de productos `difference` y `snr` además de escalares. El Worker mantiene las matrices numéricas y devuelve RGBA para visualización sin transferir dos matrices grandes de manera innecesaria. Si se solicita exportación científica, deberá devolver buffers explícitos y su calibración; `rgba` no reemplaza el dato científico.

### Esquema de un dataset estático

```text
web/public/datasets/m101/
  manifest.json         # metadatos, versiones, fecha MJD, λ, hashes, origen
  spherex_d2_001.fits   # recorte derivado preservando IMAGE/VARIANCE, FLAGS sin compresión
  spherex_d2_002.fits
```

**Proveniencia:** en pantalla mostrar siempre instrumento, colección, fecha, detector, λ, estado de calidad, identificador/URL y aclaración «Datos: NASA/IPAC Infrared Science Archive (SPHEREx)». Citar el DOI DR1 imágenes `10.26131/IRSA678` y cubo `10.26131/IRSA679` cuando corresponda.

## 4. Pipeline de datos completo (ingesta → análisis local)

```mermaid
flowchart TD
 A[Usuario elige región RA/Dec o FITS local] --> B{¿Existe paquete curado en OPFS/CDN?}
 B -->|Sí| C[Leer manifiesto + verificar SHA-256]
 B -->|No| D[Consultar IRSA TAP/SIA2 si CORS está permitido]
 D --> E{¿La descarga funciona con CORS?}
 E -->|Sí| F[Descargar cutout FITS]
 E -->|No| G[Importar FITS manual o preparar dataset con curador local]
 F --> H[Decodificación FITS multi-HDU]
 G --> H
 C --> H
 H --> I[Extraer IMAGE, FLAGS, VARIANCE, ZODI, WCS, ePSF, λ]
 I --> J[Verificar fecha y banda efectiva de cada época]
 J --> K{¿Datos compatibles?}
 K -->|No| L[Permitir vista individual, bloquear conclusión científica]
 K -->|Sí| M[Enmascarar flags críticos sin borrar píxeles]
 M --> N[Reproyectar B al WCS espacial de A]
 N --> O[Estimar/compensar fondo y calibrar PSF]
 O --> P[Restar imágenes y propagar incertidumbres]
 P --> Q[Mostrar parpadeo, diferencia y SNR exploratorio]
 Q --> R[Detectar centroides/variabilidad con SNR y PSF]
 R --> S[Contrastar catálogos JPL, Gaia, WISE y efemérides]
 S --> T[Clasificar candidato / conocido / descartado, con incertidumbre]
 T --> U[Guardar en OPFS + informe reproducible + H.E.R.A 7]
```

### Etapas, implementación y controles

**P0. Descubrimiento de observaciones.** Consultar `spherex.artifact` + `spherex.plane` mediante TAP en un proceso voluntario de curación o desde navegador solo cuando CORS sea viable. Filtrar `energy_bandpassname` por detector; guardar `time_bounds_lower` (MJD). Evitar confundir cabecera `DATE` del producto con tiempo de observación. Para vistas globales usar tiles HiPS, no descargar 102 capas FITS enormes.

**P1. Recorte en lugar de archivo completo.** Usar URLs IBE con `?center=<ra>,<dec>d&size=<lado_deg>`. Empezar con campo ~0.1° (ajustar según disponibilidad, densidad y móvil); varios píxeles relevantes deben quedar dentro de la región. Demostración móvil: 128–256 px; techo inicial para comparación 512×512. En NASA, la cobertura real y el tamaño final se verifican después de descargar.

**P2. Lectura FITS.** Leer bloque 2880, cabeceras de 80 caracteres, múltiples HDU, BIG-ENDIAN, `BITPIX`, `BSCALE`/`BZERO`, NaN. Para `FLAGS` con `BITPIX=32` interpretar `BZERO=0` o `BZERO=2^31` conservando un `Uint32Array` entero; nunca almacenar flags en `Float32Array`. Rechazar escalas no admitidas en vez de interpretarlas incorrectamente. Para `BITPIX=64` de cualquier máscara futura, exigir soporte explícito de BigInt o fallar de forma segura. El lector básico del prototipo admite IMAGE/VARIANCE/ZODI/FLAGS **sin compresión**, pero no descomprime `FLAGS` tile-compressed originales. La curación offline con `astropy.io.fits` los convierte a un HDU de bandera no comprimido; para soporte autónomo de FITS originales añadir lector Rust puro compatible WASM (p. ej. `fitsio-pure` o `fitsy`) **después** de verificar funciones de compresión y WCS de estos productos.

**P3. Calidad de píxeles.** Leer `MSKNnnnn` y `MSKDnnnn` del header de FLAGS; verificar que nombres como `MISSING_DATA`, `CROSSTALK` y `STREAK` también estén incluidos; configurar bits críticos (HOT, COLD, NONFUNC, TRANSIENT, OVERFLOW, XTALK, GHOST, MISSING, HALO, etc.) según documentación instrumental. Nunca marcar por defecto SOURCE como malo. Conservar NaN y una máscara binaria junto a la imagen original; visualizar zonas descartadas sin interpolación destructiva.

**P4. Filtro espectral.** Comparar `DETECTOR`, λ central y Δλ en la ROI; la comparación **científica** debe verificar λ/Δλ por posición mediante `WCS-WAVE` (o una validación equivalente precomputada). Igual detector = filtro preliminar, no prueba suficiente. Si falta WCS espectral, habilitar solo `comparación exploratoria`. Si las λ no se solapan: bloquear resta interpretativa de movimiento.

**P5. Registro astrométrico.** Reproyectar cada píxel de destino de A a B utilizando WCS espacial `RA---TAN-SIP`/`DEC--TAN-SIP`. Conservar coordenadas 1-based FITS en la conversión, aunque Canvas/JS use 0-based. Validar residuales y convergencia frente a `astropy.wcs` con observaciones reales; rechazar tipos WCS desconocidos en lugar de ignorar distorsión. En prototipo se implementa interpolación bilineal, suficiente para *visualización exploratoria*, no fotometría de alta precisión.

**P6. Fondo zodiacal y residuos.** El FITS científico `IMAGE` contiene fondo zodiacal: según la documentación de IRSA, **ZODI no está restado**. En el código v2.1, cuando existen mapas válidos de ambas épocas, calcular sobre copias temporales `A' = IMAGE_A - ZODI_A` y `B' = IMAGE_B_reproj - ZODI_B_reproj`. Se preservan los datos originales. Después ajustar un **plano robusto 2D** a las diferencias residuales de fondo, basado en medianas por teselas, evitando fuentes marcadas con `SOURCE` para estimar el fondo (sin excluirlas del análisis de imagen). Cuando no hay ZODI, permitir solo análisis exploratorio y avisar. El ajuste de plano no sustituye PSF matching, correcciones fotométricas ni incertidumbre del modelo zodiacal.

**P7. Diferencias e incertidumbres.** `D(x,y) = (IMAGE_A-ZODI_A) - (IMAGE_B-ZODI_B)_reproj - P(x,y)` donde `P` es el plano residual (o su fallback escalar). Para interpolación bilineal de señales con pesos `w_i`, `Var(B_reproj) = Σ(w_i² Var(B_i))` **bajo hipótesis de errores de entrada independientes**, no `Σ(w_i Var(B_i))`. Después, `sigma_D ≈ sqrt(Var_A + Var_B_reproj)` **sin** considerar aquí incertidumbre del plano/ZODI, calibración ni correlaciones espaciales. El SNR solo es exploratorio: no es una probabilidad de descubrimiento. Mostrar además máscara y origen del modelo aplicado.

**P8. Objetos móviles.** Requiere centroides/ePSF por época, asociación multi-época, SNR, rechazo de artefactos, detección repetida, astrometría de precisión y falsos positivos cuantificados. El umbral original de `>2 arcsec` **no es un criterio suficiente**: comparar con PSF (en tutorial aparece FWHM ~7.5" en una observación), escala de píxel, incertidumbres y delta de tiempo. Mostrar movimiento con error angular y, si hay suficientes observaciones, tasa en arcsec/día. **Esta etapa no está implementada en el prototipo entregado**.

**P9. Identificación independiente.** Cruce contra JPL (cuerpos menores) con fecha y geometría de observación correctas; Gaia para estrellas de alto movimiento propio; WISE como historia temporal complementaria. No se puede identificar un objeto solo porque no coincida con JPL, pues podría ser estrella, enana marrón o artefacto. Guardar evidencias y versión del catálogo. **No** hay detección de Planeta X confirmada por SKYO.

**P10. Informe y conversación.** Guardar procedencia de cada recorte, hash, máscara aplicada, software/versión WASM, fechas, λ, WCS, offset, incertidumbres, estado científico. H.E.R.A 7 solo explica esos datos existentes y distingue demostración sintética, análisis exploratorio y resultados verificados.

## 5. Pipeline implementado en el paquete adjunto (alcance real)

| Componente | Implementación de la entrega | Nivel de verificación |
|---|---|---|
| Lector FITS 2D multi-HDU | `web/src/fits.js`: máscaras `Uint32`, `BZERO` validado, sin tile compression | Pruebas Node sintéticas + test bits altos |
| Máscara por bitmap MSKN | `buildQualityMask` | Test con bit HOT simulado |
| WCS espacial TAN-SIP | `web/src/wcs.js`, inversión Newton + convergencia, remuestreo bilineal, varianza con pesos² | Tests matemáticos sintéticos; **no comparado aún con Astropy real** |
| Diferencia + ZODI + plano residual + varianza | `web/src/pipeline.js` + `wasm/src/lib.rs` | Algoritmo JS con pruebas sintéticas; Rust **pendiente de compilación** |
| Render de FITS | `web/src/render.js`, escala asinh y mapa divergente | Se verificó el tamaño/estructura de salida; QA visual en navegador pendiente |
| Web Worker | `web/worker.js` con jobId, productId y render específico | Código revisado; prueba integral en navegador pendiente |
| OPFS / PWA | `web/src/opfs.js` + `web/sw.js` | Código escrito; no probado en distintos móviles |
| Curador IRSA | `tools/curate_irsa.py` | Sintaxis compilada, **no probado contra IRSA** |
| Detección ePSF y JPL | **No implementado** | Futuro tras validación |

Todos los productos de ejemplo `web/public/demo/epoca_*.fits` son **sintéticos**; no provienen de NASA. La herramienta indica explícitamente el carácter exploratorio de sus diferencias. Un resultado con estos archivos **jamás** equivale a una detección astronómica.

## 6. Diseño de frontend y experiencia de usuario

### Navegación existente

- **Inicio:** marca SKYO y vista orbital ilustrativa de carga liviana; CTA «Explorar el cielo real». Sin descargas FITS al abrir Inicio.
- **Explorar:** mapa Aladin HiPS con tres controles fijos: **Lugar**, **Tiempo**, **Luz**. En modo Vuelo mostrar nombres y explicaciones; en modo Explorador activar fechas/reproductor; en modo Científico mostrar WCS, λ, incertidumbres, máscaras y descarga.
- **Sistema 3D:** Three.js con carga diferida; efemérides reales de objetos menores desde manifestos precargados, nunca órbitas inventadas etiquetadas como reales.
- **Laboratorio (subsección de Explorar):** panel 2×2 observación A/B, mapa diferencia y tarjetas de procedencia; en móvil usar columnas apiladas/bottom sheet; reproducción «blink» solo si dos imágenes reales compatibles. El prototipo `web/index.html` contiene este laboratorio como miniapp independiente para integrar más tarde en `#explorar` del frontend original.
- **H.E.R.A 7:** fichas locales en español y explicación contextual basada en estructuras verificadas. Un LLM de ejecución local (p. ej. WebGPU) **no es parte del MVP** por latencia, consumo de RAM y tamaño de modelo.

### Sistema visual premium y eficiente

| Token | Valor / recomendación |
|---|---|
| Fondo espacial | `#080D1B` con dos gradientes suaves estáticos |
| Superficie | `#111A2C` + bordes translúcidos de contraste comprobado |
| Acción primaria | Azul cian claro `#8DE8FA`; alternativa cálida `#F4BC74` para alertas de intensidad |
| Tipografía | Poppins WOFF2 local actual; limitar pesos a 2–3 y precargar solo crítico |
| Layout | Controles táctiles >= 44×44 px, 16 px de margen móvil y bottom sheet responsive |
| Movimiento | Transiciones CSS ≤ 200 ms, sin animaciones permanentes en pestaña oculta |
| Científico | Escalado configurable (linear/log/asinh), botón «bruto vs visual», máscara de banderas y barra λ verificable |
| Sostenibilidad | `requestAnimationFrame` solo por interacción; GPU Canvas/3D apagada fuera de viewport |

Prohibido confundir mapas de falso color con fotografías visibles; cada vista indicará si es **cubo mosaico**, **imagen L2 de una fecha** o **ilustración**. Nunca aplicar IA generativa para «rellenar» píxeles usados en una detección.

### Accesibilidad

- WCAG 2.2 AA objetivo, navegación completa por teclado, controles con nombre accesible, estado en `aria-live`.
- `prefers-reduced-motion` debe desactivar reproducción automática de blink y rotación 3D; ofrecer botón manual paso a paso.
- Paletas de diferencias apoyadas por signos/leyendas, no solo color; permitir escala de grises.
- Lector de pantalla debe conocer fecha, detector, región, calidad, errores y fuente NASA del dato.

## 7. Contratos de datos y Worker (alineados con el código entregado)

Se adopta un **protocolo por eventos y `jobId`** (no un RPC inexistente). Los cuatro comandos de `WorkerRequest` implementados son:

```ts
type WorkerRequest =
  | { event:'load'; jobId:number; side:'A'|'B'; buffer:ArrayBuffer; meta?:object }
  | { event:'compare'; jobId:number }
  | { event:'render'; jobId:number; target:'A'|'B'|'difference'|'snr' }
  | { event:'clear'; jobId:number };
```

Respuestas del Worker: `loaded`, `compared`, `rendered`, `cleared`, `kernel`, `error`, con el `jobId` recibido, salvo `kernel` inicial (`jobId=0`). `loaded` entrega RGBA y metadatos de **esa observación**; `compared` entrega RGBA más `{differenceId:'difference',snrId:'snr'}`; `rendered` permite escoger producto explícito. Las matrices numéricas de diferencia/SNR quedan residentes en el Worker. La interfaz descarta respuestas con `jobId` antiguo.

**Cancelación real:** `postMessage({event:'cancel'})` no interrumpe un bucle síncrono ya ejecutándose. Para detener un cálculo activo en el MVP, el cliente debe llamar `worker.terminate()`, crear otro Worker y recuperar inputs desde `File`/OPFS; para progreso/cancelación granular posterior, implementar cálculo por bloques o atomic flags con las cabeceras de aislamiento necesarias. No declarar cancelación in-flight como implementada.

**Transferencia y persistencia:** `worker.postMessage({buffer}, [buffer])` invalida el `ArrayBuffer` del hilo emisor. El prototipo guarda una **referencia inmutable al `File` seleccionado** y la persistencia OPFS asíncrona vuelve a leer ese `File` con `file.arrayBuffer()`; no reusa el buffer detached. Una variante futura puede persistir antes de transferir o escribir en un Worker, pero ambas requieren gestionar cuota/errores.

**Reemplazos de endpoints v1:** `/imagenes` → catálogo local; `/recorte` → importación/curación estática; `/cambios` → `compare`; `/objeto/{id}` → catálogo/metadata versionados; `/hera` → explicación contextual local. No prometer red NASA sin pruebas CORS.

## 8. Almacenamiento, CORS, conectividad y seguridad

1. **Hosting estático:** Cloudflare Pages, Netlify o GitHub Pages, sin procesos Node/FastAPI en producción.
2. **Paquetes de regiones curadas:** un curador puede ejecutarse en una laptop del equipo (o CI temporal) para obtener recortes de NASA con Astropy y reempaquetar `FLAGS` para su lectura. El procesamiento interactivo ocurre después en el dispositivo visitante. Esto no es un VPS.
3. **Modo en vivo:** intentar `fetch` directo a IRSA solo después de verificar cabeceras CORS del endpoint exacto desde el origen publicado. **No se pudo comprobar CORS aquí**; no prometerlo como ruta principal.
4. **Carga manual:** aceptar archivos FITS descargados por el usuario; sin subirlos a ningún servidor. Restringir tamaños, tipos, número de HDUs, dimensiones y longitud para evitar errores/memoria excesiva.
5. **OPFS:** `createWritable()` asíncrono está permitido en main thread; la API `FileSystemSyncAccessHandle` es exclusiva de Dedicated Workers. El prototipo usa la variante asíncrona sin bloqueo CPU; para máximo rendimiento migrar I/O voluminoso al Worker y verificar compatibilidad iOS. Guardado bajo consentimiento explícito del usuario; limitar presupuesto según `navigator.storage.estimate()` y permitir eliminación. El navegador puede eliminar datos por cuota o limpieza; exportación del usuario como respaldo.
6. **Service Worker/Vite:** assets bajo `web/public/` (`sw.js`, `manifest.webmanifest`, `icon.svg`, demo FITS). Vite copia `public/` a `dist/`; `tools/postbuild.mjs` registra los nombres JS/CSS del bundle en el precache de `dist/sw.js`. El WASM compilado va a `web/public/wasm/pkg/` y se importa por URL en runtime con fallback JS. Para producción se requiere ejecutar/verificar build real. Cache solo de shell y recursos curados pequeños; no hacer fetch/prefetch masivo sin permiso. Alojamiento HTTPS obligatorio para instalación PWA y OPFS en contextos reales (localhost es excepción de desarrollo).
7. **WASM threads:** comenzar **sin threads**. `SharedArrayBuffer` y WASM multithreading requieren COOP+COEP/cross-origin isolation y pueden bloquear recursos de terceros como Aladin HiPS. SIMD de un solo hilo y Web Worker bastan para MVP; revisar medido.
8. **Integridad y secure contexts:** `crypto.subtle.digest()` requiere HTTPS o `localhost`/`127.0.0.1`. En HTTP LAN (`http://192.168...`) la validación SHA y la PWA/OPFS no están garantizadas: mostrar error recuperable y probar usando HTTPS local cuando se necesiten esas funciones. SHA-256 por observación; registrar tanto original NASA como derivado. Contratos versionados y bitmasks documentados.
9. **Licencias:** Aladin Lite actualmente anuncia LGPL-3.0-or-later en README/repositorio; comprobar licencia y notices del release que se distribuya. Three.js/FITS crates según licencias elegidas. **No es asesoría jurídica**.

## 9. Presupuestos de rendimiento, batería y memoria

Estos son **objetivos a medir**, no resultados garantizados.

| Métrica | Objetivo | Prueba |
|---|---|---|
| LCP de UI precargada | ≤ 2.5 s en móvil medio | Lighthouse, red 4G simulada, p75 |
| INP | ≤ 200 ms | Web Vitals/DevTools |
| CLS | ≤ 0.1 | Lighthouse |
| Primera vista FITS curada pequeña | ≤ 1.5 s desde caché local | Android gama media; archivo 128×128 / 256×256 |
| Diferencia 128×128 en caché | objetivo < 150 ms worker | Validar en Android real; no extrapolar Node |
| Diferencia 512×512 | sin bloquear UI, tolerar segundos | Tiempo real + memoria en navegador |
| Canvas/3D cuando activos | 60 FPS objetivo | FPS y long tasks; bajar render scale si es necesario |
| Fuera de vista / pestaña oculta | 0 RAF/animaciones permanentes | Performance tracing |
| Tamaño máximo para comparar inicialmente | 512×512 por época | Rechazar recortes mayores con instrucciones |
| Datos iniciales | 2–5 regiones pequeñas; expansión a 10 | Medir cuota hosting y descarga móvil |

Optimizar primero con perfiles. Costes potenciales: parseo de FITS big-endian, alineación por píxel, asignaciones de nuevos `Float32Array`, copias JS↔WASM, y conversión de matrices a RGBA. Reusar buffers cuando sea posible y pasar `ArrayBuffer` como transferable. Mantener una política móvil de reducción de área ROI bajo aviso, **sin afirmar detección en datos degradados**.

## 10. Roadmap de migración concreta

| Etapa | Alcance | Prueba de aceptación |
|---|---|---|
| M0. Copia y compatibilidad | Preservar `index.html` y `assets/`; crear rama `skyo-v2-local` | UI visual v1 sigue disponible |
| M1. Node + Vite sin reescritura | Añadir scripts, TS progresivo y salida estática | `npm run build`; rutas hash mantienen estado |
| M2. Motor local MVP | Integrar `web/worker.js` + parser de FITS + preview | Archivo sintético se abre, UI no se bloquea |
| M3. Dataset NASA curado | Ejecutar `tools/curate_irsa.py` desde PC con internet; guardar 2–5 ROI auténticas | IRSA URL/hashes/fechas, FLAGS y VARIANCE visibles |
| M4. Registro astronómico | Validar `TAN-SIP` frente a Astropy real; comprobar máscara y WCS espectral | Residuales en píxeles/arcsec documentados, pares compatibles |
| M5. Comparador real | Blink, A/B, diferencia, cronología, fuente y estado explícito | Demostración reproducible con **dos fechas reales** |
| M6. Ciencia de candidatos | ePSF/fotometría, JPL/Gaia, controles SNR y revisiones | Validación cruzada con datos conocidos y tasa de falsos positivos |
| M7. H.E.R.A 7 + 3D | Asistente contextual y geometría JPL real opcional | No atribuye hallazgos sin evidencia; consumo en pausa cero |
| M8. PWA entrega | OPFS, offline y despliegue estático | Funciona offline para recortes previamente descargados |

**Orden recomendable para la presentación:** M0–M5 primero. Aceptar un comparador real de calidad antes que una supuesta IA que «descubre Planet X» sin validación.

## 11. Nueva matriz de criterios de aceptación

- [ ] Los archivos originales de SKYO no se han modificado hasta disponer del frontend para integrar; cambios son incrementales.
- [x] Existe demo local de lectura FITS y diferencia sintética (12 tests Node) separada de la app original.
- [x] `FLAGS` Uint32+BZERO, interpolación de varianza con pesos cuadrados y plano de fondo están cubiertos por tests sintéticos.
- [ ] Build real Vite contra dependencias instaladas, abrir `dist/` y verificar caché PWA y carga WASM (pendiente por red de npm).
- [ ] `Rust WASM` compilado con `wasm-pack` y resultado numérico comparado bit a bit/tolerancia frente a JS.
- [ ] UI probada visualmente en Chrome/Firefox/Safari y Android 360/390px con datos reales.
- [ ] Dos observaciones reales de SPHEREx DR1/QR3 de **misma región y λ compatible**.
- [ ] WCS TAN-SIP validado frente a Astropy con headers y coordenadas de SPHEREx.
- [ ] `FLAGS` descomprimida, leída y aplicada, con definiciones originales; no eliminar `SOURCE`.
- [ ] `VARIANCE` cargada y utilizada; advertencia para correlación postinterpolación.
- [ ] WCS-WAVE contrastado por píxel; λ y anchura reales disponibles o se bloquea afirmación científica.
- [ ] Diferencias, máscaras y estados preservan integridad y procedencia de observaciones.
- [ ] Blink/decalaje y export JSON de análisis local, sin enviar datos de usuarios.
- [ ] JPL/Gaia consultados con fecha y geometría correctas antes de decir «Conocido».
- [ ] H.E.R.A 7 no inventa medidas y señala las limitaciones de cada análisis.
- [ ] OPFS/PWA probados con cortes de red y gestión de cuotas.
- [ ] Publicación desde hosting estático sin VPS; licencias/atribuciones auditadas.

## 12. Riesgos y bloqueantes actuales

| Riesgo | Impacto | Medida |
|---|---|---|
| CORS IRSA no compatible con fetch desde navegador | Alto | Recortes curados del mismo origen + archivo manual; verificar endpoint antes de habilitar modo directo |
| FLAGS originales tile-compressed | Alto | Curación inicial con Astropy para generar FLAGS no comprimida; evaluar biblioteca FITS Rust WASM |
| WCS-WAVE FITS no soportado por lectores simples | Alto | Metadatos científicos por ROI curados, validar mapa espectral pixel a pixel antes de detectar |
| WCS TAN-SIP incorrecto en un FITS real | Alto | Test cruzado vs Astropy con observaciones reales y mapa de residuales |
| Imágenes de igual detector pero distinta λ | Alto | Pares elegidos por λ/Δλ reales y cobertura espacial, no solo D1…D6 |
| 2" umbral no robusto | Alto | Usar incertidumbre por fuente, ePSF, SNR, múltiples fechas y control de artefactos |
| Carga de cientos de MB agota RAM móvil | Alto | Recortes, límite 512², worker y cuota; no cargar cube 300MB en móvil |
| GPL/LGPL o notices incumplidos | Medio | Revisar rama/tag exacta de Aladin, conservar avisos |
| WebGPU/LLM local consume batería/RAM | Medio | No usar por defecto; HERA determinista |
| Persistencia OPFS no garantizada | Medio | Botón exportar y mensajes sobre limpieza del navegador |

## 13. Fuentes consultadas (oficiales y técnicas)

1. NASA/IPAC IRSA, [SPHEREx Mission & Releases](https://irsa.ipac.caltech.edu/Missions/spherex.html).
2. NASA/IPAC IRSA, [DR1 Overview](https://irsa.ipac.caltech.edu/data/SPHEREx/docs/overview_dr1.html).
3. IRSA Tutorials, [Introduction to SPHEREx Spectral Images](https://caltech-ipac.github.io/irsa-tutorials/spherex-intro/): IMAGE, FLAGS, VARIANCE, ZODI, EPSF, WCS-WAVE.
4. IRSA Tutorials, [Download a collection of SPHEREx Spectral Image cutouts](https://caltech-ipac.github.io/irsa-tutorials/spherex-cutouts/): TAP `spherex.artifact` y `spherex.plane`, tiempos y recortes.
5. IRSA Tutorials, [SPHEREx HiPS All-Sky Mosaic Cubes](https://caltech-ipac.github.io/irsa-tutorials/spherex-hipscube/): 102 canales, ~300MB por cubo HEALPix FITS.
6. CDS, [Aladin Lite v3](https://github.com/cds-astro/aladin-lite) y [licencia actual](https://github.com/cds-astro/aladin-lite/blob/master/LICENSE).
7. MDN, [WebAssembly](https://developer.mozilla.org/en-US/docs/WebAssembly), [Web Workers](https://developer.mozilla.org/en-US/docs/Web/API/Web_Workers_API/Using_web_workers), [OPFS](https://developer.mozilla.org/en-US/docs/Web/API/File_System_API/Origin_private_file_system) y [COOP/COEP](https://developer.mozilla.org/en-US/docs/Web/API/Window/crossOriginIsolated).
8. [Vite build for static hosting](https://vite.dev/guide/build.html).
9. [fitsio-pure](https://docs.rs/crate/fitsio-pure/latest) y [fitsy](https://docs.rs/fitsy/latest/fitsy/) como **candidatos a evaluar**, no declarados compatibles sin test real.
10. `SPEC(1).md`, aportado por el proyecto, v1.0 2026-11-13 (base de la trazabilidad, no fuente NASA).

---

### Notas sobre verificación de esta entrega

- El código JavaScript del pipeline ha ejecutado **12 tests Node** con FITS sintéticos generados localmente, incluidos `BZERO`, bits altos `FLAGS`, WCS TAN-SIP, propagación de varianza, sustracción ZODI y plano residual. No prueban exactitud con FITS reales.
- Se comprobó sintaxis del curador Python; **no** se conectó a IRSA desde este entorno porque el runtime no pudo resolver ese host.
- La instalación de Vite con npm fue bloqueada por DNS (`EAI_AGAIN`), por lo que **no** se ejecutó el build real de producción. `npm run dev:standalone` puede servir la fuente sin dependencias, pero no valida el bundle ni la PWA final.
- El kernel Rust es código fuente de referencia y no se pudo compilar aquí: `cargo`/`rustc`/`wasm-pack` no están instalados. El prototipo cae a JavaScript si no encuentra WASM; la promesa de rendimiento WASM se evaluará después de compilarlo en un equipo del usuario.
- Los 12 tests de Node no demuestran precisión astronómica sobre datos reales. No se ha certificado interoperabilidad completa de FITS, espectral WCS, ePSF, compresión original ni detección de objetos.


## 14. Auditoría de las observaciones de Argon

| Observación | Dictamen tras revisar el código 2.0 | Acción 2.1 |
|---|---|---|
| DTO `dataRelease` no anulable | **Correcta**, en el documento obligaba a etiquetar fuentes sin release | Unión discriminada y `null` en `SYNTHETIC` / `USER-LOCAL` |
| Buffer detached y OPFS | **Advertencia correcta en general**, pero el código previo guardaba `File`, no el mismo buffer transferido | Documentar ownership y relectura de `File` |
| `renderLayer` sin identificación y resultado sin bitmap | **Correcta para el SPEC 2.0**; el worker ya devolvía RGBA de la diferencia en un evento, pero faltaba contrato explícito | `render` con target y `jobId`; `compared` devuelve identificadores de productos |
| RPC y eventos contradictorios | **Correcta** | Protocolo único de eventos con `jobId` |
| Fondo zodiacal frente a un solo offset | **Mejora científica importante**; un modelo `ZODI` tampoco garantiza remover el fondo perfectamente | Aplicar `ZODI_A/B` donde existe y ajustar plano residual 2D; resultado permanece exploratorio |
| Inversión SIP | **Ya existía inversión iterativa** en v2.0; faltaba control de convergencia | Newton-Raphson con derivadas y rechazo de divergencia |
| Varianza bilineal | **Falso positivo en el código v2.0**: ya empleaba `weight * weight * vv` | Añadir prueba explícita y documentar correlaciones |
| `FLAGS` como float y `BZERO` | **Riesgo válido**, pero v2.0 ya usaba `Int32Array`, no `Float32Array` | Hacer explícito `Uint32Array`, validar `BSCALE/BZERO`, tests bit alto |
| Vite y assets estáticos | **Correcta**, `public/` y WASM runtime no estaban configurados | Mover assets a `web/public/`, configurar Vite, script postbuild |
| SHA-256 en HTTP LAN | **Correcta**, sin secure context SHA-256 falla; error ya estaba capturado en la UI | Mensaje claro HTTPS/localhost y soporte documentado; sin fallback inseguro silencioso |
| OPFS exclusivamente Worker | **Incorrecta como obligación general**: la API asíncrona funciona en main; el handle síncrono sí requiere Dedicated Worker | Mantener API asíncrona con advertencia de compatibilidad y plan de mover I/O intensivo |
| Fechas de DR1 | **Correctas en el SPEC original**; comprobadas por documentación oficial | Explicitar anuncio del 12/11/2026 |
| Previews `.ppm` en producción | **Correcta** | Mover a `tests/fixtures` y excluir del directorio público |

**Estado científico de 2.1:** únicamente comparador exploratorio. No está validado el procesamiento de máscaras comprimidas de SPHEREx en el navegador, WCS-WAVE por píxel, ePSF, identificación JPL/Gaia, ni la reproducibilidad astrométrica con archivos NASA. No se deben presentar candidatos como descubrimientos.
