# SKYO

Explorador astronómico multitemporal (SPHEREx / JPL) con bóveda ICRS 3D, laboratorio FITS local y asistente H.E.R.A 7.

## Estructura
```
index.html, lab.html   Entradas (SPA principal y laboratorio FITS)
sw.js                  Service worker (en raíz por su alcance)
assets/
  css/  fonts/  img/   Estilos, tipografías, imágenes y Lottie
  js/                  app, cosmos3d, explorar, fases, sistema3d, hera3d, data
  js/science/          Pipeline FITS/WCS y wasm
  js/vendor/           three.js, lottie (locales)
science-core/          Crate Rust → WASM
scripts/               Servidor dev, generadores y pruebas
data/                  Muestras FITS y manifiestos
docs/                  Arquitectura, spec, roadmap, H.E.R.A 7
_archivo/              Material ajeno o legado, fuera del flujo (legacy/, ajeno/)
memories.md, history.md  Registro de cambios y reglas imprescindibles
```

## Uso
`npm start` (o `python3 -m http.server 8000`) y abrir `http://127.0.0.1:8000`.
