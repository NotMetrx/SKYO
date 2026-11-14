# Pipeline · validación visual

## Objetivo

Comprobar de forma reproducible que cada vista de SKYO se pinta, se adapta y
responde, y dejar evidencia medible sin confundirla con validación científica.

## Entradas

- Servidor local (`npm start`, puerto 8000).
- `scripts/audit-visual.mjs` y Playwright disponible en el entorno.
- Matriz de PV-06 y protocolos PV-01…PV-08.

## Etapas

| # | Acción | Salida |
| --- | --- | --- |
| 1 | `node --version` y `npm test` | pruebas del pipeline científico |
| 2 | `npm start` (o `PORT=8123 node scripts/dev-server.mjs`) | app servida |
| 3 | `node scripts/audit-visual.mjs --json docs/evidence/auditoria-visual-YYYY-MM-DD.json` | informe máquina-legible |
| 4 | Repetir con `--shots` si se necesita revisión humana | capturas fechadas |
| 5 | Anotar hallazgos y pendientes en `docs/evidence/auditoria-visual-YYYY-MM-DD.md` | resumen |
| 6 | Registrar el resultado vía MCP/CLI `log` | actividad |

## Comandos exactos

```sh
node --version
npm test
npm start
node scripts/audit-visual.mjs --json docs/evidence/auditoria-visual-2026-11-14.json
```

Para otra instancia: `BASE=http://127.0.0.1:8123 node scripts/audit-visual.mjs`.

## Criterio de éxito

- `npm test` termina con 0 fallos.
- El runner termina con código 0 y el JSON contiene una entrada por recorrido.
- Si termina con 1, el informe lista cada `E_*` con vista y tamaño; **no** se
  considera aprobado.
- Código 2 significa «no se pudo medir»: registrar el bloqueo, no aprobar.

## Condiciones de parada

- Playwright ausente en el entorno → código 2; documentar y no instalar dentro del
  repo sin autorización.
- Archivos con cambios ajenos en curso → detenerse y reportar (ver
  `docs/protocols/PROTOCOLO-AGENTE-VISUAL.md`).
- Dos intentos fallidos del mismo hallazgo → registrar bloqueo con comando y error.

## Alcance y límites

Este pipeline valida **interfaz**, no ciencia: no prueba detección astronómica,
equivalencia WASM ni Android físico. Esas puertas siguen en
`docs/specs/002-comparador-local/validacion.md`.
