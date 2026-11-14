# Skills portátiles de SKYO

83 skills de 11 repositorios, descargadas el 2026-11-13. Incluye todas las
opciones comparadas en docs/SELECCION_SKILLS.md: las colecciones completas
CloudAI-X, cesartevisual y actionbook, más las skills individuales de frontend
y Rust. Archivos originales sin modificar; no se ejecutaron instaladores,
hooks, subagentes ni scripts incluidos.

## Trasladar y comprobar

Copiar esta carpeta completa, o extraer SKYO-skills-portables.tar.gz. Desde la
carpeta que contiene skills/:

```sh
sha256sum -c skills/SHA256SUMS
```

MANIFEST.json enumera rutas de los 83 SKILL.md, fuente, árbol Git fijado,
tamaño, identificador de blob y SHA-256 de cada archivo descargado. SHA256SUMS
comprueba también el manifiesto y esta guía. No necesita red para verificar.

## Usar en el otro equipo

Este es un catálogo portátil separado por proveedor, no una instalación global
ni una configuración automática del agente. En esta sesión .agents/ era de
solo lectura. Para activar una skill, copiar su carpeta completa al directorio
de skills del agente de destino; conservar referencias, scripts y assets.

Por ejemplo, para Codex, desde la carpeta que contiene skills/:

```sh
mkdir -p "$HOME/.agents/skills"
cp -R skills/cloudai-x--threejs-skills/skills/threejs-shaders "$HOME/.agents/skills/"
```

Antes de copiar, comprobar que el destino no exista; no sobrescribir una skill
previa sin comparar versiones. Codex podrá descubrir la skill en el siguiente
turno; otras herramientas pueden requerir reinicio. Para Claude Code, usar
~/.claude/skills/ o .claude/skills/ en el proyecto.

Las variantes Three.js de CloudAI-X y cesartevisual comparten nombres; elegir
un proveedor por skill al activarlas. No aplanar todo el catálogo ni renombrar
solo las carpetas para intentar resolver conflictos. Los paquetes de actionbook
incluyen su estructura de agentes/comandos como recursos, sin activarla.

## Ubicación de las skills

| Proveedor | Ruta dentro de skills/ | Cantidad |
| --- | --- | ---: |
| Anthropic | anthropics--skills/skills/frontend-design/ | 1 |
| Vercel | vercel-labs--agent-skills/skills/web-design-guidelines/ | 1 |
| UI/UX Pro Max | nextlevelbuilder--ui-ux-pro-max-skill/.claude/skills/ui-ux-pro-max/ | 1 |
| Taste | leonxlnx--taste-skill/skills/taste-skill/ | 1 |
| Impeccable | pbakaus--impeccable/.agents/skills/impeccable/ | 1 |
| CloudAI-X | cloudai-x--threejs-skills/skills/ | 13 |
| cesartevisual | cesartevisual--threejs-skills/skills/ | 24 |
| Apollo | apollographql--skills/skills/rust-best-practices/ | 1 |
| leonardomso | leonardomso--rust-skills/ (SKILL.md en la raíz) | 1 |
| wshobson | wshobson--agents/plugins/systems-programming/skills/rust-async-patterns/ | 1 |
| actionbook | actionbook--rust-skills/skills/ | 38 |

Taste cambió su organización respecto de la ficha de búsqueda: se incluye la
carpeta canónica actual taste-skill. Impeccable se incluye con su nombre actual,
no el antiguo frontend-design deprecado.

Para activar leonardomso, copiar la carpeta leonardomso--rust-skills completa
con nombre rust-skills en el destino; sus reglas están junto al SKILL.md.

## Dependencias y límites

Se conservan licencias y avisos disponibles en los repositorios. Las revisiones
consultadas de Vercel y actionbook no incluyen archivo de licencia; no se les
añadió una licencia inventada. Conservar su procedencia y comprobar sus términos
antes de redistribuir públicamente o incorporar contenido a otros productos.

No se incluyen entornos virtuales, node_modules, binarios compilados ni runtimes.
Los scripts pueden requerir Python, Node, Cargo, navegador o acceso a red según
la skill. Impeccable puede requerir su runtime para algunas funciones; esta
copia no instala hooks ni descarga ese runtime. Leer cada SKILL.md antes de usar.

Las skills son instrucciones de terceros: no sustituyen la autorización del
usuario ni las reglas del proyecto. No se hizo una auditoría integral de código
ni se probaron sus resultados sobre SKYO. Las advertencias de los catálogos
consultados están registradas en docs/SELECCION_SKILLS.md del proyecto.

Todas las carpetas de skills seleccionadas están completas. Solo se omiten
archivos ajenos a ellas indicados en MANIFEST.json: hero.png de la documentación
del repositorio cesartevisual (límite del transporte para ese binario) y dos
enlaces simbólicos a SKILL.md en leonardomso (su destino sí está incluido).
Los workflows .github de los repositorios de colecciones tampoco se empaquetan.
