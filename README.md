# SKYO 2.1 — Revisión auditada del laboratorio local-first

Revisión actual: [auditoría del SPEC y acceso NASA/IRSA](docs/AUDITORIA_SPEC_2026-11-13.md).
Incluye enlaces comprobados, una prueba parcial con un recorte DR1 real y
hallazgos pendientes; el laboratorio conserva su estado exploratorio.

Formatos de mente_general: [protocolo](AGENTS.md),
[constitución](docs/constitution.md), [memoria](MEMORY.md),
[spec de incorporación](specs/001-inicial/spec.md),
[plan](specs/001-inicial/plan.md), [tareas](specs/001-inicial/tareas-plan.md),
[validación](specs/001-inicial/validacion.md) y
[pipeline](pipelines/validacion-local.md).
Proyecto central: `skyo`, spec operativa `002-comparador-local`. La bóveda contiene referencia al SPEC principal y copias del plan/tareas/validación; la fuente normativa está en este repositorio. `001-inicial` conserva el historial de incorporación administrativa.

**Estado actual:** SPEC principal preparado para iniciar implementación, con 20 RF y tareas registradas. El prototipo pasa 12 pruebas sintéticas, build Vite y prueba Rust nativa/compilación wasm32 bruta. El flujo básico Chromium, offline estático y OPFS tienen evidencia parcial; hay defectos abiertos y no hay validación de detección, WASM integrado ni Android físico. Ver [validación actual](docs/VALIDACION_PREPARACION_SPEC.md) y [plan](specs/002-comparador-local/plan.md).

> Este paquete es el **laboratorio científico auxiliar**, no el frontend original de SKYO. La especificación v1 se revisó, pero el `index.html` y `assets/` reales de SKYO no se adjuntaron. No reemplaces tu aplicación principal con este prototipo.

## 1. Ejecutar sin instalar paquetes (útil para inspección y tests)

Requiere Node.js 20+.

```bash
cd SKYO_2_1
npm test
npm run dev:standalone
```

Abre `http://127.0.0.1:4173`, pulsa **Cargar simulación** y compara. El servidor de desarrollo sencillo no es una configuración de producción: sirve directamente los módulos JS y `web/public/`. Los archivos `epoca_A.fits` y `epoca_B.fits` son **completamente sintéticos**.

## 2. Desarrollo con Vite y publicación estática (previsto)

Con internet disponible:

```bash
npm install
npm run dev
npm run web:build
npm run preview
```

La configuración está en `vite.config.mjs`: `root: web`, `publicDir: public`, `base: ./`, salida `dist/`. `web/public/` contiene manifiesto, Service Worker, icono y FITS de ejemplo. El script `tools/postbuild.mjs` registra los nombres reales de los assets compilados en el precache y genera `dist/skyo-build-report.json`.

**Verificación actual:** Vite 7.3.8 compiló correctamente. Se probaron Worker, demo y offline en un servidor estático local, en raíz y subdirectorio. Con `Vary: Origin` el offline falló; accesibilidad y otros defectos siguen abiertos. Esto no sustituye pruebas HTTPS del alojamiento final ni Android. La instalación no generó lockfile: fijar versiones antes de anunciar reproducibilidad.

## 3. Compilar Rust/WebAssembly (opcional, mejora de rendimiento a medir)

```bash
rustup target add wasm32-unknown-unknown
cargo install wasm-pack
npm run wasm:build
npm run web:build
```

`wasm-pack` escribe en `web/public/wasm/pkg/` y Vite copia ese directorio a `dist/`. El worker importa dinámicamente el módulo por URL; si no existe, usa el kernel JS. Rust pasó su prueba nativa y compiló un módulo wasm32 en una copia temporal. Falta wasm-pack y su glue JS: no se probó el módulo integrado ni su equivalencia/rendimiento frente a JS o Android.

## 4. Curar imágenes reales SPHEREx

Ejecutar voluntariamente desde una computadora con Internet (no es un VPS):

```bash
python -m pip install astroquery astropy numpy requests
python tools/curate_irsa.py \
  --ra 210.80227 --dec 54.34895 \
  --detector 2 --size-deg 0.10 --limit 40 --max-files 4 \
  --output web/public/datasets/m101
```

La consulta TAP y un recorte DR1 se probaron contra IRSA; `save_cutout` se ensayó sobre los bytes reales descargados, sin ejecutar main() completo con Astroquery. Se encontraron pérdidas de VERSION/EPSF y errores transitorios pendientes de resolver. Necesita verificar recortes, fechas y cubiertas espectrales en tu equipo. Puede descomprimir `FLAGS`, conservar `WCS-WAVE`, escribir hashes y manifiesto de procedencia. Sin el curador, el navegador puede abrir FITS manuales si no están comprimidos y dejar claro cuando falta la máscara.

El FITS original no se sobrescribe; sus derivados conservan el hash original y su URL. Los datos SPHEREx reales **no vienen dentro de este ZIP**. La comparación seguirá siendo exploratoria hasta validar calibraciones científicas CWAVE/CBAND por píxel (WCS-WAVE es visual), ePSF, fondo, pareja real y referencias JPL/Gaia.

## 5. Qué se corrigió históricamente a partir de Argon

- DTO en `web/src/contracts.d.ts`: uniones por tipo de procedencia; sintéticos y cargas manuales llevan `dataRelease: null`, nunca un release NASA inventado.
- `web/src/fits.js`: máscaras `FLAGS` de 32 bits como `Uint32Array`, validación de `BZERO`, `BSCALE` y nombres de flags instrumentales.
- `web/src/wcs.js`: inversión TAN-SIP con solver Newton-Raphson y detección de no convergencia; conserva propagación de varianza con pesos **al cuadrado**.
- `web/src/pipeline.js`: resta automática, si ambos mapas están presentes, del modelo zodiacal en ambas épocas y ajuste de plano residual 2D, sin alterar FITS originales ni presentar el resultado como hallazgo.
- `web/worker.js` y `web/main.js`: mensajes con `jobId`, respuestas correlacionadas y selección explícita de `A`, `B`, `difference` y `snr`.
- `web/public/`, `vite.config.mjs` y `tools/postbuild.mjs`: estructura de assets estáticos acorde a Vite y precache de rutas compiladas. Se requieren pruebas reales de producción.
- Previsualizaciones `.ppm` relegadas a `tests/fixtures`, excluidas de assets públicos.
- OPFS asíncrono permanece en main thread y vuelve a leer el `File`; la transferencia del `ArrayBuffer` al Worker no afecta al `File` original. El handle OPFS síncrono **sí** necesitaría un Dedicated Worker.
- SHA-256 requiere HTTPS o localhost. En HTTP de red LAN, el error se comunica, sin omitir silenciosamente la validación del hash.

El detalle histórico de Argon está en [SPEC anterior archivado](docs/archive/SPEC_SKYO_2.1_ANTES_PREPARACION_2026-11-13.md). El SPEC principal actual contiene el contrato normativo y los fallos pendientes; los tipos .d.ts actuales no son validación de runtime.

## 6. Archivos importantes

```text
SKYO_2_1/
  SPEC_SKYO_2.1_AUDITADO.md      especificación principal; reemplaza v2.0
  docs/archive/...               SPEC 2.0 histórico
  docs/IMPLEMENTACION_EN_SKYO.md guía de integración a SKYO original
  web/
    index.html, styles.css, main.js, worker.js
    src/{fits,wcs,pipeline,render,wasm-bridge,opfs}.js
    src/contracts.d.ts           protocolo de mensajes y tipos de datos
    public/{sw.js,manifest.webmanifest,icon.svg}
    public/demo/{epoca_A,epoca_B}.fits  sintéticos, NO NASA
  wasm/src/lib.rs                kernel Rust; integración WASM aún pendiente
  tools/curate_irsa.py           curador parcial, con correcciones T02 pendientes
  tools/postbuild.mjs            prueba/copia de assets Vite
  tests/pipeline.test.mjs        12 tests sintéticos
  tests/fixtures/*.ppm          solo QA, nunca publicación
  package.json, vite.config.mjs
```

## 7. Seguridad y límites honestos

- Las observaciones y su procesamiento se quedan en el dispositivo salvo que el usuario importe datos desde una URL pública. No hay endpoints privados ni servidor de aplicación.
- PWA/OPFS/`crypto.subtle` necesitan un contexto seguro. La compatibilidad de Safari iOS debe probarse explícitamente.
- El parser **no** descomprime tile compression; algunos recortes IBE ya traen FLAGS sin comprimir. Inspeccionar el producto real; usar el curador para normalizar/proveer trazabilidad, sin asumir que todos los recortes requieren descompresión.
- WCS-WAVE sirve para λ visual aproximada; ciencia requiere CWAVE/CBAND y ePSF/versiones/coordenadas verificadas, aún pendientes en el navegador.
- Una diferencia visual o SNR exploratorio no equivale a detección de un objeto móvil ni del Planeta X.
- El ZIP debe publicarse solamente después de compilar, probar el Service Worker y validar pruebas de Android/escritorio.

Fuentes: [IRSA SPHEREx](https://irsa.ipac.caltech.edu/Missions/spherex.html), [Tutorial FITS SPHEREx](https://caltech-ipac.github.io/irsa-tutorials/spherex-intro/), [SPHEREx releases](https://caltech-ipac.github.io/spherex-archive-documentation/spherex-data-releases/), [Vite publicDir](https://vite.dev/guide/assets), [MDN OPFS](https://developer.mozilla.org/en-US/docs/Web/API/File_System_API/Origin_private_file_system).
