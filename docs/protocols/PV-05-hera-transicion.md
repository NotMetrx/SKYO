# PV-05 · H.E.R.A 7 y transición warp

**Alcance:** avatar 3D (`#ha`), globo (`#hb`), reglas de visibilidad por ruta y la
transición `#inicio → #explorar`.

## Comprobaciones automáticas

| # | Comprobación | Criterio | Código |
| --- | --- | --- | --- |
| 1 | Visibilidad | `#hera` oculta en `#inicio`, visible en el resto | `E_HERA` |
| 2 | Aislamiento | `inert` y `aria-hidden` coherentes en `#hera` y `.top` | `E_ARIA` |
| 3 | Globo | clic en `#ha` abre `#hb.show` con texto no vacío | `E_HERA_BUBBLE` |
| 4 | Móvil | en `<= 780 px` el globo no se abre solo al cambiar de ruta | manual/JSON |
| 5 | Warp | `Enter` desde `#inicio` lleva a `#explorar` y limpia `.warp-zoom` | `E_KEYBOARD`, `E_WARP` |
| 6 | Reduced motion | con `reduce`, salto directo y transición ≤ 0.01 ms | `E_KEYBOARD` |

## Comprobaciones manuales

- El avatar rota con el puntero y ríe al clic; sin puntero no hay bucle.
- El globo no tapa el avatar ni se sale de pantalla a 320 px.
- El warp se percibe como un solo movimiento (wordmark + cámara) sin destello.
- El globo debe anunciarse a lectores de pantalla: hoy `#hb` es `role="dialog"`
  **sin `aria-live`**; se considera hallazgo abierto hasta decidir el arreglo.

## Criterio de aceptación

1–6 en verde. La ausencia de `aria-live` no bloquea la vista, pero queda registrada
en PV-07 y en la evidencia con fecha.

## Evidencia

`hera`, `keyboard` y `results[].reducedMotionCheck` del informe JSON.
