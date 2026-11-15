#!/usr/bin/env python3
"""Inspection-only: map calibration ROIs and ePSF zones without enabling candidates."""
import hashlib
import io
import json
from pathlib import Path
from urllib.request import Request, urlopen
import numpy as np
from astropy.io import fits
from astropy.wcs import WCS

ROOT=Path(__file__).resolve().parents[1]
def sha(data):return hashlib.sha256(data).hexdigest()
def inspect():
    dataset=json.loads((ROOT/'public/datasets/m101-visual-v2/manifest.json').read_text())
    sources=json.loads((ROOT/'data/datasets/m101-surroundings-20261114/search.json').read_text())['pairs'][0]
    calibration_path=ROOT/'data/calibrations/originals/spectral-wcs-D2-v5.fits'
    receipt=json.loads((ROOT/'docs/evidence/t08-preparacion-20261114/calibration-source.json').read_text())
    assert sha(calibration_path.read_bytes())==receipt['sha256'],'Calibración modificada'
    output=ROOT/'data/calibrations/roi/m101-visual-v2';output.mkdir(parents=True,exist_ok=True)
    items=[];parent_headers={}
    with fits.open(calibration_path,memmap=False) as calibration:
        assert calibration['CWAVE'].data.shape==calibration['CBAND'].data.shape
        assert calibration['CWAVE'].header['BUNIT']=='um'
        for item in dataset['items']:
            source=next(meta for meta in sources if meta['observation_id']==item['observation_id'])
            if item['observation_id'] not in parent_headers:
                url=item['parent_mef_url'].replace('https://irsa.ipac.caltech.edu/ibe/data/spherex/','https://nasa-irsa-spherex.s3.us-east-1.amazonaws.com/')
                assert url.startswith('https://nasa-irsa-spherex.s3.us-east-1.amazonaws.com/dr1/')
                with urlopen(Request(url,headers={'Range':'bytes=0-57599'}),timeout=25) as response:
                    assert response.status==206
                    raw=response.read(57601);assert len(raw)<=57600
                stream=io.BytesIO(raw);fits.Header.fromfile(stream);header=fits.Header.fromfile(stream)
                parent_headers[item['observation_id']]={'header':header,'url':url,'rangeSha256':sha(raw)}
            parent=parent_headers[item['observation_id']]
            with fits.open(ROOT/'public/datasets/m101-visual-v2'/item['local_file'],memmap=False) as roi,fits.open(ROOT/source['directory']/source['local_file'],memmap=False) as original:
                assert sha((ROOT/source['directory']/source['local_file']).read_bytes())==source['sha256']
                header=roi['IMAGE'].header;height,width=roi['IMAGE'].data.shape
                dx=parent['header']['CRPIX1']-header['CRPIX1'];dy=parent['header']['CRPIX2']-header['CRPIX2']
                x0,y0=round(dx),round(dy);assert abs(dx-x0)<1e-7 and abs(dy-y0)<1e-7
                assert 0<=x0<x0+width<=calibration['CWAVE'].data.shape[1] and 0<=y0<y0+height<=calibration['CWAVE'].data.shape[0]
                points=np.array([[0,0],[width-1,height-1],[(width-1)/2,(height-1)/2]])
                roi_world=WCS(header).all_pix2world(points,0);parent_world=WCS(parent['header']).all_pix2world(points+[x0,y0],0)
                assert np.max(np.abs(roi_world-parent_world))<1e-8,'La transformación al detector padre no coincide'
                layers=[fits.PrimaryHDU()]
                for name in ['CWAVE','CBAND']:
                    data=calibration[name].data[y0:y0+height,x0:x0+width].copy();assert np.isfinite(data).all() and (data>0).all()
                    hdu=fits.ImageHDU(data,name=name);hdu.header['BUNIT']='um';layers.append(hdu)
                path=output/(item['local_file'].removesuffix('.fits')+'-calibration.fits');fits.HDUList(layers).writeto(path,overwrite=True,checksum=True)
                epsf=original['EPSF'];cx=x0+(width-1)/2;cy=y0+(height-1)/2
                index=int(np.argmin((epsf.data['XCENTER']-cx)**2+(epsf.data['YCENTER']-cy)**2));zone=epsf.data[index];model=np.asarray(zone['EPSF'])
                oversampling=[int(epsf.header['OVSMPX']),int(epsf.header['OVSMPY'])]
                assert model.ndim==2 and np.isfinite(model).all() and min(oversampling)>0
                model_path=output/(item['local_file'].removesuffix('.fits')+'-epsf.json')
                model_path.write_text(json.dumps({'data':model.tolist(),'oversamplingXY':oversampling,'gridCenterXY':[float(zone['XCENTER']),float(zone['YCENTER'])],'nativePixelIntegrationApplied':False,'subpixelPhaseApplied':False}))
                items.append({'observationId':item['observation_id'],'inputFile':item['local_file'],'inputSha256':item['sha256'],'sourceCalibrationUrl':receipt['url'],'sourceCalibrationSha256':receipt['sha256'],'calibrationProductSoftwareVersion':calibration[0].header['VERSION'],'observationProcessingVersion':item['processing_version'],'versionCompatibilityVerified':False,'detectorOriginXY':[x0,y0],'shapeHW':[height,width],'parentHeaderUrl':parent['url'],'parentHeaderRangeSha256':parent['rangeSha256'],'calibrationRoi':str(path.relative_to(ROOT)),'calibrationRoiSha256':sha(path.read_bytes()),'epsfRoi':str(model_path.relative_to(ROOT)),'epsfRoiSha256':sha(model_path.read_bytes()),'epsfRows':len(epsf.data),'selectedZone':index,'epsfShape':list(model.shape),'oversamplingXY':oversampling,'rawEpsfSum':float(model.sum()),'timeScale':header.get('TIMESYS'),'mjdMid':header.get('MJD-AVG'),'observerGeometryVerified':False})
    result={'status':'inspection-only','scienceReady':False,'items':items,'remaining':['Verificar compatibilidad de versión de CWAVE/CBAND con el procesamiento de cada observación.','Integrar ePSF a píxel nativo y fase subpíxel antes de matching/flujo.','Propagar incertidumbre de fondo, calibración, PSF y covarianza.','Resolver observador/época y referencia astrométrica/catálogos.','Ejecutar inyección/recuperación, controles FPR/completitud y revisión independiente.']}
    (ROOT/'docs/evidence/t08-preparacion-20261114/inspection.json').write_text(json.dumps(result,indent=2)+'\n')
    return result
if __name__=='__main__':
    result=inspect();print(json.dumps({'status':result['status'],'regions':len(result['items']),'scienceReady':False}))
