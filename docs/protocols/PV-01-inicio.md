# PV-01 · `#inicio` minimalista

**Alcance:** wordmark SKYO, cosmos y Heras7 3D automáticos, salida con `Enter`/`Espacio`.

Decisión vigente (2026-11-16, usuario): conservar el modelo 3D en la portada.
La entrada carga Three.js y `assets/models/kryo9.glb` sin interacción.
La prueba `tests/browser/integration.spec.mjs` comprueba en raíz y `/skyo/`
que Three.js se cargue automáticamente y que se pueda salir y regresar por teclado.
La presencia y animación del modelo requieren además la comprobación WebGL de la tabla;
una ejecución headless con fallback 2D no valida el renderizado del modelo.
Con movimiento reducido se conserva el modelo sin exigir la animación de hover;
si WebGL falla, la alternativa 2D permite seguir navegando.

## Precondiciones

`npm start` sirviendo en `:8000`; ruta inicial `#inicio`.

## Comprobaciones automáticas

| # | Comprobación | Criterio | Código |
| --- | --- | --- | --- |
| 1 | Sección activa | `.sec.on` es `#inicio` | `E_SECTION` |
| 2 | Minimalismo | 0 controles interactivos dentro de `#inicio` | `E_MINIMAL` |
| 3 | Barra superior | `.top` con `visibility: hidden` o `opacity: 0` e `inert` | `E_TOP` |
| 4 | H.E.R.A 7 | `#hera` con `display: none` e `inert` | `E_HERA` |
| 5 | Navegación | `#nav` con exactamente 3 enlaces y `inert` en esta vista | `E_NAV` |
| 6 | Wordmark | `.eclipse-wordmark` cabe en el ancho (`rect.width <= innerWidth`) | manual/JSON |
| 7 | WebGL | canvas con contexto `webgl2`/`webgl` | `E_WEBGL` |
| 8 | Salida | `Enter` → `#explorar`; `body.warp-zoom` se limpia en < 1 s | `E_KEYBOARD`, `E_WARP` |

## Comprobaciones que requieren ojo humano

- El eclipse/wordmark no se recorta ni parpadea al cargar (`body.anim-ready`).
- El parallax solo responde al puntero; en reposo no hay movimiento.
- El salto a `#explorar` se siente como un solo gesto (sin doble transición).

## Criterio de aceptación

Todo lo automático en verde; 7 y 8 verificados en al menos 1440×900 y 390×844.
El wordmark a 320 px de ancho debe seguir completo (ver PV-06).

## Evidencia

`docs/evidence/auditoria-visual-<fecha>.json` → `routes.inicio` de cada recorrido.
