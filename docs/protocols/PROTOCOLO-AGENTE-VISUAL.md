# Protocolo del agente · verificación visual

Reglas para cualquier agente (modelo o humano asistido) que revise la interfaz de
SKYO. Su objetivo es impedir dos errores: **afirmar que algo se ve bien sin
medirlo** y **editar archivos que otro agente está usando**.

## 1. Antes de tocar nada

1. `git status --short` y `git log --oneline -5`.
2. Leer `memories.md`, `history.md` y `MEMORY.md`.
3. Comprobar si los archivos objetivo tienen cambios ajenos. Si los tienen:
   **detenerse**, no sobrescribir y reportar qué archivo y qué se observó.
4. Declarar en el reporte los archivos de tu responsabilidad.

## 2. Límite del modelo

Si el modelo no puede leer imágenes (capturas), **no puede afirmar** «se ve bien»,
«está roto» o «hay un solape» por inspección visual. Debe:

- medir geometría con `getBoundingClientRect()` y `getComputedStyle()`;
- usar `document.elementFromPoint()` para comprobar si un control es alcanzable;
- guardar capturas solo como evidencia para revisión humana, nunca como prueba
  principal;
- declarar el límite en el informe.

## 3. Qué es evidencia válida

| Válido | No válido |
| --- | --- |
| Salida real de `node scripts/audit-visual.mjs` con su JSON | «Se probó y funciona» |
| Rectángulos, `scrollWidth`, `opacity`, `visibility`, `inert`, ARIA | Impresión subjetiva |
| Lista de fallos con vista, tamaño y control | Captura sin fecha ni tamaño |
| Resultado de `npm test` con número de pruebas | Copiar resultados de otra sesión |

## 4. Cómo reportar

Cada hallazgo lleva: **vista**, **tamaño**, **control**, **valor medido**,
**código** (`E_*`), **fecha** y **siguiente paso**. Los pendientes se marcan como
pendientes; los aprobados, con el comando exacto que los aprobó.

## 5. Prohibiciones

- No declarar detección astronómica, WASM integrado ni validación Android por una
  prueba visual.
- No autoaprobar specs, planes ni memorias candidatas.
- No editar SQLite ni proyecciones generadas (`tasks.md`, `Estado.md`, `Bitacora.md`).
- No usar `git add .`, `reset`, `stash`, `checkout` o `clean` sobre trabajo ajeno.
- No añadir dependencias al proyecto para medir: el runner usa Playwright del entorno.

## 6. Registro

- Actividad y resultados: MCP/CLI `log` cuando haya identidad configurada.
- Si no hay identidad o el MCP no está disponible: registrar el límite en la
  evidencia y en `MEMORY.md`, sin inventar sesión ni copiar secretos.
- Al cerrar: `MEMORY.md` actualizado y enlace al informe de la fecha.
