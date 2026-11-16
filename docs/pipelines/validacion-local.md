# Pipeline

## Objetivo

Validar el comparador exploratorio de SKYO conforme a la spec activa, desde los
contratos y la curación hasta el Worker, persistencia y publicación estática.
Separar equivalencia de software, uso visual de datos reales y aceptación
científica. La incorporación `001-inicial` y la migración conservan su historia.

## Entradas

Proyecto `skyo`, actor `codex`, spec `002-comparador-local`,
`docs/SPEC_SKYO_2.1_AUDITADO.md`, package-lock.json, science-core/Cargo.lock,
requirements-science.txt, fuentes actuales y paquete public/datasets/m101-visual-v2/.
Node compatible con Vite 7 (20.19+ o 22.12+), Python compatible con las versiones
fijadas, Rust con target wasm32-unknown-unknown y Chromium de Playwright.

## Etapas y responsables

1. Codex consulta contexto MCP, protocolo, constitución, memoria y spec.
2. Codex instala dependencias fijadas y ejecuta pruebas de sesión, contratos,
   FITS/WCS/máscaras, comparación, curador y persistencia. Conserva originales.
3. Codex compila Rust/glue si anuncia WASM; verifica equivalencia y fallback.
4. Codex compila frontend y comprueba raíz/subruta, datos reales/demo,
   exportación, móvil/teclado/Axe, OPFS, actualización y offline con Vary: Origin.
5. Codex registra comandos, resultados y límites; actualiza MEMORY.md. El
   propietario revisa la entrega. No se autoaprueban tareas ni ciencia.

## Comandos exactos

Desde la raíz del proyecto:

```sh
node --version
npm ci
npx playwright install chromium --only-shell
python3 -m venv .venv
.venv/bin/python -m pip install -r requirements-science.txt
.venv/bin/python -m unittest discover -s tests -p test_curator.py
cargo test --locked --manifest-path science-core/Cargo.toml
rustup target add wasm32-unknown-unknown
```

`npm run wasm:build` verifica y reutiliza los artefactos precompilados incluidos
en el repositorio. Para forzar su regeneración tras cambiar código Rust usa
`npm run wasm:build -- --rebuild`. Para regenerar se requieren Cargo y el target
`wasm32-unknown-unknown`. Si falta la CLI, el script instala en la caché local
de `node_modules` la versión fijada en Cargo.lock; necesita acceso a crates.io.
Si existe una versión distinta en PATH, informa el conflicto y se detiene:

```sh
npm run wasm:build
```

El paquete generado se conserva en assets/js/science/wasm/pkg/. No se necesita
wasm-pack. Un cargo build bruto no prueba glue/carga en Worker.

```sh
npm test
npm run web:build
npm run validate:build
npm run validate:docs
npm run test:browser
npm run test:science-gaps
```

`npm test` incluye las cuatro regresiones recuperadas y la equivalencia WASM si
existe el paquete. Si WASM falta, la prueba equivalente queda explícitamente
omitida y no permite anunciar G7 superada. La entrega de 2026-11-14 ejecutó las
43 pruebas sin omisiones con binario real. Las cuatro regresiones ahora pasan;
una salida distinta de cero sigue bloqueando la aceptación del motor.

`test:browser` sirve dist/ en 127.0.0.1:4180 para raíz y /skyo/. Guarda JSON en
test-results/browser.json y trazas/capturas en test-results/. `SKYO_BROWSER`
selecciona un Chromium instalado, `SKYO_TEST_PORT` aísla el puerto y
`SKYO_REPORT`/`SKYO_OUTPUT` fijan las salidas. Ejecución de cierre:

```sh
SKYO_TEST_PORT=4188 SKYO_REPORT=docs/evidence/implementacion-20261114/browser-final.json SKYO_OUTPUT=test-results/final npm run test:browser
```

Para revisar la aplicación: `npm start` en 4173 o `npm run preview` en 4174.
La inspección científica de T08 es independiente: scripts/inspect_science_inputs.py
requiere los originales/calibraciones indicados en sus hashes y escribe
scienceReady=false. No activa calibración científica del producto.

## Artefactos de salida

Transición a recorte L2: `scripts/l2.test.mjs` (incluido en `npm test`) contrasta
WCS espacial/espectral con fixture Astropy y rechaza canal/identidad incompatible.
`tests/browser/l2.spec.mjs` verifica fundido, flujo/fecha/λ/export y cancelación con
FITS real y red controlada. Informe `docs/TRANSICION_L2_20261115.md`; evidencia en
`docs/evidence/immersive-l2-20261115/`. Registrar por separado intentos remotos
y sus errores: una prueba controlada no acredita disponibilidad continua de IRSA.

Detalle/rendimiento: `node scripts/benchmark-immersive.mjs --out resultado.json`
verifica hash RGBA/píxeles y mide kernel en 30 iteraciones tras 5 de calentamiento.
`--baseline <carpeta-del-artefacto-anterior>` compara módulos con la misma entrada.
No confundir tiempo CPU con fps. `npm test` incluye geometría/cobertura Rust y
expulsión de caché; navegador incluye DPR 2, precarga y caché FITS sin red adicional.
Ver `docs/OPTIMIZACION_INMERSIVA_20261115.md` y `docs/evidence/immersive-quality-20261115/`.

Ampliación inmersiva aprobada: `npm test` incluye ICRS/HEALPix/HPX contra fixtures
Astropy, paridad, plano NASA real, Range acotado, curación por edición y lógica XR.
`test:browser` incluye escena de 360°, vuelo/canales/flujo/export, gyro y permisos XR,
ratón capturado y actualizaciones sin mezclar versiones. Regeneración opcional:
`.venv/bin/python scripts/curate_immersive_sky.py`, solo 12 PNG base; aborta si la
edición cambió. No descargar el cubo completo para una prueba de píxel.
Guardar resultados en `docs/evidence/immersive-20261115/` e informe en
`docs/VALIDACION_INMERSIVA_20261115.md`; la validación física VR/móvil se registra
por separado y nunca se infiere de estas pruebas.

Ampliación FPA (2026-11-15): `npm test` incluye decodificación Rust de los seis
previews contrastada con el parser JS y Asinh independiente. `test:browser`
incluye cámara, raíz/subruta, integridad/reintento, búsqueda controlada y
accesibilidad de `espectral.html`. La regeneración opcional de los previews usa
`.venv/bin/python scripts/curate_fpa.py`; conserva unos 387 MB de MEF originales
en `data/fpa-originals/`, fuera de Git/build. Registrar aparte el ensayo remoto
IRSA (puede fallar por timeout) y cualquier medida de fps con equipo/condiciones.
Evidencia: `docs/evidence/fpa-20261115/` y `docs/VALIDACION_FPA_20261115.md`.

- [Informe actual](../VALIDACION_IMPLEMENTACION_20261114.md) y recibos en
  docs/evidence/implementacion-20261114/ y carpetas por tarea.
- dist/skyo-build-report.json; contrato de reporte exportado; browser-final.json.
- docs/specs/002-comparador-local/validacion.md, MEMORY.md y MCP log(kind="pipeline").
- Históricos: docs/VALIDACION_MIGRACION_STACK.md y docs/VALIDACION_PREPARACION_SPEC.md.

No editar manualmente tasks.md, Estado.md ni Bitacora.md.

## Validación y criterio de éxito

Pruebas, build y verificadores deben pasar. Los resultados se limitan a los
casos y al entorno registrados. I/V requieren sus puertas G0–G6; G7 exige binario
real, equivalencia y carga en Worker. G8 y aceptación C requieren calibraciones,
PSF, geometría, referencias, inyecciones/controles y revisión independiente.
Ninguna compilación, demo, mapa WCS-WAVE o HEAD acredita una detección.

Sin baseline visual aprobado, las capturas documentan el estado actual.
Axe/teclado no son certificación WCAG; Chromium emulado no acredita Android.
La cuota OPFS ensayada con fallos inyectados no acredita evicción ni permanencia.
La publicación HTTPS y las cabeceras del hosting real requieren su propio ensayo.

## Condiciones de parada y reintento

Ante fallo, guardar error, corregir causa y repetir las comprobaciones afectadas.
Tras dos correcciones sin resolver el mismo hallazgo, registrar el bloqueo.
Curación usa reintentos y presupuesto acotados; un timeout no significa ausencia
de cobertura. Usar un paquete estático verificado cuando la fuente no responde,
registrando el uso de metadatos previos. No ocultar éxito parcial ni sobrescribir
un dataset previo. La falta de sesión MCP se registra sin inventar identidad.

La parada antes de T01 perteneció a la migración; el usuario luego autorizó
iniciarla y continuar las demás tareas. El claim central fue rechazado por
aprobación pendiente/invalidada, por lo que no se autoaprueba ni registra finish.

## Siguiente paso

Revisar la evidencia técnica local T01–T07 y las aprobaciones administrativas
pendientes. T08 solo tiene inspección de insumos: resolver asociación de versiones,
PSF integrada a píxel, incertidumbres, observador/épocas/catálogos, controles y
revisión independiente. Mantener el comparador exploratorio y scienceReady=false.
