# Datos, APIs y bibliotecas

## Fuentes

### NASA/IPAC IRSA (SPHEREx)

- Los servicios de SPHEREx en IRSA siguen estándares del Observatorio Virtual (IVOA).
- **TAP** en `https://irsa.ipac.caltech.edu/TAP`; la tabla principal para buscar observaciones es `spherex.obscore` (ObsTAP).
- **SIA2** para consultar imágenes espectrales; **recortes (cutouts)** para descargar solo el área de interés.
- Los datos se publican con versiones «quick release» actualizadas de forma periódica.
- Documentación y tutoriales: archivo de SPHEREx en IRSA y `irsa-tutorials`.
- Herramienta comunitaria útil para pruebas: `spxquery`.

### JPL Solar System Dynamics

- **SB Identification**: qué cuerpos menores conocidos caen dentro de un campo y una fecha dados.
- **SBDB** y **Horizons**: parámetros orbitales y posiciones.
- Se usan para decir «esto es un cometa o asteroide conocido» y para dibujar órbitas en 3D.

### Mapas del cielo

- **HiPS** (por ejemplo DSS color) como fondo.
- **Aladin Lite v3** para mostrarlo en el navegador. Se puede añadir una capa propia con `newImageSurvey(URL)`; las capas propias se pueden generar con **HiPSgen**.

## Bibliotecas

| Capa | Biblioteca | Uso |
|---|---|---|
| Mapa | Aladin Lite v3 | Cielo real con HiPS |
| 3D | three.js | Sistema solar, órbitas, cometa |
| Backend | FastAPI | API propia |
| Consultas | pyvo, astroquery | TAP, SIA2 |
| Imágenes | astropy, reproject | FITS, WCS, alineación, conversión a PNG |
| Detección | photutils, scikit-image | Fuentes y diferencias |
| IA | scikit-learn o PyTorch | Clasificar candidatos reales y artefactos |
| Índice | astropy-healpix | Celdas del cielo |
| Datos | PostgreSQL, Redis | Detecciones y caché |

## Consulta de ejemplo (esqueleto)

```python
import pyvo
tap = pyvo.dal.TAPService("https://irsa.ipac.caltech.edu/TAP")
adql = """SELECT TOP 50 * FROM spherex.obscore
          WHERE CONTAINS(POINT('ICRS', {ra}, {dec}),
                         CIRCLE('ICRS', s_ra, s_dec, {r})) = 1"""
```

> Los nombres de columnas deben verificarse contra el esquema real de la tabla (`TAP_SCHEMA`) antes de usarlos.

## Puntos a verificar

- Si IRSA acepta llamadas desde el navegador (cabecera `access-control-allow-origin`).
- Límites de uso y tiempos de consulta (en tutoriales de IRSA se reportan consultas de varios segundos).
- Disponibilidad de catálogos del sistema solar propios de SPHEREx: la documentación de IRSA los ubicaba hacia 2028, por lo que SKYO no puede depender de ellos.
- Licencia de Aladin Lite (GPL v3) frente a la licencia elegida para SKYO.

## Atribución

Toda vista con datos de SPHEREx debe indicar: «Datos: NASA / IPAC Infrared Science Archive». SKYO no es un servicio oficial de NASA ni de IPAC.
