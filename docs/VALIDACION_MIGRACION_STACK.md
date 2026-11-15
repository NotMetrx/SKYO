# Validación de migración del frontend

Fecha: 2026-11-14. Actor: codex. Base remota: `2bb7e1e`.

## Alcance y límite

El usuario autorizó completar los puntos 1–4 de la migración y detenerse antes de T01.
Se conserva el diseño del frontend incorporado y el carácter local-first.
T01–T08 no se toman ni cierran por esta entrega. Las puertas I/V/C siguen sin aceptación.

## Implementación

- Vite 7.3.8, lockfile y entradas index.html, lab.html y contexto.html.
- Worker ES compilado y ruta opcional WASM coherente con science-core/.
- Three.js solo se carga al activar la vista ilustrativa o entrar en 3D;
  el bucle se detiene al abandonar la vista activa o esconder la pestaña.
- Aladin Lite 3.8.2, importación diferida y contexto 2MASS separado de épocas FITS.
  El iframe se descarga al salir para liberar su actividad; HiPS requiere red.
- Manifiesto relativo a la raíz de publicación y licencias incluidas en dist/licenses/.
- Precaché basado en archivos reales del build; caché separada por scope y versión.
  Three.js/Aladin se guardan al solicitarlos. FITS sintéticos se guardan solo tras
  una petición explícita del visitante. No se cachean datos NASA externos.
- La actualización pide guardar el trabajo y pulsar Actualizar antes de recargar.
- Vary: Origin se normaliza solo para archivos estáticos propios incluidos en las
  listas del build y los dos FITS sintéticos; no hay ignoreVary global ni caché de API.

## Comandos y resultados

Resultados ejecutados en Node 24.21.0 y Chromium headless 159 mediante Playwright 1.65.1:

| Comprobación | Resultado |
| --- | --- |
| npm ci --ignore-scripts | Pasa; dependencias fijadas |
| npm test | 8/8 sintéticas aprobadas |
| npm run web:build | Pasa; 29 recursos precache; kernel científico JavaScript |
| validate:build y validate:docs | Pasan; recursos, manifiesto, referencias y RF verificados |
| Demo → Worker → comparación → export → recarga offline | Pasa en / y /skyo/, con Vary: Origin |
| Manifiesto/iconos y CDP Page.getInstallabilityErrors | Sin errores en / y /skyo/; no implica instalación en dispositivo físico |
| Actualización con trabajo abierto | Espera al usuario, recarga al pulsar Actualizar y conserva cachés ajenas |
| Aladin real + Three.js y pausa | Pasa en WebGL2 por software; imagen 2MASS renderizada y RAF detenido al salir de 3D |
| Navegación y controles | Teclado y 1440/768/390/360 px; axe en Inicio y controles propios de lab/contexto. Sin prueba con lector de pantalla |
| test:science-gaps | Sale con código1: 1 prueba pasa y 3 fallan, pendientes T03/T04 |

Las capturas/trazas completas están en test-results/. El [resumen consolidado](evidence/migracion-stack-20261114/summary.json) registra 11 comprobaciones de navegador aprobadas. Los JSON seleccionados y la
captura de [Aladin con 2MASS](evidence/migracion-stack-20261114/aladin-2mass.png) están en
[la carpeta de evidencia](evidence/migracion-stack-20261114/). Las ejecuciones se realizaron
por grupos: interfaz, gráficos, offline, PWA y actualización. El reporte PWA inicial conserva
un fallo de sincronización de la prueba durante la recarga; la repetición browser-update.json
pasa tras esperar la navegación. Esto no se presenta como éxito de aquella primera ejecución.
Se conservaron los cambios concurrentes de paleta, iconos e imagen de H.E.R.A del espacio de trabajo.
No hay un baseline visual aprobado: las capturas documentan el estado, no certifican equivalencia visual.

## Regresiones científicas recuperadas

Las cuatro comprobaciones antes ausentes se ejecutan contra assets/js/science/ mediante
`npm run test:science-gaps`. Resultado inicial: 1 aprobada, 3 fallidas:

| Comprobación | Resultado | Trabajo posterior |
| --- | --- | --- |
| Propagación de varianza bilineal con pesos cuadrados | Pasa | Conservar regresión |
| FLAGS/BZERO sin pérdida por Float32 | Falla: decodeFlags32 no exportado | T03 |
| Ajuste de plano robusto | Falla: robustBackgroundPlane no exportado | T04 |
| Resta de ZODI y modelo de fondo explícito | Falla: background ausente | T04 |

El motor vigente tiene menos funciones que el laboratorio histórico web/. Sus antiguas
12 pruebas no se atribuyen a este frontend. Las 8 comprobaciones actuales y las 4
recuperadas se reportan por separado, incluyendo los fallos. No se han corregido aquí
algoritmos, procedencia, selección ni export obsoleto, que pertenecen a T01–T04.

## Fuentes de integración

- [API oficial Aladin](https://cds-astro.github.io/aladin-lite/Aladin.html).
- [Código y documentación oficial](https://github.com/cds-astro/aladin-lite).
- Paquete npm aladin-lite 3.8.2: se conservan LICENSE, COPYING, COPYING.LESSER y README.
  La metadata del paquete indica GPL-3 y LICENSE contiene LGPLv3; se preservan los textos originales.
- [Estado de los servicios CDS](https://aladin.cds.unistra.fr/): la disponibilidad de mosaicos/nombres externos es independiente del shell local.

## Pendientes de aceptación

Sin validación de datos reales, astrometría absoluta, detección astronómica, equivalencia
JS/WASM ni Android físico. La compilación del shell no demuestra ninguno de esos puntos.
Próximo paso: avisar al usuario y detenerse antes de T01 (t-5aa0315b2f01).
