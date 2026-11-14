# Plan técnico

## Archivos y responsabilidades

| RF | Archivos | Responsabilidad |
| --- | --- | --- |
| RF-1 | AGENTS.md, docs/constitution.md, MEMORY.md | Contexto y reglas |
| RF-2 | specs/001-inicial/*.md | Alcance, plan, tarea y veredicto |
| RF-3 | pipelines/README.md, pipelines/validacion-local.md, README.md | Ejecución y acceso |
| RF-4 | MEMORY.md, AGENTS.md, validacion.md, log MCP | Límites y pendientes |

## Decisiones y alternativas

Adaptar las plantillas devueltas por project_new; reutilizar su spec 001-inicial.
Conservar el SPEC científico en su ruta original y enlazarlo, sin duplicarlo.
Documentos locales adaptados y bóveda central inicial se distinguen expresamente
porque el MCP no tiene editor general. No usar scripts fuera del alcance de
permisos para modificar la bóveda ni introducir herramientas de sincronización.

## Algoritmos y dependencias

No se requieren algoritmos ni dependencias nuevas. Usar MCP para contexto,
registro y bitácora; archivos Markdown para los formatos locales. Se registra
una tarea de incorporación con todos los RF; su cierre central requiere revisión.

## Validación por RF

- RF-1: comprobar archivos de contexto y referencias a proyecto/spec.
- RF-2: comprobar secciones oficiales, trazabilidad y hash del SPEC conservado.
- RF-3: comprobar enlaces, secciones de Pipeline y ejecución de npm test.
- RF-4: comprobar respuestas MCP y reflejar límites sin atribuir aprobaciones.

La comprobación estructural usa Python estándar en una ejecución puntual;
no añadir una dependencia ni un test de producto para documentación.
