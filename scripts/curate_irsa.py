#!/usr/bin/env python3
"""Curador OPTATIVO, de ejecucion puntual en PC/CI, para SPHEREx DR1+QR3.

Descarga recortes autenticados por IRSA, lee FLAGS comprimidas y WCS-WAVE con
Astropy y reempaqueta capas sin compresion para el visualizador WASM local.
NO es un servidor ni se ejecuta al navegar por SKYO.

No ejecutado contra IRSA dentro de este entorno sin acceso a internet.

Instala: python -m pip install astroquery astropy numpy requests
Uso: python tools/curate_irsa.py --ra 210.80227 --dec 54.34895 --detector 2 \
     --size-deg 0.10 --limit 40 --max-files 4 --output web/datasets/m101
"""
from __future__ import annotations

import argparse
import hashlib
import io
import json
from pathlib import Path
import time


def parse_args():
    p = argparse.ArgumentParser(description="Prepara dataset curado reproducible SPHEREx")
    p.add_argument("--ra", type=float, required=True)
    p.add_argument("--dec", type=float, required=True)
    p.add_argument("--detector", type=int, choices=range(1, 7), default=2)
    p.add_argument("--size-deg", type=float, default=0.10)
    p.add_argument("--limit", type=int, default=40)
    p.add_argument("--max-files", type=int, default=4)
    p.add_argument("--min-gap-days", type=float, default=14)
    p.add_argument("--output", type=Path, default=Path("web/datasets/region01"))
    args = p.parse_args()
    if not 0 <= args.ra < 360 or not -90 <= args.dec <= 90:
        p.error("ra / dec fuera de rango")
    if not .005 <= args.size_deg <= .25:
        p.error("usar recorte 0.005 a 0.25 grados para modo móvil")
    if not 1 <= args.limit <= 200 or not 1 <= args.max_files <= 10:
        p.error("limite fuera de rango")
    return args


def query_metadata(a):
    from astroquery.ipac.irsa import Irsa
    query = f"""
    SELECT TOP {a.limit}
      'https://irsa.ipac.caltech.edu/' || ar.uri ||
      '?center={a.ra},{a.dec}d&size={a.size_deg}' AS cutout_url,
      p.time_bounds_lower AS mjd,
      p.energy_bandpassname AS bandpass
    FROM spherex.artifact ar JOIN spherex.plane p ON ar.planeid=p.planeid
    WHERE 1=CONTAINS(POINT('ICRS',{a.ra},{a.dec}),p.poly)
      AND p.energy_bandpassname='SPHEREx-D{a.detector}'
    ORDER BY p.time_bounds_lower
    """
    return Irsa.query_tap(query).to_table()


def save_cutout(url, mjd, idx, args):
    import numpy as np
    import requests
    import astropy.units as u
    from astropy.io import fits
    from astropy.wcs import WCS
    from astropy.coordinates import SkyCoord
    from astropy.time import Time

    response = requests.get(url, timeout=(20,180), headers={"User-Agent":"SKYO-scientific-curator/0.1 (hackathon research)"})
    response.raise_for_status()
    original_sha256=hashlib.sha256(response.content).hexdigest()
    coord=SkyCoord(ra=args.ra*u.deg,dec=args.dec*u.deg,frame="icrs")
    with fits.open(io.BytesIO(response.content),memmap=False) as hdus:
        image=hdus["IMAGE"]
        spatial=WCS(image.header)
        x,y=spatial.world_to_pixel(coord)
        spectral=WCS(image.header,fobj=hdus,key="W")
        spectral.sip=None
        wavelength,bandwidth=spectral.pixel_to_world(x,y)
        wavelength_um=float(wavelength.to_value(u.um))
        bandwidth_um=float(bandwidth.to_value(u.um))
        if not np.isfinite(wavelength_um) or bandwidth_um<=0:
            raise ValueError("Longitud de onda invalida en el WCS espectral")

        if "FLAGS" not in hdus or "VARIANCE" not in hdus:
            raise ValueError("Este recorte no trae FLAGS/VARIANCE; no se curara")
        # Flags originales estan comprimidos; astropy los descomprime.
        flags=np.asarray(hdus["FLAGS"].data,dtype=np.int32)
        flag_header=fits.Header()
        for key,value in hdus["FLAGS"].header.items():
            if key.startswith("MSKN") or key.startswith("MSKD"):
                flag_header[key]=value
        if not any(k.startswith("MSKN") for k in flag_header.keys()):
            raise ValueError("No se encuentran definiciones de flags MSKN*")

        obs_utc=Time(mjd,format="mjd",scale="utc").isot
        img_h=image.copy()
        img_h.header["DATE-OBS"]=obs_utc
        # Metadatos sinteticos del curador: NO son el WCS-WAVE completo.
        img_h.header["WAVELEN"]=(wavelength_um,"SKYO ROI central lambda, micron; no per-pixel")
        img_h.header["BANDWID"]=(bandwidth_um,"SKYO ROI central bandpass, micron")
        img_h.header["ORIGIN"]="NASA/IPAC via SKYO curator"
        flags_h=fits.ImageHDU(data=flags,header=flag_header,name="FLAGS")
        var_h=hdus["VARIANCE"].copy()
        zodi_h=hdus["ZODI"].copy() if "ZODI" in hdus else None
        # Se preserva la WCS-WAVE para futuros lectores avanzados.
        wave_h=hdus["WCS-WAVE"].copy() if "WCS-WAVE" in hdus else None
        layers=[fits.PrimaryHDU(),img_h,flags_h,var_h]
        if zodi_h is not None:layers.append(zodi_h)
        if wave_h is not None:layers.append(wave_h)
        layers[0].header["HISTORY"]="Derived uncompressed FLAGS, observation date, wavelength center"
        out_name=f"spherex_d{args.detector}_{idx:03d}.fits"
        output=args.output/out_name
        fits.HDUList(layers).writeto(output,overwrite=True,checksum=True)
        curated_sha256=hashlib.sha256(output.read_bytes()).hexdigest()
        result={
            "local_file":out_name,
            "source_url":url,
            "source_release":"DR1" if "/dr1/" in url.lower() else "QR3" if "/qr3/" in url.lower() else "CHECK_RELEASE",
            "source_sha256":original_sha256,
            "sha256":curated_sha256,
            "observation_utc":obs_utc,
            "mjd":float(mjd),
            "detector":int(image.header.get("DETECTOR",args.detector)),
            "bandpass":f"SPHEREx-D{args.detector}",
            "wavelength_um":wavelength_um,
            "bandwidth_um":bandwidth_um,
            "wavelength_quality":"center_only_from_astropy_WCS_WAVE",
            "ra_deg":args.ra,
            "dec_deg":args.dec,
            "size_deg":args.size_deg,
            "psf_fwhm_arcsec":float(image.header.get("PSF_FWHM",float('nan'))),
            "has_uncompressed_flags":True,
            "has_variance":True,
            "provenance_note":"Observacion NASA/IPAC, archivo derivado localmente para acceso web; radiancias preservadas"
        }
        if not np.isfinite(result["psf_fwhm_arcsec"]):result["psf_fwhm_arcsec"]=None
        return result


def main():
    args=parse_args()
    args.output.mkdir(parents=True,exist_ok=True)
    observations=query_metadata(args)
    if not len(observations):
        raise SystemExit("Sin observaciones IRSA para estos parametros")
    items=[]
    for row in observations:
        mjd=float(row["mjd"])
        if any(abs(mjd-previous["mjd"]) < args.min_gap_days for previous in items):continue
        url=str(row["cutout_url"])
        try:
            entry=save_cutout(url,mjd,len(items)+1,args)
            items.append(entry)
            print(f"Guardado: {entry['local_file']} {entry['observation_utc']} λ={entry['wavelength_um']:.4f} um")
        except Exception as ex:
            print(f"ADVERTENCIA: falló {url[:65]}: {ex}")
        if len(items)>=args.max_files:break
        time.sleep(.4)
    if not items:raise SystemExit("No se pudo curar ninguna observacion")
    manifest={"schema_version":"skyo-curated-0.1","source":"NASA/IPAC IRSA SPHEREx",
      "selection":{"ra_deg":args.ra,"dec_deg":args.dec,"detector":args.detector},
      "disclaimer":"Exigir verificacion de WCS-WAVE por pixel para concluir movimiento real",
      "items":items}
    (args.output/"manifest.json").write_text(json.dumps(manifest,ensure_ascii=False,indent=2,allow_nan=False),encoding="utf-8")
    print(f"Manifiesto: {args.output/'manifest.json'}")

if __name__=="__main__":main()
