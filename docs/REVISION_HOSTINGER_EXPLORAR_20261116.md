# Revisión de Explorar en Hostinger — 2026-11-16

URL: https://ghostwhite-panther-667811.hostingersite.com/#explorar
Build observado: `62733fd1ce84de64`, entrada `assets/main-BAK_bWp1.js`.

## Cielo negro: causa reproducida

La interfaz carga sin errores JavaScript, pero muestra `0/12 base` y fallo de
tesela. Hostinger entrega un PNG válido con bytes distintos del original
verificado por el manifiesto. Muestra `Npix0_62.png`:

| Dato | Repositorio / manifiesto | Producción |
| --- | --- | --- |
| Tamaño | 84624 bytes | 49465 bytes |
| SHA-256 | `a857dd2f7d1b64c8eee0772d511421d772cc9b3cd388f5cd0331c0c4d2d20e6e` | `cb50e1ae0ef8c5fc16c1aae048fd2ffe9c7ae577695eb1540ed9e32fb0f413f4` |
| SHA-256 RGBA decodificado | `c2106bf5fe3afaf08310fcc8ac9ed817f9d8f1d9e82eea919c7c1e08040aad12` | idéntico |

Es recompresión sin cambio de los píxeles en esta muestra. La validación
SHA-256 rechaza correctamente el archivo modificado. HTTP 200 no prueba que
se hayan conservado los bytes. Una consulta con parámetro nuevo reprodujo el
mismo hash distinto; un refresh simple no restituye el original.

En una prueba controlada sobre el sitio público, interceptando únicamente las
12 teselas base con los PNG originales y bloqueando el Service Worker del
contexto de prueba para permitir esa interceptación, el visor pasó a `12/12`,
mostró el cielo y leyó `12.0051 MJy/sr`. El laboratorio comparó la demo y habilitó
el informe. No se cambió el sitio remoto ni se desactivó su comprobación SHA.

## Corrección de publicación

`postbuild.mjs` verifica el SHA original y publica las teselas base como
`Npix*_62.png.bin`, actualizando solo los nombres del manifiesto de `dist`.
Así se sirven como datos binarios y no como imágenes elegibles para recompresión.
El contenido sigue siendo PNG y el visor existente lo decodifica desde Blob.
Los hashes, los bytes, el canal, la edición y las fuentes no cambian. Los PNG
del repositorio y todos los FITS permanecen intactos. Las teselas binarias
conservan el tratamiento de caché runtime de datasets; el Service Worker recibe
una nueva versión por los hashes de los recursos publicados.

`validate:build` comprueba los 12 archivos binarios contra los hashes del
manifiesto fuente y su inclusión en caché runtime. La prueba falló antes de
modificar el empaquetado y pasó con la corrección. `npm run web:build` genera
un `dist` listo para desplegar; no sirve subir únicamente el JavaScript.

En el despliegue hay que sustituir también el manifiesto y los datos. Una PWA
abierta debe aceptar la actualización habitual y recargar; se conserva el flujo
consentido, sin borrar trabajo local ni originales.

## Problema independiente: IRSA

La consulta TAP de observaciones devolvió HTTP 502 sin
`Access-Control-Allow-Origin`. El navegador lo muestra como error CORS. Es
independiente de las teselas locales y afecta publicaciones/observaciones
remotas. No se ha cambiado a un proxy abierto ni se han inventado resultados.
La disponibilidad de IRSA debe comprobarse por separado al reintentar.

## Alcance y fuentes

Revisión de escritorio1440×900 y móvil390×844. Los paneles móviles tienen
scroll interno; la captura por sí sola no acredita que un botón sea inaccesible.
No se modifica el modelo 3D de la portada. La prueba con originales no equivale
a un despliegue real de la corrección ni valida rendimiento de hardware.

Hostinger documenta [optimización automática no configurable en dominios
hostingersite.com](https://www.hostinger.com/support/which-plans-include-hostinger-cdn/)
y sus [herramientas de recompresión PNG](https://www.hostinger.com/support/3738441-what-image-optimization-tools-are-supported-at-hostinger/).
Evidencia de la revisión en el workspace principal:
`docs/evidence/hostinger-explorar-20261116/{initial,controlled}.json` y capturas
`desktop.png`, `mobile.png`, `controlled-originals.png`.

## Validación de la corrección

- `npm test`:65/65, cero omitidas; `test:science-gaps`:4/4.
- `web:build`, `validate:build` y `validate:docs`:aprobados.
- Playwright inmersivo:3/3, raíz/subruta con12/12 teselas, flujo de fixture NASA,
  canales/export y móvil390×844. El servidor local las entrega como octet-stream,
  por lo que se comprueba la decodificación PNG desde la ruta binaria.
- No se ejecutó la batería completa de navegador ni hardware Android/VR.
  Falta desplegar el build y comprobar que Hostinger entregue los binarios sin
  transformación. La disponibilidad de TAP/IRSA sigue siendo independiente.
