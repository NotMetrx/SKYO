# Maqueta del layout — SKYO

Lienzo WebGL a pantalla completa (obsidiana `#07070A`) detrás; la UI flota encima en paneles Liquid Glass. Márgenes de 20 px, separación de 12 px, radio de 16 px (barras 999 px).

## Rejilla global (escritorio ≥ 1024 px)
```text
┌──────────────────────────────────────────────────────────────────────┐
│ [SKYO]                                        [Explorar · 3D · Fases] │  ← .top (oculta en #inicio)
│                                                                        │
│  ZONA SUPERIOR IZQ: pestañas / filtros     ZONA SUPERIOR DER: modos    │
│                                                                        │
│                    ESCENA 3D (centro, interactiva)                     │
│                                                                        │
│  ZONA INFERIOR IZQ: dock de control        ZONA INFERIOR DER: H.E.R.A 7│
│  [pie de créditos]                                                     │
└──────────────────────────────────────────────────────────────────────┘
```
El centro queda libre para la escena; los paneles se anclan a las esquinas.

## #inicio
```text
┌──────────────────────────────────────────────┐
│                                              │
│                  S K Y ◐                      │  ← wordmark centrado
│                                              │
└──────────────────────────────────────────────┘
```
Sin barra, sin H.E.R.A 7. `O` renderizada con el modelo 3D del eclipse (`eclipse.glb`). `Enter`/`Espacio` → vuela hacia el frente cruzando a `#explorar` y se oculta al finalizar.

## #explorar
```text
┌──────────────────────────────────────────────────────────────────────┐
│ [SKYO]                                        [Explorar · 3D · Fases] │
│ [Bóveda | Lab FITS | Colección]                             [Bitácora]│
│ [Todos|Estrellas|Cometas|Asteroides]  ┌ Misión 1/4 ─ texto ─ Pista Sig┐│
│                                       └──────────────────────────────┘│
│                     ┌── recorte ICRS + HEALPix ──┐                    │
│                     │   cuerpos · vector crimson  │                    │
│                     └────────────────────────────┘                    │
│ ┌ Época 1 · Época 2 · Época 3 · Época 4 ┐            ┌ H.E.R.A 7 ┐ [🧑‍🚀]│
│ │ [IR Corto|IR Largo] [Parpadear] [Cmp] │            └───────────┘      │
│ └───────────────────────────────────────┘                             │
│ (créditos NASA/IPAC IRSA · JPL)                                        │
└──────────────────────────────────────────────────────────────────────┘
```

## #3d
Igual que la rejilla global: escena del Sistema Solar al centro, controles de escala/tiempo en el dock inferior izquierdo, H.E.R.A 7 abajo a la derecha.

## #fases
```text
┌──────────────────────────────────────────────────────────────────────┐
│ [SKYO]                                        [Explorar · 3D · Fases] │
│ ARQUITECTURA VIVA 3D                          [Fases 0–6 | Pipeline]  │
│ Fases y etapas de la solución                                          │
│                      constelación 3D de fases                          │
│ [F0][F1][F2][F3][F4][F5][F6]                                           │
│ ┌ FASE 0 · Prototipo ──────────── Completado ┐       ┌ H.E.R.A 7 ┐    │
│ │ [Etapa 0.1] [Etapa 0.2] [Etapa 0.3]        │       └───────────┘    │
│ │ [Ir a Inicio] [Consultar a H.E.R.A 7]      │                        │
│ └────────────────────────────────────────────┘                        │
└──────────────────────────────────────────────────────────────────────┘
```

## Móvil (< 640 px)
Una columna: barra arriba, pestañas con desplazamiento horizontal, escena en el centro, dock como hoja inferior a todo el ancho; H.E.R.A 7 se reduce al avatar.

## Color por zona
- Sky Blue `--ac` `#7CC8FF`: navegación, pestaña activa, retícula y estado completado.
- Laser Crimson `--ac2` `#E11D48`: misiones, candidatos, vector de verificación, modo activo e IR Largo.
- Chrome Silver `--chrome` `#C9CED6`: texto, bordes y reflejos.

Capturas reales: [explorar](../assets/img/previews/explorar.png) · [fases](../assets/img/previews/fases.png).
