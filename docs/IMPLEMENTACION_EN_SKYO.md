# Cómo incorporar el nuevo pipeline sin reconstruir SKYO

> Esta guía presupone el árbol descrito en `SPEC(1).md` (JS nativo, `index.html` y `assets/`). Es una **propuesta de integración**, ya que el código fuente original no fue adjuntado.

## A. No eliminar ni reescribir componentes actuales

Conservar la navegación hash (`#inicio`, `#explorar`, `#3d`), assets visuales, paleta actual, configuración 3D y personalidad de H.E.R.A 7. La nueva miniapp sirve como referencia de UX y como laboratorio de investigación, no como reemplazo de la landing original. Crear una rama separada antes de copiar archivos.

## B. Integrar un solo worker primero

1. Copiar `web/src/{fits,wcs,pipeline,render,wasm-bridge,opfs}.js` a `assets/js/science/` respetando rutas relativas.
2. Copiar `web/worker.js` a `assets/js/science/science.worker.js` y corregir imports relativos al nuevo lugar.
3. Desde `#explorar`, instanciar `new Worker(new URL('./science/science.worker.js', import.meta.url), {type:'module'})`.
4. Al elegir dos FITS, transferir `ArrayBuffer` al worker. El navegador mantiene la UI libre mientras corre el pipeline.
5. Escuchar `loaded`, `compared`, `error` y `kernel`; actualizar el componente de comparación. Al cambiar de ruta, liberar `ImageBitmap`/buffers o suspender; al ocultarse documento, detener reproducciones.

## C. Secciones visuales sugeridas

```text
#inicio
  Identidad SKYO + CTA a Explorar + H.E.R.A 7 introductorio
#explorar
  [Vista del cielo] [Laboratorio] [Colección de objetos]
    Vista del cielo: Aladin Lite + HiPS por banda
    Laboratorio: dos FITS + espectro/fecha + blink + diferencia
    Colección: fichas Gaia/JPL/WISE procedentes de datasets
#3d
  Simulación 3D existente; NASA/JPL solo si hay efemérides verificadas
```

## D. Adaptar `assets/js/data.js`

Los objetos simulados pueden mantenerse como demos **siempre marcados**. No mezclar la lista ilustrativa con observaciones de NASA o una base de detecciones. Crear `catalogRepository` para manifiestos curados con categorías y niveles de calidad, y mantener un `visualReference` para fondos y narración no científica.

## E. Sustituir endpoints del SPEC v1.0

- `/imagenes` → `CatalogRepository` (dataset indexado localmente).
- `/recorte` → `File`/`fetch` desde paquete estático y `decodeFits` local.
- `/cambios` → `worker.postMessage({event:'compare'})`.
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
