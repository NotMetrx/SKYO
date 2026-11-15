# Memoria

## Cielo inmersivo SPHEREx vigente — 2026-11-15

- Consulta al clic añadida: ficha flotante fija ICRS/píxel/flujo/λ/fecha/hash,
  identifica mosaico/L2, copia coordenadas y exporta snapshot separado de retícula.
  Clic/tacto/Enter, marcador y cierre; cancela timer previo y libera espera al error.
  Build aislado y 13 Node focales/4 navegador pasan. Fusión externa aún con
  conflictos bloquea build/npm global e integración completa en Explorar.
  No sobrescribir esa fusión. Informe `docs/CONSULTA_CLIC_20261115.md`.
- Transición L2 autorizada e implementada: zoom <1.25° busca recorte IBE de
  0.25°, fundido hasta 0.5°, zoom mínimo 0.05°. Rust procesa IMAGE; WCS TAN/SIP
  proyecta sin paralaje sobre radio1000, WCS-WAVE/FLAGS limita píxeles al canal.
  HUD/export distinguen flujo/λ/UTC/OBSID/versión/hash nativos del mosaico.
  Hasta seis candidatos; 32 MB/recorte, 64 MB/búsqueda, cancelación y panorama
  ante error. VR retira L2 y conserva mosaico. Informe: `docs/TRANSICION_L2_20261115.md`.
  Node 58/58; fixture original y muestras Astropy verificadas. IRSA en vivo:
  TAP timeout35s e IBE503; no se declara transición remota exitosa en esta sesión.
  Navegador 23/23 sin omitidas/reintentos (L2 raíz/subruta, retorno/cancelación,
  visor previo, FPA, integración y Axe). Último ajuste solo aclara texto al alejar.
  Repetición final L2 4/4 añade transición en `index.html#explorar` y desmontaje
  al laboratorio: `docs/evidence/immersive-l2-20261115/browser-l2-last.json`.
- Detalle/rendimiento corregidos: LOD adaptativo y geometría en Rust con fallback
  JS, píxeles físicos sin cap 1.75, toda región visible hasta orden 5, ancestros
  progresivos y cuatro descargas. Caché ±2 canales, cinco planos FITS; imagen
  anterior rotulada mientras carga nueva, sin atribuirle flujo del nuevo canal.
- Contraste Rust por umbrales exactos, mismos hashes RGBA/píxeles NASA. Medianas
  repetidas ~3.4–3.8× mejores frente al artefacto previo; no equivalen a fps.
  WASM vigente 112331 B, SHA256
  `c61e0668dea746c4ddaacbbc9e7923c7faa1f7411994c6054d4c89ee3bf2cac2`.
  Node 55/55, Rust 8/8; revisión independiente corrigió caché retenida y LOD
  excesivo al mirar atrás. Caché 256 expulsable: footprint visible puede superar.
  Navegador completo 44/45; única carrera del test gyro sincronizada con render
  y repetida 3/3. Detalle/zoom/caché y demás regresiones pasaron. IRSA real DPR 2:
  71/71 detalle, canvas 2880×1800, flujo idéntico y cero pageerror.
  Recibos e informe: `docs/OPTIMIZACION_INMERSIVA_20261115.md`.
- Usuario autorizó iniciar; Agy confirmó esfera de radio constante y profundidad
  ilustrativa, HUD esencial, laboratorio/FPA auxiliares y PC/móvil/WebXR.
- `inmersivo.html` integrado en Explorar: mirar 360°, vuelo visual, zoom,
  ratón capturable, teclado, tacto y gyro calibrado. WebXR implementa cabeza,
  mandos, HUD/retícula 3D y acciones dentro de sesión; hardware físico pendiente.
- Entrada solicitada `http://localhost:4176/index.html#explorar`: pestaña
  inmersiva seleccionada desde HTML y cielo de borde a borde, sin márgenes ni
  marco. HUD, navegación y bitácora flotan; no hay cabecera SKYO duplicada ni
  globo del asistente abierto automáticamente sobre los controles. Enlaces
  científicos conservados en Controles y procedencia.
- Validación de este ajuste: npm 53/53; navegador 4/4, raíz/subruta, cámara,
  bitácora, salida/regreso de laboratorio y Axe. Viewport/canvas completos en
  1440×900, 390×844, 320×740 y 768×1024; controles sin solapamientos comprobados.
  Build/validadores pasan. Evidencia: `docs/evidence/immersive-20261115/browser-fullscreen.json`.
- Base real: 12 PNG HiPS del canal 62 (λ 3.293 µm), 849825 B, con hashes;
  otros canales/detalle se cargan tras verificar edición. 102 canales, vacíos
  50/51 base 0. ICRS/HEALPix/HPX y paridad contrastados con Astropy y FITS.
- Flujo IMAGE real vía Range: 17280 B de cabeceras y 1 MiB por plano, sin
  bajar cubo completo; Worker/Rust escala/asinh/RGBA/píxeles y export procedente.
  Ensayo remoto: 12.0051 MJy/sr en RA 60.81100°/Dec 51.34040°, Rust 112 ms.
- Novedades TAP al entrar/seleccionar/cada 10 min visible. Cambios de mosaico
  requieren aplicar; bloquean mezclas de edición y flujo de cubo no asociado.
- Evidencia: Node 53/53 sin omitidas, Rust 6/6, Python 6/6, navegador completo
  39/39 y repetición final afectada 9/9 tras paridad/streaming/ratón capturado.
  Build y validadores pasan; revisión independiente sin importantes restantes.
- WASM de la primera entrega (sustituido por el de arriba): 102109 B, SHA256
  `ad4422eed36f72b4f48c84e32d7a5e933d0b1cf1f83a3a02344f477129d82128`.
- Detalle/límites: `docs/VALIDACION_INMERSIVA_20261115.md`. Sin medición de
  60 fps ni validación física VR/gyro/Android/Safari/HTTPS. No distancias ni
  fotometría validada; IMAGE sin FLAGS/VARIANCE, scienceReady=false.
- Tarea central `t-fba4afca4066` sigue pendiente sin claim/finish automático;
  no hay identidad para sesión MCP. Siguiente: ensayos de hardware/rendimiento
  y revisión de evidencia; T08 científico conserva sus puertas.

## Vista real FPA e Integración SPHEREx ("Explora") — 2026-11-15

- Corrección exhaustiva de regresiones previas introducidas en "Explora":
  * Eliminado segundo WebGLRenderer y PMREM duplicado de `hera3d.js`; restaurado relieve 2.5D en `#ha` y arquitectura Ponytail de un solo contexto Three.js primario.
  * Resueltos conflictos de maquetación en `index.html` y `assets/css/main.css` (`.top-status-chip` y solapamiento de `#nav` sobre `.explore-view-tabs`).
  * Reubicado script Python de generación de geometría a `scripts/generate_focal_plane.py` evitando empaquetarlo en `dist/assets/models/`.
  * Resuelto scroll desalineado tras comprobación móvil en `tests/browser/integration.spec.mjs`.
- Pipeline de decodificación FITS a textura WebGL acelerado en Rust/WASM:
  * Implementado `FitsTexture` en `science-core/src/texture.rs` con desempaquetado binario big-endian, ZScale y estiramiento no lineal Asinh a RGBA8888.
  * Compilado con `wasm-bindgen-cli 0.2.130` en `assets/js/science/wasm/pkg/` (96.332 bytes, SHA 7acff41c01e0ff7f78b6452a60fc29063a81d2771c507e665ffa8508964a706d).
- Explorador SPHEREx D1–D6 interactivo en "Explora":
  * Conjunto curado NASA DR1 (D1–D6) integrado con distribución 2×3 esquemática, controles orbitales de cámara 3D libres (arrastre, paneo Mayús/botón derecho, zoom rueda/pellizco, teclas de dirección).
  * Formulario de búsqueda TAP contra IRSA (DR1/QR3) con límite a 60 resultados y cancelación por AbortController.
  * Distinción científica explícita de procedencia (imágenes de intensidad monocromática, huella 255², previsualización no calibrada para astrometría).
- Validación de calidad integral:
  * Node unit tests: 45/45 aprobados (`scripts/*.test.mjs`), incluyendo equivalencia WASM/JS y decodificación FPA.
  * Build & PWA: `npm run web:build`, `validate:build` y `validate:docs` aprobados sin advertencias críticas.
  * Playwright browser tests: 32/32 aprobados (accesibilidad, integración KRYO-9 GLTF/Draco en `/` y `/skyo/`, FPA real WASM, PWA offline, Aladin HiPS bajo demanda).

## Fuente y decisiones vigentes

- Proyecto MCP `skyo`, actor `codex`, spec `002-comparador-local`.
- Fuente normativa: `docs/SPEC_SKYO_2.1_AUDITADO.md`; plan/tareas/validación
  en `docs/specs/002-comparador-local/`. `001-inicial` es histórica.
- `main` avanzó por fast-forward de `4ee3f74` a `9022f46`; después se trajeron
  los 5 commits de `origin/main` hasta `409d762` (audio espacial, composición
  ArtCraft, plano focal 3D desde Blender, contraste D1–D6). La reaplicación local
  produjo conflictos; su resolución por archivo está en curso. Sin commit
  nuevo/push. Stashes `8df0722` y `6aa80315` conservados.
- Vite 7.3.8 y lockfile: index.html, lab.html, contexto.html; configuraciones
  activas en raíz, copias históricas en `_archivo/legacy/`. Motor en assets/js/science/.
- Paleta local Obsidian/Chrome/Crimson/Sky Blue y contexto HiPS separado. La
  integración del frontend remoto KRYO-9/Bóveda/HERA está pendiente de verificación;
  conservar límites de carga, pausa y movimiento reducido al resolverla.
- PWA por scope/build: shell precache; demo, datos reales, Three/Aladin y WASM
  por petición. Actualización consentida, sin recarga automática del trabajo.

## Implementación y evidencia previas a la integración — 2026-11-14

- Usuario autorizó iniciar T01 y continuar las demás tareas. Ponytail full activo.
- T01: sesión/UI compartidas, selección versionada, hashes, Worker/snapshot,
  contratos runtime, reporte vigente y diagnóstico separado; carreras probadas.
- T02: curador robusto/atómico, originales y HDUs/versiones/tiempos/EPSF conservados.
  TAP nuevo falló 502/timeout; selección desde CSV histórico84 + FITS nuevos verificados.
- T03: FITS limitado/estricto, FLAGS uint32/BZERO y máscaras por propósito;
  TAN/SIP ICRS admitidos, 27 muestras D2/D3/D6 contra Astropy (<1e-4 px).
- T04/T05: paquete public/datasets/m101-visual-v2/, dos ROI12x12 del mismo campo,
  épocas DR1 D2 distintas (~5.2993d), cobertura λ heurística visual; fondo robusto,
  SOURCE excluida del fondo A/B, ZODI en copias si ambas capas. Lugar/Tiempo/Luz,
  blink manual, vistas, procedencia y export en ambos laboratorios. Sin PSF matching.
- T06: OPFS generaciones/commit, hashes/nombres al reabrir, cuota/fallos inyectados,
  borrado explícito; PWA raíz/subruta/offline/Vary:Origin y actualización verificados.
- T07: Rust2/2, wasm32 y glue wasm-bindgen0.2.130, SHA verificado en bridge/Worker;
  fallback ante ausencia/corrupción/trap. Artefacto25.278B en assets/js/science/wasm/pkg/.
  SHA173039a1888940f97b3ca1c65603d600d54527343bd92284060c1dec6ba02524.
  Equivalencia5casos (2ROI NASA), error máximo0. Benchmark no mejora universal.
- npm test43/43, cero omitidas (incluye cuatro regresiones antes fallidas),
  Python6/6, Rust2/2, Vite/build y validadores pasan. Resultados de navegador
  finales26/26, cero omitidos (6.3min), en docs/evidence/implementacion-20261114/browser-final.json.
  Desarrollo4173 real/Worker/export sin pageerror.
- Integración 2026-11-15: traídos `sound.js` (audio Deep Liquid Glass), `focal_plane.glb`
  + `generate_focal_plane.py`, composición ArtCraft y hover/etiquetas del plano focal.
  Se conserva la política local de Three.js bajo demanda, enlace «Explorar el cielo»
  y activación `data-enable-cosmos`.
- Integrados cambios de origin/main (hasta commit dd0b317): estética ArtCraft global,
  contraste FPA/KRYO-9, temporizador de warp-zoom y validación PV-01..08.

## Límites y siguiente paso

- T08 solo inspección: CWAVE/CBAND D2 original33.312.960B, SHA0eb4e27f351e6161e21372818f9e811480a7ab8bab9295722f180791e151a463;
  ROI/zonas ePSF33x33 sobremuestreo5 leídos de cabecera, sin integrar a píxel.
  Calibración7.0.0b6... vs imágenes7.0.5: asociación no verificada, no incompatibilidad
  demostrada. scienceReady=false. Originales FITS intactos en data/.
- Faltan vínculo de versiones, integración/PSF matching, incertidumbres completas,
  observador/épocas/catálogos, inyección/recuperación/FPR/completitud y revisión
  independiente. No afirmar detección; WCS-WAVE/SNR siguen exploratorios.
- Sin Android/Safari físico, rendimiento móvil ni publicación HTTPS validada.
  No hay baseline visual aprobado ni certificación WCAG. Cuota por fallos inyectados.
- Claim T01 central rechazado por spec pendiente/invalidada; T01–T08 siguen
  pendientes sin propietario. No autoaprobar ni finish. Usuario autorizó trabajo local.
- Sesión MCP sin identidad disponible; no inventar sesión ni copiar secretos.
  Documentos locales actualizados, bóveda central antigua sin sincronización implícita.
- Aladin GPLv3 conserva notices; decisión de distribución/licencia pendiente.
  Siguiente: revisión técnica/administrativa y requisitos científicos restantes de T08.

## Diagnóstico Agy histórico — 2026-11-14

- En el diagnóstico, `git fetch origin` actualizó el remoto a `9022f46`; HEAD seguía `4ee3f74`,
  tres commits por integrar (`8f3ef32`, `0808f77`, `9022f46`). Sin conflictos Git activos.
- Se observó Agy activo con auditoría visual y ediciones de app.js, con
  cambio de warp/clic/tiempos y arranque automático de cosmos, sin validarlos aquí.
- No se integró encima de otro agente editando, ni se modificó código ni detuvo
  procesos. Las pruebas previas pertenecen al snapshot anterior a esas ediciones.
- Recibo histórico: docs/evidence/diagnostico-agy-20261114.json. La integración
  posterior autorizada se registra abajo; este diagnóstico no describe el HEAD actual.


## Integración delegada — 2026-11-14

- Usuario autorizó integrar los tres commits remotos y delegar entre agentes.
  Se avanzó `main` a `9022f46` y reaplicó el trabajo local, sin commit/push nuevo.
- Respaldo externo verificado: `/home/metrx/Proyectos/SKYO-backups/integracion-9022f46-20261115T032838Z/`.
  Incluye 193 rutas (123.925.651 bytes), índice, parches binarios y bundle Git
  verificado. Todos los contenidos se comprobaron también dentro del stash nuevo
  `6aa80315bfde0f7854fe11ef0aebef6372f9961d`; no se eliminó ningún stash.
- Se restauraron FITS originales, WASM, lockfiles y evidencias. Las 178 rutas
  no conflictivas recuperadas coinciden con su SHA; `data.js`, `explorar.js` e
  `history.md` se fusionaron automáticamente y requieren revisión semántica.
- Propiedad: `git_integrator` controla Git y estas memorias; `frontend_resolver`
  resuelve CSS, app/cosmos/HERA, HTML y SW; `science_resolver` resuelve adaptadores
  científicos y `explorar.js`. OpenCode agotó cuota del proveedor (429), sin
  escribir propuestas, y se reasignó esa tarea. Agy revisa refs en modo de solo
  lectura. No hay escritores paralelos sobre el mismo archivo. Los Agy originales
  quedan fuera de estas asignaciones; el coordinador controla su pausa/reanudación.
- Recibos en `docs/evidence/integracion-9022f46/`; snapshots base/remoto/local y
  con marcadores conservados en `conflicts/` dentro del respaldo externo.
- Resolución y validación final de integración completadas exitosamente:
  - Los 10 archivos unmerged (UU) (`assets/css/lab.css`, `assets/css/main.css`,
    `assets/js/app.js`, `assets/js/cosmos3d.js`, `assets/js/hera3d.js`,
    `assets/js/science-lab-ui.js`, `assets/js/science/lab.js`, `index.html`,
    `lab.html`, `sw.js`) y los 3 fusionados automáticamente (`data.js`,
    `explorar.js`, `history.md`) se revisaron sin marcadores de conflicto y se
    añadieron individualmente con `git add`.
  - Se conservó KRYO-9 con GLTF/Draco/RoomEnvironment bajo demanda, el diseño
    hero-split y los estados UI de WCAG 2.2, combinados con la paleta local
    (obsidiana, Laser Crimson `#e11d48`, Sky Blue `#7cc8ff`), laboratorios
    compartidos, snapshots/hashes, procedencia de datos, OPFS y WASM nativo.
  - Se adaptó `tests/browser/integration.spec.mjs` a las expectativas de KRYO-9
    y Draco, validando carga diferida (Three.js no cargado en inicio hasta activación),
    funcionamiento en raíz y `/skyo/`, navegación por enlace/teclado y diseño móvil
    sin desborde horizontal.
  - Resultados de verificación integral:
    - `npm test`: 43/43 tests aprobados (0 fallos).
    - `npm run web:build`: build Vite 7 + postbuild exitoso (36 precache, WASM presente).
    - `npm run validate:build`: manifiestos raíz y subruta, y entradas estáticas válidas.
    - `npm run validate:docs`: especificación 002 verificada (SHA-256 `05d54609a6219728b7a8cc98f9f6c603852173cab69125e2ed2a043caa4f2bc7`).
    - `npm run test:browser`: 27/27 tests de navegador aprobados en Playwright Chromium headless.
  - Evidencia registrada en `docs/evidence/integracion-9022f46/validacion-integracion-final.json`.
  - Sin commit, push ni reset --hard; respaldo externo y stashes conservados intactos.
- T08 sigue inspection-only/scienceReady=false y el registro central sigue
  pendiente; sin autoaprobación, claim/finish ni sincronización implícita.

## Revisión de incorporaciones recientes — 2026-11-15

- Revisión solicitada del FPA, cielo inmersivo, consulta por clic y detalle L2.
  HEAD observado `156961a`, remoto `dd0b317`; fusión creada por la otra sesión,
  sin conflictos Git activos. Nuevos módulos siguen en parte sin seguimiento.
- `npm test`58/58, cero omitidas; build Vite46precache y WASM presente,
  validate:build y validate:docs pasan. Son verificaciones de esta revisión;
  no acreditan VR/móvil físico ni corrigen/validan el cuelgue de otro snapshot.
- Dos P2 reproducidos, sin editar producto: cambiar canal antes del manifiesto
  lanza TypeError y deja selector64/102 frente a imagen63/102; terminar pellizco
  con último dedo estacionario activa selección no solicitada.
- Evidencia: docs/evidence/revision-reciente-20261115/{review,reproduction}.json.
  Siguiente: proteger inicialización/canal y distinguir gesto multipuntero de clic;
  repetir sus regresiones y navegador de vistas nuevas. scienceReady=false.

## Inventario funcional de IRSA SPHEREx — 2026-11-15

- Solicitud: revisar la aplicación de origen de los datos y extraer funciones
  para replicarlas. Entregable: [matriz de 38 capacidades](docs/REPLICA_FUNCIONAL_IRSA_SPHEREX.md),
  con fuentes primarias, brechas locales, prioridades, criterios de aceptación y
  puntos de integración existentes; es una propuesta, sin autoaprobar el plan.
- Fuente: SPHEREx Data Explorer de IRSA. Documentación oficial consultada y
  16 recibos HTTP con SHA-256 en `docs/evidence/irsa-funciones-20261115/sources.json`.
  Endpoint disponible; recorrido interactivo no comprobado porque CUA reportó
  `browser access host unavailable`. Sin subir archivos ni ejecutar jobs remotos.
- Orden propuesto: búsqueda combinada/tabla/cobertura; inspector HDU/FLAGS,
  recortes y regla; después RGB/WCS/perfiles/catálogos/gráficos; mosaicos y
  espectrofotometría requieren diseño y validación científica separados.
- APIs Firefly identificadas como referencia, sin instalarlo ni migrar el stack.
  No se modificó código de producto ni se corrigieron los dos P2 anteriores.
- Validación de esta revisión: `npm test` 58/58 y `npm run validate:docs` pasan;
  el hook de sincronización informó manifiesto ya sincronizado. Se comprueban
  además enlaces locales e identificadores del nuevo inventario. Sin nuevo build
  ni validación Android/VR. `scienceReady=false`; no se afirma detección.
- Siguiente paso concreto: corregir canal/gesto y entregar una consulta real con
  tabla seleccionable que actualice imagen, metadatos y huella de la observación.

## Integración y resolución de conflictos de origin/main — 2026-11-15

- Fusión completada de `origin/main` (`dd0b317` y `e61b7d4`) en la rama de trabajo `main` local:
  - Commit `156961a`: integración de estética ArtCraft y motor científico local.
  - Commit `4f51023`: calibración de HUD y restauración de estado `eclipse-ready`.
  - Commit `4785812`: integración de `e61b7d4` (*unificar portada #inicio SPHEREx + Neois, identidad de pestaña e iluminación 3D*).
  - Portada `#inicio` ahora incluye la sección desplazable `.inicio-showcase` con las 4 secciones editoriales: `// 01 ¿Qué es SPHEREx?`, `// 02 La plataforma SKYO`, `// 03 Grupo Neois` e `// 04 Nuestra misión`.
  - Favicons, manifest y metadatos OpenGraph sincronizados.
- Verificación exhaustiva:
  - `npm test`: 62/62 pruebas unitarias pasando (0 fallos).
  - `npm run web:build`: compilación limpia en `dist/` (56 recursos precache, WASM presente).
  - `npm run validate:build` y `npm run validate:docs`: exitosos.
- Rama local `main` consolidada y activa en el servidor local.



## Archivo e inspector simplificados — 2026-11-15

- Implementación local autorizada: tabla de observaciones y huellas de resultados
  enlazadas al inspector 2D de `espectral.html`; FITS local, HDU/planos/cabeceras
  originales, contraste, máscaras compatibles y regla angular ICRS TAN/SIP.
- RGB omitido porque los previews no tienen registro/campo común verificado;
  se conserva la alineación WCS automática del laboratorio. Sin dependencias nuevas.
  Plan: docs/specs/002-comparador-local/archivo-plan.md; informe y límites:
  [Archivo simplificado](docs/ARCHIVO_SIMPLIFICADO_20261115.md).
- `npm test`: 62/62, build final 55 precache/WASM presente, validate:build y validate:docs
  pasan. Inspector Chromium4/4 y FPA3/3 pasan en raíz/subruta, teclado, móvil y Axe.
  Prueba de lectura pendiente corregida para trabajo ya iniciado: repetición3/3.
- La batería global detectó timeouts en detalle/precarga 3D (también al repetirlo)
  y KRYO-9 raíz/subruta. No se anuncia pipeline global verde ni se cambia ese
  motor en esta entrega. Evidencia: docs/evidence/archivo-simple-20261115/.
- Corregida también la referencia PWA que la integración trasladaba a `assets/`:
  manifiesto público de raíz en index/lab, identidad nueva conservada y validador
  comprueba el enlace real. Repetición Chromium raíz/subruta: 2/2 pasan.
- TAP real devolvió502; cobertura de mocks y cubo pequeño son sintéticos, FITS
  NASA preservados identificados aparte. No acreditar servicio remoto ni Android/VR
  físico. scienceReady=false; originales intactos. Preview local en puerto4195.
- Tarea central t-e7004c435816 sigue pendiente sin claim/finish ni autoaprobación.
  Siguiente: revisar los timeouts3D y disponibilidad IRSA, sin ampliar el inspector.

## Fusión `origin/main` (`2e73278`) y reorganización profesional — 2026-11-15

- Fusionadas en frontend y backend las funcionalidades de `origin/main` (`2e73278`: `inmersivo.html` 360° HEALPix + capa L2, `espectral.html` plano focal FPA D1–D6 + inspector FITS/HDU, `contexto.html` HiPS, kernel `skyo_wasm` y 13 suites Node) conservando la portada `#inicio` con showcase Neois/SPHEREx (`E_MINIMAL=0`), paleta vigente (`#000000`/`#5BB8FF`/`#B57BFF`), iluminación `#3d` y mascota KRYO-9 3D en `frontend/assets/js/hera3d.js`.
- Ordenamiento limpio de carpetas raíz en tres bloques:
  - `frontend/` (`index.html`, `lab.html`, `espectral.html`, `inmersivo.html`, `contexto.html`, `sw.js`, `icon.svg`, `assets/`, `public/`).
  - `backend/` (`server/dev-server.mjs`, `science-core/`, `python/`).
  - Soporte y verificación (`data/`, `docs/`, `tests/`, `scripts/`, `_archivo/`).
- Actualizados `package.json`, `vite.config.mjs`, `backend/server/dev-server.mjs` (sirve `frontend/` + `frontend/public/` + montaje `/data/`), `scripts/`, `backend/python/`, `tests/unit/`, `tests/browser/`, `tests/test_curator.py` y `.gitignore`.

## Portada `#inicio` Opción 2, `Heras7`, fallback 2D y 4 transiciones continuas sobre `frontend/` (`b384d02`) — 2026-11-15

- Portados limpiamente sobre la reorganización `frontend/`/`backend/` de `origin/main` (`b384d02`) los cambios aprobados de `#inicio`, resiliencia WebGL y transiciones sin alterar `inmersivo.html`, `espectral.html`, `contexto.html`, `lab.html`, `manifest.webmanifest`, `frontend/sw.js` (plantilla Vite PWA), `skyo_wasm` ni las 5 subvistas de `#explorar`:
  - `#inicio` en `frontend/index.html`, `frontend/assets/css/main.css` y `frontend/assets/js/cosmos3d.js`: póster centrado Opción 2 con logotipo **SKYO** ampliado (`clamp(104px, 16.8vw, 258px)`), Eclipse GLSL de 4 capas + destello de diamante + retícula coronográfica en hover, Vía Láctea GLSL oscura con paralaje en 4 profundidades, coreografía periódica Eclipse ↔ **Heras7**, telemetría ICRS `.inicio-telemetry` y etiqueta unificada **`Heras7 · Copiloto orbital`** (sin `.inicio-showcase` ni textos promocionales en `#inicio`).
  - Resiliencia WebGL (`pane`/Wayland) y respaldo 2D en `cosmos3d.js` y `hera3d.js`: `createSafeWebGLRenderer` y `createSafeTransparentWebGLRenderer` (cascada `webgl2 -> webgl -> experimental-webgl` sin MSAA/`failIfMajorPerformanceCaveat`), correcciones GLSL (`pow`/`atan`), preservación/restauración del SVG `<svg class="diamond-eclipse">`, lienzo cósmico 2D interactivo + emblema `.agent-2d-emblem` sin bloqueo en `#inicio`/`#explorar` y ajuste de `.eclipse-flare` (`184px 68px`).
  - 4 mejoras de transición continua (`cosmos3d.js`, `app.js`, `main.css`): (1) `inicioGroup` + `uWarp` activos durante todo `eclipsePhase === 'transition'` mientras `explorarGroup` escala `0.28 -> 1.0`, (2) túnel 3D de estelas estelares radiales + doble onda de choque (`buildWarpEffects`, pulso entre `#explorar ↔ #3d ↔ #fases`, ráfaga `fallback2DWarpT` en modo 2D), (3) curva de cámara `C¹` continua + pulso magnético `.is-kryo-docked` (`@keyframes heraDockPulse`) sobre `#ha` + pulso `.brand.is-eclipse-arrived` en `#brand-home`, y (4) entrada escalonada del HUD (`hudPortalArriveTop`/`Bottom`, `body.route-shifting`) junto a `syncCosmosVisibility()` con soporte para `#fases`, `#spectral-frame` y `#hips-frame`.
  - Unificación **`Heras7`** en `#hera` (`index.html`), `app.js`, `data.js` (`MSG.inicio`, `RESUMEN_TRABAJO`) y `fases.js` (`Consultar a Heras7`), `color-scheme: dark` + scrollbar oscura en `.phase-panel`, calibración `rawEmissiveStrength` en `glb-lite.js` y soporte MIME `.mp4`/`.webm` en `backend/server/dev-server.mjs`.
- Verificación observada tras la edición final:
  - `node --check` sobre `frontend/assets/js/*.js` y `backend/server/dev-server.mjs`: OK.
  - `npm test`: **62/62** pruebas unitarias pasando (0 fallos, 0 omitidas) en las 13 suites (`tests/unit/*.test.mjs`).
  - `npm run validate:docs`: OK (`SPEC SHA-256 9cb76403fc0d845d8ab1c6aba7292b83b817cbd9159bd8dee58b2fa7b543fcfb`). `vite` no instalado localmente (`npm run web:build`/`validate:build` omitidos en este entorno).
  - Auditoría Firefox headless BiDi (`bidi_audit.mjs` y `test_no_webgl.mjs`) contra `node backend/server/dev-server.mjs`: 0 errores de consola/página, 0 desbordamiento horizontal en `1440×900`–`320×568`, transición warp-zoom + 5 subvistas de `#explorar` + `#3d` + `#fases` (`equipo`) + `lab.html` + favicons/manifiesto HTTP 200 y escenarios WebGL `blocked` y `no-msaa` verificados.
- `scienceReady=false`; sin autoaprobación ni detección astronómica declarada. Siguiente paso: `npm run web:build` / `npm run validate:build` en entorno con Vite/dependencias instaladas y continuar T01–T08.
