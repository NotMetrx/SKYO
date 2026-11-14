# PV-02 · `#explorar` (bóveda ICRS + HUD)

**Alcance:** HUD superior, pestañas de modo, barra de misión, paneles laterales,
dock inferior y lienzo de la bóveda.

## Comprobaciones automáticas

| # | Comprobación | Criterio | Código |
| --- | --- | --- | --- |
| 1 | Sección activa | `.sec.on` es `#explorar` | `E_SECTION` |
| 2 | Sin desbordamiento | `scrollWidth <= innerWidth + 1` | `E_OVERFLOW` |
| 3 | Controles alcanzables | ningún control visible fuera del viewport salvo dentro de un contenedor con scroll | `E_CLIP` |
| 4 | Objetivos táctiles | pestañas y botones ≥ 24×24 px | `E_TARGET` |
| 5 | WebGL | bóveda con contexto válido | `E_WEBGL` |
| 6 | H.E.R.A | avatar visible fuera de `#inicio` | `E_HERA` |
| 7 | Navegación | `aria-current="page"` en «Explorar» | `E_CURRENT` |

## Casos funcionales mínimos

1. Cambiar de modo (Bóveda / Colección / Laboratorio) mantiene el canvas y no
   rompe el HUD.
2. «Parpadear épocas» alterna sin dejar el lienzo en blanco.
3. Abrir y cerrar paneles laterales no tapa controles imprescindibles en móvil.
4. Las pestañas de modo caben enteras a **360 px**; a **320 px** es el único punto
   conocido de recorte (ver hallazgo en la auditoría 2026-11-14).

## Criterio de aceptación

1–7 en verde en 1440, 820, 390 y 360. A 320 se acepta solo con el defecto
registrado y fecha de corrección; no se declara «adaptado» sin arreglarlo.

## Evidencia

`routes.explorar` del informe JSON + captura `*-explorar.png` si se usa `--shots`.
