# SKYO

Explorador astronómico multitemporal (SPHEREx / JPL) con bóveda ICRS 3D, interfaz Liquid Glass, laboratorio FITS local-first y asistente H.E.R.A 7.

## Estructura del Proyecto
```text
index.html, lab.html   Entradas (SPA principal con cosmos 3D y laboratorio FITS)
sw.js                  Service Worker (shell offline)
assets/
  css/                 Estilos Liquid Glass (main.css, lab.css)
  fonts/               Tipografías Space Grotesk, Space Mono, Poppins
  img/                 Assets visuales, WebP y Lottie
  js/                  Controladores SPA (app, cosmos3d, explorar, fases, sistema3d, hera3d, data)
  js/science/          Pipeline científico FITS/WCS, render y puente WASM
  js/vendor/           Librerías locales (three.js, lottie)
science-core/          Crate Rust para aceleración WASM del pipeline
scripts/               Servidor dev, generadores y suites de pruebas
data/                  Muestras FITS y manifiestos
docs/                  Arquitectura, auditoría, criterios científicos, especificaciones y roadmap
_archivo/              Archivos legacy y referencias archivadas
memories.md, history.md  Registro de memoria activa y directrices del proyecto
```

## Ejecución y Pruebas
Requiere Node.js 20+.

```bash
# Iniciar servidor de desarrollo
npm start

# Ejecutar suite de pruebas del pipeline científico
npm test
```

Abre `http://127.0.0.1:8000` para la aplicación principal o `http://127.0.0.1:8000/lab.html` para el laboratorio FITS directo.

## Documentación y Auditoría
- [Auditoría del SPEC y acceso NASA/IRSA](docs/AUDITORIA_SPEC_2026-11-13.md)
- [Criterios científicos](docs/CRITERIOS_CIENTIFICOS_SKYO.md)
- [Implementación y arquitectura](docs/IMPLEMENTACION_EN_SKYO.md)
- [Roadmap](docs/ROADMAP.md)
