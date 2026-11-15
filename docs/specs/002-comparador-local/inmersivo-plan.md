# Cielo inmersivo SPHEREx Implementation Plan

> **For agentic workers:** Ejecutar las tareas en esta sesión, con revisión final independiente; conservar el trabajo previo y sin commits automáticos sobre el índice compartido.

**Goal:** Explorar imágenes SPHEREx reales desde dentro de un cielo de 360°, con vuelo visual, zoom, análisis y WebXR, adaptado a PC y móvil.

**Architecture:** Three.js r128 proyecta teselas HiPS reales en una esfera de visualización; no son distancias físicas. Worker/Rust procesa un plano IMAGE del cubo por rangos y devuelve RGBA y píxeles; la geometría HPX y el flujo se contrastan con Astropy. Un mismo estado gobierna controles HTML y paneles dentro de XR. Las decisiones transmitidas por Agy reducen análisis a HUD esencial y enlaces al laboratorio; no se añade otro comparador ni proyección MEF.

**Tech Stack:** Vite/ES modules, Three.js r128 ya instalado, WebXR nativo, Rust/wasm-bindgen, HiPS/IRSA. Sin framework ni dependencia de producción nueva.

**Spec:** Enfoque aprobado por el usuario («inicia entonces, apruebo»); normas científicas de `../../SPEC_SKYO_2.1_AUDITADO.md`. Este documento registra decisiones locales, no una aprobación administrativa del registro central.

**Cierre técnico local:** pasos implementados y verificados; [informe y evidencia](../../VALIDACION_INMERSIVA_20261115.md). Las casillas describen software y pruebas ejecutadas, no aceptación científica ni validación de hardware físico.

## Global Constraints

- Actualización autorizada de detalle y fluidez: [optimización medida](../../OPTIMIZACION_INMERSIVA_20261115.md). Rust genera geometría y LOD adaptativo por región/píxeles físicos, sin truncar imágenes visibles. Cuatro descargas concurrentes, caché de vecinos y cinco planos procesados; conservar bytes y flujo es puerta de rendimiento.
- Conservar FITS originales, máscaras científicas y procedencia. Separar mosaico, observación y vuelo visual.
- No inventar profundidad, detección, calibración ni soporte VR físico. Detectar capacidades y permisos.
- Sin FITS al abrir Inicio. Carga de datos por región/canal y recursos GPU acotados; no descargar todo el archivo.
- Nuevas observaciones y versiones del mosaico se comprueban separadamente, sin sustituir la selección activa.
- Cielo de borde a borde en Explorar, con componentes flotantes; sin marco, encabezados duplicados ni capas invisibles que bloqueen la cámara. En móvil, navegación y selector espectral conservan áreas distintas.
- No alterar las pruebas científicas ni la ruta de comparación512px para ampliar la vista visual2048px.

## Review Focus

- Consulta al clic autorizada: ficha fija independiente de retícula con ICRS,
  flujo/píxel/λ/época/procedencia, copiar/guardar/FITS. Verificar snapshots y
  cancelación; integración global pendiente mientras se resuelve la fusión
  externa. Evidencia en `../../CONSULTA_CLIC_20261115.md`.
- Transición L2 autorizada: zoom <1° busca recortes IBE de 0.25° a resolución nativa, hasta seis candidatos del detector y un overlay activo; límites de bytes/tiempo y cancelación. IMAGE→RGBA en Rust; TAN/SIP y tabla WCS-WAVE verificadas con Astropy. Solo píxeles dentro del intervalo del canal, con fecha/λ/procedencia propias y flujo separado del cubo. Fundido al entrar/salir, sin texturas artificialmente mejoradas ni mezcla de épocas. Verificar carreras, máscara espectral, retorno al mosaico y errores antes del cierre.
- Costuras RA 0/360 y polos: rayos/UV/HEALPix contra fixture Astropy y ida/vuelta angular.
- Canal sin datos y fallo HTTP: no mostrar el canal anterior como si fuera el nuevo; mantener reintento visible.
- Resultado FITS/consulta tardíos: IDs y cancelación conservan selección y reporte vigentes.
- WebXR ausente/denegado/salida: controles normales siguen disponibles y se libera sesión/RAF/Worker.
- Marco WCS y pixel inválidos: no colocar observación en coordenadas supuestas ni inventar intensidad.

### Task 1: Cielo real y geometría

**Files:** crear `assets/js/immersive/{sky-math,hips}.js`, `scripts/immersive.test.mjs`, datos curados en `public/datasets/immersive-sky/` y curador; ampliar script npm test.

**Interfaces:** `skyDirection(ra,dec)`, `skyCoordinates(vector)`, `healpixFace(face,x,y)`, `healpixTile(order,pixel,u,v)`; `createSky(T,scene,{onStatus})` → `{setChannel,update,dispose}`.

- [x] Pruebas de cardinales/costura/polos y puntos HEALPix comparados con Astropy; canales102 y vacíos50/51.
- [x] Implementar esfera teselada con PNG reales, base curada y detalle progresivo cancelable, límite de caché y dos descargas concurrentes.
- [x] Verificar geometría, hashes/procedencia de originales de teselas y fallo/reintento sin mezclar canales.

### Task 2: Primera persona, WebXR y análisis

**Files:** crear `inmersivo.html`, `assets/js/immersive/{main,controls,xr,cube,cube-worker,irsa}.js` y CSS; ampliar `science-core/src/texture.rs`, `assets/js/science/{fits,wasm-bridge}.js`; conservar el Worker FPA.

**Interfaces:** Rust `float_plane_to_texture(...)` y `FitsTexture.pixels()`; puente `processFloatPlane(...)`, parser `readFitsHeader(buffer,offset)`, `cubePixel(ra,dec)`, `cubeHeader(buffer,pixel)`. Control de jugador y eventos de selección comparten acciones con rayos de mandos XR.

- [x] Prueba de cabecera WCS y píxeles reales que falla antes de ampliar el kernel; preservar equivalencia científica.
- [x] Mirar/volar/zoom con ratón/teclado/tacto; movimiento acotado dentro de esfera visual y retorno al origen.
- [x] Cabeza/mandos WebXR, entrada por gesto, paneles de acciones e información dentro de VR; fallback explícito sin dispositivo.
- [x] Seleccionar RA/Dec/λ, consultar observaciones/fechas, leer plano IMAGE HiPS por Range y píxel mediante HPX; export de selección/procedencia y vínculos FITS/laboratorio.
- [x] Comprobar publicaciones al abrir y periódicamente con visibilidad, cancelación, límite de resultados y estados; no recargar trabajo activo.

### Task 3: Integración y cierre

**Files:** `index.html`, `assets/js/{app,explorar}.js`, `vite.config.mjs`, tests navegador, verificadores/build/pipeline y memoria.

- [x] Integrar entrada inmersiva en Explorar; conservar plano focal auxiliar y laboratorio.
- [x] Probar raíz/subruta, navegación, cámara, selección, canales, errores, actualización y permisos XR simulados; no acreditar hardware con emulación.
- [x] `npm test`, Rust, build, validadores y pipeline de navegador; evidencia y revisión final independiente de cambios nuevos.
- [x] Actualizar MEMORY/log con resultados medidos, riesgos, pruebas físicas pendientes y siguiente paso.
