# Cómo incorporar el nuevo pipeline sin reconstruir SKYO

**Referencia vigente:** [SPEC principal](../SPEC_SKYO_2.1_AUDITADO.md), especialmente T01–T08. Esta guía conserva propuestas históricas de integración; en caso de diferencia prevalece el SPEC. La validación actual y sus límites están en [este informe](VALIDACION_PREPARACION_SPEC.md). WCS-WAVE es visual: ciencia requiere CWAVE/CBAND y ePSF por versión. Descartar respuestas antiguas en UI no protege el estado del Worker; T01 exige ambos controles y reporte vinculado al snapshot.

> Esta guía presupone el árbol descrito en `SPEC(1).md` (JS nativo, `index.html` y `assets/`). Es una **propuesta de integración**, ya que el código fuente original no fue adjuntado.

## A. No eliminar ni reescribir componentes actuales

Conservar la navegación hash (`#inicio`, `#explorar`, `#3d`), assets visuales, paleta actual, configuración 3D y personalidad de H.E.R.A 7. La nueva miniapp sirve como referencia de UX y como laboratorio de investigación, no como reemplazo de la landing original. Crear una rama separada antes de copiar archivos.

## B. Integrar un solo worker primero

1. Copiar `web/src/{fits,wcs,pipeline,render,wasm-bridge,opfs}.js` a `assets/js/science/` respetando rutas relativas.
2. Copiar `web/worker.js` a `assets/js/science/science.worker.js` y corregir imports relativos al nuevo lugar.
3. Desde `#explorar`, instanciar `new Worker(new URL('./science/science.worker.js', import.meta.url), {type:'module'})`.
4. Al elegir dos FITS, transferir `ArrayBuffer` al worker. El navegador mantiene la UI libre mientras corre el pipeline.
5. Escuchar `loaded`, `compared`, `rendered`, `error` y `kernel`, correlacionando respuestas por `jobId`; `compare` entrega RGBA y referencias `difference/snr` residentes en Worker; `render` requiere `target`. Descartar resultados obsoletos por `jobId`. Al cambiar de ruta, `worker.terminate()` si hay cálculo activo, liberar `ImageBitmap`/buffers y recrear el Worker al regresar; al ocultarse documento, detener reproducciones.

## C. Secciones visuales sugeridas

```text
#inicio
  Identidad SKYO + CTA a Explorar + H.E.R.A 7 introductorio
#explorar
  Bóveda celeste / retícula ICRS + panel de misiones + laboratorio FITS
#3d
  Sistema Solar y órbitas en 3D
#fases
  Visualizador temporal de fases y comparación espectral
```

## D. Adaptar `assets/js/data.js`

Los objetos simulados pueden mantenerse como demos **siempre marcados**. No mezclar la lista ilustrativa con observaciones de NASA o una base de detecciones. Crear `catalogRepository` para manifiestos curados con categorías y niveles de calidad, y mantener un `visualReference` para fondos y narración no científica.

## E. Sustituir endpoints del SPEC v1.0

- `/imagenes` → `CatalogRepository` (dataset indexado localmente).
- `/recorte` → `File`/`fetch` desde paquete estático y `decodeFits` local.
- `/cambios` → `worker.postMessage({event:'compare',jobId})`.
- `/objeto/{id}` → catálogo local con referencias JPL/Gaia, bajo demanda si servicio externo lo permite.
- `/hera` → `HeraLocal.respond(context)`, reglas locales con referencias.

No prometer que `fetch` NASA en navegador funciona sin validar CORS. El curador opcional genera datos estáticos y se ejecuta en una laptop, no permanentemente.

## F. Para migrar a Node/Vite/TypeScript sin romper nada

1. Agregar Node como *toolchain* (`package.json`, TypeScript, Vite), **no como servidor de producción**.
2. Habilitar `src/main.ts` como entrada, importar módulos JS actuales gradualmente, añadir JSDoc primero y TS después.
3. Reutilizar CSS tokens y fuentes; migrar a Web Components/Lit solo si hay complejidad repetitiva.
4. Dividir chunks dinámicos: `explore` carga Aladin, `solar3d` carga Three, `science.worker` carga WASM cuando se accede al laboratorio.
5. Publicar `dist/` estáticamente; revisar rutas con hash, `base`, asset paths, service worker y recuperación offline.

## G. Tests de integración prioritarios

- Fichas no muestran datos inventados como NASA.
- Selector de fecha realmente selecciona observaciones MJD diferentes.
- Comparación bloquea detectores incompatibles; misma D no basta para validar λ.
- WCS real contra Astropy con residuales en píxeles y arcsec.
- Máscaras FITS aplicadas sin borrar señales ni aplicar SOURCE indiscriminadamente.
- `FLAGS` comprimidas originales no se interpretan como banderas cero.
- Cambio de pestaña/visibilidad detiene animaciones y cancelaciones del worker.
- Mobile 360/390px: evitar overflow, botones accesibles, no bajar FPS al cargar FITS.
- Datos OPFS se recuperan sin red y pueden borrarse voluntariamente.
- Captura 3D e H.E.R.A 7 no consumen CPU mientras la sección está oculta.

## H. Investigación todavía pendiente

1. Probar una muestra IRSA DR1 y una QR3 en un equipo conectado.
2. Verificar la política CORS de los endpoints TAP/SIA/IBE concretos, no extrapolar desde la web principal.
3. Compilar `wasm/src/lib.rs` con `wasm-pack`, comparar outputs JS vs Rust y medir memoria en Android.
4. Probar `fitsio-pure` o `fitsy` con los HDUs `FLAGS`, `EPSF`, `WCS-WAVE`; comprobar tile compression y lectura espectral específica, no suponer soporte genérico.
5. Validar Aladin Lite v3 en la versión/librearía concreta que usará el proyecto y revisar LGPL notices.
6. Diseñar y probar el pipeline de extracción de fuentes con ePSF y fotometría antes de afirmar candidatos reales.

## I. Cambios auditados 2.1 (obligatorios al integrar)

- El esquema de eventos está en `web/src/contracts.d.ts`. **No** mezclarlo con métodos RPC hipotéticos del viejo SPEC.
- Ante carga de un archivo más nuevo, usar un `jobId` nuevo. No dibujar `loaded/compared` anteriores; `terminate()` cancela realmente el trabajo síncrono si se abandona el laboratorio.
- Mantener el `File` para guardar en OPFS. Los `ArrayBuffer` transferidos a Worker se quedan detached en main thread.
- Los buffers científicos `difference` y `snr` viven en Worker. Usar evento `render` con `target` explícito; RGBA es solo display, no dato exportable científicamente.
- `BZERO` en `FLAGS` requiere `Uint32Array`; el campo `SOURCE` sirve para excluir estrellas del **ajuste de fondo**, no para borrar objetos de la observación.
- En la comparación, cuando existen mapas ZODI, restarlos de ambos fotogramas **solo en copias temporales** y ajustar un plano residual. La incertidumbre zodiacal, PSF y calibración faltantes impiden afirmar un hallazgo.
- Vite exige mantener recursos estáticos sin transformación bajo `web/public` y ejecutar `npm run web:build`; la publicación estática usa `dist`, no el código fuente `web`.
- Rust se compila en `web/public/wasm/pkg/`; mientras no esté compilado, el usuario ve explícitamente el fallback JavaScript.
- Antes de distribuir a terceros, probar Firefox/Chrome/Safari Android/iOS, HTTPS, OPFS y el subdirectorio de hosting. No usar HTTP LAN como prueba de integridad `crypto.subtle`.
