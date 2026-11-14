# PV-04 · `#fases` (hoja de ruta)

**Alcance:** carrusel de fases (`#phase-rail`), panel de fase (`#phase-panel`),
conmutador Hoja de ruta / Pipeline y pie de acciones.

## Comprobaciones automáticas

| # | Comprobación | Criterio | Código |
| --- | --- | --- | --- |
| 1 | Sección activa | `.sec.on` es `#fases` | `E_SECTION` |
| 2 | Carrusel | `#phase-rail` con `overflow-x: auto` y 7 pestañas alcanzables por scroll | `E_CLIP` (excluido si hay scroll) |
| 3 | Panel | `#phase-panel` con scroll vertical propio en móvil; acciones finales alcanzables | `E_CLIP` |
| 4 | Semántica | pestañas con `role="tab"`, `aria-selected` y `tabindex` roving | manual/JSON |
| 5 | Contenido | 7 fases renderizadas y panel con `h3` + etapas | manual |
| 6 | Acciones | «Ir a Inicio» y «Consultar a H.E.R.A 7» responden | manual |

## Secuencia manual sugerida

1. Recorrer las 7 fases con ratón y con teclado (flechas si están implementadas);
   anotar si las flechas **no** funcionan (hueco conocido a verificar).
2. En 320×568, desplazar el panel hasta el pie y pulsar ambas acciones.
3. Cambiar a «Pipeline de cambios» y volver: el panel no debe quedar vacío.

## Criterio de aceptación

1–3 en verde; 4–6 con resultado explícito. Un carrusel que exige scroll es válido;
un carrusel **sin pista visual** de que se puede desplazar se anota como hallazgo UX.

## Evidencia

`routes.fases` del JSON + nota de la prueba de teclado del carrusel.
