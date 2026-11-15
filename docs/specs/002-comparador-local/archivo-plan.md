# Archivo e inspector simplificados

2026-11-15. Ampliación local autorizada por el usuario sobre el
[inventario IRSA](../../REPLICA_FUNCIONAL_IRSA_SPHEREX.md). Registro central
`t-e7004c435816`, pendiente sin claim/finish ni aprobación automática.

## Decisión y alcance

Se amplía `espectral.html`, accesible desde el cielo inmersivo. Se conserva el
FPA existente. Una búsqueda ofrece tabla de observaciones y huellas ICRS de los
resultados; una fila o una huella abre el mismo inspector. No se representa
una cobertura global inexistente ni se estiman polígonos ausentes.

El inspector tiene contraste automático con dos alternativas de luminosidad,
resaltado de calidad cuando hay FLAGS compatibles y regla angular cuando existe
WCS ICRS TAN/TAN-SIP. En «Detalles del archivo» se agrupan HDU, plano de cubo y
tarjetas originales de cabecera, incluidas HISTORY/COMMENT. También acepta FITS
locales sin subirlos a ningún servicio.

Se omite RGB: el conjunto de seis previews no dispone de registro WCS ni
garantiza campos coincidentes. El comparador del laboratorio mantiene su
reproyección WCS automática, accesible mediante enlace; no se añade configuración
manual de alineación ni se afirma implementar un nuevo comparador RGB.

## Integración y responsabilidades

Codex implementa sin delegación adicional:

- `espectral.html`, `fpa.js`, `archive.css`: tabla, huellas, selección y acceso.
- `fits-inspector.js`: diálogo nativo, foco/teclado, contraste, máscara y regla.
- `science/fits.js`: inventario compartido y lectura de un plano; el parser del
  laboratorio conserva su contrato 2D y sus límites anteriores.
- `science/archive-data.js`, `render.js`: geometría, calidad y render exploratorio.
- `science/fpa-worker.js`: reutiliza cola/descarga/hash; retiene un solo FITS para
  inspección, cancela sustituciones y rechaza respuestas de otra selección.
- `inmersivo.html`: enlace «Archivo e inspector FITS».
- `index.html`, `lab.html`, `public/manifest.webmanifest`, `validate-build.mjs`:
  corregir la referencia PWA detectada por la batería, preservando identidad e
  iconos y comprobando el manifiesto efectivamente enlazado en raíz/subruta.
- `scripts/archive.test.mjs`, pruebas de navegador y `package.json`: verificación.
  La prueba inmersiva de lectura pendiente toma como base el trabajo ya iniciado
  al seleccionar, en lugar de asumir que su temporizador todavía no se disparó.

RF relacionados: 01/02/03/04/07/08/09/13/16/19/20. No modifica los requisitos de
calibración científica ni el estado `scienceReady=false`.

## Límites y criterios de aceptación

1. La selección enlaza fila, huella y archivo. Los recortes remotos usan IBE
   0.25°; DETECTOR/OBSID deben coincidir antes de mostrarlos. Se informa límite
   de resultados/OVERFLOW, cancelación y fallos IRSA.
2. Máximo 96 MB por archivo y 2048 por eje del plano mostrado; se lee un único
   plano, con BSCALE/BZERO/BLANK y FLAGS uint32 preservados. Tablas, extensiones
   comprimidas y geometrías no admitidas muestran su límite/cabecera.
3. No se modifica ningún FITS original. Contraste y marcas son visuales. La
   máscara usa las definiciones reales del archivo; no elimina SOURCE.
4. Regla con distancia esférica, cruce de RA y polos comprobados. Sin WCS
   compatible queda deshabilitada, con explicación. Teclado: flechas y Enter.
5. Cierre/sustitución invalida respuestas anteriores. Accesibilidad, foco,
   raíz/subruta y ausencia de desborde en móvil se prueban en Chromium.
6. `npm test`, build y validadores locales; pruebas de navegador focales. Si
   otra sesión introduce conflictos en la página principal, registrar el fallo
   global y validar estas entradas en un build aislado sin modificar la fusión.

No se añaden dependencias, cuentas, jobs remotos, fotometría, detecciones ni
afirmaciones de validación Android/VR. Evidencia de cierre en
`docs/evidence/archivo-simple-20261115/`.
