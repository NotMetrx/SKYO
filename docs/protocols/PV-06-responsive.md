# PV-06 · Responsive (320 → 1440)

**Alcance:** encaje de las cuatro vistas y `lab.html` en la matriz de anchos.

## Matriz obligatoria

| Nombre | Tamaño | DPR | Qué cubre |
| --- | --- | --- | --- |
| desktop | 1440×900 | 1 | escritorio amplio |
| laptop | 1280×720 | 1 | portátil común |
| tablet | 820×1180 | 1 | tableta vertical |
| mobile | 390×844 | 2 | iPhone 12–15 |
| mobile-s | 360×740 | 2 | Android común |
| mobile-xs | 320×568 | 2 | mínimo soportado |

Puntos de corte del CSS: `780 px` (único) y `prefers-reduced-motion`.
Ejecutar también una pasada a 1440×900 con `reducedMotion: reduce`.

## Comprobaciones automáticas

| # | Comprobación | Criterio | Código |
| --- | --- | --- | --- |
| 1 | Desbordamiento de documento | `scrollWidth <= innerWidth + 1` | `E_OVERFLOW`, `E_LAB_OVERFLOW` |
| 2 | Controles fuera de vista | 0 fuera, salvo dentro de contenedores con scroll en ese eje | `E_CLIP` |
| 3 | Objetivos táctiles | botones y pestañas ≥ 24×24 px | `E_TARGET` |
| 4 | Sección correcta | `.sec.on` coincide con la ruta | `E_SECTION` |
| 5 | Canvas | pintado y con WebGL en cada tamaño | `E_WEBGL` |
| 6 | Lab | `lab.html` sin desbordamiento y con `h1` | `E_LAB*` |

## Reglas de interpretación

- Un elemento fuera del viewport **dentro de un scroller** (`.phase-rail`,
  `.phase-panel`) es correcto: se alcanza desplazando.
- Un elemento recortado por `main { overflow: hidden }` **no** es alcanzable:
  cuenta como fallo (`E_CLIP`).
- El ancho mínimo declarado es **320 px**. Por debajo no se promete soporte.

## Criterio de aceptación

Todos los códigos en verde en los 6 tamaños + la pasada reducida. Cualquier fallo
se anota con vista, tamaño, control y fecha; no se compensa con capturas bonitas.

## Evidencia

Informe JSON completo; el `--json` guarda una entrada por recorrido y vista.
