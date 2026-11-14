# Hoja de ruta

## Fases

| Fase | Objetivo | Resultado esperado |
|---|---|---|
| **0. Prototipo** (hecho) | Interfaz con Inicio, Explorar, 3D y H.E.R.A 7 | Diseño validado con datos de ejemplo |
| **1. Mapa real** | Aladin Lite con fondo HiPS y búsqueda por nombre | Cielo real navegable |
| **2. Datos SPHEREx** | Backend que consulta IRSA y muestra recortes sobre el mapa | Primeras imágenes reales |
| **3. Caché y zonas curadas** | Redis, celdas HEALPix y 15 a 20 regiones precalculadas | Experiencia rápida y estable |
| **4. Cambios** | Detección catálogo contra catálogo y cruce con JPL | Lista de objetos que se movieron |
| **5. IA y misiones** | Clasificador de candidatos, H.E.R.A 7 conectado y misiones guiadas | Experiencia guiada completa |
| **6. Comunidad** | Modo docente, material de aula y traducciones | Adopción en colegios |

## Retos técnicos y respuesta

| Reto | Respuesta |
|---|---|
| Latencia de consultas | Capas progresivas, caché por celda, zonas precalculadas, animación que cubre la espera |
| Detectar el cambio | Empezar con catálogo contra catálogo; diferencia de imágenes después |
| Objetos del sistema solar | Predecir con JPL y verificar; los desconocidos se muestran como candidatos |
| CORS | Todo por el backend propio |
| Volumen de datos | Zoom en tres niveles, guardar solo detecciones propias, región acotada en el MVP |

## Riesgos

- **Cambios en las APIs externas.** Mitigación: capa de adaptación en el backend y datos de respaldo.
- **Falsos positivos.** Mitigación: umbrales documentados, validación con objetos conocidos y etiquetas honestas.
- **Licencias.** Mitigación: revisar GPL v3 de Aladin Lite antes de fijar la licencia de SKYO.
- **Costos de IA.** Mitigación: respuestas rápidas locales para preguntas frecuentes y límites por usuario.
- **Conectividad limitada.** Mitigación: imágenes ligeras, caché y una versión mínima sin 3D.

## Cerca del hackathon

1. Mapa real con búsqueda por nombre.
2. Recortes de SPHEREx en 5 a 10 regiones curadas.
3. Un caso de cambio demostrable de extremo a extremo (un objeto conocido recuperado con datos reales).
4. H.E.R.A 7 con respuestas útiles aunque sean prediseñadas.

## Cómo medir el avance

Ver los indicadores de [PROPOSITO.md](PROPOSITO.md).
