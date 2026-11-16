# SKYO 🌌

> **Explorador astronómico multitemporal y laboratorio científico local-first (SPHEREx / JPL / NASA)**
> Interfaz 3D con estética **Liquid Glass**, bóveda celeste ICRS, asistente **H.E.R.A 7** y procesamiento astrométrico en el navegador.

Explorar abre ahora [Dentro del cielo](inmersivo.html): panorama SPHEREx de 360° con
vuelo visual, zoom, 102 canales, HUD de coordenadas/época/flujo y WebXR.
Los valores de píxel se leen del plano FITS real mediante Worker/Rust, separados
de la apariencia PNG. [Datos, pruebas y límites](docs/VALIDACION_INMERSIVA_20261115.md).
El [plano focal D1–D6](espectral.html) y el laboratorio FITS siguen disponibles.

---

## 📸 Vista de la aplicación

| Inicio minimalista (eclipse 3D + Zoom Warp) | Bóveda Celeste ICRS |
| :---: | :---: |
| ![SKYO Inicio](frontend/assets/img/previews/inicio.png) | ![SKYO Explorar](frontend/assets/img/previews/explorar.png) |

| Sistema Solar 3D | Fases e infrarrojo multitemporal |
| :---: | :---: |
| ![SKYO 3D](frontend/assets/img/previews/sistema3d.png) | ![SKYO Fases](frontend/assets/img/previews/fases.png) |

---

## 🎨 Paleta de campaña

| Token | Color | Uso |
|---|---|---|
| `--obsidian` (`--bg`) | `#000000` | Fondo, lienzo 3D y superficies base |
| `--chrome` / `--chrome-bright` | `#C9CED6` / `#E6E8EC` | Texto, bordes y reflejos metálicos |
| `--crimson` | `#E11D48` | Alertas críticas y vector de movimiento |
| `--sky` (`--ac`) / `--ac2` | `#5BB8FF` / `#B57BFF` | Acento primario (IR Corto) y secundario (IR Largo) |

Los tokens viven en `frontend/assets/css/main.css` y se replican en `frontend/assets/css/lab.css`, `frontend/assets/js/contexto.css`, los iconos SVG y el manifiesto PWA. La documentación ampliada está en [`docs/PALETA.md`](docs/PALETA.md) y [`docs/LAYOUT.md`](docs/LAYOUT.md).

---

## ✨ Características principales

1. **Inicio cinemático (`#inicio`)**
   - Modelo 3D de Heras7 (`assets/models/kryo9.glb`) y cosmos activos automáticamente en la portada, sin pulsar un botón. Si WebGL no está disponible, se conserva la alternativa 2D y la navegación.
   - Campo estelar y nebulosas reactivas al puntero, con pausa automática en reposo.
   - **Warp Zoom**: <kbd>Enter</kbd> o <kbd>Espacio</kbd> lanzan el eclipse hacia la cámara y abren la bóveda celeste.

2. **Bóveda Celeste multitemporal (`#explorar`)**
   - Coordenadas **ICRS**, retícula **HEALPix**, recorte astrométrico y filtros por tipo de cuerpo.
   - Épocas SPHEREx y bandas infrarrojas (IR Corto D1–D3 vs. IR Largo D4–D6).
   - Vistas educativas ilustrativas; las mediciones reales se abren en Laboratorio FITS.
   - Misiones guiadas de H.E.R.A 7, bitácora de candidatos y exportación JSON.

3. **Sistema Solar y Fases (`#3d` / `#fases`)**
   - Órbitas planetarias y cuerpos menores en 3D.
   - Curvas de luz, fases del proyecto y lectura espectral.

4. **Laboratorio FITS local-first (`lab.html` / `#explorar` → Laboratorio)**
   - Pipeline en Web Worker con fallback JavaScript y Rust/WASM opcional.
   - WCS TAN-SIP, máscaras FLAGS, varianza, reproyección y comparación exploratoria.
   - Botón «Cargar M101 real»: dos épocas DR1 y dos recortes con procedencia y hashes.
   - Lugar/Tiempo/Luz, blink manual, vistas A/B/diferencia/SNR, guardado y borrado local.
   - Reporte JSON del par vigente; calibración/PSF y significancia científica pendientes.
   - Contexto HiPS 2MASS de IRSA bajo demanda (`contexto.html`, Aladin Lite 3.8.2).

5. **PWA y accesibilidad**
   - Shell offline por scope, caché por versión y actualización con consentimiento.
   - Navegación por teclado, foco visible, `prefers-reduced-motion` y contraste verificado.

---

## 🚀 Inicio rápido

Requiere Node.js `^20.19.0` o `>=22.12.0` (Vite 7).

```bash
git clone https://github.com/NotMetrx/SKYO.git
cd SKYO
npm ci
npm start
```

Abre `http://127.0.0.1:8000` (o `http://127.0.0.1:4173` con `npm run dev`) para la aplicación principal, o `/lab.html` para el laboratorio FITS.

Para publicar en hosting estático, compila con `npm run web:build` y sirve
`dist/`. El servidor de desarrollo procesa las dependencias de Vite. Los FITS
manuales se procesan localmente; guardarlos en OPFS requiere pulsar Guardar.
Los paquetes curados se descargan solo al solicitarlos, y HiPS requiere conexión.

---

## 🧪 Compilación y pruebas

```bash
npm test                 # sesión, FITS/WCS, datos reales, OPFS y equivalencia WASM
npm run web:build        # Vite + recursos de runtime y Service Worker
npm run validate:build   # verifica dist/, manifiesto y entradas
npm run validate:docs    # verifica spec, plan, tareas y pipeline
npm run preview          # sirve dist/ en 127.0.0.1:4174
```

Pruebas de navegador (Chromium de Playwright):

```bash
npx playwright install chromium --only-shell
npm run test:browser
```

Regresiones recuperadas (también incluidas en npm test):

```bash
npm run test:science-gaps
```

Las cuatro regresiones pasan en la implementación actual. El [informe de
validación](docs/VALIDACION_IMPLEMENTACION_20261114.md) registra 43 pruebas Node,
seis Python, dos Rust, navegador, equivalencia y benchmark WASM. El
[pipeline](docs/pipelines/validacion-local.md) explica cómo repetirlas y regenerar
el kernel opcional con wasm-bindgen. T08 sigue parcial: no hay detección
astronómica validada ni prueba en Android físico. Consulta también los
[criterios científicos](docs/CRITERIOS_CIENTIFICOS_SKYO.md).

---

## 📁 Estructura del proyecto

```text
frontend/                              Aplicación web (SPA, WebGL, PWA y núcleo cliente)
  index.html, lab.html, contexto.html,
  espectral.html, inmersivo.html       Entradas HTML (portal, FITS, HiPS, FPA e inmersivo)
  sw.js, icon.svg                      Service Worker e icono principal
  public/datasets/                     Paquetes NASA curados y manifiesto PWA público
  assets/
    css/                               Estilos Liquid Glass (main.css, lab.css, states.css)
    fonts/                             Space Grotesk, Space Mono, Poppins
    img/, models/                      Assets visuales, H.E.R.A 7 y modelos GLB de Blender
    js/                                SPA (app, cosmos3d, explorar, fases, sistema3d, hera3d)
    js/immersive/, js/science/         Cielo HEALPix/L2, pipeline FITS/WCS, worker y WASM
    js/vendor/                         Three.js y Lottie locales
backend/                               Servicios locales y curación científica
  server/dev-server.mjs                Servidor HTTP/SPA con soporte Range, MIME y montaje /data
  science-core/                        Crate Rust (Cargo) compilado a WebAssembly (skyo_wasm)
  python/                              Curadores IRSA/FPA/HiPS e inspección científica
data/                                  Originales FITS, calibraciones, muestras y manifiestos
docs/                                  Especificación 002, arquitectura, protocolos y evidencias
tests/                                 Suites unitarias (tests/unit/), navegador (E2E) y Python
scripts/                               Build WASM/dist, auditoría visual, generación FITS/Blender
_archivo/                              Material histórico de referencia y respaldos legacy
package.json, vite.config.mjs,
playwright.config.mjs,
AGENTS.md, MEMORY.md                   Configuración raíz, protocolo operativo y memoria
```

---

## 📚 Documentación

- [SPEC principal](docs/SPEC_SKYO_2.1_AUDITADO.md)
- [Constitución del proyecto](docs/constitution.md)
- [Interfaz y UX](docs/INTERFAZ-Y-UX.md)
- [Paleta](docs/PALETA.md) y [layout](docs/LAYOUT.md)
- [Criterios científicos](docs/CRITERIOS_CIENTIFICOS_SKYO.md)
- [Pipeline de validación local](docs/pipelines/validacion-local.md)
- [Validación de implementación T01–T08](docs/VALIDACION_IMPLEMENTACION_20261114.md)
- [Protocolos de auditoría visual](docs/protocols/README.md)
- [Fuentes y procedencia](docs/FUENTES.md)
- [Roadmap](docs/ROADMAP.md)

---

## ⚡ Rendimiento y buenas prácticas

- **Sin polling inútil**: la lógica se activa por eventos (`pointermove`, `keydown`, `hashchange`).
- **Pausa automática**: al ocultar la pestaña, los bucles 3D suspenden CPU/GPU.
- **Accesibilidad**: `prefers-reduced-motion`, foco visible y alternativa no cromática.
- **Autonomía**: Three.js y Lottie se sirven localmente; la app funciona sin CDN.

---

## 📜 Licencia

Distribuido bajo la licencia [MIT](LICENSE).
