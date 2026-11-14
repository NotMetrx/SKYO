# Validación del prototipo para preparar el SPEC

Fecha: 2026-11-13, America/Lima; ejecución y recibos del 2026-11-14 UTC.
Actor: `codex`. Proyecto: `skyo`. Alcance: comprobar el código existente y
documentar evidencia; no corregir la aplicación ni aprobar el SPEC.

**Veredicto: se puede comenzar la corrección y evolución del laboratorio sobre
una base que compila. No publicar el comparador como herramienta científica
validada.** Las pruebas sintéticas y el flujo básico funcionan; siguen abiertos
los hallazgos de la [auditoría anterior](AUDITORIA_SPEC_2026-11-13.md), más los
hallazgos reproducidos aquí. Esta revisión no prueba detección astronómica.

## Entorno y conservación

Linux x64, Node `24.21.0`, npm `11.19.0`, Vite `7.3.8`, Rust/Cargo `1.99.1`,
Playwright `1.62.1`, Chromium headless `156.0.8078.4` y axe-core `4.14.0`.
Las versiones y las huellas antes/después de diez archivos de aplicación y
configuración constan en [environment.json](evidence/preparacion-spec-20261113/validacion-app-environment.json).
Esas huellas coinciden; `package.json` permanece igual y no se creó un
`package-lock.json` en la raíz. Se generaron `node_modules/` y `dist/`.

`npm install --package-lock=false` descargó 13 paquetes y notificó cero
vulnerabilidades en su auditoría. El rango existente `vite: ^7.0.0` resolvió
`7.3.8`; sin lockfile, una instalación futura puede resolver otras versiones.
No se aprobó ni ejecutó manualmente el script de instalación de esbuild que npm
marcó como pendiente: el build funcionó con el binario disponible en el paquete.
axe-core se instaló solamente en `/tmp`, sin añadir dependencias al proyecto.

Los FITS utilizados fueron exclusivamente `web/public/demo/epoca_A.fits` y
`epoca_B.fits`, **sintéticos**. No se modificaron originales ni se usaron estos
resultados para atribuir procedencia NASA.

## Resultados ejecutados

| Comprobación | Resultado | Evidencia |
| --- | --- | --- |
| `npm test` | 12 aprobadas, 0 fallos | [Salida completa](evidence/preparacion-spec-20261113/validacion-app-npm-test.txt) |
| `npm install --package-lock=false` | Correcto; dependencias disponibles | [Salida](evidence/preparacion-spec-20261113/validacion-app-npm-install.txt) |
| `npm run web:build` | Correcto; 3 assets, 9 recursos precache, fallback JS | [Build real Vite](evidence/preparacion-spec-20261113/validacion-app-web-build.txt) |
| `cargo test` en copia temporal de `wasm/` | 1 prueba aprobada y 0 fallos | [Salida](evidence/preparacion-spec-20261113/validacion-app-cargo-test.txt) |
| `cargo build --target wasm32-unknown-unknown --release` en esa copia | Compila módulo de 44.098 bytes; `WebAssembly.validate` devuelve `true` | [Build](evidence/preparacion-spec-20261113/validacion-app-cargo-wasm-build.txt), [huella y estructura](evidence/preparacion-spec-20261113/validacion-app-wasm-artifact.json) |
| `npm run wasm:build` | No ejecutable: `wasm-pack: not found`, salida 127 | [Salida](evidence/preparacion-spec-20261113/validacion-app-npm-wasm-build.txt) |
| Navegador: carga demo, A/B, diferencia y exportación | Correcto en seis recorridos; 15.718 píxeles válidos; informe `exploratory_not_validated` | [Resultados JSON](evidence/preparacion-spec-20261113/validacion-app-browser.json) |
| PWA sobre servidor estático estricto | Shell y demo funcionan offline en `/` y `/skyo/` | Mismo JSON, recorridos `desktop` y `subdirectory` |
| OPFS con archivos seleccionados | Guarda ambos, recarga página y recupera los nombres originales | Mismo JSON, `desktop.opfs` |
| Entradas inválidas | JSON inválido y FITS ilegible producen aviso; sin excepción no controlada | Mismo JSON, `desktop` |

La copia Rust se ubicó en `/tmp/skyo-rust-validation-ZM2DSQ`; su lockfile se
conserva como [evidencia](evidence/preparacion-spec-20261113/validacion-app-cargo-lock.txt).
No se generó glue JS con wasm-bindgen/wasm-pack, no se publicó un WASM en
`web/public/` y el bundle probado declara `wasmPresent: false`. **Compilar el
módulo bruto no demuestra integración WASM ni equivalencia numérica JS/WASM.**

## Navegador, rutas y apariencia

Se probó `dist/` con `npm run preview` en el puerto 4173 y con un servidor
estático estricto del arnés en el puerto 4174. Este último sirve los mismos
archivos en `/` y `/skyo/`, devuelve 404 ante archivos inexistentes y no aplica
fallback de SPA. El [arnés](evidence/preparacion-spec-20261113/validacion-app-browser.mjs)
no modifica la aplicación.

Los viewports fueron 1440, 768, 390 y 360 px. En los seis recorridos no hubo
`pageerror`, desbordamiento horizontal ni elementos principales fuera del
viewport. Se inspeccionaron visualmente las capturas de
[escritorio](evidence/preparacion-spec-20261113/validacion-app-desktop.png) y
[360 px](evidence/preparacion-spec-20261113/validacion-app-mobile360.png): las
vistas A/B, la diferencia y los controles permanecen visibles y legibles.
También se guardaron capturas de 390 px, tablet y subdirectorio. No existe
baseline visual aprobado: la regresión visual queda **inconclusa**, aunque el
smoke test responsive funciona.

El Worker compilado se carga desde `assets/worker-B2bSXbsx.js`. La importación
opcional solicita `/wasm/pkg/skyo_wasm.js`, o `/skyo/wasm/pkg/skyo_wasm.js` al
publicar bajo prefijo. Las rutas observadas son correctas para este layout.
El módulo no existe: hay 404 o petición fallida esperable y el motor cambia a
`JavaScript (fallback verificable)`. No se observó un fallo de ruta del Worker
en producción; no se probó la importación de un paquete WASM real.

El Service Worker se activa, toma control y almacena nueve recursos: shell,
manifiesto, icono, tres assets compilados y dos FITS de demo. La recarga offline
permite cargar y comparar la demo en ambas rutas del servidor estático.
Esto prueba PWA local en Chromium, no instalación o funcionamiento en Android.

## Hallazgos pendientes

1. **Informe obsoleto después de recargar la demo — alto para trazabilidad.**
   Se cargó A en ambas entradas, se comparó A/A y se descargó el informe.
   Luego se pulsó «Cargar simulación», que muestra la pareja A/B, y se descargó
   sin comparar de nuevo. El botón permaneció habilitado y el JSON fue idéntico
   al de A/A, con el mismo `created_utc` y offset cero. La carga de demo no
   invalida `lastReport` ni el estado de exportación. Reproducción y resultados:
   [regresiones.mjs](evidence/preparacion-spec-20261113/validacion-app-regresiones.mjs),
   [regresiones.json](evidence/preparacion-spec-20261113/validacion-app-regresiones.json),
   [antes A/A](evidence/preparacion-spec-20261113/validacion-app-stale-before-AA.json),
   [después de cargar A/B](evidence/preparacion-spec-20261113/validacion-app-stale-after-AB-no-compare.json).

2. **`SATELLITE_HALO` no se enmascara — alto para análisis real.**
   `buildQualityMask` reconoce `HALO` y `SAT_HALO`, pero no `SATELLITE_HALO`.
   Un píxel finito con el bit 29 y ese nombre devuelve `mask: [1]`,
   `unsafeBits: 0` y `maskedCount: 0`. La
   [documentación oficial IRSA](https://irsa.ipac.caltech.edu/onlinehelp/spherex/spherex/sp.html)
   identifica `SATELLITE_HALO` como bit 29 de imágenes y lo incluye entre los
   flags excluidos por Tractor. Evidencia:
   [caso mínimo](evidence/preparacion-spec-20261113/validacion-app-mask-satellite-halo.json).
   La política de máscara debe definirse por nombres y versión de producto,
   sin presentar esta prueba mínima como calibración científica completa.

3. **Offline falla bajo `vite preview` — medio, dependiente de cabeceras.**
   Vite entrega JS/CSS con `Vary: Origin`; las peticiones precacheadas no tienen
   `Origin`, mientras que las peticiones de módulos del documento sí lo tienen.
   El Service Worker usa `caches.match(event.request)` y no encuentra esa
   variante; al cortar red, los módulos no cargan. Un servidor de diagnóstico
   sirve exactamente el mismo paquete y cambia únicamente esa cabecera entre
   dos contextos limpios: sin `Vary` funciona offline; con `Vary: Origin` falla.
   La evidencia está en `varyOrigin` del
   [reproductor](evidence/preparacion-spec-20261113/validacion-app-regresiones.json).
   El mismo paquete sí funciona offline en el servidor estático sin esa cabecera.
   Deben probarse las cabeceras del alojamiento final; no declarar que PWA
   funciona indistintamente en cualquier host. No se cambió la estrategia de caché.

4. **Nombre accesible del logo — medio.**
   axe-core detecta `label-content-name-mismatch` de impacto `serious` en los
   seis recorridos: el texto visible `SKYO LAB` no está incluido por completo
   en `aria-label="SKYO inicio"`. El recorrido inicial con Tab alcanza logo,
   demo, archivos A/B, OPFS, manifiesto y documentación con outline activo.
   El análisis automático dejó contraste y un enlace en estado `incomplete`;
   no certifica WCAG ni sustituye revisión con lector de pantalla.

5. **Exportación sin procedencia por observación — alto para reproducibilidad.**
   El JSON conserva estado exploratorio, cifras del análisis y advertencia,
   pero carece de identificadores, hashes, URLs, WCS y fechas de cada entrada.
   Se confirma el hallazgo de la auditoría anterior; el informe no permite
   reproducir por sí solo una comparación real. Ejemplo:
   [informe exportado](evidence/preparacion-spec-20261113/validacion-app-report-desktop.json).

## Criterios que siguen abiertos

La compilación Vite, el flujo básico del Worker y una PWA estática local tienen
ahora evidencia ejecutada. La compilación Rust nativa y del módulo WASM bruto
también dejan de ser pendientes de entorno; la integración `wasm-pack`,
equivalencia JS/WASM y medición de rendimiento siguen pendientes.

No se probaron Android físico, Firefox, Safari/iOS, instalación PWA, cuotas o
evicción OPFS, actualizaciones entre versiones del Service Worker, lector de
pantalla, Core Web Vitals ni rendimiento científico. Los viewports pequeños
son Chromium de escritorio y no equivalen a validar Android.

No se probaron aquí observaciones reales, CORS NASA desde navegador, WCS-WAVE
por píxel, ePSF, catálogos, movimientos ni detección. Los seis hallazgos de la
auditoría anterior permanecen pendientes de corrección y regresión. Este reporte
no aprueba requisitos, planes ni memoria de la mente general.
