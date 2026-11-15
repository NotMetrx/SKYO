# Paleta de colores — SKYO

Fuente única: variables `:root` en [`assets/css/main.css`](../assets/css/main.css). No usar colores sueltos; referenciar siempre la variable.

## Base
| Token | Valor | Uso |
|---|---|---|
| `--obsidian` / `--bg` | `#07070A` | Fondo, lienzo 3D y superficies base |
| `--chrome` | `#C9CED6` | Texto secundario y reflejos metálicos |
| `--chrome-bright` / `--fg` | `#E6E8EC` | Texto principal |
| `--chrome-dim` / `--mut` | `#A6AFBB` | Metadatos y etiquetas |

## Acentos
| Token | Valor | Uso |
|---|---|---|
| `--sky` / `--ac` | `#7CC8FF` | Acción primaria, foco, selección, retícula ICRS y banda IR corta |
| `--crimson` / `--ac2` | `#E11D48` | Rellenos, bordes, alertas y banda IR larga |
| `--crimson-soft` | `#FF5C7A` | Texto de acento sobre obsidiana (contraste AA) |
| `--crimson-pale` | `#FFC2CE` | Texto/insignias sobre fondos crimson |
| `--ok` | `#7CC8FF` | Confirmación (la paleta no usa verde) |

> Regla: `--ac` para interacción; `--ac2` solo para señal científica (movimiento, candidato, alerta). Para texto pequeño sobre obsidiana usar `--crimson-soft` o `--crimson-pale`, no `--crimson` puro.

## Líneas
| Token | Valor | Uso |
|---|---|---|
| `--ln` | `rgba(201,206,214,.22)` | Bordes de paneles glass |
| `--ln-ac` | `rgba(124,200,255,.54)` | Borde activo / hover |

## Liquid Glass
| Token | Composición |
|---|---|
| `--gl` | blanco 11.5% → obsidiana `#121318` 34% → `--ac` 8.5% (138°) |
| `--gl-strong` | blanco 14% → `#0D0E12` 56% → `--ac` 11% (142°) — barras y diálogos |
| `--gl-card` | blanco 9.5% → `#0F1015` 38% → `--ac` 6.5% (148°) — tarjetas |
| `--gl-filter` | `blur(22px) saturate(185%) brightness(1.06)` |
| `--gl-inset` / `--gl-shadow` | brillo especular interno + sombra `rgba(0,0,0,.58)` |

## Wordmark SKYO
Degradado vertical `#FFFFFF` → `#E6E8EC` → `#A6AFBB` con halo `rgba(124,200,255,.3)`.

## Contraste (WCAG sobre `#07070A`)
- `--chrome-bright` 16.4:1 · `--chrome` 12.7:1 · `--mut` 9.1:1 · `--sky` 11.1:1 — AAA para texto.
- `--crimson-soft` 6.8:1 · `--crimson-pale` 13.3:1 — AA/AAA para texto.
- `--crimson` 4.3:1 — reservado para rellenos, bordes e iconos grandes; no para texto pequeño.

La comprobación de contraste es analítica y debe repetirse con herramientas de navegador antes de declarar conformidad WCAG.
