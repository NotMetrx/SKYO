# history — Lo que SÍ O SÍ se debe recordar (consultar en cada interacción)

- Filosofía Ponytail: cero polling, render por eventos, pausa con `document.hidden`, `prefers-reduced-motion`, código mínimo.
- Fondo siempre negro `#000000`; Wayland nativo. Paleta oficial en `docs/PALETA.md` (usar solo variables CSS). Acento secundario MORADO `#b57bff` (no naranja). Maqueta en `docs/LAYOUT.md`.
- Idioma: español. Enlaces `file://` clicables al citar archivos.
- Proyecto: `/home/emi/Documentos/SKYO` (SPA `#inicio`, `#explorar`, `#3d`, `#fases`). Servidor: `python3 -m http.server 8000 -d /home/emi/Documentos/SKYO`.
- H.E.R.A 7: el usuario RECHAZÓ el astronauta vintage de primitivas. Usar SIEMPRE la imagen real `hera.webp` con 3D solo en las partes más visibles (casco/visor/torso). No rediseñarlo.
- Prohibido: página estática, estilo no humano.
- Obligatorio: cada cambio se apunta en `memories.md`; leer `memories.md` y `history.md` al inicio de cada petición.
- Estructura: raíz mínima; lo ajeno/legado vive en `_archivo/` (no borrar sin permiso). Ver README.md.
- `#inicio` minimalista: solo wordmark **SKYO** con modelo 3D del eclipse (`assets/models/eclipse.glb`) en la `O`; `Enter` y `Espacio` avanzan a `#explorar` haciendo volar el eclipse 3D hacia el frente y ocultándolo al terminar.
- `#explorar` simplificado: sin botones redundantes (`#modebar`, `#scale-pill`, `#stage-tabs`, `#meses`); conserva vista/filtro/misión/épocas/banda/blink/comparar y `Bitácora`.
- `#nav` mantiene solo 3 botones (`Explorar`, `3D`, `Fases`). Todos los paneles usan estética Liquid Glass.
- H.E.R.A 7 sin acceso rápido por botones (`#hc`) y nunca visible en `#inicio`.
