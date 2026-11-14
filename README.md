# SKYO 🌌

> **Explorador astronómico multitemporal y laboratorio científico local-first (SPHEREx / JPL / NASA)**  
> Interfaz interactiva 3D con estética **Liquid Glass**, bóveda celeste ICRS, asistente **H.E.R.A 7** y motor de procesamiento astrométrico en el navegador.

---

## 📸 Vista de la Aplicación

| Inicio Minimalista (Cosmos 3D + Zoom Warp) | Bóveda Celeste ICRS (Retícula + Misiones + H.E.R.A 7) |
| :---: | :---: |
| ![SKYO Inicio](assets/img/previews/inicio.png) | ![SKYO Explorar](assets/img/previews/explorar.png) |

| Sistema Solar 3D | Fases e Infrarrojo Multitemporal |
| :---: | :---: |
| ![SKYO 3D](assets/img/previews/sistema3d.png) | ![SKYO Fases](assets/img/previews/fases.png) |

---

## ✨ Características Principales

1. **Pantalla de Inicio Cinemática (`#inicio`)**
   - Wordmark tipográfico de alta fidelidad con eclipse solar, corona respiratoria y destello de diamante.
   - Espacio 3D interactivo con constelaciones reales y efecto paralaje LERP suave sin consumo en reposo.
   - **Transición Warp Zoom**: Al presionar <kbd>ENTER</kbd> o la <kbd>BARRA ESPACIADORA</kbd>, la cámara WebGL se proyecta hacia adelante adentrándote en el espacio y transportándote suavemente a la bóveda celeste.

2. **Bóveda Celeste Multitemporal (`#explorar`)**
   - Ventana astronómica profunda en coordenadas **ICRS** con retícula esférica **HEALPix**.
   - Selector multitemporal de épocas (Época 1 a Época 4) y bandas infrarrojas (IR Corto D1–D3 vs. IR Largo D4–D6).
   - **Herramienta Parpadear Épocas (Blink)**: Alterna rápidamente entre dos épocas para localizar asteroides, cometas o transitorios por movimiento propio.
   - **Asistente H.E.R.A 7**: Modelo interactivo 3D con casco reflectante y visor dinámico que propone retos de aula, da pistas guiadas y explica la física del fenómeno.

3. **Sistema Solar y Fases (`#3d` / `#fases`)**
   - Explorador de órbitas planetarias y cuerpos menores en 3D acelerado por GPU.
   - Comparador espectral y curvas de luz multitemporales.

4. **Laboratorio Científico FITS Local-First (`lab.html`)**
   - Pipeline de procesamiento astrométrico ejecutado 100% en el dispositivo del usuario mediante Web Workers y Rust/WASM.
   - Soporte para proyección astronómica TAN-SIP WCS, calibración de fondo, decodificación de flags de calidad de píxel y cálculo de varianza de ruido.
   - Funcionalidad PWA con Service Worker para operación totalmente offline.

5. **Diseño Líquido (Liquid Glass)**
   - Paneles translúcidos con desenfoque de fondo dinámico (`backdrop-filter`), destellos especulares y paleta adaptada para sesiones de observación nocturna sobre negro absoluto (`#000000`).

---

## 🚀 Inicio Rápido (Cero Configuración)

No necesitas instalar herramientas pesadas. El proyecto está empaquetado con librerías nativas locales y rutas 100% relativas para funcionar en cualquier computadora (Linux, macOS, Windows).

### Opción 1: Con Node.js (Recomendado)
```bash
# 1. Clonar el repositorio
git clone https://github.com/NotMetrx/SKYO.git
cd SKYO

# 2. Iniciar el servidor local
npm start
```
Abre en tu navegador:
- **Aplicación principal**: [http://localhost:8000/](http://localhost:8000/)
- **Laboratorio FITS**: [http://localhost:8000/lab.html](http://localhost:8000/lab.html)

### Opción 2: Con Python
```bash
python3 -m http.server 8000
```
Y abre `http://localhost:8000` en tu navegador.

### Opción 3: VS Code Live Server u otros servidores estáticos
Abre la carpeta del proyecto en VS Code y haz clic en **"Go Live"** sobre `index.html`.

---

## 🧪 Pruebas del Pipeline Científico

El proyecto incluye una suite de pruebas automatizadas para verificar la precisión del cálculo astrométrico y la reproyección WCS:

```bash
npm test
```

Salida esperada:
```text
✔ FITS MEF: IMAGE/FLAGS/VARIANCE/ZODI con datos originales
✔ WCS TAN-SIP respeta transformacion ida/vuelta subpixel
✔ mascaras decodifican banderas de mala calidad sin eliminar SOURCE
✔ el motor reproyecta B usando WCS de A
✔ calculo de diferencia con varianza y filtro de datos nulos
✔ pipeline extremo a extremo sintético mantiene calificativo exploratorio
✔ sin longitud de onda calibrada se rechaza validar compatibilidad
✔ bloquea comparaciones con filtros realmente incompatibles
ℹ tests 8, pass 8, fail 0
```

---

## 📁 Estructura del Proyecto

Organización limpia, idiomática y libre de dependencias superfluas:

```text
SKYO/
├── index.html                 # Punto de entrada principal (SPA con Cosmos 3D)
├── lab.html                   # Laboratorio científico de comparación FITS
├── sw.js                      # Service Worker para ejecución offline (PWA)
├── package.json               # Metadatos del proyecto y scripts npm
├── LICENSE                    # Licencia MIT
├── README.md                  # Documentación visual y guía de uso
├── assets/
│   ├── css/                   # Estilos Liquid Glass (main.css, lab.css)
│   ├── fonts/                 # Tipografías Space Grotesk, Space Mono, Poppins
│   ├── img/                   # Texturas, astronauta H.E.R.A 7 y capturas preview
│   └── js/
│       ├── app.js             # Enrutador reactivo SPA y teclado (Enter/Espacio)
│       ├── cosmos3d.js        # Motor de Three.js para la bóveda celeste y warp zoom
│       ├── explorar.js        # Retícula ICRS, blink comparator y retos de aula
│       ├── sistema3d.js       # Simulación 3D del Sistema Solar
│       ├── fases.js           # Visor de curvas de luz y fases espectrales
│       ├── hera3d.js          # Asistente interactivo H.E.R.A 7 en 3D
│       ├── science/           # Pipeline astrométrico (FITS, WCS, worker, render)
│       └── vendor/            # Three.js y Lottie locales (cero peticiones externas)
├── data/
│   ├── sample-fits/           # Archivos FITS de demostración para comparación
│   └── manifests/             # Manifiesto web para instalación PWA
├── science-core/              # Crate en Rust para aceleración WebAssembly (WASM)
├── scripts/                   # Servidor de desarrollo nativo y pruebas de pipeline
├── docs/                      # Especificaciones, arquitectura y auditoría técnica
└── _archivo/                  # Archivo histórico y recursos complementarios
```

---

## ⚡ Rendimiento y Buenas Prácticas (Filosofía Ponytail)

- **Cero Polling Inútil**: Sin temporizadores `setInterval` en segundo plano que drenen la batería de portátiles. Toda la lógica se activa por eventos del usuario (`pointermove`, `keydown`, `hashchange`).
- **Pausa Automática**: Si minimizas la pestaña o cambias de ventana (`document.hidden`), los bucles de renderizado 3D entran en suspensión profunda liberando CPU y GPU.
- **Accesibilidad**: Respeta estrictamente la preferencia del sistema `prefers-reduced-motion` desactivando zooms bruscos para usuarios sensibles.
- **Autonomía Total**: Los archivos esenciales de Three.js y Lottie están alojados en local, permitiendo que la aplicación funcione en entornos aislados o sin conexión a internet.

---

## 📜 Licencia

Distribuido bajo la licencia [MIT](LICENSE).
