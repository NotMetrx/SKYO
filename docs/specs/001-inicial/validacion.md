# Validación

Revisión científica posterior: [auditoría del SPEC y enlaces NASA](../../docs/AUDITORIA_SPEC_2026-11-13.md).
No sustituye ni aprueba esta spec de incorporación. La auditoría confirma 12
pruebas sintéticas aprobadas en el entorno actual y documenta evidencia parcial
de un recorte DR1 real, además de problemas pendientes en el flujo de datos.

Fecha de incorporación: 2026-11-13. Actor: codex. Proyecto: skyo.

## Evidencia por RF

| RF | Comprobación | Resultado | Veredicto local |
| --- | --- | --- | --- |
| RF-1 | AGENTS.md, constitución y MEMORY.md; identidad y referencias | Archivos adaptados al laboratorio | Cumple |
| RF-2 | Secciones oficiales de spec/plan/tareas y referencia al SPEC | RF-1 a RF-4 trazables en plan y tarea | Cumple |
| RF-3 | Enlaces relativos, secciones de Pipeline y npm test | Comprobación estructural aprobada; salida 0 en pruebas | Cumple |
| RF-4 | project_detect, session_resume, log y documentos locales | Límites y estados central/local separados | Cumple |

## Pruebas ejecutadas

- `node --version`: v24.21.0.
- `npm test`: salida 0; 1 archivo aprobado, 0 fallos, 0 omitidos.
- `node --test --test-reporter=tap tests/pipeline.test.mjs`: salida 0;
  informa el archivo como un único subtest. El código contiene 12 declaraciones
  test; no se atribuyen 12 resultados individuales que el runner no mostró.
- Comprobación puntual con Python estándar: archivos requeridos no vacíos,
  encabezados oficiales de spec/plan/Pipeline, ausencia de marcadores de plantilla,
  RF presentes, enlaces Markdown locales resolubles y huella del SPEC verificados.

## Procedencia e integridad

Fuente: `mente_general.read("00-Inicio/Protocolo.md")`, `skill_get("sdd")`,
`read("04-Pipelines/SDD.md")` y plantillas generadas por `project_new("skyo")`.
Se leyó además `Boveda/06-Plantillas/Pipeline.md` y las plantillas integradas de
`tools/mente.py` de la instalación local de mente_general.

El SPEC no fue objeto de edición. SHA-256 registrado de
`SPEC_SKYO_2.1_AUDITADO.md`:

```text
0f0d5d1b7ee4d8c87686ca394b28d1f39e192ff960e88b05d7238fee36ea81e2
```

## Estado central y límites

- MCP creó `skyo` con su spec inicial y registró la tarea `t-c101f2a1d9c9`.
- La bóveda central conserva sus plantillas; los formatos adaptados están locales.
- `project_detect` no encuentra la raíz local; indicar `project="skyo"`.
- `session_resume` requiere MENTE_AGENT_TOKEN; no se abrió una sesión autenticada.
- `tool_list` no contiene ejecutables. No se instalaron herramientas.
- Búsqueda híbrida degradada a keyword/FTS5; no se afirmó recuperación semántica.
- Sin claim, finish ni aprobación formal de spec/plan o memoria candidata.
- Git no reconoce esta carpeta como repositorio; no se declara commit ni diff Git.

## Veredicto

Incorporación documental local comprobada. Cierre administrativo central
pendiente de sincronización y revisión; no es aceptación científica del prototipo.
No se ejecutaron build Vite/Rust, pruebas de navegador/PWA/Android ni validación
con FITS NASA reales: no forman parte de esta incorporación.
