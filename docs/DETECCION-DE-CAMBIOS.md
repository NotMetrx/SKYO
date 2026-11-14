# Detección de cambios

Objetivo: mostrar qué objetos se movieron entre dos épocas de observación y decir qué son, con su nivel de confianza.

## Enfoques

| Enfoque | Cómo funciona | Ventaja | Riesgo |
|---|---|---|---|
| **Catálogo contra catálogo** (empezar por aquí) | Detectar fuentes en cada época y comparar posiciones | Simple y robusto | Depende de una buena detección |
| **Diferencia de imágenes** | Alinear, restar y detectar manchas | Más sensible | Ruido y artefactos |

## Pipeline propuesto

1. **Selección.** Elegir una región y dos épocas, siempre en la misma banda espectral. SPHEREx cubre cada punto en distintas longitudes de onda según la imagen, así que no se deben comparar bandas distintas.
2. **Alineación.** Llevar ambas imágenes al mismo sistema de coordenadas (`reproject`).
3. **Detección de fuentes.** `photutils` en cada época.
4. **Cruce.** Emparejar fuentes entre épocas:

```python
from astropy.coordinates import SkyCoord
import astropy.units as u
a = SkyCoord(ra1*u.deg, dec1*u.deg)
b = SkyCoord(ra2*u.deg, dec2*u.deg)
idx, sep, _ = a.match_to_catalog_sky(b)
se_movio = sep > 2*u.arcsec   # ajustar el umbral al ruido real
```

5. **Identificación.** Consultar JPL (SB Identification) para ver si el objeto que se movió es un cuerpo conocido.
6. **Clasificación.** Un modelo pequeño separa detecciones reales de artefactos (rayos cósmicos, bordes, ruido).
7. **Resultado.** Cada detección recibe tipo, desplazamiento y confianza, y se guarda indexada por celda HEALPix.

## Categorías de salida

- **Conocido:** coincide con un cuerpo de JPL.
- **Candidato sin identificar:** se mueve y no coincide con ningún cuerpo conocido.
- **Descartado:** probable artefacto.

## Sobre el «Planeta X»

Un objeto muy lejano se mueve poco entre dos épocas separadas por seis meses. Por eso SKYO se plantea como una herramienta que **ayuda a buscar** y presenta resultados como candidatos, nunca como hallazgos confirmados. Esto también protege la credibilidad científica del proyecto.

## Validación

- Probar con objetos conocidos (cometas y asteroides cuya posición se puede calcular con JPL) y medir cuántos se recuperan.
- Medir falsos positivos por región.
- Documentar umbrales y límites junto a cada resultado.
