# Consulta de imágenes mediante clic

El visor independiente y su mismo motor utilizado por Explorar incorporan una
ficha flotante para el punto pulsado. Un clic o toque breve selecciona; arrastrar
sigue moviendo la cámara. El botón «Consultar punto bajo la retícula» y Enter
con foco en el cielo ofrecen la misma acción por teclado. Escape o cerrar retiran
la ficha. Un marcador sigue la posición celeste fija al mover la cámara.

La ficha muestra RA/Dec ICRS, canal/detector, longitud de onda nominal o real,
ancho de banda L2 cuando existe, flujo físico, píxel base 0, fecha o intervalo
del mosaico y SHA256. Para L2 también identifica observación, release y versión.
Abre el FITS de origen, copia coordenadas y guarda JSON del punto fijado. Es
independiente de la lectura y exportación continua de la retícula; no sustituye
las fechas del mosaico por una exposición ni interpreta el brillo PNG como flujo.

Las lecturas usan los mismos Worker/Rust, geometría y FITS ya verificados. Si
el plano del clic aún falta, se consulta por rango. El clic cancela el temporizador
anterior de lectura automática y conserva prioridad hasta completar o fallar.
Un error libera esa espera sin inventar valores ni modificar posteriormente el
reporte fijado. Cambiar canal, aplicar otra edición o volver al origen limpia la
selección. La lectura manual de la retícula informa si sustituye una pendiente.

## Alcance comprobado

- Compilación aislada del visor con Vite: correcta, sin cambiar dependencias.
- Node focales: 13/13, sin omitidas, en
  `evidence/immersive-click-20261115/node-focused.txt`.
- Navegador aislado: 4/4 sin omitidas/reintentos: clic raíz/subruta, fijación y
  exportación numérica real, copia, teclado, canal vacío, liberación tras error,
  carrera con temporizador anterior y consulta de observación L2 real.
  Recibo: `evidence/immersive-click-20261115/browser-final.json`.
- Revisión independiente corrigió la carrera del temporizador, espera después
  de fallo y altura insuficiente en 800×600. Sin importantes/críticos restantes.
- Accesibilidad de la ficha y diseño en pantalla baja: repetición en
  `evidence/immersive-click-20261115/browser-accessible.json`.

Se usa red controlada con archivos FITS originales reales. No se acredita una
nueva consulta remota exitosa, hardware VR/móvil físico ni funciones completas
de espectrofotometría/catálogos/HDU del sitio IRSA. El clic conserva el mecanismo
XR existente, pero esta ficha HTML no es un nuevo panel dentro del visor VR.

## Integración pendiente por fusión externa

Mientras se implementaba apareció una fusión Git en el checkout compartido:
`index.html`, `assets/js/app.js`, CSS y otros archivos contienen marcadores de
conflicto. El build global y `npm test` fallaron al encontrarlos; las salidas de
Node se conservan en `evidence/immersive-click-20261115/node-final.txt`.
No se resolvieron ni sobrescribieron esas decisiones de otra sesión. Se consultó
al usuario si la está resolviendo Agy; la compilación aislada permitió verificar
la función en el visor. Falta repetir build/validación global y entrada integrada
cuando termine la fusión. No presentar el sitio completo como validado.

Fuente de la interacción: [IRSA: lectura y click lock de píxeles](https://irsa.ipac.caltech.edu/onlinehelp/spherex/spherex/visualization.html).
