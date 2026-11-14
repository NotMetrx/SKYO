# Skills para frontend avanzado, Three.js y Rust

Actualización: por solicitud posterior se copiaron las 83 skills de las
11 fuentes comparadas a `../skills/`, con recursos, manifiesto y guía de traslado.
Ver [paquete portátil](../skills/README.md). El archivo comprimido se llama
SKYO-skills-portables.tar.gz. Las notas de «sin instalación» inferiores describen
la fase de investigación inicial.

Consulta: 2026-11-13. Investigación, sin instalación ni ejecución de código remoto.
Se consultaron GitHub, skills.sh, SkillsMP, SkillHub y hotskills.dev; se priorizó
el repositorio original sobre copias y recopilaciones. Cifras aproximadas de las
páginas recuperadas: pueden diferir por fecha de indexación.

Las estrellas corresponden al repositorio completo; las instalaciones de
skills.sh corresponden a una skill y no equivalen a usuarios únicos, valoraciones
ni pruebas de calidad. Los análisis automáticos de catálogos tampoco son un
benchmark de resultados. Esta selección no pretende ser un ranking exhaustivo.

## Comparación

| Área / skill | Estrellas del repositorio | Instalaciones skills.sh | Evaluación para SKYO |
| --- | ---: | ---: | --- |
| [frontend-design — Anthropic](https://skills.sh/anthropics/skills/frontend-design) | 194 mil | 1,1 millones | Base de dirección visual, tipografía y composición. Ya existe en mente_general. |
| [ui-ux-pro-max](https://skills.sh/nextlevelbuilder/ui-ux-pro-max-skill/ui-ux-pro-max) | 149 mil | 450,7 mil | Biblioteca amplia de estilos, paletas y sistemas. Opcional para definir sistema visual. |
| [design-taste-frontend](https://skills.sh/leonxlnx/taste-skill/design-taste-frontend) | 115 mil | 774,5 mil | Fuerte en landing pages y portfolios; menor ajuste al laboratorio científico. |
| [impeccable](https://skills.sh/pbakaus/impeccable/impeccable) | 110 mil | 406,6 mil | Mejor candidato adicional para crítica, refinamiento, responsive, movimiento y revisión visual. |
| [web-design-guidelines — Vercel](https://skills.sh/vercel-labs/agent-skills/web-design-guidelines) | 34 mil | 860 mil | Auditoría de accesibilidad, interacción y calidad web. Ya existe en mente_general. |
| [threejs-fundamentals](https://skills.sh/cloudai-x/threejs-skills/threejs-fundamentals) | 4,2 mil | 22,8 mil | Escena, cámara, renderer y recursos. Ya existe en mente_general. |
| [threejs-shaders](https://skills.sh/cloudai-x/threejs-skills/threejs-shaders) | mismo repositorio | 21,1 mil | GLSL, ShaderMaterial, TSL y materiales por nodos. Prioridad para visualización avanzada. |
| [threejs-interaction](https://skills.sh/cloudai-x/threejs-skills/threejs-interaction) | mismo repositorio | 19 mil | Picking, raycasting y controles. Ya existe en mente_general. |
| [threejs-postprocessing](https://skills.sh/cloudai-x/threejs-skills/threejs-postprocessing) | mismo repositorio | 18,2 mil | Efectos visuales; opcional, separado de imágenes científicas cuantitativas. |
| [rust-best-practices — Apollo](https://skills.sh/apollographql/skills/rust-best-practices) | 130 | 21,8 mil | Primera elección para ownership, errores, Clippy, pruebas y rendimiento del kernel. |
| [rust-skills — leonardomso](https://skills.sh/leonardomso/rust-skills/rust-skills) | 711 | 7,1 mil | 265 reglas/26 categorías; complemento amplio para revisión y optimización. |
| [rust-async-patterns](https://skills.sh/wshobson/agents/rust-async-patterns) | 42,5 mil | 22,1 mil | Tokio y concurrencia asíncrona; opcional, no necesario para el kernel WASM actual. |
| [actionbook/rust-skills](https://github.com/actionbook/rust-skills) | 1,6 mil | No verificado | Colección especializada con routing y diagnóstico; más compleja que lo que necesita este kernel. |
| [cesartevisual/threejs-skills](https://skills.sh/cesartevisual/threejs-skills) | 21 según catálogo | 13,4 mil acumuladas entre 24 skills | Alternativa menos adoptada con WebGPU, spatial-data, accesibilidad y testing. No sumar sus instalaciones como si fueran de una sola skill. |

Fuentes GitHub para contrastar estrellas: [Anthropic](https://github.com/anthropics/skills),
[UI/UX Pro Max](https://github.com/nextlevelbuilder/ui-ux-pro-max-skill),
[Taste](https://github.com/Leonxlnx/taste-skill),
[Impeccable](https://github.com/pbakaus/impeccable),
[Vercel](https://github.com/vercel-labs/agent-skills),
[CloudAI-X](https://github.com/CloudAI-X/threejs-skills),
[Apollo](https://github.com/apollographql/skills),
[leonardomso](https://github.com/leonardomso/rust-skills).

## Selección propuesta

1. Reutilizar frontend-design como base y web-design-guidelines para revisión.
2. Añadir impeccable para el trabajo de diseño avanzado; utilizar una dirección
   visual principal por tarea para evitar reglas estéticas contradictorias.
3. Three.js: fundamentals, interaction, shaders y performance. Esta última ya
   está disponible en el entorno local de Codex. Geometry, loaders y textures
   se consultarán cuando la escena/los activos lo requieran.
4. Rust: empezar con rust-best-practices de Apollo; usar leonardomso como
   complemento de revisión, sin cargar todo el catálogo en cada cambio.

El paquete [CloudAI-X](https://github.com/CloudAI-X/threejs-skills) incluye
threejs-performance, geometry, materials, lighting, textures, loaders y
asset-pipeline. Su documentación consultada apunta a r186: comprobar siempre
la versión instalada y el backend WebGL/WebGPU antes de reutilizar ejemplos.

SKYO usa JS sin React y su crate declara edición Rust 2021 con wasm-bindgen.
No hace falta añadir React Three Fiber, Tokio ni migrar a edición 2024 para usar
estas skills. Rust moderno significa aplicar idioms compatibles con el toolchain
y el target; las instrucciones de leonardomso declaran Rust 1.96/edición 2024,
lo que debe contrastarse antes de copiar ejemplos al proyecto.

## Hallazgos de los otros catálogos

- [SkillsMP](https://skillsmp.com/es/creators/pedronauck/skills/skills-mine-rust-best-practices)
  permitió comparar otra opción Rust con respeto explícito a edición/MSRV, pero
  no aportó una clasificación independiente de calidad que supere la adopción de Apollo.
- [SkillHub](https://www.skillhub.club/skills/anthropics-claude-plugins-official-frontend-design)
  declara que su valoración es una evaluación por IA, no un ensayo práctico.
- [hotskills.dev](https://hotskills.dev/skill/actionbook-rust-skills/)
  ofrece estrellas e historial asociado a commits para actionbook; no confundir
  su indicador de actividad con calidad del código producido.
- skills.sh muestra Fail/advertencias automáticas para Taste y advertencias
  Socket/Snyk para impeccable. Son señales de revisión, no demostraciones de
  comportamiento malicioso. Revisar scripts y versión concreta antes de importarlos.
- La antigua [frontend-design de pbakaus](https://skills.sh/pbakaus/impeccable/frontend-design)
  está deprecada: usar impeccable. La frontend-design de Anthropic es otra skill.

## Instalación selectiva de referencia

Comandos documentados, no ejecutados. Reutilizar lo que ya está en la mente antes
de instalar duplicados. Para incorporación central, revisar la carpeta completa
y usar skill_import con procedencia, conforme al protocolo de mente_general.

```sh
npx skills add pbakaus/impeccable --skill impeccable
npx skills add cloudai-x/threejs-skills --skill threejs-shaders threejs-performance
npx skills add apollographql/skills --skill rust-best-practices
```

Sin auditoría integral de scripts ni comparativa práctica de resultados sobre
SKYO. No se modificaron dependencias, configuración de agentes ni aplicación.
