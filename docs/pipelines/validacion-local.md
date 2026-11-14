# Pipeline

## Objetivo

Verificar los formatos de incorporación de SKYO y registrar una comprobación
de regresión del laboratorio, sin atribuir validación científica a datos sintéticos.

## Entradas

Proyecto `skyo`, actor `codex`, spec `001-inicial`, documentos locales,
SPEC auditado y suite existente. Requiere Node compatible con package.json.

## Etapas y responsables

1. Codex consulta protocolo, contexto, skill SDD y catálogo de herramientas por MCP.
2. Codex comprueba estructura, enlaces y conservación del SPEC.
3. Codex ejecuta las pruebas y documenta su salida real en validacion.md.
4. Codex registra evidencia y pendientes con log; el propietario revisa el cierre.

## Comandos exactos

Desde `/home/metrx/Proyectos/SKYO`:

```sh
node --version
npm test
```

La comprobación documental revisa todos los archivos del plan, las secciones
oficiales, enlaces relativos y SHA-256 del SPEC. Su resultado y huella están
en `specs/001-inicial/validacion.md`.

## Artefactos de salida

`specs/001-inicial/validacion.md`, `MEMORY.md` y registro MCP log de tipo pipeline.
Las vistas Estado.md, tasks.md y Bitacora.md las genera la mente.

## Validación y criterio de éxito

Documentos y enlaces válidos, SPEC íntegro y comando de pruebas con salida 0.
Separar ese resultado del cierre central y de pruebas científicas pendientes.

## Condiciones de parada y reintento

Ante fallo, guardar comando/error y corregir solo lo que corresponda al alcance.
Tras dos correcciones del mismo hallazgo sin resolverlo, registrar bloqueo.
Falta de identidad o edición central: registrar pendiente, sin eludir permisos.

## Siguiente paso

Sincronización central y revisión formal; luego validar producción y datos reales
como trabajo separado según el SPEC científico.
