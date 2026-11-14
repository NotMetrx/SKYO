# PV-08 · Rendimiento Ponytail

**Alcance:** consumo en reposo, pausa en segundo plano y coste de las transiciones
(no se promete FPS alto en hardware concreto).

## Comprobaciones automáticas

| # | Comprobación | Criterio | Código |
| --- | --- | --- | --- |
| 1 | Reduced motion en reposo | 0 callbacks de `requestAnimationFrame` por segundo en todas las vistas | manual/JSON |
| 2 | Transición reducida | `transition-duration <= 0.01s` en `.sec.on` | JSON |
| 3 | DPR del canvas | `min(devicePixelRatio, 2)`; sin canvas gigantes | JSON |
| 4 | Errores | 0 `pageerror` / `console.error` | `E_CONSOLE` |

## Cómo medir sin polling

El runner instrumenta `requestAnimationFrame` **una sola vez** con `addInitScript`
y cuenta llamadas por intervalo; no crea bucles de sondeo ni `setInterval` en el
producto. Para la pausa real:

1. Abrir la app, cambiar a otra pestaña 30 s y volver.
2. Confirmar que la animación no «salta» (Page Visibility detuvo el reloj).
3. En `#3d`, pulsar ⏸ y comprobar que la escena queda quieta.

## Criterios de aceptación

- Con `prefers-reduced-motion: reduce`, **0 rAF/s** en las cuatro vistas.
- Sin errores de consola en ninguna ruta (incluido `lab.html`).
- El canvas no supera DPR 2 y no hay bucles que despierten la CPU sin interacción
  (la animación continua legítima de la bóveda no cuenta como polling).
- Cualquier bucle nuevo debe justificar por qué no es reactivo.

## Evidencia

JSON (`results[].reducedMotionCheck`) + nota de la prueba de pestaña en segundo
plano. No se acepta «va fluido» como evidencia.
