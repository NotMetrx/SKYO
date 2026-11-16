# Auditoría de diseño e integración

Base: origin/main e93e106. Auditoría solicitada para imagen, datos, UI/UX,
APIs y tamaños de dispositivos. Evidencia en `evidence/design-audit-20261116/`.

## Hallazgos corregidos

| Hallazgo | Corrección y motivo |
| --- | --- |
| Entrada a Explorar oculta para lectores de pantalla y fuera del orden de tabulación | Enlace nativo «Explorar el cielo», accesible por teclado; conserva la transición existente. |
| Motor 3D inicializado automáticamente en cualquier entrada | Carga bajo demanda en las vistas que lo requieren. Evita ocupar recursos de la portada, el archivo y el laboratorio. |
| Regla CSS `#3d` inválida | Selector por atributo; se recupera la transición sin descartar el grupo de reglas. |
| Controles fuera de pantalla y paneles superpuestos en horizontal 568×320 | Distribución separada, límites de altura y scroll interno; ficha seleccionada acotada al viewport. |
| Cambio de canal antes de cargar el manifiesto produce una excepción | Validación del estado de inicialización antes de modificar canal o escena. |
| Un pellizco dispara una selección al levantar el último dedo | Seguimiento del gesto multipuntero; el clic normal sigue funcionando. |
| Avatar oculto con src vacío solicita la propia página como imagen | Se retira el atributo src al no haber avatar. |

## Método y límites

Se comparó la compilación estática con su código fuente. La matriz visual cubre
inicio, explorar, laboratorio, archivo espectral, inmersivo y contexto en anchos
320, 390, 768 y 1440: 24 combinaciones. Los controles de pestañas fuera del área
visible pertenecen a una barra desplazable; no se clasifican como desbordamiento
del documento. Se añadieron regresiones para gesto táctil, carga inicial lenta
y pantallas horizontales de 844×390 y 568×320.

Las pruebas de datos comprueban integridad de FITS, WCS contra las referencias
Astropy preservadas, máscaras uint32, límites de entrada, procedencia y equivalencia
WASM/JS. No se modificaron FITS, calibraciones ni la condición scienceReady=false.
Los datos sintéticos de tests y las respuestas de API controladas se distinguen
de las consultas reales. El endpoint de propiedades HiPS respondió 200; la
consulta TAP real agotó su plazo de 10 segundos durante esta sesión.

Se adaptó la prueba de portada al flujo actual: el test anterior buscaba un botón
KRYO-9 ya eliminado y creaba un navegador sin baseURL para navegar a una ruta
relativa. La nueva prueba comprueba entrada por teclado, carga del cielo, regreso
y anchura móvil en raíz y /skyo/; no acredita el modelo GLTF con ese recorrido.

La ejecución inicial de audit-visual.mjs se detuvo por timeout. La matriz posterior
se capturó tras corregir la carga 3D de la portada. La batería final y sus fallos,
si los hay, quedan registrados en el recibo de cierre; no se deduce ausencia de
fallos a partir de capturas solamente.

No se ha recibido la URL de producción ni hay homepage/deployments registrados
por GitHub. El envío a main y la verificación del sitio publicado son etapas
diferentes. Chromium emulado no certifica dispositivos físicos, Safari o WebXR.

## Recuperación del cielo detectada durante las regresiones

La batería reprodujo un estado de 10/12 teselas base sin imagen completa. El
límite de descarga también abarcaba la decodificación y las teselas canceladas
podían quedar sin recuperación. Ahora el temporizador termina al recibir los
bytes, se permite un reintento de timeout para teselas actuales y visibles, y
el primer panorama muestra sus partes válidas progresivamente. Se mantienen
hashes, límites de tamaño, validación de edición y descarte de peticiones de
otra selección. No se reintentan indefinidamente recursos que fallen.

La regresión unitaria provoca un primer timeout y exige recuperar las doce
partes en trece solicitudes; también exige que el panorama parcial sea visible.
Los siete recorridos focales de portada, inmersión y carga lenta pasan en la
compilación corregida, incluidos los dos tamaños horizontales. La batería
completa se ejecuta después de esos cambios.

## Criterios de revisión visual

Se contrastaron las correcciones con `ui-ux-pro-max` y su referencia web:
semántica y foco del acceso principal, ausencia de superposiciones, navegación
por teclado, límites de pantalla y carga progresiva. Las recomendaciones nativas
de iOS/Android no se trataron como certificación de esta aplicación web. No se
cambió la paleta ni se añadieron dependencias o un framework de interfaz.

## Estado de publicación

El repositorio no identifica la URL del hosting: homepage, deployments, estados
/checks de GitHub y lista de Sites conectados están vacíos. Se solicitó la URL al
usuario. Por ello, subir a main no se declara como comprobación del despliegue
público. El informe conserva por separado compilación, tests y publicación.

El primer recorrido L2 integrado esperaba todas las imágenes en solo cinco
segundos, aunque el visor ya mostraba el panorama parcial. Se unifica su espera
con el presupuesto de 45 segundos de las otras pruebas de carga, manteniendo la
exigencia de doce teselas y la posterior transición a observación L2.

## Puerta de publicación pendiente

No se publica automáticamente en producción mientras queden regresiones abiertas.
El recorrido integrado L2 agotó también la espera posterior de transición, aunque
las doce teselas ya habían cargado. El laboratorio integrado no habilitó el informe
dentro del tiempo de prueba en los recorridos offline raíz/subruta. No se atribuyen
estos síntomas exclusivamente a la máquina ni se declaran corregidos.
Se conserva la entrega en una rama de auditoría, sin sustituir main, para permitir
continuar el diagnóstico de esos recorridos antes del despliegue. La prueba de
navegación que buscaba un control retirado se adaptó, pero debe repetirse con el
archivo actualizado para validar su resultado final.

## Actualización 2026-11-16: la portada conserva el modelo 3D

La decisión de cargar Three.js bajo demanda queda revisada: la portada mantiene el
modelo 3D (cielo, eclipse y Heras7) porque forma parte de la identidad del producto.
`navigate()` inicializa el motor en `inicio`, `3d`, `fases` y `nosotros`; Explorar y
el laboratorio siguen cargándolo bajo demanda cuando corresponde. La prueba de
integración de portada ahora exige el lienzo `#cosmos` dimensionado y `window.THREE`
disponible, en lugar de prohibir su carga. El resto de hallazgos de esta auditoría
no cambia y las regresiones abiertas de L2, laboratorio offline y exportación
siguen pendientes de diagnóstico.
