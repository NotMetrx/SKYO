# Auditoría visual · 2026-11-14

Auditoría de las cuatro vistas de la SPA y de `lab.html`, con la matriz de PV-06.
Ejecutada por `codex` (sesión de agente) sobre el árbol de trabajo local.

## Snapshot medido

- `BASE=http://127.0.0.1:8123` (`node scripts/dev-server.mjs`, puerto alterno
  porque el 8000 estaba ocupado por otra instancia).
- `HEAD` = `c69f828` + cambios **sin commitear de otra sesión concurrente**
  (paleta naranja → morado `#b57bff`, `docs/LAYOUT.md`, `docs/PALETA.md`).
- Los archivos medidos no cambiaron entre la escritura de la otra sesión y la
  auditoría:

| Archivo | mtime | SHA-256 (12) |
| --- | --- | --- |
| `index.html` | 11:26:07 | `5f738f2e07e2` |
| `assets/css/main.css` | 11:26:07 | `55ab98d9b161` |
| `assets/js/app.js` | 10:28:58 | `66f1ddd5df7a` |
| `assets/js/cosmos3d.js` | 11:26:07 | `3dab7015fd0a` |
| `assets/js/explorar.js` | 11:26:07 | `25374fd85065` |

Informe máquina-legible: [`auditoria-visual-2026-11-14.json`](auditoria-visual-2026-11-14.json).

## Comandos ejecutados

```sh
npm test
PORT=8123 node scripts/dev-server.mjs
BASE=http://127.0.0.1:8123 node scripts/audit-visual.mjs \
  --json docs/evidence/auditoria-visual-2026-11-14.json
```

- `npm test`: **8/8 pass**, 0 fail (324 ms).
- Runner: 7 recorridos × 4 rutas + `lab.html` = 28 estados + 7 laboratorios.
- Capturas: no incluidas (el modelo de esta sesión no puede interpretar imágenes;
  ver `PROTOCOLO-AGENTE-VISUAL.md` §2).

## Resultado por recorrido

| Recorrido | overflow | controles fuera | objetivos <24px | WebGL | H.E.R.A | errores |
| --- | --- | --- | --- | --- | --- | --- |
| desktop 1440×900 | no | 0 | 0 | ok | oculta en `#inicio`, visible fuera | 0 |
| laptop 1280×720 | no | 0 | 0 | ok | idem | 0 |
| tablet 820×1180 | no | 0 | 0 | ok | idem | 0 |
| mobile 390×844 | no | 0 | 0 | ok | idem | 0 |
| mobile-s 360×740 | no | 0 | 0 | ok | idem | 0 |
| mobile-xs 320×568 | no | **1** (`#explorar`) | 0 | ok | idem | 0 |
| desktop-reduced 1440×900 | no | 0 | 0 | ok | idem | 0 |

Datos comunes: `body.anim-ready` en todas las vistas, `aria-current` correcto,
secciones inactivas con `inert` + `aria-hidden="true"`, `#nav` con 3 enlaces,
`.top` oculto en `#inicio`, 0 controles interactivos en `#inicio`, `lab.html` con
`h1` y 11 controles.

## Fallo abierto

**`E_CLIP` · `#explorar` · 320×568 · «📑 Colección y Candidatos».**
`.explore-view-tabs` mide 314 px de contenido en 294 px de caja y la tercera
pestaña termina en `x=327` (7 px fuera). `main { overflow: hidden }` la recorta: no
se alcanza ni con scroll. A 360 px no ocurre.

Parche mínimo propuesto (**no aplicado**, el archivo tiene cambios de otra sesión):

```css
@media (max-width: 360px) {
  .view-tab { padding-inline: 10px; }   /* 14 → 10: −24 px en 3 pestañas */
  .explore-view-tabs { gap: 2px; }      /* 4 → 2: −4 px */
}
```

Tras aplicarlo, repetir PV-02/PV-06 y volver a generar el JSON.

## Hallazgos que no bloquean (registrados)

1. **`#hb` sin `aria-live`**: `role="dialog"` correcto, pero los mensajes de
   H.E.R.A no se anuncian al lector de pantalla (PV-05/PV-07).
2. **`lab.html` con objetivos de 13 px** de alto en algunos `input`/`select`
   (< 24 px de WCAG 2.2, 2.5.8). Medido con `getBoundingClientRect()`.
3. **WASM**: `assets/js/wasm/pkg/skyo_wasm.js` no existe (wasm-pack ausente). La
   primera pasada registró la petición fallida; el laboratorio degrada de forma
   correcta y rotula «JavaScript (WASM pendiente de compilar)». Coincide con el
   bloqueo ya anotado en `MEMORY.md`: no es una regresión visual.
4. **Carrusel de fases**: 7 pestañas en `#phase-rail` con scroll horizontal
   (366/960 px a 390). Correcto, pero sin pista visual de desplazamiento; el teclado
   con flechas no está verificado (PV-04).

## Rendimiento y adaptación

- `prefers-reduced-motion: reduce`: **0 rAF/s** en las cuatro vistas y transición
  `1e-05 s`; `Enter` salta directo a `#explorar` sin warp.
- Sin reduced: 14–60 rAF/s según vista y equipo (animación 3D legítima); pausa de
  `#3d` y pestaña en segundo plano quedan como verificación manual en PV-08.
- Contraste del texto principal: **18.9:1** sobre negro y 16.85:1 sobre panel
  (`#0b1220`). Foco visible: `2px solid #5bb8ff`.
- Wordmark `.eclipse-wordmark`: 539 px a 1440 y 235 px a 320; siempre dentro del
  ancho.

## Veredicto

- **Se adapta correctamente de 360 a 1440 px** en las cuatro vistas y el laboratorio.
- **320 px**: un solo defecto de recorte en `#explorar` (pestaña de modo).
- Reduced motion, teclado, ARIA estructural, contraste y ausencia de errores de
  consola: **conformes** en lo medido.
- No se declara aprobación de producto: los puntos manuales de PV-03, PV-04,
  PV-07 y PV-08 siguen pendientes.

## Registro MCP

`mente_general` / `log` no estaban disponibles en esta sesión (sin identidad ni
servidor MCP configurado). No se inventó sesión: el límite queda aquí y en
`MEMORY.md`. Las tareas no se marcaron con `claim` ni `finish`.
