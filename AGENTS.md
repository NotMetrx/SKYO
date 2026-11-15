# Protocolo del proyecto

Catálogo portátil de skills de referencia: `_archivo/ajeno/skills/README.md` y
`_archivo/ajeno/skills/MANIFEST.json`. Cargar solo las pertinentes a la tarea;
las variantes por proveedor conservan sus nombres originales y no están
activadas globalmente.

Leer `docs/constitution.md`, `MEMORY.md` y la spec principal activa
`docs/SPEC_SKYO_2.1_AUDITADO.md`. El plan/tareas/validación de implementación
están en `docs/specs/002-comparador-local/`. `docs/specs/001-inicial/` es la
incorporación administrativa histórica; no sustituye los requisitos del
producto.

Consultar `mente_general.context(project="skyo", spec="002-comparador-local")`.
Usar `project="skyo"` y actor estable `codex` explícitamente: la raíz local
todavía no está vinculada en el registro central.

Seguir `00-Inicio/Protocolo.md` de la mente general. Resolver skills con
`skill_resolve` y leer las pertinentes con `skill_get`; consultar `tool_list`
antes de instalar ejecutables compartidos. Registrar tareas y actividad mediante
MCP/CLI, nunca editando SQLite ni proyecciones generadas (`tasks.md`, `Estado.md`,
`Bitacora.md`). Tomar tareas con `claim` solo con aprobaciones vigentes.

Registrar cambios, comandos, resultados, bloqueos y siguiente paso en `log`.
Actualizar `MEMORY.md` al cerrar. Las sesiones MCP requieren identidad configurada;
si falta, registrar el límite sin inventar una sesión ni copiar secretos.

Los documentos adaptados están en esta carpeta; la bóveda central conserva las
plantillas iniciales hasta sincronización explícita. No confundir ambos estados.
No autoaprobar specs, planes ni memorias candidatas.

Validar con `npm test` y el pipeline `docs/pipelines/validacion-local.md`.
Conservar originales FITS y distinguir datos sintéticos, manuales y reales.
No declarar detección astronómica ni validación de WASM/Android sin evidencia.
