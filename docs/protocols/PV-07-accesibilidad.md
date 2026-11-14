# PV-07 · Accesibilidad visual

**Alcance:** teclado, foco, semántica, contraste y movimiento reducido.

## Automático (lo que mide el runner)

| # | Comprobación | Criterio | Código |
| --- | --- | --- | --- |
| 1 | Sección activa | `aria-hidden="false"` y sin `inert` | `E_ARIA` |
| 2 | Secciones ocultas | `aria-hidden="true"` + `inert` | `E_ARIA` |
| 3 | Navegación | `aria-current="page"` en el enlace de la ruta | `E_CURRENT` |
| 4 | Salida por teclado | `Enter` funciona sin foco en controles | `E_KEYBOARD` |
| 5 | Foco visible | `outline` de 2 px y color de acento al enfocar `#nav a` | manual/JSON |
| 6 | Contraste | texto principal ≥ 4.5:1 sobre negro/panel | manual (muestreo) |
| 7 | Movimiento | `prefers-reduced-motion` sin animación perceptible | `E_KEYBOARD` |

## Revisión manual obligatoria (no automatizable aquí)

1. Recorrer con `Tab` las cuatro vistas: orden lógico y sin trampas de foco.
2. `#hb` (globo de H.E.R.A) es `role="dialog"` **sin `aria-live`**: verificar si el
   mensaje se anuncia; si no, registrar hallazgo (no arreglarlo a ciegas).
3. En `lab.html`, medir el alto de los `input`/`select`: hay objetivos de **13 px**
   (por debajo de 24 px de WCAG 2.2, 2.5.8). Anotar cuáles.
4. Zoom del navegador al 200 %: sin pérdida de controles ni texto cortado.
5. Contraste de textos secundarios (`.mut`, etiquetas) sobre paneles translúcidos:
   el fondo real cambia con el canvas; medir sobre el peor caso.

## Criterio de aceptación

1–5 y 7 en verde. 6 y los puntos manuales se documentan con el valor medido; un
hallazgo abierto no se convierte en aprobado por repetir la prueba.

## Evidencia

JSON (`focusStyle`, `aria`, objetivos pequeños) + nota manual fechada.
