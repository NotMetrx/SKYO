# Especificación

Estado: preparada localmente; pendiente de revisión formal en la mente general.
Alcance autorizado: incorporación de formatos estándar, solicitud del 2026-11-13.

## Contexto y objetivo

Incorporar el laboratorio SKYO 2.1 al protocolo documental compartido de
mente_general. Conservar el código y la referencia científica
[`SPEC_SKYO_2.1_AUDITADO.md`](../../SPEC_SKYO_2.1_AUDITADO.md).
Los RF de este documento describen la incorporación, no requisitos astronómicos.

## Usuarios e historias

- El propietario necesita encontrar los mismos formatos que en sus otros proyectos.
- Los agentes necesitan contexto, reglas y evidencia para retomar SKYO sin
  confundir las simulaciones con observaciones reales.

## Requisitos EARS

- RF-1: CUANDO un agente abra SKYO, EL PROYECTO ofrecerá AGENTS.md,
  docs/constitution.md y MEMORY.md con identidad, alcance y próximo paso.
- RF-2: CUANDO se consulte la spec activa, EL PROYECTO ofrecerá spec.md,
  plan.md, tareas-plan.md y validacion.md con trazabilidad por RF y referencia
  al SPEC auditado original.
- RF-3: CUANDO se valide esta incorporación, EL PROYECTO ofrecerá un pipeline
  con comandos, resultados y límites de evidencia, accesible desde README.
- RF-4: SI el MCP carece de identidad, vinculación de raíz o edición general,
  ENTONCES EL REGISTRO distinguirá los documentos locales, las plantillas de
  la bóveda y los pasos pendientes, sin declarar aprobaciones ni sesiones falsas.

## Requisitos no funcionales

Documentos en español, enlaces relativos dentro del proyecto, sin nuevas
dependencias ni secretos. No alterar código, datos, scripts ni SPEC científico.
Usar las secciones oficiales generadas por project_new y la plantilla Pipeline.

## Casos límite

La carpeta .git de este entorno no contiene un repositorio utilizable; no
declarar commit ni diff verificado. La ausencia de sesión autenticada no impide
preparar documentación y registrar actividad con log. No editar proyecciones.

## Fuera de alcance

Nuevas funciones, despliegue, descarga NASA, compilación Vite/WASM,
pruebas Android y aceptación automática de memoria o de requisitos científicos.

## Criterios de finalización

RF-1 a RF-4 comprobados localmente, enlaces resueltos, SPEC conservado y resultado
real de npm test registrado. El cierre central exige sincronizar los documentos
y registrar la revisión formal; la creación de plantillas no cumple ese cierre.

## Dudas abiertas

No hay decisiones de producto necesarias para esta incorporación. Quedan
pendientes operativos: edición/sincronización central, identidad de sesión y
vinculación de raíz, detallados en MEMORY.md.
