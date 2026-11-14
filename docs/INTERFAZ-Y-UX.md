# Interfaz y experiencia de usuario

## Flujo

1. **Pantalla de carga.** El logo SKYO al centro y un subtítulo pequeño elegido al azar en cada carga («Atrévete a explorar», «Ve a lo desconocido», «¿Realmente estamos solos?», entre otros).
2. **Inicio.** Logo grande, constelaciones animadas de fondo y dos acciones: _Comenzar a explorar_ y _Ver en 3D_.
3. **Explorar.** Galaxia interactiva. Filtros: Todos, Estrellas, Cometas, Asteroides. Al tocar un objeto se abre una ficha con miniatura, tipo, nombre y datos.
4. **3D.** Sistema solar con cometa y cinturón de asteroides; cámara libre y enfoques (Sistema, Cometa, Cinturón).

## Navegación

- **Computador:** 3 botones arriba a la derecha y la marca SKYO a la izquierda.
- **Móvil (≤ 720 px):** barra inferior con icono y texto.
- **Enlaces directos:** `#inicio`, `#explorar`, `#3d`.

## Sistema visual

| Elemento | Decisión |
|---|---|
| Tema | Oscuro, acorde con el logo y el espacio |
| Acento | Azul (`--ac`), con naranja de apoyo tomado del traje de H.E.R.A 7 |
| Tipografía | Poppins |
| Superficies | Paneles translúcidos con desenfoque |

Los colores están como variables CSS al inicio de `skyo.html`.

## Responsive

- La barra de secciones cambia de lugar según el ancho.
- Las fichas pasan a ser una hoja inferior en móvil.
- H.E.R.A 7 se ubica abajo a la derecha en computador y arriba a la derecha en móvil, para no tapar los controles.
- Márgenes seguros para pantallas con muesca.

## Accesibilidad

- Navegación con teclado y foco visible.
- `prefers-reduced-motion`: se desactivan animaciones y la rotación automática.
- Botones con etiqueta accesible; imágenes con texto alternativo.

Pendientes: texto alternativo y descripción por voz de los objetos del mapa, y contraste verificado con herramientas automáticas.

## Pruebas recomendadas

- Celular de gama media con conexión lenta.
- Pantallas de 360, 390 y 768 px de ancho.
- Navegadores: Chrome, Safari y Firefox.
