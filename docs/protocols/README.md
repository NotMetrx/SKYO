# Protocolos de verificación visual

Conjunto de protocolos reproducibles para comprobar que cada parte visual de SKYO
**se pinta, se adapta y responde** sin depender de la impresión de una captura.
Cada protocolo tiene criterios medibles y una orden de ejecución concreta.

> Estado: **propuesta de trabajo**, no aprobación formal. Los protocolos no
> sustituyen la spec (`SPEC_SKYO_2.1_AUDITADO.md`) ni las puertas I/V/C.

## Cómo se ejecutan

```sh
npm start                       # servidor local en :8000
node scripts/audit-visual.mjs   # matriz completa, salida 0/1/2
node scripts/audit-visual.mjs --json docs/evidence/auditoria-visual.json
npm test                        # regresión del pipeline científico
```

`scripts/audit-visual.mjs` no añade dependencias al proyecto: usa Playwright del
entorno (`PLAYWRIGHT_MODULE`, `playwright`, caché de npx o `playwright-core`). Si
no lo encuentra, termina con código 2 y explica cómo instalarlo **fuera** del repo.

## Mapa de protocolos

| ID | Parte visual | Automatiza | Evidencia |
| --- | --- | --- | --- |
| [PV-01](PV-01-inicio.md) | `#inicio` minimalista | sí | JSON + captura |
| [PV-02](PV-02-explorar.md) | `#explorar` (bóveda e HUD) | sí | JSON + captura |
| [PV-03](PV-03-3d.md) | `#3d` (sistema solar) | sí | JSON + captura |
| [PV-04](PV-04-fases.md) | `#fases` (hoja de ruta) | sí | JSON + captura |
| [PV-05](PV-05-hera-transicion.md) | H.E.R.A 7 y warp zoom | sí | JSON + captura |
| [PV-06](PV-06-responsive.md) | Matriz de anchos 320→1440 | sí | JSON |
| [PV-07](PV-07-accesibilidad.md) | Teclado, ARIA, contraste | parcial | JSON + revisión |
| [PV-08](PV-08-rendimiento.md) | Ponytail: reposo y `hidden` | parcial | JSON + traza |
| [Guía de agente](PROTOCOLO-AGENTE-VISUAL.md) | Cómo reportar sin inventar | — | — |

Pipeline completo: [`docs/pipelines/validacion-visual.md`](../pipelines/validacion-visual.md).

## Criterios globales (aplican a todos)

1. Sin `pageerror` ni `console.error` en ninguna ruta.
2. `document.documentElement.scrollWidth <= innerWidth + 1` en cada vista.
3. La sección visible es exactamente la ruta pedida; el resto queda `inert` +
   `aria-hidden="true"`.
4. Ningún control interactivo visible queda fuera del viewport **fuera de un
   contenedor con scroll** propio.
5. Objetivos táctiles ≥ 24×24 CSS px (WCAG 2.2, 2.5.8), salvo enlaces en línea.
6. Con `prefers-reduced-motion: reduce`: sin transición perceptible ni bucle de
   animación en reposo.
7. Lo no medido se registra como **pendiente**, nunca como aprobado.

## Convenciones de evidencia

- Informe máquina-legible: `docs/evidence/auditoria-visual-<fecha>.json`.
- Resumen humano: `docs/evidence/auditoria-visual-<fecha>.md`.
- Capturas (opcionales, `--shots`): `docs/evidence/shots/audit-<fecha>/`.
- Cada informe anota `BASE`, fecha y hashes de los archivos medidos; una captura
  sin ese contexto no es evidencia.
