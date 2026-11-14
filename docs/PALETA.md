# Paleta de colores — SKYO

Fuente única: variables `:root` en [`assets/css/main.css`](../assets/css/main.css). No usar colores sueltos; referenciar siempre la variable.

## Base
| Token | Valor | Uso |
|---|---|---|
| `--bg` | `#000000` | Fondo absoluto (cielo nocturno, obligatorio) |
| `--fg` | `#eef3ff` | Texto principal (blanco frío) |
| `--mut` | `#a4b2ca` | Texto secundario, etiquetas, metadatos |

## Acentos
| Token | Valor | Uso |
|---|---|---|
| `--ac` | `#5bb8ff` | Azul estelar: acción primaria, foco, selección, retícula ICRS |
| `--ac2` | `#b57bff` | Morado: vector de verificación, misiones, alertas de candidato |
| `--ok` | `#4ade80` | Verde: confirmación, estado válido |

> Regla: `--ac` para interacción, `--ac2` (morado) solo para señal científica (movimiento/candidato). Nunca ambos como fondo del mismo componente.

## Líneas
| Token | Valor | Uso |
|---|---|---|
| `--ln` | `rgba(255,255,255,.21)` | Bordes de paneles glass |
| `--ln-ac` | `rgba(91,184,255,.54)` | Borde activo / hover |

## Liquid Glass
| Token | Composición |
|---|---|
| `--gl` | blanco 11.5% → azul noche `#101a2e` 34% → `--ac` 8.5% (138°) |
| `--gl-strong` | blanco 14% → `#0a101e` 56% → `--ac` 11% (142°) — barras y diálogos |
| `--gl-card` | blanco 9.5% → `#0c1322` 38% → `--ac` 6.5% (148°) — tarjetas |
| `--gl-filter` | `blur(22px) saturate(185%) brightness(1.06)` |
| `--gl-inset` / `--gl-shadow` | brillo especular interno + sombra `rgba(0,0,0,.58)` |

## Wordmark SKYO
Degradado vertical `#ffffff` → `#dbe9ff` → `#8fb6e6` con halo `rgba(91,184,255,.3)`.

## Contraste (WCAG sobre `#000000`)
- `--fg` 18.9:1 · `--mut` 9.8:1 · `--ac` 9.7:1 · `--ac2` 7.2:1 · `--ok` 12.1:1 — todos AAA para texto.
